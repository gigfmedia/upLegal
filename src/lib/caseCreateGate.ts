/**
 * 4.43A — decisión pura de UX para crear Case LAWYER_DIRECT.
 *
 * La autoridad es `can_create_direct_case` del RPC (nunca has_pro_access
 * solo, nunca conteos locales). Loading/error JAMÁS abren paywall:
 * loading espera, error reintenta.
 */

export type CreateCaseAction = 'wait' | 'retry' | 'open-form' | 'paywall' | 'capacity';

export function decideCreateCaseAction(input: {
  loading: boolean;
  error: boolean;
  canCreate: boolean;
  isProAtCapacity: boolean;
}): CreateCaseAction {
  if (input.loading) return 'wait';
  if (input.error) return 'retry';
  if (input.canCreate) return 'open-form';
  if (input.isProAtCapacity) return 'capacity';
  return 'paywall';
}
