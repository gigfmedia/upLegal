import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, Info, Shield, Search, MessageSquare, AlertCircle } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadTime } from "@/components/blog/ReadTime";
import CategoryCTA from "@/components/blog/CategoryCTA";
import InArticleCTA from "@/components/blog/InArticleCTA";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Cuánto pueden subir el arriendo legalmente en Chile?",
      answer: "En Chile no existe un tope legal fijo para el reajuste del arriendo. El monto del aumento depende de lo que establezca el contrato. Lo más común es que los contratos vinculen el reajuste al IPC (Índice de Precios al Consumidor). Si el contrato no tiene cláusula de reajuste, el valor no puede modificarse durante su vigencia sin acuerdo de ambas partes."
    },
    {
      question: "¿Me pueden subir el arriendo si no está en el contrato?",
      answer: "No. Si el contrato no establece una cláusula de reajuste, el valor del arriendo debe mantenerse igual durante la vigencia del contrato."
    },
    {
      question: "¿Qué pasa si el dueño quiere subir el arriendo de forma repentina?",
      answer: "Puedes solicitar la base contractual del aumento. Si no existe cláusula de reajuste, el aumento no corresponde."
    },
    {
      question: "¿El arriendo puede subir todos los meses?",
      answer: "Solo si el contrato establece un reajuste mensual, lo cual no es muy común. La mayoría de los contratos utiliza reajustes anuales."
    },
    {
      question: "¿Qué pasa si no acepto el aumento al renovar contrato?",
      answer: "El arrendador puede decidir no renovar el contrato y buscar otro arrendatario. En ese caso deberás entregar la propiedad cuando corresponda."
    },
    {
      question: "¿Qué puedo hacer si me subieron el arriendo más del IPC?",
      answer: "Si tu contrato establece reajuste según IPC y el arrendador cobró más, tienes derecho a reclamar la diferencia. Puedes hacerlo directamente con el arrendador mostrando el contrato, o acudir a un abogado para evaluar una demanda por cobro indebido."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="¿Cuánto pueden subir tu arriendo en Chile 2026? El límite legal y qué hacer si te pasaron"
        description="En Chile el arriendo puede subir según el IPC, pero hay condiciones. Si te subieron más de lo permitido o sin aviso, tienes derechos. Abogado disponible en LegalUp — consulta hoy."
        image="/assets/arriendo-chile-2026.png"
        url="https://legalup.cl/blog/me-subieron-el-arriendo-que-hago-2026"
        datePublished="2026-01-13"
        dateModified="2026-03-16"
        faqs={faqs}
      />
      <Header onAuthClick={() => { }} />
      <ReadingProgressBar />

      {/* Hero Section */}
      <div className="bg-green-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 text-white mb-4">
            <Link to="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>Artículo</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-600">
            ¿Cuánto pueden subir tu arriendo en Chile 2026? El límite legal y qué hacer si te pasaron
          </h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
              Resumen rápido
            </p>

            <ul className="space-y-2">
              {[
                "El arriendo no puede subir arbitrariamente si existe contrato vigente",
                "La mayoría de los reajustes se calculan según IPC",
                "El aumento debe respetar lo pactado en el contrato",
                "Un cobro excesivo puede ser discutido legalmente",
                "Revisar el reajuste a tiempo puede evitar pagos indebidos"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm sm:text-base text-gray-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl text-white max-w-3xl leading-relaxed">
            Entender qué dice tu contrato y cuáles son tus derechos es fundamental para proteger tu presupuesto y evitar cobros abusivos.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-white mt-6 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>13 de Enero, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
               <ReadTime slug="me-subieron-el-arriendo-que-hago-2026" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
        <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare
            title="Me subieron el arriendo, ¿qué hago? Guía completa para arrendatarios en Chile (2026)"
            url="https://legalup.cl/blog/me-subieron-el-arriendo-que-hago-2026"
            showBorder={false}
          />

          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed font-medium">
              Cuando llega el aviso de que el dueño subirá el valor del arriendo, el estrés aparece de inmediato. Para muchas personas, el arriendo representa uno de los gastos mensuales más importantes, por lo que un aumento inesperado puede afectar seriamente el presupuesto familiar.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Sin embargo, no todos los aumentos de arriendo son legales. En Chile existen normas claras que regulan cómo y cuándo puede subir el precio de un arriendo. Por eso es fundamental entender qué dice tu contrato y cuáles son tus derechos como arrendatario.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed text-balance">
              En esta guía te explicamos cuándo el aumento del arriendo es legal, cuándo no corresponde, qué hacer si el dueño quiere subir el precio y cómo negociar correctamente para evitar conflictos.
            </p>
          </div>

          <div className="mb-12 py-2">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Me pueden subir el arriendo cuando quieran?</h2>
            <p className="text-gray-600 mb-4 font-semibold text-lg">
              La respuesta corta es no.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              En Chile, el valor del arriendo no puede modificarse arbitrariamente durante la vigencia del contrato. El precio solo puede aumentar si existe una cláusula específica en el contrato que indique cómo se realizará el reajuste.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Esto significa que el dueño no puede simplemente avisarte que el próximo mes pagarás más si el contrato vigente no contempla ese aumento.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              La relación entre arrendador y arrendatario está regulada por el contrato de arriendo, que funciona como la principal referencia legal para definir derechos y obligaciones de ambas partes.
            </p>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8 mt-10">
              <p className="text-gray-700 font-bold text-lg leading-relaxed">
                Antes de aceptar cualquier aumento, lo primero que debes hacer es revisar cuidadosamente el contrato que firmaste.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Contrato con cláusula de reajuste</h3>
                <p className="text-green-700">El arrendador puede aplicar el aumento siempre que respete la fórmula y periodicidad pactada. Revisa que el cálculo sea correcto y que el aviso se haya dado en los plazos acordados.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Contrato sin cláusula de reajuste</h3>
                <p className="text-red-700">El valor del arriendo no puede modificarse durante la vigencia del contrato. Cualquier aumento exigido sin respaldo contractual es ilegal y puedes rechazarlo.</p>
              </div>
            </div>

            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link
                to="/blog/reajuste-arriendo-ipc-chile-2026"
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 ¿Cómo calcular el reajuste según IPC? (Guía 2026)
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Revisa estas 3 cosas en tu contrato de arriendo</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Para saber si el aumento del arriendo es válido, debes revisar tres elementos clave dentro del contrato.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[
                { title: "Cláusula de reajuste", desc: "Muchos contratos incluyen una cláusula que establece cómo se reajustará el valor del arriendo con el paso del tiempo (UF, IPC o porcentaje fijo)." },
                { title: "Periodicidad del reajuste", desc: "Debes revisar cada cuánto tiempo se puede aplicar el reajuste (mensual, semestral o anual)." },
                { title: "Método de cálculo", desc: "Es importante verificar cómo se calcula exactamente el aumento para asegurar que sea el monto correcto." }
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <div className="bg-gray-900 w-7 h-7 rounded-full flex items-center justify-center text-white mb-4">{i + 1}</div>
                  <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-base text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuándo es legal subir el arriendo en Chile?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El aumento del arriendo es válido cuando se cumplen ciertas condiciones. El reajuste es legal cuando:
            </p>
            <div className="space-y-3 mb-6">
              {[
                "Está expresamente indicado en el contrato",
                "Se respeta la forma de cálculo acordada",
                "Se aplica en la periodicidad establecida"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Por ejemplo, si el contrato establece que el arriendo se reajustará según IPC una vez al año, el arrendador puede aplicar ese aumento cuando corresponda. En ese caso, el reajuste no es arbitrario, sino que simplemente está ejecutando una condición que ambas partes aceptaron al firmar el contrato.
            </p>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Reajuste por IPC anual</h3>
                <p className="text-green-700">Si el contrato indica reajuste anual por IPC, el arrendador solo puede aumentar una vez al año según la variación del índice. Es un aumento predecible y acordado por ambas partes.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Aumento sin cláusula o fuera de plazo</h3>
                <p className="text-red-700">Si no hay cláusula de reajuste o el arrendador intenta subir antes del plazo estipulado, el aumento no es válido. Puedes rechazarlo y seguir pagando el monto original.</p>
              </div>
            </div>
          </div>

          <InArticleCTA
            message="¿No sabes si el aumento que te están cobrando es legal según tu contrato? Un abogado puede revisarlo y orientarte en 24 horas."
            buttonText="Revisar si el aumento es legal"
            category="Derecho Arrendamiento"
          />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuándo NO es legal subir el arriendo?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              También existen situaciones en las que el aumento del arriendo no corresponde. Un aumento puede ser considerado ilegal cuando:
            </p>
            <div className="space-y-3 mb-6">
              {[
                "El contrato no incluye cláusula de reajuste",
                "El arrendador modifica el valor sin acuerdo",
                "Se aplica un porcentaje distinto al pactado",
                "El aumento se realiza antes del plazo establecido"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Por ejemplo, si el contrato indica un reajuste anual y el dueño intenta subir el arriendo a los seis meses, ese aumento no sería válido. En estos casos, el arrendatario tiene derecho a rechazar el aumento y continuar pagando el monto establecido en el contrato vigente.
            </p>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Rechazo fundamentado</h3>
                <p className="text-green-700">Si identificas que el aumento no corresponde, puedes rechazarlo por escrito señalando la cláusula del contrato que lo respalda. Guarda una copia de la comunicación.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Aceptación sin revisar</h3>
                <p className="text-red-700">Si pagas el aumento sin cuestionarlo, podrías estar aceptando tácitamente una modificación del contrato. Siempre revisa antes de pagar un valor distinto al pactado.</p>
              </div>
            </div>
          </div>

          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/derecho-arrendamiento-chile-guia-completa-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 Guía completa de arriendo en Chile: Ley 2026
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si mi contrato de arriendo ya terminó?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Cuando el contrato de arriendo finaliza, la situación cambia un poco. En muchos casos ocurre lo que se conoce como prórroga automática o tácita reconducción. Esto significa que el contrato continúa funcionando bajo las mismas condiciones mientras ninguna de las partes manifieste lo contrario.
            </p>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8">
              <p className="text-gray-700 leading-relaxed font-bold">
                En este escenario, el arrendador puede proponer un nuevo valor de arriendo para renovar el contrato, pero debe existir aviso previo y mutuo acuerdo.
              </p>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si el arrendatario no está de acuerdo con el nuevo valor, puede optar por no renovar el contrato y buscar otra vivienda.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Qué hacer si te subieron el arriendo</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Si recibiste un aviso de aumento de arriendo y no estás seguro de si corresponde, puedes seguir estos pasos.
            </p>
            <div className="space-y-4">
              {[
                { title: "Revisa tu contrato en detalle", desc: "El primer paso siempre debe ser revisar cuidadosamente el contrato de arriendo. Busca específicamente las cláusulas relacionadas con reajustes, duración del contrato y condiciones de renovación.", icon: <Search className="h-5 w-5" /> },
                { title: "Pide explicación por escrito", desc: "Si el dueño propone un aumento, puedes pedirle que explique la base contractual o legal del reajuste. Esto ayuda a evitar malentendidos.", icon: <MessageSquare className="h-5 w-5" /> },
                { title: "Intenta negociar", desc: "En algunos casos es posible negociar un reajuste menor o acordar una transición gradual. Muchos arrendadores prefieren mantener a un arrendatario responsable.", icon: <Shield className="h-5 w-5" /> }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                  <div className="bg-green-900 p-2 rounded-lg text-green-600 font-bold text-base w-9 h-9 flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <span className="font-bold text-gray-900">{item.title}</span>
                    <p className="text-base text-gray-600 mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Me pueden desalojar por no aceptar un aumento?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed font-semibold">
              Esta es una de las dudas más comunes entre los arrendatarios. La respuesta es no.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El arrendador no puede desalojarte simplemente porque no aceptaste un aumento de arriendo que no está contemplado en el contrato. Un desalojo solo puede ocurrir por motivos legales como: no pago del arriendo, término del contrato o incumplimiento grave del contrato.
            </p>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8">
              <p className="text-gray-900 font-bold text-lg mb-2 leading-relaxed">
                Cualquier desalojo debe realizarse mediante un proceso judicial, no por decisión unilateral del dueño.
              </p>
              <p className="text-gray-600 leading-relaxed">
                No permitas que te presionen ilegalmente para salir sin una orden judicial firme.
              </p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Consejos para evitar conflictos de arriendo</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Para prevenir problemas relacionados con el valor del arriendo, es recomendable seguir algunas buenas prácticas:</p>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  "Leer el contrato antes de firmar",
                  "Guardar comprobantes de pago",
                  "Mantener comunicación con el arrendador",
                  "Pedir asesoría legal si es necesario"
                ].map((tip, i) => (
                  <div key={i} className="flex items-center gap-3 text-gray-700">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-base font-medium">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CUANDO CONSULTAR */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿En qué situaciones conviene consultar cuanto antes a un abogado inmobiliario?</h2>
            <p className="text-gray-600 mb-4">Algunas situaciones requieren asesoría legal urgente para evitar que el problema escale.</p>
            <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
              {[
                "Si el arrendador te exige un aumento sin respaldo en el contrato.",
                "Cuando el arrendador amenaza con desalojarte por no aceptar un reajuste.",
                "Si el aumento aplicado no corresponde al método de cálculo pactado en el contrato.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 flex-shrink-0">•</span>
                  <span className="text-gray-700 font-bold">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="mb-12">
            <div className="bg-green-900 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-serif font-bold text-green-600 mb-3">¿Te subieron el arriendo y no sabes si es legal?</h3>
              <p className="text-white mb-6">No todos los aumentos son válidos. Si tu contrato no contempla el reajuste que te están cobrando, puedes rechazarlo. Un abogado puede revisar tu caso en 24 horas.</p>
              <Link to="/abogados-arriendo" className="inline-block bg-white text-green-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors">
                Ver abogados inmobiliarios disponibles
              </Link>
            </div>
          </div>

          {/* Conclusion */}
          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              El aumento del arriendo en Chile está regulado principalmente por el contrato. Esta guía describe las reglas generales sobre cuándo un reajuste es válido y qué hacer si no lo es.El aumento del arriendo en Chile está regulado principalmente por el contrato — no por la voluntad unilateral del arrendador. Si el contrato no tiene cláusula de reajuste, el precio no puede modificarse durante su vigencia sin acuerdo de ambas partes. Si la tiene, el aumento debe calcularse exactamente como lo establece el contrato, usando el IPC oficial del período correcto.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              El error más frecuente es asumir que el arrendador puede subir el arriendo cuando quiera porque "así son las cosas". No es así. Un aumento sin respaldo contractual puede ser rechazado, y si el arrendador insiste en cobrarlo, tienes herramientas legales para cuestionarlo.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              El error más frecuente es asumir que el arrendador puede subir el arriendo cuando quiera porque "así son las cosas". No es así. Un aumento sin respaldo contractual puede ser rechazado, y si el arrendador insiste en cobrarlo, tienes herramientas legales para cuestionarlo.Si te llegó un aviso de aumento, lo primero es revisar tu contrato. Si no hay cláusula de reajuste, puedes rechazar el aumento por escrito. Si la hay, verifica que el cálculo use el IPC correcto del período indicado en el contrato — los errores administrativos son frecuentes y muchas veces se resuelven con un simple correo bien fundamentado.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Si el conflicto persiste o el arrendador amenaza con desalojo por no pagar el aumento, ese es el momento de buscar asesoría legal. Un {" "}
              <Link to="/abogados-arriendo" className="text-green-700 underline hover:text-green-500">
              abogado de arriendo</Link> puede revisar tu contrato y decirte exactamente qué corresponde según tu situación específica.
            </p>
          </div>


          <CategoryCTA category="arriendo" topic="arriendo" />
          {/* FAQ */}
          <div className="mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">Preguntas frecuentes sobre el aumento del arriendo</h2>
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

      <RelatedLawyers category="Derecho Civil" />

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare
            title="Me subieron el arriendo, ¿qué hago? Guía completa Chile 2026"
            url="https://legalup.cl/blog/me-subieron-el-arriendo-que-hago-2026"
          />
        </div>

        <BlogNavigation currentArticleId="me-subieron-el-arriendo-que-hago-2026" />

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
      <BlogConversionPopup category="Derecho Civil" topic="me-subieron-el-arriendo-que-hago-2026.tsx" />
    </div>
  );
};

export default BlogArticle;
