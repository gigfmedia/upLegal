// FASE 4.59: external effect outbox drainer.
//
// Orchestrators no longer call email/analytics inline. They enqueue effect
// descriptors and `complete_subscription_event` commits "processed" plus the
// effect rows in one transaction. This module drains those rows at-least-once:
// each effect is claimed atomically (FOR UPDATE SKIP LOCKED), executed, then
// marked `sent` or `failed` with exponential backoff. A crash between execution
// and `sent` can duplicate the effect — acceptable for analytics, and emails are
// addressed to a transition that is normally enqueued once.
//
// Handlers are injected by server.mjs:
//   { analytics: (payload) => ..., email_welcome: (payload) => ... }
// An unknown effect type is treated as a permanent error and retried until the
// function marks it `dead` (attempts >= max).

export const EFFECT_LEASE_SECONDS = 120;
export const EFFECT_MAX_ATTEMPTS = 8;

function backoffSeconds(attempts) {
  return Math.min(3600, 30 * Math.pow(2, Math.max(0, (attempts || 1) - 1)));
}

export function analyticsEffect({ transitionKey, event, lawyerId, props = {} }) {
  return {
    effect_type: 'analytics',
    transition_key: transitionKey,
    payload: { event, lawyer_id: lawyerId, props },
  };
}

export function emailEffect({ transitionKey, lawyerId, subject, html }) {
  return {
    effect_type: 'email_welcome',
    transition_key: transitionKey,
    payload: { lawyer_id: lawyerId, subject, html },
  };
}

export async function drainSubscriptionEffects(supabase, handlers, {
  limit = 10,
  leaseSeconds = EFFECT_LEASE_SECONDS,
  maxAttempts = EFFECT_MAX_ATTEMPTS,
} = {}) {
  let processed = 0;
  for (let i = 0; i < limit; i++) {
    const { data, error } = await supabase.rpc('claim_subscription_effect', {
      p_lease_seconds: leaseSeconds,
      p_max_attempts: maxAttempts,
    });
    if (error) throw error;
    const effect = Array.isArray(data) ? data[0] : data;
    if (!effect) break;

    processed++;
    try {
      const handler = handlers?.[effect.effect_type];
      if (!handler) throw new Error(`no_effect_handler:${effect.effect_type}`);
      await handler(effect.payload, effect);
      const { error: doneError } = await supabase.rpc('complete_subscription_effect', {
        p_id: effect.effect_id,
        p_claim_token: effect.claim_token,
      });
      if (doneError) throw doneError;
    } catch (e) {
      console.error('[SubscriptionEffects] effect failed', {
        effect_id: effect.effect_id,
        effect_type: effect.effect_type,
        attempts: effect.attempts,
        error: String(e?.message || e),
      });
      const { error: failError } = await supabase.rpc('fail_subscription_effect', {
        p_id: effect.effect_id,
        p_claim_token: effect.claim_token,
        p_error: String(e?.message || e),
        p_backoff_seconds: backoffSeconds(effect.attempts),
        p_max_attempts: maxAttempts,
      });
      // A failure to record the failure must not abort the whole drain; the
      // lease will expire and the effect becomes claimable again.
      if (failError) console.error('[SubscriptionEffects] fail record error', failError?.message || failError);
    }
  }
  return { processed };
}
