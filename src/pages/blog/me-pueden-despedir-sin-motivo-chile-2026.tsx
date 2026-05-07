import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, Info, Shield, MessageSquare, AlertCircle } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Pueden despedirme sin dar motivos en Chile?",
      answer:
        "Sí. En Chile el empleador puede despedir a un trabajador invocando la causal de necesidades de la empresa o desahucio, sin necesidad de justificar una falta específica. Sin embargo, en ese caso está obligado a pagar indemnización por años de servicio y, si no avisó con 30 días de anticipación, también la indemnización sustitutiva del aviso previo.",
    },
    {
      question: "¿Puedo despedirme sin aviso previo en Chile?",
      answer:
        "Sí. El trabajador puede renunciar en cualquier momento sin necesidad de dar aviso previo, aunque es recomendable hacerlo con al menos 30 días de anticipación como cortesía profesional. Si renuncias, no tienes derecho a indemnización por años de servicio — solo a las vacaciones proporcionales acumuladas.",
    },
    {
      question: "¿Qué pasa si no me pagan el finiquito después del despido?",
      answer:
        "El empleador tiene un plazo para pagar el finiquito desde el término de la relación laboral. Si no cumple, la deuda se reajusta con IPC y se agregan intereses. Puedes reclamar en la Inspección del Trabajo o demandar directamente en el Juzgado del Trabajo para exigir el pago. {VALIDAR plazo exacto}",
    },
    {
      question: "¿Puedo negarme a firmar el finiquito?",
      answer:
        "Sí. No estás obligado a firmar el finiquito si no estás de acuerdo con los montos. También puedes firmarlo con reserva de derechos — escribiendo esa frase antes de tu firma — lo que te permite aceptar el pago sin renunciar a reclamar la diferencia ante el tribunal laboral.",
    },
    {
      question: "¿Puedo demandar si ya firmé el finiquito?",
      answer:
        "Depende de cómo firmaste. Si firmaste con reserva de derechos, puedes demandar la diferencia o impugnar el despido dentro del plazo legal. Si firmaste sin reserva, las posibilidades se reducen pero no desaparecen en todos los casos. Consulta con un abogado laboral antes de asumir que perdiste el derecho.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="¿Me pueden despedir sin motivo en Chile? (Guía 2026: derechos, causales y qué hacer)"
        description="Aprende si te pueden despedir sin motivo en Chile en 2026. Conoce las causales legales, el significado de 'necesidades de la empresa' y qué hacer para recibir tu indemnización."
        image="/assets/despido-sin-motivo-chile-2026.png"
        url="https://legalup.cl/blog/me-pueden-despedir-sin-motivo-chile-2026"
        datePublished="2026-03-23"
        dateModified="2026-05-04"
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

          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-600 text-balance">
            ¿Me pueden despedir sin motivo en Chile? (Guía 2026: derechos, causales y qué hacer)
          </h1>

          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
              Resumen rápido
            </p>
            <ul className="space-y-2">
              {[
                "No pueden despedirte “sin motivo” en Chile",
                "Siempre deben invocar una causal legal",
                "Puedes recibir indemnización incluso sin culpa",
                "Si no prueban la causal → despido injustificado",
                "Tienes 60 días hábiles para demandar"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm sm:text-base text-gray-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <p className="text-xl leading-relaxed">
            Ser despedido genera muchas dudas, especialmente cuando no hay una explicación clara. Una de las preguntas más frecuentes es: ¿Me pueden despedir sin motivo en Chile?
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm sm:text-base">
            <div className="flex items-center gap-2 text-gray-300">
              <Calendar className="h-4 w-4" />
              <span>4 de Mayo, 2026</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
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
            title="¿Me pueden despedir sin motivo en Chile? (Guía 2026: derechos y qué hacer)"
            url="https://legalup.cl/blog/me-pueden-despedir-sin-motivo-chile-2026"
            showBorder={false}
          />

          {/* Introduction */}
          <div className="prose max-w-none mb-12">
            <p className="text-base text-gray-600 leading-relaxed mb-6">
              Ser despedido genera incertidumbre, especialmente cuando no hay una explicación clara. Y la pregunta más común es: <strong>¿Me pueden despedir sin motivo en Chile?</strong>
            </p>
            <p className="text-gray-600 font-bold text-lg mb-4">La respuesta correcta es: NO.</p>
            <p className="text-gray-600 leading-relaxed mb-6">
                El empleador no puede despedirte sin invocar una causal legal. Pero —y esto es clave— <strong>sí puede despedirte sin que hayas hecho algo malo</strong>. Ahí es donde muchas personas se confunden.
              </p>
            <div className="bg-blue-50 p-8 rounded-2xl border border-blue-100 mb-8">
              <h3 className="text-blue-900 font-bold mb-4">En esta guía 2026 te explico:</h3>
              <ul className="grid sm:grid-cols-2 gap-3 list-none p-0">
                {[
                  "Cuándo un despido es legal",
                  "Qué causales existen realmente",
                  "Qué pasa si no te dan una razón válida",
                  "Cuánto dinero puedes recibir",
                  "Qué hacer paso a paso"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-blue-800 text-base">
                    <CheckCircle className="h-4 w-4 mt-1 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Se puede despedir a alguien “sin motivo”?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Legalmente, no. En Chile, todo despido debe:
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {[
                { title: "Legalidad", desc: "Basarse en una causal del Código del Trabajo" },
                { title: "Formalidad", desc: "Estar por escrito" },
                { title: "Transparencia", desc: "Explicar los hechos detalladamente" }
              ].map((item, i) => (
                <div key={i} className="p-5 bg-gray-50 rounded-xl border border-gray-100 text-center">
                  <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed font-bold italic">
              Si no cumple esto → el despido puede ser ilegal.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Entonces, ¿por qué dicen que sí se puede despedir “sin motivo”? Porque existe una causal clave: <strong>Necesidades de la empresa</strong>. Esta causal permite despedir aunque no hiciste nada malo, no cometiste faltas y tu desempeño era correcto.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué significa “necesidades de la empresa”?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Es una causal amplia que incluye:</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                "Reestructuración o modernización",
                "Baja en las ventas o ingresos",
                "Cambios internos en la organización",
                "Eliminación definitiva de cargos"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <Shield className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium text-sm sm:text-base">{item}</span>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-2xl mb-8">
              <p className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                Pero OJO:
              </p>
              <p className="text-amber-800 leading-relaxed">
                No basta con decirlo. El empleador debe poder probarlo. Muchas empresas usan esta causal sin justificación real, para despedir selectivamente o para evitar conflictos. Y ahí aparece el <strong>despido injustificado</strong>.
              </p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Causales de despido en Chile (explicadas fácil)</h2>
            <div className="space-y-8">
              <section className="p-6 border rounded-2xl bg-white shadow-sm">
                <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <span className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center text-sm font-normal">1</span>
                  Necesidades de la empresa
                </h3>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>No requiere culpa del trabajador</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Da derecho a indemnización obligatoria</span>
                  </li>
                </ul>
                <p className="text-gray-600">Es la más usada en el sistema laboral chileno.</p>
              </section>

              <section className="p-6 border rounded-2xl bg-white shadow-sm">
                <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <span className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center text-sm font-normal">2</span>
                  Conducta del trabajador
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">Incluye faltas como incumplimiento grave, faltas reiteradas o conductas indebidas.</p>
                <div className="bg-red-50 p-4 rounded-xl text-red-800 text-sm font-bold flex items-center gap-2 mb-4 border border-red-100">
                  Generalmente sin derecho a indemnización
                </div>
                <p className="text-gray-600">El empleador DEBE probar la falta para que sea válido.</p>
              </section>

              <section className="p-6 border rounded-2xl bg-white shadow-sm">
                <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <span className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center text-sm font-normal">3</span>
                  Otras causales
                </h3>
                <div className="flex flex-wrap gap-2">
                  {["Renuncia", "Mutuo acuerdo", "Vencimiento de contrato"].map((item, i) => (
                    <span key={i} className="bg-gray-100 px-4 py-2 rounded-full text-gray-700 text-sm font-medium">{item}</span>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si te despiden sin justificar?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si el empleador no explica bien, no tiene pruebas o usa mal la causal, puedes reclamar. Y eso puede transformarse en un <strong>despido injustificado</strong>.
            </p>
            <div className="text-center py-6 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Guía Paso a Paso</p>
              <Link 
                to="/blog/como-demandar-por-despido-injustificado-chile-2026"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
              >
                👉 ¿Cómo demandar por despido injustificado? Guía 2026
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuánto te deben pagar si te despiden?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Depende directamente de la causal invocada:</p>
            <div className="grid sm:grid-cols-2 gap-6 mb-10">
              <div className="p-6 bg-white border rounded-2xl shadow-sm">
                <h4 className="font-bold text-gray-900 mb-4 text-base">Si es "Necesidades de la empresa"</h4>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 font-bold">
                    Años de servicio
                  </li>
                  <li className="flex items-center gap-2 font-bold">
                    Aviso previo
                  </li>
                  <li className="flex items-center gap-2 font-bold">
                    Vacaciones
                  </li>
                </ul>
              </div>
              <div className="p-6 bg-green-50 border border-green-200 rounded-2xl shadow-sm">
                <h4 className="font-bold text-green-900 mb-4 text-base">Si es Injustificado</h4>
                <p className="text-green-800 font-bold text-base mb-4">Todo lo anterior + recargo de hasta 80%</p>
                <p className="text-green-700 text-sm">Aquí está la diferencia económica real que puedes obtener.</p>
              </div>
            </div>

            <div className="border rounded-3xl p-8 mb-8">
              <h4 className="text-xl text-center font-bold text-gray-900 mb-6 gap-2">
                Ejemplo real de cálculo
              </h4>
              <div className="space-y-4 max-w-md mx-auto">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Sueldo mensual:</span>
                  <span className="font-bold">$800.000</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Antigüedad (3 años):</span>
                  <span className="font-bold">$2.400.000</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Aviso previo:</span>
                  <span className="font-bold">$800.000</span>
                </div>
                <div className="flex justify-between border-b pb-2 text-green-600 font-bold">
                  <span>Recargo 50% (por demanda):</span>
                  <span>$1.200.000</span>
                </div>
                <div className="flex justify-between pt-4 text-xl font-black text-gray-900">
                  <span>Total Final:</span>
                  <span>$4.400.000</span>
                </div>
              </div>
            </div>

            <div className="text-center py-6 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Calcula tu pago exacto</p>
              <Link 
                to="/blog/cuanto-me-corresponde-anos-de-servicio-chile-2026"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
              >
                👉 ¿Cuánto me corresponde por años de servicio? Guía 2026
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-8 text-gray-900">¿Qué hacer si te despiden?</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">Aquí es donde la mayoría se equivoca. Sigue estos 5 pasos críticos:</p>
            <div className="space-y-6">
              {[
                { t: "Revisa la carta de despido", d: "La carta de despido no es un simple trámite. Debe incluir la causal exacta, los hechos detallados que la justifican y la fecha exacta del término de la relación laboral. Si alguno de estos elementos falta o está mal redactado, tienes una ventaja legal inmediata que un abogado puede aprovechar a tu favor." },
                { t: "No firmes nada sin entender", d: "El finiquito es el documento más importante del proceso y también el más peligroso si no lo lees bien. Si firmas sin reserva de derechos, estás renunciando a tu derecho a demandar — aunque el despido haya sido injustificado. Antes de estampar tu firma, muéstraselo a un abogado." },
                { t: "Guarda todas tus pruebas", d: "Todo cuenta: tu contrato de trabajo, las últimas liquidaciones de sueldo, mensajes de WhatsApp con tu jefe o compañeros, correos electrónicos y el nombre de posibles testigos. En un juicio laboral, las pruebas lo son todo. Guárdalas ahora antes de que desaparezcan." },
                { t: "Evalúa tu caso seriamente", d: "No todos los despidos son iguales. La pregunta clave es: ¿la causal que usaron es real, pueden probarla y está bien aplicada según la ley? Muchos empleadores cometen errores en este proceso que los dejan en una posición muy débil frente a un tribunal." },
                { t: "Actúa rápido", d: "El reloj ya está corriendo. En Chile tienes exactamente 60 días hábiles desde la fecha del despido para presentar una demanda laboral. No son días corridos — son hábiles. Pero no esperes al último momento. Mientras más rápido actúes, más opciones tienes." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
                  <div className="bg-gray-900 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold flex-shrink-0">{i + 1}</div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{item.t}</h4>
                    <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center py-6 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Evita errores en tu finiquito</p>
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
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cómo saber si tu despido fue injustificado?</h2>
            <p className="text-gray-600 mb-6">Busca estas señales claras:</p>
            <ul className="space-y-4">
              {[
                "No entiendes realmente la razón del despido",
                "La empresa sigue contratando gente para el mismo cargo",
                "No existen pruebas objetivas de lo que dice la carta",
                "Te despidieron de forma repentina sin avisos previos",
                "La carta de despido es genérica y sin detalles"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-600">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-gray-600 font-bold">Si ves esto, hay una probabilidad muy alta de éxito en una demanda.</p>

            <div className="text-center py-6 border-t border-b border-blue-100 mt-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Inicia tu reclamo</p>
              <Link 
                to="/blog/como-demandar-por-despido-injustificado-chile-2026"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
              >
                👉 Guía Completa: Cómo demandar por despido injustificado
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Se puede demandar?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Sí. Puedes iniciar una demanda por despido injustificado. El primer paso suele ser la <strong>Inspección del Trabajo</strong>.</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <div className="p-5 border rounded-xl">
                <h4 className="font-bold text-gray-900 mb-2">Plazos del proceso</h4>
                <p className="text-gray-600">1–2 meses para el inicio</p>
                <p className="text-gray-600">3–6 meses de juicio</p>
                <p className="text-gray-600">6–8 meses para el resultado final</p>
              </div>
              <div className="p-5 border rounded-xl bg-gray-50">
                <h4 className="font-bold text-gray-900 mb-2">Error común</h4>
                <p className="text-gray-600">Pensar que “no hay nada que hacer”. Muchos despidos son mal aplicados y no tienen respaldo real.</p>
              </div>
            </div>
            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 mb-8">
              <p className="text-amber-900 leading-relaxed font-bold">¿Qué pasa si no tienes contrato? Igual puedes reclamar. Puedes probar la relación con pagos, testigos y mensajes de instrucciones.</p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Estrategia real (lo que no te dicen)</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">No todos los casos llegan a juicio. Muchos terminan en <strong>acuerdo o conciliación</strong>.</p>
            <div className="p-6 border-2 border-dashed border-gray-200 rounded-2xl text-center">
              <p className="text-gray-900 font-bold text-base mb-2">Escenario típico de éxito:</p>
              <p className="text-gray-600">Te despiden → Reclamas → Demandas → La empresa negocia para evitar costos → <strong>Recibes tu pago más rápido y con menos riesgo.</strong></p>
            </div>
          </div>

          
          {/* Conclusion */}
          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              En Chile, todo despido debe estar respaldado por una causal legal. Sin embargo, causales como "necesidades de la empresa" le dan al empleador cierta flexibilidad para terminar contratos sin acreditar una falta específica del trabajador — siempre que pague las indemnizaciones que corresponden.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              El problema más frecuente no es el despido en sí, sino que muchos trabajadores no saben exactamente qué les corresponde recibir, firman el finiquito sin revisarlo y pierden el derecho a reclamar diferencias que pueden ser significativas.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Si te despidieron y tienes dudas sobre si la causal es válida, si el monto del finiquito es correcto o si puedes demandar, el momento de actuar es antes de que venzan los plazos. Tienes 60 días hábiles desde el despido — ese tiempo se acaba rápido.
            </p>
            <p className="text-gray-600 font-bold leading-relaxed">
              No firmes nada que no entiendas. Si no estás de acuerdo con algún monto, firma con reserva de derechos. Y si crees que el despido fue injustificado, consulta con un abogado laboral antes de decidir qué hacer.
            </p>
          </div>

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

        {/* CTA Section */}
        <section className="bg-white rounded-xl shadow-sm p-8 text-center mt-8 border">
          <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">Consulta con un abogado</h2>
          <p className="text-base text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
            Si crees que tu despido fue injustificado, puedes recibir orientación legal. En LegalUp puedes encontrar abogados que analicen tu caso y te orienten.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/search?category=Derecho+Laboral">
              <Button
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_consultar_abogado', {
                    article: window.location.pathname,
                    location: 'blog_cta_despido_primary',
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
            title="¿Me pueden despedir sin motivo en Chile? (Guía 2026: derechos, causales y qué hacer)"
            url="https://legalup.cl/blog/me-pueden-despedir-sin-motivo-chile-2026"
          />
        </div>

        <BlogNavigation
          nextArticle={{
            id: "como-demandar-por-despido-injustificado-chile-2026",
            title: "Cómo demandar por despido injustificado en Chile (paso a paso 2026)",
            excerpt: "Si te despidieron y crees que fue injusto, conoce cómo demandar paso a paso en 2026. Plazos, requisitos e indemnizaciones.",
            image: "/assets/demandar-despido-injustificado-chile-2026.png"
          }}
        />

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
  );
};

export default BlogArticle;
