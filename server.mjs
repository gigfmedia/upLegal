import { retiredAITrialInvite } from './server/retiredAITrialInvite.mjs';
import { createAIMetering } from './server/ai/metering.mjs';
import { PRO_AI_ALLOWANCE, PLUS_AI_ALLOWANCE, commercialQuotaForPlan, FREE_CASE_ALLOWANCE, freeQuotaForPlan } from './server/ai/proAllowance.mjs';
import { PLAN_NOT_AVAILABLE, PLUS_ACQUISITION_DISABLED, isPlusAcquisitionEnabled, normalizePlanCode, resolveCheckoutPlanCode, PLUS_PRICE_CLP, PRO_STANDARD_PRICE_CLP_CANON, resolvePlanPrice, canonicalPaidPlan } from './server/ai/plans.mjs';
import {
  CONFLICT_CODE,
  normalizeEmail,
  isValidEmail,
  splitName,
  decideInvitePath,
  buildInviteMarker,
  buildInviteEmail,
  buildInviteAudit,
  checkRouteCooldown,
  ownsInviteIdentity,
} from './server/admin/lawyerInvite.mjs';
import { hasCanonicalDocumentReference, resolveAnalysisModel, honestEvidenceLocation } from './server/ai/coreAuthority.mjs';
import { consultationBase, bookingClientTotal, bookingPricingSnapshot } from './shared/bookingPricing.mjs';
import { confirmCompanyCancellation } from './server/subscriptions/companyCancellation.mjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { v4 as uuidv4 } from 'uuid';
import { load } from 'cheerio';
import axios from 'axios';
import { Resend } from 'resend';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import {
  AI_TRIAL_MAX_CASES,
  AI_TRIAL_MAX_DOCUMENTS,
  normalizeAIEmail,
} from './server/ai/trialIdentity.mjs';
import { extractPdfText } from './server/ai/pdfText.mjs';
import { chatCompletion, isAIProviderConfigured, createLlmCallBudget } from './server/ai/provider.mjs';
import { buildAnalysisSystemPrompt, buildAnalysisUserPrompt } from './server/ai/legalPrompt.mjs';
import { normalizeDeadlineItem } from './server/ai/deadlineDates.mjs';
import {
  buildChatSystemPrompt,
  buildChatContext,
  buildChatUserPrompt,
  CHAT_LIMITS,
} from './server/ai/legalChatPrompt.mjs';
import { getProCaseHeader, formatProCaseBlock } from './server/ai/proCaseContext.mjs';
import {
  selectRelevantResearch,
  formatResearchLegalContext,
} from './server/ai/researchMemory.mjs';
import {
  buildDraftSystemPrompt,
  buildDraftContext,
  selectDraftEvidence,
  validateDraftSources,
  DRAFT_LIMITS,
} from './server/ai/caseDrafting.mjs';
import {
  buildSourceManifest,
  fingerprintManifest,
  readLatestSnapshot,
  persistSnapshotIfNew,
  resolveSnapshotCase,
  formatSnapshotBlock,
  computeCaseIntelligence,
  assembleIntelligencePayload,
} from './server/ai/caseSnapshots.mjs';
import {
  searchJurisprudence,
  validateResearchQuery,
  classifyLegalQuery,
} from './server/ai/jurisprudenceSources.mjs';
import {
  detectDocumentMode,
  selectDocumentEvidence,
  shouldAllowDocumentOnlyFallback,
  verifyDocumentClaims,
  DOCUMENT_GROUNDING_LIMITS,
} from './server/ai/documentGrounding.mjs';
import {
  buildJurisprudenceSystemPrompt,
  buildJurisprudenceUserPrompt,
  buildJurisprudenceCaseContext,
  selectSourcesForContext,
  JURISPRUDENCE_LIMITS,
} from './server/ai/jurisprudencePrompt.mjs';
import {
  allocateDynamicContextBudget,
} from './server/ai/dynamicContextBudget.mjs';
import {
  buildJurisprudenceOutcome,
  runJurisprudenceWithRetry,
} from './server/ai/jurisprudencePipeline.mjs';
import {
  classifyProblem,
  matchLawyers,
  buildRecommendationCopy,
  explainRecommendation,
  sanitizeMessages,
  sanitizeText,
  detectProcessIntent,
  detectLawyerServicesIntent,
  findLawyerServicesByName,
  ASSISTANT_CATEGORIES,
  ASSISTANT_SUBCATEGORIES,
  ASSISTANT_LIMITS,
} from './server/ai/assistant.mjs';
import { createNotificationService } from './server/notifications/service.mjs';
import { createAuthorization, isPlatformAdmin } from './server/auth/authorization.mjs';

async function sendEmailIdempotent({ supabase, businessEventId, type, recipient, sendFn }) {
  const normalizedRecipient = String(recipient || '').trim().toLowerCase();
  if (!normalizedRecipient) return { skipped: true, reason: 'no_recipient' };
  try {
    const { error: insertError } = await supabase.from('notification_deliveries').insert({
      business_event_id: businessEventId,
      notification_type: type,
      recipient: normalizedRecipient,
      status: 'pending',
    });
    if (insertError && insertError.code !== '23505') throw insertError;
    if (insertError && insertError.code === '23505') {
      const { data: existing } = await supabase.from('notification_deliveries').select('status').eq('business_event_id', businessEventId).eq('notification_type', type).eq('recipient', normalizedRecipient).maybeSingle();
      if (existing?.status === 'sent') return { skipped: true, reason: 'already_sent' };
      await supabase.from('notification_deliveries').update({ status: 'pending', updated_at: new Date().toISOString() }).eq('business_event_id', businessEventId).eq('notification_type', type).eq('recipient', normalizedRecipient);
    }
  } catch (e) {
    // If claim fails for unexpected reason, proceed to send but log
    console.warn('[email_idempotency] claim failed', businessEventId, type, e?.message);
  }
  try {
    const result = await sendFn();
    await supabase.from('notification_deliveries').update({ status: 'sent', sent_at: new Date().toISOString(), provider_message_id: result?.id || null, updated_at: new Date().toISOString() }).eq('business_event_id', businessEventId).eq('notification_type', type).eq('recipient', normalizedRecipient);
    return { sent: true, id: result?.id || null };
  } catch (e) {
    await supabase.from('notification_deliveries').update({ status: 'failed', error: String(e?.message || e).slice(0, 1000), updated_at: new Date().toISOString() }).eq('business_event_id', businessEventId).eq('notification_type', type).eq('recipient', normalizedRecipient);
    throw e;
  }
}
import { createCompanyAuthorization } from './server/auth/companyAuthorization.mjs';
import { sendMetaPurchaseEvent } from './server/metaCapi.mjs';
import { deriveCaseActions, CASE_ACTION_TYPES } from './server/ai/caseActionLayer.mjs';
import {
  WORKFLOW_STATUSES,
  WORKFLOW_PERSISTABLE_TYPES,
  WORKFLOW_ALLOWED_TRANSITIONS,
  WORKFLOW_PRIORITY_ORDER,
  WORKFLOW_STATUS_RANK,
  sortWorkflowItems,
  isValidWorkflowStatus,
  isAllowedTransition,
  getPersistableActions,
  buildWorkflowTimestampUpdates,
} from './server/ai/caseWorkflow.mjs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config();

// Get environment variables — backend uses clean names only.
// Frontend VITE_* vars in .env.local are NOT consumed by this server.
// Keeping a single VITE_SUPABASE_URL fallback for convenience since it is
// not a secret (identical to the anon key URL the frontend already exposes).
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
const appUrl = process.env.APP_URL || 'https://legalup.cl';
const mercadoPagoWebhookUrl =
  process.env.MERCADOPAGO_WEBHOOK_URL ||
  process.env.VITE_MERCADOPAGO_WEBHOOK_URL || '';
const resendApiKey = process.env.RESEND_API_KEY || '';

const isLocal = appUrl.includes('localhost') || appUrl.includes('127.0.0.1');

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL is required but not set.');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY (o SERVICE_ROLE_KEY) is required but not set.');
  console.error('   Available env vars (names only):',
    Object.keys(process.env)
      .filter(k => k.includes('SERVICE_ROLE') || k.includes('SUPABASE'))
      .join(', ') || '(none found with those keywords)'
  );
  process.exit(1);
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

/** Emite un log estructurado de diagnóstico de investigación jurídica (sin secretos). */
function logDiagnostic(event, fields) {
  try {
    console.warn(`[LegalUpAI] ${event}`, JSON.stringify(fields));
  } catch {
    // Nunca debe romper el flujo por un fallo de logging.
  }
}

const resolveWebhookUrl = (req) => {
  if (mercadoPagoWebhookUrl) return mercadoPagoWebhookUrl;
  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = forwardedProto || req.protocol || 'https';
  const host = req.get('x-forwarded-host') || req.get('host');
  if (!host) return '';
  return `${protocol}://${host}/api/mercadopago/webhook`;
};

// Emails del dueño/propietario de LegalUp (para marcar pruebas internas y que
// no contaminen métricas reales de clientes).
const OWNER_EMAILS = new Set([
  'gigfmedia@icloud.com',
  'juan.fercommerce@gmail.com',
]);

const isOwnerEmail = (email) => OWNER_EMAILS.has(String(email || '').trim().toLowerCase());

if (!resend) {
  console.warn('⚠️ RESEND_API_KEY is not configured. Emails will NOT be sent.');
}

if (!isAIProviderConfigured()) {
  console.warn('⚠️ AI_PROVIDER_API_KEY is not configured. LegalUp AI document analysis will FAIL.');
}

if (!mercadoPagoWebhookUrl) {
  console.warn('⚠️ MERCADOPAGO_WEBHOOK_URL is not configured. MercadoPago webhooks will NOT be received, and bookings may remain pending.');
}

// GA4 Measurement Protocol Configuration
const ga4MeasurementId = process.env.GA4_MEASUREMENT_ID;
const ga4ApiSecret = process.env.GA4_API_SECRET;

if (!ga4MeasurementId || !ga4ApiSecret) {
  console.warn('⚠️ GA4_MEASUREMENT_ID or GA4_API_SECRET is not configured. GA4 purchase events will NOT be sent.');
}

// Send GA4 Purchase Event using Measurement Protocol
const sendGA4PurchaseEvent = async (params) => {
  const { transaction_id, value, currency, booking_id, lawyer_id, appointment_id, is_owner, article_slug, ga_client_id, ga_session_id } = params;

  if (!ga4MeasurementId || !ga4ApiSecret) {
    console.warn('[GA4] Skipping purchase event - GA4 credentials not configured');
    return;
  }

  try {
    console.log('[GA4] Sending purchase event', { transaction_id, value, currency, booking_id, lawyer_id, appointment_id, article_slug });

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${ga4MeasurementId}&api_secret=${ga4ApiSecret}`;

    if (!ga_client_id) {
      console.warn('[GA4] Skipping purchase — no ga_client_id, not fabricating from transaction_id');
      return;
    }
    const payload = {
      client_id: ga_client_id,
      events: [
        {
          name: 'purchase',
          params: {
            transaction_id,
            value,
            currency,
            ...(booking_id && { booking_id }),
            ...(lawyer_id && { lawyer_id }),
            ...(appointment_id && { appointment_id }),
            ...(is_owner !== undefined && { transport_is_owner: is_owner }),
            ...(params.article_slug && { article_slug: params.article_slug }),
            ...(ga_session_id && { session_id: ga_session_id }),
            items: [
              {
                item_id: booking_id,
                item_name: 'Legal Consultation',
                price: value,
                quantity: 1
              }
            ]
          }
        }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GA4] Purchase event failed', { status: response.status, error: errorText });
      return;
    }

    console.log('[GA4] Purchase event sent successfully', { transaction_id, value, currency });
  } catch (error) {
    console.error('[GA4] Purchase event failed', error);
    // Do not throw - payment flow should continue even if GA4 fails
  }
};

const sendDocumentPurchaseEvent = async ({ doc, paymentId }) => {
  const itemName = doc.type === 'pagare' ? 'Pagaré' : 'Documento Legal';
  const is_owner = isOwnerEmail(doc.user_email);

  // GA4 server-side purchase (only for real, webhook-confirmed payments)
  if (ga4MeasurementId && ga4ApiSecret) {
    try {
      const url = `https://www.google-analytics.com/mp/collect?measurement_id=${ga4MeasurementId}&api_secret=${ga4ApiSecret}`;
      const payload = {
        client_id: doc.id,
        events: [
          {
            name: 'purchase',
            params: {
              transaction_id: doc.id,
              value: Number(doc.total_paid) || 0,
              currency: 'CLP',
              document_id: doc.id,
              document_type: doc.type,
              mp_payment_id: paymentId,
              transport_is_owner: is_owner,
              items: [
                {
                  item_id: doc.id,
                  item_name: itemName,
                  price: Number(doc.total_paid) || 0,
                  quantity: 1,
                },
              ],
            },
          },
        ],
      };
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GA4] Document purchase event failed', { status: response.status, error: errorText });
      } else {
        console.log('[GA4] Document purchase event sent', { transaction_id: doc.id, value: Number(doc.total_paid) || 0, currency: 'CLP' });
      }
    } catch (error) {
      console.error('[GA4] Document purchase event failed', error);
    }
  }

  // Meta CAPI server-side purchase (dedup via event_id = doc.id)
  await sendMetaPurchaseEvent({
    eventId: doc.id,
    value: Number(doc.total_paid) || 0,
    currency: 'CLP',
    email: doc.user_email,
    itemName,
  });
};

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Notification Service central — único punto de creación de notificaciones in-app.
const notificationsService = createNotificationService(supabase);

// DEBUG: Check if Service Role Key looks like a JWT (legacy format)
try {
  if (serviceRoleKey && serviceRoleKey.includes('.')) {
    const [, payload] = serviceRoleKey.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    if (decoded.role !== 'service_role') {
      console.error('❌ CRITICAL: The key provided as SUPABASE_SERVICE_ROLE_KEY is not a valid backend secret. Role:', decoded.role);
    }
  }
} catch (e) {
  console.error('⚠️ Could not parse Supabase Key:', e.message);
}

// Configure MercadoPago — server-only, nunca VITE_ (secreto no debe ir al bundle)
const mercadopagoAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
const mpClient = new MercadoPagoConfig({
  accessToken: mercadopagoAccessToken,
  options: { timeout: 5000 }
});

// Create API client instance
const mp = new Payment({ client: mpClient });

// Initialize Express app
const app = express();
app.set('trust proxy', 1); // Trust first proxy (Render/Heroku load balancer) for secure cookies

// Configure CORS
const corsOptions = {
  origin: [
    'https://legalup.cl',
    'https://www.legalup.cl',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://uplegal.netlify.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-AI-Operation-ID'],
  credentials: true
};

// Apply middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Authorization uses Auth server-managed claims, never editable profile/user metadata.
const { authenticate, requireAdmin, requireAuthentication } = createAuthorization({ supabase });
const companyAuthorization = createCompanyAuthorization({ supabase, authenticate });

// Health check para mantener Render despierto
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

// Helper to normalize strings safely
const safeTrim = (value) => {
  if (typeof value !== 'string') return value ?? null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

// Constants
const DEFAULT_CLIENT_SURCHARGE_PERCENT = 0.1;
const DEFAULT_PLATFORM_FEE_PERCENT = 0.2;
const DEFAULT_CURRENCY = 'CLP';

const normalizeRut = (rut = '') => rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();

// ---- LegalUp AI — Fase 2: análisis de documentos ----
const AI_DOCUMENTS_BUCKET = 'ai-documents';
const AI_DEFAULT_MODEL = process.env.AI_DEFAULT_MODEL || 'gpt-4o-mini';
const MAX_EXTRACTED_TEXT_CHARS = 80000;

// ---- LegalUp AI — Fase 3.5: suscripción y trial ----
const AI_SUBSCRIPTION_PLAN = 'essential';
const AI_SUBSCRIPTION_PRICE_CLP = 49900;
const AI_SUBSCRIPTION_TRIAL_DAYS = 5;
const AI_SUBSCRIPTION_TRIAL_MS = AI_SUBSCRIPTION_TRIAL_DAYS * 24 * 60 * 60 * 1000;
const AI_EXTERNAL_REF_PREFIX = 'AI_';
const AI_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// ---- LegalUp Pro — Fase 3B-1: Founder 15 $19.990 ----
const PRO_SUBSCRIPTION_PLAN = 'saas_essential';
const PRO_SUBSCRIPTION_PRICE_CLP = 19990;
const PRO_INTRO_PRICE_CLP = 19990;
const PRO_STANDARD_PRICE_CLP = 49990;
const PRO_INTRO_SUCCESSFUL_PAYMENTS = 3;
const PRO_EXTERNAL_REF_PREFIX = 'PRO_';
const PLUS_EXTERNAL_REF_PREFIX = 'PLUS_';
const PLUS_SUBSCRIPTION_PRICE_CLP = PLUS_PRICE_CLP;
const PRO_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const PRO_FOUNDER_LIMIT = 15;

// ---- Pro billing intro → standard (4.28B.2) helpers ----
async function ensureProStandardPrice(subscription) {
  if (!subscription?.provider_subscription_id) return;
  if (subscription.status === 'cancelled' || subscription.status === 'expired') return;
  // Provider-first reconciliation: GET preapproval
  try {
    const r = await fetch(`https://api.mercadopago.com/preapproval/${subscription.provider_subscription_id}`, { headers: { Authorization: `Bearer ${mercadopagoAccessToken}` } });
    if (!r.ok) return;
    const pre = await r.json().catch(() => ({}));
    const providerAmount = Number(pre.auto_recurring?.transaction_amount ?? pre.transaction_amount);
    if (providerAmount === PRO_STANDARD_PRICE_CLP) {
      if (Number(subscription.amount_clp) !== PRO_STANDARD_PRICE_CLP) {
        await supabase.from('lawyer_subscriptions').update({ amount_clp: PRO_STANDARD_PRICE_CLP, updated_at: new Date().toISOString() }).eq('id', subscription.id);
      }
      return;
    }
    if (providerAmount !== PRO_INTRO_PRICE_CLP) return; // unexpected, do not overwrite
    // provider is intro, need to transition
    const put = await fetch(`https://api.mercadopago.com/preapproval/${subscription.provider_subscription_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mercadopagoAccessToken}` },
      body: JSON.stringify({ auto_recurring: { transaction_amount: PRO_STANDARD_PRICE_CLP, currency_id: 'CLP' } }),
    });
    if (!put.ok) return;
    const updated = await put.json().catch(() => ({}));
    const newAmount = Number(updated.auto_recurring?.transaction_amount ?? PRO_STANDARD_PRICE_CLP);
    if (newAmount === PRO_STANDARD_PRICE_CLP || put.ok) {
      await supabase.from('lawyer_subscriptions').update({ amount_clp: PRO_STANDARD_PRICE_CLP, updated_at: new Date().toISOString() }).eq('id', subscription.id);
    }
  } catch {}
}

const PRO_INTRO_PRICE_LABEL = '$19.990';
const PRO_STANDARD_PRICE_LABEL = '$49.990';

// ---- AI Feature gating (4.29D) — server authority mirrors src/lib/aiFeatures.ts ----
const AI_FEATURES_ALL = ['document_analysis','case_chat','jurisprudence','document_drafting','case_analysis','workflow_generation'];
const PLAN_FEATURES_SERVER = {
  free: [],
  essential: [...AI_FEATURES_ALL],
  // 4.38C: current Pro includes Research/Jurisprudence (10/month commercial quota).
  pro_limited: ['document_analysis','case_chat','case_analysis','jurisprudence'],
  // 4.57D: Plus v1 = same core product as Pro, higher quotas only. No
  // Plus-only features; shares the paid core set (Plus >= Pro by capacity).
  plus: ['document_analysis','case_chat','case_analysis','jurisprudence'],
  // 4.44A: free first-Case lifetime allowance (chat + analysis only; no research).
  // 4.49A: +1 lifetime Research/Jurisprudence (still no case_analysis).
  free_case: ['document_analysis','case_chat','jurisprudence'],
};
function serverCanUseAIFeature(feature, plan = 'free') {
  const allowed = PLAN_FEATURES_SERVER[plan] ?? PLAN_FEATURES_SERVER.free;
  return allowed.includes(feature);
}
function getPlanForAccess(access) {
  if (!access) return 'free';
  // 4.57D: Plus resolves its own plan (higher quotas); Pro keeps pro_limited.
  // Stored Plus rows carry plan='plus' literally; direct comparison keeps
  // this function free of module imports (vm-harness isolated tests).
  if (access.plan === 'plus') return 'plus';
  if (access.subscription?.plan === 'plus') return 'plus';
  if (access.isProLimited || access.plan === 'pro_limited') return 'pro_limited';
  // 4.44A: free first-Case plan must resolve before the hasAccess fallback
  // below (which would otherwise map it to essential).
  if (access.plan === 'free_case') return 'free_case';
  if (access.isTrialing || access.isActive) return 'essential';
  // fallback: if hasAccess but plan unknown, treat as essential for legacy
  if (access.hasAccess) return 'essential';
  return 'free';
}

// 4.44A: lifetime free-Case quota for resolved entitlement (null otherwise).
// Case/workspace come from server-resolved access, never client input.
const freeQuotaForEntitlement = (entitlement) => {
  if (!entitlement || entitlement.plan !== 'free_case') return null;
  const quota = freeQuotaForPlan(entitlement.plan);
  if (!quota) return null;
  const caseId = entitlement.access?.freeCaseId || null;
  const workspaceId = entitlement.access?.freeWorkspaceId || null;
  if (!caseId || !workspaceId) return null;
  return { caseId, workspaceId, chat: quota.chat, analysis: quota.analysis, research: quota.research };
};

// Límites de uso (Bloque 22). Trial: 3 casos / 10 documentos (trigger DB).
// Pro: sin límite comercial de workspaces; 50 documentos (trigger DB, 4.38C).
const AI_MAX_DOCUMENT_SIZE_MB = 20;

// Presupuesto de tokens para respuestas del chat. El proveedor (p. ej.
// gpt-oss-20b) genera un campo `reasoning` que consume parte del presupuesto;
// este margen evita que la respuesta (content) quede vacía con casos extensos.
const AI_CHAT_MAX_TOKENS = Number(process.env.AI_CHAT_MAX_TOKENS) || 2400;

// ---- LegalUp AI — Fase 3.6: AI Usage & Cost Control ----
// Unidad interna: 1 crédito = 1.000 tokens (credits_used = ceil(tokens/1000)).

// Límites técnicos de protección (NO son límites comerciales visibles):
// protegen contra abuso/costos inesperados mientras se recopilan datos reales
// de consumo. Sin "límite comercial explícito" hasta decidir los créditos.
const AI_PROTECT_MAX_MONTHLY_TOKENS = Number(process.env.AI_PROTECT_MAX_MONTHLY_TOKENS) || 20000000;
const AI_PROTECT_MAX_MONTHLY_REQUESTS = Number(process.env.AI_PROTECT_MAX_MONTHLY_REQUESTS) || 5000;
const AI_PROTECT_RATE_LIMIT_PER_MINUTE = Number(process.env.AI_PROTECT_RATE_LIMIT_PER_MINUTE) || 30;
// Estimación 4 chars ≈ 1 token (aproximación conservadora para el límite técnico).
const AI_ESTIMATED_CHARS_PER_TOKEN = 4;

// Rate limiter en memoria: Map<userId, Array<timestamp>>.
const aiRateLimiter = new Map();
const AI_RATE_WINDOW_MS = 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [userId, stamps] of aiRateLimiter) {
    const fresh = stamps.filter((t) => now - t < AI_RATE_WINDOW_MS);
    if (fresh.length === 0) aiRateLimiter.delete(userId);
    else aiRateLimiter.set(userId, fresh);
  }
}, AI_RATE_WINDOW_MS).unref();

// Esquema del análisis estructurado que debe devolver el modelo.
const AIDocumentAnalysisSchema = z.object({
  summary: z.string(),
  document_type: z.string(),
  parties: z.array(z.string()),
  key_points: z.array(z.string()),
  obligations: z.array(z.string()),
  deadlines: z.array(z.union([z.string(), z.object({ date: z.string(), description: z.string() })])),
  risks: z.array(z.string()),
  recommendations: z.array(z.string()),
}).transform((data) => ({
  ...data,
  // FASE 4.60B.2: normaliza fechas calendario explícitas a AAAA-MM-DD;
  // texto relativo/ambiguo se preserva verbatim (la promoción 4.60B solo
  // pre-rellena AAAA-MM-DD estricto).
  deadlines: data.deadlines.map((item) => normalizeDeadlineItem(item)),
}));

// Profile management endpoint used during signup to ensure profiles are created
app.post('/api/profiles', requireAuthentication, async (req, res) => {
  try {
    const {
      userId,
      email,
      firstName,
      lastName,
      role,
      rut,
      pjudVerified,
      displayName
    } = req.body || {};

    if (!userId || !email || !role) {
      return res.status(400).json({
        error: 'Missing required fields: userId, email and role.'
      });
    }

    if (userId !== req.authUser.id) {
      return res.status(403).json({ error: 'No puedes modificar el perfil de otro usuario.' });
    }
    if (['admin', 'superadmin'].includes(String(role).trim().toLowerCase()) && !isPlatformAdmin(req.authUser)) {
      return res.status(403).json({ error: 'El rol administrativo solo se administra desde Auth.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedFirstName = safeTrim(firstName);
    const normalizedLastName = safeTrim(lastName);
    const computedDisplayName = safeTrim(displayName) ||
      [normalizedFirstName, normalizedLastName].filter(Boolean).join(' ') ||
      normalizedEmail.split('@')[0];

    const timestamp = new Date().toISOString();

    const payload = {
      id: userId,
      user_id: userId,
      email: normalizedEmail,
      first_name: normalizedFirstName,
      last_name: normalizedLastName,
      display_name: computedDisplayName,
      role,
      rut: safeTrim(rut) || null,
      pjud_verified: Boolean(pjudVerified),
      has_used_free_consultation: false,
      updated_at: timestamp,
      created_at: timestamp
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error upserting profile from service:', error);
      return res.status(500).json({
        error: 'No se pudo guardar el perfil del usuario.'
      });
    }

    return res.json({ success: true, profile: data || payload });
  } catch (error) {
    console.error('Unexpected error in /api/profiles:', error);
    return res.status(500).json({
      error: 'Error inesperado al crear el perfil.'
    });
  }
});

// Function to validate RUT verifier digit
const validateRutDV = (rut) => {
  const cleanRut = normalizeRut(rut);

  // Validate basic format
  if (!/^\d{7,8}[0-9K]$/i.test(cleanRut)) {
    return false;
  }

  // Extract verifier digit and number
  const dv = cleanRut.slice(-1).toUpperCase();
  const number = cleanRut.slice(0, -1);

  // Calculate expected verifier digit
  let sum = 0;
  let multiplier = 2;

  for (let i = number.length - 1; i >= 0; i--) {
    sum += parseInt(number.charAt(i)) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const calculatedDV = (11 - (sum % 11)) % 11;
  const expectedDV = calculatedDV === 10 ? 'K' : calculatedDV.toString();

  return dv === expectedDV;
};

// Simple endpoint to validate RUT (format only, no PJUD verification)
app.post('/verify-rut', async (req, res) => {
  const { rut } = req.body || {};

  if (!rut) {
    return res.status(400).json({
      valid: false,
      message: 'Se requiere un RUT para la verificación.'
    });
  }

  try {
    const isValid = validateRutDV(rut);

    return res.json({
      valid: isValid,
      message: isValid ? 'RUT válido' : 'RUT inválido'
    });
  } catch (error) {
    console.error('Error al validar RUT:', error);
    return res.status(500).json({
      valid: false,
      message: 'Error al validar el RUT',
      error: error.message
    });
  }
});

// Verify lawyer endpoint
app.post('/verify-lawyer', async (req, res) => {
  const { rut, fullName } = req.body || {};

  if (!rut) {
    return res.status(400).json({
      verified: false,
      message: 'Se requiere un RUT para la verificación.'
    });
  }

  try {

    // Format RUT (remove dots and dash, keep only numbers and K)
    const cleanRut = normalizeRut(rut);

    // Validate RUT format
    if (!/^\d{7,8}[0-9K]$/i.test(cleanRut)) {
      return res.status(400).json({
        verified: false,
        message: 'Formato de RUT inválido. Use el formato 12345678-9'
      });
    }

    // Split RUT into body and verifier
    const rutBody = cleanRut.slice(0, -1);
    const rutVerifier = cleanRut.slice(-1);

    // URL of the Poder Judicial AJAX search endpoint
    const searchUrl = 'https://www.pjud.cl/ajax/Lawyers/search';

    // Prepare form data for the search
    const formData = new URLSearchParams();
    formData.append('dni', rutBody);
    formData.append('digit', rutVerifier);

    // Create AbortController for timeout (15 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      // Submit the search form with timeout
      const searchResponse = await axios.post(searchUrl, formData.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html, */*; q=0.01',
          'Accept-Language': 'es-CL,es;q=0.9,en-US;q=0.8,en;q=0.7',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': 'https://www.pjud.cl',
          'Referer': 'https://www.pjud.cl/transparencia/busqueda-de-abogados',
        },
        signal: controller.signal,
        timeout: 15000 // Additional timeout for axios
      });

      clearTimeout(timeoutId);

      // Parse the results
      const $ = load(searchResponse.data);

      // Check for "No results" alert
      if ($('.alert-warning').length > 0 && $('.alert-warning').text().includes('No se encontraron registros')) {
        return res.json({
          verified: false,
          message: 'No se encontró el abogado en los registros del Poder Judicial',
          details: {
            rut: cleanRut,
            nombre: fullName || 'No proporcionado',
            reason: 'No se encontró en los registros del Poder Judicial'
          }
        });
      }

      // Check for success table
      const resultTable = $('table');

      if (resultTable.length === 0) {
        return res.status(500).json({
          verified: false,
          message: 'Error al interpretar la respuesta del Poder Judicial',
          details: { requiresHumanVerification: true }
        });
      }

      // Extract data from the result table
      const rows = resultTable.find('tbody tr');

      if (rows.length === 0) {
        return res.json({
          verified: false,
          message: 'No se encontraron resultados válidos en la tabla'
        });
      }

      // If we found at least one row, the RUT exists as a lawyer
      const firstRow = rows.first();
      const cols = firstRow.find('td');

      // Extract nombre from the first column - try multiple methods
      let nombre = 'No disponible';
      if (cols.length >= 1) {
        // Try multiple extraction methods
        // Method 1: Direct text extraction
        nombre = $(cols[0]).text().trim();

        // Method 2: If empty, try getting inner HTML and cleaning it
        if (!nombre || nombre === '' || nombre.length < 2) {
          const innerHtml = $(cols[0]).html() || '';
          nombre = innerHtml.replace(/<[^>]*>/g, '').trim();
        }

        // Method 3: Try finding text in nested elements
        if (!nombre || nombre === '' || nombre.length < 2) {
          const nestedText = $(cols[0]).find('*').first().text().trim();
          if (nestedText && nestedText.length > 0) {
            nombre = nestedText;
          }
        }

        // Clean up any extra whitespace and newlines
        nombre = nombre.replace(/\s+/g, ' ').replace(/\n/g, ' ').trim();

        // If still empty or too short, try the entire row text
        if (!nombre || nombre === '' || nombre.length < 2) {
          const rowText = firstRow.text().trim();
          // Try to extract name from row (usually first part before numbers or special chars)
          const nameMatch = rowText.match(/^([A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+\s+[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+(?:\s+[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+)*)/);
          if (nameMatch && nameMatch[1]) {
            nombre = nameMatch[1].trim();
          }
        }
      }

      // Check for suspension (Sanción Ejecutoriada Permanente)
      const rowText = firstRow.text();
      if (rowText.includes('Ejecutoriada') && rowText.includes('30-12-9999')) {
        return res.json({
          verified: false,
          message: 'El abogado se encuentra suspendido (Sanción Ejecutoriada Permanente). No es posible registrarse.',
          details: {
            rut: cleanRut,
            nombre: nombre,
            reason: 'Abogado suspendido indefinidamente',
            suspensionType: 'Permanente',
            suspensionDate: '30-12-9999'
          }
        });
      }

      // **Check if RUT is already registered by another user**
      // Moved AFTER PJUD verification for better performance
      // Only check if RUT was found in PJUD
      const rutVariations = [
        cleanRut, // 123456789
        `${cleanRut.slice(0, -1)}-${cleanRut.slice(-1)}`, // 12345678-9
        cleanRut.replace(/\B(?=(\d{3})+(?!\d))/g, '.'), // 12.345.6789
        `${cleanRut.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${cleanRut.slice(-1)}` // 12.345.678-9
      ];

      // Try to find existing RUT using a more efficient query
      const { data: existingProfiles, error: dbError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, rut, user_id')
        .in('rut', rutVariations)
        .limit(10);

      if (dbError) {
        // Continue with verification even if DB check fails
      } else if (existingProfiles && existingProfiles.length > 0) {
        // Double-check by normalizing RUTs (in case of format variations)
        const existingProfile = existingProfiles.find(profile => {
          if (!profile.rut) return false;
          const normalizedProfileRut = normalizeRut(profile.rut);
          return normalizedProfileRut === cleanRut;
        });

        if (existingProfile) {
          // RUT is already registered
          const existingName = `${existingProfile.first_name || ''} ${existingProfile.last_name || ''}`.trim();

          // Format RUT for display (12.345.678-9)
          const formatRutForDisplay = (rut) => {
            const clean = rut.replace(/[^0-9kK]/g, '');
            if (clean.length < 2) return clean;

            const body = clean.slice(0, -1);
            const dv = clean.slice(-1);

            // Add dots every 3 digits from right to left
            const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            return `${formatted}-${dv}`;
          };

          const formattedRut = formatRutForDisplay(cleanRut);

          return res.json({
            verified: false,
            message: `El RUT ${formattedRut} ya está registrado por ${existingName} en nuestra plataforma.`,
            details: {
              rut: cleanRut,
              formattedRut,
              registeredBy: existingName,
              reason: 'RUT duplicado'
            }
          });
        }
      }

      // Ensure nombre is valid before returning
      if (nombre === 'No disponible' || !nombre || nombre.trim().length < 2) {
        // Try one more time with all columns
        const allColsText = firstRow.find('td').map((i, el) => $(el).text().trim()).get();
        for (const colText of allColsText) {
          // Look for text that looks like a name (starts with capital, has spaces)
          const namePattern = /^[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+(?:\s+[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+)+/;
          const match = colText.match(namePattern);
          if (match && match[0].length > 5) {
            nombre = match[0].trim();
            break;
          }
        }
      }

      let lawyerData = {
        rut: cleanRut,
        nombre: nombre && nombre !== 'No disponible' ? nombre : 'No disponible',
        nombreCompleto: nombre && nombre !== 'No disponible' ? nombre : 'No disponible',
        region: cols.length > 2 ? $(cols[2]).text().trim() : '',
        source: 'Poder Judicial de Chile',
        verifiedAt: new Date().toISOString()
      };

      return res.json({
        verified: true,
        message: 'Abogado verificado exitosamente',
        details: lawyerData
      });
    } catch (axiosError) {
      clearTimeout(timeoutId);

      // Handle timeout specifically
      if (axiosError.code === 'ECONNABORTED' || axiosError.message?.includes('aborted') || axiosError.name === 'AbortError') {
        return res.status(408).json({
          verified: false,
          message: 'La verificación tardó demasiado. Por favor, inténtalo de nuevo.',
          error: 'timeout'
        });
      }

      // Re-throw to be caught by outer catch
      throw axiosError;
    }
  } catch (error) {
    // Handle timeout errors specifically
    if (error.message && (error.message.includes('Timeout') || error.message.includes('timeout'))) {
      return res.status(408).json({
        verified: false,
        message: 'La verificación tardó demasiado. Por favor, inténtalo de nuevo.',
        error: 'timeout'
      });
    }

    return res.status(500).json({
      verified: false,
      message: 'Error al realizar la verificación',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Create payment endpoint
app.post('/create-payment', async (req, res) => {
  try {
    // Log the incoming request

    const {
      amount,
      originalAmount,
      description,
      userId,
      lawyerId,
      appointmentId,
      bookingId,
      successUrl,
      failureUrl,
      pendingUrl,
      userEmail,
      userName
    } = req.body;

    // Validations — 2B: allow bookingId as alternative to appointmentId for modern traceability
    if ((!amount && !originalAmount) || (!appointmentId && !bookingId)) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['amount or originalAmount', 'appointmentId or bookingId'],
        received: { amount, originalAmount, appointmentId, bookingId }
      });
    }

    // Handle guest users and general consultations
    let actualUserId = userId;
    let actualLawyerId = lawyerId;

    // Create or get system user for guest consultations
    if (!userId || userId === 'guest') {
      const guestEmail = userEmail || `guest-${Date.now()}@legalup.cl`;
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      const foundUser = existingUser?.users?.find(u => u.email === guestEmail);

      if (foundUser) {
        actualUserId = foundUser.id;
      } else {
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: guestEmail,
          email_confirm: true,
          user_metadata: { first_name: userName || 'Cliente', last_name: 'Invitado', role: 'client' }
        });
        if (createError) {
          console.error('Error creating guest user:', createError);
          return res.status(500).json({ error: 'Failed to create guest user' });
        }
        actualUserId = newUser.user.id;
      }
    }

    // Handle general consultation lawyer
    if (!lawyerId || lawyerId === 'consulta-general') {
      const systemEmail = 'sistema@legalup.cl';
      const { data: existingLawyer } = await supabase.auth.admin.listUsers();
      const foundLawyer = existingLawyer?.users?.find(u => u.email === systemEmail);

      if (foundLawyer) {
        actualLawyerId = foundLawyer.id;
      } else {
        const { data: newLawyer, error: createError } = await supabase.auth.admin.createUser({
          email: systemEmail,
          email_confirm: true,
          user_metadata: { first_name: 'Sistema', last_name: 'LegalUp', role: 'lawyer' }
        });
        if (createError) {
          console.error('Error creating system lawyer:', createError);
          return res.status(500).json({ error: 'Failed to create system lawyer' });
        }
        actualLawyerId = newLawyer.user.id;
      }
    }

    const numericAmount = Number(amount ?? originalAmount);

    if (!Number.isFinite(numericAmount) || numericAmount < 1000) {
      return res.status(400).json({
        error: 'Amount must be at least 1000 CLP'
      });
    }

    let clientSurchargePercent = DEFAULT_CLIENT_SURCHARGE_PERCENT;
    let platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT;
    let currency = DEFAULT_CURRENCY;
    // Fetch settings safely
    try {
      const { data: settingsData } = await supabase
        .from('platform_settings')
        .select('client_surcharge_percent, platform_fee_percent, currency')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (settingsData) {
        clientSurchargePercent = Number(settingsData.client_surcharge_percent ?? clientSurchargePercent);
        platformFeePercent = Number(settingsData.platform_fee_percent ?? platformFeePercent);
        currency = settingsData.currency ?? currency;
      }
    } catch (settingsError) {
      console.warn('Could not fetch platform settings (using defaults):', settingsError.message);
    }

    /* HARDCODED SETTINGS REMOVED - Logic Restored */

    const paymentId = uuidv4();

    const hasOriginalAmount = typeof originalAmount === 'number' && Number.isFinite(originalAmount) && originalAmount > 0;
    const derivedOriginalAmount = hasOriginalAmount
      ? Math.round(Number(originalAmount))
      : Math.round(numericAmount / (1 + clientSurchargePercent));

    const clientAmount = hasOriginalAmount
      ? Math.round(Number(originalAmount) * (1 + clientSurchargePercent))
      : Math.round(numericAmount);

    const clientSurcharge = Math.max(clientAmount - derivedOriginalAmount, 0);
    const platformFee = Math.round(derivedOriginalAmount * platformFeePercent);
    const lawyerAmount = Math.max(derivedOriginalAmount - platformFee, 0);


    const paymentData = {
      id: paymentId,
      amount: derivedOriginalAmount,  // Must equal platform_fee + lawyer_amount per DB constraint
      original_amount: derivedOriginalAmount,
      client_surcharge: clientSurcharge,
      client_surcharge_percent: clientSurchargePercent,
      platform_fee_percent: platformFeePercent,
      lawyer_amount: lawyerAmount,
      platform_fee: platformFee,
      currency,
      status: 'pending',
      user_id: actualUserId,
      lawyer_id: actualLawyerId,
      // service_id removed as it does not exist in current DB schema
      metadata: {  // Store additional data in metadata JSON field
        description: description || 'Consulta Legal',
        appointment_id: appointmentId,
        client_total: clientAmount,  // Actual amount client pays (with surcharge)
        payment_gateway_id: null
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert payment into database using SECURE RPC (Bypasses RLS)
    let payment;

    try {
      const { data, error } = await supabase.rpc('create_payment_secure', {
        p_id: paymentData.id,
        p_amount: paymentData.amount,
        p_original_amount: paymentData.original_amount,
        p_client_surcharge: paymentData.client_surcharge,
        p_client_surcharge_percent: paymentData.client_surcharge_percent,
        p_platform_fee_percent: paymentData.platform_fee_percent,
        p_lawyer_amount: paymentData.lawyer_amount,
        p_platform_fee: paymentData.platform_fee,
        p_currency: paymentData.currency,
        p_status: paymentData.status,
        p_user_id: paymentData.user_id,
        p_lawyer_id: paymentData.lawyer_id,
        p_metadata: paymentData.metadata,
        p_created_at: paymentData.created_at,
        p_updated_at: paymentData.updated_at
      });

      if (error) {
        console.error('❌ Supabase RPC INSERT Error:', JSON.stringify(error, null, 2));
        throw error;
      }

      // Data from RPC might come differently depending on return type, handling jsonb
      payment = data;
    } catch (insertError) {
      console.error('❌ Exception during RPC INSERT:', insertError);
      throw insertError;
    }

    // 2B: Link payment to booking if bookingId provided and valid (FK SET NULL ensures safety)
    if (bookingId) {
      try {
        // Verify booking exists and belongs to same lawyer (tenant isolation)
        const { data: bookingRow } = await supabase.from('bookings').select('id, lawyer_id').eq('id', bookingId).maybeSingle();
        if (bookingRow && bookingRow.lawyer_id === actualLawyerId) {
          await supabase.from('payments').update({ booking_id: bookingId }).eq('id', paymentId);
          // Also store booking_id in metadata for webhook traceability
          await supabase.from('payments').update({ metadata: { ...paymentData.metadata, booking_id: bookingId } }).eq('id', paymentId).then(()=>{});
        } else if (bookingRow) {
          console.warn(`[2B] booking_id lawyer mismatch: payment ${paymentId} lawyer ${actualLawyerId} vs booking ${bookingRow.lawyer_id}`);
        }
      } catch (e) {
        console.warn('[2B] failed to link booking_id', e.message);
      }
    }

    // Create MercadoPago preference data
    const webhookUrl = resolveWebhookUrl(req);
    const preferenceData = {
      items: [{
        id: paymentId,
        title: description || 'Consulta Legal - LegalUp',
        description: `Consulta con abogado especializado - ${description}`,
        quantity: 1,
        currency_id: currency,
        unit_price: clientAmount
      }],
      payer: {
        email: userEmail,
        name: userName || 'Cliente LegalUp'
      },
      back_urls: {
        success: successUrl || `${process.env.FRONTEND_URL}/payment/success`,
        failure: failureUrl || `${process.env.FRONTEND_URL}/payment/failure`,
        pending: pendingUrl || `${process.env.FRONTEND_URL}/payment/pending`
      },
      ...(isLocal ? {} : { auto_return: 'approved' }),
      binary_mode: true,
      external_reference: bookingId || paymentId,
      statement_descriptor: 'LEGALUP',
      ...(webhookUrl ? { notification_url: webhookUrl } : {})
    };

    // Create preference using raw fetch to bypass any SDK potential issues
    const mpAccessToken = mercadopagoAccessToken || '';

    // DEBUG: Check if token looks like Supabase (JWT starts with eyJ)
    const isJwt = mpAccessToken.startsWith('eyJ');

    if (isJwt) {
      console.error('CRITICAL CONFIG ERROR: VITE_MERCADOPAGO_ACCESS_TOKEN appears to be a Supabase Key (JWT)!');
      throw new Error('Server Config Error: MercadoPago Token is invalid');
    }

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpAccessToken}`
      },
      body: JSON.stringify(preferenceData)
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('--- DEBUG: RAW FETCH FAILED ---', mpData);
      throw new Error(`MercadoPago API Error: ${mpResponse.status} - ${JSON.stringify(mpData)}`);
    }

    // Return the payment link
    const paymentLink = mpData.init_point || mpData.sandbox_init_point;

    if (!paymentLink) {
      throw new Error('No payment link received from MercadoPago');
    }

    return res.json({
      success: true,
      payment_id: paymentId,
      payment_link: paymentLink,
      message: 'Payment created successfully'
    });

  } catch (error) {
    console.error('Error in create-payment:', error);

    // More detailed error logging
    if (error.response) {
      console.error('MercadoPago API error:', error.response);
    }

    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// Test endpoint for CORS
app.get('/test-cors', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.get('origin'),
    timestamp: new Date().toISOString()
  });
});

// Get payment status endpoint
app.get('/payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({ payment });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// BOOKINGS ENDPOINTS
// ============================================

// Create booking endpoint - NO AUTHENTICATION REQUIRED
app.post('/api/bookings/create', async (req, res) => {
  try {
    const {
      lawyer_id,
      user_id,
      user_email,
      user_name,
      user_phone,
      scheduled_date,
      scheduled_time,
      duration,
      price,
      booking_type = 'appointment',
      service_id,
      service_title,
      service_description,
      service_delivery_time,
      requires_meeting,
      experiment_variant,
      posthog_distinct_id,
      ga_client_id,
      ga_session_id,
      article_slug,
    } = req.body;

    const isServiceBooking = booking_type === 'service';

    console.log('[booking/create] body:', req.body);

    console.log('[booking/create] validation', {
      lawyer_id,
      user_email,
      user_name,
      price,
      booking_type,
      service_id,
    });

    if (!lawyer_id || !user_email || !user_name || !price) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['lawyer_id', 'user_email', 'user_name', 'price'],
      });
    }

    if (isServiceBooking) {
      if (!service_id || !service_title) {
        return res.status(400).json({
          error: 'Missing service fields',
          required: ['service_id', 'service_title'],
        });
      }
    } else if (!scheduled_date || !scheduled_time || !duration) {
      return res.status(400).json({
        error: 'Missing appointment fields',
        required: ['scheduled_date', 'scheduled_time', 'duration', 'price'],
      });
    }

    const resolvedDuration = isServiceBooking ? (duration || 0) : duration;

    if (!isServiceBooking && ![30, 60, 90, 120].includes(resolvedDuration)) {
      return res.status(400).json({ error: 'Duration must be 30, 60, 90 or 120 minutes' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Prevent double-booking for scheduled appointments only — expire stale pending first (durable)
    if (!isServiceBooking) {
      try {
        await supabase.rpc('expire_stale_pending_bookings');
      } catch {}
      try {
        const { data: existingBookings, error: existingError } = await supabase
          .from('bookings')
          .select('id, scheduled_time, duration, status')
          .eq('lawyer_id', lawyer_id)
          .eq('scheduled_date', scheduled_date)
          .in('status', ['pending', 'confirmed']);

        if (existingError) {
          console.error('Error checking existing bookings:', existingError);
        } else if (existingBookings && existingBookings.length > 0) {
          const parseTimeToMinutes = (timeStr = '') => {
            const [hh, mm] = String(timeStr).slice(0, 5).split(':').map(Number);
            if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
            return hh * 60 + mm;
          };

          const reqStart = parseTimeToMinutes(scheduled_time);
          const reqDur = Number(resolvedDuration);
          const reqEnd = reqStart == null ? null : reqStart + reqDur;

          if (reqStart != null && reqEnd != null) {
            const overlaps = existingBookings.some((b) => {
              const bStart = parseTimeToMinutes(b.scheduled_time);
              const bDur = Number(b.duration) || 0;
              const bEnd = bStart == null ? null : bStart + bDur;
              if (bStart == null || bEnd == null) return false;
              return reqStart < bEnd && reqEnd > bStart;
            });

            if (overlaps) {
              return res.status(409).json({
                error: 'Time slot not available',
                message: 'Este horario ya está reservado. Por favor elige otro.',
              });
            }
          }
        }
      } catch (e) {
        console.error('Exception checking booking overlap:', e);
      }
    }

    const { data: lawyer, error: lawyerError } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name')
      .eq('user_id', lawyer_id)
      .eq('role', 'lawyer')
      .single();

    if (lawyerError || !lawyer) {
      return res.status(404).json({ error: 'Lawyer not found' });
    }

    // FASE 4B-2 C3: server-side price — NEVER fallback to client
    let computedPrice;
    let authoritativeBase;
    let pricingSnapshot;
    let priceSource;
    try {
      const { data: platformSettings, error: pricingSettingsError } = await supabase
        .from('platform_settings')
        .select('client_surcharge_percent, platform_fee_percent')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pricingSettingsError) throw pricingSettingsError;
      const surcharge = Number(platformSettings?.client_surcharge_percent ?? 0.1);
      if (isServiceBooking) {
        if (!service_id) {
          return res.status(400).json({ error: 'service_id requerido para booking de servicio', code: 'INVALID_SERVICE' });
        }
        const { data: service } = await supabase
          .from('lawyer_services')
          .select('price_clp, lawyer_user_id')
          .eq('id', service_id)
          .maybeSingle();
        if (!service) {
          return res.status(400).json({ error: 'Servicio no válido', code: 'INVALID_SERVICE' });
        }
        if (String(service.lawyer_user_id) !== String(lawyer_id)) {
          return res.status(403).json({ error: 'Servicio no pertenece al abogado seleccionado', code: 'SERVICE_NOT_OWNED' });
        }
        if (service.price_clp == null || !Number.isFinite(Number(service.price_clp)) || Number(service.price_clp) <= 0) {
          return res.status(422).json({ error: 'Precio de servicio no configurado', code: 'NO_VALID_PRICE' });
        }
        const original = Number(service.price_clp);
        authoritativeBase = original;
        computedPrice = bookingClientTotal(original, surcharge);
        priceSource = 'service';
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('hourly_rate_clp')
          .eq('user_id', lawyer_id)
          .maybeSingle();
        const hourlyRate = Number(profile?.hourly_rate_clp || 0);
        if (!Number.isFinite(hourlyRate) || hourlyRate <= 0 || !resolvedDuration) {
          return res.status(422).json({ error: 'Tarifa del abogado no configurada', code: 'NO_VALID_PRICE' });
        }
        const original = consultationBase(hourlyRate, resolvedDuration);
        authoritativeBase = original;
        computedPrice = bookingClientTotal(original, surcharge);
        priceSource = 'hourly';
      }
      pricingSnapshot = bookingPricingSnapshot(authoritativeBase, surcharge, Number(platformSettings?.platform_fee_percent ?? 0.2));
      if (!Number.isFinite(computedPrice) || computedPrice <= 0) {
        return res.status(422).json({ error: 'Precio final no válido', code: 'NO_VALID_PRICE' });
      }
      if (computedPrice !== price) {
        console.warn(`[4B-2] client price ignored: client ${price} vs server ${computedPrice} (${priceSource}) lawyer ${lawyer_id}`);
      }
    } catch (e) {
      console.error('[4B-2] price calc failed', e);
      return res.status(500).json({ error: 'No se pudo validar el precio', code: 'PRICE_VALIDATION_FAILED' });
    }

    const inferRequiresMeeting = () => {
      if (typeof requires_meeting === 'boolean') return requires_meeting;
      if (!service_title) return true;
      const title = service_title.toLowerCase();
      if (title.includes('consulta')) return true;
      if (title.includes('videollamada')) return true;
      if (title.includes('reunión') || title.includes('reunion')) return true;
      return false;
    };

    // Snapshot checkout economics for idempotent webhook (C12)
    const bookingInsert = {
      lawyer_id,
      user_id: user_id || null,
      user_email,
      user_name,
      user_phone: user_phone || null,
      // 4.37B — semantic origin is server-owned: marketplace bookings are
      // always LEGALUP_MARKETPLACE. Client body cannot choose source
      // (req.body.source is never read here on purpose).
      source: 'LEGALUP_MARKETPLACE',
      scheduled_date: isServiceBooking ? null : scheduled_date,
      scheduled_time: isServiceBooking ? null : scheduled_time,
      duration: isServiceBooking ? null : resolvedDuration,
      price: computedPrice,
      status: 'pending',
      booking_type: isServiceBooking ? 'service' : 'appointment',
      service_id: isServiceBooking ? service_id : null,
      service_title: isServiceBooking ? service_title : null,
      service_description: isServiceBooking ? (service_description || null) : null,
      service_delivery_time: isServiceBooking ? (service_delivery_time || null) : null,
      requires_meeting: isServiceBooking ? inferRequiresMeeting() : true,
      experiment_variant: experiment_variant || null,
      posthog_distinct_id: posthog_distinct_id || null,
      pricing_snapshot: pricingSnapshot,
      metadata: {
        article_slug: article_slug ? String(article_slug).trim() || null : null,
        utm_source: req.body.utm_source ? String(req.body.utm_source).trim() || null : null,
        utm_medium: req.body.utm_medium ? String(req.body.utm_medium).trim() || null : null,
        utm_campaign: req.body.utm_campaign ? String(req.body.utm_campaign).trim() || null : null,
        is_test: String(user_email || '').includes('@test.invalid') || String(article_slug || '').includes('test') ? true : undefined,
        ga_client_id: ga_client_id ? String(ga_client_id).trim() || null : null,
        ga_session_id: ga_session_id ? String(ga_session_id).trim() || null : null,
      },
    };

    console.log('BOOKING INSERT', bookingInsert);

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingInsert)
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return res.status(500).json({ error: 'Failed to create booking' });
    }

    try {
      await supabase.from('payment_events').insert({
        event_type: 'started',
        amount: price,
        status: 'processing',
        metadata: {
          booking_id: booking.id,
          lawyer_id,
          booking_type: booking.booking_type,
          service_id: booking.service_id || null,
          source: isServiceBooking ? 'service_checkout' : 'booking_create',
        },
        user_id: user_id || null,
      });
    } catch (trackingError) {
      console.error('Failed to track payment start:', trackingError);
    }

    // Notificaciones in-app "consulta agendada" (no duplican emails; el email
    // de confirmación se envía recién tras el pago aprobado en el webhook).
    try {
      const lawyerName = `${lawyer.first_name || ''} ${lawyer.last_name || ''}`.trim();
      await notificationsService.notifyUsers([
        ...(user_id
          ? [{
              userId: user_id,
              type: 'booking.created',
              title: isServiceBooking ? 'Servicio solicitado' : 'Consulta agendada',
              message: isServiceBooking
                ? `Tu solicitud de "${service_title || 'servicio legal'}" fue registrada correctamente.`
                : `Tu consulta con ${lawyerName || 'tu abogado'} está programada para el ${scheduled_date} a las ${scheduled_time}.`,
              entityType: 'booking',
              entityId: booking.id,
              metadata: {
                booking_type: booking.booking_type,
                scheduled_date: scheduled_date || null,
                scheduled_time: scheduled_time || null,
              },
              eventId: `booking_created:${booking.id}`,
            }]
          : []),
        {
          userId: lawyer_id,
          type: 'booking.created',
          title: 'Nueva consulta agendada',
          message: isServiceBooking
            ? `${user_name} solicitó "${service_title || 'un servicio legal'}".`
            : `${user_name} agendó una consulta contigo para el ${scheduled_date} a las ${scheduled_time}.`,
          entityType: 'booking',
          entityId: booking.id,
          metadata: {
            booking_type: booking.booking_type,
            scheduled_date: scheduled_date || null,
            scheduled_time: scheduled_time || null,
          },
          eventId: `booking_created:${booking.id}`,
        },
      ]);
    } catch (notifyError) {
      console.error('Failed to send booking notifications:', notifyError);
    }

    let leadId = null;
    try {
      const { data: leadData, error: leadError } = await supabase
        .from('booking_leads')
        .insert({
          lawyer_id,
          name: user_name,
          email: user_email,
          phone: user_phone || null,
          selected_date: scheduled_date || null,
          selected_time: scheduled_time || null,
          duration: resolvedDuration || null,
          price,
          booking_id: booking.id,
          booking_type: booking.booking_type,
          service_id: booking.service_id,
          service_title: booking.service_title,
          status: 'started',
        })
        .select('id')
        .single();

      if (leadError) {
        console.error('Failed to save booking_lead:', leadError);
      } else {
        leadId = leadData.id;
      }
    } catch (leadErr) {
      console.error('Exception saving booking_lead:', leadErr);
    }

    const webhookUrl = resolveWebhookUrl(req);
    const mpItemTitle = isServiceBooking
      ? `${service_title} — ${lawyer.first_name} ${lawyer.last_name}`
      : `Asesoría Legal - ${lawyer.first_name} ${lawyer.last_name}`;
    const mpItemDescription = isServiceBooking
      ? (service_description || service_title)
      : `Asesoría legal de ${resolvedDuration} minutos`;

    const preferenceData = {
      items: [{
        id: booking.id,
        title: mpItemTitle,
        description: mpItemDescription,
        category_id: 'services',
        quantity: 1,
        unit_price: computedPrice,
      }],
      payer: {
        name: user_name,
        email: user_email,
      },
      back_urls: {
        success: `${appUrl}/booking/success?booking_id=${booking.id}`,
        failure: `${appUrl}/booking/failure?booking_id=${booking.id}`,
        pending: `${appUrl}/booking/pending?booking_id=${booking.id}`,
      },
      ...(appUrl.startsWith('https') ? { auto_return: 'approved' } : {}),
      external_reference: booking.id,
      metadata: {
        booking_id: booking.id,
        booking_type: booking.booking_type,
        lawyer_id,
        user_id: user_id || null,
        user_email,
        user_name,
        service_id: booking.service_id || null,
        service_title: booking.service_title || null,
        requires_meeting: booking.requires_meeting,
        duration: resolvedDuration,
        scheduled_date: scheduled_date || null,
        scheduled_time: scheduled_time || null,
      },
      statement_descriptor: 'LEGALUP',
      ...(webhookUrl ? { notification_url: webhookUrl } : {}),
    };

    let mpData;
    try {
      const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mercadopagoAccessToken}`,
        },
        body: JSON.stringify(preferenceData),
      });

      if (!mpResponse.ok) {
        const errorData = await mpResponse.json().catch(() => ({}));
        console.error('MercadoPago API error:', errorData, { booking_id: booking.id, status: mpResponse.status });
        await supabase.from('bookings').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', booking.id);
        console.log(`[booking] step=checkout_creation_failed booking_id=${booking.id} status=failed reason=mp_${mpResponse.status}`);
        throw new Error('Failed to create MercadoPago preference');
      }

      mpData = await mpResponse.json();
    } catch (mpError) {
      // Network/timeout o throw anterior: si booking sigue pending sin preference, liberarlo
      if (!mpData) {
        try {
          const { data: check } = await supabase.from('bookings').select('status, mercadopago_preference_id').eq('id', booking.id).maybeSingle();
          if (check && check.status === 'pending' && !check.mercadopago_preference_id) {
            await supabase.from('bookings').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', booking.id);
            console.log(`[booking] step=checkout_creation_failed booking_id=${booking.id} status=failed reason=network`);
          }
        } catch {}
      }
      throw mpError;
    }

    await supabase
      .from('bookings')
      .update({
        mercadopago_preference_id: mpData.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    if (leadId) {
      try {
        await supabase.from('booking_leads').update({ status: 'checkout' }).eq('id', leadId);
      } catch (leadUpdateErr) {
        console.error('Failed to update booking_lead to checkout:', leadUpdateErr);
      }
    }

    const isTestToken = (mercadopagoAccessToken || '').startsWith('TEST-');
    const paymentLink = (isLocal || isTestToken) ? (mpData.sandbox_init_point || mpData.init_point) : (mpData.init_point || mpData.sandbox_init_point);

    // Evento de conversión principal del asistente/plataforma. No bloquea el flujo.
    try {
      await capturePostHog('booking_created', user_email, {
        booking_id: booking.id,
        booking_type: booking.booking_type,
        lawyer_id,
        service_id: booking.service_id || null,
        service_title: booking.service_title || null,
        price,
        duration: resolvedDuration,
        source: req.body.source || 'site',
        posthog_distinct_id: req.body.posthog_distinct_id || null,
      });
    } catch (posthogError) {
      console.error('[Assistant] booking_created failed', posthogError);
    }

    res.json({
      success: true,
      booking_id: booking.id,
      lead_id: leadId,
      payment_link: paymentLink,
      price: computedPrice,
      message: isServiceBooking ? 'Service booking created successfully' : 'Booking created successfully',
    });
  } catch (error) {
    console.error('Error in /api/bookings/create:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  }
});

// -------------------------------------------------------
// PATCH /api/leads/:id/status
// Actualizar el status de un booking_lead.
// Usado por: BookingSuccessPage (paid), webhook (paid/abandoned)
// -------------------------------------------------------
app.patch('/api/leads/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['started', 'checkout', 'paid', 'abandoned'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const { data, error } = await supabase
      .from('booking_leads')
      .update({ status })
      .eq('id', id)
      .select('id, status')
      .single();

    if (error) {
      console.error('Error updating booking_lead status:', error);
      return res.status(404).json({ error: 'Lead not found or update failed' });
    }

    res.json({ success: true, lead: data });
  } catch (error) {
    console.error('Error in PATCH /api/leads/:id/status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get booking by ID - PUBLIC endpoint for success page
app.get('/api/bookings/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      console.error('[bookings/:id] not found', bookingId, error?.message);
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Fetch lawyer profile separately (evita fallo por FK name)
    let lawyer = null;
    try {
      const { data: lawyerData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, specialties, avatar_url')
        .eq('user_id', booking.lawyer_id)
        .maybeSingle();
      if (lawyerData) {
        lawyer = {
          user_id: lawyerData.user_id,
          first_name: lawyerData.first_name,
          last_name: lawyerData.last_name,
          specialties: lawyerData.specialties,
          profile_picture_url: lawyerData.avatar_url,
          avatar_url: lawyerData.avatar_url,
        };
      }
    } catch {}

    res.json({ booking: { ...booking, lawyer } });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// MERCADOPAGO OAUTH ENDPOINTS
// ============================================

// ============================================
// MERCADOPAGO OAUTH PKCE HELPERS
// ============================================
function base64URLEncode(str) {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}

function generateCodeVerifier() {
  return base64URLEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier) {
  return base64URLEncode(sha256(verifier));
}

// OAuth callback endpoint - receives authorization code from MercadoPago
app.get('/api/mercadopago/auth-url', async (req, res) => {
  try {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    const state = crypto.randomUUID(); // Generate secure state

    const backendUrl = process.env.API_BASE_URL || process.env.VITE_API_BASE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001';
    const redirectUri = `${backendUrl}/api/mercadopago/oauth/callback`;
    const clientId = process.env.MERCADOPAGO_CLIENT_ID;

    // Store verifier in DB (Cookies fail on Render due to cross-site issues)
    const { error: dbError } = await supabase
      .from('auth_states')
      .insert({ state, code_verifier: verifier });

    if (dbError) {
      console.error('Failed to store PKCE state:', dbError);
      // Fallback for dev? No, strictly require DB for production stability
      return res.status(500).json({ error: 'Failed to initialize secure session' });
    }

    // Build Auth URL
    const authUrl = new URL('https://auth.mercadopago.com/authorization');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('platform_id', 'mp');
    authUrl.searchParams.append('state', state); // Valid state from DB
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('code_challenge', challenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');

    res.json({ url: authUrl.toString() });

  } catch (error) {
    console.error('Error generating Auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth url' });
  }
});

// OAuth callback endpoint - receives authorization code from MercadoPago
app.get('/api/mercadopago/oauth/callback', async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;

    // Handle OAuth errors
    if (oauthError) {
      const frontendUrl = appUrl || 'https://legalup.cl';
      return res.redirect(`${frontendUrl}/lawyer/earnings?mp_error=${oauthError}`);
    }

    if (!code) {
      const frontendUrl = appUrl || 'https://legalup.cl';
      return res.redirect(`${frontendUrl}/lawyer/earnings?mp_error=no_code`);
    }

    // Backend-Initiated: Retrieve verifier from TABLE using state
    let codeVerifier = null;

    if (state) {
      const { data: authState, error: stateError } = await supabase
        .from('auth_states')
        .select('code_verifier')
        .eq('state', state)
        .maybeSingle();

      if (authState) {
        codeVerifier = authState.code_verifier;
        // Cleanup: delete used state
        await supabase.from('auth_states').delete().eq('state', state);
      } else {
        console.warn('PKCE State not found in DB:', state);
      }
    }

    if (!codeVerifier) {
      console.warn('WARNING: code_verifier is missing. Link might have expired or state is invalid.');
    }

    // Build redirect_uri - MUST match exactly what was used in the authorization request
    const backendUrl = process.env.API_BASE_URL || process.env.VITE_API_BASE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001';
    const redirectUri = `${backendUrl}/api/mercadopago/oauth/callback`;

    // Exchange code for access token
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.MERCADOPAGO_CLIENT_ID,
      client_secret: process.env.MERCADOPAGO_CLIENT_SECRET,
      code: code,
      redirect_uri: redirectUri,
    });


    // Add verifier if present
    if (codeVerifier) {
      params.append('code_verifier', codeVerifier);
    }



    // Exchange code for access token
    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('MercadoPago Token Exchange Error:', errorText);

      let errorDetail = 'token_exchange_failed';
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.message || errorJson.error_description || errorJson.error || 'token_exchange_failed';
      } catch (e) {
        // use default or truncated text
        errorDetail = errorText.substring(0, 100);
      }

      const frontendUrl = appUrl || 'https://legalup.cl';
      return res.redirect(`${frontendUrl}/lawyer/earnings?mp_error=token_exchange_failed&details=${encodeURIComponent(errorDetail)}`);
    }

    const tokenData = await tokenResponse.json();

    // Get user info from MercadoPago
    const userResponse = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      const frontendUrl = appUrl || 'https://legalup.cl';
      return res.redirect(`${frontendUrl}/lawyer/earnings?mp_error=user_fetch_failed`);
    }

    const userData = await userResponse.json();

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    // Get the user_id from the state parameter (if provided) or try to get from session
    // For now, we'll need the frontend to save it, but we can also try to get it from a session
    // Since we don't have session info here, we'll redirect with the data and let frontend save it

    // However, we can also save it directly if we have a way to identify the user
    // For security, we'll still redirect with the data but also try to save it server-side if possible

    // Redirect to frontend with OAuth data
    const frontendUrl = appUrl || 'https://legalup.cl';
    const redirectUrl = new URL(`${frontendUrl}/lawyer/earnings`);
    redirectUrl.searchParams.append('mp_success', 'true');
    redirectUrl.searchParams.append('mp_user_id', tokenData.user_id);
    redirectUrl.searchParams.append('mp_email', userData.email || '');
    redirectUrl.searchParams.append('mp_nickname', userData.nickname || '');

    // Store tokens temporarily in a secure way (you might want to use sessions instead)
    // For now, we'll pass them to the frontend to complete the connection
    redirectUrl.searchParams.append('mp_access_token', tokenData.access_token);
    redirectUrl.searchParams.append('mp_refresh_token', tokenData.refresh_token || '');
    redirectUrl.searchParams.append('mp_public_key', tokenData.public_key || '');
    redirectUrl.searchParams.append('mp_expires_at', expiresAt.toISOString());

    res.redirect(redirectUrl.toString());

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${appUrl}/lawyer/earnings?mp_error=server_error`);
  }
});

// Save MercadoPago account - called by frontend after OAuth callback
app.post('/api/mercadopago/save-account', requireAuthentication, async (req, res) => {
  try {
    const userId = req.authUser.id;
    if (req.body.userId !== undefined && req.body.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const {
      mercadopagoUserId,
      accessToken,
      refreshToken,
      publicKey,
      email,
      nickname,
      firstName,
      lastName,
      expiresAt
    } = req.body;

    if (!mercadopagoUserId || !accessToken) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Upsert the account
    const { data, error } = await supabase
      .from('mercadopago_accounts')
      .upsert({
        user_id: userId,
        mercadopago_user_id: mercadopagoUserId,
        access_token: accessToken,
        refresh_token: refreshToken,
        public_key: publicKey,
        email: email,
        nickname: nickname,
        first_name: firstName,
        last_name: lastName,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString() // Ensure created_at is set on first insert
      }, {
        onConflict: 'user_id'
      })
      .select('id, mercadopago_user_id, email, nickname, first_name, last_name, expires_at, created_at')
      .single();

    if (error) {
      console.error('Error upserting mercadopago_accounts:');
      return res.status(500).json({ error: 'Failed to save account' });
    }

    // SYNC TO PROFILES: Also update the profiles table to keep it in sync
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        mercado_pago_connected: true,
        mercado_pago_user_id: mercadopagoUserId,
        mercado_pago_email: email,
        mercado_pago_nickname: nickname,
        mercado_pago_connected_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileError) {
      console.warn('Warning: Failed to sync MercadoPago status to profiles table:');
      // We don't fail the request here because the main account table was updated, but it's worth logging
    }

    res.json({ success: true, account: data });

  } catch (error) {
    console.error('Save account error:');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get MercadoPago account for a user
app.get('/api/mercadopago/account/:userId', requireAuthentication, async (req, res) => {
  try {
    const userId = req.authUser.id;
    if (req.params.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { data, error } = await supabase
      .from('mercadopago_accounts')
      .select('id, mercadopago_user_id, email, nickname, first_name, last_name, expires_at, created_at')
      .eq('user_id', userId)
      .single();

    if (!error && data) {
      return res.json({ connected: true, account: data });
    }

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('mercado_pago_connected, mercado_pago_email, mercado_pago_nickname, mercado_pago_connected_at, mercado_pago_user_id, first_name, last_name')
      .eq('id', userId)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        return res.json({ connected: false });
      }
      throw profileError;
    }

    if (!profile?.mercado_pago_connected) {
      return res.json({ connected: false });
    }

    const accountFromProfile = {
      id: profile.mercado_pago_user_id ? profile.mercado_pago_user_id.toString() : `profile-${userId}`,
      mercadopago_user_id: profile.mercado_pago_user_id,
      email: profile.mercado_pago_email || '',
      nickname: profile.mercado_pago_nickname || '',
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      expires_at: profile.mercado_pago_connected_at || null,
      created_at: profile.mercado_pago_connected_at || null,
    };

    return res.json({ connected: true, account: accountFromProfile });

  } catch (error) {
    console.error('Get account error:');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Disconnect MercadoPago account
app.delete('/api/mercadopago/disconnect/:userId', requireAuthentication, async (req, res) => {
  try {
    const userId = req.authUser.id;
    if (req.params.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { error } = await supabase
      .from('mercadopago_accounts')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error disconnecting account:');
      return res.status(500).json({ error: 'Failed to disconnect account' });
    }

    // SYNC TO PROFILES: Update profiles table to reflect disconnection
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        mercado_pago_connected: false,
        mercado_pago_connected_at: null,
        mercado_pago_user_id: null,
        mercado_pago_email: null,
        mercado_pago_nickname: null
      })
      .eq('id', userId);

    if (profileError) {
      console.warn('Warning: Failed to sync disconnection to profiles table:');
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Disconnect error:');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// LEGALUP DOCUMENTS ENDPOINTS
// ============================================

// Create document + MercadoPago preference
app.post('/api/documents/create', async (req, res) => {
  try {
    const { type, user_email, user_name, payload, total_paid, amount, template_version } = req.body;

    if (!type || !user_email || !payload) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios',
        required: ['type', 'user_email', 'payload'],
      });
    }

    const { getDocumentProduct } = await import('./server/documents/catalog.mjs');
    const product = getDocumentProduct(type);
    if (!product) {
      return res.status(400).json({ error: 'Tipo de documento no válido', code: 'INVALID_PRODUCT' });
    }
    const officialPrice = product.amount;
    const officialCurrency = product.currency;

    if (total_paid !== undefined && total_paid !== null && String(total_paid).trim() !== '') {
      const clientPrice = Number(total_paid);
      if (!Number.isFinite(clientPrice) || clientPrice !== officialPrice) {
        return res.status(400).json({
          error: 'Precio no coincide con el valor oficial',
          code: 'PRICE_MISMATCH',
          expected_amount: officialPrice,
          expected_currency: officialCurrency,
        });
      }
    }

    // Insert document as pending_payment — siempre con precio oficial server-side
    const { data: doc, error: docError } = await supabase
      .from('generated_documents')
      .insert({
        type,
        status: 'pending_payment',
        user_email,
        user_name: user_name || null,
        payload,
        total_paid: officialPrice,
        amount: amount || null,
        template_version: template_version || 1,
      })
      .select()
      .single();

    if (docError) {
      console.error('[documents] Error creating document:', docError);
      return res.status(500).json({ error: 'Error al crear el documento' });
    }

    // Create MercadoPago preference — precio siempre desde catálogo server-side
    const webhookUrl = resolveWebhookUrl(req);
    const externalReference = `DOCUMENT_${doc.id}`;

    const preferenceData = {
      items: [{
        id: doc.id,
        title: product.title,
        description: product.description,
        quantity: 1,
        currency_id: officialCurrency,
        unit_price: officialPrice,
      }],
      payer: {
        email: user_email,
        name: user_name || 'Usuario',
      },
      back_urls: {
        success: `${appUrl}/documentos/${type}?status=approved&document_id=${doc.id}`,
        failure: `${appUrl}/documentos/${type}?status=failure`,
        pending: `${appUrl}/documentos/${type}?status=pending`,
      },
      ...(appUrl.startsWith('https') ? { auto_return: 'approved' } : {}),
      binary_mode: true,
      external_reference: externalReference,
      statement_descriptor: 'LEGALUP',
      ...(webhookUrl ? { notification_url: webhookUrl } : {}),
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mercadopagoAccessToken}`,
      },
      body: JSON.stringify(preferenceData),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      console.error('[documents] MP error:', errorData);
      return res.status(500).json({ error: 'Error al crear preferencia de pago' });
    }

    const mpData = await mpResponse.json();

    // Save preference ID
    await supabase
      .from('generated_documents')
      .update({ mercadopago_preference_id: mpData.id })
      .eq('id', doc.id);

    res.json({
      documentId: doc.id,
      preferenceId: mpData.id,
      initPoint: isLocal
        ? (mpData.sandbox_init_point || mpData.init_point)
        : (mpData.init_point || mpData.sandbox_init_point),
    });
  } catch (error) {
    console.error('[documents] Error in create:', error);
    res.status(500).json({ error: 'Error interno al crear documento' });
  }
});

// Get document by ID
app.get('/api/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: doc, error } = await supabase
      .from('generated_documents')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !doc) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    res.json(doc);
  } catch (error) {
    console.error('[documents] Error fetching:', error);
    res.status(500).json({ error: 'Error al obtener documento' });
  }
});

// Payment confirmation endpoint (called after MP redirect success)
app.post('/api/documents/payment-confirmation', async (req, res) => {
  try {
    const { document_id } = req.body;
    if (!document_id) {
      return res.status(400).json({ error: 'document_id requerido' });
    }

    const { data: doc, error } = await supabase
      .from('generated_documents')
      .select('*')
      .eq('id', document_id)
      .maybeSingle();

    if (error || !doc) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    if (doc.status === 'completed') {
      return res.json({ status: 'completed', pdf_url: doc.pdf_url });
    }

    if (doc.status === 'paid' || doc.status === 'processing') {
      return res.json({ status: doc.status, message: 'Documento en proceso' });
    }

    if (doc.status === 'failed' || doc.status === 'delivery_failed') {
      return res.json({ status: 'failed', error_message: doc.error_message || 'Error en la generación' });
    }

    return res.json({ status: doc.status });
  } catch (error) {
    console.error('[documents] Error confirming payment:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Create a payment preference for document review service
app.post('/api/documents/create-review-preference', async (req, res) => {
  try {
    const { document_id } = req.body;
    if (!document_id) {
      return res.status(400).json({ error: 'document_id requerido' });
    }

    const { data: doc, error } = await supabase
      .from('generated_documents')
      .select('*')
      .eq('id', document_id)
      .maybeSingle();

    if (error || !doc) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const reviewAmount = 59990;
    const externalReference = `DOCREVIEW_${document_id}`;

    const preferenceData = {
      items: [{
        id: `review_${document_id}`,
        title: `Consulta legal sobre tu pagaré — LegalUp`,
        description: '60 minutos de consulta con abogado, incluye revisión del pagaré generado',
        quantity: 1,
        currency_id: 'CLP',
        unit_price: reviewAmount,
      }],
      payer: {
        email: doc.user_email,
        name: doc.user_name || 'Usuario',
      },
      back_urls: {
        success: `${appUrl}/documentos/${doc.type}?review_status=approved&document_id=${document_id}`,
        failure: `${appUrl}/documentos/${doc.type}?review_status=failure`,
        pending: `${appUrl}/documentos/${doc.type}?review_status=pending`,
      },
      ...(appUrl.startsWith('https') ? { auto_return: 'approved' } : {}),
      binary_mode: true,
      external_reference: externalReference,
      statement_descriptor: 'LEGALUP',
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mercadopagoAccessToken}`,
      },
      body: JSON.stringify(preferenceData),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      console.error('[documents-review] MP error:', errorData);
      return res.status(500).json({ error: 'Error al crear preferencia de pago' });
    }

    const mpData = await mpResponse.json();

    res.json({
      preferenceId: mpData.id,
      initPoint: mpData.init_point || mpData.sandbox_init_point,
    });
  } catch (error) {
    console.error('[documents-review] Error:', error);
    res.status(500).json({ error: error.message || 'Error interno' });
  }
});

// MercadoPago Webhook
app.post('/api/mercadopago/webhook', async (req, res) => {
  try {
    console.log('Webhook RAW payload:', {
      body: req.body,
      query: req.query,
    });

    const topic = req.body?.topic || req.body?.type || req.body?.action;

    console.log('Detected topic/type/action:', topic);

    // 1. Ignore merchant_order immediately
    if (topic === 'merchant_order') {
      console.log('Ignoring merchant_order webhook');
      return res.status(200).send('OK');
    }

    // 1.1. Validación de firma MercadoPago (x-signature) — FAIL CLOSED
    // MANIFEST ARGENTINA: id:{data.id};request-id:{x-request-id};ts:{ts};
    // data.id se toma de query params (lowercased), fallback al body.
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    const signatureDataId = (
      req.query?.['data.id'] ??
      req.query?.data_id ??
      req.body?.data?.id ??
      ''
    ).toString().trim();
    const xSignatureHeader = req.headers['x-signature'] || '';
    const xRequestIdHeader = req.headers['x-request-id'] || '';

    const verifyWebhookSignature = (dataId, xSignature, requestId) => {
      const kv = {};
      for (const part of xSignature.split(',')) {
        const eq = part.indexOf('=');
        if (eq === -1) continue;
        const key = part.slice(0, eq).trim();
        const value = part.slice(eq + 1).trim();
        if (key) kv[key] = value;
      }

      const ts = kv['ts'];
      const v1 = kv['v1'];
      if (!ts || !v1) return { valid: false, reason: 'header_malformed' };

      const manifestParts = [];
      if (dataId) manifestParts.push(`id:${dataId.toLowerCase()}`);
      if (requestId) manifestParts.push(`request-id:${requestId}`);
      manifestParts.push(`ts:${ts}`);
      const manifest = manifestParts.join(';') + ';';

      const computed = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex');
      const a = Buffer.from(computed, 'utf8');
      const b = Buffer.from(v1, 'utf8');
      const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
      return { valid, reason: valid ? null : 'signature_mismatch' };
    };

    // FAIL CLOSED: sin secret configurado no se procesa nada.
    if (!webhookSecret) {
      console.error('[webhook] MERCADOPAGO_WEBHOOK_SECRET NOT configured. Webhook REJECTED (fail-closed). Set it in the webhook config of the sidebar.');
      return res.status(500).json({ error: 'Webhook verification secret not configured' });
    }

    // FAIL CLOSED: sin x-signature se rechaza siempre.
    if (!xSignatureHeader) {
      console.error('[webhook] Missing x-signature header. Webhook REJECTED (fail closed). x-request-id=' + xRequestIdHeader);
      return res.status(401).json({ error: 'Missing webhook signature' });
    }

    // FAIL CLOSED: con x-signature presente, exige firma válida.
    const signatureCheck = verifyWebhookSignature(signatureDataId, xSignatureHeader, xRequestIdHeader);
    if (signatureCheck.valid !== true) {
      console.error('[webhook] signature_verification_failed', {
        reason: signatureCheck.reason,
        x_request_id: xRequestIdHeader,
        topic,
      });
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    let paymentId = null;
    let source = '';

    // helper: limpia IDs
    const normalizeId = (value) => {
      if (!value) return null;

      const str = String(value)
        .trim()
        .split('?')[0]     // elimina query params
        .split('#')[0];    // seguridad extra

      // extrae solo números
      const match = str.match(/\d+/);
      return match ? match[0] : null;
    };

    // PRIORIDAD 1: data.id (recomendado MP v2)
    if (req.body?.data?.id) {
      paymentId = normalizeId(req.body.data.id);
      source = 'body.data.id';
    }

    // PRIORIDAD 2: resource
    if (!paymentId && req.body?.resource) {
      paymentId = normalizeId(req.body.resource);
      source = 'body.resource';
    }

    // PRIORIDAD 3: query params
    if (!paymentId && req.query?.['data.id']) {
      paymentId = normalizeId(req.query['data.id']);
      source = "query['data.id']";
    }

    if (!paymentId && req.query?.id) {
      paymentId = normalizeId(req.query.id);
      source = 'query.id';
    }

    console.log('Extracted Payment ID:', paymentId);
    console.log('Payment ID source:', source);
    console.log('Final topic:', topic);
    console.log('access token exists:', !!mercadopagoAccessToken);
    console.log('access token start:', mercadopagoAccessToken?.substring(0, 20));

    // validación estricta
    if (!paymentId && (topic === 'payment' || topic === 'payment.created')) {
      console.log('❌ No paymentId could be extracted');
      return res.status(200).send('OK');
    }

    const handleApprovedPayment = async (payment) => {
      const externalRef = payment.external_reference || '';
      const paymentId = payment.id.toString();

      // Route by external_reference type
      if (externalRef.startsWith('DOCREVIEW_')) {
        const documentId = externalRef.replace('DOCREVIEW_', '');
        console.log('[webhook] step=review_payment document_id=' + documentId + ' payment_id=' + paymentId);

        const { getDocumentProduct } = await import('./server/documents/catalog.mjs');
        const reviewProduct = getDocumentProduct('pagare_review');
        const paidAmount = Number(payment.transaction_amount);
        const paidCurrency = payment.currency_id || payment.currency || null;
        if (reviewProduct) {
          if (!Number.isFinite(paidAmount) || paidAmount !== reviewProduct.amount || paidCurrency !== reviewProduct.currency) {
            console.error(`[webhook] step=review_payment status=price_mismatch document_id=${documentId} payment_id=${paymentId} expected=${reviewProduct.amount} ${reviewProduct.currency} got=${paidAmount} ${paidCurrency}`);
            return;
          }
        }

        await supabase
          .from('generated_documents')
          .update({
            review_paid: true,
            review_payment_id: paymentId,
            review_paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', documentId);

        console.log('[webhook] step=review_payment status=ok document_id=' + documentId);
        return;
      }

      if (externalRef.startsWith('DOCUMENT_')) {
        const documentId = externalRef.replace('DOCUMENT_', '');
        console.log('[webhook] step=document_payment document_id=' + documentId + ' payment_id=' + paymentId);

        // Validación server-side del monto/currency — FAIL CLOSED si catálogo no disponible
        const { data: pendingDoc } = await supabase.from('generated_documents').select('id,type,total_paid,status').eq('id', documentId).maybeSingle();
        if (!pendingDoc) {
          console.error(`[webhook] step=document_payment status=catalog_lookup_failed document_id=${documentId} payment_id=${paymentId} reason=document_not_found`);
          throw new Error('Document catalog lookup failed');
        }
        const { getDocumentProduct: getDocProduct2 } = await import('./server/documents/catalog.mjs');
        const docProduct = getDocProduct2(pendingDoc.type);
        if (!docProduct) {
          console.error(`[webhook] step=document_payment status=catalog_lookup_failed document_id=${documentId} payment_id=${paymentId} reason=unknown_product type=${pendingDoc.type}`);
          throw new Error('Document catalog lookup failed');
        }
        {
          const paidAmount = Number(payment.transaction_amount);
          const paidCurrency = payment.currency_id || payment.currency || null;
          if (!Number.isFinite(paidAmount) || paidAmount !== docProduct.amount || paidCurrency !== docProduct.currency) {
            console.error(`[webhook] step=document_payment status=price_mismatch document_id=${documentId} payment_id=${paymentId} expected=${docProduct.amount} ${docProduct.currency} got=${paidAmount} ${paidCurrency}`);
            return;
          }
        }

        const { handleDocumentPayment } = await import('./server/documents.mjs');
        await handleDocumentPayment({
          supabase,
          documentId,
          paymentId,
          resend,
          onPurchase: ({ doc, paymentId: mpPaymentId }) =>
            sendDocumentPurchaseEvent({ doc, paymentId: mpPaymentId }),
        });

        console.log('[webhook] step=document_payment status=ok document_id=' + documentId);
        return;
      }

      const bookingId = externalRef;

      console.log('[webhook] step=payment_ingestion payment_id=' + paymentId + ' booking_id=' + bookingId);

      // STEP 1: Payment ingestion — claim recuperable
      // Caso 1: payment_id IS NULL → claim P1
      // Caso 2: payment_id = P1 → retry del mismo pago → continuar
      // Caso 3: payment_id = P999 ≠ P1 → conflicto → no sobrescribir
      const { data: existingBooking, error: existingBookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .maybeSingle();

      if (existingBookingError || !existingBooking) {
        console.error('[webhook] step=payment_ingestion status=failed error=' + (existingBookingError?.message || 'booking not found'));
        return;
      }

      // Terminal state protection: cancelled/expired should not be resurrected
      const terminalStatuses = ['cancelled', 'expired', 'completed', 'declined'];
      if (terminalStatuses.includes(existingBooking.status)) {
        if (existingBooking.payment_id === paymentId) {
          console.log('[webhook] step=payment_ingestion status=terminal_idempotent booking_id=' + bookingId + ' status=' + existingBooking.status + ' payment_id=' + paymentId);
          return;
        }
        console.error('[webhook] step=payment_ingestion status=terminal_blocked booking_id=' + bookingId + ' status=' + existingBooking.status + ' incoming_payment_id=' + paymentId);
        await supabase.from('bookings').update({ needs_manual_review: true, updated_at: new Date().toISOString() }).eq('id', bookingId);
        return;
      }

      // Payment amount/currency validation BEFORE confirming (C4)
      const expectedClientTotal = Number(existingBooking.price);
      const paidAmount = Number(payment.transaction_amount);
      const paidCurrency = payment.currency_id || payment.currency || 'CLP';
      if (!Number.isFinite(expectedClientTotal) || !Number.isFinite(paidAmount) || paidAmount !== expectedClientTotal || paidCurrency !== 'CLP') {
        console.error(`[webhook] step=amount_validation status=mismatch booking_id=${bookingId} payment_id=${paymentId} expected=${expectedClientTotal} CLP got=${paidAmount} ${paidCurrency}`);
        await supabase.from('bookings').update({ needs_manual_review: true, updated_at: new Date().toISOString() }).eq('id', bookingId);
        return;
      }

      if (existingBooking.payment_id && existingBooking.payment_id !== paymentId) {
        console.error('[webhook] step=payment_ingestion status=conflict booking_id=' + bookingId + ' existing_payment_id=' + existingBooking.payment_id + ' incoming_payment_id=' + paymentId);
        await supabase.from('bookings').update({ needs_manual_review: true, updated_at: new Date().toISOString() }).eq('id', bookingId);
        return;
      }

      let booking = existingBooking;
      let isRecovery = false;
      if (!existingBooking.payment_id) {
        const { data: claimed, error: claimError } = await supabase
          .from('bookings')
          .update({
            payment_status: 'approved',
            payment_id: paymentId,
            updated_at: new Date().toISOString()
          })
          .is('payment_id', null)
          .eq('id', bookingId)
          .select('*')
          .maybeSingle();
        if (claimError) {
          console.error('[webhook] step=payment_ingestion status=failed error=' + claimError.message);
          return;
        }
        if (claimed) {
          booking = claimed;
          console.log('[webhook] step=payment_ingestion status=ok booking_id=' + bookingId + ' mode=new');
        } else {
          const { data: raced } = await supabase.from('bookings').select('*').eq('id', bookingId).maybeSingle();
          if (raced?.payment_id === paymentId) {
            booking = raced;
            isRecovery = true;
            console.log('[webhook] step=payment_ingestion status=recovery booking_id=' + bookingId + ' payment_id=' + paymentId);
          } else if (raced?.payment_id) {
            console.error('[webhook] step=payment_ingestion status=conflict_race booking_id=' + bookingId + ' payment_id=' + raced.payment_id);
            return;
          } else {
            console.error('[webhook] step=payment_ingestion status=failed race_no_claim booking_id=' + bookingId);
            return;
          }
        }
      } else {
        isRecovery = true;
        console.log('[webhook] step=payment_ingestion status=recovery booking_id=' + bookingId + ' payment_id=' + paymentId + ' existing_status=' + existingBooking.status);
      }

      // Idempotencia de éxito completo: si ya existe payment_events success + booking confirmed y meet ya persistido, skip duplicado
      let alreadyComplete = false;
      try {
        const { data: existingSuccess } = await supabase
          .from('payment_events')
          .select('id, created_at')
          .eq('event_type', 'success')
          .filter('metadata->>payment_id', 'eq', paymentId)
          .maybeSingle();
        if (existingSuccess && booking.status === 'confirmed' && booking.payment_id === paymentId) {
          // Verificar si etapas principales ya completadas (appointment + meet)
          // Si booking ya tiene meet_link o appointments ya tiene meet_link, es completo
          alreadyComplete = true;
          // No return aún: dejar que etapas con check propio decidan skip individual
          console.log('[webhook] step=idempotency status=maybe_already_complete payment_id=' + paymentId + ' existing_event=' + existingSuccess.id);
        }
      } catch (idempotencyError) {
        console.error('[webhook] step=idempotency status=check_failed payment_id=' + paymentId, idempotencyError);
      }

      // Send PostHog booking_paid event — idempotente: si ya existe payment_events success, skip
      if (!alreadyComplete) {
        try {
          const posthogKey = process.env.POSTHOG_PROJECT_API_KEY || process.env.VITE_POSTHOG_KEY;
          if (posthogKey) {
            await fetch('https://us.i.posthog.com/capture/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_key: posthogKey,
                event: 'booking_paid',
                distinct_id: booking.posthog_distinct_id || booking.user_id || booking.user_email,
                properties: {
                  booking_id: bookingId,
                  payment_id: paymentId,
                  lawyer_id: booking.lawyer_id,
                  service_id: booking.service_id || null,
                  amount: payment.transaction_amount,
                  currency: 'CLP',
                  variant: booking.experiment_variant,
                  is_owner: OWNER_EMAILS.has((booking.user_email || '').trim().toLowerCase()),
                  article_slug: booking.metadata?.article_slug || null,
                  source: booking.metadata?.source || null,
                  cta_location: booking.metadata?.cta_location || null,
                  utm_source: booking.metadata?.utm_source || null,
                  utm_campaign: booking.metadata?.utm_campaign || null,
                  is_test: booking.metadata?.is_test || String(booking.user_email || '').includes('@test.invalid') || false,
                },
              }),
            });
          }
        } catch (e) {
          console.error('[webhook] step=posthog_capture failed', e);
        }
      } else {
        console.log('[webhook] step=posthog_capture status=skipped_already_complete payment_id=' + paymentId);
      }

      // Notificaciones in-app de pago aprobado — eventId dedup evita duplicado en retry
      try {
        if (!alreadyComplete) {
          await notificationsService.notifyUsers([
          ...(booking.user_id
            ? [{
                userId: booking.user_id,
                type: 'payment.approved',
                title: 'Pago confirmado',
                message: 'Tu consulta legal ha sido confirmada.',
                entityType: 'booking',
                entityId: booking.id,
                metadata: { booking_id: booking.id, amount: payment.transaction_amount },
                eventId: `payment_approved:${paymentId}`,
              }]
            : []),
          {
            userId: booking.lawyer_id,
            type: 'payment.approved',
            title: 'Pago confirmado',
            message: `La consulta de ${booking.user_name || 'tu cliente'} ha sido pagada correctamente.`,
            entityType: 'booking',
            entityId: booking.id,
            metadata: { booking_id: booking.id, amount: payment.transaction_amount },
            eventId: `payment_approved:${paymentId}`,
          },
        ]);
        } else {
          console.log('[webhook] step=notifications status=skipped_already_complete payment_id=' + paymentId);
        }
      } catch (notifyError) {
        console.error('[webhook] notifications failed:', notifyError);
      }

      // STEP 2: Lawyer resolution (STRICT VALIDATION)
      console.log('[webhook] step=lawyer_resolution lawyer_id=' + booking.lawyer_id);

      let lawyerEmail = '';
      let lawyerName = 'Abogado';
      let lawyerProfile = null;

      try {
        const { data: lawyerData, error: lawyerError } = await supabase
          .from('profiles')
          .select('id, display_name, first_name, last_name, user_id, meet_link')
          .eq('user_id', booking.lawyer_id)
          .maybeSingle();

        if (lawyerError || !lawyerData) {
          console.error('[webhook] step=lawyer_resolution status=failed error=lawyer_not_found lawyer_id=' + booking.lawyer_id);

          // Mark booking for manual review
          await supabase
            .from('bookings')
            .update({ needs_manual_review: true })
            .eq('id', bookingId);

          console.log('[webhook] step=lawyer_resolution action=marked_manual_review booking_id=' + bookingId);
          return; // STOP automation flow
        }

        lawyerProfile = lawyerData;
        lawyerName = lawyerProfile.display_name ||
          `${lawyerProfile.first_name || ''} ${lawyerProfile.last_name || ''}`.trim() ||
          'Abogado';

        // Get email from auth.users
        const lawyerAuthId = lawyerProfile.user_id || booking.lawyer_id;
        if (lawyerAuthId) {
          const { data: lawyerUser, error: lawyerError } = await supabase.auth.admin.getUserById(lawyerAuthId);
          if (lawyerUser?.user) {
            lawyerEmail = (lawyerUser.user.email || '').trim().toLowerCase();

            if (lawyerName === 'Abogado' && lawyerUser.user.user_metadata) {
              const metaName = lawyerUser.user.user_metadata.full_name ||
                lawyerUser.user.user_metadata.first_name;
              if (metaName) lawyerName = metaName;
            }
          }
        }

        console.log('[webhook] step=lawyer_resolution status=ok lawyer_id=' + booking.lawyer_id + ' lawyer_email=' + lawyerEmail);
      } catch (e) {
        console.error('[webhook] step=lawyer_resolution status=failed error=exception', e);
        await supabase
          .from('bookings')
          .update({ needs_manual_review: true })
          .eq('id', bookingId);
        return;
      }

      // STEP 3: Booking normalization - Client creation/update
      console.log('[webhook] step=booking_normalization booking_id=' + bookingId);

      const userEmail = (booking.user_email || '').trim().toLowerCase();
      const userName = booking.user_name?.trim() || (userEmail ? userEmail.split('@')[0] : 'Cliente LegalUp');
      const [firstName, ...restName] = userName.split(' ').filter(Boolean);
      const lastName = restName.length > 0 ? restName.join(' ') : '';
      let userId = null;

      // Check if user exists
      if (userEmail) {
        try {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', userEmail)
            .maybeSingle();

          if (existingProfile) {
            userId = existingProfile.id;
          }
        } catch (lookupError) {
          console.error('[webhook] step=booking_normalization error=user_lookup', lookupError);
        }
      }

      // Create user if not exists
      if (userEmail && !userId) {
        try {
          const tempPassword = crypto.randomBytes(9).toString('hex');
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: userEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              first_name: firstName || userName,
              last_name: lastName,
              full_name: userName,
              role: 'client',
              signup_method: 'booking'
            }
          });

          if (!createError && newUser?.user?.id) {
            userId = newUser.user.id;
          }
        } catch (createError) {
          console.error('[webhook] step=booking_normalization error=user_creation', createError);
        }
      }

      // Ensure profile exists
      if (userId && userEmail) {
        try {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', userId)
            .maybeSingle();

          const baseProfile = {
            email: userEmail,
            first_name: firstName || null,
            last_name: lastName || null,
            display_name: userName,
            role: 'client',
            updated_at: new Date().toISOString(),
          };

          if (existingProfile) {
            await supabase.from('profiles').update(baseProfile).eq('user_id', userId);
          } else {
            await supabase.from('profiles').insert({
              ...baseProfile,
              id: userId,
              user_id: userId,
              created_at: new Date().toISOString(),
              has_used_free_consultation: false,
            });
          }
        } catch (profileError) {
          console.error('[webhook] step=booking_normalization error=profile_update', profileError);
        }
      }

      // Associate booking with user
      if (userId && userEmail) {
        await supabase
          .from('bookings')
          .update({
            user_id: userId,
            user_email: userEmail,
            user_name: userName,
          })
          .eq('id', bookingId);
      }

      console.log('[webhook] step=booking_normalization status=ok user_id=' + (userId || 'null'));

      // FASE 3B/4B-3 C12: Payment accounting — usa snapshot, no settings actuales
      const ledgerExpectedTotal = Number(booking.price);
      try {
        const { data: existingPayment } = await supabase.from('payments').select('id').eq('booking_id', bookingId).maybeSingle();
        if (!existingPayment) {
          let snap = booking.pricing_snapshot;
          let clientSurchargePercent, platformFeePercent, derivedOriginal, clientSurcharge, platformFee, lawyerAmount;
          if (snap && typeof snap.base_amount === 'number' && typeof snap.lawyer_amount === 'number') {
            derivedOriginal = Number(snap.base_amount);
            clientSurcharge = Number(snap.client_surcharge);
            platformFee = Number(snap.platform_fee);
            lawyerAmount = Number(snap.lawyer_amount);
            clientSurchargePercent = Number(snap.client_surcharge_percent ?? 0.10);
            platformFeePercent = Number(snap.platform_fee_percent ?? 0.20);
          } else {
            clientSurchargePercent = 0.1;
            platformFeePercent = 0.20;
            try {
              const { data: ps } = await supabase.from('platform_settings').select('client_surcharge_percent, platform_fee_percent').order('updated_at', { ascending: false }).limit(1).maybeSingle();
              if (ps) {
                clientSurchargePercent = Number(ps.client_surcharge_percent ?? clientSurchargePercent);
                platformFeePercent = Number(ps.platform_fee_percent ?? platformFeePercent);
              }
            } catch {}
            derivedOriginal = Math.round(ledgerExpectedTotal / (1 + clientSurchargePercent));
            clientSurcharge = Math.max(ledgerExpectedTotal - derivedOriginal, 0);
            platformFee = Math.round(derivedOriginal * platformFeePercent);
            lawyerAmount = Math.max(derivedOriginal - platformFee, 0);
          }
          // Verificar ecuación DB: amount = platform_fee + lawyer_amount
          if (derivedOriginal !== platformFee + lawyerAmount) {
            console.warn(`[webhook] step=payment_accounting warning equation mismatch derived=${derivedOriginal} platform=${platformFee} lawyer=${lawyerAmount}`);
          }
          const paymentIdForTable = paymentId.length === 36 ? paymentId : null; // MP id no es UUID, usar random UUID y guardar provider id en metadata
          const insertId = paymentIdForTable || crypto.randomUUID();
          const { error: payInsertError } = await supabase.from('payments').insert({
            id: insertId,
            user_id: userId || booking.user_id,
            lawyer_id: booking.lawyer_id,
            booking_id: bookingId,
            amount: derivedOriginal,
            original_amount: derivedOriginal,
            client_surcharge: clientSurcharge,
            client_surcharge_percent: clientSurchargePercent,
            platform_fee_percent: platformFeePercent,
            platform_fee: platformFee,
            lawyer_amount: lawyerAmount,
            currency: 'CLP',
            status: 'succeeded',
            metadata: { provider: 'mercadopago', provider_payment_id: paymentId, booking_id: bookingId, client_total: ledgerExpectedTotal },
          });
          if (payInsertError) {
            if (payInsertError.code === '23505') {
              console.log('[webhook] step=payment_accounting status=already_exists booking_id=' + bookingId);
            } else {
              console.error('[webhook] step=payment_accounting status=failed', payInsertError);
              throw payInsertError;
            }
          } else {
            console.log('[webhook] step=payment_accounting status=ok booking_id=' + bookingId + ' payment_id=' + paymentId);
          }
        } else {
          console.log('[webhook] step=payment_accounting status=already_exists booking_id=' + bookingId);
        }
        // Solo después de ledger exitoso, confirmar booking
        if (booking.status !== 'confirmed' || booking.payment_status !== 'approved') {
          const { data: confirmed } = await supabase.from('bookings').update({ status: 'confirmed', payment_status: 'approved', updated_at: new Date().toISOString() }).eq('id', bookingId).select('*').maybeSingle();
          if (confirmed) booking = confirmed;
        }
      } catch (payAccError) {
        console.error('[webhook] step=payment_accounting error', payAccError);
        throw payAccError;
      }

      const shouldCreateAppointment = booking.requires_meeting !== false;

      // Track payment event.
      // Idempotencia a nivel DB: el UNIQUE partial index payment_events_success_payment_once
      // garantiza una sola fila success por payment_id. Un redelivery que haya superado
      // el SELECT previo y el claim atómico de booking llegará aquí y fallará con 23505;
      // se trata como duplicado (DO NOTHING) y NO se re-ejecutan efectos secundarios.
      try {
        const { error: paymentEventError } = await supabase.from('payment_events').insert({
          event_type: 'success',
          payment_id: paymentId,
          amount: payment.transaction_amount,
          status: 'completed',
          metadata: {
            payment_id: paymentId,
            booking_id: bookingId,
            source: 'webhook',
            user_email: userEmail || null
          },
          user_id: userId || null,
        });

        if (paymentEventError) {
          // Solo una unique violation provocada POR el índice de idempotencia es un
          // duplicado benigno. Cualquier otra cosa (network, permisos, RLS, schema,
          // otra constraint) se propaga como error real.
          const isIdempotencyConflict =
            paymentEventError.code === '23505' &&
            (paymentEventError.message || '').indexOf('payment_events_success_payment_once') !== -1;

          if (isIdempotencyConflict) {
            console.log(
              '[webhook] step=payment_event status=already_exists event=duplicate_payment_event ' +
              'payment_id=' + paymentId + ' booking_id=' + bookingId +
              ' sqlstate=23505 constraint=payment_events_success_payment_once'
            );
          } else {
            throw paymentEventError;
          }
        }
      } catch (trackingError) {
        console.error('[webhook] step=booking_normalization error=payment_event', trackingError);
      }

      // STEP 4: Appointment creation (only when the service requires a meeting)
      console.log('[webhook] step=appointment_creation booking_id=' + bookingId + ' requires_meeting=' + shouldCreateAppointment);

      let appointmentId = null;
      if (shouldCreateAppointment && userId) {
        try {
          const { data: existingAppointment } = await supabase
            .from('appointments')
            .select('id, meet_link, status')
            .eq('lawyer_id', booking.lawyer_id)
            .eq('user_id', userId)
            .eq('appointment_date', booking.scheduled_date)
            .eq('appointment_time', booking.scheduled_time)
            .maybeSingle();

          if (existingAppointment) {
            appointmentId = existingAppointment.id;
            console.log('[webhook] step=appointment_creation status=exists appointment_id=' + appointmentId);
          } else {
            const { data: newAppointment } = await supabase
              .from('appointments')
              .insert({
                lawyer_id: booking.lawyer_id,
                user_id: userId,
                email: userEmail,
                name: userName,
                appointment_date: booking.scheduled_date,
                appointment_time: booking.scheduled_time,
                duration: booking.duration,
                price: booking.price,
                status: 'pending_meet_link',
                consultation_type: 'paid',
                contact_method: 'platform',
                currency: 'CLP',
                meet_status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select('id')
              .maybeSingle();

            if (newAppointment) {
              appointmentId = newAppointment.id;
              console.log('[webhook] step=appointment_creation status=created appointment_id=' + appointmentId);
            }
          }
        } catch (appointmentError) {
          console.error('[webhook] step=appointment_creation status=failed', appointmentError);
        }
      }

      // Send GA4 Purchase Event
      try {
        const articleSlug = booking.metadata?.article_slug || null;
        console.log('[webhook] article_slug from booking metadata:', articleSlug, 'booking_id:', bookingId);
        await sendGA4PurchaseEvent({
          transaction_id: paymentId,
          value: payment.transaction_amount,
          currency: 'CLP',
          booking_id: bookingId,
          lawyer_id: booking.lawyer_id,
          service_id: booking.service_id || null,
          appointment_id: appointmentId,
          is_owner: isOwnerEmail(booking.user_email),
          article_slug: articleSlug,
          source: booking.metadata?.source || null,
          utm_source: booking.metadata?.utm_source || null,
          utm_campaign: booking.metadata?.utm_campaign || null,
          is_test: booking.metadata?.is_test || String(booking.user_email || '').includes('@test.invalid') || false,
          ga_client_id: booking.metadata?.ga_client_id || null,
          ga_session_id: booking.metadata?.ga_session_id || null,
        });
      } catch (ga4Error) {
        console.error('[webhook] step=ga4_event status=failed', ga4Error);
      }

      // STEP 5: Google Meet generation (only for bookings that require a meeting)
      console.log('[webhook] step=meet_generation appointment_id=' + appointmentId);

      let meetLink = '';
      let meetStatus = 'fallback';
      let meetProvider = 'jitsi';

      // 2E.3: idempotent reuse of existing booking meet_link
      if (booking.meet_link) {
        meetLink = booking.meet_link;
        meetStatus = 'success';
        meetProvider = 'existing';
        console.log('[webhook] step=meet_generation status=reused_existing booking_id=' + bookingId + ' meet_link=' + meetLink);
      } else if (shouldCreateAppointment) {
        // PRIORITY 1: Use lawyer's fixed meet_link if configured
        if (lawyerProfile?.meet_link) {
          meetLink = lawyerProfile.meet_link;
          meetStatus = 'success';
          // Detect provider from URL pattern
          if (meetLink.includes('meet.google.com') || meetLink.includes('hangouts.google.com')) {
            meetProvider = 'google';
          } else if (meetLink.includes('jitsi')) {
            meetProvider = 'jitsi';
          } else {
            meetProvider = 'custom';
          }
          console.log('[webhook] step=meet_generation status=success provider=' + meetProvider + ' source=lawyer_profile meet_link=' + meetLink);
        }
        // PRIORITY 2: Generate dynamic meet link if no fixed link
        else if (appointmentId) {
          try {
            console.log('[webhook] invoking create-google-meeting', {
              appointmentId,
              lawyerId: booking.lawyer_id
            });

            const { data: meetData, error: meetError } = await supabase.functions.invoke('create-google-meeting', {
              body: { appointmentId, bookingId: booking.id }
            });

            console.log('[webhook] create-google-meeting result', {
              data: meetData,
              error: meetError
            });

            if (!meetError && meetData?.meetLink) {
              meetLink = meetData.meetLink;
              meetProvider = meetData.source || 'jitsi';
              meetStatus = meetData.existing ? 'success' : (meetData.source === 'jitsi' ? 'fallback' : 'success');
              console.log('[webhook] step=meet_generation status=' + meetStatus + ' meet_link=' + meetLink + ' provider=' + meetProvider + ' existing=' + (meetData.existing || false));
              if (meetData.existing) {
                console.log('[webhook] step=meet_generation action=reused_existing_link');
              }
            } else {
              console.warn('[webhook] step=meet_generation status=fallback error=' + (meetError?.message || 'no_link_returned'));
            }
          } catch (meetError) {
            console.error('[webhook] create-google-meeting exception', meetError);
            console.warn('[webhook] step=meet_generation status=fallback error=exception');
          }
        }

        // CRITICAL: Always persist meet_link to DB before email dispatch
        if (appointmentId) {
          try {
            const updateData = {
              meet_status: meetStatus,
              meet_provider: meetProvider,
              updated_at: new Date().toISOString(),
            };

            if (meetLink) {
              updateData.meet_link = meetLink;
              updateData.status = 'confirmed';
            }

            // UPDATE (write only)
            const { error: updateError } = await supabase
              .from('appointments')
              .update(updateData)
              .eq('id', appointmentId);

            if (updateError) {
              console.error('[webhook] step=meet_generation status=update_failed', updateError);
              throw updateError;
            }

            // RE-READ DB explicitly (source of truth)
            const { data: fresh, error: fetchError } = await supabase
              .from('appointments')
              .select('id, meet_link')
              .eq('id', appointmentId)
              .single();

            if (fetchError || !fresh) {
              console.error('[webhook] step=meet_generation status=fetch_after_update_failed', fetchError);
              throw new Error('Fetch after update failed');
            }

            if (!fresh.meet_link) {
              console.error('[webhook] step=meet_generation status=missing_meet_link_after_update', {
                appointmentId,
                fresh
              });
              throw new Error('meet_link not persisted');
            }

            console.log('[webhook] step=meet_generation status=updated appointment_id=' + appointmentId + ' meet_status=' + meetStatus + ' meet_provider=' + meetProvider + ' meet_link=' + fresh.meet_link);
            // 2C: sync meet_link to bookings for future SaaS traceability (bookings.meet_link)
            if (booking?.id && fresh.meet_link) {
              await supabase.from('bookings').update({ meet_link: fresh.meet_link }).eq('id', booking.id);
            }
          } catch (updateError) {
            console.error('[webhook] step=meet_generation status=update_failed', updateError);
            throw updateError;
          }
        }
        // 2C: for bookings without appointment mirror (service type), persist meet_link directly to bookings
        if (!appointmentId && booking?.id && meetLink) {
          await supabase.from('bookings').update({ meet_link: meetLink }).eq('id', booking.id);
        }
      }

      // STEP 6: Email dispatch
      console.log('[webhook] step=email_dispatch appointment_id=' + (appointmentId || 'no') + ' booking_type=' + (booking.booking_type || 'appointment'));

      if (!shouldCreateAppointment && resend && userEmail) {
        const serviceTitle = booking.service_title || 'Servicio legal';
        const deliveryTime = booking.service_delivery_time || 'Según lo acordado con el abogado';
        const serviceDescription = booking.service_description || '';

        try {
          await sendEmailIdempotent({
            supabase,
            businessEventId: `booking:${bookingId}:payment:${paymentId}`,
            type: 'service_client',
            recipient: userEmail,
            sendFn: async () => resend.emails.send({
            from: 'LegalUp <hola@mg.legalup.cl>',
            to: userEmail,
            subject: 'Tu solicitud de servicio ha sido confirmada',
            html: `
                <body style="margin:0;padding:16px;background:#f9fafb;">
                  <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
                    <div style="text-align:center;margin-bottom:28px;">
                      <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
                      <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
                    </div>
                    <h1 style="color:#1a202c;">Servicio confirmado</h1>
                    <p>Hola <strong>${userName || 'Usuario'}</strong>,</p>
                    <p>Tu pago por <strong>${serviceTitle}</strong> fue recibido correctamente.</p>
                    <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0;">
                      <p style="margin:5px 0;"><strong>Abogado:</strong> ${lawyerName}</p>
                      <p style="margin:5px 0;"><strong>Servicio:</strong> ${serviceTitle}</p>
                      ${serviceDescription ? `<p style="margin:5px 0;"><strong>Detalle:</strong> ${serviceDescription}</p>` : ''}
                      <p style="margin:5px 0;"><strong>Plazo de entrega:</strong> ${deliveryTime}</p>
                      <p style="margin:5px 0;"><strong>Monto pagado:</strong> $${(booking.price || payment.transaction_amount || 0).toLocaleString('es-CL')} CLP</p>
                    </div>
                    <p>El abogado recibirá tu solicitud y se pondrá en contacto contigo para iniciar el trabajo.</p>
                    <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
                      © 2026 LegalUp — Asesoría legal online en Chile.<br />
                      Todos los derechos reservados.<br />
                      Este es un correo automático, por favor no respondas a este mensaje.
                    </p>
                  </div>
                </body>
              `,
          }),
          });
          console.log('[webhook] step=email_dispatch status=sent type=service_client');
        } catch (emailError) {
          console.error('[webhook] step=email_dispatch status=failed type=service_client', emailError);
        }

        if (lawyerEmail) {
          try {
            await sendEmailIdempotent({
              supabase,
              businessEventId: `booking:${bookingId}:payment:${paymentId}`,
              type: 'service_lawyer',
              recipient: lawyerEmail,
              sendFn: async () => resend.emails.send({
              from: 'LegalUp <hola@mg.legalup.cl>',
              to: lawyerEmail,
              subject: 'Nueva solicitud de servicio pagada',
              html: `
                  <body style="margin:0;padding:16px;background:#f9fafb;">
                    <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
                      <div style="text-align:center;margin-bottom:28px;">
                        <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
                        <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
                      </div>
                      <h1 style="color:#1a202c;">Nuevo servicio contratado</h1>
                      <p>Un cliente pagó un servicio a través de LegalUp.</p>
                      <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0;">
                        <p style="margin:5px 0;"><strong>Cliente:</strong> ${userName}</p>
                        <p style="margin:5px 0;"><strong>Email:</strong> ${userEmail}</p>
                        <p style="margin:5px 0;"><strong>Servicio:</strong> ${serviceTitle}</p>
                        <p style="margin:5px 0;"><strong>Plazo:</strong> ${deliveryTime}</p>
                        <p style="margin:5px 0;"><strong>Monto:</strong> $${(booking.price || payment.transaction_amount || 0).toLocaleString('es-CL')} CLP</p>
                      </div>
                      <div style="text-align: center">
                        <p>Ingresa a tu panel para gestionar la solicitud.</p>
                        <a href="${appUrl}/dashboard" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Ir a mi panel</a>
                      </div>
                      <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
                        © 2026 LegalUp — Asesoría legal online en Chile.<br />
                        Todos los derechos reservados.<br />
                        Este es un correo automático, por favor no respondas a este mensaje.
                      </p>
                    </div>
                  </body>
                `,
              }),
            });
            console.log('[webhook] step=email_dispatch status=sent type=service_lawyer');
          } catch (emailError) {
            console.error('[webhook] step=email_dispatch status=failed type=service_lawyer', emailError);
          }
        }
      } else if (appointmentId && resend) {
        // Re-fetch appointment from DB to get fresh meet_link
        const { data: freshAppointment, error: fetchError } = await supabase
          .from('appointments')
          .select('id, meet_link, meet_provider, meet_status, user_id, lawyer_id')
          .eq('id', appointmentId)
          .single();

        if (fetchError || !freshAppointment) {
          console.error('[webhook] step=email_dispatch status=fetch_failed error=', fetchError);
          return;
        }

        console.log('[webhook] step=email_dispatch status=fetched_from_db meet_link=' + (freshAppointment.meet_link ? 'yes' : 'no') + ' meet_provider=' + (freshAppointment.meet_provider || 'none'));

        // HARD GUARD: Ensure meet_link exists before sending email
        if (!freshAppointment.meet_link) {
          console.error('[webhook] step=email_dispatch status=skipped reason=missing_meet_link appointment_id=' + appointmentId);
          return;
        }

        const freshMeetLink = freshAppointment.meet_link;
        const freshMeetProvider = freshAppointment.meet_provider;
        // Generate Magic Link
        let magicLink = `${appUrl}/login`;
        if (userEmail) {
          try {
            const { data: linkData } = await supabase.auth.admin.generateLink({
              type: 'magiclink',
              email: userEmail,
              options: {
                redirectTo: `${appUrl}/dashboard/appointments`
              }
            });

            if (linkData?.properties?.action_link) {
              magicLink = linkData.properties.action_link;
            }
          } catch (e) {
            console.error('[webhook] step=email_dispatch error=magic_link', e);
          }
        }

        // Send client email — idempotent per booking:payment
        try {
          await sendEmailIdempotent({
            supabase,
            businessEventId: `booking:${bookingId}:payment:${paymentId}`,
            type: 'booking_client',
            recipient: userEmail,
            sendFn: async () => resend.emails.send({
            from: 'LegalUp <hola@mg.legalup.cl>',
            to: userEmail,
            subject: 'Tu cita ha sido confirmada',
            html: `
                <body style="margin:0;padding:16px;background:#f9fafb;">
                    <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
                      <div style="text-align:center;margin-bottom:28px;">
                        <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
                        <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
                      </div>
                      <h1 style="color: #1a202c;">Tu cita ha sido confirmada</h1>
                      <p>Hola <strong>${userName || 'Usuario'}</strong>,</p>
                      <p>Tu consulta está lista. Aquí tienes los detalles para conectarte con tu abogado.</p>
                      
                      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Abogado:</strong> ${lawyerName}</p>
                        <p style="margin: 5px 0;"><strong>Fecha:</strong> ${booking.scheduled_date || booking.date || ''}</p>
                        <p style="margin: 5px 0;"><strong>Hora:</strong> ${booking.scheduled_time || booking.time || ''}</p>
                        <p style="margin: 5px 0;"><strong>Duración:</strong> ${booking.duration || ''} min</p>
                      </div>

                      <div style="background-color: #e8f0fe; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #4285F4;">
                        <p style="margin: 0 0 10px; color: #1967d2; font-weight: 600;">Enlace de Google Meet</p>
                        <a href="${freshMeetLink}" style="display: inline-block; background-color: #4285F4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                          Unirse a la videollamada
                        </a>
                        <p style="margin: 10px 0 0; font-size: 12px; color: #5f6368;">
                          O copia este enlace: <span style="word-break: break-all; color: #1967d2;">${freshMeetLink}</span>
                        </p>
                      </div>

                      <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
                        © 2026 LegalUp — Asesoría legal online en Chile.<br />
                        Todos los derechos reservados.<br />
                        Este es un correo automático, por favor no respondas a este mensaje.
                      </p>
                    </div>
                </body>
              `
            }),
          });
          console.log('[webhook] step=email_dispatch status=sent type=client');
        } catch (emailError) {
          console.error('[webhook] step=email_dispatch status=failed type=client', emailError);
        }

        // Send lawyer email
        if (lawyerEmail) {
          try {
            await sendEmailIdempotent({
              supabase,
              businessEventId: `booking:${bookingId}:payment:${paymentId}`,
              type: 'booking_lawyer',
              recipient: lawyerEmail,
              sendFn: async () => resend.emails.send({
              from: 'LegalUp <hola@mg.legalup.cl>',
              to: lawyerEmail,
              subject: 'Tienes una nueva cita agendada',
              html: `
                  <body style="margin:0;padding:16px;background:#f9fafb;">
                    <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
                      <div style="text-align:center;margin-bottom:28px;">
                        <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
                        <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
                      </div>
                      <h1 style="color: #1a202c;">Tienes una nueva cita agendada</h1>
                      <p>Un cliente ha reservado una consulta contigo a través de LegalUp.cl</p>
                      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Cliente:</strong> ${userName}</p>
                        <p style="margin: 5px 0;"><strong>Email:</strong> ${userEmail}</p>
                        <p style="margin: 5px 0;"><strong>Fecha:</strong> ${booking.scheduled_date || booking.date || ''}</p>
                        <p style="margin: 5px 0;"><strong>Hora:</strong> ${booking.scheduled_time || booking.time || ''}</p>
                        <p style="margin: 5px 0;"><strong>Duración:</strong> ${booking.duration || ''} min</p>
                      </div>

                      <div style="background-color: #e8f0fe; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #4285F4;">
                        <p style="margin: 0 0 10px; color: #1967d2; font-weight: 600;">Enlace de Google Meet para esta cita</p>
                        <a href="${freshMeetLink}" style="display: inline-block; background-color: #4285F4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                          Unirse a la videollamada
                        </a>
                        <p style="margin: 10px 0 0; font-size: 12px; color: #5f6368;">
                          Enlace: <span style="word-break: break-all; color: #1967d2;">${freshMeetLink}</span>
                        </p>
                      </div>

                      <p style="text-align:center">Ingresa a tu panel para ver más detalles.</p>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${appUrl}/dashboard/appointments" style="background-color: #111; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                          Ir a mis citas
                        </a>
                      </div>
                      <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
                        © 2026 LegalUp — Asesoría legal online en Chile.<br />
                        Todos los derechos reservados.<br />
                        Este es un correo automático, por favor no respondas a este mensaje.
                      </p>
                    </div>
                  </body>
                `
              }),
            });
            console.log('[webhook] step=email_dispatch status=sent type=lawyer');
          } catch (emailError) {
            console.error('[webhook] step=email_dispatch status=failed type=lawyer', emailError);
          }
        }
      } else {
        console.log('[webhook] step=email_dispatch status=skipped reason=inconsistent_state meet_link=' + (meetLink ? 'yes' : 'no') + ' appointment_id=' + (appointmentId || 'no'));
      }

      // STEP 7: Admin notification (NON-BLOCKING)
      console.log('[webhook] step=admin_notification status=sending booking_id=' + bookingId);

      try {
        const totalAmount = payment.transaction_amount || booking.price || 0;
        const legalUpCommission = Math.round(totalAmount * 0.30);
        const lawyerAmount = Math.round(totalAmount * 0.70);

        await sendEmailIdempotent({
          supabase,
          businessEventId: `booking:${bookingId}:payment:${paymentId}`,
          type: 'booking_admin',
          recipient: 'gigfmedia@icloud.com',
          sendFn: async () => resend.emails.send({
          from: 'LegalUp <hola@mg.legalup.cl>',
          to: 'gigfmedia@icloud.com',
          subject: 'Nuevo pago recibido en LegalUp',
          html: `
              <body style="margin:0;padding:16px;background:#f9fafb;">
                <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
                  <div style="text-align:center;margin-bottom:28px;">
                    <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
                    <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
                  </div>
                  <h1 style="color: #1a202c;">Nuevo pago recibido en LegalUp</h1>

                  <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Nombre cliente:</strong> ${userName || 'N/A'}</p>
                    <p style="margin: 5px 0;"><strong>Nombre abogado:</strong> ${lawyerName}</p>
                    <p style="margin: 5px 0;"><strong>Fecha consulta:</strong> ${booking.scheduled_date || booking.date || 'N/A'}</p>
                    <p style="margin: 5px 0;"><strong>Duración:</strong> ${booking.duration || 'N/A'} minutos</p>
                  </div>

                  <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #10b981;">
                    <p style="margin: 5px 0;"><strong>Monto total:</strong> $${totalAmount.toLocaleString('es-CL')}</p>
                    <p style="margin: 5px 0;"><strong>Comisión LegalUp (30%):</strong> $${legalUpCommission.toLocaleString('es-CL')}</p>
                    <p style="margin: 5px 0;"><strong>Monto abogado (70%):</strong> $${lawyerAmount.toLocaleString('es-CL')}</p>
                  </div>

                  <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #3b82f6;">
                    <p style="margin: 5px 0;"><strong>Booking ID:</strong> ${bookingId}</p>
                    <p style="margin: 5px 0;"><strong>Appointment ID:</strong> ${appointmentId || 'N/A'}</p>
                    <p style="margin: 5px 0;"><strong>Payment ID:</strong> ${paymentId}</p>
                    <p style="margin: 5px 0;"><strong>Fecha de pago:</strong> ${new Date(payment.date_created || new Date()).toLocaleString('es-CL')}</p>
                  </div>

                  <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
                    © 2026 LegalUp — Asesoría legal online en Chile.<br />
                    Todos los derechos reservados.<br />
                    Este es un correo automático de notificación administrativa.
                  </p>
                </div>
              </body>
            `
          }),
        });
        console.log('[webhook] step=admin_notification status=sent booking_id=' + bookingId);
      } catch (adminEmailError) {
        console.error('[webhook] step=admin_notification status=failed booking_id=' + bookingId, adminEmailError);
        // DO NOT interrupt main flow - admin email failure is non-critical
      }

      console.log('[webhook] step=complete booking_id=' + bookingId + ' appointment_id=' + (appointmentId || 'no') + ' meet_status=' + meetStatus);
    };

    // Handle subscription/preapproval events
    if (topic === 'preapproval' && paymentId) {
      console.log('[Empresas] Handling preapproval event:', paymentId);
      await handlePreapprovalWebhook(paymentId);
      return res.status(200).send('OK');
    }

    // Handle authorized payment events (subscription payment notifications)
    if (topic === 'authorized_payment' && paymentId) {
      console.log('[Empresas] Handling authorized payment:', paymentId);
      await handleAuthorizedPayment(paymentId);
      return res.status(200).send('OK');
    }

    // Handle subscription/plan events from newer MP API
    if (topic === 'subscription' || topic === 'subscription.authorized_payment' || topic === 'subscription.preapproval' || topic === 'subscription.cancelled') {
      console.log('[Empresas] Handling subscription topic:', topic, 'paymentId:', paymentId);

      if (topic === 'subscription.authorized_payment' || topic === 'authorized_payment') {
        await handleAuthorizedPayment(paymentId);
      } else if (topic === 'subscription.preapproval' || topic === 'preapproval') {
        await handlePreapprovalWebhook(paymentId);
      }
      return res.status(200).send('OK');
    }

    if ((topic === 'payment' || topic === 'payment.created') && paymentId) {
      console.log('About to fetch payment from MercadoPago', paymentId);

      let payment = null;
      for (const token of [mercadopagoAccessToken, process.env.VITE_MERCADOPAGO_ACCESS_TOKEN].filter(Boolean)) {
        try {
          const response = await fetch(
            `https://api.mercadopago.com/v1/payments/${paymentId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
          if (response.ok) {
            payment = await response.json();
            console.log('MP payment status:', payment.status, 'via token', token.slice(0, 10));
            break;
          }
        } catch {}
      }
      if (!payment) {
        const fallback = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, { headers: { Authorization: `Bearer ${mercadopagoAccessToken}` } });
        payment = await fallback.json().catch(() => ({}));
      }

      if (payment?.status === 'approved') {
        await handleApprovedPayment(payment);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error in MercadoPago webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manual reconcile for already-approved payments (backup if webhook delivery fails)
app.post('/api/mercadopago/reconcile/:paymentId', async (req, res) => {
  try {
    const adminSecret = process.env.MP_RECONCILE_SECRET;
    const providedSecret = req.headers['x-reconcile-secret'];
    if (!adminSecret || String(providedSecret || '') !== String(adminSecret)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { paymentId } = req.params;
    const payment = await new Payment(mpClient).get({ id: paymentId });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status !== 'approved') {
      return res.status(409).json({
        error: 'Payment not approved',
        status: payment.status,
        status_detail: payment.status_detail,
        external_reference: payment.external_reference,
      });
    }

    const bookingId = payment.external_reference;
    const { data: booking, error: bookingFetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();
    if (bookingFetchError) {
      console.error('Error fetching booking for reconcile:', bookingFetchError);
      return res.status(500).json({ error: 'Failed to fetch booking' });
    }
    if (!booking) return res.status(404).json({ error: 'Booking not found', bookingId });

    let clientUserId = booking.user_id;
    const userEmail = (booking.user_email || '').trim().toLowerCase();
    const userName = booking.user_name?.trim() || (userEmail ? userEmail.split('@')[0] : 'Cliente LegalUp');

    if (!clientUserId && userEmail) {
      try {
        // Replaced deprecated auth.admin.getUserByEmail with profiles lookup
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', userEmail)
          .maybeSingle();

        if (profile) clientUserId = profile.id;
      } catch (e) {
        console.error('Error looking up user by email (reconcile):', e);
      }
    }

    if (!clientUserId && userEmail) {
      const tempPassword = crypto.randomBytes(9).toString('hex');
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: userName, role: 'client', signup_method: 'booking' }
      });
      if (createError) {
        console.error('Error creating user (reconcile):', createError);
      }
      if (newUser?.user?.id) clientUserId = newUser.user.id;
    }

    const { error: bookingUpdateError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'approved',
        payment_id: payment.id.toString(),
        user_id: clientUserId,
        user_email: userEmail,
        user_name: userName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);
    if (bookingUpdateError) {
      console.error('Error updating booking (reconcile):', bookingUpdateError);
      return res.status(500).json({ error: 'Failed to update booking' });
    }

    // Send PostHog booking_paid event (misma fuente de verdad que el webhook:
    // pago aprobado por MercadoPago + booking actualizado a approved en Supabase).
    try {
      const posthogKey = process.env.POSTHOG_PROJECT_API_KEY || process.env.VITE_POSTHOG_KEY;
      if (posthogKey) {
        await fetch('https://us.i.posthog.com/capture/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: posthogKey,
            event: 'booking_paid',
            distinct_id: booking.posthog_distinct_id || booking.user_id || booking.user_email,
            properties: {
              booking_id: bookingId,
              payment_id: payment.id.toString(),
              lawyer_id: booking.lawyer_id,
              amount: payment.transaction_amount,
              variant: booking.experiment_variant,
              is_owner: OWNER_EMAILS.has((booking.user_email || '').trim().toLowerCase()),
            },
          }),
        });
      }
    } catch (posthogError) {
      console.error('[reconcile] step=posthog_capture failed', posthogError);
    }

    if (clientUserId) {
      const { data: existingAppointment } = await supabase
        .from('appointments')
        .select('id')
        .eq('lawyer_id', booking.lawyer_id)
        .eq('user_id', clientUserId)
        .eq('appointment_date', booking.scheduled_date)
        .eq('appointment_time', booking.scheduled_time)
        .maybeSingle();

      if (!existingAppointment) {
        const { error: apptError } = await supabase
          .from('appointments')
          .insert({
            lawyer_id: booking.lawyer_id,
            user_id: clientUserId,
            email: userEmail,
            name: userName,
            appointment_date: booking.scheduled_date,
            appointment_time: booking.scheduled_time,
            duration: booking.duration,
            price: booking.price,
            status: 'confirmed',
            consultation_type: 'paid',
            contact_method: 'platform',
            currency: 'CLP',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        if (apptError) console.error('Error creating appointment (reconcile):', apptError);
      }
    }

    return res.json({
      success: true,
      paymentId: payment.id,
      external_reference: bookingId,
      bookingUpdated: true,
      clientUserId,
    });
  } catch (error) {
    console.error('Error in MercadoPago reconcile endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/booking-leads-count
// Returns booking_leads count + daily timestamps using service role key (bypasses RLS)
app.get('/api/admin/booking-leads-count', requireAdmin, async (req, res) => {
  try {
    const { start, end } = req.query;

    // Count with date filter
    let countQuery = supabase.from('booking_leads').select('*', { count: 'exact', head: true });
    if (start) countQuery = countQuery.gte('created_at', start);
    if (end) countQuery = countQuery.lte('created_at', end);

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('[/api/admin/booking-leads-count] Count error:', countError);
      return res.status(500).json({ error: countError.message });
    }

    // Fetch daily timestamps for chart aggregation
    let dailyQuery = supabase.from('booking_leads').select('created_at');
    if (start) dailyQuery = dailyQuery.gte('created_at', start);
    if (end) dailyQuery = dailyQuery.lte('created_at', end);

    const { data: dailyData, error: dailyError } = await dailyQuery;
    if (dailyError) {
      console.error('[/api/admin/booking-leads-count] Daily error:', dailyError);
    }

    return res.json({
      count: count || 0,
      daily: (dailyData || []).map(r => r.created_at)
    });
  } catch (err) {
    console.error('[/api/admin/booking-leads-count] Exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/chat-analytics?from&to
// Métricas del chat/agente público (tab "Chat" de /admin/analytics). Agrega
// chat_events (SIEMPRE excluye tráfico local de desarrollo) y liga los leads
// reales booking_leads del periodo. Requiere admin.
app.get('/api/admin/chat-analytics', requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'Faltan parámetros from/to (ISO).' });
    }

    const [
      { data: events, error: eventsError },
      { data: leadsData, error: leadsError },
    ] = await Promise.all([
      supabase
        .from('chat_events')
        .select('created_at, event_type, visitor_id')
        .gte('created_at', from)
        .lte('created_at', to)
        .eq('is_local', false),
      supabase
        .from('booking_leads')
        .select('created_at')
        .gte('created_at', from)
        .lte('created_at', to),
    ]);

    if (eventsError) throw new Error(eventsError.message);
    if (leadsError) throw new Error(leadsError.message);

    const list = events || [];
    const conversations = list.filter((e) => e.event_type === 'conversation_started').length;
    const messages = list.filter((e) => e.event_type === 'message_sent').length;
    const users = new Set(list.map((e) => e.visitor_id).filter(Boolean)).size;
    const leads = (leadsData || []).length;

    res.json({
      totals: { users, conversations, messages, leads },
      // Timestamps crudos para que el frontend agrupe por día en su zona horaria
      // (misma convención que /api/admin/booking-leads-count).
      daily: {
        events: list.map((e) => ({ created_at: e.created_at, event_type: e.event_type, visitor_id: e.visitor_id })),
        leads: (leadsData || []).map((l) => l.created_at),
      },
    });
  } catch (err) {
    console.error('[/api/admin/chat-analytics] Error:', err);
    return res.status(500).json({ error: 'No pudimos cargar las métricas del chat.' });
  }
});

// GET /api/admin/chat-leads?from&to&status&source&q&page&pageSize&export=1
// Lista paginada de leads (booking_leads) para el tab "Leads del Chat". Filtros
// por fecha, estado real del lead, origen del flujo y búsqueda (nombre/email/
// teléfono/servicio). Con export=1 devuelve CSV respetando los filtros.
app.get('/api/admin/chat-leads', requireAdmin, async (req, res) => {
  try {
    const {
      from = '', to = '', status = 'all', source = 'all',
      q = '', page = '1', pageSize = '20', export: exportCsv = '',
    } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(String(pageSize), 10) || 20));

    let query = supabase
      .from('booking_leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (from) query = query.gte('created_at', String(from));
    if (to) query = query.lte('created_at', String(to));
    if (status && status !== 'all') query = query.eq('status', String(status));
    if (source && source !== 'all') query = query.eq('source', String(source));
    if (q) {
      const term = `%${String(q).trim().slice(0, 80)}%`;
      query = query.or(
        `name.ilike.${term},email.ilike.${term},phone.ilike.${term},service_title.ilike.${term}`,
      );
    }

    // Export CSV: no pagina, respeta los filtros y devuelve hasta 1.000 filas.
    if (String(exportCsv) === '1') {
      const { data, error } = await query.limit(1000);
      if (error) throw new Error(error.message);

      const header = ['fecha', 'nombre', 'email', 'telefono', 'servicio', 'area_tipo', 'abogado_id', 'estado', 'origen', 'monto_clp', 'booking_id'];
      const rows = (data || []).map((l) => [
        l.created_at,
        l.name,
        l.email,
        l.phone,
        l.service_title || '',
        l.booking_type || '',
        l.lawyer_id || '',
        l.status,
        l.source || '',
        l.price ?? '',
        l.booking_id || '',
      ]);
      const csv = [header, ...rows]
        .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      );
      return res.send(csv);
    }

    const fromRow = (pageNum - 1) * size;
    const { data, count, error } = await query.range(fromRow, fromRow + size - 1);
    if (error) throw new Error(error.message);

    // Nombres de abogado (perfil) para mostrar, sin exponer rut ni datos sensibles.
    const lawyerIds = [...new Set((data || []).map((l) => l.lawyer_id).filter(Boolean))];
    let lawyerNameById = {};
    if (lawyerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, display_name')
        .in('user_id', lawyerIds);
      if (profiles) {
        lawyerNameById = profiles.reduce((acc, p) => {
          acc[p.user_id] = p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Abogado';
          return acc;
        }, {});
      }
    }

    const leads = (data || []).map((l) => ({
      ...l,
      lawyer_name: lawyerNameById[l.lawyer_id] || null,
    }));

    res.json({
      leads,
      total: count || 0,
      page: pageNum,
      pageSize: size,
    });
  } catch (err) {
    console.error('[/api/admin/chat-leads] Error:', err);
    return res.status(500).json({ error: 'No pudimos cargar los leads del chat.' });
  }
});

// GET /api/admin/documents-revenue?from&to
// Ventas de documentos legales generados (p. ej. Pagaré $9.990). Se registran en
// generated_documents: el webhook de documentos NO escribe payment_events, por
// eso "Total de Pagos" no las incluía. Sin from/to devuelve todo; con from/to
// acota al rango. Exige admin.
app.get('/api/admin/documents-revenue', requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = supabase
      .from('generated_documents')
      .select('total_paid')
      .neq('status', 'pending_payment')
      .not('payment_id', 'is', null);
    if (from) query = query.gte('created_at', String(from));
    if (to) query = query.lte('created_at', String(to));

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = data || [];
    res.json({
      count: rows.length,
      total: rows.reduce((sum, d) => sum + (d.total_paid || 0), 0),
    });
  } catch (err) {
    console.error('[/api/admin/documents-revenue] Error:', err);
    return res.status(500).json({ error: 'No pudimos cargar el revenue de documentos.' });
  }
});

// Endpoint para notificar abogados
app.post('/api/admin/notify-lawyers', requireAdmin, async (req, res) => {
  try {
    const { testMode = false, testEmail } = req.body;

    // Verificar si estamos en modo de prueba
    if (testMode) {
      if (!testEmail) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un correo de prueba en modo test'
        });
      }

      // Enviar correo de prueba
      await resend.emails.send({
        from: 'LegalUp <hola@mg.legalup.cl>',
        to: testEmail,
        subject: 'Prueba de notificación LegalUp',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://legalup.cl/assets/logo-200.png" alt="LegalUp" style="max-width: 200px; margin-bottom: 20px;">
              <h1 style="color: #101820; margin-bottom: 10px;">º</h1>
            </div>
            
            <p style="color: #101820; line-height: 1.6; margin-bottom: 20px;">
              Hemos notado que aún no has cargado ningún servicio en tu perfil de LegalUp. Para que los clientes puedan encontrarte y contratarte, es importante que completes esta información.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/lawyer/services" 
                  style="background-color: #2563eb; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 6px; font-weight: bold; 
                        display: inline-block; font-size: 16px;">
                Agregar mi primer servicio
              </a>
            </div>

            <p style="color: #101820; line-height: 1.6; margin-bottom: 20px;">
              Si necesitas ayuda para configurar tus servicios, no dudes en contactarnos a 
              <a href="mailto:juan.fercommerce@gmail.com" style="color: #2563eb; text-decoration: none;">soporte@legalup.cl</a>.
            </p>

            <p style="color: #101820; line-height: 1.6; margin-bottom: 30px;">
              ¡Estamos aquí para ayudarte a tener éxito en LegalUp!
            </p>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; text-align: center;">
              <p>© ${new Date().getFullYear()} LegalUp. Todos los derechos reservados.</p>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 5px;">
                Si ya has cargado tus servicios, por favor ignora este mensaje.
              </p>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 5px;">
                Este es un correo automático, por favor no respondas a este mensaje.
              </p>
            </div>
          </div>
        `
      });

      return res.json({
        success: true,
        message: 'Correo de prueba enviado correctamente',
        testEmail
      });
    }

    // Obtener todos los abogados
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('role', 'lawyer')
      .not('email', 'is', null);

    if (profileError) {
      console.error('Error al obtener perfiles de abogados:', profileError);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener la lista de abogados',
        error: profileError.message
      });
    }

    // Obtener IDs de abogados que ya tienen servicios cargados
    const { data: servicesData, error: servicesError } = await supabase
      .from('lawyer_services')
      .select('lawyer_user_id');

    if (servicesError) {
      console.error('Error al obtener lawyer_services:', servicesError);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar servicios de abogados',
        error: servicesError.message
      });
    }

    // Crear un set de IDs con servicios para un filtrado eficiente
    const lawyerIdsWithServices = new Set(servicesData.map(s => s.lawyer_user_id));

    // Filtrar abogados que NO tienen servicios
    const lawyers = profiles.filter(profile => !lawyerIdsWithServices.has(profile.id));

    // Si no hay abogados para notificar
    if (!lawyers || lawyers.length === 0) {
      return res.json({
        success: true,
        message: 'No hay abogados sin servicios para notificar',
        count: 0
      });
    }

    // Contadores para el resumen
    let successCount = 0;
    let failCount = 0;
    const failedEmails = [];

    // Enviar notificación a cada abogado
    for (const lawyer of lawyers) {
      try {
        const fullName = `${lawyer.first_name || ''} ${lawyer.last_name || ''}`.trim() || 'Abogado/a';

        await resend.emails.send({
          from: 'LegalUp <hola@mg.legalup.cl>',
          to: lawyer.email,
          subject: '¡Aún no has cargado servicios en tu perfil!',
          html: `
            <body style="margin:0;padding:16px;background:#f9fafb;">
              <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
                  <div style="text-align:center;margin-bottom:28px;">
                      <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
                      <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
                  </div>
                  <h1 style="color: #101820; margin-bottom: 10px;">Hola ${fullName}.</h1>
            
            
                  <p style="color: #101820; line-height: 1.6; margin-bottom: 20px;">
                      Hemos notado que aún no has cargado ningún servicio en tu perfil de LegalUp. Para que los clientes puedan encontrarte y contratarte, es importante que completes esta información.
                  </p>
                
                  <div style="text-align: center; margin: 30px 0;">
                      <a href="${appUrl}/lawyer/services" 
                        style="background-color: #101820; color: white; padding: 12px 30px; 
                                text-decoration: none; border-radius: 6px; font-weight: bold; 
                                display: inline-block; font-size: 16px;">
                        Agregar mi primer servicio
                      </a>
                  </div>
              
                  <p style="color: #101820; line-height: 1.6; margin-bottom: 20px;">
                      Si necesitas ayuda para configurar tus servicios, no dudes en contactarnos a 
                      <a href="mailto:juan.fercommerce@gmail.com" style="color: #2563eb; text-decoration: none;">soporte@legalup.cl</a>.
                  </p>
              
                  <p style="color: #101820; line-height: 1.6; margin-bottom: 30px;">
                      ¡Estamos aquí para ayudarte a tener éxito en LegalUp!
                  </p>
              
                  <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
                      © 2026 LegalUp — Asesoría legal online en Chile.<br />
                      Todos los derechos reservados.<br />
                      Este es un correo automático de notificación administrativa.
                  </p>
              </div>
          </body>
          `
        });

        successCount++;

        // Pequeña pausa para evitar saturar el servicio de envío
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (emailError) {
        console.error(`Error al enviar correo a ${lawyer.email}:`, emailError);
        failCount++;
        failedEmails.push({
          email: lawyer.email,
          error: emailError.message
        });
      }
    }

    // Enviar resumen por correo al administrador
    try {
      await resend.emails.send({
        from: 'LegalUp <hola@mg.legalup.cl>',
        to: 'juan.fercommerce@gmail.com',
        subject: `Resumen de notificaciones a abogados (${new Date().toLocaleDateString()})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Resumen de notificaciones</h2>
            <p>Se han procesado las notificaciones a abogados sin servicios cargados.</p>
            
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p><strong>Total de abogados notificados:</strong> ${successCount + failCount}</p>
              <p style="color: #22c55e;"><strong>Notificaciones exitosas:</strong> ${successCount}</p>
              <p style="color: ${failCount > 0 ? '#ef4444' : '#22c55e'}"><strong>Notificaciones fallidas:</strong> ${failCount}</p>
            </div>
            
            ${failCount > 0 ? `
              <div style="margin-top: 20px;">
                <h3>Correos con error:</h3>
                <ul>
                  ${failedEmails.map(item => `
                    <li>${item.email}: ${item.error}</li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
              <p>© ${new Date().getFullYear()} LegalUp. Todos los derechos reservados.</p>
            </div>
          </div>
        `
      });
    } catch (summaryError) {
      console.error('Error al enviar resumen:', summaryError);
    }

    return res.json({
      success: true,
      message: `Notificaciones enviadas correctamente a ${successCount} abogados`,
      details: {
        total: lawyers.length,
        success: successCount,
        failed: failCount,
        failedEmails: failedEmails.length > 0 ? failedEmails : undefined
      }
    });
  } catch (error) {
    console.error('Error en el proceso de notificación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud',
      error: error.message
    });
  }
});

// ============================================
// LEGALUP AI — INVITACIÓN A ABOGADOS (FASE EMAIL)
// ============================================
app.post('/api/admin/ai/send-lawyer-invite', requireAdmin, retiredAITrialInvite);

// ============================================
// FASE 4.42A — admin lawyer magic-link onboarding (solo nuevos emails).
// Sin Pro/Founder/trial: solo identidad lawyer + acceso default.
// action_link vive solo en memoria del servidor (nunca en respuesta ni logs).
// ============================================
app.post('/api/admin/invite-lawyer-magic-link', requireAdmin, async (req, res) => {
  const reqStart = Date.now();
  try {
    const { email: rawEmail, name: rawName } = req.body || {};
    if (rawName !== undefined && rawName !== null && typeof rawName !== 'string') {
      return res.status(400).json({ success: false, code: 'INVALID_NAME', message: 'Nombre inválido.' });
    }
    const email = normalizeEmail(rawEmail);
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, code: 'INVALID_EMAIL', message: 'Email inválido.' });
    }
    const { displayName, firstName, lastName } = splitName(rawName);
    if (rawName && !displayName) {
      return res.status(400).json({ success: false, code: 'INVALID_NAME', message: 'Nombre inválido.' });
    }
    if (!resend) {
      return res.status(500).json({ success: false, code: 'EMAIL_NOT_CONFIGURED', message: 'Servicio de email no configurado (RESEND_API_KEY).' });
    }
    const templateId = process.env.RESEND_LAWYER_INVITE_TEMPLATE_ID || '';
    if (!templateId) {
      return res.status(500).json({ success: false, code: 'INVITE_TEMPLATE_NOT_CONFIGURED', message: 'Template de invitación no configurado.' });
    }

    // 1) Existencia: profiles (identidad app) + auth.users (scan paginado).
    // Cualquier identidad canónica existente detiene la invitación.
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('email', email)
      .maybeSingle();
    let existingAuthUser = null;
    let page = 1;
    for (;;) {
      const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
      if (listError) throw listError;
      const users = listed?.users || [];
      const hit = users.find((u) => normalizeEmail(u.email) === email);
      if (hit) { existingAuthUser = hit; break; }
      if (users.length < 200 || page >= 50) break;
      page += 1;
    }

    const invitePath = decideInvitePath({ authUser: existingAuthUser, profile: existingProfile || null });
    if (invitePath === 'conflict') {
      return res.status(409).json({ success: false, code: CONFLICT_CODE, message: 'Este correo ya tiene una cuenta en LegalUp.' });
    }

    // 2) Cooldown anti-doble-click (solo paths con side effects).
    if (!checkRouteCooldown(email)) {
      return res.status(429).json({ success: false, code: 'INVITE_RATE_LIMITED', message: 'Espera un momento antes de reintentar.' });
    }

    const adminId = req.adminUser?.id || null;
    let userId;

    // Rollback ownership (§19): solo si el id capturado de ESTE generateLink
    // se re-verifica (mismo id + mismo email + creado en ventana + sin perfil).
    const rollbackIfOwned = async () => {
      try {
        const { data: freshWrap } = await supabase.auth.admin.getUserById(userId);
        const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
        if (ownsInviteIdentity({ userId, freshUser: freshWrap?.user, email, profile: existingProfile, reqStart })) {
          await supabase.auth.admin.deleteUser(userId);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    };

    if (invitePath === 'create') {
      // 3) Generar magic link (crea la identidad si no existe; nunca duplica).
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: `${appUrl}/auth/callback` },
      });
      const actionLink = linkData?.properties?.action_link;
      userId = linkData?.user?.id;
      if (linkError || !actionLink || !userId) {
        console.error('[LawyerInvite] generateLink failed', linkError?.message);
        return res.status(500).json({ success: false, code: 'INVITE_LINK_FAILED', message: 'No se pudo generar el acceso.' });
      }

      // 4) Confirmar email + rol lawyer + marcador (todo server-side).
      // 4.53D: app_metadata.password_setup=false (server-controlled; el
      // browser jamás puede escribir app_metadata). Resend path no toca
      // cuentas existentes (fail-conservative para legacy).
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        email_confirm: true,
        user_metadata: {
          role: 'lawyer',
          first_name: firstName,
          last_name: lastName,
          ...buildInviteMarker(adminId),
        },
        app_metadata: { password_setup: false },
      });
      if (updateError) {
        console.error('[LawyerInvite] updateUser failed', updateError?.message);
        const rolledBack = await rollbackIfOwned();
        return res.status(500).json({ success: false, code: 'INVITE_PROVISION_FAILED', message: 'No se pudo provisionar el acceso.', rolled_back: rolledBack });
      }

      // 5) Perfil lawyer canónico (upsert por id; sin Pro/trial/AI).
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        user_id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        display_name: displayName || null,
        role: 'lawyer',
      }, { onConflict: 'id' });
      if (profileError) {
        console.error('[LawyerInvite] profile upsert failed', profileError?.message);
        const rolledBack = await rollbackIfOwned();
        return res.status(500).json({ success: false, code: 'INVITE_PROVISION_FAILED', message: 'No se pudo provisionar el acceso.', rolled_back: rolledBack });
      }

      // 6) Enviar por Resend (template del owner; idempotente por evento).
      const emailPayload = buildInviteEmail({ templateId, magicLink: actionLink, lawyerName: displayName });
      emailPayload.to = email;
      try {
        const sendResult = await sendEmailIdempotent({
          supabase,
          businessEventId: `admin-lawyer-invite:${email}`,
          type: 'lawyer_magic_link_invite',
          recipient: email,
          sendFn: () => resend.emails.send(emailPayload, { idempotencyKey: `admin-lawyer-invite:${email}` }),
        });
        if (sendResult?.skipped) {
          return res.json({ success: true, invited: true, email, resent: false, email_sent: false, deduped: true });
        }
      } catch (mailError) {
        console.error('[LawyerInvite] resend failed', mailError?.message);
        return res.status(502).json({ success: false, code: 'INVITE_EMAIL_FAILED', message: 'Acceso creado pero el email no pudo enviarse. Reintenta para reenviar.', invited: true, email_sent: false, retryable: true });
      }

      console.info('[LawyerInvite]', JSON.stringify(buildInviteAudit({ adminUserId: adminId, email, status: 'sent', resent: false })));
      return res.json({ success: true, invited: true, email, resent: false, email_sent: true });
    }

    // 7) Resend path: identidad con nuestro marcador → link fresco, sin duplicar.
    // Si el perfil no existe (falla parcial previa), se crea mínimo para no
    // dejar huérfano B (nunca se sobrescribe uno existente).
    const { data: resendProfile } = await supabase.from('profiles').select('id').eq('id', existingAuthUser?.id || '').maybeSingle();
    if (!resendProfile && existingAuthUser?.id) {
      const { error: backfillError } = await supabase.from('profiles').upsert({
        id: existingAuthUser.id,
        user_id: existingAuthUser.id,
        email,
        role: 'lawyer',
      }, { onConflict: 'id' });
      if (backfillError) {
        console.error('[LawyerInvite] profile backfill failed', backfillError?.message);
        return res.status(500).json({ success: false, code: 'INVITE_PROVISION_FAILED', message: 'No se pudo provisionar el acceso.' });
      }
    }
    const { data: relinkData, error: relinkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${appUrl}/auth/callback` },
    });
    const reActionLink = relinkData?.properties?.action_link;
    if (relinkError || !reActionLink) {
      console.error('[LawyerInvite] relink failed', relinkError?.message);
      return res.status(500).json({ success: false, code: 'INVITE_LINK_FAILED', message: 'No se pudo generar el acceso.' });
    }
    userId = (relinkData?.user?.id) || existingAuthUser?.id || null;
    const rePayload = buildInviteEmail({ templateId, magicLink: reActionLink, lawyerName: displayName });
    rePayload.to = email;
    try {
      await resend.emails.send(rePayload, { idempotencyKey: `admin-lawyer-invite-resend:${email}:${Date.now()}` });
    } catch (mailError) {
      console.error('[LawyerInvite] resend failed', mailError?.message);
      return res.status(502).json({ success: false, code: 'INVITE_EMAIL_FAILED', message: 'No se pudo enviar el email.', invited: true, email_sent: false, retryable: true });
    }
    console.info('[LawyerInvite]', JSON.stringify(buildInviteAudit({ adminUserId: adminId, email, status: 'resent', resent: true })));
    return res.json({ success: true, invited: true, email, resent: true, email_sent: true });
  } catch (error) {
    console.error('[LawyerInvite] unexpected error', error?.message);
    return res.status(500).json({ success: false, message: 'Error al invitar abogado.', error: error?.message });
  }
});

// ============================================
// FASE 4.53D — marca server-side de password setup (app_metadata).
// El browser jamás elige el uid destino: siempre el dueño del JWT.
// No recibe ni devuelve passwords ni datos sensibles.
// ============================================
app.post('/api/auth/password-setup-complete', async (req, res) => {
  try {
    const userId = await requireAILawyer(req, res);
    if (!userId) return;

    const { data: wrap, error: readError } = await supabase.auth.admin.getUserById(userId);
    if (readError || !wrap?.user) {
      return res.status(404).json({ success: false, code: 'USER_NOT_FOUND', message: 'No se encontró tu cuenta.' });
    }
    const current = wrap.user.app_metadata || {};
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...current,
        password_setup: true,
        password_setup_at: new Date().toISOString(),
      },
    });
    if (updateError) {
      console.error('[PasswordSetup] marker failed', updateError?.message);
      return res.status(502).json({ success: false, code: 'MARKER_FAILED', message: 'No se pudo registrar el cambio. Inténtalo de nuevo.' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('[PasswordSetup] unexpected error', error?.message);
    return res.status(500).json({ success: false, message: 'Error inesperado.' });
  }
});

// ============================================
// LEGALUP EMPRESAS ENDPOINTS
// ============================================

// Helper: Send subscription email
const sendSubscriptionEmail = async (to, subject, htmlContent) => {
  if (!resend) {
    console.warn('[Empresas] Resend not configured, skipping email');
    return;
  }
  try {
    await resend.emails.send({
      from: 'LegalUp Empresas <hola@mg.legalup.cl>',
      to,
      subject,
      html: htmlContent,
    });
    console.log('[Empresas] Email sent:', subject, 'to:', to);
  } catch (error) {
    console.error('[Empresas] Email error:', error);
  }
};

// Email templates
const subscriptionEmailTemplates = {
  welcome: (companyName, planName) => `
    <body style="margin:0;padding:16px;background:#f9fafb;">
      <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
        <div style="text-align:center;margin-bottom:28px;">
            <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
            <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
            <span style="font-size:10px;background:#06392f;color:#fff;padding: 4px 6px;border-radius:4px;margin-left:4px;vertical-align:middle;">Empresas</span>
        </div>
        <h1 style="color:#1a202c;">¡Bienvenido a LegalUp Empresas!</h1>
        <p>Hola <strong>${companyName}</strong>,</p>
        <p>Tu plan <strong>${planName}</strong> está activo. Ya puedes comenzar a usar LegalUp como tu departamento legal externo.</p>
        <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0;">
          <p style="margin:5px 0;">✓ Crea solicitudes legales</p>
          <p style="margin:5px 0;">✓ Adjunta documentos</p>
          <p style="margin:5px 0;">✓ Recibe asesoría de abogados especialistas</p>
        </div>
        <div style="text-align:center;margin:30px 0;">
          <a href="${appUrl}/empresa" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Ir a mi panel</a>
        </div>
        <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
            © 2026 LegalUp — Asesoría legal online en Chile.<br />
            Todos los derechos reservados.<br />
            Este es un correo automático de notificación administrativa.
        </p>
      </div>
    </body>
  `,
  renewal: (companyName, planName, periodEnd) => `
    <body style="margin:0;padding:16px;background:#f9fafb;">
      <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
        <div style="text-align:center;margin-bottom:28px;">
            <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
            <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
            <span style="font-size:10px;background:#06392f;color:#fff;padding: 4px 6px;border-radius:4px;margin-left:4px;vertical-align:middle;">Empresas</span>
        </div>  
        <h1 style="color:#1a202c;">Suscripción renovada</h1>
        <p>Hola <strong>${companyName}</strong>,</p>
        <p>Tu plan <strong>${planName}</strong> se ha renovado exitosamente. Tus beneficios están activos hasta <strong>${periodEnd}</strong>.</p>
        <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
            © 2026 LegalUp — Asesoría legal online en Chile.<br />
            Todos los derechos reservados.<br />
            Este es un correo automático de notificación administrativa.
        </p>
      </div>
    </body>
  `,
  payment_failed: (companyName) => `
    <body style="margin:0;padding:16px;background:#f9fafb;">
      <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
        <div style="text-align:center;margin-bottom:28px;">
            <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
            <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
            <span style="font-size:10px;background:#06392f;color:#fff;padding: 4px 6px;border-radius:4px;margin-left:4px;vertical-align:middle;">Empresas</span>
        </div>
        <h1 style="color:#dc2626;">Pago no procesado</h1>
        <p>Hola <strong>${companyName}</strong>,</p>
        <p>No pudimos procesar el pago de tu suscripción. Por favor actualiza tu medio de pago para evitar la suspensión del servicio.</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${appUrl}/empresa/facturacion" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Actualizar medio de pago</a>
        </div>
        <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
          © 2026 LegalUp — Asesoría legal online en Chile.<br />
          Todos los derechos reservados.<br />
          Este es un correo automático de notificación administrativa.
        </p>
      </div>
    </body>
  `,
  cancelled: (companyName, planName, periodEnd) => `
    <body style="margin:0;padding:16px;background:#f9fafb;">
      <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
        <div style="text-align:center;margin-bottom:28px;">
          <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
          <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
          <span style="font-size:10px;background:#06392f;color:#fff;padding: 4px 6px;border-radius:4px;margin-left:4px;vertical-align:middle;">Empresas</span>
        </div>
        <h1 style="color:#1a202c;">Suscripción cancelada</h1>
        <p>Hola <strong>${companyName}</strong>,</p>
        <p>Tu plan <strong>${planName}</strong> ha sido cancelado. Tus beneficios seguirán activos hasta <strong>${periodEnd}</strong>.</p>
        <p>Si cambias de opinión, puedes reactivar tu suscripción en cualquier momento.</p>
        <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
          © 2026 LegalUp — Asesoría legal online en Chile.<br />
          Todos los derechos reservados.<br />
          Este es un correo automático de notificación administrativa.
        </p>
      </div>
    </body>
  `,
};

// ---- LegalUp AI: correos de suscripción ----
const sendAIEmail = async (to, subject, htmlContent) => {
  if (!resend) {
    console.warn('[LegalUpAI] Resend not configured, skipping email');
    return;
  }
  try {
    await resend.emails.send({
      from: 'LegalUp AI <hola@mg.legalup.cl>',
      to,
      subject,
      html: htmlContent,
    });
    console.log('[LegalUpAI] Email sent:', subject, 'to:', to);
  } catch (error) {
    console.error('[LegalUpAI] Email error:', error);
  }
};

const aiSubscriptionEmailTemplates = {
  shell: (contentHtml, badge) => `
    <body style="margin:0;padding:16px;background:#f9fafb;">
      <div style="max-width:580px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#111827;padding:28px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;line-height:1.6;">
        <div style="text-align:center;margin-bottom:28px;">
            <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;margin-right:10px;border:0;" />
            <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
            <span style="font-size:10px;background:#06392f;color:#fff;padding: 4px 6px;border-radius:4px;margin-left:4px;vertical-align:middle;">${badge}</span>
        </div>
        ${contentHtml}
        <p style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:32px;text-align:center;">
            © 2026 LegalUp — Asesoría legal online en Chile.<br />
            Todos los derechos reservados.<br />
            Este es un correo automático de notificación administrativa.
        </p>
      </div>
    </body>
  `,
  trialStarted: () => aiSubscriptionEmailTemplates.shell(`
    <h1 style="color:#1a202c;">Tu prueba gratuita ya está activa</h1>
    <p>Tu prueba de <strong>${AI_SUBSCRIPTION_TRIAL_DAYS} días gratis</strong> de LegalUp AI ya está activa. Disfruta de:</p>
    <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0;">
      <p style="margin:5px 0;">✓ Analiza documentos con IA</p>
      <p style="margin:5px 0;">✓ Consulta tus casos históricos</p>
      <p style="margin:5px 0;">✓ Chatea con tu caso y obtén respuestas con contexto</p>
    </div>
    <p>Este acceso histórico conserva su fecha de término. Conoce las capacidades actuales de <a href="${appUrl}/pro">LegalUp Pro</a>.</p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${appUrl}/lawyer/ai" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Ir a LegalUp AI</a>
    </div>
  `, 'AI'),
  welcome: () => aiSubscriptionEmailTemplates.shell(`
    <h1 style="color:#1a202c;">¡Bienvenido a LegalUp AI!</h1>
    <p>Tu suscripción histórica de <strong>LegalUp AI</strong> está activa. Sigue trabajando tus casos con todas las herramientas de LegalUp AI.</p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${appUrl}/lawyer/ai" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Ir a mi workspace</a>
    </div>
  `, 'AI'),
  renewal: (periodEnd) => aiSubscriptionEmailTemplates.shell(`
    <h1 style="color:#1a202c;">Tu suscripción se renovó</h1>
    <p>Tu plan histórico de <strong>LegalUp AI</strong> se renovó exitosamente. Tus beneficios están activos hasta el <strong>${periodEnd}</strong>.</p>
  `, 'AI'),
  payment_failed: () => aiSubscriptionEmailTemplates.shell(`
    <h1 style="color:#dc2626;">Pago no procesado</h1>
    <p>No pudimos procesar el pago de tu suscripción de LegalUp AI. Por favor actualiza tu medio de pago para no perder el acceso.</p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${appUrl}/lawyer/ai" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Revisar mi suscripción</a>
    </div>
  `, 'AI'),
  cancelled: (periodEnd) => aiSubscriptionEmailTemplates.shell(`
    <h1 style="color:#1a202c;">Suscripción cancelada</h1>
    <p>Tu suscripción histórica de <strong>LegalUp AI</strong> fue cancelada. Tus beneficios seguirán activos hasta el <strong>${periodEnd}</strong>.</p>
    <p>Si cambias de opinión, puedes reactivar tu suscripción en cualquier momento.</p>
  `, 'AI'),
  trialReminder: (daysLeft) => {
    const isLastDay = daysLeft === 1;
    const endsToday = daysLeft === 0;
    const heading = isLastDay
      ? 'Tu prueba de LegalUp AI termina mañana'
      : endsToday
        ? 'Tu prueba de LegalUp AI termina hoy'
        : '¿Ya probaste LegalUp AI con un caso real?';
    const intro = isLastDay
      ? 'Tu prueba gratuita de LegalUp AI <strong>termina mañana</strong>.'
      : endsToday
        ? 'Tu prueba gratuita de LegalUp AI <strong>termina hoy</strong>.'
        : `Te quedan <strong>${daysLeft} días</strong> de prueba gratuita de LegalUp AI. ¿Ya analizaste un documento o chateaste con un caso?`;
    return aiSubscriptionEmailTemplates.shell(`
    <h1 style="color:#1a202c;">${heading}</h1>
    <p>${intro}</p>
    <p>Para continuar con las capacidades actuales, revisa <a href="${appUrl}/pro">LegalUp Pro</a>. Tus resultados guardados se conservan.</p>
    <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0;">
      <p style="margin:5px 0;">✓ Analiza documentos con IA</p>
      <p style="margin:5px 0;">✓ Consulta tus casos históricos</p>
      <p style="margin:5px 0;">✓ Chatea con tu caso</p>
    </div>
    <div style="text-align:center;margin:30px 0;">
      <a href="${appUrl}/pro" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Ver LegalUp Pro</a>
    </div>
  `, 'AI');
  },
};

// Historical template retained for reference only. No production send path.
// /api/admin/ai/send-lawyer-invite returns 410 (retiredAITrialInvite).
// ---- LegalUp AI — Invitación a abogados registrados (FASE EMAIL) ----
const LEGALUP_AI_INVITE_CAMPAIGN = 'legalup_ai_trial';
const LEGALUP_AI_INVITE_SUBJECT = 'Conoce LegalUp AI — 5 días gratis para probarlo';
const LEGALUP_AI_INVITE_PREHEADER = 'Analiza tus documentos jurídicos y trabaja tus casos con LegalUp AI.';

function buildLegalUpAIInviteEmail({ lawyerName, ctaUrl }) {
  const greeting = lawyerName ? `Hola, ${lawyerName}:` : 'Hola,';
  const preheader = LEGALUP_AI_INVITE_PREHEADER;
  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${LEGALUP_AI_INVITE_SUBJECT}</title>
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <style>body{margin:0;padding:0;background-color:#0a0a0a;} img{border:0;outline:none;text-decoration:none;} a{color:#10b981;}</style>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader} &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0a0a0a;">
    <tr><td align="center" style="padding:28px 12px 18px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;">
        <!-- Branding — Scale + LegalUp AI — alineado horizontal centrado -->
        <tr><td align="center" style="padding:10px 0 18px;text-align:center;">
          <a href="${appUrl}/ai" style="text-decoration:none;display:inline-block;text-align:center;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
              <tr>
                <td align="center" style="vertical-align:middle;padding-right:7px;line-height:0;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:0 auto;"><path d="M12 3v18"/><path d="m19 8 3 8a5 5 0 0 1-6 0zV7"/><path d="M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1"/><path d="m5 8 3 8a5 5 0 0 1-6 0zV7"/><path d="M7 21h10"/></svg>
                </td>
                <td align="center" style="vertical-align:middle;">
                  <span style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:800;letter-spacing:-0.02em;color:#ffffff;line-height:1;display:inline-block;vertical-align:middle;">LegalUp</span>
                </td>
                <td align="center" style="vertical-align:middle;padding-left:2px;">
                  <span style="font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.16em;color:#10b981;border:1px solid rgba(16,185,129,0.35);background:rgba(16,185,129,0.14);padding:3px 6px;border-radius:4px;display:inline-block;line-height:1;vertical-align:middle;margin-left:6px;">AI</span>
                </td>
              </tr>
            </table>
          </a>
        </td></tr>
        <!-- Hero — premium dark -->
        <tr><td style="background:linear-gradient(180deg,#111113 0%,#18181b 100%);border:1px solid #27272a;border-radius:16px;padding:34px 28px 28px;text-align:center;overflow:hidden;">
          <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#10b981;margin:0 0 14px;font-weight:700;">✦ Disponible para ti — Invitación</p>
          <h1 style="font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:1.1;font-weight:800;color:#ffffff;margin:0 0 14px;letter-spacing:-0.03em;">Conoce LegalUp AI</h1>
          <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#a1a1aa;margin:0 0 22px;max-width:420px;display:inline-block;">Una nueva forma de trabajar<br>tus documentos jurídicos.</p>
          <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td align="center" style="border-radius:10px;background:#10b981;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${ctaUrl}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="12%" strokecolor="#10b981" fillcolor="#10b981"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;">Probar LegalUp AI gratis →</center></v:roundrect><![endif]-->
              <!--[if !mso]><!--><a href="${ctaUrl}" style="display:inline-block;background:#10b981;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:10px;min-width:260px;text-align:center;">Probar LegalUp AI gratis →</a><!--<![endif]-->
            </td></tr>
          </table>
          <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#71717a;margin:12px 0 0;letter-spacing:0.01em;">5 días gratis · luego $49.900 CLP/mes · Sin permanencia</p>
        </td></tr>
        <!-- Greeting + propuesta -->
        <tr><td style="padding:22px 4px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111113;border:1px solid #27272a;border-radius:14px;overflow:hidden;">
            <tr><td style="padding:24px 26px 18px;">
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#ffffff;margin:0 0 12px;font-weight:600;">${greeting}</p>
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#a1a1aa;margin:0 0 12px;">¿Tienes documentos que necesitas <strong style="color:#ffffff;">revisar, entender o analizar</strong> antes de tomar una decisión?</p>
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#71717a;margin:0;">En lugar de empezar con una pregunta, <em style="color:#ffffff;font-style:normal;font-weight:600;">empieza con tu caso</em> — sube los documentos con los que ya trabajas y LegalUp AI los transforma en información accionable desde tu <strong style="color:#ffffff;">workspace privado</strong>.</p>
            </td></tr>
          </table>
        </td></tr>
        <!-- Product preview — premium dark -->
        <tr><td style="padding:18px 4px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111113;border:1px solid #27272a;border-radius:14px;overflow:hidden;">
            <tr><td style="background:#18181b;border-bottom:1px solid #27272a;padding:10px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#71717a;">legalup.ai / workspace</td>
                <td align="right"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#10b981;vertical-align:middle;margin-right:4px;"></span><span style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#a1a1aa;vertical-align:middle;">Motor jurídico activo</span></td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:36%;vertical-align:top;padding-right:8px;">
                    <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#a1a1aa;margin:0 0 8px;">Caso</p>
                    <div style="background:#1c1c1f;border:1px solid #27272a;border-radius:10px;padding:12px;">
                      <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#ffffff;margin:0 0 6px;">Despido — Juan Pérez</p>
                      <div style="border-top:1px solid #27272a;margin:8px 0;"></div>
                      <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;margin:0 0 6px;">Documentos</p>
                      <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#d4d4d8;margin:0 0 3px;">▸ Contrato.pdf</p>
                      <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#d4d4d8;margin:0 0 3px;">▸ Demanda.pdf</p>
                      <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#71717a;margin:0;">▸ Resolución.pdf</p>
                    </div>
                  </td>
                  <td style="width:64%;vertical-align:top;padding-left:8px;">
                    <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#a1a1aa;margin:0 0 8px;">Análisis</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="background:#1c1c1f;border:1px solid #27272a;border-radius:8px;padding:10px 11px;">
                        <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#ffffff;margin:0 0 3px;">Hechos identificados</p>
                        <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#a1a1aa;margin:0;">Partes · Plazos · Pretensiones</p>
                      </td></tr>
                      <tr><td style="height:7px;"></td></tr>
                      <tr><td style="background:rgba(16,185,129,0.10);border:1px solid rgba(16,185,129,0.25);border-radius:8px;padding:10px 11px;">
                        <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:#10b981;margin:0 0 3px;">⚠ Riesgos detectados</p>
                        <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#a1a1aa;margin:0;">Plazo 5 días · Carta art. 162</p>
                      </td></tr>
                    </table>
                    <div style="margin-top:8px;background:#1c1c1f;border:1px solid #27272a;border-radius:8px;padding:10px 11px;">
                      <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#a1a1aa;margin:0 0 6px;">Chat</p>
                      <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#d4d4d8;margin:0 0 4px;">“¿Qué información falta para completar el análisis?”</p>
                      <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#a1a1aa;margin:0;">→ Respuesta con contexto del caso</p>
                    </div>
                  </td>
                </tr>
              </table>
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#71717a;margin:12px 0 0;text-align:center;letter-spacing:0.02em;">Sube tus documentos. Obtén un análisis. Pregunta sobre tu caso.</p>
            </td></tr>
          </table>
        </td></tr>
        <!-- Beneficios — números + whitespace -->
        <tr><td style="padding:20px 4px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111113;border:1px solid #27272a;border-radius:14px;overflow:hidden;">
            <tr><td style="padding:22px 24px 22px;">
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#71717a;margin:0 0 16px;font-weight:600;">Trabaja con la información de tus documentos</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:28px;vertical-align:top;padding-top:2px;"><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;color:#10b981;">01</span></td>
                  <td style="padding-bottom:14px;border-bottom:1px solid #27272a;">
                    <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#ffffff;margin:0 0 4px;">Analiza documentos</p>
                    <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#a1a1aa;margin:0;">Sube contratos, demandas o sentencias y obtén un análisis estructurado.</p>
                  </td>
                </tr>
                <tr>
                  <td style="width:28px;vertical-align:top;padding-top:14px;"><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;color:#10b981;">02</span></td>
                  <td style="padding:14px 0;border-bottom:1px solid #27272a;">
                    <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#ffffff;margin:0 0 4px;">Detecta riesgos y obligaciones</p>
                    <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#a1a1aa;margin:0;">Identifica alertas, plazos y puntos que requieren especial atención.</p>
                  </td>
                </tr>
                <tr>
                  <td style="width:28px;vertical-align:top;padding-top:14px;"><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;color:#10b981;">03</span></td>
                  <td style="padding:14px 0;border-bottom:1px solid #27272a;">
                    <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#ffffff;margin:0 0 4px;">Organiza información relevante</p>
                    <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#a1a1aa;margin:0;">Encuentra hechos, obligaciones e información faltante.</p>
                  </td>
                </tr>
                <tr>
                  <td style="width:28px;vertical-align:top;padding-top:14px;"><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;color:#10b981;">04</span></td>
                  <td style="padding-top:14px;">
                    <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#ffffff;margin:4px 0 4px;">Conversa con tus documentos</p>
                    <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#a1a1aa;margin:0;">Haz preguntas y obtén respuestas contextualizadas de tu propio caso.</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <!-- CTA secundario -->
        <tr><td align="center" style="padding:22px 4px 0;">
          <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td align="center" style="border-radius:10px;background:#09090b;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${ctaUrl}" style="height:46px;v-text-anchor:middle;width:280px;" arcsize="12%" strokecolor="#09090b" fillcolor="#09090b"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:700;">Probar LegalUp AI gratis →</center></v:roundrect><![endif]-->
              <!--[if !mso]><!--><a href="${ctaUrl}" style="display:inline-block;background:#09090b;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:10px;min-width:260px;text-align:center;border:1px solid #fff;">Probar LegalUp AI gratis →</a><!--<![endif]-->
            </td></tr>
          </table>
          <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#71717a;margin:10px 0 0;">5 días gratis · luego $49.900 CLP/mes · Sin permanencia</p>
        </td></tr>
        <!-- Cierre -->
        <tr><td style="padding:18px 4px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111113;border:1px solid #27272a;border-radius:12px;">
            <tr><td style="padding:18px 22px;">
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.65;color:#a1a1aa;margin:0;">Ya estás registrado en LegalUp. Ahora puedes probar una nueva herramienta dentro de tu ecosistema. Nos vemos en tu workspace,</p>
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#ffffff;margin:6px 0 0;">— Equipo LegalUp</p>
            </td></tr>
          </table>
        </td></tr>
        <!-- Footer discreto -->
        <tr><td style="padding:16px 4px 8px;">
          <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#52525b;margin:0;text-align:center;">© 2026 LegalUp — Asesoría legal online en Chile.<br>Este correo fue enviado porque tienes una cuenta registrada en LegalUp. Si ya probaste LegalUp AI, puedes ignorar este mensaje.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---- CREATE SUBSCRIPTION (Mercado Pago Preapproval) ----
app.post('/api/empresas/subscription/create', companyAuthorization.forRoute('POST /api/empresas/subscription/create'), async (req, res) => {
  try {
    const { planId } = req.body;
    const { companyId } = req.companyAuthorization;

    if (!companyId || !planId) {
      return res.status(400).json({ error: 'companyId and planId are required' });
    }

    // Get company and plan
    const { data: company, error: compErr } = await supabase
      .from('companies')
      .select('id, name, contact_email, contact_name, user_id')
      .eq('id', companyId)
      .maybeSingle();

    if (compErr) {
      console.error('[Empresas] Company query error:', compErr);
      return res.status(500).json({ error: 'Error al buscar empresa' });
    }

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const { data: plan, error: planErr } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    if (planErr) {
      console.error('[Empresas] Plan query error:', planErr);
      return res.status(500).json({ error: 'Error al buscar plan: ' + planErr.message });
    }

    if (!plan) {
      return res.status(404).json({ error: `Plan not found: ${planId}` });
    }

    // Check if company already has an active subscription
    const { data: existingSub } = await supabase
      .from('company_subscriptions')
      .select('id, mercadopago_preapproval_id, status')
      .eq('company_id', companyId)
      .in('status', ['active', 'pending'])
      .maybeSingle();

    if (existingSub) {
      return res.status(409).json({ error: 'La empresa ya tiene una suscripción activa o pendiente' });
    }

    // Get user email for the preapproval
    const { data: userData } = await supabase.auth.admin.getUserById(company.user_id);
    const userEmail = userData?.user?.email || company.contact_email;

    // Create MercadoPago preapproval (subscription)
    const preapprovalData = {
      reason: `LegalUp ${plan.name} - ${company.name}`,
      external_reference: companyId,
      payer_email: userEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: plan.price_clp,
        currency_id: 'CLP',
        start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      back_url: (() => {
        const base = appUrl || 'https://legalup.cl';
        if (base.includes('localhost')) return 'https://legalup.cl';
        return `${base}/empresa/facturacion?subscription_success=true`;
      })(),
      status: 'pending',
    };

    const webhookUrl = resolveWebhookUrl(req);
    if (webhookUrl) {
      preapprovalData.notification_url = webhookUrl;
    }

    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mercadopagoAccessToken}`,
      },
      body: JSON.stringify(preapprovalData),
    });

    const mpResult = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('[Empresas] MP preapproval error:', mpResult);
      return res.status(500).json({ error: 'Error al crear suscripción en Mercado Pago', details: mpResult });
    }

    // Create subscription record in DB
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { data: subscription, error: subError } = await supabase
      .from('company_subscriptions')
      .insert({
        company_id: companyId,
        plan_id: planId,
        status: 'pending',
        mercadopago_preapproval_id: mpResult.id,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
      .select()
      .single();

    if (subError) {
      console.error('[Empresas] Error saving subscription:', subError);
      return res.status(500).json({ error: 'Error al guardar suscripción' });
    }

    // Track event
    await supabase.from('subscription_payment_events').insert({
      subscription_id: subscription.id,
      event_type: 'preapproval_created',
      mercadopago_event_id: mpResult.id,
      amount: plan.price_clp,
      status: 'pending',
      metadata: { mp_response: mpResult },
    });

    res.json({
      success: true,
      subscription_id: subscription.id,
      preferenceId: mpResult.id,
      initPoint: mpResult.init_point || mpResult.sandbox_init_point,
    });
  } catch (error) {
    console.error('[Empresas] Error creating subscription:', error);
    res.status(500).json({ error: 'Error interno al crear suscripción' });
  }
});

// ---- CANCEL SUBSCRIPTION ----
app.post('/api/empresas/subscription/:subscriptionId/cancel', companyAuthorization.forRoute('POST /api/empresas/subscription/:subscriptionId/cancel'), async (req, res) => {
  try {
    const subscriptionId = req.companyAuthorization.resource.id;
    const { companyId } = req.companyAuthorization;

    const { data: subscription, error: subscriptionError } = await supabase
      .from('company_subscriptions')
      .select('*, company:company_id(*), plan:plan_id(*)')
      .eq('id', subscriptionId)
      .maybeSingle();

    if (subscriptionError) return res.status(503).json({ error: 'No se pudo leer la suscripción.' });
    if (!subscription) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }

    if (subscription.status === 'cancelled') {
      return res.json({ success: true, already_cancelled: true });
    }
    if (!subscription.mercadopago_preapproval_id) {
      return res.status(409).json({ error: 'Falta la referencia del proveedor; se requiere conciliación.', code: 'RECONCILIATION_REQUIRED' });
    }

    const cancellation = await confirmCompanyCancellation({
      preapprovalId: subscription.mercadopago_preapproval_id,
      accessToken: mercadopagoAccessToken,
      fetchImpl: fetch,
    });
    if (!cancellation.confirmed) {
      return res.status(502).json({
        error: 'No se pudo confirmar la cancelación con el proveedor. Intenta nuevamente.',
        code: cancellation.networkError ? 'PROVIDER_UNREACHABLE' : 'PROVIDER_ERROR',
      });
    }

    // Both local records commit together, or neither changes. RPC is service-role only.
    let persistenceError;
    try {
      ({ error: persistenceError } = await supabase.rpc('cancel_company_subscription_confirmed', {
        p_subscription_id: subscriptionId,
        p_company_id: companyId,
        p_preapproval_id: String(subscription.mercadopago_preapproval_id),
      }));
    } catch (error) {
      persistenceError = error;
    }
    if (persistenceError) {
      console.error('[Empresas] Provider cancelled; local reconciliation required:', persistenceError);
      return res.status(503).json({
        error: 'El proveedor confirmó la baja, pero no se pudo guardar localmente. Reintenta para conciliar.',
        code: 'RECONCILIATION_REQUIRED', provider_cancelled: true,
      });
    }

    // Send cancellation email
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end).toLocaleDateString('es-CL')
      : 'próximamente';

    await sendSubscriptionEmail(
      subscription.company.contact_email,
      'Tu suscripción LegalUp ha sido cancelada',
      subscriptionEmailTemplates.cancelled(
        subscription.company.name,
        subscription.plan?.name || 'LegalUp',
        periodEnd
      )
    );

    // Track event
    await supabase.from('subscription_payment_events').insert({
      subscription_id: subscriptionId,
      event_type: 'cancelled',
      status: 'cancelled',
      metadata: { cancelled_at: new Date().toISOString() },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Empresas] Error cancelling subscription:', error);
    res.status(500).json({ error: 'Error interno al cancelar suscripción' });
  }
});

// ---- CREATE COMPANY REQUEST ----
app.post('/api/empresas/requests', companyAuthorization.forRoute('POST /api/empresas/requests'), async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const { companyId, userId } = req.companyAuthorization;

    if (!companyId || !userId || !description || !category) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // Get plan SLA for deadline calculation
    const { data: sub } = await supabase
      .from('company_subscriptions')
      .select('plan:plan_id(sla_hours)')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .maybeSingle();

    const slaHours = sub?.plan?.sla_hours || 48;
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('company_requests')
      .insert({
        company_id: companyId,
        user_id: userId,
        title: title || `Solicitud ${category}`,
        description,
        category,
        status: 'nueva',
        priority: req.body.priority || 'normal',
        sla_deadline: slaDeadline,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('company_activity_log').insert({
      company_id: companyId,
      user_id: userId,
      action: 'request_created',
      entity_type: 'request',
      entity_id: data.id,
      metadata: { category },
    });

    // Check plan usage and auto-generate budget if out of plan
    try {
      const { data: usage } = await supabase
        .from('company_usage')
        .select('consultations_used, consultations_limit')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const isOutOfPlan = usage && usage.consultations_used >= usage.consultations_limit;

      if (isOutOfPlan) {
        await supabase.from('company_requests').update({ is_out_of_plan: true }).eq('id', data.id);
        data.is_out_of_plan = true;

        // Auto-generate budget from legal services catalog
        const { data: services } = await supabase
          .from('legal_services')
          .select('*')
          .eq('category_slug', category)
          .eq('is_active', true);

        if (services && services.length > 0) {
          const items = services.slice(0, 2).map(s => ({
            legal_service_id: s.id,
            description: s.service_name,
            quantity: 1,
            unit_price_clp: s.starting_price_clp || 0,
            total_clp: s.starting_price_clp || 0,
          }));
          const total = items.reduce((s, i) => s + i.total_clp, 0);

          const { data: budget } = await supabase
            .from('company_budgets')
            .insert({
              company_id: companyId,
              request_id: data.id,
              title: `Presupuesto: ${title || category}`,
              description: `Servicio fuera del plan mensual. Presupuesto generado automáticamente.`,
              subtotal_clp: total,
              total_clp: total,
              created_by: 'auto',
            })
            .select()
            .single();

          await supabase.from('company_budget_items').insert(
            items.map(i => ({ ...i, budget_id: budget.id }))
          );
        }
      }
    } catch (budgetErr) {
      console.error('[Budgets] Auto-generate error (non-blocking):', budgetErr);
    }

    // Auto-assign lawyer using scoring algorithm
    const lawyerId = await autoAssignLawyer(supabase, { companyId, userId, category, priority: req.body.priority || 'normal' });

    if (lawyerId) {
      await supabase
        .from('company_requests')
        .update({ lawyer_id: lawyerId, status: 'asignada', assigned_at: new Date().toISOString() })
        .eq('id', data.id);

      await supabase.from('company_activity_log').insert({
        company_id: companyId,
        user_id: userId,
        action: 'request_assigned',
        entity_type: 'request',
        entity_id: data.id,
        metadata: { lawyer_id: lawyerId, method: 'auto' },
      });

      // Notify the lawyer
      await notificationsService.notifyUser({
        userId: lawyerId,
        type: 'case_assigned',
        title: 'Nuevo caso asignado',
        message: `Se te ha asignado un caso de ${category}`,
        entityType: 'request',
        entityId: data.id,
        metadata: { company_name: title || `Solicitud ${category}` },
      });

      // Notify the company
      await notificationsService.notifyUser({
        userId,
        type: 'case_assigned',
        title: 'Solicitud asignada',
        message: `Tu solicitud de ${category} ha sido asignada a un abogado.`,
        entityType: 'request',
        entityId: data.id,
      });

      data.lawyer_id = lawyerId;
      data.status = 'asignada';
    }

    res.json({ request: data });
  } catch (error) {
    console.error('[Empresas] Error creating request:', error);
    res.status(500).json({ error: 'Error al crear la solicitud' });
  }
});

// ---- UPLOAD REQUEST DOCUMENT ----
app.post('/api/empresas/requests/:requestId/documents', companyAuthorization.forRoute('POST /api/empresas/requests/:requestId/documents'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { fileName, fileUrl, fileType, fileSize } = req.body;
    const { companyId, userId: uploadedBy } = req.companyAuthorization;

    if (!requestId || !companyId || !fileName || !fileUrl || !uploadedBy) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const { data, error } = await supabase
      .from('company_request_documents')
      .insert({
        request_id: requestId,
        company_id: companyId,
        file_name: fileName,
        file_url: fileUrl,
        file_type: fileType || null,
        file_size: fileSize || null,
        uploaded_by: uploadedBy,
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ document: data });
  } catch (error) {
    console.error('[Empresas] Error uploading document:', error);
    res.status(500).json({ error: 'Error al subir documento' });
  }
});

// ---- GET SUBSCRIPTION STATUS ----
app.get('/api/empresas/subscription/:companyId', companyAuthorization.forRoute('GET /api/empresas/subscription/:companyId'), async (req, res) => {
  try {
    const { companyId } = req.companyAuthorization;

    const { data: subscription, error } = await supabase
      .from('company_subscriptions')
      .select('*, plan:plan_id(*)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return res.status(503).json({ error: 'No se pudo leer la suscripción.' });
    res.json({ subscription });
  } catch (error) {
    console.error('[Empresas] Error fetching subscription:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ---- HANDLE PREAPPROVAL WEBHOOK EVENTS ----
// LegalUp AI: procesa eventos de preapproval (susscripción) para abogados.
const handleAIPreapprovalWebhook = async (preapproval) => {
  const preapprovalId = String(preapproval.id);
  const lawyerId = String(preapproval.external_reference || '').replace(AI_EXTERNAL_REF_PREFIX, '');
  if (!lawyerId) return;

  const { data: subscription } = await supabase
    .from('ai_subscriptions')
    .select('*')
    .eq('lawyer_id', lawyerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!subscription) {
    console.error('[LegalUpAI] No AI subscription for lawyer:', lawyerId);
    return;
  }

  const mpStatus = preapproval.status;
  const providerEventAt = preapproval.last_modified || preapproval.date_created || new Date().toISOString();
  const providerEventId = `${preapprovalId}:${mpStatus}:${providerEventAt}`;
  const { tryInsertSubscriptionEvent, derivePeriodFromProvider, shouldApplyEvent, markSubscriptionEventProcessed, markSubscriptionEventFailed } = await import('./server/subscriptions/subscriptionEvents.mjs');
  const eventRes = await tryInsertSubscriptionEvent(supabase, {
    productType: 'ai',
    subscriptionId: subscription.id,
    providerEventId,
    providerEventAt,
    eventType: `preapproval_${mpStatus}`,
    providerStatus: mpStatus,
  });
  if (!eventRes.inserted && eventRes.status === 'processed') {
    console.log('[LegalUpAI] duplicate event skipped', providerEventId);
    return;
  }
  if (!eventRes.inserted && !eventRes.retryable) {
    console.log('[LegalUpAI] duplicate non-retryable event skipped', providerEventId);
    return;
  }
  if (!(await shouldApplyEvent(supabase, { productType: 'ai', subscriptionId: subscription.id, providerEventAt }))) {
    console.log('[LegalUpAI] out-of-order event ignored', providerEventId);
    await markSubscriptionEventProcessed(supabase, { productType: 'ai', providerEventId });
    return;
  }
  // Cancellation dominates: if subscription already cancelled with newer cancelled_at, don't reactivate
  if (subscription.status === 'cancelled' && subscription.cancelled_at) {
    const cancelledAt = new Date(subscription.cancelled_at).getTime();
    const eventAt = new Date(providerEventAt).getTime();
    if (!isNaN(cancelledAt) && !isNaN(eventAt) && eventAt <= cancelledAt) {
      console.log('[LegalUpAI] old authorized event after cancellation ignored', providerEventId);
      return;
    }
  }
  const now = new Date();

  switch (mpStatus) {
    case 'authorized':
    case 'active': {
      const derived = derivePeriodFromProvider(preapproval);
      if (!derived) {
        console.error('[LegalUpAI] cannot derive period, no entitlement', providerEventId);
        return;
      }
      const periodEnd = derived.end;
      // Primera activación: el abogado venía de trial/pending y aún no había
      // sido activado (sin current_period_start). Solo ahí se reporta "started".
      const wasTrialing =
        (subscription.status === 'trialing' || subscription.status === 'pending') &&
        !subscription.current_period_start;

      try {
        const { error: updateError } = await supabase
          .from('ai_subscriptions')
          .update({
            status: 'active',
            provider: 'mercadopago',
            provider_subscription_id: preapprovalId,
            current_period_start: derived.start.toISOString(),
            current_period_end: derived.end.toISOString(),
            cancel_at_period_end: false,
            cancelled_at: null,
            updated_at: now.toISOString(),
          })
          .eq('id', subscription.id);
        if (updateError) throw updateError;
        await markSubscriptionEventProcessed(supabase, { productType: 'ai', providerEventId });
      } catch (e) {
        await markSubscriptionEventFailed(supabase, { productType: 'ai', providerEventId });
        throw e;
      }

      await capturePostHog(wasTrialing ? 'ai_subscription_started' : 'ai_subscription_renewed', lawyerId, {
        price_clp: AI_SUBSCRIPTION_PRICE_CLP,
        preapproval_id: preapprovalId,
      });

      const userData = await getAILawyerEmail(lawyerId);
      if (userData?.email) {
        await sendAIEmail(
          userData.email,
          wasTrialing ? '¡Bienvenido a LegalUp AI!' : 'Tu suscripción de LegalUp AI se renovó',
          wasTrialing
            ? aiSubscriptionEmailTemplates.welcome()
            : aiSubscriptionEmailTemplates.renewal(periodEnd.toLocaleDateString('es-CL'))
        );
      }
      break;
    }
    case 'cancelled': {
      await supabase
        .from('ai_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: now.toISOString(),
          cancel_at_period_end: true,
          updated_at: now.toISOString(),
        })
        .eq('id', subscription.id);

      await capturePostHog('ai_subscription_cancelled', lawyerId, { preapproval_id: preapprovalId });
      break;
    }
    case 'paused': {
      await supabase
        .from('ai_subscriptions')
        .update({ status: 'past_due', updated_at: now.toISOString() })
        .eq('id', subscription.id);

      await capturePostHog('ai_subscription_past_due', lawyerId, { preapproval_id: preapprovalId });
      break;
    }
    default:
      console.log('[LegalUpAI] Unhandled AI preapproval status:', mpStatus);
  }
};

// LegalUp AI: procesa cobros autorizados (primera activación / renovaciones / pagos fallidos).
const handleAIAuthorizedPayment = async (payment, subscription) => {
  const providerEventId = String(payment.id);
  const providerEventAt = payment.date_created || payment.date_approved || new Date().toISOString();
  const { tryInsertSubscriptionEvent, shouldApplyEvent, markSubscriptionEventProcessed, markSubscriptionEventFailed } = await import('./server/subscriptions/subscriptionEvents.mjs');
  const ev = await tryInsertSubscriptionEvent(supabase, { productType: 'ai', subscriptionId: subscription.id, providerEventId, providerEventAt, eventType: 'payment_approved', providerStatus: payment.status });
  if (!ev.inserted) {
    if (ev.status === 'processed') return;
    if (!ev.retryable) return;
  }
  if (!(await shouldApplyEvent(supabase, { productType: 'ai', subscriptionId: subscription.id, providerEventAt }))) {
    await markSubscriptionEventProcessed(supabase, { productType: 'ai', providerEventId });
    return;
  }
  if (subscription.status === 'cancelled' && subscription.cancelled_at) {
    const cancelledAt = new Date(subscription.cancelled_at).getTime();
    const eventAt = new Date(providerEventAt).getTime();
    if (!isNaN(cancelledAt) && !isNaN(eventAt) && eventAt <= cancelledAt) {
      await markSubscriptionEventProcessed(supabase, { productType: 'ai', providerEventId });
      return;
    }
  }
  const now = new Date();
  const paymentDate = new Date(providerEventAt);
  const periodStart = !isNaN(paymentDate.getTime()) ? paymentDate : now;

  if (payment.status === 'approved') {
    const periodEnd = new Date(periodStart.getTime() + AI_MONTH_MS);

    const isFirstActivation =
      (subscription.status === 'trialing' || subscription.status === 'pending') &&
      !subscription.current_period_start;

    try {
      const { error: updateError } = await supabase
        .from('ai_subscriptions')
        .update({
          status: 'active',
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          cancelled_at: null,
          updated_at: now.toISOString(),
        })
        .eq('id', subscription.id);
      if (updateError) throw updateError;
      await markSubscriptionEventProcessed(supabase, { productType: 'ai', providerEventId });
    } catch (e) {
      await markSubscriptionEventFailed(supabase, { productType: 'ai', providerEventId });
      throw e;
    }

    await capturePostHog(
      isFirstActivation ? 'ai_subscription_started' : 'ai_subscription_renewed',
      subscription.lawyer_id,
      {
        price_clp: payment.transaction_amount || AI_SUBSCRIPTION_PRICE_CLP,
        payment_id: String(payment.id),
      }
    );

    await capturePostHog('ai_subscription_paid', subscription.lawyer_id, {
      price_clp: payment.transaction_amount || AI_SUBSCRIPTION_PRICE_CLP,
      currency: 'CLP',
      payment_id: String(payment.id),
      preapproval_id: subscription.provider_subscription_id || null,
    });

    const userData = await getAILawyerEmail(subscription.lawyer_id);
    if (userData?.email) {
      await sendAIEmail(
        userData.email,
        isFirstActivation ? '¡Bienvenido a LegalUp AI!' : 'Tu suscripción de LegalUp AI se renovó',
        isFirstActivation
          ? aiSubscriptionEmailTemplates.welcome()
          : aiSubscriptionEmailTemplates.renewal(periodEnd.toLocaleDateString('es-CL'))
      );
    }
  } else if (payment.status === 'rejected' || payment.status === 'refused') {
    await supabase
      .from('ai_subscriptions')
      .update({ status: 'past_due', updated_at: now.toISOString() })
      .eq('id', subscription.id);

    await capturePostHog('ai_subscription_payment_failed', subscription.lawyer_id, {
      payment_id: String(payment.id),
    });

    const userData = await getAILawyerEmail(subscription.lawyer_id);
    if (userData?.email) {
      await sendAIEmail(
        userData.email,
        'No pudimos procesar el pago de LegalUp AI',
        aiSubscriptionEmailTemplates.payment_failed()
      );
    }
  }
};

const handleProPreapprovalWebhook = async (preapproval) => {
  const mpStatus = preapproval.status;
  const preapprovalId = preapproval.id;
  const externalRef = preapproval.external_reference || '';
  // 4.57D: intended plan comes from trusted server-created metadata
  // (external_reference prefix), never from client redirect query.
  const isPlusRef = String(externalRef).startsWith(PLUS_EXTERNAL_REF_PREFIX);
  const lawyerId = String(externalRef)
    .replace(PLUS_EXTERNAL_REF_PREFIX, '')
    .replace(PRO_EXTERNAL_REF_PREFIX, '');
  if (!lawyerId) return;
  let { data: subscription } = await supabase.from('lawyer_subscriptions').select('*').eq('lawyer_id', lawyerId).maybeSingle();
  if (!subscription) return;
  // Reconcile scheduled downgrades + stale old-Pro cancellations on every
  // Pro-family webhook event (no cron dependency).
  subscription = await maybeApplyScheduledDowngrade(subscription) ?? subscription;
  subscription = await retryOldProCancel(subscription) ?? subscription;
  if (isPlusRef) {
    await handlePlusPreapprovalWebhook(subscription, preapproval, { mpStatus, preapprovalId });
    return;
  }
  const providerEventAt = preapproval.last_modified || preapproval.date_created || new Date().toISOString();
  const providerEventId = `${preapprovalId}:${mpStatus}:${providerEventAt}`;
  const { tryInsertSubscriptionEvent, derivePeriodFromProvider, shouldApplyEvent } = await import('./server/subscriptions/subscriptionEvents.mjs');
  const ev = await tryInsertSubscriptionEvent(supabase, { productType: 'pro', subscriptionId: subscription.id, providerEventId, providerEventAt, eventType: `preapproval_${mpStatus}`, providerStatus: mpStatus });
  if (!ev.inserted) return;
  if (!(await shouldApplyEvent(supabase, { productType: 'pro', subscriptionId: subscription.id, providerEventAt }))) return;
  if (subscription.status === 'cancelled' && subscription.cancelled_at) {
    const cancelledAt = new Date(subscription.cancelled_at).getTime();
    const eventAt = new Date(providerEventAt).getTime();
    if (!isNaN(cancelledAt) && !isNaN(eventAt) && eventAt <= cancelledAt) return;
  }
  const now = new Date();
  if (mpStatus === 'authorized' || mpStatus === 'active') {
    const derived = derivePeriodFromProvider(preapproval);
    if (!derived) return;
    const periodEnd = derived.end;
    await supabase.from('lawyer_subscriptions').update({ status: 'active', current_period_start: derived.start.toISOString(), current_period_end: periodEnd.toISOString(), cancel_at_period_end: false, cancelled_at: null, updated_at: now.toISOString() }).eq('id', subscription.id);
    await capturePostHog('pro_subscription_activated', lawyerId, { price_clp: PRO_SUBSCRIPTION_PRICE_CLP });
    const userData = await getProLawyerEmail(lawyerId);
    if (userData?.email) {
      try { await sendAIEmail(userData.email, '¡Bienvenido a LegalUp Pro!', '<p>Tu suscripción Pro está activa.</p>'); } catch {}
    }
  } else if (mpStatus === 'cancelled') {
    await supabase.from('lawyer_subscriptions').update({ status: 'cancelled', cancelled_at: now.toISOString(), cancel_at_period_end: true, updated_at: now.toISOString() }).eq('id', subscription.id);
  } else if (mpStatus === 'paused') {
    await supabase.from('lawyer_subscriptions').update({ status: 'past_due', updated_at: now.toISOString() }).eq('id', subscription.id);
  }
};

// 4.57D: Plus preapproval settlement. Shares the Pro-family event dedup
// (tryInsertSubscriptionEvent + shouldApplyEvent) so retries never double
// grant. Plus NEVER touches Founder state (no claim, no reservation, no
// intro transition) and activates ONLY via completePlusUpgrade.
const handlePlusPreapprovalWebhook = async (subscription, preapproval, { mpStatus, preapprovalId }) => {
  const lawyerId = subscription.lawyer_id;
  const providerEventAt = preapproval.last_modified || preapproval.date_created || new Date().toISOString();
  const providerEventId = `${preapprovalId}:${mpStatus}:${providerEventAt}`;
  const { tryInsertSubscriptionEvent, shouldApplyEvent } = await import('./server/subscriptions/subscriptionEvents.mjs');
  const ev = await tryInsertSubscriptionEvent(supabase, { productType: 'pro', subscriptionId: subscription.id, providerEventId, providerEventAt, eventType: `plus_preapproval_${mpStatus}`, providerStatus: mpStatus });
  if (!ev.inserted) return;
  if (!(await shouldApplyEvent(supabase, { productType: 'pro', subscriptionId: subscription.id, providerEventAt }))) return;
  const now = new Date();
  if (mpStatus === 'authorized' || mpStatus === 'active') {
    const pendingId = subscription.pending_provider_subscription_id;
    const isExpected = pendingId ? String(pendingId) === String(preapprovalId) : subscription.plan === 'plus' && String(subscription.provider_subscription_id) === String(preapprovalId);
    if (!isExpected && subscription.plan_change_status !== 'upgrade_pending') return;
    const completed = await completePlusUpgrade(subscription, preapproval);
    if (!completed.ok) {
      try { await capturePostHog('plus_upgrade_failed', lawyerId, { reason: completed.reason }); } catch {}
    }
  } else if (['cancelled', 'rejected', 'expired'].includes(mpStatus)) {
    // Failed/abandoned upgrade: clear transition state, Pro stays intact.
    if (subscription.plan_change_status === 'upgrade_pending' && String(subscription.pending_provider_subscription_id || '') === String(preapprovalId)) {
      await supabase.from('lawyer_subscriptions').update({ pending_plan: null, plan_change_status: null, plan_change_effective_at: null, pending_provider_subscription_id: null, pending_init_point: null, previous_provider_subscription_id: null, updated_at: now.toISOString() }).eq('id', subscription.id);
      try { await capturePostHog('plus_upgrade_failed', lawyerId, { reason: `provider_${mpStatus}` }); } catch {}
    } else if (subscription.plan === 'plus' && String(subscription.provider_subscription_id || '') === String(preapprovalId)) {
      await supabase.from('lawyer_subscriptions').update({ status: 'cancelled', cancelled_at: now.toISOString(), cancel_at_period_end: true, updated_at: now.toISOString() }).eq('id', subscription.id);
    }
  } else if (mpStatus === 'paused') {
    if (subscription.plan === 'plus') {
      await supabase.from('lawyer_subscriptions').update({ status: 'past_due', updated_at: now.toISOString() }).eq('id', subscription.id);
    }
  }
};

const handleProAuthorizedPayment = async (payment) => {
  const preapprovalId = payment.preapproval_id;
  if (!preapprovalId) return;
  let { data: subscription } = await supabase.from('lawyer_subscriptions').select('*').eq('provider_subscription_id', String(preapprovalId)).maybeSingle();
  if (!subscription) {
    // 4.57D: in-flight Plus upgrade — the Plus preapproval lives in the
    // pending column until confirmation flips it to canonical.
    const pending = await supabase.from('lawyer_subscriptions').select('*').eq('pending_provider_subscription_id', String(preapprovalId)).maybeSingle();
    subscription = pending.data ?? null;
  }
  if (!subscription) return;
  subscription = await maybeApplyScheduledDowngrade(subscription) ?? subscription;
  subscription = await retryOldProCancel(subscription) ?? subscription;
  // Effective Plus: steady plus row, or an upgrade whose Plus preapproval
  // just paid. Everything Founder-related is skipped for Plus (§20).
  const isPlusEffective = subscription.plan === 'plus'
    || (subscription.plan_change_status === 'upgrade_pending' && String(subscription.pending_provider_subscription_id || '') === String(preapprovalId));
  const providerEventId = String(payment.id);
  const providerEventAt = payment.date_created || payment.date_approved || new Date().toISOString();
  const { tryInsertSubscriptionEvent, shouldApplyEvent, markSubscriptionEventProcessed, markSubscriptionEventFailed } = await import('./server/subscriptions/subscriptionEvents.mjs');
  const ev = await tryInsertSubscriptionEvent(supabase, { productType: 'pro', subscriptionId: subscription.id, providerEventId, providerEventAt, eventType: 'payment_approved', providerStatus: payment.status });
  if (!ev.inserted) {
    if (ev.status === 'processed') return;
    if (!ev.retryable) return;
  }
  if (!(await shouldApplyEvent(supabase, { productType: 'pro', subscriptionId: subscription.id, providerEventAt }))) {
    await markSubscriptionEventProcessed(supabase, { productType: 'pro', providerEventId });
    return;
  }
  if (subscription.status === 'cancelled' && subscription.cancelled_at) {
    const cancelledAt = new Date(subscription.cancelled_at).getTime();
    const eventAt = new Date(providerEventAt).getTime();
    if (!isNaN(cancelledAt) && !isNaN(eventAt) && eventAt <= cancelledAt) {
      await markSubscriptionEventProcessed(supabase, { productType: 'pro', providerEventId });
      return;
    }
  }
  // Ledger for intro → standard (4.28B.2) — dedup via provider_authorized_payment_id UNIQUE, lifetime per lawyer
  // 4.57D: plan marker (NULL = historical Pro). Plus payments never feed
  // Founder logic: reconcile + intro-count filter on plan.
  try {
    const { error: ledgerErr } = await supabase.from('pro_subscription_payments').insert({
      lawyer_subscription_id: subscription.id,
      lawyer_id: subscription.lawyer_id,
      provider_authorized_payment_id: providerEventId,
      provider_payment_id: String(payment.payment_id || payment.id || ''),
      amount_clp: Number(payment.transaction_amount || 0) || 0,
      currency: 'CLP',
      status: String(payment.status || ''),
      paid_at: providerEventAt,
      plan: isPlusEffective ? 'plus' : 'pro',
    });
    if (ledgerErr && String(ledgerErr.code) === '23505') {
      await supabase.from('pro_subscription_payments').update({
        provider_payment_id: String(payment.payment_id || payment.id || ''),
        amount_clp: Number(payment.transaction_amount || 0) || 0,
        status: String(payment.status || ''),
        paid_at: providerEventAt,
      }).eq('provider_authorized_payment_id', providerEventId);
    }
  } catch {}

  if (payment.status === 'approved') {
    // 4.57D: an approved payment on the pending Plus preapproval confirms
    // the upgrade even before the preapproval webhook arrives (same
    // fail-closed completer; event dedup above keeps it single).
    if (subscription.plan_change_status === 'upgrade_pending'
      && String(subscription.pending_provider_subscription_id || '') === String(preapprovalId)) {
      const completed = await completePlusUpgrade(subscription, {
        id: String(preapprovalId),
        transaction_amount: Number(payment.transaction_amount || 0) || 0,
        date_created: providerEventAt,
      });
      if (!completed.ok) {
        try { await capturePostHog('plus_upgrade_failed', subscription.lawyer_id, { reason: completed.reason }); } catch {}
      }
      await markSubscriptionEventProcessed(supabase, { productType: 'pro', providerEventId });
      return;
    }
    // Lifetime intro count (approved PRO-plan payments only) per lawyer — determines transition and future checkout price
    try {
      const { count: lifetimeApproved } = await supabase.from('pro_subscription_payments').select('id', { count: 'exact', head: true }).eq('lawyer_id', subscription.lawyer_id).eq('status', 'approved').or('plan.is.null,plan.eq.pro');
      if ((lifetimeApproved ?? 0) >= PRO_INTRO_SUCCESSFUL_PAYMENTS && !isPlusEffective) {
        // One-way transition 19990 → 49990, provider-first
        await ensureProStandardPrice({ ...subscription, amount_clp: subscription.amount_clp });
      }
    } catch {}
    // 4.32B.3 Founder: first 15 DISTINCT paying lawyers. Non-blocking —
    // payment truth is durable in the ledger; reconcile_pro_founders() repairs.
    // 4.32B.4: consume the checkout reservation after claiming (reservation
    // protected the 19.990 promise during checkout; the badge is now permanent).
    // 4.57D: Plus payments NEVER claim (slot safety) — skip by effective plan.
    try {
      const { shouldAttemptFounderClaim } = await import('./server/proFounder.mjs');
      if (!isPlusEffective && shouldAttemptFounderClaim(payment.status)) {
        await supabase.rpc('claim_pro_founder_slot', { p_lawyer_id: subscription.lawyer_id });
        try {
          await supabase.from('pro_founder_reservations').delete().eq('lawyer_id', subscription.lawyer_id);
        } catch {}
      }
    } catch (e) {
      console.error('[LegalUpPro] founder claim failed (reconciliable via reconcile_pro_founders)', e?.message || e);
    }
    const now = new Date();
    const paymentDate = new Date(providerEventAt);
    const periodStart = !isNaN(paymentDate.getTime()) ? paymentDate : now;
    const periodEnd = new Date(periodStart.getTime() + PRO_MONTH_MS);
    try {
      const { error: updateError } = await supabase.from('lawyer_subscriptions').update({ status: 'active', current_period_start: periodStart.toISOString(), current_period_end: periodEnd.toISOString(), cancel_at_period_end: false, cancelled_at: null, updated_at: now.toISOString() }).eq('id', subscription.id);
      if (updateError) throw updateError;
      await markSubscriptionEventProcessed(supabase, { productType: 'pro', providerEventId });
    } catch (e) {
      await markSubscriptionEventFailed(supabase, { productType: 'pro', providerEventId });
      throw e;
    }
    await capturePostHog('pro_subscription_activated', subscription.lawyer_id, { price_clp: subscription.amount_clp ?? PRO_INTRO_PRICE_CLP });
  } else if (payment.status === 'rejected' || payment.status === 'refused') {
    await supabase.from('lawyer_subscriptions').update({ status: 'past_due', updated_at: new Date().toISOString() }).eq('id', subscription.id);
    await capturePostHog('pro_subscription_payment_failed', subscription.lawyer_id, { payment_id: String(payment.id) });
  }
};

const handlePreapprovalWebhook = async (preapprovalId) => {
  console.log('[Empresas] Handling preapproval event:', preapprovalId);

  if (!preapprovalId) return;

  // Fetch preapproval details from MP
  const mpResponse = await fetch(
    `https://api.mercadopago.com/preapproval/${preapprovalId}`,
    {
      headers: {
        Authorization: `Bearer ${mercadopagoAccessToken}`,
      },
    }
  );

  if (!mpResponse.ok) {
    console.error('[Empresas] Failed to fetch preapproval:', preapprovalId);
    return;
  }

  const preapproval = await mpResponse.json();
  const externalRef = preapproval.external_reference;

  // LegalUp AI: las suscripciones AI usan external_reference `AI_<lawyerId>`.
  if (externalRef && String(externalRef).startsWith(AI_EXTERNAL_REF_PREFIX)) {
    await handleAIPreapprovalWebhook(preapproval);
    return;
  }

  // LegalUp Pro: Founder 15
  if (externalRef && String(externalRef).startsWith(PRO_EXTERNAL_REF_PREFIX)) {
    await handleProPreapprovalWebhook(preapproval);
    return;
  }

  const companyId = externalRef;
  const mpStatus = preapproval.status;

  if (!companyId) {
    console.error('[Empresas] No external_reference in preapproval');
    return;
  }

  // Find subscription
  const { data: subscription } = await supabase
    .from('company_subscriptions')
    .select('*')
    .eq('mercadopago_preapproval_id', preapprovalId)
    .maybeSingle();

  if (!subscription) {
    console.error('[Empresas] No subscription found for preapproval:', preapprovalId);
    return;
  }

  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', subscription.plan_id)
    .maybeSingle();

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .maybeSingle();

  if (!company || !plan) {
    console.error('[Empresas] Company or plan not found');
    return;
  }

  // Track event
  await supabase.from('subscription_payment_events').insert({
    subscription_id: subscription.id,
    event_type: `preapproval_${mpStatus}`,
    mercadopago_event_id: preapprovalId,
    amount: plan.price_clp,
    status: mpStatus,
    metadata: { preapproval },
  });

  switch (mpStatus) {
    case 'authorized':
    case 'active': {
      // Activate subscription
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await supabase
        .from('company_subscriptions')
        .update({
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', subscription.id);

      await supabase
        .from('companies')
        .update({ status: 'active', updated_at: now.toISOString() })
        .eq('id', companyId);

      // Reset usage
      await supabase
        .from('company_usage')
        .insert({
          company_id: companyId,
          subscription_id: subscription.id,
          period_start: now.toISOString(),
          period_end: periodEnd.toISOString(),
          consultations_limit: plan.consultations_limit,
          reviews_limit: plan.reviews_limit,
          consultations_used: 0,
          reviews_used: 0,
        });

      // Send welcome email (only first time) or renewal email
      const wasPending = subscription.status === 'pending';
      if (wasPending) {
        await sendSubscriptionEmail(
          company.contact_email,
          '¡Bienvenido a LegalUp Empresas!',
          subscriptionEmailTemplates.welcome(company.name, plan.name)
        );
      } else {
        await sendSubscriptionEmail(
          company.contact_email,
          'Tu suscripción LegalUp se ha renovado',
          subscriptionEmailTemplates.renewal(
            company.name,
            plan.name,
            periodEnd.toLocaleDateString('es-CL')
          )
        );
      }
      break;
    }

    case 'cancelled': {
      await supabase
        .from('company_subscriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', subscription.id);

      await supabase
        .from('companies')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', companyId);
      break;
    }

    case 'paused': {
      await supabase
        .from('company_subscriptions')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('id', subscription.id);

      await supabase
        .from('companies')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('id', companyId);
      break;
    }

    default:
      console.log('[Empresas] Unhandled preapproval status:', mpStatus);
  }
};

// ---- HANDLE AUTHORIZED PAYMENT (subscription payment notification) ----
const handleAuthorizedPayment = async (paymentId) => {
  console.log('[Empresas] Handling authorized payment:', paymentId);

  if (!paymentId) return;

  // Fetch payment details
  const mpResponse = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    {
      headers: {
        Authorization: `Bearer ${mercadopagoAccessToken}`,
      },
    }
  );

  if (!mpResponse.ok) {
    console.error('[Empresas] Failed to fetch authorized payment');
    return;
  }

  const payment = await mpResponse.json();
  const preapprovalId = payment.preapproval_id;

  if (!preapprovalId) {
    console.error('[Empresas] No preapproval_id in payment');
    return;
  }

  // LegalUp AI: el pago pertenece a una suscripción AI si el preapproval
  // está registrado en ai_subscriptions.
  const { data: aiSubscription } = await supabase
    .from('ai_subscriptions')
    .select('*')
    .eq('provider_subscription_id', String(preapprovalId))
    .maybeSingle();
  if (aiSubscription) {
    await handleAIAuthorizedPayment(payment, aiSubscription);
    return;
  }

  // LegalUp Pro
  const { data: proSubscription } = await supabase
    .from('lawyer_subscriptions')
    .select('*')
    .eq('provider_subscription_id', String(preapprovalId))
    .maybeSingle();
  if (proSubscription) {
    await handleProAuthorizedPayment(payment);
    return;
  }

  // Find subscription
  const { data: subscription } = await supabase
    .from('company_subscriptions')
    .select('*, plan:plan_id(*)')
    .eq('mercadopago_preapproval_id', preapprovalId)
    .maybeSingle();

  if (!subscription) {
    console.error('[Empresas] No subscription found for preapproval:', preapprovalId);
    return;
  }

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', subscription.company_id)
    .maybeSingle();

  if (!company) return;

  // Track event
  await supabase.from('subscription_payment_events').insert({
    subscription_id: subscription.id,
    event_type: 'authorized_payment',
    mercadopago_event_id: paymentId,
    amount: payment.transaction_amount,
    status: payment.status,
    metadata: { payment },
  });

  if (payment.status === 'approved') {
    // Renew period and reset usage
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await supabase
      .from('company_subscriptions')
      .update({
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', subscription.id);

    // Reset usage counters
    if (subscription.plan) {
      await supabase.from('company_usage').insert({
        company_id: company.id,
        subscription_id: subscription.id,
        period_start: now.toISOString(),
        period_end: periodEnd.toISOString(),
        consultations_limit: subscription.plan.consultations_limit,
        reviews_limit: subscription.plan.reviews_limit,
        consultations_used: 0,
        reviews_used: 0,
      });
    }

    await sendSubscriptionEmail(
      company.contact_email,
      'Tu suscripción LegalUp se ha renovado',
      subscriptionEmailTemplates.renewal(
        company.name,
        subscription.plan?.name || 'LegalUp',
        periodEnd.toLocaleDateString('es-CL')
      )
    );
  } else if (payment.status === 'rejected' || payment.status === 'refused') {
    // Mark as past_due
    await supabase
      .from('company_subscriptions')
      .update({ status: 'past_due', updated_at: new Date().toISOString() })
      .eq('id', subscription.id);

    await supabase
      .from('companies')
      .update({ status: 'past_due', updated_at: new Date().toISOString() })
      .eq('id', company.id);

    await sendSubscriptionEmail(
      company.contact_email,
      'No pudimos procesar el pago de tu suscripción',
      subscriptionEmailTemplates.payment_failed(company.name)
    );
  }
};

// ---- EXTENDED WEBHOOK ----
// The existing webhook handler is extended within its flow
// We add a new check before the main webhook processing

// ---- ADMIN: GET ALL COMPANIES ----
app.get('/api/admin/empresas', requireAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;

    let query = supabase
      .from('companies')
      .select('*, subscription:company_subscriptions(id, plan_id, status, current_period_end, mercadopago_preapproval_id)')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (search) query = query.or(`name.ilike.%${search}%,rut.ilike.%${search}%,contact_email.ilike.%${search}%`);

    const { data: companies, error } = await query;

    if (error) throw error;

    res.json({ companies: companies || [] });
  } catch (error) {
    console.error('[Admin] Error fetching companies:', error);
    res.status(500).json({ error: 'Error al obtener empresas' });
  }
});

// ---- ADMIN: GET COMPANY METRICS ----
app.get('/api/admin/empresas/metrics', requireAdmin, async (req, res) => {
  try {
    const { data: metrics } = await supabase.rpc('get_company_metrics');

    res.json({ metrics });
  } catch (error) {
    console.error('[Admin] Error fetching metrics:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ---- ADMIN: GET ALL REQUESTS (for assignment dashboard) ----
app.get('/api/admin/empresas/requests', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('company_requests')
      .select('*, company:company_id(id, name, rut, contact_name)')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    else query = query.not('status', 'in', '("finalizada","cancelada")');

    const { data: requests } = await query;

    res.json({ requests: requests || [] });
  } catch (error) {
    console.error('[Admin] Error fetching requests:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ---- ADMIN: GET COMPANY DETAILS ----
app.get('/api/admin/empresas/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!company) return res.status(404).json({ error: 'Empresa no encontrada' });

    const { data: subscription } = await supabase
      .from('company_subscriptions')
      .select('*, plan:plan_id(*)')
      .eq('company_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: requests } = await supabase
      .from('company_requests')
      .select('*')
      .eq('company_id', id)
      .order('created_at', { ascending: false });

    const { data: usage } = await supabase
      .from('company_usage')
      .select('*')
      .eq('company_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: notes } = await supabase
      .from('company_notes')
      .select('*')
      .eq('company_id', id)
      .order('created_at', { ascending: false });

    const { data: activityLog } = await supabase
      .from('company_activity_log')
      .select('*')
      .eq('company_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    res.json({ company, subscription, requests, usage, notes, activityLog });
  } catch (error) {
    console.error('[Admin] Error fetching company details:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ---- ADMIN: UPDATE COMPANY STATUS ----
app.put('/api/admin/empresas/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: 'Status is required' });

    await supabase
      .from('companies')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    // Also update subscription if cancelling
    if (status === 'cancelled') {
      await supabase
        .from('company_subscriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('company_id', id)
        .in('status', ['active', 'past_due']);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Admin] Error updating company status:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ---- ADMIN: ADD NOTE TO COMPANY ----
app.post('/api/admin/empresas/:id/notes', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, userId } = req.body;

    if (!content) return res.status(400).json({ error: 'Content is required' });

    const { data, error } = await supabase
      .from('company_notes')
      .insert({ company_id: id, content, created_by: userId })
      .select()
      .single();

    if (error) throw error;

    res.json({ note: data });
  } catch (error) {
    console.error('[Admin] Error adding note:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ---- ADMIN: ASSIGN LAWYER TO REQUEST ----
app.post('/api/admin/empresas/requests/:id/assign', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { lawyerId, assignedBy } = req.body;

    if (!lawyerId) return res.status(400).json({ error: 'lawyerId is required' });

    const now = new Date().toISOString();

    await supabase
      .from('company_requests')
      .update({
        lawyer_id: lawyerId,
        assigned_by: assignedBy,
        assigned_at: now,
        status: 'asignada',
        updated_at: now,
      })
      .eq('id', id);

    // Get request to log activity
    const { data: request } = await supabase
      .from('company_requests')
      .select('company_id')
      .eq('id', id)
      .single();

    if (request) {
      await supabase.from('company_activity_log').insert({
        company_id: request.company_id,
        user_id: assignedBy,
        action: 'request_assigned',
        entity_type: 'request',
        entity_id: id,
        metadata: { lawyer_id: lawyerId },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Admin] Error assigning lawyer:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ---- ADMIN: UPDATE REQUEST STATUS ----
app.put('/api/admin/empresas/requests/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, userId } = req.body;

    const updates = { status, updated_at: new Date().toISOString() };
    if (status === 'finalizada' || status === 'cancelada') {
      updates.closed_at = new Date().toISOString();
    }

    await supabase.from('company_requests').update(updates).eq('id', id);

    res.json({ success: true });
  } catch (error) {
    console.error('[Admin] Error updating request status:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ---- LAWYER: GET ASSIGNED COMPANY REQUESTS ----
app.get('/api/lawyer/empresas/requests', requireAuthentication, async (req, res) => {
  try {
    const userId = req.authUser.id;

    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const { data: requests } = await supabase
      .from('company_requests')
      .select('*, company:company_id(id, name, rut, industry, contact_name, contact_email, contact_phone)')
      .eq('lawyer_id', userId)
      .order('created_at', { ascending: false });

    res.json({ requests: requests || [] });
  } catch (error) {
    console.error('[Lawyer] Error fetching requests:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Helper: verify JWT and extract user ID via Supabase Auth REST API
async function getUserIdFromToken(token) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

// ---- NOTIFICATIONS ----
app.get('/api/notifications', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });

    const userId = await getUserIdFromToken(authHeader.replace('Bearer ', ''));
    if (!userId) return res.status(401).json({ error: 'Token inválido' });

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Notifications] Error fetching:', error);
      return res.status(500).json({ error: 'Error al cargar notificaciones' });
    }

    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    res.json({ notifications: data || [], total: count || 0 });
  } catch (error) {
    console.error('[Notifications] Error fetching:', error);
    res.status(500).json({ error: 'Error al cargar notificaciones' });
  }
});

// Contador eficiente de no leídas (COUNT, no carga filas).
app.get('/api/notifications/unread-count', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });

    const userId = await getUserIdFromToken(authHeader.replace('Bearer ', ''));
    if (!userId) return res.status(401).json({ error: 'Token inválido' });

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('[Notifications] Error counting unread:', error);
      return res.status(500).json({ error: 'Error interno' });
    }

    res.json({ count: count || 0 });
  } catch (error) {
    console.error('[Notifications] Error counting unread:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/notifications/:id/read', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });

    const userId = await getUserIdFromToken(authHeader.replace('Bearer ', ''));
    if (!userId) return res.status(401).json({ error: 'Token inválido' });

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('user_id', userId);

    res.json({ success: true });
  } catch (error) {
    console.error('[Notifications] Error marking read:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/notifications/read-all', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });

    const userId = await getUserIdFromToken(authHeader.replace('Bearer ', ''));
    if (!userId) return res.status(401).json({ error: 'Token inválido' });

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    res.json({ success: true });
  } catch (error) {
    console.error('[Notifications] Error marking all read:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ---- SLA METRICS ----
app.get('/api/empresas/sla-metrics', companyAuthorization.forRoute('GET /api/empresas/sla-metrics'), async (req, res) => {
  try {
    const { companyId } = req.query;

    let query = supabase
      .from('company_requests')
      .select('id, status, sla_deadline, first_response_at, created_at, updated_at, assigned_at, category');

    if (companyId) query = query.eq('company_id', companyId);

    const { data: requests } = await query;

    const total = requests?.length || 0;
    let cumplidos = 0;
    let incumplidos = 0;
    let totalResponseTime = 0;
    let responseCount = 0;

    if (requests) {
      for (const r of requests) {
        const deadline = r.sla_deadline;
        // Use first_response_at; fall back to updated_at if the request has activity
        const responded = r.first_response_at ||
          ((r.status === 'finalizada' || r.status === 'en_proceso' || r.status === 'respondida') ? r.updated_at : null);
        const responseTimeReference = r.first_response_at || r.assigned_at || r.created_at;

        if (responded && deadline) {
          if (new Date(responded) <= new Date(deadline)) {
            cumplidos++;
          } else {
            incumplidos++;
          }
          totalResponseTime += new Date(responseTimeReference).getTime() - new Date(r.created_at).getTime();
          responseCount++;
        } else if (deadline && new Date(deadline) < new Date()) {
          incumplidos++;
        }
      }
    }

    const avgMinutes = responseCount > 0 ? Math.round(totalResponseTime / responseCount / 60000) : 0;
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;

    res.json({
      total,
      cumplidos,
      incumplidos,
      cumplimientoPct: total > 0 ? Math.round((cumplidos / total) * 100) : 100,
      tiempoPromedioRespuesta: responseCount > 0 ? `${hours}h ${mins}m` : '—',
    });
  } catch (error) {
    console.error('[SLA] Error computing metrics:', error);
    res.status(500).json({ error: 'Error al calcular métricas SLA' });
  }
});

// ---- BREACHED SLA CHECK ----
app.post('/api/empresas/sla/check-breached', requireAdmin, async (req, res) => {
  try {
    const now = new Date().toISOString();

    const { data: breached } = await supabase
      .from('company_requests')
      .select('id, company_id, lawyer_id, sla_deadline')
      .not('status', 'in', '("finalizada","cancelada")')
      .not('sla_deadline', 'is', null)
      .lt('sla_deadline', now);

    if (breached) {
      for (const r of breached) {
        await supabase
          .from('company_requests')
          .update({ status: 'sla_breached' })
          .eq('id', r.id);

        await supabase.from('company_activity_log').insert({
          company_id: r.company_id,
          user_id: r.lawyer_id,
          action: 'sla_breached',
          entity_type: 'request',
          entity_id: r.id,
          metadata: { sla_deadline: r.sla_deadline, breached_at: now },
        });

        if (r.lawyer_id) {
          await notificationsService.notifyUser({
            userId: r.lawyer_id,
            type: 'sla_breached',
            title: 'SLA vencido',
            message: 'El plazo de respuesta para un caso asignado ha vencido.',
            entityType: 'request',
            entityId: r.id,
          });
        }
      }
    }

    res.json({ checked: true, breached: breached?.length || 0 });
  } catch (error) {
    console.error('[SLA] Error checking breached:', error);
    res.status(500).json({ error: 'Error al verificar SLA' });
  }
});

// ---- UPDATE FIRST RESPONSE ----
app.post('/api/empresas/requests/:id/first-response', companyAuthorization.forRoute('POST /api/empresas/requests/:id/first-response'), async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();

    const { data: request } = await supabase
      .from('company_requests')
      .select('first_response_at, company_id, lawyer_id, sla_deadline')
      .eq('id', id)
      .single();

    if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' });

    // Lookup the company user_id for notification
    const { data: company } = await supabase
      .from('companies')
      .select('user_id')
      .eq('id', request.company_id)
      .single();

    // Only set if first time
    if (!request.first_response_at) {
      await supabase
        .from('company_requests')
        .update({ first_response_at: now, updated_at: now })
        .eq('id', id);

      await supabase.from('company_activity_log').insert({
        company_id: request.company_id,
        user_id: request.lawyer_id,
        action: 'first_response',
        entity_type: 'request',
        entity_id: id,
        metadata: { first_response_at: now },
      });

      if (company) {
        await notificationsService.notifyUser({
          userId: company.user_id,
          type: 'first_response',
          title: 'Primera respuesta recibida',
          message: 'Tu abogado ha respondido a tu solicitud.',
          entityType: 'request',
          entityId: id,
        });
      }

      // Check SLA
      if (request.sla_deadline) {
        const cumplido = new Date(now) <= new Date(request.sla_deadline);
        await supabase.from('company_activity_log').insert({
          company_id: request.company_id,
          user_id: request.lawyer_id,
          action: cumplido ? 'sla_compliant' : 'sla_breached',
          entity_type: 'request',
          entity_id: id,
          metadata: { first_response_at: now, sla_deadline: request.sla_deadline },
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[SLA] Error updating first response:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ---- TIMELINE ----
app.get('/api/empresas/requests/:id/timeline', companyAuthorization.forRoute('GET /api/empresas/requests/:id/timeline'), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: request } = await supabase
      .from('company_requests')
      .select('created_at, assigned_at, first_response_at, closed_at, status')
      .eq('id', id)
      .single();

    if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' });

    const { data: activity } = await supabase
      .from('company_activity_log')
      .select('*')
      .eq('entity_id', id)
      .eq('entity_type', 'request')
      .order('created_at', { ascending: true });

    const timeline = [];

    if (request.created_at) {
      timeline.push({ time: request.created_at, event: 'Solicitud creada', type: 'created' });
    }
    if (request.assigned_at) {
      timeline.push({ time: request.assigned_at, event: 'Abogado asignado', type: 'assigned' });
    }
    if (request.first_response_at) {
      timeline.push({ time: request.first_response_at, event: 'Primera respuesta del abogado', type: 'response' });
    }
    if (activity) {
      const skipActions = new Set(['request_created', 'request_assigned', 'sla_cumplido', 'sla_incumplido']);
      for (const a of activity) {
        if (skipActions.has(a.action)) continue;
        timeline.push({ time: a.created_at, event: a.action, metadata: a.metadata, type: 'activity' });
      }
    }
    if (request.closed_at) {
      timeline.push({ time: request.closed_at, event: 'Caso cerrado', type: 'closed' });
    }

    timeline.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    res.json({ timeline });
  } catch (error) {
    console.error('[Timeline] Error fetching:', error);
    res.status(500).json({ error: 'Error al obtener timeline' });
  }
});

// ---- REQUEST CONVERSATION ----
app.get('/api/empresas/requests/:id/conversation', companyAuthorization.forRoute('GET /api/empresas/requests/:id/conversation'), async (req, res) => {
  try {
    const { id } = req.params;

    const [timelineRes, messagesRes] = await Promise.all([
      supabase
        .from('company_requests')
        .select('created_at, assigned_at, first_response_at, closed_at')
        .eq('id', id)
        .single(),
      supabase
        .from('request_messages')
        .select('*')
        .eq('request_id', id)
        .order('created_at', { ascending: true }),
    ]);

    const request = timelineRes.data;
    if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' });

    const events = [];

    if (request.created_at) {
      events.push({ id: 'created', type: 'system', label: 'Solicitud creada', time: request.created_at });
    }
    if (request.assigned_at) {
      events.push({ id: 'assigned', type: 'system', label: 'Abogado asignado', time: request.assigned_at });
    }
    if (request.first_response_at) {
      events.push({ id: 'first_response', type: 'system', label: 'Primera respuesta', time: request.first_response_at });
    }
    if (request.closed_at) {
      events.push({ id: 'closed', type: 'system', label: 'Caso cerrado', time: request.closed_at });
    }

    // Fetch sender profiles (can't join across auth schema)
    const senderIds = [...new Set((messagesRes.data || []).map(m => m.sender_id))];
    const { data: senderProfiles } = senderIds.length > 0
      ? await supabase.from('profiles').select('id, first_name, last_name, avatar_url').in('id', senderIds)
      : { data: [] };
    const senderMap = {};
    (senderProfiles || []).forEach(s => { senderMap[s.id] = s; });

    // Fallback for empresa users without profile row
    const missingIds = senderIds.filter(sid => !senderMap[sid]);
    if (missingIds.length > 0) {
      const { data: reqData } = await supabase
        .from('company_requests')
        .select('company_id')
        .eq('id', id)
        .single();
      if (reqData?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('contact_name')
          .eq('id', reqData.company_id)
          .single();
        if (company?.contact_name) {
          const parts = company.contact_name.split(' ');
          missingIds.forEach(sid => {
            senderMap[sid] = {
              id: sid,
              first_name: parts[0],
              last_name: parts.slice(1).join(' '),
              avatar_url: null,
            };
          });
        }
      }
    }

    const messages = (messagesRes.data || []).map(m => ({
      id: m.id,
      type: 'message',
      content: m.content,
      file_url: m.file_url,
      file_name: m.file_name,
      sender: senderMap[m.sender_id] || null,
      sender_id: m.sender_id,
      time: m.created_at,
    }));

    const conversation = [...events, ...messages].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    res.json({ conversation });
  } catch (error) {
    console.error('[Conversation] Error:', error);
    res.status(500).json({ error: 'Error al obtener conversación' });
  }
});

app.post('/api/empresas/requests/:id/messages', companyAuthorization.forRoute('POST /api/empresas/requests/:id/messages'), async (req, res) => {
  try {
    const userId = req.authUser.id;

    const { id } = req.params;
    const { content, fileUrl, fileName } = req.body;

    if (!content) return res.status(400).json({ error: 'content requerido' });

    const { data, error } = await supabase
      .from('request_messages')
      .insert({
        request_id: id,
        sender_id: userId,
        content,
        file_url: fileUrl || null,
        file_name: fileName || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Fetch sender profile (can't join across auth schema)
    let sender = null;
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.first_name || profile?.last_name) {
      sender = profile;
    } else {
      // Fallback to company contact name for empresa users
      const { data: reqData } = await supabase
        .from('company_requests')
        .select('company_id')
        .eq('id', id)
        .single();
      if (reqData?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('contact_name')
          .eq('id', reqData.company_id)
          .single();
        if (company?.contact_name) {
          const parts = company.contact_name.split(' ');
          sender = {
            id: userId,
            first_name: parts[0],
            last_name: parts.slice(1).join(' '),
            avatar_url: null,
          };
        }
      }
    }

    console.log('[POST message] userId:', userId, 'profile:', profile?.first_name, profile?.last_name, 'sender:', JSON.stringify(sender));

    data.sender = sender;

    // Notify the other participant
    const { data: reqData } = await supabase
      .from('company_requests')
      .select('company_id, lawyer_id, user_id')
      .eq('id', id)
      .single();

    if (reqData) {
      const notifyUserId = userId === reqData.user_id ? reqData.lawyer_id : reqData.user_id;
      if (notifyUserId) {
        await notificationsService.notifyUser({
          userId: notifyUserId,
          type: 'new_message',
          title: 'Nuevo mensaje en solicitud',
          message: content.slice(0, 100),
          entityType: 'request',
          entityId: id,
        });
      }
    }

    res.json({ message: data });
  } catch (error) {
    console.error('[Conversation] Error sending message:', error);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

// ---- BUDGETS ----
app.get('/api/empresas/legal-services', async (req, res) => {
  try {
    const { category_slug } = req.query;
    let query = supabase.from('legal_services')
      .select('*, category:category_slug(*)')
      .eq('is_active', true);
    if (category_slug) query = query.eq('category_slug', category_slug);
    const { data } = await query.order('sort_order', { ascending: true });
    res.json({ services: data || [] });
  } catch (error) {
    console.error('[Catalog] Error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.get('/api/empresas/service-categories', async (req, res) => {
  try {
    const { data } = await supabase.from('service_categories').select('*').order('sort_order', { ascending: true });
    res.json({ categories: data || [] });
  } catch (error) {
    console.error('[Categories] Error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.get('/api/empresas/budgets', companyAuthorization.forRoute('GET /api/empresas/budgets'), async (req, res) => {
  try {
    const { companyId, requestId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId requerido' });

    let query = supabase
      .from('company_budgets')
      .select('*, items:company_budget_items(*)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (requestId) query = query.eq('request_id', requestId);

    const { data } = await query;
    res.json({ budgets: data || [] });
  } catch (error) {
    console.error('[Budgets] List error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/empresas/budgets/auto-generate', companyAuthorization.forRoute('POST /api/empresas/budgets/auto-generate'), async (req, res) => {
  try {
    const { requestId } = req.body;
    const { companyId } = req.companyAuthorization;
    if (!requestId || !companyId) return res.status(400).json({ error: 'requestId y companyId requeridos' });

    const { data: request } = await supabase
      .from('company_requests')
      .select('category, title')
      .eq('id', requestId)
      .single();

    if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' });

    const { data: existing } = await supabase
      .from('company_budgets')
      .select('id')
      .eq('request_id', requestId)
      .maybeSingle();

    if (existing) return res.status(400).json({ error: 'Ya existe un presupuesto para esta solicitud' });

    const { data: services } = await supabase
      .from('legal_services')
      .select('*')
      .eq('category_slug', request.category)
      .eq('is_active', true);

    if (!services || services.length === 0) {
      return res.status(400).json({ error: 'No hay servicios disponibles para esta categoría' });
    }

    const items = services.slice(0, 3).map(s => ({
      legal_service_id: s.id,
      description: s.service_name,
      quantity: 1,
      unit_price_clp: s.starting_price_clp || 0,
      total_clp: s.starting_price_clp || 0,
    }));

    const total = items.reduce((sum, i) => sum + i.total_clp, 0);

    const { data: budget, error } = await supabase
      .from('company_budgets')
      .insert({
        company_id: companyId,
        request_id: requestId,
        title: `Presupuesto: ${request.title || request.category}`,
        description: `Presupuesto generado automáticamente para solicitud de ${request.category}`,
        subtotal_clp: total,
        total_clp: total,
        created_by: 'auto',
      })
      .select()
      .single();

    if (error) throw error;

    const { error: itemsError } = await supabase
      .from('company_budget_items')
      .insert(items.map(i => ({ ...i, budget_id: budget.id })));

    if (itemsError) throw itemsError;

    res.status(201).json({ budget });
  } catch (error) {
    console.error('[Budgets] Auto-generate error:', error);
    res.status(500).json({ error: 'Error al generar presupuesto' });
  }
});

app.post('/api/empresas/budgets/manual', companyAuthorization.forRoute('POST /api/empresas/budgets/manual'), async (req, res) => {
  try {
    const { requestId, title, description, items, discount_clp, tax_clp } = req.body;
    const { companyId, resource } = req.companyAuthorization;
    const lawyerId = resource.lawyer_id || null;
    if (!companyId || !requestId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const subtotal = items.reduce((sum, i) => sum + (i.unit_price_clp * (i.quantity || 1)), 0);
    const d = discount_clp || 0;
    const t = tax_clp || 0;
    const total = subtotal - d + t;

    const { data: budget, error } = await supabase
      .from('company_budgets')
      .insert({
        company_id: companyId,
        request_id: requestId,
        lawyer_id: lawyerId || null,
        title: title || 'Presupuesto',
        description: description || null,
        subtotal_clp: subtotal,
        discount_clp: d,
        tax_clp: t,
        total_clp: total,
        created_by: 'lawyer',
      })
      .select()
      .single();

    if (error) throw error;

    const budgetItems = items.map(i => ({
      budget_id: budget.id,
      legal_service_id: i.legal_service_id || null,
      description: i.description,
      quantity: i.quantity || 1,
      unit_price_clp: i.unit_price_clp,
      total_clp: i.unit_price_clp * (i.quantity || 1),
    }));

    const { error: itemsError } = await supabase
      .from('company_budget_items')
      .insert(budgetItems);

    if (itemsError) throw itemsError;

    res.status(201).json({ budget });
  } catch (error) {
    console.error('[Budgets] Manual error:', error);
    res.status(500).json({ error: 'Error al crear presupuesto' });
  }
});

app.post('/api/empresas/budgets/:id/approve', companyAuthorization.forRoute('POST /api/empresas/budgets/:id/approve'), async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('company_budgets')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ budget: data });
  } catch (error) {
    console.error('[Budgets] Approve error:', error);
    res.status(500).json({ error: 'Error al aprobar presupuesto' });
  }
});

app.post('/api/empresas/budgets/:id/reject', companyAuthorization.forRoute('POST /api/empresas/budgets/:id/reject'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { data, error } = await supabase
      .from('company_budgets')
      .update({ status: 'rejected', rejected_at: new Date().toISOString(), rejection_reason: reason || null })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ budget: data });
  } catch (error) {
    console.error('[Budgets] Reject error:', error);
    res.status(500).json({ error: 'Error al rechazar presupuesto' });
  }
});

// ---- ACTIVITY LOG ----
app.get('/api/empresas/activity-log', companyAuthorization.forRoute('GET /api/empresas/activity-log'), async (req, res) => {
  try {
    const { companyId, limit, offset, action } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId requerido' });

    let query = supabase
      .from('company_activity_log')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (action) {
      // SLA filters: query from company_requests instead of activity log
      if (action === 'sla_compliant') {
        const { data: requests } = await supabase
          .from('company_requests')
          .select('id, title, first_response_at, sla_deadline, updated_at')
          .eq('company_id', companyId)
          .not('first_response_at', 'is', null)
          .not('sla_deadline', 'is', null);

        const entries = (requests || [])
          .filter(r => new Date(r.first_response_at) <= new Date(r.sla_deadline))
          .map(r => ({
            id: `sla-compliant-${r.id}`,
            action: 'sla_compliant',
            entity_type: 'request',
            entity_id: r.id,
            metadata: { solicitud: r.title || 'Sin título', first_response_at: r.first_response_at, sla_deadline: r.sla_deadline },
            created_at: r.updated_at,
            user_id: null,
          }))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const limited = limit ? entries.slice(0, parseInt(limit)) : entries.slice(0, 50);
        return res.json({ entries: limited, total: entries.length });
      }

      if (action === 'sla_breached') {
        const { data: requests } = await supabase
          .from('company_requests')
          .select('id, title, first_response_at, sla_deadline, updated_at')
          .eq('company_id', companyId)
          .not('sla_deadline', 'is', null);

        const entries = (requests || [])
          .filter(r => {
            if (r.first_response_at) return new Date(r.first_response_at) > new Date(r.sla_deadline);
            return new Date(r.sla_deadline) < new Date();
          })
          .map(r => ({
            id: `sla-breached-${r.id}`,
            action: 'sla_breached',
            entity_type: 'request',
            entity_id: r.id,
            metadata: { solicitud: r.title || 'Sin título', sla_deadline: r.sla_deadline, first_response_at: r.first_response_at || 'Sin respuesta' },
            created_at: r.sla_deadline,
            user_id: null,
          }))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const limited = limit ? entries.slice(0, parseInt(limit)) : entries.slice(0, 50);
        return res.json({ entries: limited, total: entries.length });
      }

      // Map canonical action names to include legacy values for other filters
      const actionMap = {
        first_response: ['first_response', 'primera_respuesta'],
        rating_received: ['rating_received', 'calificacion_recibida'],
      };
      const actions = actionMap[action] || [action];
      if (actions.length === 1) {
        query = query.eq('action', actions[0]);
      } else {
        query = query.in('action', actions);
      }
    }
    if (limit) query = query.limit(parseInt(limit));
    else query = query.limit(50);
    if (offset) query = query.range(parseInt(offset), parseInt(offset) + (parseInt(limit) || 50) - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[ActivityLog] Query error:', error);
      return res.status(500).json({ error: 'Error al obtener actividad' });
    }

    res.json({ entries: data || [], total: count || 0 });
  } catch (error) {
    console.error('[ActivityLog] Error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ---- RATINGS ----
app.post('/api/empresas/ratings', requireAuthentication, async (req, res) => {
  try {
    const userId = req.authUser.id;

    const { requestId, lawyerId, rating, comment } = req.body;
    if (!requestId || !lawyerId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    const { data: request } = await supabase
      .from('company_requests')
      .select('company_id, status')
      .eq('id', requestId)
      .single();

    if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' });
    if (request.status !== 'finalizada') {
      return res.status(400).json({ error: 'Solo se puede calificar solicitudes finalizadas' });
    }

    const { data: company } = await supabase
      .from('companies')
      .select('user_id')
      .eq('id', request.company_id)
      .single();

    if (!company || company.user_id !== userId) {
      return res.status(403).json({ error: 'No eres el dueño de esta empresa' });
    }

    const { data: existing } = await supabase
      .from('company_ratings')
      .select('id')
      .eq('request_id', requestId)
      .eq('rater_type', 'company')
      .maybeSingle();

    if (existing) return res.status(400).json({ error: 'Ya calificaste esta solicitud' });

    const { data, error } = await supabase
      .from('company_ratings')
      .insert({
        company_id: request.company_id,
        lawyer_id: lawyerId,
        request_id: requestId,
        rater_type: 'company',
        rating,
        comment: comment || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[Ratings] Insert error:', error);
      return res.status(500).json({ error: 'Error al guardar calificación' });
    }

    await supabase.from('company_activity_log').insert({
      company_id: request.company_id,
      user_id: userId,
      action: 'rating_received',
      entity_type: 'request',
      entity_id: requestId,
      metadata: { rating, lawyer_id: lawyerId },
    });

    res.status(201).json(data);
  } catch (error) {
    console.error('[Ratings] Error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.get('/api/empresas/ratings', companyAuthorization.forRoute('GET /api/empresas/ratings'), async (req, res) => {
  try {
    const { requestId } = req.query;
    if (!requestId) return res.status(400).json({ error: 'requestId requerido' });

    const { data } = await supabase
      .from('company_ratings')
      .select('*')
      .eq('request_id', requestId)
      .eq('rater_type', 'company')
      .maybeSingle();

    res.json({ rating: data || null });
  } catch (error) {
    console.error('[Ratings] Get error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.get('/api/empresas/ratings/lawyer/:lawyerId/stats', async (req, res) => {
  try {
    const { lawyerId } = req.params;

    const { data: ratings } = await supabase
      .from('company_ratings')
      .select('rating')
      .eq('lawyer_id', lawyerId)
      .eq('rater_type', 'company');

    if (!ratings || ratings.length === 0) {
      return res.json({ stats: { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } } });
    }

    const total = ratings.reduce((sum, r) => sum + r.rating, 0);
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of ratings) {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    }

    res.json({
      stats: {
        average: Math.round((total / ratings.length) * 10) / 10,
        count: ratings.length,
        distribution,
      },
    });
  } catch (error) {
    console.error('[Ratings] Stats error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ---- AUTO-ASSIGNMENT ALGORITHM ----
// Scoring factors:
//   workload (35%)  – fewer active cases = better
//   sla_rate (30%)  – higher SLA compliance = better
//   rating   (25%)  – higher company rating avg = better
//   existing (10%)  – already worked with this company = bonus
// For priority requests, sla_rate weight is boosted to 45%

const CATEGORY_SPECIALTY_MAP = {
  laboral: ['Derecho Laboral', 'Laboral'],
  comercial: ['Derecho Comercial', 'Comercial'],
  tributario: ['Derecho Tributario', 'Tributario'],
  civil: ['Derecho Civil', 'Civil', 'Litigación Civil'],
  marcas: ['Propiedad Intelectual', 'Marcas', 'Derecho de Tecnología'],
  familia: ['Derecho de Familia', 'Familia'],
  administrativo: ['Derecho Administrativo', 'Administrativo'],
  consumidor: ['Derecho de Consumidor', 'Consumidor'],
  otros: [], // matches anyone as fallback
};

function lawyerMatchesCategory(specialties, category) {
  if (category === 'otros') return true;
  const keywords = CATEGORY_SPECIALTY_MAP[category];
  if (!keywords || keywords.length === 0) return true;
  if (!specialties) return false;

  // Normalize specialties to array
  const list = Array.isArray(specialties) ? specialties
    : typeof specialties === 'string' ? specialties.split(',').map(s => s.trim())
    : [];

  return keywords.some(kw => {
    const lowerKw = kw.toLowerCase();
    return list.some(s => {
      const lower = s.toLowerCase().trim();
      // Exact match or starts-with match (e.g. "Derecho Laboral" matches "Derecho Laboral y Seguridad Social")
      return lower === lowerKw || lower.startsWith(lowerKw + ' ') || lower.startsWith(lowerKw + ' y ');
    });
  });
}

async function autoAssignLawyer(supabase, { companyId, userId, category, priority }) {
  try {
    // Get all lawyers with their actual specialties from profiles
    const { data: allLawyers } = await supabase
      .from('profiles')
      .select('id, specialties')
      .eq('role', 'lawyer');

    if (!allLawyers || allLawyers.length === 0) return null;

    // Filter by actual specialty match
    const matchingIds = allLawyers
      .filter(l => lawyerMatchesCategory(l.specialties, category))
      .map(l => l.id);

    if (matchingIds.length === 0) return null;

    const lawyerIds = matchingIds;

    // 1. Workload: active cases per lawyer
    const { data: activeReqs } = await supabase
      .from('company_requests')
      .select('lawyer_id')
      .in('lawyer_id', lawyerIds)
      .not('status', 'in', '("finalizada","cancelada")');

    const workload = {};
    if (activeReqs) {
      for (const r of activeReqs) {
        workload[r.lawyer_id] = (workload[r.lawyer_id] || 0) + 1;
      }
    }
    const maxWorkload = Math.max(...Object.values(workload), 0);

    // 2. SLA compliance
    const { data: closedReqs } = await supabase
      .from('company_requests')
      .select('lawyer_id, sla_deadline, first_response_at')
      .in('lawyer_id', lawyerIds)
      .not('sla_deadline', 'is', null);

    const slaStats = {};
    for (const r of closedReqs || []) {
      if (!slaStats[r.lawyer_id]) slaStats[r.lawyer_id] = { total: 0, compliant: 0 };
      slaStats[r.lawyer_id].total++;
      if (r.first_response_at && new Date(r.first_response_at) <= new Date(r.sla_deadline)) {
        slaStats[r.lawyer_id].compliant++;
      }
    }

    // 3. Rating from company_ratings
    const { data: ratings } = await supabase
      .from('company_ratings')
      .select('lawyer_id, rating')
      .in('lawyer_id', lawyerIds)
      .eq('rater_type', 'company');

    const ratingSums = {};
    const ratingCounts = {};
    for (const r of ratings || []) {
      ratingSums[r.lawyer_id] = (ratingSums[r.lawyer_id] || 0) + r.rating;
      ratingCounts[r.lawyer_id] = (ratingCounts[r.lawyer_id] || 0) + 1;
    }

    // 4. Existing relationship with this company
    const { data: existingLawyers } = await supabase
      .from('company_lawyers')
      .select('lawyer_id')
      .eq('company_id', companyId)
      .in('lawyer_id', lawyerIds);

    const existingSet = new Set((existingLawyers || []).map(l => l.lawyer_id));
    const { data: existingRequests } = await supabase
      .from('company_requests')
      .select('lawyer_id')
      .eq('company_id', companyId)
      .in('lawyer_id', lawyerIds);

    const workedBefore = new Set((existingRequests || []).map(r => r.lawyer_id));

    const isPriority = priority === 'alta' || priority === 'urgente';
    const W = isPriority ? { workload: 0.25, sla: 0.45, rating: 0.20, existing: 0.10 }
                         : { workload: 0.35, sla: 0.30, rating: 0.25, existing: 0.10 };

    const scored = lawyerIds.map(id => {
      const active = workload[id] || 0;
      const wScore = maxWorkload > 0 ? 1 - (active / maxWorkload) : 1;

      const s = slaStats[id];
      const slaScore = s && s.total > 0 ? s.compliant / s.total : 0.5;

      const rAvg = ratingCounts[id] ? ratingSums[id] / ratingCounts[id] : 0;
      const rScore = rAvg / 5;

      const eScore = (existingSet.has(id) || workedBefore.has(id)) ? 1 : 0;

      const total = (wScore * W.workload) + (slaScore * W.sla) + (rScore * W.rating) + (eScore * W.existing);

      return { id, score: total, active };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored[0]?.id || null;
  } catch (error) {
    console.error('[AutoAssign] Error:', error);
    return null;
  }
}

// ---- CENTRO LEGAL ----

// Seed default folders for a company
app.post('/api/empresas/legal-center/seed', companyAuthorization.forRoute('POST /api/empresas/legal-center/seed'), async (req, res) => {
  try {
    const userId = req.authUser.id;

    const { companyId } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId requerido' });

    const { error } = await supabase.rpc('seed_legal_folders', { p_company_id: companyId });
    if (error) {
      if (error.message.includes('already exists')) {
        return res.json({ seeded: false, message: 'Ya existen carpetas' });
      }
      throw error;
    }
    res.json({ seeded: true });
  } catch (error) {
    console.error('[LegalCenter] Error seeding folders:', error);
    res.status(500).json({ error: 'Error al crear carpetas' });
  }
});

// ---- FOLDERS ----

app.get('/api/empresas/legal-folders', companyAuthorization.forRoute('GET /api/empresas/legal-folders'), async (req, res) => {
  try {
    const userId = req.authUser.id;

    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId requerido' });

    const { data } = await supabase
      .from('legal_folders')
      .select('*')
      .eq('company_id', companyId)
      .order('sort_order', { ascending: true });

    res.json({ folders: data || [] });
  } catch (error) {
    console.error('[LegalCenter] Error fetching folders:', error);
    res.status(500).json({ error: 'Error al cargar carpetas' });
  }
});

app.post('/api/empresas/legal-folders', companyAuthorization.forRoute('POST /api/empresas/legal-folders'), async (req, res) => {
  try {
    const userId = req.authUser.id;

    const { companyId, parentId, name, icon } = req.body;
    if (!companyId || !name) return res.status(400).json({ error: 'companyId y name requeridos' });

    const { data, error } = await supabase
      .from('legal_folders')
      .insert({ company_id: companyId, parent_id: parentId || null, name, icon: icon || 'folder' })
      .select()
      .single();

    if (error) throw error;
    res.json({ folder: data });
  } catch (error) {
    console.error('[LegalCenter] Error creating folder:', error);
    res.status(500).json({ error: 'Error al crear carpeta' });
  }
});

app.put('/api/empresas/legal-folders/:id', companyAuthorization.forRoute('PUT /api/empresas/legal-folders/:id'), async (req, res) => {
  try {
    const userId = req.authUser.id;

    const { name, icon, parent_id, sort_order } = req.body;
    const { data, error } = await supabase
      .from('legal_folders')
      .update({ name, icon, parent_id, sort_order })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ folder: data });
  } catch (error) {
    console.error('[LegalCenter] Error updating folder:', error);
    res.status(500).json({ error: 'Error al actualizar carpeta' });
  }
});

app.delete('/api/empresas/legal-folders/:id', companyAuthorization.forRoute('DELETE /api/empresas/legal-folders/:id'), async (req, res) => {
  try {
    const userId = req.authUser.id;

    const { error } = await supabase
      .from('legal_folders')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('[LegalCenter] Error deleting folder:', error);
    res.status(500).json({ error: 'Error al eliminar carpeta' });
  }
});

// ---- DOCUMENTS ----

app.get('/api/empresas/legal-documents', companyAuthorization.forRoute('GET /api/empresas/legal-documents'), async (req, res) => {
  try {
    const userId = req.authUser.id;

    const { companyId, folderId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId requerido' });

    let query = supabase
      .from('legal_documents')
      .select('*, current_version:current_version_id(*)')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false });

    if (folderId !== undefined && folderId !== '') {
      query = query.eq('folder_id', folderId);
    } else if (folderId === '') {
      query = query.is('folder_id', null);
    }

    const { data } = await query;
    res.json({ documents: data || [] });
  } catch (error) {
    console.error('[LegalCenter] Error fetching documents:', error);
    res.status(500).json({ error: 'Error al cargar documentos' });
  }
});

app.get('/api/empresas/legal-documents/:id', companyAuthorization.forRoute('GET /api/empresas/legal-documents/:id'), async (req, res) => {
  try {
    const userId = req.authUser.id;

    const { data } = await supabase
      .from('legal_documents')
      .select('*, current_version:current_version_id(*)')
      .eq('id', req.params.id)
      .maybeSingle();

    res.json({ document: data });
  } catch (error) {
    console.error('[LegalCenter] Error fetching document:', error);
    res.status(500).json({ error: 'Error al cargar documento' });
  }
});

app.post('/api/empresas/legal-documents', companyAuthorization.forRoute('POST /api/empresas/legal-documents'), async (req, res) => {
  try {
    const userId = req.authUser.id;

    const { companyId, folderId, name, description, fileUrl, fileName, fileType, fileSize } = req.body;
    if (!companyId || !name || !fileUrl || !fileName) {
      return res.status(400).json({ error: 'companyId, name, fileUrl y fileName requeridos' });
    }

    // Create document
    const { data: doc, error: docError } = await supabase
      .from('legal_documents')
      .insert({
        company_id: companyId,
        folder_id: folderId || null,
        name,
        description: description || null,
        created_by: userId,
      })
      .select()
      .single();

    if (docError) throw docError;

    // Create first version
    const { data: version, error: verError } = await supabase
      .from('legal_document_versions')
      .insert({
        document_id: doc.id,
        version_number: 1,
        file_name: fileName,
        file_url: fileUrl,
        file_type: fileType || null,
        file_size: fileSize || null,
        uploaded_by: userId,
      })
      .select()
      .single();

    if (verError) throw verError;

    // Update current_version_id
    await supabase
      .from('legal_documents')
      .update({ current_version_id: version.id })
      .eq('id', doc.id);

    doc.current_version_id = version.id;
    res.json({ document: { ...doc, current_version: version } });
  } catch (error) {
    console.error('[LegalCenter] Error creating document:', error);
    res.status(500).json({ error: 'Error al crear documento' });
  }
});

app.post('/api/empresas/legal-documents/:id/versions', companyAuthorization.forRoute('POST /api/empresas/legal-documents/:id/versions'), async (req, res) => {
  try {
    const userId = req.authUser.id;

    const { fileUrl, fileName, fileType, fileSize, notes } = req.body;
    if (!fileUrl || !fileName) {
      return res.status(400).json({ error: 'fileUrl y fileName requeridos' });
    }

    // Get next version number
    const { data: existing } = await supabase
      .from('legal_document_versions')
      .select('version_number')
      .eq('document_id', req.params.id)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = (existing && existing[0]?.version_number || 0) + 1;

    const { data: version, error } = await supabase
      .from('legal_document_versions')
      .insert({
        document_id: req.params.id,
        version_number: nextVersion,
        file_name: fileName,
        file_url: fileUrl,
        file_type: fileType || null,
        file_size: fileSize || null,
        uploaded_by: userId,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Update document's current version
    await supabase
      .from('legal_documents')
      .update({ current_version_id: version.id, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    res.json({ version });
  } catch (error) {
    console.error('[LegalCenter] Error adding version:', error);
    res.status(500).json({ error: 'Error al agregar versión' });
  }
});

app.get('/api/empresas/legal-documents/:id/versions', companyAuthorization.forRoute('GET /api/empresas/legal-documents/:id/versions'), async (req, res) => {
  try {
    const userId = req.authUser.id;

    const { data } = await supabase
      .from('legal_document_versions')
      .select('*')
      .eq('document_id', req.params.id)
      .order('version_number', { ascending: false });

    res.json({ versions: data || [] });
  } catch (error) {
    console.error('[LegalCenter] Error fetching versions:', error);
    res.status(500).json({ error: 'Error al cargar versiones' });
  }
});

app.delete('/api/empresas/legal-documents/:id', companyAuthorization.forRoute('DELETE /api/empresas/legal-documents/:id'), async (req, res) => {
  try {
    const userId = req.authUser.id;

    const { error } = await supabase
      .from('legal_documents')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('[LegalCenter] Error deleting document:', error);
    res.status(500).json({ error: 'Error al eliminar documento' });
  }
});

// ---- DOCUMENT-REQUEST LINKS ----

app.post('/api/empresas/legal-documents/:id/link-request', companyAuthorization.forRoute('POST /api/empresas/legal-documents/:id/link-request'), async (req, res) => {
  try {
    const userId = req.authUser.id;

    const { requestId } = req.body;
    if (!requestId) return res.status(400).json({ error: 'requestId requerido' });

    await supabase
      .from('legal_document_requests')
      .insert({ document_id: req.params.id, request_id: requestId });

    res.json({ success: true });
  } catch (error) {
    console.error('[LegalCenter] Error linking document:', error);
    res.status(500).json({ error: 'Error al vincular documento' });
  }
});

app.delete('/api/empresas/legal-documents/:id/link-request/:requestId', companyAuthorization.forRoute('DELETE /api/empresas/legal-documents/:id/link-request/:requestId'), async (req, res) => {
  try {
    const userId = req.authUser.id;

    await supabase
      .from('legal_document_requests')
      .delete()
      .eq('document_id', req.params.id)
      .eq('request_id', req.params.requestId);

    res.json({ success: true });
  } catch (error) {
    console.error('[LegalCenter] Error unlinking document:', error);
    res.status(500).json({ error: 'Error al desvincular documento' });
  }
});

app.get('/api/empresas/legal-documents/:id/requests', companyAuthorization.forRoute('GET /api/empresas/legal-documents/:id/requests'), async (req, res) => {
  try {
    const userId = req.authUser.id;

    const { data } = await supabase
      .from('legal_document_requests')
      .select('*, request:request_id(id, title, status, created_at)')
      .eq('document_id', req.params.id);

    res.json({ links: data || [] });
  } catch (error) {
    console.error('[LegalCenter] Error fetching document requests:', error);
    res.status(500).json({ error: 'Error al cargar vínculos' });
  }
});


// ---- COMPANY LAWYERS ----
app.get('/api/empresas/lawyers', requireAuthentication, async (req, res) => {
  try {
    const userId = req.authUser.id;

    // Get user's company
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!company) return res.json({ lawyers: [] });

    // Get distinct assigned lawyer IDs from company_requests
    const { data: assigned } = await supabase
      .from('company_requests')
      .select('lawyer_id')
      .eq('company_id', company.id)
      .not('lawyer_id', 'is', null);

    const lawyerIds = [...new Set((assigned || []).map(r => r.lawyer_id))];

    if (lawyerIds.length === 0) return res.json({ lawyers: [] });

    // Fetch lawyer profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, rut, email')
      .in('id', lawyerIds);

    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    // Fetch lawyer stats (active requests count, rating, SLA)
    const { data: activeRequests } = await supabase
      .from('company_requests')
      .select('lawyer_id')
      .eq('company_id', company.id)
      .in('status', ['pendiente', 'en_progreso']);

    const activeCount = {};
    (activeRequests || []).forEach(r => {
      if (r.lawyer_id) activeCount[r.lawyer_id] = (activeCount[r.lawyer_id] || 0) + 1;
    });

    const { data: ratings } = await supabase
      .from('company_ratings')
      .select('lawyer_id, rating')
      .in('lawyer_id', lawyerIds);

    const ratingSums = {}, ratingCounts = {};
    (ratings || []).forEach(r => {
      ratingSums[r.lawyer_id] = (ratingSums[r.lawyer_id] || 0) + r.rating;
      ratingCounts[r.lawyer_id] = (ratingCounts[r.lawyer_id] || 0) + 1;
    });

    const lawyers = lawyerIds.map(id => {
      const profile = profileMap[id] || {};
      const avg = ratingCounts[id] ? (ratingSums[id] / ratingCounts[id]).toFixed(1) : null;
      return {
        id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        avatar_url: profile.avatar_url || null,
        rut: profile.rut || '',
        email: profile.email || '',
        active_requests: activeCount[id] || 0,
        rating: avg ? parseFloat(avg) : null,
        rating_count: ratingCounts[id] || 0,
      };
    });

    res.json({ lawyers });
  } catch (error) {
    console.error('[Lawyers] Error:', error);
    res.status(500).json({ error: 'Error al obtener abogados' });
  }
});

// ---- Admin API Routes (use service_role from server, never expose to client) ----

app.get('/api/admin/payments', requireAdmin, async (req, res) => {
  try {
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const [paymentsResult, appointmentsResult] = await Promise.all([
      adminClient.from('payments').select('*').order('created_at', { ascending: false }),
      adminClient.from('appointments').select('*').eq('consultation_type', 'paid').eq('status', 'confirmed').is('amount', null).order('created_at', { ascending: false }),
    ]);

    if (paymentsResult.error) throw paymentsResult.error;

    const payments = paymentsResult.data || [];
    const paidAppointments = appointmentsResult.data || [];

    const paymentExternalIds = new Set(payments.map(p => p.external_reference).filter(Boolean));
    const appointmentsWithoutPayments = paidAppointments.filter(a => {
      if (paymentExternalIds.has(a.id.toString())) return false;
      return !payments.some(p => p.user_id === a.user_id && p.amount === a.price);
    });

    const allTransactions = [...payments, ...appointmentsWithoutPayments];

    const userIds = [...new Set(allTransactions.map(p => p.user_id).filter(Boolean))];
    const lawyerIds = [...new Set(allTransactions.map(p => p.lawyer_id).filter(Boolean))];
    const serviceIds = allTransactions.map(p => p.service_id).filter(Boolean);

    const fetchProfiles = async (ids) => {
      const cleanIds = ids.filter(Boolean);
      if (cleanIds.length === 0) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, user_id, email, display_name, first_name, last_name, avatar_url')
        .in('id', cleanIds);
      return (data || []).map(p => ({
        id: p.user_id || p.id,
        email: p.email || '',
        full_name: (p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Usuario'),
        avatar_url: p.avatar_url || ''
      }));
    };

    const fetchServices = async (ids) => {
      if (ids.length === 0) return [];
      const { data } = await supabase.from('services').select('*').in('id', ids);
      return data || [];
    };

    const [usersData, lawyersData, servicesData] = await Promise.all([
      fetchProfiles(userIds),
      fetchProfiles(lawyerIds),
      fetchServices(serviceIds),
    ]);

    const usersMap = new Map(usersData.map(u => [u.id, u]));
    const lawyersMap = new Map(lawyersData.map(l => [l.id, l]));
    const servicesMap = new Map(servicesData.map(s => [s.id, s]));

    const result = allTransactions.map((t, i) => {
      if (t.name && t.email) {
        return {
          id: t.id,
          amount: t.price || 0,
          total_amount: t.price || 0,
          status: 'pending',
          user_id: t.user_id,
          lawyer_id: t.lawyer_id,
          service_id: t.service_id,
          external_reference: null,
          created_at: t.created_at,
          user: { id: t.user_id || `appt_${i}`, email: t.email || '', full_name: t.name || 'Usuario', avatar_url: '' },
          lawyer: lawyersMap.get(t.lawyer_id) || null,
          service: servicesMap.get(t.service_id) || { id: t.service_id, title: t.description || 'Consulta', price: t.price || 0 },
          service_description: t.description || 'Consulta',
          description: t.description || 'Consulta',
        };
      }
      return {
        id: t.id,
        amount: t.amount || 0,
        total_amount: t.total_amount || t.amount || 0,
        status: t.status || 'pending',
        user_id: t.user_id,
        lawyer_id: t.lawyer_id,
        service_id: t.service_id,
        external_reference: t.external_reference || null,
        created_at: t.created_at,
        user: usersMap.get(t.user_id) || { id: t.user_id, email: '', full_name: 'Usuario', avatar_url: '' },
        lawyer: lawyersMap.get(t.lawyer_id) || null,
        service: servicesMap.get(t.service_id) || null,
        service_description: t.service_description || '',
        description: t.description || '',
      };
    });

    res.json(result);
  } catch (error) {
    console.error('[Admin Payments] Error:', error);
    res.status(500).json({ error: 'Error al obtener pagos' });
  }
});

app.get('/api/admin/cae-leads', requireAdmin, async (req, res) => {
  try {
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error } = await adminClient
      .from('contact_messages')
      .select('*')
      .ilike('subject', '%CAE%')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('[Admin CAE Leads] Error:', error);
    res.status(500).json({ error: 'Error al cargar leads CAE' });
  }
});

app.post('/api/admin/trigger-payout', requireAdmin, async (req, res) => {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/process-weekly-payouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ manual_trigger: true }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || response.statusText);
    }
    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    console.error('[Admin Trigger Payout] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---- LegalUp AI — Fase 2: Procesamiento y análisis de documentos ----
// Helper: verifica el Bearer token y devuelve el lawyer_id (o null si 401).
const requireAILawyer = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado', details: 'Token de acceso requerido' });
    return null;
  }
  const userId = await getUserIdFromToken(authHeader.split(' ')[1]);
  if (!userId) {
    res.status(401).json({ error: 'No autorizado', details: 'Token inválido o expirado' });
    return null;
  }
  return userId;
};

const getAIDocumentOwned = async (documentId, userId) => {
  const { data, error } = await supabase
    .from('ai_documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle();
  if (error || !data || data.lawyer_id !== userId) return null;
  const workspace = await getAIWorkspaceOwned(data.workspace_id, userId);
  return hasCanonicalDocumentReference(data, userId, workspace) ? data : null;
};

// 4.56I: linked lawyer_case for notification metadata (owner-scoped; null
// when orphan/unlinked). Lets notification links target the canonical Case
// route instead of overloading `case_id` with a workspace id.
const resolveDocLinkedCaseId = async (userId, workspaceId) => {
  try {
    if (!userId || !workspaceId) return null;
    const { data } = await supabase
      .from('lawyer_cases')
      .select('id')
      .eq('lawyer_id', userId)
      .eq('ai_workspace_id', workspaceId)
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  } catch {
    return null;
  }
};

// Captura de eventos en PostHog (server-side, sin datos jurídicos sensibles).
const capturePostHog = async (event, distinctId, properties = {}) => {
  try {
    const posthogKey = process.env.POSTHOG_PROJECT_API_KEY || process.env.VITE_POSTHOG_KEY;
    if (!posthogKey) return;
    await fetch('https://us.i.posthog.com/capture/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: posthogKey,
        event,
        distinct_id: distinctId,
        properties,
      }),
    });
  } catch (e) {
    console.error('[LegalUpAI] posthog_capture failed', e);
  }
};

const getAILawyerEmail = async (userId) => {
  const { data: userData } = await supabase.auth.admin.getUserById(userId);
  return userData?.user ?? null;
};

// Fila de suscripción AI más reciente del abogado (o null).
const getAILawyerSubscription = async (userId) => {
  const { data, error } = await supabase
    .from('ai_subscriptions')
    .select('*')
    .eq('lawyer_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[LegalUpAI] subscription query error:', error);
    return null;
  }
  return data ?? null;
};

// Decide si el abogado tiene acceso a LegalUp AI (autoridad: base de datos).
//   trialing → acceso hasta trial_ends_at.
//   active   → acceso hasta current_period_end.
//   cancelled→ acceso hasta current_period_end; si el trial sigue vigente
//              (p. ej. checkout abandonado), se conserva el acceso trial.
//   past_due → deuda de pago; se conserva solo si el trial sigue vigente.
//   expired / sin fila → sin acceso.
// 4.44A: resolve the free first-Case identity for lifetime AI allowance.
// Returns { caseId, workspaceId } or null. Authority = pro_free_case_grants
// (durable ledger). Never infers from oldest/active/count. NULL case_id or
// missing workspace = no free AI (fail-closed).
const getFreeCaseAccess = async (userId) => {
  try {
    const { data: grant, error: grantError } = await supabase
      .from('pro_free_case_grants')
      .select('case_id')
      .eq('lawyer_id', userId)
      .maybeSingle();
    if (grantError || !grant?.case_id) return null;
    const { data: c, error: caseError } = await supabase
      .from('lawyer_cases')
      .select('id, ai_workspace_id')
      .eq('id', grant.case_id)
      .eq('lawyer_id', userId)
      .maybeSingle();
    if (caseError || !c?.ai_workspace_id) return null;
    return { caseId: c.id, workspaceId: c.ai_workspace_id };
  } catch {
    return null;
  }
};

const getAILawyerAccess = async (userId) => {
  // 4.58A.5 canonical precedence: PLUS > PRO > LEGACY > FREE. Current paid
  // SaaS (lawyer_subscriptions authority) dominates legacy ai_subscriptions
  // rows; legacy preserves historical compatibility only without paid access.
  // Founder is pricing/badge only and never changes this resolution.
  const proAccess = await getProLawyerAccess(userId);
  if (proAccess.hasAccess) {
    // 4.57D: Plus keeps the paid-tier path (isProLimited) but carries its
    // own plan so quotas/features resolve to Plus allowances, never Pro.
    // Stored Plus rows carry plan='plus' literally (direct comparison:
    // no module import, vm-harness safe).
    const paidPlan = proAccess.subscription?.plan === 'plus' ? 'plus' : 'pro_limited';
    return {
      subscription: proAccess.subscription,
      hasAccess: true,
      status: paidPlan,
      plan: paidPlan,
      isTrialing: false,
      isActive: false,
      isProLimited: true,
      trialDaysRemaining: 0,
      trialEndsAt: null,
      currentPeriodEnd: proAccess.currentPeriodEnd,
      cancelAtPeriodEnd: false,
    };
  }

  const subscription = await getAILawyerSubscription(userId);
  const now = Date.now();
  let hasAccess = false;
  let status = subscription?.status ?? null;
  let trialDaysRemaining = 0;

  if (subscription) {
    const periodEndMs = subscription.current_period_end ? Date.parse(subscription.current_period_end) : 0;
    const trialEndMs = subscription.trial_ends_at ? Date.parse(subscription.trial_ends_at) : 0;
    const withinTrial = trialEndMs > now;

    switch (subscription.status) {
      case 'active':
      case 'cancelled':
        hasAccess = periodEndMs > now || withinTrial;
        if (hasAccess && !(periodEndMs > now)) status = withinTrial ? 'trialing' : 'expired';
        break;
      case 'trialing':
        hasAccess = withinTrial;
        status = withinTrial ? 'trialing' : 'expired';
        if (!withinTrial) {
          try {
            await supabase.from('ai_subscriptions').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', subscription.id);
          } catch { /* no debe romper la lectura */ }
          // Solo se dispara en la transición trial → expired (la actualización
          // previa hace idempotente el evento: la siguiente lectura ya ve 'expired').
          await capturePostHog('ai_subscription_expired', userId, { plan: subscription.plan || null });
        } else {
          // Disparo perezoso del recordatorio de fin de prueba: al consultar el
          // acceso, si toca un hito (3 o 1 día natural), se envía el email y la
          // notificación in-app una sola vez. Idempotente (trial_reminder_day),
          // así que no depende de que exista un cron externo.
          try {
            await sendTrialReminderIfDue(subscription);
          } catch {
            /* nunca romper el acceso por un fallo del reminder */
          }
        }
        break;
      case 'past_due':
        hasAccess = withinTrial;
        break;
      default:
        hasAccess = false;
    }

    if (hasAccess && status === 'trialing') {
      trialDaysRemaining = Math.max(1, Math.ceil((trialEndMs - now) / (24 * 60 * 60 * 1000)));
    }
  }

  // 4.44A: free first-Case lifetime plan (after legacy AI; paid SaaS resolved
  // first at the top of this function).
  // Identity = pro_free_case_grants.case_id (durable ledger); NULL or
  // missing workspace = consumed-but-unidentified = no free AI (fail-closed).
  if (!hasAccess) {
    const freeCase = await getFreeCaseAccess(userId);
    if (freeCase) {
      return {
        subscription: null,
        hasAccess: true,
        status: 'free_case',
        plan: 'free_case',
        isTrialing: false,
        isActive: false,
        isProLimited: false,
        trialDaysRemaining: 0,
        trialEndsAt: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        freeCaseId: freeCase.caseId,
        freeWorkspaceId: freeCase.workspaceId,
      };
    }
  }

  return {
    subscription,
    hasAccess,
    status,
    plan: subscription?.plan ?? null,
    isTrialing: status === 'trialing',
    isActive: status === 'active',
    isProLimited: false,
    trialEndsAt: subscription?.trial_ends_at ?? null,
    trialDaysRemaining,
    currentPeriodEnd: subscription?.current_period_end ?? null,
    cancelAtPeriodEnd: !!subscription?.cancel_at_period_end,
  };
};

// Retorna el acceso o null (402) cuando el abogado no tiene plan activo/trial.
const requireAIAccess = async (userId) => {
  const access = await getAILawyerAccess(userId);
  return access.hasAccess ? access : null;
};

// Período mensual actual (inicio y fin) en formato ISO para ai_usage_monthly.
const getAIUsagePeriod = (now = new Date()) => {
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { periodStart, periodEnd };
};

// Rate limiter por minuto (memoria). Devuelve true si el abogado debe esperar.
const isAIOverRateLimit = (userId) => {
  const now = Date.now();
  const stamps = aiRateLimiter.get(userId) || [];
  const fresh = stamps.filter((t) => now - t < AI_RATE_WINDOW_MS);
  if (fresh.length >= AI_PROTECT_RATE_LIMIT_PER_MINUTE) {
    aiRateLimiter.set(userId, fresh);
    return true;
  }
  aiRateLimiter.set(userId, [...fresh, now]);
  return false;
};

// Valida acceso + límites del trial en un endpoint de IA.
// Devuelve `{ res: null, plan, access }` si todo bien, o `{ res }` con la
// respuesta 402/403/429 ya enviada. `plan` evita reconsultar el acceso para
// decidir cuotas comerciales (4.38C).
const requireAIEntitlement = async (req, res, userId, { metered = true } = {}) => {
  const access = await requireAIAccess(userId);
  if (!access) {
    return {
      res: res.status(402).json({
        error: 'Necesitas un plan activo o una prueba gratuita para usar LegalUp AI.',
        code: 'AI_PLAN_REQUIRED',
      }),
    };
  }
  const plan = getPlanForAccess(access);
  // Resource creation quotas are enforced by ai_enforce_trial_limits on INSERT.
  // Using existing resources never consumes another workspace/document slot.
  if (!metered) return { res: null, plan, access };

  // Límites técnicos de protección (Fase 3.6): rate limit y consumo mensual.
  if (isAIOverRateLimit(userId)) {
    return {
      res: res.status(429).json({
        error: 'Estás haciendo muchas consultas seguidas. Espera un momento e inténtalo de nuevo.',
        code: 'AI_RATE_LIMITED',
      }),
    };
  }

  return { res: null, plan, access };
};

// Monthly quota authority is ai_begin_operation / ai_begin_attempt (transactional,
// fail-closed). Deterministic reads never reserve provider usage.

// ---- LegalUp Pro — entitlement (Fase 3B-1, sin trial) ----
const getProLawyerSubscription = async (userId) => {
  const { data, error } = await supabase
    .from('lawyer_subscriptions')
    .select('*')
    .eq('lawyer_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[LegalUpPro] subscription query error:', error);
    return null;
  }
  return data ?? null;
};

const getProLawyerAccess = async (userId) => {
  const subscription = await getProLawyerSubscription(userId);
  const now = Date.now();
  let hasAccess = false;
  let status = subscription?.status ?? null;
  if (subscription) {
    const periodEndMs = subscription.current_period_end ? Date.parse(subscription.current_period_end) : 0;
    if (subscription.status === 'active') {
      hasAccess = periodEndMs > now;
      if (!hasAccess) status = 'expired';
    } else if (subscription.status === 'cancelled') {
      hasAccess = periodEndMs > now;
    } else if (subscription.status === 'past_due') {
      hasAccess = false;
    } else if (subscription.status === 'pending') {
      hasAccess = false;
    }
  }
  return {
    subscription,
    hasAccess,
    status,
    plan: subscription?.plan ?? null,
    isActive: status === 'active' && hasAccess,
    isCancelled: status === 'cancelled',
    isPastDue: status === 'past_due',
    isExpired: status === 'expired',
    currentPeriodEnd: subscription?.current_period_end ?? null,
  };
};

const requireProAccess = async (userId) => {
  const access = await getProLawyerAccess(userId);
  return access.hasAccess ? access : null;
};

const requireProEntitlement = async (req, res, userId) => {
  const access = await requireProAccess(userId);
  if (!access) {
    return {
      res: res.status(402).json({
        error: 'Necesitas LegalUp Pro activo para usar esta función.',
        code: 'PRO_PLAN_REQUIRED',
      }),
    };
  }
  return { res: null };
};

// POST /api/ai/trial/start — inicia la prueba gratuita (idempotente).
// Autoridad de identidad: backend + BD. NO confía en el frontend.
//   - Exige email confirmado (403 EMAIL_NOT_CONFIRMED).
//   - Exige role='lawyer' server-side (403 NOT_LAWYER).
//   - Un solo trial por lawyer (UNIQUE lawyer_id) y por email (UNIQUE trial_email):
//     aunque se elimine/recree la cuenta o el perfil, el mismo email NO re-obtiene trial.
//   - Race condition: dos inserts simultáneos → uno crea, el otro recibe 409
//     TRIAL_ALREADY_USED (nunca 500 por un conflicto UNIQUE esperado).
app.post('/api/ai/trial/start', async (req, res) => {
  let userId = null;
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;

    // 1) Verificación server-side del usuario auth (email + confirmación).
    const authUser = await getAILawyerEmail(userId);
    if (!authUser) {
      return res.status(401).json({ error: 'No se pudo validar tu sesión.', code: 'AUTH_USER_NOT_FOUND' });
    }
    if (!authUser.email_confirmed_at) {
      return res.status(403).json({
        error: 'Primero confirma tu correo electrónico para activar tu prueba gratuita.',
        code: 'EMAIL_NOT_CONFIRMED',
      });
    }

    // 2) Verificación server-side del rol (misma fuente que RequireLawyer del
    //    frontend: el rol real vive en profiles.role). No se crea un sistema nuevo.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (profileError || !profile) {
      return res.status(403).json({
        error: 'Completa tu perfil de abogado antes de iniciar la prueba gratuita.',
        code: 'NOT_LAWYER',
      });
    }
    if (profile.role !== 'lawyer') {
      return res.status(403).json({
        error: 'La prueba gratuita de LegalUp AI es solo para abogados.',
        code: 'NOT_LAWYER',
      });
    }

    // 4.28C.2: Pro includes AI — block new AI trial for Pro users
    const proAccessForTrial = await getProLawyerAccess(userId);
    if (proAccessForTrial.hasAccess) {
      return res.status(409).json({ error: 'LegalUp AI está incluido en LegalUp Pro.', code: 'AI_INCLUDED_IN_PRO' });
    }

    const existing = await getAILawyerSubscription(userId);

    // Brand-new user without legacy AI history → require Pro, do not create standalone trial
    if (!existing) {
      return res.status(402).json({ error: 'LegalUp AI está incluido en LegalUp Pro. Activa Pro para continuar.', code: 'AI_REQUIRES_PRO', upgradePath: '/pro' });
    }

    // Ya tiene trial o suscripción activa: no duplicar, devolver lo existente.
    if (existing && ['trialing', 'active'].includes(existing.status)) {
      return res.json({ success: true, subscription: existing, already_started: true });
    }

    // Ya utilizó un trial antes (estado terminal con trial_started_at): no permitir otro.
    if (existing && existing.trial_started_at) {
      return res.status(409).json({ error: 'Ya utilizaste tu prueba gratuita.', code: 'TRIAL_ALREADY_USED' });
    }

    const email = normalizeAIEmail(authUser.email);

    // 3) Deduplicación por email: aunque el lawyer_id sea distinto (nueva cuenta),
    //    si ese email ya inició un trial en cualquier cuenta, se bloquea.
    const { data: emailHolder, error: emailCheckError } = await supabase
      .from('ai_subscriptions')
      .select('lawyer_id, trial_started_at')
      .eq('trial_email', email)
      .not('trial_started_at', 'is', null)
      .maybeSingle();
    if (emailCheckError) {
      console.error('[LegalUpAI] trial email dedup check error:', emailCheckError);
    } else if (emailHolder) {
      return res.status(409).json({ error: 'Ya utilizaste tu prueba gratuita con este correo.', code: 'TRIAL_ALREADY_USED' });
    }

    const now = new Date();
    const trialEnd = new Date(Date.now() + AI_SUBSCRIPTION_TRIAL_MS);

    const { data: created, error: insertError } = await supabase
      .from('ai_subscriptions')
      .insert({
        lawyer_id: userId,
        plan: AI_SUBSCRIPTION_PLAN,
        status: 'trialing',
        started_at: now.toISOString(),
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
        trial_email: email,
      })
      .select()
      .single();

    if (insertError) {
      // Race condition o dedup: un conflicto UNIQUE (23505) es esperado cuando
      // dos requests simultáneos intentan crear el mismo trial. Nunca 500.
      if (insertError.code === '23505') {
        const retry = await getAILawyerSubscription(userId);
        if (retry && ['trialing', 'active'].includes(retry.status)) {
          return res.json({ success: true, subscription: retry, already_started: true });
        }
        return res.status(409).json({ error: 'Ya utilizaste tu prueba gratuita.', code: 'TRIAL_ALREADY_USED' });
      }
      console.error('[LegalUpAI] trial start error:', insertError);
      return res.status(500).json({ error: 'No se pudo iniciar la prueba gratuita.' });
    }

    await capturePostHog('ai_trial_started', userId, {
      plan: AI_SUBSCRIPTION_PLAN,
      trial_days: AI_SUBSCRIPTION_TRIAL_DAYS,
    });

    const userData = await getAILawyerEmail(userId);
    if (userData?.email) {
      await sendAIEmail(
        userData.email,
        'Tu prueba de LegalUp AI ya está activa',
        aiSubscriptionEmailTemplates.trialStarted()
      );
    }

    res.json({ success: true, subscription: created, already_started: false });
  } catch (error) {
    console.error('[LegalUpAI] trial start error:', error);
    res.status(500).json({ error: 'No se pudo iniciar la prueba gratuita.' });
  }
});

// POST /api/ai/subscribe — crea el preapproval recurrente en Mercado Pago.
// 4.28C.2: Pro is single paid product. New standalone AI subscriptions disabled.
app.post('/api/ai/subscribe', async (req, res) => {
  let userId = null;
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;

    // Pro includes AI — block new AI purchase for Pro users
    const proAccess = await getProLawyerAccess(userId);
    if (proAccess.hasAccess) {
      return res.status(409).json({ error: 'LegalUp AI está incluido en LegalUp Pro.', code: 'AI_INCLUDED_IN_PRO' });
    }

    const subscription = await getAILawyerSubscription(userId);
    if (!subscription) {
      return res.status(402).json({ error: 'LegalUp AI está incluido en LegalUp Pro. Activa Pro para continuar.', code: 'AI_REQUIRES_PRO', upgradePath: '/pro' });
    }

    // Legacy exists — prevent duplicate active/pending
    if (subscription.status === 'active' && subscription.provider_subscription_id) {
      return res.status(409).json({ error: 'Ya tienes una suscripción activa.', code: 'ALREADY_SUBSCRIBED' });
    }
    if (subscription.status === 'pending' && subscription.provider_subscription_id) {
      return res.status(409).json({ error: 'Ya tienes una suscripción pendiente de aprobación.', code: 'AI_SUBSCRIPTION_PENDING' });
    }
    if (subscription.status === 'trialing') {
      const trialEndMs = subscription.trial_ends_at ? Date.parse(subscription.trial_ends_at) : 0;
      if (trialEndMs > Date.now()) {
        return res.status(409).json({ error: 'Tu prueba gratuita está activa.', code: 'AI_TRIAL_ACTIVE' });
      }
    }
    // Expired legacy without Pro → require Pro, do not create new AI
    const trialEndMs2 = subscription.trial_ends_at ? Date.parse(subscription.trial_ends_at) : 0;
    const periodEndMs2 = subscription.current_period_end ? Date.parse(subscription.current_period_end) : 0;
    const withinTrial2 = trialEndMs2 > Date.now();
    const hasLegacyAccess = (subscription.status === 'active' && periodEndMs2 > Date.now()) || (subscription.status === 'trialing' && withinTrial2) || (subscription.status === 'cancelled' && (periodEndMs2 > Date.now() || withinTrial2));
    if (!hasLegacyAccess) {
      return res.status(402).json({ error: 'LegalUp AI está incluido en LegalUp Pro. Activa Pro para continuar.', code: 'AI_REQUIRES_PRO', upgradePath: '/pro' });
    }
    // Legacy has valid access — do not create another subscription
    return res.status(409).json({ error: 'Ya tienes acceso a LegalUp AI.', code: 'AI_SUBSCRIPTION_ALREADY_EXISTS' });

    const preapprovalData = {
      reason: 'LegalUp AI - Suscripción mensual',
      external_reference: `${AI_EXTERNAL_REF_PREFIX}${userId}`,
      payer_email: userData?.email || '',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: AI_SUBSCRIPTION_PRICE_CLP,
        currency_id: 'CLP',
        start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      back_url: (() => {
        const base = appUrl || 'https://legalup.cl';
        if (base.includes('localhost')) return 'https://legalup.cl';
        return `${base}/lawyer/ai?ai_subscription_success=true`;
      })(),
      status: 'pending',
    };

    const webhookUrl = resolveWebhookUrl(req);
    if (webhookUrl) preapprovalData.notification_url = webhookUrl;

    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mercadopagoAccessToken}`,
      },
      body: JSON.stringify(preapprovalData),
    });

    const mpResult = await mpResponse.json();
    if (!mpResponse.ok) {
      console.error('[LegalUpAI] MP preapproval error:', mpResult);
      return res.status(500).json({ error: 'No se pudo iniciar el cobro en Mercado Pago.', details: mpResult });
    }

    // Se conserva el acceso trial hasta que el webhook marque 'active'.
    await supabase
      .from('ai_subscriptions')
      .update({
        provider: 'mercadopago',
        provider_subscription_id: String(mpResult.id),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    await capturePostHog('ai_subscription_checkout_started', userId, {
      price_clp: AI_SUBSCRIPTION_PRICE_CLP,
      preapproval_id: String(mpResult.id),
    });

    res.json({
      success: true,
      subscription_id: subscription.id,
      preapproval_id: String(mpResult.id),
      initPoint: mpResult.init_point || mpResult.sandbox_init_point,
    });
  } catch (error) {
    console.error('[LegalUpAI] subscribe error:', error);
    res.status(500).json({ error: 'No se pudo procesar la suscripción.' });
  }
});

// POST /api/ai/subscription/cancel — baja a fin de período (conserva acceso).
app.post('/api/ai/subscription/cancel', async (req, res) => {
  let userId = null;
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;

    const subscription = await getAILawyerSubscription(userId);
    if (!subscription) {
      return res.status(409).json({ error: 'No tienes una suscripción activa.', code: 'NOT_ACTIVE' });
    }
    if (subscription.status === 'cancelled') {
      return res.json({ success: true, cancel_at_period_end: true, already_cancelled: true });
    }
    if (subscription.status !== 'active') {
      return res.status(409).json({ error: 'No tienes una suscripción activa.', code: 'NOT_ACTIVE' });
    }

    if (subscription.provider_subscription_id) {
      const { cancelMpPreapproval, reconcileMpPreapprovalStatus } = await import('./server/subscriptions/cancelSubscription.mjs');
      const mpResult = await cancelMpPreapproval({ preapprovalId: subscription.provider_subscription_id, accessToken: mercadopagoAccessToken });
      if (!mpResult.ok) {
        if (mpResult.alreadyCancelledHint) {
          const recon = await reconcileMpPreapprovalStatus({ preapprovalId: subscription.provider_subscription_id, accessToken: mercadopagoAccessToken });
          if (!recon.cancelled) {
            console.error('[LegalUpAI] MP cancel error (provider not cancelled):', { providerId: subscription.provider_subscription_id, status: mpResult.status, body: mpResult.body });
            return res.status(502).json({ error: 'No se pudo cancelar en el proveedor, intenta nuevamente.', code: 'PROVIDER_ERROR', provider_status: mpResult.status });
          }
          console.log('[LegalUpAI] MP already cancelled, reconciling local to cancelled', { providerId: subscription.provider_subscription_id });
        } else {
          const isNetwork = mpResult.networkError;
          console.error('[LegalUpAI] MP cancel error:', { flow: 'AI', providerId: subscription.provider_subscription_id, status: mpResult.status, networkError: !!isNetwork, body: mpResult.body ? JSON.stringify(mpResult.body).slice(0, 500) : null });
          return res.status(502).json({ error: isNetwork ? 'No se pudo contactar al proveedor, intenta nuevamente.' : 'No se pudo cancelar en el proveedor, intenta nuevamente.', code: isNetwork ? 'PROVIDER_UNREACHABLE' : 'PROVIDER_ERROR', provider_status: mpResult.status || undefined });
        }
      }
    }

    const now = new Date();
    await supabase
      .from('ai_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: now.toISOString(),
        cancel_at_period_end: true,
        updated_at: now.toISOString(),
      })
      .eq('id', subscription.id);

    await capturePostHog('ai_subscription_cancelled', userId, {
      price_clp: AI_SUBSCRIPTION_PRICE_CLP,
    });

    const userData = await getAILawyerEmail(userId);
    if (userData?.email) {
      await sendAIEmail(
        userData.email,
        'Tu suscripción de LegalUp AI fue cancelada',
        aiSubscriptionEmailTemplates.cancelled(
          subscription.current_period_end
            ? new Date(subscription.current_period_end).toLocaleDateString('es-CL')
            : ''
        )
      );
    }

    res.json({ success: true, cancel_at_period_end: true });
  } catch (error) {
    console.error('[LegalUpAI] cancel subscription error:', error);
    res.status(500).json({ error: 'No se pudo cancelar la suscripción.' });
  }
});

// ---- LegalUp Pro — endpoints (Fase 3B-1, Founder 15) ----
app.get('/api/pro/subscription', async (req, res) => {
  try {
    const userId = await requireAILawyer(req, res);
    if (!userId) return;
    const access = await getProLawyerAccess(userId);
    res.json({ hasProAccess: access.hasAccess, status: access.status, subscription: access.subscription });
  } catch (e) {
    console.error('[LegalUpPro] get subscription error:', e);
    res.status(500).json({ error: 'No se pudo obtener la suscripción Pro.' });
  }
});

// 4.32B.4 — read-only checkout preview. NEVER reserves a slot and NEVER sets
// a price: the POST /api/pro/subscribe reservation is the only authority.
// Display-only hint so the modal can show the correct price track.
app.get('/api/pro/founder-status', async (req, res) => {
  try {
    const userId = await requireAILawyer(req, res);
    if (!userId) return;
    const { decideCheckoutPrice } = await import('./server/proFounder.mjs');
    const [{ data: prof }, lifetimeRes, capRes] = await Promise.all([
      supabase.from('profiles').select('is_founder').eq('id', userId).maybeSingle(),
      supabase.from('pro_subscription_payments').select('id', { count: 'exact', head: true }).eq('lawyer_id', userId).eq('status', 'approved'),
      supabase.rpc('pro_founder_capacity'),
    ]);
    // If the capacity helper is missing (older DB), fall back to standard.
    let remaining = 0;
    if (!capRes?.error && capRes?.data) {
      const row = Array.isArray(capRes.data) ? capRes.data[0] : capRes.data;
      remaining = Number(row?.remaining ?? 0) || 0;
    }
    const isFounder = prof?.is_founder === true;
    const lifetimeApproved = lifetimeRes?.count ?? 0;
    // Preview only: assume a slot is available when capacity remains.
    const previewPrice = decideCheckoutPrice({
      isFounder,
      lifetimeApproved,
      reservation: !isFounder && remaining > 0 ? 'reserved' : 'standard_no_slot',
    });
    res.json({
      isFounder,
      founderSlotsRemaining: remaining,
      previewPriceClp: previewPrice,
      introPriceClp: PRO_INTRO_PRICE_CLP,
      standardPriceClp: PRO_STANDARD_PRICE_CLP,
    });
  } catch (e) {
    console.error('[LegalUpPro] founder-status error:', e);
    res.status(500).json({ error: 'No se pudo obtener el estado Founder.' });
  }
});

// ---- LegalUp Plus v1 (4.57D) — upgrade/downgrade transition authority ----
// Mercado Pago and Supabase share no transaction: explicit persisted state
// (pending_plan / plan_change_status / effective_at / provider ids) on
// lawyer_subscriptions, never faked atomicity. Pro access is never removed
// before Plus confirms authoritative; Plus access never granted from a
// redirect — only from trusted provider/server conditions.

// Retry/cleanup for a retired Pro preapproval after a confirmed upgrade.
// Keeps previous_provider_subscription_id set on failure → visibly
// incomplete + retried on later webhook events (never silently dropped).
const retryOldProCancel = async (subscription) => {
  const oldId = subscription?.previous_provider_subscription_id;
  if (!subscription || !oldId) return subscription;
  if (subscription.plan !== 'plus') return subscription;
  try {
    const { cancelMpPreapproval } = await import('./server/subscriptions/cancelSubscription.mjs');
    const cancelled = await cancelMpPreapproval({ preapprovalId: oldId, accessToken: mercadopagoAccessToken });
    if (cancelled.ok || cancelled.alreadyCancelledHint) {
      const { data } = await supabase.from('lawyer_subscriptions').update({ previous_provider_subscription_id: null, updated_at: new Date().toISOString() }).eq('id', subscription.id).select().single();
      return data ?? { ...subscription, previous_provider_subscription_id: null };
    }
    console.error('[LegalUpPlus] old Pro preapproval cancel failed (will retry)', { subscription_id: subscription.id, provider_id: oldId });
  } catch (e) {
    console.error('[LegalUpPlus] old Pro cancel threw (will retry)', e?.message || e);
  }
  return subscription;
};

// Completes a Pro→Plus upgrade once the Plus preapproval is confirmed
// (authorized/active) by a trusted source. Fail-closed on amount mismatch:
// Plus activates ONLY at exactly 79.990. Never touches Founder state.
const completePlusUpgrade = async (subscription, mpPreapproval) => {
  try {
    const amount = Number(mpPreapproval?.auto_recurring?.transaction_amount ?? mpPreapproval?.transaction_amount ?? 0);
    if (amount !== PLUS_SUBSCRIPTION_PRICE_CLP) {
      console.error('[LegalUpPlus] upgrade amount mismatch, refusing activation', { subscription_id: subscription?.id, amount });
      return { ok: false, reason: 'AMOUNT_MISMATCH' };
    }
    const { derivePeriodFromProvider } = await import('./server/subscriptions/subscriptionEvents.mjs');
    const derived = derivePeriodFromProvider(mpPreapproval);
    if (!derived) return { ok: false, reason: 'NO_PERIOD' };
    const now = new Date();
    const { data, error } = await supabase.from('lawyer_subscriptions').update({
      plan: 'plus',
      status: 'active',
      amount_clp: PLUS_SUBSCRIPTION_PRICE_CLP,
      current_period_start: derived.start.toISOString(),
      current_period_end: derived.end.toISOString(),
      provider_subscription_id: String(mpPreapproval.id),
      cancel_at_period_end: false,
      cancelled_at: null,
      pending_plan: null,
      plan_change_status: null,
      plan_change_effective_at: null,
      pending_provider_subscription_id: null,
      pending_init_point: null,
      updated_at: now.toISOString(),
    }).eq('id', subscription.id).select().single();
    if (error) throw error;
    await retryOldProCancel(data);
    try { await capturePostHog('plus_upgrade_completed', subscription.lawyer_id, { from_plan: 'pro', target_plan: 'plus', price_clp: PLUS_SUBSCRIPTION_PRICE_CLP }); } catch {}
    return { ok: true, subscription: data };
  } catch (e) {
    console.error('[LegalUpPlus] complete upgrade failed', e?.message || e);
    return { ok: false, reason: 'DB_ERROR' };
  }
};

// Applies a due Plus→Pro scheduled downgrade: provider-first PUT to the Pro
// price (proven mechanism), then canonical plan flip. Founder history
// preserved — returning price follows historical Pro intro count, never
// restarts the discounted cycle. Failure keeps the schedule for retry.
const maybeApplyScheduledDowngrade = async (subscription) => {
  try {
    if (!subscription || subscription.plan !== 'plus') return subscription;
    if (subscription.plan_change_status !== 'downgrade_scheduled' || subscription.pending_plan !== 'pro') return subscription;
    const eff = subscription.plan_change_effective_at ? Date.parse(subscription.plan_change_effective_at) : NaN;
    if (Number.isNaN(eff) || Date.now() < eff) return subscription;
    const { decideCheckoutPrice } = await import('./server/proFounder.mjs');
    const [{ data: prof }, lifetimeRes] = await Promise.all([
      supabase.from('profiles').select('is_founder').eq('id', subscription.lawyer_id).maybeSingle(),
      supabase.from('pro_subscription_payments').select('id', { count: 'exact', head: true }).eq('lawyer_id', subscription.lawyer_id).eq('status', 'approved').or('plan.is.null,plan.eq.pro'),
    ]);
    const proPrice = decideCheckoutPrice({ isFounder: prof?.is_founder === true, lifetimeApproved: lifetimeRes?.count ?? 0, reservation: null });
    if (subscription.provider_subscription_id) {
      const put = await fetch(`https://api.mercadopago.com/preapproval/${subscription.provider_subscription_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mercadopagoAccessToken}` },
        body: JSON.stringify({ auto_recurring: { transaction_amount: proPrice, currency_id: 'CLP' } }),
      });
      if (!put.ok) {
        console.error('[LegalUpPlus] downgrade PUT failed (schedule kept for retry)', { subscription_id: subscription.id, status: put.status });
        return subscription;
      }
    }
    const now = new Date();
    const { data, error } = await supabase.from('lawyer_subscriptions').update({
      plan: PRO_SUBSCRIPTION_PLAN,
      amount_clp: proPrice,
      pending_plan: null,
      plan_change_status: null,
      plan_change_effective_at: null,
      updated_at: now.toISOString(),
    }).eq('id', subscription.id).select().single();
    if (error) throw error;
    try { await capturePostHog('plus_downgrade_completed', subscription.lawyer_id, { from_plan: 'plus', target_plan: 'pro', price_clp: proPrice }); } catch {}
    return data;
  } catch (e) {
    console.error('[LegalUpPlus] scheduled downgrade failed (kept for retry)', e?.message || e);
    return subscription;
  }
};

app.post('/api/pro/subscribe', async (req, res) => {
  let userId = null;
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;

    // 4.57D multi-tier checkout: plan=pro (default, backward compatible) or
    // plan=plus. Anything else fails closed HERE, before founder reservation,
    // MP calls or DB writes. Client-supplied price/amount/discount/quota are
    // never read: the server resolves price from the plan catalog + user.
    const checkoutPlan = resolveCheckoutPlanCode(req.body);
    if (!checkoutPlan.ok) {
      return res.status(400).json({ error: 'Plan no disponible.', code: PLAN_NOT_AVAILABLE });
    }
    const targetPlan = checkoutPlan.planCode; // 'pro' | 'plus'
    const isPlusTarget = targetPlan === 'plus';

    // 4.57E kill switch: block NEW Plus checkouts/upgrades at the gate,
    // before any side effect. Existing Plus access, renewals, downgrades,
    // cancellations and all of Pro are unaffected.
    if (isPlusTarget && !isPlusAcquisitionEnabled()) {
      return res.status(403).json({ error: 'La contratación de LegalUp Plus está pausada temporalmente.', code: PLUS_ACQUISITION_DISABLED });
    }

    let subscription = await getProLawyerSubscription(userId);
    const hasActivePaid = !!(subscription && subscription.status === 'active' && subscription.provider_subscription_id);
    const currentPaidPlan = subscription ? canonicalPaidPlan(subscription) : null;

    // 4.57D upgrade path (P0): active Pro + target Plus. NEVER naive
    // cancel-then-create: Pro access stays intact until Plus is confirmed
    // authoritative (§31). Same-tier re-checkout keeps existing 409 semantics.
    const isUpgrade = isPlusTarget && hasActivePaid && currentPaidPlan === 'pro';
    if (hasActivePaid && !isUpgrade) {
      const alreadyMsg = currentPaidPlan === 'plus'
        ? 'Ya tienes una suscripción Plus activa.'
        : 'Ya tienes una suscripción Pro activa.';
      return res.status(409).json({ error: alreadyMsg, code: 'ALREADY_SUBSCRIBED' });
    }

    // Upgrade resume (idempotency §33): a pending upgrade reuses its stored
    // checkout instead of creating a duplicate Plus preapproval.
    if (isUpgrade && subscription.plan_change_status === 'upgrade_pending' && subscription.pending_provider_subscription_id) {
      try {
        const mpCheck = await fetch(`https://api.mercadopago.com/preapproval/${subscription.pending_provider_subscription_id}`, {
          headers: { Authorization: `Bearer ${mercadopagoAccessToken}` },
        });
        const mpData = await mpCheck.json().catch(() => ({}));
        if (mpCheck.ok) {
          const mpStatus = (mpData.status || '').toLowerCase();
          if (['authorized', 'active'].includes(mpStatus)) {
            const completed = await completePlusUpgrade(subscription, mpData);
            if (completed.ok) {
              return res.json({ success: true, already_active: true, status: 'active', plan: 'plus', provider_status: mpStatus });
            }
          }
          if (mpStatus === 'pending' && subscription.pending_init_point) {
            return res.json({ success: true, pending_checkout: true, upgrade: true, initPoint: subscription.pending_init_point, preapproval_id: subscription.pending_provider_subscription_id, provider_status: mpStatus });
          }
          if (!['cancelled', 'rejected', 'expired'].includes(mpStatus) && mpStatus !== 'pending') {
            return res.status(502).json({ error: 'No se pudo verificar el estado con Mercado Pago, intenta nuevamente.', code: 'PROVIDER_ERROR', provider_status: mpCheck.status });
          }
          // cancelled/rejected/expired (or pending without URL) → fall through and create a fresh Plus preapproval.
        }
      } catch {
        return res.status(503).json({ error: 'No se pudo contactar a Mercado Pago, intenta nuevamente.', code: 'PROVIDER_UNREACHABLE' });
      }
    }

    // Founder 15 check — server-side, counts active/pending founder slots.
    // Plus NEVER participates: no reservation, no slot, no intro price.
    const { count: founderCount } = await supabase
      .from('lawyer_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('is_founder', true)
      .in('status', ['pending', 'active']);

    const isFounderSlot = (founderCount ?? 0) < PRO_FOUNDER_LIMIT;
    // Pending with provider id: intentar reconciliar o reutilizar checkout
    if (subscription && subscription.status === 'pending' && subscription.provider_subscription_id) {
      try {
        const mpCheck = await fetch(`https://api.mercadopago.com/preapproval/${subscription.provider_subscription_id}`, {
          headers: { Authorization: `Bearer ${mercadopagoAccessToken}` },
        });
        const mpData = await mpCheck.json().catch(() => ({}));
        if (mpCheck.ok) {
          const mpStatus = (mpData.status || '').toLowerCase();
          if (['authorized', 'active'].includes(mpStatus)) {
            const { derivePeriodFromProvider } = await import('./server/subscriptions/subscriptionEvents.mjs');
            const derived = derivePeriodFromProvider(mpData);
            if (!derived) {
              return res.status(409).json({ error: 'Suscripción autorizada pero sin periodo válido, contacta soporte.', code: 'RECONCILIATION_PENDING' });
            }
            await supabase.from('lawyer_subscriptions').update({ status: 'active', current_period_start: derived.start.toISOString(), current_period_end: derived.end.toISOString(), updated_at: new Date().toISOString() }).eq('id', subscription.id);
            return res.json({ success: true, already_active: true, status: 'active', provider_status: mpStatus });
          }
          if (mpStatus === 'pending' && (mpData.init_point || mpData.sandbox_init_point)) {
            return res.json({ success: true, pending_checkout: true, initPoint: mpData.init_point || mpData.sandbox_init_point, preapproval_id: subscription.provider_subscription_id, provider_status: mpStatus });
          }
          // cancelled/rejected/expired → permitir nuevo intento (continuar flujo)
          if (['cancelled', 'rejected', 'expired'].includes(mpStatus)) {
            // continuar a crear nuevo preapproval
          } else if (mpStatus === 'pending') {
            // pending sin init_point → continuar a crear nuevo
          }
        } else {
          // MP respondió con error no terminal (4xx/5xx sin status claro) → no crear duplicado
          return res.status(502).json({ error: 'No se pudo verificar el estado con Mercado Pago, intenta nuevamente.', code: 'PROVIDER_ERROR', provider_status: mpCheck.status });
        }
      } catch {
        return res.status(503).json({ error: 'No se pudo contactar a Mercado Pago, intenta nuevamente.', code: 'PROVIDER_UNREACHABLE' });
      }
      // si MP unreachable, mantener pending y no otorgar acceso, permitir retry si quiere pero no bloquear
    }

    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'https://legalup.cl';

    // 4.57D price authority. Pro: certified Founder/standard resolver
    // (intro-payment count reads PRO-plan payments only — Plus payments
    // never advance the Founder counter). Plus: fixed 79.990, founder-blind.
    const { decideCheckoutPrice, PRO_FOUNDER_RESERVATION_TTL_SECONDS } = await import('./server/proFounder.mjs');
    let initialPrice = PRO_STANDARD_PRICE_CLP;
    let founderTrack = false;
    if (isPlusTarget) {
      initialPrice = resolvePlanPrice({ planCode: 'plus' }).amountClp;
    } else try {
      const [{ data: prof }, lifetimeRes, reservRes] = await Promise.all([
        supabase.from('profiles').select('is_founder').eq('id', userId).maybeSingle(),
        supabase.from('pro_subscription_payments').select('id', { count: 'exact', head: true }).eq('lawyer_id', userId).eq('status', 'approved').or('plan.is.null,plan.eq.pro'),
        supabase.rpc('reserve_pro_founder_slot', { p_lawyer_id: userId, p_ttl_seconds: PRO_FOUNDER_RESERVATION_TTL_SECONDS }),
      ]);
      const isFounder = prof?.is_founder === true;
      const lifetimeApproved = lifetimeRes?.count ?? 0;
      const reservation = typeof reservRes?.data === 'string' ? reservRes.data : null;
      // Reservation is authoritative for non-Founders; founders use intro-count.
      // If the lawyer is already a Founder, a concurrent reservation row (if any)
      // is harmless: claim path treats them as already_founder.
      initialPrice = decideCheckoutPrice({ isFounder, lifetimeApproved, reservation });
      founderTrack = isFounder || reservation === 'reserved' || reservation === 'already_founder';
    } catch {
      initialPrice = PRO_STANDARD_PRICE_CLP; // fail-closed: never promise a discount we cannot honor
      founderTrack = false;
    }

    if (!subscription) {
      const { data, error } = await supabase
        .from('lawyer_subscriptions')
        .insert({
          lawyer_id: userId,
          plan: isPlusTarget ? 'plus' : PRO_SUBSCRIPTION_PLAN,
          status: 'pending',
          provider: 'mercadopago',
          amount_clp: initialPrice,
          // 4.57D: a new Plus row NEVER takes a Founder slot. The permanent
          // badge lives in profiles.is_founder (earned only via Pro payments).
          is_founder: isPlusTarget ? false : isFounderSlot,
        })
        .select()
        .single();
      if (error) throw error;
      subscription = data;
    } else if (isUpgrade) {
      // Upgrade staging: Pro row untouched (plan/amount/provider stay Pro)
      // until the Plus preapproval confirms. Only transition state mutates.
      const { data, error } = await supabase
        .from('lawyer_subscriptions')
        .update({
          pending_plan: 'plus',
          plan_change_status: 'upgrade_pending',
          plan_change_effective_at: null,
          previous_provider_subscription_id: subscription.provider_subscription_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id)
        .select()
        .single();
      if (error) throw error;
      subscription = data;
    } else {
      // Reactivar pending/cancelled/expired — actualizar amount según lifetime intro
      const { data, error } = await supabase
        .from('lawyer_subscriptions')
        .update({
          plan: isPlusTarget ? 'plus' : PRO_SUBSCRIPTION_PLAN,
          status: 'pending',
          amount_clp: initialPrice,
          // Existing rows keep their earned is_founder value; only fresh
          // Pro rows may take a free slot. Plus never flips it to true here
          // (a historical Founder keeps true; anyone else stays as-is).
          is_founder: isPlusTarget ? subscription.is_founder : isFounderSlot,
          pending_plan: null,
          plan_change_status: null,
          plan_change_effective_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id)
        .select()
        .single();
      if (error) throw error;
      subscription = data;
    }

    const userData = await getAILawyerEmail(userId);
    const preapprovalData = {
      reason: isPlusTarget ? 'LegalUp Plus - Suscripción mensual' : 'LegalUp Pro - Suscripción mensual',
      external_reference: `${isPlusTarget ? PLUS_EXTERNAL_REF_PREFIX : PRO_EXTERNAL_REF_PREFIX}${userId}`,
      payer_email: userData?.email || '',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: initialPrice,
        currency_id: 'CLP',
        start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      back_url: (() => {
        const base = appUrl || 'https://legalup.cl';
        if (base.includes('localhost')) return 'https://legalup.cl';
        return `${base}/lawyer/dashboard?pro_subscription_success=true`;
      })(),
      status: 'pending',
    };
    const webhookUrl = resolveWebhookUrl(req);
    if (webhookUrl) preapprovalData.notification_url = webhookUrl;

    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mercadopagoAccessToken}` },
      body: JSON.stringify(preapprovalData),
    });
    const mpResult = await mpResponse.json();
    if (!mpResponse.ok) {
      console.error('[LegalUpPro] MP preapproval error:', mpResult);
    // 4.32B.4: MP failure → release our reservation so retry can re-reserve.
    // Only releases holds without an attached provider subscription.
    // Plus never reserves (no Founder path), so this is Pro-only by construction.
    try {
      if (!isPlusTarget) {
        await supabase.from('pro_founder_reservations').delete().eq('lawyer_id', userId).is('provider_subscription_id', null);
      }
      // A failed upgrade checkout must not strand transition state: a retry
      // creates a fresh preapproval, so clear a stale pending link only when
      // none was stored yet (stored links are resumed, never orphaned).
      if (isUpgrade && !subscription.pending_provider_subscription_id) {
        await supabase.from('lawyer_subscriptions').update({ pending_plan: null, plan_change_status: null, previous_provider_subscription_id: null, updated_at: new Date().toISOString() }).eq('id', subscription.id);
      }
    } catch {}
      return res.status(500).json({ error: 'No se pudo iniciar el cobro en Mercado Pago.', details: mpResult });
    }

    await supabase.from('lawyer_subscriptions').update(
      isUpgrade
        ? { pending_provider_subscription_id: String(mpResult.id), pending_init_point: mpResult.init_point || mpResult.sandbox_init_point || null, updated_at: new Date().toISOString() }
        : { provider_subscription_id: String(mpResult.id), updated_at: new Date().toISOString() }
    ).eq('id', subscription.id);
    // Attach provider subscription to our reservation (abandonment tracking).
    try {
      await supabase.from('pro_founder_reservations').update({ provider_subscription_id: String(mpResult.id) }).eq('lawyer_id', userId);
    } catch {}

    await capturePostHog(isPlusTarget ? 'plus_upgrade_started' : 'pro_subscription_checkout_started', userId, { price_clp: initialPrice, founder_track: founderTrack, preapproval_id: String(mpResult.id), is_founder: isFounderSlot, ...(isUpgrade ? { from_plan: 'pro', target_plan: 'plus' } : {}) });

    res.json({ success: true, subscription_id: subscription.id, preapproval_id: String(mpResult.id), initPoint: mpResult.init_point || mpResult.sandbox_init_point, is_founder: isFounderSlot, initial_price_clp: initialPrice, founder_track: founderTrack, plan: targetPlan, ...(isUpgrade ? { upgrade: true, from_plan: 'pro', target_plan: 'plus', immediate: true, prorated_credit: false } : {}) });
  } catch (error) {
    console.error('[LegalUpPro] subscribe error:', error);
    res.status(500).json({ error: 'No se pudo procesar la suscripción.' });
  }
});

// 4.57D: canonical subscription read for settings UI (plan mapping,
// transition state, effective dates). Server-computed; RLS owner-select
// already exposes the row, this adds canonical semantics only.
app.get('/api/pro/subscription', async (req, res) => {
  try {
    const userId = await requireAILawyer(req, res);
    if (!userId) return;
    let subscription = await getProLawyerSubscription(userId);
    if (!subscription) return res.json({ success: true, subscription: null });
    subscription = await maybeApplyScheduledDowngrade(subscription) ?? subscription;
    const plan = canonicalPaidPlan(subscription);
    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        plan,
        status: subscription.status,
        amount_clp: subscription.amount_clp,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        is_founder: !!subscription.is_founder,
        cancel_at_period_end: !!subscription.cancel_at_period_end,
        pending_plan: subscription.pending_plan ?? null,
        plan_change_status: subscription.plan_change_status ?? null,
        plan_change_effective_at: subscription.plan_change_effective_at ?? null,
        old_pro_cancel_pending: !!subscription.previous_provider_subscription_id,
      },
    });
  } catch (error) {
    console.error('[LegalUpPlus] subscription read error:', error);
    res.status(500).json({ error: 'No se pudo leer la suscripción.' });
  }
});

// 4.57D: Plus → Pro scheduled downgrade. Effective at the Plus period end —
// Plus limits stay fully active until then. Persisted server-side (never
// browser state). No data deletion, ever; over-capacity becomes write-blocked
// at the effective date via the plan-aware triggers/quotas.
app.post('/api/pro/downgrade', async (req, res) => {
  try {
    const userId = await requireAILawyer(req, res);
    if (!userId) return;
    const bodyPlan = typeof req.body?.target_plan === 'string' ? req.body.target_plan : 'pro';
    if (normalizePlanCode(bodyPlan) !== 'pro') {
      return res.status(400).json({ error: 'Destino de downgrade no válido.', code: PLAN_NOT_AVAILABLE });
    }
    let subscription = await getProLawyerSubscription(userId);
    if (!subscription) return res.status(409).json({ error: 'No tienes una suscripción activa.', code: 'NOT_ACTIVE' });
    subscription = await maybeApplyScheduledDowngrade(subscription) ?? subscription;
    if (canonicalPaidPlan(subscription) !== 'plus' || subscription.status !== 'active') {
      return res.status(409).json({ error: 'El downgrade programado requiere Plus activo.', code: 'NOT_PLUS_ACTIVE' });
    }
    if (subscription.plan_change_status === 'upgrade_pending') {
      return res.status(409).json({ error: 'Hay un upgrade en curso. Intenta nuevamente cuando se complete.', code: 'TRANSITION_IN_PROGRESS' });
    }
    if (!subscription.current_period_end || Number.isNaN(Date.parse(subscription.current_period_end))) {
      return res.status(409).json({ error: 'No se pudo determinar el fin del período. Intenta más tarde.', code: 'NO_PERIOD' });
    }
    if (subscription.plan_change_status === 'downgrade_scheduled') {
      return res.json({ success: true, already_scheduled: true, effective_at: subscription.plan_change_effective_at, target_plan: 'pro' });
    }
    const { data, error } = await supabase.from('lawyer_subscriptions').update({
      pending_plan: 'pro',
      plan_change_status: 'downgrade_scheduled',
      plan_change_effective_at: subscription.current_period_end,
      updated_at: new Date().toISOString(),
    }).eq('id', subscription.id).select().single();
    if (error) throw error;
    try { await capturePostHog('plus_downgrade_scheduled', userId, { from_plan: 'plus', target_plan: 'pro', effective_at: data.plan_change_effective_at }); } catch {}
    res.json({ success: true, scheduled: true, effective_at: data.plan_change_effective_at, target_plan: 'pro' });
  } catch (error) {
    console.error('[LegalUpPlus] downgrade schedule error:', error);
    res.status(500).json({ error: 'No se pudo programar el downgrade.' });
  }
});

// 4.57D: cancel a scheduled Plus → Pro downgrade (safe while not yet effective).
app.post('/api/pro/downgrade/cancel', async (req, res) => {
  try {
    const userId = await requireAILawyer(req, res);
    if (!userId) return;
    const subscription = await getProLawyerSubscription(userId);
    if (!subscription || subscription.plan_change_status !== 'downgrade_scheduled') {
      return res.json({ success: true, nothing_scheduled: true });
    }
    const { error } = await supabase.from('lawyer_subscriptions').update({
      pending_plan: null, plan_change_status: null, plan_change_effective_at: null, updated_at: new Date().toISOString(),
    }).eq('id', subscription.id);
    if (error) throw error;
    res.json({ success: true, cancelled: true });
  } catch (error) {
    console.error('[LegalUpPlus] downgrade unschedule error:', error);
    res.status(500).json({ error: 'No se pudo cancelar el downgrade programado.' });
  }
});

app.post('/api/pro/subscription/cancel', async (req, res) => {
  let userId = null;
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;
    let subscription = await getProLawyerSubscription(userId);
    if (!subscription) {
      return res.status(409).json({ error: 'No tienes una suscripción activa.', code: 'NOT_ACTIVE' });
    }
    const planLabel = canonicalPaidPlan(subscription) === 'plus' ? 'Plus' : 'Pro';
    // 4.57D: abandoning an in-flight upgrade reverts transition state; the
    // untouched Pro row (plan/provider/period) keeps full access.
    if (subscription.plan_change_status === 'upgrade_pending' && subscription.pending_provider_subscription_id) {
      try {
        const { cancelMpPreapproval } = await import('./server/subscriptions/cancelSubscription.mjs');
        await cancelMpPreapproval({ preapprovalId: subscription.pending_provider_subscription_id, accessToken: mercadopagoAccessToken });
      } catch {}
      await supabase.from('lawyer_subscriptions').update({ pending_plan: null, plan_change_status: null, plan_change_effective_at: null, pending_provider_subscription_id: null, pending_init_point: null, previous_provider_subscription_id: null, updated_at: new Date().toISOString() }).eq('id', subscription.id);
      try { await capturePostHog('plus_upgrade_failed', userId, { reason: 'cancelled_by_user' }); } catch {}
      return res.json({ success: true, upgrade_abandoned: true });
    }
    if (subscription.status === 'cancelled') {
      return res.json({ success: true, cancel_at_period_end: true, already_cancelled: true });
    }
    if (subscription.status !== 'active') {
      return res.status(409).json({ error: `No tienes una suscripción ${planLabel} activa.`, code: 'NOT_ACTIVE' });
    }
    if (subscription.provider_subscription_id) {
      const { cancelMpPreapproval, reconcileMpPreapprovalStatus } = await import('./server/subscriptions/cancelSubscription.mjs');
      const mpResult = await cancelMpPreapproval({ preapprovalId: subscription.provider_subscription_id, accessToken: mercadopagoAccessToken });
      if (!mpResult.ok) {
        if (mpResult.alreadyCancelledHint) {
          const recon = await reconcileMpPreapprovalStatus({ preapprovalId: subscription.provider_subscription_id, accessToken: mercadopagoAccessToken });
          if (!recon.cancelled) {
            console.error('[LegalUpPro] MP cancel error (provider not cancelled):', { providerId: subscription.provider_subscription_id, status: mpResult.status, body: mpResult.body });
            return res.status(502).json({ error: 'No se pudo cancelar en el proveedor, intenta nuevamente.', code: 'PROVIDER_ERROR', provider_status: mpResult.status });
          }
          console.log('[LegalUpPro] MP already cancelled, reconciling local to cancelled', { providerId: subscription.provider_subscription_id });
        } else {
          const isNetwork = mpResult.networkError;
          console.error('[LegalUpPro] MP cancel error:', { flow: 'Pro', providerId: subscription.provider_subscription_id, status: mpResult.status, networkError: !!isNetwork, body: mpResult.body ? JSON.stringify(mpResult.body).slice(0, 500) : null });
          return res.status(502).json({ error: isNetwork ? 'No se pudo contactar al proveedor, intenta nuevamente.' : 'No se pudo cancelar en el proveedor, intenta nuevamente.', code: isNetwork ? 'PROVIDER_UNREACHABLE' : 'PROVIDER_ERROR', provider_status: mpResult.status || undefined });
        }
      }
    }
    const now = new Date();
    // 4.57D: cancelling clears a scheduled downgrade (moot once cancelled);
    // paid entitlement of the CURRENT plan runs to period end (no immediate
    // switch to Free; free_case_consumed ledger untouched — §46).
    await supabase.from('lawyer_subscriptions').update({ status: 'cancelled', cancelled_at: now.toISOString(), cancel_at_period_end: true, pending_plan: null, plan_change_status: null, plan_change_effective_at: null, updated_at: now.toISOString() }).eq('id', subscription.id);
    // 4.32B.4: cancellation never removes the permanent Founder badge, but a
    // pending (unpaid) reservation must not squat a slot.
    try {
      await supabase.from('pro_founder_reservations').delete().eq('lawyer_id', userId);
    } catch {}
    await capturePostHog('pro_subscription_cancelled', userId, { price_clp: PRO_SUBSCRIPTION_PRICE_CLP });
    const userData = await getProLawyerEmail(userId);
    // Reuse AI email template for Pro cancelled
    if (userData?.email) {
      try {
        await sendAIEmail(userData.email, `Tu suscripción de LegalUp ${planLabel} fue cancelada`, `<p>Tu suscripción ${planLabel} se cancelará al final del período.</p>`);
      } catch {}
    }
    res.json({ success: true, cancel_at_period_end: true });
  } catch (error) {
    console.error('[LegalUpPro] cancel error:', error);
    res.status(500).json({ error: 'No se pudo cancelar la suscripción.' });
  }
});

const getProLawyerEmail = getAILawyerEmail;

const extractTextFromStoredPdf = async (doc, userId) => {
  const workspace = await getAIWorkspaceOwned(doc.workspace_id, userId);
  if (!hasCanonicalDocumentReference(doc, userId, workspace)) {
    throw new Error('Referencia de documento no autorizada.');
  }
  const { data: file, error: downloadError } = await supabase.storage
    .from(AI_DOCUMENTS_BUCKET)
    .download(doc.file_path);
  if (downloadError || !file) {
    throw new Error('No se pudo descargar el PDF desde el almacenamiento.');
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  // FASE 4.59F.1: extracción con pdf.js mantenido (ver server/ai/pdfText.mjs).
  // pdf-parse empaquetaba pdf.js 2019 y rechazaba PDFs válidos modernos.
  let parsed;
  try {
    parsed = await extractPdfText(buffer, { maxChars: MAX_EXTRACTED_TEXT_CHARS });
  } catch (e) {
    // 4.59F.1: observabilidad mínima sin contenido (id, etapa, clase, páginas).
    console.error('[LegalUpAI] pdf extract failed', {
      document_id: doc.id,
      stage: 'extract',
      parser: 'pdfjs-dist',
      error_class: e?.name || 'unknown',
      message: String(e?.message || e).slice(0, 160),
    });
    if (e && (e.name === 'PdfPasswordError' || e.name === 'PdfEmptyError')) throw e;
    throw new Error('No se pudo procesar el documento.');
  }
  const text = (parsed.text || '').trim();
  if (text.length < 20) {
    throw new Error('No se pudo extraer texto del PDF. Asegúrate de que sea un PDF textual (no escaneado).');
  }
  return { text: text.slice(0, MAX_EXTRACTED_TEXT_CHARS), pageCount: parsed.pageCount || null };
};

// POST /api/ai/documents/:id/process — extrae el texto del PDF y lo guarda.
app.post('/api/ai/documents/:id/process', async (req, res) => {
  let userId = null;
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;

    const doc = await getAIDocumentOwned(req.params.id, userId);
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado.' });

    const entitlement = await requireAIEntitlement(req, res, userId, { metered: false });
    if (entitlement.res) return entitlement.res;

    if (doc.status === 'ready' && doc.extracted_text) {
      return res.json({ success: true, page_count: doc.page_count, already_processed: true });
    }

    await supabase.from('ai_documents').update({ status: 'processing', analysis_error: null }).eq('id', doc.id);

    const { text, pageCount } = await extractTextFromStoredPdf(doc, userId);

    await supabase.from('ai_documents').update({
      status: 'ready',
      extracted_text: text,
      page_count: pageCount,
      analysis_error: null,
    }).eq('id', doc.id);

    // FASE 4.61B — indexación RAG fire-and-forget tras extracción exitosa.
    // Nunca bloquea ni rompe el procesamiento: fallos solo se registran y
    // un reintento posterior reconstruye (idempotente). Sin cambios si el
    // documento no tiene caso real vinculado (defer huérfanos).
    void (async () => {
      try {
        const { ingestDocumentChunks } = await import('./server/ai/ragIngest.mjs');
        const caseId = await resolveDocLinkedCaseId(userId, doc.workspace_id);
        await ingestDocumentChunks({ supabase, doc: { ...doc, extracted_text: text }, lawyerId: userId, workspaceId: doc.workspace_id, caseId });
      } catch (e) {
        console.error('[LegalUpAI] rag index failed (retryable)', e?.message || e);
      }
    })();

    await notificationsService.notifyUser({
      userId,
      type: 'ai.document.ready',
      title: 'Documento listo',
      message: `El documento "${doc.original_filename}" ya está disponible para análisis.`,
      entityType: 'ai_document',
      entityId: doc.id,
      metadata: { case_id: doc.workspace_id, workspace_id: doc.workspace_id, document_id: doc.id, lawyer_case_id: await resolveDocLinkedCaseId(userId, doc.workspace_id) },
      eventId: `ai_process:${doc.id}`,
    });

    res.json({ success: true, page_count: pageCount, text_length: text.length });
  } catch (err) {
    console.error('[LegalUpAI] process error:', err);
    try {
      await supabase.from('ai_documents').update({ status: 'failed', analysis_error: err.message }).eq('id', req.params.id).eq('lawyer_id', userId);
    } catch { /* el documento pudo haber sido eliminado */ }
    if (userId) {
      try {
        const doc = await getAIDocumentOwned(req.params.id, userId);
        await notificationsService.notifyUser({
          userId,
          type: 'ai.document.failed',
          title: 'No pudimos procesar tu documento',
          message: 'Intenta nuevamente desde tu caso en LegalUp AI.',
          entityType: 'ai_document',
          entityId: doc?.id || req.params.id,
          metadata: { case_id: doc?.workspace_id, workspace_id: doc?.workspace_id ?? null, document_id: doc?.id || req.params.id, lawyer_case_id: await resolveDocLinkedCaseId(userId, doc?.workspace_id) },
          eventId: `ai_process_failed:${req.params.id}`,
        });
      } catch { /* la notificación no debe romper la respuesta */ }
    }
    res.status(500).json({ error: 'No se pudo procesar el documento.', details: err.message });
  }
});

// POST /api/ai/documents/:id/analyze — genera (o reemplaza) el análisis IA.
app.post('/api/ai/documents/:id/analyze', async (req, res) => {
  let userId = null;
  let ownsAnalysisLock = false;
  const metering = createAIMetering({ supabase, tokenLimit: AI_PROTECT_MAX_MONTHLY_TOKENS, operationLimit: AI_PROTECT_MAX_MONTHLY_REQUESTS });
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;

    const model = resolveAnalysisModel(req.body?.model, AI_DEFAULT_MODEL);
    if (!model) return res.status(400).json({ error: 'Modelo no permitido.', code: 'AI_MODEL_NOT_ALLOWED' });

    const doc = await getAIDocumentOwned(req.params.id, userId);
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado.' });

    const entitlement = await requireAIEntitlement(req, res, userId);
    if (entitlement.res) return entitlement.res;

    if (!isAIProviderConfigured()) {
      console.error('[LegalUpAI] analyze blocked: AI_PROVIDER_API_KEY not configured.');
      return res.status(500).json({
        error: 'El servicio de IA no está configurado. Contacta al equipo de LegalUp.',
        code: 'AI_NOT_CONFIGURED',
      });
    }

    if (!await metering.begin(req, res, { lawyerId: userId, workspaceId: doc.workspace_id, capability: 'document_analysis', resourceId: doc.id, input: { model }, commercialLimits: commercialQuotaForPlan(entitlement.plan), freeQuota: freeQuotaForEntitlement(entitlement) })) return;

    // Asegura el texto extraído (procesa inline si hace falta).
    let text = doc.extracted_text;
    if (doc.status !== 'ready' || !text) {
      const extracted = await extractTextFromStoredPdf(doc, userId);
      text = extracted.text;
      await supabase.from('ai_documents').update({
        status: 'ready',
        extracted_text: text,
        page_count: extracted.pageCount,
        analysis_error: null,
      }).eq('id', doc.id);
      // FASE 4.61B — misma indexación idempotente que la ruta process.
      void (async () => {
        try {
          const { ingestDocumentChunks } = await import('./server/ai/ragIngest.mjs');
          const caseId = await resolveDocLinkedCaseId(userId, doc.workspace_id);
          await ingestDocumentChunks({ supabase, doc: { ...doc, extracted_text: text }, lawyerId: userId, workspaceId: doc.workspace_id, caseId });
        } catch (e) {
          console.error('[LegalUpAI] rag index failed (retryable)', e?.message || e);
        }
      })();
    }

    // Fase 4.26.2 hardening: documento sin texto suficiente no debe llegar al LLM (evita costo y falla predecible)
    if (!text || text.trim().length < 20) {
      throw new Error('El documento no contiene texto suficiente para analizar. Asegúrate de que sea un PDF textual (no escaneado).');
    }

    // 4.29E concurrency lock — at most one active analysis per document
    const STALE_MS = 5 * 60 * 1000;
    const nowIso = new Date().toISOString();
    // Try to acquire lock where not already processing
    let lockAcquired = false;
    {
      const { data: locked } = await supabase.from('ai_documents').update({ analysis_status: 'processing', analysis_error: null, model, updated_at: nowIso }).eq('id', doc.id).neq('analysis_status', 'processing').select('id').maybeSingle();
      if (locked) lockAcquired = true;
      else {
        // Check stale: if currently processing but updated_at older than threshold, allow recovery
        const { data: current } = await supabase.from('ai_documents').select('analysis_status, updated_at').eq('id', doc.id).maybeSingle();
        const updatedAtMs = current?.updated_at ? Date.parse(current.updated_at) : 0;
        const isStale = current?.analysis_status === 'processing' && !isNaN(updatedAtMs) && (Date.now() - updatedAtMs) > STALE_MS;
        if (isStale) {
          const { data: staleLocked } = await supabase.from('ai_documents').update({ analysis_status: 'processing', analysis_error: null, model, updated_at: nowIso }).eq('id', doc.id).eq('analysis_status', 'processing').select('id').maybeSingle();
          if (staleLocked) lockAcquired = true;
        }
      }
    }
    if (!lockAcquired) {
      return await metering.respond(res, 409, { error: 'El análisis ya está en curso. Intenta nuevamente en unos momentos.', code: 'AI_DOCUMENT_ANALYSIS_IN_PROGRESS' });
    }

    ownsAnalysisLock = true;
    const { data: raw } = await chatCompletion({
      model,
      metering,
      system: buildAnalysisSystemPrompt(),
      user: buildAnalysisUserPrompt({ filename: doc.original_filename, extractedText: text }),
    });

    let validated;
    try {
      if (!raw) {
        throw new Error('El modelo no devolvió un análisis estructurado válido.');
      }
      validated = AIDocumentAnalysisSchema.parse(raw);
    } catch (schemaError) {
      console.error('[LegalUpAI] analyze invalid response');
      throw new Error('El modelo devolvió un análisis con formato inválido.');
    }

    // Fase 4.5: grounding — verifica que cada hecho del análisis esté respaldado por el documento.
    // Reutiliza verifyDocumentClaims (Nivel1+2) para no inventar montos/fechas/roles.
    // Solo los claims verificados se persisten; los descartados se eliminan del análisis.
    // Además se construye la lista de claims con evidencia para trazabilidad (source_id, page_number, evidence).
    const docsByIdForAnalysis = new Map([[doc.id, { id: doc.id, workspace_id: doc.workspace_id, lawyer_id: doc.lawyer_id, original_filename: doc.original_filename, extracted_text: text }]]);
    const verifyFactsWithEvidence = (items) => {
      if (!Array.isArray(items) || items.length === 0) return { verified: [], claims: [] };
      const claims = items.map((txt) => ({ document_id: doc.id, afirmacion: String(txt), fragmento: String(txt) })).filter((c) => c.afirmacion.trim());
      const { kept } = verifyDocumentClaims(claims, docsByIdForAnalysis, doc.workspace_id, doc.lawyer_id);
      const keptMap = new Map(kept.map((k) => [k.afirmacion, k]));
      const verified = items.filter((txt) => keptMap.has(String(txt)));
      const claimsWithEvidence = verified.map((txt) => {
        const k = keptMap.get(String(txt));
        return { text: String(txt), source_id: k.source_id, fragment_id: k.fragment_id, evidence: k.fragmento, ...honestEvidenceLocation(k.fragment_id) };
      });
      return { verified, claims: claimsWithEvidence };
    };
    const partiesRes = verifyFactsWithEvidence(validated.parties || []);
    const keyPointsRes = verifyFactsWithEvidence(validated.key_points || []);
    const obligationsRes = verifyFactsWithEvidence(validated.obligations || []);
    const verifiedParties = partiesRes.verified;
    const verifiedKeyPoints = keyPointsRes.verified;
    const verifiedObligations = obligationsRes.verified;
    const verifiedRisks = Array.isArray(validated.risks) ? validated.risks : [];
    const verifiedRecommendations = Array.isArray(validated.recommendations) ? validated.recommendations : [];
    // Deadlines: verifica solo la descripción, preserva date si la descripción es válida.
    // FASE 4.60B.2: NO pasar la descripción como `fragmento` citado. La puerta
    // anti-alucinación exige cita literal (>=25 chars) y las descripciones del
    // modelo son paráfrasis por diseño: pasarlas como fragmento las descartaba
    // sistemáticamente aunque el plazo fuera correcto. Sin `fragmento`, el
    // alineamiento por contenido (Nivel 1 + Nivel 2) valida la paráfrasis
    // contra el texto real sin inventar evidencia.
    const verifiedDeadlines = Array.isArray(validated.deadlines) ? validated.deadlines.filter((d) => {
      const desc = typeof d === 'string' ? d : String(d?.description || '');
      if (!desc.trim()) return false;
      const { kept } = verifyDocumentClaims([{ document_id: doc.id, afirmacion: desc }], docsByIdForAnalysis, doc.workspace_id, doc.lawyer_id);
      return kept.length > 0;
    }) : [];
    const allClaimsEvidence = [...partiesRes.claims, ...keyPointsRes.claims, ...obligationsRes.claims];
    // Reanalizar reemplaza el análisis anterior SOLO si el nuevo persiste (4.34C):
    // el análisis bueno sigue disponible hasta que el reemplazo esté validado y guardado.
    // FASE 4.60B.3: UNIQUE(document_id) — un documento tiene un único análisis
    // vigente. El INSERT incondicional violaba esa unicidad en cada re-análisis
    // (AI_ANALYSIS_FAILED con provider OK). UPDATE de la fila existente cuando
    // la hay (contenido ya validado/grounded en memoria), INSERT solo sin fila.
    // UPDATE es atómico: si falla, la fila anterior sigue intacta (4.34C).
    // La concurrencia ya está serializada por el lock 4.29E de este endpoint.
    const analysisPayload = {
      summary: validated.summary,
      document_type: validated.document_type,
      parties: verifiedParties,
      key_points: verifiedKeyPoints,
      obligations: verifiedObligations,
      deadlines: verifiedDeadlines,
      risks: verifiedRisks,
      recommendations: verifiedRecommendations,
      claims: allClaimsEvidence,
      evidence_sources: allClaimsEvidence,
      model,
    };
    const { data: existingAnalysis } = await supabase
      .from('ai_document_analyses')
      .select('id')
      .eq('document_id', doc.id)
      .maybeSingle();
    let saved = null;
    let saveError = null;
    if (existingAnalysis) {
      const { data, error } = await supabase
        .from('ai_document_analyses')
        .update({ ...analysisPayload, updated_at: nowIso })
        .eq('id', existingAnalysis.id)
        .select()
        .single();
      saved = data;
      saveError = error;
    } else {
      const { data, error } = await supabase
        .from('ai_document_analyses')
        .insert({
          document_id: doc.id,
          lawyer_id: doc.lawyer_id,
          workspace_id: doc.workspace_id,
          ...analysisPayload,
        })
        .select()
        .single();
      saved = data;
      saveError = error;
    }

    if (saveError || !saved) {
      // Solo servidor: código/constraint + conteos sanitizados (sin texto cliente).
      console.error('[LegalUpAI] Error guardando análisis:', {
        code: saveError?.code,
        message: saveError?.message,
        details: saveError?.details,
        hint: saveError?.hint,
        document_id: doc.id,
        update: !!existingAnalysis,
        parties: verifiedParties.length,
        key_points: verifiedKeyPoints.length,
        obligations: verifiedObligations.length,
        deadlines: verifiedDeadlines.length,
        risks: verifiedRisks.length,
        recommendations: verifiedRecommendations.length,
      });
      throw new Error('No se pudo guardar el análisis.');
    }

    await supabase.from('ai_documents').update({ analysis_status: 'ready', analysis_error: null, model }).eq('id', doc.id);

    // Evento de activación: solo el primer análisis completado del abogado.
    try {
      const { count, error: countError } = await supabase
        .from('ai_document_analyses')
        .select('id', { count: 'exact', head: true })
        .eq('lawyer_id', doc.lawyer_id);
      if (!countError && count === 1) {
        await capturePostHog('ai_first_analysis_completed', doc.lawyer_id, { model });
      }
    } catch (posthogError) {
      console.error('[LegalUpAI] ai_first_analysis_completed failed', posthogError);
    }

    await notificationsService.notifyUser({
      userId,
      type: 'ai.analysis.completed',
      title: 'Análisis completado',
      message: `El análisis de "${doc.original_filename}" está listo.`,
      entityType: 'ai_document',
      entityId: doc.id,
      metadata: { case_id: doc.workspace_id, workspace_id: doc.workspace_id, document_id: doc.id, lawyer_case_id: await resolveDocLinkedCaseId(userId, doc.workspace_id) },
      eventId: `ai_analysis:${doc.id}`,
    });

    await metering.respond(res, 200, { success: true, analysis: saved, model });
  } catch (err) {
    console.error('[LegalUpAI] analyze failed', { code: err?.code, status: err?.status });
    const message = err?.code === 'AI_NOT_CONFIGURED'
      ? err.message
      : (err.message || 'No se pudo analizar el documento.');
    try {
      if (ownsAnalysisLock) await supabase.from('ai_documents').update({ analysis_status: 'failed', analysis_error: message }).eq('id', req.params.id).eq('lawyer_id', userId);
    } catch { /* el documento pudo haber sido eliminado */ }
    if (userId && ownsAnalysisLock) {
      try {
        const doc = await getAIDocumentOwned(req.params.id, userId);
        await notificationsService.notifyUser({
          userId,
          type: 'ai.analysis.failed',
          title: 'El análisis falló',
          message: `No pudimos analizar "${doc?.original_filename || 'tu documento'}". Intenta nuevamente.`,
          entityType: 'ai_document',
          entityId: doc?.id || req.params.id,
          metadata: { case_id: doc?.workspace_id, workspace_id: doc?.workspace_id ?? null, document_id: doc?.id || req.params.id, lawyer_case_id: await resolveDocLinkedCaseId(userId, doc?.workspace_id) },
          eventId: `ai_analysis_failed:${req.params.id}`,
        });
      } catch { /* la notificación no debe romper la respuesta */ }
    }
    await metering.respond(res, err?.status || 500, { error: message, code: err?.code || 'AI_ANALYSIS_FAILED' });
  }
});

// GET /api/ai/documents/:id/open — URL firmada de corta duración para vista previa (4.34C).
// 0 LLM. Solo autenticación + ownership canónico 4.34B (sin nuevo gate de entitlement:
// la preview ya era accesible vía Storage RLS owner-scoped).
app.get('/api/ai/documents/:id/open', async (req, res) => {
  let userId = null;
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;
    const doc = await getAIDocumentOwned(req.params.id, userId);
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado.' });
    const { data, error } = await supabase.storage
      .from(AI_DOCUMENTS_BUCKET)
      .createSignedUrl(doc.file_path, 3600);
    if (error || !data?.signedUrl) {
      console.error('[LegalUpAI] open error:', error?.message);
      return res.status(404).json({ error: 'No se pudo abrir el documento.', code: 'AI_DOCUMENT_OPEN_FAILED' });
    }
    res.json({ signedUrl: data.signedUrl, expiresIn: 3600, document_id: doc.id, filename: doc.original_filename });
  } catch (error) {
    console.error('[LegalUpAI] open error:', error);
    res.status(500).json({ error: 'No se pudo abrir el documento.' });
  }
});

// DELETE /api/ai/documents/:id — borrado consistente orquestado en servidor (4.34C).
// Storage primero → fila después. Si el objeto ya no existe, igual se limpia la fila
// (idempotente, converge en reintentos). Nunca reporta éxito total si algo falló.
// 0 LLM. Los análisis en cascada los limpia el FK.
app.delete('/api/ai/documents/:id', async (req, res) => {
  let userId = null;
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;
    const doc = await getAIDocumentOwned(req.params.id, userId);
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado.' });

    let storageCleaned = true;
    const { error: storageError } = await supabase.storage
      .from(AI_DOCUMENTS_BUCKET)
      .remove([doc.file_path]);
    if (storageError) {
      const missing = /not found|does not exist|nosuchkey/i.test(storageError.message || '');
      storageCleaned = missing;
      if (!missing) {
        console.error('[LegalUpAI] delete storage error:', storageError.message);
        return res.status(502).json({ error: 'No se pudo eliminar el archivo. Inténtalo de nuevo.', code: 'AI_DOCUMENT_STORAGE_DELETE_FAILED' });
      }
    }

    const { error: dbError } = await supabase
      .from('ai_documents')
      .delete()
      .eq('id', doc.id)
      .eq('lawyer_id', userId);
    if (dbError) {
      console.error('[LegalUpAI] delete db error:', dbError.message);
      return res.status(500).json({ error: 'No se pudo eliminar el documento.', code: 'AI_DOCUMENT_DELETE_FAILED', storageCleaned });
    }
    res.json({ deleted: true, storageCleaned });
  } catch (error) {
    console.error('[LegalUpAI] delete error:', error);
    res.status(500).json({ error: 'No se pudo eliminar el documento.' });
  }
});

// ---- LegalUp AI — Fase 3: Chat contextual del caso ----
const getAIWorkspaceOwned = async (workspaceId, userId) => {
  const { data, error } = await supabase
    .from('ai_workspaces')
    .select('*')
    .eq('id', workspaceId)
    .maybeSingle();
  if (error || !data || data.lawyer_id !== userId) return null;
  return data;
};

const getLawyerCaseOwned = async (caseId, userId) => {
  const { data, error } = await supabase
    .from('lawyer_cases')
    .select('id, lawyer_id, title, practice_area, description, ai_workspace_id')
    .eq('id', caseId)
    .eq('lawyer_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
};

// POST /api/lawyer/cases/:caseId/ai-workspace — provisioning lazy idempotente (Fase 4.27B)
// Auth: lawyer dueño del caso Pro. No requiere AI entitlement (infraestructura, no consumo LLM).
app.post('/api/lawyer/cases/:caseId/ai-workspace', async (req, res) => {
  let userId = null;
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;
    const caseId = req.params.caseId;
    const ownedCase = await getLawyerCaseOwned(caseId, userId);
    if (!ownedCase) return res.status(404).json({ error: 'Caso no encontrado.', code: 'LAWYER_CASE_NOT_FOUND' });

    // Caso 1: ya tiene workspace linkeado
    if (ownedCase.ai_workspace_id) {
      const ws = await getAIWorkspaceOwned(ownedCase.ai_workspace_id, userId);
      if (!ws) {
        console.warn('[LegalUpAI] ai-workspace link invalid', JSON.stringify({ caseId, workspace_id: ownedCase.ai_workspace_id }));
        return res.status(409).json({ error: 'El caso tiene un workspace asociado inválido. Contacta soporte.', code: 'AI_WORKSPACE_LINK_INVALID' });
      }
      return res.json({ workspace: ws, created: false });
    }

    // Caso 3: crear workspace candidate (solo name/practice_area/description, no PII cliente)
    const candidatePayload = {
      lawyer_id: userId,
      name: ownedCase.title,
      practice_area: ownedCase.practice_area || null,
      description: ownedCase.description ? String(ownedCase.description).trim().slice(0, 500) || null : null,
    };
    const { data: candidate, error: insertError } = await supabase.from('ai_workspaces').insert(candidatePayload).select().single();
    if (insertError || !candidate) {
      console.error('[LegalUpAI] ai-workspace create failed', insertError);
      const msg = String(insertError?.message || '');
      // 4.38C: P0001 here only fires for trial (Pro has no workspace cap).
      if (insertError?.code === 'P0001' || /l[ií]mit|trial|quota/i.test(msg)) {
        return res.status(403).json({ error: insertError.message, code: 'AI_LIMIT_REACHED' });
      }
      return res.status(500).json({ error: 'No se pudo crear el workspace AI.', code: 'AI_WORKSPACE_CREATE_FAILED' });
    }

    // Intento de link condicional (mitiga carrera sin UNIQUE)
    const { data: linked, error: linkError } = await supabase
      .from('lawyer_cases')
      .update({ ai_workspace_id: candidate.id })
      .eq('id', caseId)
      .eq('lawyer_id', userId)
      .is('ai_workspace_id', null)
      .select('ai_workspace_id')
      .maybeSingle();

    if (linkError) {
      console.error('[LegalUpAI] ai-workspace link failed', linkError);
      // cleanup candidate huérfano
      try { await supabase.from('ai_workspaces').delete().eq('id', candidate.id).eq('lawyer_id', userId); } catch {}
      return res.status(500).json({ error: 'No se pudo vincular el workspace.', code: 'AI_WORKSPACE_LINK_FAILED' });
    }

    if (linked && linked.ai_workspace_id === candidate.id) {
      // ganamos carrera
      return res.json({ workspace: candidate, created: true });
    }

    // perdimos carrera: otro request vinculó primero → reread winner + cleanup candidate
    const { data: reread } = await supabase.from('lawyer_cases').select('ai_workspace_id').eq('id', caseId).eq('lawyer_id', userId).maybeSingle();
    const winnerId = reread?.ai_workspace_id;
    if (winnerId && winnerId !== candidate.id) {
      const winner = await getAIWorkspaceOwned(winnerId, userId);
      // cleanup candidate loser (no documentos aún, seguro)
      try {
        const { error: delErr } = await supabase.from('ai_workspaces').delete().eq('id', candidate.id).eq('lawyer_id', userId);
        if (delErr) console.warn('[LegalUpAI] AI_WORKSPACE_ORPHAN_CLEANUP_FAILED', JSON.stringify({ caseId, candidate_id: candidate.id, winner_id: winnerId }));
      } catch (e) {
        console.warn('[LegalUpAI] AI_WORKSPACE_ORPHAN_CLEANUP_FAILED', String(e).slice(0,200));
      }
      if (winner) return res.json({ workspace: winner, created: false });
    }
    // fallback: retornar candidate si winner no resoluble
    return res.json({ workspace: candidate, created: true });
  } catch (err) {
    console.error('[LegalUpAI] ai-workspace provision error:', err);
    res.status(500).json({ error: 'No se pudo provisionar el workspace.', code: 'AI_WORKSPACE_PROVISION_FAILED' });
  }
});

const getAIConversationOwned = async (conversationId, userId) => {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle();
  if (error || !data || data.lawyer_id !== userId) return null;
  return data;
};

// Obtiene la conversación principal del caso, creándola la primera vez.
// Idempotente ante condiciones de carrera (si el insert choca, relee).
const getOrCreateAIConversation = async (workspaceId, userId) => {
  const select = (eqLawyer) =>
    supabase
      .from('ai_conversations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('lawyer_id', userId)
      .maybeSingle();

  const { data: existing } = await select();
  if (existing) return existing;

  const { data: created, error: insertError } = await supabase
    .from('ai_conversations')
    .insert({ workspace_id: workspaceId, lawyer_id: userId, title: 'Conversación del caso' })
    .select()
    .single();

  if (insertError) {
    const { data: retry } = await select();
    if (retry) return retry;
    throw insertError;
  }
  return created;
};

// Esquema de la respuesta del modelo para el chat.
// FASE 4.59B: unión discriminada — citas de documento (contrato previo
// intacto: sin document_id/file_name la respuesta cae a fallback igual que
// antes) o citas de research (research_id requerido; la validación real
// contra la memoria del caso ocurre después, o se descarta).
const AIChatResponseSchema = z.object({
  answer: z.string().min(1),
  sources: z
    .array(
      z.union([
        z.object({
          document_id: z.string(),
          file_name: z.string(),
          fragment_id: z.string().optional(),
          page_number: z.number().int().optional(),
          evidence: z.string().optional(),
          // FASE 4.61D: id estable del Evidence Pack (opcional, aditivo).
          evidence_id: z.string().optional(),
        }),
        z.object({
          research_id: z.string(),
          research_query: z.string().optional(),
          research_date: z.string().optional(),
          title: z.string().optional(),
          url: z.string().optional(),
        }),
      ])
    )
    .default([]),
});

const AIChatRequestSchema = z.object({
  conversation_id: z.string().uuid(),
  message: z.string().trim().min(1).max(CHAT_LIMITS.MAX_CHAT_MESSAGE_LENGTH),
  document_id: z.string().uuid().optional(),
});

// GET /api/ai/cases/:caseId/chat — conversación principal (get-or-create) + mensajes.
app.get('/api/ai/cases/:caseId/chat', async (req, res) => {
  let userId = null;
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;

    const workspace = await getAIWorkspaceOwned(req.params.caseId, userId);
    if (!workspace) return res.status(404).json({ error: 'Caso no encontrado.' });

    const entitlement = await requireAIEntitlement(req, res, userId, { metered: false });
    if (entitlement.res) return entitlement.res;

    const conversation = await getOrCreateAIConversation(workspace.id, userId);

    const { data: messages, error: messagesError } = await supabase
      .from('ai_chat_messages')
      .select('id, conversation_id, workspace_id, lawyer_id, role, content, metadata, created_at')
      .eq('conversation_id', conversation.id)
      .eq('lawyer_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (messagesError) throw messagesError;

    res.json({ conversation, messages: (messages || []).reverse() });
  } catch (error) {
    console.error('[LegalUpAI] chat load error:', error);
    res.status(500).json({ error: 'No se pudo cargar la conversación del caso.' });
  }
});

// POST /api/ai/cases/:caseId/chat — responde una pregunta usando el contexto del caso.
app.post('/api/ai/cases/:caseId/chat', async (req, res) => {
  let userId = null;
  const metering = createAIMetering({ supabase, tokenLimit: AI_PROTECT_MAX_MONTHLY_TOKENS, operationLimit: AI_PROTECT_MAX_MONTHLY_REQUESTS });
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;

    const parsed = AIChatRequestSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Solicitud inválida.', code: 'INVALID_REQUEST' });
    }
    const { conversation_id, message, document_id } = parsed.data;

    const workspace = await getAIWorkspaceOwned(req.params.caseId, userId);
    if (!workspace) return res.status(404).json({ error: 'Caso no encontrado.' });

    const entitlement = await requireAIEntitlement(req, res, userId);
    if (entitlement.res) return entitlement.res;

    const conversation = await getAIConversationOwned(conversation_id, userId);
    if (!conversation || conversation.workspace_id !== workspace.id) {
      return res.status(403).json({ error: 'No autorizado.' });
    }

    let prioritizedDocumentId = null;
    if (document_id) {
      const doc = await getAIDocumentOwned(document_id, userId);
      if (!doc || doc.workspace_id !== workspace.id) {
        return res.status(403).json({ error: 'Documento no autorizado.' });
      }
      prioritizedDocumentId = doc.id;
    }

    if (!isAIProviderConfigured()) {
      console.error('[LegalUpAI] chat blocked: AI_PROVIDER_API_KEY not configured.');
      return res.status(500).json({
        error: 'El servicio de IA no está configurado. Contacta al equipo de LegalUp.',
        code: 'AI_NOT_CONFIGURED',
      });
    }

    if (!await metering.begin(req, res, { lawyerId: userId, workspaceId: workspace.id, capability: document_id ? 'document_chat' : 'case_chat', resourceId: document_id || conversation.id, input: { conversation_id, message, document_id: document_id || null, model: AI_DEFAULT_MODEL }, commercialLimits: commercialQuotaForPlan(entitlement.plan), freeQuota: freeQuotaForEntitlement(entitlement) })) return;

    // Solo documentos listos del caso del abogado.
    const { data: readyDocs, error: docsError } = await supabase
      .from('ai_documents')
      .select('id, original_filename, extracted_text')
      .eq('workspace_id', workspace.id)
      .eq('lawyer_id', userId)
      .eq('status', 'ready');
    if (docsError) throw docsError;

    if (prioritizedDocumentId && readyDocs && readyDocs.length > 1) {
      const idx = readyDocs.findIndex((d) => d.id === prioritizedDocumentId);
      if (idx > 0) {
        const [doc] = readyDocs.splice(idx, 1);
        readyDocs.unshift(doc);
      }
    }

    // 4.39B: el documento seleccionado debe estar listo y con texto usable.
    // Sin fallback silencioso a otro documento: error tipado, 0 provider, 0 quota.
    if (prioritizedDocumentId) {
      const selectedReady = (readyDocs || []).find((d) => d.id === prioritizedDocumentId);
      if (!selectedReady || (selectedReady.extracted_text || '').trim().length < 20) {
        return await metering.respond(res, 422, {
          error: 'Este documento todavía se está procesando. Espera a que termine antes de hacer preguntas sobre él.',
          code: 'AI_DOCUMENT_NOT_READY',
        });
      }
    }

    if (!readyDocs || readyDocs.length === 0) {
      const { count, error: countError } = await supabase
        .from('ai_documents')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id)
        .eq('lawyer_id', userId);
      if (countError) throw countError;
      const code = count > 0 ? 'DOCS_PROCESSING' : 'NO_DOCUMENTS';
      const messageText =
        count > 0
          ? 'Tus documentos todavía se están procesando.'
          : 'Sube un documento para comenzar.';
      return await metering.respond(res, 422, { error: messageText, code });
    }

    // Análisis disponibles de los documentos listos.
    const documentIds = readyDocs.map((doc) => doc.id);
    const { data: analysisRows, error: analysisError } = await supabase
      .from('ai_document_analyses')
      .select(
        'document_id, summary, document_type, parties, key_points, obligations, deadlines, risks, recommendations'
      )
      .in('document_id', documentIds)
      .eq('workspace_id', workspace.id)
      .eq('lawyer_id', userId);
    if (analysisError) throw analysisError;

    const analyses = {};
    for (const row of analysisRows || []) analyses[row.document_id] = row;

    // FASE 4.59B: memoria de investigación del caso (solo Case Chat; la
    // tabla solo contiene research exitoso —el insert ocurre únicamente tras
    // pipeline ok—. Scope estricto workspace+lawyer, igual que analyses).
    let researchRows = [];
    if (!prioritizedDocumentId) {
      try {
        const { data: memRows, error: memError } = await supabase
          .from('ai_research_requests')
          .select('id, query, answer, sources, created_at')
          .eq('workspace_id', workspace.id)
          .eq('lawyer_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
        if (memError) throw memError;
        researchRows = memRows || [];
      } catch (e) {
        console.error('[LegalUpAI] research memory load failed (continuing without it)', e?.message || e);
        researchRows = [];
      }
    }

    // FASE 4.33B: encabezado en vivo del caso Pro (runtime composition, sin
    // writes). Legacy (sin link) y ambigüedad → contexto workspace sin cambios.
    let proCase = null;
    try {
      const resolved = await getProCaseHeader(supabase, { workspaceId: workspace.id, lawyerId: userId });
      if (resolved.status === 'linked') proCase = resolved.header;
    } catch (e) {
      console.error('[LegalUpAI] pro case header failed (continuing without it)', e?.message || e);
    }

    // Construye el contexto. Si el conjunto supera el límite, no truncar ni
    // descartar documentos: informar al usuario.
    // 4.39B: Document Chat declara el documento seleccionado como autoridad
    // primaria (presupuesto reservado); Case Chat mantiene contexto amplio.
    // FASE 4.59C: snapshot vigente como memoria resumida (solo lectura,
    // nunca se crea desde chat). Si existe, reemplaza la memoria cruda de
    // research (un camino canónico); si no, rige 4.59B sin cambios.
    let snapshotBlock = '';
    if (!prioritizedDocumentId) {
      try {
        const link = await resolveSnapshotCase(supabase, { lawyerId: userId, workspaceId: workspace.id });
        if (link.status === 'linked') {
          const latest = await readLatestSnapshot(supabase, { lawyerId: userId, caseId: link.caseRow.id });
          if (latest && latest.snapshot) snapshotBlock = formatSnapshotBlock(latest);
        }
      } catch (e) {
        console.error('[LegalUpAI] snapshot read failed (continuing without it)', e?.message || e);
        snapshotBlock = '';
      }
    }
    // FASE 4.61D — retrieval canónico (una vez por operación lógica).
    // Solo modo caso (sin documento priorizado). Document Chat intacto.
    // Modos: rag-full (pack como contexto primario) / rag-partial (pack +
    // fallback acotado solo para docs no indexados) / legacy (sin cambios).
    let ragPack = null;
    let ragMode = 'legacy';
    if (!prioritizedDocumentId) {
      try {
        const { retrieveCaseEvidence } = await import('./server/ai/ragRetrieval.mjs');
        const { decideChatRagMode } = await import('./server/ai/caseChatRag.mjs');
        const linkedCaseId = await resolveDocLinkedCaseId(userId, workspace.id);
        if (linkedCaseId) {
          const retrievalStartedAt = Date.now();
          const retrieved = await retrieveCaseEvidence({
            supabase, lawyerId: userId, caseId: linkedCaseId, query: message,
          });
          ragPack = retrieved.pack;
          ragMode = decideChatRagMode({ pack: ragPack, retrievalMode: retrieved.retrievalMode });
          void retrievalStartedAt;
        }
      } catch (e) {
        console.error('[LegalUpAI] rag retrieval failed, legacy fallback', e?.message || e);
        ragPack = null;
        ragMode = 'legacy';
      }
    }

    let context;
    let researchSelected;
    if (ragMode === 'rag-full' && ragPack) {
      // FULL: el Pack es el contexto documental primario. Sin dump crudo:
      // eso anularía el retrieval. Sin snapshot derivado como evidencia.
      const { buildRagContext } = await import('./server/ai/caseChatRag.mjs');
      const { serializeEvidencePack } = await import('./server/ai/ragRetrieval.mjs');
      const { RAG_INSTRUCTIONS } = await import('./server/ai/caseChatRag.mjs');
      const rag = buildRagContext(ragPack, serializeEvidencePack);
      researchSelected = rag.researchSelected;
      const liveDesc = (proCase && proCase.description) || workspace.description;
      const caseLine = liveDesc
        ? `CASO: ${ragPack.caseContext.title || workspace.name || ''}\nDescripción: ${String(liveDesc).slice(0, 1000)}`
        : '';
      context = [RAG_INSTRUCTIONS, caseLine, rag.contextBlock].filter(Boolean).join('\n\n');
    } else if (ragMode === 'rag-partial' && ragPack) {
      // PARTIAL: pack + fallback acotado SOLO para docs no indexados.
      // Nunca se duplican docs indexados por el contexto legacy.
      const { buildRagContext, PARTIAL_FALLBACK_CHARS } = await import('./server/ai/caseChatRag.mjs');
      const { serializeEvidencePack } = await import('./server/ai/ragRetrieval.mjs');
      const { RAG_INSTRUCTIONS } = await import('./server/ai/caseChatRag.mjs');
      const rag = buildRagContext(ragPack, serializeEvidencePack);
      researchSelected = rag.researchSelected;
      const unindexed = new Set((ragPack.retrievalMetadata.unindexedDocumentIds || []));
      const fallbackDocs = (readyDocs || []).filter((d) => unindexed.has(d.id));
      const fallbackAnalyses = {};
      for (const d of fallbackDocs) {
        if (analyses[d.id]) fallbackAnalyses[d.id] = analyses[d.id];
      }
      const legacyBuilt = buildChatContext({
        workspace,
        documents: fallbackDocs,
        analyses: fallbackAnalyses,
        question: message,
        proCase,
        selectedDocumentId: null,
        researchList: [],
        snapshotBlock: '',
      });
      const fallbackText = legacyBuilt.context.slice(0, PARTIAL_FALLBACK_CHARS);
      context = [RAG_INSTRUCTIONS, rag.contextBlock, fallbackText ? `CONTEXTO ADICIONAL (documentos aún no indexados):\n${fallbackText}` : ''].filter(Boolean).join('\n\n');
    } else {
      const built = buildChatContext({
        workspace,
        documents: readyDocs,
        analyses,
        question: message,
        proCase,
        selectedDocumentId: prioritizedDocumentId || null,
        researchList: researchRows,
        snapshotBlock,
      });
      context = built.context;
      researchSelected = built.researchSelected;
      if (built.tooLarge) {
        return await metering.respond(res, 422, {
          error:
            'Este caso contiene demasiada información para procesarla completa en una sola consulta.',
          code: 'CONTEXT_TOO_LARGE',
        });
      }
    }

    // Historial reciente (últimos N) para dar continuidad a la conversación.
    // 4.39B: Document Chat excluye el historial workspace-wide (no atribuible
    // por documento sin schema; la corrección del seleccionado prima sobre la
    // continuidad entre documentos). Case Chat lo conserva intacto.
    const { data: historyRows, error: historyError } = prioritizedDocumentId
      ? { data: [], error: null }
      : await supabase
        .from('ai_chat_messages')
        .select('role, content')
        .eq('conversation_id', conversation.id)
        .eq('lawyer_id', userId)
        .order('created_at', { ascending: false })
        .limit(CHAT_LIMITS.MAX_CHAT_HISTORY_MESSAGES);
    if (historyError) throw historyError;
    const history = (historyRows || []).reverse().map((m) => ({ role: m.role, content: m.content }));

    // Retry: si la última pregunta es idéntica a la del intento fallido, no duplicar.
    const lastMessage = history[history.length - 1];
    const isRetry = lastMessage && lastMessage.role === 'user' && lastMessage.content === message;

    let userMessage = null;
    if (!isRetry) {
      const { data: insertedUser, error: userInsertError } = await supabase
        .from('ai_chat_messages')
        .insert({
          conversation_id: conversation.id,
          workspace_id: workspace.id,
          lawyer_id: userId,
          role: 'user',
          content: message,
        })
        .select()
        .single();
      if (userInsertError) throw userInsertError;
      userMessage = insertedUser;
    }

    const { data: raw, raw: rawText } = await chatCompletion({
      model: AI_DEFAULT_MODEL,
      metering,
      system: buildChatSystemPrompt({ mode: prioritizedDocumentId ? 'document' : 'case' }),
      messages: [
        {
          role: 'user',
          content: buildChatUserPrompt({ question: message, context, history }),
        },
      ],
      // gpt-oss genera un campo `reasoning` (cadena de pensamiento) que consume
      // parte del presupuesto; usamos un margen mayor para que el `content` no
      // quede vacío con casos/documentos extensos.
      maxTokens: AI_CHAT_MAX_TOKENS,
      temperature: 0.2,
    });

    let validated;
    if (raw) {
      try {
        validated = AIChatResponseSchema.parse(raw);
      } catch {
        validated = null;
      }
    } else {
      validated = null;
    }

    // Fallback robusto: si el proveedor no devolvió JSON válido (p. ej. texto
    // plano), la respuesta cruda se usa directamente como respuesta. Si el JSON
    // existía pero no cumplía el esquema, se intenta extraer el campo `answer`.
    if (!validated) {
      const possibleAnswer =
        typeof raw?.answer === 'string' && raw.answer.trim() ? raw.answer.trim() : '';
      const rawAnswer = (rawText || '').trim();
      const fallbackAnswer =
        possibleAnswer ||
        (rawAnswer && !rawAnswer.startsWith('{') && !rawAnswer.startsWith('[') ? rawAnswer : '');
      if (!fallbackAnswer) {
        throw new Error('El modelo devolvió una respuesta vacía. Inténtalo nuevamente.');
      }
      validated = { answer: fallbackAnswer, sources: [] };
    }

    // Solo se aceptan fuentes que correspondan a documentos reales del contexto.
    // Fase 4.9: si la fuente trae fragment_id/evidence, se valida contra el documento y se conserva page_number.
    // FASE 4.59B: además se aceptan citas de memoria de investigación SOLO si
    // el research_id estuvo efectivamente en el contexto (researchSelected) y
    // la URL —si trae— coincide con las fuentes de esa investigación. Nunca
    // se inventan citas: lo no validable se descarta en silencio.
    const docMapForChat = new Map(readyDocs.map((doc) => [doc.id, doc]));
    const researchUrlSetById = new Map(
      (researchSelected || []).map((r) => [
        String(r.id),
        {
          urls: new Set((r.sources || []).map((s) => s.url).filter(Boolean)),
          query: r.query,
          created_at: r.created_at,
        },
      ])
    );
    let sources = (validated.sources || [])
      .filter((source) => {
        if (source && typeof source.research_id === 'string' && researchUrlSetById.has(source.research_id)) {
          return true;
        }
        const doc = docMapForChat.get(source.document_id);
        return doc && doc.original_filename === source.file_name;
      })
      .map((source) => {
        // FASE 4.59B: normaliza citas de memoria (solo ids/urls validados).
        if (source && typeof source.research_id === 'string' && researchUrlSetById.has(source.research_id)) {
          const allowed = researchUrlSetById.get(source.research_id);
          const out = {
            research_id: source.research_id,
            research_query: allowed.query,
            research_date: allowed.created_at || undefined,
          };
          if (typeof source.title === 'string' && source.title) out.title = String(source.title).slice(0, 300);
          if (typeof source.url === 'string' && allowed.urls.has(source.url)) out.url = source.url;
          return out;
        }
        const doc = docMapForChat.get(source.document_id);
        if (!doc || !source.fragment_id || !source.evidence) return { document_id: source.document_id, file_name: source.file_name };
        try {
          const normEvidence = String(source.evidence || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          const normDoc = String(doc.extracted_text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const hasEvidence = normEvidence && normDoc.includes(normEvidence.slice(0, 30));
          const validFragment = String(source.fragment_id || '').startsWith(`document::${source.document_id}::`);
          if (hasEvidence && validFragment) {
            return { document_id: source.document_id, file_name: source.file_name, fragment_id: source.fragment_id, ...honestEvidenceLocation(source.fragment_id), evidence: source.evidence };
          }
        } catch {}
        return { document_id: source.document_id, file_name: source.file_name };
      });

    // Fase 4.13: fallback determinista para respuestas parafraseadas — si el LLM no devolvió fragment_id pero la respuesta parafrasea un claim verificado, reutilizarlo.
    // Usa resolveChatEvidenceFromVerifiedClaims (conservador, valida números/fechas/roles) en lugar de verificar answer como claim literal.
    const needsFallback = sources.some((s) => !s.fragment_id || !s.evidence) && validated.answer;
    if (needsFallback) {
      try {
        const { verifyDocumentClaims } = await import('./server/ai/documentGrounding.mjs');
        const { resolveChatEvidenceFromVerifiedClaims } = await import('./server/ai/chatEvidenceResolver.mjs');
        const answerText = String(validated.answer || '').trim();
        if (answerText) {
          // Construye claims verificados de todos los documentos ready del caso (para matching)
          const allVerifiedClaims = [];
          for (const doc of readyDocs) {
            const docsById = new Map([[doc.id, doc]]);
            // Para cada documento, verifica sus análisis si existen, o usa el texto directo
            // Simplificado: crea un claim por cada documento con su texto relevante ya verificado
            // En la práctica, los claims verificados ya están en ai_document_analyses.claims, pero para chat usamos el texto del documento
            const { kept } = verifyDocumentClaims(
              [{ document_id: doc.id, afirmacion: answerText, fragmento: answerText }],
              docsById,
              workspace.id,
              userId,
            );
            if (kept.length > 0) {
              allVerifiedClaims.push(...kept);
            } else {
              // Fallback: busca claims verificados existentes en ai_document_analyses para este documento
              // (si el answer es parafraseado, verifyDocumentClaims con answer literal puede fallar, pero resolveChatEvidenceFromVerifiedClaims con claims verificados sí puede encontrar match)
              const { data: analyses } = await supabase
                .from('ai_document_analyses')
                .select('claims')
                .eq('document_id', doc.id)
                .eq('workspace_id', workspace.id)
                .eq('lawyer_id', userId)
                .maybeSingle();
              const existingClaims = Array.isArray(analyses?.claims) ? analyses.claims : [];
              for (const ec of existingClaims) {
                if (ec && ec.source_id === doc.id && ec.fragment_id && ec.evidence) {
                  allVerifiedClaims.push({
                    afirmacion: ec.text || ec.afirmacion || '',
                    fragmento: ec.evidence || ec.fragmento || '',
                    source_id: ec.source_id,
                    fragment_id: ec.fragment_id,
                    evidence: ec.evidence,
                    ...honestEvidenceLocation(ec.fragment_id),
                    source: { id: doc.id, kind: 'document' },
                  });
                }
              }
            }
          }
          const { resolveMultiClaimEvidence } = await import('./server/ai/chatEvidenceResolver.mjs');
          const matchedList = resolveMultiClaimEvidence({ answer: answerText, verifiedClaims: allVerifiedClaims });
          if (matchedList.length > 0) {
            for (const k of matchedList) {
              const targetIdx = sources.findIndex((s) => s.document_id === k.source_id && (!s.fragment_id || !s.evidence));
              if (targetIdx >= 0) {
                sources[targetIdx] = {
                  ...sources[targetIdx],
                  fragment_id: k.fragment_id || sources[targetIdx].fragment_id,
                  ...honestEvidenceLocation(k.fragment_id || sources[targetIdx].fragment_id),
                  evidence: k.fragmento || k.evidence || sources[targetIdx].evidence,
                };
              } else if (!sources.some((s) => s.document_id === k.source_id && s.fragment_id === k.fragment_id)) {
                const docForName = readyDocs.find((d) => d.id === k.source_id);
                sources.push({
                  document_id: k.source_id,
                  file_name: docForName?.original_filename || k.source_id,
                  fragment_id: k.fragment_id,
                  ...honestEvidenceLocation(k.fragment_id),
                  evidence: k.fragmento || k.evidence,
                });
              }
            }
              } else {
            // Fallback anterior: verifica answer literal contra cada documento
            for (const doc of readyDocs) {
              const docsById = new Map([[doc.id, doc]]);
              const { kept } = verifyDocumentClaims(
                [{ document_id: doc.id, afirmacion: answerText, fragmento: answerText }],
                docsById,
                workspace.id,
                userId,
              );
              if (kept.length > 0) {
                const k = kept[0];
                const targetIdx = sources.findIndex((s) => s.document_id === doc.id && (!s.fragment_id || !s.evidence));
                if (targetIdx >= 0) {
                  sources[targetIdx] = {
                    ...sources[targetIdx],
                    fragment_id: k.fragment_id || sources[targetIdx].fragment_id,
                    ...honestEvidenceLocation(k.fragment_id || sources[targetIdx].fragment_id),
                    evidence: k.fragmento || sources[targetIdx].evidence,
                  };
                } else if (!sources.some((s) => s.document_id === doc.id)) {
                  sources.push({
                    document_id: doc.id,
                    file_name: doc.original_filename,
                    fragment_id: k.fragment_id,
                    ...honestEvidenceLocation(k.fragment_id),
                    evidence: k.fragmento,
                  });
                }
                break;
              }
            }
          }
        }
      } catch {}
    }

    // FASE 4.61D — valida evidence_id contra el Pack vigente (solo modo
    // caso con pack). Inválidos se degradan a cita filename-level (flujo
    // actual); válidos reciben página honesta del Pack. Sin pack: intacto.
    let ragCitationStats = { validCitations: 0, invalidCitations: 0 };
    if (ragPack && !prioritizedDocumentId) {
      try {
        const { enrichSourcesWithPack, ragObservability } = await import('./server/ai/caseChatRag.mjs');
        const enriched = enrichSourcesWithPack(sources, ragPack);
        sources = enriched.sources;
        ragCitationStats = { validCitations: enriched.validCitations, invalidCitations: enriched.invalidCitations };
        try {
          console.log('[rag-chat]', JSON.stringify(ragObservability({
            mode: ragMode,
            pack: ragPack,
            validCitations: enriched.validCitations,
            invalidCitations: enriched.invalidCitations,
            retrievalMs: ragPack.retrievalMetadata?.durationMs ?? null,
          })));
        } catch { /* observabilidad best-effort */ }
      } catch { /* validación RAG best-effort; fuentes filename-level intactas */ }
    }

    const { data: savedAssistant, error: assistantInsertError } = await supabase
      .from('ai_chat_messages')
      .insert({
        conversation_id: conversation.id,
        workspace_id: workspace.id,
        lawyer_id: userId,
        role: 'assistant',
        content: validated.answer,
        metadata: { sources, model: AI_DEFAULT_MODEL },
      })
      .select()
      .single();
    if (assistantInsertError) throw assistantInsertError;
    // Evento de activación: solo el primer mensaje de chat del abogado.
    try {
      const { count, error: countError } = await supabase
        .from('ai_chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('lawyer_id', userId);
      if (!countError && count === 1) {
        await capturePostHog('ai_first_chat_message', userId, { case_id: workspace.id });
      }
    } catch (posthogError) {
      console.error('[LegalUpAI] ai_first_chat_message failed', posthogError);
    }

    await metering.respond(res, 200, { user_message: userMessage, message: savedAssistant, sources });
  } catch (error) {
    console.error('[LegalUpAI] chat error:', error);
    const code =
      error?.code?.startsWith('AI_') || error?.code === 'OUTPUT_TOKEN_LIMIT'
        ? error.code
        : 'PROVIDER_ERROR';
    await metering.respond(res, error?.status || 500, {
      error: error.message || 'No se pudo generar la respuesta.',
      code,
    });
  }
});

// Esquema de la solicitud de investigación de jurisprudencia.
const AIResearchRequestSchema = z.object({
  query: z.string().trim().min(1).max(JURISPRUDENCE_LIMITS.MAX_QUERY_LENGTH),
});

// GET /api/ai/cases/:caseId/jurisprudence — historial de investigaciones del caso.
// Fase 4.0: expone las investigaciones guardadas por caso, con sus fuentes.
app.get('/api/ai/cases/:caseId/jurisprudence', async (req, res) => {
  let userId = null;
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;

    const workspace = await getAIWorkspaceOwned(req.params.caseId, userId);
    if (!workspace) return res.status(404).json({ error: 'Caso no encontrado.' });

    const entitlement = await requireAIEntitlement(req, res, userId, { metered: false });
    if (entitlement.res) return entitlement.res;

    const { data: research, error } = await supabase
      .from('ai_research_requests')
      .select('id, workspace_id, lawyer_id, query, answer, sources, model, created_at')
      .eq('workspace_id', workspace.id)
      .eq('lawyer_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;

    res.json({ research: research || [] });
  } catch (error) {
    console.error('[LegalUpAI] jurisprudence history error:', error);
    res.status(500).json({ error: 'No se pudo cargar el historial de investigaciones.' });
  }
});

// POST /api/ai/cases/:caseId/jurisprudence — investiga jurisprudencia real del caso.
// Fase 4.0: busca en fuentes públicas verificables (Tribunal Constitucional,
// BCN/LeyChile y doctrina académica), entrega al modelo SOLO esas fuentes y
// guarda la investigación con las fuentes que la sustentan.
app.post('/api/ai/cases/:caseId/jurisprudence', async (req, res) => {
  let userId = null;
  const metering = createAIMetering({ supabase, tokenLimit: AI_PROTECT_MAX_MONTHLY_TOKENS, operationLimit: AI_PROTECT_MAX_MONTHLY_REQUESTS });
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;

    const parsed = AIResearchRequestSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Solicitud inválida.', code: 'INVALID_REQUEST' });
    }
    const { query } = parsed.data;

    // Fase 4.1.13 (BARRERA 1): una consulta sin suficiente contenido para
    // investigar (solo etiquetas de fuentes, solo términos genéricos, vacía) NO
    // ejecuta retrieval ni llama al LLM. Se detiene el pipeline de inmediato.
    const validation = validateResearchQuery(query);
    if (!validation.valid) {
      return res.status(422).json({
        error:
          'Formula una pregunta jurídica o indica una materia específica para iniciar la investigación.',
        code: 'AI_RESEARCH_QUERY_TOO_VAGUE',
      });
    }

    const workspace = await getAIWorkspaceOwned(req.params.caseId, userId);
    if (!workspace) return res.status(404).json({ error: 'Caso no encontrado.' });

    const entitlement = await requireAIEntitlement(req, res, userId);
    if (entitlement.res) return entitlement.res;

    // 4.29D: advanced feature — 4.38C: current Pro includes jurisprudence
    // (10/month commercial quota enforced atomically in ai_begin_operation).
    // 4.49A: free first-Case includes 1 lifetime research (same atomic path
    // with free quota params). The guard below still blocks plans without it.
    {
      const _plan = entitlement.plan ?? getPlanForAccess(await getAILawyerAccess(userId));
      if (!serverCanUseAIFeature('jurisprudence', _plan)) {
        return res.status(403).json({ error: 'Función no incluida en tu plan.', code: 'AI_FEATURE_NOT_AVAILABLE', feature: 'jurisprudence' });
      }
    }

    if (!isAIProviderConfigured()) {
      console.error('[LegalUpAI] jurisprudence blocked: AI_PROVIDER_API_KEY not configured.');
      return res.status(500).json({
        error: 'El servicio de IA no está configurado. Contacta al equipo de LegalUp.',
        code: 'AI_NOT_CONFIGURED',
      });
    }

    if (!await metering.begin(req, res, { lawyerId: userId, workspaceId: workspace.id, capability: 'research', input: { query, model: AI_DEFAULT_MODEL }, commercialLimits: commercialQuotaForPlan(entitlement.plan), freeQuota: freeQuotaForEntitlement(entitlement) })) return;

    // Fase 4.2.6 (CASE INTELLIGENCE): carga los documentos READY del caso con
    // filtro server-side doble capa (workspace_id + lawyer_id) y detecta el modo
    // de la investigación: 'document' (solo documento del caso), 'mixed'
    // (documento + fuentes públicas) o 'none' (flujo clásico).
    const { data: readyDocs, error: docsError } = await supabase
      .from('ai_documents')
      .select('id, original_filename, extracted_text, workspace_id, lawyer_id, status')
      .eq('workspace_id', workspace.id)
      .eq('lawyer_id', userId)
      .eq('status', 'ready');
    if (docsError) throw docsError;
    const caseDocuments = readyDocs || [];

    const classification = classifyLegalQuery(query);
    const documentModeResult = detectDocumentMode(query, caseDocuments, classification);
    const { mode: documentMode } = documentModeResult;

    // Señal documental sin evidencia en el caso → banner NO_DOCUMENT_EVIDENCE
    // (el frontend ya tiene mapeado este código a "pesquisa-sem-evidencias-ai").
    if (documentModeResult.noEvidence) {
      logDiagnostic('ai_research_document_grounding', {
        document_mode: documentMode,
        documents_considered: caseDocuments.length,
        documents_used: 0,
        document_fragments_selected: 0,
        document_claims_kept: 0,
        document_claims_dropped: 0,
      });
      return await metering.respond(res, 422, {
        error:
          'No hay evidencia documental disponible en el caso para responder esa pregunta.',
        code: 'NO_DOCUMENT_EVIDENCE',
      });
    }

    // En modo 'document' la investigación NO consulta fuentes públicas: la
    // evidencia son los documentos del caso. En 'mixed'/'none' se hace retrieval.
    const research =
      documentMode === 'document'
        ? {
            sources: [],
            warnings: [],
            intent: 'document',
            intentClass: classification.intent || 'DOCUMENT_ANALYSIS',
            queryHash: '',
            classification,
            strategy: null,
          }
        : await searchJurisprudence(
            query,
            { limit: 8 },
          );

    const {
      sources,
      warnings,
      intent,
      intentClass = '',
      queryHash = '',
      classification: classificationFromSearch = null,
      strategy = null,
    } = research;
    const effectiveClassification = classificationFromSearch || classification;

    const normativaCount = sources.filter((s) => s.kind === 'normativa').length;
    const jurisprudenciaCount = sources.filter((s) => s.kind === 'jurisprudencia').length;
    const doctrinaCount = sources.filter((s) => s.kind === 'doctrina').length;
    logDiagnostic('jurisprudence_search_summary', {
      intent,
      total_sources: sources.length,
      normativa_count: normativaCount,
      jurisprudencia_count: jurisprudenciaCount,
      doctrina_count: doctrinaCount,
      query_hash: queryHash,
      document_mode: documentMode,
    });
    if (documentMode !== 'document' && intent === 'normativa' && normativaCount === 0) {
      logDiagnostic('jurisprudence_normativa_source_missing', {
        intent,
        normativa_count: normativaCount,
        total_sources: sources.length,
        query_hash: queryHash,
      });
    }

    // Fase 4.2.12 (H5): si el retrieval público no encontró fuentes pero el caso
    // tiene documentos y la consulta es documental-compatible (no exige
    // jurisprudencia/doctrina/artículo/norma externa), se responde SOLO con la
    // evidencia documental en vez de cortar con NO_SOURCES_FOUND. Consultas cuyo
    // polo esencial es público (JURISPRUDENCE_LOOKUP, ARTICLE_LOOKUP, etc.)
    // conservan el 422 (no se fabrica jurisprudencia desde el documento).
    if (documentMode !== 'document' && sources.length === 0) {
      const allowDocumentOnly = shouldAllowDocumentOnlyFallback({
        documentMode,
        intent: effectiveClassification.intent || classification.intent,
        hasDocs: caseDocuments.length > 0,
        implicitDocumentContext: documentModeResult.implicitContext,
      });
      if (!allowDocumentOnly) {
        return await metering.respond(res, 422, {
          error:
            'No encontramos jurisprudencia ni normativa en las fuentes públicas consultadas. Prueba con otros términos.',
          code: 'NO_SOURCES_FOUND',
        });
      }
      logDiagnostic('ai_research_document_only_fallback', {
        intent: effectiveClassification.intent || classification.intent,
        document_mode: documentMode,
        documents_considered: caseDocuments.length,
        sources_total: sources.length,
        query_hash: queryHash,
      });
    }

    // Fase 4.2.5: selección evidence-aware de fuentes/fragmentos ANTES de
    // armar el contexto. Reduce los casos de CONTEXT_TOO_LARGE sin tocar los
    // gates de evidencia (que siguen intactos aguas abajo en el pipeline). El
    // selector solo decide qué evidencia VÁLIDA llega al LLM.
    // Fase 4.2.7: allocation dinámica de contexto basado en evidencia disponible.
    // Reemplaza el reparto estático 75%/25% por una asignación proporcional a los
    // pesos de evidencia documental y jurídica.
    const allocation = allocateDynamicContextBudget({
      documents: caseDocuments,
      sources,
      query,
      intentClass,
      documentMode,
    });

    const legalMaxChars = allocation.legalBudget;
    const documentMaxChars = allocation.documentBudget;

    const {
      sources: selectedSources,
      context,
      tooLarge,
      applied: budgetApplied,
      stats: selectionStats,
    } = selectSourcesForContext({
      sources,
      query,
      intentClass,
      classification: effectiveClassification,
      strategy,
      maxContextChars: legalMaxChars,
    });

    logDiagnostic('ai_research_context_selection', {
      intent,
      intent_class: intentClass,
      query_hash: queryHash,
      sources_before: selectionStats.sources_before,
      sources_after: selectionStats.sources_after,
      fragments_before: selectionStats.fragments_before,
      fragments_after: selectionStats.fragments_after,
      context_chars_before: selectionStats.context_chars_before,
      context_chars_after: selectionStats.context_chars_after,
      budget_applied: budgetApplied,
      poles_preserved: selectionStats.poles_preserved,
      document_mode: documentMode,
      // Fase 4.2.7: telemetría de allocation dinámica
      document_budget: allocation.documentBudget,
      legal_budget: allocation.legalBudget,
      document_ratio: allocation.documentRatio,
      legal_ratio: allocation.legalRatio,
      document_weight: allocation.documentWeight,
      legal_weight: allocation.legalWeight,
    });
    if (tooLarge) {
      return await metering.respond(res, 422, {
        error:
          'Hay demasiadas fuentes para procesarlas en una sola consulta. Acota la pregunta.',
        code: 'CONTEXT_TOO_LARGE',
      });
    }

    // Fase 4.2.6: selección de evidencia documental del caso (document grounding).
    // En modo 'none' (sin señal documental) se preserva el flujo clásico: la
    // investigación NO inyecta documentos privados en el prompt.
    // Fase 4.2.7: usa el presupuesto documental dinámico calculado por allocateDynamicContextBudget.
    const documentEvidence =
      documentMode === 'none'
        ? {
            context: '',
            selected: [],
            docsById: new Map(),
            stats: {
              documents_considered: 0,
              documents_used: 0,
              fragments_selected: 0,
              context_chars: 0,
            },
          }
        : selectDocumentEvidence({
            documents: caseDocuments,
            query,
            maxChars: documentMaxChars,
            workspaceId: workspace.id,
            lawyerId: userId,
          });

    // FASE 4.59B: análisis VERIFICADOS de los documentos seleccionados como
    // hechos del caso (partes, puntos clave, obligaciones, plazos, claims con
    // evidencia). Explícitamente EXCLUIDOS: risks/recommendations/summary
    // (no verificados — nunca como autoridad factual). Acotado y etiquetado.
    if (documentMode !== 'none' && Array.isArray(documentEvidence.selected) && documentEvidence.selected.length) {
      try {
        const selectedDocIds = [];
        for (const ch of documentEvidence.selected) {
          if (ch && ch.document_id && !selectedDocIds.includes(ch.document_id)) selectedDocIds.push(ch.document_id);
          if (selectedDocIds.length >= 4) break;
        }
        if (selectedDocIds.length) {
          const { data: verRows } = await supabase
            .from('ai_document_analyses')
            .select('document_id, document_type, parties, key_points, obligations, deadlines')
            .in('document_id', selectedDocIds)
            .eq('workspace_id', workspace.id)
            .eq('lawyer_id', userId);
          const fileById = new Map((documentEvidence.docsById ? Array.from(documentEvidence.docsById.values()) : caseDocuments).map((d) => [d.id || d.document_id, d.original_filename]));
          const parts = [];
          for (const row of verRows || []) {
            const join = (v, n) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).slice(0, n).join(' | ') : '');
            const dl = (Array.isArray(row.deadlines) ? row.deadlines : []).slice(0, 6).map((d) => {
              const o = typeof d === 'string' ? { description: d } : d || {};
              return `${o.description || ''}${o.date ? ` (${o.date})` : ''}`;
            }).filter(Boolean).join(' | ');
            const block = [
              `Documento: ${fileById.get(row.document_id) || row.document_id}`,
              row.document_type ? `Tipo: ${row.document_type}` : '',
              join(row.parties, 6) ? `Partes: ${join(row.parties, 6)}` : '',
              join(row.key_points, 6) ? `Puntos clave: ${join(row.key_points, 6)}` : '',
              join(row.obligations, 6) ? `Obligaciones: ${join(row.obligations, 6)}` : '',
              dl ? `Plazos: ${dl}` : '',
            ].filter(Boolean).join('\n');
            if (block) parts.push(block);
            if (parts.join('\n\n').length >= 3000) break;
          }
          const verifiedBlock = parts.join('\n\n').slice(0, 3000);
          if (verifiedBlock.trim()) {
            documentEvidence.context = [
              documentEvidence.context,
              'ANÁLISIS VERIFICADOS DE LOS DOCUMENTOS SELECCIONADOS (hechos del caso; riesgos/recomendaciones excluidos por no verificados):',
              verifiedBlock,
            ].filter(Boolean).join('\n\n');
          }
        }
      } catch (e) {
        console.error('[LegalUpAI] research verified-analyses failed (continuing without it)', e?.message || e);
      }
    }

    // FASE 4.34D: encabezado en vivo del caso Pro (runtime, sin writes).
    // Legacy (sin link) y ambigüedad → contexto workspace sin cambios.
    let proCaseBlock = '';
    try {
      const resolved = await getProCaseHeader(supabase, { workspaceId: workspace.id, lawyerId: userId });
      if (resolved.status === 'linked') proCaseBlock = formatProCaseBlock(resolved.header);
    } catch (e) {
      console.error('[LegalUpAI] research pro case header failed (continuing without it)', e?.message || e);
    }
    const caseContext = [proCaseBlock, buildJurisprudenceCaseContext(workspace)].filter(Boolean).join('\n');

    // Fase 4.2.4: el retry de JSON/schema inválido vive en el pipeline puro.
    // chatCompletion cubre el retry temporal del proveedor (429/5xx/red); este
    // helper reintenta SOLO el fallo de formato (máx. 3 intentos, sin incluir
    // la salida inválida en el prompt de reintento). NO reintenta NO_EVIDENCE,
    // errores de provider ni CONTEXT_TOO_LARGE.
    // Fase 4.2.10: presupuesto global de llamadas compartido entre el retry de
    // provider (dentro de chatCompletion) y el de schema (aquí): el total de
    // fetch por request queda acotado y determinista.
    const llmBudget = createLlmCallBudget();
    const { outcome: outcomeResult, attempts, retryCount } = await runJurisprudenceWithRetry({
      llmCall: (retryInstruction) =>
        chatCompletion({
          model: AI_DEFAULT_MODEL,
          metering,
          system: buildJurisprudenceSystemPrompt({ documentMode }),
          messages: [
            {
              role: 'user',
              content: buildJurisprudenceUserPrompt({
                question: query,
                context,
                caseContext,
                intent: intentClass,
                documentContext: documentEvidence.context,
              }),
            },
            ...(retryInstruction ? [{ role: 'user', content: retryInstruction }] : []),
          ],
          maxTokens: AI_CHAT_MAX_TOKENS,
          temperature: 0.2,
          budget: llmBudget,
        }),
      sources,
      intent,
      query,
      documents: documentMode === 'none' ? null : caseDocuments,
      workspaceId: workspace.id,
      lawyerId: userId,
      documentMode,
    });

    if (attempts > 1) {
      logDiagnostic('jurisprudence_llm_retry', {
        intent,
        query_hash: queryHash,
        llm_attempts: attempts,
        llm_retry_count: retryCount,
        llm_valid: outcomeResult.status !== 'invalid_response',
        model: AI_DEFAULT_MODEL,
      });
    }

    // Fase 4.2.10: la recuperación controlada por OUTPUT_TOKEN_LIMIT (salida
    // compacta, una sola vez) quedó registrada en la respuesta del pipeline.
    if (outcomeResult.outputLimitRecovered) {
      logDiagnostic('jurisprudence_output_limit_recovered', {
        intent,
        query_hash: queryHash,
        model: AI_DEFAULT_MODEL,
      });
    }

    // Fase 4.1.11: todo el procesamiento POST-LLM (schema, verificación,
    // síntesis, jerarquía, contradicciones y los estados SUCCESS/NO_EVIDENCE/
    // INVALID_RESPONSE) vive en el pipeline puro `jurisprudencePipeline.mjs`.
    // La ruta conserva búsqueda, chat, persistencia y observabilidad.

    // Fase 4.1.10: una respuesta no estructurada (JSON/schema inválido) NUNCA se
    // convierte en una respuesta jurídica, ni se reconstruye el resumen desde el
    // texto crudo ("Proveedor IA respondió con 0 fuentes..."). Se trata como un
    // fallo del proveedor: error claro, sin afirmaciones fabricadas y con opción
    // de reintentar desde el frontend.
    if (outcomeResult.status === 'invalid_response') {
      logDiagnostic('jurisprudence_llm_invalid_response', {
        intent,
        total_sources: sources.length,
        query_hash: queryHash,
      });
      return await metering.respond(res, 502, {
        error:
          'El modelo de IA no devolvió una respuesta válida. Intenta nuevamente en unos minutos.',
        code: 'AI_PROVIDER_INVALID_RESPONSE',
      });
    }

    const {
      answer,
      persistedSources,
      allVerifiedClaims,
      maticesFinales,
      síntesisText,
      researchWarnings,
      contradicciones,
      referencedIds,
      outcome,
      documentClaimsDropped = 0,
    } = outcomeResult;

    logDiagnostic('ai_research_document_grounding', {
      document_mode: documentMode,
      documents_considered: documentEvidence.stats.documents_considered,
      documents_used: documentEvidence.stats.documents_used,
      document_fragments_selected: documentEvidence.stats.fragments_selected,
      document_claims_kept: allVerifiedClaims.filter((c) => c.category === 'document').length,
      document_claims_dropped: documentClaimsDropped,
    });

    const { data: savedResearch, error: insertError } = await supabase
      .from('ai_research_requests')
      .insert({
        workspace_id: workspace.id,
        lawyer_id: userId,
        query,
        answer,
        sources: persistedSources,
        model: AI_DEFAULT_MODEL,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    try {
      await capturePostHog('ai_jurisprudence_researched', userId, {
        case_id: workspace.id,
        source_count: referencedIds.length,
        total_found: sources.length,
        intent,
        claims_kept: allVerifiedClaims.length,
        warnings_count: researchWarnings.length,
        contradicciones: contradicciones.length,
        document_mode: documentMode,
        document_claims_kept: allVerifiedClaims.filter((c) => c.category === 'document').length,
        document_claims_dropped: documentClaimsDropped,
      });
    } catch (posthogError) {
      console.error('[LegalUpAI] ai_jurisprudence_researched failed', posthogError);
    }

    await metering.respond(res, 200, {
      research: savedResearch,
      sources: persistedSources,
      claims: allVerifiedClaims,
      matices: maticesFinales,
      síntesis: síntesisText,
      warnings: researchWarnings,
      intent,
      outcome,
      // Fase 4.2.6: tipo de investigación (document/mixed/jurisprudence). Se
      // expone en la respuesta HTTP pero NO se persiste (la columna
      // research_type de ai_research_requests no está garantizada en todos los
      // entornos); el frontend ya tipa este campo.
      research_type: documentMode === 'none' ? 'jurisprudence' : documentMode,
    });
  } catch (error) {
    console.error('[LegalUpAI] jurisprudence error:', error);
    const code = error?.code || 'PROVIDER_ERROR';

    // Fase 4.1.10: observabilidad estructurada de rate limits. Solo datos del
    // proveedor/modelo/status, sin contenido de consultas ni datos de usuario.
    if (code === 'AI_PROVIDER_RATE_LIMITED') {
      logDiagnostic('ai_provider_rate_limited', {
        provider: 'openrouter',
        model: AI_DEFAULT_MODEL,
        status: error?.status || 429,
      });
    }

    // Fase 4.2.10: observabilidad de fallos de infraestructura del proveedor
    // (timeout, red, 5xx, vacío, límite de llamadas, presupuesto de salida).
    // Solo metadata; nunca consultas, documentos, claims ni contenido jurídico.
    if (code.startsWith('AI_PROVIDER_') || code === 'OUTPUT_TOKEN_LIMIT') {
      logDiagnostic('ai_provider_error', {
        error_code: code,
        provider: 'openrouter',
        model: AI_DEFAULT_MODEL,
        status: error?.status || null,
        latency_ms: Number.isFinite(error?.latencyMs) ? error.latencyMs : null,
      });
    }

    const status =
      error?.status && error.status >= 400 && error.status < 500 ? error.status : 500;
    await metering.respond(res, error?.status || status, {
      error:
        error.message || 'No se pudo completar la investigación. Intenta nuevamente en unos minutos.',
      code,
    });
  }
});

// — Fase 4.21: Case Workflow helpers (see server/ai/caseWorkflow.mjs for pure helpers) —

async function buildCaseIntelligenceForWorkflow(workspaceId, userId) {
  const { data: allDocs, error: allDocsError } = await supabase
    .from('ai_documents')
    .select('id, original_filename, file_path, file_size_bytes, mime_type, status, page_count, created_at')
    .eq('workspace_id', workspaceId)
    .eq('lawyer_id', userId)
    .order('created_at', { ascending: true });
  if (allDocsError) throw allDocsError;
  const docs = (allDocs || []).filter((d) => d.status === 'ready');
  const pendingDocs = (allDocs || []).filter((d) => d.status === 'pending' || d.status === 'processing');
  const failedDocs = (allDocs || []).filter((d) => d.status === 'failed');
  const { data: analyses, error: analysesError } = await supabase
    .from('ai_document_analyses')
    .select('document_id, summary, document_type, parties, key_points, obligations, deadlines, risks, recommendations, claims, model, created_at')
    .eq('workspace_id', workspaceId)
    .eq('lawyer_id', userId)
    .order('created_at', { ascending: true });
  if (analysesError) throw analysesError;
  const parties = Array.from(new Set((analyses || []).flatMap((a) => Array.isArray(a.parties) ? a.parties : [])));
  const obligations = Array.from(new Set((analyses || []).flatMap((a) => Array.isArray(a.obligations) ? a.obligations : [])));
  const risks = Array.from(new Set((analyses || []).flatMap((a) => Array.isArray(a.risks) ? a.risks : [])));
  // facts dedup minimal for contradiction detection (same as intelligence)
  const allClaims = [];
  const docById = new Map((docs || []).map((d) => [d.id, d]));
  for (const a of analyses || []) {
    for (const c of Array.isArray(a.claims) ? a.claims : []) {
      allClaims.push({ text: c.text, source_id: c.source_id });
    }
  }
  const deduped = new Map();
  for (const c of allClaims) {
    const key = String(c.text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
    if (!key) continue;
    if (!deduped.has(key)) deduped.set(key, c);
  }
  const facts = Array.from(deduped.values());
  const byPrefix = new Map();
  for (const f of facts) {
    const prefix = String(f.text || '').split(/\s+/).slice(0, 3).join(' ').toLowerCase();
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
    byPrefix.get(prefix).push(f);
  }
  const contradictions = [];
  for (const [, group] of byPrefix) if (group.length > 1 && new Set(group.map((g) => g.text)).size > 1) contradictions.push({ topic: group[0].text.slice(0, 30) });
  const missingInformation = [];
  if (facts.length === 0) missingInformation.push('No se encontraron hechos verificados.');
  if (parties.length === 0) missingInformation.push('No se encontraron partes.');
  return {
    document_count: docs.length,
    pending_count: pendingDocs.length,
    failed_count: failedDocs.length,
    total_documents: (allDocs || []).length,
    contradictions,
    missingInformation,
    risks,
    pendingDocs, failedDocs, docs, analyses, parties, obligations, allDocs,
  };
}

async function syncCaseWorkflowItems(workspaceId, userId) {
  const intel = await buildCaseIntelligenceForWorkflow(workspaceId, userId);
  const derived = deriveCaseActions(intel);
  const persistable = derived.filter((a) => WORKFLOW_PERSISTABLE_TYPES.has(a.type));
  // Fetch existing
  const { data: existing, error: fetchError } = await supabase
    .from('ai_case_workflow_items')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('lawyer_id', userId);
  if (fetchError) throw fetchError;
  const byActionId = new Map((existing || []).map((r) => [r.action_id, r]));
  for (const act of persistable) {
    const actionId = act.type;
    const existingItem = byActionId.get(actionId);
    if (existingItem) {
      // Status preservation: never reset completed/dismissed/in_progress to pending automatically
      // Only update title/description/priority if still pending/in_progress? But safe to update all metadata without touching status
      const updates = {};
      if (existingItem.title !== act.title) updates.title = act.title;
      if (existingItem.description !== act.description) updates.description = act.description;
      if (existingItem.priority !== act.priority) updates.priority = act.priority;
      if (Object.keys(updates).length > 0) {
        await supabase.from('ai_case_workflow_items').update(updates).eq('id', existingItem.id).eq('lawyer_id', userId);
      }
    } else {
      await supabase.from('ai_case_workflow_items').insert({
        lawyer_id: userId,
        workspace_id: workspaceId,
        case_id: workspaceId,
        action_id: actionId,
        title: act.title,
        description: act.description,
        status: 'pending',
        priority: act.priority,
        source_type: null,
        source_document_id: null,
      });
    }
  }
  const { data: refreshed, error: refreshError } = await supabase
    .from('ai_case_workflow_items')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('lawyer_id', userId)
    .order('created_at', { ascending: false });
  if (refreshError) throw refreshError;
  return sortWorkflowItems(refreshed || []);
}

// GET /api/ai/cases/:caseId/intelligence — Case-Level Intelligence (Fase 4.6).
// Agrega hechos verificados de todos los documentos ready del caso, con evidencia y trazabilidad.
// Capa derivada, sin persistencia nueva, sin LLM, sin embeddings.
app.get('/api/ai/cases/:caseId/intelligence', async (req, res) => {
  let userId = null;
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;

    const workspace = await getAIWorkspaceOwned(req.params.caseId, userId);
    if (!workspace) return res.status(404).json({ error: 'Caso no encontrado.' });

    const entitlement = await requireAIEntitlement(req, res, userId, { metered: false });
    if (entitlement.res) return entitlement.res;

    // FASE 4.59C: resolución del caso canónico para snapshots. 0 filas =
    // legacy (sin snapshot, comportamiento actual). >1 = ambiguo: no persistir.
    const snapshotCase = await resolveSnapshotCase(supabase, { lawyerId: userId, workspaceId: workspace.id });
    if (snapshotCase.status === 'ambiguous') {
      return res.status(409).json({ error: 'El workspace está vinculado a más de un caso.', code: 'AI_CASE_LINK_AMBIGUOUS' });
    }
    const snapshotCaseRow = snapshotCase.caseRow;

    // FASE 4.59C: agregación canónica (ver server/ai/caseSnapshots.mjs).
    const agg = await computeCaseIntelligence({ supabase, workspace, userId });
    const { allDocs, analyses, intelResearchRows } = agg;

    const intelligencePayload = assembleIntelligencePayload(agg, workspace.id);

    // FASE 4.59C: snapshot versionado. Legacy (sin caso) responde sin
    // persistir. Mismo fingerprint → se retorna la versión vigente sin
    // duplicar. Determinista, 0 provider, 0 cuota.
    let snapshotMeta = null;
    if (snapshotCaseRow) {
      const manifest = buildSourceManifest({
        caseRow: snapshotCaseRow,
        docs: allDocs || [],
        analyses: analyses || [],
        researchRows: intelResearchRows,
      });
      const fingerprint = fingerprintManifest(manifest);
      const { snapshot: row } = await persistSnapshotIfNew(supabase, {
        lawyerId: userId,
        caseId: snapshotCaseRow.id,
        workspaceId: workspace.id,
        fingerprint,
        manifest,
        payload: intelligencePayload,
      });
      snapshotMeta = {
        version: row.version,
        generated_at: row.created_at,
        is_stale: false,
        source_fingerprint: row.source_fingerprint,
      };
    }

    res.json({ ...intelligencePayload, snapshot: snapshotMeta });
  } catch (error) {
    console.error('[LegalUpAI] case intelligence error:', error);
    res.status(500).json({ error: 'No se pudo cargar la inteligencia del caso.' });
  }
});

// — FASE 4.59D: Draft from Case V1 —
const AIDraftRequestSchema = z.object({
  draft_type: z.enum(['escrito', 'informe', 'carta', 'otro']),
  instruction: z.string().trim().min(10).max(2000),
});
const AIDraftResponseSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  sources: z
    .array(
      z.union([
        z.object({
          kind: z.literal('document').optional(),
          document_id: z.string(),
          file_name: z.string(),
          fragment_id: z.string().optional(),
          evidence: z.string().optional(),
        }),
        z.object({
          kind: z.literal('research').optional(),
          research_id: z.string(),
          research_query: z.string().optional(),
          research_date: z.string().optional(),
          title: z.string().optional(),
          url: z.string().optional(),
        }),
      ])
    )
    .default([]),
  missing_info: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});
// V1 controlled gate: planes pagados con misma semántica (Plus difiere solo
// por volumen futuro, nunca por funcionalidad). Free/free_case/legacy: 403.
// Sin cuota certificada: p_drafting_limit NULL + topes globales. La activación
// productiva requiere decisión comercial (reporte 4.59D).
const DRAFTING_ALLOWED_PLANS = ['essential', 'pro_limited', 'pro', 'plus'];

app.post('/api/ai/cases/:caseId/drafts', async (req, res) => {
  let userId = null;
  const metering = createAIMetering({ supabase, tokenLimit: AI_PROTECT_MAX_MONTHLY_TOKENS, operationLimit: AI_PROTECT_MAX_MONTHLY_REQUESTS });
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;

    const parsed = AIDraftRequestSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Solicitud inválida: tipo de borrador e instrucción (10-2000 caracteres).', code: 'INVALID_REQUEST' });
    }
    const { draft_type, instruction } = parsed.data;

    const workspace = await getAIWorkspaceOwned(req.params.caseId, userId);
    if (!workspace) return res.status(404).json({ error: 'Caso no encontrado.' });

    const entitlement = await requireAIEntitlement(req, res, userId, { metered: false });
    if (entitlement.res) return entitlement.res;
    // 4.59E kill switch (server-side, default OFF): bloquea NUEVA generación;
    // lectura/edición de borradores viven en rutas separadas sin este gate.
    if (process.env.AI_DRAFTING_ENABLED !== '1') {
      return res.status(403).json({ error: 'La generación de borradores no está disponible por ahora.', code: 'AI_DRAFTING_DISABLED' });
    }
    if (!DRAFTING_ALLOWED_PLANS.includes(entitlement.plan)) {
      return res.status(403).json({ error: 'La generación de borradores requiere un plan de pago.', code: 'AI_FEATURE_NOT_AVAILABLE' });
    }

    // Caso canónico: los borradores exigen lawyer_case_id (FK) y snapshot.
    const link = await resolveSnapshotCase(supabase, { lawyerId: userId, workspaceId: workspace.id });
    if (link.status === 'ambiguous') {
      return res.status(409).json({ error: 'El workspace está vinculado a más de un caso.', code: 'AI_CASE_LINK_AMBIGUOUS' });
    }
    if (link.status !== 'linked') {
      return res.status(404).json({ error: 'Se requiere un caso vinculado para generar borradores.', code: 'CASE_REQUIRED' });
    }

    // Snapshot vigente (refresca si stale; crea v1 si ausente).
    const agg = await computeCaseIntelligence({ supabase, workspace, userId });
    const manifest = buildSourceManifest({
      caseRow: link.caseRow,
      docs: agg.allDocs,
      analyses: agg.analyses,
      researchRows: agg.intelResearchRows,
    });
    const fingerprint = fingerprintManifest(manifest);
    const { snapshot: snapRow } = await persistSnapshotIfNew(supabase, {
      lawyerId: userId,
      caseId: link.caseRow.id,
      workspaceId: workspace.id,
      fingerprint,
      manifest,
      payload: assembleIntelligencePayload(agg, workspace.id),
    });
    const snapPayload = snapRow.snapshot || {};

    // Evidencia primaria acotada por relevancia (reutiliza document grounding).
    const { data: readyDocs } = await supabase
      .from('ai_documents')
      .select('id, original_filename, extracted_text, workspace_id, lawyer_id')
      .eq('workspace_id', workspace.id)
      .eq('lawyer_id', userId)
      .eq('status', 'ready');
    // FASE 4.61E retrieval (query = instruccion).
    let draftPack = null;
    let draftRagMode = 'legacy';
    try {
      const { retrieveCaseEvidence } = await import('./server/ai/ragRetrieval.mjs');
      const { decideChatRagMode } = await import('./server/ai/caseChatRag.mjs');
      const retrieved = await retrieveCaseEvidence({
        supabase, lawyerId: userId, caseId: link.caseRow.id, query: instruction,
      });
      draftPack = retrieved.pack;
      draftRagMode = decideChatRagMode({ pack: draftPack, retrievalMode: retrieved.retrievalMode });
    } catch (e) {
      console.error('[LegalUpAI] draft rag retrieval failed, legacy fallback', e?.message || e);
      draftPack = null;
      draftRagMode = 'legacy';
    }
    const factTexts = Array.isArray(snapPayload.facts)
      ? snapPayload.facts.slice(0, 10).map((f) => (typeof f === 'string' ? f : f.text || ''))
      : [];
    const unindexedIds = new Set((draftPack?.retrievalMetadata?.unindexedDocumentIds || []));
    const legacyDocs = draftRagMode === 'rag-full'
      ? []
      : (readyDocs || []).filter((d) => draftRagMode !== 'rag-partial' || unindexedIds.has(d.id));
    const { context: evidenceContext, docMap: legacyDocMap } = selectDraftEvidence({
      documents: legacyDocs,
      instruction,
      snapshotFacts: factTexts,
      workspaceId: workspace.id,
      lawyerId: userId,
    });
    // docMap del Pack (textos por documento) + fallback legacy.
    const docMap = new Map(legacyDocMap);
    for (const e of draftPack?.documentEvidence || []) {
      if (!docMap.has(e.documentId)) {
        const parts = (draftPack.documentEvidence || [])
          .filter((x) => x.documentId === e.documentId)
          .map((x) => x.text);
        docMap.set(e.documentId, { file_name: e.filename, text: parts.join('\n\n') });
      }
    }
    const researchMap = new Map(
      (Array.isArray(snapPayload.legalContext) ? snapPayload.legalContext : []).map((l) => [
        String(l.research_id),
        { query: l.query, created_at: l.created_at, urls: new Set((l.source_urls || []).filter(Boolean)) },
      ])
    );
    // Research del Pack (misma memoria persistida, sin segundo selector).
    for (const r of draftPack?.researchEvidence || []) {
      if (!researchMap.has(String(r.researchId))) {
        researchMap.set(String(r.researchId), {
          query: r.query,
          created_at: r.date,
          urls: new Set(r.url ? [r.url] : []),
        });
      }
    }
    const researchBlocks = (Array.isArray(snapPayload.legalContext) ? snapPayload.legalContext : [])
      .slice(0, 5)
      .map((l, i) => `Contexto legal ${i + 1} (investigación del ${l.created_at || 'fecha no registrada'}${l.query ? ` sobre: ${l.query}` : ''}): ${String(l.synthesis || '').slice(0, 600)}`)
      .join('\n');

    let proCaseBlock = '';
    try {
      const resolved = await getProCaseHeader(supabase, { workspaceId: workspace.id, lawyerId: userId });
      if (resolved.status === 'linked') proCaseBlock = formatProCaseBlock(resolved.header);
    } catch (e) {
      console.error('[LegalUpAI] draft pro case header failed (continuing without it)', e?.message || e);
    }
    // En FULL/PARTIAL el snapshot aporta hechos/partes (DERIVED); el
    // contexto legal viene del Pack (sin duplicar investigaciones).
    const snapshotForDraft = draftPack
      ? { ...snapPayload, legalContext: [] }
      : snapPayload;
    const draftContext = buildDraftContext({
      instruction,
      draftType: draft_type,
      caseHeader: proCaseBlock,
      snapshot: snapshotForDraft,
      researchBlocks: draftPack ? '' : researchBlocks,
    });
    let packEvidenceBlock = '';
    if (draftPack && (draftPack.documentEvidence || []).length > 0) {
      const { serializeEvidencePack } = await import('./server/ai/ragRetrieval.mjs');
      const { DRAFT_RAG_ADDENDUM } = await import('./server/ai/caseDraftRag.mjs');
      packEvidenceBlock = [DRAFT_RAG_ADDENDUM, serializeEvidencePack(draftPack)].filter(Boolean).join('\n\n');
    }
    const fullContext = [draftContext, packEvidenceBlock, evidenceContext ? `EVIDENCIA PRIMARIA DEL CASO (fragmentos relevantes):\n${evidenceContext}` : '']
      .filter(Boolean)
      .join('\n\n')
      .slice(0, DRAFT_LIMITS.MAX_CONTEXT_CHARS);

    if (!isAIProviderConfigured()) {
      return res.status(500).json({ error: 'El servicio de IA no está configurado.', code: 'AI_NOT_CONFIGURED' });
    }

    if (!await metering.begin(req, res, { lawyerId: userId, workspaceId: workspace.id, capability: 'case_drafting', resourceId: snapRow.id, input: { draft_type, instruction, snapshot_id: snapRow.id, model: AI_DEFAULT_MODEL }, commercialLimits: commercialQuotaForPlan(entitlement.plan), freeQuota: freeQuotaForEntitlement(entitlement) })) return;

    const { data: raw } = await chatCompletion({
      model: AI_DEFAULT_MODEL,
      metering,
      system: buildDraftSystemPrompt({ draftType: draft_type }),
      messages: [{ role: 'user', content: `Contexto del caso:\n${fullContext}` }],
      maxTokens: DRAFT_LIMITS.MAX_OUTPUT_TOKENS,
      temperature: 0.2,
    });
    const validated = AIDraftResponseSchema.safeParse(typeof raw === 'string' ? JSON.parse(raw) : raw);
    if (!validated.success) {
      return await metering.respond(res, 502, {
        error: 'El modelo no devolvió un borrador válido. Intenta nuevamente.',
        code: 'AI_PROVIDER_INVALID_RESPONSE',
      });
    }
    const checked = validateDraftSources(validated.data.sources, { docMap, researchMap });
    // FASE 4.61E — filtro de pertenencia al Pack + provenance estable.
    // Fuentes fuera del Pack y del fallback permitido se descartan.
    let packDropped = 0;
    if (draftPack) {
      const { filterDraftSourcesByPack, attachPackProvenance, draftRagObservability } = await import('./server/ai/caseDraftRag.mjs');
      const packDocIds = (draftPack.documentEvidence || []).map((e) => e.documentId);
      const fallbackDocIds = draftRagMode === 'rag-full' ? [] : [...legacyDocs.map((d) => d.id)];
      const packResearchIds = (draftPack.researchEvidence || []).map((r) => String(r.researchId));
      const legacyResearchIds = [...researchMap.keys()];
      const filtered = filterDraftSourcesByPack(checked.sources, {
        packDocIds, fallbackDocIds, packResearchIds, legacyResearchIds,
      });
      packDropped = filtered.droppedPack;
      checked.sources = attachPackProvenance(filtered.sources, draftPack);
      try {
        console.log('[rag-draft]', JSON.stringify(draftRagObservability({
          mode: draftRagMode,
          pack: draftPack,
          droppedPack: packDropped,
          validatedDoc: checked.sources.filter((s) => !s.research_id).length,
          validatedResearch: checked.sources.filter((s) => s.research_id).length,
        })));
      } catch { /* observabilidad best-effort */ }
    }
    const warnings = [...(validated.data.warnings || []), ...checked.warnings];
    const content = String(validated.data.content || '').slice(0, 60000);
    if (!content.trim()) {
      return await metering.respond(res, 502, {
        error: 'El modelo no devolvió contenido. Intenta nuevamente.',
        code: 'AI_PROVIDER_INVALID_RESPONSE',
      });
    }

    const { data: saved, error: saveError } = await supabase
      .from('ai_case_drafts')
      .insert({
        lawyer_id: userId,
        lawyer_case_id: link.caseRow.id,
        workspace_id: workspace.id,
        intelligence_snapshot_id: snapRow.id,
        draft_type,
        instruction,
        title: String(validated.data.title).slice(0, 300),
        content,
        sources: checked.sources,
        model: AI_DEFAULT_MODEL,
        status: 'completed',
      })
      .select()
      .single();
    if (saveError) throw saveError;

    try {
      await capturePostHog('ai_case_draft_generated', userId, {
        case_id: link.caseRow.id,
        draft_type,
        snapshot_version: snapRow.version,
        sources_kept: checked.sources.length,
        sources_dropped: checked.dropped,
        retrieval_mode: draftRagMode,
        coverage_ratio: draftPack?.retrievalMetadata?.coverageRatio ?? null,
      });
    } catch (e) {
      console.error('[LegalUpAI] draft analytics failed (continuing)', e?.message || e);
    }

    await metering.respond(res, 200, {
      draft: saved,
      snapshot: { version: snapRow.version, generated_at: snapRow.created_at },
      warnings,
    });
  } catch (error) {
    console.error('[LegalUpAI] draft error:', error);
    const code =
      error?.code?.startsWith('AI_') ? error.code : 'PROVIDER_ERROR';
    await metering.respond(res, error?.status || 500, {
      error: error.message || 'No se pudo generar el borrador.',
      code,
    });
  }
});

app.get('/api/ai/cases/:caseId/drafts', async (req, res) => {
  let userId = null;
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;
    const workspace = await getAIWorkspaceOwned(req.params.caseId, userId);
    if (!workspace) return res.status(404).json({ error: 'Caso no encontrado.' });
    const entitlement = await requireAIEntitlement(req, res, userId, { metered: false });
    if (entitlement.res) return entitlement.res;
    const link = await resolveSnapshotCase(supabase, { lawyerId: userId, workspaceId: workspace.id });
    if (link.status !== 'linked') return res.json({ drafts: [] });
    const { data, error } = await supabase
      .from('ai_case_drafts')
      .select('id, draft_type, title, status, created_at, updated_at, intelligence_snapshot_id')
      .eq('lawyer_id', userId)
      .eq('lawyer_case_id', link.caseRow.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ drafts: data || [] });
  } catch (error) {
    console.error('[LegalUpAI] drafts list error:', error);
    res.status(500).json({ error: 'No se pudieron cargar los borradores.' });
  }
});

app.get('/api/ai/cases/:caseId/drafts/:draftId', async (req, res) => {
  let userId = null;
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;
    const workspace = await getAIWorkspaceOwned(req.params.caseId, userId);
    if (!workspace) return res.status(404).json({ error: 'Caso no encontrado.' });
    const entitlement = await requireAIEntitlement(req, res, userId, { metered: false });
    if (entitlement.res) return entitlement.res;
    const { data, error } = await supabase
      .from('ai_case_drafts')
      .select('*')
      .eq('id', req.params.draftId)
      .eq('lawyer_id', userId)
      .eq('workspace_id', workspace.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Borrador no encontrado.' });
    res.json({ draft: data });
  } catch (error) {
    console.error('[LegalUpAI] draft open error:', error);
    res.status(500).json({ error: 'No se pudo abrir el borrador.' });
  }
});

app.put('/api/ai/cases/:caseId/drafts/:draftId', async (req, res) => {
  let userId = null;
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;
    const workspace = await getAIWorkspaceOwned(req.params.caseId, userId);
    if (!workspace) return res.status(404).json({ error: 'Caso no encontrado.' });
    const entitlement = await requireAIEntitlement(req, res, userId, { metered: false });
    if (entitlement.res) return entitlement.res;
    const content = typeof req.body?.content === 'string' ? req.body.content : '';
    if (!content.trim() || content.length > 200000) {
      return res.status(400).json({ error: 'Contenido inválido.', code: 'INVALID_REQUEST' });
    }
    const { data: existing, error: fetchError } = await supabase
      .from('ai_case_drafts')
      .select('id')
      .eq('id', req.params.draftId)
      .eq('lawyer_id', userId)
      .eq('workspace_id', workspace.id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) return res.status(404).json({ error: 'Borrador no encontrado.' });
    const { data, error } = await supabase
      .from('ai_case_drafts')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', req.params.draftId)
      .eq('lawyer_id', userId)
      .select()
      .single();
    if (error) throw error;
    res.json({ draft: data });
  } catch (error) {
    console.error('[LegalUpAI] draft update error:', error);
    res.status(500).json({ error: 'No se pudo guardar el borrador.' });
  }
});

// — Fase 4.21: Case Workflow endpoints —
app.get('/api/ai/cases/:caseId/workflow', async (req, res) => {
  let userId = null;
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;
    const workspace = await getAIWorkspaceOwned(req.params.caseId, userId);
    if (!workspace) return res.status(404).json({ error: 'Caso no encontrado.' });
    const entitlement = await requireAIEntitlement(req, res, userId, { metered: false });
    if (entitlement.res) return entitlement.res;
    const { data, error } = await supabase
      .from('ai_case_workflow_items')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('lawyer_id', userId);
    if (error) throw error;
    res.json({ items: sortWorkflowItems(data || []) });
  } catch (error) {
    console.error('[LegalUpAI] workflow GET error:', error);
    res.status(500).json({ error: 'No se pudo cargar el workflow del caso.' });
  }
});

app.post('/api/ai/cases/:caseId/workflow/sync', async (req, res) => {
  let userId = null;
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;
    const workspace = await getAIWorkspaceOwned(req.params.caseId, userId);
    if (!workspace) return res.status(404).json({ error: 'Caso no encontrado.' });
    const entitlement = await requireAIEntitlement(req, res, userId, { metered: false });
    if (entitlement.res) return entitlement.res;
    // 4.34E: deterministic sync derives from already-authorized stored Case
    // intelligence (0 provider calls) — a Core Case capability, not a premium
    // generation operation. `workflow_generation` is preserved as a feature key
    // for future genuinely generative workflow use.
    const items = await syncCaseWorkflowItems(workspace.id, userId);
    res.json({ items });
  } catch (error) {
    console.error('[LegalUpAI] workflow sync error:', error);
    res.status(500).json({ error: 'No se pudo sincronizar el workflow.' });
  }
});

app.patch('/api/ai/cases/:caseId/workflow/:itemId', async (req, res) => {
  let userId = null;
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;
    const workspace = await getAIWorkspaceOwned(req.params.caseId, userId);
    if (!workspace) return res.status(404).json({ error: 'Caso no encontrado.' });
    const entitlement = await requireAIEntitlement(req, res, userId, { metered: false });
    if (entitlement.res) return entitlement.res;
    const { status } = req.body || {};
    if (!WORKFLOW_STATUSES.has(status)) return res.status(400).json({ error: 'Estado no válido.' });
    const { data: existing, error: fetchError } = await supabase
      .from('ai_case_workflow_items')
      .select('*')
      .eq('id', req.params.itemId)
      .eq('workspace_id', workspace.id)
      .eq('lawyer_id', userId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) return res.status(404).json({ error: 'Item no encontrado.' });
    if (existing.status !== status && !WORKFLOW_ALLOWED_TRANSITIONS[existing.status]?.has(status)) {
      return res.status(400).json({ error: `Transición no permitida: ${existing.status} → ${status}` });
    }
    const updates = { status };
    const now = new Date().toISOString();
    if (status === 'completed') { updates.completed_at = now; updates.dismissed_at = null; }
    else if (status === 'dismissed') { updates.dismissed_at = now; updates.completed_at = null; }
    else if (status === 'pending') { updates.completed_at = null; updates.dismissed_at = null; }
    else if (status === 'in_progress') { updates.completed_at = null; updates.dismissed_at = null; }
    const { data: updated, error: updateError } = await supabase
      .from('ai_case_workflow_items')
      .update(updates)
      .eq('id', existing.id)
      .eq('lawyer_id', userId)
      .select()
      .single();
    if (updateError) throw updateError;
    // analytics metadata-only
    if (status === 'in_progress') await capturePostHog('ai_case_workflow_action_started', userId, { action: existing.action_id });
    if (status === 'completed') await capturePostHog('ai_case_workflow_action_completed', userId, { action: existing.action_id });
    if (status === 'dismissed') await capturePostHog('ai_case_workflow_action_dismissed', userId, { action: existing.action_id });
    res.json({ item: updated });
  } catch (error) {
    console.error('[LegalUpAI] workflow PATCH error:', error);
    res.status(500).json({ error: 'No se pudo actualizar el workflow.' });
  }
});

// GET /api/ai/documents/:documentId/evidence/:fragmentId — Evidencia contextual (Fase 4.8).
// Devuelve solo el fragmento solicitado con ubicación honesta y evidence, validando ownership.
// 4.34C: fragment_index es orden de chunk, nunca página física (la extracción no preserva páginas).
app.get('/api/ai/documents/:documentId/evidence/:fragmentId', async (req, res) => {
  let userId = null;
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;

    const { documentId, fragmentId } = req.params;
    const doc = await getAIDocumentOwned(documentId, userId);
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado.' });

    // Verifica que el fragmentId pertenezca al documento (determinista via chunk)
    const { chunkDocumentText } = await import('./server/ai/documentGrounding.mjs');
    const chunks = chunkDocumentText(String(doc.extracted_text || ''), { documentId: doc.id });
    const fragment = chunks.find((c) => c.id === fragmentId);
    if (!fragment) return res.status(404).json({ error: 'Evidencia no disponible.' });

    // Contexto: párrafo anterior y posterior si existen
    const idx = chunks.findIndex((c) => c.id === fragmentId);
    const prev = idx > 0 ? chunks[idx - 1].text.slice(-300) : '';
    const next = idx < chunks.length - 1 ? chunks[idx + 1].text.slice(0, 300) : '';

    res.json({
      document_id: doc.id,
      fragment_id: fragment.id,
      fragment_index: fragment.index,
      page_number: null,
      evidence: fragment.text,
      context_before: prev,
      context_after: next,
      document_filename: doc.original_filename,
    });
  } catch (error) {
    console.error('[LegalUpAI] evidence error:', error);
    res.status(500).json({ error: 'No se pudo cargar esta evidencia.' });
  }
});

// GET /api/ai/usage — resumen de consumo IA del abogado en el mes en curso.
// Fase 3.6: expone tokens/créditos/costos para el medidor de la UI. Los límites
// técnicos de protección se devuelven como referencia, sin ser comerciales.
app.get('/api/ai/usage', async (req, res) => {
  let userId = null;
  try {
    userId = await requireAILawyer(req, res);
    if (!userId) return;

    const { periodStart, periodEnd } = getAIUsagePeriod();
    const periodStartIso = periodStart.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('ai_usage_monthly')
      .select('total_tokens, total_credits, document_analysis_count, chat_message_count, jurisprudence_research_count, estimated_cost_usd')
      .eq('lawyer_id', userId)
      .eq('period_start', periodStartIso)
      .maybeSingle();

    if (error) throw error;

    const usage = data || {
      total_tokens: 0,
      total_credits: 0,
      document_analysis_count: 0,
      chat_message_count: 0,
      jurisprudence_research_count: 0,
      estimated_cost_usd: 0,
    };

    const requests = (usage.document_analysis_count || 0) + (usage.chat_message_count || 0);

    // 4.38C: commercial allowance (authority is server/DB; frontend only displays).
    // Limits apply to paid tiers (pro_limited, plus); other plans get used
    // counts with null limits. 4.57D: Plus resolves its higher pools.
    // Never exposes provider cost, tokens detail beyond totals, or other lawyers.
    let allowance = null;
    try {
      const access = await getAILawyerAccess(userId);
      const plan = getPlanForAccess(access);
      // 4.44A: free first-Case lifetime allowance (no monthly reset).
      // Lifetime usage = succeeded ops (quota_units=1) + in-flight reservations,
      // matching ai_begin_operation enforcement (reserved+succeeded scoped by
      // free lawyer_case_id across all periods).
      if (plan === 'free_case') {
        const freeCase = await getFreeCaseAccess(userId);
        if (freeCase) {
          const { data: freeOps } = await supabase
            .from('ai_operations')
            .select('capability,status,is_free_allowance')
            .eq('lawyer_id', userId)
            .eq('lawyer_case_id', freeCase.caseId)
            .in('status', ['reserved', 'succeeded']);
          const chatUsed = (freeOps || []).filter((o) => o.capability === 'case_chat' || o.capability === 'document_chat').length;
          const analysisUsed = (freeOps || []).filter((o) => o.capability === 'document_analysis').length;
          // 4.49A: free research counts only flag-attributed ops, so Pro-era
          // research in the same Case never consumes the free 1/1 (§12).
          const researchUsed = (freeOps || []).filter((o) => o.capability === 'research' && o.is_free_allowance).length;
          const { count: freeDocs } = await supabase
            .from('ai_documents')
            .select('id', { count: 'exact', head: true })
            .eq('lawyer_id', userId)
            .eq('workspace_id', freeCase.workspaceId);
          const lifetime = (used, limit) => ({ used: used || 0, limit, reset: null, available: true });
          allowance = {
            plan,
            chat: lifetime(chatUsed, FREE_CASE_ALLOWANCE.chatLifetime),
            analysis: lifetime(analysisUsed, FREE_CASE_ALLOWANCE.analysisLifetime),
            research: lifetime(researchUsed, FREE_CASE_ALLOWANCE.researchLifetime),
            // 4.59E: drafting excluido de Free (límite 0; la UI muestra gating Pro).
            drafting: lifetime(0, 0),
            documents: lifetime(freeDocs, FREE_CASE_ALLOWANCE.storedDocuments),
          };
        }
      }
      if (!allowance) {
        const quota = commercialQuotaForPlan(plan);
        const { count: storedDocuments } = await supabase
          .from('ai_documents')
          .select('id', { count: 'exact', head: true })
          .eq('lawyer_id', userId);
        // 4.59E: drafting usado = operaciones case_drafting exitosas del mes
        // UTC vigente (autoridad ai_operations vía period_start, no conteo
        // de filas draft ni contador mensual dedicado).
        let draftingUsed = 0;
        try {
          const monthStartIso = periodStart.toISOString().slice(0, 10);
          const { data: draftOps } = await supabase
            .from('ai_operations')
            .select('id')
            .eq('lawyer_id', userId)
            .eq('capability', 'case_drafting')
            .eq('status', 'succeeded')
            .gte('period_start', monthStartIso);
          draftingUsed = (draftOps || []).length;
        } catch (e) {
          console.error('[LegalUpAI] drafting usage failed (reporting 0)', e?.message || e);
        }
        const withLimit = (used, limit) => ({ used: used || 0, limit: limit ?? null, reset: 'monthly', available: true });
        allowance = {
          plan,
          chat: withLimit(usage.chat_message_count, quota?.chat),
          analysis: withLimit(usage.document_analysis_count, quota?.analysis),
          research: withLimit(usage.jurisprudence_research_count, quota?.research),
          drafting: withLimit(draftingUsed, quota?.drafting),
          documents: withLimit(storedDocuments, plan === 'plus' ? PLUS_AI_ALLOWANCE.storedDocuments : plan === 'pro_limited' ? PRO_AI_ALLOWANCE.storedDocuments : null),
        };
      }
    } catch (allowanceError) {
      console.error('[LegalUpAI] allowance error:', allowanceError?.message || allowanceError);
    }

    res.json({
      success: true,
      period_start: periodStartIso,
      period_end: periodEnd.toISOString().slice(0, 10),
      usage: {
        total_tokens: usage.total_tokens || 0,
        total_credits: usage.total_credits || 0,
        document_analysis_count: usage.document_analysis_count || 0,
        chat_message_count: usage.chat_message_count || 0,
        jurisprudence_research_count: usage.jurisprudence_research_count || 0,
        estimated_cost_usd: Number(usage.estimated_cost_usd) || 0,
      },
      allowance,
      protection_limits: {
        monthly_tokens: AI_PROTECT_MAX_MONTHLY_TOKENS,
        monthly_requests: AI_PROTECT_MAX_MONTHLY_REQUESTS,
        rate_limit_per_minute: AI_PROTECT_RATE_LIMIT_PER_MINUTE,
        monthly_tokens_used: usage.total_tokens || 0,
        monthly_requests_used: requests,
      },
    });
  } catch (error) {
    console.error('[LegalUpAI] usage error:', error);
    res.status(500).json({ error: 'No se pudo obtener el consumo de IA.' });
  }
});

// Días naturales restantes hasta trial_ends_at contados por inicio de día
// calendario (no por horas), para que el disparo no dependa de la hora de
// ejecución: siempre cae en 1 y 3 sin saltarse hitos.
const calendarDaysLeft = (trialEndMs, now = Date.now()) => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfDay = new Date(trialEndMs);
  endOfDay.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((endOfDay - startOfToday) / DAY_MS));
};

// Envía el recordatorio de fin de prueba (3 y 1 día natural restante) para
// una suscripción si toca un hito y aún no se mandó. Idempotente por abogado
// (columna trial_reminder_day) y a prueba de reintentos. Retorna true si
// envió email + notificación in-app. Reutilizable por cron y por acceso lazy.
const sendTrialReminderIfDue = async (sub) => {
  const trialEndMs = Date.parse(sub.trial_ends_at);
  if (!trialEndMs || trialEndMs <= Date.now()) return false;

  // daysLeft usa el día calendario restante (p. ej. termina "mañana" → 1,
  // termina "hoy" → 0), sin depender de la hora exacta a la que corra el
  // cron/la app. Sin clamp: 0 es un hito válido (último día).
  const daysLeft = calendarDaysLeft(trialEndMs);

  // Solo envíos en hitos concretos y sin duplicar.
  if (daysLeft !== 3 && daysLeft !== 1 && daysLeft !== 0) return false;
  if (sub.trial_reminder_day === daysLeft) return false;

  const userData = await getAILawyerEmail(sub.lawyer_id);
  if (!userData?.email) return false;

  const subject = daysLeft === 1
    ? 'Tu prueba de LegalUp AI termina mañana'
    : daysLeft === 0
      ? 'Tu prueba de LegalUp AI termina hoy'
      : '¿Ya probaste LegalUp AI con un caso real?';
  await sendAIEmail(
    userData.email,
    subject,
    aiSubscriptionEmailTemplates.trialReminder(daysLeft)
  );
  await supabase.from('ai_subscriptions').update({ trial_reminder_day: daysLeft }).eq('id', sub.id);

  // Notificación in-app al centro de notificaciones (se ve aunque no llegue
  // el email o el abogado no esté logueado justo en ese momento).
  await notificationsService.notifyUser({
    userId: sub.lawyer_id,
    type: daysLeft === 0 ? 'ai.trial.last_day' : daysLeft === 1 ? 'ai.trial.last_day' : 'ai.trial.day_3',
    title: daysLeft === 1
      ? 'Tu prueba de LegalUp AI termina mañana'
      : daysLeft === 0
        ? 'Tu prueba de LegalUp AI termina hoy'
        : 'Te quedan 3 días de prueba gratuita',
    message: daysLeft === 1
      ? 'Tu prueba gratuita de LegalUp AI vence mañana. Suscríbete para no perder el acceso a tus casos, análisis y chat.'
      : daysLeft === 0
        ? 'Tu prueba gratuita de LegalUp AI vence hoy. Suscríbete para no perder el acceso a tus casos, análisis y chat.'
        : 'Te quedan 3 días de prueba gratuita de LegalUp AI. Aprovecha para analizar un documento con IA.',
    entityType: 'ai_subscription',
    entityId: sub.id,
    eventId: `ai-trial-reminder-${sub.id}-${daysLeft}`,
  });

  // Hitos de días de la prueba según días restantes (trial de 5 días).
  // Día 3 → quedan 3 días; Día 5 / último día → queda 1 día; último día → 0.
  if (daysLeft <= 1) {
    await capturePostHog('ai_trial_expiring', sub.lawyer_id, { days_left: daysLeft });
    await capturePostHog('ai_trial_last_day', sub.lawyer_id, { days_left: daysLeft });
  } else {
    await capturePostHog('ai_trial_day_3', sub.lawyer_id, { days_left: daysLeft });
  }
  return true;
};

// Escaneo global de trials vigentes: marca como expirados los vencidos y
// dispara los recordatorios que toquen hito. Reutilizado por el endpoint de
// cron externo y por el scheduler interno del proceso (Render mantiene vivo
// el servidor, así que no depende de infraestructura externa).
const runTrialReminderScan = async () => {
  const { data: trialing, error } = await supabase
    .from('ai_subscriptions')
    .select('id, lawyer_id, status, trial_ends_at, trial_reminder_day')
    .eq('status', 'trialing')
    .not('trial_ends_at', 'is', null);
  if (error) throw error;

  let sent = 0;
  let expired = 0;
  for (const sub of trialing || []) {
    const trialEndMs = Date.parse(sub.trial_ends_at);
    if (!trialEndMs || trialEndMs <= Date.now()) {
      await supabase.from('ai_subscriptions').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', sub.id);
      expired += 1;
      continue;
    }
    if (await sendTrialReminderIfDue(sub)) sent += 1;
  }
  return { processed: (trialing || []).length, sent, expired };
};

// POST /api/ai/trial/reminders — envía recordatorios de fin de prueba (3 y 1
// días restantes) a todos los trials vigentes. Pensado para ser llamado por
// un cron con el header `x-trial-secret`. Es idempotente por abogado
// (columna trial_reminder_day).
app.post('/api/ai/trial/reminders', async (req, res) => {
  const secret = process.env.TRIAL_REMINDER_SECRET;
  if (!secret || String(req.headers['x-trial-secret'] || '') !== String(secret)) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const result = await runTrialReminderScan();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[LegalUpAI] trial reminders error:', error);
    res.status(500).json({ error: 'No se pudieron enviar los recordatorios.' });
  }
});

// Scheduler interno: recorre los trials cada 6 horas (0, 6, 12, 18 h) para
// marcar expirados y disparar los recordatorios de hito aunque nadie abra la
// app. El cálculo por día natural + trial_reminder_day lo hace idempotente,
// así que los disparos repetidos del cron externo nunca duplican.
const TRIAL_REMINDER_SCAN_MS = 6 * 60 * 60 * 1000;
setInterval(async () => {
  try {
    const result = await runTrialReminderScan();
    if (result.sent > 0 || result.expired > 0) {
      console.log(`[LegalUpAI] trial reminder scan: ${result.sent} sent, ${result.expired} expired`);
    }
  } catch (error) {
    console.error('[LegalUpAI] trial reminder scan error:', error);
  }
}, TRIAL_REMINDER_SCAN_MS).unref();

// ============================================================================
// ASISTENTE COMERCIAL Y DE ORIENTACIÓN (front público)
// ============================================================================

// Persistencia de analytics del asistente (solo metadata, SIN contenido de la
// conversación). Alimenta /admin/analytics · Chat: usuarios únicos, inicios de
// conversación, mensajes, categoría e intención comercial. No bloquee el flujo.
const persistChatEvent = async (event) => {
  try {
    const {
      eventType,
      visitorId = null,
      conversationId = null,
      source = 'widget',
      category = null,
      subcategory = null,
      commercialIntent = null,
      urgency = null,
      isLocal = false,
    } = event || {};
    const insert = {
      event_type: String(eventType || 'message_sent'),
      visitor_id: visitorId ? String(visitorId).slice(0, 128) : null,
      conversation_id: conversationId ? String(conversationId).slice(0, 128) : null,
      source: String(source || 'widget').slice(0, 40),
      category: category ? String(category).slice(0, 40) : null,
      subcategory: subcategory ? String(subcategory).slice(0, 60) : null,
      commercial_intent: commercialIntent ? String(commercialIntent).slice(0, 40) : null,
      urgency: urgency ? String(urgency).slice(0, 20) : null,
      is_local: isLocal,
    };
    const { error } = await supabase.from('chat_events').insert([insert]);
    if (error) {
      console.error('[Assistant] chat_events insert error:', error?.message || error);
    }
  } catch (e) {
    console.error('[Assistant] persistChatEvent failed:', e?.message || e);
  }
};

// POST /api/assistant/chat
// Entrada:  { messages: [{role, content}], userCity?, source? }
// Salida:   { reply, category, subcategory, summary, urgency, commercialIntent,
//             readyToRecommend, stage, lawyers?, question?, followUp? }
// El backend clasifica con IA, hace matching determinístico contra Supabase y
// devuelve abogados reales. La IA nunca decide qué abogados existen.
// ----------------------------------------------------------------------------

// Rate limiting simple por IP + token budget por sesión (control de costos §30).
const assistantRateBuckets = new Map();
const ASSISTANT_RATE_WINDOW_MS = 60_000;
const ASSISTANT_RATE_MAX_PER_WINDOW = 12;

const assistantRateLimit = (ip) => {
  const now = Date.now();
  const bucket = assistantRateBuckets.get(ip);
  if (!bucket || now - bucket.startedAt > ASSISTANT_RATE_WINDOW_MS) {
    assistantRateBuckets.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  if (bucket.count >= ASSISTANT_RATE_MAX_PER_WINDOW) return false;
  bucket.count += 1;
  return true;
};

app.post('/api/assistant/chat', async (req, res) => {
  try {
    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').toString().split(',')[0].trim();
    if (!assistantRateLimit(ip)) {
      return res.status(429).json({
        error: 'Has hecho demasiadas consultas en poco tiempo. Espera un momento e inténtalo de nuevo.',
        code: 'RATE_LIMITED',
      });
    }

    const body = req.body || {};
    const messages = sanitizeMessages(body.messages, ASSISTANT_LIMITS.MAX_HISTORY_MESSAGES);
    const userCity = sanitizeText(body.userCity, 60) || null;
    const source = sanitizeText(body.source, 40) || 'widget';

    // Metadata de analytics (sin contenido): identidad anónima del visitante y
    // de la conversación, enviada por el widget. El conteo de "usuarios únicos"
    // usa visitor_id (misma clave que page_views) y "conversaciones" usa el
    // primer mensaje de cada conversation_id.
    const clientVisitorId = sanitizeText(body.visitor_id, 128) || null;
    const conversationId = sanitizeText(body.conversation_id, 128) || null;
    const requestHost = (req.headers?.host || '') + ' ' + (req.headers?.origin || '') + ' ' + String(req.headers['x-forwarded-for'] || '');
    const isLocalRequest = /localhost|127\.0\.0\.1|\[::1\]/.test(requestHost);
    const isFirstMessage = messages.filter((m) => m?.role === 'user').length === 1;

    // Registra el turno del usuario en chat_events. En el primer mensaje de la
    // conversación se emite además 'conversation_started'. Nunca guarda texto.
    const trackAssistantTurn = async (overrides = {}) => {
      const base = {
        visitorId: clientVisitorId,
        conversationId,
        source,
        isLocal: isLocalRequest,
      };
      if (isFirstMessage) {
        await persistChatEvent({ ...base, ...overrides, eventType: 'conversation_started' });
      }
      await persistChatEvent({ ...base, ...overrides, eventType: 'message_sent' });
    };

    if (messages.length === 0) {
      return res.status(400).json({ error: 'No hay mensajes en la conversación.', code: 'INVALID_REQUEST' });
    }

    if (!isAIProviderConfigured()) {
      console.warn('[Assistant] AI no configurada, usando clasificador fallback.');
    }

    // Preguntas de proceso/ayuda (cómo reservar, pagar, cómo funciona): se
    // responden con instrucciones concretas sin clasificar un problema legal.
    const processIntent = detectProcessIntent(messages);
    if (processIntent) {
      try {
        await capturePostHog('assistant_process_help', ip, {
          type: processIntent.type,
          source,
        });
      } catch (e) {
        console.error('[Assistant] process_help tracking failed', e);
      }
      await trackAssistantTurn({ category: 'otros', subcategory: 'proceso', commercialIntent: 'high', urgency: 'low' });
      return res.json({
        reply: processIntent.reply,
        category: 'otros',
        subcategory: 'otros',
        summary: (messages[messages.length - 1]?.content || '').slice(0, 200),
        urgency: 'low',
        commercialIntent: 'high',
        readyToRecommend: false,
        stage: 'help',
        question: null,
        options: [],
        lawyers: [],
        usedAI: false,
        processHelp: processIntent.type,
      });
    }

    // Consulta directa por los servicios de un abogado concreto ("servicios del
    // abogado X"): se busca el perfil real en Supabase y se muestran SUS servicios.
    const servicesIntent = detectLawyerServicesIntent(messages);
    if (servicesIntent) {
      const servicesResult = await findLawyerServicesByName({
        supabase,
        candidates: servicesIntent.candidates,
      });
      if (servicesResult) {
        try {
          await capturePostHog('lawyer_services_viewed', ip, {
            lawyer_id: servicesResult.lawyer.id,
            lawyer_name: servicesResult.name,
            service_count: servicesResult.items.length,
            source,
          });
        } catch (e) {
          console.error('[Assistant] lawyer_services_viewed tracking failed', e);
        }
        const hasServices = servicesResult.items.length > 0;
        const reply = hasServices
          ? `Estos son los servicios que ofrece **${servicesResult.name}**:`
          : `**${servicesResult.name}** no tiene servicios publicados por ahora, pero puedes reservar una consulta o ver su perfil.`;
        await trackAssistantTurn({ category: 'otros', subcategory: 'servicios_abogado', commercialIntent: 'high', urgency: 'low' });
        return res.json({
          reply,
          category: 'otros',
          subcategory: 'servicios_abogado',
          summary: (messages[messages.length - 1]?.content || '').slice(0, 200),
          urgency: 'low',
          commercialIntent: 'high',
          readyToRecommend: false,
          stage: 'services',
          question: null,
          options: [],
          lawyers: [],
          services: {
            lawyer: servicesResult.lawyer,
            items: hasServices ? servicesResult.items : [],
          },
          usedAI: false,
        });
      }
    }

    const { classification, usedAI, usage } = await classifyProblem({
      history: messages,
      userCity,
      chatCompletion: (params) =>
        chatCompletion({
          model: AI_DEFAULT_MODEL,
          temperature: 0.4,
          maxTokens: 700,
          ...params,
        }),
    });

    const { reply, category, subcategory, summary, urgency, commercialIntent, readyToRecommend, question } = classification;

    // Tracking: el problema se entendió/clasificó (no bloquea el flujo).
    if (usedAI) {
      try {
        await capturePostHog('problem_classified', ip, {
          category,
          subcategory,
          urgency,
          commercial_intent: commercialIntent,
          ready_to_recommend: readyToRecommend,
          source,
          estimated_cost_usd: usage?.estimated_cost_usd ?? null,
        });
      } catch (e) {
        console.error('[Assistant] problem_classified failed', e);
      }
    }

    // Analytics del chat en Supabase (solo metadata; mismo turno que antes).
    await trackAssistantTurn({ category, subcategory, commercialIntent, urgency });

    let lawyers = null;
    let stage = readyToRecommend ? 'matching' : 'understanding';
    let followUp = null;

    if (readyToRecommend) {
      lawyers = await matchLawyers({
        supabase,
        category,
        subcategory,
        userCity,
        limit: ASSISTANT_LIMITS.MAX_LAWYERS,
      });

      const fallbackCopy = buildRecommendationCopy({ category, subcategory, urgency, commercialIntent });
      const hasLawyers = Array.isArray(lawyers) && lawyers.length > 0;
      const finalReply = hasLawyers && reply ? reply : hasLawyers ? fallbackCopy : reply;
      let finalLawyers = lawyers;

      stage = hasLawyers ? 'recommendation' : 'matching';
      followUp = hasLawyers
        ? 'Puedes revisar los abogados sugeridos, ver su perfil o reservar una consulta directamente.'
        : 'Puedo mostrarte abogados del área legal más cercana a tu situación.';

      if (hasLawyers) {
        // Cerebro 3 · Explicación grounded (no bloquea el flujo): la IA explica
        // por qué cada abogado real es adecuado. Si falla, caen a matchReasons.
        let explanationReasons = {};
        let explainedWithAI = false;
        let explanationCostUsd = null;
        if (isAIProviderConfigured()) {
          try {
            const problemText = messages
              .filter((m) => m.role === 'user')
              .map((m) => m.content)
              .join('\n')
              .slice(0, ASSISTANT_LIMITS.MAX_MESSAGE_LENGTH);
            const explanation = await explainRecommendation({
              problem: problemText,
              lawyers: lawyers.slice(0, ASSISTANT_LIMITS.MAX_EXPLANATION_REASONS),
              chatCompletion: (params) =>
                chatCompletion({
                  model: AI_DEFAULT_MODEL,
                  temperature: 0.3,
                  maxTokens: 800,
                  ...params,
                }),
            });
            explanationReasons = explanation.reasons || {};
            explainedWithAI = explanation.usedAI;
            explanationCostUsd = explanation.usage?.estimated_cost_usd ?? null;
          } catch (e) {
            console.warn('[Assistant] explicación falló:', e?.message || e);
          }
        }

        finalLawyers = lawyers.map((lawyer) => ({
          ...lawyer,
          explanation: explanationReasons[lawyer.id] || null,
        }));

        try {
          await capturePostHog('lawyer_recommended', ip, {
            category,
            subcategory,
            lawyer_count: lawyers.length,
            top_lawyer_score: lawyers[0]?.matchScore ?? 0,
            explained_by_ai: explainedWithAI,
            explanation_cost_usd: explanationCostUsd,
            source,
          });
        } catch (e) {
          console.error('[Assistant] lawyer_recommended failed', e);
        }
      }

      return res.json({
        reply: finalReply,
        category,
        subcategory,
        summary,
        urgency,
        commercialIntent,
        readyToRecommend,
        stage,
        followUp,
        options: [],
        lawyers: hasLawyers ? finalLawyers : [],
        usedAI,
      });
    }

    res.json({
      reply,
      category,
      subcategory,
      summary,
      urgency,
      commercialIntent,
      readyToRecommend: false,
      stage,
      question: question || null,
      options: classification.options || [],
      followUp: null,
      lawyers: [],
      usedAI,
    });
  } catch (error) {
    console.error('[Assistant] chat error:', error);
    // Registra que el usuario sí envió un mensaje aunque el agente fallara
    // (analytics de uso, sin contenido). No bloquea la respuesta.
    try {
      await trackAssistantTurn({});
    } catch (trackError) {
      console.error('[Assistant] chat_events tracking on error failed:', trackError?.message);
    }
    res.status(500).json({
      error: 'No se pudo procesar tu consulta. Intenta nuevamente en unos minutos.',
      code: error?.code || 'ASSISTANT_ERROR',
    });
  }
});

// ---- Legal category classifier (home textarea) ----
const LEGAL_CATEGORY_CLASSIFIER_PROMPT = `Eres un clasificador jurídico chileno experto.
Tu única tarea es determinar a qué área del derecho pertenece el caso descrito.

Áreas disponibles:
- Derecho Arrendamiento: arriendos, desalojos, garantías, contratos de arriendo, IPC, arrendatario, arrendador
- Derecho Laboral: despidos, finiquitos, acoso laboral, licencias médicas, contratos de trabajo, empleador, empleado, AFP, cotizaciones
- Derecho Familia: divorcios, pensión de alimentos, cuidado personal, visitas, violencia intrafamiliar, tutela, herencias, matrimonio
- Derecho Penal: delitos, robos, hurtos, estafas, lesiones, amenazas, denuncias, carabineros, fiscalía, imputado
- Derecho Civil: accidentes, indemnizaciones, contratos civiles, deudas, pagarés, juicios ejecutivos, daños y perjuicios, colisiones, choques
- Derecho del Consumidor: garantías de productos, SERNAC, tiendas, servicios defectuosos, publicidad engañosa

Responde ÚNICAMENTE con una de estas opciones exactas (sin comillas, sin explicación, sin puntuación):
Derecho Arrendamiento
Derecho Laboral
Derecho Familia
Derecho Penal
Derecho Civil
Derecho del Consumidor

Si el caso es ambiguo, elige la categoría más probable según el contexto chileno.`;

const CATEGORY_SLUGS_SERVER = {
  "Derecho Arrendamiento": "arriendo",
  "Derecho Laboral": "laboral",
  "Derecho Familia": "familia",
  "Derecho Penal": "penal",
  "Derecho Civil": "civil",
  "Derecho del Consumidor": "consumidor",
};

function classifyLegalCategoryFallback(text) {
  const lower = String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/arriendo|arrendador|arrendatario|desalojo|garantia.*arriendo|ipc.*arriendo|contrato.*arriendo|cerradura.*arrendador|cambiar.*cerradura/.test(lower)) return "Derecho Arrendamiento";
  if (/despid|finiquito|acoso.*laboral|laboralmente|licencia.*medica|contrato.*trabajo|empleador|afp|cotizacion/.test(lower)) return "Derecho Laboral";
  if (/divorc|pension.*alimentos|cuidado personal|visitas|violencia intrafamiliar|tutela|herencia|matrimonio|no.*deja.*ver.*hijo|hijos/.test(lower) && /divorc|pension|alimentos|cuidado|visita|violencia|tutela|herencia|matrimonio|hijo/.test(lower)) return "Derecho Familia";
  if (/divorc/.test(lower)) return "Derecho Familia";
  if (/delito|rob|hurt|estafa|lesion|amenaza|denuncia|carabinero|fiscalia|imputado|celular.*metro|robaron/.test(lower)) return "Derecho Penal";
  if (/sernac|garantia.*producto|tienda.*no.*cambia|servicio.*defectuoso|publicidad enganosa|televisor.*roto|llego roto/.test(lower)) return "Derecho del Consumidor";
  if (/choque|colision|accidente.*auto|indemnizacion|pagare|deuda|juicio ejecutivo|danos.*perjuicios|poste/.test(lower)) return "Derecho Civil";
  return "Derecho Civil";
}

app.post('/api/legal-category/classify', async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text || text.length < 5) {
      return res.status(400).json({ error: 'Texto requerido', code: 'INVALID_REQUEST' });
    }

    const validCategories = Object.keys(CATEGORY_SLUGS_SERVER);

    if (!isAIProviderConfigured()) {
      const category = classifyLegalCategoryFallback(text);
      return res.json({ category, slug: CATEGORY_SLUGS_SERVER[category] });
    }

    try {
      const result = await chatCompletion({
        model: AI_DEFAULT_MODEL,
        system: LEGAL_CATEGORY_CLASSIFIER_PROMPT,
        user: text,
        maxTokens: 30,
        temperature: 0,
      });
      const raw = String(result.raw || result.data?.category || '').trim();
      // El modelo debe devolver solo la categoría; tolerar comillas/espacios extra
      const cleaned = raw.replace(/^["'\s]+|["'\s.]+$/g, '').trim();
      const category = validCategories.includes(cleaned) ? cleaned : validCategories.find(c => raw.includes(c)) || classifyLegalCategoryFallback(text);
      return res.json({ category, slug: CATEGORY_SLUGS_SERVER[category] });
    } catch (aiError) {
      console.warn('[LegalClassifier] AI falló, usando fallback:', aiError?.message || aiError);
      const category = classifyLegalCategoryFallback(text);
      return res.json({ category, slug: CATEGORY_SLUGS_SERVER[category] });
    }
  } catch (error) {
    console.error('[LegalClassifier] error:', error);
    return res.status(500).json({ error: 'No se pudo clasificar la categoría', code: 'CLASSIFY_ERROR' });
  }
});

// ---- Error handling middleware ----
app.use((error, req, res, next) => {
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS policy blocked this request',
      allowedOrigins: [
        'https://uplegal.netlify.app',
        'http://localhost:3000',
        'http://localhost:3001'
      ]
    });
  }

  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '::');

export default app;