import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Header from "@/components/Header";

const BlogArticle = () => {
  useEffect(() => {
    // Set SEO meta tags
    document.title = "Me subieron el arriendo, ¿qué hago? Guía completa para arrendatarios en Chile (2026) | LegalUp";
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Guía completa 2026: ¿Qué hacer si te subieron el arriendo en Chile? Aprende cuándo es legal, cómo negociar y proteger tus derechos como arrendatario. Asesoría legal experta.');
    }

    // Update canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', 'https://legalup.cl/blog/me-subieron-el-arriendo-que-hago');

    // Add structured data (JSON-LD)
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Me subieron el arriendo, ¿qué hago? Guía completa para arrendatarios en Chile (2026)",
      "description": "Guía completa 2026: ¿Qué hacer si te subieron el arriendo en Chile? Aprende cuándo es legal, cómo negociar y proteger tus derechos como arrendatario.",
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
      "datePublished": "2026-01-01",
      "dateModified": "2026-01-01",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://legalup.cl/blog/me-subieron-el-arriendo-que-hago"
      },
      "image": "https://legalup.cl/images/arriendo-chile-2026.jpg",
      "articleSection": "Derecho Inmobiliario",
      "keywords": ["arriendo Chile", "aumento de arriendo", "derechos arrendatario", "contrato arrendamiento", "ley arriendo Chile"]
    };

    // Remove existing structured data if any
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);

    // Cleanup on unmount
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onAuthClick={() => {}} />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 py-4">
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
        <div className="prose prose-lg max-w-none">

          {/* Main Content */}
          <div className="space-y-8">
            
            {/* Section 1: ¿Me pueden subir el arriendo cuando quieran? */}
            <section className="bg-white rounded-xl shadow-sm p-8">
              <p className="text-lg text-gray-600 leading-relaxed mb-8">
              Aquí te explico qué puedes hacer, cuándo el aumento es legal, cómo negociar, y qué errores evitar, todo en lenguaje simple.
            </p>
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
            


              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">¿Cuándo es legal subir el arriendo?</h2>
              <p className="text-gray-700 mb-6">El aumento es válido cuando:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    Está expresamente indicado en el contrato.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    Se respeta la forma de cálculo (UF, IPC, monto fijo, etc.).
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    Se cumple la periodicidad pactada.
                  </div>
                </li>
              </ul>
              
              <div className="bg-gray-50 rounded-lg p-4 mt-6">
                <p className="text-sm text-gray-600 mb-2"><strong>Ejemplo:</strong></p>
                <p className="text-gray-700">
                  Si tu arriendo está fijado en UF y la cláusula dice "ajuste mensual según UF", entonces el aumento debe seguir esa regla.
                </p>
              </div>

            {/* Section 3: ¿Cuándo NO es legal? */}
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">¿Cuándo NO es legal subir el arriendo?</h2>
              <p className="text-gray-700 mb-6">No corresponde el aumento si:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <XCircle className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    No está en el contrato.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    El dueño inventa un reajuste que no está pactado.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    Modifica unilateralmente el monto sin acuerdo.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    Rompe la periodicidad establecida.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    Aplica un incremento exagerado y sin justificación al renovar (en algunos casos puede considerarse abuso contractual).
                  </div>
                </li>
              </ul>

            {/* Section 4: ¿Y si mi contrato ya terminó? */}
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">¿Y si mi contrato ya terminó?</h2>
              <p className="text-gray-700 mb-6">
                Si estás en prórroga automática o "tácita reconducción", el arrendador sí puede proponer un nuevo valor.
              </p>
              <p className="text-gray-700 mb-6">
                Pero ojo: eso no significa que pueda imponértelo sin aviso ni dejarte en la calle de un día para otro.
              </p>
              
              <p className="text-gray-700 mb-6">Debe cumplir con:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    Aviso previo adecuado (usualmente 30 días, aunque depende del contrato).
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    Nuevo acuerdo firmado por ambas partes.
                  </div>
                </li>
              </ul>

            {/* Section 5: ¿Qué hago si considero injusto o ilegal el aumento? */}
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
                    <p className="text-gray-700 mb-3">Solicita al arrendador que indique:</p>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Base legal o contractual del aumento</li>
                      <li>• Fecha exacta de aplicación</li>
                      <li>• Cálculo del reajuste</li>
                    </ul>
                    <p className="text-gray-700 mt-2">Esto te servirá si necesitas dejar constancia.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Negocia antes de aceptar</h3>
                    <p className="text-gray-700 mb-3">Si el reajuste es legal pero excesivo, puedes proponer:</p>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Un aumento gradual</li>
                      <li>• Mantener el monto por algunos meses más</li>
                      <li>• Compensar con mejoras o reparaciones pendientes</li>
                      <li>• Renovar por más tiempo a cambio de un reajuste moderado</li>
                    </ul>
                    <p className="text-gray-700 mt-2">Los arrendadores suelen preferir mantener un buen arrendatario antes que arriesgar vacancia.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold">4</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Deja constancia si el aumento es ilegal</h3>
                    <p className="text-gray-700 mb-3">Puedes enviar un correo o WhatsApp diciendo:</p>
                    <div className="bg-gray-100 rounded p-3 text-gray-700 italic">
                      "Reviso contrato y no existe cláusula de reajuste. No corresponde aumento. Mantengo el pago del valor pactado."
                    </div>
                    <p className="text-gray-700 mt-2">Mantén siempre el arriendo al día para no dar motivos de término unilateral.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold">5</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Consulta con un abogado si hay presión o amenazas</h3>
                    <p className="text-gray-700">
                      Si te dicen que debes aceptar sí o sí, sin base contractual, o te amenazan con desalojo inmediato, lo recomendable es asesoría legal para evitar abusos.
                    </p>
                  </div>
                </div>
              </div>

            {/* Section 6: ¿Me pueden desalojar si no acepto el aumento? */}
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">¿Me pueden desalojar si no acepto el aumento?</h2>
              <div className="mb-6">
                <p className="text-lg font-bold text-blue-700">No por eso.</p>
              </div>
              <p className="text-gray-700 mb-6">El desalojo solo procede por:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-yellow-500 mt-1 flex-shrink-0" />
                  <div>
                    No pago del arriendo.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-yellow-500 mt-1 flex-shrink-0" />
                  <div>
                    Incumplimiento grave del contrato.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-yellow-500 mt-1 flex-shrink-0" />
                  <div>
                    Término del contrato con aviso previo.
                  </div>
                </li>
              </ul>
              <p className="text-gray-700 mt-6">
                Pero no por rechazar un aumento que no corresponde.
              </p>

            {/* Section 7: Special Cases */}
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">Casos Especiales</h2>
              
              <div className="space-y-6">
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">¿Qué pasa si el arriendo está expresado en pesos?</h3>
                  <p className="text-gray-700">
                    Si el contrato está en pesos y no tiene reajuste, el valor debe mantenerse tal cual hasta que termine el período contractual.
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">¿Y si está expresado en UF?</h3>
                  <p className="text-gray-700">
                    Entonces sí variará todos los meses, pero eso es normal. No es una "subida arbitraria", sino el efecto del índice acordado.
                  </p>
                </div>
              </div>
            </section>

            {/* Conclusion */}
            <section className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-bold mb-4">Conclusión: No todo aumento es válido</h2>
              <p className="mb-6">
                Antes de aceptar, pagar más o estresarte, revisa:
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 mt-1 flex-shrink-0" />
                  <div>¿Está en el contrato?</div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 mt-1 flex-shrink-0" />
                  <div>¿Se respeta la periodicidad?</div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 mt-1 flex-shrink-0" />
                  <div>¿Es un reajuste razonable y bien calculado?</div>
                </li>
              </ul>
              <p className="text-lg font-semibold">
                Si te subieron el arriendo pero el aumento no está pactado, no corresponde y puedes rechazarlo formalmente.
              </p>
            </section>

            {/* CTA Section */}
            <section className="bg-white rounded-xl shadow-sm p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">¿Necesitas ayuda con tu caso?</h2>
              <p className="text-lg text-gray-700 mb-6">
                Si necesitas que un abogado revise tu contrato, redacte una respuesta formal o te ayude a negociar, en LegalUp.cl puedes hablar con un abogado verificado en minutos, sin citas presenciales ni trámites complicados.
              </p>
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
                  onClick={() => window.location.href = '/search?category=Derecho+Civil'}
                >
                  Ver Abogados Inmobiliarios
                </Button>
              </div>
            </section>
          </div>
        </div>

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
