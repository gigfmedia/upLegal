import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, AlertCircle, CheckCircle, XCircle, Gavel, Shield, MessageSquare, FileText, Search, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      question: "¿Cómo demandar por despido injustificado en Chile?",
      answer:
        "Puedes comenzar presentando un reclamo en la Inspección del Trabajo, donde se intentará una conciliación con el empleador. Si no hay acuerdo, el siguiente paso es presentar la demanda ante el Juzgado del Trabajo competente. Es recomendable contar con un abogado laboral para calcular correctamente las indemnizaciones y representarte en el juicio.",
    },
    {
      question: "¿Cuánto tiempo tengo para demandar por despido injustificado?",
      answer:
        "Tienes 60 días hábiles desde la fecha del despido para presentar la demanda ante el Juzgado del Trabajo. Si presentas un reclamo en la Inspección del Trabajo dentro de ese plazo, el tiempo se suspende y se amplía hasta 90 días hábiles desde el despido. Vencido ese plazo, pierdes el derecho a demandar.",
    },
    {
      question: "¿Puedo demandar si ya firmé el finiquito?",
      answer:
        "Depende de cómo firmaste. Si firmaste el finiquito con reserva de derechos — escribiendo esa frase antes de tu firma — puedes demandar la diferencia o impugnar el despido. Si firmaste sin reserva, es más difícil pero no imposible dependiendo del caso. Consulta con un abogado antes de asumir que perdiste el derecho.",
    },
    {
      question: "¿Cuánto puedo recibir si gano el juicio por despido injustificado?",
      answer:
        "Si el tribunal declara el despido injustificado, el empleador debe pagar la indemnización por años de servicio más un recargo de entre 30% y 100% sobre ese monto, según la causal invocada. También se suman la indemnización sustitutiva del aviso previo si corresponde y cualquier pago pendiente. En contratos de varios años el total puede ser significativo.",
    },
    {
      question: "¿Cuánto demora un juicio por despido injustificado en Chile?",
      answer:
        "Un juicio laboral por despido injustificado puede durar entre 3 y 8 meses dependiendo de la carga del tribunal y la complejidad del caso. El procedimiento laboral tiene audiencias fijas, pero los tiempos reales varían. Si se llega a acuerdo en la Inspección del Trabajo, puede resolverse en semanas.",
    },
  ];

  const title = "Cómo demandar por despido injustificado en Chile (paso a paso 2026)";
  const url = "https://legalup.cl/blog/como-demandar-por-despido-injustificado-chile-2026";

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title={title}
        description="Guía paso a paso 2026 para demandar por despido injustificado en Chile. Conoce los plazos, requisitos, cuánto puedes ganar y cómo evitar errores comunes."
        image="/assets/demandar-despido-injustificado-chile-2026.png"
        url={url}
        datePublished="2026-05-04"
        dateModified="2026-05-04"
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

          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-600 text-balance">{title}</h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">Resumen rápido</p>
            <ul className="space-y-3">
              {[
                "Tienes 60 días hábiles para demandar",
                "Puedes exigir indemnización + recargos de hasta 80%",
                "El proceso pasa por Inspección del Trabajo + Tribunal",
                "Muchos casos se resuelven con acuerdo antes del juicio",
                "Un error puede hacerte perder millones",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm sm:text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl max-w-3xl mb-8 leading-relaxed">
            Si te despidieron y sientes que no fue justo, es normal preguntarse: <strong>¿Cómo demandar por despido injustificado en Chile?</strong> La respuesta simple es que puedes demandar dentro de 60 días hábiles y exigir indemnización.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>3 de Mayo, 2026</span>
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

      <div className="mx-auto py-12">
        <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8">
          <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
            <BlogShare title={title} url={url} showBorder={false} />

            <div className="prose prose-lg max-w-none mb-12">
              <p className="text-lg text-gray-600 leading-relaxed">
                Pero la realidad es mucho más estratégica. No se trata solo de demandar, sino de cómo lo haces, cuándo lo haces y con qué argumentos. Eso es lo que define si recibes lo mínimo… o varios millones más.
              </p>
              <p className="text-gray-600 leading-relaxed mt-4">
                En esta guía 2026 te explico cómo funciona el proceso real, qué debes hacer paso a paso, cuánto dinero puedes obtener y los errores que te pueden hacer perder todo.
              </p>
            </div>

            <InArticleCTA
              message="¿Te despidieron y crees que fue injusto? Evalúa tu caso ahora y calcula cuánto podrías recibir antes de que venza el plazo."
              buttonText="Hablar con un abogado laboral"
              category="Derecho Laboral"
            />

            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué es un despido injustificado en Chile?</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Un despido es injustificado cuando el empleador no tiene una causa legal válida, no logra probarla, usa una causal incorrecta o aplica mal el procedimiento.
              </p>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6">
                <p className="font-bold text-blue-900 mb-2">Ejemplo real:</p>
                <p className="text-blue-800 leading-relaxed">
                  Te despiden por “necesidades de la empresa”, pero la empresa sigue contratando, no hay reducción real y no pueden justificar la decisión. En ese caso, el despido puede ser declarado injustificado.
                </p>
              </div>

              <h3 className="text-xl font-bold mb-4 text-gray-800">Causales más usadas (y más cuestionadas)</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">Las más comunes en los juicios laborales son:</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  "Necesidades de la empresa",
                  "Incumplimiento grave del trabajador",
                  "Conducta indebida",
                  "Falta de probidad"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-100 rounded-xl">
                    <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-gray-600 italic">
                El problema es que muchas veces estas causales se usan mal o sin respaldo. Ahí es donde nace la oportunidad real de demandar.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué puedes ganar al demandar?</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">Aquí está lo importante: la plata real que puedes recuperar.</p>

              <div className="grid gap-4 mb-8">
                <div className="bg-green-50 border rounded-xl p-5 border-green-100 transition-colors shadow-sm">
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-base sm:text-lg">
                    <span className="text-green-600 font-bold">✓</span>
                    Indemnización por años de servicio
                  </h4>
                  <p className="text-gray-600 leading-relaxed">1 sueldo por cada año trabajado (con tope legal de 11 años).</p>
                </div>
                <div className="bg-green-50 border rounded-xl p-5 border-green-100 transition-colors shadow-sm">
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-base sm:text-lg">
                    <span className="text-green-600 font-bold">✓</span>
                    Sustitutiva de aviso previo
                  </h4>
                  <p className="text-gray-600 leading-relaxed">Si no te avisaron con al menos 30 días de anticipación: te deben pagar 1 sueldo adicional.</p>
                </div>
                <div className="bg-green-900 text-white border rounded-xl p-6 shadow-xl relative overflow-hidden">
                  <h4 className="font-bold mb-2 flex items-center gap-2 text-lg sm:text-xl">
                    Recargo legal (CLAVE)
                  </h4>
                  <p className="opacity-90 leading-relaxed mb-4">El tribunal puede aumentar tu indemnización por años de servicio considerablemente:</p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2"><span>30%</span> <span className="opacity-70">→ error leve</span></li>
                    <li className="flex items-center gap-2"><span>50%</span> <span className="opacity-70">→ no prueban causal</span></li>
                    <li className="flex items-center gap-2 font-bold text-green-400"><span>80%</span> <span className="opacity-70">→ despido grave o abusivo</span></li>
                  </ul>
                  <p className="mt-4 font-bold text-green-400">Este recargo puede duplicar lo que recibes.</p>
                </div>

                <div className="bg-white border border-gray-100 p-6 rounded-2xl">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">Otros pagos posibles</h4>
                  <div className="flex flex-wrap gap-2">
                    {["Vacaciones pendientes", "Horas extra", "Bonos adeudados"].map((item, i) => (
                      <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">{item}</span>
                    ))}
                  </div>
                </div>
              

                <div className="text-center py-6 border-t border-b border-gray-100 my-8">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Calcula tu indemnización</p>
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

            <div className="mb-12 bg-gray-50 border border-gray-100 rounded-2xl p-4 sm:p-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Ejemplo real de éxito</h2>
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-xl border border-gray-200">
                  <p className="text-gray-900 font-semibold mb-4">Sueldo: $900.000 | Antigüedad: 4 años</p>
                  <div className="space-y-3 text-gray-700">
                    <p className="flex justify-between"><span>Base (Años de Servicio):</span> <span className="font-bold">$3.600.000</span></p>
                    <p className="flex justify-between"><span>Aviso previo:</span> <span className="font-bold">$900.000</span></p>
                    <p className="flex justify-between text-green-700 bg-green-50 px-2 py-1 rounded">
                      <span>Recargo 50% (Judicial):</span> <span className="font-bold">+$1.800.000</span>
                    </p>
                    <div className="border-t pt-2 mt-2 flex justify-between text-2xl text-gray-900 font-bold">
                      <span>Total:</span>
                      <span className="text-green-900">$6.300.000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Plazo para demandar (ERROR CRÍTICO)</h2>
              <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mb-6 shadow-sm text-red-900">
                <p className="font-bold text-lg mb-4 italic">Tienes 60 días hábiles desde el despido.</p>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p>No son días corridos (no cuentan domingos ni festivos).</p>
                  </div>
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p>El plazo se suspende si presentas un reclamo en la Inspección del Trabajo.</p>
                  </div>
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p>Máximo absoluto permitido: 90 días totales.</p>
                  </div>
                </div>
                <p className="mt-6 font-bold text-red-900">
                  Si se te pasa el plazo → pierdes el derecho y todo el dinero posible.
                </p>
              </div>
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-8 text-gray-900">Paso a paso: cómo demandar despido injustificado</h2>
              <div className="space-y-6">
                {[
                  {
                    title: "Analizar la carta de despido",
                    desc: "Este documento define tu caso. Revisa la causal, los hechos descritos y la fecha. Si está mal redactada, tienes una ventaja enorme."
                  },
                  {
                    title: "Reunir pruebas (ANTES de todo)",
                    desc: "No esperes al juicio. Reúne contrato, liquidaciones, correos, WhatsApp y testigos. Esto define tu éxito."
                  },
                  {
                    title: "Reclamo en la Inspección del Trabajo",
                    desc: "No es obligatorio, pero sí estratégico. Sirve para intentar un acuerdo rápido, presionar al empleador y suspender el plazo legal."
                  },
                  {
                    title: "Evaluar si conviene demandar",
                    desc: "No todos los casos son iguales. Evalúa el monto posible, la probabilidad de ganar y la conducta del empleador con un especialista."
                  },
                  {
                    title: "Presentar la demanda",
                    desc: "Se ingresa formalmente al Juzgado del Trabajo. Una demanda mal calculada o mal fundamentada significa menos dinero para ti."
                  },
                  {
                    title: "Audiencia preparatoria",
                    desc: "Se definen las pruebas y testigos que se usarán. Es una instancia clave donde también puede haber un acuerdo de último minuto."
                  },
                  {
                    title: "Audiencia de juicio",
                    desc: "Aquí se decide todo. Declaraciones, exhibición de pruebas y defensa. El juez evalúa si el despido fue injustificado según la ley."
                  },
                  {
                    title: "Sentencia",
                    desc: "El tribunal dicta su fallo final. Puede ser un rechazo, un pago parcial o el pago total (escenario ideal para el trabajador)."
                  }
                ].map((step, idx) => (
                  <div key={idx} className="flex gap-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex-shrink-0 w-7 h-7 bg-gray-900 text-white rounded-lg flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <div>
                      <h5 className="font-bold text-gray-900 text-lg mb-1">{step.title}</h5>
                      <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-12">
              <h2 className="text-xl font-bold mb-6 text-gray-900">¿Cuánto demora el proceso?</h2>
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 border rounded-xl text-center">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Preparatoria</p>
                  <p className="text-xl font-bold text-gray-900">1–2 meses</p>
                </div>
                <div className="p-4 border rounded-xl text-center">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Juicio</p>
                  <p className="text-xl font-bold text-gray-900">3–6 meses</p>
                </div>
                <div className="p-4 border rounded-xl text-center bg-green-900 text-white">
                  <p className="text-xs uppercase font-bold text-green-600 tracking-wider mb-2">Sentencia</p>
                  <p className="text-xl font-bold">6–8 meses</p>
                </div>
              </div>
              <p className="text-gray-600">Total estimado: <strong>3 a 8 meses</strong></p>
            </div>

             <InArticleCTA
                message="¿Te despidieron y crees que fue injusto? Evalúa tu caso ahora y calcula cuánto podrías recibir antes de que venza el plazo."
                buttonText="Hablar con un abogado laboral"
                category="Derecho Laboral"
              />

            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Se puede ganar sin juicio?</h2>
              <p className="text-gray-600 mb-6 leading-relaxed"><strong>Sí, y es sumamente común.</strong></p>
              <div className="bg-white border rounded-2xl p-6 shadow-sm">
                <p className="font-bold text-gray-900 mb-4">Escenario típico de negociación:</p>
                <div className="space-y-3">
                  {["Reclamas administrativamente", "Presentas la demanda judicial", "La empresa ve el riesgo legal y de costos", "Te ofrecen un acuerdo por el 70% u 80% de lo demandado"].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-2 w-2 bg-green-600 rounded-full"></div>
                      <span className="text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-green-900 font-bold">Resultado: Recibes el dinero mucho más rápido y con menos estrés.</p>
              </div>
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 italic">Estrategia real (lo que no te dicen)</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">El objetivo NO siempre es llegar a juicio. El objetivo es <strong>maximizar tu pago</strong>.</p>
              <div className="p-8 border rounded-2xl">
                <p className="text-lg leading-relaxed mb-6 font-semibold">Un buen abogado laboral busca:</p>
                <ul className="space-y-4">
                  {[
                    "Detectar la debilidad probatoria del empleador",
                    "Ejercer presión legal mediante medidas precautorias",
                    "Forzar una negociación ventajosa para el trabajador"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Shield className="h-5 w-5 flex-shrink-0 text-green-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-green-900 font-bold">Así es como se gana más dinero, en mucho menos tiempo.</p>

                <div className="text-center py-6 border-t border-b border-gray-100 my-8">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Profundiza en el tema</p>
                  <Link 
                    to="/blog/despido-injustificado-chile-2026"
                    className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
                  >
                    👉 Despido injustificado: Qué es y cuándo demandar
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Errores que te hacen perder la demanda</h2>
              <div className="bg-red-50 border border-red-100 rounded-2xl p-8 space-y-4">
                {[
                  { t: "Firmar finiquito sin reserva de derechos", d: "Pierdes automáticamente el derecho a demandar cualquier monto adicional." },
                  { t: "Esperar demasiado", d: "Si el plazo fatal de 60 días hábiles vence, tu caso es inadmisible para siempre." },
                  { t: "No tener pruebas básicas", d: "Sin evidencia (mensajes, correos, testigos), tu posición en el tribunal es débil." },
                  { t: "Demandar mal calculado", d: "Si pides menos de lo que corresponde por ley, es dinero que nunca podrás recuperar." },
                  { t: "No asistir a audiencias", d: "Tu ausencia o la de tu abogado puede provocar que el caso se cierre definitivamente." }
                ].map((err, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-900 mb-1">{err.t}</h4>
                      <p className="text-red-800 leading-relaxed">{err.d}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center py-6 border-t border-b border-gray-100 my-8">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Evita errores en tu pago</p>
                <Link 
                  to="/blog/como-calcular-tu-finiquito-chile-2026"
                  className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
                >
                  👉 ¿Cómo calcular tu finiquito paso a paso? Guía 2026
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si firmaste el finiquito?</h2>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 p-5 border rounded-2xl">
                  <p className="font-bold text-green-900 mb-2">Con reserva de derechos</p>
                  <p className="text-green-800">→ Tienes la puerta abierta para demandar.</p>
                </div>
                <div className="flex-1 p-5 border rounded-2xl">
                  <p className="font-bold text-red-900 mb-2">Sin reserva de derechos</p>
                  <p className="text-red-800">→ No puedes reclamar nada adicional.</p>
                </div>
              </div>
              <p className="text-gray-900 font-bold">Esto es clave antes de poner tu firma en la notaría.</p>
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si el empleador miente?</h2>
              <p className="text-gray-600 mb-4 leading-relaxed">Es muy común que en la carta de despido se relaten hechos inflados o derechamente falsos.</p>
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200">
                <p className="text-amber-900 leading-relaxed font-semibold">
                  Pero recuerda esto: el empleador debe PROBAR ante un juez lo que dice. Si no puede probar la falta grave o la necesidad de la empresa, ganas con recargo de inmediato.
                </p>
              </div>
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si no tienes contrato?</h2>
              <p className="text-gray-600 mb-4 leading-relaxed">Igual puedes demandar. La ley chilena protege al trabajador aunque no haya un papel firmado.</p>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: "Pagos", detail: "Cartolas bancarias de transferencias de sueldo." },
                  { label: "Testigos", detail: "Compañeros o clientes que te vieron trabajar." },
                  { label: "Mensajes", detail: "WhatsApp donde recibías órdenes o instrucciones." }
                ].map((item, i) => (
                  <div key={i} className="p-4 border rounded-xl bg-white shadow-sm">
                    <p className="font-bold text-gray-900 mb-1">{item.label}</p>
                    <p className="text-gray-600">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Conviene demandar siempre?</h2>
              <p className="text-gray-600 mb-4 leading-relaxed">No siempre, pero sí en la gran mayoría de casos. Conviene especialmente cuando:</p>
              <div className="space-y-3">
                {[
                  "Tienes más de 1 año trabajado en la empresa.",
                  "El despido es dudoso o la causal parece inventada.",
                  "Sientes que no te pagaron bien en el finiquito.",
                  "Hay un abuso claro por parte del empleador."
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuánto cuesta demandar?</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="p-6 border rounded-2xl bg-gray-50">
                  <h4 className="font-bold text-gray-900 mb-4 border-b pb-2">Opción 1: Corporación Judicial</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Gratis para personas de bajos recursos.</li>
                    <li>• Suele ser mucho más lento por la carga.</li>
                  </ul>
                </div>
                <div className="p-6 border rounded-2xl bg-green-50 border-green-200">
                  <h4 className="font-bold text-green-900 mb-4 border-b border-green-200 pb-2">Opción 2: Abogado Particular</h4>
                  <ul className="space-y-2 text-green-800">
                    <li>• Proceso más rápido y personalizado.</li>
                    <li>• Mejor estrategia y mayor presión negociadora.</li>
                    <li>• En muchos casos, se paga solo con el resultado final.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Cómo aumentar lo que puedes ganar</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {["No firmar sin reserva", "Actuar rápido", "Tener pruebas sólidas", "Elegir buena estrategia", "Negociar agresivamente"].map((item, i) => (
                  <div key={i} className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm text-center">
                    <span className="text-gray-700 font-bold text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-gray-700 font-bold text-lg">Estos factores pueden duplicar el resultado económico.</p>
            </div>

            <div className="mb-12 border-t border-gray-100 pt-12">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
              <div className="prose prose-lg text-gray-600 leading-relaxed space-y-6">
                <p>
                  Demandar por despido injustificado en Chile no es solo una opción legal: es una herramienta real para recuperar dinero que puedes estar perdiendo sin darte cuenta.
                </p>
                <p>
                  La mayoría de las personas comete el mismo error: espera demasiado, firma sin entender o simplemente no actúa por miedo o desconocimiento. Y eso tiene un costo directo, porque un despido mal aplicado puede significar millones en indemnización… pero solo si reclamas correctamente.
                </p>
                <p>
                  Además, el sistema laboral chileno está diseñado para proteger al trabajador, pero esa protección no funciona sola. Depende de que tomes acción dentro de plazo, con una estrategia clara y con los argumentos correctos. Si estás en esta situación, lo peor que puedes hacer es quedarte quieto.
                </p>
                <p className="font-bold text-gray-900 bg-gray-100 p-8 rounded-2xl border">
                  Porque cada día que pasa, reduces tus opciones. Actuar a tiempo no solo te permite defenderte: te permite recuperar lo que legítimamente te corresponde.
                </p>
              </div>
            </div>

            <div className="mb-4 border-t border-gray-100 pt-12" data-faq-section>
              <h2 className="text-2xl font-bold mb-8 text-gray-900">Preguntas frecuentes</h2>
              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <div key={i} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                    <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <section className="bg-white rounded-2xl shadow-sm p-8 text-center mt-8 border border-gray-100 mb-12">
            <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">¿Te despidieron y no sabes si fue legal?</h2>
            <p className="text-lg text-gray-600 mb-8">
              Habla con un abogado ahora. Evalúa tu caso, calcula cuánto podrías recibir y decide antes de que venza el plazo legal.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/search?category=Derecho+Laboral">
                <Button
                  size="lg"
                  className="bg-gray-900 hover:bg-green-900 text-white px-8 py-3 w-full sm:w-auto transition-colors shadow-lg"
                >
                  Hablar con un abogado ahora
                </Button>
              </Link>
            </div>
          </section>
        </div>

        <div className="w-full bg-gray-100/50">
          <RelatedLawyers category="Derecho Laboral" />
        </div>

        <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
          <div className="mt-8">
            <BlogShare title={title} url={url} />
          </div>

          <BlogNavigation currentArticleId="como-demandar-por-despido-injustificado-chile-2026" />

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
      </div>
      <BlogConversionPopup category="Derecho Laboral" />
    </div>
  );
};

export default BlogArticle;
