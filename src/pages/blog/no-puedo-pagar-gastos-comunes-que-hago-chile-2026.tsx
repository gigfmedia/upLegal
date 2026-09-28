import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, AlertCircle } from "lucide-react";
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
      question: "¿Me pueden cortar la luz por no pagar los gastos comunes?",
      answer: "Sí. La Ley de Copropiedad (Ley 21.442) ordena suspender la luz y las telecomunicaciones a las unidades con tres o más cuotas impagas, a requerimiento del administrador con autorización del comité. No aplica en estado de catástrofe ni en hogares con electrodependientes, y el agua potable nunca puede cortarse por esta causa. El corte no extingue la deuda.",
    },
    {
      question: "¿Qué pasa si debo varios meses de gastos comunes?",
      answer: "La deuda acumula los meses impagos más los intereses y multas que establezca el reglamento de copropiedad. La comunidad puede iniciar una cobranza judicial en tu contra, y la deuda puede terminar en embargo de bienes. Mientras antes regularices, menor es el monto final.",
    },
    {
      question: "¿Puedo vender mi departamento si debo gastos comunes?",
      answer: "Para vender necesitas el certificado de no adeudar gastos comunes que emite la administración. Si tienes deuda, deberás pagarla o acordar su pago con el comprador antes de firmar la escritura. La deuda de gastos comunes sigue al inmueble en la práctica de la compraventa.",
    },
    {
      question: "¿Los gastos comunes prescriben en Chile?",
      answer: "Las deudas de gastos comunes están sujetas a las reglas generales de prescripción del Código Civil. Sin embargo, cada cobro o notificación de la administración puede interrumpir ese plazo. No dejes de pagar contando con que la deuda va a prescribir: asesórate antes.",
    },
    {
      question: "¿El arrendatario o el dueño paga los gastos comunes?",
      answer: "Depende del contrato de arriendo. Si el contrato dice que el arrendatario paga los gastos comunes, es su obligación frente al arrendador; pero frente a la comunidad, el copropietario (dueño) sigue siendo responsable. Por eso los dueños deben verificar que su arrendatario esté al día.",
    },
    {
      question: "¿Qué hago si creo que el cobro de gastos comunes es incorrecto?",
      answer: "Pide a la administración el detalle de la liquidación: prorrateo, fondos de reserva y multas aplicadas. Compara con tu reglamento de copropiedad. Si el cobro no corresponde a lo reglamentado, reclama por escrito a la administración y al comité. Si no hay respuesta, un abogado puede revisar si existe cobro indebido.",
    },
    {
      question: "¿Dejar desocupado el departamento me exime de pagar?",
      answer: "No. La ley es expresa: que no uses los servicios comunes o que la unidad permanezca desocupada no te exime de pagar los gastos comunes. La deuda se genera igual, con los mismos intereses, multas y riesgo de corte y demanda.",
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <BlogGrowthHacks
        title="Gastos comunes impagos en Chile 2026: corte de luz, multas y qué hacer"
        description="¿No puedes pagar los gastos comunes de tu edificio? Revisa si te pueden cortar la luz, qué multas e intereses aplican y cómo evitar una demanda."
        image="/assets/gastos-comunes-edificio-chile-2026.png"
        url="https://legalup.cl/blog/no-puedo-pagar-gastos-comunes-que-hago-chile-2026"
        datePublished="2026-08-24"
        dateModified="2026-08-24"
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
            ¿No puedes pagar los gastos comunes? Qué pasa y qué hacer en Chile 2026
          </h1>

          <div className="bg-white backdrop-blur-sm border rounded-2xl p-6 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-4">
              Resumen rápido
            </p>

            <ul className="space-y-2 text-green-900">
              {[
                "Los gastos comunes son obligatorios: se pagan dentro de los 10 primeros días del aviso de cobro",
                "Con 3 o más cuotas impagas, la ley permite suspender la luz de tu unidad morosa",
                "El aviso de cobro tiene mérito ejecutivo: la comunidad puede demandarte y embargar",
                "Sin certificado de no deuda no puedes vender tu departamento",
                "Frente a la comunidad el dueño responde aunque arriende: verifica a tu arrendatario"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-green-500 font-medium">✓</span>
                  <span className="text-sm sm:text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl max-w-3xl leading-relaxed text-green-900">
            Si debes gastos comunes de tu edificio o condominio, la respuesta corta es: la deuda no desaparece sola y mientras más esperes, más cara sale. Entre intereses, multas del reglamento, posible corte de luz y cobranza judicial, pagar tarde sale mucho más caro que pagar hoy. Esto es lo que realmente puede pasarte y cómo frenarlo a tiempo.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6 text-green-900 text-sm sm:text-base">
            <div className="flex items-center gap-2 text-green-900">
              <Calendar className="h-4 w-4" />
              <span>24 de Agosto, 2026</span>
            </div>
            <div className="flex items-center gap-2 text-green-900">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2 text-green-900">
              <Clock className="h-4 w-4" />
              <ReadTime slug="no-puedo-pagar-gastos-comunes-que-hago-chile-2026" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
        <div className="bg-white border sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare
            showBorder={false}
            title="¿No puedes pagar los gastos comunes? Qué pasa y qué hacer en Chile 2026"
            url="https://legalup.cl/blog/no-puedo-pagar-gastos-comunes-que-hago-chile-2026"
          />

          <p className="text-base text-gray-600 leading-relaxed mb-8 -mt-4">
            Los gastos comunes financian la mantención, seguridad y servicios del edificio. En Chile se rigen por la Ley de Copropiedad Inmobiliaria (Ley 21.442) y por el reglamento interno de cada comunidad. No pagarlos no es como atrasarse en una cuenta cualquiera: la comunidad tiene herramientas legales directas contra el moroso.
          </p>

          <div className="mb-12">
            <h3 className="text-xl font-bold mb-4 text-gray-900">¿Qué son los gastos comunes?</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Son los aportes obligatorios de cada copropietario para cubrir la administración, mantención, reparación y consumos colectivos del condominio: agua y luz de espacios comunes, sueldos de conserjes, ascensores, seguros y el fondo de reserva para imprevistos. Se pagan dentro de los 10 primeros días del aviso de cobro y no dejan de generarse aunque no uses los servicios o el departamento esté desocupado.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Te pueden cortar la luz por deber gastos comunes?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Sí, y no depende de tu reglamento: lo ordena la Ley de Copropiedad (Ley 21.442). Cuando una unidad debe tres o más cuotas de gastos comunes —continuas o discontinuas—, las empresas eléctricas y de telecomunicaciones deben suspenderle el servicio a requerimiento escrito del administrador, previa autorización del comité de administración. Es la medida de presión más común y suele aplicarse antes que la vía judicial.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Hay dos excepciones que debes conocer. No pueden cortarte la luz durante la vigencia de una declaración de estado de catástrofe que afecte al condominio, ni si en tu hogar vive una persona electrodependiente. Y el agua potable no se puede cortar por deuda de gastos comunes: la Corte Suprema ha confirmado que suspender el agua es un acto de autotutela ilícito, porque impide el acceso a un bien esencial para la vida.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Ojo con lo más importante: el corte no extingue la deuda. Sigues debiendo los meses impagos más intereses y multas —la ley hace extensivas estas medidas de apremio también a multas, intereses y aportes al fondo de reserva—, y la comunidad igual puede demandarte por el total.
            </p>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Debes 3 o más cuotas</h3>
                <p className="text-green-700">El corte de luz es legalmente procedente. El camino es pagar o convenir un plan de pago por escrito antes de que lo ejecuten.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Te cortaron el agua o eres electrodependiente</h3>
                <p className="text-red-700">El corte es impugnable. Reclama por escrito a la administración y asesórate: la ley te protege expresamente en esos casos.</p>
              </div>
            </div>
          </div>

          <RelatedLawyers category="Derecho Civil" />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué puede pasar si no pagas los gastos comunes?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              La respuesta corta es que cada etapa de mora activa una consecuencia distinta. Esta tabla resume el escalamiento completo según la Ley de Copropiedad:
            </p>
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-3 text-left font-bold">Situación</th>
                    <th className="border border-gray-300 p-3 text-left font-bold">Qué puede ocurrir</th>
                    <th className="border border-gray-300 p-3 text-left font-bold">Qué conviene revisar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-3">Atraso inicial (1-2 cuotas)</td>
                    <td className="border border-gray-300 p-3">Intereses de mora según tu reglamento, con tope del 50% del interés corriente bancario.</td>
                    <td className="border border-gray-300 p-3">La liquidación detallada y el interés aplicado por la administración.</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">3 o más cuotas impagas</td>
                    <td className="border border-gray-300 p-3">Suspensión de luz y telecomunicaciones a requerimiento del administrador con autorización del comité.</td>
                    <td className="border border-gray-300 p-3">Si hay estado de catástrofe o un electrodependiente en el hogar: el corte no procede.</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Cobranza judicial</td>
                    <td className="border border-gray-300 p-3">El aviso de cobro tiene mérito ejecutivo: juicio ejecutivo, embargo de bienes, y se suman las cuotas que se devenguen en el juicio.</td>
                    <td className="border border-gray-300 p-3">Notificación y plazos procesales; no ignorar la demanda.</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Quieres vender</td>
                    <td className="border border-gray-300 p-3">Sin certificado de no deuda no hay escritura: debes pagar o pactar la deuda con el comprador.</td>
                    <td className="border border-gray-300 p-3">El certificado emitido por la administración antes de firmar.</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Corte de agua</td>
                    <td className="border border-gray-300 p-3">No procede por deuda de gastos comunes: la Corte Suprema lo considera autotutela ilícita.</td>
                    <td className="border border-gray-300 p-3">Reclamar por escrito y asesorarse si lo intentan.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Multas, intereses y cobranza judicial</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Cada mes impago se suma al anterior, y sobre ese total el reglamento aplica intereses y multas. En pocos meses, una deuda de dos o tres gastos comunes puede crecer de forma importante. Por eso el peor consejo es "esperar a que se arregle solo".
            </p>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-base text-gray-700">La administración debe enviarte la liquidación detallada: prorrateo, fondo de reserva y multas aplicadas</span>
              </div>
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-base text-gray-700">Si no pagas, la comunidad puede iniciar cobranza judicial en tu contra por la deuda total</span>
              </div>
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-base text-gray-700">Una deuda judicializada puede terminar en embargo de bienes, incluidos tus fondos en cuentas</span>
              </div>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si ya recibiste una demanda o una notificación de cobranza judicial, no la ignores: los plazos procesales corren igual aunque no respondas, y no responder solo empeora tu posición. Es el momento de hablar con un abogado.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Un dato procesal a tu favor y en tu contra: el aviso de cobro firmado por el administrador tiene mérito ejecutivo, así que la comunidad no necesita un juicio largo para embargarte. Y una vez deducida la acción, se entienden incluidas las cuotas que se devenguen durante el juicio. Cada mes que pasa en juicio suma a la misma demanda.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">El convenio de pago: cómo evitar el juicio</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              La propia ley faculta al administrador a celebrar convenios de pago con los morosos, en cuotas mensuales. Si no puedes pagar la deuda completa, esta es tu mejor carta: acércate a la administración antes de que demanden y propone por escrito un plan realista —monto de cada cuota, fechas y compromiso de mantener al día los gastos corrientes mientras pagas lo atrasado—.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Un convenio por escrito frena el corte de servicios y la demanda, siempre que lo cumplas. Si lo incumples, la comunidad retoma la cobranza judicial con la deuda completa más lo acumulado. Por eso propone cuotas que realmente puedas pagar, aunque sean bajas, en vez de un plan optimista que vas a romper al segundo mes.
            </p>
          </div>

          <BlogContextualCTA articleSlug="no-puedo-pagar-gastos-comunes-que-hago-chile-2026" legalCategory="arriendo" />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Arriendas tu departamento: el dueño igual responde</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si eres arrendador y tu contrato dice que el arrendatario paga los gastos comunes, esa es una obligación entre ustedes dos. Pero frente a la comunidad, quien responde es el copropietario: tú. Si tu arrendatario deja de pagar, la deuda, las multas y la eventual demanda llegan a tu nombre.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Por eso, si arriendas: exige el comprobante de gastos comunes al día junto con cada renta, y ante el primer atraso actúa de inmediato. Y si eres arrendatario y tu contrato incluye los gastos comunes, pagarlos es parte de cumplir tu contrato: el no pago puede usarse como causal en un juicio de término de arriendo.
            </p>
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-3 text-left font-bold">Aspecto</th>
                    <th className="border border-gray-300 p-3 text-left font-bold">Propietario</th>
                    <th className="border border-gray-300 p-3 text-left font-bold">Arrendatario</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-3">Frente a la comunidad</td>
                    <td className="border border-gray-300 p-3">Responde siempre: es el copropietario y a su nombre llegan multas, cortes y demandas.</td>
                    <td className="border border-gray-300 p-3">No es deudor directo de la comunidad, aunque use los servicios.</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Entre las partes</td>
                    <td className="border border-gray-300 p-3">Puede repetir contra el arrendatario lo que pagó, si el contrato le asignaba ese gasto.</td>
                    <td className="border border-gray-300 p-3">Paga solo si el contrato de arriendo se lo asigna expresamente.</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Qué verificar</td>
                    <td className="border border-gray-300 p-3">Comprobante de gastos al día junto a cada renta; actuar al primer atraso.</td>
                    <td className="border border-gray-300 p-3">Que el contrato diga quién paga; el no pago puede fundar el término del arriendo.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/dicom-deuda-arriendo-chile-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 Deuda de arriendo y DICOM: qué pasa si no pagas
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Qué hacer hoy si debes gastos comunes</h2>
            <div className="space-y-3 mb-6">
              {["Pide la liquidación detallada y verifica que los cobros correspondan a tu reglamento", "Si puedes pagar, hazlo ahora: cada mes suma intereses y multas", "Si no puedes pagar todo, propone por escrito un plan de pago a la administración", "Si el cobro te parece incorrecto, reclama por escrito al comité antes de negarte a pagar", "Si hay demanda o amenaza de corte sin respaldo en el reglamento, asesórate con un abogado"].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-green-600 font-bold flex-shrink-0">{i + 1}.</span>
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿En qué situaciones conviene consultar cuanto antes a un abogado?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">La deuda de gastos comunes parece un problema administrativo, pero hay situaciones donde conviene tener asesoría legal antes de que escale.</p>
            <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
              {["Cuando recibiste una demanda o notificación de cobranza judicial", "Cuando te cortaron servicios sin que el reglamento lo faculte", "Cuando el cobro incluye multas o intereses que tu reglamento no contempla"].map((item, i) => (
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
            title="¿Tienes una deuda de gastos comunes encima?"
            message="Un abogado puede revisar tu liquidación, frenar cobros indebidos y ayudarte a negociar un plan de pago con tu comunidad."
            buttonText="Revisar mi deuda de gastos comunes"
            priceNote="Consulta legal de 60 min desde $35.000"
          />

          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Deber gastos comunes sale caro: intereses, multas, posible corte de luz y cobranza judicial que puede terminar en embargo. La buena noticia es que casi todo se evita actuando pronto: pide la liquidación, paga o conviene un plan por escrito, y si el cobro no corresponde a tu reglamento, reclama con antecedentes.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Cada edificio tiene su propio reglamento, así que las reglas exactas de tu caso están en ese documento. Si quieres revisar una situación particular, puedes consultar con un <Link to="/abogados-arriendo" className="text-green-700 underline hover:text-green-500">abogado inmobiliario en Chile</Link>.
            </p>
          </div>

          <CategoryCTA category="arriendo" topic="gastos comunes" />

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
            title="¿No puedes pagar los gastos comunes? Qué pasa y qué hacer en Chile 2026"
            url="https://legalup.cl/blog/no-puedo-pagar-gastos-comunes-que-hago-chile-2026"
          />
        </div>

        <BlogNavigation currentArticleId="no-puedo-pagar-gastos-comunes-que-hago-chile-2026" />

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
      <BlogConversionPopup category="Derecho Civil" topic="gastos comunes" targetUrl="/abogado-arriendo" title="¿Te cortaron la luz o te demandaron por gastos comunes?" message="Revisa tu liquidación y tus opciones con un abogado antes de que la deuda siga creciendo." buttonText="Hablar con un abogado" />
    </div>
  );
};

export default BlogArticle;
