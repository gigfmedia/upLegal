// Existing estimates, USD / 1,000 tokens. Not a provider invoice or live pricing.
const EXISTING = {
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4.1-mini': { input: 0.0004, output: 0.0016 },
  'gpt-4.1': { input: 0.002, output: 0.008 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
};
// Explicit aliases only. Never strip arbitrary namespaces/provider suffixes.
export function normalizeCostModel(model) {
  const id = String(model || '').trim();
  return Object.hasOwn(EXISTING, id) ? `openai/${id}` : id;
}
export function modelCosts(raw = process.env.AI_MODEL_COSTS_JSON, warn = console.warn) {
  const prices = Object.fromEntries(Object.entries(EXISTING).map(([key, value]) => [normalizeCostModel(key), value]));
  if (!raw) return prices;
  let parsed;
  try { parsed = JSON.parse(raw); } catch { warn('[AI costs] Invalid cost configuration'); return prices; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { warn('[AI costs] Invalid cost configuration'); return prices; }
  for (const [key, value] of Object.entries(parsed)) {
    if (!key.trim() || key === 'default' || !value || typeof value.input !== 'number' || typeof value.output !== 'number' || !Number.isFinite(value.input) || !Number.isFinite(value.output) || value.input < 0 || value.output < 0) {
      warn('[AI costs] Ignored invalid cost entry'); continue;
    }
    prices[normalizeCostModel(key)] = { input: value.input, output: value.output };
  }
  return prices;
}
export function estimateAICostUsd(model, inputTokens, outputTokens) {
  const price = modelCosts()[normalizeCostModel(model)];
  if (!price || inputTokens == null || outputTokens == null) return null;
  return inputTokens / 1000 * price.input + outputTokens / 1000 * price.output;
}
const nonnegative = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
export function providerUsage(data, requestedModel, provider) {
  const u = data?.usage || {};
  const input = nonnegative(u.prompt_tokens ?? u.input_tokens);
  const output = nonnegative(u.completion_tokens ?? u.output_tokens);
  const total = nonnegative(u.total_tokens) ?? (input != null && output != null ? input + output : null);
  const actualModel = typeof data?.model === 'string' ? data.model : null;
  return {
    provider, model: requestedModel, actual_model: actualModel,
    provider_request_id: typeof data?.id === 'string' ? data.id : null,
    input_tokens: input, output_tokens: output, total_tokens: total,
    provider_cost_actual: nonnegative(u.cost),
    estimated_cost_usd: estimateAICostUsd(actualModel || requestedModel, input, output),
    usage_details: {
      cached_tokens: nonnegative(u.prompt_tokens_details?.cached_tokens),
      reasoning_tokens: nonnegative(u.completion_tokens_details?.reasoning_tokens),
      // Estimates do not claim to model cache discounts or other pricing dimensions.
      estimate_incomplete: !!(u.prompt_tokens_details?.cached_tokens || u.completion_tokens_details?.reasoning_tokens),
    },
  };
}
