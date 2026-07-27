import { useState, useCallback, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckCircle, Download, FileText, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getTemplate } from '../templates'
import { createDocument, pollDocumentStatus } from '../engine/createDocument'
import { PRICING } from '../pricing'
import type { DocumentField } from '../types'
import { PaymentMethods as MPbadge } from '@/components/MercadoPagoBadge'

type FlowStep = 'form' | 'paying' | 'processing' | 'completed'

const validationMap: Record<string, (msg: string) => z.ZodString> = {
  rut: (msg) => z.string().transform(v => v.replace(/[^\dkK]/g, '')).pipe(z.string().regex(/^\d{7,8}[\dkK]$/, msg || 'RUT inválido')),
  email: (msg) => z.string().email(msg || 'Email inválido'),
  number: (msg) => z.string().regex(/^\d+(\.\d+)?$/, msg || 'Debe ser un número'),
  date: (msg) => z.string().min(1, msg || 'Fecha requerida'),
  phone: (msg) => z.string().regex(/^(\+?56)?\s?9\s?\d{4}\s?\d{4}$/, msg || 'Teléfono inválido'),
  text: (msg) => z.string().min(1, msg || 'Campo requerido'),
}

function buildZodSchema(fields: DocumentField[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const field of fields) {
    const validator = field.validation ? validationMap[field.validation] : validationMap.text
    let schema = validator(field.helpText || `${field.label} es requerido`)
    if (!field.required) {
      schema = schema.optional().or(z.literal(''))
    }
    shape[field.id] = schema
  }
  return z.object(shape)
}

function groupFields(fields: DocumentField[]): Record<string, DocumentField[]> {
  const groups: Record<string, DocumentField[]> = {}
  for (const field of fields) {
    if (!groups[field.group]) groups[field.group] = []
    groups[field.group].push(field)
  }
  return groups
}

