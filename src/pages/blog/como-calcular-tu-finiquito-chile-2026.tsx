import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, MessageSquare } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import CategoryCTA from "@/components/blog/CategoryCTA";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import InArticleCTA from "@/components/blog/InArticleCTA";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

// ─── helpers ───────────────────────────────────────────────────────────────
const formatClp = (n: number) =>
  Number.isFinite(n) && n >= 0
    ? Math.round(n).toLocaleString("es-CL")
    : "—";

type Causal = "necesidades" | "renuncia" | "mutuo" | "otra";

interface FiniquitoResult {
  indemnizacion: number;
  mesAviso: number;
  vacaciones: number;
  total: number;
  tieneIndemnizacion: boolean;
  tieneMesAviso: boolean;
}

function calcularFiniquito(
  sueldo: number,
  anos: number,
  mesesExtra: number,
  causal: Causal,
  sinAviso: boolean
): FiniquitoResult {
  const anosTotal = anos + mesesExtra / 12;
  const anosRedondeados = Math.min(Math.floor(anosTotal), 11); // tope legal 11 años

  const tieneIndemnizacion =
    causal === "necesidades" || causal === "otra";
  const tieneMesAviso = sinAviso && tieneIndemnizacion;

  const indemnizacion = tieneIndemnizacion
    ? sueldo * anosRedondeados
    : 0;
  const mesAviso = tieneMesAviso ? sueldo : 0;

  // vacaciones proporcionales: 15 días hábiles / 12 meses × meses trabajados en el año
  const mesesEnAnio = mesesExtra === 0 ? 12 : mesesExtra;
  const diasVacaciones = (15 / 12) * mesesEnAnio;
  const vacaciones = (sueldo / 30) * diasVacaciones;

  const total = indemnizacion + mesAviso + vacaciones;

  return {
    indemnizacion,
    mesAviso,
    vacaciones,
    total,
    tieneIndemnizacion,
    tieneMesAviso,
  };
}

