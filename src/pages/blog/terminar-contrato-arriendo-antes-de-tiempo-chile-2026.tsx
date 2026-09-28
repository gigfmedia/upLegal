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
      question: "¿Puedo irme antes de que termine el contrato de arriendo?",
      answer: "Sí, físicamente puedes restituir el inmueble cuando quieras. La pregunta real es cuánto te cuesta: sigues obligado a pagar la renta hasta la restitución efectiva, y el arrendador puede exigirte los perjuicios que tu salida anticipada le cause. Revisa qué dice tu contrato sobre término anticipado y multas.",
    },
    {
      question: "¿Pierdo la garantía si me voy antes del plazo?",
      answer: "No automáticamente. La garantía asegura deterioros y deudas pendientes, no es una multa automática por irte antes. El arrendador debe rendirla descontando solo lo que corresponda: rentas adeudadas, cuentas impagas o daños acreditados. Si te retiene la garantía completa sin justificación, puedes reclamarla.",
    },
    {
      question: "¿Cuánto aviso debo dar para terminar el arriendo?",
      answer: "Lo primero que manda es tu contrato: muchos exigen aviso escrito con 30 o 60 días. En arriendos mes a mes o de duración indefinida, la Ley de Arriendos regula el desahucio con plazos e interviene el tribunal. Dar aviso por escrito y con anticipación siempre te deja en mejor posición.",
    },
    {
      question: "¿Me pueden cobrar multa por irme antes?",
      answer: "Solo si el contrato contempla una multa o cláusula penal por término anticipado, o si tu salida causa perjuicios acreditables (meses sin arrendar, por ejemplo). Sin cláusula de multa, el arrendador igual puede demandar indemnización, pero debe probar el daño. Una salida avisada y documentada reduce mucho ese riesgo.",
    },
    {
      question: "¿Qué pasa si simplemente dejo de pagar y me voy?",
      answer: "Es el peor escenario: acumulas rentas adeudadas reajustadas, pierdes capacidad de negociar la garantía, y el arrendador puede demandarte el cobro más indemnización. Además, una deuda judicial puede afectar tu historial comercial. Siempre es mejor avisar por escrito y restituir formalmente.",
    },
    {
      question: "¿Cómo dejo constancia de que devolví el inmueble?",
      answer: "Entrega las llaves contra un acta de restitución firmada por ambas partes, con fecha, estado del inmueble y lecturas de medidores. Saca fotos y guarda todos los comprobantes de pago. Sin acta, el arrendador puede alegar que la restitución fue posterior y cobrarte más renta.",
    },
    {
      question: "Mi contrato dura más de un año y prohíbe subarrendar: ¿igual pago los meses que faltan?",
      answer: "No. En arriendos habitacionales a plazo fijo superior a un año, la Ley 18.101 establece que si el contrato te prohíbe subarrendar, puedes poner término anticipado sin pagar la renta del período faltante. Debes igual las rentas hasta la restitución y los daños acreditables, pero no los meses futuros.",
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <BlogGrowthHacks
        title="Terminar el arriendo antes de tiempo en Chile 2026: aviso, multa y garantía"
        description="¿Te quieres ir antes de que termine el contrato de arriendo? Revisa cuánto aviso debes dar, si pierdes la garantía y cómo salir sin demanda."
        image="/assets/terminar-arriendo-antes-chile-2026.png"
        url="https://legalup.cl/blog/terminar-contrato-arriendo-antes-de-tiempo-chile-2026"
        datePublished="2026-08-25"
        dateModified="2026-08-25"
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
            ¿Te quieres ir antes de que termine el contrato de arriendo? Aviso, multa y garantía en Chile 2026
          </h1>

          <div className="bg-white backdrop-blur-sm border rounded-2xl p-6 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-4">
              Resumen rápido
            </p>

            <ul className="space-y-2 text-green-900">
              {[
                "Puedes irte antes, pero debes la renta hasta la restitución efectiva del inmueble",
                "La multa solo aplica si tu contrato la contempla o hay perjuicios acreditables",
                "La garantía no se pierde en automático: debe rendirse con descuentos justificados",
                "Avisa por escrito con la anticipación que exija tu contrato (usualmente 30 días o más)",
                "Entrega las llaves con acta firmada, fotos y medidores: sin acta, te pueden cobrar más"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-green-500 font-medium">✓</span>
                  <span className="text-sm sm:text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl max-w-3xl leading-relaxed text-green-900">
            Cambiaste de trabajo, terminaste una relación o simplemente la casa ya no te sirve, pero tu contrato de arriendo sigue vigente por meses. Irte antes se puede, pero hacerlo mal te cuesta la garantía, meses de renta y hasta una demanda. Esto es exactamente cómo salir de un arriendo anticipadamente pagando lo justo.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6 text-green-900 text-sm sm:text-base">
            <div className="flex items-center gap-2 text-green-900">
              <Calendar className="h-4 w-4" />
              <span>25 de Agosto, 2026</span>
            </div>
            <div className="flex items-center gap-2 text-green-900">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2 text-green-900">
              <Clock className="h-4 w-4" />
              <ReadTime slug="terminar-contrato-arriendo-antes-de-tiempo-chile-2026" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
        <div className="bg-white border sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare
            showBorder={false}
            title="¿Te quieres ir antes de que termine el contrato de arriendo? Aviso, multa y garantía en Chile 2026"
            url="https://legalup.cl/blog/terminar-contrato-arriendo-antes-de-tiempo-chile-2026"
          />

          <p className="text-base text-gray-600 leading-relaxed mb-8 -mt-4">
            Los contratos de arriendo en Chile se rigen por la Ley 18.101 y por lo que las partes pactaron por escrito. Cuando quieres terminar antes, mandan dos cosas en este orden: tu contrato primero, la ley después. Por eso el primer paso siempre es leer tu contrato completo antes de avisar nada.
          </p>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Lo que tu contrato dice (y debes buscar hoy)</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Busca estas tres cláusulas en tu contrato, porque definen casi todo tu costo de salida:
            </p>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-base text-gray-700"><strong>Plazo y renovación:</strong> si es a plazo fijo, mes a mes o indefinido, y qué aviso exige cada caso</span>
              </div>
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-base text-gray-700"><strong>Término anticipado o multa:</strong> si existe cláusula penal por irte antes y de cuánto es</span>
              </div>
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-base text-gray-700"><strong>Garantía:</strong> monto, condiciones de devolución y qué descuentos autoriza</span>
              </div>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed font-bold text-lg">
              Si tu contrato no dice nada sobre término anticipado, igual puedes irte: solo que el costo lo define la ley y los perjuicios reales, no una multa inventada.
            </p>
          </div>

          <RelatedLawyers category="Derecho Civil" />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">El caso especial: arriendos de más de un año</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si tu arriendo es habitacional a plazo fijo superior a un año, la Ley de Arriendos (Ley 18.101) te da una herramienta poderosa: cuando el contrato te prohíbe subarrendar, puedes poner término anticipado sin pagar la renta del período que falte. Es decir, la propia ley compensa la prohibición de subarrendar con una salida sin costo de rentas futuras.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Revisa tu contrato hoy: si dura más de un año y dice que no puedes subarrendar ni ceder el arriendo, tu salida anticipada no te obliga a pagar los meses restantes. Igual debes las rentas hasta la restitución efectiva y los daños acreditables, pero no el "castigo" de pagar un contrato que ya no usas.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Cuánto aviso debes dar y cómo darlo</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Da aviso por escrito —correo electrónico con confirmación o carta— con la anticipación que exija tu contrato. Lo habitual en contratos a plazo es 30 días o más. En arriendos mes a mes o de duración indefinida, el desahucio del arrendador debe hacerse judicialmente o por notificación personal de un notario: si es tu arrendador quien te pide salir, exige que cumpla esa formalidad.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El aviso no te libera de pagar: debes la renta hasta el día en que restituyas efectivamente el inmueble. Avisar con tiempo no elimina ese pago, pero evita multas, te deja negociar la salida y demuestra buena fe si el caso llega a tribunales.
            </p>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Salida avisada y documentada</h3>
                <p className="text-green-700">Aviso escrito, restitución con acta, cuentas al día. El arrendador casi no tiene qué cobrarte más allá de lo pactado.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Salida improvisada o sin aviso</h3>
                <p className="text-red-700">Rentas hasta la restitución, multa si existe, garantía en disputa y riesgo real de demanda de perjuicios.</p>
              </div>
            </div>
          </div>

          <BlogContextualCTA articleSlug="terminar-contrato-arriendo-antes-de-tiempo-chile-2026" legalCategory="arriendo" />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">La garantía: qué te pueden descontar y qué no</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Por ley la garantía debe ser en dinero y no puede exceder de un mes de renta: si te cobraron más, ese exceso es cuestionable. Su fin es asegurar deterioros y deudas, no castigar tu salida. Al restituir, el arrendador debe devolverla reajustada según la variación del IPC, descontando únicamente lo justificado: rentas adeudadas, cuentas de servicios impagas y daños que excedan el desgaste normal, acreditados.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              No te pueden descontar "porque te fuiste antes" salvo que el contrato lo autorice expresamente como multa. Si te retienen la garantía completa sin rendición, tienes derecho a exigir la rendición detallada y a reclamar judicialmente la diferencia.
            </p>
          </div>

          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/no-devuelven-garantia-arriendo-chile-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 No te devuelven la garantía del arriendo: cómo recuperarla
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Y si el arrendador no quiere recibir las llaves?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Pasa más de lo que crees: el arrendador se enoja, no contesta o se niega a recibir el inmueble para seguir cobrando renta. No caigas en la trampa de quedarte con las llaves en el bolsillo sin hacer nada, porque la renta sigue corriendo hasta la restitución efectiva.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Lo práctico es dejar constancia por todos los medios: envía el aviso de término por correo y por carta, propone por escrito día y hora para la entrega, y si no hay respuesta, levanta un acta notarial dejando constancia del estado del inmueble y de tu disposición a restituir. Guarda las llaves a disposición del arrendador y no las uses. Esa paper trail es tu defensa si después te cobra meses extra.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Ejemplo: cronograma de una salida en 45 días</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Ejemplo hipotético con un contrato a 12 meses que exige 30 días de aviso. Día 1: lees el contrato y detectas que no hay multa por término anticipado. Día 2: envías el aviso escrito indicando fecha de restitución en 35 días. Días 3 a 30: pagas la renta corriente, pides presupuestos de flete y fotografías todo el inmueble. Día 35: entregas las llaves con acta firmada, fotos y lecturas de medidores, y pagas la renta proporcional hasta ese día. Día 40: envías correo exigiendo la rendición de la garantía con plazo de 10 días. Resultado: pagaste solo lo usado y tienes respaldo de cada paso.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">El checklist de una salida limpia</h2>
            <div className="space-y-3 mb-6">
              {["Lee tu contrato y detecta cláusulas de término anticipado, multa y garantía", "Avisa por escrito con la anticipación exigida y guarda el comprobante", "Paga rentas, gastos comunes y servicios hasta el día de la restitución", "Entrega las llaves con acta firmada, fotos del estado y lecturas de medidores", "Exige por escrito la rendición y devolución de la garantía con plazo"].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-green-600 font-bold flex-shrink-0">{i + 1}.</span>
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿En qué situaciones conviene consultar cuanto antes a un abogado?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Irse antes de tiempo es manejable, pero hay escenarios donde una revisión legal previa te ahorra mucho dinero.</p>
            <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
              {["Cuando tu contrato incluye multa por término anticipado y quieres negociar su rebaja", "Cuando el arrendador amenaza con demandarte o retener toda la garantía", "Cuando el arriendo es mes a mes o indefinido y necesitas un desahucio en regla"].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-green-600 flex-shrink-0">•</span>
                  <span className="text-gray-700 font-bold">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <InArticleCTA
            category="Derecho Civil"
            targetUrl="/abogado-arriendo"
            title="¿Necesitas terminar tu arriendo antes de tiempo?"
            message="Un abogado de arriendos revisa tu contrato, calcula tu costo real de salida y te ayuda a negociar con tu arrendador."
            buttonText="Revisar mi contrato de arriendo"
            priceNote="Consulta legal de 60 min desde $35.000"
          />

          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Terminar el arriendo antes de tiempo es un derecho que se ejerce con costo: renta hasta la restitución, multa solo si está pactada y garantía rendida, no confiscada. La diferencia entre una salida cara y una salida limpia está en tres cosas: leer el contrato, avisar por escrito y restituir con acta.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Si tu caso tiene multa, amenaza de demanda o desahucio complejo, revísalo con un <Link to="/abogados-arriendo" className="text-green-700 underline hover:text-green-500">abogado inmobiliario en Chile</Link> antes de entregar las llaves.
            </p>
          </div>

          <CategoryCTA category="arriendo" topic="término anticipado" />

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
            title="¿Te quieres ir antes de que termine el contrato de arriendo? Aviso, multa y garantía en Chile 2026"
            url="https://legalup.cl/blog/terminar-contrato-arriendo-antes-de-tiempo-chile-2026"
          />
        </div>

        <BlogNavigation currentArticleId="terminar-contrato-arriendo-antes-de-tiempo-chile-2026" />

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
      <BlogConversionPopup category="Derecho Civil" topic="término anticipado" targetUrl="/abogado-arriendo" title="¿Tu arrendador te amenaza con multa o con quedarse tu garantía?" message="Revisa tu contrato con un abogado antes de firmar o entregar nada." buttonText="Hablar con un abogado" />
    </div>
  );
};

export default BlogArticle;
