import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, Info, Shield, MessageSquare, AlertCircle } from "lucide-react";
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
      question: "¿El empleador puede despedir sin aviso?",
      answer: "Sí, pero debe pagar una indemnización sustitutiva."
    },
    {
      question: "¿Puedo negarme a firmar el finiquito?",
      answer: "Sí. Puedes firmar con reserva de derechos si no estás de acuerdo."
    },
    {
      question: "¿Qué pasa si no me pagan el finiquito?",
      answer: "Puedes reclamar y exigir el pago."
    },
    {
      question: "¿Puedo demandar después de firmar?",
      answer: "Depende de cómo firmaste el finiquito."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="¿Me pueden despedir sin motivo en Chile? (Guía 2026: derechos y qué hacer)"
        description="Descubre si es legal que te despidan sin motivo en Chile 2026. Conoce las causales de despido, tus derechos, indemnizaciones y qué hacer si crees que fue injustificado."
        image="/assets/ley-devuelveme-mi-casa-2026.png"
        url="https://legalup.cl/blog/me-pueden-despedir-sin-motivo-chile-2026"
        datePublished="2026-03-23"
        dateModified="2026-03-23"
        faqs={faqs}
      />
      <Header onAuthClick={() => {}} />
      <ReadingProgressBar />

      {/* Hero Section */}
      <div className="bg-green-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
            <ChevronRight className="h-4 w-4" />
            <span>Artículo</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-600 text-balance">
            ¿Me pueden despedir sin motivo en Chile? (Guía 2026: derechos y qué hacer)
          </h1>

          <p className="text-xl max-w-3xl leading-relaxed">
            Ser despedido genera muchas dudas, especialmente cuando no hay una explicación clara. Una de las preguntas más frecuentes es: ¿Me pueden despedir sin motivo en Chile?
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>23 de Marzo, 2026</span>
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
            title="¿Me pueden despedir sin motivo en Chile? (Guía 2026: derechos y qué hacer)"
            url="https://legalup.cl/blog/me-pueden-despedir-sin-motivo-chile-2026"
            showBorder={false}
          />

          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed mb-4">
              La respuesta no es tan simple. En Chile, el empleador puede poner término al contrato, pero debe cumplir ciertas condiciones legales.
            </p>
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 mb-8">
              <p className="font-semibold text-blue-900 mb-3">En esta guía explicamos:</p>
              <ul className="space-y-2">
                {[
                  "Cuándo un despido es legal",
                  "Qué causales existen en Chile",
                  "Qué pasa si te despiden sin justificación",
                  "Qué hacer si crees que tu despido fue injustificado"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-blue-800">
                    <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <span className="text-base">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Me pueden despedir sin motivo en Chile?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              En Chile, el empleador no puede despedir sin invocar una causal legal. Esto significa que todo despido debe basarse en una razón contemplada en el Código del Trabajo.
            </p>
            <div className="bg-indigo-50 border-l-4 border-indigo-600 p-5 rounded-r-lg mb-6">
              <p className="text-indigo-900 leading-relaxed">
                <strong>El empleador puede despedir invocando “necesidades de la empresa”</strong>. Esta causal permite terminar el contrato sin que el trabajador haya cometido una falta.
              </p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Causales de despido en Chile</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Las principales causales se dividen en tres grupos:</p>
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-6 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0">1</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-4 text-gray-900 items-center gap-2">
                    Necesidades de la empresa
                  </h3>
                  <p className="text-gray-600 mb-4 leading-relaxed font-normal">Es la más utilizada. Puede aplicarse cuando:</p>
                  <ul className="space-y-2 mb-4">
                    {["Hay cambios en la empresa", "Disminuyen las ventas", "Existe reorganización", "Se eliminan cargos"].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-base font-normal">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-gray-600 font-bold mb-4">En estos casos, el trabajador tiene derecho a indemnización.</p>
                  <p className="text-gray-600 mb-4 leading-relaxed font-normal">Calcula cuánto dinero te corresponde por tus años trabajados:</p>
                  <div className="text-center py-4 border-t border-b border-gray-100">
                    <Link
                      to="/blog/cuanto-me-corresponde-anos-de-servicio-chile-2026"
                      className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
                    >
                      👉 ¿Cuánto me corresponde por años de servicio? Guía 2026
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0">2</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-4 text-gray-900 items-center gap-2">
                    Despido por conducta del trabajador
                  </h3>
                  <p className="text-gray-600 mb-4 leading-relaxed font-normal">Incluye situaciones como:</p>
                  <ul className="space-y-2 mb-4">
                    {["Incumplimiento grave del contrato", "Faltas reiteradas", "Conductas indebidas"].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-base font-normal">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-gray-600 font-bold">En estos casos, generalmente no hay indemnización.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0">3</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-4 text-gray-900 items-center gap-2">
                    Otras causales legales
                  </h3>
                  <p className="text-gray-600 mb-4 leading-relaxed font-normal">También existen otras causales como:</p>
                  <ul className="space-y-2">
                    {["Vencimiento del contrato", "Renuncia del trabajador", "Mutuo acuerdo"].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-base font-normal">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            
            <InArticleCTA 
              message="Si estás en esta situación, puedes hablar con un abogado ahora mismo." 
              category="Derecho Laboral"
            />
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si me despiden sin justificación?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Si el empleador no puede probar la causal invocada, el despido puede considerarse injustificado. Esto significa que el trabajador puede:</p>
            <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Reclamar judicialmente",
                "Exigir indemnización adicional",
                "Solicitar el pago de prestaciones pendientes"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <Info className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué es un despido injustificado?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">Un despido es injustificado cuando:</p>
            <div className="space-y-3 mb-6">
              {[
                "No existe una causa real",
                "La causal invocada no se puede probar",
                "El empleador no cumple el procedimiento legal"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 leading-relaxed font-bold">En estos casos, el trabajador puede demandar.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué indemnización corresponde?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">Si el despido es por necesidades de la empresa, el trabajador tiene derecho a:</p>
            <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {[
                "Indemnización por años de servicio",
                "Indemnización sustitutiva de aviso previo",
                "Pago de vacaciones pendientes"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 leading-relaxed">Si el despido es injustificado, se puede obtener un recargo adicional sobre la indemnización.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué hacer si te despiden?</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">Si te despiden, es importante actuar rápidamente.</p>
            <div className="space-y-6">
              <div className="p-5 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gray-900 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0 font-normal">1</div>
                  <span className="font-bold text-gray-900 text-lg">Revisar la carta de despido</span>
                </div>
                <p className="text-base text-gray-600 mb-3">El empleador debe entregar una carta que indique:</p>
                <ul className="space-y-2">
                  {["La causal de despido", "Los hechos que la justifican", "La fecha de término del contrato"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gray-900 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0 font-normal">2</div>
                  <span className="font-bold text-gray-900 text-lg">Evaluar si el despido es legal</span>
                </div>
                <p className="text-base text-gray-600 mb-3">Es importante analizar:</p>
                <ul className="space-y-2">
                  {["Si la causal es correcta", "Si existen pruebas", "Si se respetó el procedimiento"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gray-900 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0 font-normal">3</div>
                  <span className="font-bold text-gray-900 text-lg">Guardar documentos</span>
                </div>
                <p className="text-base text-gray-600 mb-3">Reúne:</p>
                <ul className="space-y-2">
                  {["Contrato de trabajo", "Liquidaciones de sueldo", "Carta de despido"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gray-900 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0 font-normal">4</div>
                  <span className="font-bold text-gray-900 text-lg">Buscar asesoría legal</span>
                </div>
                <p className="text-base text-gray-600 mb-3">Un abogado puede ayudarte a:</p>
                <ul className="space-y-2">
                  {["Evaluar el caso", "Calcular indemnizaciones", "Iniciar acciones legales"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Plazo para demandar despido injustificado</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <p className="text-amber-900 leading-relaxed">
                El trabajador tiene un plazo de: <strong>60 días hábiles</strong> para presentar una demanda desde la fecha del despido.
              </p>
            </div>

            <InArticleCTA 
              message="Cada caso es distinto — un abogado puede decirte exactamente qué hacer." 
              category="Derecho Laboral"
            />
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Relación con el finiquito</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Después del despido, el empleador debe pagar el finiquito. Si quieres saber cómo calcularlo, revisa nuestra guía completa.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">¿Quieres saber si tu finiquito está bien calculado?</p>
            <div className="text-center py-4 border-t border-b border-gray-100">
              <Link
                to="/blog/como-calcular-tu-finiquito-chile-2026"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
              >
                👉 ¿Cómo calcular tu finiquito en Chile? Guía 2026 paso a paso
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* FAQ */}
          <div className="mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">Preguntas frecuentes</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-700">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Conclusion */}
          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              En Chile, un trabajador no puede ser despedido sin una causal legal. Sin embargo, existen mecanismos como las necesidades de la empresa que permiten al empleador poner término al contrato.
            </p>
            <p className="text-gray-600 font-bold leading-relaxed">
              Si el despido no está justificado, el trabajador puede ejercer acciones legales y exigir compensaciones.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <section className="bg-white rounded-xl shadow-sm p-8 text-center mt-8 border">
          <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">Consulta con un abogado</h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
            Si crees que tu despido fue injustificado, puedes recibir orientación legal. En LegalUp puedes encontrar abogados que analicen tu caso y te orienten.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/consulta">
              <Button
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_consultar_abogado', {
                    article: window.location.pathname,
                    location: 'blog_cta_despido_primary',
                  });
                }}
                className="bg-gray-900 hover:bg-green-900 text-white px-8 py-3 w-full sm:w-auto shadow-md"
              >
                Consultar con Abogado Ahora
              </Button>
            </Link>
            <Link to="/search?category=Derecho+Laboral">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_ver_abogados', {
                    article: window.location.pathname,
                    location: 'blog_cta_despido_secondary',
                  });
                }}
                className="border-green-900 text-green-900 hover:bg-green-900 hover:text-white px-8 py-3 w-full sm:w-auto"
              >
                Ver Abogados Laborales
              </Button>
            </Link>
          </div>
        </section>
      </div>

      <RelatedLawyers category="Derecho Laboral" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare
            title="¿Me pueden despedir sin motivo en Chile? (Guía 2026: derechos y qué hacer)"
            url="https://legalup.cl/blog/me-pueden-despedir-sin-motivo-chile-2026"
          />
        </div>

        <BlogNavigation
          prevArticle={{
            id: "orden-desalojo-chile-2026",
            title: "Orden de desalojo en Chile: qué es, cuándo ocurre y cómo funciona (Guía 2026)",
            excerpt: "¿Qué es una orden de desalojo en Chile? Descubre cuándo se dicta, qué ocurre después y qué hacer si recibes una.",
            image: "/assets/orden-desalojo-chile-2026.png"
          }}
          nextArticle={{
            id: "ley-devuelveme-mi-casa-chile-2026",
            title: 'Ley "Devuélveme Mi Casa" en Chile (Ley 21.461): Qué es y cómo recuperar tu propiedad en 2026',
            excerpt: "Guía 2026 sobre la Ley 21.461: procedimiento monitorio, desalojo, plazos y pasos para recuperar tu propiedad arrendada.",
            image: "/assets/ley-devuelveme-mi-casa-2026.png"
          }}
        />

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
      
      <BlogConversionPopup category="Derecho Laboral" topic="despido" />
    </div>
  );
};

export default BlogArticle;
