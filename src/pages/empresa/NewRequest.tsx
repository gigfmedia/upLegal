import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import type { Company } from '@/types/empresas'
import { REQUEST_CATEGORIES } from '@/types/empresas'
import {
  FileText,
  Upload,
  ArrowLeft,
  ChevronRight,
  Check,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

const STEPS = [
  { number: 1, label: 'Categoría' },
  { number: 2, label: 'Describe el problema' },
  { number: 3, label: 'Documentos' },
  { number: 4, label: 'Enviar' },
]

export default function NewRequest() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { company } = useOutletContext<{ company: Company }>()

  const [step, setStep] = useState(1)
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('normal')
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async (requestId: string): Promise<string[]> => {
    const urls: string[] = []
    for (const file of files) {
      const filePath = `companies/${company.id}/requests/${requestId}/${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Error uploading file:', uploadError)
        continue
      }

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      if (urlData) {
        const res = await fetch(`/api/empresas/requests/${requestId}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: company.id,
            fileName: file.name,
            fileUrl: urlData.publicUrl,
            fileType: file.type,
            fileSize: file.size,
            uploadedBy: user!.id,
          }),
        })
        if (res.ok) urls.push(urlData.publicUrl)
      }
    }
    return urls
  }

  const handleSubmit = async () => {
    if (!category || !description) {
      toast.error('Completa todos los campos obligatorios')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/empresas/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          userId: user!.id,
          title: title || `Solicitud ${category} - ${new Date().toLocaleDateString('es-CL')}`,
          description,
          category,
          priority,
        }),
      })

      let body
      try { body = await res.json() } catch { body = null }

      if (!res.ok) {
        throw new Error(body?.error || `Error ${res.status}`)
      }

      const { request } = body

      if (files.length > 0) {
        await uploadFiles(request.id)
      }

      setSubmittedId(request.id)
      setStep(4)
    } catch (error) {
      console.error(error)
      toast.error('Error al crear la solicitud')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submittedId) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Solicitud enviada
        </h1>
        <p className="text-gray-600 mb-8">
          Hemos recibido tu solicitud. Un administrador asignará un abogado especialista para revisar tu caso.
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={() => navigate('/empresa/solicitudes')}>
            Ver mis solicitudes
          </Button>
          <Button onClick={() => navigate('/empresa')}>
            Ir al inicio
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate('/empresa/solicitudes')}
        className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver a solicitudes
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Nueva solicitud</h1>
      <p className="text-gray-600 mb-8">
        Describe tu problema legal y te asignaremos el abogado especialista correspondiente.
      </p>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.number} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s.number
                  ? 'bg-green-900 text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {step > s.number ? <Check className="w-4 h-4" /> : s.number}
            </div>
            <span className={`text-sm ${step >= s.number ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-4 h-4 text-gray-300" />
            )}
          </div>
        ))}
      </div>

      <Card className="p-8">
        {/* Step 1: Category */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Selecciona la categoría de tu solicitud
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {REQUEST_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => {
                    setCategory(cat.value)
                    setStep(2)
                  }}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    category === cat.value
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <span className="text-sm font-medium text-gray-900">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Description */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Describe tu problema legal
            </h2>
            <div className="space-y-4">
              <div>
                <Label>Título *</Label>
                <Input
                  placeholder="Ej: Consulta sobre despido injustificado"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <Label>Descripción detallada *</Label>
                <Textarea
                  placeholder="Describe tu situación con el mayor detalle posible. Incluye fechas, nombres y cualquier información relevante..."
                  rows={8}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <Label>Prioridad</Label>
                <RadioGroup
                  value={priority}
                  onValueChange={setPriority}
                  className="flex gap-4 mt-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="baja" id="baja" />
                    <Label htmlFor="baja" className="text-sm font-normal">Baja</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="normal" id="normal" />
                    <Label htmlFor="normal" className="text-sm font-normal">Normal</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="alta" id="alta" />
                    <Label htmlFor="alta" className="text-sm font-normal">Alta</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="urgente" id="urgente" />
                    <Label htmlFor="urgente" className="text-sm font-normal">Urgente</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Atrás
                </Button>
                <Button onClick={() => setStep(3)} disabled={!description.trim()}>
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Documents */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Adjunta documentos (opcional)
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Puedes adjuntar contratos, correos, imágenes u otros documentos relevantes para tu caso.
            </p>

            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-gray-600">
                Arrastra tus documentos aquí o haz clic para seleccionar
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PDF, DOCX, JPG, PNG (máx. 10MB por archivo)
              </p>
              <input
                id="file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.docx,.jpg,.jpeg,.png"
              />
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep(2)}>
                Atrás
              </Button>
              <Button onClick={() => setStep(4)}>
                {files.length > 0 ? 'Continuar' : 'Omitir'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Revisa tu solicitud
            </h2>
            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Categoría</p>
                <p className="font-medium text-gray-900 capitalize">{category}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Título</p>
                <p className="font-medium text-gray-900">{title || 'Sin título'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Descripción</p>
                <p className="text-gray-900 whitespace-pre-wrap">{description}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Prioridad</p>
                <p className="font-medium text-gray-900 capitalize">{priority}</p>
              </div>
              {files.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Documentos adjuntos</p>
                  <p className="font-medium text-gray-900">{files.length} archivo(s)</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep(3)}>
                Atrás
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Enviando...' : 'Enviar solicitud'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* TODO: AI integration placeholder */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-500 flex items-center gap-2">
          <AlertCircle className="w-3 h-3" />
          En una versión futura, la IA clasificará automáticamente tu solicitud y sugerirá el abogado especialista ideal.
        </p>
      </div>
    </div>
  )
}
