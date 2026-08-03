/* ===================================================================
 * LegalUp AI — Legal Intelligence 2030
 * Landing page component. Copy this file to src/pages/LegalUpAI.tsx
 * in your React/TypeScript project.
 *
 * TRULY STANDALONE — No Tailwind CSS required in the consuming project.
 * All utility classes, design tokens, and animations are injected
 * via <style> tag on mount. Works in any React project.
 *
 * Required dependencies:
 *   react, react-dom, framer-motion, lucide-react, sonner,
 *   @supabase/supabase-js
 *
 * Optional (for Supabase auth): VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
 * =================================================================== */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Sparkles,
  Scale,
  ArrowRight,
  ArrowUpRight,
  FileText,
  ShieldAlert,
  CalendarClock,
  Users,
  Check,
  Loader2,
  ShieldCheck,
  Brain,
  Zap,
  MessageSquare,
  BarChart3,
  Shield,
  Lock,
  EyeOff,
  SlidersHorizontal,
  Clock,
  ArrowDown,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import posthog from "posthog-js";
import { useAuth } from "@/contexts/AuthContext/clean/useAuth";
import { AuthModal } from "@/components/AuthModal";
import { AIPricingModal } from "@/components/legalup-ai/AIPricingModal";
import {
  useAISubscription,
  useStartAITrial,
} from "@/hooks/useAISubscription";
// Cargado como texto e inyectado en un <style> que se elimina al desmontar la
// landing. Todo el CSS está aislado bajo `.legalup-landing` (ver comentario en
// `legalup-standalone.css`), de modo que no pisa las utilidades responsivas del
// CSS global y los Dialog portaleados (login/pricing) conservan su centrado.
import standaloneCss from "../legalup-standalone.css?inline";

/* Inyecta/remueve los estilos aislados de la landing. El CSS ya está scoped a
   `.legalup-landing`, por lo que el contenido portaleado (Dialog) usa el CSS
   global de Tailwind y conserva el posicionamiento centrado. */
function pushStandaloneCss() {
  const style = document.createElement("style");
  style.dataset.name = "legalup-standalone";
  style.textContent = standaloneCss;
  document.head.appendChild(style);
  return style;
}

/* ───── cn utility ───── */

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ───── Button ───── */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "glow" | "quiet";
  size?: "default" | "sm" | "lg" | "xl" | "icon";
}

function Button({
  className,
  variant = "default",
  size = "default",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    default:
      "bg-[var(--primary)] text-[var(--primary-foreground)] shadow hover:brightness-110",
    glow: "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_0_0_1px_var(--emerald-soft),0_18px_50px_-24px_var(--emerald-accent)] hover:brightness-110 hover:shadow-[0_0_0_1px_var(--emerald-soft),0_24px_70px_-24px_var(--emerald-accent)] hover:-translate-y-0.5",
    quiet:
      "border border-[var(--hairline)] bg-[var(--surface)]/40 text-[var(--foreground)] backdrop-blur-md hover:border-[var(--primary)]/40 hover:bg-[var(--surface)]/70 hover:-translate-y-0.5",
  };
  const sizes: Record<string, string> = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-12 rounded-xl px-7 text-sm",
    xl: "h-14 rounded-xl px-8 text-base",
    icon: "h-9 w-9",
  };
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}


/* ───── Header ───── */

const NAV_ITEMS = [
  { label: "Cómo funciona", href: "#capacidades" },
  { label: "Producto", href: "#producto" },
  { label: "Seguridad", href: "#seguridad" },
];