const formatRut = (value: string) => {
  const cleaned = value.replace(/[^\dkK]/g, '').toUpperCase()
  if (cleaned.length <= 1) return cleaned
  const body = cleaned.slice(0, -1)
  const dv = cleaned.slice(-1)
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formattedBody}-${dv}`
}

const formatCLP = (value: string) => {
  const cleaned = value.replace(/[^0-9]/g, '')
  if (!cleaned) return ''
  return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

const unformatCLP = (value: string) => value.replace(/\./g, '')

function shouldShowField(field: DocumentField, values: Record<string, any>): boolean {
  if (!field.conditional) return true
  return String(values[field.conditional.field]) === field.conditional.value
}

const DocumentPage = () => {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const template = slug ? getTemplate(slug) : undefined
  const [step, setStep] = useState<FlowStep>('form')
  const [error, setError] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [docAmount, setDocAmount] = useState<number>(0)

  const fields = template?.schema || []
  const metadata = template?.metadata
  const groups = groupFields(fields)
  const price = metadata?.priceKey ? PRICING[metadata.priceKey as keyof typeof PRICING] || 0 : 0
  const upsellPrice = PRICING.LAWYER_REVIEW

  useEffect(() => {
    window.gtag?.('event', 'document_started', { document_type: slug })
  }, [slug])

  const zodSchema = buildZodSchema(fields).extend({
    user_email: z.string().email('Email inválido'),
    user_name: z.string().optional().or(z.literal('')),
  })
  type FormValues = z.infer<typeof zodSchema>

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(zodSchema),
    mode: 'onChange',
    defaultValues: Object.fromEntries(
      fields.filter(f => f.defaultValue).map(f => [f.id, f.defaultValue])
    ),
  })

  const formValues = watch()

  const onSubmit = useCallback(async (data: FormValues) => {
    if (!metadata) return
    setError(null)
    setStep('paying')

    try {
      const result = await createDocument({
        type: metadata.slug,
        userEmail: data.user_email as string || '',
        userName: data.user_name as string || data.creditor_name as string,
        payload: data as Record<string, any>,
        totalPaid: price,
        amount: Number(data.amount) || 0,
      })

      setDocumentId(result.documentId)
      sessionStorage.setItem('pendingDocumentId', result.documentId)
      window.gtag?.('event', 'document_payment_started', {
        document_type: metadata.slug,
        document_id: result.documentId,
        price,
      })
      window.location.href = result.initPoint
    } catch (err: any) {
      setError(err.message || 'Error al iniciar el pago')
      setStep('form')
    }
  }, [metadata, price])

  const handlePaymentSuccess = useCallback(async () => {
    if (!documentId) return
    setStep('processing')
    setError(null)

    try {
      const doc = await pollDocumentStatus(documentId)
      setPdfUrl(doc.pdf_url)
      setDocAmount(Number(doc.payload?.amount) || doc.total_paid || 0)
      setStep('completed')
      window.gtag?.('event', 'document_generated', {
        document_id: documentId,
        document_type: doc.type,
        price: doc.total_paid,
      })
      window.gtag?.('event', 'purchase', {
        transaction_id: documentId,
        value: doc.total_paid,
        currency: 'CLP',
        items: [{ item_id: documentId, item_name: doc.type, price: doc.total_paid, quantity: 1 }],
      })
    } catch (err: any) {
      setError(err.message || 'Error al generar el documento')
      setStep('form')
    }
  }, [documentId])

  useEffect(() => {
    const collectionId = searchParams.get('collection_id')
    const status = searchParams.get('status')
    const docId = searchParams.get('document_id') || sessionStorage.getItem('pendingDocumentId')
    if (collectionId && status === 'approved' && docId && !documentId) {
      setDocumentId(docId)
      setTimeout(() => handlePaymentSuccess(), 500)
    }
  }, [searchParams, documentId, handlePaymentSuccess])

  if (!template || !metadata) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Documento no encontrado</h1>
          <p className="text-gray-600">El documento que buscas no está disponible.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-center px-4">
        <div className="flex items-center gap-2">
          <Scale className="h-6 w-6 text-green-900" />
          <span className="text-lg font-bold text-green-900">LegalUp</span><span className="text-xs text-green-800">Documents</span>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center gap-2 mb-8 text-sm">
          {['Formulario', 'Pago', 'Documento'].map((label, i) => {
            const stepIndex = ['form', 'paying', 'completed'].indexOf(step)
            const isActive = i <= stepIndex
            const isCurrent = i === stepIndex
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isActive ? 'bg-green-900 text-white' : 'bg-gray-200 text-gray-500'
                } ${isCurrent ? 'ring-2 ring-green-900' : ''}`}>
                  {i + 1}
                </div>
                <span className={`${isActive ? 'text-green-900 font-medium' : 'text-gray-500'}`}>
                  {label}
                </span>
                {i < 2 && <div className={`w-8 h-0.5 ${i < stepIndex ? 'bg-green-900' : 'bg-gray-200'}`} />}
              </div>
            )
          })}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'form' && (
          <Card>
            <CardContent className="p-6 sm:p-8">
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-green-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{metadata.hero.title}</h1>
                <p className="text-gray-600 max-w-xl mx-auto">{metadata.hero.description}</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-gray-200">
                  <div>
                    <Label htmlFor="user_email" className="text-sm font-medium text-gray-700 mb-1 block">
                      Tu email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="user_email"
                      type="email"
                      placeholder="tucorreo@ejemplo.com"
                      {...register('user_email' as any, {
                        required: 'Email requerido',
                        pattern: { value: /^\S+@\S+$/i, message: 'Email inválido' },
                      })}
                      className={errors.user_email ? 'border-red-500' : ''}
                    />
                    <p className="text-xs text-gray-500 mt-1">Te enviaremos el PDF aquí</p>
                    {errors.user_email && (
                      <p className="text-xs text-red-500 mt-1">{errors.user_email.message as string}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="user_name" className="text-sm font-medium text-gray-700 mb-1 block">
                      Tu nombre
                    </Label>
                    <Input
                      id="user_name"
                      type="text"
                      placeholder="Juan Pérez"
                      {...register('user_name' as any)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Opcional</p>
                  </div>
                </div>

                {Object.entries(groups).map(([groupName, groupFields]) => (
                  <div key={groupName} className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                      {groupName}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {groupFields.map((field) => {
                        const visible = shouldShowField(field, formValues)
                        if (!visible) return null

                        if (field.type === 'select') {
                          return (
                            <div key={field.id} className={field.id.includes('words') || field.id.includes('place') ? 'sm:col-span-2' : ''}>
                              <Label htmlFor={field.id} className="text-sm font-medium text-gray-700 mb-1 block">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </Label>
                              {field.helpText && (
                                <p className="text-xs text-gray-500 mb-1">{field.helpText}</p>
                              )}
                              <select
                                id={field.id}
                                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-900"
                                {...register(field.id as any)}
                              >
                                {field.options?.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                          )
                        }

                        return (
                          <div key={field.id} className={field.id.includes('words') || field.id.includes('place') ? 'sm:col-span-2' : ''}>
                            <Label htmlFor={field.id} className="text-sm font-medium text-gray-700 mb-1 block">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            
                            {field.formatter === 'clp' ? (
                              <Input
                                id={field.id}
                                type="text"
                                inputMode="numeric"
                                placeholder={field.placeholder}
                                value={formValues[field.id] ? formatCLP(String(formValues[field.id])) : ''}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/[^0-9]/g, '')
                                  setValue(field.id as any, raw, { shouldValidate: true })
                                }}
                                className={errors[field.id as keyof FormValues] ? 'border-red-500' : ''}
                              />
                            ) : (
                              <Input
                                id={field.id}
                                type={field.type || 'text'}
                                placeholder={field.placeholder}
                                {...register(field.id as any, {
                                  setValueAs: (v: string) => {
                                    if (field.validation === 'rut') return formatRut(v)
                                    if (field.validation === 'number') return v.replace(/[^0-9.]/g, '')
                                    return v
                                  },
                                })}
                                className={errors[field.id as keyof FormValues] ? 'border-red-500' : ''}
                              />
                            )}
                            {field.helpText && (
                              <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
                            )}
                            {field.example && (
                              <p className="text-xs text-gray-400 mt-1">Ej: {field.example}</p>
                            )}
                            {errors[field.id as keyof FormValues] && (
                              <p className="text-xs text-red-500 mt-1">{errors[field.id as keyof FormValues]?.message as string}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}

                <div className="border-t border-gray-200 pt-6 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-lg font-bold text-gray-900">${price.toLocaleString('es-CL')}</p>
                      <p className="text-sm text-gray-500">Pago único. IVA incluido.</p>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={!isValid}
                    className="w-full h-12 text-base font-semibold bg-gray-900 hover:bg-green-900 text-white"
                  >
                    {metadata.button.text}
                  </Button>
                  <p className="text-xs text-gray-400 text-center mt-2">
                    Pago seguro vía MercadoPago. Recibes el PDF al instante.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'paying' && (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-green-900 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Redirigiendo al pago...</h2>
              <p className="text-gray-600">Estás siendo redirigido a MercadoPago para completar el pago seguro.</p>
            </CardContent>
          </Card>
        )}

        {step === 'processing' && (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-green-900 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Generando tu documento...</h2>
              <p className="text-gray-600">Esto tomará solo unos segundos.</p>
            </CardContent>
          </Card>
        )}

        {step === 'completed' && (
          <Card>
            <CardContent className="p-6 sm:p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-700" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Tu documento está listo</h2>
              <p className="text-gray-600 mb-6">
                Tu <strong>{metadata.title}</strong> fue generado exitosamente.
                También fue enviado a tu correo electrónico.
              </p>

              {pdfUrl && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => window.gtag?.('event', 'document_downloaded', { document_id: documentId })}
                  className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-900 transition-colors mb-8"
                >
                  <Download className="w-5 h-5" />
                  Descargar PDF
                </a>
              )}

              <div className="border-t border-gray-200 pt-8 mt-6 text-left">
                <div className="bg-gray-50 rounded-xl p-5 mb-5 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Mandato Pagaré</p>
                      <p className="text-2xl font-bold text-gray-900">${docAmount.toLocaleString('es-CL')}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-700" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">Consulta legal sobre este pagaré</h3>
                <p className="text-gray-600 mb-5">
                  Tu documento ya está listo y puede utilizarse. Si quieres asesoría para tu caso específico antes de firmarlo, puedes agendar una consulta con un abogado.
                </p>

                <p className="text-sm font-semibold text-gray-800 mb-3">60 minutos de consulta que incluye:</p>
                <div className="space-y-2 mb-6">
                  {[
                    'Revisión del Mandato Pagaré generado',
                    'Análisis de tu caso concreto',
                    'Respuestas a todas tus dudas',
                    'Recomendaciones antes de firmar',
                    'Cláusulas adicionales si fueran necesarias',
                    'Evaluación de riesgos de la operación',
                    'Qué hacer si el deudor no paga',
                    'Estrategia de cobro futuro',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-700">
                      <span className="text-green-600 font-bold">✓</span>
                      {item}
                    </div>
                  ))}
                </div>

                <p className="text-sm text-gray-500 mb-4">
                  La consulta es recomendable cuando el pagaré involucra montos importantes, acuerdos entre particulares o cuando existen dudas antes de firmarlo.
                </p>

                <Button
                  className="w-full h-12 text-base font-semibold bg-gray-900 hover:bg-green-900 text-white"
                  onClick={async () => {
                    window.gtag?.('event', 'document_review_clicked', { document_id: documentId, document_type: slug })
                    try {
                      const resp = await fetch('/api/documents/create-review-preference', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ document_id: documentId }),
                      })
                      const data = await resp.json()
                      if (data.initPoint) {
                        window.location.href = data.initPoint
                      }
                    } catch (e) {
                      console.error('Error creating review preference', e)
                    }
                  }}
                >
                  Consultar con un abogado
                </Button>
                <p className="text-sm text-gray-500 text-center mt-2">
                  $59.990 &mdash; 60 minutos de consulta online
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        <MPbadge />
      </div>
    </div>
  )
}

export default DocumentPage