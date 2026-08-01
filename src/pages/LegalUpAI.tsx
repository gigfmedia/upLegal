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

import { useState, useEffect, useRef, type FormEvent } from "react";
import { createPortal } from "react-dom";
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
  Send,
  ShieldCheck,
  ArrowLeft,
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
  Mail,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { createClient, type User, type Session } from "@supabase/supabase-js";
import "../legalup-standalone.css";

/* ───── cn utility ───── */

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ───── Supabase ───── */

const _supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const _supabaseKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
const supabase =
  _supabaseUrl && _supabaseKey
    ? createClient(_supabaseUrl, _supabaseKey)
    : null;

/* ───── useAuth ───── */

function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
      }
    );
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  const signOut = () => supabase?.auth.signOut();

  return { user, session, loading, signOut };
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

/* ───── Dialog (simple portal modal) ───── */

function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/80"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>,
    document.body
  );
}

function DialogContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--hairline)] bg-[var(--surface)]/90 p-8 shadow-lg backdrop-blur-xl",
        "bg-[var(--gradient-glass)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function DialogHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2 text-left", className)}>{children}</div>
  );
}

function DialogTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      className={cn(
        "font-[var(--font-display)] text-2xl tracking-tight",
        className
      )}
    >
      {children}
    </h2>
  );
}

function DialogDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={cn("text-sm text-[var(--muted-foreground)]", className)}>
      {children}
    </p>
  );
}

/* ───── AuthModal ───── */

function AuthModal({
  isOpen,
  onClose,
  initialMode = "login",
}: {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Sesión iniciada");
        onClose();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Revisa tu correo para confirmarla.");
        onClose();
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No pudimos completar la acción"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 cursor-pointer"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Cerrar</span>
        </button>
        <DialogHeader>
          <p className="text-[0.6875rem] tracking-[0.22em] uppercase font-medium text-[var(--ink-faint)]">
            LegalUp AI
          </p>
          <DialogTitle>
            {mode === "login" ? "Ingresa a tu cuenta" : "Crea tu cuenta"}
          </DialogTitle>
          <DialogDescription>
            Accede a tu espacio de inteligencia jurídica.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-[0.6875rem] tracking-[0.22em] uppercase font-medium text-[var(--ink-faint)]">
              Correo
            </span>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-[var(--input)] bg-[var(--background)]/60 px-4 py-3 transition-colors focus-within:border-[var(--primary)]/60">
              <Mail className="h-4 w-4 text-[var(--muted-foreground)]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@estudio.cl"
                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[0.6875rem] tracking-[0.22em] uppercase font-medium text-[var(--ink-faint)]">
              Contraseña
            </span>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-[var(--input)] bg-[var(--background)]/60 px-4 py-3 transition-colors focus-within:border-[var(--primary)]/60">
              <Lock className="h-4 w-4 text-[var(--muted-foreground)]" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
              />
            </div>
          </label>

          <Button
            type="submit"
            variant="glow"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {mode === "login" ? "Ingresar" : "Crear cuenta"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-2 w-full text-center text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] cursor-pointer"
        >
          {mode === "login"
            ? "¿No tienes cuenta? Crear una"
            : "¿Ya tienes cuenta? Iniciar sesión"}
        </button>
      </DialogContent>
    </Dialog>
  );
}

/* ───── Header ───── */

const NAV_ITEMS = [
  { label: "Producto", href: "#producto" },
  { label: "Cómo funciona", href: "#capacidades" },
  { label: "Seguridad", href: "#seguridad" },
];

