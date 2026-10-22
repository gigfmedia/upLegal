// FASE 4.32B.3 — Founder = first 15 DISTINCT lawyers with a successful Pro payment.
// Pure, DB-free helpers (unit-testable). The atomic guarantee lives in the
// Postgres function claim_pro_founder_slot (advisory lock); this module
// mirrors its ordering semantics for tests, reconciliation previews, and
// webhook gating.

export const PRO_FOUNDER_MAX = 15;
export const PRO_FOUNDER_RESERVATION_TTL_SECONDS = 72 * 3600; // 72h: covers weekend checkout delays, recycles abandonment
export const PRO_INTRO_PRICE_CLP = 19990;
export const PRO_STANDARD_PRICE_CLP = 49990;
export const PRO_INTRO_SUCCESSFUL_PAYMENTS = 3;

/** Every value the atomic reservation RPC may return. */
export const PRO_RESERVATION_RESULTS = Object.freeze([
  'reserved',
  'already_founder',
  'standard_no_slot',
]);

/**
 * Server-authoritative checkout price.
 * - Founder cohort (existing Founder or an atomic reservation) follows the
 *   lifetime approved-payment rule: first 3 intro, then standard.
 * - no slot → standard.
 * The checkout route never reaches this with a failed/unknown reservation:
 * that must be handled as an infrastructure error before any charge.
 */
export function decideCheckoutPrice({ isFounder, lifetimeApproved, reservation }) {
  const inFounderCohort = isFounder === true
    || reservation === 'reserved'
    || reservation === 'already_founder';
  if (!inFounderCohort) return PRO_STANDARD_PRICE_CLP;
  return lifetimeApproved >= PRO_INTRO_SUCCESSFUL_PAYMENTS
    ? PRO_STANDARD_PRICE_CLP
    : PRO_INTRO_PRICE_CLP;
}

/**
 * Resolve checkout price + Founder state from the atomic reservation result.
 * The RPC is authoritative: a failed/unknown result is an error, never a
 * silent fallback that could charge without a slot.
 */
export function resolveProCheckoutPricing({ isFounder, lifetimeApproved, reservationResult }) {
  if (!reservationResult || reservationResult.error) {
    return {
      ok: false,
      code: 'FOUNDER_RESERVATION_FAILED',
      error: reservationResult?.error ?? null,
    };
  }
  const reservation = typeof reservationResult.data === 'string' ? reservationResult.data : null;
  if (!PRO_RESERVATION_RESULTS.includes(reservation)) {
    return { ok: false, code: 'FOUNDER_RESERVATION_INVALID', reservation };
  }
  const approved = lifetimeApproved;
  if (typeof approved !== 'number' || !Number.isFinite(approved) || approved < 0) {
    return { ok: false, code: 'LIFETIME_COUNT_INVALID', lifetimeApproved };
  }
  const amountClp = decideCheckoutPrice({ isFounder: isFounder === true, lifetimeApproved: approved, reservation });
  const isFounderSlot = isFounder === true || reservation === 'reserved' || reservation === 'already_founder';
  return {
    ok: true,
    reservation,
    amountClp,
    isFounderSlot,
    founderTrack: isFounderSlot,
  };
}

/**
 * Coherence gate for reusing an existing pending checkout.
 * Never reuse a preapproval whose real provider amount differs from the
 * persisted amount/price, nor an intro amount without Founder state.
 */
export function validateReusableCheckout({
  amountClp,
  isFounder,
  providerAmount,
  allowedAmounts,
  introPriceClp = PRO_INTRO_PRICE_CLP,
}) {
  const amount = Number(amountClp);
  if (!Number.isFinite(amount) || !Array.isArray(allowedAmounts) || !allowedAmounts.includes(amount)) {
    return { ok: false, code: 'PENDING_AMOUNT_INVALID', amountClp: amountClp ?? null };
  }
  if (providerAmount === null || providerAmount === undefined || providerAmount === '') {
    return { ok: false, code: 'PROVIDER_AMOUNT_MISSING' };
  }
  const provider = Number(providerAmount);
  if (!Number.isFinite(provider)) {
    return { ok: false, code: 'PROVIDER_AMOUNT_MISSING', providerAmount };
  }
  if (provider !== amount) {
    return { ok: false, code: 'PENDING_PRICE_MISMATCH', amountClp: amount, providerAmount: provider };
  }
  if (amount === introPriceClp && isFounder !== true) {
    return { ok: false, code: 'PENDING_FOUNDER_STATE_INVALID', amountClp: amount };
  }
  return { ok: true, amountClp: amount };
}

/** Only approved payments can qualify. Never trust redirect/checkout/pending. */
export function shouldAttemptFounderClaim(paymentStatus) {
  return String(paymentStatus || '') === 'approved';
}

/** Canonical ordering key: first-paid timestamp, then provider id tiebreak. */
export function founderOrderKey(row) {
  const t = row?.paid_at ? Date.parse(row.paid_at) : Number.NaN;
  return [Number.isNaN(t) ? Number.POSITIVE_INFINITY : t, String(row?.provider_authorized_payment_id || '')];
}

function compareRows(a, b) {
  const [ta, ia] = founderOrderKey(a);
  const [tb, ib] = founderOrderKey(b);
  if (ta !== tb) return ta - tb;
  return ia < ib ? -1 : ia > ib ? 1 : 0;
}

/**
 * Deterministic cohort from ledger rows.
 * - approved only; webhook replays deduped by authorized_payment_id
 * - first payment per DISTINCT lawyer; earliest 15 win
 * Returns { founderIds: string[], excludedIds: string[] }.
 */
export function selectFounderCohort(ledgerRows, maxFounders = PRO_FOUNDER_MAX) {
  const seen = new Set();
  const unique = [];
  for (const row of Array.isArray(ledgerRows) ? ledgerRows : []) {
    if (String(row?.status || '') !== 'approved') continue;
    const apId = String(row?.provider_authorized_payment_id || '');
    if (!apId || seen.has(apId)) continue; // replay-safe
    seen.add(apId);
    if (!row?.lawyer_id) continue;
    unique.push(row);
  }
  const firstByLawyer = new Map();
  for (const row of unique) {
    const cur = firstByLawyer.get(row.lawyer_id);
    if (!cur || compareRows(row, cur) < 0) firstByLawyer.set(row.lawyer_id, row);
  }
  const ranked = [...firstByLawyer.entries()]
    .sort(([, a], [, b]) => compareRows(a, b))
    .map(([lawyerId]) => lawyerId);
  return {
    founderIds: ranked.slice(0, maxFounders),
    excludedIds: ranked.slice(maxFounders),
  };
}
