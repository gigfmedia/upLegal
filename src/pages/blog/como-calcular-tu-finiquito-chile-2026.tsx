import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import Header from "@/components/Header";

const BlogArticle = () => {
  useEffect(() => {
    // Set SEO meta tags
    document.title = "¿Cómo calcular tu finiquito en Chile? Guía 2026 paso a paso | LegalUp";
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Guía completa 2026 para calcular tu finiquito en Chile. Aprende paso a paso cómo calcular indemnizaciones, vacaciones y todos los componentes de tu finiquito. Calculadora incluida.');
    }

    // Update canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', 'https://legalup.cl/blog/como-calcular-tu-finiquito-chile-2026');

    // Add structured data (JSON-LD)
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "¿Cómo calcular tu finiquito en Chile? Guía 2026 paso a paso",
      "description": "Guía completa 2026 para calcular tu finiquito en Chile. Aprende paso a paso cómo calcular indemnizaciones, vacaciones y todos los componentes de tu finiquito.",
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
      "datePublished": "2026-02-18",
      "dateModified": "2026-02-18",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://legalup.cl/blog/como-calcular-tu-finiquito-chile-2026"
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
            ¿Cómo calcular tu finiquito en Chile? Guía 2026 paso a paso
          </h1>
          
          <p className="text-xl text-blue-100 max-w-3xl">
            Calcular el finiquito en Chile puede generar dudas, especialmente porque intervienen distintos tipos de indemnizaciones, feriados pendientes y pagos proporcionales.
          </p>
          
          <div className="flex flex-wrap items-center gap-4 text-blue-100 mt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>18 de Febrero, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Tiempo de lectura: 12 min</span>
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
                En esta Guía 2026, te explicamos cómo calcular tu finiquito, qué montos lo componen y qué debes revisar antes de firmarlo. El finiquito es un documento legal que certifica el término de la relación laboral entre el trabajador y la empresa.
              </p>
            </div>

            {/* What is Finiquito */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">¿Qué es el finiquito?</h2>
              <p className="text-gray-600 mb-4">
                El finiquito es un documento legal que certifica el término de la relación laboral entre el trabajador y la empresa. Incluye:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <span>Pagos pendientes</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <span>Indemnizaciones legales</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <span>Beneficios proporcionales</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <span>Acuerdos entre las partes</span>
                </li>
              </ul>
              <p className="text-sm text-gray-500 mt-4">
                Desde 2021 puede firmarse también de forma electrónica.
              </p>
            </div>

            {/* Elements Included */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6">Elementos que se incluyen en un finiquito (2026)</h2>
              <p className="text-gray-600 mb-6">
                A continuación, los ítems más comunes incluidos en un finiquito en Chile:
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Remuneraciones pendientes</h3>
                    <ul className="space-y-2 text-gray-600">
                      <li>• Sueldo del último mes trabajado (proporcional si corresponde)</li>
                      <li>• Comisiones, bonos o horas extra devengadas</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Indemnización sustitutiva del aviso previo</h3>
                    <p className="text-gray-600">
                      Corresponde a 1 mes de sueldo si el empleador puso término al contrato sin aviso previo.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Indemnización por años de servicio (IAS)</h3>
                    <ul className="space-y-2 text-gray-600">
                      <li>• 1 mes de sueldo por cada año trabajado</li>
                      <li>• Tope: 11 años</li>
                      <li>• Sueldo base para el cálculo: promedio de los últimos 3 meses</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Feriado proporcional y vacaciones pendientes</h3>
                    <p className="text-gray-600 mb-2">La empresa debe pagar:</p>
                    <ul className="space-y-2 text-gray-600">
                      <li>• Días de vacaciones acumuladas no tomadas</li>
                      <li>• Feriado proporcional por el año en curso</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">
                    5
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Indemnización especial por necesidades de la empresa</h3>
                    <p className="text-gray-600">
                      Aplicable cuando el despido es por necesidades de la empresa (artículo 161) con la antigüedad suficiente.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">
                    6
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Cotizaciones impagas</h3>
                    <p className="text-gray-600">
                      El empleador debe pagarlas antes del finiquito.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step by Step Calculation */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6">Cómo calcular tu finiquito en 2026 (paso a paso)</h2>
              <p className="text-gray-600 mb-6">
                A continuación, una guía simplificada para que puedas estimarlo por tu cuenta.
              </p>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">1. Calcula tu sueldo base diario</h3>
                  <p className="text-gray-600 font-mono">Sueldo mensual / 30</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">2. Calcula vacaciones pendientes</h3>
                  <p className="text-gray-600 font-mono">Días de vacaciones pendientes × Sueldo diario</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">3. Calcula feriado proporcional</h3>
                  <p className="text-gray-600 mb-2">Se calcula desde el día 1 del año hasta la fecha de término:</p>
                  <p className="text-gray-600 font-mono">(Días trabajados / 365) × 15 días hábiles</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">4. Indemnización por años de servicio</h3>
                  <p className="text-gray-600 font-mono">Años trabajados × Sueldo base (promedio últimos 3 meses)</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">5. Indemnización sustitutiva del aviso previo</h3>
                  <p className="text-gray-600 mb-2">Si corresponde:</p>
                  <p className="text-gray-600 font-mono">1 × Sueldo base</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">6. Suma bonos, horas extra y otros pagos pendientes</h3>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">7. Aplica descuentos legales</h3>
                  <ul className="text-gray-600 space-y-1">
                    <li>• AFP</li>
                    <li>• Salud</li>
                    <li>• Seguro de cesantía (si corresponde)</li>
                    <li>• Préstamos internos con la empresa</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Practical Example */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6">Ejemplo práctico (2026)</h2>
              <p className="text-gray-600 mb-4">
                Trabajador con:
              </p>
              <ul className="space-y-2 text-gray-600 mb-6">
                <li>• Sueldo promedio de los últimos 3 meses: $900.000</li>
                <li>• 5 años trabajados</li>
                <li>• 8 días de vacaciones pendientes</li>
                <li>• Despido sin aviso previo</li>
              </ul>

              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold mb-4">Cálculo:</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">IAS:</span>
                    <span className="font-semibold">5 × $900.000 = $4.500.000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Aviso previo:</span>
                    <span className="font-semibold">$900.000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vacaciones pendientes:</span>
                    <span className="font-semibold">8 × ($900.000/30) = $240.000</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-semibold">Total estimado:</span>
                    <span className="font-bold text-lg">$5.640.000 (antes de descuentos)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* What to Review */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6">¿Qué revisar antes de firmar el finiquito?</h2>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <span>Montos correctos de sueldo y feriado</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <span>Años de servicio correctamente contabilizados</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <span>Causal de despido</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <span>Bonos o comisiones pendientes</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <span>Cotizaciones previsionales pagadas</span>
                </li>
              </ul>
              <p className="text-gray-600 mt-4">
                Si algo no coincide, puedes no firmar y solicitar corrección.
              </p>
            </div>

            {/* When Does Company Pay */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">¿Cuándo paga la empresa el finiquito?</h2>
              <p className="text-gray-600 mb-4">
                Generalmente se paga dentro de 10 días hábiles desde la separación.
              </p>
              <p className="text-gray-600">
                Puede firmarse en notaría o de forma electrónica a través de la Dirección del Trabajo.
              </p>
            </div>

            {/* Is it Mandatory */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">¿Es obligatorio firmar el finiquito?</h2>
              <p className="text-gray-600 mb-4">
                No. Solo debes firmarlo cuando estés seguro de que los montos son correctos. Si no estás de acuerdo, puedes:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <span>Solicitar correcciones</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <span>Asesorarte con un abogado laboral</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <span>Guardar respaldos: liquidaciones, contrato, correos, etc.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* CTA Section */}
            <section className="bg-white rounded-xl shadow-sm p-8 text-center mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">¿Necesitas ayuda con tu finiquito?</h2>
              <p className="text-lg text-gray-700 mb-6">
                Si tienes dudas sobre tu finiquito, necesitas que un abogado revise los cálculos, o quieres asegurarte de que tus derechos están siendo respetados, en LegalUp.cl puedes hablar con un abogado laboral verificado en minutos, sin citas presenciales ni trámites complicados.
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
                  onClick={() => window.location.href = '/search?category=Derecho+Laboral'}
                >
                  Ver Abogados Laborales
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
