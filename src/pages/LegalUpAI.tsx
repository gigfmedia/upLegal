import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Sparkles, FileText, Zap, Clock, ChevronRight,
  CheckCircle, ArrowRight, Brain, Scale, Shield,
  MessageSquare, BarChart3, Star, Send, Loader2, Rocket
} from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/AuthModal";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const FEATURES = [
  {
    icon: FileText,
    title: "Análisis de Documentos",
    description: "Sube contratos, demandas o escrituras y obtén un resumen jurídico estructurado en segundos. Sin leer 80 páginas."
  },
  {
    icon: Brain,
    title: "Resumen de Causas",
    description: "Pega el expediente y la IA identifica partes, pretensiones, plazos críticos y próximos pasos procesales."
  },
  {
    icon: Zap,
    title: "Redacción Asistida",
    description: "Genera borradores de escritos, recursos y cartas en el estilo del derecho chileno. Tú revisas y firmas."
  },
  {
    icon: MessageSquare,
    title: "Consultas Instantáneas",
    description: "Pregunta sobre jurisprudencia, plazos o procedimientos. Respuestas basadas en el ordenamiento jurídico chileno."
  },
  {
    icon: BarChart3,
    title: "Dashboard de Causas",
    description: "Centraliza todos tus expedientes con alertas automáticas de vencimiento y seguimiento del estado procesal."
  },
  {
    icon: Shield,
    title: "100% Confidencial",
    description: "Tus datos y los de tus clientes nunca se usan para entrenar modelos. Cumplimos con la ley de protección de datos (Ley 21.719)."
  }
];

const AREAS = [
  "Derecho Laboral",
  "Derecho de Familia",
  "Derecho Civil",
  "Derecho Penal",
  "Derecho Comercial",
  "Otra área"
];

const TIME_OPTIONS = [
  "Menos de 1 hora diaria",
  "1-2 horas diarias",
  "3-4 horas diarias",
  "Más de 4 horas diarias"
];

const TASKS = [
  "Leer y resumir documentos",
  "Redactar escritos y recursos",
  "Investigar jurisprudencia",
  "Gestionar plazos y causas",
  "Preparar informes para clientes"
];

