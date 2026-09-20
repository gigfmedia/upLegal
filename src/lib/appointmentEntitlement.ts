/**
 * 4.37B — narrow classifier for manual booking INSERT failures.
 *
 * Returns true ONLY when the Supabase error looks like an RLS/permission
 * denial (as opposed to validation, network, or unknown errors). Callers
 * MUST confirm with a fresh Pro-authority read (useProSubscription refetch)
 * before opening the paywall — never map blindly, since the same mutation
 * can also fail for ownership/security reasons.
 */
export function isBookingDeniedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: unknown }).code;
  if (code === '42501') return true;
  const msg = err instanceof Error ? err.message : '';
  return /row-level security|permission denied|not authorized|insufficient_privilege/i.test(msg);
}
