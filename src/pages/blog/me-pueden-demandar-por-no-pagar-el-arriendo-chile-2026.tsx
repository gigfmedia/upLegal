import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  User,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Shield,
  Search,
  MessageSquare,
  FileText,
  Gavel,
} from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import InArticleCTA from "@/components/blog/InArticleCTA";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Me pueden demandar por no pagar el arriendo con solo 1 mes de deuda?",
      answer:
        "Sí. En Chile el arrendador puede iniciar acciones legales desde el primer mes impago. No existe un mínimo legal de meses de deuda para demandar. La creencia de que son 3 o 6 meses es un mito — es una decisión práctica del arrendador, no una obligación legal.",
    },
    {
      question: "¿Me pueden desalojar inmediatamente después de la demanda?",
      answer:
        "No. El desalojo siempre requiere un proceso judicial completo: demanda, notificación, audiencia y sentencia. Desde que se presenta la demanda hasta que se ejecuta el desalojo pueden pasar entre 3 y 12 meses, dependiendo del tribunal y si el arrendatario responde o no.",
    },
    {
      question: "¿Qué pasa si no respondo la demanda de arriendo?",
      answer:
        "Es uno de los errores más graves. Si no respondes, el juicio avanza sin tu defensa y el juez puede dictar sentencia en tu contra con mayor rapidez. Muchos desalojos se aceleran precisamente por no responder la demanda, no por el monto de la deuda.",
    },
    {
      question: "¿Puedo evitar el desalojo si pago la deuda después de la demanda?",
      answer:
        "Depende del momento y del arrendador. Antes de la demanda es más fácil negociar. Durante el juicio aún es posible llegar a un acuerdo, pero no está garantizado. Después de la sentencia las opciones se reducen considerablemente. Mientras antes actúes, más control tienes sobre el resultado.",
    },
    {
      question: "¿Una deuda de arriendo puede ir a DICOM?",
      answer:
        "No automáticamente. Para que una deuda de arriendo aparezca en registros de morosidad debe existir un respaldo legal exigible, como una sentencia judicial. El arrendador no puede reportarte directamente sin pasar por el proceso legal correspondiente.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="¿Me pueden demandar por no pagar el arriendo en Chile? (Qué pasa y cómo defenderte 2026)"
        description="Sí: te pueden demandar con 1 mes de deuda. Conoce qué incluye una demanda de arriendo, cuánto demora y cómo defenderte (Guía 2026)."
        image="/assets/demanda-arriendo-chile-2026.png"
        url="https://legalup.cl/blog/me-pueden-demandar-por-no-pagar-el-arriendo-chile-2026"
        datePublished="2026-04-22"
        dateModified="2026-04-22"
        faqs={faqs}
      />
      <Header onAuthClick={() => {}} />
      <ReadingProgressBar />

      <div className="bg-green-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>Artículo</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-600 text-balance">
            ¿Me pueden demandar por no pagar el arriendo en Chile? (Qué pasa y cómo defenderte 2026)
          </h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">Resumen rápido</p>
            <div className="space-y-3 text-white/90">
              {[
                "Con 1 mes de deuda pueden iniciar acciones legales",
                "No pagar puede terminar en demanda, desalojo y cobro judicial",
                "El proceso NO es inmediato, pero sí inevitable si no actúas",
                "Puedes negociar o pagar y evitar el desalojo en muchos casos",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-green-400 font-bold">✓</span>
                  <span className="text-sm sm:text-base">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xl leading-relaxed mt-6">
            Si dejaste de pagar el arriendo o estás atrasado, es normal preguntarse qué puede pasar realmente.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>22 de Abril, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Tiempo de lectura: 14 min</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <BlogShare
            title="¿Me pueden demandar por no pagar el arriendo en Chile? (Qué pasa y cómo defenderte 2026)"
            url="https://legalup.cl/blog/me-pueden-demandar-por-no-pagar-el-arriendo-chile-2026"
            showBorder={false}
          />

          <div className="prose prose-lg max-w-none mb-12">
            <div className="space-y-4">
              <p className="text-lg text-gray-600 leading-relaxed">¿Te pueden desalojar de inmediato?</p>
              <p className="text-lg text-gray-600 leading-relaxed">¿Hay un "límite" de meses?</p>
              <p className="text-lg text-gray-600 leading-relaxed">¿Puedes evitar el problema?</p>
            </div>
            <p className="text-lg text-gray-600 leading-relaxed mt-6">La respuesta corta es clara:</p>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg mt-6">
              <p className="text-blue-800 font-bold text-lg">No pagar el arriendo en Chile puede terminar en demanda y desalojo.</p>
            </div>
            <p className="text-gray-600 mt-6 leading-relaxed">Pero entender cómo ocurre realmente el proceso es clave para tomar buenas decisiones.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si no pago el arriendo en Chile?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El no pago del arriendo es el incumplimiento más grave del contrato.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">Esto permite al arrendador:</p>
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {[
                { text: "Terminar el contrato", icon: <FileText className="h-5 w-5" /> },
                { text: "Exigir el pago de la deuda", icon: <Search className="h-5 w-5" /> },
                { text: "Solicitar el desalojo", icon: <Gavel className="h-5 w-5" /> },
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-3 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                    {item.icon}
                  </div>
                  <span className="text-gray-800 font-semibold text-sm leading-snug">{item.text}</span>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 border-l-4 border-amber-500 p-6 rounded-r-2xl mb-8">
              <div className="flex gap-4">
                <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-slate-900 font-bold">Importante:</p>
                  <p className="text-slate-600 mt-1">
                    No necesitas acumular varios meses. Desde el primer mes impago ya existe base legal para demandar.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-8 text-gray-900 border-b pb-4">Qué pasa mes a mes cuando no pagas</h2>
            
            <div className="space-y-8 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-gray-100 before:h-full">
              {/* Mes 1 */}
              <div className="relative pl-12">
                <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-green-50 border-4 border-white flex items-center justify-center shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-800">Mes 1 — Atraso inicial</h3>
                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                  {[
                    "Ya existe incumplimiento",
                    "Intereses por mora (si aplica)",
                    "Inicio de gestiones de cobranza",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-600 text-base">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="inline-block bg-green-50/50 text-green-800 text-base font-bold px-4 py-2 rounded-full border border-green-100">
                  💡 Recomendación: Es el mejor momento para negociar
                </div>
              </div>

              {/* Mes 2 */}
              <div className="relative pl-12">
                <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-amber-50 border-4 border-white flex items-center justify-center shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-800">Mes 2 — Riesgo real</h3>
                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                  {[
                    "Acumulación de deuda",
                    "Pérdida de confianza total",
                    "Evaluación de demanda judicial",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-600 text-base">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="inline-block bg-amber-50/50 text-amber-800 text-base font-bold px-4 py-2 rounded-full border border-amber-100">
                  ⚠️ Estado: Zona crítica de incumplimiento
                </div>
              </div>

              {/* Mes 3 */}
              <div className="relative pl-12">
                <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-red-50 border-4 border-white flex items-center justify-center shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-800">Mes 3 o más — Demanda probable</h3>
                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                  {[
                    "Inicio de acción judicial",
                    "Término forzado del contrato",
                    "Solicitud de restitución (desalojo)",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-600 text-base">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="inline-block bg-red-50/50 text-red-800 text-base font-bold px-4 py-2 rounded-full border border-red-100">
                  🚫 Alerta: Evitar el juicio es mucho más difícil aquí
                </div>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Te pueden desalojar inmediatamente?</h2>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg mb-6">
              <p className="text-blue-800 font-bold text-lg">No.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-8 mb-12">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full"></div>
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Procedimiento Legal
                </h4>
                <ul className="space-y-3">
                  {[
                    "Requiere juicio civil completo",
                    "Requiere orden judicial expresa",
                    "Plazos legales obligatorios",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-600 text-sm">
                      <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full"></div>
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Acciones Prohibidas
                </h4>
                <ul className="space-y-3">
                  {[
                    "Cambiar cerraduras a la fuerza",
                    "Sacar pertenencias a la calle",
                    "Corte de servicios básicos",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-600 text-base">
                      <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <InArticleCTA
                message="¿Recibiste una orden de desalojo o necesitas iniciar un proceso? Un abogado puede explicarte los plazos y opciones según tu situación."
                buttonText="Consultar sobre orden de desalojo"
                category="Derecho Arrendamiento"
              />

            <p className="text-gray-600 mb-4 leading-relaxed">Si quieres ver cómo funciona realmente:</p>
            <div className="text-center py-4 border-t border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link
                to="/blog/orden-desalojo-chile-2026"
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 Orden de desalojo en Chile: proceso paso a paso
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Proceso real: qué pasa si no pagas</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">Este proceso es el que se activa cuando existe deuda, como explicamos en:</p>
            <div className="text-center py-4 border-t border-b border-gray-100 mb-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link
                to="/blog/cuantos-meses-debo-arriendo-para-que-me-desalojen-chile-2026"
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 ¿Cuántos meses debo para que me desalojen en Chile?
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">El desalojo ocurre en etapas claras:</p>
            
            <div className="space-y-6 mb-8">
              {[
                { num: "1", title: "Demanda", desc: "El arrendador presenta una demanda por: no pago, término de contrato, restitución" },
                { num: "2", title: "Notificación", desc: "El tribunal debe notificarte. Sin esto, el proceso no avanza." },
                { num: "3", title: "Audiencia", desc: "Puedes: defenderte, pagar, negociar" },
                { num: "4", title: "Sentencia", desc: "El juez decide si corresponde el desalojo." },
                { num: "5", title: "Lanzamiento", desc: "Si no sales voluntariamente: se ejecuta con fuerza pública" },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                  <div className="bg-gray-900 p-2 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0">
                    {step.num}
                  </div>
                  <div>
                    <span className="font-bold text-gray-900">{step.title}</span>
                    <p className="text-base text-gray-600 mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuánto demora un desalojo por no pago?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">En la práctica:</p>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg mb-8">
              <p className="text-blue-800 font-bold text-lg">Entre 3 y 12 meses</p>
            </div>
            <p className="text-gray-600 mb-4 leading-relaxed">Depende de:</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                "Si respondes la demanda",
                "La carga del tribunal",
                "Si hay acuerdo",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <Clock className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium text-base">{item}</span>
                </div>
              ))}
            </div>
            <div className="bg-green-900 rounded-3xl p-8 mb-12 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 blur-3xl rounded-full -mr-32 -mt-32"></div>
              <p className="text-green-400 font-bold uppercase tracking-widest text-xs mb-6">Timeline estimado</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 relative">
                {[
                  { label: "Deuda", time: "Mes 1", icon: <Clock className="h-5 w-5" /> },
                  { label: "Demanda", time: "Mes 3", icon: <FileText className="h-5 w-5" /> },
                  { label: "Juicio", time: "Mes 4–6", icon: <Gavel className="h-5 w-5" /> },
                  { label: "Lanzamiento", time: "Mes 6–12", icon: <Shield className="h-5 w-5" /> },
                ].map((step, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="text-white text-xs font-medium">{step.time}</div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-green-400">
                        {step.icon}
                      </div>
                      <span className="font-bold text-sm sm:text-base">{step.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿La deuda de arriendo se acumula?</h2>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg mb-6">
              <p className="text-blue-800 font-bold text-lg">Sí, y rápido.</p>
            </div>
            <p className="text-gray-600 mb-4 leading-relaxed">Incluye:</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                "Meses impagos",
                "Intereses (si aplica)",
                "Costas judiciales",
                "Honorarios legales",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="h-2 w-2 rounded-full bg-red-400"></div>
                  <span className="text-gray-700 font-medium text-base">{item}</span>
                </div>
              ))}
            </div>
            <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-2xl flex gap-4 items-start">
              <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-amber-900 font-bold">Consecuencia directa:</p>
                <p className="text-gray-700 mt-1">Una deuda pequeña puede transformarse en un problema mayor y difícil de saldar si no se detiene a tiempo.</p>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Puedes evitar el desalojo si pagas?</h2>
            <div className="bg-green-50 border-l-4 border-green-600 p-6 rounded-r-lg mb-6">
              <p className="text-green-800 font-bold text-lg">Sí, en muchos casos.</p>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">Dependiendo del momento:</p>
            <div className="space-y-6 mb-8">
            <div className="space-y-4 mb-8">
              {[
                { title: "Antes de la demanda", desc: "Puedes negociar libremente y firmar un anexo de pago.", note: "Probabilidad de acuerdo: Muy Alta", color: "green" },
                { title: "Durante el juicio", desc: "Aún puedes pagar la deuda total para detener el proceso.", note: "Probabilidad de acuerdo: Media", color: "amber" },
                { title: "Después de sentencia", desc: "El desalojo está ordenado y solo depende del arrendador.", note: "Probabilidad de acuerdo: Baja", color: "red" },
              ].map((item, i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-gray-900">{item.title}</p>
                    <p className="text-gray-600 mt-1">{item.desc}</p>
                  </div>
                  <div className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold border bg-${item.color}-50 border-${item.color}-200 text-${item.color}-700`}>
                    {item.note}
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Errores que empeoran todo</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Estos son los más comunes:</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                "Esperar a acumular varios meses",
                "Ignorar las notificaciones del tribunal",
                "No responder la demanda civil",
                "Evitar cualquier comunicación directa",
                "No buscar asesoría legal a tiempo",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                    <span className="text-xs font-bold">✕</span>
                  </div>
                  <span className="text-gray-700 font-medium leading-tight">{item}</span>
                </div>
              ))}
            </div>
            <div className="bg-red-950 p-6 rounded-2xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 blur-2xl rounded-full -mr-16 -mt-16"></div>
              <p className="font-bold text-red-200 uppercase tracking-widest text-xs mb-2">Punto de no retorno</p>
              <p className="text-lg font-serif">"El mayor error no es la deuda en sí, sino la inacción y el silencio frente al proceso legal."</p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿La deuda puede ir a DICOM?</h2>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg mb-6">
              <p className="text-blue-800 font-bold text-lg">No automáticamente.</p>
            </div>
            <p className="text-gray-600 mb-4 leading-relaxed">Para que ocurra:</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                "Debe existir juicio",
                "Debe haber sentencia",
                "Debe ser exigible",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <Shield className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium text-base">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-4 leading-relaxed">Si quieres entender esto en profundidad:</p>
            <div className="text-center py-4 border-t border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link
                to="/blog/dicom-deuda-arriendo-chile-2026"
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 Deuda de arriendo y DICOM en Chile
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Casos reales en Chile</h2>
            
            <div className="grid sm:grid-cols-3 gap-6 mb-8">
              {[
                { title: "Caso 1", tag: "Prevención", color: "green", desc: "1 mes de deuda. Se negocia un plan de pagos.", result: "Sin demanda" },
                { title: "Caso 2", tag: "Riesgo", color: "amber", desc: "3 meses sin pago. Sin comunicación con dueño.", result: "Demanda en curso" },
                { title: "Caso 3", tag: "Crítico", color: "red", desc: "Notificación ignorada. Sin defensa legal.", result: "Desalojo decretado" },
              ].map((item, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-3 bg-${item.color}-50 text-${item.color}-700 border border-${item.color}-100`}>
                      {item.tag}
                    </div>
                    <p className="font-bold text-gray-900 mb-2">{item.title}</p>
                    <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <p className={`font-bold text-${item.color}-600`}>{item.result}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Qué hacer si no puedes pagar el arriendo</h2>
            
            <div className="space-y-6 mb-8">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <p className="font-bold text-gray-900 mb-2">Paso 1 — No ignores el problema</p>
                <p className="text-gray-600">Mientras antes actúes, mejor.</p>
              </div>
              
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <p className="font-bold text-gray-900 mb-2">Paso 2 — Revisa tu contrato</p>
                <p className="text-gray-600 mb-3">Busca:</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {["Cláusulas de término", "Intereses", "Reglas de incumplimiento"].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/consultar">
                <Button 
                  size="lg" 
                  onClick={() => {
                    window.gtag?.('event', 'cta_click', {
                      location: 'blog_cta',
                      text: 'Habla con un abogado ahora',
                    });
                    window.gtag?.("event", "click_consultar_abogado", {
                      article: window.location.pathname,
                      location: "blog_cta_demanda_arriendo_primary",
                    });
                  }}
                  className="bg-gray-900 hover:bg-green-900 text-white px-8 py-3 w-full sm:w-auto shadow-md"
                >
                  Habla con un abogado ahora
                </Button>
              </Link>

              <Link to="/search?category=Derecho+Civil">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    window.gtag?.('event', 'cta_click', {
                      location: 'blog_cta',
                      text: 'Encontrar abogado',
                    });
                    window.gtag?.("event", "click_ver_abogados", {
                      article: window.location.pathname,
                      location: "blog_cta_demanda_arriendo_secondary",
                    });
                  }}
                  className="border-gray-600 text-gray-600 hover:bg-green-900 hover:text-white px-8 py-3 w-full sm:w-auto"
                >
                  Ver Abogados Civiles
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Evalúa tu caso y toma una decisión antes de que el problema escale.
            </p>
          </div>
        </div>
      </div>

      <RelatedLawyers category="Derecho Civil" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare
            title="¿Me pueden demandar por no pagar el arriendo en Chile? (Qué pasa y cómo defenderte 2026)"
            url="https://legalup.cl/blog/me-pueden-demandar-por-no-pagar-el-arriendo-chile-2026"
          />
        </div>

        <BlogNavigation
          prevArticle={{
            id: "cuantos-meses-debo-arriendo-para-que-me-desalojen-chile-2026",
            title: "¿Cuántos meses debo de arriendo para que me desalojen en Chile? (Guía 2026 real)",
            excerpt: "Descubre cuándo pueden demandarte, cuánto demora el proceso y cómo evitar errores.",
            image: "/assets/desalojo-3-chile-2026.png",
          }}
        />

        <div className="mt-8 text-center">
          <Link to="/blog" className="inline-flex items-center gap-2 text-green-900 hover:text-green-600 font-medium transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Volver al Blog
          </Link>
        </div>
      </div>

      <BlogConversionPopup category="Derecho Civil" topic="arriendo" />
    </div>
  );
};

export default BlogArticle;
