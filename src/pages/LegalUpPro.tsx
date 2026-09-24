import { useEffect, useState, useRef, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Scale, ArrowRight, Check, Inbox, Users, Briefcase, Calendar, DollarSign, Sparkles, Shield, ChevronDown, Menu, X, Zap, Search, Clock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/contexts/AuthContext/clean/useAuth";
import { useProSubscription } from "@/hooks/useProSubscription";
import { ProPricingModal } from "@/components/legalup-pro/ProPricingModal";
import { AuthModal } from "@/components/AuthModal";
import posthog from "posthog-js";
import { persistUTMsFromURL } from "@/lib/bookingAttribution";

function getUTMs() {
  try {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("utm_source") || sessionStorage.getItem("utm_source") || null;
    const medium = params.get("utm_medium") || sessionStorage.getItem("utm_medium") || null;
    const campaign = params.get("utm_campaign") || sessionStorage.getItem("utm_campaign") || null;
    const content = params.get("utm_content") || sessionStorage.getItem("utm_content") || null;
    const term = params.get("utm_term") || sessionStorage.getItem("utm_term") || null;
    return { source, medium, campaign, content, term, referrer: document.referrer || null, path: window.location.pathname };
  } catch {
    return { source: null, medium: null, campaign: null, content: null, term: null, referrer: null, path: "/pro" };
  }
}

// Scroll-reveal adaptado del sistema de animación de LegalUp AI:
// entrada suave una sola vez, sin loops decorativos pesados.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${dark ? "text-emerald-400" : "text-green-700"}`}>
      {children}
    </p>
  );
}

// Mock del workspace Pro con estructura real de la UI (sin métricas falsas):
// flujo Solicitudes → Clientes → Casos → Agenda → Ingresos + tarjeta IA.
const FLOW_STEPS = [
  { label: "Solicitudes", icon: Inbox, detail: "Bandeja centralizada" },
  { label: "Clientes", icon: Users, detail: "Historial por cliente" },
  { label: "Casos", icon: Briefcase, detail: "Trabajo asociado" },
  { label: "Agenda", icon: Calendar, detail: "Citas conectadas" },
  { label: "Ingresos", icon: DollarSign, detail: "Actividad en la plataforma" },
];

