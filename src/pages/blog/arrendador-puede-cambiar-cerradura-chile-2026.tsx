import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, AlertCircle, Shield, Search, MessageSquare, XCircle } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Qué pasa si debo arriendo?",
      answer: "Aunque exista deuda, el arrendador no puede cambiar la cerradura sin orden judicial. Debe iniciar un proceso legal."
    },
    {
      question: "¿El arrendador puede sacar mis cosas?",
      answer: "En general, no. Sin una orden judicial, esto puede ser ilegal y generar consecuencias para el arrendador."
    },
    {
      question: "¿Puedo entrar si cambiaron la cerradura?",
      answer: "Depende del caso. Es recomendable actuar con asesoría legal para evitar problemas mayores."
    },
    {
      question: "¿Carabineros puede intervenir?",
      answer: "Puede intervenir dependiendo de la situación, especialmente si existe un conflicto o denuncia formal."
    },
    {
      question: "¿Se puede evitar un desalojo?",
      answer: "En algunos casos sí, por ejemplo: pagando la deuda, llegando a un acuerdo o negociando plazos con el arrendador."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="¿El arrendador puede cambiar la cerradura en Chile? (Guía legal 2026)"
        description="¿Te cambiaron la cerradura? En Chile, el arrendador no puede hacerlo sin una orden judicial. Descubre qué dice la ley y qué hacer para proteger tus derechos en esta Guía 2026."
        image="/assets/cerradura-arriendo-chile-2026.png"
        url="https://legalup.cl/blog/arrendador-puede-cambiar-cerradura-chile-2026"
        datePublished="2026-03-18"
        dateModified="2026-03-18"
        faqs={faqs}
      />
      <Header onAuthClick={() => {}} />
      <ReadingProgressBar />

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

          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-balance">
            ¿El arrendador puede cambiar la cerradura en Chile? (Guía legal 2026)
          </h1>

          <p className="text-xl text-blue-100 max-w-3xl leading-relaxed">
            En Chile, el arrendador no puede cambiar la cerradura sin una orden judicial. Conoce tus derechos y qué hacer si esto ocurre.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-blue-100 mt-6 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>18 de Marzo, 2026</span>
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
            title="¿El arrendador puede cambiar la cerradura en Chile? (Guía legal 2026)"
            url="https://legalup.cl/blog/arrendador-puede-cambiar-cerradura-chile-2026"
            showBorder={false}
          />

          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed font-medium">
              Muchos arrendatarios en Chile enfrentan una situación preocupante: llegar a su casa y descubrir que el arrendador cambió la cerradura.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Esto suele ocurrir cuando existen deudas de arriendo o conflictos entre las partes. Sin embargo, la gran pregunta es: <strong>¿puede el arrendador cambiar la cerradura en Chile?</strong>
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg mt-10">
              <p className="text-blue-800 font-bold text-lg">La respuesta, en la mayoría de los casos, es no.</p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿El arrendador puede cambiar la cerradura en Chile?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              En general, el arrendador <strong>no puede cambiar la cerradura sin una orden judicial</strong>. Aunque exista deuda de arriendo o incumplimiento del contrato, el propietario no puede tomar medidas por su cuenta para recuperar el inmueble.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">Cambiar la cerradura sin autorización puede:</p>
            <div className="space-y-3 mb-6">
              {[
                "Impedir el acceso a la vivienda",
                "Vulnerar derechos del arrendatario",
                "Generar consecuencias legales graves"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 leading-relaxed">
              Este tipo de acciones se considera una forma de <strong>autotutela</strong>, lo que en Chile no está permitido en la mayoría de los casos.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuándo es ilegal cambiar la cerradura?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Cambiar la cerradura será ilegal cuando:</p>
            <div className="space-y-3 mb-6">
              {[
                "El arrendatario sigue viviendo en el inmueble",
                "No existe una orden judicial de desalojo",
                "El contrato de arriendo está vigente",
                "Existen pertenencias del arrendatario dentro del inmueble"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-red-50 p-3 rounded-lg border border-red-100">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 leading-relaxed font-medium">
              En estas situaciones, el arrendador debe recurrir a un tribunal.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué dice la ley en Chile?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              La legislación chilena establece que los conflictos de arriendo deben resolverse mediante procedimientos legales. Esto implica que el arrendador debe:
            </p>
            <div className="space-y-4 mb-8">
              {[
                { title: "Presentar una demanda", desc: "El arrendador debe acudir a un tribunal civil y presentar una demanda de término de arriendo o desalojo." },
                { title: "Esperar una resolución judicial", desc: "El tribunal analiza el caso y emite una resolución, otorgando al arrendatario la posibilidad de defenderse." },
                { title: "Obtener una orden de desalojo", desc: "Solo después de la sentencia y con una orden expresa del juez se puede proceder al desalojo." }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600 font-bold text-base w-9 h-9 flex items-center justify-center flex-shrink-0">{i+1}</div>
                  <div>
                    <span className="font-bold text-gray-900">{item.title}</span>
                    <p className="text-base text-gray-600 mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center py-6 border-t border-b border-gray-100">
              <p className="text-gray-700 mb-4 font-medium">Si quieres entender cuánto demora este proceso, revisa también:</p>
              <Link
                to="/blog/cuanto-demora-juicio-desalojo-chile-2026"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
              >
                👉 ¿Cuánto demora un juicio de desalojo en Chile?
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si el arrendador cambia la cerradura?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si el arrendador cambia la cerradura sin autorización judicial, puede enfrentar consecuencias legales. Esto puede incluir:
            </p>
            <div className="space-y-3 mb-6">
              {[
                "Acciones judiciales por parte del arrendatario",
                "Obligación de restituir el acceso al inmueble",
                "Posibles indemnizaciones por daños y perjuicios"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 leading-relaxed">
              Además, el conflicto puede escalar y terminar siendo más costoso y complejo para ambas partes.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué hacer si te cambian la cerradura?</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Si enfrentas esta situación, es importante actuar de forma rápida y ordenada. Sigue estos pasos:
            </p>
            <div className="space-y-4">
              {[
                { title: "Reunir pruebas", desc: "Recopila toda la evidencia posible: fotografías o videos, mensajes con el arrendador y testigos. Esto será clave en caso de acciones legales.", icon: <Search className="h-5 w-5" /> },
                { title: "Evitar confrontaciones", desc: "Evita actuar de forma impulsiva o generar conflictos mayores. Lo mejor es manejar la situación por vías legales.", icon: <Shield className="h-5 w-5" /> },
                { title: "Contactar al arrendador", desc: "En algunos casos, el problema puede resolverse mediante diálogo directo y pacífico.", icon: <MessageSquare className="h-5 w-5" /> },
                { title: "Buscar asesoría legal", desc: "Un abogado puede ayudarte a evaluar la legalidad del acto, definir estrategias y recuperar el acceso al inmueble.", icon: <Shield className="h-5 w-5" /> },
                { title: "Iniciar acciones legales si corresponde", desc: "Dependiendo del caso, puedes presentar una denuncia, acudir a tribunales o solicitar medidas urgentes.", icon: <AlertCircle className="h-5 w-5" /> }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600 font-bold text-base w-9 h-9 flex items-center justify-center flex-shrink-0">
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

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cómo denunciar si el arrendador cambió la cerradura?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si el arrendador cambia la cerradura sin autorización, puedes tomar acciones. Algunas opciones incluyen:
            </p>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  "Dejar constancia ante Carabineros",
                  "Presentar acciones judiciales",
                  "Solicitar medidas para recuperar el acceso",
                  "Contar con pruebas que acrediten la situación"
                ].map((tip, i) => (
                  <div key={i} className="flex items-center gap-3 text-gray-700">
                    <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <span className="text-base font-medium">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué puede hacer el arrendador legalmente?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si existe incumplimiento del contrato, el arrendador debe actuar dentro de la ley. Las opciones legales incluyen:
            </p>
            <div className="space-y-3">
              {[
                "Iniciar una demanda de desalojo",
                "Solicitar el pago de rentas adeudadas",
                "Pedir el término del contrato ante el tribunal"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mt-6 leading-relaxed">
              Esto permite recuperar el inmueble sin exponerse a sanciones.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Errores comunes de los arrendadores</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Muchos conflictos se agravan por errores evitables. Los más comunes son:</p>
            <div className="space-y-3">
              {[
                "Cambiar la cerradura sin orden judicial",
                "Intentar desalojar por la fuerza",
                "No iniciar un proceso legal formal",
                "No contar con contrato claro y firmado"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-red-50 p-3 rounded-lg border border-red-100">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mt-6 leading-relaxed">
              Evitar estos errores permite resolver el problema de forma más segura y rápida.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Caso común en Chile</h2>
            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
              <p className="text-indigo-900 leading-relaxed mb-3">
                Un arrendatario deja de pagar el arriendo durante varios meses. El arrendador, buscando una solución rápida, decide cambiar la cerradura para recuperar la propiedad.
              </p>
              <p className="text-indigo-900 leading-relaxed mb-3">
                Sin embargo, esta acción puede ser ilegal si no existe una orden judicial.
              </p>
              <p className="text-indigo-900 leading-relaxed font-bold">
                En estos casos, el arrendatario podría iniciar acciones legales, lo que complica aún más la situación para el arrendador.
              </p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Diferencia entre desalojo legal o no</h2>
            <div className="overflow-x-auto border rounded-xl overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-base font-bold text-gray-500 uppercase tracking-wider">Situación</th>
                    <th className="px-6 py-4 text-left text-base font-bold text-gray-500 uppercase tracking-wider">¿Es legal?</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 text-base font-medium text-gray-900">Cambiar cerradura sin juicio</td>
                    <td className="px-6 py-4 text-base text-red-600 font-semibold">❌ No</td>
                  </tr>
                  <tr className="bg-gray-50/30">
                    <td className="px-6 py-4 text-base font-medium text-gray-900">Desalojar con orden judicial</td>
                    <td className="px-6 py-4 text-base text-green-600 font-semibold">✅ Sí</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-base font-medium text-gray-900">Impedir acceso al arrendatario</td>
                    <td className="px-6 py-4 text-base text-red-600 font-semibold">❌ No</td>
                  </tr>
                  <tr className="bg-gray-50/30">
                    <td className="px-6 py-4 text-base font-medium text-gray-900">Iniciar demanda de desalojo</td>
                    <td className="px-6 py-4 text-base text-green-600 font-semibold">✅ Sí</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-12 text-center py-8 border-t border-b border-gray-100">
            <p className="text-gray-700 mb-4 font-medium">
              Cambiar la cerradura no reemplaza un proceso judicial. Para entender cuándo pueden sacarte de una propiedad, revisa también:
            </p>
            <Link
              to="/blog/me-quieren-desalojar-que-hago-chile-2026"
              className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-lg"
            >
              👉 ¿Me pueden desalojar sin orden judicial en Chile?
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>

          {/* Conclusion */}
          <div className="mb-12 pt-4">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              En Chile, el arrendador no puede cambiar la cerradura sin una orden judicial en la mayoría de los casos.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Aunque existan deudas o conflictos, la ley exige que el desalojo se realice mediante un proceso judicial. Actuar fuera de este marco puede generar consecuencias legales tanto para arrendadores como arrendatarios.
            </p>
            <p className="text-gray-600 font-bold leading-relaxed">
              Si tienes un problema de arriendo o desalojo, es recomendable buscar orientación legal. En LegalUp puedes encontrar abogados que analicen tu caso y te ayuden a tomar la mejor decisión.
            </p>
          </div>

          {/* FAQ */}
          <div className="mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">Otras preguntas frecuentes</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-700">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <section className="bg-white rounded-xl shadow-sm p-8 text-center mt-8 border">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">¿Tienes un problema con tu arriendo?</h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
            Ya seas arrendatario o arrendador, en LegalUp conectamos a personas con abogados especializados en derecho inmobiliario que analizan tu caso de forma inmediata y profesional.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/consulta">
              <Button
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_consultar_abogado', {
                    article: window.location.pathname,
                    location: 'blog_cta_cerradura_primary',
                  });
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 w-full sm:w-auto shadow-md"
              >
                Consultar con Abogado Ahora
              </Button>
            </Link>
            <Link to="/search?category=Arrendamiento">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_ver_abogados', {
                    article: window.location.pathname,
                    location: 'blog_cta_cerradura_secondary',
                  });
                }}
                className="border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 w-full sm:w-auto"
              >
                Ver Abogados de Arriendo
              </Button>
            </Link>
          </div>
        </section>
      </div>

      <RelatedLawyers category="Arrendamiento" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare
            title="¿El arrendador puede cambiar la cerradura en Chile? (Guía legal 2026)"
            url="https://legalup.cl/blog/arrendador-puede-cambiar-cerradura-chile-2026"
          />
        </div>

        <BlogNavigation
          prevArticle={{
            id: "cuanto-demora-juicio-desalojo-chile-2026",
            title: "¿Cuánto demora un juicio de desalojo en Chile? Guía 2026",
            excerpt: "Descubre los plazos reales de un juicio de desalojo en Chile: desde la demanda hasta el lanzamiento.",
            image: "/assets/desalojo-2-chile-2026.png"
          }}
          nextArticle={{
            id: "orden-desalojo-chile-2026",
            title: "Orden de desalojo en Chile: qué es, cuándo ocurre y cómo funciona (Guía 2026)",
            excerpt: "Descubre qué es una orden de desalojo, cuándo se dicta, qué ocurre después y qué hacer si recibes una.",
            image: "/assets/orden-desalojo-chile-2026.png"
          }}
        />

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
