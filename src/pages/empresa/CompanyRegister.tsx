import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'
import { registerCompany } from '@/services/empresaService'
import { supabase } from '@/lib/supabaseClient'
import { Building2, ArrowLeft, Check, Scale } from 'lucide-react'
import { toast } from 'sonner'

const INDUSTRIES = [
  'Restaurante / Gastronomía',
  'Clínica / Salud',
  'Startup / Tecnología',
  'Agencia / Marketing',
  'Ecommerce / Retail',
  'Constructora / Inmobiliaria',
  'Empresa familiar',
  'Transporte / Logística',
  'Agricultura',
  'Finanzas / Seguros',
  'Educación',
  'Otro',
]

const plans = [
  {
    id: 'start',
    name: 'Start',
    price: '$79.000/mes',
    consultations: '1 consulta',
    documents: '1 revisión',
    sla: '48 hrs',
  },
  {
    id: 'pyme',
    name: 'PyME',
    price: '$149.000/mes',
    consultations: '2 consultas',
    documents: '2 revisiones',
    sla: '24 hrs',
  },
  {
    id: 'business',
    name: 'Business',
    price: '$299.000/mes',
    consultations: '4 consultas',
    documents: '4 revisiones',
    sla: '8 hrs',
  },
]

export default function CompanyRegister() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isLoading } = useAuth()
  const selectedPlanParam = searchParams.get('plan')

  const [step, setStep] = useState<'plan' | 'form' | 'confirm'>(
    selectedPlanParam ? 'form' : 'plan'
  )
  const [selectedPlan, setSelectedPlan] = useState(selectedPlanParam || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [form, setForm] = useState({
    rut: '',
    name: '',
    industry: '',
    employeeCount: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    acceptTerms: false,
  })

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId)
    setStep('form')
  }

  const validateForm = () => {
    if (!form.rut.trim()) return 'El RUT de la empresa es obligatorio'
    if (!form.name.trim()) return 'El nombre de la empresa es obligatorio'
    if (!form.industry) return 'Selecciona una industria'
    if (!form.contactName.trim()) return 'El nombre de contacto es obligatorio'
    if (!form.contactEmail.trim()) return 'El email de contacto es obligatorio'
    if (!form.contactPhone.trim()) return 'El teléfono de contacto es obligatorio'
    if (!form.acceptTerms) return 'Debes aceptar los términos y condiciones'
    return null
  }

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para registrarte')
      return
    }

    const error = validateForm()
    if (error) {
      toast.error(error)
      return
    }

    setIsSubmitting(true)
    try {
      // Update profile role to 'company'
      await supabase.from('profiles').upsert({
        id: user.id,
        user_id: user.id,
        email: form.contactEmail,
        first_name: form.contactName.split(' ')[0],
        last_name: form.contactName.split(' ').slice(1).join(' '),
        display_name: form.contactName,
        role: 'company',
        updated_at: new Date().toISOString(),
      })

      // Register company
      const company = await registerCompany({
        userId: user.id,
        rut: form.rut,
        name: form.name,
        industry: form.industry,
        employeeCount: parseInt(form.employeeCount) || 0,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
      })

      setStep('confirm')

      // If a plan was selected, create subscription
      if (selectedPlan) {
        try {
          const res = await fetch('/api/empresas/subscription/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyId: company.id, planId: selectedPlan }),
          })
          const data = await res.json()
          if (data.initPoint) {
            window.location.href = data.initPoint
            return
          }
        } catch (subError) {
          console.error('Error creating subscription:', subError)
        }
      }

      setTimeout(() => {
        navigate('/empresa')
      }, 2000)
    } catch (error) {
      toast.error('Error al registrar la empresa. Intenta de nuevo.')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="h-16 flex items-center justify-center border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-2" onClick={() => navigate('/')}>
          <Scale className="h-8 w-8 text-green-900 cursor-pointer" />
          <span className="text-xl font-bold text-green-900 cursor-pointer">LegalUp</span>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate('/legalup-empresas')}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a LegalUp Empresas
        </button>

        {step === 'plan' && (
          <>
            <div className="text-center mb-10">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-900" />
              <h1 className="text-4xl font-bold font-serif text-green-900 mb-2">
                Elige tu plan
              </h1>
              <p className="text-gray-600">
                Selecciona el plan que mejor se adapte a tu empresa
              </p>
            </div>
            <div className="grid gap-4">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className="p-6 cursor-pointer border-2 hover:border-gray-900 transition-colors"
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{plan.price}</p>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <p>{plan.consultations}</p>
                      <p>{plan.documents}</p>
                      <p>SLA: {plan.sla}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <div className="text-center mt-6">
              <Button variant="outline" onClick={() => handlePlanSelect('')} className="hover:bg-gray-900 hover:text-white">
                Quiero registrarme sin plan ahora
              </Button>
            </div>
          </>
        )}

        {step === 'form' && (
          <>
            <div className="text-center mb-10">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-900" />
              <h1 className="text-4xl font-bold text-green-900 font-serif mb-2">
                Registra tu empresa
              </h1>
              {selectedPlan && (
                <p className="text-gray-600">
                  Plan seleccionado: {plans.find((p) => p.id === selectedPlan)?.name}
                </p>
              )}
            </div>

            <Card className="p-8">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos de la empresa</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <Label>RUT empresa</Label>
                      <Input
                        placeholder="76.123.456-7"
                        value={form.rut}
                        onChange={(e) => handleChange('rut', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Nombre empresa</Label>
                      <Input
                        placeholder="Nombre de tu empresa"
                        value={form.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Industria</Label>
                      <Select
                        value={form.industry}
                        onValueChange={(v) => handleChange('industry', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona industria" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRIES.map((ind) => (
                            <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Trabajadores</Label>
                      <Input
                        type="number"
                        placeholder="Cantidad de trabajadores"
                        value={form.employeeCount}
                        onChange={(e) => handleChange('employeeCount', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Persona de contacto</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Nombre completo</Label>
                      <Input
                        placeholder="Nombre y apellido"
                        value={form.contactName}
                        onChange={(e) => handleChange('contactName', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="correo@empresa.cl"
                        value={form.contactEmail}
                        onChange={(e) => handleChange('contactEmail', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label>Teléfono</Label>
                      <Input
                        placeholder="+56 9 1234 5678"
                        value={form.contactPhone}
                        onChange={(e) => handleChange('contactPhone', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={form.acceptTerms}
                    onChange={(e) => setForm((prev) => ({ ...prev, acceptTerms: e.target.checked }))}
                  />
                  <span className="text-sm text-gray-600">
                    Acepto los{' '}
                    <a href="/terminos" className="text-gray-900 underline" target="_blank">
                      Términos y condiciones
                    </a>{' '}
                    y la{' '}
                    <a href="/privacidad" className="text-gray-900 underline" target="_blank">
                      Política de privacidad
                    </a>{' '}
                    de LegalUp.
                  </span>
                </label>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Registrando...' : 'Crear cuenta empresa'}
                </Button>
              </div>
            </Card>
          </>
        )}

        {step === 'confirm' && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              ¡Empresa registrada!
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Tu empresa ha sido creada exitosamente. Serás redirigido al dashboard.
            </p>
            <Button onClick={() => navigate('/empresa')}>
              Ir al dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