function Header({
  hasBackground = false,
  visible = true,
  fixed = true,
  onAuthClick,
  onCtaClick,
  ctaLabel = "Probar gratis",
}: {
  hasBackground?: boolean;
  visible?: boolean;
  fixed?: boolean;
  onAuthClick?: () => void;
  onCtaClick?: () => void;
  ctaLabel?: string;
}) {
  const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const el = document.querySelector(href);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <header
      className={cn(
        "z-50 w-full transition-all duration-500",
        fixed ? "fixed top-0 left-0" : "absolute top-0 left-0",
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0",
        hasBackground
          ? "border-b border-[var(--hairline)] bg-[var(--background)]/70 backdrop-blur-xl"
          : "border-b border-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <a
          href="#top"
          onClick={(e) => scrollTo(e, "#top")}
          className="group flex items-center gap-1.5"
        >
          <Scale className="h-5 w-5 text-[var(--foreground)]" strokeWidth={2.5} />
          <span className="font-[var(--font-display)] text-[0.95rem] font-extrabold tracking-tight text-[var(--foreground)]">
            LegalUp
          </span>
          <span className="rounded-[5px] border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-1.5 py-px text-[0.6rem] font-semibold tracking-[0.14em] text-[var(--primary)] transition-colors group-hover:bg-[var(--primary)]/20">
            AI
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => scrollTo(e, item.href)}
              className="relative text-[0.8rem] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              {item.label}
              <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-[var(--primary)]/70 transition-all duration-300 hover:w-full" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCtaClick}
            className="cursor-pointer"
          >
            <Button variant="quiet" size="sm" className="h-9 rounded-lg px-4">
              {ctaLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </button>
        </div>
      </div>
    </header>
  );
}

/* ───── AnimatedBackground ───── */

const PARTICLES = Array.from({ length: 34 }, (_, i) => {
  const golden = 0.6180339887;
  const x = ((i * golden * 100) % 100).toFixed(3);
  const y = ((i * 37.5) % 100).toFixed(3);
  const size = (((i * 13) % 3) + 1).toFixed(1);
  const delay = ((i * 1.37) % 12).toFixed(2);
  const duration = (14 + ((i * 7) % 16)).toFixed(0);
  return { x, y, size, delay, duration } as const;
});

function AnimatedBackground({
  withOrbits = true,
}: {
  withOrbits?: boolean;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[var(--background)]" />
      <div
        className="absolute inset-0 opacity-70"
        style={{
          maskImage:
            "radial-gradient(80% 60% at 50% 30%, black 0%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(80% 60% at 50% 30%, black 0%, transparent 85%)",
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <motion.div
        animate={{
          x: ["0%", "2%", "0%"],
          y: ["0%", "-2%", "0%"],
          scale: [1, 1.06, 1],
        }}
        transition={{ duration: 26, ease: "easeInOut", repeat: Infinity }}
        className="absolute -top-[28rem] left-1/2 h-[52rem] w-[52rem] -translate-x-1/2 rounded-full bg-[var(--emerald-accent)]/10 blur-[160px]"
      />
      <motion.div
        animate={{
          x: ["0%", "-3%", "0%"],
          y: ["0%", "2%", "0%"],
          scale: [1, 1.04, 1],
        }}
        transition={{
          duration: 30,
          ease: "easeInOut",
          repeat: Infinity,
          delay: 2,
        }}
        className="absolute -right-40 top-40 h-[34rem] w-[34rem] rounded-full bg-[var(--cyan-accent)]/[0.07] blur-[150px]"
      />
      <motion.div
        animate={{
          x: ["0%", "2.5%", "0%"],
          y: ["0%", "-1.5%", "0%"],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 28,
          ease: "easeInOut",
          repeat: Infinity,
          delay: 4,
        }}
        className="absolute -left-52 top-[26rem] h-[30rem] w-[30rem] rounded-full bg-[var(--violet-accent)]/[0.08] blur-[160px]"
      />
      {withOrbits && (
        <div className="absolute inset-0 flex items-start justify-center">
          <div className="relative mt-[-18rem] h-[80rem] w-[80rem]">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 140,
                ease: "linear",
                repeat: Infinity,
              }}
              className="absolute inset-0 rounded-full border border-[var(--border)]"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{
                duration: 200,
                ease: "linear",
                repeat: Infinity,
              }}
              className="absolute inset-[8rem] rounded-full border border-[var(--emerald-accent)]/10"
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 140,
                ease: "linear",
                repeat: Infinity,
              }}
              className="absolute inset-[18rem] rounded-full border border-[var(--border)]"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{
                duration: 200,
                ease: "linear",
                repeat: Infinity,
              }}
              className="absolute inset-[27rem] rounded-full border border-[var(--cyan-accent)]/10"
            />
          </div>
        </div>
      )}
      <div className="absolute inset-0">
        {PARTICLES.map((p, i) => (
          <motion.span
            key={i}
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: Number(p.duration),
              ease: "easeInOut",
              repeat: Infinity,
              delay: Number(p.delay),
            }}
            className="absolute rounded-full bg-[var(--foreground)]/25"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
            }}
          />
        ))}
      </div>
      <div
        className="noise absolute inset-0 opacity-[0.035] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, transparent 35%, var(--background) 92%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-[var(--background)]" />
    </div>
  );
}

/* ───── AIWorkspace ───── */

const ANALYSIS_LINES = [
  "Identificando partes y comparecencias…",
  "Extrayendo pretensiones y fundamentos…",
  "Detectando plazos procesales…",
  "Evaluando riesgos contractuales…",
];

const RESULTS = [
  { icon: CalendarClock, label: "3 plazos detectados", tone: "text-[var(--cyan-accent)]" },
  { icon: ShieldAlert, label: "2 riesgos identificados", tone: "text-[var(--violet-accent)]" },
  { icon: Users, label: "5 entidades extraídas", tone: "text-[var(--primary)]" },
  { icon: Sparkles, label: "Resumen generado", tone: "text-[var(--primary)]" },
];

