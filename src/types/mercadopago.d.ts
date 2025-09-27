declare module 'mercadopago' {
  interface MercadoPagoConfigOptions {
    accessToken: string;
    options?: {
      timeout?: number;
      idempotencyKey?: string;
    };
  }

  class MercadoPagoConfig {
    constructor(options: MercadoPagoConfigOptions);
  }

  interface PreferenceItem {
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
    description?: string;
    currency_id?: string;
  }

  interface PreferencePayer {
    name?: string;
    surname?: string;
    email: string;
    phone?: {
      area_code: string;
      number: string;
    };
    address?: {
      zip_code: string;
      street_name: string;
      street_number: string;
    };
  }

  interface PreferenceBackUrls {
    success: string;
    failure: string;
    pending: string;
  }

  interface PreferencePaymentMethods {
    installments: number;
    excluded_payment_methods?: Array<{ id: string }>;
    excluded_payment_types?: Array<{ id: string }>;
  }

  interface CreatePreferencePayload {
    items: PreferenceItem[];
    payer?: PreferencePayer;
    external_reference?: string;
    notification_url?: string;
    back_urls?: PreferenceBackUrls;
    auto_return?: 'approved' | 'all';
    payment_methods?: PreferencePaymentMethods;
    statement_descriptor?: string;
    binary_mode?: boolean;
  }

  interface PreferenceResponse {
    id: string;
    init_point?: string;
    sandbox_init_point?: string;
    // Additional properties that might be returned by the API
    items?: Array<{
      id: string;
      title: string;
      quantity: number;
      unit_price: number;
    }>;
    payer?: {
      email: string;
      [key: string]: unknown;
    };
    // Add other known properties here instead of using [key: string]: any
  }

  class Preference {
    constructor(config: MercadoPagoConfig);
    create(body: { body: CreatePreferencePayload }): Promise<PreferenceResponse>;
  }

  export { MercadoPagoConfig, Preference };
}
