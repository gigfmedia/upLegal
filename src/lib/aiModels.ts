/**
 * Modelos de IA disponibles para el análisis de documentos (LegalUp AI).
 * El backend usa estos IDs contra el proveedor configurado en AI_PROVIDER_BASE_URL.
 */

export type AIModelOption = {
  id: string;
  label: string;
};

export const AI_MODELS: AIModelOption[] = [
  { id: 'openai/gpt-oss-20b:free', label: 'GPT-OSS 20B Free (rápido)' },
  { id: 'openai/gpt-oss-120b:fastest', label: 'GPT-OSS 120B (preciso)' },
  { id: 'deepseek-ai/DeepSeek-R1:fastest', label: 'DeepSeek R1 (razonamiento)' },
];

export const DEFAULT_AI_MODEL = 'openai/gpt-oss-20b:free';
