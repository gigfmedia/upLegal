import type {
  AssistantChatResponse,
  AssistantLawyer,
  LegalCategory,
  QuickTopic,
} from '@/types/legalAssistant';

const getApiBaseUrl = (): string => {
  const base =
    import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';
  return (base as string).replace(/\/+$/, '');
};

export const CATEGORY_LABELS: Record<LegalCategory, string> = {
  arriendo: 'Arriendo / inmobiliario',
  familia: 'Familia',
  laboral: 'Laboral',
  civil: 'Civil / contratos',
  consumidor: 'Consumidor',
  comercial: 'Comercial / empresas',
  penal: 'Penal',
  otros: 'Otro problema',
};

export const QUICK_TOPICS: QuickTopic[] = [
  { id: 'arriendo', label: 'Tengo un problema con mi arriendo', emoji: '🏠', hint: 'Tengo un problema con mi arriendo: garantía, desalojo, contrato o inmobiliaria.', category: 'arriendo' },
  { id: 'laboral', label: 'Problema laboral', emoji: '💼', hint: 'Tengo un problema laboral: despido, finiquito, sueldo impago o acoso.', category: 'laboral' },
  { id: 'familia', label: 'Tema de familia', emoji: '👨‍👩‍👧', hint: 'Tengo un tema de familia: pensión de alimentos, divorcio o cuidado de hijos.', category: 'familia' },
  { id: 'civil', label: 'Tengo una deuda', emoji: '💰', hint: 'Tengo una deuda: pagaré, cobros o incumplimiento de pago.', category: 'civil' },
  { id: 'comercial', label: 'Necesito revisar un contrato', emoji: '📝', hint: 'Necesito revisar un contrato: redacción, revisión o incumplimiento.', category: 'comercial' },
];

export const formatCLP = (amount: number | null | undefined): string => {
  if (amount == null || Number.isNaN(amount)) return '';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const createLawyerSlug = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const getLawyerProfileUrl = (lawyer: AssistantLawyer): string =>
  `/abogado/${lawyer.slug}-${lawyer.id}`;

interface SendAssistantInput {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  userCity?: string;
  source?: string;
  visitorId?: string;
  conversationId?: string;
}

export class AssistantApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AssistantApiError';
    this.code = code;
  }
}

// Identidad anónima persistente del visitante (requiere navegador).
export function getAssistantVisitorId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    let id = window.localStorage.getItem('legalup_visitor_id');
    if (!id) {
      id =
        window.crypto?.randomUUID?.() ||
        Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      window.localStorage.setItem('legalup_visitor_id', id);
    }
    return id;
  } catch {
    return undefined;
  }
}

export async function sendAssistantMessage({
  messages,
  userCity,
  source = 'widget',
  visitorId,
  conversationId,
}: SendAssistantInput): Promise<AssistantChatResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, userCity, source, visitor_id: visitorId, conversation_id: conversationId }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
  } & Partial<AssistantChatResponse>;

  if (!res.ok) {
    throw new AssistantApiError(
      body?.error || 'No se pudo procesar tu consulta. Intenta nuevamente.',
      body?.code
    );
  }

  return body as AssistantChatResponse;
}
