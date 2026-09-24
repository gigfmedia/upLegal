import { useEffect, useState, useRef, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Scale, ArrowRight, Check, Inbox, Users, Briefcase, Calendar, DollarSign, Sparkles, Shield, ChevronDown, Menu, X, Search, Clock, MessageSquare, FileText, ArrowDown } from "lucide-react";
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

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Reveal con respeto a prefers-reduced-motion (sin animación si el usuario lo pide).
function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
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

// Fragmento flotante suave (solo si no hay reduced-motion).
function Float({ children, delay = 0, amount = 8, duration = 6, className }: { children: ReactNode; delay?: number; amount?: number; duration?: number; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      animate={{ y: [0, -amount, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
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

// ---------------------------------------------------------------------------
// Fragmentos de UI real del producto (estructura de la interfaz, datos
// ilustrativos anonimizados). Son el material visual principal de la página.
// ---------------------------------------------------------------------------

function BrowserChrome({ url, dark = false, right }: { url: string; dark?: boolean; right?: ReactNode }) {
  return (
    <div className={`flex items-center gap-2 border-b px-4 py-3 ${dark ? "border-white/10" : "border-gray-100 bg-gray-50"}`}>
      <div className={`h-2.5 w-2.5 rounded-full ${dark ? "bg-white/20" : "bg-gray-300"}`} />
      <div className={`h-2.5 w-2.5 rounded-full ${dark ? "bg-white/20" : "bg-gray-300"}`} />
      <div className="h-2.5 w-2.5 rounded-full bg-green-600" />
      <span className={`ml-2 font-mono text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>{url}</span>
      {right && <span className="ml-auto">{right}</span>}
    </div>
  );
}

function AgendaFragment() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Agenda de hoy</span>
        <Calendar className="h-4 w-4 text-green-700" />
      </div>
      <div className="mt-3 space-y-2">
        {[
          { time: "10:00", name: "Reunión de seguimiento", tag: "Caso activo" },
          { time: "15:30", name: "Primera consulta", tag: "Solicitud" },
        ].map((a) => (
          <div key={a.time} className="rounded-lg border border-gray-100 px-3 py-2">
            <div className="text-sm font-medium text-gray-900">{a.time} · {a.name}</div>
            <div className="text-xs text-gray-500">{a.tag}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CaseFragment() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
      <div className="flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-green-700" />
        <span className="text-sm font-semibold text-gray-900">Caso · <span className="font-normal text-gray-500">expediente al día</span></span>
      </div>
      <div className="mt-3 space-y-1.5">
        {["Demanda presentada", "Documentos 4/4", "Próxima audiencia"].map((t) => (
          <div key={t} className="flex items-center gap-2 text-xs text-gray-700">
            <Check className="h-3.5 w-3.5 shrink-0 text-green-700" />
            <span>{t}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full w-3/4 rounded-full bg-green-600" />
      </div>
    </div>
  );
}

function AIChatFragment() {
  return (
    <div className="rounded-2xl border border-emerald-500/25 bg-white p-4 shadow-xl">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-emerald-600" />
        <span className="text-xs font-semibold text-gray-900">IA dentro del caso</span>
      </div>
      <div className="mt-3 space-y-2 text-xs">
        <div className="ml-auto w-fit max-w-[90%] rounded-lg rounded-br-sm bg-gray-900 px-3 py-2 text-white">
          ¿Qué plazos debo revisar aquí?
        </div>
        <div className="w-fit max-w-[95%] rounded-lg rounded-bl-sm border border-gray-100 bg-emerald-500/[0.06] px-3 py-2 text-gray-700">
          Encontré 3 plazos con fechas y obligaciones…
        </div>
      </div>
    </div>
  );
}

function InboxFragment() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
      <div className="flex items-center gap-2">
        <Inbox className="h-4 w-4 text-green-700" />
        <span className="text-sm font-semibold text-gray-900">Solicitudes</span>
        <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-[0.65rem] font-bold text-green-800">3 nuevas</span>
      </div>
      <div className="mt-3 space-y-2">
        {["Consulta · arriendo", "Defensa · causa civil"].map((t) => (
          <div key={t} className="rounded-lg border border-gray-100 px-3 py-2 text-xs font-medium text-gray-800">{t}</div>
        ))}
      </div>
    </div>
  );
}

function EarningsFragment() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Ingresos del mes</span>
        <DollarSign className="h-4 w-4 text-green-700" />
      </div>
      <div className="mt-2 text-2xl font-bold text-gray-900">$2.450.000</div>
      <div className="mt-2 flex h-10 items-end gap-1.5">
        {[35, 55, 42, 70, 58, 88, 100].map((h, i) => (
          <div key={i} className={`flex-1 rounded-sm ${i === 6 ? "bg-green-600" : "bg-green-100"}`} style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

// Composición hero: dashboard central grande + fragmentos superpuestos.
function HeroComposition() {
  return (
    <div className="relative mx-auto mt-12 max-w-6xl sm:mt-16">
      <motion.div
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, delay: 0.3, ease: EASE }}
        className="relative z-10 mx-auto max-w-5xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
      >
        <BrowserChrome
          url="legalup.cl/lawyer/dashboard"
          right={
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-medium text-emerald-700 sm:inline-flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600" />
              </span>
              Espacio Pro activo
            </span>
          }
        />
        <div className="grid gap-3 bg-cream-900 p-4 sm:grid-cols-4 sm:p-6">
          {[
            { label: "Solicitudes", icon: Inbox, value: "3" },
            { label: "Casos activos", icon: Briefcase, value: "6" },
            { label: "Citas hoy", icon: Calendar, value: "2" },
            { label: "Ingresos del mes", icon: DollarSign, value: "$2.450.000" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">{kpi.label}</span>
                <kpi.icon className="h-4 w-4 text-gray-400" />
              </div>
              <div className="mt-2 text-lg font-bold text-gray-900">{kpi.value}</div>
            </div>
          ))}
        </div>
        <div className="hidden items-center gap-1 overflow-x-auto border-t border-gray-100 px-4 py-3 sm:flex sm:px-6">
          {["Solicitudes", "Clientes", "Casos", "Agenda", "Ingresos"].map((s, i, arr) => (
            <span key={s} className="flex items-center gap-1 text-xs font-medium text-gray-500">
              {s}
              {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-gray-300" />}
            </span>
          ))}
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-700">
            <Sparkles className="h-3 w-3" /> IA en el flujo
          </span>
        </div>
      </motion.div>
      {/* Fragmentos asomando detrás del panel: profundidad sin tapar contenido */}
      <div className="pointer-events-none absolute -top-10 left-4 z-0 hidden w-52 -rotate-3 sm:w-56 lg:block" aria-hidden="true">
        <Float amount={10} duration={7}><AgendaFragment /></Float>
      </div>
      <div className="pointer-events-none absolute -top-14 right-4 z-0 hidden w-56 rotate-2 sm:w-60 lg:block" aria-hidden="true">
        <Float amount={8} duration={6} delay={1}><AIChatFragment /></Float>
      </div>
    </div>
  );
}

const STORIES = [
  {
    id: "clientes-casos",
    eyebrow: "Clientes + Casos",
    title: "Cada cliente con su historia. Cada caso con su trabajo.",
    desc: "La información del cliente y el avance de sus casos viven juntos: historial, documentos y estado, sin buscar entre chats y carpetas.",
    bullets: ["Ficha y historial por cliente", "Casos vinculados con su avance", "Documentos asociados al caso"],
    mock: <CaseFragment />,
    align: "left" as const,
  },
  {
    id: "solicitudes-agenda",
    eyebrow: "Solicitudes + Agenda",
    title: "De la solicitud a la cita sin perder nada.",
    desc: "Las nuevas solicitudes llegan a un inbox centralizado y las citas quedan conectadas al trabajo que las origina.",
    bullets: ["Inbox centralizado de solicitudes", "Agenda con citas vinculadas", "Seguimiento sin doble agenda"],
    mock: <InboxFragment />,
    align: "right" as const,
  },
  {
    id: "servicios-ingresos",
    eyebrow: "Servicios + Ingresos",
    title: "Lo que ofreces y lo que ganas, a la vista.",
    desc: "Administra tus servicios y consulta los ingresos de tu actividad en la plataforma desde el mismo workspace.",
    bullets: ["Catálogo de servicios", "Ingresos del período", "Visión mensual de actividad"],
    mock: <EarningsFragment />,
    align: "left" as const,
  },
];

const AI_CAPABILITIES = [
  { icon: FileText, title: "Análisis de documentos", desc: "Estructura, puntos clave y riesgos dentro del caso." },
  { icon: MessageSquare, title: "Chat del caso", desc: "Preguntas sobre el contenido de tus casos y documentos." },
  { icon: Search, title: "Investigación", desc: "Jurisprudencia y normativa chilena con fuentes verificables." },
  { icon: Clock, title: "Uso mensual incluido", desc: "300 consultas, 40 análisis y 10 investigaciones al mes." },
];

const FAQS = [
  { q: "¿Qué es LegalUp Pro?", a: "Es el espacio de trabajo para abogados dentro de LegalUp: solicitudes, clientes, casos, citas e ingresos en un solo lugar, con IA integrada en tus casos." },
  { q: "¿Para quién es?", a: "Para abogados, estudios jurídicos y equipos legales que gestionan su práctica y quieren centralizarla sin depender de planillas, mensajes y herramientas separadas." },
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
    <div className="min-h-screen overflow-x-clip bg-white text-gray-900 antialiased">
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

      {/* Header premium para /pro */}
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <Scale className="h-7 w-7 text-green-900" />
            <span className="text-lg font-bold text-green-900">LegalUp</span>
            <span className="rounded-[5px] border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-px text-[0.6rem] font-semibold tracking-[0.14em] text-emerald-700">PRO</span>
          </button>
          <nav className="hidden items-center gap-7 md:flex">
            <button onClick={() => scrollToId("producto")} className="text-sm font-medium text-gray-600 hover:text-gray-900">Producto</button>
            <button onClick={() => scrollToId("ia")} className="text-sm font-medium text-gray-600 hover:text-gray-900">IA</button>
            <button onClick={() => scrollToId("pricing")} className="text-sm font-medium text-gray-600 hover:text-gray-900">Precio</button>
            <button onClick={() => scrollToId("faq")} className="text-sm font-medium text-gray-600 hover:text-gray-900">Preguntas</button>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            {!user ? (
              <>
                <Button variant="ghost" onClick={() => { setAuthMode("login"); setAuthOpen(true); }} className="text-gray-600">
                  Iniciar sesión
                </Button>
                <Button onClick={() => handleCTAClick("header")} className="bg-gray-900 shadow-sm hover:bg-green-900">
                  Comenzar con LegalUp Pro
                </Button>
              </>
            ) : userRole === "client" ? (
              <Button onClick={() => handleCTAClick("header")} className="bg-gray-900 shadow-sm hover:bg-green-900">
                Buscar abogado
              </Button>
            ) : pro.hasProAccess ? (
              <Button onClick={() => navigate("/lawyer/dashboard")} className="bg-gray-900 shadow-sm hover:bg-green-900">Ir al dashboard</Button>
            ) : userRole === "lawyer" ? (
              <Button onClick={() => setPricingOpen(true)} className="bg-gray-900 shadow-sm hover:bg-green-900">Activar Pro</Button>
            ) : (
              <Button onClick={() => navigate("/")} variant="outline">Volver a LegalUp</Button>
            )}
          </div>
          <button onClick={() => setMobileMenuOpen((v) => !v)} className="p-2 md:hidden" aria-label="Menu">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-gray-200 bg-white px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <button onClick={() => scrollToId("producto")} className="py-2 text-left text-sm text-gray-700">Producto</button>
              <button onClick={() => scrollToId("ia")} className="py-2 text-left text-sm text-gray-700">IA</button>
              <button onClick={() => scrollToId("pricing")} className="py-2 text-left text-sm text-gray-700">Precio</button>
              <button onClick={() => scrollToId("faq")} className="py-2 text-left text-sm text-gray-700">Preguntas</button>
              <div className="flex flex-col gap-2 pt-2">
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
        <section className="border-b border-blue-200 bg-blue-50">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-blue-900">LegalUp Pro es para abogados</h2>
            <p className="text-sm text-blue-700">Si necesitas asesoría legal, encuentra un abogado según tu necesidad en LegalUp — usa “Buscar abogado” en el menú superior.</p>
          </div>
        </section>
      )}

      {/* HERO — el producto es el protagonista */}
      <section className="relative overflow-hidden border-b border-gray-100 bg-gradient-to-b from-green-50/70 via-white to-white">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-16 lg:pt-20">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
              <Badge className="mb-5 border-green-200 bg-green-50 text-green-800 hover:bg-green-50">LegalUp Pro · para abogados y equipos legales</Badge>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.1, ease: EASE }}
              className="text-5xl font-bold leading-[1.02] tracking-tight text-gray-900 sm:text-7xl"
            >
              Gestiona tu práctica legal en un solo lugar.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
              className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-gray-600"
            >
              Clientes, casos, solicitudes y citas en un workspace conectado, con IA integrada cuando el caso lo requiere.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Button size="lg" onClick={() => handleCTAClick("hero")} className="h-12 w-full bg-gray-900 px-8 text-base shadow-lg hover:bg-green-900 sm:w-auto sm:px-10 sm:text-lg">
                Comenzar con LegalUp Pro <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => scrollToId("producto")} className="h-12 w-full px-8 text-base sm:w-auto">
                Ver el producto
              </Button>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="mt-4 text-xs text-gray-500"
            >
              Founder $19.990/mes × 3 cobros · Sin compromiso anual
            </motion.p>
          </div>
          <HeroComposition />
          <p className="mt-8 text-center text-xs text-gray-400">Vista de la estructura real del workspace Pro (datos ilustrativos anonimizados).</p>
        </div>
      </section>

      {/* PROBLEMA — composición asimétrica con fragmentos dispersos */}
      <section className="overflow-hidden border-b border-gray-100 bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-6">
          <Reveal>
            <Eyebrow>El problema</Eyebrow>
            <h2 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              Tu práctica repartida en demasiados lugares.
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-gray-600">
              Cada herramienta suelta suma fricción: la información vive en un lado, las citas en otro y el seguimiento, en ninguno.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white">
              LegalUp Pro lo reúne <ArrowDown className="h-4 w-4" />
            </div>
          </Reveal>
          <div className="relative mx-auto grid w-full max-w-md grid-cols-2 gap-3 lg:max-w-none" aria-hidden="true">
            {[
              { icon: MessageSquare, title: "WhatsApp", desc: "Clientes sin trazabilidad", cls: "-rotate-2" },
              { icon: Calendar, title: "Otro calendario", desc: "Doble agenda", cls: "rotate-1 translate-y-4" },
              { icon: FileText, title: "Archivos sueltos", desc: "Casos sin centro", cls: "rotate-2" },
              { icon: Inbox, title: "Bandeja llena", desc: "Solicitudes perdidas", cls: "-rotate-1 translate-y-4" },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24, rotate: 0 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
                className={`rounded-2xl border border-dashed border-gray-300 bg-gray-50/70 p-4 ${f.cls}`}
              >
                <f.icon className="h-5 w-5 text-gray-400" />
                <div className="mt-2 text-sm font-semibold text-gray-500 line-through decoration-gray-300">{f.title}</div>
                <div className="text-xs text-gray-400">{f.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WORKSPACE — momento visual mayor con conector animado */}
      <section id="producto" className="overflow-hidden border-b border-gray-100 bg-gray-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <Reveal className="max-w-3xl">
            <Eyebrow dark>El workspace</Eyebrow>
            <h2 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              Un flujo conectado, no cinco herramientas.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-400">
              Todo parte de las solicitudes y avanza hasta los ingresos. Cada etapa alimenta a la siguiente.
            </p>
          </Reveal>
          <div className="relative mt-12">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1.4, ease: EASE }}
              className="absolute left-0 right-0 top-7 hidden h-0.5 origin-left bg-gradient-to-r from-emerald-500/60 via-emerald-500/30 to-transparent lg:block"
              aria-hidden="true"
            />
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
              {[
                { n: "01", icon: Inbox, title: "Solicitudes", desc: "Inbox centralizado que no deja escapar oportunidades." },
                { n: "02", icon: Users, title: "Clientes", desc: "Ficha e historial de cada cliente en un lugar." },
                { n: "03", icon: Briefcase, title: "Casos", desc: "Asuntos con su trabajo y documentos asociados." },
                { n: "04", icon: Calendar, title: "Agenda", desc: "Citas conectadas a los casos que las originan." },
                { n: "05", icon: DollarSign, title: "Ingresos", desc: "La actividad de tu práctica, a la vista." },
              ].map((s, i) => (
                <Reveal key={s.n} delay={i * 0.1}>
                  <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-emerald-400">{s.n}</span>
                      <s.icon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-gray-400">{s.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] px-6 py-5 sm:flex-row" delay={0.15}>
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 shrink-0 text-emerald-400" />
              <p className="text-sm text-gray-200 sm:text-base"><span className="font-semibold text-white">IA como capa transversal:</span> disponible en tus casos a lo largo de todo el flujo, no aislada.</p>
            </div>
            <Button onClick={() => handleCTAClick("overview")} className="shrink-0 bg-white text-gray-900 hover:bg-gray-100">
              Comenzar con LegalUp Pro <ArrowRight className="h-4 w-4" />
            </Button>
          </Reveal>
        </div>
      </section>

      {/* HISTORIAS DE PRODUCTO — 3 composiciones alternadas */}
      <section id="funcionalidades" className="overflow-hidden border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <Reveal className="max-w-3xl">
            <Eyebrow>Funcionalidades</Eyebrow>
            <h2 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              El producto explica mejor que los párrafos.
            </h2>
          </Reveal>
          <div className="mt-14 space-y-16 sm:space-y-24">
            {STORIES.map((s) => (
              <div key={s.id} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                <Reveal className={s.align === "right" ? "lg:order-2" : ""}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">{s.eyebrow}</p>
                  <h3 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{s.title}</h3>
                  <p className="mt-4 max-w-md text-lg leading-relaxed text-gray-600">{s.desc}</p>
                  <ul className="mt-6 space-y-2.5">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-gray-700">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </Reveal>
                <Reveal delay={0.12} className={s.align === "right" ? "lg:order-1" : ""}>
                  <div className="relative">
                    <div className="absolute -inset-3 rounded-3xl bg-green-50/60" aria-hidden="true" />
                    <div className="relative">{s.mock}</div>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
          {/* Índice compacto de módulos */}
          <Reveal className="mt-16 border-t border-gray-100 pt-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-semibold uppercase tracking-widest text-gray-400">También incluido:</span>
              {["Clientes", "Casos", "Solicitudes", "Agenda", "Servicios", "Ingresos"].map((m) => (
                <span key={m} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">{m}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* IA — interrupción visual inmersiva */}
      <section id="ia" className="relative overflow-hidden border-b border-gray-800 bg-gray-950 text-white">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] max-w-none -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <Reveal>
              <Eyebrow dark>IA integrada</Eyebrow>
              <h2 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
                IA integrada cuando la necesitas.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-gray-300">
                Gestiona el caso en LegalUp Pro y usa IA dentro del mismo flujo: analiza documentos, conversa sobre tus casos e investiga normativa, sin salir de tu gestión.
              </p>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {AI_CAPABILITIES.map((c) => (
                  <li key={c.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <c.icon className="h-5 w-5 text-emerald-400" />
                    <div className="mt-2 text-sm font-semibold">{c.title}</div>
                    <div className="mt-1 text-sm leading-relaxed text-gray-400">{c.desc}</div>
                  </li>
                ))}
              </ul>
              <p className="mt-5 font-mono text-xs tracking-wide text-gray-500">300 CONSULTAS · 40 ANÁLISIS · 10 INVESTIGACIONES / MES</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={() => handleCTAClick("ai")} className="h-12 bg-white px-8 text-base text-gray-900 hover:bg-gray-100">
                  Comenzar con LegalUp Pro <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/ai")} className="h-12 border-white/20 bg-transparent px-8 text-base text-white hover:bg-white/10 hover:text-white">
                  Conocer LegalUp AI
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-xl">
                <BrowserChrome url="caso · chat IA" dark />
                <div className="space-y-3 p-4 sm:p-6">
                  <div className="ml-auto w-fit max-w-[90%] rounded-xl rounded-br-sm bg-emerald-500/15 px-4 py-2.5 text-sm text-white">
                    ¿Qué plazos debo revisar en este contrato?
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4, ease: EASE }}
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
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3">
                    <span className="flex-1 text-sm text-gray-600">Pregunta sobre este documento…</span>
                    <ArrowRight className="h-4 w-4 text-emerald-400" />
                  </div>
                  <p className="text-[0.65rem] text-gray-600">Ejemplo ilustrativo de la interfaz</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* BENEFICIOS — declaraciones editoriales, sin cards */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <Reveal>
            <Eyebrow>Beneficios</Eyebrow>
          </Reveal>
          <div className="mt-6 divide-y divide-gray-100 border-y border-gray-100">
            {[
              { big: "Todo en contexto.", small: "Clientes, casos y citas dejan de vivir separados." },
              { big: "Menos administración.", small: "La información necesaria para trabajar está en el mismo workspace." },
              { big: "De la solicitud al caso.", small: "El trabajo sigue un flujo claro dentro de Pro." },
            ].map((b, i) => (
              <Reveal key={b.big} delay={i * 0.06}>
                <div className="grid gap-1 py-8 sm:grid-cols-[1fr_1fr] sm:items-baseline sm:gap-8 sm:py-10">
                  <h3 className="text-3xl font-bold tracking-tight sm:text-5xl">{b.big}</h3>
                  <p className="text-lg leading-relaxed text-gray-600">{b.small}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO EMPEZAR — timeline vertical */}
      <section className="border-b border-gray-100 bg-cream-900">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
          <Reveal className="text-center sm:text-left">
            <Eyebrow>Cómo empezar</Eyebrow>
            <h2 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              Empieza en cuatro pasos.
            </h2>
          </Reveal>
          <div className="relative mt-12">
            <div className="absolute bottom-4 left-[27px] top-4 w-px bg-gray-200 sm:left-[35px]" aria-hidden="true" />
            <div className="space-y-8">
              {[
                { n: "01", title: "Crea tu cuenta", desc: "Regístrate como abogado y configura tu perfil profesional." },
                { n: "02", title: "Organiza tu práctica", desc: "Centraliza clientes, casos y solicitudes en tu workspace." },
                { n: "03", title: "Gestiona el día a día", desc: "Agenda, servicios e ingresos desde un solo lugar." },
                { n: "04", title: "Usa IA en tus casos", desc: "Analiza documentos y conversa sobre cada caso cuando lo necesites." },
              ].map((s, i) => (
                <Reveal key={s.n} delay={i * 0.07}>
                  <div className="relative flex gap-5 sm:gap-8">
                    <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white font-mono text-sm font-bold text-green-800 shadow-sm sm:h-[72px] sm:w-[72px] sm:text-base">
                      {s.n}
                    </div>
                    <div className="pt-1 sm:pt-2">
                      <h3 className="text-xl font-semibold sm:text-2xl">{s.title}</h3>
                      <p className="mt-1 max-w-xl leading-relaxed text-gray-600">{s.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal className="mt-12 text-center sm:text-left">
            <Button size="lg" onClick={() => handleCTAClick("how")} className="h-12 bg-gray-900 px-8 text-base hover:bg-green-900">
              Comenzar con LegalUp Pro <ArrowRight className="h-4 w-4" />
            </Button>
          </Reveal>
        </div>
      </section>

      {/* PRECIO — momento de conversión mayor */}
      <section id="pricing" className="border-b border-gray-100 bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <Eyebrow>Precio</Eyebrow>
            <h2 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              Un precio simple para empezar hoy.
            </h2>
            <div className="mt-6 flex items-end gap-2">
              <span className="text-7xl font-bold tracking-tight text-gray-900 sm:text-8xl">$19.990</span>
              <span className="pb-2 text-lg font-medium text-gray-500">/mes</span>
            </div>
            <p className="mt-3 font-medium text-green-700">Durante tus primeros 3 cobros · Badge Founder a los primeros 15</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-500">
              Desde el cuarto cobro, $49.990/mes. Después de los 15 cupos Founder, Pro cuesta $49.990/mes. El badge Founder queda permanentemente en tu perfil.
            </p>
            <ul className="mt-6 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {["Solicitudes", "Clientes", "Casos", "Citas", "Servicios", "Ingresos", "LegalUp AI integrado"].map((perk) => (
                <li key={perk} className="flex gap-2 text-gray-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />{perk}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.12}>
            <Card className="overflow-hidden border-green-200 shadow-xl">
              <div className="bg-gradient-to-br from-green-50 to-white p-6 sm:p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold">LegalUp Pro</h3>
                    <p className="text-sm text-gray-500">Para abogados y estudios jurídicos</p>
                  </div>
                  <Badge className="border-green-200 bg-green-100 text-green-800">Founder</Badge>
                </div>
                <div className="mt-6">
                  <div className="text-4xl font-bold">$19.990<span className="text-base font-medium text-gray-500">/mes</span></div>
                  <div className="text-sm font-medium text-green-700">durante tus primeros 3 cobros</div>
                </div>
                <Button onClick={() => handleCTAClick("pricing")} className="mt-6 h-12 w-full bg-gray-900 text-base hover:bg-green-900">
                  Activar LegalUp Pro <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="mt-3 text-center text-xs text-gray-500">Sin compromiso anual. Cancela cuando quieras según condiciones vigentes.</p>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* FAQ — contenida */}
      <section id="faq" className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal className="text-center">
            <Eyebrow>Preguntas frecuentes</Eyebrow>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Preguntas frecuentes</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <Accordion type="single" collapsible className="mt-8 rounded-xl border bg-white px-4">
              {FAQS.map((f, i) => (
                <AccordionItem key={f.q} value={`q${i + 1}`} className="border-gray-100 data-[state=open]:bg-green-50/40">
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-gray-600">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* CTA FINAL — verde profundo memorable */}
      <section className="relative overflow-hidden bg-green-950 text-white">
        <div className="pointer-events-none absolute -bottom-48 left-1/2 h-96 w-[52rem] max-w-none -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">LegalUp Pro</p>
            <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Tu práctica. Tus clientes. Tus casos. Un solo lugar.
            </h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={() => handleCTAClick("final")} className="h-12 w-full bg-white px-10 text-base text-gray-900 shadow-xl hover:bg-gray-100 sm:w-auto sm:text-lg">
                Comenzar con LegalUp Pro <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-5 text-sm text-emerald-200/70">$19.990/mes × 3 cobros · Sin compromiso anual</p>
          </Reveal>
        </div>
      </section>

      {/* Minimal footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-green-900" />
            <span className="font-bold text-green-900">LegalUp Pro</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <button onClick={() => scrollToId("producto")} className="hover:text-gray-900">Producto</button>
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
