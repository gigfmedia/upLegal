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

/**
 * Server-authoritative checkout price.
 * - Existing Founder: intro-count rule (reactivation never resets).
 * - Otherwise: price follows the atomic reservation result.
 * - Fail-closed: unknown/failed reservation → standard (retry re-reserves).
 */
export function decideCheckoutPrice({ isFounder, lifetimeApproved, reservation }) {
  if (isFounder) {
    return lifetimeApproved >= PRO_INTRO_SUCCESSFUL_PAYMENTS
      ? PRO_STANDARD_PRICE_CLP
      : PRO_INTRO_PRICE_CLP;
  }
  if (reservation === 'reserved' || reservation === 'already_founder') {
    return PRO_INTRO_PRICE_CLP;
  }
  return PRO_STANDARD_PRICE_CLP;
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
