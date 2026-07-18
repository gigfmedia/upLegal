import { useState, Suspense, lazy, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { getCompany } from '@/services/empresaService'
import type { Company } from '@/types/empresas'
import { toast } from 'sonner'

const AuthModal = lazy(() => import('@/components/AuthModal').then(m => ({ default: m.AuthModal })))
import {
  Scale,
  Shield,
  Clock,
  FileText,
  MessageSquare,
  Users,
  ChevronRight,
  Check,
  ArrowRight,
  Building2,
  Briefcase,
  Star,
  ChevronDown,
  LogOut,
  LayoutDashboard,
} from 'lucide-react'

const plans = [
  {
    id: 'start',
    name: 'Start',
    price: '$99.000',
    priceDetail: '/ mes',
    description: 'Para empresas que recién comienzan',
    features: [
      '1 consulta legal (30 min)',
      'Respuesta en 48 horas',
      'Acceso a la plataforma',
      'Gestión de solicitudes',
    ],
    highlighted: false,
    cta: 'Contratar plan',
  },
  {
    id: 'pyme',
    name: 'PyME',
    price: '$199.000',
    priceDetail: '/ mes',
    description: 'Para empresas en crecimiento',
    features: [
      '2 consultas legales',
      '1 revisión documental simple (hasta 10 páginas)',
      'Respuesta en 24 horas',
    ],
    highlighted: true,
    cta: 'Contratar plan',
  },
  {
    id: 'business',
    name: 'Business',
    price: '$399.000',
    priceDetail: '/ mes',
    description: 'Para empresas que requieren atención continua',
    features: [
      '4 consultas legales',
      '2 revisiones documentales simples',
      'Respuesta prioritaria',
      'Abogado de referencia',
    ],
    highlighted: false,
    cta: 'Contratar plan',
  },
]

const benefits = [
  {
    icon: Scale,
    title: 'Departamento legal externo',
    description: 'Accede a un equipo de abogados especialistas sin los costos de tener un área legal interna.',
  },
  {
    icon: Clock,
    title: 'Respuesta rápida',
    description: 'Cada plan tiene un SLA definido. Desde 8 horas hábiles en el plan Business.',
  },
  {
    icon: FileText,
    title: 'Gestión de documentos',
    description: 'Biblioteca digital para organizar contratos, demandas, escrituras y más.',
  },
  {
    icon: MessageSquare,
    title: 'Comunicación directa',
    description: 'Chatea directamente con tu abogado asignado desde la plataforma.',
  },
  {
    icon: Users,
    title: 'Red de especialistas',
    description: 'Acceso a abogados de todas las especialidades: laboral, comercial, tributario, civil y más.',
  },
  {
    icon: Shield,
    title: 'Sin sorpresas',
    description: 'Precios fijos mensuales. Sabes exactamente lo que pagas cada mes.',
  },
]

const howItWorks = [
  {
    step: '1',
    title: 'Elige tu plan',
    description: 'Selecciona el plan que mejor se adapte a las necesidades de tu empresa.',
  },
  {
    step: '2',
    title: 'Describe tu problema',
    description: 'Crea una solicitud legal describiendo tu situación. Sin necesidad de saber qué abogado necesitas.',
  },
  {
    step: '3',
    title: 'Te asignamos un abogado',
    description: 'Un abogado especialista en el área correspondiente revisa tu caso y te responde.',
  },
  {
    step: '4',
    title: 'Recibe asesoría',
    description: 'Obtén respuestas, revisión de documentos o presupuestos para trabajo adicional.',
  },
]

const faqs = [
  {
    q: '¿Qué es LegalUp Empresas?',
    a: 'LegalUp Empresas es un servicio de suscripción que entrega a tu empresa acceso a un equipo de abogados especialistas para resolver consultas legales, revisar documentos y gestionar servicios jurídicos cuando los necesites.',
  },
  {
    q: '¿Qué incluye la suscripción?',
    a: 'Dependiendo del plan contratado, incluye un número de consultas legales, revisiones de documentos, seguimiento de solicitudes y acceso preferente a servicios legales especializados.',
  },
  {
    q: '¿Cómo solicito ayuda legal?',
    a: 'Solo debes crear una nueva solicitud desde tu panel de empresa, describir el problema y, si es necesario, adjuntar documentos. LegalUp asignará al abogado especialista más adecuado para tu caso.',
  },
  {
    q: '¿Siempre me atenderá el mismo abogado?',
    a: 'No necesariamente. Cada solicitud se asigna al abogado especialista según la materia, para que siempre recibas asesoría de un profesional con experiencia en esa área. En planes superiores puedes contar con un abogado de referencia para coordinar tus necesidades legales.',
  },
  {
    q: '¿Qué ocurre si mi caso requiere un juicio o un trámite más complejo?',
    a: 'Si tu solicitud requiere un servicio adicional, el abogado preparará un presupuesto detallado. Tú decides si deseas aprobarlo antes de que se inicie cualquier gestión.',
  },
  {
    q: '¿Los servicios adicionales están incluidos en la suscripción?',
    a: 'No. La suscripción cubre las consultas y beneficios definidos en tu plan. Los trabajos que requieren ejecución, como demandas, registros de marca, constitución de sociedades o elaboración de contratos complejos, se cotizan por separado.',
  },
  {
    q: '¿Puedo subir documentos para que los revise un abogado?',
    a: 'Sí. Puedes adjuntar contratos, escrituras, documentos laborales, notificaciones, resoluciones y otros archivos directamente desde la plataforma para que sean revisados por el abogado asignado.',
  },
  {
    q: '¿Cuánto demora una respuesta?',
    a: 'El tiempo de respuesta depende del plan contratado. Cada solicitud tiene un compromiso de atención (SLA) que puedes consultar desde tu panel de empresa.',
  },
  {
    q: '¿Cómo funcionan los pagos?',
    a: 'La suscripción se paga mensualmente mediante Mercado Pago. Los servicios adicionales solo se cobran si apruebas el presupuesto enviado por el abogado.',
  },
  {
    q: '¿Puedo cancelar la suscripción?',
    a: 'Sí. Puedes solicitar la cancelación en cualquier momento. Tu empresa mantendrá los beneficios hasta el término del período ya pagado y no se realizarán nuevos cobros posteriores.',
  },
  {
    q: '¿Mi información es confidencial?',
    a: 'Sí. Toda la información y los documentos compartidos se gestionan de forma confidencial y solo son accesibles para las personas autorizadas dentro de tu empresa y el abogado asignado al caso.',
  },
  {
    q: '¿Qué tipo de empresas pueden utilizar LegalUp Empresas?',
    a: 'LegalUp Empresas está pensado para startups, PYMEs, comercios, agencias, clínicas, constructoras, empresas familiares y cualquier organización que necesite apoyo legal recurrente sin contratar un departamento jurídico interno.',
  },
]

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <span className="font-medium text-gray-900 pr-4">{question}</span>
        <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-6 pb-4">
          <p className="text-gray-600 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}

export default function LegalUpEmpresas() {
  const navigate = useNavigate()
  const { user, isLoading } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [company, setCompany] = useState<Company | null>(null)

  useEffect(() => {
    if (user) {
      getCompany(user.id).then(setCompany).catch(() => {})
    } else {
      setCompany(null)
    }
  }, [user])

  const handleStart = async (planId?: string) => {
    if (isLoading) return
    if (user) {
      const company = await getCompany(user.id)
      if (company) {
        if (planId) {
          try {
            const res = await fetch('/api/empresas/subscription/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ companyId: company.id, planId }),
            })
            const data = await res.json()
            if (!res.ok) {
              toast.error(data.error || 'Error al crear suscripción')
              return
            }
            if (data.initPoint) {
              window.location.href = data.initPoint
              return
            }
          } catch (e) {
            toast.error('Error de conexión al crear suscripción')
          }
        } else {
          navigate('/empresa')
        }
      } else {
        navigate(`/empresa/registro${planId ? `?plan=${planId}` : ''}`)
      }
    } else {
      setSelectedPlan(planId || null)
      setAuthMode('login')
      setIsAuthModalOpen(true)
    }
  }

  const handleLoginClick = () => {
    setAuthMode('login')
    setIsAuthModalOpen(true)
  }

  const handleLoginSuccess = async () => {
    setIsAuthModalOpen(false)
    const session = await supabase.auth.getSession()
    const userId = session.data.session?.user?.id
    if (!userId) return
    const company = await getCompany(userId)
    if (company) {
      if (selectedPlan) {
        try {
          const res = await fetch('/api/empresas/subscription/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyId: company.id, planId: selectedPlan }),
          })
          const data = await res.json()
          if (!res.ok) {
            toast.error(data.error || 'Error al crear suscripción')
            navigate('/empresa', { replace: true })
            return
          }
          if (data.initPoint) {
            window.location.href = data.initPoint
            return
          }
        } catch (e) {
          toast.error('Error de conexión al crear suscripción')
        }
      }
      navigate('/empresa', { replace: true })
    } else {
      navigate(`/empresa/registro${selectedPlan ? `?plan=${selectedPlan}` : ''}`, { replace: true })
    }
  }

  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const contactName = company?.contact_name || ''
  const companyName = company?.name || ''
  const initials = contactName
    ? contactName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'EM'

  return (
    <div className="min-h-screen bg-white">
      {/* Custom header for Empresas landing */}
      <header className="h-16 flex items-center px-4 sm:px-6 lg:px-8 border-b border-gray-200 bg-white fixed top-0 left-0 right-0 z-50">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-3 items-center">
          <div className="flex items-center space-x-2 justify-self-start" onClick={() => navigate('/')}>
            <Scale className="h-8 w-8 text-green-900 cursor-pointer" />
            <span className="text-xl font-bold text-green-900 cursor-pointer">LegalUp</span>
            <span className="text-[10px] bg-green-900 text-white px-1 py-0.5 rounded ml-1 align-middle">Business</span>
          </div>
          <nav className="hidden md:flex items-center justify-center space-x-6">
            <button onClick={() => document.getElementById('empresa-benefits')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-muted-foreground hover:text-green-900 transition-colors">Beneficios</button>
            <button onClick={() => document.getElementById('empresa-how')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-muted-foreground hover:text-green-900 transition-colors">¿Cómo funciona?</button>
            <button onClick={() => document.getElementById('empresa-plans')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-muted-foreground hover:text-green-900 transition-colors">Planes</button>
            <button onClick={() => document.getElementById('empresa-faq')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-muted-foreground hover:text-green-900 transition-colors">FAQ</button>
          </nav>
          <div className="flex items-center space-x-3 justify-self-end">
            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.user_metadata?.avatar_url || undefined} />
                    <AvatarFallback className="bg-green-900 text-white text-xs font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-gray-900 hidden lg:block">
                    {companyName}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400 hidden lg:block" />
                </button>
                {isProfileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{contactName}</p>
                      <p className="text-xs text-gray-500">{companyName}</p>
                    </div>
                    <button
                      onClick={() => navigate('/empresa')}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </button>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Button variant="ghost" className="text-gray-600" onClick={handleLoginClick}>
                  Iniciar Sesión
                </Button>
                <Button className="bg-gray-900 hover:bg-green-900 text-white" onClick={() => handleStart()}>
                  Contratar Plan
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}

      <section className="relative overflow-hidden bg-cream-900 pt-16">
        {/* <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-800 via-transparent to-transparent" /> */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-20">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="outline" className="inline-flex items-center gap-2 bg-gray-900 text-white rounded-full px-3 py-2.5 text-xs mb-6 h-[30px]">
             <Building2 className="w-4 h-4 mr-2 text-white" />
              LegalUp Business
            </Badge>
            <h1 className="text-3xl sm:text-[3.5rem] leading-[1.4] sm:leading-[1.2] font-bold tracking-tight text-gray-900 font-serif mb-6">
              Tu departamento {' '}
              <span className="text-green-900 italic underline underline-offset-8"> legal externo.</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-900 mb-8 max-w-2xl mx-auto">
              Con una sola suscripción, tu empresa cuenta con un equipo de abogados especialistas para resolver sus necesidades legales.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-base h-12 px-8 hover:bg-green-900 hover:text-white" onClick={() => handleStart()}>
                Comenzar ahora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                className="text-base bg-white text-gray-900 border hover:bg-white-50 h-12 px-8"
                onClick={() => document.getElementById('empresa-plans')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Ver planes
              </Button>
            </div>
            <p className="mt-4 text-sm text-gray-900">
              Sin permanencia mínima. Cancela cuando quieras.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="empresa-benefits" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-bold text-green-900 font-serif mb-4">
              ¿Por qué LegalUp Empresas?
            </h2>
            <p className="text-lg text-gray-600">
              Más de 100 empresas chilenas ya confían en nosotros como su departamento legal externo.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit) => (
              <Card key={benefit.title} className="rounded-lg bg-card text-card-foreground shadow-sm group border h-full p-6">
                <div className="w-12 h-12 bg-green-900 rounded-lg flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="empresa-how" className="py-24 bg-cream-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-bold text-green-900 font-serif mb-4">
              ¿Cómo funciona?
            </h2>
            <p className="text-lg text-gray-600">
              En 4 pasos simples, tu empresa tiene acceso a asesoría legal de calidad.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {howItWorks.map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadown-green-600/20">
                  <span className="text-green-600 text-xl">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="empresa-plans" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-bold text-green-900 font-serif mb-4">
              Planes para cada empresa
            </h2>
            <p className="text-lg text-gray-600">
              Elige el plan que mejor se adapte a tus necesidades. Todos incluyen acceso a la red de abogados especialistas de LegalUp.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative p-8 border rounded-3xl transition-all flex flex-col ${
                  plan.highlighted
                    ? 'border-green-900 border-2 bg-cream-900 shadow-xl'
                    : 'border-gray-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute top-8 right-8">
                    <Badge className="bg-gray-900 text-white px-4 py-1 h-6 animate-bounce shadow-lg">Más popular</Badge>
                  </div>
                )}
                <div className="flex-1">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">{plan.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">{plan.description}</p>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-gray-500 ml-1">{plan.priceDetail}</span>
                    </div>
                  </div>
                  <Separator className="mb-6" />
                  <p className="text-gray-900 text-sm font-bold mt-1 mb-4">Incluye:</p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  className="w-full mt-auto"
                  variant={plan.highlighted ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => handleStart(plan.id)}
                >
                  {plan.cta}
                </Button>
              </Card>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-12 text-center">
            Cualquier revisión compleja, informe en derecho o trabajo de ejecución se cotiza por separado.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="empresa-faq" className="py-24 bg-cream-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-bold text-green-900 font-serif mb-4">
              Preguntas frecuentes
            </h2>
            <p className="text-lg text-gray-600">
              Todo lo que necesitas saber sobre LegalUp Empresas.
            </p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FaqItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-green-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-green-600 font-serif mb-4">
            Prepara tu empresa para lo que viene
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Únete a las empresas que ya tienen su departamento legal externo con LegalUp.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="text-base h-12 px-8"
            onClick={() => handleStart()}
          >
            Comenzar ahora
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {isAuthModalOpen && (
        <Suspense fallback={null}>
          <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} mode={authMode} onModeChange={setAuthMode} onLoginSuccess={handleLoginSuccess} />
        </Suspense>
      )}
    </div>
  )
}
