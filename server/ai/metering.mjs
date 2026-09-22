import { createHash } from 'node:crypto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function usageError(code = 'AI_USAGE_UNAVAILABLE', status = 503) {
  return Object.assign(new Error('No pudimos completar la solicitud. Intenta nuevamente.'), { code, status, retriable: false });
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
export function operationHash(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

/** One instance per authenticated route invocation, never shared between users. */
export function createAIMetering({ supabase, tokenLimit, operationLimit, log = console.info }) {
  const safeLog = (...args) => { try { log(...args); } catch { /* optional logging cannot own request completion */ } };
  let operationId = null;
  let broken = false;
  const rpc = async (name, args) => {
    let result;
    try { result = await supabase.rpc(name, args); } catch { throw usageError(); }
    if (result?.error) {
      const message = String(result.error.message || '');
      if (message.includes('AI_MONTHLY_LIMIT_REACHED')) throw usageError('AI_MONTHLY_LIMIT_REACHED', 429);
      if (message.includes('AI_IDEMPOTENCY_CONFLICT')) throw usageError('AI_IDEMPOTENCY_CONFLICT', 409);
      throw usageError();
    }
    return result?.data;
  };
  return {
    async begin(req, res, { lawyerId, workspaceId, capability, resourceId = null, input }) {
      const key = req.headers?.['x-ai-operation-id'];
      if (typeof key !== 'string' || !UUID.test(key)) {
        res.status(400).json({ error: 'Actualiza la página e intenta nuevamente.', code: 'AI_OPERATION_ID_REQUIRED' });
        return false;
      }
      const data = await rpc('ai_begin_operation', {
        p_lawyer: lawyerId, p_workspace: workspaceId, p_capability: capability, p_resource: resourceId,
        p_key: key, p_hash: operationHash({ workspaceId, capability, resourceId, input }),
        p_token_limit: tokenLimit, p_operation_limit: operationLimit, p_conversation: input?.conversation_id || null,
      });
      if (!data?.operation_id) throw usageError();
      if (!data.created) {
        if (data.status === 'reserved') res.status(409).json({ error: 'La solicitud sigue en curso. Intenta nuevamente.', code: 'AI_OPERATION_IN_PROGRESS', ai_operation: { id: data.operation_id, terminal: false } });
        else res.status(data.response_status).json({ ...data.response_body, ai_operation: { id: data.operation_id, status: data.status, terminal: true } });
        return false;
      }
      operationId = data.operation_id;
      safeLog('[AI metering]', { operation_id: operationId, capability, status: 'reserved' });
      return true;
    },
    async beginAttempt({ provider, model, budget }) {
      if (!operationId || broken) throw usageError();
      const data = await rpc('ai_begin_attempt', { p_operation: operationId, p_provider: provider, p_model: model, p_budget: budget });
      if (!data?.attempt_id) throw usageError();
      safeLog('[AI metering]', { operation_id: operationId, attempt_id: data.attempt_id, model, status: 'started' });
      return data.attempt_id;
    },
    async finishAttempt(attemptId, data) {
      try {
        await rpc('ai_finish_attempt', { p_attempt: attemptId, p_data: data });
      } catch (error) { broken = true; throw error; }
      safeLog('[AI metering]', { operation_id: operationId, attempt_id: attemptId, provider_request_id: data.provider_request_id, model: data.actual_model, status: data.status, latency_ms: data.latency_ms });
    },
    async respond(res, status, body) {
      if (!operationId) return res.status(status).json(body);
      try {
        if (broken) throw usageError();
        const result = await rpc('ai_finish_operation', { p_operation: operationId, p_status: status, p_body: body });
        if (!result?.terminal) throw usageError();
        return res.status(status).json({ ...body, ai_operation: result });
      } catch {
        // Do not report success or re-execute a provider call after ambiguous settlement.
        safeLog('[AI metering]', { operation_id: operationId, status: 'reconciliation_required' });
        return res.status(503).json({ error: 'No pudimos confirmar la solicitud. Intenta nuevamente.', code: 'AI_USAGE_UNAVAILABLE', ai_operation: { id: operationId, terminal: false } });
      }
    },
  };
}
