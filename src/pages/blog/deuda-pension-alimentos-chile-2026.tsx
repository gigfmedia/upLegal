import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import InArticleCTA from "@/components/blog/InArticleCTA";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Cómo cobrar una deuda de pensión de alimentos en Chile?",
      answer:
        "Debes solicitar al tribunal de familia que dictó la pensión una liquidación de la deuda acumulada. Una vez liquidada, puedes pedir medidas de apremio contra el deudor: retención del sueldo, retención de devolución de impuestos, suspensión de licencia de conducir o arresto. El proceso se inicia presentando un escrito ante el mismo tribunal que fijó la pensión.",
    },
    {
      question: "¿Pueden arrestar a alguien por no pagar la pensión de alimentos?",
      answer:
        "Sí. El arresto es una de las medidas de apremio más efectivas en Chile para forzar el pago. El tribunal puede decretar arresto nocturno como primera medida y, si el incumplimiento persiste, arresto completo. Esta medida busca presionar el pago, no castigar — se levanta una vez que se paga la deuda.",
    },
    {
      question: "¿Se pueden embargar los bienes del deudor por pensión de alimentos?",
      answer:
        "Sí. Si el deudor no paga y no tiene ingresos retenibles, el tribunal puede ordenar el embargo de sus bienes — vehículos, cuentas bancarias, bienes muebles — y su posterior remate para pagar la deuda acumulada. Es una medida que requiere seguir el proceso judicial correspondiente.",
    },
    {
      question: "¿Qué pasa si el deudor no tiene trabajo formal o contrato?",
      answer:
        "La obligación de pagar pensión de alimentos existe independientemente de si la persona tiene trabajo formal o no. Si no hay sueldo que retener, el tribunal puede recurrir a otras medidas: embargo de bienes, retención de devoluciones de impuestos, suspensión de licencia de conducir o arresto. No tener contrato no elimina la deuda.",
    },
    {
      question: "¿Prescriben las deudas de pensión de alimentos en Chile?",
      answer:
        "Las deudas de pensión de alimentos tienen un tratamiento especial y no prescriben de la misma forma que otras deudas civiles. Sin embargo, actuar a tiempo siempre es recomendable para evitar que la deuda crezca y para mantener las medidas de apremio activas. Consulta con un abogado de familia para evaluar tu caso específico.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="Deuda de pensión de alimentos en Chile: cómo cobrarla paso a paso y qué medidas puedes exigir (Guía 2026)"
        description="Si no recibes la pensión de alimentos o existe deuda acumulada, existen herramientas legales efectivas. Aprende cómo cobrar la deuda paso a paso: liquidación, medidas de apremio, embargo y arresto."
        image="/assets/derecho-de-familia-chile-2026.png"
        url="https://legalup.cl/blog/deuda-pension-alimentos-chile-2026"
        datePublished="2026-04-28"
        dateModified="2026-04-28"
        faqs={faqs}
      />
      <Header onAuthClick={() => {}} />
      <ReadingProgressBar />

      {/* Hero */}
      <div className="bg-green-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
            <ChevronRight className="h-4 w-4" />
            <span>Artículo</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-green-600 font-serif mb-6">
            Deuda de pensión de alimentos en Chile: cómo cobrarla paso a paso y qué medidas puedes exigir (Guía 2026)
          </h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">Resumen rápido</p>
            <ul className="space-y-2">
              {[
                "Puedes cobrar la deuda solicitando una liquidación judicial",
                "El tribunal puede aplicar medidas como retención de sueldo, embargo y arresto",
                "La deuda no desaparece y puede acumularse con intereses",
                "Existen mecanismos legales efectivos para obligar el pago"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl max-w-3xl">
            Si no estás recibiendo la pensión de alimentos o existe deuda acumulada, no estás solo. Es una situación común en Chile, pero también una de las que tiene más herramientas legales para solucionarse.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>28 de Abril, 2026</span>
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
            title="Deuda de pensión de alimentos en Chile: cómo cobrarla paso a paso (Guía 2026)"
            url="https://legalup.cl/blog/deuda-pension-alimentos-chile-2026"
            showBorder={false}
          />

          {/* Intro */}
          <div className="prose prose-lg max-w-none mb-8">
            <p className="text-lg text-gray-600 leading-relaxed">
              <strong>La clave es actuar.</strong> En esta guía 2026 te explicamos cómo cobrar una deuda de pensión de alimentos paso a paso, qué medidas puedes exigir y cómo funciona realmente el proceso.
            </p>
          </div>

          {/* Qué se considera deuda */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">¿Qué se considera deuda de pensión de alimentos?</h2>
            <p className="text-gray-600 mb-4">Existe deuda cuando:</p>
            <ul className="space-y-2 bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm text-gray-600 mb-4">
              {["No se paga la pensión fijada por tribunal", "Se paga parcialmente", "Se incumple un acuerdo formal"].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl">
              <p className="font-bold text-amber-900">Importante</p>
              <p className="text-amber-800">La deuda se acumula mes a mes y puede aumentar con el tiempo.</p>
            </div>
          </div>

          {/* ¿Se puede cobrar? */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">¿La deuda de pensión se puede cobrar?</h2>
            <p className="text-gray-600 mb-4"><strong>Sí, y con fuerza.</strong> A diferencia de otras deudas, la pensión de alimentos tiene mecanismos especiales.</p>
            <p className="text-gray-600 mb-4">Puedes solicitar:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {[
                { item: "Cobro judicial", icon: "⚖️" },
                { item: "Retención de ingresos", icon: "💼" },
                { item: "Embargo de bienes", icon: "🏠" },
                { item: "Medidas de apremio", icon: "⚠️" },
              ].map((m, i) => (
                <div key={i} className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-xl">{m.icon}</span>
                  <span className="text-gray-700 font-medium">{m.item}</span>
                </div>
              ))}
            </div>
          </div>

          <InArticleCTA
            message="¿Tienes deuda de pensión de alimentos y no sabes cómo cobrarla? Un abogado especialista puede guiarte para activar liquidación, embargo y medidas de apremio de forma efectiva."
            buttonText="Habla con un abogado ahora"
            category="Derecho de Familia"
          />

          {/* Paso a paso */}
          <div className="mb-8 mt-8">
            <h2 className="text-2xl font-bold mb-6">Paso a paso: cómo cobrar deuda de pensión de alimentos</h2>

            <div className="space-y-4">
              {[
                {
                  title: "Solicitar liquidación de deuda",
                  desc: "Debes pedir al tribunal que calcule cuánto se debe. Esto incluye meses impagos, reajustes e intereses si corresponde.",
                  note: "👉 Este documento es clave: determina el monto oficial.",
                  color: "blue"
                },
                {
                  title: "Notificación al deudor",
                  desc: "El tribunal informa al deudor el monto adeudado y el plazo para pagar.",
                  note: "👉 Aquí aún puede pagar voluntariamente.",
                  color: "green"
                },
                {
                  title: "Solicitar medidas de apremio",
                  desc: "Si no paga, puedes pedir retención de sueldo, retención de devolución de impuestos, suspensión de licencia de conducir, prohibición de salir del país o arresto.",
                  note: "👉 Estas medidas buscan forzar el cumplimiento.",
                  color: "amber"
                },
                {
                  title: "Embargo de bienes",
                  desc: "Si persiste el incumplimiento, se pueden embargar bienes y rematar para pagar la deuda.",
                  note: null,
                  color: "orange"
                },
                {
                  title: "Cumplimiento o ejecución",
                  desc: "El proceso continúa hasta que se paga la deuda o se cumple la obligación.",
                  note: null,
                  color: "gray"
                },
              ].map((step, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex gap-4">
                  <div className="bg-gray-900 p-2 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{step.title}</h4>
                    <p className="text-gray-600 mb-2">{step.desc}</p>
                    {step.note && <p className="text-blue-700 text-sm font-medium">{step.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Medidas del tribunal */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">¿Qué medidas puede ordenar el tribunal?</h2>
            <p className="text-gray-600 mb-4">Las más comunes en Chile:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {[
                { item: "Retención de sueldo", desc: "El empleador descuenta directamente el monto.", icon: "💼" },
                { item: "Retención de impuestos", desc: "Se retiene la devolución de impuestos.", icon: "📄" },
                { item: "Embargo de bienes", desc: "Se afectan bienes del deudor.", icon: "🏠" },
                { item: "Arresto", desc: "En incumplimiento reiterado, el tribunal puede decretarlo.", icon: "⚠️" },
              ].map((m, i) => (
                <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{m.icon}</span>
                    <span className="font-bold text-gray-900">{m.item}</span>
                  </div>
                  <p className="text-gray-600 text-sm">{m.desc}</p>
                </div>
              ))}
            </div>
            <div className="bg-red-950 p-6 rounded-2xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 blur-2xl rounded-full -mr-16 -mt-16"></div>
              <p className="font-bold text-red-200 uppercase tracking-widest text-xs mb-2">Importante 2026</p>
              <p className="text-lg font-serif">👉 Sí, puede ocurrir arresto. En caso de incumplimiento reiterado, el tribunal puede decretar arresto.</p>
            </div>
          </div>

          {/* Preguntas frecuentes de situaciones */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Preguntas frecuentes sobre el proceso</h2>
            <div className="space-y-4">
              {[
                {
                  q: "¿Cuándo puedes solicitar estas medidas?",
                  a: "Cuando existe pensión fijada, existe deuda y hay incumplimiento. No necesitas esperar años."
                },
                {
                  q: "¿Cuánto demora cobrar la deuda?",
                  a: "La liquidación toma semanas. Las medidas de apremio entre 1 y 2 meses. El cobro completo es variable, pero en muchos casos las medidas generan pago rápido."
                },
                {
                  q: "¿La deuda prescribe?",
                  a: "No fácilmente. Las deudas de pensión tienen tratamiento especial y pueden mantenerse exigibles por largos periodos."
                },
                {
                  q: "¿Qué pasa si el deudor no tiene ingresos formales?",
                  a: "Aún puedes solicitar embargo, investigar bienes y pedir medidas de presión. No tener contrato no elimina la obligación."
                },
                {
                  q: "¿Qué pasa si paga parcialmente?",
                  a: "Se considera incumplimiento. Puedes cobrar la diferencia y solicitar medidas."
                },
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-2">{item.q}</h3>
                  <p className="text-gray-600">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Casos reales */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Casos reales</h2>
            <div className="space-y-4">
              {[
                { title: "Caso 1 — Pago tras retención", desc: "Se solicita retención de sueldo → se paga la deuda.", color: "green" },
                { title: "Caso 2 — Incumplimiento total", desc: "No paga → embargo + arresto → pago forzado.", color: "red" },
                { title: "Caso 3 — Acuerdo", desc: "Se negocia plan de pago → se regulariza la situación.", color: "blue" },
              ].map((c, i) => (
                <div key={i} className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-sm`}>
                  <h4 className="font-bold text-gray-900 mb-1">{c.title}</h4>
                  <p className="text-gray-600">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Errores comunes */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Errores comunes</h2>
            <div className="bg-red-50 border border-red-100 rounded-xl p-6">
              <ul className="space-y-2">
                {["No pedir liquidación", "Esperar demasiado", "No solicitar medidas de apremio", "No hacer seguimiento"].map((e, i) => (
                  <li key={i} className="flex items-center gap-2 text-red-800">
                    <span className="text-red-500">✕</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
              <p className="text-red-700 font-medium mt-4">👉 Estos errores retrasan el cobro.</p>
            </div>
          </div>

          {/* Links relacionados */}
          <div className="mb-8 space-y-3">
            <h2 className="text-2xl font-bold mb-4">Artículos relacionados</h2>
            <div className="text-center py-4 border-t border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Si aún no tienes pensión fijada</p>
              <Link
                to="/blog/como-demandar-pension-alimentos-chile-2026"
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 Cómo demandar pensión de alimentos en Chile
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="text-center py-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Sobre el cálculo de la pensión</p>
              <Link
                to="/blog/pension-de-alimentos-chile-cuanto-corresponde-2026"
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 ¿Cuánto corresponde de pensión de alimentos?
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Conclusión */}
          <div className="prose prose-lg max-w-none mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              La deuda de pensión de alimentos en Chile no es un problema sin solución. A diferencia de otras obligaciones, el sistema legal chileno contempla herramientas concretas y efectivas para exigir el cumplimiento, incluso en casos donde el deudor intenta evitar el pago.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              El error más común es esperar demasiado tiempo antes de actuar. Cada mes que pasa sin iniciar acciones legales no solo aumenta la deuda, sino que también puede hacer más complejo el proceso de recuperación.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Solicitar la liquidación de la deuda y activar medidas de apremio como retención de sueldo, embargo o arresto puede cambiar completamente el escenario, obligando al deudor a cumplir.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Además, es importante entender que el hecho de que el deudor no tenga ingresos formales no lo libera de su obligación. Existen mecanismos para investigar su situación económica y aplicar medidas igualmente efectivas.
            </p>
            <p className="text-gray-600 font-semibold leading-relaxed">
              Actuar a tiempo puede marcar la diferencia entre recuperar la deuda o enfrentar un problema prolongado.
            </p>
          </div>

          {/* FAQs */}
          <div className="mb-12" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes</h2>
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

        {/* CTA Final */}
        <section className="bg-white rounded-xl shadow-sm p-8 text-center mt-8">
          <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">¿Tienes deuda de pensión de alimentos y no sabes cómo cobrarla?</h2>
          <p className="text-lg text-gray-700 mb-6">
            Un abogado especialista en derecho de familia puede ayudarte a:
          </p>
          <div className="grid gap-3 md:grid-cols-2 mb-8 max-w-2xl mx-auto text-left">
            {[
              "Solicitar la liquidación de la deuda",
              "Activar medidas de apremio",
              "Gestionar embargo de bienes",
              "Representarte ante el tribunal",
              "Exigir arresto en caso necesario",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/consultar">
              <Button
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_consultar_abogado', {
                    article: window.location.pathname,
                    location: 'blog_cta_pension_deuda_primary',
                  });
                }}
                className="bg-gray-900 hover:bg-green-900 text-white px-8 py-3 w-full sm:w-auto"
              >
                Habla con un abogado ahora
              </Button>
            </Link>
            <Link to="/search?category=Derecho+de+Familia">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_ver_abogados', {
                    article: window.location.pathname,
                    location: 'blog_cta_pension_deuda_secondary',
                  });
                }}
                className="border-green-900 text-green-900 hover:text-white hover:bg-green-900 px-8 py-3 w-full sm:w-auto"
              >
                Ver Abogados de Familia
              </Button>
            </Link>
          </div>
        </section>
      </div>

      <RelatedLawyers category="Derecho de Familia" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare
            title="Deuda de pensión de alimentos en Chile: cómo cobrarla paso a paso (Guía 2026)"
            url="https://legalup.cl/blog/deuda-pension-alimentos-chile-2026"
          />
        </div>

        <BlogNavigation
          prevArticle={{
            id: "me-pueden-demandar-por-no-pagar-el-arriendo-chile-2026",
            title: "¿Me pueden demandar por no pagar el arriendo en Chile? (Qué pasa y cómo defenderte 2026)",
            excerpt: "Si dejas de pagar el arriendo en Chile, el arrendador puede demandarte. Conoce qué puede pasar, cuáles son tus derechos y cómo enfrentar esta situación.",
            image: "/assets/demanda-arriendo-chile-2026.png"
          }}
        />

        <div className="mt-4 text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-green-900 hover:text-green-600 transition-colors font-medium"
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
