import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, Info, Shield, Search, MessageSquare, AlertCircle } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";

const BlogArticle = () => {
  const faqs = [
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
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="Me subieron el arriendo, ¿qué hago? Guía completa Chile 2026"
        description="¿Te subieron el arriendo? Conoce tus derechos en Chile 2026. Cuándo es legal el aumento, cómo negociar y qué hacer ante un cobro arbitrario."
        image="/assets/arriendo-chile-2026.png"
        url="https://legalup.cl/blog/me-subieron-el-arriendo-que-hago-2026"
        datePublished="2026-01-13"
        dateModified="2026-03-16"
        faqs={faqs}
      />
      <Header onAuthClick={() => {}} />
      <ReadingProgressBar />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
          <div className="flex items-center gap-2 text-blue-100 mb-4">
            <Link to="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>Artículo</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-balance">
            Me subieron el arriendo, ¿qué hago? Guía completa para arrendatarios en Chile (2026)
          </h1>
          
          <p className="text-xl text-blue-100 max-w-3xl leading-relaxed">
            Entender qué dice tu contrato y cuáles son tus derechos es fundamental para proteger tu presupuesto y evitar cobros abusivos.
          </p>
          
          <div className="flex flex-wrap items-center gap-4 text-blue-100 mt-6 text-sm sm:text-base">
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
              <span>Tiempo de lectura: 10 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
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
            <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg mb-8">
              <p className="text-blue-800 font-medium italic">
                Por lo tanto, antes de aceptar cualquier aumento, lo primero que debes hacer es revisar cuidadosamente el contrato que firmaste.
              </p>
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
                  <div className="bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mb-4">{i+1}</div>
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
                  <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Por ejemplo, si el contrato establece que el arriendo se reajustará según IPC una vez al año, el arrendador puede aplicar ese aumento cuando corresponda. En ese caso, el reajuste no es arbitrario, sino que simplemente está ejecutando una condición que ambas partes aceptaron al firmar el contrato.
            </p>
          </div>

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
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si mi contrato de arriendo ya terminó?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Cuando el contrato de arriendo finaliza, la situación cambia un poco. En muchos casos ocurre lo que se conoce como prórroga automática o tácita reconducción. Esto significa que el contrato continúa funcionando bajo las mismas condiciones mientras ninguna de las partes manifieste lo contrario.
            </p>
            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 mb-6">
              <p className="text-indigo-900 leading-relaxed">
                En este escenario, el arrendador puede proponer un nuevo valor de arriendo para renovar el contrato. Sin embargo, esto debe hacerse respetando ciertas condiciones. Generalmente se requiere: aviso previo (habitualmente 30 días), acuerdo entre ambas partes y firma de un nuevo contrato o anexo.
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
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600 font-bold text-base w-9 h-9 flex items-center justify-center flex-shrink-0">
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
            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-lg mb-8">
              <p className="text-red-800 font-medium">
                Cualquier desalojo debe realizarse mediante un proceso judicial, no por decisión unilateral del dueño.
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
                    <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <span className="text-base font-medium">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              El aumento del arriendo en Chile está regulado principalmente por el contrato de arriendo. Esto significa que el dueño no puede modificar el precio de forma arbitraria durante la vigencia del contrato.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Antes de aceptar cualquier aumento, es fundamental revisar las cláusulas de reajuste y verificar si el cambio corresponde a lo pactado. Si el aumento no está contemplado en el contrato, el arrendatario tiene derecho a rechazarlo y mantener el monto original.
            </p>
            <p className="text-gray-600 font-bold leading-relaxed">
              Conocer tus derechos y entender cómo funcionan los contratos de arriendo puede ayudarte a evitar conflictos y tomar decisiones informadas cuando enfrentas un aumento en el valor del arriendo.
            </p>
          </div>

          {/* FAQ */}
          <div className="mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">Preguntas frecuentes sobre el aumento del arriendo</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-700">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <section className="bg-white rounded-xl shadow-sm p-8 text-center mt-8 border">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">¿Necesitas asesoría legal por tu arriendo?</h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
            No permitas cobros abusivos. Conectamos a arrendatarios con abogados expertos en derecho inmobiliario para revisar contratos y defender tus derechos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/consulta">
              <Button
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_consultar_abogado', {
                    article: window.location.pathname,
                    location: 'blog_cta_arriendo_aumento_primary',
                  });
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 w-full sm:w-auto shadow-md"
              >
                Consultar con Abogado Ahora
              </Button>
            </Link>
            <Link to="/search?category=Derecho+Inmobiliario">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_ver_abogados', {
                    article: window.location.pathname,
                    location: 'blog_cta_arriendo_aumento_secondary',
                  });
                }}
                className="border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 w-full sm:w-auto"
              >
                Ver Abogados Inmobiliarios
              </Button>
            </Link>
          </div>
        </section>
      </div>

      <RelatedLawyers category="Derecho Inmobiliario" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare 
            title="Me subieron el arriendo, ¿qué hago? Guía completa Chile 2026" 
            url="https://legalup.cl/blog/me-subieron-el-arriendo-que-hago-2026" 
          />
        </div>

        <BlogNavigation 
          nextArticle={{
            id: "como-calcular-tu-finiquito-chile-2026",
            title: "¿Cómo calcular tu finiquito en Chile? Guía 2026 paso a paso",
            excerpt: "Calcular el finiquito puede generar dudas. Te explicamos cómo calcularlo correctamente incluyendo indemnizaciones y vacaciones.",
            image: "/assets/finiquito-chile-2026.png"
          }}
        />

        <div className="mt-8 text-center">
          <Link 
            to="/blog" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
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
