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
import CategoryCTA from "@/components/blog/CategoryCTA";
import InArticleCTA from "@/components/blog/InArticleCTA";

const AumentoSimulator = () => {
  const [currentPension, setCurrentPension] = useState(180000);
  const [currentIncome, setCurrentIncome] = useState(1500000);
  const [newExpenses, setNewExpenses] = useState(350000);

  const ratio = currentIncome > 0 ? Math.round((currentPension / currentIncome) * 100) : 0;
  const expenseGap = newExpenses - currentPension;

  const getRecommendation = () => {
    if (expenseGap > 100000 && ratio < 30) {
      return {
        level: "Base sólida para pedir aumento",
        color: "text-green-700 bg-green-50 border-green-200",
        message: `Los gastos actuales del hijo superan en $${expenseGap.toLocaleString("es-CL")} la pensión actual. La pensión representa solo un ${ratio}% del ingreso del alimentante. Esta combinación suele constituir un argumento sólido ante el tribunal de familia.`,
      };
    } else if (expenseGap > 0) {
      return {
        level: "Existe mérito, pero depende de las pruebas",
        color: "text-amber-700 bg-amber-50 border-amber-200",
        message: `Hay una brecha de $${expenseGap.toLocaleString("es-CL")} entre los gastos del hijo y la pensión actual. Sin embargo, el tribunal evaluará en detalle la capacidad económica real de quien paga y la documentación que presentes para acreditar los gastos.`,
      };
    } else {
      return {
        level: "El caso requiere otros fundamentos",
        color: "text-blue-700 bg-blue-50 border-blue-200",
        message: `Los gastos declarados no superan la pensión actual. Para solicitar aumento con éxito necesitarás acreditar gastos adicionales concretos (educación, salud, actividades) o demostrar una mejora significativa en los ingresos de quien paga.`,
      };
    }
  };

  const rec = getRecommendation();

  return (
    <div className="p-6 sm:p-8 rounded-2xl my-8 border border-gray-100 bg-white shadow-sm">
      <div className="max-w-xl mx-auto">
        <h3 className="text-xl font-bold mb-4 text-gray-900">
          Simulador de Factibilidad de Aumento
        </h3>
        <p className="text-gray-500 mb-6">
          Ingresa los datos actuales para evaluar si existe mérito para solicitar un aumento de pensión ante el tribunal de familia.
        </p>

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Pensión actual ($)
            </label>
            <input
              type="number"
              value={currentPension}
              onChange={(e) => setCurrentPension(Number(e.target.value))}
              className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Ingreso del alimentante ($)
            </label>
            <input
              type="number"
              value={currentIncome}
              onChange={(e) => setCurrentIncome(Number(e.target.value))}
              className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Gastos reales del hijo ($)
            </label>
            <input
              type="number"
              value={newExpenses}
              onChange={(e) => setNewExpenses(Number(e.target.value))}
              className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <div className={`p-5 rounded-xl border ${rec.color} transition-all`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-base uppercase tracking-wider">{rec.level}</span>
          </div>
          <p className="leading-relaxed text-gray-700">{rec.message}</p>
        </div>

        <p className="text-sm text-gray-400 mt-4 leading-relaxed italic">
          *Esta simulación es referencial y no constituye asesoría legal. El resultado definitivo dependerá de las pruebas aportadas, las necesidades reales del hijo y el criterio del juez de familia.
        </p>
      </div>
    </div>
  );
};

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Se puede aumentar la pensión de alimentos en Chile?",
      answer:
        "Sí. Cuando aumentan las necesidades del hijo o mejora la capacidad económica de quien paga, puede solicitarse judicialmente un aumento. El tribunal analizará ambas partes antes de resolver.",
    },
    {
      question: "¿Necesito abogado para pedir aumento?",
      answer:
        "En muchos casos sí es recomendable, especialmente cuando existe oposición o discusión sobre ingresos y gastos. Un abogado de familia puede reunir la documentación correcta y presentar el caso de manera sólida ante el tribunal.",
    },
    {
      question: "¿La pensión sube automáticamente con el IPC?",
      answer:
        "Muchas pensiones tienen reajuste IPC, pero eso no impide pedir un aumento adicional si el monto sigue siendo insuficiente para cubrir las necesidades reales del hijo.",
    },
    {
      question: "¿Qué pasa si el otro padre gana más dinero ahora?",
      answer:
        "Eso puede ser considerado por el tribunal al evaluar un posible aumento de pensión. Sin embargo, debes acreditarlo con pruebas: liquidaciones, información comercial, bienes o nivel de vida observable.",
    },
    {
      question: "¿Cuánto demora el proceso?",
      answer:
        "Depende del tribunal y la complejidad del caso. Puede tardar desde semanas hasta varios meses. Si hay mediación exitosa, el proceso puede cerrarse rápidamente. Si hay juicio, los plazos se extienden.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="Aumento de pensión de alimentos en Chile: cuándo se puede pedir y cómo funciona (Guía 2026)"
        description="Aprende cuándo y cómo solicitar un aumento de pensión de alimentos en Chile en 2026. Requisitos, motivos válidos y el proceso legal paso a paso."
        image="/assets/aumento-pension-alimentos-chile-2026.png"
        url="https://legalup.cl/blog/aumento-pension-alimentos-chile-2026"
        datePublished="2026-05-28"
        dateModified="2026-05-28"
        faqs={faqs}
      />
      <Header onAuthClick={() => { }} />
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
            Aumento de pensión de alimentos en Chile: cuándo se puede pedir y cómo funciona (Guía 2026)
          </h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">Resumen rápido</p>
            <ul className="space-y-2">
              {[
                "Sí puedes pedir aumento de pensión de alimentos en Chile",
                "Debes demostrar que las necesidades del hijo aumentaron o que el otro padre puede pagar más",
                "El aumento NO es automático aunque hayan pasado años",
                "El tribunal revisa ingresos, gastos y capacidad económica de ambas partes",
                "La modificación debe solicitarse judicialmente",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm sm:text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl max-w-3xl leading-relaxed">
            Con el tiempo, muchas pensiones de alimentos quedan desactualizadas. Lo que antes alcanzaba para colegio, alimentación, salud y transporte, hoy muchas veces ya no es suficiente. Si te encuentras en esta situación, la ley permite ajustar ese monto, pero el proceso requiere una solicitud formal ante el tribunal.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>28 de Mayo, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Tiempo de lectura: 10 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
        <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare
            title="Aumento de pensión de alimentos en Chile: cuándo se puede pedir y cómo funciona (Guía 2026)"
            url="https://legalup.cl/blog/aumento-pension-alimentos-chile-2026"
            showBorder={false}
          />

          {/* Intro */}
          <div className="prose prose-lg max-w-none mb-8">
            <p className="text-lg text-gray-600 leading-relaxed">
              Y ahí aparece una pregunta muy frecuente: <strong>¿Se puede pedir aumento de pensión de alimentos en Chile?</strong> La respuesta es sí. Pero igual que ocurre con la rebaja de pensión: el aumento no ocurre automáticamente. Aunque suba el costo de vida, aumenten los gastos del hijo o el otro padre gane más dinero, debes solicitar la modificación ante el tribunal.
            </p>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-xl my-6">
              <p className="font-bold text-amber-950">Importante</p>
              <p className="text-amber-800 leading-relaxed">
                El aumento NO ocurre automáticamente aunque hayan pasado años desde que se fijó la pensión original. Tampoco basta con que el otro padre gane más. Siempre se requiere solicitud judicial, análisis del tribunal y nueva resolución.
              </p>
            </div>
            <p className="text-gray-600 leading-relaxed">
              En esta guía 2026 te explicamos cuándo se puede pedir aumento de pensión de alimentos, qué debe probarse, cómo funciona el proceso y qué factores considera el juez.
            </p>
          </div>

          {/* Qué es un aumento */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Qué es un aumento de pensión de alimentos?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Es una solicitud judicial para aumentar el monto de una pensión ya existente. Puede pedirse cuando cambian las necesidades del hijo, aumentan los gastos, mejora la situación económica de quien paga, o la pensión quedó insuficiente.
            </p>
            <ul className="space-y-2 bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm text-gray-600 mb-4">
              {[
                "Cambió sustancialmente la situación económica del alimentante (a mejor).",
                "El monto original no cubre los gastos actuales reales del hijo.",
                "Han aumentado los gastos de educación, salud o necesidades del menor.",
                "Pasaron varios años sin reajuste real y el costo de vida subió considerablemente.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm sm:text-base">
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600 mt-1" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cuándo se puede pedir */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Cuándo se puede pedir aumento de pensión?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              No existe un plazo mínimo obligatorio. Pero normalmente se solicita cuando existe un cambio relevante en las circunstancias. Los casos más comunes son:
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {[
                {
                  title: "Aumento de gastos del hijo",
                  desc: "Colegio más caro, universidad, salud, tratamientos, transporte, actividades extracurriculares o alimentación. Muy frecuente a medida que los hijos crecen.",
                  icon: "📚",
                },
                {
                  title: "Inflación y costo de vida",
                  desc: "Aunque muchas pensiones se reajustan por IPC, igualmente pueden quedar insuficientes, especialmente después de varios años sin revisión real.",
                  icon: "📈",
                },
                {
                  title: "Mejora económica del alimentante",
                  desc: "Aumento de sueldo, nuevo trabajo con mejor remuneración, crecimiento del negocio o nuevos ingresos relevantes que aumenten su capacidad de pago.",
                  icon: "💰",
                },
                {
                  title: "Cambios en necesidades del hijo",
                  desc: "A medida que los hijos crecen, aumentan muchos gastos normales: ropa, tecnología, actividades sociales, estudios superiores y vida independiente.",
                  icon: "🎓",
                },
              ].map((c, i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-gray-200 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{c.icon}</span>
                    <span className="font-bold text-gray-950">{c.title}</span>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl mb-4">
              <p className="font-bold text-amber-900">Importante: el aumento no es automático</p>
              <p className="text-amber-800 leading-relaxed">
                Muchas personas creen que si el otro padre ahora gana más dinero, automáticamente debe pagar más. Pero no funciona así. Debe existir solicitud judicial, análisis del tribunal y nueva resolución formal.
              </p>
            </div>
          </div>

          <AumentoSimulator />

          <div className="mb-12">
            <InArticleCTA
              message="¿Las necesidades de tu hijo aumentaron y la pensión actual ya no alcanza? Un abogado de familia puede evaluar tu caso y orientarte en el proceso de aumento."
              buttonText="Consultar sobre aumento de pensión"
              category="Derecho Familia"
            />
          </div>

          {/* Qué revisa el juez */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué revisa el juez para decidir?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El tribunal analiza principalmente dos cosas:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {[
                {
                  title: "Necesidades del hijo",
                  desc: "El tribunal analiza gastos reales, nivel de vida, educación, salud y bienestar general. El interés superior del menor siempre es la prioridad.",
                },
                {
                  title: "Capacidad económica de quien paga",
                  desc: "Se revisa sueldo, patrimonio, bienes e ingresos reales. No solo el sueldo formal: también ingresos informales, propiedades y nivel de vida observado.",
                },
                {
                  title: "Proporcionalidad",
                  desc: "La pensión debe ser equilibrada para ambas partes: no desamparar al menor ni arrastrar a quien paga a una situación económica insostenible.",
                },
                {
                  title: "Buena fe procesal",
                  desc: "El tribunal también evalúa si existe ocultamiento de ingresos por parte del alimentante. El patrimonio visible puede ser considerado como evidencia.",
                },
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                  <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                  <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Qué pruebas sirven */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Qué pruebas sirven para pedir aumento?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Mientras más documentación exista, más sólido será el caso. Las pruebas se dividen principalmente en dos grupos:
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-xl">📋</span> Gastos del hijo
                </h4>
                <ul className="space-y-2">
                  {[
                    "Boletas de colegio o universidad",
                    "Gastos médicos y medicamentos",
                    "Transporte y movilización",
                    "Alimentación mensual",
                    "Actividades extracurriculares",
                    "Útiles y materiales escolares",
                    "Arriendo o gastos habitacionales",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-600">
                      <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-xl">💼</span> Antecedentes económicos del alimentante
                </h4>
                <ul className="space-y-2">
                  {[
                    "Liquidaciones de sueldo actuales",
                    "Información comercial o de negocio",
                    "Propiedades o bienes registrados",
                    "Redes sociales (nivel de vida)",
                    "Antecedentes de ingresos informales",
                    "Viajes, vehículos, inversiones",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-600">
                      <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Cómo se solicita */}
          <div className="mb-8 mt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cómo se solicita el aumento?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El proceso generalmente funciona así:
            </p>

            <div className="space-y-4">
              {[
                {
                  title: "Reunir antecedentes",
                  desc: "Debes acreditar el aumento de gastos, las necesidades actuales del hijo y, si es posible, la situación económica actual del alimentante. Mientras más documentado esté el caso, mayor es la solidez ante el tribunal.",
                },
                {
                  title: "Mediación familiar",
                  desc: "En muchos casos la mediación es obligatoria antes de demandar. Si existe acuerdo, puede aprobarse rápidamente. Si no hay acuerdo o una parte no asiste, se emite un acta de mediación frustrada que permite continuar judicialmente.",
                },
                {
                  title: "Presentar demanda",
                  desc: "La solicitud se presenta ante el Tribunal de Familia, generalmente el mismo que fijó la pensión original. Un abogado redactará la demanda con los fundamentos y pruebas correspondientes.",
                },
                {
                  title: "Audiencia",
                  desc: "El juez escuchará a ambas partes, revisará los antecedentes económicos de quien paga y analizará las necesidades del hijo para determinar si el aumento es procedente.",
                },
                {
                  title: "Resolución",
                  desc: "El tribunal puede aumentar la pensión, rechazar la solicitud o modificarla parcialmente. Una vez dictada la sentencia, el nuevo monto es exigible.",
                },
              ].map((step, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex gap-4">
                  <div className="bg-gray-900 p-2 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0 font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{step.title}</h4>
                    <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl my-6">
              <p className="font-bold text-blue-900">¿Desde cuándo rige el aumento?</p>
              <p className="text-blue-800">
                Depende de la resolución judicial. No siempre aplica retroactivamente. Por eso, mientras antes se presente la solicitud, mejor. El tribunal puede considerar la fecha de la demanda como punto de inicio.
              </p>
            </div>
          </div>

          {/* ¿Cuánto puede subir? */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Cuánto puede subir la pensión?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              No existe monto fijo. El juez analiza proporcionalidad, ingresos, necesidades reales y equilibrio económico entre ambas partes.
            </p>

            <div className="bg-green-900 text-white p-8 rounded-3xl relative overflow-hidden my-6">
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 blur-3xl rounded-full -mr-32 -mt-32"></div>
              <h4 className="text-lg font-bold mb-4 text-green-400">Ejemplo práctico</h4>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <p className="font-bold mb-2 text-xs uppercase tracking-wider text-green-300">Hace 5 años:</p>
                  <ul className="space-y-1">
                    <li>Hijo pequeño</li>
                    <li>Pensión fijada: $180.000</li>
                    <li>Gastos básicos cubiertos</li>
                  </ul>
                </div>
                <div>
                  <p className="font-bold mb-2 text-xs uppercase tracking-wider text-green-300">Hoy:</p>
                  <ul className="space-y-1 text-red-100">
                    <li>Colegio, transporte, salud, actividades</li>
                    <li>Inflación acumulada</li>
                    <li>El padre ahora gana considerablemente más</li>
                  </ul>
                </div>
              </div>
              <p className="text-green-200 mt-6 pt-4 border-t border-white/10 leading-relaxed">
                *En este caso podría existir una base sólida para solicitar aumento. El resultado dependerá de las pruebas que se aporten y del criterio del juez de familia.
              </p>
            </div>
          </div>

          {/* Interlink */}
          <div className="mb-6 space-y-3">
            <div className="text-center py-4 border-t border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículos relacionados</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  to="/blog/rebaja-pension-alimentos-chile-2026"
                  className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                >
                  👉 Rebaja de pensión de alimentos en Chile
                </Link>
                <Link
                  to="/blog/deuda-pension-alimentos-chile-2026"
                  className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                >
                  👉 Deuda de pensión de alimentos en Chile
                </Link>
              </div>
            </div>
          </div>

          {/* Casos donde se aprueba / rechaza */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuándo suele aprobarse y cuándo rechazarse?</h2>
            <div className="grid sm:grid-cols-1 gap-4">
              <div className="bg-green-50 border border-green-100 rounded-2xl p-6">
                <h4 className="font-bold text-green-900 mb-4 flex items-center gap-2">
                  <span className="text-lg">✓</span> Suele aprobarse cuando:
                </h4>
                <ul className="space-y-2">
                  {[
                    "Aumentaron gastos educacionales comprobables",
                    "Existen gastos médicos importantes acreditados",
                    "Mejoró la capacidad económica del demandado",
                    "Pasaron varios años sin reajuste real",
                    "La documentación es sólida y ordenada",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-green-800">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
                <h4 className="font-bold text-red-900 mb-4 flex items-center gap-2">
                  <span className="text-lg">✕</span> Suele rechazarse cuando:
                </h4>
                <ul className="space-y-2">
                  {[
                    "Falta de pruebas concretas de gastos",
                    "Gastos poco acreditados o sin documentación",
                    "El alimentante tiene ingresos insuficientes reales",
                    "Solicitudes desproporcionadas sin respaldo",
                    "No se cumplió la mediación previa obligatoria",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-red-800">
                      <span className="text-red-500 font-bold flex-shrink-0">✕</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* InArticle CTA */}
          <InArticleCTA
            message="¿La mediación se frustró o necesitas preparar la demanda de aumento con pruebas sólidas? Consulta con un abogado especialista de LegalUp."
            buttonText="Obtén asesoría legal ahora"
            category="Derecho de Familia"
          />

          {/* Preguntas frecuentes adicionales */}
          <div className="mb-8 mt-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Preguntas frecuentes sobre el proceso</h2>
            <div className="space-y-4">
              {[
                {
                  q: "¿Qué pasa si el otro padre oculta ingresos?",
                  a: "El tribunal puede analizar patrimonio, nivel de vida, bienes y movimientos económicos. No todo depende exclusivamente del sueldo formal declarado.",
                },
                {
                  q: "¿Se puede pedir aumento aunque exista acuerdo previo?",
                  a: "Sí. Aunque exista mediación, acuerdo firmado o sentencia previa, la pensión puede modificarse si cambian las circunstancias de manera relevante.",
                },
                {
                  q: "¿La otra parte puede oponerse?",
                  a: "Sí, puede argumentar que ya paga suficiente, que no aumentaron los gastos o que no tiene capacidad económica. Por eso las pruebas son fundamentales.",
                },
                {
                  q: "¿Puede aumentarse aunque el padre tenga otros hijos?",
                  a: "Sí. El tribunal considera las nuevas cargas familiares, pero eso no elimina la obligación alimenticia. Todo se analiza proporcionalmente.",
                },
                {
                  q: "¿Qué pasa si no paga el aumento aprobado?",
                  a: "Una vez aprobada la nueva pensión, el incumplimiento genera deuda. Pueden solicitarse retenciones, embargo, medidas de apremio y liquidación de la deuda acumulada.",
                },
              ].map((faq, i) => (
                <div key={i} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{faq.q}</h3>
                  <p className="text-gray-700 leading-relaxed">{faq.answer || faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Interlink final */}
          <div className="mb-6">
            <div className="text-center py-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículos relacionados</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  to="/blog/derecho-de-familia-chile-2026"
                  className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                >
                  👉 Derecho de Familia en Chile 2026
                </Link>
                <Link
                  to="/blog/divorcio-de-mutuo-acuerdo-chile-2026"
                  className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                >
                  👉 Divorcio de mutuo acuerdo en Chile
                </Link>
              </div>
            </div>
          </div>

          {/* Conclusión */}
          <div className="prose prose-lg max-w-none mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Sí es posible pedir aumento de pensión de alimentos en Chile cuando las necesidades del hijo aumentan o cuando la capacidad económica del padre o madre que paga mejora de manera relevante. Sin embargo, el cambio no ocurre automáticamente. Aunque hayan pasado años desde que se fijó la pensión original o el costo de vida haya subido considerablemente, el aumento debe solicitarse formalmente ante el tribunal.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Uno de los errores más comunes es asumir todos los gastos adicionales sin revisar judicialmente la pensión. Con el tiempo, eso suele generar desequilibrios importantes donde uno de los padres termina soportando casi toda la carga económica de la crianza.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Los tribunales sí pueden modificar la pensión cuando existen fundamentos reales: mayores gastos educacionales, salud, crecimiento del hijo, inflación o aumento en los ingresos del alimentante. Pero todo debe acreditarse correctamente.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4 font-semibold">
              Mientras más clara sea la documentación y antes se inicie el proceso, mayores posibilidades existen de obtener un ajuste razonable que refleje la situación actual del hijo y de ambas partes.
            </p>
          </div>

          {/* CTA final */}
          <CategoryCTA category="familia" />

          {/* FAQs Schema */}
          <div className="mb-12" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <RelatedLawyers category="Derecho de Familia" />

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare
            title="Aumento de pensión de alimentos en Chile: cuándo se puede pedir y cómo funciona (Guía 2026)"
            url="https://legalup.cl/blog/aumento-pension-alimentos-chile-2026"
          />
        </div>

        <BlogNavigation currentArticleId="aumento-pension-alimentos-chile-2026" />

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
