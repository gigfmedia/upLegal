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
      question: "¿Es obligatorio declarar ante Carabineros?",
      answer: "No. Toda persona tiene derecho a guardar silencio hasta hablar con un abogado. Cualquier declaración puede ser utilizada durante la investigación, por lo que recibir asesoría previa es fundamental."
    },
    {
      question: "¿Puede alguien ir a la cárcel sin juicio?",
      answer: "En algunos casos excepcionales un juez puede ordenar prisión preventiva mientras dura la investigación, pero no es una condena. Es una medida cautelar para asegurar el proceso."
    },
    {
      question: "¿Qué pasa si soy inocente?",
      answer: "El proceso penal permite presentar pruebas, testigos y antecedentes que demuestren tu inocencia. Una defensa técnica adecuada es clave para aclarar los hechos ante el tribunal."
    },
    {
      question: "¿Cuánto dura una investigación penal?",
      answer: "Depende del caso. Algunas investigaciones duran meses, mientras que en delitos complejos o con muchas diligencias pendientes pueden extenderse por más tiempo según el plazo fijado por el juez."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="¿Qué hacer si te acusan de un delito en Chile? Guía de Derecho Penal 2026"
        description="Enfrentar una acusación penal puede ser difícil. Conoce tus derechos, cómo funciona el proceso penal en Chile y qué pasos seguir para tu defensa en esta Guía 2026."
        image="/assets/derecho-penal-chile-2026.png"
        url="https://legalup.cl/blog/derecho-penal-chile-2026"
        datePublished="2026-03-10"
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
          
          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-balance">
            ¿Qué hacer si te acusan de un delito en Chile? Guía de Derecho Penal 2026
          </h1>
          
          <p className="text-xl text-blue-100 max-w-3xl leading-relaxed">
            Enfrentar una acusación penal es una de las situaciones más difíciles. Conocer tus derechos y el sistema es vital para proteger tu situación legal.
          </p>
          
          <div className="flex flex-wrap items-center gap-4 text-blue-100 mt-6 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>10 de Marzo, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Tiempo de lectura: 8 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <BlogShare 
            title="¿Qué hacer si te acusan de un delito en Chile? Guía de Derecho Penal 2026" 
            url="https://legalup.cl/blog/derecho-penal-chile-2026" 
            showBorder={false}
          />
          
          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed font-medium">
              Enfrentar una acusación penal puede ser una de las situaciones más difíciles y estresantes para cualquier persona. Muchas veces ocurre de forma inesperada: una denuncia, una investigación policial o incluso un conflicto personal que termina en tribunales.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Cuando alguien es acusado de un delito, surgen muchas dudas y temores. ¿Puedo ir a la cárcel? ¿Debo declarar? ¿Qué derechos tengo? ¿Cómo funciona el proceso penal en Chile?
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              En esta <strong>Guía 2026 de Derecho Penal en Chile</strong> explicamos de forma simple qué significa ser acusado de un delito, cuáles son tus derechos, cómo funciona el proceso penal chileno y qué pasos debes seguir para proteger tu situación legal.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed font-semibold">
              Conocer cómo funciona el sistema penal puede ayudarte a tomar decisiones informadas y evitar errores que podrían perjudicar tu defensa.
            </p>
          </div>

          <div className="mb-12 py-2">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué significa ser imputado en un proceso penal?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Una persona se considera imputada cuando el <strong>Ministerio Público</strong> (Fiscalía) inicia una investigación en su contra por su posible participación en un delito. Es importante entender que <strong>ser imputado no significa ser culpable</strong>.
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg mb-8">
              <p className="text-blue-800 font-medium italic">
                IMPORTANTE: Ser imputado simplemente significa que existen antecedentes que justifican investigar si la persona tuvo participación en el delito. Durante esta etapa, gozas de la presunción de inocencia.
              </p>
            </div>
            <h3 className="text-xl font-bold mb-4 text-gray-900 font-primary">Sus derechos fundamentales como imputado:</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "Derecho a guardar silencio",
                "Derecho a contar con un abogado defensor",
                "Derecho a conocer los antecedentes de la investigación",
                "Derecho a un juicio justo"
              ].map((right, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <Shield className="h-5 w-5 text-blue-500 flex-shrink-0" />
                   <span className="text-gray-700 text-base">{right}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cómo funciona el proceso penal en Chile?</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              El proceso penal chileno sigue una serie de etapas establecidas por la ley para garantizar justicia y debido proceso:
            </p>
            <div className="space-y-4">
              {[
                { title: "Denuncia o querella", desc: "El proceso comienza con una denuncia ante Carabineros, PDI o Fiscalía. También puede ser mediante una querella criminal presentada por la víctima." },
                { title: "Investigación del delito", desc: "La Fiscalía dirige la investigación, reuniendo pruebas como declaraciones, peritajes y registros para determinar si existió el delito." },
                { title: "Audiencia de formalización", desc: "Si hay antecedentes, se comunica oficialmente al imputado que está siendo investigado. Se fijan plazos y medidas cautelares." },
                { title: "Juicio oral", desc: "Instancia donde se presentan pruebas ante un tribunal. El juez decide si el acusado es absuelto o condenado según el mérito de la evidencia." }
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                   <div className="bg-blue-100 p-2 rounded-lg text-blue-600 font-bold text-base w-9 h-9 flex items-center justify-center flex-shrink-0">{i+1}</div>
                  <div>
                    <span className="font-bold text-gray-900">{step.title}</span>
                     <p className="text-base text-gray-600 mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué hacer si te acusan de un delito?</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Si enfrentas una acusación penal, es fundamental actuar con calma y tomar decisiones informadas. Estos son los pasos críticos:
            </p>
            <div className="space-y-4">
              {[
                { title: "No declarar sin asesoría legal", desc: "Regla de oro: No prestes declaración ante la policía o fiscalía sin un abogado. Cualquier palabra puede ser usada en tu contra.", icon: <MessageSquare className="h-5 w-5" /> },
                { title: "Contactar a un abogado penalista", desc: "Un especialista puede revisar la carpeta investigativa, analizar las pruebas y diseñar una estrategia de defensa sólida.", icon: <Shield className="h-5 w-5" /> },
                { title: "Reunir antecedentes relevantes", desc: "Recopila documentos, chats, correos o testigos que ayuden a aclarar tu versión.", icon: <Search className="h-5 w-5" /> },
                { title: "Cumplir las medidas cautelares", desc: "Si el juez dicta medidas como firma mensual o arraigo, respétalas estrictamente para evitar agravar tu situación.", icon: <AlertCircle className="h-5 w-5" /> }
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
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si eres víctima de un delito?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El sistema penal también protege activamente a las víctimas. Si has sufrido un delito, tienes derechos claros para buscar justicia y reparación:
            </p>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  "Presentar una denuncia inmediata",
                  "Solicitar medidas de protección",
                  "Participar en el proceso penal",
                  "Exigir reparación del daño"
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 text-gray-700">
                    <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                     <span className="text-base font-medium">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              En el sistema penal chileno, enfrentar una acusación requiere conocimiento de tus derechos y rapidez en la defensa. No declarar sin asesoría y contar con un abogado especialista son las claves para proteger tu libertad y futuro.
            </p>
            <p className="text-gray-600 font-bold leading-relaxed">
              Si tienes dudas sobre tu situación legal o necesitas ayuda inmediata por una detención o denuncia, buscar asesoría jurídica de confianza es el primer paso hacia una solución justa.
            </p>
          </div>

          {/* FAQ */}
          <div className="mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">Preguntas frecuentes sobre Derecho Penal</h2>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">¿Te acusan de un delito o fuiste víctima?</h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
            Protege tu libertad y tus derechos. Conectamos a personas con abogados penalistas expertos para preparar tu defensa o querella de forma inmediata y profesional.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/consulta">
              <Button
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_consultar_abogado', {
                    article: window.location.pathname,
                    location: 'blog_cta_derecho_penal_primary',
                  });
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 w-full sm:w-auto shadow-md"
              >
                Consultar con Abogado Penalista
              </Button>
            </Link>
            <Link to="/search?category=Derecho+Penal">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_ver_abogados', {
                    article: window.location.pathname,
                    location: 'blog_cta_derecho_penal_secondary',
                  });
                }}
                className="border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 w-full sm:w-auto"
              >
                Ver Listado de Abogados
              </Button>
            </Link>
          </div>
        </section>
      </div>

      <RelatedLawyers category="Derecho Penal" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare 
            title="¿Qué hacer si te acusan de un delito en Chile? Guía de Derecho Penal 2026" 
            url="https://legalup.cl/blog/derecho-penal-chile-2026" 
          />
        </div>

        <BlogNavigation 
          prevArticle={{
            id: "derecho-de-familia-chile-2026",
            title: "¿Qué es el Derecho de Familia y cómo funciona en Chile? Guía 2026 completa",
            excerpt: "El Derecho de Familia en Chile regula las relaciones jurídicas entre padres, hijos, parejas y otros vínculos familiares. Revisa qué abarca y cómo funcionan los juicios.",
            image: "/assets/derecho-de-familia-chile-2026.png"
          }}
          nextArticle={{
            id: "me-quieren-desalojar-que-hago-chile-2026",
            title: "¿Me pueden desalojar sin orden judicial en Chile? Guía 2026",
            excerpt: "Conoce tus derechos legales y el proceso correcto para enfrentar un intento de desalojo bajo la normativa vigente.",
            image: "/assets/desalojo-chile-2026.png"
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
