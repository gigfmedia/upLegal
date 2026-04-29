import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, MessageSquare } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import InArticleCTA from "@/components/blog/InArticleCTA";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Cuántos años se pagan máximo?",
      answer: "Hasta 11 años."
    },
    {
      question: "¿Se paga si renuncio?",
      answer: "No."
    },
    {
      question: "¿Se puede negociar la indemnización?",
      answer: "Sí, en algunos casos."
    },
    {
      question: "¿El finiquito incluye esto?",
      answer: "Sí, es uno de sus componentes principales."
    },
    {
      question: "¿Puedo demandar si me pagan mal?",
      answer: "Sí, dentro de los plazos legales."
    }
  ];

  const keywords = [
    "años de servicio chile",
    "indemnizacion años de servicio chile",
    "cuanto me corresponde finiquito",
    "calculo indemnizacion chile",
    "despido necesidades empresa chile",
    "finiquito chile"
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="¿Cuánto me corresponde por años de servicio en Chile? (Cálculo de indemnización 2026)"
        description="Aprende cuánto te corresponde por años de servicio en Chile. Guía 2026 sobre cálculo de indemnización, topes legales, ejemplos y qué hacer si no te pagan."
        image="/assets/anos-de-servicio-chile-2026.png"
        url="https://legalup.cl/blog/cuanto-me-corresponde-anos-de-servicio-chile-2026"
        datePublished="2026-03-30"
        dateModified="2026-03-30"
        faqs={faqs}
      />
      <Header onAuthClick={() => {}} />
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
          
          <h1 className="text-3xl sm:text-4xl font-bold font-serif text-green-600 mb-6">
            ¿Cuánto me corresponde por años de servicio en Chile? (Cálculo de indemnización 2026)
          </h1>
          
          <p className="text-xl max-w-3xl">
            Cuando una persona es despedida en Chile, una de las primeras dudas que surgen es cuánto dinero le corresponde recibir. Dentro del finiquito, uno de los conceptos más importantes es la indemnización por años de servicio.
          </p>
          
          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>30 de Marzo, 2026</span>
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
            title="¿Cuánto me corresponde por años de servicio en Chile? (Cálculo de indemnización 2026)" 
            url="https://legalup.cl/blog/cuanto-me-corresponde-anos-de-servicio-chile-2026" 
            showBorder={false}
          />
          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed">
              Este pago puede representar una suma significativa, pero no siempre aplica en todos los casos. Por eso es clave entender cuándo corresponde, cómo se calcula y qué factores influyen en el monto final.
            </p>
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 my-8">
              <h3 className="text-blue-900 font-bold mb-4">En esta guía aprenderás:</h3>
              <ul className="grid sm:grid-cols-1 gap-3 list-none p-0">
                {[
                  "Qué es la indemnización por años de servicio",
                  "Cuándo te corresponde",
                  "Cómo calcularla paso a paso",
                  "Ejemplos reales",
                  "Casos especiales",
                  "Qué hacer si no te pagan correctamente"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-blue-800 text-base">
                    <CheckCircle className="h-4 w-4 mt-1 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section 1 */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué es la indemnización por años de servicio?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              La indemnización por años de servicio es un pago que el empleador debe hacer al trabajador cuando es despedido en determinadas condiciones.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Este monto busca compensar el tiempo que trabajaste en la empresa.
            </p>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6 font-bold">
              <p className="text-gray-900 flex items-center gap-2 font-bold">
                Regla general: Se paga 1 sueldo por cada año trabajado, con un tope.
              </p>
            </div>
          </div>

          {/* Section 2 */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuándo corresponde este pago?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              No todos los despidos generan derecho a indemnización. Corresponde principalmente cuando:
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-6 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0">1</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 items-center gap-2">
                    Despido por necesidades de la empresa
                  </h3>
                  <p className="text-gray-600 mb-4 leading-relaxed">Es el caso más común. Ejemplo:</p>
                  <ul className="space-y-2 mb-4">
                    {[
                      "Reestructuración",
                      "Reducción de personal",
                      "Razones económicas"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-700">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-base font-normal">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0">2</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 items-center gap-2">
                    Despido injustificado
                  </h3>
                  <p className="text-gray-600 mb-4 leading-relaxed">Si el empleador te despide sin causa válida, puedes demandar y obtener indemnización.</p>
                  <p className="text-gray-600 mb-4 leading-relaxed">Si te despidieron y no sabes si la causa es válida, revisa esta guía:</p>
                  <div className="text-center py-4 border-t border-b border-gray-100">
                    <Link
                      to="/blog/me-pueden-despedir-sin-motivo-chile-2026"
                      className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
                    >
                      👉 ¿Me pueden despedir sin motivo en Chile? Guía 2026
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0">3</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 items-center gap-2">
                    Término anticipado de contrato indefinido
                  </h3>
                  <p className="text-gray-600 leading-relaxed font-normal">Cuando no hay una causa legal clara.</p>
                </div>
              </div>
            </div>
            
            <InArticleCTA 
              message="Si estás en esta situación, puedes hablar con un abogado ahora mismo." 
              category="Derecho Laboral"
            />
          </div>

          {/* Section 3 */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuándo NO corresponde?</h2>
            <p className="text-gray-600 mb-4">No hay indemnización si:</p>
            <ul className="space-y-2 mb-6">
              {[
                "Renuncias voluntariamente",
                "Contrato a plazo fijo termina",
                "Despido por causa justificada (ej: incumplimiento grave)"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="h-4 w-4 text-red-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cómo se calcula la indemnización por años de servicio??</h2>
            <p className="text-gray-600 mb-6">La fórmula base es:</p>
            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 mb-8 text-center text-xl font-bold text-indigo-900">
               1 sueldo mensual × años trabajados
            </div>
            <p className="text-gray-600 mb-8">Pero hay reglas importantes.</p>

            <div className="space-y-12">
              <section>
                <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <span className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm">1</span>
                  Tope de años
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">El máximo legal es:</p>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 font-bold text-amber-900 mb-2 text-center text-lg">
                  11 años
                </div>
                <p className="text-gray-500 italic text-sm">Aunque hayas trabajado más tiempo, solo se pagan 11.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <span className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm">2</span>
                  Qué sueldo se considera
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">Se usa la última remuneración mensual, incluyendo:</p>
                <ul className="space-y-2 mb-4">
                  {[
                    "Sueldo base",
                    "Gratificaciones",
                    "Bonos habituales"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-700">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <span className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm">3</span>
                  Ejemplo simple
                </h3>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <p className="text-gray-700 mb-4 font-medium">Supongamos:</p>
                  <ul className="space-y-1 mb-4 text-gray-600">
                    <li>Sueldo: $800.000</li>
                    <li>Antigüedad: 5 años</li>
                  </ul>
                  <p className="text-xl font-bold text-gray-900 mt-4">
                    Cálculo: $800.000 × 5 = $4.000.000
                  </p>
                  <p className="text-green-700 font-bold mt-2">Eso sería la indemnización.</p>
                </div>
              </section>
            </div>
          </div>

          {/* Examples Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Ejemplos reales</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="font-bold mb-2">Caso 1</h4>
                <p className="text-sm text-gray-600">Sueldo: $500.000</p>
                <p className="text-sm text-gray-600">Años: 3</p>
                <p className="font-bold text-blue-900 mt-2">Resultado: $1.500.000</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="font-bold mb-2">Caso 2</h4>
                <p className="text-sm text-gray-600">Sueldo: $1.000.000</p>
                <p className="text-sm text-gray-600">Años: 12</p>
                <p className="text-xs text-gray-500 italic mb-1">Aplicando tope de 11 años</p>
                <p className="font-bold text-blue-900 mt-1">Resultado: $11.000.000</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="font-bold mb-2">Caso 3</h4>
                <p className="text-sm text-gray-600">Sueldo: $750.000</p>
                <p className="text-sm text-gray-600">Años: 7</p>
                <p className="font-bold text-blue-900 mt-2">Resultado: $5.250.000</p>
              </div>
            </div>

            <InArticleCTA 
              message="Cada caso es distinto — un abogado puede decirte exactamente qué hacer." 
              category="Derecho Laboral"
            />
          </div>

          {/* Additional Info */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa con meses adicionales?</h2>
            <p className="text-gray-600 mb-4">Si trabajaste años incompletos:</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <span className="text-gray-700 font-bold">Más de 6 meses → Cuenta como año completo</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                <span className="text-gray-700 font-bold">Menos de 6 meses → No se considera</span>
              </li>
            </ul>
          </div>

          {/* Other indemnities */}
          <div className="grid gap-6 sm:grid-cols-2 mb-12">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h2 className="text-xl font-bold mb-4">Indemnización sustitutiva de aviso previo</h2>
              <p className="text-gray-600 mb-4">Si el empleador no te avisó con 30 días de anticipación, debe pagarte:</p>
              <p className="text-lg font-bold text-indigo-900">1 sueldo adicional</p>
              <p className="text-sm text-gray-500 mt-2 italic">Esto se suma a los años de servicio.</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h2 className="text-xl font-bold mb-4">Recargo por despido injustificado</h2>
              <p className="text-gray-600 mb-4">Si demandas y ganas, el juez puede aumentar la indemnización:</p>
              <ul className="text-indigo-900 font-bold space-y-1">
                <li>• 30%</li>
                <li>• 50%</li>
                <li>• 80%</li>
                <li>• Hasta 100%</li>
              </ul>
              <p className="text-sm text-gray-500 mt-2 italic">Depende del caso.</p>
            </div>
          </div>

          {/* Links and Errors */}
          <div className="mb-12">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-8">
              <p className="text-gray-900 font-bold mb-4 text-lg">Además de los años de servicio, se pagan:</p>
              <ul className="grid sm:grid-cols-2 gap-3">
                {[
                  "Vacaciones proporcionales",
                  "Días trabajados del mes",
                  "Bonos pendientes"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-base">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <p className="text-gray-600 mb-4 leading-relaxed">Para calcular el monto total que te corresponde recibir, revisa esta guía:</p>
            <div className="text-center py-4 border-t border-b border-gray-100">
              <Link
                to="/blog/como-calcular-tu-finiquito-chile-2026"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
              >
                👉 ¿Cómo calcular tu finiquito? Guía 2026 paso a paso
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12 bg-red-50 p-8 rounded-xl border border-red-100">
            <h2 className="text-2xl font-bold mb-6 text-red-900">Errores comunes en el cálculo</h2>
            <ul className="space-y-3">
              {[
                "No incluir bonos",
                "Calcular con sueldo incorrecto",
                "No aplicar tope legal",
                "No considerar recargos"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-red-800 font-bold">
                  <div className="h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">X</div>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* What to do */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué hacer si no te pagan lo correcto?</h2>
            <p className="text-gray-600 mb-6">Si crees que el cálculo es incorrecto:</p>
            <div className="space-y-6">
              {[
                { step: "1", title: "No firmar el finiquito de inmediato", desc: "Puedes firmar con reserva de derechos." },
                { step: "2", title: "Revisar el cálculo", desc: "Idealmente con un abogado." },
                { step: "3", title: "Demandar si corresponde", desc: "Puedes reclamar diferencias en tribunales laborales." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-4 border rounded-xl bg-white shadow-sm">
                  <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
                    <p className="text-gray-700 text-base leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12 bg-blue-50 p-8 rounded-xl border border-blue-100">
            <h2 className="text-2xl font-bold mb-6 text-blue-900">¿Qué pasa si firmo el finiquito?</h2>
            <p className="text-gray-700 mb-4">Si firmas sin observaciones:</p>
            <ul className="space-y-4">
              <li className="flex items-start gap-2 font-bold text-blue-900">
                <CheckCircle className="h-5 w-5 mt-1" />
                <span>Se entiende que aceptas el monto</span>
              </li>
              <li className="flex items-start gap-2 font-bold text-blue-900">
                <CheckCircle className="h-5 w-5 mt-1" />
                <span>Luego es más difícil reclamar</span>
              </li>
            </ul>
            <p className="text-blue-800 mt-6 font-medium font-serif italic">Por eso es clave revisar antes.</p>
          </div>

          {/* Special Cases */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Casos especiales</h2>
            <div className="space-y-8">
              <section>
                <h3 className="text-xl font-bold mb-2">Contratos a plazo fijo</h3>
                <p className="text-gray-600">Generalmente no hay indemnización, salvo incumplimiento del empleador.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold mb-2">Trabajadores con menos de 1 año</h3>
                <p className="text-gray-600">No tienen derecho a años de servicio, pero sí otros pagos.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold mb-2">Despido por causal grave</h3>
                <p className="text-gray-600">No hay indemnización si el despido está justificado legalmente.</p>
              </section>
            </div>
          </div>

          {/* Conclusion */}
          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <div className="prose prose-lg text-gray-600 space-y-4">
              <p>
                La indemnización por años de servicio es uno de los derechos más importantes para los trabajadores en Chile. Saber cómo se calcula y cuándo corresponde puede marcar una gran diferencia económica al momento de terminar una relación laboral.
              </p>
              <p>
                Si estás enfrentando un despido, es clave revisar bien tu finiquito y entender exactamente qué te corresponde antes de firmar cualquier documento.
              </p>
            </div>
          </div>

          {/* FAQ (SEO structured) */}
          <div className="mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Preguntas frecuentes</h2>
            
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

        {/* CTA Section */}
        <section className="bg-white rounded-xl shadow-sm p-8 text-center mt-8 border">
          <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">¿Te despidieron y no sabes cuánto te corresponde?</h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
            Protege tus derechos laborales. Habla con un abogado laboral y revisa tu finiquito antes de firmar para asegurarte de que recibes lo que te corresponde.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/search?category=Derecho+Laboral">
              <Button 
                size="lg" 
                onClick={() => {
                  window.gtag?.('event', 'click_consultar_abogado', {
                    article: window.location.pathname,
                    location: 'blog_cta_anios_servicio_primary',
                  });
                }}
                className="bg-gray-900 hover:bg-green-900 text-white px-8 py-3 w-full sm:w-auto shadow-md"
              >
                Hablar con abogado ahora
              </Button>
            </Link>
            
          </div>
        </section>

      </div>

      <RelatedLawyers category="Derecho Laboral" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Compartir - Growth Hack */}
        <div className="mt-8">
          <BlogShare 
            title="¿Cuánto me corresponde por años de servicio en Chile? (Cálculo de indemnización 2026)" 
            url="https://legalup.cl/blog/cuanto-me-corresponde-anos-de-servicio-chile-2026" 
          />
        </div>

        <BlogNavigation 
          prevArticle={{
            id: "que-pasa-si-no-tengo-contrato-de-arriendo-chile-2026",
            title: "¿Qué pasa si no tengo contrato de arriendo en Chile? (Guía legal 2026)",
            excerpt: "Arrendar sin contrato escrito es mucho más común de lo que parece en Chile. Descubre tus derechos y qué hacer en esta Guía 2026.",
            image: "/assets/sin-contrato-arriendo-2026.png"
          }}
          nextArticle={{
            id: "despido-injustificado-chile-2026",
            title: "Despido injustificado en Chile: qué hacer, cómo demandar y cuánto puedes ganar (Guía 2026)",
            excerpt: "Si te despidieron sin causa válida, tienes derecho a indemnización y hasta un 100% de recargo adicional. Guía 2026 con plazos, pasos y ejemplo de cálculo real.",
            image: "/assets/despido-injustificado-chile-2026.png"
          }}
        />

        <div className="mt-4 text-center">
          <Link 
            to="/blog" 
            className="inline-flex items-center gap-2 text-green-900 hover:text-green-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Blog
          </Link>
        </div>
      </div>
      
      <BlogConversionPopup category="Derecho Laboral" topic="finiquito" />
    </div>
  );
};

export default BlogArticle;
