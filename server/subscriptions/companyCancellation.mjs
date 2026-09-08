import { cancelMpPreapproval, reconcileMpPreapprovalStatus } from './cancelSubscription.mjs';

// Empresas requires an explicit cancelled state, including when a PUT succeeds
// without a usable body. AI/Pro behavior is deliberately unchanged here.
export async function confirmCompanyCancellation(options) {
  const result = await cancelMpPreapproval(options);
  if (result.ok && result.status >= 200 && result.status < 300 && result.body?.status === 'cancelled') return { confirmed: true };
  if (result.ok || result.alreadyCancelledHint) {
    const reconciliation = await reconcileMpPreapprovalStatus(options);
    return { confirmed: reconciliation.cancelled, networkError: reconciliation.networkError };
  }
  return { confirmed: false, networkError: result.networkError };
}
