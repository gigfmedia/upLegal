import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, AlertCircle, Shield, Search, MessageSquare, FileText, Gavel, CheckCircle } from "lucide-react";
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
      question: "¿Cuántos meses debo para que me desalojen en Chile?",
      answer:
        "Legalmente, con 1 mes de deuda ya pueden iniciar el proceso. No existe un mínimo de 3 o 6 meses: eso es un mito. En la práctica, el desalojo suele demorar varios meses por los tiempos del juicio.",
    },
    {
      question: "¿Me pueden desalojar sin juicio?",
      answer:
        "No. El desalojo requiere un proceso judicial, una resolución del tribunal y una orden de lanzamiento. El arrendador no puede sacarte por la fuerza ni cambiar cerraduras sin orden judicial.",
    },
    {
      question: "¿Cuánto demora un desalojo en Chile?",
      answer:
        "En promedio, entre 3 y 12 meses, dependiendo de la carga del tribunal, si respondes la demanda y si existe acuerdo entre las partes.",
    },
    {
      question: "¿Puedo pagar la deuda y evitar el desalojo?",
      answer:
        "Sí, especialmente antes de la demanda o durante el juicio, dependiendo del caso. Actuar temprano aumenta las opciones de negociación y acuerdo.",
    },
    {
      question: "¿Una deuda de arriendo puede ir a DICOM?",
      answer:
        "No automáticamente. Normalmente debe existir juicio, sentencia u otro respaldo exigible. Sin eso, no pueden reportarte directamente.",
    },
    {
      question: "¿Me pueden desalojar si no tengo contrato de arriendo escrito?",
      answer:
        "Sí, pero el proceso es más complejo para el arrendador. Sin contrato escrito, debe probar la existencia de la relación de arriendo ante el tribunal. Igualmente, el desalojo siempre requiere orden judicial — el arrendador no puede actuar por su cuenta aunque no haya contrato.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="¿Cuántos meses debo de arriendo para que me desalojen en Chile? (Guía 2026 real)"
        description="¿Con cuántos meses de deuda te pueden desalojar en Chile? Descubre cuándo pueden demandarte, cuánto demora el proceso y cómo evitarlo."
        image="/assets/desalojo-2-chile-2026.png"
        url="https://legalup.cl/blog/cuantos-meses-debo-arriendo-para-que-me-desalojen-chile-2026"
        datePublished="2026-04-20"
        dateModified="2026-04-20"
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
            ¿Cuántos meses debo de arriendo para que me desalojen en Chile? (Guía 2026 real)
          </h1>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 max-w-3xl mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400 mb-4">Resumen rápido</p>
            <div className="grid sm:grid-cols-2 gap-4 text-white">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-base">1 mes de deuda habilita demanda</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-base">No existe mínimo legal de meses</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-base">Desalojo SIEMPRE requiere juicio</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-base">Demora real: 3 a 12 meses</span>
              </div>
            </div>
          </div>

          <p className="text-xl max-w-3xl leading-relaxed">
            Si dejaste de pagar el arriendo o estás atrasado, es normal preguntarse cuántos meses debes para que te desalojen. En esta guía te explicamos qué pasa desde el primer mes impago, cómo funciona el juicio y qué hacer para evitar errores.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>20 de Abril, 2026</span>
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
            title="¿Cuántos meses debo de arriendo para que me desalojen en Chile? (Guía 2026 real)"
            url="https://legalup.cl/blog/cuantos-meses-debo-arriendo-para-que-me-desalojen-chile-2026"
            showBorder={false}
          />

          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed font-medium">
              Si dejaste de pagar el arriendo o estás atrasado, es normal preguntarse:
            </p>
            <p className="text-lg text-gray-600 leading-relaxed font-bold">¿Cuántos meses debo para que me desalojen en Chile?</p>
            <p className="text-lg text-gray-600 leading-relaxed">
              La respuesta corta es directa:
            </p>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 my-8">
              <p className="text-gray-700 font-bold text-lg leading-relaxed">
                Con 1 mes de deuda ya pueden iniciar un proceso de desalojo.
              </p>
            </div>
            <p className="text-lg text-gray-600 leading-relaxed mt-6">
              Pero la realidad es más compleja. El desalojo no es inmediato y no depende solo de cuántos meses debes: depende del contrato, del tribunal y de si el arrendador decide demandar.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuántos meses debo para que me desalojen en Chile?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Legalmente, desde el primer mes de arriendo impago el arrendador puede demandar el término del contrato y la restitución del inmueble.
            </p>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8">
              <p className="text-gray-700 font-medium leading-relaxed">
                 No existe una regla como “3 meses” o “6 meses”. Eso es un mito.
              </p>
            </div>
            <p className="text-gray-600 leading-relaxed">
              La confusión viene porque en la práctica muchos arrendadores esperan, se intenta negociar antes y el proceso judicial demora, pero eso no es una obligación legal.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Qué pasa desde el primer mes que no pagas</h2>
            <div className="space-y-4">
              {[
                {
                  title: "Mes 1 — Atraso inicial",
                  desc: "Ya existe incumplimiento contractual. El arrendador puede cobrar la deuda, aplicar intereses y preparar la demanda. Es el mejor momento para negociar.",
                },
                {
                  title: "Mes 2 — Riesgo real",
                  desc: "La confianza se rompe. El arrendador suele iniciar la redacción de la demanda y se acumulan gastos. Estás en zona crítica de desalojo.",
                },
                {
                  title: "Mes 3 o más — Acción judicial",
                  desc: "La demanda es prácticamente inevitable. Se solicita el término del contrato y la restitución forzada. El proceso judicial se vuelve complejo.",
                },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100 transition-colors">
                  <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900 mb-1 leading-tight">{item.title}</p>
                    <p className="text-base text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <InArticleCTA
            message="¿Estás en riesgo de desalojo o ya acumulaste deuda de arriendo? Un abogado puede ayudarte a definir estrategia y evitar errores."
            category="Derecho Civil"
          />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Proceso real de desalojo en Chile (paso a paso)</h2>
            <div className="space-y-4 mb-8">
              {[
                { title: "Demanda judicial", desc: "Inicio formal pidiendo término del contrato y restitución.", icon: <FileText className="h-5 w-5" /> },
                { title: "Notificación", desc: "Paso obligatorio: el tribunal informa oficialmente al arrendatario.", icon: <AlertCircle className="h-5 w-5" /> },
                { title: "Audiencia", desc: "Instancia para defensa, pruebas o mediación del conflicto.", icon: <MessageSquare className="h-5 w-5" /> },
                { title: "Resolución", desc: "El juez dicta sentencia ordenando o no el desalojo.", icon: <Gavel className="h-5 w-5" /> },
                { title: "Lanzamiento", desc: "Ejecución forzada con auxilio de la fuerza pública si es necesario.", icon: <Shield className="h-5 w-5" /> },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100 transition-colors">
                  <div className="bg-gray-900 p-2 rounded-lg text-white w-9 h-9 flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 text-lg">{item.title}</span>
                    <p className="text-base text-gray-600 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuánto tiempo tienes antes de ser desalojado?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Aunque la demanda puede iniciarse con 1 mes de deuda, el desalojo real suele tardar entre 3 y 12 meses. Depende de si respondes la demanda, la carga del tribunal, si existe acuerdo y la complejidad del caso.
            </p>
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link
                to="/blog/cuanto-demora-juicio-desalojo-chile-2026"
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 ¿Cuánto demora un juicio de desalojo en Chile?
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden mb-12">
              <div className="bg-amber-50 px-6 py-3 border-b border-gray-100 uppercase tracking-widest text-xs font-bold text-amber-900">
                Línea de tiempo estimada
              </div>
              <div className="p-8">
                <div className="space-y-4">
                  {[
                    "Mes 1: Deuda inicial y cobranza extrajudicial",
                    "Mes 3: Presentación de demanda judicial",
                    "Mes 4-6: Proceso de notificación y juicio",
                    "Mes 6-10: Sentencia y orden de lanzamiento"
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 text-gray-700 italic font-medium">
                      <Clock className="h-5 w-5 text-amber-600" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-8 bg-white border border-amber-100 p-4 rounded-xl text-amber-900 font-bold text-base">
                  ⚠️ Importante: Los plazos pueden variar según el tribunal y la defensa.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué dice la ley en Chile sobre el no pago del arriendo?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              En Chile, el no pago del arriendo constituye un incumplimiento grave del contrato que habilita al arrendador a solicitar judicialmente su término.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              No es necesario acumular varios meses de deuda. Basta con que exista un incumplimiento claro de la obligación principal: pagar la renta.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">Desde el punto de vista legal:</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {[
                { text: "El contrato se puede terminar por incumplimiento", icon: <FileText className="h-5 w-5" /> },
                { text: "Se puede exigir el pago de la deuda", icon: <FileText className="h-5 w-5" /> },
                { text: "Se puede solicitar la restitución del inmueble", icon: <FileText className="h-5 w-5" /> },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="text-green-600 flex-shrink-0">{item.icon}</div>
                  <span className="text-gray-700 font-medium text-base">{item.text}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Esto significa que el desalojo no depende de una cantidad de meses, sino de la existencia de una falta contractual.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Sin embargo, en la práctica, los tribunales también consideran elementos como:
            </p>
            <div className="grid sm:grid-cols-1 gap-4 mb-8">
              {[
                { title: "Conducta del arrendatario", desc: "Se evalúa si existe voluntad de pago real.", icon: <Shield className="h-5 w-5" /> },
                { title: "Acuerdos previos", desc: "Existencia de convenios de pago incumplidos.", icon: <Shield className="h-5 w-5" /> },
                { title: "Monto de la deuda", desc: "A mayor cuantía, mayor urgencia del tribunal.", icon: <Shield className="h-5 w-5" /> },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                  <div className="text-blue-600 flex-shrink-0">{item.icon}</div>
                  <div>
                    <p className="text-gray-900 font-bold leading-tight">{item.title}</p>
                    <p className="text-gray-600 text-sm mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-gray-600 leading-relaxed">
              Esto puede influir en los tiempos del proceso, pero no elimina el riesgo legal.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Diferencia entre atraso, mora y demanda</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Muchas personas confunden estos conceptos, pero es clave entenderlos:</p>

            <div className="space-y-4">
              {[
                { title: "Atraso", desc: "Incumplimiento de la fecha acordada (días o semanas)." },
                { title: "Mora", desc: "Deuda formal consolidada en el tiempo." },
                { title: "Demanda", desc: "Acción legal para recuperar el inmueble y liquidar deuda." },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100 transition-colors">
                  <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900 mb-1 leading-tight">{item.title}</p>
                    <p className="text-base text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mt-10">
              <p className="text-gray-700 font-bold text-lg leading-relaxed">Lo importante:</p>
              <p className="text-gray-600 mt-2 leading-relaxed">Puedes pasar de atraso a demanda mucho más rápido de lo que crees.</p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuándo el desalojo puede ser más rápido?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">No todos los casos tardan lo mismo.</p>
            <p className="text-gray-600 mb-4 leading-relaxed">Un desalojo puede avanzar más rápido cuando:</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {[
                { text: "El arrendatario no responde la demanda", icon: <AlertCircle className="h-5 w-5" /> },
                { text: "La deuda es clara y comprobable", icon: <AlertCircle className="h-5 w-5" /> },
                { text: "No existe contrato complejo que discutir", icon: <AlertCircle className="h-5 w-5" /> },
                { text: "El tribunal tiene baja carga", icon: <AlertCircle className="h-5 w-5" /> },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="text-green-600 flex-shrink-0">{item.icon}</div>
                  <span className="text-gray-700 font-medium text-base">{item.text}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">En estos casos, el proceso puede resolverse en menos tiempo.</p>
            <p className="text-gray-600 mb-4 leading-relaxed">Por el contrario, puede tardar más cuando:</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { text: "Existen disputas sobre el contrato", icon: <AlertCircle className="h-5 w-5" /> },
                { text: "Hay intentos de acuerdo", icon: <AlertCircle className="h-5 w-5" /> },
                { text: "Se presentan recursos o apelaciones", icon: <AlertCircle className="h-5 w-5" /> },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="text-red-500 flex-shrink-0">{item.icon}</div>
                  <span className="text-gray-700 font-medium text-base">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Casos reales ampliados en Chile</h2>
            <div className="space-y-4">
              {[
                { title: "Caso 1 — Deuda gestionada", desc: "1 mes de atraso: el arrendatario negocia rápido y firma convenio. Evita el juicio." },
                { title: "Caso 2 — Sin respuesta", desc: "3 meses de deuda: el dueño demanda por falta de comunicación. El juicio es inevitable." },
                { title: "Caso 3 — Abandono", desc: "Deuda prolongada y sin defensa: desalojo expedito mediante Ley Devuélveme Mi Casa." },
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 hover:bg-gray-100 transition-all">
                  <p className="text-gray-900 font-bold mb-2 uppercase tracking-wide text-xs">{item.title}</p>
                  <p className="text-gray-600 leading-relaxed font-medium">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Te pueden desalojar inmediatamente?</h2>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8">
              <p className="text-gray-900 font-bold text-lg">👉 No.</p>
              <p className="text-gray-600 mt-2 leading-relaxed">
                En Chile no pueden sacarte por la fuerza, no pueden cambiar cerraduras y no pueden cortar servicios. Eso es ilegal.
              </p>
            </div>
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link
                to="/blog/orden-desalojo-chile-2026"
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 Orden de desalojo en Chile: Guía completa
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿La deuda de arriendo puede ir a DICOM?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              No automáticamente. Para que ocurra normalmente debe existir juicio, sentencia y que se reconozca la deuda.
            </p>
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link
                to="/blog/dicom-deuda-arriendo-chile-2026"
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 ¿Me pueden meter a DICOM por deuda de arriendo?
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Errores que empeoran tu situación</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "Pensar que necesitas “X meses” para que te desalojen",
                "Ignorar la deuda",
                "No responder la demanda",
                "No buscar ayuda legal",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <span className="text-gray-700 font-medium text-base">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si pagas después de la demanda?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Muchas personas creen que una vez iniciada la demanda ya no hay solución, pero no siempre es así.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Dependiendo del caso, pagar la deuda durante el juicio puede:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {[
                { text: "Suspender el proceso", icon: <Shield className="h-5 w-5" /> },
                { text: "Permitir un acuerdo", icon: <Shield className="h-5 w-5" /> },
                { text: "Evitar el desalojo", icon: <Shield className="h-5 w-5" /> },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="text-green-600 flex-shrink-0">{item.icon}</div>
                  <span className="text-gray-700 font-medium text-base">{item.text}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Sin embargo, esto no está garantizado y depende de la etapa del juicio y de la voluntad del arrendador.
            </p>
            <p className="text-gray-600 leading-relaxed font-medium">
              Por eso, mientras antes actúes, mejores opciones tendrás.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Qué hacer si no puedes pagar el arriendo</h2>
            <div className="space-y-4">
              {[
                { title: "Paso 1: Enfrentar la situación", desc: "No ignores las notificaciones ni las llamadas del arrendador." },
                { title: "Paso 2: Revisar tu contrato", desc: "Busca cláusulas de salida, plazos de gracia o multas pactadas." },
                { title: "Paso 3: Reunir pruebas", desc: "Estado de cuenta, comprobantes y cualquier comunicación previa." },
                { title: "Paso 4: Intentar acuerdo", desc: "La mediación es la vía más rápida para evitar un juicio desalojador." },
                { title: "Paso 5: Asesoría legal", desc: "Un abogado especialista protegerá tus derechos procesales." },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100 transition-colors">
                  <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 text-lg">{step.title}</span>
                    <p className="text-base text-gray-600 mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link
                to="/blog/contrato-de-arriendo-chile-2026"
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 Contrato de arriendo en Chile: Guía 2026
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <InArticleCTA
            message="¿Te notificaron demanda o ya debes 2 meses o más? Actuar a tiempo puede evitar un lanzamiento y reducir el daño económico." 
            category="Desalojo"
          />

          <div className="mb-8 pt-4">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              No existe un número mágico de meses para que ocurra un desalojo en Chile. La ley es clara: <strong>con 1 mes de deuda ya pueden iniciar un proceso judicial</strong> para poner término al contrato y recuperar la propiedad.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Sin embargo, en la práctica, el desalojo no depende solo de la cantidad de meses que debas. Factores como la decisión del arrendador, las condiciones del contrato, la existencia de intentos de acuerdo y los tiempos del tribunal influyen directamente en cómo evoluciona el proceso.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Por eso, enfocarse únicamente en “cuántos meses debo” es un error común. Lo realmente importante es <strong>cómo reaccionas frente al primer incumplimiento</strong>. Ignorar la situación, dejar pasar el tiempo o no responder una demanda puede agravar rápidamente el problema y llevar a consecuencias más complejas, como un juicio, una orden de lanzamiento o una deuda judicial.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              En cambio, actuar a tiempo —ya sea negociando, regularizando la deuda o buscando asesoría legal— puede marcar una diferencia significativa en el resultado. En muchos casos, una acción oportuna permite evitar el desalojo o, al menos, reducir el impacto económico y legal.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Si estás enfrentando atrasos en el arriendo o ya existe riesgo de desalojo, lo peor que puedes hacer es esperar. <strong>Tomar decisiones informadas desde el inicio es la mejor forma de proteger tu situación, tu historial y tu tranquilidad.</strong>
            </p>
          </div>

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
      </div>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-xl shadow-sm p-8 border">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">¿Cuándo debes actuar inmediatamente?</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">Debes buscar ayuda urgente si:</p>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {[
              "Debes 2 meses o más",
              "Recibiste notificación judicial",
              "El arrendador dejó de responder",
              "Te amenazan con desalojo",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-red-50 p-3 rounded-lg border border-red-100">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <span className="text-gray-700 font-medium text-base">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-700 font-medium">👉 En estas situaciones, el riesgo de demanda o desalojo es alto.</p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border">
          <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">¿Estás en riesgo de desalojo o ya tienes deuda de arriendo?</h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
            No esperes a que el problema escale. Un error en este momento puede significar aumentar la deuda o enfrentar un juicio. Habla con un abogado y evalúa tu caso antes de que sea tarde.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/consulta">
              <Button
                size="lg"
                onClick={() => {
                  window.gtag?.("event", "click_consultar_abogado", {
                    article: window.location.pathname,
                    location: "blog_cta_meses_desalojo_primary",
                  });
                }}
                className="bg-gray-900 hover:bg-green-900 text-white px-8 py-3 w-full sm:w-auto shadow-md"
              >
                Consultar con Abogado Ahora
              </Button>
            </Link>
            <Link to="/search?category=Derecho+Civil">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  window.gtag?.("event", "click_ver_abogados", {
                    article: window.location.pathname,
                    location: "blog_cta_meses_desalojo_secondary",
                  });
                }}
                className="border-gray-600 text-gray-600 hover:bg-green-900 hover:text-white px-8 py-3 w-full sm:w-auto"
              >
                Ver Abogados Civiles
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <RelatedLawyers category="Derecho Civil" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare
            title="¿Cuántos meses debo de arriendo para que me desalojen en Chile? (Guía 2026 real)"
            url="https://legalup.cl/blog/cuantos-meses-debo-arriendo-para-que-me-desalojen-chile-2026"
          />
        </div>

        <BlogNavigation
          prevArticle={{
            id: "orden-desalojo-chile-2026",
            title: "Orden de desalojo en Chile: qué es, cuándo ocurre y cómo funciona (Guía 2026)",
            excerpt: "Descubre qué es una orden de desalojo, cuándo se dicta, qué ocurre después y qué hacer si recibes una.",
            image: "/assets/orden-desalojo-chile-2026.png",
          }}
          nextArticle={{
            id: "derecho-arrendamiento-chile-guia-completa-2026",
            title: "Derecho de arrendamiento en Chile: guía completa 2026 (contrato, desalojo, garantía, IPC y derechos)",
            excerpt: "Todo lo que necesitas saber sobre contratos, desalojos, garantías e IPC en esta guía completa 2026.",
            image: "/assets/derecho-arrendamiento-chile-2026.png",
          }}
        />

        <div className="mt-8 text-center">
          <Link to="/blog" className="inline-flex items-center gap-2 text-green-900 hover:text-green-600 font-medium transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Volver al Blog
          </Link>
        </div>
      </div>
      <BlogConversionPopup category="Derecho Civil" topic="desalojo-meses" />
    </div>
  );
};

export default BlogArticle;
