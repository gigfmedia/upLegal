import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Es obligatorio declarar ante carabineros?",
      answer: "No. Tienes derecho a guardar silencio hasta hablar con un abogado."
    },
    {
      question: "¿Puede ir a la cárcel sin juicio?",
      answer: "Solo en casos excepcionales mediante prisión preventiva, ordenada por un juez."
    },
    {
      question: "¿Qué pasa si soy inocente?",
      answer: "El proceso penal permite presentar pruebas y defenderse para demostrarlo."
    },
    {
      question: "¿Cuánto dura una investigación penal?",
      answer: "Depende del caso, pero puede extenderse desde algunos meses hasta más tiempo en delitos complejos."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="¿Qué hacer si te acusan de un delito en Chile? Guía de Derecho Penal 2026"
        description="Enfrentar una acusación penal puede ser difícil. En esta Guía 2026 de Derecho Penal en Chile, explicamos qué significa ser imputado, tus derechos y el proceso penal."
        image="/assets/derecho-penal-chile-2026.png"
        url="https://legalup.cl/blog/derecho-penal-chile-2026"
        datePublished="2026-03-10"
        dateModified="2026-03-11"
        faqs={faqs}
      />
      <Header onAuthClick={() => {}} />
      
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
          
          <h1 className="text-3xl sm:text-4xl font-bold mb-6">
            ¿Qué hacer si te acusan de un delito en Chile? Guía de Derecho Penal 2026
          </h1>
          
          <p className="text-xl text-blue-100 max-w-3xl">
            Enfrentar una acusación penal puede ser una de las situaciones más difíciles para cualquier persona. En esta Guía 2026 de Derecho Penal en Chile, explicamos qué significa ser acusado de un delito, cuáles son tus derechos, cómo funciona el proceso penal y qué pasos debes seguir para protegerte legalmente.
          </p>
          
          <div className="flex flex-wrap items-center gap-4 text-blue-100 mt-6">
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
              <span>Tiempo de lectura: 10 min</span>
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

          {/* Section 1 */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">¿Qué es el Derecho Penal?</h2>
            <p className="text-gray-600 mb-4">
              El Derecho Penal es la rama del derecho que regula los delitos y las sanciones aplicables cuando una persona infringe la ley.
            </p>
            <p className="text-gray-600 mb-4">En Chile, el sistema penal busca:</p>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
                <span>Investigar delitos</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
                <span>Determinar responsabilidades</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
                <span>Aplicar sanciones cuando corresponde</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
                <span>Proteger los derechos de las víctimas y de los imputados</span>
              </li>
            </ul>
            <p className="text-sm text-gray-500 mt-4">
              Los delitos pueden incluir desde hurtos y estafas hasta delitos más graves como robos, violencia o fraude.
            </p>
          </div>

          {/* Section 2 */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">¿Qué significa ser imputado en un proceso penal?</h2>
            <p className="text-gray-600 mb-4">
              Una persona se considera imputada cuando el Ministerio Público (Fiscalía) la investiga por su posible participación en un delito.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Importante:</strong> Esto no significa que sea culpable, sino que existen antecedentes que justifican una investigación.
              </p>
            </div>
            <p className="text-gray-600 mb-4">Durante esta etapa, el imputado tiene varios derechos, entre ellos:</p>
            <ul className="space-y-2 text-gray-600">
              <li>• Derecho a guardar silencio</li>
              <li>• Derecho a un abogado defensor</li>
              <li>• Derecho a conocer la investigación en su contra</li>
              <li>• Derecho a un juicio justo</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">¿Cómo funciona un proceso penal en Chile? (2026)</h2>
            <p className="text-gray-600 mb-6">El proceso penal suele seguir estas etapas principales:</p>
            
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">1</div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Denuncia o querella</h3>
                  <p className="text-gray-600 mb-2">Todo comienza cuando alguien denuncia un delito ante Carabineros, Policía de Investigaciones o Fiscalía. También puede presentarse una querella a través de un abogado.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">2</div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Investigación del delito</h3>
                  <p className="text-gray-600 mb-2">La Fiscalía dirige la investigación y puede ordenar diligencias como declaraciones de testigos, peritajes, revisión de documentos e incautación de evidencia. El objetivo es reunir antecedentes para determinar si hubo delito.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">3</div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Audiencia de formalización</h3>
                  <p className="text-gray-600 mb-2">Si existen antecedentes suficientes, la Fiscalía puede formalizar la investigación ante un juez. En esta audiencia se comunica al imputado el delito investigado, se pueden solicitar medidas cautelares y se fija el plazo de investigación.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">4</div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Medidas cautelares</h3>
                  <p className="text-gray-600 mb-2">Son restricciones temporales mientras dura la investigación. Las más comunes son firma mensual, prohibición de acercarse a la víctima, arresto domiciliario y prisión preventiva.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">5</div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Juicio oral</h3>
                  <p className="text-gray-600 mb-2">Si el caso llega a juicio, el tribunal escuchará testigos, peritos y pruebas documentales. Finalmente, el tribunal decide si el acusado es absuelto o condenado.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">¿Qué hacer si te acusan de un delito?</h2>
            <p className="text-gray-600 mb-6">Si te enfrentas a una acusación penal, es recomendable:</p>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                <h4 className="font-semibold text-lg mb-2 text-gray-900">1. No declarar sin asesoría</h4>
                <p className="text-gray-700">Cualquier declaración puede ser utilizada en la investigación.</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                <h4 className="font-semibold text-lg mb-2 text-gray-900">2. Contactar a un abogado penalista</h4>
                <p className="text-gray-700">Un abogado puede revisar la carpeta investigativa, preparar tu defensa y representarte ante el tribunal.</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                <h4 className="font-semibold text-lg mb-2 text-gray-900">3. Reunir antecedentes</h4>
                <p className="text-gray-700">Documentos, mensajes, testigos o cualquier evidencia que pueda ayudar a aclarar los hechos.</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                <h4 className="font-semibold text-lg mb-2 text-gray-900">4. Cumplir medidas cautelares</h4>
                <p className="text-gray-700">No respetarlas puede agravar tu situación legal.</p>
              </div>
            </div>
          </div>

          {/* Section 5 */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">¿Qué pasa si eres víctima de un delito?</h2>
            <p className="text-gray-600 mb-4">Si eres víctima, puedes:</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-600 mb-4">
              <li className="flex items-center gap-2 p-3 border rounded-lg hover:bg-green-50 transition-all">
                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                <span>Presentar una denuncia</span>
              </li>
              <li className="flex items-center gap-2 p-3 border rounded-lg hover:bg-green-50 transition-all">
                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                <span>Solicitar medidas de protección</span>
              </li>
              <li className="flex items-center gap-2 p-3 border rounded-lg hover:bg-green-50 transition-all">
                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                <span>Participar en el proceso penal</span>
              </li>
              <li className="flex items-center gap-2 p-3 border rounded-lg hover:bg-green-50 transition-all">
                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                <span>Exigir reparación del daño</span>
              </li>
            </ul>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                Un abogado puede ayudarte a presentar una querella penal para participar activamente en el caso.
              </p>
            </div>
          </div>

          {/* Section 6 */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">Delitos más consultados en Chile</h2>
            <p className="text-gray-600 mb-4">Entre los casos penales más comunes se encuentran:</p>
            <div className="flex flex-wrap gap-2 text-gray-600">
              <span className="bg-gray-100 px-3 py-1 rounded-md text-sm border">Estafas y fraudes</span>
              <span className="bg-gray-100 px-3 py-1 rounded-md text-sm border">Hurtos y robos</span>
              <span className="bg-gray-100 px-3 py-1 rounded-md text-sm border">Violencia intrafamiliar</span>
              <span className="bg-gray-100 px-3 py-1 rounded-md text-sm border">Amenazas</span>
              <span className="bg-gray-100 px-3 py-1 rounded-md text-sm border">Lesiones</span>
              <span className="bg-gray-100 px-3 py-1 rounded-md text-sm border">Delitos informáticos</span>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Cada caso requiere una estrategia legal distinta.
            </p>
          </div>

          {/* FAQ (SEO structured) */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Preguntas frecuentes sobre derecho penal</h2>
            
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
        <section className="bg-white rounded-xl shadow-sm p-8 text-center mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">¿Necesitas un abogado penal en Chile?</h2>
          <p className="text-lg text-gray-700 mb-2">
            Si enfrentas una investigación o acusación penal, es importante actuar rápidamente.
            Un abogado penalista puede ayudarte a entender tu situación y preparar una defensa adecuada.
          </p>
          <p className="text-sm text-gray-700 mb-6">Encuentra abogados penales en Chile y recibe orientación legal rápida de profesionales verificados.</p>

          <div className="grid gap-3 md:grid-cols-2 mb-8 text-left max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <span>Analizar tu caso</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <span>Preparar tu defensa</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <span>Representarte ante tribunales</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <span>Proteger tus derechos durante todo el proceso</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/consulta">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 w-full sm:w-auto"
              >
                Consultar con Abogado Ahora
              </Button>
            </Link>
            <Link
              to="/search?category=Derecho+Penal"
              aria-label="Ver abogados especialistas en derecho penal en Chile">
              <Button 
                variant="outline" 
                size="lg"
                className="border-blue-600 text-blue-600 hover:text-blue-600 hover:bg-blue-50 px-8 py-3 w-full sm:w-auto"
              >
                Ver Abogados Penales
              </Button>
            </Link>
          </div>
        </section>

      </div>
      
      <RelatedLawyers category="Derecho Penal" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Compartir - Growth Hack */}
        <div className="mt-8">
          <BlogShare 
            title="¿Qué hacer si te acusan de un delito en Chile? Guía de Derecho Penal 2026" 
            url="https://legalup.cl/blog/derecho-penal-chile-2026" 
          />
        </div>

        <div className="mt-4 text-center">
          <Link 
            to="/blog" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
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
