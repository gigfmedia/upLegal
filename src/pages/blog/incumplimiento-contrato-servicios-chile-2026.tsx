import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import InArticleCTA from "@/components/blog/InArticleCTA";
import BlogContextualCTA from "@/components/blog/BlogContextualCTA";
import CategoryCTA from "@/components/blog/CategoryCTA";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";
import { ReadTime } from "@/components/blog/ReadTime";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Puedo exigir que cumplan si no firmamos ningún contrato?",
      answer: "Sí. Aunque no haya nada firmado, valen como prueba los presupuestos, cotizaciones por WhatsApp o correo, comprobantes de pago y testigos. En Chile los contratos verbales también obligan. Eso sí: sin nada escrito es más difícil probar qué se pactó exactamente, por eso todo respaldo cuenta.",
    },
    {
      question: "¿Me tienen que devolver el anticipo si no hicieron el trabajo?",
      answer: "Por regla general, sí: si el servicio no se prestó, el dinero adelantado debe restituirse, y además puedes exigir indemnización por los perjuicios (por ejemplo, lo que te costó contratar a otro). La excepción es si el contrato contempla arras o una cláusula que regule el desistimiento: revísalo antes de exigir.",
    },
    {
      question: "¿Qué hago si el maestro dejó la obra a medias?",
      answer: "Documenta el estado actual con fotos y fecha, junta el presupuesto original y los pagos realizados, y requiere por escrito que termine en un plazo determinado. Si no cumple, puedes contratar a un tercero para terminar y cobrarle la diferencia, o resolver el contrato y exigir devolución más perjuicios.",
    },
    {
      question: "¿Sirve reclamar en el SERNAC por un servicio mal prestado?",
      answer: "Sí, cuando el prestador es una empresa o profesional que ofrece servicios al público: el SERNAC recibe tu reclamo, gestiona una mediación y deja constancia oficial. Si no hay solución, esa constancia respalda tu demanda ante el juzgado de policía local o civil.",
    },
    {
      question: "¿Cuál es la diferencia entre incumplimiento y nulidad de contrato?",
      answer: "El incumplimiento es cuando el contrato es válido pero una parte no hace lo pactado: se exige cumplimiento o resolución con indemnización. La nulidad es cuando el contrato nació con un vicio (error, dolo, objeto ilícito): se pide dejarlo sin efecto desde el origen. Son acciones distintas con plazos distintos.",
    },
    {
      question: "¿Cuánto plazo tengo para demandar un incumplimiento?",
      answer: "Las acciones personales por incumplimiento prescriben en 5 años por regla general del Código Civil. En consumo, los plazos para reclamar ante el SERNAC y demandar son más breves. No dejes pasar el tiempo: mientras antes actúes, más fácil es probar y recuperar.",
    },
    {
      question: "¿Qué pasa si yo tampoco cumplí mi parte del trato?",
      answer: "El prestador puede defenderse con la excepción de contrato no cumplido: si no pagaste lo acordado o no entregaste lo que te tocaba, no puedes exigirle que cumpla mientras sigas en falta. Antes de reclamar, ponte al día con tus propias obligaciones o prepárate para que te lo enrostren en el juicio.",
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <BlogGrowthHacks
        title="Incumplimiento de contrato de servicios en Chile 2026: qué hacer si no cumplen"
        description="¿Un maestro, contratista o taller no cumplió lo pactado? Revisa cómo exigir el cumplimiento o la devolución de tu dinero, con o sin contrato firmado."
        image="/assets/incumplimiento-contrato-servicios-chile-2026.png"
        url="https://legalup.cl/blog/incumplimiento-contrato-servicios-chile-2026"
        datePublished="2026-08-26"
        dateModified="2026-08-26"
        faqs={faqs}
      />
      <Header onAuthClick={() => { }} />
      <ReadingProgressBar />

      {/* Hero Section */}
      <div className="bg-[#f4efdf] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 mb-4 text-green-500"><Link to="/blog" className="hover:text-green-900 transition-colors">
            Blog
          </Link>
            <ChevronRight className="h-4 w-4" />
            <span>Artículo</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-900">
            ¿Contrataste un servicio y no cumplieron? Qué hacer ante el incumplimiento en Chile 2026
          </h1>

          <div className="bg-white backdrop-blur-sm border rounded-2xl p-6 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-4">
              Resumen rápido
            </p>

            <ul className="space-y-2 text-green-900">
              {[
                "Puedes exigir que cumplan el servicio o resolver el contrato y pedir tu dinero de vuelta",
                "El anticipo por un trabajo no hecho debe restituirse, más los perjuicios que pruebes",
                "Sin contrato firmado igual hay caso: valen cotizaciones, pagos y mensajes",
                "Requiere por escrito con plazo antes de demandar: fortalece todo lo que venga después",
                "Si es empresa, el SERNAC suma presión; la indemnización se pelea en tribunales"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-green-500 font-medium">✓</span>
                  <span className="text-sm sm:text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl max-w-3xl leading-relaxed text-green-900">
            Pagaste por adelantado, llegó la fecha y el trabajo está a medias, mal hecho o simplemente no existe. Pasa con maestros, contratistas, talleres y servicios de todo tipo. La buena noticia: en Chile el que incumple no se queda con tu plata por defecto. Esto es exactamente qué puedes exigir y en qué orden hacerlo.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6 text-green-900 text-sm sm:text-base">
            <div className="flex items-center gap-2 text-green-900">
              <Calendar className="h-4 w-4" />
              <span>26 de Agosto, 2026</span>
            </div>
            <div className="flex items-center gap-2 text-green-900">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2 text-green-900">
              <Clock className="h-4 w-4" />
              <ReadTime slug="incumplimiento-contrato-servicios-chile-2026" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
        <div className="bg-white border sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare
            showBorder={false}
            title="¿Contrataste un servicio y no cumplieron? Qué hacer ante el incumplimiento en Chile 2026"
            url="https://legalup.cl/blog/incumplimiento-contrato-servicios-chile-2026"
          />

          <p className="text-base text-gray-600 leading-relaxed mb-8 -mt-4">
            Cuando una parte no cumple lo pactado, la ley chilena te da a elegir: exigir que cumpla forzadamente o resolver el contrato y pedir indemnización de perjuicios. Lo dice expresamente el artículo 1489 del Código Civil para los contratos bilaterales: el contratante cumplidor puede pedir a su arbitrio la resolución o el cumplimiento, con indemnización de perjuicios en ambos casos. Esa elección es el corazón de todo reclamo, y conviene decidirla con estrategia, no con rabia.
          </p>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Qué puedes pedir ante un incumplimiento</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              La respuesta directa es que puedes elegir entre exigir que cumplan o resolver el contrato y recuperar tu dinero, y en ambos casos sumar indemnización. Esta tabla mapea cada situación a su alternativa:
            </p>
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-3 text-left font-bold">Situación</th>
                    <th className="border border-gray-300 p-3 text-left font-bold">Alternativa</th>
                    <th className="border border-gray-300 p-3 text-left font-bold">Qué significa</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-3">El servicio aún te sirve</td>
                    <td className="border border-gray-300 p-3">Cumplimiento forzado</td>
                    <td className="border border-gray-300 p-3">Obligar a terminar lo pactado, más indemnización por la demora acreditada.</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Perdiste la confianza o el plazo era esencial</td>
                    <td className="border border-gray-300 p-3">Resolución</td>
                    <td className="border border-gray-300 p-3">Dejar el contrato sin efecto, recuperar lo pagado y cobrar perjuicios como el sobrecosto de contratar a otro.</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Cumplimiento parcial, defectuoso o tardío</td>
                    <td className="border border-gray-300 p-3">Rebaja, reparación o resolución según el caso</td>
                    <td className="border border-gray-300 p-3">Ajustar el precio, exigir que lo rehaga a su costo o resolver, siempre más los perjuicios probados.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <h3 className="text-xl font-bold mb-4 text-gray-900">¿Qué es la condición resolutoria tácita?</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Es la regla del artículo 1489 del Código Civil presente en todo contrato bilateral: si una parte no cumple, se entiende que la otra puede pedir la resolución o el cumplimiento, con indemnización de perjuicios. No necesita estar escrita en tu contrato para invocarla.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Tus dos caminos: cumplimiento o resolución con indemnización</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si todavía quieres el servicio (el taller tiene tu auto, la obra está avanzada), puedes exigir el cumplimiento más una indemnización por el retraso. Si ya perdiste la confianza o el plazo era esencial, resuelves el contrato: recuperas lo pagado y cobras los perjuicios, como el sobrecosto de contratar a otro.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El incumplimiento no tiene que ser total para activar estos remedios: también cuentan el cumplimiento parcial (hizo la mitad), el defectuoso (lo hizo mal) y el tardío (lo hizo fuera de plazo cuando el tiempo importaba). Lo que cambia es qué pides: rebaja del precio, reparación a su costo o resolución completa, siempre más los perjuicios que acredites. La indemnización comprende el daño emergente y el lucro cesante.
            </p>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Exigir cumplimiento</h3>
                <p className="text-green-700">Conviene cuando el servicio aún te sirve y el prestador puede terminarlo. Suma indemnización por la demora acreditada.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Resolver y pedir devolución</h3>
                <p className="text-red-700">Conviene cuando ya no confías o el retraso te obligó a contratar a otro. Recuperas el anticipo más los perjuicios probados.</p>
              </div>
            </div>
          </div>

          <RelatedLawyers category="Derecho Civil" />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Sin contrato firmado también puedes reclamar</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Mucha gente cree que sin papel firmado no hay nada que hacer. Falso: en Chile el acuerdo verbal obliga igual. Lo que cambia es la prueba. Todo esto sirve para acreditar qué se pactó y qué se pagó:
            </p>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-base text-gray-700">Cotizaciones, presupuestos y mensajes de WhatsApp o correo con fechas, montos y plazos</span>
              </div>
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-base text-gray-700">Transferencias, boletas y comprobantes de anticipos o pagos parciales</span>
              </div>
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-base text-gray-700">Fotos con fecha del estado del trabajo y testimonios de quienes vieron lo pactado</span>
              </div>
            </div>
          </div>

          <BlogContextualCTA articleSlug="incumplimiento-contrato-servicios-chile-2026" legalCategory="civil" />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">El requerimiento escrito: el paso que casi todos se saltan</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Antes de demandar, envía un requerimiento escrito (correo basta) exigiendo el cumplimiento en un plazo determinado —por ejemplo 10 días— y advirtiendo que de lo contrario resolverás el contrato y cobrarás perjuicios. Este documento hace tres cosas: constituye en mora al deudor, fija una fecha clara de incumplimiento y demuestra ante el tribunal que actuaste de buena fe. El detalle técnico importa: si tu acuerdo tenía plazo, la mora se produce sola al vencerlo; si no tenía plazo, necesitas este requerimiento (o la notificación judicial) para constituirla.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si el prestador es una empresa o profesional establecido, reclama en paralelo ante el SERNAC: por teléfono al 800 700 100, en el Portal del Consumidor o en oficinas regionales, acompañando todos tus antecedentes. La mediación del SERNAC resuelve muchos casos sin juicio, y si no hay acuerdo, la constancia del reclamo respalda tu demanda posterior.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Cuándo el SERNAC no es el camino: si contrataste a un particular de forma ocasional (el vecino que hace arreglos, sin actividad comercial habitual), no hay relación de consumo y debes ir directo por la vía civil. Y si fuiste tú quien tampoco cumplió del todo —no pagaste una cuota, no entregaste materiales—, el prestador puede oponer la excepción de contrato no cumplido: mientras no cumplas tu parte, no puedes exigirle la suya. Revisa tu propio cumplimiento antes de demandar.
            </p>
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-3 text-left font-bold">Situación</th>
                    <th className="border border-gray-300 p-3 text-left font-bold">Vía que puede corresponder</th>
                    <th className="border border-gray-300 p-3 text-left font-bold">Qué revisar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-3">Empresa o profesional establecido</td>
                    <td className="border border-gray-300 p-3">SERNAC (reclamo y mediación) y luego juzgado de policía local o civil.</td>
                    <td className="border border-gray-300 p-3">Boletas, contrato y publicidad de lo ofrecido.</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Particular ocasional, sin actividad comercial</td>
                    <td className="border border-gray-300 p-3">Vía civil directa: no hay relación de consumo.</td>
                    <td className="border border-gray-300 p-3">Mensajes, pagos y testigos que acrediten lo pactado.</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Tú tampoco cumpliste tu parte</td>
                    <td className="border border-gray-300 p-3">Regularizar primero: te pueden oponer la excepción de contrato no cumplido.</td>
                    <td className="border border-gray-300 p-3">Tus propios pagos y entregas antes de exigir.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/nulidad-contrato-chile-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 Nulidad de contrato: cuando el problema nació con el acuerdo
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Qué hacer hoy si no cumplieron contigo</h2>
            <div className="space-y-3 mb-6">
              {["Fotografía y documenta hoy mismo el estado del trabajo, con fecha", "Junta presupuesto, pagos, mensajes y todo respaldo de lo pactado", "Envía el requerimiento escrito con plazo determinado", "Si es empresa, ingresa el reclamo en el SERNAC en paralelo", "Si no hay respuesta, evalúa demanda civil o de policía local con un abogado"].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-green-600 font-bold flex-shrink-0">{i + 1}.</span>
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿En qué situaciones conviene consultar cuanto antes a un abogado?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Los montos en juego y la estrategia (cumplir o resolver) se definen mejor con asesoría temprana.</p>
            <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
              {["Cuando el anticipo perdido supera lo que estás dispuesto a regalar", "Cuando el prestador niega el acuerdo o te acusa a ti de incumplir", "Cuando necesitas demandar y no sabes si ir a policía local o juzgado civil"].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-green-600 flex-shrink-0">•</span>
                  <span className="text-gray-700 font-bold">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <InArticleCTA
            category="Derecho Civil"
            title="¿Pagaste por un servicio que no se hizo o quedó mal?"
            message="Un abogado civil revisa tus respaldos, redacta el requerimiento y te dice si conviene exigir cumplimiento o demandar devolución."
            buttonText="Reclamar mi dinero"
          />

          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              El incumplimiento no te deja sin opciones: cumplimiento forzado o resolución con indemnización, incluso sin contrato firmado. El orden importa: documenta, requiere por escrito, reclama en el SERNAC si corresponde y demanda solo con la estrategia clara.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Si el monto justifica pelearlo, parte con una evaluación de tus respaldos junto a un <Link to="/search" className="text-green-700 underline hover:text-green-500">abogado civil en Chile</Link>.
            </p>
          </div>

          <CategoryCTA category="civil" topic="incumplimiento de contrato" />

          <div className="mb-6 pt-6" data-faq-section>
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
      </div>

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8 mb-8">
          <BlogShare
            title="¿Contrataste un servicio y no cumplieron? Qué hacer ante el incumplimiento en Chile 2026"
            url="https://legalup.cl/blog/incumplimiento-contrato-servicios-chile-2026"
          />
        </div>

        <BlogNavigation currentArticleId="incumplimiento-contrato-servicios-chile-2026" />

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
      <BlogConversionPopup category="Derecho Civil" topic="incumplimiento de contrato" targetUrl="/search" title="¿Te deben plata por un trabajo no hecho?" message="Revisa tus respaldos con un abogado civil y exige devolución con estrategia." buttonText="Reclamar con un abogado" />
    </div>
  );
};

export default BlogArticle;
