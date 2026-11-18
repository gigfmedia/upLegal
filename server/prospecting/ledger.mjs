const RPC_TIMEOUT_MESSAGE = 'prospecting_ledger_rpc_failed';

export function createProspectingLedger({ supabase, logger = console } = {}) {
  if (!supabase) throw new Error('supabase client required');

  async function call(name, args) {
    const { data, error } = await supabase.rpc(name, args);
    if (error) {
      logger.error?.('[Prospecting] ledger RPC failed', { rpc: name, error: error.message });
      const wrapped = new Error(`${RPC_TIMEOUT_MESSAGE}:${name}:${error.message}`);
      wrapped.cause = error;
      throw wrapped;
    }
    return Array.isArray(data) ? data[0] : data;
  }

  function nowArgs(now) {
    return now ? { p_now: now } : {};
  }

  async function getCapacity({ now = null } = {}) {
    return call('prospecting_get_capacity', nowArgs(now));
  }

  async function claimSendAttempt({ sendId, runId = null, now = null }) {
    return call('prospecting_claim_send_attempt', {
      p_send_id: sendId,
      p_run_id: runId,
      ...nowArgs(now),
    });
  }

  async function revalidateAttemptDay({ attemptId, now = null }) {
    return call('prospecting_revalidate_attempt_day', {
      p_attempt_id: attemptId,
      ...nowArgs(now),
    });
  }

  async function finalizeSendAttempt({
    attemptId,
    outcome,
    providerMessageId = null,
    error = null,
    transient = false,
    definitiveRejection = false,
    providerContacted = true,
    releaseReason = null,
    now = null,
  }) {
    return call('prospecting_finalize_send_attempt', {
      p_attempt_id: attemptId,
      p_outcome: outcome,
      p_provider_message_id: providerMessageId,
      p_error: error,
      p_transient: transient,
      p_definitive_rejection: definitiveRejection,
      p_provider_contacted: providerContacted,
      p_release_reason: releaseReason,
      ...nowArgs(now),
    });
  }

  async function markSendSkipped({ sendId, reason, now = null }) {
    return call('prospecting_mark_send_skipped', {
      p_send_id: sendId,
      p_reason: reason,
      ...nowArgs(now),
    });
  }

  async function ingestProviderEvent({
    providerEventId,
    eventType,
    providerMessageId = null,
    email = null,
    payload = {},
    now = null,
  }) {
    return call('prospecting_ingest_provider_event', {
      p_provider_event_id: providerEventId,
      p_event_type: eventType,
      p_provider_message_id: providerMessageId,
      p_email: email,
      p_payload: payload,
      ...nowArgs(now),
    });
  }

  async function applyProviderEvent({ eventId, historical = false, now = null }) {
    return call('prospecting_apply_provider_event', {
      p_event_id: eventId,
      p_historical: historical,
      ...nowArgs(now),
    });
  }

  async function reprocessProviderEvents({ limit = 50, now = null } = {}) {
    return call('prospecting_reprocess_provider_events', {
      p_limit: limit,
      ...nowArgs(now),
    });
  }

  async function recoverStale({ now = null, markReady = false } = {}) {
    return call('prospecting_recover_stale', {
      p_mark_ready: markReady,
      ...nowArgs(now),
    });
  }

  async function scrubPii({ now = null } = {}) {
    return call('prospecting_scrub_pii', nowArgs(now));
  }

  async function applyUnsubscribe({
    prospectId,
    email = null,
    source = 'email_link',
    note = null,
    createdBy = null,
    now = null,
  }) {
    return call('prospecting_apply_unsubscribe', {
      p_prospect_id: prospectId,
      p_email: email,
      p_source: source,
      p_note: note,
      p_created_by: createdBy,
      ...nowArgs(now),
    });
  }

  async function upsertSuppression({
    email,
    reason,
    source = 'system',
    note = null,
    createdBy = null,
    now = null,
  }) {
    return call('prospecting_upsert_suppression', {
      p_email: email,
      p_reason: reason,
      p_source: source,
      p_note: note,
      p_created_by: createdBy,
      ...nowArgs(now),
    });
  }

  return {
    getCapacity,
    claimSendAttempt,
    revalidateAttemptDay,
    finalizeSendAttempt,
    markSendSkipped,
    ingestProviderEvent,
    applyProviderEvent,
    reprocessProviderEvents,
    recoverStale,
    scrubPii,
    applyUnsubscribe,
    upsertSuppression,
  };
}

export function ledgerReason(result) {
  return result?.reason || result?.error || null;
}
