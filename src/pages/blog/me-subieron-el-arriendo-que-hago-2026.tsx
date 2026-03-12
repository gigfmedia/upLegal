import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Me pueden subir el arriendo si no está en el contrato?",
      answer: "No. En Chile, el arriendo solo puede subir si el contrato estipula una cláusula de reajuste (UF, IPC, etc.)."
    },
    {
      question: "¿Qué pasa si mi contrato terminó y me quieren subir el precio?",
      answer: "El arrendador puede proponer un nuevo valor para la renovación, pero debe avisar con la antelación pactada (usualmente 30 días)."
    },
    {
      question: "¿Me pueden desalojar por no aceptar un aumento ilegal?",
      answer: "No. El desalojo solo procede por no pago o término de contrato legal, no por rechazar un cobro fuera de contrato."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="Me subieron el arriendo, ¿qué hago? Guía completa para arrendatarios en Chile (2026)"
        description="Guía completa 2026: ¿Qué hacer si te subieron el arriendo en Chile? Aprende cuándo es legal, cómo negociar y proteger tus derechos como arrendatario."
        image="/images/arriendo-chile-2026.jpg"
        url="https://legalup.cl/blog/me-subieron-el-arriendo-que-hago-2026"
        datePublished="2026-02-13"
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
            <span>Derecho Inmobiliario</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight">
            Me subieron el arriendo, ¿qué hago? Guía completa para arrendatarios en Chile (2026)
          </h1>

          <p className="text-xl text-blue-100 max-w-3xl">
            Cuando llega el aviso de que subirá el valor del arriendo, el estrés aparece de inmediato. Pero no siempre el aumento es válido, y en Chile existen reglas claras para proteger al arrendatario.
          </p>
          
          <div className="flex flex-wrap items-center gap-4 text-blue-100 mt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>13 de Febrero, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Tiempo de lectura: 8 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <BlogShare 
            title="Me subieron el arriendo, ¿qué hago? Guía completa para arrendatarios en Chile (2026)" 
            url="https://legalup.cl/blog/me-subieron-el-arriendo-que-hago-2026" 
            showBorder={false}
          />
          
          <div className="prose prose-lg max-w-none">
            <div className="space-y-8">
              <p className="text-lg text-gray-600 leading-relaxed">
                Aquí te explico qué puedes hacer, cuándo el aumento es legal, cómo negociar, y qué errores evitar, todo en lenguaje simple.
              </p>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  ¿Me pueden subir el arriendo cuando quieran?
                </h2>
                <div className="mb-6">
                  <p className="text-lg font-bold text-blue-700">No.</p>
                </div>
                <p className="text-gray-700 mb-6">
                  En Chile, el arriendo solo puede subir si está estipulado en el contrato. Si tu contrato no dice nada, el arrendador no puede aumentar el valor durante el período vigente.
                </p>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Revisa estas 3 cosas en tu contrato:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <strong className="text-gray-900">Cláusula de reajuste:</strong> suele indicar UF, IPC u otro índice.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <strong className="text-gray-900">Periodicidad del reajuste:</strong> mensual, semestral o anual.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <strong className="text-gray-900">Porcentaje o fórmula exacta de cálculo.</strong>
                    </div>
                  </li>
                </ul>
                
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-6">
                  <p className="text-gray-700">
                    Si el contrato no lo menciona, no procede la subida hasta que se renueve o se firme un nuevo acuerdo.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">¿Cuándo es legal subir el arriendo?</h2>
                <p className="text-gray-700 mb-6">El aumento es válido cuando:</p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                    <div> está expresamente indicado en el contrato.</div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                    <div> se respeta la forma de cálculo (UF, IPC, monto fijo, etc.).</div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                    <div> se cumple la periodicidad pactada.</div>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">¿Cuándo NO es legal subir el arriendo?</h2>
                <p className="text-gray-700 mb-6">No corresponde el aumento si:</p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <XCircle className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
                    <div>No está en el contrato.</div>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircle className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
                    <div>El dueño inventa un reajuste que no está pactado.</div>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircle className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
                    <div>Modifica unilateralmente el monto sin acuerdo.</div>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">¿Y si mi contrato ya terminó?</h2>
                <p className="text-gray-700 mb-6">
                  Si estás en prórroga automática o "tácita reconducción", el arrendador sí puede proponer un nuevo valor.
                </p>
                <p className="text-gray-700 mb-6">Debe cumplir con:</p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                    <div>Aviso previo adecuado (usualmente 30 días).</div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                    <div>Nuevo acuerdo firmado por ambas partes.</div>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">¿Qué hago si considero injusto o ilegal el aumento?</h2>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-bold">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Revisa tu contrato en detalle</h3>
                      <p className="text-gray-700">El 90% de los conflictos se resuelve sabiendo exactamente qué firmaste.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-bold">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Pide justificación por escrito</h3>
                      <p className="text-gray-700">Solicita al arrendador que indique la base legal o contractual.</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <section className="bg-white rounded-xl shadow-sm p-8 text-center mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">¿Necesitas ayuda con tu caso?</h2>
          <p className="text-lg text-gray-700 mb-6">
            Si necesitas que un abogado revise tu contrato, redacte una respuesta formal o te ayude a negociar, en LegalUp.cl puedes hablar con un abogado verificado en minutos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/consulta">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 w-full sm:w-auto"
              >
                Consultar con Abogado Ahora
              </Button>
            </Link>
            <Link to="/search?category=Derecho+Inmobiliario">
              <Button 
                variant="outline" 
                size="lg"
                className="border-blue-600 text-blue-600 hover:text-blue-600 hover:bg-blue-50 px-8 py-3 w-full sm:w-auto"
              >
                Ver Abogados Inmobiliarios
              </Button>
            </Link>
          </div>
        </section>

      </div>

      <RelatedLawyers category="Derecho Inmobiliario" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Compartir - Growth Hack */}
        <div className="mt-8">
          <BlogShare 
            title="Me subieron el arriendo, ¿qué hago? Guía completa para arrendatarios en Chile (2026)" 
            url="https://legalup.cl/blog/me-subieron-el-arriendo-que-hago-2026" 
          />
        </div>

        {/* Back to Blog */}
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
