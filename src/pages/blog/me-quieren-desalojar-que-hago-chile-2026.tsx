import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, Info, Shield, Search, MessageSquare, AlertCircle } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import InArticleCTA from "@/components/blog/InArticleCTA";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Pueden sacarme de mi casa si no pagué el arriendo?",
      answer: "No inmediatamente. El no pago permite al dueño iniciar un juicio, pero solo un juez puede ordenar el desalojo."
    },
    {
      question: "¿Cuánto demora un desalojo en Chile?",
      answer: "El tiempo depende del caso. Con los procedimientos actuales, algunos desalojos pueden tardar entre 2 y 6 meses, aunque en casos complejos puede demorar más."
    },
    {
      question: "¿Qué pasa si no tengo contrato escrito?",
      answer: "Incluso sin contrato escrito, la ley reconoce el contrato verbal si existe evidencia de pago de arriendo. Esto significa que igualmente tienes derechos como arrendatario."
    },
    {
      question: "¿Puede el dueño entrar a la casa si vivo ahí?",
      answer: "No. Aunque sea el propietario, entrar sin autorización puede constituir violación de morada, que es un delito."
    },
    {
      question: "¿Me pueden desalojar si tengo niños?",
      answer: "Tener hijos menores no suspende automáticamente un proceso de desalojo en Chile. Sin embargo, el tribunal puede considerar la situación al fijar plazos. Si estás en esta situación, es importante contar con asesoría legal para explorar todas las opciones disponibles."
    },
    {
      question: "¿Pueden desalojarme sin orden judicial?",
      answer: "No. En Chile todo desalojo debe estar respaldado por una resolución judicial. Si el arrendador intenta sacarte por la fuerza, cambiar la cerradura o cortar servicios básicos sin orden judicial, está cometiendo un acto ilegal que puedes denunciar."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="¿Me pueden desalojar sin orden judicial en Chile? Lo que tienen que hacer primero"
        description="Para desalojarte, el arrendador debe seguir un proceso legal que puede tomar meses. Conoce los plazos, tus derechos y cuándo un desalojo sin orden judicial es ilegal. Consulta en LegalUp."
        image="/assets/desalojo-chile-2026.png"
        url="https://legalup.cl/blog/me-quieren-desalojar-que-hago-chile-2026"
        datePublished="2026-03-13"
        dateModified="2026-03-16"
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
          
          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-600">
            ¿Me pueden desalojar sin orden judicial en Chile? Lo que tienen que hacer primero
          </h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
              Resumen rápido
            </p>

            <ul className="space-y-2">
              {[
                "En Chile no pueden desalojarte sin orden judicial",
                "El arrendador no puede usar fuerza ni cambiar cerraduras",
                "Antes del desalojo debe existir un juicio",
                "La notificación judicial es obligatoria para avanzar",
                "Ignorar la demanda puede acelerar el lanzamiento"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm sm:text-base text-gray-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <p className="text-xl max-w-3xl leading-relaxed">
            Comprender cómo funciona realmente el proceso de desalojo es fundamental para proteger tus derechos como arrendatario y evitar abusos o situaciones ilegales.
          </p>
          
          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>13 de Marzo, 2026</span>
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
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
        <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare 
            title="¿Me pueden desalojar sin orden judicial en Chile? (Guía 2026)" 
            url="https://legalup.cl/blog/me-quieren-desalojar-que-hago-chile-2026" 
            showBorder={false}
          />
          
          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed font-medium">
              Si arriendas una propiedad en Chile, es posible que en algún momento tengas problemas con el dueño del inmueble. Ya sea por retrasos en el pago del arriendo, desacuerdos sobre mantenciones o simplemente por una mala relación personal, la tensión puede escalar rápidamente.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              En estos momentos de crisis, una de las dudas más recurrentes y angustiantes es: ¿me pueden desalojar sin una orden judicial en Chile? Muchas personas creen erróneamente que, al ser dueños de la propiedad, el arrendador tiene el poder absoluto de entrar a la vivienda, cambiar la cerradura o sacar las pertenencias a la calle. Sin embargo, la legislación chilena protege la morada y establece procesos estrictos para el término de un contrato de arriendo.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed text-balance">
              Comprender cómo funciona realmente el proceso de desalojo es fundamental para proteger tus derechos como arrendatario y evitar abusos o situaciones ilegales.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Proceso judicial obligatorio para desalojar</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Para que un desalojo sea legal en Chile, el dueño de la propiedad debe seguir ciertos pasos establecidos por la ley.
            </p>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Demanda ante tribunal civil</h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  El primer paso consiste en presentar una demanda de arrendamiento ante un tribunal civil. Generalmente esta acción se presenta cuando existe incumplimiento del contrato, como por ejemplo el no pago de rentas. El tribunal revisa la demanda y luego ordena notificar al arrendatario para que pueda defenderse.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 my-8">
                <h3 className="text-xl font-bold mb-4 text-gray-900">Derecho a defensa del arrendatario</h3>
                <p className="text-gray-700 leading-relaxed font-medium">
                  Una vez notificado, el arrendatario tiene derecho a responder la demanda, presentar pruebas o incluso llegar a un acuerdo con el dueño. Este principio es fundamental dentro del sistema judicial, ya que garantiza que ambas partes puedan ser escuchadas antes de tomar una decisión.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Orden de lanzamiento</h3>
                <p className="text-gray-600 leading-relaxed">
                  Si el juez determina que corresponde el desalojo, dictará una sentencia que puede incluir una orden de lanzamiento, que es la orden formal para que el arrendatario abandone la propiedad. Esta orden es ejecutada por un receptor judicial, quien puede solicitar el apoyo de Carabineros si es necesario.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si el dueño cambia la cerradura?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Uno de los escenarios más temidos por los arrendatarios es llegar a la vivienda y encontrar que el dueño cambió la cerradura. Lamentablemente, esta práctica ocurre en algunos casos, pero es importante saber que es ilegal.
            </p>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Autotutela ilegal</h3>
              <p className="text-gray-700 leading-relaxed font-medium">
                En Chile, ninguna persona puede hacer justicia por su propia cuenta. Esto se conoce jurídicamente como autotutela. Aunque el dueño sea el propietario del inmueble, no tiene derecho a expulsar al arrendatario mediante la fuerza o sin autorización judicial.
              </p>
            </div>

            <p className="text-gray-600 mb-6 leading-relaxed font-semibold">
              Cambiar cerraduras, cortar servicios básicos o sacar pertenencias a la calle son conductas que pueden ser denunciadas.
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-900">Posibles delitos</h3>
            <p className="text-gray-600 mb-4">Dependiendo de las circunstancias, estas acciones pueden constituir delitos como:</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "Violación de morada",
                "Apropiación indebida",
                "Daños a la propiedad"
              ].map((crime, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <span className="text-gray-700 font-medium text-base">{crime}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Qué hacer si intentan desalojarte ilegalmente</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Si un arrendador intenta sacarte de la propiedad sin orden judicial, existen varias acciones que puedes realizar para proteger tus derechos.
            </p>
            <div className="space-y-4">
              {[
                { title: "Contactar a Carabineros", desc: "Si el dueño intenta ingresar a la vivienda por la fuerza o cambiar cerraduras, puedes llamar a Carabineros para dejar constancia de la situación.", icon: <MessageSquare className="h-5 w-5" /> },
                { title: "Reunir evidencia", desc: "Es importante recopilar pruebas como fotografías, videos, mensajes o correos, y testigos. Estas evidencias pueden ser útiles si decides presentar una acción judicial.", icon: <Search className="h-5 w-5" /> },
                { title: "Buscar asesoría legal", desc: "Un abogado puede ayudarte a evaluar el caso y determinar qué acciones legales corresponden.", icon: <Shield className="h-5 w-5" /> }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                  <div className="bg-green-900 p-2 rounded-lg text-green-600 font-bold text-base w-9 h-9 flex items-center justify-center flex-shrink-0">
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

          <InArticleCTA
            message="Si te están presionando para que salgas o crees que el proceso no está siguiendo la ley, un abogado puede orientarte hoy mismo."
            buttonText="Quiero saber mis derechos"
            category="Derecho Arrendamiento"
          />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Cuándo SÍ pueden desalojarte legalmente</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Aunque no es posible desalojar sin orden judicial, sí existen situaciones en las que un tribunal puede ordenar el abandono de la propiedad. Las causas más comunes son las siguientes:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                { title: "No pago del arriendo", desc: "Es la causa más frecuente de demandas de desalojo." },
                { title: "Término del contrato", desc: "Si el contrato finalizó y el arrendatario no abandona la propiedad." },
                { title: "Subarriendo no autorizado", desc: "Incumplimiento contractual por subarrendar sin permiso." },
                { title: "Uso indebido del inmueble", desc: "Actividades comerciales o ilegales." },
                { title: "Daños graves a la propiedad", desc: "Si el arrendatario provoca daños importantes al inmueble." },
                { title: "Ocupación en precario", desc: "Sin contrato ni autorización formal del dueño." }
              ].map((cause, i) => (
                <div key={i} className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-gray-900 block">{cause.title}</span>
                    <span className="text-gray-600 text-base">{cause.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">El proceso judicial de desalojo en Chile</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Aunque cada caso puede ser diferente, el proceso de desalojo generalmente sigue estas etapas:
            </p>
            <div className="space-y-4">
              {[
                { title: "Presentación de la demanda", desc: "El dueño presenta la demanda ante el tribunal correspondiente con la ayuda de un abogado, solicitando el término del contrato y la restitución del inmueble." },
                { title: "Notificación", desc: "Un receptor judicial se encarga de notificar al arrendatario en su domicilio. A partir de la notificación comienza el plazo para responder la demanda." },
                { title: "Audiencia o resolución judicial", desc: "El juez analiza los antecedentes. Si determina que corresponde el desalojo, dictará una sentencia estableciendo el plazo para abandonar la propiedad." },
                { title: "Lanzamiento con fuerza pública", desc: "Si el arrendatario no abandona voluntariamente, el tribunal puede ordenar el lanzamiento con apoyo de Carabineros. Este es el único momento en que una persona puede ser desalojada físicamente." }
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                  <div className="bg-gray-900 p-2 rounded-lg text-white font-bold text-sm w-7 h-7 flex items-center justify-center flex-shrink-0">{i+1}</div>
                  <div>
                    <span className="font-bold text-gray-900">{step.title}</span>
                    <p className="text-base text-gray-600 mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué dice la ley “Devuélveme mi Casa”?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              En los últimos años se aprobó una normativa conocida como Ley “Devuélveme mi Casa”, cuyo objetivo es agilizar los procesos de desalojo en casos de incumplimiento de arriendo.
            </p>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8">
              <p className="text-gray-700 leading-relaxed font-bold">
                Esta ley permite procedimientos más rápidos en situaciones donde la deuda está claramente acreditada, por ejemplo cuando existe contrato firmado ante notario. Gracias a esta normativa, algunos desalojos pueden resolverse en plazos más cortos que antes, aunque igualmente requieren intervención judicial.
              </p>
            </div>
          </div>

          <p className="text-gray-600 mb-6 leading-relaxed italic">Puedes leer más sobre la Ley en este artículo.</p>
          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link to="blog/ley-devuelveme-mi-casa-chile-2026" className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base">
              👉 Ley "Devuélveme mi casa"
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Consejos para arrendatarios</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Para evitar conflictos legales o procesos de desalojo, es recomendable seguir algunas buenas prácticas:</p>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  "Mantener siempre los pagos de arriendo al día",
                  "Guardar comprobantes de pago",
                  "Leer cuidadosamente el contrato antes de firmar",
                  "Comunicar problemas al dueño con anticipación",
                  "Documentar cualquier reparación o mantención acordada"
                ].map((tip, i) => (
                  <div key={i} className="flex items-center gap-3 text-gray-700">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-base font-medium">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <InArticleCTA
            message="Enfrentar un desalojo sin asesoría legal es arriesgado. Un abogado puede revisar tu situación y decirte qué opciones tienes."
            buttonText="Hablar con abogado ahora"
            category="Derecho Arrendamiento"
          />

          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              En Chile, nadie puede ser desalojado de una propiedad sin una orden judicial. Aunque el dueño tenga motivos válidos para recuperar el inmueble, debe seguir el proceso legal establecido por la ley.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Intentar desalojar a un arrendatario por la fuerza, cambiar cerraduras o retirar pertenencias sin autorización judicial son acciones ilegales que pueden tener consecuencias legales. Conocer tus derechos es fundamental para enfrentar correctamente cualquier conflicto de arriendo y evitar abusos.
            </p>
            <p className="text-gray-600 font-bold leading-relaxed">
              Si tienes dudas sobre tu situación o enfrentas un problema legal relacionado con arriendos, buscar asesoría jurídica puede ayudarte a tomar decisiones informadas y proteger tus derechos.
            </p>
          </div>

          {/* FAQ */}
          <div className="mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">Preguntas frecuentes sobre desalojos</h2>
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
          <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">¿Te quieren desalojar o tienes problemas de arriendo?</h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
            Protege tu hogar y tus derechos. Conectamos a personas con abogados especialistas en arrendamiento para defender tu situación de forma inmediata y profesional.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/search?category=Derecho+Arrendamiento">
              <Button
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_consultar_abogado', {
                    article: window.location.pathname,
                    location: 'blog_cta_me_quieren_desalojar_primary',
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

      <RelatedLawyers category="Arrendamiento" />

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare 
            title="¿Me pueden desalojar sin orden judicial en Chile? (Guía 2026)" 
            url="https://legalup.cl/blog/me-quieren-desalojar-que-hago-chile-2026" 
          />
        </div>

        <BlogNavigation currentArticleId="me-quieren-desalojar-que-hago-chile-2026" />

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
    </div>
  );
};

export default BlogArticle;
