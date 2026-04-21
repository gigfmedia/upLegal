import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, Info, Shield, Search, MessageSquare, AlertCircle, FileText } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";
import InArticleCTA from "@/components/blog/InArticleCTA";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Me pueden desalojar sin orden judicial en Chile?",
      answer: "No. En Chile todo desalojo debe estar respaldado por una resolución judicial. El arrendador no puede sacarte por la fuerza, cambiar la cerradura ni cortar servicios básicos sin una orden del tribunal. Si ocurre, puedes denunciarlo como un acto ilegal."
    },
    {
      question: "¿Cuánto demora un desalojo en Chile?",
      answer: "Un proceso de desalojo en Chile puede tardar entre 3 y 12 meses, dependiendo de si el arrendatario contesta la demanda, la carga del tribunal y si hay apelaciones. Si el arrendatario no se opone y la deuda es clara, el proceso puede resolverse en menos tiempo."
    },
    {
      question: "¿Pueden subirme el arriendo cuando quieran?",
      answer: "No. El arrendador solo puede subir el arriendo si el contrato tiene una cláusula de reajuste que lo permita. Si el contrato no la contempla, el valor no puede modificarse unilateralmente durante su vigencia. Cualquier aumento sin respaldo contractual puede ser rechazado."
    },
    {
      question: "¿Puedo demandar a mi arrendador si no tengo contrato escrito?",
      answer: "Sí, pero es más difícil. La ley chilena reconoce los contratos verbales de arriendo si existe evidencia del pago, como transferencias bancarias o mensajes. Sin contrato escrito, deberás acreditar la relación de arriendo con otros medios de prueba ante el tribunal."
    },
    {
      question: "¿Cómo recupero la garantía al terminar el arriendo?",
      answer: "El arrendador debe devolver la garantía al término del contrato si no hay deudas de servicios ni daños al inmueble más allá del desgaste normal. Si la retiene sin justificación, puedes demandar su devolución ante el tribunal civil competente. Es recomendable documentar el estado del inmueble con fotos al entrar y al salir."
    },
    {
      question: "¿Puedo ir a DICOM por deudas de arriendo?",
      answer: "No de forma automática. Para que una deuda de arriendo aparezca en DICOM o Equifax, el acreedor debe obtener primero una sentencia judicial que declare la deuda. El arrendador no puede reportarte directamente sin pasar por el proceso legal correspondiente."
    },
    {
      question: "¿Qué tribunal ve los conflictos de arriendo en Chile?",
      answer: "Los conflictos de arriendo en Chile son competencia de los Juzgados de Letras en lo Civil. A diferencia de los conflictos laborales o de familia, no existe un tribunal especializado en arrendamiento, por lo que los casos se tramitan en la justicia civil ordinaria."
    },
    {
      question: "¿Qué pasa si el arrendador no me hace contrato?",
      answer: "Si el arrendador se niega a formalizar el contrato por escrito, igualmente tienes derechos como arrendatario si puedes demostrar que existe una relación de arriendo. Guarda todos los comprobantes de pago. Sin contrato escrito, ambas partes quedan en una situación más vulnerable ante cualquier conflicto."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="Derecho de arrendamiento en Chile 2026: contrato, desalojo, IPC y qué hacer"
        description="¿Te pueden desalojar sin orden judicial? ¿Pueden subirte el arriendo? Conoce tus derechos, cómo funciona el contrato, la garantía, el IPC y qué hacer ante problemas de arriendo en Chile."
        image="/assets/derecho-arrendamiento-chile-2026.png"
        url="https://legalup.cl/blog/derecho-arrendamiento-chile-guia-completa-2026"
        datePublished="2026-04-15"
        dateModified="2026-04-15"
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

          <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-green-600 font-serif text-balance">
            Derecho de arrendamiento en Chile: guía completa 2026 (contrato, desalojo, garantía, IPC y derechos)
          </h1>

          <p className="text-xl max-w-3xl leading-relaxed">
            ¿Te pueden desalojar? ¿Pueden subirte el arriendo? Conoce tus derechos, cómo funciona el contrato y qué hacer si tienes un problema de arriendo en Chile.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>15 de Abril, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Tiempo de lectura: 16 min</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <BlogShare
            title="Derecho de arrendamiento en Chile: guía completa 2026"
            url="https://legalup.cl/blog/derecho-arrendamiento-chile-guia-completa-2026"
            showBorder={false}
          />

          <div className="prose prose-lg max-w-none mb-12 mt-8 text-gray-600 leading-relaxed">
            <p className="font-medium text-lg">
              El arriendo de propiedades en Chile es una de las relaciones legales más frecuentes, pero también una de las que más conflictos genera en la práctica.
            </p>
            <p>
              Desde desalojos por no pago, subidas de arriendo inesperadas, problemas con la garantía o contratos poco claros, miles de personas enfrentan situaciones legales sin saber exactamente cuáles son sus derechos.
            </p>
            <p>
              En esta guía completa 2026 te explicamos todo lo que necesitas saber sobre el derecho de arrendamiento en Chile: cómo funciona el contrato, cuándo pueden desalojarte, qué pasa si no pagas, cómo se aplica el IPC y qué hacer ante los problemas más comunes.
            </p>
            <div className="bg-green-50/50 border border-green-100 rounded-2xl p-8 mb-8 my-8">
              <p className="text-gray-900 font-bold leading-relaxed italic">
                Contar con información clara y actuar a tiempo es la mejor forma de evitar procesos judiciales largos y costosos que afecten tu tranquilidad y tu patrimonio.
              </p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué es el derecho de arrendamiento en Chile?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El arrendamiento es un contrato mediante el cual una persona (arrendador) entrega el uso de un inmueble a otra (arrendatario), a cambio de un pago periódico.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed font-bold">Este contrato regula aspectos clave como:</p>
            <div className="space-y-4 mb-8">
              {[
                "Uso del inmueble",
                "Pago del arriendo",
                "Duración del contrato",
                "Responsabilidades de cada parte",
                "Condiciones de término"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0">
                    {i + 1}
                  </div>
                  <p className="font-bold text-gray-900 leading-tight">{item}</p>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8 my-8">
              <p className="text-gray-700 leading-relaxed font-medium">
                En Chile, este tipo de contrato está regulado por normas civiles que buscan equilibrar los derechos de ambas partes, protegiendo tanto el derecho de propiedad del dueño como el derecho a la vivienda de quien arrienda.
              </p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Derechos del arrendatario en Chile: qué puedes exigir legalmente</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El arrendatario no solo paga el arriendo: también tiene derechos que deben ser respetados.
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-800">Derecho a usar la propiedad sin interferencias</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Es fundamental entender que una vez que firmas el contrato, la propiedad pasa a ser tu morada legal. Esto significa que el arrendador no tiene el derecho de entrar cuando quiera, incluso si es el dueño. Muchas personas creen que por ser los propietarios pueden revisar el estado de la casa en cualquier momento sin avisar, pero la ley chilena protege la privacidad del hogar. 
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Entrar sin autorización podría incluso constituir un delito de violación de morada en ciertos contextos. Además, prácticas comunes pero indebidas como las que verás a continuación, son totalmente contrarias a la ley:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                "Entrar al inmueble sin autorización previa",
                "Cambiar cerraduras para impedir el acceso",
                "Cortar de forma unilateral los servicios básicos"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <span className="text-gray-700 font-medium text-base">{item}</span>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8 my-8">
              <p className="text-red-900 font-bold uppercase tracking-widest text-xs mb-3">Acciones Prohibidas</p>
              <p className="text-gray-700 leading-relaxed font-medium italic">
                Si el arrendador intenta sacarte por la fuerza o limitar tus suministros para presionar un pago, está cometiendo una acción ilegal que puedes denunciar ante Carabineros o tribunales.
              </p>
            </div>
            
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link to="/blog/arrendador-puede-cambiar-cerradura-chile-2026" className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base">
                👉 ¿El arrendador puede cambiar la cerradura?
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <h3 className="text-xl font-bold mb-4 text-gray-800">Derecho a que se respete lo pactado en el contrato</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El contrato es ley para las partes. Esto significa que el arrendador no puede cambiar el valor del arriendo, los plazos de renovación ni las condiciones de uso de un día para otro solo porque cambió de opinión. Cualquier modificación debe ser discutida y acordada por ambos, idealmente plasmándola en un anexo de contrato firmado por los dos.
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-6 ml-4 font-bold">
              <li>El precio acordado mensualmente</li>
              <li>El plazo de vigencia y renovación establecido</li>
              <li>Las condiciones de mantención y uso pactadas originalmente</li>
            </ul>

            <h3 className="text-xl font-bold mb-4 text-gray-800">Derecho a no ser desalojado sin orden judicial</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">En Chile, nadie puede ser desalojado sin un proceso legal.</p>
            <p className="text-gray-600 mb-4 leading-relaxed font-bold">Esto significa que:</p>
            <div className="space-y-4 mb-8">
              {["Debe existir una demanda", "Un tribunal debe intervenir", "Debe dictarse una orden"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium text-base">{item}</span>
                </div>
              ))}
            </div>
            
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link to="/blog/me-quieren-desalojar-que-hago-chile-2026" className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base">
                👉 Guía práctica: ¿Qué hacer si te quieren desalojar?
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <h3 className="text-xl font-bold mb-4 text-gray-800">Derecho a recibir la garantía</h3>
            <p className="text-gray-600 mb-6 leading-relaxed italic">Si cumples con el contrato, la garantía debe devolverse.</p>
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link to="/blog/no-devuelven-garantia-arriendo-chile-2026" className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base">
                👉 No me devuelven la garantía de arriendo
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <InArticleCTA 
            message="¿Estás enfrentando un problema con tu arriendo y necesitas saber tus derechos?" 
            category="Derecho Inmobiliario"
          />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 border-t pt-8">Derechos del arrendador en Chile</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              El arrendador también tiene derechos importantes dentro del contrato.
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-800">Derecho a recibir el pago íntegro del arriendo</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Es el derecho principal del dueño. El pago debe realizarse en la fecha pactada (generalmente los primeros 5 o 10 días del mes). Si el arrendatario no cumple, el arrendador tiene la facultad legal de demandar el término del contrato y la restitución del inmueble. En Chile, el no pago de una sola renta ya es motivo suficiente para iniciar acciones legales ante los tribunales civiles.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-8 text-center text-xs font-bold uppercase">
              {["Exigir el pago retroactivo", "Iniciar acciones legales", "Solicitar el término y desalojo"].map((item, i) => (
                <div key={i} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  {item}
                </div>
              ))}
            </div>
            
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8 my-8">
              <p className="text-gray-900 font-bold text-lg mb-4 leading-tight">Nota para el arrendador</p>
              <p className="text-gray-700 font-medium leading-relaxed">
                Es fundamental entregar siempre un comprobante de pago o recibo oficial para acreditar el cumplimiento de la obligación y evitar disputas futuras sobre el estado de la cuenta.
              </p>
            </div>

            {/* <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link to="/blog/que-pasa-si-no-pago-arriendo-chile-2026" className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base">
                👉 ¿Qué pasa si no pago el arriendo en Chile?
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div> */}

            <h3 className="text-xl font-bold mb-4 text-gray-800">Derecho a recuperar la propiedad en buen estado</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El dueño tiene derecho a que el inmueble se devuelva en las mismas condiciones en que fue entregado, salvo el desgaste natural por el uso legítimo del tiempo. Si existen daños estructurales, roturas de vidrios, o daños en muros por mal uso, el arrendador puede exigir su reparación o descontarlo de la garantía al finalizar la relación.
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-800">Derecho a descontar de la garantía de forma justificada</h3>
            <p className="text-gray-600 leading-relaxed italic mb-12">
              Si existen cuentas de luz, agua o gastos comunes pendientes al momento de la entrega, el dueño tiene derecho legal a utilizar el mes de garantía para saldar esas deudas antes de devolver el saldo restante. Los descuentos deben estar siempre respaldados por facturas o presupuestos reales.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 border-t pt-8">Contrato de arriendo en Chile: qué debe incluir y por qué es clave</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El contrato de arriendo es la piedra angular de toda la relación legal entre un dueño y un inquilino. Aunque en Chile los contratos verbales tienen validez legal si se puede probar el pago de la renta, siempre es infinitamente mejor contar con un documento escrito y, de ser posible, firmado ante notario.
            </p>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Tener un contrato escrito no solo formaliza el acuerdo, sino que sirve como prueba irrefutable ante cualquier tribunal en caso de conflicto. Sin un papel firmado, cualquier disputa sobre el valor, los arreglos o las fechas de término se convierte en un problema de 'tu palabra contra la mía'.
            </p>

            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link
                to="/blog/contrato-de-arriendo-chile-2026"
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 Contrato de arriendo en Chile: modelo gratis y cláusulas clave
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <h3 className="text-xl font-bold mb-4 text-gray-800">Qué debe incluir un contrato de arriendo</h3>
            <p className="text-gray-600 mb-6 leading-relaxed font-bold italic">Un contrato bien hecho debería contener:</p>
            <div className="space-y-4 mb-10">
              {[
                "Identificación de las partes",
                "Dirección del inmueble",
                "Monto del arriendo",
                "Fecha de inicio y término",
                "Condiciones de pago",
                "Reglas de uso",
                "Cláusulas de término"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <span className="text-lg font-bold text-gray-900">{item}</span>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-bold mb-4 text-gray-800">¿Es obligatorio que el contrato sea escrito?</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Técnicamente no es obligatorio para que exista la relación de arriendo, pero la ley chilena establece que si el contrato no es escrito, se presumirá que la renta es la que declare el arrendatario. Esto pone al arrendador en una situación de debilidad si no tiene cómo demostrar el monto real.
            </p>
            <p className="text-gray-600 mb-6 font-bold leading-relaxed">Riesgos de no tener un contrato escrito:</p>
            <div className="grid sm:grid-cols-3 gap-4 mb-12 text-center text-xs font-bold uppercase text-red-900">
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center justify-center h-16">Dificultad extrema para probar condiciones específicas</div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center justify-center h-16">Imposibilidad de aplicar reajustes por IPC si no hay prueba</div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center justify-center h-16">Procesos judiciales mucho más largos y complejos</div>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden mb-12 my-8">
              <div className="bg-green-50 px-6 py-3 border-b border-gray-100 uppercase tracking-widest text-xs font-bold text-green-900">
                Evidencia de arriendo
              </div>
              <div className="p-8">
                <p className="text-gray-700 font-medium italic mb-6">
                  "Si no existe contrato por escrito, se presumirá que la renta es la que declare el arrendatario." — Riesgo crítico para el dueño.
                </p>
                <div className="space-y-3">
                  {["Guarda transferencias bancarias", "Mantén registros de WhatsApp", "Pide recibos siempre"].map((t, i) => (
                    <div key={i} className="flex items-center gap-3 text-gray-700 font-bold">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 border-t pt-8">Término del contrato de arriendo</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Poner fin a un contrato no siempre es tan sencillo como entregar las llaves. Existen procedimientos legales que deben respetarse para evitar que el contrato se considere vigente de forma indefinida o para evitar demandas por abandono injustificado.
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-800">Causales de término más frecuentes</h3>
            <p className="text-gray-600 mb-6 leading-relaxed font-bold italic">
              Un contrato generalmente termina por alguna de estas tres vías:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-8 ml-4 font-medium">
              <li>Cumplimiento del plazo establecido (llegó la fecha de término).</li>
              <li>Mutuo acuerdo entre las partes (resiliación del contrato).</li>
              <li>Incumplimiento de las cláusulas (principalmente por no pago).</li>
            </ul>

            <h3 className="text-xl font-bold mb-4 text-gray-800">Incumplimiento</h3>
            <p className="text-gray-600 mb-4 leading-relaxed font-bold">Por ejemplo:</p>
            <div className="grid sm:grid-cols-3 gap-4 mb-8 text-center text-xs uppercase font-bold">
              {["No pago de arriendo", "Daños a la propiedad", "Uso indebido"].map(t => (
                <div key={t} className="bg-gray-50 p-4 rounded-xl border border-gray-200">{t}</div>
              ))}
            </div>

            <h3 className="text-xl font-bold mb-4 text-gray-800">¿Qué es la Tácita Reconducción?</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Este es un concepto que genera mucha confusión en Chile. La tácita reconducción ocurre cuando el contrato llega a su fecha de término, pero el arrendatario se queda en la propiedad con el consentimiento del dueño y sigue pagando el arriendo como si nada hubiera pasado. 
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si el arrendador recibe el pago sin oponerse, la ley entiende que el contrato se ha renovado automáticamente bajo las mismas condiciones originales, pero ahora con una duración indefinida. Para evitar esto, es fundamental notificar el término del contrato con la anticipación que el documento indique (generalmente 30, 60 o 90 días).
            </p>
            
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link to="/blog/tacita-reconduccion-chile-2026" className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base">
                👉 Tácita reconducción: Riesgos y soluciones
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 pt-4">Desalojo en Chile: ¿cómo funciona realmente el proceso legal?</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Uno de los mitos más grandes en el derecho de arrendamiento es que el dueño de casa puede sacar a un arrendatario que no paga de un día para otro. Muchas personas se ven enfrentadas a amenazas de que les van a sacar las cosas a la calle o les van a cambiar la chapa "mañana mismo".
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-800">No es inmediato ni por cuenta propia</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Es vital saber que cualquier intento de desalojo por cuenta propia es totalmente ilegal en Chile. El desalojo —o lanzamiento, como se le conoce jurídicamente— solo puede ser ejecutado mediante el auxilio de Carabineros y con una orden firmada por un juez. Ningún dueño, por mucha razón que tenga en la deuda, puede entrar a la fuerza.
            </p>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8 my-8">
                <p className="text-red-900 font-bold uppercase tracking-widest text-xs mb-3">Riesgo de autotutela</p>
                <p className="text-gray-700 font-bold text-lg leading-tight mb-2">La justicia por mano propia está prohibida.</p>
                <p className="text-gray-600 leading-relaxed font-medium">
                  El dueño podría terminar siendo el demandado o enfrentar cargos penales si actúa de forma agresiva o impide el acceso sin orden de un tribunal.
                </p>
            </div>

            <h3 className="text-xl font-bold mb-6 text-gray-900">El proceso judicial paso a paso</h3>
            <p className="text-gray-600 mb-8 leading-relaxed italic">
              El desalojo es la etapa final de un juicio de arrendamiento. No ocurre al principio, sino después de que un tribunal ha analizado todas las pruebas:
            </p>
            <div className="space-y-4 mb-8">
              {[
                { title: "Demanda judicial", desc: "El arrendador debe presentar una demanda ante el tribunal correspondiente solicitando el término del contrato y la restitución del inmueble. Aquí se exponen los motivos, como el no pago del arriendo o el incumplimiento del contrato." },
                { title: "Notificación", desc: "El tribunal ordena notificar al arrendatario sobre la demanda. Esto es fundamental, ya que permite que la persona conozca el proceso y pueda defenderse. Sin notificación válida, el proceso no puede avanzar correctamente." },
                { title: "Audiencia", desc: "Se realiza una audiencia donde ambas partes pueden presentar sus argumentos y pruebas. En esta etapa, el arrendatario puede oponerse, explicar su situación o intentar llegar a un acuerdo." },
                { title: "Resolución", desc: "El juez analiza los antecedentes y dicta una resolución. Puede ordenar el desalojo si se acredita el incumplimiento, o rechazar la demanda si no existen fundamentos suficientes." },
                { title: "Orden de lanzamiento", desc: "Si se ordena el desalojo, se fija una fecha para la restitución del inmueble. En caso de no cumplirse voluntariamente, puede intervenir la fuerza pública para ejecutar el lanzamiento." }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900 mb-1 leading-tight">{item.title}</p>
                    <p className="text-base text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-gray-700 font-bold mb-8 italic">Este proceso puede tardar varios meses, por lo que es importante que ambas partes entiendan que los conflictos no se resuelven "a la fuerza", sino a través del sistema judicial civil.</p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Muchas veces, una mediación temprana o una comunicación abierta entre arrendador y arrendatario puede evitar llegar a estas instancias legales desgastantes tanto psicológica como económicamente.
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-800">¿Cuánto demora un desalojo en Chile?</h3>
            <p className="text-gray-600 mb-6 leading-relaxed font-bold">Depende del caso, pero puede tomar:</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-8 text-center text-xs font-bold uppercase">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">Varios meses</div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">Incluso más de un año</div>
            </div>
            
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link to="/blog/cuanto-demora-juicio-desalojo-chile-2026" className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base">
                👉 Tiempos reales: ¿Cuánto demora un desalojo?
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden mb-12 my-8">
               <div className="bg-amber-50 px-6 py-3 border-b border-gray-100 uppercase tracking-widest text-xs font-bold text-amber-900">
                  Línea de tiempo judicial
               </div>
               <div className="p-8">
                  <div className="space-y-4">
                    {[
                      "Etapa 1: Notificación formal de la demanda",
                      "Etapa 2: Audiencia de prueba y defensa",
                      "Etapa 3: Sentencia judicial definitiva"
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3 text-gray-700 italic font-medium">
                        <Clock className="h-5 w-5 text-amber-600" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-8 bg-white border border-red-100 p-4 rounded-xl text-red-600 font-bold text-sm">
                    ⚠️ El proceso NO es inmediato ni automático. Requiere orden judicial.
                  </p>
               </div>
            </div>
          </div>

          <InArticleCTA 
            message="¿Te enfrentas a un desalojo o amenaza de desalojo? Un abogado puede ayudarte a defenderte." 
            category="Derecho Civil"
          />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 border-t pt-8">Subida de arriendo: ¿cuándo es legal y cómo se aplica el IPC?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El precio del arriendo no es algo que el dueño pueda cambiar a su antojo o según lo que dicte el mercado del barrio en ese momento. Una vez que se firma el contrato, el valor de la renta —y las condiciones bajo las cuales puede subir— quedan "congeladas" en el documento.
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-800">¿Se puede subir el arriendo unilateralmente?</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              La respuesta corta es NO. El arrendador solo puede aplicar reajustes si existe una cláusula específica que lo autorice. Si el contrato dice que el arriendo es de $500.000 y no menciona mecanismos de reajuste, el valor debe mantenerse idéntico hasta que el contrato termine o se firme uno nuevo. 
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-800">El reajuste por IPC (Índice de Precios al Consumidor)</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Esta es la forma más común y justa de reajuste en Chile. Permite que el valor del arriendo no pierda su poder adquisitivo debido a la inflación. En los contratos estándar, se establece un reajuste cada 3, 6 o 12 meses basado en la variación del IPC reportada por el Instituto Nacional de Estadísticas (INE).
            </p>
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link to="/blog/reajuste-arriendo-ipc-chile-2026" className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base">
                👉 Reajuste por IPC: Cómo se calcula legalmente
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden mb-12 my-8">
               <div className="bg-green-50 px-6 py-3 border-b border-gray-100 uppercase tracking-widest text-xs font-bold text-green-900">
                  Legalidad del reajuste
               </div>
               <div className="p-8">
                  <p className="text-gray-700 font-medium italic mb-4">
                    Para que el reajuste sea válido, debe estar estipulado en el contrato original.
                  </p>
                  <p className="bg-green-50 p-4 rounded-xl text-green-800 font-bold inline-block">
                    ✓ Respaldo contractual = Reajuste legal
                  </p>
               </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 border-t pt-8">Garantía de arriendo: retos y problemas frecuentes</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El mes de garantía es, sin duda, el mayor punto de conflicto al término de un contrato en Chile. Legalmente, la garantía tiene un solo propósito: asegurar el pago de rentas, deudas de servicios (luz, agua, gas) y reparaciones menores por daños que no sean el desgaste natural por el uso legítimo del tiempo.
            </p>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Lamentablemente, existe la mala práctica de algunos arrendadores de no devolver la garantía bajo cualquier pretexto, o de algunos arrendatarios de no pagar el último mes para "cobrarse" la garantía por adelantado. Ambas acciones son jurídicamente incorrectas y pueden generar conflictos legales adicionales.
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-800">Uso correcto de la garantía</h3>
            <p className="text-gray-600 mb-6 leading-relaxed font-bold italic">El monto entregado al inicio del contrato sirve para:</p>

            <h3 className="text-xl font-bold mb-4 text-gray-800">Para qué sirve</h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-8 text-center text-xs font-bold uppercase">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">Cubrir daños</div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">Cubrir deudas</div>
            </div>

            <h3 className="text-xl font-bold mb-4 text-gray-800">¿Cuándo deben devolverla?</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El arrendador debe liquidar la garantía (idealmente mediante un acta de entrega del inmueble) y devolver el saldo restante en el plazo que indique el contrato, el cual suele ser de entre 15 y 30 días después de la restitución de la propiedad. Este plazo es necesario para que el dueño verifique que no llegaron cuentas de servicios básicas pendientes.
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-800">Problema común</h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-8 text-center text-xs font-bold uppercase text-red-900">
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">No devolución</div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">Descuentos sin respaldo</div>
            </div>
            
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link to="/blog/no-devuelven-garantia-arriendo-chile-2026" className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base">
                👉 No me devuelven la garantía de arriendo
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden mb-12 my-8">
               <div className="bg-amber-50 px-6 py-3 border-b border-gray-100 uppercase tracking-widest text-xs font-bold text-amber-900">
                  Uso de la garantía
               </div>
               <div className="p-8">
                  <p className="text-gray-700 font-medium italic mb-4">
                    La garantía solo puede usarse para daños comprobables o deudas de servicios pendientes.
                  </p>
                  <p className="bg-red-50 p-4 rounded-xl text-red-600 font-bold inline-block">
                    ⚠️ Retenerla sin respaldo es una práctica ilegal.
                  </p>
               </div>
            </div>
          </div>
          
          <InArticleCTA 
            message="¿Tienes problemas con la garantía de arriendo o no te la quieren devolver? Habla con un especialista." 
            category="Derecho Inmobiliario"
          />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 border-t pt-8">Deudas de arriendo y DICOM: ¿te pueden boletear?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Hay mucha desinformación sobre si una deuda de arriendo puede terminar en el boletín comercial (DICOM). En Chile 2026, las reglas son claras pero estrictas para los acreedores.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Para que una deuda de arriendo aparezca en DICOM o Equifax de forma legítima, debe existir una sentencia judicial ejecutoriada que la acredite. El arrendador no puede simplemente ir a una oficina de información comercial y subir tus datos por su cuenta sin un proceso legal previo que haya terminado con una orden de pago.
            </p>
            
            <h3 className="text-xl font-bold mb-4 text-gray-800">Cuándo la deuda se vuelve pública</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Una vez que existe el fallo definitivo del juez, la deuda se vuelve un antecedente comercial público. A partir de ese momento, sí puede afectar seriamente tu historial financiero.
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-800">Ejemplo</h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-8 text-center text-xs font-bold uppercase">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">Deuda informal → no va directo</div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">Deuda con juicio → posible</div>
            </div>

            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link to="/blog/dicom-deuda-arriendo-chile-2026" className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base">
                👉 ¿Puedes ir a DICOM? Lo que dice la ley en 2026
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 pt-2">¿Qué pasa si no pago el arriendo?</h2>
            <h3 className="text-xl font-bold mb-4 text-gray-800">Consecuencias</h3>
            <div className="grid sm:grid-cols-3 gap-4 mb-8 text-center text-xs font-bold uppercase text-red-700">
                {["Demanda", "Desalojo", "Cobro de deuda"].map(c => (
                  <div key={c} className="bg-red-50 p-4 rounded-xl border border-red-100">{c}</div>
                ))}
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden mb-12 my-8">
               <div className="bg-gray-900 px-6 py-3 border-b border-gray-800 uppercase tracking-widest text-xs font-bold text-white">
                  Consecuencia del no pago
               </div>
               <div className="p-8">
                  <p className="text-gray-700 font-medium italic mb-6">
                    El atraso recurrente habilita al dueño a pedir el término del contrato y el desalojo forzado.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {["Corte de suministros (ilegal)", "Demanda judicial (legal)", "Notificación de deuda"].map((t, i) => (
                      <div key={i} className="bg-white p-3 rounded-xl border border-gray-100 text-gray-700 font-bold text-sm">
                        {t}
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 border-t pt-8">Gastos comunes en arriendo: ¿quién los paga y qué pasa si no se pagan?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Los gastos comunes suelen ser uno de los motivos de roce más frecuentes entre dueños e inquilinos. En términos generales y según la ley de copropiedad en Chile, existe una distinción clave que debe quedar clara en el contrato para evitar disputas.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Los <strong>gastos comunes ordinarios</strong> (administración, mantención, sueldos de conserjes, insumos de limpieza) corresponden siempre al arrendatario. Por otro lado, los <strong>gastos comunes extraordinarios</strong> (mejoras estructurales del edificio, reparaciones de fachada, reposición de activos o aportes al fondo de reserva por obras mayores) deben ser costeados por el propietario, ya que incrementan el valor del patrimonio del inmueble.
            </p>
            <h3 className="text-xl font-bold mb-4 text-gray-800">¿Qué pasa si no se pagan?</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si el arrendatario no paga los gastos comunes, la administración del edificio informará directamente al dueño, quien es el responsable legal final ante la comunidad. El no pago de estos gastos constituye un incumplimiento grave del contrato de arriendo que permite al arrendador solicitar el término anticipado de la relación y el desalojo.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 border-t pt-8">Daños en la propiedad: quién responde y qué se puede cobrar</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Es natural y esperable que una propiedad sufra desgaste por el simple paso del tiempo (pintura que se gasta un poco, piso que pierde su brillo original). El arrendatario <strong>no debe pagar</strong> por este desgaste natural, ya que es parte de lo que cubre el pago mensual del arriendo.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Sin embargo, si existen daños que van más allá del uso normal —como vidrios quebrados, puertas golpeadas, manchas de humedad evitables por negligencia o artefactos de cocina rotos por mal uso— el arrendatario debe responder económicamente. Estos costos suelen descontarse de la garantía al momento de la entrega de llaves.
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-800">Qué se puede cobrar y qué no</h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-8 text-center text-xs font-bold uppercase">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">Daños por mal uso → Sí corresponde cobrar</div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">Desgaste natural → No corresponde cobrar</div>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden mb-12 my-8">
               <div className="bg-green-50 px-6 py-3 border-b border-gray-100 uppercase tracking-widest text-xs font-bold text-green-900">
                  Responsabilidad por daños
               </div>
               <div className="p-8">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100">
                      <p className="text-gray-400 uppercase tracking-widest text-[10px] font-bold mb-2">ARRENDADOR</p>
                      <p className="text-gray-900 font-bold text-sm">Desgaste natural y mantenciones estructurales.</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100">
                      <p className="text-gray-400 uppercase tracking-widest text-[10px] font-bold mb-2">ARRENDATARIO</p>
                      <p className="text-gray-900 font-bold text-sm">Daños por mal uso, negligencia o accidentes.</p>
                    </div>
                  </div>
               </div>
            </div>
          </div>

          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-8 text-gray-900">Artículos relacionados que te pueden ayudar</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                // { title: "¿Qué pasa si no pago el arriendo en Chile?", id: "que-pasa-si-no-pago-arriendo-chile-2026" },
                // { title: "¿Cuántos meses debo para que me desalojen?", id: "cuantos-meses-debo-para-desalojo-chile-2026" },
                { title: "Reajuste de arriendo según IPC en Chile", id: "reajuste-arriendo-ipc-chile-2026" },
                { title: "¿Me pueden meter a DICOM por arriendo?", id: "dicom-deuda-arriendo-chile-2026" },
                { title: "Tácita reconducción en Chile", id: "tacita-reconduccion-chile-2026" },
                { title: "¿Me pueden desalojar sin orden judicial?", id: "me-quieren-desalojar-que-hago-chile-2026" }
              ].map((art, i) => (
                <Link key={i} to={`/blog/${art.id}`} className="group flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-green-50 hover:border-green-200 transition-all">
                  <span className="text-gray-700 font-bold text-sm group-hover:text-green-900">{art.title}</span>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-green-600" />
                </Link>
              ))}
            </div>
            <p className="text-gray-500 text-sm italic mt-6">Estos artículos profundizan en cada situación específica y te permiten entender mejor tu caso.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 border-t pt-8">Casos reales frecuentes en Chile</h2>
            <div className="bg-green-50 p-6 rounded-2xl border border-green-200 shadow-sm">
              <div className="space-y-4">
                {[
                  "No devolución de garantía",
                  "Desalojo por no pago",
                  "Subida indebida de arriendo",
                  "Conflictos sin contrato",
                  "Amenazas con DICOM"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-green-900 font-bold text-base leading-tight">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuándo necesitas un abogado por un problema de arriendo?</h2>
            <p className="text-gray-600 mb-8 leading-relaxed font-medium">
              No todos los conflictos requieren acciones legales inmediatas, pero hay situaciones donde es clave asesorarse:
            </p>
            <div className="grid sm:grid-cols-1 gap-3 mb-8">
              {[
                "Si te demandaron por no pago de arriendo",
                "Si enfrentas un desalojo",
                "Si no te devuelven la garantía",
                "Si el arrendador actúa de forma ilegal",
                "Si hay montos importantes en disputa"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                    <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <span className="text-gray-700 font-bold text-base">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-700 font-medium leading-relaxed italic border-l-4 border-green-500 pl-4 py-2 bg-green-50/50 rounded-r-lg">
              Un abogado puede ayudarte a evaluar tu caso, evitar errores y tomar decisiones que protejan tu situación legal desde el inicio.
            </p>
          </div>

          <InArticleCTA 
            message="¿Necesitas un abogado para resolver tu problema de arriendo? Conecta con un especialista ahora." 
            category="Derecho Inmobiliario"
          />

          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Qué hacer ante un problema de arriendo</h2>
            <div className="space-y-4">
              {[
                { title: "Revisar el contrato", desc: "Verificar cláusulas y condiciones pactadas.", icon: <FileText className="h-5 w-5" /> },
                { title: "Reunir pruebas", desc: "Comprobantes de pago, fotos y comunicaciones.", icon: <Search className="h-5 w-5" /> },
                { title: "Intentar solución", desc: "Comunicación formal previa a la vía judicial.", icon: <MessageSquare className="h-5 w-5" /> },
                { title: "Buscar asesoría legal", desc: "Consultar con expertos antes de tomar decisiones críticas.", icon: <Shield className="h-5 w-5" /> }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                  <div className="bg-gray-900 p-2 rounded-lg text-white font-bold text-base w-9 h-9 flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 block text-lg">{item.title}</span>
                    <p className="text-base text-gray-600 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <div className="prose prose-lg max-w-none text-gray-600 text-base font-medium space-y-4 leading-relaxed italic">
              <p>
                El derecho de arrendamiento en Chile es mucho más que un simple acuerdo entre dos personas. Es una relación legal que, cuando no se entiende bien, puede generar conflictos importantes como desalojos, pérdidas económicas, problemas con la garantía o incluso procesos judiciales largos y desgastantes.
              </p>
              <p>
                A lo largo de esta guía viste que muchas de las situaciones más comunes —como el no pago del arriendo, las subidas de precio, la tácita reconducción o las amenazas con DICOM— no siempre funcionan como las personas creen. Existen reglas claras, pero también muchos mitos que terminan perjudicando tanto a arrendatarios como a arrendadores.
              </p>
              <p>
                Por eso, la clave está en anticiparse. Revisar el contrato, entender tus derechos, documentar cualquier problema y actuar a tiempo puede marcar una gran diferencia entre resolver un conflicto rápidamente o enfrentar un proceso legal complejo.
              </p>
              <p>
                Además, es importante entender que cada caso es distinto. Aunque esta guía te da una base sólida, muchas situaciones requieren un análisis específico según el contrato, las pruebas disponibles y el comportamiento de ambas partes.
              </p>
              <p className="text-gray-900 font-bold not-italic">
                Si estás enfrentando un problema de arriendo —ya sea como arrendatario o arrendador— no esperes a que escale. Tomar decisiones informadas desde el inicio es la mejor forma de proteger tu situación legal y evitar consecuencias mayores.
              </p>
              <p className="text-gray-900 font-bold not-italic">
                En un contexto donde los conflictos de arriendo son cada vez más frecuentes en Chile, contar con información clara y actuar a tiempo no solo evita problemas: puede ahorrarte meses de estrés y costos innecesarios.
              </p>
            </div>
          </div>

          <div className="mb-6 pt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 pt-2">Preguntas frecuentes</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-bold mb-2 text-gray-900 leading-tight">{faq.question}</h3>
                  <p className="text-gray-600 font-medium leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="bg-white rounded-xl shadow-sm p-8 text-center border max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 font-serif">
            ¿Tienes un problema de arriendo en Chile?
          </h2>
          <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto leading-relaxed">
            Habla con un abogado experto y recibe orientación clara sobre tu caso hoy mismo. En LegalUp conectamos a personas con abogados especialistas para resolver conflictos de forma inmediata.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/consulta">
              <Button
                size="lg"
                className="bg-gray-900 hover:bg-green-900 text-white px-8 py-3 w-full sm:w-auto shadow-md"
              >
                Consultar con Abogado Ahora
              </Button>
            </Link>
            <Link to="/search?category=Arrendamiento">
              <Button
                variant="outline"
                size="lg"
                className="border-gray-600 text-gray-600 hover:bg-green-900 hover:text-white px-8 py-3 w-full sm:w-auto"
              >
                Ver Abogados de Arriendo
              </Button>
            </Link>
          </div>
        </section>
      </div>

      <RelatedLawyers category="Derecho Civil" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare
            title="Derecho de arrendamiento en Chile: guía completa 2026"
            url="https://legalup.cl/blog/derecho-arrendamiento-chile-guia-completa-2026"
          />
        </div>

        <BlogNavigation
          prevArticle={{
            id: "tacita-reconduccion-chile-2026",
            title: "Tácita reconducción en Chile: qué es y qué pasa si sigues arrendando sin contrato (Guía 2026)",
            excerpt: "Si tu contrato de arriendo terminó pero sigues pagando y viviendo ahí, entraste en tácita reconducción. Descubre tus derechos.",
            image: "/assets/tacita-reconduccion-chile-2026.png"
          }}
          nextArticle={{
            id: "contrato-de-arriendo-chile-2026",
            title: "Contrato de arriendo en Chile: modelo gratis, cláusulas clave y errores que debes evitar (Guía 2026)",
            excerpt: "Firmar un contrato de arriendo es uno de los pasos más importantes al arrendar en Chile. Descubre qué debe incluir y qué errores evitar.",
            image: "/assets/contrato-arriendo-chile-2026.png"
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
      <BlogConversionPopup category="Derecho Inmobiliario" topic="derecho-arrendamiento" />
    </div>
  );
};

export default BlogArticle;
