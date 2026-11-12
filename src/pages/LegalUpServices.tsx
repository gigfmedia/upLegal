import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDown,
  ArrowRight,
  Check,
  ClipboardCheck,
  FileSearch,
  Handshake,
  Layers,
  LockKeyhole,
  Menu,
  MessagesSquare,
  Scale,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ServicesRequestForm } from '@/components/services/ServicesRequestForm';
import {
  SERVICES_CATALOG,
  type ServiceCategorySlug,
} from '@/data/servicesCatalog';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const PANEL_SECTION =
  'mx-3 my-3 scroll-mt-24 rounded-[28px] sm:mx-6 sm:my-6 sm:rounded-[40px]';

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Float({
  children,
  delay = 0,
  amount = 7,
  duration = 7,
  className,
}: {
  children: ReactNode;
  delay?: number;
  amount?: number;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      animate={{ y: [0, -amount, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Enter({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.85, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <p
      className={`text-xs font-semibold uppercase tracking-[0.18em] ${
        dark ? 'text-emerald-400' : 'text-green-700'
      }`}
    >
      {children}
    </p>
  );
}

function BrowserChrome({ url, right }: { url: string; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
      <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
      <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
      <div className="h-2.5 w-2.5 rounded-full bg-green-600" />
      <span className="ml-2 font-mono text-xs text-gray-400">{url}</span>
      {right && <span className="ml-auto">{right}</span>}
    </div>
  );
}

function RequestPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div
        className="pointer-events-none absolute -inset-6 rounded-[36px] bg-white/30 blur-2xl"
        aria-hidden="true"
      />
      <Float amount={6} duration={8}>
        <div className="relative overflow-hidden rounded-[24px] border border-white/80 bg-white/95 shadow-[0_32px_90px_-30px_rgba(20,83,45,0.45)] backdrop-blur">
          <BrowserChrome
            url="legalup.cl/services"
            right={
              <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-[0.65rem] font-semibold text-green-800">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-600" />
                </span>
                Solicitud
              </span>
            }
          />
          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-gray-400">
                  Solicitud de servicio
                </p>
                <p className="mt-1 text-[15px] font-semibold text-gray-900">
                  Revisión de contrato comercial
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[0.65rem] font-semibold text-amber-800">
                Recibida
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { label: 'Empresa', value: 'Comercial Andes SpA' },
                { label: 'Servicio', value: 'Contratos' },
                { label: 'Origen', value: 'Landing /services' },
                { label: 'Etapa', value: 'Evaluación inicial' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-gray-100 bg-gray-50/70 p-2.5">
                  <div className="text-[0.6rem] uppercase tracking-wider text-gray-400">{item.label}</div>
                  <div className="mt-0.5 truncate text-xs font-medium text-gray-800">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-gray-100 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-gray-400">
                  Flujo de la solicitud
                </span>
                <span className="text-[0.65rem] text-gray-400">Vista ilustrativa</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: 'Solicitud recibida', state: 'done' },
                  { label: 'Evaluación de alcance', state: 'active' },
                  { label: 'Trabajo jurídico', state: 'pending' },
                  { label: 'Entrega y seguimiento', state: 'pending' },
                ].map((step) => (
                  <div key={step.label} className="flex items-center gap-2.5">
                    {step.state === 'done' ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-800 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    ) : step.state === 'active' ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-green-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-800" />
                      </span>
                    ) : (
                      <span className="h-5 w-5 shrink-0 rounded-full border border-gray-200" />
                    )}
                    <span
                      className={`text-xs ${
                        step.state === 'pending' ? 'text-gray-400' : 'font-medium text-gray-800'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-3 text-[0.65rem] leading-5 text-gray-400">
              Esta vista muestra el orden del proceso. La evaluación y el trabajo jurídico se realizan
              después de recibir la solicitud.
            </p>
          </div>
        </div>
      </Float>

      <div className="pointer-events-none absolute -right-4 -top-5 hidden sm:block">
        <Float amount={8} duration={6} delay={0.8}>
          <div className="rounded-2xl border border-white/80 bg-white p-3 shadow-lg">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-700" />
              <span className="text-xs font-semibold text-gray-800">Datos privados</span>
            </div>
          </div>
        </Float>
      </div>
      <div className="pointer-events-none absolute -bottom-6 -left-4 hidden sm:block">
        <Float amount={6} duration={7} delay={1.4}>
          <div className="rounded-2xl border border-white/80 bg-white p-3 shadow-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-green-700" />
              <span className="text-xs font-semibold text-gray-800">Evaluación previa</span>
            </div>
          </div>
        </Float>
      </div>
    </div>
  );
}

const STEPS = [
  {
    icon: MessagesSquare,
    title: 'Cuéntanos qué necesitas',
    description:
      'Completa el formulario con el contexto de tu empresa y el servicio que te interesa. Sin documentos ni datos sensibles en esta etapa.',
  },
  {
    icon: FileSearch,
    title: 'Evaluamos el alcance',
    description:
      'Revisamos la información, identificamos vacíos y definimos si el servicio es viable, qué falta y cómo continuar.',
  },
  {
    icon: Sparkles,
    title: 'Trabajo jurídico',
    description:
      'La IA ordena y prepara antecedentes. Un profesional revisa, decide y responde por el trabajo.',
  },
  {
    icon: ClipboardCheck,
    title: 'Entrega y seguimiento',
    description:
      'Recibes el resultado y el siguiente paso recomendado, con registro de lo revisado y lo pendiente.',
  },
];

const MODEL_POINTS = [
  {
    icon: Sparkles,
    title: 'La IA ordena',
    description:
      'Acelera la lectura, la clasificación y la preparación de borradores para que el trabajo avance más rápido.',
  },
  {
    icon: Handshake,
    title: 'El profesional valida',
    description:
      'Un abogado revisa el criterio, corrige el rumbo y asume la recomendación final. La IA no firma ni decide.',
  },
  {
    icon: Layers,
    title: 'Todo queda registrado',
    description:
      'El proceso deja trazabilidad sobre fuentes, cambios y revisión para que la empresa sepa en qué se basó cada entrega.',
  },
];

const BENEFITS = [
  {
    icon: MessagesSquare,
    title: 'Lenguaje claro',
    description: 'Traducimos el trabajo jurídico a decisiones y próximos pasos concretos.',
  },
  {
    icon: Layers,
    title: 'Un solo canal',
    description: 'La solicitud, la evaluación y el avance viven en un mismo hilo de trabajo.',
  },
  {
    icon: LockKeyhole,
    title: 'Confidencialidad',
    description:
      'El formulario no recibe documentos. Si se necesitan antecedentes, acordamos un canal seguro.',
  },
  {
    icon: Scale,
    title: 'Escalable',
    description:
      'Empieza por una necesidad puntual y suma frentes cuando la empresa lo requiera.',
  },
];

const FAQS = [
  {
    question: '¿LegalUp Services es un software?',
    answer:
      'No. Es un servicio jurídico para empresas. La tecnología y la IA apoyan la preparación del trabajo, pero un profesional revisa y responde por cada entrega.',
  },
  {
    question: '¿Puedo contratar cualquier servicio de inmediato?',
    answer:
      'La oferta inicial cubre contratos, cobranza y documentación laboral. Cada solicitud se evalúa antes de confirmar alcance, plazo y precio. No se ejecuta trabajo automáticamente.',
  },
  {
    question: '¿La IA reemplaza al abogado?',
    answer:
      'No. La IA acelera la lectura y la preparación de antecedentes. El criterio jurídico, la decisión y la recomendación final son de un profesional.',
  },
  {
    question: '¿Cómo se protegen mis datos y documentos?',
    answer:
      'El formulario no recibe documentos. Los datos de contacto y la descripción se guardan en un registro privado. Si el caso requiere antecedentes, te indicaremos un canal seguro antes de pedirlos.',
  },
  {
    question: '¿Atienden empresas de todo Chile?',
    answer:
      'Sí, trabajamos de forma remota con empresas en Chile. La coordinación y la entrega se realizan online.',
  },
  {
    question: '¿Cómo se define el precio?',
    answer:
      'Después de la evaluación inicial. No se cobra por enviar la solicitud y no se ejecuta trabajo antes de confirmar el alcance y el precio.',
  },
  {
    question: '¿Qué pasa si mi necesidad no encaja?',
    answer:
      'Te lo diremos con claridad. Si corresponde, te orientaremos hacia otra vía de LegalUp para que no pierdas tiempo con un servicio que no aplica.',
  },
];

export default function LegalUpServices() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [preset, setPreset] = useState<{ category: ServiceCategorySlug; nonce: number } | null>(null);
  const [footerVisible, setFooterVisible] = useState(false);
  const presetNonce = useRef(0);
  const footerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0.01 },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const scrollToId = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
  };

  const requestService = (category: ServiceCategorySlug) => {
    presetNonce.current += 1;
    setPreset({ category, nonce: presetNonce.current });
    document.getElementById('solicitud')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-gray-900 antialiased">
      <Helmet>
        <title>LegalUp Services | Servicios jurídicos para empresas en Chile</title>
        <meta
          name="description"
          content="Contratos, cobranza y documentación laboral para empresas, con apoyo de IA y revisión de profesionales. Solicita una evaluación inicial en LegalUp Services."
        />
        <link rel="canonical" href="https://legalup.cl/services" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="LegalUp Services | Servicios jurídicos para empresas en Chile" />
        <meta
          property="og:description"
          content="Contratos, cobranza y documentación laboral para empresas, con apoyo de IA y revisión de profesionales."
        />
        <meta property="og:url" content="https://legalup.cl/services" />
        <meta property="og:type" content="website" />
      </Helmet>

      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
            aria-label="Ir al inicio de LegalUp"
          >
            <Scale className="h-7 w-7 text-green-900" />
            <span className="text-lg font-bold text-green-900">LegalUp</span>
            <span className="ml-1 rounded bg-[#85efab] px-[6px] py-[4px] align-middle text-[10px] font-bold text-[#101820]">
              SERVICES
            </span>
          </button>

          <nav className="hidden items-center gap-7 md:flex">
            <button
              onClick={() => scrollToId('servicios')}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Servicios
            </button>
            <button
              onClick={() => scrollToId('como-funciona')}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Cómo funciona
            </button>
            <button
              onClick={() => scrollToId('enfoque')}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Enfoque
            </button>
            <button
              onClick={() => scrollToId('preguntas')}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Preguntas
            </button>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Button
              onClick={() => scrollToId('solicitud')}
              className="rounded-full bg-gray-900 shadow-sm hover:bg-green-900"
            >
              Solicitar un servicio
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <button
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="p-2 md:hidden"
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-gray-200 bg-white px-4 py-4 md:hidden">
            <div className="flex flex-col gap-1">
              {[
                { label: 'Servicios', id: 'servicios' },
                { label: 'Cómo funciona', id: 'como-funciona' },
                { label: 'Enfoque', id: 'enfoque' },
                { label: 'Preguntas', id: 'preguntas' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToId(item.id)}
                  className="py-2.5 text-left text-sm text-gray-700"
                >
                  {item.label}
                </button>
              ))}
              <Button
                onClick={() => scrollToId('solicitud')}
                className="mt-2 rounded-full bg-gray-900 hover:bg-green-900"
              >
                Solicitar un servicio
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="bg-white">
          <div className="px-3 pt-3 sm:px-6 sm:pt-6">
            <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-b from-green-300 via-green-200 to-[#edf7f0] px-5 py-20 sm:rounded-[40px] sm:px-12 sm:py-24">
              {/* <motion.div
                className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/40 bg-white/20"
                aria-hidden="true"
                animate={reduceMotion ? undefined : { y: [0, 14, 0], x: [0, -10, 0] }}
                transition={reduceMotion ? undefined : { duration: 12, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full border border-white/30 bg-white/10"
                aria-hidden="true"
                animate={reduceMotion ? undefined : { y: [0, -12, 0], x: [0, 8, 0] }}
                transition={reduceMotion ? undefined : { duration: 14, repeat: Infinity, ease: 'easeInOut' }}
              /> */}

              <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
                <div>
                  <Enter>
                    <span className="inline-flex items-center gap-2 rounded-full border border-green-900/15 bg-white/60 px-3.5 py-1.5 text-xs font-semibold text-green-900 backdrop-blur">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-700" />
                      LegalUp Services
                    </span>
                  </Enter>

                  <Enter delay={0.1}>
                    <h1 className="mt-6 max-w-2xl text-[2.55rem] font-semibold leading-[1.03] tracking-[-0.045em] text-green-950 sm:text-6xl">
                      Resuelve el trabajo jurídico de tu empresa.
                    </h1>
                  </Enter>

                  <Enter delay={0.2}>
                    <p className="mt-6 max-w-xl text-[17px] leading-8 text-green-950/75 sm:text-lg sm:leading-9">
                      Contratos, cobranza y documentación laboral con apoyo de IA, criterio profesional
                      y un proceso claro. Sin jerga innecesaria ni promesas vacías.
                    </p>
                  </Enter>

                  <Enter delay={0.3}>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                      <Button
                        onClick={() => scrollToId('solicitud')}
                        className="h-12 rounded-full bg-gray-900 px-7 text-[15px] font-semibold shadow-sm hover:bg-green-900"
                      >
                        Solicitar un servicio
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => scrollToId('servicios')}
                        variant="outline"
                        className="h-12 rounded-full border-green-900/20 bg-white/50 px-7 text-[15px] font-semibold text-green-950 hover:bg-white"
                      >
                        Ver servicios
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </Enter>

                  <Enter delay={0.4}>
                    <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2.5 text-sm text-green-950/70">
                      {['Evaluación previa', 'Profesional a cargo', 'Datos privados'].map((item) => (
                        <li key={item} className="inline-flex items-center gap-1.5">
                          <Check className="h-4 w-4 text-green-700" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </Enter>

                  <Enter delay={0.48}>
                    <p className="mt-5 max-w-md text-xs leading-5 text-green-950/55">
                      No se cobra por enviar la solicitud. Primero evaluamos si el servicio es viable y
                      qué información falta.
                    </p>
                  </Enter>
                </div>

                <Enter delay={0.35} className="relative">
                  <RequestPreview />
                </Enter>
              </div>
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-b border-gray-100 bg-white">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, label: 'Datos en registro privado' },
              { icon: Handshake, label: 'Revisión de un profesional' },
              { icon: Layers, label: 'Proceso trazable' },
              { icon: LockKeyhole, label: 'Sin documentos en el formulario' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5 text-sm text-gray-600">
                <item.icon className="h-4 w-4 shrink-0 text-green-500" />
                {item.label}
              </div>
            ))}
          </div>
        </section>

        {/* Servicios */}
        <section id="servicios" className="scroll-mt-24 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Reveal className="max-w-3xl">
              <Eyebrow>Servicios</Eyebrow>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-gray-900 sm:text-5xl">
                Tres frentes donde el trabajo jurídico frena a las empresas.
              </h2>
              <p className="mt-5 text-[17px] leading-8 text-gray-600">
                Empieza por la necesidad que hoy te quita tiempo. Cada servicio se evalúa antes de
                confirmar alcance, plazo y precio.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {SERVICES_CATALOG.map((service, index) => (
                <Reveal key={service.slug} delay={index * 0.06}>
                  <article className="flex h-full flex-col rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_18px_60px_-50px_rgba(16,24,32,0.5)] transition-all duration-300 hover:-translate-y-1 hover:border-green-200 hover:shadow-[0_28px_80px_-40px_rgba(20,83,45,0.35)] sm:p-7">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-900">
                      <service.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-gray-900">
                      {service.name}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-green-800">{service.tagline}</p>
                    <p className="mt-4 text-sm leading-7 text-gray-600">{service.description}</p>

                    <ul className="mt-5 space-y-2.5">
                      {service.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2.5 text-sm text-gray-700">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                          {bullet}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-gray-400">
                        Ideal para
                      </p>
                      <p className="mt-1.5 text-sm leading-6 text-gray-600">{service.idealFor}</p>
                    </div>

                    <button
                      onClick={() => requestService(service.slug)}
                      className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-green-800 transition-colors hover:text-green-950"
                    >
                      Solicitar este servicio
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </article>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.1}>
              <p className="mt-8 max-w-3xl text-sm leading-6 text-gray-500">
                La disponibilidad y el alcance de cada servicio se confirman en la evaluación inicial.
                No todos los casos requieren lo mismo, y no todos se resuelven de la misma forma.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className={`${PANEL_SECTION} bg-cream-900 py-20 sm:py-24`}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Reveal className="max-w-3xl">
              <Eyebrow>Cómo funciona</Eyebrow>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-gray-900 sm:text-5xl">
                De la solicitud a la entrega, sin perder el hilo.
              </h2>
              <p className="mt-5 text-[17px] leading-8 text-gray-600">
                Un proceso simple para que sepas qué pasa, quién lo revisa y qué falta. Sin prometer
                análisis automático antes de tiempo.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <Reveal key={step.title} delay={index * 0.06}>
                  <div className="relative h-full rounded-[24px] border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-300 text-green-950">
                        <step.icon className="h-4 w-4" />
                      </div>
                      <span className="font-mono text-xs font-semibold text-gray-300">
                        0{index + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-gray-900">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-gray-600">{step.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Enfoque IA + profesional */}
        <section
          id="enfoque"
          className={`${PANEL_SECTION} relative overflow-hidden bg-gray-950 py-28 text-white sm:py-36`}
        >
          <div
            className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] max-w-none -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-7xl px-6 sm:px-12">
            <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
                <Reveal>
                  <Eyebrow dark>Cómo trabajamos</Eyebrow>
                  <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">
                    IA para avanzar. Criterio profesional para decidir.
                  </h2>
                  <p className="mt-5 max-w-xl text-[16px] leading-8 text-white/65">
                    La IA nos ayuda a ordenar el trabajo y a preparar antecedentes. El criterio
                    jurídico, la revisión y la recomendación final siguen en manos de un profesional.
                  </p>
                  <p className="mt-4 max-w-xl text-[16px] leading-8 text-white/65">
                    No vendemos automatización sin supervisión. Vendemos un proceso claro, con apoyo
                    tecnológico y responsabilidad profesional.
                  </p>
                  <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-emerald-300">
                    <ShieldCheck className="h-4 w-4" />
                    La IA no firma ni decide por ti
                  </div>
                </Reveal>

                <div className="space-y-3">
                  {MODEL_POINTS.map((point, index) => (
                    <Reveal key={point.title} delay={0.06 + index * 0.06}>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
                        <div className="flex items-start gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                            <point.icon className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-white">{point.title}</h3>
                            <p className="mt-1.5 text-sm leading-7 text-white/60">
                              {point.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>

            <Reveal delay={0.2}>
              <p className="mt-8 max-w-4xl border-t border-white/10 pt-5 text-xs leading-6 text-white/45">
                La automatización de análisis se habilitará de forma progresiva. Hoy el foco está en
                recibir, evaluar y derivar cada solicitud de forma responsable. No se analizan
                contratos automáticamente desde este formulario.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Beneficios */}
        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <Reveal>
              <Eyebrow>Por qué LegalUp Services</Eyebrow>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-gray-900 sm:text-5xl">
                Menos fricción. Más claridad sobre lo que ocurre.
              </h2>
              <p className="mt-5 text-[17px] leading-8 text-gray-600">
                El trabajo jurídico no debería depender de correos perdidos, carpetas sin nombre o
                respuestas que no explican el siguiente paso.
              </p>
            </Reveal>

            <div className="divide-y divide-gray-100 border-y border-gray-100">
              {BENEFITS.map((benefit, index) => (
                <Reveal key={benefit.title} delay={index * 0.05}>
                  <div className="flex gap-4 py-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-900">
                      <benefit.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{benefit.title}</h3>
                      <p className="mt-1.5 text-sm leading-7 text-gray-600">{benefit.description}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="preguntas" className={`${PANEL_SECTION} bg-cream-900 py-20 sm:py-24`}>
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <Reveal className="text-center">
              <Eyebrow>Preguntas frecuentes</Eyebrow>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-gray-900 sm:text-5xl">
                Lo que conviene saber antes de solicitar.
              </h2>
            </Reveal>

            <Reveal delay={0.08} className="mt-10">
              <Accordion type="single" collapsible className="space-y-3">
                {FAQS.map((faq, index) => (
                  <AccordionItem
                    key={faq.question}
                    value={`faq-${index}`}
                    className="rounded-2xl border border-gray-200 bg-white px-5"
                  >
                    <AccordionTrigger className="py-4 text-left text-[15px] font-semibold text-gray-900 hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 text-sm leading-7 text-gray-600">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </div>
        </section>

        {/* Solicitud */}
        <section id="solicitud" className="scroll-mt-24 bg-white py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <Reveal>
              <Eyebrow>Solicitud</Eyebrow>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-gray-900 sm:text-5xl">
                Cuéntanos qué necesita tu empresa.
              </h2>
              <p className="mt-5 text-[17px] leading-8 text-gray-600">
                Con esos datos hacemos una primera evaluación: si el servicio aplica, qué información
                falta y cómo seguir. No se ejecuta trabajo ni se cobra en este paso.
              </p>

              <div className="mt-8 space-y-5">
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-green-700" />
                    <h3 className="text-sm font-semibold text-gray-900">Qué ayuda a evaluar</h3>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-600">
                    {[
                      'El tipo de acuerdo, factura o documento involucrado.',
                      'El contexto del negocio y el resultado que buscas.',
                      'El plazo o la urgencia que tienes en mente.',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-green-700" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                  <div className="flex items-center gap-2">
                    <LockKeyhole className="h-4 w-4 text-amber-700" />
                    <h3 className="text-sm font-semibold text-amber-900">Qué no incluir aquí</h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-amber-900/75">
                    No adjuntes contratos, documentos de identidad, datos financieros ni información
                    sensible. Si el caso lo requiere, coordinamos un canal seguro.
                  </p>
                </div>
              </div>

              <p className="mt-6 text-sm text-gray-500">
                ¿Prefieres escribirnos?{' '}
                <a
                  href="mailto:contacto@legalup.cl"
                  className="font-medium text-green-800 underline underline-offset-2"
                >
                  contacto@legalup.cl
                </a>
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <ServicesRequestForm preset={preset} />
            </Reveal>
          </div>
        </section>
      </main>

      {/* Sentinel: marca el inicio del footer global para ocultar el CTA móvil. */}
      <div ref={footerRef} aria-hidden="true" className="h-px w-full" />

      {!footerVisible && (
        <div
          data-testid="mobile-services-cta"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 p-3 backdrop-blur md:hidden"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <Button
            onClick={() => scrollToId('solicitud')}
            className="h-11 w-full rounded-full bg-gray-900 font-semibold hover:bg-green-900"
          >
            Solicitar un servicio
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
