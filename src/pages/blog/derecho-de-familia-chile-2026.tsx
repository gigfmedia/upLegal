import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import Header from "@/components/Header";

const BlogArticle = () => {
  useEffect(() => {
    // Set SEO meta tags
    document.title = "¿Qué es el Derecho de Familia y cómo funciona en Chile? Guía 2026 completa | LegalUp";
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'El Derecho de Familia en Chile regula las relaciones jurídicas entre padres, hijos, parejas y otros vínculos familiares. Guía completa 2026 sobre pensión de alimentos, cuidado personal, divorcio y violencia intrafamiliar.');
    }

    // Update canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', 'https://legalup.cl/blog/derecho-de-familia-chile-2026');

    // Add structured data (JSON-LD)
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "¿Qué es el Derecho de Familia y cómo funciona en Chile? Guía 2026 completa",
      "description": "El Derecho de Familia en Chile regula las relaciones jurídicas entre padres, hijos, parejas y otros vínculos familiares. Guía completa 2026 sobre pensión de alimentos, cuidado personal, divorcio y violencia intrafamiliar.",
      "author": {
        "@type": "Organization",
        "name": "LegalUp"
      },
      "publisher": {
        "@type": "Organization",
        "name": "LegalUp",
        "logo": {
          "@type": "ImageObject",
          "url": "https://legalup.cl/logo.png"
        }
      },
      "datePublished": "2026-02-25",
      "dateModified": "2026-02-25",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://legalup.cl/blog/derecho-de-familia-chile-2026"
      }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
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
            ¿Qué es el Derecho de Familia y cómo funciona en Chile? Guía 2026 completa
          </h1>
          
          <p className="text-xl text-blue-100 max-w-3xl">
            El Derecho de Familia en Chile regula las relaciones jurídicas entre padres, hijos, parejas y otros vínculos familiares. En esta Guía 2026, revisamos qué abarca, cuáles son los trámites más comunes, cómo funcionan los juicios y qué puedes hacer en caso de conflicto.
          </p>
          
          <div className="flex flex-wrap items-center gap-4 text-blue-100 mt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>25 de Febrero, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Tiempo de lectura: 15 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-8">
            <p className="text-lg text-gray-600 leading-relaxed">
              El Derecho de Familia es una rama fundamental del derecho chileno que protege los vínculos más importantes de nuestra sociedad. En esta guía completa 2026, te explicamos todo lo que necesitas saber sobre las relaciones familiares en Chile, desde la pensión de alimentos hasta el divorcio, pasando por el cuidado personal y la violencia intrafamiliar.
            </p>
          </div>

          {/* What is Family Law */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">¿Qué es el Derecho de Familia?</h2>
            <p className="text-gray-600 mb-4">
              Es el conjunto de normas que regulan:
            </p>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <span>Relaciones de pareja</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <span>Relaciones paterno-filiales</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <span>Protección de derechos de niños, niñas y adolescentes</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <span>Deberes y obligaciones dentro del núcleo familiar</span>
              </li>
            </ul>
            <p className="text-sm text-gray-500 mt-4">
              Incluye temas como pensión de alimentos, cuidado personal, visitas, divorcio, violencia intrafamiliar, patrimonio familiar, entre otros.
            </p>
          </div>

          {/* Important Topics */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">¿Cuáles son los temas más importantes del Derecho de Familia en 2026?</h2>
            <p className="text-gray-600 mb-6">
              A continuación, los problemas más comunes que atienden los tribunales y abogados de familia:
            </p>
            
            <div className="space-y-6">
              {/* 1. Pensión de alimentos */}
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Pensión de alimentos</h3>
                  <p className="text-gray-600 mb-3">
                    Regula el aporte económico que debe realizar un padre o madre para cubrir gastos esenciales del hijo/a:
                  </p>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Educación</li>
                    <li>• Alimentación</li>
                    <li>• Salud</li>
                    <li>• Vivienda</li>
                    <li>• Vestuario y transporte</li>
                  </ul>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <p className="text-sm text-blue-800">
                      <strong>¿Cuánto se paga?</strong> Depende del ingreso del demandado y de las necesidades del menor. Los tribunales suelen usar el estándar de gastos básicos y comprobables.
                    </p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-3">
                    <p className="text-sm text-red-800">
                      <strong>¿Qué pasa si no se paga?</strong> Puedes solicitar: Retención del sueldo, Retención del Seguro de Cesantía, Arresto nocturno, Arraigo nacional, Retención de la devolución de impuestos.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Cuidado personal */}
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Cuidado personal (tuición)</h3>
                  <p className="text-gray-600 mb-3">
                    Determina con quién vive el menor la mayor parte del tiempo. En Chile existen dos modalidades:
                  </p>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Cuidado personal exclusivo</li>
                    <li>• Cuidado personal compartido</li>
                  </ul>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                    <p className="text-sm text-green-800">
                      <strong>El principal criterio en 2026 sigue siendo:</strong> el interés superior del niño
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Régimen de visitas */}
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Régimen de relación directa y regular (visitas)</h3>
                  <p className="text-gray-600 mb-3">
                    Corresponde al derecho del padre o madre que no tiene el cuidado personal a mantener contacto frecuente con el hijo/a.
                  </p>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Visitas presenciales</li>
                    <li>• Videollamadas</li>
                    <li>• Horarios especiales (vacaciones, feriados, cumpleaños)</li>
                  </ul>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Importante:</strong> Si una parte no cumple el acuerdo, se puede pedir cumplimiento forzado ante el tribunal.
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Divorcio */}
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Divorcio (unilateral y de mutuo acuerdo)</h3>
                  <p className="text-gray-600 mb-3">
                    El divorcio termina el vínculo matrimonial.
                  </p>
                  <div className="space-y-3 mb-4">
                    <h4 className="font-semibold">Tipos de divorcio:</h4>
                    <ul className="space-y-2 text-gray-600">
                      <li>• <strong>Mutuo acuerdo:</strong> el más rápido y económico.</li>
                      <li>• <strong>Unilateral:</strong> uno de los cónyuges lo solicita sin acuerdo del otro.</li>
                      <li>• <strong>Por culpa:</strong> casos excepcionales (maltrato grave, abandono, infidelidad con daño grave demostrable).</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Requisitos básicos:</strong> 1 año de cese de convivencia (mutuo acuerdo), 3 años para divorcio unilateral, Acreditar cese con acta, contrato o finiquito doméstico.
                    </p>
                  </div>
                </div>
              </div>

              {/* 5. Violencia intrafamiliar */}
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">
                  5
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Violencia intrafamiliar (VIF)</h3>
                  <p className="text-gray-600 mb-3">
                    Incluye maltrato físico, psicológico, económico o sexual dentro del núcleo familiar.
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">
                      <strong>Las medidas pueden ser:</strong> Prohibición de acercarse, Orden de salida del hogar, Tratamiento obligatorio, Protección policial inmediata.
                    </p>
                  </div>
                </div>
              </div>

              {/* 6. Adopción */}
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">
                  6
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Adopción</h3>
                  <p className="text-gray-600">
                    Proceso legal mediante el cual un niño puede integrarse a un nuevo núcleo familiar, siempre con control judicial.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">¿Cómo funcionan los juicios de familia en Chile en 2026?</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Presentación de la demanda</h3>
                  <p className="text-gray-600">El proceso inicia en el Tribunal de Familia competente.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Mediación obligatoria</h3>
                  <p className="text-gray-600">En temas de alimentos, visitas y cuidado personal, debes pasar primero por mediación.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Audiencia preparatoria y de juicio</h3>
                  <p className="text-gray-600 mb-2">Se presentan pruebas:</p>
                  <ul className="space-y-1 text-gray-600 ml-4">
                    <li>• Informes sociales</li>
                    <li>• Testigos</li>
                    <li>• Evidencia documental</li>
                    <li>• Peritajes psicológicos o sociales</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Sentencia</h3>
                  <p className="text-gray-600">El juez decide aplicando el principio del interés superior del niño.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Documentos frecuentes que te pedirán en un trámite de familia</h2>
            <p className="text-gray-600 mb-4">
              Para la mayoría de las causas necesitarás:
            </p>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <span>Certificado de nacimiento del menor</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <span>Certificado de matrimonio (si corresponde)</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <span>Comprobantes de gastos (alimentos)</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <span>Certificados de ingresos</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <span>Actas de mediación</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <span>Documentos de convivencia o separación</span>
              </li>
            </ul>
          </div>

          {/* FAQ */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Preguntas frecuentes sobre Derecho de Familia (2026)</h2>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">¿Puedo pedir aumento de pensión de alimentos?</h4>
                <p className="text-gray-600 text-sm">Sí, si han cambiado las necesidades del menor o ingresos del demandado.</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">¿Puedo impedir visitas si el padre/madre no paga alimentos?</h4>
                <p className="text-gray-600 text-sm">No. Son procesos distintos, pero puedes solicitar cumplimiento forzado.</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">¿Puedo cambiar el cuidado personal a compartido?</h4>
                <p className="text-gray-600 text-sm">Sí, si existen condiciones adecuadas y mejora el bienestar del menor.</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">¿Los mensajes de WhatsApp sirven como prueba?</h4>
                <p className="text-gray-600 text-sm">Sí, si se presentan correctamente.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
          <section className="bg-white rounded-xl shadow-sm p-8 text-center mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">¿Necesitas ayuda en un caso de familia?</h2>
            <p className="text-lg text-gray-700 mb-6">
              Un abogado especialista puede ayudarte a:
            </p>

            <div className="grid gap-3 md:grid-cols-2 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Presentar demandas</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Revisar acuerdos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Representarte ante el tribunal</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Asegurar el interés superior del niño</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Proteger tus derechos y los de tus hijos</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                onClick={() => window.location.href = '/consulta'}
              >
                Consultar con Abogado Ahora
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-blue-600 text-blue-600 hover:text-blue-600 hover:bg-blue-50 px-8 py-3"
                onClick={() => window.location.href = '/search?category=Derecho+de+Familia'}
              >
                Ver Abogados de Familia
              </Button>
            </div>
          </section>

          {/* Back to Blog */}
          <div className="mt-12 text-center">
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
