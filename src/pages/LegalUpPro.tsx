import { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Scale, ArrowRight, Check, Inbox, Users, Briefcase, Calendar, DollarSign, Sparkles, Shield, ChevronDown, Menu, X, Zap } from "lucide-react";
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

// Mock dashboard preview using real UI structure, no fake metrics
function DashboardPreview() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
        <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-600" />
        <span className="ml-2 text-xs font-mono text-gray-400">legalup.cl/lawyer/dashboard</span>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-6 bg-cream-900">
        {[
          { label: "Solicitudes pendientes", icon: Inbox, value: "—" },
          { label: "Citas hoy", icon: Calendar, value: "—" },
          { label: "Casos activos", icon: Briefcase, value: "—" },
          { label: "Ingresos del mes", icon: DollarSign, value: "—" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">{kpi.label}</span>
              <kpi.icon className="h-4 w-4 text-gray-400" />
            </div>
            <div className="mt-2 text-lg font-bold text-gray-900">{kpi.value}</div>
            <div className="mt-1 h-2 w-16 rounded bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 px-4 py-4 sm:px-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Próximas citas</span>
          <span className="text-xs text-green-700">Ver agenda →</span>
        </div>
        <div className="space-y-2">
          {[
            { time: "10:00", name: "Cliente demo", service: "Consulta" },
            { time: "15:30", name: "Cliente demo", service: "Reunión" },
          ].map((a, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5">
              <div>
                <div className="text-sm font-medium text-gray-900">{a.time} · {a.name}</div>
                <div className="text-xs text-gray-500">{a.service}</div>
              </div>
              <div className="h-2 w-12 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-black/5" />
    </div>
  );
}

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
        <section className="bg-amber-50 border-b border-amber-200">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">LegalUp Pro es para abogados</h2>
              <p className="text-sm text-gray-600">Si necesitas asesoría legal, encuentra un abogado según tu necesidad en LegalUp.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Button onClick={() => handleCTAClick("client_banner")} className="bg-gray-900 hover:bg-green-900">Buscar abogado</Button>
              <Button variant="outline" onClick={() => navigate("/")}>Volver a LegalUp</Button>
            </div>
          </div>
        </section>
      )}

      {/* HERO */}
      <section className="bg-cream-900 border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <Badge className="mb-4 bg-green-50 text-green-800 border-green-200 hover:bg-green-50">Founder — 15 cupos iniciales</Badge>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl leading-[1.05]">
              Tu práctica legal, organizada en un solo lugar.
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-gray-600">
              Gestiona clientes, casos, solicitudes y citas desde LegalUp Pro, sin depender de planillas, mensajes y herramientas separadas.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <div className="text-2xl font-bold text-gray-900">$19.990<span className="text-sm font-medium text-gray-500">/mes</span></div>
                <div className="text-xs text-green-700 font-medium">Founder — por 3 meses · 15 cupos iniciales</div>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={() => handleCTAClick("hero")} className="bg-gray-900 hover:bg-green-900 h-12 px-8 text-base">
                Comenzar con LegalUp Pro <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => scrollToId("como-funciona")} className="h-12 px-8 text-base">
                Ver cómo funciona
              </Button>
            </div>
            <p className="mt-3 text-xs text-gray-500">Sin compromiso anual. Cancela cuando quieras según condiciones vigentes.</p>
          </div>
          <div className="relative">
            <DashboardPreview />
            <p className="mt-3 text-center text-xs text-gray-400">Vista del dashboard real de LegalUp Pro (datos ilustrativos anonimizados).</p>
          </div>
        </div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="border-y border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Menos tiempo administrando. Más tiempo ejerciendo.</h2>
            <p className="mt-4 text-gray-600">Si hoy tu práctica depende de WhatsApp, calendarios separados y planillas, este es el cambio.</p>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
            {[
              { title: "Clientes en WhatsApp", desc: "Conversaciones dispersas y sin trazabilidad." },
              { title: "Citas en calendarios separados", desc: "Doble agenda y choques de horario." },
              { title: "Casos sin seguimiento centralizado", desc: "Información repartida en archivos y mensajes." },
              { title: "Solicitudes difíciles de ordenar", desc: "Oportunidades que se pierden sin un flujo claro." },
            ].map((item) => (
              <Card key={item.title} className="bg-white">
                <CardContent className="p-6">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCTO - flujo */}
      <section id="como-funciona" className="bg-cream-900 border-y border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-700">Producto</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">De la solicitud al ingreso, en un mismo flujo.</h2>
          <p className="mt-4 text-gray-600">LegalUp Pro conecta cada etapa para que no pierdas el hilo entre la oportunidad y la gestión.</p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-sm font-medium">
          {["Solicitudes", "Clientes", "Casos", "Citas", "Ingresos"].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-2">
              <span className="rounded-full border border-gray-200 bg-white px-4 py-2">{step}</span>
              {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-gray-400" />}
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <Inbox className="h-5 w-5 text-green-700" />
              <h3 className="mt-3 font-semibold">Solicitudes → Clientes</h3>
              <p className="mt-1 text-sm text-gray-600">Centraliza nuevas solicitudes y conviértelas en clientes sin re-escribir información.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Briefcase className="h-5 w-5 text-green-700" />
              <h3 className="mt-3 font-semibold">Clientes → Casos</h3>
              <p className="mt-1 text-sm text-gray-600">Crea y da seguimiento a cada asunto con información organizada por cliente y caso.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Calendar className="h-5 w-5 text-green-700" />
              <h3 className="mt-3 font-semibold">Citas organizadas</h3>
              <p className="mt-1 text-sm text-gray-600">Organiza consultas y reuniones con calendario integrado y confirmaciones.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <DollarSign className="h-5 w-5 text-green-700" />
              <h3 className="mt-3 font-semibold">Ingresos visibles</h3>
              <p className="mt-1 text-sm text-gray-600">Consulta los ingresos asociados a tu actividad en LegalUp sin planillas externas.</p>
            </CardContent>
          </Card>
        </div>
        <div className="mt-8 text-center">
          <Button onClick={() => handleCTAClick("product")} className="bg-gray-900 hover:bg-green-900">Comenzar con LegalUp Pro <ArrowRight className="h-4 w-4" /></Button>
        </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-y border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Todo lo esencial, sin complejidad</h2>
            <p className="mt-3 text-gray-600">Herramientas pensadas para la operación diaria del abogado.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Inbox, title: "Solicitudes", desc: "Centraliza nuevas solicitudes y conviértelas en clientes/casos." },
              { icon: Users, title: "Clientes", desc: "Mantén la información de tus clientes organizada y accesible." },
              { icon: Briefcase, title: "Casos", desc: "Gestiona el seguimiento de cada asunto desde un mismo lugar." },
              { icon: Calendar, title: "Citas", desc: "Organiza consultas y reuniones sin herramientas separadas." },
              { icon: DollarSign, title: "Ingresos", desc: "Consulta los ingresos asociados a tu actividad en LegalUp." },
              { icon: Sparkles, title: "LegalUp AI Limited", desc: "Analiza documentos y conversa sobre casos. 1 caso y hasta 3 documentos incluidos." },
            ].map((f) => (
              <Card key={f.title} className="bg-white">
                <CardContent className="p-6">
                  <f.icon className="h-5 w-5 text-green-700" />
                  <h3 className="mt-3 font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* DIFERENCIACION */}
      <section className="bg-cream-900 border-y border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-green-700">Diferenciación</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Más que organizar tu práctica.</h2>
            <p className="mt-4 text-gray-600">
              La mayoría de las herramientas de gestión empiezan cuando el abogado ya consiguió al cliente. LegalUp está construyendo un ecosistema donde la captación y la gestión conviven.
            </p>
            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                {["Marketplace", "Solicitud", "Cliente", "Caso", "Cita", "Gestión"].map((s, i, arr) => (
                  <span key={s} className="flex items-center gap-2">
                    <span className="rounded-md bg-white border px-2.5 py-1">{s}</span>
                    {i < arr.length - 1 && <span className="text-gray-400">→</span>}
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              Las solicitudes provenientes de LegalUp pueden integrarse directamente en tu flujo de trabajo. Sin prometer volumen, pero con un flujo que sí aprovecha cada oportunidad.
            </p>
          </div>
          <Card className="bg-white">
            <CardContent className="p-6">
              <Shield className="h-5 w-5 text-green-700" />
              <h3 className="mt-3 font-semibold">Un ecosistema, no solo un CRM</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li className="flex gap-2"><Check className="h-4 w-4 text-green-600 mt-0.5" /> Captación vía Marketplace de LegalUp</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-green-600 mt-0.5" /> Gestión integral en LegalUp Pro</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-green-600 mt-0.5" /> IA integrada a tu flujo</li>
              </ul>
              <p className="mt-4 text-xs text-gray-500">LegalUp conecta usuarios con abogados a través de su Marketplace, sin garantizar un número de solicitudes o clientes.</p>
            </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* LEGALUP AI */}
      <section className="border-y border-gray-100 bg-gray-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-40">IA integrada</Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">IA integrada a tu flujo de trabajo.</h2>
              <p className="mt-4 text-gray-300">LegalUp Pro incluye acceso inicial a LegalUp AI para trabajar con información de casos sin salir de tu gestión.</p>
              <ul className="mt-6 space-y-2 text-sm text-gray-300">
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5" /> Analizar documentos</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5" /> Trabajar con información de casos</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5" /> Conversar sobre el contenido asociado al caso</li>
              </ul>
              <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium">Incluido en Pro: 1 caso + 3 documentos</span>
              </div>
              <p className="mt-3 text-xs text-gray-400">LegalUp AI Full está disponible por separado por $49.900/mes.</p>
            </div>
            <Card className="bg-white/[0.06] border-white/10 backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Qué incluye AI Limited</span>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-gray-200">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5" /> 1 caso activo</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5" /> Hasta 3 documentos</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5" /> Análisis de documentos y chat sobre casos</li>
                </ul>
                <p className="mt-4 text-xs leading-relaxed text-gray-400">No incluye jurisprudencia/research Full. Para acceso completo, contrata LegalUp AI Full por separado.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Un precio Founder, simple</h2>
          <p className="mt-3 text-gray-600">Empieza con LegalUp Pro y accede a las mejoras que sigamos sumando durante tu período Founder.</p>
        </div>
        <div className="mx-auto mt-10 max-w-md">
          <Card className="overflow-hidden border-green-200 shadow-lg">
            <div className="bg-gradient-to-br from-green-50 to-white p-6 sm:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold">LegalUp Pro — Founder</h3>
                  <p className="text-sm text-gray-500">Para los primeros 15 abogados</p>
                </div>
                <Badge className="bg-green-100 text-green-800 border-green-200">Founder 15</Badge>
              </div>
              <div className="mt-6">
                <div className="text-4xl font-bold">$19.990<span className="text-base font-medium text-gray-500">/mes</span></div>
                <div className="text-sm font-medium text-green-700">durante los primeros 3 meses</div>
                <p className="mt-2 text-xs text-gray-500">Los primeros 15 cupos. Luego el precio puede actualizarse y se informará antes de aplicar cambios.</p>
              </div>
              <ul className="mt-6 space-y-2 text-sm">
                {["Solicitudes", "Clientes", "Casos", "Citas", "Servicios / gestión disponible", "Ingresos", "LegalUp AI Limited (1 caso, 3 documentos)", "Acceso a futuras mejoras de Pro durante el período Founder"].map((perk) => (
                  <li key={perk} className="flex gap-2"><Check className="h-4 w-4 text-green-600 mt-0.5" /> {perk}</li>
                ))}
              </ul>
              <Button onClick={() => handleCTAClick("pricing")} className="mt-6 w-full bg-gray-900 hover:bg-green-900 h-11 text-base">
                Activar LegalUp Pro <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="mt-3 text-center text-xs text-gray-500">Incluye AI Limited. AI Full ($49.900/mes) se contrata por separado.</p>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-y border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 className="text-3xl font-bold tracking-tight text-center">Preguntas frecuentes</h2>
          <Accordion type="single" collapsible className="mt-8 bg-white rounded-xl border px-4">
            <AccordionItem value="q1">
              <AccordionTrigger>¿Qué es LegalUp Pro?</AccordionTrigger>
              <AccordionContent className="text-gray-600">Es el SaaS para abogados dentro de LegalUp. Te permite gestionar tu actividad profesional — solicitudes, clientes, casos, citas e ingresos — desde un solo lugar, con IA integrada de forma limitada.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>¿Cuánto cuesta?</AccordionTrigger>
              <AccordionContent className="text-gray-600">$19.990/mes durante los primeros 3 meses para los primeros 15 abogados Founder. Después de ese período, el precio puede actualizarse.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>¿Qué pasa después de los 3 meses?</AccordionTrigger>
              <AccordionContent className="text-gray-600">El precio Founder aplica durante los primeros tres meses. Cualquier cambio posterior será informado antes de aplicarse. No hay un precio regular definitivo comunicado en esta etapa.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger>¿LegalUp Pro incluye LegalUp AI?</AccordionTrigger>
              <AccordionContent className="text-gray-600">Sí, incluye LegalUp AI Limited: 1 caso y hasta 3 documentos, con análisis de documentos y chat sobre casos. LegalUp AI Full (jurisprudencia y acceso completo) se contrata por separado por $49.900/mes.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q5">
              <AccordionTrigger>¿Puedo cancelar?</AccordionTrigger>
              <AccordionContent className="text-gray-600">Sí. Puedes cancelar tu suscripción en cualquier momento desde el dashboard. El acceso se mantiene hasta el fin del período ya pagado. Si necesitas ayuda, escríbenos a través de los canales de soporte de LegalUp.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q6">
              <AccordionTrigger>¿LegalUp me garantiza clientes?</AccordionTrigger>
              <AccordionContent className="text-gray-600">No. LegalUp conecta usuarios con abogados a través de su Marketplace y las solicitudes que generes pueden integrarse directamente en tu flujo de LegalUp Pro, pero no garantizamos una cantidad específica de solicitudes o clientes.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-cream-900 border-y border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Organiza tu práctica con LegalUp Pro.</h2>
          <p className="mt-4 text-gray-600">Únete a los primeros abogados que están probando una nueva forma de gestionar su trabajo en LegalUp.</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-800">
            Founder $19.990/mes por 3 meses · 15 cupos iniciales
          </div>
          <div className="mt-6 flex justify-center">
            <Button size="lg" onClick={() => handleCTAClick("final")} className="bg-gray-900 hover:bg-green-900 h-12 px-8 text-base">
              Comenzar con LegalUp Pro <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-3 text-xs text-gray-500">Incluye LegalUp AI Limited (1 caso, 3 documentos). AI Full por separado: $49.900/mes.</p>
          </div>
        </div>
      </section>

      {/* Minimal footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              © 2026 LegalUp. Todos los derechos reservados.
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="/terminos" className="text-gray-500 hover:text-gray-900">Términos</a>
              <a href="/privacidad" className="text-gray-500 hover:text-gray-900">Privacidad</a>
              <a href="/contacto" className="text-gray-500 hover:text-gray-900">Contacto</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth modal - force lawyer signup for /pro */}
      {authOpen && (
        <AuthModal
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          mode={authMode}
          onModeChange={setAuthMode}
          proLanding
        />
      )}
      {/* We intercept signup lawyer flow: after AuthModal closes, if now authenticated as lawyer without Pro, open pricing */}
      <ProPricingModal open={pricingOpen} onOpenChange={setPricingOpen} triggerAction="pro_landing" />
    </div>
  );
}
