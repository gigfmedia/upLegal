import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import InArticleCTA from "@/components/blog/InArticleCTA";

const PensionCalculator = () => {
  const [income, setIncome] = useState(500000);
  const [children, setChildren] = useState(1);

  const calculate = () => {
    let percentage = 0;
    if (children === 1) percentage = 0.2;
    if (children === 2) percentage = 0.3;
    if (children >= 3) percentage = 0.4;
    return Math.round(income * percentage);
  };

  return (
    <div className="p-6 sm:p-8 rounded-md my-8 border">
      <div className="max-w-xl mx-auto">
        <h3 className="text-xl font-bold mb-6 text-gray-900">
          Calcula tu pensión de alimentos estimada
        </h3>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Ingreso mensual líquido ($)
          </label>
          <input
            type="number"
            value={income}
            onChange={(e) => setIncome(Number(e.target.value))}
            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Número de hijos
          </label>
          <select
            value={children}
            onChange={(e) => setChildren(Number(e.target.value))}
            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
          >
            <option value={1}>1 hijo</option>
            <option value={2}>2 hijos</option>
            <option value={3}>3 hijos o más</option>
          </select>
        </div>
      </div>

      <div className="bg-green-100 p-6 rounded-xl text-center border border-green-100">
        <p className="text-green-900 font-medium mb-1">Estimación mensual</p>
        <p className="text-3xl font-bold text-green-600">
          ${calculate().toLocaleString("es-CL")}
        </p>
      </div>

      <p className="text-xs text-gray-400 mt-4 leading-relaxed">
        *Estimación referencial basada en rangos comunes en Chile (20% a 40% del ingreso según número de hijos). El monto real lo define el tribunal según ingresos reales, necesidades de los niños y capacidad económica de ambos padres.
      </p>
      </div>
    </div>
  );
};

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Cómo cobrar una deuda de pensión de alimentos en Chile?",
      answer:
        "Debes solicitar al tribunal de familia que dictó la pensión una liquidación de la deuda acumulada. Una vez liquidada, puedes pedir medidas de apremio contra el deudor: retención del sueldo, retención de devolución de impuestos, suspensión de licencia de conducir o arresto. El proceso se inicia presentando un escrito ante el mismo tribunal que fijó la pensión.",
    },
    {
      question: "¿Pueden arrestar a alguien por no pagar la pensión de alimentos?",
      answer:
        "Sí. El arresto es una de las medidas de apremio más efectivas en Chile para forzar el pago. El tribunal puede decretar arresto nocturno como primera medida y, si el incumplimiento persiste, arresto completo. Esta medida busca presionar el pago, no castigar — se levanta una vez que se paga la deuda.",
    },
    {
      question: "¿Se pueden embargar los bienes del deudor por pensión de alimentos?",
      answer:
        "Sí. Si el deudor no paga y no tiene ingresos retenibles, el tribunal puede ordenar el embargo de sus bienes — vehículos, cuentas bancarias, bienes muebles — y su posterior remate para pagar la deuda acumulada. Es una medida que requiere seguir el proceso judicial correspondiente.",
    },
    {
      question: "¿Qué pasa si el deudor no tiene trabajo formal o contrato?",
      answer:
        "La obligación de pagar pensión de alimentos existe independientemente de si la persona tiene trabajo formal o no. Si no hay sueldo que retener, el tribunal puede recurrir a otras medidas: embargo de bienes, retención de devoluciones de impuestos, suspensión de licencia de conducir o arresto. No tener contrato no elimina la deuda.",
    },
    {
      question: "¿Prescriben las deudas de pensión de alimentos en Chile?",
      answer:
        "Las deudas de pensión de alimentos tienen un tratamiento especial y no prescriben de la misma forma que otras deudas civiles. Sin embargo, actuar a tiempo siempre es recomendable para evitar que la deuda crezca y para mantener las medidas de apremio activas. Consulta con un abogado de familia para evaluar tu caso específico.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="Deuda de pensión de alimentos en Chile: cómo cobrarla paso a paso y qué medidas puedes exigir (Guía 2026)"
        description="Si no recibes la pensión de alimentos o existe deuda acumulada, existen herramientas legales efectivas. Aprende cómo cobrar la deuda paso a paso: liquidación, medidas de apremio, embargo y arresto."
        image="/assets/derecho-de-familia-chile-2026.png"
        url="https://legalup.cl/blog/deuda-pension-alimentos-chile-2026"
        datePublished="2026-04-28"
        dateModified="2026-04-28"
        faqs={faqs}
      />
      <Header onAuthClick={() => {}} />
      <ReadingProgressBar />

      {/* Hero */}
      <div className="bg-green-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
            <ChevronRight className="h-4 w-4" />
            <span>Artículo</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-green-600 font-serif mb-6">
            Deuda de pensión de alimentos en Chile: cómo cobrarla paso a paso y qué medidas puedes exigir (Guía 2026)
          </h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">Resumen rápido</p>
            <ul className="space-y-2">
              {[
                "Puedes cobrar la deuda solicitando una liquidación judicial",
                "El tribunal puede aplicar medidas como retención de sueldo, embargo y arresto",
                "La deuda no desaparece y puede acumularse con intereses",
                "Existen mecanismos legales efectivos para obligar el pago"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm sm:text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl max-w-3xl">
            Si no estás recibiendo la pensión de alimentos o existe deuda acumulada, no estás solo. Es una situación común en Chile, pero también una de las que tiene más herramientas legales para solucionarse.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>28 de Abril, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Tiempo de lectura: 12 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
        <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">

          <BlogShare
            title="Deuda de pensión de alimentos en Chile: cómo cobrarla paso a paso (Guía 2026)"
            url="https://legalup.cl/blog/deuda-pension-alimentos-chile-2026"
            showBorder={false}
          />

          {/* Intro */}
          <div className="prose prose-lg max-w-none mb-8">
            <p className="text-lg text-gray-600 leading-relaxed">
              <strong>La clave es actuar.</strong> En esta guía 2026 te explicamos cómo cobrar una deuda de pensión de alimentos paso a paso, qué medidas puedes exigir y cómo funciona realmente el proceso.
            </p>
          </div>

          {/* Qué se considera deuda */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">¿Qué se considera deuda de pensión de alimentos?</h2>
            <p className="text-gray-600 mb-4">Existe deuda cuando:</p>
            <ul className="space-y-2 bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm text-gray-600 mb-4">
              {["No se paga la pensión fijada por tribunal", "Se paga parcialmente", "Se incumple un acuerdo formal"].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl">
              <p className="font-bold text-amber-900">Importante</p>
              <p className="text-amber-800">La deuda se acumula mes a mes y puede aumentar con el tiempo.</p>
            </div>
          </div>

          {/* Cómo calcula el juez */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">¿Cómo calcula el juez la pensión de alimentos en Chile?</h2>
            <p className="text-gray-600 mb-6">El monto de la pensión no es arbitrario. El tribunal evalúa múltiples factores para fijarlo de forma proporcional.</p>
            
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {[
                { title: "Necesidades del alimentario", desc: "Alimentación, educación, salud, vivienda, vestuario.", icon: "🍎" },
                { title: "Capacidad económica", desc: "Sueldo, ingresos informales, bienes del demandado.", icon: "💰" },
                { title: "Cargas familiares", desc: "Si el demandado tiene otros hijos o dependientes.", icon: "👨‍👩‍👧‍👦" },
                { title: "Nivel de vida previo", desc: "El estándar que tenía el menor antes del conflicto.", icon: "📈" },
              ].map((c, i) => (
                <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{c.icon}</span>
                    <span className="font-bold text-gray-900">{c.title}</span>
                  </div>
                  <p className="text-gray-600 text-sm">{c.desc}</p>
                </div>
              ))}
            </div>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl mb-4">
              <p className="font-bold text-blue-900">Importante</p>
              <p className="text-blue-800">No existe un monto fijo universal. Cada caso se analiza individualmente. En la práctica, muchas pensiones se fijan entre un 20% y 40% de los ingresos, pero puede variar.</p>
            </div>
          </div>

          <PensionCalculator />
          <div className="mb-12">
            <InArticleCTA
              message="¿Quieres saber el monto exacto según tu caso? La calculadora es una estimación referencial."
              buttonText="Habla con un abogado ahora"
              category="Derecho de Familia"
            />
          </div>

          {/* ¿Se puede cobrar? */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">¿La deuda de pensión se puede cobrar?</h2>
            <p className="text-gray-600 mb-4"><strong>Sí, y con fuerza.</strong> A diferencia de otras deudas, la pensión de alimentos tiene mecanismos especiales.</p>
            <p className="text-gray-600 mb-4">Puedes solicitar:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {[
                { item: "Cobro judicial", icon: "⚖️" },
                { item: "Retención de ingresos", icon: "💵" },
                { item: "Embargo de bienes", icon: "🏠" },
                { item: "Medidas de apremio", icon: "⚠️" },
              ].map((m, i) => (
                <div key={i} className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-xl">{m.icon}</span>
                  <span className="text-gray-700 font-medium">{m.item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Paso a paso */}
          <div className="mb-8 mt-8">
            <h2 className="text-2xl font-bold mb-6">Paso a paso: cómo cobrar deuda de pensión de alimentos</h2>

            <div className="space-y-4">
              {[
                {
                  title: "Solicitar liquidación de deuda",
                  desc: "Debes pedir al tribunal que calcule cuánto se debe. Esto incluye meses impagos, reajustes e intereses si corresponde.",
                  note: "Este documento es clave: determina el monto oficial.",
                  color: "blue"
                },
                {
                  title: "Notificación al deudor",
                  desc: "El tribunal informa al deudor el monto adeudado y el plazo para pagar.",
                  note: "Aquí aún puede pagar voluntariamente.",
                  color: "green"
                },
                {
                  title: "Solicitar medidas de apremio",
                  desc: "Si no paga, puedes pedir retención de sueldo, retención de devolución de impuestos, suspensión de licencia de conducir, prohibición de salir del país o arresto.",
                  note: "Estas medidas buscan forzar el cumplimiento.",
                  color: "amber"
                },
                {
                  title: "Embargo de bienes",
                  desc: "Si persiste el incumplimiento, se pueden embargar bienes y rematar para pagar la deuda.",
                  note: null,
                  color: "orange"
                },
                {
                  title: "Cumplimiento o ejecución",
                  desc: "El proceso continúa hasta que se paga la deuda o se cumple la obligación.",
                  note: null,
                  color: "gray"
                },
              ].map((step, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex gap-4">
                  <div className="bg-gray-900 p-2 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{step.title}</h4>
                    <p className="text-gray-600 mb-2">{step.desc}</p>
                    {step.note && <p className="text-blue-700 font-medium">{step.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>


          <InArticleCTA
            message="¿Tienes deuda de pensión de alimentos y no sabes cómo cobrarla? Un abogado especialista puede guiarte para activar liquidación, embargo y medidas de apremio de forma efectiva."
            buttonText="Habla con un abogado ahora"
            category="Derecho de Familia"
          />

          {/* Preguntas frecuentes de situaciones */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Preguntas frecuentes sobre el proceso</h2>
            <div className="space-y-4">
              {[
                {
                  q: "¿Cuándo puedes solicitar estas medidas?",
                  a: "Cuando existe pensión fijada, hay deuda acumulada e incumplimiento. No necesitas esperar meses ni acumular una deuda grande — basta con el primer incumplimiento para iniciar acciones legales."
                },
                {
                  q: "¿Cuánto demora cobrar la deuda?",
                  a: "La liquidación toma generalmente algunas semanas. Las medidas de apremio entre 1 y 2 meses. En muchos casos, una vez decretadas las medidas el deudor paga rápido para evitar consecuencias mayores."
                },
                {
                  q: "¿La deuda prescribe?",
                  a: "No fácilmente. Las deudas de pensión tienen tratamiento especial y pueden mantenerse exigibles por períodos prolongados. Actuar a tiempo igual es recomendable para evitar que la deuda siga creciendo."
                },
                {
                  q: "¿Qué pasa si el deudor no tiene ingresos formales?",
                  a: "La obligación existe igualmente. Puedes solicitar embargo de bienes, investigar su situación económica real ante el tribunal y pedir otras medidas de presión. No tener contrato no elimina la deuda."
                },
                {
                  q: "¿Qué pasa si paga parcialmente?",
                  a: "Se considera incumplimiento. Puedes cobrar la diferencia y solicitar medidas de apremio por el monto pendiente. No estás obligado a aceptar pagos parciales como cumplimiento total."
                },
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-2">{item.q}</h3>
                  <p className="text-gray-600">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Casos reales */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Casos reales</h2>
            <div className="space-y-4">
              {[
                { title: "Caso 1 — Pago tras retención", desc: "Se solicita retención de sueldo → se paga la deuda.", color: "green" },
                { title: "Caso 2 — Incumplimiento total", desc: "No paga → embargo + arresto → pago forzado.", color: "red" },
                { title: "Caso 3 — Acuerdo", desc: "Se negocia plan de pago → se regulariza la situación.", color: "blue" },
              ].map((c, i) => (
                <div key={i} className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-sm`}>
                  <h4 className="font-bold text-gray-900 mb-1">{c.title}</h4>
                  <p className="text-gray-600">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Errores al demandar */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Errores al demandar pensión de alimentos en Chile</h2>
            <p className="text-gray-600 mb-6">Muchos casos se retrasan o se complican por errores evitables. Estos son los más comunes:</p>
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 sm:p-8">
              <div className="space-y-6">
                {[
                  { title: "No presentar documentos suficientes", desc: "(No acreditar ingresos o gastos correctamente)" },
                  { title: "Indicar un domicilio incorrecto del demandado", desc: "(Esto puede retrasar la notificación por meses)" },
                  { title: "No asistir a audiencias", desc: "(Puede perjudicar gravemente tu caso)" },
                  { title: "Pedir montos sin justificación", desc: "(El tribunal necesita fundamentos claros)" },
                  { title: "No actualizar información económica", desc: "(Si cambian ingresos, debes informarlo)" },
                ].map((error, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="text-red-500 font-bold text-lg mt-0.5 flex-shrink-0">✕</div>
                    <div>
                      <h4 className="font-bold text-red-900">{error.title}</h4>
                      <p className="text-red-800 opacity-90">{error.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-xl">
              <p className="text-blue-900 font-medium"><strong>Clave:</strong> Un error en esta etapa puede significar perder tiempo o recibir una pensión menor a la que corresponde.</p>
            </div>
          </div>

          {/* Links relacionados */}
          <div className="mb-8 space-y-3">
            <div className="text-center py-4 border-t border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Conoce más sobre tu caso</p>
              <Link
                to="/blog/derecho-de-familia-chile-2026"
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 Guía completa: Derecho de Familia en Chile
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* ¿Cuánto cuesta? */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">¿Cuánto cuesta demandar pensión de alimentos en Chile?</h2>
            <p className="text-gray-600 mb-6">Una de las principales dudas es el costo del proceso. La buena noticia es que demandar pensión de alimentos en Chile puede ser gratuito.</p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-100 shadow-sm p-6 rounded-2xl">
                <span className="p-1 bg-green-100 text-green-700 rounded text-[10px] uppercase mb-3 inline-block font-bold">Opción 1</span>
                <h3 className="font-bold text-lg mb-4 text-gray-900 flex items-center gap-2">
                  Corporación de Asistencia Judicial
                </h3>
                <ul className="space-y-2 text-gray-600 mb-4">
                  <li className="flex items-center gap-2 font-bold text-green-700"><CheckCircle className="h-4 w-4" /> Sin costo</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Abogados asignados por el Estado</li>
                  <li className="flex items-center gap-2 text-amber-700"><Clock className="h-4 w-4" /> Puede tener tiempos más largos</li>
                </ul>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm p-6 rounded-2xl">
                <span className="p-1 bg-blue-100 text-blue-700 rounded text-[10px] uppercase mb-3 inline-block font-bold">Opción 2</span>
                <h3 className="font-bold text-lg mb-4 text-gray-900 flex items-center gap-2">
                  Abogado particular
                </h3>
                <ul className="space-y-2 text-gray-600 mb-4">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Honorarios variables</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Mayor rapidez y estrategia personalizada</li>
                </ul>
                <div className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-50">
                  Costos adicionales posibles: Notificaciones judiciales, tramitaciones específicas.
                </div>
              </div>
            </div>
            
            <p className="mt-8 text-gray-500 italic">En muchos casos, el costo es bajo o incluso cero comparado con el beneficio de asegurar una pensión estable.</p>
          </div>

          {/* Documentos necesarios */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              Documentos necesarios para demandar pensión de alimentos
            </h2>
            <p className="text-gray-600 mb-6">Para iniciar correctamente el proceso, debes reunir ciertos documentos clave:</p>
            
            <ul className="space-y-3 bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm text-gray-700 mb-6">
              {[
                "Certificado de nacimiento del hijo/a",
                "Cédula de identidad",
                "Comprobantes de gastos (colegio, salud, alimentación)",
                "Antecedentes de ingresos del demandado (si los tienes)",
                "Domicilio del demandado"
              ].map((doc, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>{doc}</span>
                </li>
              ))}
            </ul>
            
            <p className="text-gray-900 font-medium">Mientras más información presentes, más sólido será tu caso.</p>
          </div>

          {/* Consecuencias del no pago */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              ¿Qué pasa si el demandado no paga la pensión?
            </h2>
            <p className="text-gray-600 mb-6">Cuando el demandado deja de pagar la pensión de alimentos, no solo se genera una deuda: se activa un proceso legal para exigir el cumplimiento.</p>
            
            <p className="text-gray-900 font-bold mb-4 text-sm uppercase tracking-wider">Desde ese momento:</p>
            <ul className="space-y-3 bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm text-gray-700 mb-6">
              {[
                "La deuda comienza a acumularse mes a mes",
                "Puedes solicitar su liquidación ante el tribunal",
                "Se habilita el uso de medidas de presión legales"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            
            <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl mb-6">
              <p className="font-bold text-amber-900">Clave</p>
              <p className="text-amber-800">No pagar la pensión no es una falta menor. Es un incumplimiento grave que permite activar mecanismos judiciales para forzar el pago.</p>
            </div>
            
            <p className="text-gray-500 italic">A continuación te explicamos exactamente qué medidas puede ordenar el tribunal.</p>
          </div>

          {/* Medidas del tribunal */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿Qué medidas puede ordenar el tribunal?</h2>
            <p className="text-gray-600 mb-4">Las más comunes en Chile:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {[
                { item: "Retención de sueldo", desc: "El empleador descuenta directamente el monto.", icon: "💼" },
                { item: "Retención de impuestos", desc: "Se retiene la devolución de impuestos.", icon: "📄" },
                { item: "Suspensión de licencia", desc: "Se suspende la licencia de conducir del deudor.", icon: "🚗" },
                { item: "Arraigo nacional", desc: "Prohibición de salir del país mientras exista deuda.", icon: "✈️" },
                { item: "Embargo de bienes", desc: "Se afectan bienes del deudor.", icon: "🏠" },
                { item: "Arresto", desc: "En incumplimiento reiterado, el tribunal puede decretarlo.", icon: "⚠️" },
              ].map((m, i) => (
                <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{m.icon}</span>
                    <span className="font-bold text-gray-900">{m.item}</span>
                  </div>
                  <p className="text-gray-600 text-sm">{m.desc}</p>
                </div>
              ))}
            </div>
            <div className="bg-red-950 p-6 rounded-2xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 blur-2xl rounded-full -mr-16 -mt-16"></div>
              <p className="font-bold text-red-200 uppercase tracking-widest text-xs mb-2">Importante 2026</p>
              <p className="text-lg font-serif">👉 Sí, puede ocurrir arresto. En caso de incumplimiento reiterado, el tribunal puede decretar arresto.</p>
            </div>
          </div>

          {/* Ejemplo de cálculo */}
          <div className="mb-12 bg-green-900 text-white p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 blur-3xl rounded-full -mr-32 -mt-32"></div>
            
            <h2 className="text-2xl font-bold mb-2">
              Ejemplo real: cálculo de deuda de pensión de alimentos
            </h2>
            
            <p className="mb-8">
              Para entender mejor cómo se calcula una deuda, veamos un ejemplo simple:
            </p>
            
            <div className="grid sm:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                  <p className="text-sm mb-1">Caso:</p>
                  <ul className="space-y-1">
                    <li className="font-bold">Pensión fijada: $200.000</li>
                    <li className="font-bold">Meses sin pagar: 6</li>
                  </ul>
                </div>
                
                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
                  <p className="text-sm text-green-400 mb-1">Resultado base:</p>
                  <p className="text-2xl font-bold text-green-500">$1.200.000</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm">El tribunal puede incluir:</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Reajustes según IPC
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Intereses en algunos casos
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Costas del proceso
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="bg-white/5 border-l-4 border-green-500 p-6 rounded-r-xl mb-6">
              <p className="text-sm mb-1">Deuda total estimada:</p>
              <p className="text-xl font-bold text-white">Puede superar los $1.200.000 fácilmente</p>
              <p className="text-sm mt-1">Dependiendo del tiempo y condiciones.</p>
            </div>
            
            <div className="pt-4 border-t border-white/10">
              <p className="font-bold text-green-400">Importante:</p>
              <p>Mientras más tiempo pase sin pagar, mayor será la deuda acumulada. Por eso, iniciar la liquidación lo antes posible es clave para evitar que el monto siga creciendo.</p>
            </div>
          </div>

          {/* Conclusión */}
          <div className="prose prose-lg max-w-none mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              La deuda de pensión de alimentos en Chile no es un problema sin solución. A diferencia de otras obligaciones, el sistema legal chileno contempla herramientas concretas y efectivas para exigir el cumplimiento, incluso en casos donde el deudor intenta evitar el pago.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              El error más común es esperar demasiado tiempo antes de actuar. Cada mes que pasa sin iniciar acciones legales no solo aumenta la deuda, sino que también puede hacer más complejo el proceso de recuperación.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Solicitar la liquidación de la deuda y activar medidas de apremio como retención de sueldo, embargo o arresto puede cambiar completamente el escenario, obligando al deudor a cumplir. Estas herramientas existen precisamente porque el legislador reconoció que la pensión de alimentos no es una obligación opcional — es un derecho del hijo que debe garantizarse.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Además, el hecho de que el deudor no tenga ingresos formales no lo libera de su obligación. Existen mecanismos para investigar su situación económica real y aplicar medidas igualmente efectivas sobre sus bienes o ingresos informales.
            </p>
            <p className="text-gray-600 font-semibold leading-relaxed">
              Si llevas meses esperando el pago o no sabes por dónde empezar, el momento de actuar es ahora.
            </p>
          </div>

          {/* FAQs */}
          <div className="mb-12" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes</h2>
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

        {/* CTA Final */}
        <section className="bg-white rounded-xl shadow-sm p-8 text-center mt-8">
          <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">¿Tienes deuda de pensión de alimentos y no sabes cómo cobrarla?</h2>
          <p className="text-lg text-gray-700 mb-6">
            Un abogado especialista en derecho de familia puede ayudarte a:
          </p>
          <div className="grid gap-3 md:grid-cols-2 mb-8 max-w-2xl mx-auto text-left">
            {[
              "Solicitar la liquidación de la deuda",
              "Activar medidas de apremio",
              "Gestionar embargo de bienes",
              "Representarte ante el tribunal",
              "Exigir arresto en caso necesario",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/search?category=Derecho+de+Familia">
              <Button
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_consultar_abogado', {
                    article: window.location.pathname,
                    location: 'blog_cta_pension_deuda_primary',
                  });
                }}
                className="bg-gray-900 hover:bg-green-900 text-white px-8 py-3 w-full sm:w-auto"
              >
                Habla con un abogado ahora
              </Button>
            </Link>
          </div>
        </section>
      </div>

      <RelatedLawyers category="Derecho de Familia" />

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare
            title="Deuda de pensión de alimentos en Chile: cómo cobrarla paso a paso (Guía 2026)"
            url="https://legalup.cl/blog/deuda-pension-alimentos-chile-2026"
          />
        </div>

        <BlogNavigation currentArticleId="deuda-pension-alimentos-chile-2026" />

        <div className="mt-4 text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-green-900 hover:text-green-600 transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Blog
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BlogArticle;
