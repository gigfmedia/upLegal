/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
  readonly VITE_STRIPE_SECRET_KEY: string;
  readonly VITE_STRIPE_WEBHOOK_SECRET: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // Agrega aquí otras variables de entorno que necesites
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