function ProWorkspacePreview() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
        <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-600" />
        <span className="ml-2 text-xs font-mono text-gray-400">legalup.cl/lawyer/dashboard</span>
        <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-medium text-emerald-700 sm:inline-flex">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600" />
          </span>
          Espacio Pro activo
        </span>
      </div>
      {/* Flujo conectado del workspace */}
      <div className="border-b border-gray-100 bg-cream-900 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-1 overflow-x-auto sm:gap-2">
          {FLOW_STEPS.map((step, i) => (
            <div key={step.label} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: EASE }}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-gray-100 bg-white px-2.5 py-2 sm:px-3"
              >
                <step.icon className="h-4 w-4 shrink-0 text-green-700" />
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-gray-900">{step.label}</div>
                  <div className="hidden truncate text-[0.65rem] text-gray-500 sm:block">{step.detail}</div>
                </div>
              </motion.div>
              {i < FLOW_STEPS.length - 1 && (
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
        <div className="rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Próximas citas</span>
            <span className="text-xs text-green-700">Ver agenda →</span>
          </div>
          <div className="mt-3 space-y-2">
            {[
              { time: "10:00", name: "Reunión de seguimiento", tag: "Caso activo" },
              { time: "15:30", name: "Primera consulta", tag: "Solicitud" },
            ].map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5">
                <div>
                  <div className="text-sm font-medium text-gray-900">{a.time} · {a.name}</div>
                  <div className="text-xs text-gray-500">{a.tag}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-semibold text-gray-900">IA dentro del caso</span>
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <div className="ml-auto w-fit max-w-[90%] rounded-lg rounded-br-sm bg-gray-900 px-3 py-2 text-white">
              ¿Qué plazos debo revisar en este documento?
            </div>
            <div className="w-fit max-w-[95%] rounded-lg rounded-bl-sm border border-gray-100 bg-white px-3 py-2 text-gray-700">
              Encontré 3 plazos con sus fechas y obligaciones asociadas…
            </div>
          </div>
          <p className="mt-2 text-[0.65rem] text-gray-400">Ejemplo ilustrativo de la interfaz</p>
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-black/5" />
    </div>
  );
}

const MODULES = [
  { icon: Users, title: "Clientes", desc: "Centraliza la información de tus clientes y accede a su historial desde un mismo lugar.", route: "Clientes" },
  { icon: Briefcase, title: "Casos", desc: "Organiza asuntos y mantén el trabajo asociado a cada cliente.", route: "Casos" },
  { icon: Inbox, title: "Solicitudes", desc: "Recibe y gestiona nuevas solicitudes desde un inbox centralizado.", route: "Solicitudes" },
  { icon: Calendar, title: "Agenda", desc: "Visualiza citas y organiza tu agenda desde un solo lugar.", route: "Agenda" },
  { icon: Zap, title: "Servicios", desc: "Administra los servicios que ofreces desde LegalUp.", route: "Servicios" },
  { icon: DollarSign, title: "Ingresos", desc: "Consulta los ingresos asociados a tu actividad en la plataforma.", route: "Ingresos" },
];

const AI_CAPABILITIES = [
  { icon: FileText, title: "Análisis de documentos", desc: "Estructura, puntos clave y riesgos de tus documentos dentro del caso." },
  { icon: MessageSquare, title: "Chat del caso", desc: "Pregunta sobre el contenido de tus casos y documentos." },
  { icon: Search, title: "Investigación", desc: "Jurisprudencia y normativa chilena con fuentes verificables." },
  { icon: Clock, title: "Uso mensual incluido", desc: "Consultas, análisis e investigaciones con renovación mensual." },
];

const COMPARISON_ROWS = [
  { label: "Clientes e historial", pro: "Centralizados por cliente", other: "Repartidos en chats y archivos" },
  { label: "Casos", pro: "Organizados con su trabajo asociado", other: "Carpetas sueltas sin seguimiento" },
  { label: "Solicitudes", pro: "Inbox centralizado", other: "Se pierden entre mensajes" },
  { label: "Agenda", pro: "Conectada a tus casos", other: "Calendarios separados" },
  { label: "IA integrada", pro: "Dentro del flujo del caso", other: "Herramientas sueltas o inexistentes" },
  { label: "Tus datos", pro: "Separados por abogado", other: "Mezclados o sin control claro" },
];

const FAQS = [
  { q: "¿Qué es LegalUp Pro?", a: "Es el SaaS para abogados dentro de LegalUp. Te permite gestionar tu actividad profesional — solicitudes, clientes, casos, citas e ingresos — desde un solo lugar, con IA integrada en tus casos." },
  { q: "¿Para quién es?", a: "Para abogados independientes y estudios boutique que quieren centralizar su gestión sin depender de planillas, mensajes y herramientas separadas." },
  { q: "¿Qué puedo gestionar?", a: "Clientes con su historial, casos con su trabajo asociado, solicitudes desde un inbox centralizado, agenda de citas, los servicios que ofreces y los ingresos de tu actividad en la plataforma." },
  { q: "¿LegalUp Pro incluye LegalUp AI?", a: "Sí, LegalUp AI viene integrado en tus casos: análisis de documentos, chat sobre casos e investigación de jurisprudencia, con uso mensual incluido." },
  { q: "¿Necesito usar el marketplace?", a: "No es obligatorio. Pro organiza tu práctica actual y además centraliza las solicitudes que recibas desde LegalUp." },
  { q: "¿Mis datos están separados de otros abogados?", a: "Sí. Cada abogado solo accede a su propia información: clientes, casos, documentos e ingresos están separados por cuenta." },
  { q: "¿Cuánto cuesta?", a: "$19.990/mes durante tus primeros 3 cobros. Desde el cuarto cobro, $49.990/mes." },
  { q: "¿Qué pasa después de los 3 meses?", a: "Los primeros 3 cobros son de $19.990/mes. Desde el cuarto cobro, el precio es $49.990/mes. Si cancelas y vuelves, tus cobros anteriores se mantienen y el conteo no se reinicia." },
  { q: "¿Puedo cancelar?", a: "Sí. Puedes cancelar tu suscripción en cualquier momento desde el dashboard. El acceso se mantiene hasta el fin del período ya pagado. Si necesitas ayuda, escríbenos a través de los canales de soporte de LegalUp." },
];

export default function LegalUpPro() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const pro = useProSubscription();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [pricingOpen, setPricingOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const viewedRef = useRef(false);

  const userRole = (user?.user_metadata?.role as string | undefined) ?? (user as any)?.role ?? (user as any)?.profile?.role ?? null;

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    persistUTMsFromURL();
  }, []);

  // pro_landing_viewed once per mount
  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    const utms = getUTMs();
    try {
      posthog.capture("pro_landing_viewed", {
        utm_source: utms.source,
        utm_medium: utms.medium,
        utm_campaign: utms.campaign,
        utm_content: utms.content,
        utm_term: utms.term,
        referrer: utms.referrer,
        path: utms.path,
      });
    } catch {}
  }, []);

  const handleCTAClick = (location: string) => {
    const utms = getUTMs();
    const authenticated = !!user;
    const hasProAccess = !!pro.hasProAccess;

    if (authLoading) return;

    // Client → excluded from Pro funnel
    if (userRole === "client") {
      try {
        posthog.capture("pro_landing_client_excluded", {
          location,
          authenticated: true,
          role: "client",
          path: utms.path,
          utm_source: utms.source,
          utm_medium: utms.medium,
          utm_campaign: utms.campaign,
        });
      } catch {}
      navigate("/search");
      return;
    }

    try {
      posthog.capture("pro_landing_cta_clicked", {
        location,
        authenticated,
        has_pro_access: hasProAccess,
        utm_source: utms.source,
        utm_medium: utms.medium,
        utm_campaign: utms.campaign,
      });
    } catch {}

    // Not authenticated -> open signup as lawyer
    if (!user) {
      setAuthMode("signup");
      setAuthOpen(true);
      return;
    }

    // Authenticated lawyer without Pro -> open pricing modal
    const isLawyer = userRole === "lawyer" || (user?.user_metadata as any)?.role === "lawyer";
    if (isLawyer) {
      if (pro.hasProAccess) {
        navigate("/lawyer/dashboard");
      } else {
        setPricingOpen(true);
      }
      return;
    }

    // Other roles (company/admin/unknown) → safe fallback, not Pro funnel
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      <Helmet>
        <title>LegalUp Pro | Gestión para abogados en Chile</title>
        <meta
          name="description"
          content="Gestiona clientes, casos, solicitudes y citas desde un solo lugar con LegalUp Pro. Plataforma para abogados en Chile con herramientas de IA integradas."
        />
        <link rel="canonical" href="https://legalup.cl/pro" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="LegalUp Pro | Gestión para abogados en Chile" />
        <meta
          property="og:description"
          content="Gestiona clientes, casos, solicitudes y citas desde un solo lugar con LegalUp Pro. Plataforma para abogados en Chile con herramientas de IA integradas."
        />
        <meta property="og:url" content="https://legalup.cl/pro" />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* Minimal header for /pro */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <Scale className="h-7 w-7 text-green-900" />
            <span className="text-lg font-bold text-green-900">LegalUp</span>
            <span className="rounded-[5px] border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-px text-[0.6rem] font-semibold tracking-[0.14em] text-emerald-700">PRO</span>
          </button>
          <nav className="hidden items-center gap-6 md:flex">
            <button onClick={() => scrollToId("como-funciona")} className="text-sm text-gray-600 hover:text-gray-900">Cómo funciona</button>
            <button onClick={() => scrollToId("funcionalidades")} className="text-sm text-gray-600 hover:text-gray-900">Funcionalidades</button>
            <button onClick={() => scrollToId("pricing")} className="text-sm text-gray-600 hover:text-gray-900">Precio</button>
            <button onClick={() => scrollToId("faq")} className="text-sm text-gray-600 hover:text-gray-900">Preguntas</button>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            {!user ? (
              <>
                <Button variant="ghost" onClick={() => { setAuthMode("login"); setAuthOpen(true); }} className="text-gray-600">
                  Iniciar sesión
                </Button>
                <Button onClick={() => handleCTAClick("header")} className="bg-gray-900 hover:bg-green-900">
                  Comenzar con LegalUp Pro
                </Button>
              </>
            ) : userRole === "client" ? (
              <Button onClick={() => handleCTAClick("header")} className="bg-gray-900 hover:bg-green-900">
                Buscar abogado
              </Button>
            ) : pro.hasProAccess ? (
              <Button onClick={() => navigate("/lawyer/dashboard")} className="bg-gray-900 hover:bg-green-900">Ir al dashboard</Button>
            ) : userRole === "lawyer" ? (
              <Button onClick={() => setPricingOpen(true)} className="bg-gray-900 hover:bg-green-900">Activar Pro</Button>
            ) : (
              <Button onClick={() => navigate("/")} variant="outline">Volver a LegalUp</Button>
            )}
          </div>
          <button onClick={() => setMobileMenuOpen((v) => !v)} className="md:hidden p-2" aria-label="Menu">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-gray-200 bg-white px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <button onClick={() => scrollToId("como-funciona")} className="text-left text-sm text-gray-700 py-2">Cómo funciona</button>
              <button onClick={() => scrollToId("funcionalidades")} className="text-left text-sm text-gray-700 py-2">Funcionalidades</button>
              <button onClick={() => scrollToId("pricing")} className="text-left text-sm text-gray-700 py-2">Precio</button>
              <button onClick={() => scrollToId("faq")} className="text-left text-sm text-gray-700 py-2">Preguntas</button>
              <div className="pt-2 flex flex-col gap-2">
                {!user ? (
                  <>
                    <Button variant="outline" onClick={() => { setAuthMode("login"); setAuthOpen(true); setMobileMenuOpen(false); }}>Iniciar sesión</Button>
                    <Button onClick={() => handleCTAClick("header_mobile")} className="bg-gray-900 hover:bg-green-900">Comenzar con LegalUp Pro</Button>
                  </>
                ) : userRole === "client" ? (
                  <Button onClick={() => handleCTAClick("header_mobile")} className="bg-gray-900 hover:bg-green-900">Buscar abogado</Button>
                ) : pro.hasProAccess ? (
                  <Button onClick={() => { setMobileMenuOpen(false); navigate("/lawyer/dashboard"); }} className="bg-gray-900 hover:bg-green-900">Ir al dashboard</Button>
                ) : userRole === "lawyer" ? (
                  <Button onClick={() => { setMobileMenuOpen(false); setPricingOpen(true); }} className="bg-gray-900 hover:bg-green-900">Activar Pro</Button>
                ) : (
                  <Button onClick={() => { setMobileMenuOpen(false); navigate("/"); }} variant="outline">Volver a LegalUp</Button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {userRole === "client" && (
        <section className="bg-blue-50 border-b border-blue-200">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-blue-900">LegalUp Pro es para abogados</h2>
            <p className="text-sm text-blue-700">Si necesitas asesoría legal, encuentra un abogado según tu necesidad en LegalUp — usa “Buscar abogado” en el menú superior.</p>
          </div>
        </section>
      )}

      {/* SECTION 1 — HERO */}
      <section className="border-b border-gray-100 bg-cream-900">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
              <Badge className="mb-4 bg-green-50 text-green-800 border-green-200 hover:bg-green-50">LegalUp Pro para abogados</Badge>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
              className="text-4xl font-bold tracking-tight text-gray-900 leading-[1.05] sm:text-6xl"
            >
              Gestiona tu práctica legal en un solo lugar.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
              className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-gray-600"
            >
              Clientes, casos, solicitudes y citas organizados en un workspace conectado, con IA integrada cuando el caso lo requiere.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
              className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Button size="lg" onClick={() => handleCTAClick("hero")} className="h-12 w-full px-8 text-base bg-gray-900 hover:bg-green-900 sm:w-auto">
                Comenzar con LegalUp Pro <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => scrollToId("como-funciona")} className="h-12 w-full px-8 text-base sm:w-auto">
                Ver cómo funciona
              </Button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-500"
            >
              <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 font-medium text-green-800">Founder $19.990/mes × 3 cobros</span>
              <span>Sin compromiso anual · Cancela cuando quieras</span>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 42, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.35, ease: EASE }}
            className="mx-auto mt-10 max-w-5xl sm:mt-14"
          >
            <ProWorkspacePreview />
            <p className="mt-3 text-center text-xs text-gray-400">Vista de la estructura real del workspace Pro (datos ilustrativos anonimizados).</p>
          </motion.div>
        </div>
      </section>

      {/* SECTION 2 — PROBLEM */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal className="mx-auto max-w-3xl text-center">
            <Eyebrow>El problema</Eyebrow>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Tu práctica repartida en demasiados lugares.</h2>
            <p className="mt-4 text-gray-600">Cada herramienta suelta suma fricción: la información vive en un lado, las citas en otro y el seguimiento en ninguno.</p>
          </Reveal>
          <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Clientes en WhatsApp", desc: "Conversaciones dispersas y sin trazabilidad." },
              { title: "Citas en calendarios separados", desc: "Doble agenda y choques de horario." },
              { title: "Casos sin centro", desc: "Archivos, mensajes e historial repartidos." },
              { title: "Solicitudes sin flujo", desc: "Oportunidades que se pierden sin un inbox claro." },
            ].map((item, i) => (
              <Reveal key={item.title} delay={(i % 4) * 0.08}>
                <Card className="h-full bg-white">
                  <CardContent className="p-6">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">{item.desc}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 — PRODUCT OVERVIEW */}
      <section id="como-funciona" className="border-b border-gray-100 bg-cream-900">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal className="mx-auto max-w-3xl text-center">
            <Eyebrow>Cómo funciona</Eyebrow>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Un workspace conectado, no cinco herramientas.</h2>
            <p className="mt-4 text-gray-600">Todo parte de las solicitudes y fluye hasta los ingresos, con la IA disponible a lo largo del recorrido.</p>
          </Reveal>
          <div className="mx-auto mt-10 flex max-w-5xl flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            {["Solicitudes", "Clientes", "Casos", "Agenda", "Ingresos"].map((step, i, arr) => (
              <div key={step} className="flex flex-1 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <Reveal delay={i * 0.09} className="flex-1">
                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center shadow-sm">
                    <div className="text-xs font-bold text-green-800">{String(i + 1).padStart(2, "0")}</div>
                    <div className="mt-0.5 text-sm font-semibold text-gray-900">{step}</div>
                  </div>
                </Reveal>
                {i < arr.length - 1 && (
                  <ArrowRight className="mx-auto h-4 w-4 shrink-0 rotate-90 text-gray-300 sm:rotate-0" />
                )}
              </div>
            ))}
          </div>
          <Reveal className="mx-auto mt-6 flex max-w-3xl items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3 text-center" delay={0.2}>
            <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
            <p className="text-sm text-gray-700"><span className="font-semibold">IA integrada</span> disponible en tus casos, a lo largo de todo el flujo.</p>
          </Reveal>
          <Reveal className="mt-8 text-center">
            <Button size="lg" onClick={() => handleCTAClick("overview")} className="bg-gray-900 hover:bg-green-900 h-12 px-8 text-base">
              Comenzar con LegalUp Pro <ArrowRight className="h-4 w-4" />
            </Button>
          </Reveal>
        </div>
      </section>

      {/* SECTION 4 — FEATURE SYSTEM */}
      <section id="funcionalidades" className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal className="mx-auto max-w-3xl text-center">
            <Eyebrow>Funcionalidades</Eyebrow>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Todo lo esencial de tu práctica.</h2>
            <p className="mt-4 text-gray-600">Seis módulos conectados que ya funcionan en producción.</p>
          </Reveal>
          <div className="mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m, i) => (
              <Reveal key={m.title} delay={(i % 3) * 0.08}>
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="p-6 sm:p-7">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700">
                      <m.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">{m.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-gray-600">{m.desc}</p>
                    <p className="mt-3 text-xs font-medium uppercase tracking-widest text-gray-400">Módulo {m.route}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 — AI SHOWCASE (dark band) */}
      <section className="border-b border-gray-800 bg-gray-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <Eyebrow dark>IA integrada</Eyebrow>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">IA integrada cuando la necesitas.</h2>
              <p className="mt-4 leading-relaxed text-gray-300">
                Gestiona el caso en LegalUp Pro y usa herramientas de IA dentro del mismo flujo: analiza documentos, conversa sobre tus casos e investiga normativa, sin salir de tu gestión.
              </p>
              <ul className="mt-6 space-y-3">
                {AI_CAPABILITIES.map((c) => (
                  <li key={c.title} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06]">
                      <c.icon className="h-4 w-4 text-emerald-400" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{c.title}</span>
                      <span className="block text-sm text-gray-400">{c.desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs leading-relaxed text-gray-500">Uso mensual incluido: 300 consultas IA, 40 análisis y 10 investigaciones. IA disponible en todos tus casos activos.</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={() => handleCTAClick("ai")} className="bg-white text-gray-900 hover:bg-gray-100 h-12 px-8 text-base">
                  Comenzar con LegalUp Pro <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/ai")} className="h-12 px-8 text-base bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white">
                  Conocer LegalUp AI
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl">
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-2 font-mono text-xs text-gray-500">caso · chat IA</span>
                </div>
                <div className="space-y-3 p-4 sm:p-6">
                  <div className="ml-auto w-fit max-w-[90%] rounded-xl rounded-br-sm bg-emerald-500/15 px-4 py-2.5 text-sm text-white">
                    ¿Qué plazos debo revisar en este contrato?
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
                    className="w-fit max-w-[95%] rounded-xl rounded-bl-sm border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-gray-200"
                  >
                    <p className="font-medium text-white">Encontré 3 plazos relevantes:</p>
                    <ul className="mt-2 space-y-1.5 text-gray-300">
                      {["Renovación — 30 días de aviso", "Entrega — fecha y condiciones", "Garantía — devolución en 30 días"].map((t) => (
                        <li key={t} className="flex gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 font-mono text-[0.65rem] text-gray-500">Fuente: contrato.pdf · análisis del caso</p>
                  </motion.div>
                  <p className="text-[0.65rem] text-gray-600">Ejemplo ilustrativo de la interfaz</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* SECTION 6 — BENEFITS */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal className="mx-auto max-w-3xl text-center">
            <Eyebrow>Beneficios</Eyebrow>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Menos herramientas sueltas, más contexto.</h2>
          </Reveal>
          <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Un solo lugar de trabajo", desc: "Clientes, casos, citas e ingresos conectados en vez de cinco apps." },
              { title: "Seguimiento ordenado", desc: "Cada solicitud y caso conserva su historial y estado." },
              { title: "Agenda conectada", desc: "Tus citas viven junto a los casos que las originan." },
              { title: "Contexto siempre a mano", desc: "La información del cliente y del caso, accesible sin buscar." },
              { title: "IA dentro del flujo", desc: "Análisis y respuestas donde ya trabajas, no en otra pestaña." },
              { title: "Datos separados", desc: "Tu información es solo tuya: separada por abogado y por cuenta." },
            ].map((b, i) => (
              <Reveal key={b.title} delay={(i % 3) * 0.08}>
                <div className="flex h-full gap-3 rounded-2xl border border-gray-200 bg-white p-5">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
                  <div>
                    <h3 className="text-sm font-semibold">{b.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">{b.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7 — COMPARISON */}
      <section className="border-b border-gray-100 bg-cream-900">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal className="mx-auto max-w-3xl text-center">
            <Eyebrow>Comparativa</Eyebrow>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Pro frente a la gestión dispersa.</h2>
          </Reveal>
          {/* Desktop table */}
          <Reveal className="mt-10 hidden overflow-hidden rounded-2xl border border-gray-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-widest text-gray-400">
                  <th scope="col" className="px-6 py-4 font-semibold"><span className="sr-only">Aspecto</span></th>
                  <th scope="col" className="px-6 py-4 font-semibold text-green-800">LegalUp Pro</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Gestión dispersa</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((r) => (
                  <tr key={r.label} className="border-b border-gray-50 last:border-0">
                    <th scope="row" className="px-6 py-4 font-semibold text-gray-900">{r.label}</th>
                    <td className="px-6 py-4 text-gray-700">
                      <span className="inline-flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />{r.pro}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{r.other}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
          {/* Mobile cards */}
          <div className="mt-8 grid gap-3 md:hidden">
            {COMPARISON_ROWS.map((r, i) => (
              <Reveal key={r.label} delay={i * 0.05}>
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h3 className="text-sm font-semibold text-gray-900">{r.label}</h3>
                  <p className="mt-2 flex items-start gap-2 text-sm text-gray-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                    <span><span className="font-medium text-green-800">Pro:</span> {r.pro}</span>
                  </p>
                  <p className="mt-1 pl-6 text-sm text-gray-500">{r.other}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8 — HOW IT WORKS */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal className="mx-auto max-w-3xl text-center">
            <Eyebrow>Cómo empezar</Eyebrow>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Empieza en cuatro pasos.</h2>
          </Reveal>
          <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", title: "Crea tu cuenta", desc: "Regístrate como abogado y configura tu perfil profesional." },
              { n: "02", title: "Organiza tu práctica", desc: "Centraliza clientes, casos y solicitudes en tu workspace." },
              { n: "03", title: "Gestiona el día a día", desc: "Agenda, servicios e ingresos desde un solo lugar." },
              { n: "04", title: "Usa IA en tus casos", desc: "Analiza documentos y conversa sobre cada caso cuando lo necesites." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 0.09}>
                <div className="h-full rounded-2xl border border-gray-200 bg-white p-6">
                  <div className="text-sm font-bold text-green-700">{s.n}</div>
                  <h3 className="mt-2 font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-8 text-center">
            <Button size="lg" onClick={() => handleCTAClick("how")} className="bg-gray-900 hover:bg-green-900 h-12 px-8 text-base">
              Comenzar con LegalUp Pro <ArrowRight className="h-4 w-4" />
            </Button>
          </Reveal>
        </div>
      </section>

      {/* SECTION 9 — PRICING / FOUNDER */}
      <section id="pricing" className="border-b border-gray-100 bg-cream-900">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal className="mx-auto max-w-3xl text-center">
            <Eyebrow>Precio</Eyebrow>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Un precio simple.</h2>
            <p className="mt-4 text-gray-600">Empieza con LegalUp Pro y accede a las mejoras que sigamos sumando.</p>
          </Reveal>
          <Reveal className="mx-auto mt-10 max-w-md">
            <Card className="overflow-hidden border-green-200 shadow-lg">
              <div className="bg-gradient-to-br from-green-50 to-white p-6 sm:p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold">LegalUp Pro</h3>
                    <p className="text-sm text-gray-500">Para abogados independientes y estudios boutique</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-200">Founder</Badge>
                </div>
                <div className="mt-6">
                  <div className="text-4xl font-bold">$19.990<span className="text-base font-medium text-gray-500">/mes</span></div>
                  <div className="text-sm font-medium text-green-700">durante tus primeros 3 cobros</div>
                  <p className="mt-2 text-xs text-gray-500">$19.990/mes durante tus primeros 3 cobros. Desde el cuarto cobro, $49.990/mes.</p>
                  <p className="mt-1 text-xs text-gray-500">Después de los 15 cupos Founder, Pro cuesta $49.990/mes. El badge Founder queda permanentemente en tu perfil.</p>
                </div>
                <ul className="mt-6 space-y-2 text-sm">
                  {["Solicitudes", "Clientes", "Casos", "Citas", "Servicios", "Ingresos", "LegalUp AI integrado", "Acceso a futuras mejoras de Pro"].map((perk) => (
                    <li key={perk} className="flex gap-2"><Check className="h-4 w-4 text-green-600 mt-0.5" /> {perk}</li>
                  ))}
                </ul>
                <Button onClick={() => handleCTAClick("pricing")} className="mt-6 w-full bg-gray-900 hover:bg-green-900 h-11 text-base">
                  Activar LegalUp Pro <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="mt-3 text-center text-xs text-gray-500">Incluye LegalUp AI integrado: análisis de documentos y chat sobre tus casos.</p>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* SECTION 10 — FAQ */}
      <section id="faq" className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
          <Reveal className="text-center">
            <Eyebrow>Preguntas frecuentes</Eyebrow>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Preguntas frecuentes</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <Accordion type="single" collapsible className="mt-8 bg-white rounded-xl border px-4">
              {FAQS.map((f, i) => (
                <AccordionItem key={f.q} value={`q${i + 1}`}>
                  <AccordionTrigger>{f.q}</AccordionTrigger>
                  <AccordionContent className="text-gray-600">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* SECTION 11 — FINAL CTA */}
      <section className="border-b border-gray-100 bg-cream-900">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Centraliza tu práctica con LegalUp Pro.</h2>
              <p className="mt-4 text-gray-600">Únete a los primeros abogados que están organizando su trabajo de una nueva forma.</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-800">
                $19.990/mes durante tus primeros 3 cobros · Badge Founder a los primeros 15 en contratar
              </div>
              <div className="mt-6 flex justify-center">
                <Button size="lg" onClick={() => handleCTAClick("final")} className="bg-gray-900 hover:bg-green-900 h-12 px-8 text-base">
                  Comenzar con LegalUp Pro <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-3 text-xs text-gray-500">Incluye LegalUp AI integrado: análisis de documentos y chat sobre tus casos.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Minimal footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-green-900" />
            <span className="font-bold text-green-900">LegalUp Pro</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <button onClick={() => scrollToId("como-funciona")} className="hover:text-gray-900">Cómo funciona</button>
            <button onClick={() => scrollToId("pricing")} className="hover:text-gray-900">Precio</button>
            <button onClick={() => navigate("/contacto")} className="hover:text-gray-900">Contacto</button>
          </div>
        </div>
      </footer>

      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        initialMode={authMode}
        source="proLanding"
      />
      <ProPricingModal
        open={pricingOpen}
        onOpenChange={setPricingOpen}
        triggerAction="pro_landing"
      />
    </div>
  );
}
