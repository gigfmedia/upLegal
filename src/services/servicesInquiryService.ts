import type { ServiceCategorySlug } from '@/data/servicesCatalog';

export interface ServicesInquiryPayload {
  contactName: string;
  companyName: string;
  email: string;
  phone?: string;
  serviceCategory: ServiceCategorySlug;
  description: string;
  privacyAccepted: true;
  idempotencyKey?: string;
  website?: string;
}

export interface ServicesInquiryResponse {
  success: true;
  id: string;
  reference: string;
  duplicate?: boolean;
}

export class ServicesInquiryError extends Error {
  code?: string;
  fields?: Record<string, string>;

  constructor(message: string, options?: { code?: string; fields?: Record<string, string> }) {
    super(message);
    this.name = 'ServicesInquiryError';
    this.code = options?.code;
    this.fields = options?.fields;
  }
}

export async function submitServicesInquiry(
  payload: ServicesInquiryPayload,
): Promise<ServicesInquiryResponse> {
  let response: Response;

  try {
    response = await fetch('/api/services/inquiries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ServicesInquiryError(
      'No pudimos conectar con el servidor. Revisa tu conexión e intenta nuevamente.',
      { code: 'NETWORK_ERROR' },
    );
  }

  const body = (await response.json().catch(() => null)) as
    | (Partial<ServicesInquiryResponse> & {
        error?: string;
        code?: string;
        fields?: Record<string, string>;
      })
    | null;

  if (!response.ok) {
    throw new ServicesInquiryError(
      body?.error || 'No pudimos registrar tu solicitud. Intenta nuevamente.',
      { code: body?.code, fields: body?.fields },
    );
  }

  if (!body?.id) {
    throw new ServicesInquiryError(
      'No pudimos confirmar tu solicitud. Intenta nuevamente o escríbenos a contacto@legalup.cl.',
      { code: 'INVALID_RESPONSE' },
    );
  }

  return body as ServicesInquiryResponse;
}
