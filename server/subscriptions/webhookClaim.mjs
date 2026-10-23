// Shared disposition for an atomic subscription-event claim.
//
// The RPC answers one of:
//   claimed=true                  -> this delivery owns the event
//   claimed=false, reason=busy    -> another live delivery owns it, retry later
//   claimed=false, reason=terminal -> already processed, ack without effects
//   claimed=false, reason=not_found -> internal error, do not ack silently
//
// Keeping this classification in one place prevents a new handler from
// turning "busy" into an ack (the A1 bug) or from retrying terminal events.
export function claimDisposition(claim) {
  if (!claim) return { action: 'ack', reason: 'no_claim' };
  if (claim.claimed) return { action: 'process' };
  if (claim.reason === 'busy') return { action: 'retry', reason: 'busy' };
  if (claim.reason === 'not_found') return { action: 'internal_error', reason: 'not_found' };
  return { action: 'ack', reason: claim.reason || 'not_claimed' };
}

export function nonClaimedResult(claim) {
  const disposition = claimDisposition(claim);
  if (disposition.action === 'retry') return { skipped: 'busy', retry: true };
  if (disposition.action === 'internal_error') throw new Error('subscription_event_not_found');
  return { skipped: disposition.reason || 'not_claimed' };
}