function AIWorkspace() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 900),
      setTimeout(() => setStep(2), 2600),
      setTimeout(() => setStep(3), 4600),
      setTimeout(() => setStep(4), 6600),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 42, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1.1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto w-full max-w-5xl"
    >
      <div className="absolute -inset-x-16 -top-10 bottom-0 -z-10 rounded-[3rem] bg-[var(--emerald-accent)]/[0.07] blur-[90px]" />

      <div
        className="overflow-hidden rounded-2xl shadow-[var(--shadow-elevated)]"
        style={{
          backgroundImage: "var(--gradient-glass)",
          backgroundColor: "oklch(0.12 0.012 264 / 70%)",
          backdropFilter: "blur(18px)",
          border: "1px solid var(--hairline)",
        }}
      >
        <div className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-[var(--foreground)]/15" />
            <span className="h-2 w-2 rounded-full bg-[var(--foreground)]/15" />
            <span className="h-2 w-2 rounded-full bg-[var(--primary)]/60" />
            <span className="ml-3 font-[var(--font-mono)] text-[0.65rem] tracking-wide text-[var(--muted-foreground)]">
              legalup.ai / workspace
            </span>
          </div>
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
              className="anim-pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--primary)]"
            />
            <span className="font-[var(--font-mono)] text-[0.6rem] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Motor jurídico activo
            </span>
          </div>
        </div>

        <div
          className="grid gap-px md:grid-cols-[1.05fr_1fr]"
          style={{ backgroundColor: "var(--hairline)" }}
        >
          <div className="relative overflow-hidden bg-[var(--background)]/40 p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
              <span className="text-[0.6875rem] tracking-[0.22em] uppercase font-medium text-[var(--ink-faint)]">
                Documento
              </span>
              <span className="ml-auto font-[var(--font-mono)] text-[0.6rem] text-[var(--ink-faint)]">
                demanda_laboral.pdf
              </span>
            </div>

            <div className="space-y-2.5">
              {[100, 92, 76, 96, 64, 88, 52].map((w, i) => (
                <motion.div
                  key={i}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: `${w}%`, opacity: 1 }}
                  transition={{
                    duration: 0.7,
                    delay: 0.4 + i * 0.09,
                    ease: "easeOut",
                  }}
                  className="h-2 rounded-full bg-[var(--foreground)]/[0.09]"
                />
              ))}
            </div>

            {step >= 1 && step < 3 && (
              <div className="pointer-events-none absolute inset-x-0 top-24 h-16">
                <motion.div
                  animate={{ y: ["-120%", "520%"] }}
                  transition={{
                    duration: 6,
                    ease: "easeInOut",
                    repeat: Infinity,
                  }}
                    className="anim-scanline h-16 w-full bg-gradient-to-b from-transparent via-[var(--primary)]/10 to-transparent"
                />
              </div>
            )}

            <AnimatePresence>
              {step >= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="mt-6 flex items-center gap-2.5 rounded-xl border border-[var(--hairline)] bg-[var(--surface)]/50 px-3.5 py-2.5"
                >
                  <motion.span
                    animate={{ opacity: [0.35, 1, 0.35] }}
                    transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
                    className="anim-pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--primary)]"
                  />
                  <span className="font-[var(--font-mono)] text-[0.68rem] text-[var(--ink-dim)]">
                    {step < 3 ? "Analizando documento…" : "Análisis completado"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="bg-[var(--background)]/25 p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
              <span className="text-[0.6875rem] tracking-[0.22em] uppercase font-medium text-[var(--ink-faint)]">
                Análisis IA
              </span>
            </div>

            <div className="min-h-[6.5rem] space-y-2">
              <AnimatePresence mode="popLayout">
                {step >= 1 &&
                  step < 3 &&
                  ANALYSIS_LINES.map((line, i) => (
                    <motion.p
                      key={line}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, delay: i * 0.45 }}
                      className="font-[var(--font-mono)] text-[0.68rem] text-[var(--ink-dim)]"
                    >
                      <span className="text-[var(--primary)]/70">›</span>{" "}
                      {line}
                    </motion.p>
                  ))}
              </AnimatePresence>

              {step >= 3 && (
                <div className="grid grid-cols-2 gap-2">
                  {RESULTS.map((r, i) => (
                    <motion.div
                      key={r.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.55, delay: i * 0.12 }}
                      className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)]/40 px-3 py-2.5"
                    >
                      <r.icon className={`mb-1.5 h-3.5 w-3.5 ${r.tone}`} />
                      <p className="text-[0.72rem] leading-tight text-[var(--ink-dim)]">
                        {r.label}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <AnimatePresence>
              {step >= 4 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-4 rounded-xl border border-[var(--primary)]/20 p-4"
                  style={{
                    backgroundColor: "var(--emerald-soft)",
                  }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[var(--primary)]" />
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                      Respuesta
                    </span>
                  </div>
                  <p className="text-[0.78rem] leading-relaxed text-[var(--ink-dim)]">
                    Demanda por despido injustificado. El plazo para contestar
                    vence en{" "}
                    <span className="text-[var(--foreground)]">
                      5 días hábiles
                    </span>
                    . Riesgo principal: falta de carta de aviso conforme al art.
                    162 del Código del Trabajo.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ───── AICapabilities ───── */

const CAPABILITIES = [
  {
    id: "01",
    title: "Analiza documentos",
    copy: "Sube contratos, demandas, sentencias, bases y otros documentos PDF.",
    detail:
      "Obtén un análisis estructurado del documento: partes, plazos, obligaciones y puntos clave en segundos.",
  },
  {
    id: "02",
    title: "Detecta riesgos",
    copy: "Identifica riesgos, alertas y puntos que requieren especial atención.",
  },
  {
    id: "03",
    title: "Organiza obligaciones",
    copy: "Extrae obligaciones, plazos y requisitos relevantes del documento.",
  },
  {
    id: "04",
    title: "Conversa con tu caso",
    copy: "Haz preguntas sobre los documentos cargados y recibe respuestas contextualizadas.",
  },
];

function AICapabilities() {
  const [lead, ...rest] = CAPABILITIES;

  return (
    <section
      id="capacidades"
      className="relative border-t border-[var(--hairline)] py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl"
        >
          <p className="text-[0.6875rem] tracking-[0.22em] uppercase font-medium text-[var(--ink-faint)]">
            Capacidades
          </p>
          <h2 className="mt-5 font-[var(--font-display)] text-3xl leading-[1.08] tracking-tight sm:text-5xl">
            Una capa de inteligencia
            <br />
            <span className="text-[var(--ink-dim)]">
              sobre tu práctica legal.
            </span>
          </h2>
        </motion.div>

        <div className="mt-14 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <motion.article
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="group relative flex min-h-[22rem] flex-col justify-between overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--surface)]/30 p-7 transition-colors duration-500 hover:border-[var(--primary)]/25 sm:p-10"
          >
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--emerald-accent)]/[0.07] blur-[90px] transition-opacity duration-700 group-hover:opacity-150" />
            <span className="font-[var(--font-mono)] text-xs tracking-[0.3em] text-[var(--primary)]/70">
              {lead.id}
            </span>
            <div>
              <h3 className="font-serif italic text-4xl tracking-tight sm:text-6xl">
                {lead.title}
              </h3>
              <p className="mt-4 max-w-md text-base text-[var(--ink-dim)]">
                {lead.copy}
              </p>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--muted-foreground)]">
                {lead.detail}
              </p>
            </div>

            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 h-px origin-left bg-gradient-to-r from-[var(--primary)]/50 via-[var(--cyan-accent)]/20 to-transparent"
            />
          </motion.article>

          <div className="grid gap-4">
            {rest.map((c, i) => (
              <motion.article
                key={c.id}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.7,
                  delay: 0.1 + i * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="group relative flex items-baseline gap-6 overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--surface)]/20 p-6 transition-all duration-500 hover:-translate-y-0.5 hover:border-[var(--primary)]/25 hover:bg-[var(--surface)]/40 sm:p-7"
              >
                <span className="font-[var(--font-mono)] text-xs tracking-[0.3em] text-[var(--ink-faint)] transition-colors group-hover:text-[var(--primary)]/70">
                  {c.id}
                </span>
                <div>
                  <h3 className="font-serif italic text-xl tracking-tight sm:text-2xl">
                    {c.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
                    {c.copy}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───── ProductDemo ───── */

const EXTRACTED = [
  { label: "Resumen", value: "Despido injustificado, cuantía $8.4M" },
  { label: "Partes involucradas", value: "Demandante · Empresa demandada" },
  {
    label: "Pretensiones",
    value: "Nulidad del despido e indemnizaciones",
  },
  { label: "Riesgos", value: "Carta de aviso fuera de plazo" },
  { label: "Plazos", value: "Contestación: 5 días hábiles" },
  {
    label: "Próximos pasos",
    value: "Preparar contestación y prueba documental",
  },
];

function ProductDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });

  return (
    <section
      id="producto"
      className="relative border-t border-[var(--hairline)] py-24 sm:py-32"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[var(--gradient-halo)]" />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl"
        >
          <p className="text-[0.6875rem] tracking-[0.22em] uppercase font-medium text-[var(--ink-faint)]">
            Producto
          </p>
          <h2 className="mt-5 font-[var(--font-display)] text-3xl leading-[1.1] tracking-tight sm:text-5xl">
            De horas de trabajo
            <br />
            <span className="text-[var(--ink-dim)]">
              a segundos de análisis.
            </span>
          </h2>
        </motion.div>

        <div
          ref={ref}
          className="mt-14 grid gap-px overflow-hidden rounded-2xl shadow-[var(--shadow-elevated)] lg:grid-cols-2"
          style={{
            backgroundImage: "var(--gradient-glass)",
            backgroundColor: "oklch(0.12 0.012 264 / 70%)",
            backdropFilter: "blur(18px)",
            border: "1px solid var(--hairline)",
          }}
        >
          <div className="relative overflow-hidden bg-[var(--background)]/50 p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
              <span className="text-[0.6875rem] tracking-[0.22em] uppercase font-medium text-[var(--ink-faint)]">
                Escrito original
              </span>
              <span className="ml-auto font-[var(--font-mono)] text-[0.6rem] text-[var(--ink-faint)]">
                18 páginas
              </span>
            </div>

            <p className="font-[var(--font-mono)] text-[0.7rem] leading-relaxed text-[var(--ink-faint)]">
              <span className="text-[var(--foreground)]/80">
                EN LO PRINCIPAL:
              </span>{" "}
              demanda en juicio ordinario del trabajo por despido
              injustificado;{" "}
              <span className="text-[var(--foreground)]/80">
                PRIMER OTROSÍ:
              </span>{" "}
              acompaña documentos;{" "}
              <span className="text-[var(--foreground)]/80">
                SEGUNDO OTROSÍ:
              </span>{" "}
              solicita forma de notificación…
            </p>

            <div className="mt-6 space-y-2.5">
              {[96, 88, 100, 72, 91, 80, 66, 94, 76, 85, 62, 90, 58].map((w, i) => (
                <motion.div
                  key={i}
                  initial={{ width: 0, opacity: 0 }}
                  animate={inView ? { width: `${w}%`, opacity: 1 } : {}}
                  transition={{ duration: 0.7, delay: i * 0.07 }}
                  className="h-1.5 rounded-full bg-[var(--foreground)]/[0.08]"
                />
              ))}
            </div>

            {inView && (
              <div className="pointer-events-none absolute inset-x-0 top-32 h-24">
                <motion.div
                  animate={{ y: ["-120%", "520%"] }}
                  transition={{
                    duration: 6,
                    ease: "easeInOut",
                    repeat: Infinity,
                  }}
                    className="anim-scanline h-24 w-full bg-gradient-to-b from-transparent via-[var(--primary)]/[0.09] to-transparent"
                />
              </div>
            )}
          </div>

          <div className="bg-white/5 p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-2">
              <motion.span
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{
                  duration: 2.4,
                  ease: "easeInOut",
                  repeat: Infinity,
                }}
                className="anim-pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--primary)]"
              />
              <span className="text-[0.6875rem] tracking-[0.22em] uppercase font-medium text-[var(--ink-faint)]">
                AI Analysis
              </span>
            </div>

            <ul className="divide-y divide-[var(--border)]">
              {EXTRACTED.map((item, i) => (
                <motion.li
                  key={item.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    duration: 0.6,
                    delay: 0.35 + i * 0.16,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="group flex items-start gap-3 py-3.5 first:pt-0"
                >
                  <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--primary)]/60 transition-transform duration-300 group-hover:translate-x-0.5" />
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                      {item.label}
                    </p>
                    <p className="mt-1 text-[0.85rem] leading-snug text-[var(--ink-dim)]">
                      {item.value}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───── FeatureShowcase ───── */

const FEATURES = [
  {
    icon: FileText,
    title: "Análisis de Documentos",
    description:
      "Sube contratos, demandas o escrituras y obtén un resumen jurídico estructurado en segundos. Sin leer 80 páginas.",
    visual: "document" as const,
    available: true,
  },
  {
    icon: Brain,
    title: "Resumen de Casos",
    description:
      "Carga los documentos del caso y la IA identifica partes, pretensiones, plazos críticos y próximos pasos procesales.",
    visual: "timeline" as const,
    available: true,
  },
  {
    icon: MessageSquare,
    title: "Chat Contextual",
    description:
      "Conversa con tu caso: haz preguntas sobre los documentos cargados y recibe respuestas con el contexto de tu expediente.",
    visual: "chat" as const,
    available: true,
  },
  {
    icon: Shield,
    title: "Workspace Privado",
    description:
      "Cada caso vive en un espacio privado con sus documentos, análisis y conversaciones, separado del resto de abogados.",
    visual: "secure" as const,
    available: true,
  },
  {
    icon: Zap,
    title: "Investigación de Jurisprudencia",
    description:
      "Búsqueda de jurisprudencia y normativa chilena. Próximamente.",
    visual: "draft" as const,
    available: false,
  },
  {
    icon: BarChart3,
    title: "Redacción Asistida",
    description:
      "Borradores de escritos y documentos jurídicos. Próximamente.",
    visual: "alerts" as const,
    available: false,
  },
];

function Visual({ kind }: { kind: string }) {
  const bar = "rounded-lg bg-[var(--foreground)]/[0.07]";

  if (kind === "document") {
    return (
      <div className="space-y-1.5">
        {[100, 80, 92].map((w, i) => (
          <div
            key={i}
            className={`h-1.5 ${bar}`}
            style={{ width: `${w}%` }}
          />
        ))}
        <div className="mt-3 flex gap-1.5">
          <span
            className="rounded-md border border-[var(--primary)]/25 px-2 py-0.5 text-[0.6rem] text-[var(--primary)]"
            style={{ backgroundColor: "var(--emerald-soft)" }}
          >
            insight
          </span>
          <span className="rounded-md border border-[var(--hairline)] px-2 py-0.5 text-[0.6rem] text-[var(--ink-faint)]">
            resumen
          </span>
        </div>
      </div>
    );
  }

  if (kind === "timeline") {
    return (
      <div className="relative pl-3.5">
        <span className="absolute left-0 top-1 bottom-1 w-px bg-gradient-to-b from-[var(--primary)]/50 to-transparent" />
        {["Demanda", "Contestación", "Audiencia"].map((s, i) => (
          <div key={s} className="mb-2 flex items-center gap-2 last:mb-0">
            <span
              className={`absolute -left-[3px] h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-[var(--primary)]" : "bg-[var(--foreground)]/25"}`}
              style={{ top: `${i * 1.55 + 0.3}rem` }}
            />
            <span className="text-[0.68rem] text-[var(--ink-faint)]">{s}</span>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "draft") {
    return (
      <div className="font-[var(--font-mono)] text-[0.65rem] leading-relaxed text-[var(--ink-faint)]">
        <span className="text-[var(--primary)]">EN LO PRINCIPAL:</span>{" "}
        interpone recurso
        <br />
        <span className="text-[var(--cyan-accent)]">PRIMER OTROSÍ:</span>{" "}
        acompaña documentos
        <motion.span
          animate={{ opacity: [1, 0.15, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="ml-0.5 inline-block h-3 w-[2px] translate-y-0.5 bg-[var(--primary)]"
        />
      </div>
    );
  }

  if (kind === "chat") {
    return (
      <div className="space-y-1.5">
        <div className="ml-auto w-fit rounded-lg rounded-br-sm border border-[var(--hairline)] px-2.5 py-1 text-[0.65rem] text-[var(--ink-faint)]">
          ¿Plazo para apelar?
        </div>
        <div
          className="w-fit rounded-lg rounded-bl-sm border border-[var(--primary)]/20 px-2.5 py-1 text-[0.65rem] text-[var(--primary)]"
          style={{ backgroundColor: "var(--emerald-soft)" }}
        >
          5 días hábiles
        </div>
      </div>
    );
  }

  if (kind === "alerts") {
    return (
      <div className="space-y-1.5">
        {[
          { l: "Vence en 2 días", c: "bg-[var(--violet-accent)]/70" },
          { l: "Vence en 9 días", c: "bg-[var(--cyan-accent)]/60" },
          { l: "Al día", c: "bg-[var(--primary)]/70" },
        ].map((a) => (
          <div key={a.l} className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${a.c}`} />
            <span className="text-[0.65rem] text-[var(--ink-faint)]">
              {a.l}
            </span>
            <span className="ml-auto h-1 w-10 rounded-full bg-[var(--foreground)]/10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 space-y-1.5">
        <div className={`h-1.5 w-full ${bar}`} />
        <div className={`h-1.5 w-2/3 ${bar}`} />
      </div>
      <div className="rounded-md border border-[var(--primary)]/25 px-2 py-1 font-[var(--font-mono)] text-[0.58rem] text-[var(--primary)]" style={{ backgroundColor: "var(--emerald-soft)" }}>
        cifrado
      </div>
    </div>
  );
}

function FeatureShowcase() {
  return (
    <section
      id="funcionalidades"
      className="relative border-t border-[var(--hairline)] py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <p className="text-[0.6875rem] tracking-[0.22em] uppercase font-medium text-[var(--ink-faint)]">
            Funcionalidades
          </p>
          <h2 className="mt-5 font-[var(--font-display)] text-3xl leading-[1.1] tracking-tight sm:text-5xl">
            Diseñado para cómo
            <br />
            <span className="text-[var(--ink-dim)]">
              trabajan los abogados.
            </span>
          </h2>
        </motion.div>

        <div
          className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-[var(--hairline)] sm:grid-cols-2 lg:grid-cols-3"
          style={{ backgroundColor: "var(--hairline)" }}
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.65,
                delay: (i % 3) * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="group relative flex flex-col gap-5 bg-[var(--background)]/60 p-7 transition-colors duration-500 hover:bg-[var(--surface)]/40"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--primary)]/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="flex items-center justify-between">
                <f.icon className="h-4.5 w-4.5 text-[var(--primary)] transition-transform duration-500 group-hover:-translate-y-0.5" />
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[0.58rem] font-medium uppercase tracking-[0.14em]",
                    f.available
                      ? "border-[var(--primary)]/30 text-[var(--primary)]"
                      : "border-[var(--hairline)] text-[var(--ink-faint)]"
                  )}
                >
                  {f.available ? "Disponible" : "Próximamente"}
                </span>
              </div>
              <div>
                <h3 className="font-[var(--font-display)] text-base font-semibold tracking-tight">
                  {f.title}
                </h3>
                <p className="mt-2 text-[0.83rem] leading-relaxed text-[var(--muted-foreground)]">
                  {f.description}
                </p>
              </div>
              <div className="mt-auto rounded-xl border border-[var(--hairline)] bg-[var(--surface)]/25 p-4">
                <Visual kind={f.visual} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───── TimeSaved ───── */

const COMPARISONS = [
  {
    label: "Análisis documental",
    before: "Lectura manual",
    after: "Estructurado",
  },
  {
    label: "Búsqueda de información",
    before: "Revisión línea por línea",
    after: "Contexto inmediato",
  },
];

function TimeSaved() {
  return (
    <section className="relative border-t border-[var(--hairline)] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-2">
              {/* <Clock className="h-3.5 w-3.5 text-[var(--primary)]" /> */}
              <span className="text-[0.6875rem] tracking-[0.22em] uppercase font-medium text-[var(--ink-faint)]">
                Impacto real
              </span>
            </div>
            <h2 className="mt-5 font-[var(--font-display)] text-3xl leading-[1.12] tracking-tight sm:text-3xl">
              Menos tiempo buscando información.
              <br />
              <span
                className="font-semibold"
                style={{
                  backgroundImage: "var(--gradient-headline)",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Más tiempo tomando decisiones.
              </span>
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-[var(--muted-foreground)]">
              LegalUp AI organiza rápidamente la información relevante de tus
              documentos para ayudarte a concentrarte en el análisis jurídico.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            {COMPARISONS.map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  duration: 0.75,
                  delay: i * 0.14,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="group relative overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--surface)]/25 p-7 transition-all duration-500 hover:-translate-y-1 hover:border-[var(--primary)]/25"
              >
                <div className="pointer-events-none absolute -bottom-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[var(--emerald-accent)]/[0.09] blur-[70px] opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

                <p className="text-[0.6875rem] tracking-[0.22em] uppercase font-medium text-[var(--ink-faint)]">
                  {c.label}
                </p>

                <div className="mt-7">
                  <p className="text-[0.6rem] uppercase tracking-[0.22em] text-[var(--ink-faint)]">
                    Antes
                  </p>
                  <p className="mt-1 font-[var(--font-display)] text-xl font-semibold tracking-tight text-[var(--muted-foreground)] line-through decoration-[var(--destructive)]/40 decoration-1">
                    {c.before}
                  </p>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.35 + i * 0.14 }}
                  className="my-4 flex items-center gap-2"
                >
                  <ArrowDown className="h-3.5 w-3.5 text-[var(--primary)]/70" />
                  <span className="h-px flex-1 bg-gradient-to-r from-[var(--primary)]/40 to-transparent" />
                </motion.div>

                <div>
                  <p className="text-[0.6rem] uppercase tracking-[0.22em] text-[var(--primary)]/70">
                    Ahora
                  </p>
                  <p
                    className="mt-1 font-[var(--font-display)] text-2xl font-bold tracking-tight"
                    style={{
                      backgroundImage: "var(--gradient-headline)",
                      backgroundClip: "text",
                      color: "transparent",
                    }}
                  >
                    {c.after}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───── SecuritySection ───── */

const PILLARS = [
  {
    icon: EyeOff,
    label: "Confidencialidad",
    copy: "Tus documentos viven en tu workspace y no se comparten entre abogados.",
  },
  {
    icon: Lock,
    label: "Privacidad",
    copy: "Cada caso y sus documentos se mantienen separados dentro de tu espacio de trabajo.",
  },
  {
    icon: SlidersHorizontal,
    label: "Control",
    copy: "Tú decides qué subes, qué conservas y qué eliminas, cuando quieras.",
  },
  {
    icon: ShieldCheck,
    label: "Control de acceso",
    copy: "Cada abogado accede únicamente a sus propios casos y documentos.",
  },
];

function SecuritySection() {
  return (
    <section
      id="seguridad"
      className="relative border-t border-[var(--hairline)] py-24 sm:py-32"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-10 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-[var(--violet-accent)]/[0.06] blur-[140px]" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <p className="text-[0.6875rem] tracking-[0.22em] uppercase font-medium text-[var(--ink-faint)]">
            Seguridad
          </p>
          <h2 className="mt-5 font-[var(--font-display)] text-3xl leading-[1.1] tracking-tight sm:text-5xl">
            Tus documentos
            <br />
            <span className="text-[var(--ink-dim)]">son tuyos.</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[var(--muted-foreground)]">
            Tus documentos están asociados a tu workspace y protegidos mediante
            controles de acceso, para que cada abogado pueda acceder únicamente
            a sus propios casos y documentos.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.7,
                delay: i * 0.09,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="group relative overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--surface)]/25 p-6 transition-all duration-500 hover:-translate-y-1 hover:border-[var(--primary)]/25"
            >
              <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--hairline)] bg-[var(--background)]/60">
                <p.icon className="h-4 w-4 text-[var(--primary)]" />
              </div>
              <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--foreground)]">
                {p.label}
              </h3>
              <p className="mt-3 text-[0.82rem] leading-relaxed text-[var(--muted-foreground)]">
                {p.copy}
              </p>
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, delay: 0.3 + i * 0.09 }}
                className="mt-6 h-px origin-left bg-gradient-to-r from-[var(--primary)]/40 to-transparent"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───── PricingSection ───── */

function PricingSection({
  ctaLabel = "Probar gratis 5 días",
  onStart,
  loading,
}: {
  ctaLabel?: string;
  onStart: () => void;
  loading: boolean;
}) {
  const PRICING_FEATURES = [
    "Workspace privado por caso",
    "Análisis de documentos con IA",
    "Análisis de riesgos y obligaciones",
    "Chat contextual con tus documentos",
    "Sin permanencia",
  ];

  return (
    <section className="relative border-t border-[var(--hairline)] py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-10 h-[26rem] w-[40rem] -translate-x-1/2 rounded-full bg-[var(--emerald-accent)]/[0.08] blur-[150px]" />
      </div>

      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <p className="text-[0.6875rem] tracking-[0.22em] uppercase font-medium text-[var(--ink-faint)]">
            Planes
          </p>
          <h2 className="mt-5 font-[var(--font-display)] text-3xl leading-[1.1] tracking-tight sm:text-5xl">
            Un plan simple,
            <br />
            <span className="text-[var(--ink-dim)]">pensado para tu práctica.</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative mt-14 overflow-hidden rounded-2xl border border-[var(--primary)]/30 p-8 sm:p-12"
          style={{
            backgroundImage: "var(--gradient-glass)",
            backgroundColor: "oklch(0.12 0.012 264 / 70%)",
            backdropFilter: "blur(18px)",
            boxShadow: "var(--shadow-glow)",
          }}
        >
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--emerald-accent)]/[0.09] blur-[90px]"
          />

          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-[var(--font-display)] text-2xl font-bold tracking-tight">
                  LegalUp AI Pro
                </h3>
                <span
                  className="rounded-full border border-[var(--primary)]/40 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]"
                  style={{ backgroundColor: "var(--emerald-soft)" }}
                >
                  5 días gratis
                </span>
              </div>
              <p className="mt-5 flex items-baseline gap-2">
                <span className="font-[var(--font-display)] text-5xl font-bold tracking-tight">
                  $49.900
                </span>
                <span className="text-[var(--muted-foreground)]">CLP/mes</span>
              </p>
            </div>

            <div className="w-full sm:w-auto">
              <ul className="space-y-3">
                {PRICING_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-[var(--ink-dim)]">
                    <Check className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10">
            <Button variant="glow" size="xl" onClick={onStart} disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          <p className="mt-4 text-xs text-[var(--muted-foreground)]">
            Sin tarjeta · $49.900 CLP/mes después del trial
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* ───── Main: LegalUpAI ───── */

function LegalUpAI() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [headerHasBackground, setHeaderHasBackground] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [headerFixed, setHeaderFixed] = useState(true);
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const aiSub = useAISubscription();
  const startTrial = useStartAITrial();

  // Misma regla que usa el guard existente /lawyer/* (RequireLawyer): el rol
  // real del usuario vive en user_metadata y/o en el perfil.
  const isLawyer =
    user?.role === "lawyer" ||
    user?.user_metadata?.role === "lawyer" ||
    user?.profile?.role === "lawyer";

  // Usuario autenticado sin perfil de abogado → completar el perfil antes del trial.
  const needsProfile = !!user && !isLawyer;
  const canResume = aiSub.status === "cancelled" || aiSub.status === "past_due";

  // El estado real lo decide el backend (useAISubscription); aquí solo se elige copy/CTA.
  const ctaLabel = needsProfile
    ? "Completar perfil"
    : canResume
      ? "Reanudar LegalUp AI"
      : aiSub.isActive
        ? "Abrir LegalUp AI"
        : aiSub.hasAccess
          ? "Ir a LegalUp AI"
          : "Probar gratis 5 días";
  const headerCtaLabel = needsProfile
    ? "Completar perfil"
    : canResume
      ? "Reanudar"
      : aiSub.isActive
        ? "Abrir LegalUp AI"
        : aiSub.hasAccess
          ? "Ir a LegalUp AI"
          : "Probar gratis";

  const trackCta = (location: string) => {
    try {
      posthog.capture("ai_landing_cta_clicked", { cta_location: location });
    } catch {
      /* noop */
    }
  };

  const handleCompleteProfile = () => {
    // Intención para que, al volver de crear el perfil, la landing continúe el trial.
    try {
      localStorage.setItem("aiPendingTrial", "1");
    } catch {
      /* noop */
    }
    navigate("/lawyer/onboarding?from=ai");
  };

  const startTrialFlow = async () => {
    setTrialLoading(true);
    try {
      await startTrial.mutateAsync();
      navigate("/lawyer/ai");
    } catch (err) {
      const msg =
        err instanceof Error && err.message ? err.message : "";
      // TRIAL_ALREADY_USED → no crear otro trial; mostrar el flujo de suscripción.
      if (msg.includes("Ya utilizaste tu prueba gratuita")) {
        toast.info(
          "Tu prueba gratuita ya fue utilizada. Continúa con LegalUp AI Pro por $49.900 CLP/mes."
        );
        setShowPricingModal(true);
      } else {
        toast.info(msg || "No se pudo iniciar la prueba gratuita.");
        navigate("/lawyer/ai");
      }
    } finally {
      setTrialLoading(false);
    }
  };

  const handleStartTrial = (location: string) => {
    trackCta(location);
    if (!user) {
      // FLUJO 1: visitante no autenticado → AuthModal existente.
      setAuthMode("signup");
      setShowAuthModal(true);
      return;
    }
    if (!isLawyer) {
      // FLUJO 2: autenticado sin perfil de abogado → crear/completar perfil.
      handleCompleteProfile();
      return;
    }
    if (canResume) {
      // FLUJO 7: cancelada/pendiente → reanudar con el checkout real de Mercado Pago.
      setShowPricingModal(true);
      return;
    }
    // FLUJOS 3/4/5/6: abogado → trial directo o, si ya accede, al workspace.
    if (aiSub.hasAccess) {
      navigate("/lawyer/ai");
      return;
    }
    startTrialFlow();
  };

  // Continuación tras autenticarse desde la landing.
  const [pendingFlow, setPendingFlow] = useState(false);
  const handleAuthModalClose = () => {
    setShowAuthModal(false);
    setPendingFlow(true);
  };
  useEffect(() => {
    if (!pendingFlow || authLoading || !user) return;
    setPendingFlow(false);
    if (!isLawyer) {
      handleCompleteProfile();
      return;
    }
    if (canResume) {
      setShowPricingModal(true);
      return;
    }
    if (aiSub.hasAccess) {
      navigate("/lawyer/ai");
      return;
    }
    startTrialFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFlow, user, authLoading, isLawyer, canResume, aiSub.hasAccess]);

  // Continuación al volver de crear el perfil de abogado (onboarding ?from=ai).
  useEffect(() => {
    if (authLoading || !user || !isLawyer) return;
    let pending = false;
    try {
      pending = localStorage.getItem("aiPendingTrial") === "1";
    } catch {
      /* noop */
    }
    if (!pending) return;
    try {
      localStorage.removeItem("aiPendingTrial");
    } catch {
      /* noop */
    }
    if (canResume) {
      setShowPricingModal(true);
      return;
    }
    if (aiSub.hasAccess) {
      navigate("/lawyer/ai");
      return;
    }
    startTrialFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, isLawyer, canResume, aiSub.hasAccess]);

  useEffect(() => {
    const rootEl = document.documentElement;
    const dark = "#0a0d12";
    rootEl.style.backgroundColor = dark;
    document.body.style.backgroundColor = dark;
    return () => {
      rootEl.style.backgroundColor = "";
      document.body.style.backgroundColor = "";
    };
  }, []);

  useEffect(() => {
    const style = pushStandaloneCss();
    return () => {
      style.remove();
    };
  }, []);

  useEffect(() => {
    // Se dispara una vez al ver la landing.
    try {
      posthog.capture("ai_landing_viewed");
    } catch {
      /* analytics no debe romper la landing */
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setHeaderHasBackground(scrollY > 8);
      // El header queda siempre fijo y visible en la parte superior.
      setHeaderFixed(true);
      setHeaderVisible(true);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToCapabilities = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById("capacidades");
    if (!element) return;
    const top =
      element.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div
      id="top"
      className="legalup-landing min-h-screen"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <Toaster />
      <Helmet>
        <title>LegalUp AI | Inteligencia artificial para abogados en Chile</title>
        <meta
          name="description"
          content="Analiza documentos jurídicos, identifica riesgos y conversa con tus casos usando LegalUp AI. Prueba gratis durante 5 días."
        />
      </Helmet>
      <Header
        hasBackground={headerHasBackground}
        visible={headerVisible}
        fixed={headerFixed}
        onAuthClick={() => {
          setAuthMode("login");
          setShowAuthModal(true);
        }}
        onCtaClick={() => handleStartTrial("header")}
        ctaLabel={headerCtaLabel}
      />

      {/* HERO */}
      <section className="relative overflow-hidden pb-24 pt-32 sm:pb-32 sm:pt-40">
        {/* <AnimatedBackground /> */}
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2.5 rounded-full border border-[var(--hairline)] bg-[var(--surface)]/30 px-4 py-1.5 backdrop-blur-md"
            >
              <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
              <span className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[var(--ink-dim)]">
                LegalUp AI · Disponible ahora
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 text-[3rem] font-[var(--font-display)] leading-[0.98] tracking-[-0.035em] sm:text-7xl"
            >
              <span className="block">Inteligencia Jurídica</span>
              <span className="mt-2 block text-[var(--ink-dim)]">
                para trabajar tus casos
              </span>
              <span className="mt-2 block text-[var(--ink-dim)]">
                a una nueva{" "}
                <span
                  className=" "
                  style={{
                    backgroundImage: "var(--gradient-headline)",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                > velocidad
                </span>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto mt-8 text-base leading-relaxed sm:text-lg"
              style={{ color: "var(--muted-foreground)" }}
            >
              Analiza documentos jurídicos, identifica riesgos y conversa con
              una IA sobre tus casos desde un workspace privado.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Button
                variant="glow"
                size="xl"
                className="w-full sm:w-auto !text-md"
                onClick={() => handleStartTrial("hero")}
                disabled={trialLoading}
              >
                {trialLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              <a
                href="#capacidades"
                onClick={scrollToCapabilities}
                className="w-full sm:w-auto text-md"
              >
                <Button variant="quiet" size="xl" className="w-full sm:w-auto !text-md">
                  Ver cómo funciona
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </a>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="mt-5 text-xs tracking-wide text-[var(--muted-foreground)]"
            >
              5 días gratis · Sin tarjeta · Después $49.900 CLP/mes
            </motion.p>
          </div>

          <div className="mt-16 sm:mt-24">
            <AIWorkspace />
          </div>
        </div>
      </section>

      <AICapabilities />
      <ProductDemo />
      <FeatureShowcase />
      <TimeSaved />
      <SecuritySection />

      {/* PRICING */}
      <PricingSection
        ctaLabel={ctaLabel}
        onStart={() => {
          try { posthog.capture("ai_landing_pricing_viewed"); } catch { /* noop */ }
          handleStartTrial("pricing");
        }}
        loading={trialLoading}
      />

      {/* FINAL CTA */}
      <section className="relative border-t border-[var(--hairline)] py-24 text-center sm:py-28">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[24rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--emerald-accent)]/[0.06] blur-[140px]" />
        </div>
        <div className="mx-auto max-w-2xl px-5">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="font-[var(--font-display)] text-3xl tracking-tight sm:text-5xl">
              Tu próximo caso puede empezar aquí.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[var(--muted-foreground)]">
              {needsProfile
                ? "Antes de comenzar tu prueba gratuita, necesitamos completar tu perfil de abogado."
                : "Prueba LegalUp AI gratis durante 5 días."}
            </p>
            <div className="mt-9">
              <Button
                variant="glow"
                size="xl"
                onClick={() => {
                  try { posthog.capture("ai_landing_final_cta_clicked", { cta_location: "final_cta" }); } catch { /* noop */ }
                  handleStartTrial("final_cta");
                }}
                disabled={trialLoading}
              >
                {trialLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
            <p className="mt-4 text-xs text-[var(--muted-foreground)]">
              Sin tarjeta · $49.900 CLP/mes después del trial
            </p>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-[var(--hairline)] py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 sm:flex-row sm:px-8">
          <div className="flex items-center gap-1.5">
            <Scale className="h-4 w-4 text-[var(--foreground)]" strokeWidth={2.5} />
            <span className="font-[var(--font-display)] text-[0.8rem] font-extrabold tracking-tight">
              LegalUp
            </span>
            <span className="rounded-[5px] border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-1.5 py-px text-[0.55rem] font-semibold tracking-[0.14em] text-[var(--primary)]">
              AI
            </span>
          </div>
          <p className="text-xs text-[var(--ink-faint)]">
            Inteligencia jurídica para el derecho chileno · Ley 21.719
          </p>
        </div>
      </footer>

      <AIPricingModal open={showPricingModal} onOpenChange={setShowPricingModal} />

      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
        mode={authMode}
        onModeChange={setAuthMode}
        aiLanding
      />
    </div>
  );
}

export default LegalUpAI;