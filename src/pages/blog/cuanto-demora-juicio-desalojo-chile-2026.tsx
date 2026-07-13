import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, Table as TableIcon } from "lucide-react";
import { ReadTime } from "@/components/blog/ReadTime";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import InArticleCTA from "@/components/blog/InArticleCTA";
import CategoryCTA from "@/components/blog/CategoryCTA";
import PreConclusionCTA from "@/components/blog/PreConclusionCTA";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Cuánto demora un juicio de desalojo en Chile?",
      answer: "Un juicio de desalojo en Chile puede tardar entre 3 y 12 meses, dependiendo de la carga del tribunal, si el arrendatario contesta la demanda y si hay apelaciones. El procedimiento comienza con la demanda, sigue con la notificación al arrendatario, la audiencia y finalmente la sentencia. Si el arrendatario no paga ni se opone, el proceso puede resolverse en menos tiempo."
    },
    {
      question: "¿Cuántos meses de arriendo deben deberse para iniciar un desalojo?",
      answer: "La ley no establece un número exacto de meses. En general, el arrendador puede iniciar acciones judiciales cuando existe incumplimiento del contrato de arriendo, usualmente tras un mes de mora."
    },
    {
      question: "¿Carabineros puede desalojar a un arrendatario?",
      answer: "Carabineros solo puede intervenir cuando existe una orden judicial de desalojo. Sin una resolución judicial, el desalojo no puede ejecutarse de manera legal."
    },
    {
      question: "¿Cuánto cuesta un juicio de desalojo en Chile?",
      answer: "El costo depende de distintos factores como honorarios del abogado, gastos de notificación y costos del receptor judicial. Cada caso es único en su complejidad."
    },
    {
      question: "¿Se puede detener un desalojo?",
      answer: "En algunos casos es posible evitar el desalojo si el arrendatario paga la deuda o llega a un acuerdo con el arrendador antes de que el tribunal ordene el lanzamiento."
    },
    {
      question: "¿Qué es el lanzamiento?",
      answer: "El lanzamiento es el procedimiento mediante el cual se ejecuta la orden de desalojo física, si es necesario con auxilio de la fuerza pública."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="¿Cuánto tarda un desalojo en Chile? De 3 meses a 1 año — lo que dice la ley"
        description="Un desalojo en Chile puede tardar entre 3 meses y más de un año, dependiendo del tribunal y si hay oposición. Conoce las etapas, los plazos reales y cuándo conviene actuar con un abogado."
        image="/assets/desalojo-2-chile-2026.png"
        url="https://legalup.cl/blog/cuanto-demora-juicio-desalojo-chile-2026"
        datePublished="2026-03-16"
        dateModified="2026-03-16"
        faqs={faqs}
      />

      <Header onAuthClick={() => { }} />
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

          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-600">
            ¿Cuánto tarda un desalojo en Chile? De 3 meses a 1 año — lo que dice la ley
          </h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
              Resumen rápido
            </p>

            <ul className="space-y-2">
              {[
                "Un desalojo en Chile puede tardar entre 3 meses y más de 1 año",
                "El proceso depende del tribunal y de la respuesta del arrendatario",
                "El desalojo nunca es inmediato ni automático",
                "Ignorar la demanda puede acelerar el lanzamiento",
                "Negociar o actuar temprano puede reducir tiempos y costos"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm sm:text-base text-gray-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl max-w-3xl">
            Los conflictos de arriendo son uno de los problemas legales más comunes en Chile. Descubre los plazos reales y el funcionamiento del proceso judicial este 2026.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>16 de Marzo, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <ReadTime slug="cuanto-demora-juicio-desalojo-chile-2026" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
        <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare
            title="¿Cuánto demora un juicio de desalojo en Chile? Guía 2026"
            url="https://legalup.cl/blog/cuanto-demora-juicio-desalojo-chile-2026"
            showBorder={false}
          />

          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed font-medium">
              Cuando un arrendatario deja de pagar el arriendo o incumple el contrato, muchos propietarios se preguntan: <strong>¿cuánto demora un juicio de desalojo en Chile?</strong>
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              En la mayoría de los casos, un arrendador no puede desalojar inmediatamente a un arrendatario. Para recuperar la propiedad generalmente es necesario iniciar un proceso judicial riguroso. En esta guía explicamos cuánto demora el proceso, cómo funciona la ley y qué derechos tienen ambas partes.
            </p>
          </div>

          <div className="mb-4 py-2">
            <h2 className="text-2xl font-bold mb-4">¿Qué es un juicio de desalojo en Chile?</h2>
            <p className="text-gray-600 mb-6">
              Un juicio de desalojo en Chile es un proceso judicial mediante el cual un arrendador solicita a un tribunal que ordene al arrendatario abandonar la propiedad arrendada. Este tipo de demanda suele presentarse cuando ocurre alguna de las siguientes situaciones:
            </p>
            <ul className="grid sm:grid-cols-2 gap-4 mb-8">
              <li className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg text-gray-700">
                <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                <span>Impago de arriendo por parte del arrendatario.</span>
              </li>
              <li className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg text-gray-700">
                <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                <span>Incumplimiento de cláusulas del contrato.</span>
              </li>
              <li className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg text-gray-700">
                <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                <span>Término del contrato sin restitución física.</span>
              </li>
              <li className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg text-gray-700">
                <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                <span>Uso indebido o daños grave al inmueble.</span>
              </li>
            </ul>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8 my-8">
              <p className="text-gray-900 font-bold text-lg mb-4 leading-tight">Marco legal del desalojo</p>
              <p className="text-gray-700 leading-relaxed font-medium">
                <strong>IMPORTANTE:</strong> En Chile, el arrendador no puede desalojar por su cuenta. Debe iniciar un procedimiento judicial oficial para recuperar la propiedad de forma legal. La autotutela es ilegal.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Arrendatario proactivo</h3>
                <p className="text-green-700">Consulta a un abogado desde el primer aviso de demanda, negocia un acuerdo de pago y evita que el juicio se alargue más de 3 meses.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Arrendatario que ignora el problema</h3>
                <p className="text-red-700">No responde la notificación, deja que la deuda se acumule y enfrenta un juicio que puede extenderse más de 8 meses con lanzamiento incluido.</p>
              </div>
            </div>
          </div>

          <div className="mb-4 py-2">
            <h2 className="text-2xl font-bold mb-4">¿Cuánto demora un juicio de desalojo realmente?</h2>
            <p className="text-gray-600 mb-6">
              En términos generales, un juicio de desalojo en Chile puede demorar entre <strong>3 y 8 meses</strong>. Sin embargo, el tiempo exacto depende de varios factores como el tribunal, la rapidez de las notificaciones y la respuesta del arrendatario.
            </p>

            {/* New Table Section */}
            <div className="overflow-x-auto mb-12 border rounded-xl overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-base font-bold text-gray-500 uppercase tracking-wider">Etapa del proceso</th>
                    <th scope="col" className="px-6 py-4 text-left text-base font-bold text-gray-500 uppercase tracking-wider">Tiempo aproximado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-900">Presentación de la demanda</td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-600">1 semana</td>
                  </tr>
                  <tr className="bg-gray-50/30">
                    <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-900">Notificación al arrendatario</td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-600">2 a 4 semanas</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-900">Tramitación del juicio</td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-600">1 a 3 meses</td>
                  </tr>
                  <tr className="bg-gray-50/30">
                    <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-900">Sentencia del tribunal</td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-600">2 a 4 semanas</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-900">Ejecución del desalojo</td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-600">2 a 6 semanas</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-gray-600 mb-4 font-semibold">Factores que influyen en la duración final:</p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3 text-gray-600 font-medium">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <span><strong>Tribunal:</strong> La carga de trabajo de los juzgados civiles impacta directamente en las fechas.</span>
              </li>
              <li className="flex items-start gap-3 text-gray-600 font-medium">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <span><strong>Notificaciones:</strong> Ubicar al arrendatario para la notificación oficial es clave para no retrasar el inicio.</span>
              </li>
              <li className="flex items-start gap-3 text-gray-600 font-medium">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <span><strong>Oposición:</strong> Si el arrendatario contesta y se defiende, el proceso requiere más instancias de prueba.</span>
              </li>
            </ul>
          </div>

          <div className="mb-4 py-2">
            <h2 className="text-2xl font-bold mb-4">¿Qué ley regula los desalojos en Chile?</h2>
            <p className="text-gray-600 mb-6 font-medium">
              Los desalojos están regulados principalmente por la <strong>Ley de Arrendamiento de Predios Urbanos</strong>, además de las normas del procedimiento civil y la reciente ley "Devuélveme mi Casa".
            </p>
            <p className="text-gray-600 mb-6">
              Esta legislación define los derechos de ambas partes, las causas de término de contrato y los procedimientos judiciales oficiales para recuperar un inmueble, evitando siempre desalojos arbitrarios o ilegales.
            </p>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Caso cubierto por la Ley Devuélveme mi Casa</h3>
                <p className="text-green-700">Deuda clara con contrato ante notario: el procedimiento es más ágil y puede resolverse en 3 a 5 meses desde la demanda.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Caso sin contrato formal</h3>
                <p className="text-red-700">El arrendador debe probar la relación contractual, lo que alarga el juicio y puede sumar 2 a 3 meses adicionales al proceso.</p>
              </div>
            </div>
          </div>

          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Guía Pilar</p>
            <Link
              to="/blog/derecho-arrendamiento-chile-guia-completa-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 Derecho de arrendamiento: Guía completa 2026
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Etapas detalladas de un juicio de desalojo</h2>

            <div className="space-y-8 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-100 lg:before:left-4">
              <div className="relative pl-12">
                <div className="absolute left-1.5 top-1 h-5 w-5 rounded-full bg-yellow-500 border-4 border-yellow-900 shadow-[0_0_10px_rgba(59,130,246,0.3)]"></div>
                <h3 className="font-bold text-lg text-gray-900">1. Presentación de la demanda</h3>
                <p className="text-gray-600 mt-2">El arrendador solicita el término de contrato y restitución del inmueble. Debe acompañar contrato de arriendo y comprobantes de deuda.</p>
              </div>

              <div className="relative pl-12">
                <div className="absolute left-1.5 top-1 h-5 w-5 rounded-full bg-yellow-500 border-4 border-yellow-900 shadow-[0_0_10px_rgba(59,130,246,0.3)]"></div>
                <h3 className="font-bold text-lg text-gray-900">2. Notificación al arrendatario</h3>
                <p className="text-gray-600 mt-2">Un receptor judicial informa oficialmente al arrendatario sobre la demanda en su domicilio. Esta etapa puede tardar algunas semanas.</p>
              </div>

              <div className="relative pl-12">
                <div className="absolute left-1.5 top-1 h-5 w-5 rounded-full bg-yellow-500 border-4 border-yellow-900 shadow-[0_0_10px_rgba(59,130,246,0.3)]"></div>
                <h3 className="font-bold text-lg text-gray-900">3. Respuesta y Tramitación</h3>
                <p className="text-gray-600 mt-2">El arrendatario puede pagar la deuda, contestar la demanda o intentar un acuerdo. Si no responde, el juez dicta sentencia basándose en los antecedentes.</p>
              </div>

              <div className="relative pl-12">
                <div className="absolute left-1.5 top-1 h-5 w-5 rounded-full bg-yellow-500 border-4 border-yellow-900 shadow-[0_0_10px_rgba(59,130,246,0.3)]"></div>
                <h3 className="font-bold text-lg text-gray-900">4. Sentencia del Tribunal</h3>
                <p className="text-gray-600 mt-2">El juez ordena el pago de rentas adeudadas y fija un plazo para la restitución voluntaria del inmueble.</p>
              </div>

              <div className="relative pl-12">
                <div className="absolute left-1.5 top-1 h-5 w-5 rounded-full bg-red-600 border-4 border-red-900"></div>
                <h3 className="font-bold text-lg text-gray-900">5. Ejecución del Desalojo (Lanzamiento)</h3>
                <p className="text-gray-600 mt-2">Si el inmueble no se entrega, se ordena el lanzamiento con auxilio de la fuerza pública para devolver la propiedad al arrendador.</p>
              </div>
            </div>
          </div>

          <InArticleCTA
            message="¿Necesitas iniciar un proceso de desalojo o te están demandando? Un abogado puede decirte en qué etapa estás y cuánto puede tomar tu caso."
            buttonText="Hablar con abogado de arriendo"
            category="Derecho Arrendamiento"
          />

          <div className="mb-12 py-2">
            <h2 className="text-2xl font-bold mb-6">¿Qué hacer si enfrentas un juicio de desalojo?</h2>
            <div className="grid md:grid-cols-1 gap-8 mt-6">
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                  Recomendaciones Arrendadores
                </h3>
                <ul className="space-y-3 text-base text-gray-700">
                  <li>• Reúne todos los documentos que acrediten la deuda.</li>
                  <li>• No intentes acciones de fuerza por cuenta propia.</li>
                  <li>• Busca asesoría legal para una demanda sólida.</li>
                </ul>
              </div>
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  Recomendaciones Arrendatarios
                </h3>
                <ul className="space-y-3 text-base text-gray-700 mb-6">
                  <li>• Revisa minuciosamente las condiciones de tu contrato.</li>
                  <li>• Evalúa la posibilidad de pagar o negociar un plazo.</li>
                  <li>• Busca orientación legal para defender tus derechos.</li>
                </ul>
                <div className="text-center py-4 border-t border-b border-gray-100 mt-8">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
                  <Link
                    to="/blog/me-subieron-el-arriendo-que-hago-2026"
                    className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
                  >
                    👉 Me subieron el arriendo: ¿Cómo defenderme?
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Arrendador con abogado desde el día 1</h3>
                <p className="text-green-700">Presenta la demanda correctamente, el juicio avanza sin errores y recupera la propiedad en el menor tiempo posible.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Arrendador que intenta el desalojo por su cuenta</h3>
                <p className="text-red-700">Comete errores procesales, la demanda es rechazada o se retrasa, y el proceso se extiende varios meses más de lo necesario.</p>
              </div>
            </div>
          </div>

          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/me-quieren-desalojar-que-hago-chile-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 Desalojo sin orden judicial: Tus derechos
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Improved CTA */}
          <div className="mb-12">
            <div className="bg-green-900 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-serif font-bold text-green-600 mb-3">¿No sabes cuánto puede demorar tu caso de desalojo?</h3>
              <p className="text-white mb-6">Cada caso es diferente. Un abogado especializado puede revisar tu situación y darte un plazo realista en minutos.</p>
              <Link to="/abogados-arriendo" className="inline-block bg-white text-green-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors">
                Ver abogados inmobiliarios disponibles
              </Link>
            </div>
          </div>


          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿En qué situaciones conviene consultar cuanto antes a un abogado inmobiliario?</h2>
            <p className="text-gray-600 mb-4">Cuando el conflicto de arriendo escala, el tiempo juega en contra. Consultar a un abogado especializado a tiempo puede marcar la diferencia entre un desalojo rápido y un proceso que se extiende por meses.</p>
            <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
              {["Si el arrendatario ya fue notificado y no sabes cómo responder", "Si llevas más de 2 meses sin pago y el arrendador amenaza con demandar", "Si eres arrendador y necesitas saber cuánto puede demorar realmente tu caso"].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 flex-shrink-0">•</span>
                  <span className="text-gray-700 font-bold">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              El juicio de desalojo en Chile puede demorar desde algunas semanas hasta varios meses, dependiendo de factores como el tipo de contrato, si existen rentas impagas, la carga del tribunal y si el arrendatario presenta defensa durante el proceso.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Aprender las reglas generales es el primer paso, pero la pregunta que queda abierta es cómo se aplican esas reglas a los hechos específicos de cada caso. Esa respuesta depende de los antecedentes concretos y de las circunstancias particulares de cada situación. Si quieres revisar una situación particular, puedes consultar con un <Link to="/abogados-arriendo" className="text-green-700 underline hover:text-green-500">abogado inmobiliario en Chile</Link>.
            </p>
          </div>


          <CategoryCTA category="arriendo" topic="arriendo" />
          <div className="mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Preguntas frecuentes sobre desalojos en Chile</h2>
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

      <RelatedLawyers category="Derecho Civil" />

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare
            title="¿Cuánto demora un juicio de desalojo en Chile? Guía 2026"
            url="https://legalup.cl/blog/cuanto-demora-juicio-desalojo-chile-2026"
          />
        </div>

        <BlogNavigation currentArticleId="cuanto-demora-juicio-desalojo-chile-2026" />

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
      <BlogConversionPopup category="Derecho Civil" topic="juicio-desalojo" />
    </div>
  );
};

export default BlogArticle;
