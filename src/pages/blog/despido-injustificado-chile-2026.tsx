import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, Info, AlertCircle, XCircle } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import InArticleCTA from "@/components/blog/InArticleCTA";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Qué es el despido injustificado en Chile?",
      answer: "El despido injustificado ocurre cuando el empleador termina el contrato sin una causa legal válida, o cuando la causa invocada no puede probarse. En Chile, las causales válidas de despido están establecidas en el Código del Trabajo. Si el empleador no las acredita ante el tribunal, el despido se declara injustificado y debe pagar indemnizaciones adicionales."
    },
    {
      question: "¿Cuánto me deben pagar si me despiden injustificadamente?",
      answer: "Si el despido es declarado injustificado, el empleador debe pagar: indemnización por años de servicio (un mes de remuneración por año trabajado), indemnización sustitutiva del aviso previo si no avisaron con 30 días de anticipación, y un recargo de entre 30% y 100% sobre la indemnización por años de servicio según la causal invocada."
    },
    {
      question: "¿Cuánto tiempo tengo para demandar por despido injustificado?",
      answer: "Tienes 60 días hábiles desde la fecha del despido para presentar la demanda ante el Juzgado del Trabajo. Si presentas un reclamo en la Inspección del Trabajo dentro de ese plazo, el tiempo se suspende y se amplía hasta 90 días hábiles desde el despido."
    },
    {
      question: "¿Puedo negociar antes de ir a juicio?",
      answer: "Sí. Puedes concurrir a la Inspección del Trabajo para intentar una conciliación con el empleador antes de demandar. Si se llega a acuerdo, se evita el juicio. Si no hay acuerdo, el plazo para demandar se reactiva desde ahí."
    },
    {
      question: "¿Cuánto dura un juicio por despido injustificado en Chile?",
      answer: "Un juicio laboral por despido injustificado en Chile puede durar entre 3 y 8 meses dependiendo de la carga del tribunal y la complejidad del caso. El procedimiento laboral tiene audiencias fijas, pero los tiempos reales varían según el juzgado."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="Despido injustificado en Chile 2026: qué te corresponde y cómo reclamar"
        description="Si te despidieron sin causa justificada en Chile, tienes derecho a indemnización. Conoce los montos, plazos y pasos para reclamar. Abogado laboral disponible en LegalUp."
        image="/assets/despido-injustificado-chile-2026.png"
        url="https://legalup.cl/blog/despido-injustificado-chile-2026"
        datePublished="2026-04-01"
        dateModified="2026-04-01"
        faqs={faqs}
      />
      <Header onAuthClick={() => {}} />
      <ReadingProgressBar />

      {/* Hero Section */}
      <div className="bg-green-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
            <ChevronRight className="h-4 w-4" />
            <span>Artículo</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold font-serif text-green-600 mb-6">
            Despido injustificado en Chile: qué hacer, cómo demandar y cuánto puedes ganar (Guía 2026)
          </h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
              Resumen rápido
            </p>

            <ul className="space-y-2">
              {[
                "Ocurre cuando el empleador pone término al contrato sin una causa legal válida",
                "El trabajador puede demandar para obtener un recargo legal sobre su indemnización",
                "El plazo para demandar es de 60 días hábiles desde la fecha del despido",
                "Es fundamental no firmar el finiquito sin incluir una reserva de derechos",
                "La carga de probar la causal del despido recae siempre sobre el empleador"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm sm:text-base text-gray-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>


          <p className="text-xl max-w-3xl leading-relaxed">
            Ser despedido del trabajo es una situación difícil. Pero cuando el despido ocurre sin una causa válida o sin respetar la ley, se trata de un despido injustificado, y tienes derecho a reclamar.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>1 de Abril, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Tiempo de lectura: 15 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
        <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare
            title="Despido injustificado en Chile: qué hacer, cómo demandar y cuánto puedes ganar (Guía 2026)"
            url="https://legalup.cl/blog/despido-injustificado-chile-2026"
            showBorder={false}
          />

          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed mb-4">
              En Chile, la ley protege a los trabajadores frente a despidos arbitrarios, permitiendo exigir indemnizaciones e incluso recargos adicionales si el empleador no cumple con las normas.
            </p>
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 mb-8">
              <p className="font-semibold text-blue-900 mb-3">En esta guía 2026 te explicamos:</p>
              <ul className="space-y-2">
                {[
                  "Qué es un despido injustificado",
                  "Cuándo se considera ilegal",
                  "Qué hacer paso a paso",
                  "Cuánto dinero puedes recibir",
                  "Cómo demandar",
                  "Plazos importantes"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-blue-800">
                    <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <span className="text-base">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section 1: Qué es */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué es un despido injustificado?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Un despido injustificado ocurre cuando el empleador termina la relación laboral sin una causa legal válida o sin poder probarla.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              En Chile, el empleador debe basarse en causales establecidas en el Código del Trabajo. Si no lo hace, o no puede demostrarlo, el despido puede ser declarado injustificado por un tribunal.
            </p>

            <div className="text-center py-6 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Guía Paso a Paso</p>
              <Link 
                to="/blog/como-demandar-por-despido-injustificado-chile-2026"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
              >
                👉 Cómo demandar por despido injustificado (Paso a Paso 2026)
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Section 2: Cuándo */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuándo se considera injustificado?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Algunos casos comunes:</p>
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-6 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0">1</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-3 text-gray-900">No hay causa clara</h3>
                  <p className="text-gray-600 leading-relaxed">El empleador simplemente decide despedir sin explicación suficiente.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0">2</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-3 text-gray-900">La causa no se puede probar</h3>
                  <p className="text-gray-600 leading-relaxed">Aunque se invoque una causal, si no hay pruebas, el despido puede ser invalidado.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0">3</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-3 text-gray-900">Uso incorrecto de causales</h3>
                  <p className="text-gray-600 mb-4 leading-relaxed">Ejemplo:</p>
                  <ul className="space-y-2">
                    {[
                      "Invocar \"necesidades de la empresa\" sin fundamento real",
                      "Despedir por razones personales disfrazadas"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-600">
                        <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                        <span className="text-base">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0">4</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-3 text-gray-900">Despido discriminatorio o arbitrario</h3>
                  <p className="text-gray-600 mb-4 leading-relaxed">Casos donde el despido se basa en:</p>
                  <ul className="space-y-2">
                    {[
                      "Razones personales",
                      "Represalias",
                      "Situaciones injustas"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-600">
                        <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                        <span className="text-base">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Derechos */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué derechos tienes si te despiden injustificadamente?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Si se declara injustificado, puedes obtener:</p>

            <div className="space-y-6">
              <div className="flex items-start gap-4 p-6 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0">1</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-3 text-gray-900">Indemnización por años de servicio</h3>
                  <p className="text-gray-600 mb-4 leading-relaxed">Puedes revisar cómo se calcula en detalle:</p>
                  <div className="text-center py-4 border-t border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
                    <Link
                      to="/blog/cuanto-me-corresponde-anos-de-servicio-chile-2026"
                      className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
                    >
                      👉 ¿Cuánto me corresponde por años de servicio? Guía 2026
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0">2</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-3 text-gray-900">Indemnización sustitutiva de aviso previo</h3>
                  <p className="text-gray-600 leading-relaxed">Si no te avisaron con 30 días, corresponde un sueldo adicional.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 border rounded-xl bg-amber-50 border-amber-200 transition-colors">
                <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0">3</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-3 text-gray-900">Recargo legal</h3>
                  <p className="text-gray-600 mb-4 font-semibold">Este es el punto más importante.</p>
                  <p className="text-gray-600 mb-4 leading-relaxed">El tribunal puede aumentar la indemnización entre:</p>
                  <ul className="space-y-2 mb-4">
                    {["30%", "50%", "80%", "Hasta 100%"].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-700 font-semibold">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-base">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-amber-900 font-bold">Esto puede duplicar lo que recibes.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Cuánto puedes ganar */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuánto dinero puedes ganar?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Depende de tu sueldo y antigüedad.</p>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Ejemplo real</h3>
              <ul className="space-y-2 mb-4">
                {[
                  "Sueldo: $900.000",
                  "Años: 6"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-700">
                    <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <span className="text-base font-medium">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <p className="text-gray-700"><span className="font-semibold">Indemnización base:</span> <span className="font-bold text-gray-900">$900.000 × 6 = $5.400.000</span></p>
                <p className="text-gray-700"><span className="font-semibold">Aviso previo:</span> <span className="font-bold text-gray-900">$900.000</span></p>
                <p className="text-gray-700 font-bold">Total: $6.300.000</p>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                <p className="text-gray-700 mb-2">Si el juez aplica 50%:</p>
                <p className="text-gray-700">$5.400.000 × 1.5 = <span className="font-bold text-gray-900">$8.100.000</span></p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                  <p className="text-green-900 font-bold text-xl">Total final aproximado: $9.000.000</p>
                </div>
              </div>
            </div>

            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Para calcular el monto exacto, revisa nuestra guía completa:</p>
              <Link 
                to="/blog/cuanto-me-corresponde-anos-de-servicio-chile-2026" 
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 ¿Cuánto me corresponde por años de servicio en Chile?
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <InArticleCTA
              message="¿Quieres saber cuánto te corresponde exactamente? Un abogado puede calcularlo contigo."
              category="Derecho Laboral"
            />

            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link 
                to="/blog/como-calcular-tu-finiquito-chile-2026" 
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 ¿Cuánto te deben pagar en el finiquito? Calculadora 2026
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Section 5: Qué hacer */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué hacer si te despiden injustificadamente?</h2>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
              <p className="text-red-900 font-bold">Este paso es crítico.</p>
            </div>

            <div className="space-y-6">
              <div className="p-5 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gray-900 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0 font-normal">1</div>
                  <span className="font-bold text-gray-900 text-lg">No firmar el finiquito sin revisar</span>
                </div>
                <p className="text-base text-gray-600 mb-3">Puedes firmar con:</p>
                <p className="text-gray-700 font-semibold mb-2">Reserva de derechos</p>
                <p className="text-gray-600">Esto te permite reclamar después.</p>
                <div className="mt-4">
                  <Link
                    to="/blog/reserva-de-derechos-finiquito-chile-2026"
                    className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:underline text-sm"
                  >
                    👉 Cómo escribir la reserva de derechos paso a paso
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="p-5 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gray-900 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0 font-normal">2</div>
                  <span className="font-bold text-gray-900 text-lg">Revisar la carta de despido</span>
                </div>
                <p className="text-base text-gray-600 mb-3">Debe indicar:</p>
                <ul className="space-y-2 mb-3">
                  {[
                    "Causal legal",
                    "Hechos concretos",
                    "Fecha"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-base">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-gray-600 italic">Si está mal redactada, es una oportunidad.</p>
              </div>

              <div className="p-5 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gray-900 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0 font-normal">3</div>
                  <span className="font-bold text-gray-900 text-lg">Reunir pruebas</span>
                </div>
                <p className="text-base text-gray-600 mb-3">Guarda:</p>
                <ul className="space-y-2">
                  {[
                    "Correos",
                    "Mensajes",
                    "Contratos",
                    "Testigos"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gray-900 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0 font-normal">4</div>
                  <span className="font-bold text-gray-900 text-lg">Consultar con un abogado laboral</span>
                </div>
                <p className="text-base text-gray-600">Esto aumenta significativamente tus posibilidades.</p>
              </div>

              <div className="p-5 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gray-900 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0 font-normal">5</div>
                  <span className="font-bold text-gray-900 text-lg">Evaluar demanda</span>
                </div>
                <p className="text-base text-gray-600">Puedes reclamar ante tribunales laborales.</p>
              </div>
            </div>
          </div>

          {/* Section 6: Cómo demandar */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cómo se demanda un despido injustificado?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">El proceso es:</p>
            <div className="space-y-4">
              {[
                { n: "1", title: "Reclamo en la Inspección del Trabajo (opcional)", desc: "Puede generar una conciliación." },
                { n: "2", title: "Demanda judicial", desc: "Se presenta en el tribunal laboral." },
                { n: "3", title: "Audiencia", desc: "Se revisan pruebas y argumentos." },
                { n: "4", title: "Sentencia", desc: "El juez decide si el despido fue injustificado." }
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-4 p-5 border rounded-xl hover:bg-blue-50/30 transition-colors">
                  <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0">{step.n}</div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{step.title}</h3>
                    <p className="text-gray-600">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 7: Plazos */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Plazos importantes</h2>
            <p className="text-gray-600 mb-4 leading-relaxed font-semibold">Esto es clave para no perder el derecho:</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-4">
              <p className="text-amber-900 leading-relaxed">
                <strong>60 días hábiles para demandar</strong> desde el despido.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <p className="text-blue-900 leading-relaxed">
                Si haces reclamo en Inspección: puede ampliarse a <strong>90 días</strong>.
              </p>
            </div>

            <InArticleCTA
              message="Cada día cuenta. Un abogado puede evaluar si aún estás dentro del plazo."
              category="Derecho Laboral"
            />
          </div>

          {/* Section 8: Errores comunes */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Errores comunes que debes evitar</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                "Firmar finiquito sin revisar",
                "No guardar pruebas",
                "Dejar pasar los plazos",
                "No asesorarse"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-red-50 p-4 rounded-lg border border-red-100">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <span className="text-base text-gray-700 font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 9: Qué pasa si firmo */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si firmo el finiquito?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">Si firmas sin reserva:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {[
                "Se entiende que aceptas todo",
                "Reduces opciones de reclamar"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-red-50 p-4 rounded-lg border border-red-100">
                  <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <div className="bg-indigo-50 border-l-4 border-indigo-600 p-5 rounded-r-lg">
              <p className="text-indigo-900 font-bold">Siempre revisar antes de firmar.</p>
            </div>

            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">¿Sabes cuánto te deben pagar realmente?</p>
              <Link
                to="/blog/como-calcular-tu-finiquito-chile-2026"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
              >
                👉 ¿Cómo calcular tu finiquito en Chile? Guía 2026
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Section 10: Casos frecuentes */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Casos frecuentes en Chile</h2>
            <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Despidos sin explicación",
                "Uso abusivo de \"necesidades de la empresa\"",
                "Conflictos personales",
                "Represalias"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Conclusion */}
          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              El despido injustificado es una de las situaciones laborales más comunes en Chile, pero también una de las que más herramientas legales entrega al trabajador para defenderse.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Muchos empleadores invocan causales sin respaldo suficiente, utilizan “necesidades de la empresa” de forma incorrecta o no cumplen el procedimiento exigido por la ley. Cuando eso ocurre, el trabajador tiene derecho a reclamar y exigir indemnizaciones adicionales ante los tribunales laborales.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Por eso, actuar rápido es fundamental. Revisar la carta de despido, guardar documentos, no firmar el finiquito sin analizarlo y buscar asesoría legal puede marcar una diferencia importante en el resultado del caso.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Además, muchas personas no saben que el despido injustificado puede aumentar significativamente las indemnizaciones mediante recargos legales, especialmente cuando la causal no logra probarse correctamente.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              El error más común es pensar que “ya no hay nada que hacer” después del despido o firmar documentos sin entender sus consecuencias. En la práctica, muchos trabajadores logran acuerdos o compensaciones mayores cuando reclaman dentro de plazo y presentan un caso sólido.
            </p>
            <p className="text-gray-600 font-bold leading-relaxed">
              Si crees que tu despido fue injusto, arbitrario o sin pruebas reales, lo más importante es actuar antes de que expire el plazo legal. Un análisis temprano del caso puede ayudarte a proteger tus derechos y evitar perder indemnizaciones que podrían corresponderte.
            </p>
          </div>

          {/* FAQ */}
          <div className="mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">Preguntas frecuentes</h2>
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

        {/* CTA Section */}
        <section className="bg-white rounded-xl shadow-sm p-8 text-center mt-8 border">
          <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">¿Te despidieron y crees que fue injusto?</h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
            Habla con un abogado laboral, evalúa tu caso y entiende cuánto puedes reclamar. En LegalUp encuentras especialistas que trabajan en esto todos los días.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/search?category=Derecho+Laboral">
              <Button
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_consultar_abogado', {
                    article: window.location.pathname,
                    location: 'blog_cta_despido_injustificado_primary',
                  });
                }}
                className="bg-gray-900 hover:bg-green-900 text-white px-8 py-3 w-full sm:w-auto shadow-md"
              >
                Hablar con abogado ahora
              </Button>
            </Link>
            
          </div>
        </section>
      </div>

      <RelatedLawyers category="Derecho Laboral" />

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare
            title="Despido injustificado en Chile: qué hacer, cómo demandar y cuánto puedes ganar (Guía 2026)"
            url="https://legalup.cl/blog/despido-injustificado-chile-2026"
          />
        </div>

        <BlogNavigation currentArticleId="despido-injustificado-chile-2026" />

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

      <BlogConversionPopup category="Derecho Laboral" topic="despido" />
    </div>
  );
};

export default BlogArticle;
