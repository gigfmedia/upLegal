import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, User, Clock, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import CategoryCTA from "@/components/blog/CategoryCTA";
import InArticleCTA from "@/components/blog/InArticleCTA";
import { ReadTime } from "@/components/blog/ReadTime";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

const BlogArticle = () => {
  const faqs = [
    { question: "¿Qué es la nulidad de un contrato en Chile?", answer: "Es la sanción que declara sin efecto un contrato celebrado con vicios en sus requisitos: falta de voluntad, objeto ilícito, causa ilícita o inobservancia de solemnidades. Puede ser absoluta (el acto no produce efectos) o relativa (anulable a petición del afectado)." },
    { question: "¿Cuál es la diferencia entre nulidad y resolución?", answer: "Nulidad ataca la validez inicial: el contrato nació mal (vicio de consentimiento, objeto ilícito). Resolución ataca el cumplimiento posterior: el contrato nació bien pero una parte no cumplió y la otra pide terminarlo. Son acciones distintas con plazos distintos." },
    { question: "¿Qué es la nulidad absoluta y la relativa?", answer: "Absoluta: vicio grave (objeto/causa ilícita, falta de solemnidad). La puede pedir cualquier interesado y el juez puede declararla de oficio; no se sanea por tiempo (10 años). Relativa: vicio del consentimiento (error, fuerza, dolo) o incapacidad. Solo la víctima y prescribe en 4 años." },
    { question: "¿Cuánto plazo tengo para demandar nulidad?", answer: "Nulidad absoluta: 10 años. Nulidad relativa: 4 años desde que cesa el vicio (ej. desde que conociste el dolo). La resolución también prescribe en 5 años. Los plazos se cuentan desde la celebración o el incumplimiento." },
    { question: "¿Qué efectos tiene la nulidad?", answer: "Declarada la nulidad, las partes deben restituirse lo recibido con frutos e intereses, como si el contrato nunca hubiera existido. Si no pueden restituir, hay indemnización." },
    { question: "¿Puedo pedir nulidad y al mismo tiempo indemnización?", answer: "Sí. Puedes pedir nulidad más indemnización de los perjuicios causados por el vicio (daño emergente, lucro cesante, daño moral si hubo dolo). El tribunal analiza cada partida." },
    { question: "¿Necesito abogado para demandar nulidad?", answer: "Sí, es juicio ordinario ante Juzgado Civil con patrocinio obligatorio. Un abogado evalúa si tu caso es nulidad, resolución o rescisión y elige la acción correcta, porque demandar la equivocada es perder el juicio." },
    { question: "¿Qué pruebas sirven para la nulidad?", answer: "El contrato, correos previos, mensajes que prueben dolo o presión, certificados, informes periciales y testigos que acrediten el error o la fuerza. La prueba del vicio es la clave." },
  ];

  return (
    <div className="min-h-screen bg-white">
      <BlogGrowthHacks
        title="Nulidad de contrato en Chile 2026: qué es, tipos y cómo demandar"
        description="Nulidad de contrato en Chile 2026: qué es, nulidad absoluta vs relativa, diferencias con resolución, plazos, efectos y cómo demandar paso a paso."
        image="/assets/nulidad-contrato-chile-2026.png"
        url="https://legalup.cl/blog/nulidad-contrato-chile-2026"
        datePublished="2026-08-21"
        dateModified="2026-08-21"
        faqs={faqs}
      />
      <Header onAuthClick={() => {}} />
      <ReadingProgressBar />

      <div className="bg-[#f4efdf] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 mb-4 text-green-500"><Link to="/blog" className="hover:text-green-900 transition-colors">Blog</Link><ChevronRight className="h-4 w-4" /><span>Artículo</span></div>
          <h1 className="text-3xl sm:text-4xl font-bold text-green-900 font-serif mb-6">Nulidad de contrato en Chile 2026: qué es, tipos y cómo demandar</h1><div className="bg-white backdrop-blur-sm border rounded-2xl p-6 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-4">Resumen rápido</p>
            <ul className="space-y-2 text-green-900">
              {[
                "Nulidad ataca validez inicial; resolución ataca incumplimiento posterior.",
                "Absoluta: vicio grave, la pide cualquiera, 10 años. Relativa: vicio de consentimiento, solo la víctima, 4 años.",
                "Efecto: se deshace el contrato y se restituye lo pagado/entregado.",
                "Se demanda en juicio ordinario civil con abogado.",
                "Elegir mal la acción (nulidad vs resolución) es perder el juicio.",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3"><span className="text-green-500 font-medium">✓</span><span className="text-sm sm:text-base">{item}</span></li>
              ))}
            </ul>
          </div>
          <p className="text-xl max-w-3xl text-green-900">Firmaste un contrato y luego descubriste que te engañaron, que el objeto era ilegal o que te forzaron a firmar. En Chile no todo contrato firmado es válido. La nulidad es la herramienta para borrarlo y recuperar lo entregado.</p>
          <div className="flex flex-wrap items-center gap-4 mt-6 text-green-900">
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>21 de Agosto, 2026</span></div>
            <div className="flex items-center gap-2"><User className="h-4 w-4" /><span>Equipo LegalUp</span></div>
            <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><ReadTime slug="nulidad-contrato-chile-2026" /></div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
        <div className="bg-white border sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare title="Nulidad de contrato en Chile 2026" url="https://legalup.cl/blog/nulidad-contrato-chile-2026" showBorder={false} />

          <div className="prose prose-lg max-w-none mb-8">
            <p className="text-lg text-gray-600 leading-relaxed">El Código Civil exige cuatro requisitos para que un contrato valga: consentimiento sin vicios, objeto lícito, causa lícita y, en algunos casos, solemnidad. Si falta uno, el contrato nace enfermo y la ley permite anularlo. Esa es la nulidad.</p>
            <p className="text-gray-600 mt-4">Esta guía 2026 explica qué es nulidad, tipos, diferencias con resolución, plazos, efectos y cómo demandar. Distinguir nulidad de resolución es la mitad del juicio.</p>
            <p className="text-gray-600 mt-4">Si tu problema es de pago, revisa <Link to="/blog/como-cobrar-deuda-legalmente-chile-2026" className="text-green-700 underline">cómo cobrar una deuda</Link>, <Link to="/blog/contrato-compraventa-chile-2026" className="text-green-700 underline">contrato de compraventa</Link> y <Link to="/blog/cesion-de-derechos-chile-2026" className="text-green-700 underline">cesión de derechos</Link>.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿Qué es la nulidad? Los 4 requisitos que valida el juez</h2>
            <p className="text-gray-600 mb-4">Un contrato válido necesita:</p>
            <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
              {[
                "Consentimiento: voluntad libre, sin error, fuerza ni dolo.",
                "Objeto lícito: no puede ser cosa ilícita o fuera del comercio.",
                "Causa lícita: motivo no puede ser ilícito.",
                "Solemnidad: escritura pública si la ley la exige (ej. compraventa de inmueble).",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3"><span className="text-green-600 flex-shrink-0">✓</span><span className="text-gray-700 font-bold">{item}</span></li>
              ))}
            </ul>
            <p className="text-gray-600 mt-4">Si falla uno, el acto es nulo. La gravedad del fallo define si es nulidad absoluta o relativa.</p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl mt-4">
              <p className="font-bold text-blue-900">Resumen clave</p>
              <p className="text-blue-800">Nulidad de contrato en Chile = sanción que deja sin efecto el contrato por vicios iniciales (art. 1681 CC). Absoluta: objeto/causa ilícita (10 años). Relativa: error/fuerza/dolo (4 años).</p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Nulidad absoluta vs relativa vs Resolución: tabla clave</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Figura</th><th className="border border-gray-300 p-3">Cuándo</th><th className="border border-gray-300 p-3">Quién demanda</th><th className="border border-gray-300 p-3">Plazo</th></tr></thead>
                <tbody>
                  <tr><td className="border border-gray-300 p-3 font-bold">Nulidad absoluta</td><td className="border border-gray-300 p-3">Objeto/causa ilícita, falta solemnidad</td><td className="border border-gray-300 p-3">Cualquiera con interés + juez de oficio</td><td className="border border-gray-300 p-3">10 años</td></tr>
                  <tr><td className="border border-gray-300 p-3 font-bold">Nulidad relativa</td><td className="border border-gray-300 p-3">Error, fuerza, dolo, incapacidad</td><td className="border border-gray-300 p-3">Solo la víctima</td><td className="border border-gray-300 p-3">4 años</td></tr>
                  <tr><td className="border border-gray-300 p-3 font-bold">Resolución</td><td className="border border-gray-300 p-3">Incumplimiento posterior</td><td className="border border-gray-300 p-3">El cumplidor</td><td className="border border-gray-300 p-3">5 años</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <RelatedLawyers category="Derecho Civil" />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Casos típicos de nulidad en Chile</h2>
            <div className="space-y-4">
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">Venta de inmueble sin escritura pública</h3><p className="text-gray-600 mt-2">Compraste una casa con contrato privado. Es nulo absoluto por falta de solemnidad: necesitas escritura e inscripción. Debes demandar nulidad y repetir la venta bien.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">Contrato firmado con dolo</h3><p className="text-gray-600 mt-2">Te ocultaron que el auto era pérdida total. Firmaste por error inducido: es dolo que vicia tu consentimiento → nulidad relativa. Pide nulidad + indemnización.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">Fuerza para firmar pagaré</h3><p className="text-gray-600 mt-2">Te amenazaron para firmar un pagaré. Es fuerza → nulidad relativa. Prueba la amenaza con mensajes y testigos.</p></div>
            </div>
          </div>

          <InArticleCTA category="Derecho Civil" title="¿Firmaste un contrato con vicios?" message="Un abogado civil revisa si tu caso es nulidad o resolución y demanda la restitución de lo pagado." />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Cómo demandar nulidad paso a paso</h2>
            <div className="space-y-4">
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">1. Califica la acción</h3><p className="text-gray-600 mt-2">Tu abogado define si es nulidad absoluta, relativa o si en realidad es resolución. Demandar la equivocada es perder.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">2. Reúne prueba del vicio</h3><p className="text-gray-600 mt-2">Contrato original, correos que prueban dolo, peritaje de firma, testigos de la fuerza. Sin prueba del vicio, no hay nulidad.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">3. Demanda en Juzgado Civil</h3><p className="text-gray-600 mt-2">Juicio ordinario, patrocinio obligatorio. Pides nulidad + restitución + indemnización si hubo dolo.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">4. Restitución</h3><p className="text-gray-600 mt-2">Declarada la nulidad, cada parte devuelve lo recibido con intereses y frutos. Si vendiste un bien nulo a tercero de buena fe, puede ser inoponible.</p></div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Qué documentos necesitas</h2>
            <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
              {[
                "Contrato impugnado y sus anexos firmados.",
                "Comunicaciones previas: WhatsApp, mails que prueben dolo o presión.",
                "Certificados: Conservador, SII, Registro Civil según el contrato.",
                "Peritajes: caligráfico, mecánico, contable si aplica.",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3"><span className="text-green-600 flex-shrink-0">✓</span><span className="text-gray-700 font-bold">{item}</span></li>
              ))}
            </ul>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Casos prácticos</h2>
            <div className="space-y-4">
              <div className="bg-gray-50 p-5 rounded-xl border"><h3 className="font-bold">Compraventa privada de casa</h3><p className="text-gray-600 mt-2">Firmaste promesa privada y pagaste $10M. El vendedor se arrepiente. Demandas nulidad absoluta por falta de solemnidad + restitución de los $10M con reajuste.</p></div>
              <div className="bg-gray-50 p-5 rounded-xl border"><h3 className="font-bold">Préstamo con dolo</h3><p className="text-gray-600 mt-2">Te prestó un familiar y te hizo firmar pagaré en blanco. Es dolo: nulidad relativa dentro de 4 años + devolución del exceso pagado.</p></div>
              <div className="bg-gray-50 p-5 rounded-xl border"><h3 className="font-bold">Incumplimiento no es nulidad</h3><p className="text-gray-600 mt-2">Compraste materiales y no te entregaron. El contrato nació bien, falló el cumplimiento: es resolución, no nulidad. Pides terminación + indemnización.</p></div>
            </div>
          </div>

          
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿Cuándo conviene resolución en vez de nulidad?</h2>
            <p className="text-gray-600 mb-4">Muchos clientes llegan pidiendo nulidad cuando en realidad necesitan resolución. La diferencia es el momento del vicio.</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Síntoma</th><th className="border border-gray-300 p-3">Acción correcta</th><th className="border border-gray-300 p-3">Ejemplo</th></tr></thead>
                <tbody>
                  <tr><td className="border border-gray-300 p-3">Te engañaron para firmar</td><td className="border border-gray-300 p-3">Nulidad por dolo (4 años)</td><td className="border border-gray-300 p-3">Te ocultaron pérdida total del auto</td></tr>
                  <tr><td className="border border-gray-300 p-3">Firmaste bien pero no te pagaron</td><td className="border border-gray-300 p-3">Resolución por incumplimiento (5 años)</td><td className="border border-gray-300 p-3">Vendiste y no te pagaron la segunda cuota</td></tr>
                  <tr><td className="border border-gray-300 p-3">Objeto ilegal</td><td className="border border-gray-300 p-3">Nulidad absoluta (10 años)</td><td className="border border-gray-300 p-3">Venta de droga o cohecho</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-600 mt-4">Si pides nulidad por incumplimiento, el juez la rechaza aunque tengas razón en el fondo. Calificar bien es la mitad del juicio y es donde el abogado marca la diferencia.</p>
          </div>


          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Plazos para demandar nulidad: cómo se cuentan y cuándo se interrumpen</h2>
            <p className="text-gray-600 mb-4">El plazo no corre igual para todos. La nulidad absoluta prescribe en 10 años contados desde la celebración del acto; la relativa en 4 años contados desde que cesa el vicio; la resolución en 5 años desde el incumplimiento. Confundir el dies a quo es perder el juicio por un día.</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Acción</th><th className="border border-gray-300 p-3">Desde cuándo corre</th><th className="border border-gray-300 p-3">Ejemplo</th><th className="border border-gray-300 p-3">Qué interrumpe</th></tr></thead>
                <tbody>
                  <tr><td className="border border-gray-300 p-3 font-bold">Nulidad absoluta</td><td className="border border-gray-300 p-3">Celebración (art. 1683)</td><td className="border border-gray-300 p-3">Venta privada de casa firmada el 10/03/2020: vence 10/03/2030</td><td className="border border-gray-300 p-3">Demanda notificada, reconocimiento escrito del demandado</td></tr>
                  <tr><td className="border border-gray-300 p-3 font-bold">Nulidad relativa (dolo)</td><td className="border border-gray-300 p-3">Conocimiento del dolo (art. 1691)</td><td className="border border-gray-300 p-3">Descubres el 05/06/2024 que el auto era pérdida total: vence 05/06/2028</td><td className="border border-gray-300 p-3">Demanda, transacción, avenimiento</td></tr>
                  <tr><td className="border border-gray-300 p-3 font-bold">Nulidad relativa (fuerza)</td><td className="border border-gray-300 p-3">Cese de la fuerza (art. 1691)</td><td className="border border-gray-300 p-3">Te soltaron el 01/01/2025: vence 01/01/2029</td><td className="border border-gray-300 p-3">Demanda notificada</td></tr>
                  <tr><td className="border border-gray-300 p-3 font-bold">Resolución</td><td className="border border-gray-300 p-3">Incumplimiento (art. 1489)</td><td className="border border-gray-300 p-3">No te pagaron cuota del 15/09/2024: vence 15/09/2029</td><td className="border border-gray-300 p-3">Demanda, requerimiento notarial</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-600 mt-4">La demanda interrumpe solo si se notifica dentro del plazo. Presentarla el penúltimo día y notificar dos meses después no sirve. Tampoco sirve un reclamo por WhatsApp genérico: debe ser una demanda judicial o un reconocimiento expreso del deudor donde admita el vicio o la deuda.</p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl mt-4">
              <p className="font-bold text-blue-900">Regla práctica</p>
              <p className="text-blue-800">Si dudas entre 4 y 10 años, demanda por nulidad relativa dentro de 4: si era absoluta, igual estás dentro; si era relativa y esperas 10, estás fuera. Y siempre pide en subsidio la resolución.</p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Indemnización por nulidad: qué puedes cobrar además de la restitución</h2>
            <p className="text-gray-600 mb-4">La nulidad no solo borra el contrato: te permite cobrar los perjuicios que el vicio te causó. El tribunal distingue tres partidas.</p>
            <div className="space-y-3">
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">1. Restitución</h3><p className="text-gray-600 mt-2">Devuelves lo que recibiste y te devuelven lo que diste, con reajuste IPC e intereses corrientes desde el pago. Si entregaste un auto, te devuelven el precio con reajuste; si lo usaste, descuentan frutos.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">2. Daño emergente</h3><p className="text-gray-600 mt-2">Gastos directos: notaría, Conservador, tasación, flete, abogado del contrato nulo. Guarda boletas.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">3. Lucro cesante y daño moral</h3><p className="text-gray-600 mt-2">Si el dolo te hizo perder un negocio o te causó angustia acreditada con informe psicológico, puedes pedir lucro cesante y daño moral. El dolo se presume si el engaño fue determinante.</p></div>
            </div>
            <p className="text-gray-600 mt-4">Pide siempre restitución + indemnización en la misma demanda. Si solo pides nulidad, el tribunal declara nulo pero no te devuelve la plata hasta que demandes de nuevo.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Errores que hacen perder el juicio</h2>
            <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
              <div className="space-y-6">
                {[
                  { title: "Confundir nulidad con resolución", desc: "Pedir nulidad cuando hubo incumplimiento posterior es perder. Califica primero." },
                  { title: "Demandar fuera de plazo", desc: "Nulidad relativa prescribe en 4 años. Si esperas 5, pierdes aunque tengas razón." },
                  { title: "No pedir restitución", desc: "Pedir solo nulidad sin restitución te deja sin recuperar lo pagado. Pide siempre la consecuencia." },
                  { title: "Sin prueba del vicio", desc: "Alegar dolo sin mensajes ni testigos es relato, no prueba. Documenta el vicio." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="text-red-500 font-bold text-xl flex-shrink-0">✕</div>
                    <div><h4 className="font-bold text-red-900">{item.title}</h4><p className="text-red-800 opacity-90">{item.desc}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl mb-6">
            <p className="font-bold text-amber-900">El tiempo juega en tu contra</p>
            <p className="text-amber-800">La nulidad relativa prescribe en 4 años y la absoluta en 10. Si sospechas vicio, hazlo revisar el primer mes: después la prueba se borra y el plazo corre.</p>
          </div>

          <InArticleCTA title="¿Tu contrato nació con vicios?" message="Un abogado civil te dice si es nulidad o resolución y demanda la restitución con indemnización." buttonText="Hablar con un abogado civil" category="Derecho Civil" />

          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-4">Conclusión: califica bien o pierdes aunque tengas razón</h2>
            <p className="text-gray-600 leading-relaxed mb-4">Todo contrato parece válido cuando lo firmas, pero si nació con error, dolo, fuerza o sin solemnidad, la ley te permite borrarlo con nulidad. Si nació bien y luego no cumplieron, la herramienta es la resolución. Confundirlas es el error que más juicios hace perder en Chile: el juez no puede cambiar tu demanda, solo rechazarla.</p>
            <p className="text-gray-600 leading-relaxed mb-4">La nulidad absoluta te da 10 años y la puede pedir cualquiera; la relativa te da 4 y solo la víctima. En ambos casos, debes pedir restitución e indemnización en la misma demanda, porque la sola declaración de nulidad no te devuelve la plata. Y sin prueba del vicio —mensajes, correos, peritaje—, tu relato no basta.</p>
            <p className="text-gray-600 leading-relaxed">Si sospechas que tu contrato nació viciado, no esperes al vencimiento ni firmes finiquitos sin revisar. Reúne el contrato, los mensajes previos y el comprobante de pago, y hazlo calificar. Consulta con un <Link to="/search?specialty=Derecho Civil" className="text-green-700 underline">abogado civil</Link> en LegalUp y revisa <Link to="/blog/contrato-compraventa-chile-2026" className="text-green-700 underline">contrato de compraventa: qué debe incluir</Link> y <Link to="/blog/cesion-de-derechos-chile-2026" className="text-green-700 underline">cesión de derechos</Link> para que tu próxima firma no nazca muerta.</p>
          </div>

          <CategoryCTA category="civil" />

          <div className="mt-12 mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre nulidad de contrato</h2>
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
        <div className="mt-8"><BlogShare title="Nulidad de contrato en Chile 2026" url="https://legalup.cl/blog/nulidad-contrato-chile-2026" /></div>
        <BlogNavigation currentArticleId="nulidad-contrato-chile-2026" />
        <div className="mt-4 text-center"><Link to="/blog" className="inline-flex items-center gap-2 text-green-900 hover:text-green-600 font-medium"><ArrowLeft className="h-4 w-4" />Volver al Blog</Link></div>
      </div>
      <BlogConversionPopup category="Derecho Civil" topic="nulidad-contrato" />
    </div>
  );
};
export default BlogArticle;