const LegalUpAI = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [headerHasBackground, setHeaderHasBackground] = useState(false);
  const [parallaxY, setParallaxY] = useState(0);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [headerFixed, setHeaderFixed] = useState(false);
  const { user } = useAuth();
  const [form, setForm] = useState({
    area: "",
    timeOnDocs: "",
    usesChatGPT: "",
    biggestTask: "",
    email: ""
  });

  useEffect(() => {
    if (user?.email && !form.email) {
      setForm(prev => ({ ...prev, email: user.email }));
    }
  }, [user?.email]);

  useEffect(() => {
    // Start drafting animation after document analysis finishes (approx 2.5s)
    const startTimeout = setTimeout(() => {
      setHasStarted(true);
    }, 2500);

    return () => clearTimeout(startTimeout);
  }, []);

  useEffect(() => {
    if (!hasStarted) return;

    const interval = setInterval(() => {
      setCurrentParagraphIndex((prev) => (prev === 0 ? 1 : 0));
    }, 6000); // Cycle every 6 seconds
    return () => clearInterval(interval);
  }, [hasStarted]);

  useEffect(() => {
    let currentScrollY = 0;

    const handleScroll = () => {
      const scrollY = window.scrollY;

      // Header background: only show when not at top
      setHeaderHasBackground(scrollY > 0);

      // Parallax effect for hero background
      setParallaxY(scrollY * 0.5); // 0.5 = speed factor (slower than scroll)

      // Header position: absolute when scrolling down, fixed when scrolling up
      const isScrollingUp = scrollY < currentScrollY;
      setHeaderFixed(isScrollingUp && scrollY > 50);

      // Header visibility: hide when scrolling down, show when scrolling up
      const shouldHide = scrollY > currentScrollY && scrollY > 50;
      setHeaderVisible(!shouldHide);

      currentScrollY = scrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const MOCKUP_PARAGRAPHS = [
    {
      mainLabel: "EN LO PRINCIPAL:",
      mainText: " Interpone recurso de apelación; ",
      subLabel: "PRIMER OTROSÍ:",
      subText: " Acompaña documentos...",
      statusText: "Generando segundo párrafo..."
    },
    {
      mainLabel: "SEGUNDO OTROSÍ:",
      mainText: " Solicita alegatos en estrado; ",
      subLabel: "TERCER OTROSÍ:",
      subText: " Asume patrocinio y poder...",
      statusText: "Finalizando documento..."
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.area) return;
    setLoading(true);
    
    try {
      // 1. Try to save to Supabase
      const { error } = await supabase
        .from('ai_waitlist')
        .insert([
          {
            email: form.email,
            legal_area: form.area,
            time_on_docs: form.timeOnDocs,
            uses_chatgpt: form.usesChatGPT,
            biggest_task: form.biggestTask,
            created_at: new Date().toISOString()
          }
        ]);

      if (error) {
        console.error('Supabase error:', error);
        // Fallback for MVP: If table doesn't exist yet, we still track it in GA
        // and log it so it's not lost in the developer console during testing
        console.log('Waitlist Lead Data:', form);
      }

      // 2. Track GA event
      window.gtag?.("event", "legalup_ai_waitlist_signup", {
        area: form.area,
        uses_chatgpt: form.usesChatGPT
      });

      setSubmitted(true);
      toast.success("¡Te has registrado con éxito!");
    } catch (err) {
      console.error('Submission error:', err);
      // Even if DB fails, we want the user to feel successful in an MVP validation
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const scrollToWaitlist = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById("waitlist");
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
      
      window.gtag?.("event", "legalup_ai_hero_cta_click");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>LegalUp AI — Inteligencia Artificial para abogados chilenos | Acceso Anticipado</title>
        <meta
          name="description"
          content="Analiza documentos legales, resume causas y redacta escritos en segundos con IA entrenada en el derecho chileno. Solicita acceso anticipado."
        />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <Header variant="dark" hideTopBar={true} hasBackground={headerHasBackground} visible={headerVisible} fixed={headerFixed} onAuthClick={() => setShowAuthModal(true)} />

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="relative bg-gray-950 text-white overflow-hidden">
        {/* ───────────────── HERO BACKGROUND ───────────────── */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ transform: `translateY(${parallaxY}px)` }}>

          {/* Base gradient */}
          <div className="absolute inset-0 bg-[#020617]" />

          {/* Massive animated orb */}
          {/* <div className="absolute top-[-20%] left-1/2 -translate-x-1/2">
            <div className="w-[1200px] h-[1200px] rounded-full 
              bg-emerald-400/10 
              blur-[140px] 
              animate-pulse-slow"
            />
          </div> */}

          {/* Secondary moving orb */}
          {/* <div className="absolute bottom-[-30%] right-[-10%]">
            <div className="w-[900px] h-[900px] rounded-full 
              bg-cyan-500/20 
              blur-[120px] 
              animate-orb"
            />
          </div> */}

          {/* Aurora beam */}
          {/* <div className="absolute top-[-10%] left-[-10%] w-[140%] h-[500px]
            bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent
            rotate-[-12deg]
            blur-3xl
            animate-aurora"
          /> */}

          {/* Rotating rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            
            <div className="absolute w-[1700px] h-[1700px]
              border border-white/40 rounded-full
              animate-spin-ultra-slow"
            />

            <div className="absolute w-[1300px] h-[1300px]
              border border-emerald-500/20 rounded-full
              animate-spin-reverse"
            />

            <div className="absolute w-[1000px] h-[1000px]
              border border-white/10 rounded-full
              animate-spin-ultra-slow"
            />

            <div className="absolute w-[700px] h-[700px]
              border border-emerald-400/10 rounded-full
              animate-spin-reverse"
            />

            <div className="absolute w-[500px] h-[500px]
              border border-cyan-400/10 rounded-full
              animate-spin-ultra-slow"
            />
          </div>

          {/* Animated particles */}
          <div className="absolute inset-0">
            {[...Array(40)].map((_, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-white/40 animate-particles"
                style={{
                  width: `${Math.random() * 4 + 1}px`,
                  height: `${Math.random() * 4 + 1}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 10}s`,
                  animationDuration: `${10 + Math.random() * 20}s`,
                }}
              />
            ))}
          </div>

          {/* Noise */}
          <div className="absolute inset-0 mix-blend-soft-light bg-[url('https://resend.com/static/product-pages/noise.png')]" />

          {/* Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#020617_95%)]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 border border-white/20 rounded-full px-4 py-1.5 mb-8 shadow-lg">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium tracking-wide">
              Acceso Anticipado · Lista de espera
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-serif leading-tight my-6 tracking-tight">
            <span className="inline-block animate-fade-up">
              Inteligencia Artificial para 
            </span>
            <span className="font-bold font-serif italic bg-gradient-to-b from-white/100 to-green/80 bg-clip-text text-transparent inline-block animate-fade-up delay-150">
              Abogados en Chile
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-white max-w-2xl mx-auto mb-8 leading-relaxed animate-fade-up delay-300">
            Plataforma de IA legal diseñada para ayudarte a entender jurisprudencia, analizar casos privados y automatizar tareas legales. <br />Precisión, velocidad y confianza en cada respuesta.
          </p>

          {/* Social proof */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm mb-8 animate-fade-up delay-500">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-white" />
              <span>
                Confidencialidad garantizada (Ley 21.719 
                <span className="hidden sm:inline sm:ml-1">
                  protección de datos
                </span>
                )
              </span>
            </div>
          </div>

          {/* CTA */}
          <a href="#waitlist" onClick={scrollToWaitlist}>
            <Button
              size="lg"
              className="group relative overflow-hidden bg-transparent text-white border border-white hover:bg-white hover:text-gray-900 font-bold h-14 px-10 text-lg rounded-xl shadow-2xl transition-all duration-300"
            >
              {/* Button shine */}
              <span className="absolute inset-0 overflow-hidden rounded-xl">
                <span className="absolute left-[-120%] top-0 h-full w-[120%] bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-[-20deg]" />
              </span>

              <span className="relative z-10 flex items-center">
                Solicitar acceso anticipado
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform hover:text-gray-900" />
              </span>
            </Button>
          </a>
        </div>


        {/* Mockup card */}
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-gray-900 border border-white/10 rounded-t-2xl overflow-hidden shadow-2xl">
            {/* Fake browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-gray-900/80">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 bg-gray-800 rounded-full px-3 py-1 text-xs text-gray-500 ml-2 max-w-xs">
                legalup.cl/ai
              </div>
            </div>
            {/* Fake UI */}
            <div className="p-6 grid md:grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-xl p-4 relative overflow-hidden group">
                <p className="text-xs font-bold uppercase tracking-widest text-green-400 mb-3">📄 Documento analizado</p>
                <div className="space-y-2">
                  <motion.div 
                    initial={{ width: "0%" }} 
                    animate={{ width: "100%" }} 
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-3 bg-gray-700 rounded" 
                  />
                  <motion.div 
                    initial={{ width: "0%" }} 
                    animate={{ width: "85%" }} 
                    transition={{ duration: 1, delay: 0.7 }}
                    className="h-3 bg-gray-700 rounded" 
                  />
                  <motion.div 
                    initial={{ width: "0%" }} 
                    animate={{ width: "65%" }} 
                    transition={{ duration: 1, delay: 0.9 }}
                    className="h-3 bg-gray-700 rounded" 
                  />
                </div>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2 }}
                  className="mt-4 bg-green-500/10 border border-green-500/20 rounded-lg p-3"
                >
                  <p className="text-green-400 text-xs font-semibold mb-1 flex items-center gap-2">
                    <Sparkles className="h-3 w-3" />
                    Resumen IA
                  </p>
                  <div className="space-y-1.5">
                    <div className="h-2.5 bg-green-500/20 rounded w-full overflow-hidden relative">
                      <motion.div 
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/20 to-transparent"
                      />
                    </div>
                    <div className="h-2.5 bg-green-500/20 rounded w-3/4 overflow-hidden relative">
                       <motion.div 
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: 0.5 }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/20 to-transparent"
                      />
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="bg-gray-800 rounded-xl p-4 relative overflow-hidden flex flex-col">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">✍️ Redacción asistida</p>
                <div className="bg-gray-700 rounded-lg p-3 text-xs text-gray-400 leading-relaxed font-mono min-h-[90px] relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    {hasStarted && (
                      <motion.div
                        key={currentParagraphIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0,
                          transition: {
                            y: { duration: 0.4, ease: "easeOut" },
                            opacity: { duration: 0.4 },
                            staggerChildren: 0.03,
                            delayChildren: 0.2
                          }
                        }}
                        exit={{ 
                          opacity: 0, 
                          y: -20,
                          transition: { duration: 0.3, ease: "easeIn" }
                        }}
                        className="absolute inset-x-3 top-3"
                      >
                        <span className="text-green-400">{MOCKUP_PARAGRAPHS[currentParagraphIndex].mainLabel}</span>
                        {MOCKUP_PARAGRAPHS[currentParagraphIndex].mainText.split("").map((char, i) => (
                          <motion.span key={`main-${i}`} variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
                            {char}
                          </motion.span>
                        ))}
                        <br />
                        <span className="text-emerald-400">{MOCKUP_PARAGRAPHS[currentParagraphIndex].subLabel}</span>
                        {MOCKUP_PARAGRAPHS[currentParagraphIndex].subText.split("").map((char, i) => (
                          <motion.span key={`sub-${i}`} variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
                            {char}
                          </motion.span>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="mt-3 flex items-center gap-2 overflow-hidden relative">
                  <motion.div
                    key={hasStarted ? `status-${currentParagraphIndex}` : 'waiting'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className={hasStarted ? "h-4 w-4 text-green-400" : "h-4 w-4 text-emerald-600"} />
                    <span className={hasStarted ? "text-xs text-gray-400 relative" : "text-xs text-emerald-600/70 relative"}>
                      {hasStarted ? MOCKUP_PARAGRAPHS[currentParagraphIndex].statusText : "Analizando expediente..."}
                      {hasStarted && (
                        <motion.div 
                          animate={{ x: ["-100%", "200%"] }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                          className="absolute inset-0 skew-x-12"
                        />
                      )}
                    </span>
                  </motion.div>

                  {/* Thinking dots */}
                  {/* <div className="flex gap-1 ml-auto">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ y: [0, -3, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.2 }}
                        className={hasStarted ? "w-1 h-1 bg-green-500 rounded-full" : "w-1 h-1 bg-emerald-700/50 rounded-full"}
                      />
                    ))}
                  </div> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-gray-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 border border-white/30 rounded-full px-4 py-1.5 mb-8">
              <Sparkles className="h-4 w-4 text-white" />
              <p className="text-white text-sm font-medium tracking-wide text-foreground">Funcionalidades</p>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-bold font-serif text-white mb-4">
              Todo lo que necesitas para trabajar más rápido
            </h2>
            <p className="text-lg text-white max-w-2xl mx-auto">
              Diseñado específicamente para la práctica del derecho en Chile. 
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-gray-800"
              >
                <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-4 border border-gray-800">
                  <f.icon className="h-6 w-6 text-green-400" />
                </div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-white text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>

          {/* Time saved callout */}
          <div className="mt-6 border border-gray-800 text-white rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-6 w-6 text-green-400" />
                <span className="font-bold text-green-400 uppercase text-sm tracking-widest">Impacto real</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold font-serif mb-3">
                Los abogados dedican hasta <span className="text-green-400">40%</span> de su tiempo a trabajo administrativo
              </h3>
              <p className="text-white leading-relaxed">
                Leer documentos, redactar escritos repetitivos y resumir expedientes. LegalUp AI automatiza esas tareas para que te concentres en el trabajo de alto valor.
              </p>
            </div>
            <div className="flex-shrink-0 grid grid-cols-2 gap-4">
              {[
                { label: "Análisis de doc", before: "45 min", after: "2 min" },
                { label: "Borrador escrito", before: "2 horas", after: "15 min" }
              ].map((item, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <p className="text-xs text-white mb-2">{item.label}</p>
                  <p className="text-lg font-bold text-white line-through">{item.before}</p>
                  <p className="text-xl font-bold text-green-400">{item.after}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── WAITLIST FORM ───────────────────────────────────── */}
      <section id="waitlist" className="py-24 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {submitted ? (
            <div className="text-center py-16">
              <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold font-serif text-gray-900 mb-4">¡Estás en la lista!</h2>
              <p className="text-gray-600 text-lg mb-8">
                Eres de los primeros en conocer LegalUp AI. Te avisaremos cuando esté listo con un descuento exclusivo de acceso anticipado.
              </p>
              <Link to="/">
                <Button variant="outline" className="border-gray-800 text-gray-900">
                  Volver al inicio
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-1.5 mb-8">
                  <Sparkles className="h-4 w-4 text-green-600" />
                  <span className="text-green-700 text-sm font-semibold">Acceso anticipado · Cupos limitados</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold font-serif text-gray-900 mb-4">
                  Solicitar acceso anticipado
                </h2>
                <p className="text-gray-600">
                  Cuéntanos sobre tu práctica para ayudarte a ahorrar más tiempo desde el día 1.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Área legal */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ¿En qué área del derecho ejerces principalmente?
                  </label>
                  <select
                    required
                    value={form.area}
                    onChange={e => setForm({ ...form, area: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                  >
                    <option value="">Selecciona una opción</option>
                    {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                {/* Tiempo en documentos */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ¿Cuánto tiempo dedicas a leer/resumir documentos por día?
                  </label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {TIME_OPTIONS.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, timeOnDocs: t })}
                        className={`border rounded-xl px-4 py-3 text-sm text-left transition-all ${
                          form.timeOnDocs === t
                            ? "border-green-500 bg-green-50 text-green-900"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Usa ChatGPT */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ¿Usas actualmente ChatGPT u otra IA para tu trabajo legal?
                  </label>
                  <div className="flex gap-3">
                    {["Sí, regularmente", "Lo he probado", "No, nunca"].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setForm({ ...form, usesChatGPT: opt })}
                        className={`flex-1 border rounded-xl px-3 py-3 text-sm transition-all ${
                          form.usesChatGPT === opt
                            ? "border-green-500 bg-green-50 text-green-900"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mayor consumo de tiempo */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ¿Qué tarea te consume más tiempo actualmente?
                  </label>
                  <div className="space-y-2">
                    {TASKS.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, biggestTask: t })}
                        className={`w-full border rounded-xl px-4 py-3 text-sm text-left flex items-center gap-3 transition-all ${
                          form.biggestTask === t
                            ? "border-green-500 bg-green-50 text-green-900"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                        }`}
                      >
                        <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          form.biggestTask === t ? "border-green-500 bg-green-500" : "border-gray-300"
                        }`}>
                          {form.biggestTask === t && <div className="h-1.5 w-1.5 bg-white rounded-full" />}
                        </div>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tu correo electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="juan@ejemplo.cl"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-base sm:text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || !form.email || !form.area}
                  className="w-full bg-gray-900 hover:bg-green-900 text-white h-14 text-base font-semibold rounded-xl"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      Solicitar acceso
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-gray-400">
                  Sin spam. Solo te contactamos cuando estemos listos para darte acceso.
                </p>
              </form>
            </>
          )}
        </div>
      </section>

      {/* ─── CTA BOTTOM ──────────────────────────────────────── */}
      <section className="py-16 bg-gray-950 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          {/* <Rocket className="h-8 w-8 text-green-400 mx-auto mb-4" /> */}
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white mb-4">
            La nueva era del trabajo legal
          </h2>
          <p className="text-white mb-8">
            Únete a los primeros abogados en usar IA diseñada para el derecho chileno.
          </p>
          <a href="#waitlist" onClick={scrollToWaitlist}>
            <Button className="bg-white text-gray-900 hover:bg-green-400 h-12 px-8 font-semibold">
              Unirme a la lista de espera
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      </section>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
      />
    </div>
  );
};

export default LegalUpAI;
