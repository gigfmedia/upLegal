import { Link } from "react-router-dom";
import { Calendar, User, Clock, ChevronRight, AlertCircle, CheckCircle, Scale, Shield, FileText, XCircle, ArrowLeft, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import InArticleCTA from "@/components/blog/InArticleCTA";
import CategoryCTA from "@/components/blog/CategoryCTA";
import { ReadTime } from "@/components/blog/ReadTime";
import { Button } from "@/components/ui/button";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Qué es el autodespido en Chile?",
      answer:
        "El autodespido, también llamado despido indirecto, es una figura legal del Código del Trabajo que permite al trabajador poner término al contrato cuando el empleador incurre en incumplimientos graves. En vez de renunciar y perder las indemnizaciones, el trabajador invoca el artículo 171 y demanda como si hubiera sido despedido injustificadamente. Si el tribunal acoge la demanda, el empleador debe pagar todas las indemnizaciones correspondientes más recargos.",
    },
    {
      question: "¿Qué puedo cobrar si gano un juicio de autodespido?",
      answer:
        "Si el tribunal acoge el autodespido, tienes derecho a indemnización por años de servicio, indemnización sustitutiva del aviso previo, recargos legales sobre la indemnización de entre 30% y 100% según la causal invocada, y cualquier pago pendiente como vacaciones proporcionales, bonos o comisiones. En algunos casos también puedes solicitar indemnización por daño moral si el incumplimiento fue especialmente grave.",
    },
    {
      question: "¿Cuánto tiempo tengo para demandar por autodespido?",
      answer:
        "Tienes 60 días hábiles desde la fecha en que pusiste término al contrato para presentar la demanda ante el Juzgado del Trabajo. Si antes presentas un reclamo en la Inspección del Trabajo, el plazo se suspende y se extiende hasta 90 días hábiles desde el término. Este plazo es crítico — vencido, pierdes el derecho a demandar.",
    },
    {
      question: "¿Puedo hacer autodespido por cotizaciones previsionales impagas?",
      answer:
        "Sí. El no pago de cotizaciones previsionales es una de las causales más frecuentes y sólidas de autodespido en Chile. Para invocarlo correctamente debes acreditar que las cotizaciones están impagas, enviar la carta de autodespido al empleador dentro del plazo legal y presentar la demanda ante el tribunal. El empleador tiene una oportunidad de pagar las cotizaciones antes de que el tribunal falle, lo que puede afectar el resultado.",
    },
    {
      question: "¿Necesito abogado para hacer un autodespido?",
      answer:
        "Técnicamente no es obligatorio en todos los casos, pero en la práctica es altamente recomendable. El autodespido requiere una carta formal con la causal correctamente invocada, pruebas del incumplimiento y una estrategia judicial clara. Un error en la carta o en la causal puede hacer que el tribunal rechace la demanda y pierdas todas las indemnizaciones. El empleador generalmente tiene abogado — ir sin uno pone en desventaja.",
    },
  ];

  const title = "Autodespido en Chile: qué es, cuándo aplica y cuánto puedes recibir (Guía 2026)";
  const url = "https://legalup.cl/blog/autodespido-chile-2026";

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title={title}
        description="Guía completa sobre el autodespido en Chile. Aprende qué es, cuándo aplica, qué debes probar y cuánto dinero puedes recibir por incumplimientos del empleador."
        image="/assets/autodespido-chil-2026.png"
        url={url}
        datePublished="2026-05-14"
        dateModified="2026-05-14"
        faqs={faqs}
      />

      <Header onAuthClick={() => { }} />
      <ReadingProgressBar />

      {/* Hero Section */}
      <div className="bg-green-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 mb-4 text-sm opacity-80">
            <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
            <ChevronRight className="h-4 w-4" />
            <span>Artículo</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-600 text-balance">{title}</h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">Resumen rápido</p>
            <ul className="space-y-3">
              {[
                "El autodespido permite al trabajador terminar el contrato por culpa del empleador",
                "También se conoce como “despido indirecto”",
                "Puedes recibir indemnización igual que en un despido injustificado",
                "Debes demandar dentro de 60 días hábiles",
                "Si no logras probar los incumplimientos, puedes perder el caso"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                  <span className="text-sm sm:text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl max-w-3xl mb-8 leading-relaxed">
            Muchas personas creen que solo el empleador puede poner término al contrato de trabajo. Pero en Chile también existe una herramienta legal para el trabajador: el autodespido.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>15 de Mayo, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <ReadTime slug="autodespido-chile-2026" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
        <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare title={title} url={url} showBorder={false} />

          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed font-medium">
              El autodespido — llamado legalmente despido indirecto — permite que el trabajador termine la relación laboral cuando el empleador incumple gravemente sus obligaciones. En estos casos, no solo puedes dejar el trabajo: también puedes exigir indemnizaciones.
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              En esta guía 2026 te explicamos qué es el autodespido en Chile, cuándo aplica, qué debes probar, cuánto podrías recibir y cómo iniciar el proceso correctamente.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 mt-12">¿Qué es el autodespido en Chile?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El autodespido ocurre cuando el trabajador decide poner término al contrato debido a incumplimientos graves del empleador.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              En vez de renunciar, el trabajador comunica que el empleador incumplió sus obligaciones legales o contractuales y luego demanda para exigir indemnizaciones. En términos simples:
            </p>

            <InArticleCTA category="Derecho Laboral" />

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6">
              <p className="font-bold text-blue-900 flex items-center gap-2">
                El trabajador “despide” al empleador.
              </p>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Legalmente, esto se conoce como “despido indirecto” y está regulado por el Código del Trabajo.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 mt-12">¿Cuándo puedes hacer autodespido?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El autodespido no aplica por cualquier problema laboral. Debe existir un incumplimiento grave del empleador. Los casos más comunes en Chile son:
            </p>

            <div className="gap-4">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-4">
                <h3 className="font-bold text-gray-900 mb-2">No pago de cotizaciones previsionales</h3>
                <p className="text-gray-600">Uno de los motivos más frecuentes. Si el empleador no paga AFP, salud o seguro de cesantía, existe base importante para demandar.</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-4">
                <h3 className="font-bold text-gray-900 mb-2">Sueldos atrasados o impagos</h3>
                <p className="text-gray-600">Cuando el empleador paga fuera de plazo, paga parcialmente, deja meses pendientes o elimina pagos acordados.</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-4">
                <h3 className="font-bold text-gray-900 mb-2">Acoso laboral o sexual</h3>
                <p className="text-gray-600">Conductas reiteradas (humillaciones, hostigamiento, amenazas) que afectan al trabajador psicológicamente. El trabajador puede poner término inmediato.</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-4">
                <h3 className="font-bold text-gray-900 mb-2">Modificaciones ilegales del trabajo</h3>
                <p className="text-gray-600">Bajar sueldo unilateralmente, cambiar funciones arbitrariamente, cambiar jornadas sin acuerdo o modificar condiciones esenciales.</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-4">
                <h3 className="font-bold text-gray-900 mb-2">Ambientes inseguros o vulneración de derechos</h3>
                <p className="text-gray-600">Cuando el empleador no protege condiciones mínimas de seguridad o vulnera derechos fundamentales.</p>
              </div>
            </div>
          </div>

          {/* COMPLEJIDAD 1: AUTODESPIDO FUNDAMENTADO VS SIN PRUEBAS */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿Autodespido válido o rechazado? La diferencia clave</h2>
            <p className="text-gray-600 mb-4">El mismo autodespido puede terminar siendo acogido o rechazado por el tribunal dependiendo de las pruebas que tengas para acreditar los incumplimientos del empleador.</p>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Autodespido acogido: pruebas sólidas</h3>
                <p className="text-green-700">El trabajador acredita incumplimientos graves con documentos (cotizaciones impagas, liquidaciones, correos, testigos). El tribunal declara el autodespido válido y ordena pagar todas las indemnizaciones más recargos de hasta 80%.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Autodespido rechazado: pruebas insuficientes</h3>
                <p className="text-red-700">El trabajador no logra demostrar los incumplimientos o la causal invocada no es lo suficientemente grave. El tribunal rechaza la demanda y el caso se trata como renuncia voluntaria, perdiendo toda posibilidad de indemnización.</p>
              </div>
            </div>
          </div>



          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 mt-12">¿Qué diferencia hay entre renuncia y autodespido?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Esta diferencia es clave y define cuánto dinero podrías recibir.</p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-red-600">
                  <XCircle className="h-6 w-6" />
                  <h3 className="font-bold text-xl text-gray-900">Renuncia</h3>
                </div>
                <p className="text-gray-600 mb-4">El trabajador termina voluntariamente el contrato.</p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex gap-2"><span className="text-gray-400">-</span> Normalmente NO hay indemnización por años de servicio</li>
                  <li className="flex gap-2"><span className="text-gray-400">-</span> NO hay recargos legales</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-green-600">
                  <CheckCircle className="h-6 w-6" />
                  <h3 className="font-bold text-xl text-green-900">Autodespido</h3>
                </div>
                <p className="text-green-800 mb-4">El trabajador termina el contrato por culpa del empleador.</p>
                <ul className="space-y-2 text-green-800">
                  <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> Recibes indemnización por años de servicio</li>
                  <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> Recargos legales de hasta 80%</li>
                  <li className="flex gap-2"><span className="text-green-600 font-bold">✓</span> Pagos pendientes</li>
                </ul>
              </div>
            </div>

            <p className="text-gray-600 mt-6 leading-relaxed font-medium">
              Por eso el autodespido tiene mucho más impacto económico que una renuncia normal.
            </p>
          </div>

          <div className="text-center py-6 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Artículo recomendado</p>
            <Link
              to="/blog/como-demandar-por-despido-injustificado-chile-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 sm:px-8 py-4 rounded-xl transition-all hover:bg-blue-100 w-full sm:w-auto text-left sm:text-center text-sm sm:text-base"
            >
              👉 Despido injustificado en Chile: qué es y cuánto puedes recibir
              <ChevronRight className="h-4 w-4 hidden sm:block" />
            </Link>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 mt-12">¿Qué debes probar para ganar un autodespido?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El punto más importante del proceso es la prueba. No basta con decir: <em>“mi jefe se portó mal”</em>. Debes acreditar incumplimientos graves.
            </p>

            <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Las pruebas más utilizadas son:
              </h3>
              <div className="flex flex-wrap gap-2">
                {["Liquidaciones de sueldo", "Cotizaciones impagas", "Correos", "WhatsApp", "Testigos", "Informes médicos", "Denuncias internas", "Documentos laborales"].map((item, i) => (
                  <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium text-sm border border-gray-200">{item}</span>
                ))}
              </div>
              <p className="mt-4 text-sm text-gray-500 italic">Mientras más evidencia tengas, más fuerte será el caso.</p>
            </div>

            <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-lg mt-6">
              <h3 className="font-bold text-amber-900 mb-2">¿Qué pasa si no logras probarlo?</h3>
              <p className="text-amber-800 mb-2">Esto es muy importante. Si el tribunal considera que NO existía incumplimiento grave:</p>
              <ul className="list-disc pl-5 text-amber-800 space-y-1 text-sm mb-4">
                <li>El autodespido puede rechazarse</li>
                <li>El caso puede tratarse como renuncia</li>
                <li>Podrías perder indemnizaciones</li>
              </ul>
              <p className="text-amber-900 font-bold">Por eso nunca conviene iniciar un autodespido sin evaluar antes las pruebas disponibles.</p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 mt-12">¿Cuánto puedes recibir por autodespido?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Si el tribunal acepta el autodespido, puedes obtener las mismas indemnizaciones que en un despido injustificado (¡y más!).</p>

            <div className="grid gap-4 mb-8">
              <div className="bg-gray-50 border rounded-xl p-5 border-gray-200">
                <h4 className="font-bold text-gray-900 mb-2">Indemnización por años de servicio</h4>
                <p className="text-gray-600 text-sm">Generalmente 1 sueldo por año trabajado (con tope legal de 11 años).</p>
              </div>
              <div className="bg-gray-50 border rounded-xl p-5 border-gray-200">
                <h4 className="font-bold text-gray-900 mb-2">Indemnización sustitutiva del aviso previo</h4>
                <p className="text-gray-600 text-sm">Equivalente a 1 sueldo adicional. Aplica cuando el contrato termina sin aviso legal previo.</p>
              </div>
              <div className="bg-green-50 border rounded-xl p-5 border-green-200">
                <h4 className="font-bold text-green-900 mb-2">Recargo legal sobre indemnizaciones</h4>
                <p className="text-green-800 text-sm mb-2">Dependiendo de la gravedad y causal, el tribunal te otorgará un aumento de:</p>
                <ul className="flex gap-4 text-green-900 font-bold">
                  <li className="bg-white px-3 py-1 rounded-lg border border-green-200">30%</li>
                  <li className="bg-white px-3 py-1 rounded-lg border border-green-200">50%</li>
                  <li className="bg-white px-3 py-1 rounded-lg border border-green-200">hasta 80%</li>
                </ul>
              </div>
            </div>

            {/* Ejemplo Real Block */}
            <div className="bg-green-900 text-white p-8 rounded-2xl mt-8">
              <h3 className="font-bold text-xl mb-4 text-white">Ejemplo real simple</h3>
              <p className="mb-4 text-white">Supongamos que el sueldo es de $1.000.000, la antigüedad es de 5 años y hay cotizaciones impagas. El tribunal acepta el autodespido.</p>

              <div className="space-y-3 p-6 rounded-xl border border-gray-700 font-mono text-sm">
                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                  <span className="text-white">Años de servicio (5)</span>
                  <span className="font-bold">$5.000.000</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                  <span className="text-white">Mes de aviso previo</span>
                  <span className="font-bold">$1.000.000</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-700 pb-2 text-green-400">
                  <span>Recargo legal (ej. 50%)</span>
                  <span className="font-bold">+$2.500.000</span>
                </div>
                <div className="flex justify-between items-center pt-2 text-xl text-white">
                  <span className="font-bold">Total estimado</span>
                  <span className="font-bold text-green-400">&gt; $8.500.000</span>
                </div>
              </div>
              <p className="mt-4 text-white italic">Más vacaciones pendientes y otras remuneraciones adeudadas.</p>
            </div>
          </div>

          {/* COMPLEJIDAD 2: CALCULO CORRECTO VS INCORRECTO */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿Qué diferencia hay entre un cálculo correcto y uno incorrecto de la indemnización?</h2>
            <p className="text-gray-600 mb-4">El cálculo de las indemnizaciones laborales no siempre es tan simple como parece. Pequeños errores pueden significar diferencias de millones de pesos.</p>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Cálculo correcto: revisión profesional</h3>
                <p className="text-green-700">Considera la antigüedad exacta, la última remuneración con todos sus componentes (bonos, comisiones, gratificaciones), los topes legales aplicables y las cláusulas contractuales. Detecta diferencias que pueden aumentar el monto final significativamente.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Cálculo incorrecto: conformarse con lo que ofrece la empresa</h3>
                <p className="text-red-700">La empresa puede omitir conceptos remuneracionales, aplicar mal los topes legales o no considerar beneficios contractuales. El trabajador que acepta sin revisar puede recibir menos de lo que le corresponde, perdiendo miles o millones de pesos.</p>
              </div>
            </div>
          </div>

          <div className="text-center py-6 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Artículo recomendado</p>
            <Link
              to="/blog/que-revisar-finiquito-chile"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 sm:px-8 py-4 rounded-xl transition-all hover:bg-blue-100 w-full sm:w-auto text-left sm:text-center text-sm sm:text-base"
            >
              👉 Finiquito en Chile 2026: qué revisar antes de firmar
              <ChevronRight className="h-4 w-4 hidden sm:block" />
            </Link>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 mt-12">Paso a paso: cómo hacer un autodespido en Chile</h2>

            <div className="space-y-4">
              {[
                { title: "Paso 1 — Reunir pruebas", desc: "Antes de renunciar o comunicar cualquier decisión: descarga documentos, guarda liquidaciones, revisa cotizaciones y recopila mensajes. Este paso es crítico." },
                { title: "Paso 2 — Enviar carta de autodespido", desc: "Debes comunicar formalmente la causal, los incumplimientos y el término del contrato. Normalmente se envía por carta certificada a la Inspección del Trabajo y al empleador. La redacción delimita el juicio posterior." },
                { title: "Paso 3 — Presentar demanda laboral", desc: "Después del autodespido debes demandar dentro de plazo legal para solicitar tus indemnizaciones, recargos y pagos pendientes." },
                { title: "Paso 4 — Audiencia y juicio", desc: "El tribunal revisará pruebas, testigos y la gravedad del caso. Finalmente decidirá si el autodespido fue válido o no." }
              ].map((step, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-600">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mt-8">
              <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2"><Clock className="h-5 w-5" /> ¿Cuánto tiempo tengo para demandar?</h3>
              <p className="text-blue-800">
                El plazo general es de <strong>60 días hábiles</strong> desde el término de la relación laboral. Si primero haces reclamo en Inspección del Trabajo, el plazo puede ampliarse hasta <strong>90 días hábiles</strong>. No esperar es clave.
              </p>
            </div>
          </div>

          <div className="text-center py-6 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Artículo recomendado</p>
            <Link
              to="/blog/reserva-derechos-finiquito-chile"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 sm:px-8 py-4 rounded-xl transition-all hover:bg-blue-100 w-full sm:w-auto text-left sm:text-center text-sm sm:text-base"
            >
              👉 Reserva de derechos en el finiquito: cómo funciona
              <ChevronRight className="h-4 w-4 hidden sm:block" />
            </Link>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 mt-12">Errores comunes en un autodespido</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-1">Renunciar antes de asesorarse</h4>
                <p className="text-gray-600">Muchos trabajadores renuncian y luego descubren que podían demandar.</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-1">No guardar pruebas</h4>
                <p className="text-gray-600">Sin evidencia documental o testigos, el caso se debilita muchísimo ante el juez.</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-1">Esperar demasiado tiempo</h4>
                <p className="text-gray-600">Los plazos laborales son cortos (60 días). Si se pasan, pierdes el derecho.</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-1">Redactar mal la carta</h4>
                <p className="text-gray-600">La carta define gran parte del juicio posterior. Las acusaciones deben ser concretas.</p>
              </div>
            </div>
          </div>

          {/* COMPLEJIDAD 3: ACTUAR A TIEMPO VS DEJAR PASAR */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿Qué cambia entre actuar rápido y dejar pasar el tiempo?</h2>
            <p className="text-gray-600 mb-4">En materia laboral, el tiempo juega un rol fundamental. Actuar durante los primeros días puede marcar una gran diferencia en el resultado del caso.</p>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Actuar dentro del plazo legal</h3>
                <p className="text-green-700">Conservas todos tus derechos para impugnar. Puedes reunir pruebas frescas, testigos disponibles y documentos completos. Tienes tiempo para elegir una buena estrategia y negociar desde una posición más sólida.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Dejar pasar los días</h3>
                <p className="text-red-700">Las pruebas se debilitan, los testigos se vuelven difíciles de localizar y algunos documentos pueden perderse. Si vence el plazo de 60 días hábiles, pierdes la posibilidad de demandar judicialmente y quedas sin derecho a indemnización.</p>
              </div>
            </div>
          </div>

          {/* CUANDO CONSULTAR ABOGADO */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿En qué situaciones conviene consultar cuanto antes a un abogado laboral?</h2>
            <p className="text-gray-600 mb-4">Buscar asesoría temprana suele ser recomendable cuando ocurre alguna de estas situaciones:</p>
            <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
              {["Tu empleador no paga cotizaciones previsionales desde hace meses", "Llevas varios meses sin recibir tu sueldo completo o a tiempo", "Sufres acoso laboral o sexual y no sabes cómo proceder", "Te cambiaron las condiciones de trabajo sin tu acuerdo", "Estás pensando en renunciar pero quieres conservar tus indemnizaciones", "No sabes si los incumplimientos de tu empleador son suficientes para demandar", "Ya recibiste una carta de respuesta del empleador o una citación"].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 flex-shrink-0">•</span>
                  <span className="text-gray-700 font-bold">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-600 mt-4">Mientras antes se revise la documentación, mayores serán las posibilidades de preparar una estrategia adecuada.</p>
          </div>

          {/* CTA PRINCIPAL */}
          <div className="mb-12">
            <div className="bg-green-900 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold font-serif text-green-600 mb-3">¿Tu empleador incumple sus obligaciones y estás pensando en hacer un autodespido?</h3>
              <p className="text-white mb-6">Si tu empleador no paga cotizaciones, atrasa sueldos o modificó tus condiciones sin acuerdo, un autodespido bien ejecutado puede permitirte recibir las mismas indemnizaciones que en un despido injustificado. Antes de renunciar o enviar cualquier carta, es recomendable evaluar las pruebas disponibles con un abogado laboral.</p>
              <Link
                to="/abogados-laborales"
                className="inline-flex items-center gap-2 bg-white text-green-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors group"
              >
                Hablar con un abogado laboral <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* CONCLUSION */}

          <RelatedLawyers category="Derecho Laboral" />

          <div className="mb-12 border-t pt-8">

            <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              El autodespido en Chile existe precisamente para proteger a trabajadores frente a incumplimientos graves del empleador. No se trata de renunciar y perder todo — es una herramienta legal que te permite terminar la relación laboral y exigir las mismas indemnizaciones que corresponderían a un despido injustificado, más recargos. La diferencia entre una renuncia común y un autodespido bien ejecutado puede ser de varios millones de pesos.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Sin embargo, comprender cómo funciona el autodespido en términos generales no permite determinar si tu caso es viable o si tienes pruebas suficientes para ganar. Esa respuesta depende de antecedentes específicos como las cotizaciones impagas, los correos electrónicos, las liquidaciones de sueldo y los testigos disponibles. Si estás pensando en hacer un autodespido, puedes revisar tu situación con un{" "}
              <Link to="/abogados-laborales" className="text-green-700 underline hover:text-green-500">abogado laboral en Chile</Link>{" "}
              a través de LegalUp.
            </p>
          </div>

          {/* <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100 mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 font-serif">¿Decidido a realizar tu autodespido?</h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              No arriesgues tus indemnizaciones. Si el empleador lleva meses incumpliendo obligaciones, actúa seguro. Evaluemos tus pruebas y preparemos tu carta.
            </p>
            <Link to="/abogados-laborales">
              <Button className="bg-gray-900 hover:bg-green-900 text-white font-bold w-full sm:w-auto rounded-md shadow-lg transition-all active:scale-95 h-[44px]">
                Contactar a un abogado laboral ahora
                <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div> */}

          <CategoryCTA category="laboral" topic="despido" />

          {/* FAQs */}

          <div className="mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">Preguntas frecuentes</h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-700">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>



      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare title={title} url={url} showBorder={true} />
        </div>

        <BlogNavigation currentArticleId="autodespido-chile-2026" />

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
      <BlogConversionPopup category="Derecho Laboral" topic="autodespido" />
    </div>
  );
};

export default BlogArticle;
