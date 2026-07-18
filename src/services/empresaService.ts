import { supabase } from '@/lib/supabaseClient'
import type {
  Company,
  CompanySubscription,
  CompanyUsage,
  CompanyRequest,
  CompanyRequestDocument,
  CompanyDocument,
  CompanyMember,
  CompanyLawyer,
  SubscriptionPlan,
  CompanyMetrics,
  RequestStatus,
  LegalFolder,
  LegalDocument,
  LegalDocumentVersion,
} from '@/types/empresas'

// ---- COMPANIES ----

export async function getCompany(userId: string): Promise<Company | null> {
  const { data } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const { data } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return data
}

export async function registerCompany(company: {
  userId: string
  rut: string
  name: string
  industry: string
  employeeCount: number
  contactName: string
  contactEmail: string
  contactPhone: string
}): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .insert({
      user_id: company.userId,
      rut: company.rut,
      name: company.name,
      industry: company.industry,
      employee_count: company.employeeCount,
      contact_name: company.contactName,
      contact_email: company.contactEmail,
      contact_phone: company.contactPhone,
      status: 'trial',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ---- SUBSCRIPTION PLANS ----

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price_clp', { ascending: true })
  if (error) {
    console.error('[getSubscriptionPlans] Error:', error.message)
  }
  if (data && data.length > 0) return data
  return [
    {
      id: 'start',
      name: 'Start',
      description: 'Para empresas que recién comienzan',
      price_clp: 99000,
      consultations_limit: 1,
      reviews_limit: 0,
      priority: 'normal',
      sla_hours: 48,
      has_dedicated_lawyer: false,
      additional_service_discount: 0,
      features: ['1 consulta legal (60 min)', 'Respuesta en 48 horas', 'Acceso a la plataforma', 'Gestión de solicitudes'],
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'pyme',
      name: 'PyME',
      description: 'Para empresas en crecimiento',
      price_clp: 199000,
      consultations_limit: 2,
      reviews_limit: 1,
      priority: 'alta',
      sla_hours: 24,
      has_dedicated_lawyer: false,
      additional_service_discount: 0,
      features: ['2 consultas legales', '1 revisión documental simple', 'Respuesta en 24 horas'],
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'business',
      name: 'Business',
      description: 'Para empresas que requieren atención continua',
      price_clp: 399000,
      consultations_limit: 4,
      reviews_limit: 2,
      priority: 'prioritaria',
      sla_hours: 12,
      has_dedicated_lawyer: true,
      additional_service_discount: 10,
      features: ['4 consultas legales', '2 revisiones documentales', 'Respuesta prioritaria', 'Abogado de referencia'],
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ]
}

export async function getSubscriptionPlan(id: string): Promise<SubscriptionPlan | null> {
  const { data } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return data
}

// ---- COMPANY SUBSCRIPTIONS ----

export async function getCompanySubscription(companyId: string): Promise<CompanySubscription | null> {
  const { data } = await supabase
    .from('company_subscriptions')
    .select('*, plan:plan_id(*)')
    .eq('company_id', companyId)
    .maybeSingle()
  return data
}

export async function createSubscriptionPreference(companyId: string, planId: string): Promise<{ preferenceId: string; initPoint: string }> {
  const response = await fetch('/api/empresas/subscription/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, planId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al crear suscripción')
  }

  return response.json()
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const response = await fetch(`/api/empresas/subscription/${subscriptionId}/cancel`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al cancelar suscripción')
  }
}

// ---- COMPANY USAGE ----

export async function getCompanyUsage(companyId: string): Promise<CompanyUsage | null> {
  const { data } = await supabase
    .from('company_usage')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

// ---- COMPANY REQUESTS ----

export async function getCompanyRequests(companyId: string): Promise<CompanyRequest[]> {
  const { data } = await supabase
    .from('company_requests')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (data) {
    const lawyerIds = data.filter(r => r.lawyer_id).map(r => r.lawyer_id).filter(Boolean)
    if (lawyerIds.length > 0) {
      const { data: lawyers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', lawyerIds)
      if (lawyers) {
        const lawyerMap = Object.fromEntries(lawyers.map(l => [l.id, l]))
        for (const r of data) {
          if (r.lawyer_id && lawyerMap[r.lawyer_id]) {
            r.lawyer = lawyerMap[r.lawyer_id]
          }
        }
      }
    }
  }

  return data || []
}

export async function getRequestById(id: string): Promise<CompanyRequest | null> {
  const { data } = await supabase
    .from('company_requests')
    .select('*, company:company_id(*), documents:company_request_documents(*)')
    .eq('id', id)
    .maybeSingle()

  if (data && data.lawyer_id) {
    const { data: lawyer } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url')
      .eq('id', data.lawyer_id)
      .maybeSingle()
    data.lawyer = lawyer
  }

  return data
}

export async function createCompanyRequest(request: {
  companyId: string
  userId: string
  title: string
  description: string
  category: string
  priority?: string
}): Promise<CompanyRequest> {
  const { data, error } = await supabase
    .from('company_requests')
    .insert({
      company_id: request.companyId,
      user_id: request.userId,
      title: request.title,
      description: request.description,
      category: request.category,
      priority: request.priority || 'normal',
      status: 'nueva',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRequestStatus(id: string, status: RequestStatus, userId?: string): Promise<void> {
  const updates: Record<string, unknown> = { status }
  if (status === 'asignada' && userId) updates.assigned_by = userId
  if (status === 'finalizada' || status === 'cancelada') updates.closed_at = new Date().toISOString()

  const { error } = await supabase
    .from('company_requests')
    .update(updates)
    .eq('id', id)

  if (error) throw error
}

export async function assignLawyerToRequest(requestId: string, lawyerId: string, assignedBy: string): Promise<void> {
  const { error } = await supabase
    .from('company_requests')
    .update({
      lawyer_id: lawyerId,
      assigned_by: assignedBy,
      assigned_at: new Date().toISOString(),
      status: 'asignada',
    })
    .eq('id', requestId)

  if (error) throw error
}

// ---- REQUEST DOCUMENTS ----

export async function uploadRequestDocument(document: {
  requestId: string
  companyId: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  uploadedBy: string
}): Promise<CompanyRequestDocument> {
  const { data, error } = await supabase
    .from('company_request_documents')
    .insert({
      request_id: document.requestId,
      company_id: document.companyId,
      file_name: document.fileName,
      file_url: document.fileUrl,
      file_type: document.fileType,
      file_size: document.fileSize,
      uploaded_by: document.uploadedBy,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ---- CENTRO LEGAL ----

export async function getLegalFolders(companyId: string): Promise<LegalFolder[]> {
  const { data } = await supabase
    .from('legal_folders')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true })
  return data || []
}

export async function createLegalFolder(folder: {
  companyId: string
  parentId?: string | null
  name: string
  icon?: string
}): Promise<LegalFolder> {
  const { data, error } = await supabase
    .from('legal_folders')
    .insert({
      company_id: folder.companyId,
      parent_id: folder.parentId || null,
      name: folder.name,
      icon: folder.icon || 'folder',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateLegalFolder(id: string, updates: { name?: string; icon?: string; parent_id?: string | null; sort_order?: number }): Promise<LegalFolder> {
  const { data, error } = await supabase
    .from('legal_folders')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteLegalFolder(id: string): Promise<void> {
  const { error } = await supabase
    .from('legal_folders')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function getLegalDocuments(companyId: string, folderId?: string | null): Promise<LegalDocument[]> {
  let query = supabase
    .from('legal_documents')
    .select('*')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })

  if (folderId !== undefined) {
    query = folderId ? query.eq('folder_id', folderId) : query.is('folder_id', null)
  }

  const { data } = await query
  return data || []
}

export async function getLegalDocumentById(id: string): Promise<LegalDocument | null> {
  const { data } = await supabase
    .from('legal_documents')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return data
}

export async function createLegalDocument(doc: {
  companyId: string
  folderId?: string | null
  name: string
  description?: string
  createdBy: string
}): Promise<LegalDocument> {
  const { data, error } = await supabase
    .from('legal_documents')
    .insert({
      company_id: doc.companyId,
      folder_id: doc.folderId || null,
      name: doc.name,
      description: doc.description || null,
      created_by: doc.createdBy,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createLegalDocumentVersion(version: {
  documentId: string
  versionNumber: number
  fileName: string
  fileUrl: string
  fileType?: string | null
  fileSize?: number | null
  uploadedBy: string
  notes?: string
}): Promise<LegalDocumentVersion> {
  const { data, error } = await supabase
    .from('legal_document_versions')
    .insert({
      document_id: version.documentId,
      version_number: version.versionNumber,
      file_name: version.fileName,
      file_url: version.fileUrl,
      file_type: version.fileType || null,
      file_size: version.fileSize || null,
      uploaded_by: version.uploadedBy,
      notes: version.notes || null,
    })
    .select()
    .single()
  if (error) throw error

  // Update document's current_version_id
  await supabase
    .from('legal_documents')
    .update({ current_version_id: data.id, updated_at: new Date().toISOString() })
    .eq('id', version.documentId)

  return data
}

export async function getLegalDocumentVersions(documentId: string): Promise<LegalDocumentVersion[]> {
  const { data } = await supabase
    .from('legal_document_versions')
    .select('*')
    .eq('document_id', documentId)
    .order('version_number', { ascending: false })
  return data || []
}

export async function linkDocumentToRequest(documentId: string, requestId: string): Promise<void> {
  await supabase
    .from('legal_document_requests')
    .insert({ document_id: documentId, request_id: requestId })
}

export async function unlinkDocumentFromRequest(documentId: string, requestId: string): Promise<void> {
  await supabase
    .from('legal_document_requests')
    .delete()
    .eq('document_id', documentId)
    .eq('request_id', requestId)
}

export async function getDocumentLinkedRequests(documentId: string): Promise<any[]> {
  const { data } = await supabase
    .from('legal_document_requests')
    .select('*, request:request_id(id, title, status, created_at)')
    .eq('document_id', documentId)
  return data || []
}

export async function seedLegalFolders(companyId: string): Promise<void> {
  const { error } = await supabase.rpc('seed_legal_folders', { p_company_id: companyId })
  if (error && !error.message.includes('already exists')) throw error
}

// ---- COMPANY DOCUMENTS LIBRARY ----

export async function getCompanyDocuments(companyId: string): Promise<CompanyDocument[]> {
  const { data } = await supabase
    .from('company_documents')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  return data || []
}

// ---- COMPANY LAWYERS ----

export async function getCompanyLawyers(companyId: string): Promise<CompanyLawyer[]> {
  const { data } = await supabase
    .from('company_lawyers')
    .select('*, lawyer:lawyer_id(id, first_name, last_name, avatar_url, specialties)')
    .eq('company_id', companyId)
  return data || []
}

// ---- ADMIN ----

export async function getAllCompanies(): Promise<Company[]> {
  const { data } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false })
  return data || []
}

export async function getCompanyMetrics(): Promise<CompanyMetrics> {
  const { data } = await supabase.rpc('get_company_metrics')
  return (data || {}) as CompanyMetrics
}

export async function getAllCompanyRequests(status?: string): Promise<CompanyRequest[]> {
  let query = supabase
    .from('company_requests')
    .select('*, company:company_id(id, name, rut), lawyer:lawyer_id(id, first_name, last_name)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data } = await query
  return data || []
}

export async function getLawyerCompanyRequests(lawyerId: string): Promise<CompanyRequest[]> {
  const { data } = await supabase
    .from('company_requests')
    .select('*, company:company_id(id, name, rut, industry)')
    .eq('lawyer_id', lawyerId)
    .order('created_at', { ascending: false })
  return data || []
}

// ---- ACTIVITY LOG ----

export async function logActivity(entry: {
  companyId: string
  userId: string | null
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  await supabase.from('company_activity_log').insert({
    company_id: entry.companyId,
    user_id: entry.userId,
    action: entry.action,
    entity_type: entry.entityType || null,
    entity_id: entry.entityId || null,
    metadata: entry.metadata || null,
  })
}

// ---- BUDGETS ----

export async function getCompanyBudgets(companyId: string): Promise<any[]> {
  const res = await fetch(`/api/empresas/budgets?companyId=${companyId}`)
  const data = await res.json()
  return data.budgets || []
}

export async function getLegalServices(categorySlug?: string): Promise<any[]> {
  const url = `/api/empresas/legal-services${categorySlug ? `?category_slug=${categorySlug}` : ''}`
  const res = await fetch(url)
  const data = await res.json()
  return data.services || []
}

export async function getServiceCategories(): Promise<any[]> {
  const res = await fetch('/api/empresas/service-categories')
  const data = await res.json()
  return data.categories || []
}

export async function approveBudget(id: string): Promise<void> {
  await fetch(`/api/empresas/budgets/${id}/approve`, { method: 'POST' })
}

export async function rejectBudget(id: string, reason?: string): Promise<void> {
  await fetch(`/api/empresas/budgets/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
}
