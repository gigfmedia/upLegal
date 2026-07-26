import { getTemplate } from '../templates'
import { supabase } from '@/lib/supabaseClient'
import { getPublicUrl } from '@/lib/storage'

interface CreateDocumentInput {
  type: string
  userEmail: string
  userName?: string
  payload: Record<string, any>
  totalPaid: number
  amount?: number
}

interface CreateDocumentResult {
  documentId: string
  preferenceId: string
  initPoint: string
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export async function createDocument(input: CreateDocumentInput): Promise<CreateDocumentResult> {
  const template = getTemplate(input.type)
  if (!template) {
    throw new Error(`Template not found: ${input.type}`)
  }

  const response = await fetch(`${API_BASE}/api/documents/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: input.type,
      user_email: input.userEmail,
      user_name: input.userName || null,
      payload: input.payload,
      total_paid: input.totalPaid,
      amount: input.amount || null,
      template_version: template.metadata.templateVersion,
    }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Error al crear documento')
  }

  return response.json()
}

export async function getDocument(documentId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/api/documents/${documentId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Error al obtener documento')
  }

  return response.json()
}

export async function confirmPayment(documentId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/api/documents/payment-confirmation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id: documentId }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Error al confirmar pago')
  }

  return response.json()
}

export async function pollDocumentStatus(documentId: string, maxRetries = 30, intervalMs = 2000): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    const doc = await getDocument(documentId)
    if (doc.status === 'completed') return doc
    if (doc.status === 'failed' || doc.status === 'delivery_failed') {
      throw new Error(doc.error_message || 'Error en la generación del documento')
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  throw new Error('Tiempo de espera agotado para la generación del documento')
}