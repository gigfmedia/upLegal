export interface Company {
  id: string
  user_id: string
  rut: string
  name: string
  industry: string | null
  employee_count: number | null
  contact_name: string
  contact_email: string
  contact_phone: string | null
  legal_representative: string | null
  address: string | null
  status: 'trial' | 'active' | 'past_due' | 'paused' | 'cancelled' | 'blocked'
  trial_ends_at: string | null
  created_at: string
  updated_at: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  description: string | null
  price_clp: number
  consultations_limit: number
  reviews_limit: number
  priority: string
  sla_hours: number
  has_dedicated_lawyer: boolean
  additional_service_discount: number
  features: string[]
  is_active: boolean
  created_at: string
}

export interface CompanySubscription {
  id: string
  company_id: string
  plan_id: string
  status: 'pending' | 'active' | 'paused' | 'cancelled' | 'past_due'
  mercadopago_preapproval_id: string | null
  mercadopago_plan_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  payment_method_id: string | null
  card_last_four: string | null
  card_holder_name: string | null
  created_at: string
  updated_at: string
  plan?: SubscriptionPlan
}

export interface CompanyUsage {
  id: string
  company_id: string
  subscription_id: string
  period_start: string
  period_end: string
  consultations_used: number
  consultations_limit: number
  reviews_used: number
  reviews_limit: number
  created_at: string
}

export interface CompanyRequest {
  id: string
  company_id: string
  user_id: string
  title: string
  description: string
  category: string
  subcategory: string | null
  status: RequestStatus
  priority: 'baja' | 'normal' | 'alta' | 'urgente'
  lawyer_id: string | null
  assigned_by: string | null
  assigned_at: string | null
  is_out_of_plan: boolean
  sla_deadline: string | null
  first_response_at: string | null
  closed_at: string | null
  ai_summary: string | null
  ai_suggested_specialties: string[] | null
  ai_suggested_lawyer_id: string | null
  ai_detected_missing_docs: string[] | null
  created_at: string
  updated_at: string
  company?: Company
  lawyer?: {
    id: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  }
  documents?: CompanyRequestDocument[]
}

export type RequestStatus =
  | 'nueva'
  | 'asignada'
  | 'en_revision'
  | 'esperando_documentos'
  | 'esperando_cliente'
  | 'presupuesto_enviado'
  | 'presupuesto_aprobado'
  | 'en_ejecucion'
  | 'finalizada'
  | 'cancelada'
  | 'sla_breached'

export interface CompanyRequestDocument {
  id: string
  request_id: string
  company_id: string
  file_name: string
  file_url: string
  file_type: string | null
  file_size: number | null
  category: string | null
  uploaded_by: string
  created_at: string
}

export interface CompanyDocument {
  id: string
  company_id: string
  file_name: string
  file_url: string
  file_type: string | null
  file_size: number | null
  category: DocumentCategory
  tags: string[] | null
  uploaded_by: string
  description: string | null
  created_at: string
}

export type DocumentCategory = 'contratos' | 'demandas' | 'escrituras' | 'marcas' | 'laboral' | 'tributario' | 'comercial' | 'otros'

export interface CompanyMember {
  id: string
  company_id: string
  user_id: string
  role: 'admin' | 'member' | 'viewer'
  invited_by: string | null
  joined_at: string | null
  created_at: string
}

export interface CompanyLawyer {
  id: string
  company_id: string
  lawyer_id: string
  is_primary: boolean
  assigned_at: string
}

export interface CompanyActivityLog {
  id: string
  company_id: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface CompanyMetrics {
  active_companies: number
  mrr: number
  arr: number
  churned_last_month: number
  total_requests: number
  open_requests: number
}

export interface CompanyRating {
  id: string
  company_id: string
  lawyer_id: string
  request_id: string
  rater_type: 'company' | 'lawyer'
  rating: number
  comment: string | null
  created_at: string
  lawyer?: {
    id: string
    first_name: string | null
    last_name: string | null
  }
}

export interface CreateCompanyRatingInput {
  requestId: string
  lawyerId: string
  rating: number
  comment?: string
}

export interface LawyerRatingStats {
  average: number
  count: number
  distribution: Record<number, number>
}

export interface ServiceCategory {
  id: string
  name: string
  slug: string
  icon: string
  sort_order: number
}

export interface LegalService {
  id: string
  category_slug: string
  service_name: string
  description: string | null
  starting_price_clp: number | null
  requires_quote: boolean
  estimated_days: number | null
  included_in_subscription: boolean
  icon: string
  is_active: boolean
  sort_order: number
}

export interface CompanyBudget {
  id: string
  company_id: string
  request_id: string
  lawyer_id: string | null
  title: string
  description: string | null
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled'
  subtotal_clp: number
  discount_clp: number
  tax_clp: number
  total_clp: number
  created_by: string
  approved_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  items?: CompanyBudgetItem[]
}

export interface CompanyBudgetItem {
  id: string
  budget_id: string
  legal_service_id: string | null
  description: string
  quantity: number
  unit_price_clp: number
  total_clp: number
}

// ---- CENTRO LEGAL ----

export interface LegalFolder {
  id: string
  company_id: string
  parent_id: string | null
  name: string
  icon: string
  sort_order: number
  created_at: string
  updated_at: string
  children?: LegalFolder[]
  document_count?: number
}

export interface LegalDocument {
  id: string
  company_id: string
  folder_id: string | null
  name: string
  description: string | null
  current_version_id: string | null
  tags: string[] | null
  created_by: string
  created_at: string
  updated_at: string
  current_version?: LegalDocumentVersion | null
  folder?: LegalFolder | null
}

export interface LegalDocumentVersion {
  id: string
  document_id: string
  version_number: number
  file_name: string
  file_url: string
  file_type: string | null
  file_size: number | null
  uploaded_by: string
  notes: string | null
  created_at: string
}

export const REQUEST_CATEGORIES = [
  { value: 'laboral', label: 'Laboral' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'tributario', label: 'Tributario' },
  { value: 'civil', label: 'Civil' },
  { value: 'marcas', label: 'Marcas y Propiedad Intelectual' },
  { value: 'familia', label: 'Familia' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'consumidor', label: 'Consumidor' },
  { value: 'otros', label: 'Otro' },
] as const

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  nueva: 'Nueva',
  asignada: 'Asignada',
  en_revision: 'En revisión',
  esperando_documentos: 'Esperando documentos',
  esperando_cliente: 'Esperando cliente',
  presupuesto_enviado: 'Presupuesto enviado',
  presupuesto_aprobado: 'Presupuesto aprobado',
  en_ejecucion: 'En ejecución',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
  sla_breached: 'SLA vencido',
}

export const COMPANY_STATUS_LABELS: Record<string, string> = {
  trial: 'Prueba',
  active: 'Activa',
  past_due: 'Pago vencido',
  paused: 'Pausada',
  cancelled: 'Cancelada',
  blocked: 'Bloqueada',
}
