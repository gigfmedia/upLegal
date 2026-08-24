/**
 * Modelos de IA disponibles para el análisis de documentos (LegalUp AI).
 * El backend usa estos IDs contra el proveedor configurado en AI_PROVIDER_BASE_URL.
 */

export type AIModelOption = {
  id: string;
  label: string;
};

export const AI_MODELS: AIModelOption[] = [
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (estable)' },
  { id: 'z-ai/glm-5.2:free', label: 'GLM 5.2 Free (razonamiento)' },
  { id: 'openai/gpt-oss-20b:free', label: 'GPT-OSS 20B Free (rápido)' },
  { id: 'openai/gpt-oss-120b:fastest', label: 'GPT-OSS 120B (preciso)' },
  { id: 'deepseek-ai/DeepSeek-R1:fastest', label: 'DeepSeek R1 (razonamiento)' },
];

export const DEFAULT_AI_MODEL = 'openai/gpt-4o-mini';