function Header({
  hasBackground = false,
  visible = true,
  fixed = true,
  onAuthClick,
  onCtaClick,
}: {
  hasBackground?: boolean;
  visible?: boolean;
  fixed?: boolean;
  onAuthClick?: () => void;
  onCtaClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
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
          {/* <button
            type="button"
            onClick={onAuthClick}
            className="hidden text-[0.8rem] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] sm:block cursor-pointer"
          >
            Ingresar
          </button> */}
          <a href="#waitlist" onClick={onCtaClick}>
            <Button variant="quiet" size="sm" className="h-9 rounded-lg px-4">
              Solicitar acceso
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </a>
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
    title: "Analizar",
    copy: "Documentos, contratos y expedientes.",
    detail:
      "Sube un archivo y obtén estructura, partes, cláusulas críticas y hallazgos en segundos.",
  },
  {
    id: "02",
    title: "Entender",
    copy: "Causas, argumentos, partes y plazos.",
  },
  {
    id: "03",
    title: "Investigar",
    copy: "Jurisprudencia y normativa chilena.",
  },
  {
    id: "04",
    title: "Redactar",
    copy: "Escritos, informes y documentos jurídicos.",
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
  },
  {
    icon: Brain,
    title: "Resumen de Causas",
    description:
      "Pega el expediente y la IA identifica partes, pretensiones, plazos críticos y próximos pasos procesales.",
    visual: "timeline" as const,
  },
  {
    icon: Zap,
    title: "Redacción Asistida",
    description:
      "Genera borradores de escritos, recursos y cartas en el estilo del derecho chileno. Tú revisas y firmas.",
    visual: "draft" as const,
  },
  {
    icon: MessageSquare,
    title: "Consultas Instantáneas",
    description:
      "Pregunta sobre jurisprudencia, plazos o procedimientos. Respuestas basadas en el ordenamiento jurídico chileno.",
    visual: "chat" as const,
  },
  {
    icon: BarChart3,
    title: "Dashboard de Causas",
    description:
      "Centraliza todos tus expedientes con alertas automáticas de vencimiento y seguimiento del estado procesal.",
    visual: "alerts" as const,
  },
  {
    icon: Shield,
    title: "100% Confidencial",
    description:
      "Tus datos y los de tus clientes nunca se usan para entrenar modelos. Cumplimos con la ley de protección de datos (Ley 21.719).",
    visual: "secure" as const,
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
              <f.icon className="h-4.5 w-4.5 text-[var(--primary)] transition-transform duration-500 group-hover:-translate-y-0.5" />
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
  { label: "Análisis documental", before: "45 min", after: "2 min" },
  { label: "Primer borrador", before: "2 horas", after: "15 min" },
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
            <h2 className="mt-5 font-[var(--font-display)] text-3xl leading-[1.12] tracking-tight sm:text-4xl">
              Los abogados dedican hasta{" "}
              <span
                className="font-semibold"
                style={{
                  backgroundImage: "var(--gradient-headline)",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                40%
              </span>{" "}
              de su tiempo a trabajo administrativo
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-[var(--muted-foreground)]">
              Leer documentos, redactar escritos repetitivos y resumir
              expedientes. LegalUp AI automatiza esas tareas para que te
              concentres en el trabajo de alto valor.
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
                  <p className="mt-1 font-[var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--muted-foreground)] line-through decoration-[var(--destructive)]/40 decoration-1">
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
                    className="mt-1 font-[var(--font-display)] text-5xl font-bold tracking-tight"
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
    copy: "Tus documentos y los de tus clientes no se usan para entrenar modelos.",
  },
  {
    icon: Lock,
    label: "Privacidad",
    copy: "Cada consulta se procesa de forma aislada dentro de tu espacio de trabajo.",
  },
  {
    icon: SlidersHorizontal,
    label: "Control",
    copy: "Tú decides qué subes, qué conservas y qué eliminas, cuando quieras.",
  },
  {
    icon: ShieldCheck,
    label: "Seguridad",
    copy: "Cumplimos con la ley de protección de datos personales (Ley 21.719).",
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
            El secreto profesional no es negociable. LegalUp AI está construido
            para que la información de tus causas nunca salga de tu control.
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

/* ───── WaitlistForm ───── */

interface WaitlistFormState {
  area: string;
  timeOnDocs: string;
  usesChatGPT: string;
  biggestTask: string;
  email: string;
}

const CHATGPT_OPTIONS = ["Sí, regularmente", "Lo he probado", "No, nunca"];

const STEPS = [
  {
    key: "area" as const,
    question: "¿En qué área del derecho ejerces principalmente?",
  },
  {
    key: "timeOnDocs" as const,
    question:
      "¿Cuánto tiempo dedicas a leer/resumir documentos por día?",
  },
  {
    key: "usesChatGPT" as const,
    question:
      "¿Usas actualmente ChatGPT u otra IA para tu trabajo legal?",
  },
  {
    key: "biggestTask" as const,
    question: "¿Qué tarea te consume más tiempo actualmente?",
  },
  {
    key: "email" as const,
    question: "¿A qué correo enviamos tu acceso?",
  },
];

function WaitlistForm({
  form,
  setForm,
  loading,
  submitted,
  onSubmit,
  areas,
  timeOptions,
  tasks,
}: {
  form: WaitlistFormState;
  setForm: React.Dispatch<React.SetStateAction<WaitlistFormState>>;
  loading: boolean;
  submitted: boolean;
  onSubmit: (e: React.FormEvent) => void;
  areas: string[];
  timeOptions: string[];
  tasks: string[];
}) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const currentValue = form[current.key];
  const canAdvance =
    current.key === "email" ? Boolean(form.email) : Boolean(currentValue);

  const optionClass = (active: boolean) =>
    [
      "w-full rounded-xl border px-4 py-3.5 text-left text-sm transition-all duration-300",
      active
        ? "border-[var(--primary)]/50 text-[var(--foreground)] shadow-[var(--shadow-glow)]"
        : "border-[var(--hairline)] bg-[var(--surface)]/25 text-[var(--ink-dim)] hover:-translate-y-0.5 hover:border-[var(--primary)]/25 hover:bg-[var(--surface)]/50",
    ].join(" ");

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl p-10 text-center sm:p-14"
        style={{
          backgroundImage: "var(--gradient-glass)",
          backgroundColor: "oklch(0.12 0.012 264 / 70%)",
          backdropFilter: "blur(18px)",
          border: "1px solid var(--hairline)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 -top-24 h-64"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 0%, oklch(0.78 0.16 163 / 16%) 0%, transparent 70%)",
          }}
        />
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--primary)]/30"
          style={{ backgroundColor: "var(--emerald-soft)" }}
        >
          <Check className="h-7 w-7 text-[var(--primary)]" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, letterSpacing: "0.5em" }}
          animate={{ opacity: 1, letterSpacing: "0.3em" }}
          transition={{ duration: 1, delay: 0.35 }}
          className="mt-8 font-[var(--font-display)] text-xl font-bold text-[var(--primary)] sm:text-2xl"
        >
          Acceso anticipado confirmado
        </motion.p>

        <p className="mx-auto mt-5 max-w-md text-base text-[var(--ink-dim)]">
          Ya estás en la lista de LegalUp AI.
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--muted-foreground)]">
          Serás de los primeros abogados en Chile en conocer y probar la nueva generación de inteligencia artificial para el trabajo legal.
          Te avisaremos cuando abramos el acceso anticipado.
        </p>

        <div className="mt-9">
          <Button
            variant="quiet"
            size="lg"
            onClick={() =>
              document
                .getElementById("top")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Volver al inicio
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 sm:p-10"
      style={{
        backgroundImage: "var(--gradient-glass)",
        backgroundColor: "oklch(0.12 0.012 264 / 70%)",
        backdropFilter: "blur(18px)",
        border: "1px solid var(--hairline)",
      }}
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--emerald-accent)]/[0.07] blur-[90px]" />

      <div className="mb-9 flex items-center gap-3">
        <div className="flex flex-1 gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className="h-[3px] flex-1 overflow-hidden rounded-full bg-[var(--foreground)]/10"
            >
              <motion.div
                initial={false}
                animate={{ scaleX: i <= step ? 1 : 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="h-full origin-left bg-[var(--primary)]"
              />
            </div>
          ))}
        </div>
        <span className="font-[var(--font-mono)] text-[0.65rem] text-[var(--ink-faint)]">
          {String(step + 1).padStart(2, "0")}/
          {String(STEPS.length).padStart(2, "0")}
        </span>
      </div>

      <form onSubmit={onSubmit} className="space-y-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
          >
            <h3 className="font-[var(--font-display)] text-xl leading-snug tracking-tight sm:text-2xl">
              {current.question}
            </h3>

            {current.key === "area" && (
              <div className="grid gap-2 sm:grid-cols-2">
                {areas.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, area: a }))
                    }
                    className={optionClass(form.area === a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
            )}

            {current.key === "timeOnDocs" && (
              <div className="grid gap-2 sm:grid-cols-2">
                {timeOptions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, timeOnDocs: t }))
                    }
                    className={optionClass(form.timeOnDocs === t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {current.key === "usesChatGPT" && (
              <div className="grid gap-2 sm:grid-cols-3">
                {CHATGPT_OPTIONS.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, usesChatGPT: o }))
                    }
                    className={optionClass(form.usesChatGPT === o)}
                  >
                    {o}
                  </button>
                ))}
              </div>
            )}

            {current.key === "biggestTask" && (
              <div className="space-y-2">
                {tasks.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, biggestTask: t }))
                    }
                    className={`${optionClass(form.biggestTask === t)} flex items-center gap-3`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${form.biggestTask === t ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[var(--input)]"}`}
                    >
                      {form.biggestTask === t && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary-foreground)]" />
                      )}
                    </span>
                    {t}
                  </button>
                ))}
              </div>
            )}

            {current.key === "email" && (
              <div className="space-y-4">
                <input
                  type="email"
                  required
                  autoFocus
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="juan@estudio.cl"
                  className="w-full rounded-xl border border-[var(--input)] bg-[var(--background)]/50 px-4 py-4 text-base outline-none transition-colors placeholder:text-[var(--ink-faint)] focus:border-[var(--primary)]/50 focus:ring-1 focus:ring-[var(--ring)]"
                />
                <p className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--primary)]/70" />
                  Sin spam. Solo te contactamos cuando estemos listos para darte
                  acceso.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-3 pt-2">
          {step > 0 && (
            <Button
              type="button"
              variant="quiet"
              size="lg"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="px-4"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Atrás</span>
            </Button>
          )}

          {isLast ? (
            <Button
              type="submit"
              variant="glow"
              size="xl"
              disabled={loading || !form.email || !form.area}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Solicitar acceso
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              variant="glow"
              size="xl"
              disabled={!canAdvance}
              onClick={() =>
                setStep((s) => Math.min(STEPS.length - 1, s + 1))
              }
              className="flex-1"
            >
              Continuar
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

/* ───── Main: LegalUpAI ───── */

const AREAS = [
  "Derecho Laboral",
  "Derecho de Familia",
  "Derecho Civil",
  "Derecho Penal",
  "Derecho Comercial",
  "Otra área",
];

const TIME_OPTIONS = [
  "Menos de 1 hora diaria",
  "1-2 horas diarias",
  "3-4 horas diarias",
  "Más de 4 horas diarias",
];

const TASKS = [
  "Leer y resumir documentos",
  "Redactar escritos y recursos",
  "Investigar jurisprudencia",
  "Gestionar plazos y causas",
  "Preparar informes para clientes",
];

function LegalUpAI() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [headerHasBackground, setHeaderHasBackground] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [headerFixed, setHeaderFixed] = useState(true);
  const { user } = useAuth();
  const [form, setForm] = useState<WaitlistFormState>({
    area: "",
    timeOnDocs: "",
    usesChatGPT: "",
    biggestTask: "",
    email: "",
  });

  useEffect(() => {
    if (user?.email && !form.email) {
      setForm((prev) => ({ ...prev, email: user.email as string }));
    }
  }, [user?.email]);

  useEffect(() => {
    let lastScrollY = 0;
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setHeaderHasBackground(scrollY > 8);
      const isScrollingUp = scrollY < lastScrollY;
      setHeaderFixed(isScrollingUp || scrollY < 50);
      setHeaderVisible(!(scrollY > lastScrollY && scrollY > 120));
      lastScrollY = scrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.area) return;
    setLoading(true);
    try {
      if (supabase) {
        const { error } = await supabase.from("ai_waitlist").insert([
          {
            email: form.email,
            legal_area: form.area,
            time_on_docs: form.timeOnDocs,
            uses_chatgpt: form.usesChatGPT,
            biggest_task: form.biggestTask,
            created_at: new Date().toISOString(),
          },
        ]);
        if (error) {
          console.error("Waitlist insert error:", error);
          console.log("Waitlist Lead Data:", form);
        }
      } else {
        console.log("Supabase not configured. Lead data:", form);
      }
      window.gtag?.("event", "legalup_ai_waitlist_signup", {
        area: form.area,
        uses_chatgpt: form.usesChatGPT,
      });
      setSubmitted(true);
      toast.success("¡Te has registrado con éxito!");
    } catch (err) {
      console.error("Submission error:", err);
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
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      window.gtag?.("event", "legalup_ai_hero_cta_click");
    }
  };

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
      className="min-h-screen"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <Toaster />
      <Header
        hasBackground={headerHasBackground}
        visible={headerVisible}
        fixed={headerFixed}
        onAuthClick={() => setShowAuthModal(true)}
        onCtaClick={scrollToWaitlist}
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
                Acceso anticipado · LegalUp AI
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 text-[3rem] font-[var(--font-display)] leading-[0.98] tracking-[-0.035em] sm:text-8xl"
            >
              <span className="block">Inteligencia Jurídica</span>
              <span className="mt-2 block text-[var(--ink-dim)]">
                A una nueva {" "}
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
              Analiza documentos, entiende causas, investiga y redacta con IA diseñada para el derecho chileno
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <a
                href="#waitlist"
                onClick={scrollToWaitlist}
                className="w-full sm:w-auto text-md"
              >
                <Button variant="glow" size="xl" className="w-full sm:w-auto !text-md">
                  Solicitar acceso anticipado
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
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

      {/* WAITLIST */}
      <section
        id="waitlist"
        className="relative overflow-hidden border-t border-[var(--hairline)] py-24 sm:py-32"
      >
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
          <div className="absolute left-1/2 top-0 h-[30rem] w-[46rem] -translate-x-1/2 rounded-full bg-[var(--emerald-accent)]/[0.08] blur-[150px]" />
          <div
            className="absolute inset-0 opacity-[0.03] mix-blend-soft-light"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
            }}
          />
        </div>

        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          {!submitted && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="mb-12 text-center"
            >
              <p className="text-[0.6875rem] tracking-[0.22em] uppercase font-medium text-[var(--ink-faint)]">
                Configura tu experiencia LegalUp AI
              </p>
              <h2 className="mt-5 font-[var(--font-display)] text-3xl leading-[1.1] tracking-tight sm:text-5xl">
                Construyamos el futuro
                <br />
                <span className="text-[var(--ink-dim)]">
                  del trabajo legal.
                </span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base text-[var(--muted-foreground)]">
                Estamos seleccionando a los primeros abogados que probarán
                LegalUp AI.
              </p>
            </motion.div>
          )}

          <WaitlistForm
            form={form}
            setForm={setForm}
            loading={loading}
            submitted={submitted}
            onSubmit={handleSubmit}
            areas={AREAS}
            timeOptions={TIME_OPTIONS}
            tasks={TASKS}
          />
        </div>
      </section>

      {/* BOTTOM CTA */}
      {!submitted && (
        <section className="relative border-t border-[var(--hairline)] py-20 text-center">
          <div className="mx-auto max-w-2xl px-5">
            <h2 className="font-[var(--font-display)] text-2xl tracking-tight sm:text-3xl">
              La nueva era del trabajo legal
            </h2>
            <p className="mt-4 text-[var(--muted-foreground)]">
              Únete a los primeros abogados en usar IA diseñada para el derecho
              chileno.
            </p>
            <div className="mt-8">
              <a href="#waitlist" onClick={scrollToWaitlist}>
                <Button variant="glow" size="lg">
                  Unirme a la lista de espera
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </section>
      )}

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

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
      />
    </div>
  );
}

export default LegalUpAI;