// ─── component ─────────────────────────────────────────────────────────────
export function CalculadoraFiniquito() {
  const [sueldoValue, setSueldoValue] = useState("800000");
  const [anosValue, setAnosValue] = useState("3");
  const [mesesValue, setMesesValue] = useState("0");
  const [causal, setCausal] = useState<Causal>("necesidades");
  const [sinAviso, setSinAviso] = useState(true);

  const parsed = useMemo(() => {
    const sueldo = parseFloat(sueldoValue.replace(/\./g, "").replace(",", ".")) || 0;
    const anos = parseInt(anosValue) || 0;
    const meses = parseInt(mesesValue) || 0;
    return calcularFiniquito(sueldo, anos, meses, causal, sinAviso);
  }, [sueldoValue, anosValue, mesesValue, causal, sinAviso]);

  const causales: { value: Causal; label: string; desc: string }[] = [
    {
      value: "necesidades",
      label: "Necesidades de la empresa",
      desc: "Art. 161 — Tienes derecho a indemnización",
    },
    {
      value: "renuncia",
      label: "Renuncia voluntaria",
      desc: "Solo vacaciones proporcionales",
    },
    {
      value: "mutuo",
      label: "Mutuo acuerdo",
      desc: "Según lo pactado entre las partes",
    },
    {
      value: "otra",
      label: "Despido injustificado / otra causal",
      desc: "Puedes tener derecho a recargos adicionales",
    },
  ];

  return (
    <div className="mb-12">
      <h3 className="text-2xl font-bold mb-6 text-gray-900">
        Calculadora de finiquito Chile 2026
      </h3>
      <p className="text-gray-600 mb-6 leading-relaxed">
        Ingresa tu sueldo, tiempo trabajado y la causal de término para
        estimar los montos de tu finiquito. El resultado es referencial y no reemplaza asesoría legal.
      </p>

      <div className="border border-gray-200 bg-gray-50 rounded-xl p-6 space-y-6">

        {/* ── causal ── */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-900">
            Causal de término del contrato
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {causales.map((c) => (
              <button
                key={c.value}
                onClick={() => setCausal(c.value)}
                className={`text-left rounded-lg border px-4 py-3 transition-all ${
                  causal === c.value
                    ? "border-gray-900 bg-white ring-1 ring-gray-900"
                    : "border-gray-200 bg-white hover:border-gray-400"
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">
                  {c.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{c.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── inputs ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900">
              Sueldo base (CLP)
            </label>
            <input
              inputMode="numeric"
              value={sueldoValue}
              onChange={(e) => setSueldoValue(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-900"
              placeholder="Ej: 800000"
              aria-label="Sueldo base"
            />
            <p className="text-xs text-gray-500">
              Ejemplo: ${formatClp(800000)}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900">
              Años trabajados
            </label>
            <input
              inputMode="numeric"
              value={anosValue}
              onChange={(e) => setAnosValue(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-900"
              placeholder="Ej: 3"
              aria-label="Años trabajados"
            />
            <p className="text-xs text-gray-500">Tope legal: 11 años</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900">
              Meses adicionales
            </label>
            <input
              inputMode="numeric"
              value={mesesValue}
              onChange={(e) => setMesesValue(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-900"
              placeholder="Ej: 6"
              aria-label="Meses adicionales"
            />
            <p className="text-xs text-gray-500">
              Meses del año en curso (0–11)
            </p>
          </div>
        </div>

        {/* ── mes aviso toggle ── */}
        {(causal === "necesidades" || causal === "otra") && (
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="sinAviso"
              checked={sinAviso}
              onChange={(e) => setSinAviso(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-gray-900"
            />
            <label
              htmlFor="sinAviso"
              className="text-sm text-gray-700 cursor-pointer"
            >
              No me avisaron con 30 días de anticipación{" "}
              <span className="text-gray-400">
                (agrega indemnización sustitutiva del aviso previo)
              </span>
            </label>
          </div>
        )}

        {/* ── resultados ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
              Indemnización años
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              ${formatClp(parsed.indemnizacion)}
            </p>
            {!parsed.tieneIndemnizacion && (
              <p className="text-xs text-gray-400 mt-1">
                No aplica para esta causal
              </p>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
              Mes de aviso
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              ${formatClp(parsed.mesAviso)}
            </p>
            {!parsed.tieneMesAviso && (
              <p className="text-xs text-gray-400 mt-1">
                {parsed.tieneIndemnizacion
                  ? "Avisaron con 30 días"
                  : "No aplica"}
              </p>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
              Vacaciones proporcionales
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              ${formatClp(parsed.vacaciones)}
            </p>
          </div>

          <div className="bg-green-900 border border-gray-900 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-white uppercase tracking-widest">
              Total estimado
            </p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              ${formatClp(parsed.total)}
            </p>
          </div>
        </div>

        {/* ── restaurar ── */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            variant="outline"
            className="h-11 border-gray-900 text-gray-900 hover:bg-green-900 hover:text-white"
            onClick={() => {
              setSueldoValue("800000");
              setAnosValue("3");
              setMesesValue("0");
              setCausal("necesidades");
              setSinAviso(true);
            }}
          >
            Restaurar ejemplo
          </Button>
        </div>

        {/* ── disclaimer ── */}
        <div className="text-xs text-gray-500 leading-relaxed">
          El cálculo es una aproximación para fines informativos basada en
          el Código del Trabajo. No considera gratificaciones, bonos,
          horas extra ni otros beneficios pactados. Para verificar el monto
          exacto de tu finiquito, consulta con un abogado laboral.
        </div>
      </div>
    </div>
  );
}

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Cuánto tiempo tiene la empresa para pagar el finiquito?",
      answer: "La empresa tiene un plazo máximo de 10 días hábiles desde el término de la relación laboral."
    },
    {
      question: "¿Se puede firmar el finiquito con reserva de derechos?",
      answer: "Sí. El trabajador puede firmar el finiquito indicando que se reserva el derecho de reclamar ciertos montos. Esto se puede escribir directamente en el documento antes de firmarlo."
    },
    {
      question: "¿Qué indemnizaciones incluye el finiquito por necesidades de la empresa?",
      answer: "Generalmente incluye: indemnización por años de servicio, indemnización sustitutiva del aviso previo y feriado proporcional."
    },
    {
      question: "¿Cómo se calcula el finiquito en Chile paso a paso?",
      answer: "Se suman tres conceptos: (1) indemnización por años de servicio, equivalente a un mes de remuneración por cada año trabajado; (2) mes de aviso, si el empleador no dio 30 días de anticipación; y (3) vacaciones proporcionales, según los días acumulados y no tomados en el año. El total depende de la causa de término del contrato."
    },
    {
      question: "¿Cuánto pagan en un finiquito si renuncio?",
      answer: "Si renuncias voluntariamente, solo te corresponde el feriado proporcional (vacaciones acumuladas no tomadas). No hay indemnización por años de servicio ni mes de aviso, salvo que el contrato o un acuerdo con el empleador establezca lo contrario."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="Finiquito Chile 2026: qué te deben pagar y cómo verificarlo antes de firmar"
        description="Calcula tu finiquito en Chile 2026 gratis: indemnización, vacaciones proporcionales y mes de aviso. Si tienes dudas, un abogado laboral de LegalUp responde en 24 horas."
        image="/assets/finiquito-chile-2026.png"
        url="https://legalup.cl/blog/como-calcular-tu-finiquito-chile-2026"
        datePublished="2026-02-18"
        dateModified="2026-05-05"
        faqs={faqs}
      />
      <Header onAuthClick={() => {}} />
      <ReadingProgressBar />
      
      {/* Hero Section */}
      <div className="bg-green-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>Artículo</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold font-serif text-green-600 mb-6">
            Finiquito Chile 2026: qué te deben pagar y cómo verificarlo antes de firmar
          </h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
              Resumen rápido
            </p>

            <ul className="space-y-2">
              {[
                "El finiquito debe incluir remuneraciones pendientes, vacaciones y avisos legales",
                "Se calcula sobre la base de la última remuneración mensual del trabajador",
                "El empleador tiene un plazo de 10 días hábiles para pagar el finiquito",
                "Firmar con reserva de derechos permite reclamar diferencias posteriormente",
                "La Inspección del Trabajo puede intervenir si no hay acuerdo en los montos"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm sm:text-base text-gray-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          
          <p className="text-xl max-w-3xl">
            Calcular el finiquito en Chile puede generar muchas dudas, especialmente porque intervienen distintos factores como indemnizaciones, vacaciones pendientes, pagos proporcionales y otros beneficios laborales.
          </p>
          
          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>18 de Febrero, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Tiempo de lectura: 11 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
        <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare 
            title="¿Cómo calcular tu finiquito en Chile? Guía 2026 paso a paso" 
            url="https://legalup.cl/blog/como-calcular-tu-finiquito-chile-2026" 
            showBorder={false}
          />
          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed font-medium mb-4">
              Cuando termina una relación laboral, el trabajador tiene derecho a recibir 
              todos los montos pendientes generados durante su contrato. Para hacer el 
              cálculo de tu finiquito en Chile 2026 correctamente, necesitas entender 
              qué conceptos incluye y cómo verificar que el monto sea el correcto — 
              muchas personas firman sin saber si les están pagando lo que corresponde.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              En esta <strong>Guía 2026 sobre finiquitos en Chile</strong>, te explicamos paso a paso:
            </p>
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 my-8">
              <h3 className="text-blue-900 font-bold mb-4">En esta guía aprenderás:</h3>
              <ul className="grid sm:grid-cols-2 gap-3 list-none p-0">
                {[
                  "Qué es el finiquito laboral",
                  "Qué pagos debe incluir",
                  "Cómo calcular indemnizaciones",
                  "Cómo calcular vacaciones pendientes",
                  "Qué revisar antes de firmarlo",
                  "Qué hacer si no estás de acuerdo"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-blue-800 text-base">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-lg text-gray-600 leading-relaxed font-semibold">
              Entender cómo funciona el cálculo del finiquito puede ayudarte a evitar errores y asegurarte de que recibas todos los pagos que te corresponden por ley.
            </p>
          </div>

          {/* What is Finiquito */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué es el finiquito?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El finiquito laboral es un documento legal que certifica el término de la relación laboral entre el trabajador y el empleador. Este documento deja constancia de que ambas partes ponen fin al contrato de trabajo y establece los pagos que corresponden al trabajador.
            </p>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 mb-6">
              <p className="text-gray-700 font-semibold mb-4">En el finiquito normalmente se incluyen:</p>
              <ul className="grid sm:grid-cols-2 gap-3 list-none p-0">
                {[
                  "Remuneraciones pendientes",
                  "Indemnizaciones legales",
                  "Feriado proporcional / Vacaciones",
                  "Bonos o comisiones devengadas",
                  "Acuerdos entre las partes"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-700 text-base">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-base text-gray-500 italic">
              Una vez firmado, el finiquito tiene valor legal y puede utilizarse como prueba de que las obligaciones laborales fueron pagadas. Desde 2021, en Chile también es posible firmar el finiquito de manera electrónica a través de la Dirección del Trabajo.
            </p>
          </div>

          {/* When corresponds */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuándo corresponde pagar finiquito en Chile?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El finiquito se paga cuando termina una relación laboral, ya sea por decisión del empleador o del trabajador. Las causas más comunes incluyen:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              {[
                "Renuncia voluntaria",
                "Despido por necesidades de la empresa",
                "Término de contrato a plazo fijo",
                "Mutuo acuerdo entre las partes",
                "Despido por incumplimiento grave"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 font-normal">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 leading-relaxed font-medium mb-4">
              Dependiendo de la causal de término, el trabajador puede tener derecho a indemnizaciones adicionales. Por ejemplo, el despido por necesidades de la empresa (artículo 161 del Código del Trabajo) suele generar el pago de indemnización por años de servicio.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">Si tienes dudas sobre la legalidad de tu término de contrato, lee esto:</p>
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link
                to="/blog/me-pueden-despedir-sin-motivo-chile-2026"
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 ¿Me pueden despedir sin motivo en Chile? Guía 2026
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            
            <InArticleCTA
              message="¿No estás seguro si el monto que te ofrecen es correcto? Un abogado laboral puede revisar tu finiquito antes de que lo firmes."
              buttonText="Revisar mi finiquito con un abogado"
              category="Derecho Laboral"
            />
          </div>

          {/* Elements Included */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Elementos que se incluyen en un finiquito en Chile (2026)</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              A continuación revisamos los componentes más habituales que forman parte de un finiquito laboral.
            </p>

            <div className="space-y-12">
              <section>
                <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <span className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm">1</span>
                  Remuneraciones pendientes
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  El primer elemento del finiquito corresponde a los pagos pendientes del trabajador.
                </p>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-8">
                  <p className="text-gray-900 font-bold mb-4 text-lg">Además de estas remuneraciones, se pagan:</p>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {[
                      "Sueldo del último mes",
                      "Sueldo proporcional",
                      "Horas extra devengadas",
                      "Comisiones pendientes",
                      "Bonos acumulados"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-700 font-normal">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-base">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-gray-600 text-base italic">Todos estos montos deben pagarse en el finiquito si aún no han sido liquidados.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <span className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm">2</span>
                  Indemnización sustitutiva del aviso previo
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  Cuando el empleador decide terminar el contrato sin avisar con al menos 30 días de anticipación, debe pagar una indemnización equivalente a un mes de sueldo.
                </p>
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                  <p className="text-blue-900 font-bold mb-2">El monto corresponde a:</p>
                  <p className="text-blue-800 text-lg">1 mes de la última remuneración mensual.</p>
                  <p className="text-blue-800 text-base mt-2 italic">Esta compensación solo aplica cuando el despido es responsabilidad del empleador.</p>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <span className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm">3</span>
                  Indemnización por años de servicio (IAS)
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  La indemnización por años de servicio es uno de los pagos más importantes del finiquito. Se paga cuando el contrato termina por necesidades de la empresa o desahucio del empleador.
                </p>
                <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 mb-6 text-center">
                  <p className="text-indigo-900 font-bold text-lg mb-2">El cálculo corresponde a:</p>
                  <p className="text-indigo-800">1 mes de sueldo por cada año trabajado.</p>
                </div>
                
                <p className="text-gray-600 mb-4 leading-relaxed">Revisa el detalle de cómo cobrar tus años de servicio:</p>
                <div className="text-center py-4 border-t border-b border-gray-100 my-8">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
                  <Link
                    to="/blog/cuanto-me-corresponde-anos-de-servicio-chile-2026"
                    className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
                  >
                    👉 ¿Cuánto corresponde por años de servicio? Guía 2026
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <h4 className="font-bold text-gray-900 mb-3">Reglas importantes del cálculo:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-gray-700">
                      <CheckCircle className="h-4 w-4 mt-1 text-blue-500" />
                      <span>Se paga máximo por 11 años de servicio</span>
                    </li>
                    <li className="flex items-start gap-2 text-gray-700">
                      <CheckCircle className="h-4 w-4 mt-1 text-blue-500" />
                      <span>El sueldo base se calcula con el promedio de los últimos 3 meses</span>
                    </li>
                    <li className="flex items-start gap-2 text-gray-700">
                      <CheckCircle className="h-4 w-4 mt-1 text-blue-500" />
                      <span>Fracciones superiores a 6 meses pueden considerarse como año completo</span>
                    </li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <span className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm">4</span>
                  Feriado proporcional y vacaciones pendientes
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Otro elemento importante del finiquito es el pago de vacaciones no utilizadas. Existen dos tipos de pago:
                </p>
                <div className="grid sm:grid-cols-2 gap-6 mb-6">
                  <div className="border p-4 rounded-lg bg-white">
                    <h4 className="font-bold text-gray-900 mb-2 text-base">Vacaciones acumuladas</h4>
                    <p className="text-gray-600 text-base leading-relaxed">Días de vacaciones que el trabajador ya tenía derecho a usar pero que no utilizó antes del término del contrato.</p>
                  </div>
                  <div className="border p-4 rounded-lg bg-white">
                    <h4 className="font-bold text-gray-900 mb-2 text-base">Feriado proporcional</h4>
                    <p className="text-gray-600 text-base leading-relaxed">Derecho a vacaciones generado durante el año en curso, considerando el tiempo trabajado desde el último período.</p>
                  </div>
                </div>
                <p className="text-base text-gray-600 italic">En Chile, los trabajadores tienen derecho a 15 días hábiles de vacaciones al año.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <span className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm">5</span>
                  Indemnización por necesidades de la empresa
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  Cuando el empleador pone término al contrato por necesidades de la empresa, el trabajador puede recibir varios pagos adicionales:
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {["Años de servicio", "Sustitutiva aviso previo", "Feriado proporcional"].map((item, i) => (
                    <div key={i} className="bg-blue-50 px-3 py-1.5 rounded-full text-xs font-medium text-blue-700 border border-blue-100">{item}</div>
                  ))}
                </div>
                <p className="text-gray-600 text-base">Esta causal se aplica cuando la empresa justifica el despido por razones económicas, organizacionales o productivas.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <span className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm">6</span>
                  Cotizaciones previsionales impagas
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  Antes de pagar el finiquito, el empleador debe asegurarse de que todas las cotizaciones previsionales estén pagadas (AFP, Salud, Seguro Cesantía).
                </p>
                <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-lg">
                  <p className="text-amber-800 text-base font-medium">
                    Si existen cotizaciones impagas, el empleador debe regularizarlas antes de que el finiquito sea válido.
                  </p>
                </div>
              </section>
            </div>
          </div>

          <div className="mb-12">
            <InArticleCTA
              message="Si tienes dudas sobre tu liquidación o crees que te están pagando menos de lo que corresponde, consulta con un abogado laboral ahora."
              buttonText="Consultar sobre mi finiquito"
              category="Derecho Laboral"
            />
            
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Cómo calcular tu finiquito en Chile 2026</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Ahora que ya conoces qué pagos puede incluir un finiquito laboral, puedes estimar cuánto te corresponde según tu sueldo, años trabajados y causal de término del contrato.<br />
              Usa esta calculadora de finiquito Chile 2026 para obtener una estimación referencial de indemnización por años de servicio, aviso previo, vacaciones pendientes y otros montos laborales.
            </p>
            <CalculadoraFiniquito />
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Cómo calcular tu finiquito paso a paso</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              A continuación revisamos una forma simple de estimar tu finiquito paso a paso.
            </p>
            <div className="space-y-4">
              {[
                { title: "Paso 1: calcular tu sueldo diario", desc: "Sueldo mensual / 30. Ejemplo: $900.000 / 30 = $30.000 diarios." },
                { title: "Paso 2: calcular vacaciones pendientes", desc: "Días acumulados × Sueldo diario. Ejemplo: 8 días × $30.000 = $240.000." },
                { title: "Paso 3: calcular feriado proporcional", desc: "(Días trabajados / 365) × 15 días hábiles. Luego multiplicar por sueldo diario." },
                { title: "Paso 4: calcular indemnización por años de servicio", desc: "Sueldo base × años trabajados. Ejemplo: 5 años × $900.000 = $4.500.000." },
                { title: "Paso 5: calcular indemnización por aviso previo", desc: "Si corresponde, sumar un sueldo mensual extra ($900.000)." },
                { title: "Paso 6: sumar otros pagos pendientes", desc: "Agregar bonos, comisiones, horas extra y gratificaciones devengadas." },
                { title: "Paso 7: aplicar descuentos legales", desc: "Cotizaciones previsionales, seguro de cesantía y préstamos internos." }
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                  <div>
                    <span className="font-bold text-gray-900">{step.title}</span>
                    <p className="text-base text-gray-600 mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Practical Example */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Ejemplo práctico de cálculo de finiquito (2026)</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Supongamos el siguiente caso:</p>
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 mb-8">
              <div className="grid sm:grid-cols-2 gap-4 text-blue-900 text-base mb-6">
                <div>• Sueldo promedio: <strong>$900.000</strong></div>
                <div>• Antigüedad: <strong>5 años</strong></div>
                <div>• Vacaciones: <strong>8 días</strong></div>
                <div>• Aviso previo: <strong>Sin aviso</strong></div>
              </div>
              <div className="space-y-3 pt-6 border-t border-blue-200">
                <div className="flex justify-between text-blue-800">
                  <span>Años de servicio:</span>
                  <span>5 × $900.000 = $4.500.000</span>
                </div>
                <div className="flex justify-between text-blue-800">
                  <span>Indemnización aviso previo:</span>
                  <span>$900.000</span>
                </div>
                <div className="flex justify-between text-blue-800">
                  <span>Vacaciones pendientes:</span>
                  <span>$240.000</span>
                </div>
                <div className="flex justify-between text-blue-900 font-bold text-lg pt-4">
                  <span>Total estimado:</span>
                  <span>$5.640.000*</span>
                </div>
              </div>
              <p className="text-blue-700 text-base mt-6 italic">*Antes de descuentos y referencial.</p>
            </div>
          </div>

          {/* What to Review */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué revisar antes de firmar el finiquito?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Antes de firmar el finiquito es importante revisar cuidadosamente:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              {[
                "Monto del sueldo base",
                "Años de servicio correctos",
                "Causal de despido",
                "Cálculo de feriado proporcional",
                "Pago de bonos pendientes",
                "Cotizaciones pagadas"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <CheckCircle className="h-5 w-5 mt-0.5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 text-base italic">Si detectas errores, puedes solicitar que el documento sea corregido antes de firmarlo.</p>
          </div>

          {/* When Pays */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuándo paga la empresa el finiquito?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Según la legislación laboral chilena, el empleador tiene un plazo máximo de <strong>10 días hábiles</strong> para pagar el finiquito desde el término del contrato. El pago puede realizarse mediante transferencia, cheque o depósito.
            </p>
            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
              <p className="text-indigo-900 text-base">
                La firma puede hacerse ante notario o de forma electrónica en la Dirección del Trabajo.
              </p>
            </div>
          </div>

          {/* Is Mandatory */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Es obligatorio firmar el finiquito?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              <strong>No.</strong> El trabajador no está obligado a firmar si considera que los montos son incorrectos. En ese caso puedes solicitar correcciones o asesorarte legalmente.
            </p>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 mb-12">
              <h4 className="font-bold text-gray-900 mb-4 text-base">Documentos útiles para el proceso:</h4>
              <ul className="grid sm:grid-cols-2 gap-4">
                {[
                  "Contrato de trabajo",
                  "Liquidaciones de sueldo",
                  "Registros de asistencia",
                  "Correos electrónicos"
                ].map((doc, i) => (
                  <div key={doc} className="flex items-center gap-3 text-gray-700">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-base font-medium">{doc}</span>
                  </div>
                ))}
              </ul>
            </div>
          </div>
          <div className="text-center py-4 border-t border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">¿No estás de acuerdo con el monto de tu finiquito?</p>
              <Link
                to="/blog/reserva-de-derechos-finiquito-chile-2026"
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 Guía: Cómo firmar con reserva de derechos
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>


          {/* Conclusion */}
          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              El finiquito laboral en Chile es un documento clave al momento de terminar una relación laboral, ya se que establece todos los pagos e indemnizaciones que corresponden al trabajador. Entender cómo se calcula el finiquito permite revisar correctamente los montos incluidos y asegurarse de que se respeten los derechos laborales.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Antes de firmar el documento, es fundamental revisar aspectos como las indemnizaciones, vacaciones pendientes y cotizaciones previsionales.
            </p>
            <p className="text-gray-600 font-bold leading-relaxed">
              Si existen dudas o diferencias en los montos, es recomendable <Link to="/abogados-laborales" className="text-green-900 underline hover:text-green-700">hablar con un abogado laboral en Chile</Link> para evitar perder beneficios que corresponden por ley.
            </p>
          </div>

          {/* CTA Section - Specific Category */}
          <CategoryCTA category="laboral" />

          {/* FAQ (SEO structured) */}
          <div className="mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Preguntas frecuentes sobre finiquitos</h2>
            
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-700">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>



      </div>

      <RelatedLawyers category="Derecho Laboral" />

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
        {/* Compartir - Growth Hack */}
        <div className="mt-8">
          <BlogShare 
            title="¿Cómo calcular tu finiquito en Chile? Guía 2026 paso a paso" 
            url="https://legalup.cl/blog/como-calcular-tu-finiquito-chile-2026" 
          />
        </div>

        <BlogNavigation currentArticleId="como-calcular-tu-finiquito-chile-2026" />

        <div className="mt-4 text-center">
          <Link 
            to="/blog" 
            className="inline-flex items-center gap-2 text-green-900 hover:text-green-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Blog
          </Link>
        </div>
      </div>
      
      <BlogConversionPopup category="Derecho Laboral" topic="finiquito" />
    </div>
  );
};

export default BlogArticle;
