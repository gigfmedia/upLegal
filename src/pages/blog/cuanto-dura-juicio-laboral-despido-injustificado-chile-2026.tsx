import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Calendar, User, Clock, ChevronRight, CheckCircle, Info, Shield, AlertCircle } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import { ReadTime } from "@/components/blog/ReadTime";
import InArticleCTA from "@/components/blog/InArticleCTA";
import CategoryCTA from "@/components/blog/CategoryCTA";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Cuánto dura un juicio laboral por despido injustificado en Chile?",
      answer: "Un juicio laboral por despido injustificado en Chile dura entre 3 y 8 meses en promedio, dependiendo de la carga del tribunal y si el empleador contesta o apela. Si se llega a acuerdo en la Inspección del Trabajo o en la audiencia preparatoria, puede resolverse en semanas."
    },
    {
      question: "¿Qué es más rápido: demandar o ir a la Inspección del Trabajo?",
      answer: "Ir primero a la Inspección del Trabajo es más rápido si hay disposición a negociar — puede resolverse en 2 a 6 semanas. Si el empleador se niega a llegar a acuerdo, de todas formas puedes demandar después con el plazo extendido a 90 días hábiles."
    },
    {
      question: "¿Puedo ganar el juicio si no tengo abogado?",
      answer: "Técnicamente sí, pero es poco recomendable. El procedimiento laboral tiene etapas y plazos específicos, y un error en la presentación de la demanda o en la audiencia puede perjudicar tu caso. El empleador generalmente tiene abogado — ir sin uno pone en desventaja."
    },
    {
      question: "¿Qué pasa si el empleador apela la sentencia?",
      answer: "Si el empleador apela, el caso sube a la Corte de Apelaciones y puede agregar entre 6 y 12 meses al proceso. No todas las sentencias son apeladas — depende del monto en disputa y de la estrategia del empleador."
    },
    {
      question: "¿Cuánto tiempo tengo para demandar después del despido?",
      answer: "Tienes 60 días hábiles desde la fecha del despido para presentar la demanda. Si vas primero a la Inspección del Trabajo dentro de ese plazo, el tiempo se suspende y se amplía hasta 90 días hábiles desde el despido. Vencido ese plazo, pierdes el derecho a demandar."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="¿Cuánto dura un juicio laboral por despido injustificado en Chile 2026?"
        description="Descubre cuánto demora un juicio laboral en Chile en 2026. Conoce los plazos reales, etapas del proceso, cómo acelerarlo y cuándo conviene llegar a acuerdo."
        image="/assets/duracion-juicio-laboral-chile-2026.png"
        url="https://legalup.cl/blog/cuanto-dura-juicio-laboral-despido-injustificado-chile-2026"
        datePublished="2026-05-05"
        dateModified="2026-05-05"
        faqs={faqs}
      />
      <Header onAuthClick={() => { }} />
      <ReadingProgressBar />

      {/* Hero Section */}
      <div className="bg-green-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
            <ChevronRight className="h-4 w-4" />
            <span>Artículo</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-600">
            ¿Cuánto dura un juicio laboral por despido injustificado en Chile 2026?
          </h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
              Resumen rápido
            </p>
            <ul className="space-y-2">
              {[
                "Un juicio laboral por despido injustificado dura entre 3 y 8 meses en promedio",
                "El procedimiento tiene etapas fijas pero los tiempos reales varían por tribunal",
                "Ir primero a la Inspección del Trabajo con todos los antecedentes puede agilizar el proceso significativamente",
                "Múltiples testigos y documentos bien organizados aceleran las etapas del juicio",
                "No responder la demanda es el error que más alarga el proceso"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-base text-gray-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl leading-relaxed">
            Si te despidieron y estás evaluando demandar, una de las primeras preguntas es cuánto tiempo va a tomar. La respuesta honesta es que depende — pero hay rangos reales y factores concretos que puedes evaluar desde hoy.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6 text-base">
            <div className="flex items-center gap-2 text-gray-300">
              <Calendar className="h-4 w-4" />
              <span>6 de Mayo, 2026</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Clock className="h-4 w-4" />
              <ReadTime slug="cuanto-dura-juicio-laboral-despido-injustificado-chile-2026" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
        <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare
            title="¿Cuánto dura un juicio laboral por despido injustificado en Chile 2026?"
            url="https://legalup.cl/blog/cuanto-dura-juicio-laboral-despido-injustificado-chile-2026"
            showBorder={false}
          />

          {/* Introduction */}
          <div className="prose max-w-none mb-12">
            <p className="text-base text-gray-600 leading-relaxed mb-6">
              Esta guía te explica cuánto dura cada etapa del juicio laboral en Chile, qué puede acelerarlo o frenarlo, y qué opciones tienes si quieres resolver más rápido.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿Es mejor intentar conciliar en la Inspección o demandar directamente?</h2>
            <p className="text-gray-600 mb-4">La decisión entre conciliar en la Inspección del Trabajo o presentar una demanda directa puede definir cuánto dura tu proceso legal. Cada opción tiene ventajas y riesgos según tu caso.</p>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Conciliar en Inspección del Trabajo</h3>
                <p className="text-green-700">Si hay disposición a negociar, puedes resolver en 2 a 6 semanas sin costo judicial. Además, el plazo para demandar se extiende hasta 90 días hábiles si no hay acuerdo.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Demandar sin intentar conciliación</h3>
                <p className="text-red-700">Ir directo a tribunales puede alargar el proceso a 4 u 8 meses desde el inicio, y pierdes la oportunidad de un acuerdo rápido que evite el juicio.</p>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cómo funciona el procedimiento laboral en Chile?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Los juicios por despido injustificado en Chile se tramitan en los Juzgados del Trabajo bajo el procedimiento de aplicación general, regulado por el Código del Trabajo. Este procedimiento tiene etapas definidas con plazos establecidos por ley — pero los tiempos reales dependen de la carga de cada tribunal.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">El proceso tiene tres grandes etapas:</p>
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {[
                { title: "1. Etapa previa", desc: "Inspección del Trabajo" },
                { title: "2. Juicio propiamente tal", desc: "Audiencias y prueba" },
                { title: "3. Resolución", desc: "Sentencia y eventual cumplimiento" }
              ].map((item, i) => (
                <div key={i} className="p-5 bg-gray-50 rounded-xl border border-gray-100 text-center">
                  <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Etapa 1 — Inspección del Trabajo (opcional pero recomendada)</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Antes de presentar la demanda, puedes concurrir a la Inspección del Trabajo para intentar una conciliación con el empleador. Esta etapa es voluntaria pero puede ahorrarte meses de juicio.
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-900">¿Cuánto demora?</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              La citación al empleador generalmente ocurre dentro de <strong>2 a 4 semanas</strong> desde que presentas el reclamo.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si hay acuerdo en esa instancia, el caso se resuelve sin juicio y puedes tener el dinero en semanas. Si no hay acuerdo, recibes un acta de conciliación frustrada que te permite presentar la demanda — y el plazo para demandar se extiende hasta 90 días hábiles desde el despido.
            </p>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 mb-8">
              <h3 className="text-blue-900 font-bold mb-4">¿Cuándo conviene ir a la Inspección?</h3>
              <ul className="space-y-3">
                {[
                  "Cuando el monto en disputa es claro y el empleador podría estar dispuesto a negociar",
                  "Cuando quieres explorar un acuerdo antes de asumir los costos de un juicio",
                  "Cuando tienes menos de 60 días hábiles desde el despido y quieres ganar tiempo"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-blue-800">
                    <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿Tu empleador está dispuesto a negociar o se niega al diálogo?</h2>
            <p className="text-gray-600 mb-4">La actitud del empleador frente a una negociación es uno de los factores que más impacta en la duración del proceso. Saber esto desde el principio te ayuda a decidir la mejor estrategia.</p>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Empleador dispuesto a negociar</h3>
                <p className="text-green-700">Si el empleador está abierto al diálogo, puedes resolver en semanas mediante un acuerdo en la Inspección del Trabajo, ahorrándote meses de litigio y costos legales.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Empleador se niega a negociar</h3>
                <p className="text-red-700">Si el empleador se niega a cualquier acuerdo, el caso necesariamente irá a juicio, extendiéndose entre 4 y 8 meses — o más si presenta apelaciones o recursos dilatorios.</p>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Etapa 2 — Presentación de la demanda</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si no hay acuerdo en la Inspección o decides ir directamente a tribunales, el siguiente paso es presentar la demanda ante el Juzgado Laboral competente según el domicilio del empleador o el lugar donde se prestaron los servicios.
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-900">¿Qué incluye la demanda?</h3>
            <ul className="space-y-2 mb-6">
              {[
                "Solicitud de declaración de despido injustificado",
                "Cobro de indemnización por años de servicio",
                "Indemnización sustitutiva del aviso previo si corresponde",
                "Recargo legal sobre la indemnización (entre 30% y 100% según la causal)",
                "Cobro de cualquier pago pendiente del finiquito"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-lg mb-6">
              <p className="text-amber-900 leading-relaxed">
                <strong>¿Cuánto demora desde la demanda hasta la primera audiencia?</strong> Una vez presentada la demanda, el tribunal fija la audiencia preparatoria. Dependiendo de la carga del tribunal, esto puede tomar entre <strong>4 y 8 semanas</strong>.
              </p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Etapa 3 — Audiencia preparatoria</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              En la audiencia preparatoria el juez intenta nuevamente una conciliación entre las partes. Si no hay acuerdo, se organiza el juicio: se fijan los hechos en disputa, se determina qué pruebas se van a presentar y se fija la fecha de la audiencia de juicio.
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-900">¿Cuánto demora?</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              La audiencia preparatoria generalmente dura entre 30 minutos y 2 horas dependiendo de la complejidad del caso. La fecha de la audiencia de juicio se fija en ese mismo momento, normalmente para <strong>4 a 8 semanas después</strong>.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed font-bold">Si las partes llegan a acuerdo en esta etapa, el caso termina aquí.</p>

            <InArticleCTA
              message="¿Estás evaluando demandar por despido injustificado y no sabes si conviene? Un abogado laboral puede revisar tu caso y decirte qué esperar."
              buttonText="Evaluar mi caso con un abogado"
              category="Derecho Laboral"
            />
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Etapa 4 — Audiencia de juicio</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Esta es la etapa central del proceso. En la audiencia de juicio se presentan todas las pruebas: testigos, documentos, liquidaciones de sueldo, correos, contratos. El juez escucha a ambas partes y puede dictar sentencia en la misma audiencia o dentro de un plazo posterior.
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-900">¿Qué factores alargan esta etapa?</h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                "Múltiples testigos que deben declarar",
                "Documentación extensa que revisar",
                "Impugnaciones de prueba por alguna de las partes",
                "Solicitud de informes periciales"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <Shield className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium text-base">{item}</span>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-bold mb-4 text-gray-900">¿Cuánto demora?</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              La audiencia de juicio puede durar entre 2 horas y un día completo dependiendo de la complejidad. En casos simples el juez puede fallar en el acto. En casos complejos puede tomarse <strong>hasta 15 días hábiles</strong> para dictar sentencia.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿Tienes toda la documentación ordenada o te faltan pruebas clave?</h2>
            <p className="text-gray-600 mb-4">La calidad y completez de tu documentación puede acelerar o retrasar significativamente el juicio laboral. Tener todo listo desde el día uno marca una gran diferencia.</p>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Documentación completa y ordenada</h3>
                <p className="text-green-700">Si tienes contratos, liquidaciones de sueldo, finiquito, correos y cualquier prueba organizada desde el inicio, el juicio avanza sin contratiempos y el juez puede fallar más rápido.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Documentación incompleta o desordenada</h3>
                <p className="text-red-700">La falta de documentos clave obliga a suspender audiencias, solicitar oficios a terceros y extender los plazos de prueba, agregando semanas o meses adicionales al proceso.</p>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Etapa 5 — Sentencia y Cumplimiento</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si el juez falla a tu favor, la sentencia declara el despido injustificado y ordena al empleador pagar las indemnizaciones correspondientes más los recargos legales.
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-900">¿Qué pasa si el empleador no paga?</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si el empleador no paga voluntariamente dentro del plazo fijado en la sentencia, puedes solicitar el cumplimiento incidental ante el mismo tribunal. En esta etapa el tribunal puede ordenar medidas de apremio como embargo de cuentas bancarias o bienes del empleador.
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-900">¿Cuánto demora el cumplimiento?</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si el empleador paga voluntariamente, el proceso termina con la sentencia. Si no paga, el proceso de cumplimiento puede agregar <strong>4 a 8 semanas adicionales</strong> dependiendo de los bienes disponibles.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuánto dura el juicio en total?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Sumando todas las etapas, este es el rango realista:</p>

            <div className="overflow-x-auto mb-8">
              <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-200 px-4 py-3 text-left font-bold text-gray-900">Escenario</th>
                    <th className="border border-gray-200 px-4 py-3 text-left font-bold text-gray-900">Duración estimada</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr>
                    <td className="border border-gray-200 px-4 py-3 text-gray-700">Acuerdo en Inspección del Trabajo</td>
                    <td className="border border-gray-200 px-4 py-3 font-medium text-green-600">2 a 6 semanas</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-3 text-gray-700">Acuerdo en audiencia preparatoria</td>
                    <td className="border border-gray-200 px-4 py-3 font-medium text-blue-600">2 a 4 meses</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-3 text-gray-700">Juicio completo sin apelación</td>
                    <td className="border border-gray-200 px-4 py-3 font-medium text-orange-600">4 a 8 meses</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-3 text-gray-700">Juicio con apelación ante la Corte de Apelaciones</td>
                    <td className="border border-gray-200 px-4 py-3 font-medium text-red-600">8 a 18 meses</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="gap-6 mb-8">
              <div className="p-6 bg-green-50 border border-green-200 rounded-2xl shadow-sm mb-8">
                <h4 className="font-bold text-green-900 mb-4">Factores que aceleran el juicio</h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-gray-700 text-base">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span><strong>El empleador no contesta la demanda:</strong> El juicio avanza más rápido porque no hay contradicción que resolver.</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700 text-base">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span><strong>El caso es simple:</strong> Un despido con una sola causal clara y documentación completa es más fácil de resolver.</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700 text-base">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span><strong>Hay acuerdo:</strong> Tanto en la preparatoria como en el juicio las partes pueden llegar a acuerdo.</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700 text-base">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span><strong>Baja carga del tribunal:</strong> Los juzgados fuera de Santiago suelen tener plazos más cortos.</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 bg-red-50 border border-red-200 rounded-2xl shadow-sm">
                <h4 className="font-bold text-red-900 mb-4">Factores que alargan el juicio</h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-gray-700 text-base">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                    <span><strong>Múltiples causales en disputa:</strong> Requiere más prueba y más tiempo.</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700 text-base">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                    <span><strong>El empleador apela:</strong> Si apela ante la Corte de Apelaciones, el proceso se extiende 6 a 12 meses.</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700 text-base">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                    <span><strong>Testigos difíciles de citar:</strong> Si algún testigo no puede presentarse, se puede solicitar una suspensión.</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700 text-base">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                    <span><strong>Errores en la demanda:</strong> Una demanda mal presentada puede requerir correcciones que retrasan el inicio.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Conviene demandar o llegar a un acuerdo?</h2>
            <p className="text-gray-600 mb-6">No hay una respuesta única — depende de tu caso. Algunos factores para evaluar:</p>

            <div className="gap-6 mb-6">
              <div>
                <h4 className="font-bold text-gray-900 mb-4">Conviene intentar acuerdo cuando:</h4>
                <ul className="space-y-3">
                  {[
                    "El monto en disputa es menor y un juicio no justifica el tiempo",
                    "El empleador ha dado señales de disposición a negociar",
                    "Necesitas el dinero pronto"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700 text-base">
                      <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-4 mt-4">Conviene ir a juicio cuando:</h4>
                <ul className="space-y-3">
                  {[
                    "El empleador se niega a pagar lo que corresponde",
                    "El despido fue claramente injustificado y los recargos son significativos",
                    "Tienes documentación sólida y el caso es claro"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700 text-base">
                      <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-4 text-gray-900 font-bold">
              Un abogado laboral puede hacer esta evaluación en una primera consulta y darte una estimación realista del resultado según tu situación específica.
            </p>
          </div>

          {/* <InArticleCTA
            message="¿No sabes si conviene demandar o llegar a un acuerdo? Un abogado laboral puede decirte qué esperar según tu caso específico."
            buttonText="Consultar con abogado laboral"
            category="Derecho Laboral"
          /> */}

          <div className="text-center py-6 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Relacionado</p>
            <Link
              to="/blog/como-demandar-por-despido-injustificado-chile-2026"
              className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
            >
              👉 Cómo demandar por despido injustificado en Chile (Paso a paso)
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Cuando consultar */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿En qué situaciones conviene consultar cuanto antes a un abogado laboral?</h2>
            <div className="space-y-3 mb-6">
              {[
                "Si te despidieron hace menos de 60 días hábiles y no has iniciado acciones legales",
                "Si el empleador no te ha pagado el finiquito o las indemnizaciones que corresponden",
                "Si tienes dudas sobre si el despido fue realmente justificado o no",
                "Si quieres saber cuánto podrías recuperar antes de decidir si demandar o negociar"
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-gray-700">
                  {/* <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" /> */}
                  <span>· {item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA - cuándo consultar */}
          <div className="mb-12 bg-green-900 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold font-serif text-green-600 mb-3">¿Sabes cuánto tiempo podría durar tu juicio laboral?</h3>
            <p className="text-white mb-6">Un abogado laboral puede analizar tu caso y darte una estimación realista de plazos y resultados según tu situación específica.</p>
            <Link
              to="/abogado-laboral"
                className="inline-flex items-center gap-2 group bg-white text-green-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Hablar con un abogado laboral <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Conclusion */}
          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Un juicio laboral por despido injustificado en Chile no es inmediato, pero tampoco tiene que ser interminable. Con el procedimiento correcto, documentación en orden y asesoría legal adecuada, la mayoría de los casos se resuelve entre 3 y 8 meses — y muchos antes si hay disposición a negociar.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Sin embargo, comprender los plazos del juicio es solo el primer paso. La diferencia entre un caso que se resuelve en semanas y uno que se extiende por más de un año suele ser la calidad de la asesoría legal. Si estás evaluando demandar por despido injustificado, <Link to="/abogado-laboral" className="text-green-700 underline hover:text-green-500">agendar una consulta con un abogado laboral</Link> es la mejor inversión de tiempo que puedes hacer.
            </p>
          </div>


          <CategoryCTA category="laboral" topic="despido" />
          {/* FAQ */}
          <div className="mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">Preguntas frecuentes</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-6">
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
        <div className="mt-8">
          <BlogShare
            title="¿Cuánto dura un juicio laboral por despido injustificado en Chile 2026?"
            url="https://legalup.cl/blog/cuanto-dura-juicio-laboral-despido-injustificado-chile-2026"
          />
        </div>

        <BlogNavigation currentArticleId="cuanto-dura-juicio-laboral-despido-injustificado-chile-2026" />

        <div className="mt-8 text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-green-900 hover:text-green-600 font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Blog
          </Link>
        </div>
      </div>
      <BlogConversionPopup category="Derecho Laboral" topic="despido_injustificado" />
    </div>
  );
};

export default BlogArticle;
