// FASE 4.32B.3 — Founder = first 15 DISTINCT lawyers with a successful Pro payment.
// Pure, DB-free helpers (unit-testable). The atomic guarantee lives in the
// Postgres function claim_pro_founder_slot (advisory lock); this module
// mirrors its ordering semantics for tests, reconciliation previews, and
// webhook gating.

export const PRO_FOUNDER_MAX = 15;

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
