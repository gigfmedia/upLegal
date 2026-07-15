import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, AlertCircle } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import CategoryCTA from "@/components/blog/CategoryCTA";
import PreConclusionCTA from "@/components/blog/PreConclusionCTA";
import InArticleCTA from "@/components/blog/InArticleCTA";
import { ReadTime } from "@/components/blog/ReadTime";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

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
      question: "¿Cuándo se puede pedir aumento de pensión de alimentos en Chile?",
      answer:
        "Puedes pedir aumento cuando cambian las circunstancias que justificaron el monto original. Las causales más frecuentes son: aumento demostrable de los ingresos del que paga, incremento real de las necesidades del hijo por edad, educación o salud, o cuando el monto actual ya no cubre los gastos básicos del niño, niña o adolecente. El tribunal evaluará si el cambio es significativo y permanente.",
    },
    {
      question: "¿Necesito abogado para pedir aumento de pensión?",
      answer:
        "No es obligatorio en todos los casos, pero es altamente recomendable cuando el otro padre se opone, cuando hay discusión sobre ingresos reales o cuando el caso involucra montos importantes. Un abogado de familia puede ayudarte a reunir la documentación correcta, representarte en las audiencias y aumentar las posibilidades de éxito.",
    },
    {
      question: "¿La pensión sube automáticamente con el IPC en Chile?",
      answer:
        "Muchas pensiones tienen cláusula de reajuste automático según IPC, lo que significa que el monto se actualiza periódicamente según la inflación. Pero ese reajuste no es lo mismo que un aumento real — si las necesidades del hijo crecieron más que la inflación o si el padre que paga gana significativamente más, puedes pedir un aumento adicional ante el tribunal.",
    },
    {
      question: "¿Qué pasa si el padre que paga gana más dinero ahora?",
      answer:
        "El aumento de ingresos del obligado es una de las causales más sólidas para pedir aumento de pensión. Debes acreditar ese aumento ante el tribunal con documentación concreta: liquidaciones de sueldo, declaraciones de renta, contratos nuevos o cualquier evidencia de mejora económica. El tribunal considerará ese cambio al evaluar si el monto actual sigue siendo proporcional.",
    },
    {
      question: "¿Cuánto demora el proceso de aumento de pensión de alimentos?",
      answer:
        "Si hay acuerdo entre las partes en mediación, puede resolverse en pocas semanas. Si el caso va a juicio porque el otro padre se opone, el proceso puede tardar entre 3 y 6 meses dependiendo de la carga del tribunal y la complejidad del caso. Actuar con documentación completa desde el inicio acelera significativamente los plazos.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="Aumento de pensión de alimentos en Chile: cuándo se puede pedir y cómo funciona (Guía 2026)"
        description="Cuándo y cómo solicitar aumento de pensión de alimentos en Chile: motivos válidos, documentación necesaria, proceso judicial y qué hace el tribunal para determinarlo."
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
              <ReadTime slug="aumento-pension-alimentos-chile-2026" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
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
            <p className="text-gray-600 leading-relaxed">
              Si ya tienes claro que necesitas actuar, puedes{" "}
              <Link to="/abogado-pension-alimentos" className="text-green-700 underline hover:text-green-600">
                consultar con un abogado especialista en pensión de alimentos
              </Link>{" "}
              directamente online para evaluar tu caso.
            </p>
          </div>

          {/* Qué es un aumento */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Qué es un aumento de pensión de alimentos?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Es una solicitud judicial para aumentar el monto de una pensión ya existente. Puede pedirse cuando cambian las necesidades del hijo, aumentan los gastos, mejora la situación económica de quien paga, o la pensión quedó insuficiente.
            </p>
            <ul className="space-y-2 bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm text-gray-600 mb-4">
              {[
                "Cambió sustancialmente la situación económica del alimentante (a mejor).",
                "El monto original no cubre los gastos actuales reales del hijo.",
                "Han aumentado los gastos de educación, salud o necesidades del niño, niña o adolecente.",
                "Pasaron varios años sin reajuste real y el costo de vida subió considerablemente.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm sm:text-base">
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600 mt-1" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-green-800 leading-relaxed text-sm border-l-4 border-green-500 bg-green-50 p-4 mb-12">
              El aumento de pensión se funda en el principio de proporcionalidad y en la obligación legal de adecuar el monto a las necesidades reales y actuales del alimentario. La doctrina de los tribunales de familia chilenos exige que el cambio de circunstancias sea relevante y permanente, no meramente transitorio. Un aumento temporal de ingresos o un gasto extraordinario aislado no constituyen causal suficiente para modificar la pensión.
            </p>


          </div>

          <InArticleCTA category="Derecho de Familia"  title="¿Necesitas aumentar la pensión de alimentos de tus hijos?" message="Un abogado de familia puede evaluar si corresponde el aumento, reunir los antecedentes y presentar la demanda judicial." />


          {/* Cuándo se puede pedir */}
          <div className="mb-12">
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

          </div>

          {/* Qué revisa el juez */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué revisa el juez para decidir?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El tribunal analiza principalmente dos cosas:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {[
                {
                  title: "Necesidades del hijo",
                  desc: "El tribunal analiza gastos reales, nivel de vida, educación, salud y bienestar general. El interés superior del niño, niña o adolescente siempre es la prioridad.",
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
            <p className="text-gray-800 leading-relaxed text-sm border-l-4 border-green-500 bg-green-50 p-4">
              El tribunal evalúa la capacidad contributiva del alimentante considerando no solo sus ingresos formales, sino también su patrimonio y nivel de vida. La jurisprudencia ha establecido que el ocultamiento de rentas o la subdeclaración pueden ser inferidos a partir de indicios como la tenencia de vehículos de alta gama, viajes frecuentes o inversiones inmobiliarias. Este análisis integral busca evitar que el alimentante eluda su obligación mediante estructuras patrimoniales complejas.
            </p>
          </div>

          {/* Qué pruebas sirven */}
          <div className="mb-12">
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
                      <span className="text-green-600 font-bold">✓</span>
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
                      <span className="text-green-600 font-bold">✓</span>
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
                  desc: (
                    <>
                      En muchos casos la mediación es obligatoria antes de demandar. Si existe acuerdo, puede
                      aprobarse rápidamente. Si no hay acuerdo o una parte no asiste, se emite un acta de
                      mediación frustrada que permite continuar judicialmente. Un{" "}
                      <Link to="/abogado-pension-alimentos" className="text-green-700 underline hover:text-green-600">
                        abogado de familia para aumento de pensión
                      </Link>{" "}
                      puede acompañarte desde esta etapa.
                    </>
                  ),
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
          <div className="mb-12">
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
            <p className="text-green-800 leading-relaxed text-sm border-l-4 border-green-500 bg-green-50 p-4">
              No existe un porcentaje fijo legal para el aumento, pero los tribunales suelen guiarse por la relación entre los ingresos del alimentante y las necesidades acreditadas del hijo. El alza no puede ser tan elevada que comprometa la subsistencia del obligado, pues el principio de proporcionalidad exige un equilibrio. En la práctica, los aumentos aprobados oscilan entre un 15% y un 40% del monto original, dependiendo de la magnitud del cambio de circunstancias.
            </p>
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
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuándo suele aprobarse y cuándo rechazarse?</h2>
            <div className="grid sm:grid-cols-1 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                <h4 className="font-bold text-green-900 mb-4 flex items-center gap-2">
                  Suele aprobarse cuando:
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
                      <span className="text-green-500 font-bold flex-shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
                <h4 className="font-bold text-red-900 mb-4 flex items-center gap-2">
                  Suele rechazarse cuando:
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


          {/* Preguntas frecuentes adicionales */}
          <div className="mb-8 mt-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Preguntas frecuentes sobre el proceso</h2>
            <div className="space-y-4">
              {[
                {
                  q: "¿Qué pasa si el otro padre oculta ingresos?",
                  a: "El tribunal puede analizar patrimonio, nivel de vida, bienes y movimientos económicos para determinar la capacidad económica real. No todo depende del sueldo formal declarado — el juez puede considerar vehículos, propiedades, gastos habituales y otros indicadores de ingresos reales.",
                },
                {
                  q: "¿Se puede pedir aumento aunque exista acuerdo previo?",
                  a: "Sí. Aunque exista mediación, acuerdo firmado o sentencia previa, la pensión puede modificarse si cambian las circunstancias de manera relevante. La ley permite revisar el monto cada vez que se acredite un cambio significativo en las necesidades del hijo o en la capacidad económica del que paga.",
                },
                {
                  q: "¿La otra parte puede oponerse al aumento?",
                  a: "Sí. Puede argumentar que ya paga suficiente, que no aumentaron los gastos reales del hijo o que no tiene capacidad económica para pagar más. Por eso la documentación es fundamental — liquidaciones de sueldo, boletas de gastos del hijo, certificados médicos o educacionales que acrediten el aumento real de necesidades.",
                },
                {
                  q: "¿Puede aumentarse la pensión aunque el padre tenga otros hijos?",
                  a: "Sí. El tribunal considera las nuevas cargas familiares del obligado, pero eso no elimina la obligación alimenticia hacia el hijo que pide el aumento. Todo se analiza proporcionalmente — el juez buscará un equilibrio que proteja a todos los hijos sin dejar a ninguno desatendido.",
                },
                {
                  q: "¿Qué pasa si no paga el aumento aprobado?",
                  a: "Una vez aprobada la nueva pensión por el tribunal, el incumplimiento genera deuda acumulada desde la fecha de la resolución. Pueden solicitarse retención del sueldo, embargo de bienes, suspensión de licencia de conducir, prohibición de salida del país y arresto nocturno como medidas de apremio.",
                },
              ].map((faq, i) => (
                <div key={i} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
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

          {/* CUANDO CONSULTAR A UN ABOGADO */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿En qué situaciones conviene consultar cuanto antes a un abogado de familia?</h2>
            <p className="text-gray-600 mb-4">Este artículo ofrece información general, pero hay escenarios donde la asesoría temprana marca la diferencia:</p>
            <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
              <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Cuando las necesidades del hijo han aumentado significativamente y la pensión actual ya no cubre los gastos básicos mensuales.</span></li>
              <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Si el alimentante ha tenido un aumento comprobable de ingresos y se necesita acreditarlo ante el tribunal.</span></li>
              <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Cuando han pasado varios años sin reajuste real y la inflación ha erosionado el valor de la pensión original.</span></li>
              <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Si el hijo ha iniciado estudios superiores o requiere tratamientos de salud que la pensión actual no contempla.</span></li>
            </ul>
            <p className="text-gray-600 mt-4">Una evaluación temprana permite reunir la documentación correcta y evitar rechazos por falta de pruebas suficientes.</p>
          </div>

          {/* CTA before Conclusion */}
          <PreConclusionCTA
            description="Si las necesidades de tu hijo superan la pensión actual y el alimentante tiene capacidad económica para pagar más, un abogado de familia puede preparar la demanda con las pruebas necesarias."
            link="/abogado-pension-alimentos"
            buttonText="Ver abogados de pensión de alimentos"
          />

          {/* Conclusión */}
          <RelatedLawyers category="Derecho de Familia" />

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
            <p className="text-gray-600 leading-relaxed mb-4">
              No esperes a que el desequilibrio sea insostenible para actuar. El tribunal puede considerar el aumento desde la fecha de la solicitud — no desde el momento en que los gastos empezaron a subir. Cada mes que pasa sin presentar la solicitud es un mes más que absorbes tú solo los costos que deberían distribuirse entre ambos padres.
            </p>

            <p className="text-gray-600 leading-relaxed mb-4 font-semibold">
              Este artículo entrega información de carácter general sobre el aumento de pensión de alimentos en Chile. Las particularidades de cada caso, la capacidad económica real del alimentante y las necesidades específicas del hijo pueden incidir en la decisión del tribunal de familia.
            </p>

            <p className="text-gray-600 leading-relaxed">
              Si necesitas solicitar un aumento de pensión y no sabes por dónde empezar, un{" "}
              <Link to="/abogado-pension-alimentos" className="text-green-700 underline hover:text-green-600">
                abogado de familia
              </Link>{" "}
              puede ayudarte a preparar la documentación y representarte ante el tribunal.
            </p>
          </div>

          {/* CTA final */}
          <CategoryCTA category="familia" topic="pension" />

          {/* FAQs Schema */}

          <div className="mb-6" data-faq-section>
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
      <BlogConversionPopup category="Derecho de Familia" topic="aumento-pension" />
    </div>
  );
};

export default BlogArticle;
