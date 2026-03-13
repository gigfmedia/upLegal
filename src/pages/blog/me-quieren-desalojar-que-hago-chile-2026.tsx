import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, AlertTriangle, Scale, ShieldAlert, Gavel, FileText } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Pueden sacarme de mi casa si no pagué el arriendo?",
      answer: "No inmediatamente. El no pago del arriendo le da derecho al dueño a iniciar un juicio de arrendamiento, pero hasta que un juez no dicte la orden de lanzamiento, tienes derecho a permanecer en la propiedad."
    },
    {
      question: "¿Cuánto demora un desalojo en Chile?",
      answer: "Depende del caso. Con la ley 'Devuélveme mi Casa', el desalojo por rentas impagas puede tardar de 2 a 4 meses. En otros casos, puede demorar varios meses dependiendo de la carga del tribunal."
    },
    {
      question: "¿Qué pasa si no tengo contrato de arriendo escrito?",
      answer: "Incluso sin contrato escrito, existe un contrato verbal reconocido por la ley. Si puedes demostrar el pago de rentas (transferencias, recibos), tienes los mismos derechos que un arrendatario con contrato escrito."
    },
    {
      question: "¿Puede el dueño entrar a la casa si vivo ahí?",
      answer: "No sin tu permiso. Aunque sea el dueño, mientras el contrato esté vigente (o haya ocupación de morada), entrar sin autorización es un delito de violación de morada."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="¿Me pueden desalojar sin orden judicial en Chile? Guía 2026"
        description="¿Te quieren desalojar? Conoce tus derechos en Chile 2026. Guía sobre desalojos legales, ley Devuélveme mi Casa y qué hacer ante un desalojo forzado ilegal."
        image="/assets/desalojo-chile-2026.png"
        url="https://legalup.cl/blog/me-quieren-desalojar-que-hago-chile-2026"
        datePublished="2026-03-13"
        dateModified="2026-03-13"
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
          
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-balance">
            ¿Me pueden desalojar sin orden judicial en Chile? (Guía 2026)
          </h1>
          
          <p className="text-xl text-blue-100 max-w-3xl">
            Conoce tus derechos como arrendatario y el proceso legal bajo la ley "Devuélveme mi Casa". No permitas que vulneren tu hogar sin el debido proceso.
          </p>
          
          <div className="flex flex-wrap items-center gap-4 text-blue-100 mt-6">
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
              <span>Tiempo de lectura: 15 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <BlogShare 
            title="¿Me pueden desalojar sin orden judicial en Chile? Guía 2026" 
            url="https://legalup.cl/blog/me-quieren-desalojar-que-hago-chile-2026" 
            showBorder={false}
          />
          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed font-medium">
              Si arriendas una propiedad en Chile, es posible que en algún momento tengas problemas con el dueño del inmueble. Ya sea por retrasos en el pago del arriendo, desacuerdos sobre mantenciones o simplemente por una mala relación personal, la tensión puede escalar rápidamente.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              En estos momentos de crisis, una de las dudas más recurrentes y angustiantes es: <strong>¿me pueden desalojar sin una orden judicial en Chile?</strong> Muchas personas creen erróneamente que, al ser dueños de la propiedad, el arrendador tiene el poder absoluto de entrar a la vivienda, cambiar la cerradura o sacar las pertenencias a la calle. Sin embargo, la legislación chilena protege la morada y establece procesos estrictos para el término de un contrato.
            </p>
          </div>

          {/* Rule General */}
          <div className="mb-12 py-2">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              ¿Me pueden desalojar sin orden judicial?
            </h2>
            <p className="text-gray-600 mb-4 font-semibold text-lg">
              La respuesta corta y categórica es NO.
            </p>
            <p className="text-gray-600 mb-6">
              En Chile, nadie puede ser desalojado de una propiedad que habita (incluso si existe una deuda importante) sin una orden emanada expresamente de un tribunal de justicia. El derecho a la vivienda y la inviolabilidad del hogar son principios protegidos por nuestra Constitución y el Código Civil.
            </p>
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div className="bg-white p-4 rounded-lg border border-red-100 shadow-sm">
                <h3 className="font-bold text-red-800 mb-2">Proceso Judicial Obligatorio</h3>
                <p className="text-sm text-gray-600">Para que un desalojo sea legal, el dueño debe iniciar una acción legal ante los tribunales civiles. No basta con una carta o aviso verbal.</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-red-100 shadow-sm">
                <h3 className="font-bold text-red-800 mb-2">Orden de Lanzamiento</h3>
                <p className="text-sm text-gray-600">Solo un receptor judicial, a menudo con auxilio de Carabineros, puede ejecutar el desalojo tras una sentencia firme.</p>
              </div>
            </div>
          </div>

          {/* Illegal Actions */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              ¿Qué pasa si el dueño cambia la cerradura?
            </h2>
            <p className="text-gray-600 mb-4">
              Este es uno de los escenarios más temidos y, lamentablemente, una práctica que algunos dueños intentan para presionar a los arrendatarios. Es fundamental saber que <strong>estas acciones son ilegales</strong>:
            </p>
            <ul className="space-y-4">
              <li className="flex items-start gap-4 bg-gray-50 p-4 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-500 mt-1 flex-shrink-0" />
                <div>
                  <span className="font-bold block text-gray-800">Autotutela Ilegal</span>
                  <span className="text-gray-600">En Chile, el dueño no puede tomar medidas de fuerza por cuenta propia. Hacerlo se considera "justicia por mano propia" y es sancionable.</span>
                </div>
              </li>
              <li className="flex items-start gap-4 bg-gray-50 p-4 rounded-lg">
                <Gavel className="h-6 w-6 text-orange-500 mt-1 flex-shrink-0" />
                <div>
                  <span className="font-bold block text-gray-800">Riesgo de Delitos Penales</span>
                  <span className="text-gray-600">Si el dueño cambia la cerradura con tus pertenencias dentro, podría incurrir en apropiación indebida o incluso violación de morada si entra sin autorización.</span>
                </div>
              </li>
            </ul>
          </div>

          {/* When is it Legal? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Cuándo SÍ pueden desalojarte legalmente</h2>
            <p className="text-gray-600 mb-6">
              Existen causales legales claras bajo las cuales un tribunal ordenará el desalojo definitivo de la propiedad:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "No pago del arriendo (causal más frecuente)",
                "Término del plazo del contrato",
                "Subarriendo sin autorización del dueño",
                "Destinar la vivienda a usos comerciales no permitidos",
                "Daños graves a la estructura de la propiedad",
                "Precario (cuando no existe contrato y solo hay tolerancia)"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-red-50 transition-colors">
                  <CheckCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <span className="text-gray-700 text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Process Step by Step */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
              El Proceso Judicial de Desalojo (Ley Chile)
            </h2>
            <div className="space-y-8 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-700">
              <div className="relative pl-10 border-l-0">
                <div className="absolute left-1.5 top-1 h-5 w-5 rounded-full bg-yellow-500 border-4 border-yellow-900"></div>
                <h3 className="font-bold">1. Demanda de Arrendamiento</h3>
                <p className="text-sm text-gray-400 mt-1">El dueño, mediante abogado, presenta la demanda solicitando el término de contrato por no pago o vencimiento.</p>
              </div>
              <div className="relative pl-10">
                <div className="absolute left-1.5 top-1 h-5 w-5 rounded-full bg-yellow-500 border-4 border-yellow-900"></div>
                <h3 className="font-bold">2. Notificación Legal</h3>
                <p className="text-sm text-gray-400 mt-1">Un receptor judicial entrega la demanda. Tienes 10 días para responder y presentar tus defensas.</p>
              </div>
              <div className="relative pl-10">
                <div className="absolute left-1.5 top-1 h-5 w-5 rounded-full bg-yellow-500 border-4 border-yellow-900"></div>
                <h3 className="font-bold">3. Audiencia y Sentencia</h3>
                <p className="text-sm text-gray-400 mt-1">El juez analiza las pruebas. Si falla a favor del dueño, fijará un plazo de entrega voluntaria.</p>
              </div>
              <div className="relative pl-10">
                <div className="absolute left-1.5 top-1 h-5 w-5 rounded-full bg-red-500 border-4 border-red-900 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                <h3 className="font-bold">4. Lanzamiento con Fuerza Pública</h3>
                <p className="text-sm text-gray-400 mt-1">Si no sales voluntariamente, se autoriza el lanzamiento forzado con apoyo de Carabineros.</p>
              </div>
            </div>
          </div>

          {/* FAQ (SEO structured) */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Preguntas frecuentes sobre desalojos</h2>
            
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-700">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div> {/* Closes bg-white rounded-lg shadow-sm p-8 */}

        {/* CTA Section */}
        <section className="bg-white rounded-xl shadow-sm p-8 text-center mt-8 border">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">¿Necesitas un abogado civil?</h2>
          <p className="text-lg text-gray-700 mb-6">
            Si tienes dudas sobre tu contrato, enfrentas amenazas de desalojo o simplemente necesitas que un experto revise tu situación, en LegalUp.cl puedes hablar con un abogado civil verificado en minutos, sin citas presenciales ni trámites complicados.
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
            <Link to="/search?category=Derecho+Civil">
              <Button 
                variant="outline" 
                size="lg"
                className="border-blue-600 text-blue-600 hover:text-blue-600 hover:bg-blue-50 px-8 py-3 w-full sm:w-auto"
              >
                Ver Abogados Civiles
              </Button>
            </Link>
          </div>
        </section>
      </div> {/* Closes max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 */}

      <RelatedLawyers category="Derecho Civil" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare 
            title="¿Me pueden desalojar sin orden judicial en Chile? Guía 2026" 
            url="https://legalup.cl/blog/me-quieren-desalojar-que-hago-chile-2026" 
          />
        </div>

        <div className="mt-8 text-center">
          <Link 
            to="/blog" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
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
