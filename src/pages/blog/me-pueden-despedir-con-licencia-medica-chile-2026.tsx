import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, Info, Shield, AlertCircle } from "lucide-react";
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
      question: "¿Pueden despedirme mientras estoy con licencia médica en Chile?",
      answer: "En Chile no existe una prohibición absoluta de despedir durante licencia médica. Sin embargo, el empleador no puede hacer efectivo el término del contrato mientras dure la licencia — la fecha de término debe ser posterior. Si el despido se ejecuta durante la licencia o es por represalia, puede ser declarado injustificado."
    },
    {
      question: "¿Qué pasa con mi sueldo si me despiden con licencia médica?",
      answer: "Durante la licencia recibes un subsidio por incapacidad laboral pagado por tu ISAPRE o FONASA, no por el empleador. Si te despiden, ese subsidio se mantiene hasta que termine la licencia. Una vez terminada, termina el contrato y corren los plazos del finiquito e indemnizaciones."
    },
    {
      question: "¿Cuánto tiempo tengo para reclamar si me despidieron con licencia?",
      answer: "Tienes 60 días hábiles desde la fecha de término del contrato para presentar un reclamo en la Inspección del Trabajo o demandar en el Juzgado del Trabajo. Si vas primero a la Inspección, el plazo se extiende hasta 90 días hábiles desde el despido. No esperes — ese plazo se acaba rápido."
    },
    {
      question: "¿Debo firmar el finiquito si no estoy de acuerdo?",
      answer: "No estás obligado a firmar. Si crees que el despido fue injustificado o los montos no son correctos, puedes negarte a firmar o firmar con reserva de derechos — escribiendo esa frase antes de tu firma. Esto te permite aceptar el pago sin renunciar a reclamar la diferencia ante el tribunal."
    },
    {
      question: "¿El fuero maternal protege también durante la licencia médica?",
      answer: "Sí. Si eres trabajadora embarazada o estás dentro del período de fuero maternal, tienes protección especial independientemente de si estás con licencia. El empleador necesita autorización judicial previa para despedirte durante ese período. Esta protección es adicional a las reglas generales de la licencia médica."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="¿Pueden despedirme mientras estoy con licencia médica en Chile? Guía 2026"
        description="Descubre si es legal que te despidan durante una licencia médica en Chile. Conoce las causales permitidas, excepciones y qué hacer si el despido es injustificado."
        image="/assets/despido-licencia-medica-chile-2026.png"
        url="https://legalup.cl/blog/me-pueden-despedir-con-licencia-medica-chile-2026"
        datePublished="2026-05-08"
        dateModified="2026-05-08"
        faqs={faqs}
      />
      <Header onAuthClick={() => {}} />
      <ReadingProgressBar />

      {/* Hero Section */}
      <div className="bg-green-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
            <ChevronRight className="h-4 w-4" />
            <span>Artículo</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-600 leading-tight">
            ¿Pueden despedirme mientras estoy con licencia médica en Chile? Guía 2026
          </h1>

          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
              Resumen rápido
            </p>
            <ul className="space-y-2">
              {[
                "En Chile no existe una protección absoluta contra el despido durante licencia médica",
                "Sin embargo, despedir a un trabajador con licencia tiene restricciones importantes",
                "Si el despido fue por represalia o sin causal válida, puedes demandar",
                "Los plazos para actuar son cortos — 60 días hábiles desde el despido"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-base text-gray-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl leading-relaxed">
            Una de las dudas más frecuentes entre trabajadores chilenos es si el empleador puede despedirlos mientras están con licencia médica. La respuesta no es simple: depende de la causal y de las circunstancias.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6 text-base">
            <div className="flex items-center gap-2 text-gray-300">
              <Calendar className="h-4 w-4" />
              <span>8 de Mayo, 2026</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Clock className="h-4 w-4" />
              <span>Tiempo de lectura: 8 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
        <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare
            title="¿Pueden despedirme mientras estoy con licencia médica en Chile? Guía 2026"
            url="https://legalup.cl/blog/me-pueden-despedir-con-licencia-medica-chile-2026"
            showBorder={false}
          />

          <div className="prose max-w-none mb-12">
            <p className="text-base text-gray-600 leading-relaxed mb-6">
              Muchos trabajadores buscan si <strong>pueden despedirme con licencia médica en Chile</strong> — y la respuesta depende de cómo y cuándo se ejecutó ese despido. Esta guía te explica qué dice la ley, en qué casos el despido es ilegal, qué puedes hacer si ya te despidieron y cuánto tiempo tienes para actuar.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Existe protección legal durante la licencia médica en Chile?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              En Chile no existe una norma que prohíba de forma absoluta el despido durante una licencia médica. Sin embargo, la ley establece restricciones importantes que el empleador debe respetar.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              La protección depende principalmente de dos factores:
            </p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2 text-gray-700 text-base">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span><strong>La causal del despido</strong> — hay causales que no pueden invocarse válidamente durante una licencia</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700 text-base">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span><strong>El tipo de licencia</strong> — algunas licencias tienen protección especial, como la licencia por maternidad o enfermedad grave del hijo</span>
              </li>
            </ul>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué causales puede usar el empleador para despedirte con licencia?</h2>
            
            <h3 className="text-xl font-bold mb-4">Causales que generalmente sí puede usar</h3>
            <div className="space-y-6 mb-8">
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                <h4 className="font-bold text-gray-900 mb-2">Necesidades de la empresa (art. 161 del Código del Trabajo)</h4>
                <p className="text-gray-600 leading-relaxed">
                  El empleador puede invocar esta causal durante una licencia médica, pero con una condición crítica: no puede hacer efectivo el despido mientras dure la licencia. Puede notificarte el despido, pero la fecha de término del contrato debe ser posterior al fin de la licencia médica.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                <h4 className="font-bold text-gray-900 mb-2">Vencimiento del plazo del contrato</h4>
                <p className="text-gray-600 leading-relaxed">
                  Si tienes contrato a plazo fijo y este vence durante tu licencia, el contrato termina igualmente.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                <h4 className="font-bold text-gray-900 mb-2">Mutuo acuerdo</h4>
                <p className="text-gray-600 leading-relaxed">
                  Si ambas partes acuerdan terminar el contrato, puede hacerse en cualquier momento — incluso durante la licencia.
                </p>
              </div>
            </div>

            <h3 className="text-xl font-bold mb-4">Causales que NO puede usar durante la licencia</h3>
            <div className="bg-red-50 p-6 rounded-xl border border-red-100 mb-8">
              <h4 className="font-bold text-red-900 mb-2">Falta de probidad, conducta indebida u otras causales disciplinarias (art. 160)</h4>
              <p className="text-red-800 leading-relaxed">
                Aunque el empleador puede notificar el despido por estas causales, hay debate jurídico sobre si puede ejecutarlo durante una licencia activa. En la práctica, hacerlo aumenta el riesgo de que sea declarado injustificado.
              </p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">El punto clave: notificación vs. ejecución del despido</h2>
            <p className="mb-6 font-medium">Esta distinción es fundamental y muchos trabajadores no la conocen:</p>
            
            <div className="grid sm:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-5 rounded-2xl border">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  Notificar
                </h4>
                <p className="text-gray-700">
                  Significa comunicarte que serás despedido. Esto <strong>sí puede ocurrir</strong> durante la licencia.
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  Ejecutar
                </h4>
                <p className="text-gray-700">
                  Significa que el contrato efectivamente termina. Según la interpretación mayoritaria, el término del contrato <strong>no puede hacerse efectivo mientras dura la licencia</strong> — la fecha de término debe ser posterior.
                </p>
              </div>
            </div>
            
            <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-lg">
              <p className="text-amber-900 leading-relaxed font-medium">
                En términos prácticos: si recibes una carta de despido mientras estás con licencia, el contrato debería seguir vigente hasta que termines la licencia, y solo entonces comenzarían a correr los plazos del finiquito.
              </p>
            </div>
          </div>

          <InArticleCTA
            message="¿Te notificaron el despido mientras estás con licencia médica? Un abogado laboral puede revisar si el proceso fue correcto y qué opciones tienes."
            buttonText="Consultar sobre mi despido"
            category="Derecho Laboral"
          />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa con el sueldo durante la licencia médica?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Durante la licencia médica, el trabajador recibe un subsidio por incapacidad laboral pagado por la ISAPRE o FONASA, no por el empleador directamente.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed font-semibold">Si el empleador te despide mientras estás con licencia:</p>
            <ul className="space-y-3 mb-6">
              {[
                "El subsidio médico se mantiene hasta que termine la licencia, independientemente del despido",
                "Una vez terminada la licencia, termina también el contrato y el subsidio",
                "A partir de ese momento corren los plazos del finiquito y las indemnizaciones"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-700 text-base">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuándo el despido durante licencia es ilegal?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Hay situaciones donde el despido durante licencia tiene mayor probabilidad de ser declarado injustificado o nulo:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <div className="p-5 bg-gray-50 border border-gray-100 rounded-xl">
                <h4 className="font-bold text-gray-900 mb-2">Despido por represalia</h4>
                <p className="text-gray-600">Si el empleador te despide poco después de presentar una licencia, puede interpretarse como represalia (despido discriminatorio).</p>
              </div>
              <div className="p-5 bg-gray-50 border border-gray-100 rounded-xl">
                <h4 className="font-bold text-gray-900 mb-2">Fuero maternal</h4>
                <p className="text-gray-600">Trabajadoras embarazadas o en período de maternidad tienen protección especial. Despedirlas sin autorización judicial es ilegal.</p>
              </div>
              <div className="p-5 bg-gray-50 border border-gray-100 rounded-xl">
                <h4 className="font-bold text-gray-900 mb-2">Enfermedad grave del hijo</h4>
                <p className="text-gray-600">Existen protecciones especiales legales para este tipo de licencias.</p>
              </div>
              <div className="p-5 bg-gray-50 border border-gray-100 rounded-xl">
                <h4 className="font-bold text-gray-900 mb-2">No respetar la fecha</h4>
                <p className="text-gray-600">Si el empleador hace efectivo el término del contrato durante la licencia (sin esperar a que termine), puede ser impugnado.</p>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué debes hacer si te despidieron con licencia?</h2>
            <div className="space-y-4">
              {[
                { title: "Paso 1 — Revisa la carta de despido", desc: "Verifica la causal invocada, la fecha de notificación y la fecha de término del contrato. Si la fecha de término cae dentro del período de licencia, eso es una señal de alerta." },
                { title: "Paso 2 — Guarda toda la documentación", desc: "Carta de despido, licencias médicas, comprobantes de pago, comunicaciones con el empleador. Todo sirve como prueba." },
                { 
                  title: "Paso 3 — No firmes el finiquito sin revisarlo", 
                  desc: "Si no estás de acuerdo con los montos o crees que el despido fue injustificado, firma con reserva de derechos o no firmes hasta consultar con un abogado.",
                  link: { to: "/blog/reserva-de-derechos-finiquito-chile-2026", text: "👉 Cómo firmar con reserva de derechos" }
                },
                { title: "Paso 4 — Actúa dentro del plazo", desc: "Tienes 60 días hábiles desde la fecha de término del contrato para presentar un reclamo en la Inspección del Trabajo o demandar directamente." },
                { title: "Paso 5 — Consulta con un abogado laboral", desc: "La licencia médica agrega una capa de complejidad al caso. Un abogado puede evaluar si el proceso fue correcto y si tienes base para demandar." }
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-full">
                    <span className="font-bold text-gray-900">{step.title}</span>
                    <p className="text-base text-gray-600 mt-1">{step.desc}</p>
                    {step.link && (
                      <div className="mt-3">
                        <Link
                          to={step.link.to}
                          className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:underline text-sm"
                        >
                          {step.link.text}
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <InArticleCTA
            message="¿Te despidieron con licencia médica y no sabes si fue legal? Un abogado laboral puede revisar tu caso hoy."
            buttonText="Revisar mi despido con un abogado"
            category="Derecho Laboral"
          />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuánto puedes recibir si el despido fue injustificado?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si el tribunal declara el despido injustificado, tienes derecho a:
            </p>
            <ul className="space-y-3 mb-6">
              {[
                "Indemnización por años de servicio — un mes de remuneración por año trabajado",
                "Indemnización sustitutiva del aviso previo — si no avisaron con 30 días de anticipación",
                "Recargo sobre la indemnización — entre 30% y 100% según la causal invocada",
                "Pagos pendientes — cualquier remuneración, bono o beneficio adeudado"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-700 text-base">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-lg">
              <p className="text-amber-900 leading-relaxed font-medium">
                Si el despido se declara además discriminatorio o de represalia, pueden existir indemnizaciones adicionales importantes.
              </p>
            </div>
          </div>

          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link 
              to="/blog/como-calcular-tu-finiquito-chile-2026" 
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 ¿Cuánto te deben pagar en el finiquito? Calculadora 2026
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="py-6 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Artículos relacionados</p>
            <div className="flex flex-col gap-3">
              <Link
                to="/blog/me-pueden-despedir-sin-motivo-chile-2026"
                className="flex items-center gap-3 text-gray-800 font-semibold hover:text-green-700 bg-gray-50 hover:bg-green-50 border border-gray-100 px-5 py-4 rounded-xl transition-all"
              >
                <span>¿Me pueden despedir sin motivo en Chile? Guía 2026</span>
                <ChevronRight className="h-4 w-4 ml-auto flex-shrink-0" />
              </Link>
              <Link
                to="/blog/como-demandar-por-despido-injustificado-chile-2026"
                className="flex items-center gap-3 text-gray-800 font-semibold hover:text-green-700 bg-gray-50 hover:bg-green-50 border border-gray-100 px-5 py-4 rounded-xl transition-all"
              >
                <span>Cómo demandar por despido injustificado en Chile (paso a paso)</span>
                <ChevronRight className="h-4 w-4 ml-auto flex-shrink-0" />
              </Link>
              <Link
                to="/blog/cuanto-me-corresponde-anos-de-servicio-chile-2026"
                className="flex items-center gap-3 text-gray-800 font-semibold hover:text-green-700 bg-gray-50 hover:bg-green-50 border border-gray-100 px-5 py-4 rounded-xl transition-all"
              >
                <span>¿Cuánto me corresponde por años de servicio en Chile?</span>
                <ChevronRight className="h-4 w-4 ml-auto flex-shrink-0" />
              </Link>
            </div>
          </div>

          {/* Conclusion */}
          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              En Chile, el despido durante licencia médica no es automáticamente ilegal, pero tampoco es libre. El empleador enfrenta restricciones importantes sobre cuándo puede hacer efectivo el término del contrato, y algunos tipos de despido durante licencia tienen alta probabilidad de ser declarados injustificados.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Si te despidieron mientras estabas con licencia, lo más importante es no actuar por impulso. No firmes el finiquito sin leerlo, guarda toda la documentación y actúa dentro del plazo de 60 días hábiles.
            </p>
            <p className="text-gray-600 font-bold leading-relaxed">
              La diferencia entre un despido legal y uno injustificado puede ser de varios meses de indemnización más recargos. Esa diferencia justifica consultar con un abogado laboral antes de tomar cualquier decisión.
            </p>
          </div>

          {/* FAQ */}
          <div className="mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">Preguntas frecuentes</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-700">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <section className="bg-white sm:rounded-xl sm:shadow-sm p-8 text-center mt-8 border-t sm:border">
          <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">¿Te despidieron con licencia médica y no sabes si fue legal?</h2>
          <p className="text-base text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
            Un abogado laboral puede revisar tu situación y decirte qué opciones tienes hoy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/search?category=Derecho+Laboral">
              <Button
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_consultar_abogado', {
                    article: window.location.pathname,
                    location: 'blog_cta_licencia_primary',
                  });
                }}
                className="bg-gray-900 hover:bg-green-900 text-white px-8 py-3 w-full sm:w-auto shadow-md"
              >
                Consultar sobre mi caso
              </Button>
            </Link>
          </div>
        </section>
      </div>

      <RelatedLawyers category="Derecho Laboral" />

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare
            title="¿Pueden despedirme mientras estoy con licencia médica en Chile? Guía 2026"
            url="https://legalup.cl/blog/me-pueden-despedir-con-licencia-medica-chile-2026"
          />
        </div>

        <BlogNavigation currentArticleId="me-pueden-despedir-con-licencia-medica-chile-2026" />

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
      <BlogConversionPopup category="Derecho Laboral" topic="despido_injustificado" />
    </div>
  );
};

export default BlogArticle;
