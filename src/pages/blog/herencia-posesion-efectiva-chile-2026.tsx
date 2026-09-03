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
    { question: "¿Qué es la posesión efectiva en Chile?", answer: "Es la resolución que reconoce quiénes son los herederos y qué bienes forman la herencia. Sin posesión efectiva no puedes vender, cobrar ni inscribir bienes del causante. Se tramita ante el Registro Civil (herencia sin testamento) o ante el tribunal (con testamento)." },
    { question: "¿Cuánto demora la posesión efectiva?", answer: "Sin testamento ante Registro Civil: 25 a 45 días hábiles si la solicitud está completa. Con testamento ante Juzgado Civil: 2 a 6 meses por revisión judicial y publicación." },
    { question: "¿Qué es la herencia y quiénes heredan?", answer: "Herencia es el conjunto de bienes, derechos y deudas que deja el fallecido. Heredan primero hijos y cónyuge/conviviente civil, luego padres, luego hermanos. El testamento puede alterar el orden dentro de los límites de los herederos forzosos." },
    { question: "¿Necesito testamento para la posesión efectiva?", answer: "No. La mayoría se hace sin testamento (herencia intestada) ante el Registro Civil. Con testamento, la posesión efectiva es siempre judicial, con el testamento otorgado ante notario." },
    { question: "¿Cuánto cuesta la posesión efectiva?", answer: "Ante Registro Civil: formulario + publicación Diario Oficial + inscripción Conservador. Ante tribunal: honorarios abogado + receptor + publicaciones. El costo depende de si hay testamento y de la cantidad de bienes." },
    { question: "¿Puedo vender un bien heredado sin posesión efectiva?", answer: "No. El Conservador exige la posesión efectiva inscrita para inscribir la venta o la adjudicación. Vender sin ella es nulo y el banco no otorgará crédito al comprador." },
    { question: "¿Qué pasa si un heredero no quiere firmar?", answer: "No necesitas unanimidad para la posesión efectiva: cualquier heredero puede solicitarla y beneficia a todos. La partición sí requiere acuerdo o juicio de partición ante árbitro partidor." },
    { question: "¿Debo pagar impuesto a la herencia?", answer: "Sí, impuesto a la herencia ante el SII, calculado sobre el avalúo de los bienes. Se paga antes de disponer de bienes inmuebles o fondos. Hay tramos exentos y rebajas por parentesco." },
  ];

  return (
    <div className="min-h-screen bg-white">
      <BlogGrowthHacks
        title="Herencia y posesión efectiva en Chile 2026: qué es, cómo tramitarla y cuánto demora"
        description="Herencia y posesión efectiva en Chile 2026: qué es, quiénes heredan, cómo tramitar la posesión efectiva sin y con testamento, plazos, costos y qué hacer si un heredero no firma."
        image="/assets/herencia-posesion-efectiva-chile-2026.png"
        url="https://legalup.cl/blog/herencia-posesion-efectiva-chile-2026"
        datePublished="2026-08-20"
        dateModified="2026-08-20"
        faqs={faqs}
      />
      <Header onAuthClick={() => {}} />
      <ReadingProgressBar />

      <div className="bg-[#f4efdf] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 mb-4 text-green-500"><Link to="/blog" className="hover:text-green-900 transition-colors">Blog</Link><ChevronRight className="h-4 w-4" /><span>Artículo</span></div>
          <h1 className="text-3xl sm:text-4xl font-bold text-green-900 font-serif mb-6">Herencia y posesión efectiva en Chile 2026: qué es, cómo tramitarla y cuánto demora</h1><div className="bg-white backdrop-blur-sm border rounded-2xl p-6 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-4">Resumen rápido</p>
            <ul className="space-y-2 text-green-900">
              {[
                "Herencia = bienes + derechos + deudas del causante.",
                "Posesión efectiva reconoce herederos y habilita vender/cobrar.",
                "Sin testamento: Registro Civil. Con testamento: tribunal.",
                "No necesitas que todos firmen; uno puede pedirla por todos.",
                "Antes de vender, debes inscribir la posesión y pagar impuesto SII.",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3"><span className="text-green-500 font-bold">✓</span><span className="text-sm sm:text-base">{item}</span></li>
              ))}
            </ul>
          </div>
          <p className="text-xl max-w-3xl text-green-900">Fallece un familiar y aparecen dudas: ¿quién hereda?, ¿cómo cobro su cuenta?, ¿puedo vender su casa? En Chile la respuesta pasa siempre por la posesión efectiva. Sin ella, ningún Conservador te inscribirá y ningún banco te pagará.</p>
          <div className="flex flex-wrap items-center gap-4 mt-6 text-green-900">
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>20 de Agosto, 2026</span></div>
            <div className="flex items-center gap-2"><User className="h-4 w-4" /><span>Equipo LegalUp</span></div>
            <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><ReadTime slug="herencia-posesion-efectiva-chile-2026" /></div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
        <div className="bg-white border sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare title="Herencia y posesión efectiva en Chile 2026" url="https://legalup.cl/blog/herencia-posesion-efectiva-chile-2026" showBorder={false} />

          <div className="prose prose-lg max-w-none mb-8">
            <p className="text-lg text-gray-600 leading-relaxed">El Código Civil chileno establece que a la muerte de una persona sus bienes no pasan automáticamente a los herederos: se forma una comunidad hereditaria que necesita ser reconocida. Esa es la posesión efectiva: la resolución que declara quiénes son herederos y qué masa hereditaria existe.</p>
            <p className="text-gray-600 mt-4">Esta guía 2026 explica qué es herencia, quiénes heredan según la ley y el testamento, cómo tramitar posesión efectiva sin y con testamento, plazos, costos, impuesto y qué hacer si hay conflicto.</p>
            <p className="text-gray-600 mt-4">Si vienes por deudas, revisa <Link to="/blog/prescripcion-de-deudas-chile-2026" className="text-green-700 underline">prescripción de deudas</Link>, <Link to="/blog/herencia-posesion-efectiva-chile-2026" className="text-green-700 underline">posesión efectiva</Link> y <Link to="/blog/cesion-de-derechos-chile-2026" className="text-green-700 underline">cesión de derechos</Link>.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿Qué es herencia y quiénes heredan en Chile?</h2>
            <p className="text-gray-600 mb-4">Herencia es el patrimonio del causante al morir: inmuebles, vehículos, cuentas, acciones y deudas. Heredan según el orden legal, salvo testamento:</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Orden</th><th className="border border-gray-300 p-3">Herederos</th><th className="border border-gray-300 p-3">Ejemplo</th></tr></thead>
                <tbody>
                  <tr><td className="border border-gray-300 p-3">1º</td><td className="border border-gray-300 p-3">Hijos + cónyuge/conviviente civil</td><td className="border border-gray-300 p-3">Hijos 50% + cónyuge 50% (si hay 2 hijos, cada uno 25%)</td></tr>
                  <tr><td className="border border-gray-300 p-3">2º</td><td className="border border-gray-300 p-3">Padres + cónyuge</td><td className="border border-gray-300 p-3">Si no hay hijos</td></tr>
                  <tr><td className="border border-gray-300 p-3">3º</td><td className="border border-gray-300 p-3">Hermanos</td><td className="border border-gray-300 p-3">Si no hay descendientes ni padres</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-600 mt-4">El testamento puede asignar libremente solo la cuarta de libre disposición; el resto respeta asignaciones forzosas (mitad legitimaria + cuarta de mejoras). El conviviente civil hereda igual que el cónyuge desde la Ley 20.830.</p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl mt-4">
              <p className="font-bold text-blue-900">Resumen clave</p>
              <p className="text-blue-800">Posesión efectiva en Chile = resolución que declara herederos y bienes hereditarios. Sin testamento: Registro Civil. Con testamento: Juzgado Civil. Habilita inscribir y vender.</p>
            </div>
          </div>

          <RelatedLawyers category="Derecho Civil" />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Posesión efectiva sin testamento (Registro Civil)</h2>
            <p className="text-gray-600 mb-4">Es el trámite más común (70% de los casos). Se hace en línea o presencial en el Registro Civil.</p>
            <div className="space-y-4">
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">1. Solicita en Registro Civil</h3><p className="text-gray-600 mt-2">Formulario con datos del causante, herederos, bienes (rol avalúo, patentes) y deudas. Acompaña certificados de nacimiento, defunción y matrimonio/ AUC.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">2. Publicación</h3><p className="text-gray-600 mt-2">El Registro publica extracto en el Diario Oficial. Se abre plazo para oposiciones (15 días).</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">3. Resolución e inscripción</h3><p className="text-gray-600 mt-2">Si no hay oposición, dicta resolución que reconoce herederos. Con ella inscribes en el Conservador de Bienes Raíces y en el SII.</p></div>
            </div>
            <p className="text-gray-600 mt-4">Plazo: 25 a 45 días hábiles. Costo: arancel Registro + publicación + Conservador. No necesitas abogado obligatorio, pero se recomienda si hay varios bienes.</p>
          </div>

          <InArticleCTA category="Derecho Civil" title="¿Falleció un familiar y necesitas la posesión efectiva?" message="Un abogado civil revisa tu árbol hereditario, prepara la solicitud ante el Registro Civil y te acompaña hasta la inscripción." />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Posesión efectiva con testamento (Juzgado Civil)</h2>
            <p className="text-gray-600 mb-4">Si hay testamento otorgado ante notario, el trámite es siempre judicial:</p>
            <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
              {[
                "Demanda de posesión efectiva ante Juzgado Civil con patrocinio de abogado.",
                "Acompañas testamento, certificados y nómina de bienes.",
                "Tribunal ordena publicación y luego dicta sentencia que concede posesión efectiva.",
                "Inscribes sentencia en Registro Civil y Conservador.",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3"><span className="text-green-600 flex-shrink-0">✓</span><span className="text-gray-700 font-bold">{item}</span></li>
              ))}
            </ul>
            <p className="text-gray-600 mt-4">Plazo: 2 a 6 meses. Costo: honorarios + receptor + publicaciones. El testamento debe respetar la legítima; si la vulnera, los herederos pueden impugnarlo.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Qué necesitas: documentos y pago de impuesto</h2>
            <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
              {[
                "Certificados: defunción, nacimiento herederos, matrimonio/AUC, dominio vigente.",
                "Inventario: roles, avalúos, patentes, cuentas, acciones.",
                "Impuesto a la herencia (SII Formulario 441): se calcula sobre avalúo fiscal, con tramos exentos por parentesco. Se paga antes de inscribir venta.",
                "Inscripción en Conservador: con resolución y certificado de pago de impuesto.",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3"><span className="text-green-600 flex-shrink-0">✓</span><span className="text-gray-700 font-bold">{item}</span></li>
              ))}
            </ul>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Casos prácticos</h2>
            <div className="space-y-4">
              <div className="bg-gray-50 p-5 rounded-xl border"><h3 className="font-bold">Sin testamento, 2 hijos y cónyuge</h3><p className="text-gray-600 mt-2">Casa avalúo $80M. Posesión efectiva en Registro Civil: cónyuge 25%, cada hijo 37,5% (si hay 2). Inscriben y luego venden; el SII cobra impuesto proporcional.</p></div>
              <div className="bg-gray-50 p-5 rounded-xl border"><h3 className="font-bold">Con testamento que deja todo a un hijo</h3><p className="text-gray-600 mt-2">Testamento vulnera legítima del otro hijo (50%). El hijo preterido demanda reforma de testamento ante Juzgado Civil y obtiene su mitad.</p></div>
              <div className="bg-gray-50 p-5 rounded-xl border"><h3 className="font-bold">Heredero que no firma</h3><p className="text-gray-600 mt-2">Hermano no quiere firmar. Igual puedes pedir posesión efectiva (no requiere unanimidad) y luego demandar partición ante árbitro.</p></div>
            </div>
          </div>

          
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Testamento: cuándo conviene y cómo se hace</h2>
            <p className="text-gray-600 mb-4">El testamento no es solo para grandes patrimonios. En Chile se otorga ante notario con dos testigos y permite ordenar la herencia dentro de la ley.</p>
            <div className="space-y-4">
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">Testamento abierto</h3><p className="text-gray-600 mt-2">Vas al notario, dictas tu voluntad y lo firman tú, los testigos y el notario. Queda inscrito. Es el más usado y el que vale para posesión efectiva judicial.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">¿Qué puedes dejar?</h3><p className="text-gray-600 mt-2">No puedes dejar todo a quien quieras: la mitad es legitimaria para hijos/cónyuge y la cuarta de mejoras también tiene reglas. Solo la cuarta de libre disposición es realmente libre. Un abogado te calcula tu disponible.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">¿Cuándo conviene?</h3><p className="text-gray-600 mt-2">Cuando quieres proteger a tu pareja de hecho, dejar la casa a un hijo que te cuidó o evitar que un heredero venda. Sin testamento, la ley reparte en partes iguales.</p></div>
            </div>
            <p className="text-gray-600 mt-4">Un testamento mal hecho se impugna por reforma. Hazlo con abogado y notario, no con un papel manuscrito.</p>
          </div>


          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Partición y adjudicación: de la comunidad hereditaria a tu nombre</h2>
            <p className="text-gray-600 mb-4">La posesión efectiva no te hace dueño de una casa concreta: te hace comunero de toda la herencia. Para que la casa quede a nombre de uno, necesitas la partición.</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Vía</th><th className="border border-gray-300 p-3">Cuándo</th><th className="border border-gray-300 p-3">Cómo se hace</th><th className="border border-gray-300 p-3">Plazo</th></tr></thead>
                <tbody>
                  <tr><td className="border border-gray-300 p-3">Partición de común acuerdo</td><td className="border border-gray-300 p-3">Todos de acuerdo</td><td className="border border-gray-300 p-3">Escritura pública de adjudicación + inscripción Conservador</td><td className="border border-gray-300 p-3">1 a 2 meses</td></tr>
                  <tr><td className="border border-gray-300 p-3">Partidor (árbitro)</td><td className="border border-gray-300 p-3">Uno no quiere firmar</td><td className="border border-gray-300 p-3">Juicio de partición ante árbitro partidor, con tasación y remate si no hay acuerdo</td><td className="border border-gray-300 p-3">6 a 14 meses</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-600 mt-4">Mientras no haya partición, ningún heredero puede vender solo su cuota sin ofrecerla primero a los otros (derecho de tanteo). Si un heredero vende su derecho hereditario, el comprador entra a la comunidad, no se queda con la casa.</p>
            <div className="bg-green-50 p-5 rounded-xl mt-4">
              <p className="text-green-800">Consejo: inscribe la posesión efectiva y luego haz la partición en la misma notaría si hay acuerdo. Hacer dos escrituras separadas duplica costos de Conservador.</p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿Heredas las deudas? Qué pasa con créditos y hipotecas</h2>
            <p className="text-gray-600 mb-4">Sí, pero con límite: heredas deudas hasta el valor de lo que heredaste (beneficio de inventario). Si la herencia tiene una casa de $80M y una deuda de $50M, respondes hasta $80M, no con tu patrimonio personal, salvo que aceptes pura y simplemente.</p>
            <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
              {[
                "Hipoteca: el banco cobra contra la casa heredada, no contra ti personalmente si la aceptas con beneficio de inventario.",
                "Crédito consumo del causante: se paga con los bienes hereditarios; si no alcanzan, la deuda se extingue.",
                "Arriendos impagos del causante: si heredas su rol de arrendador, debes notificar a los arrendatarios el cambio de dueño.",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3"><span className="text-green-600 flex-shrink-0">✓</span><span className="text-gray-700 font-bold">{item}</span></li>
              ))}
            </ul>
            <p className="text-gray-600 mt-4">Para no confundir tu patrimonio con el heredado, acepta siempre con beneficio de inventario y haz inventario solemne ante notario. Es la protección que evita que una deuda oculta te persiga.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Errores que bloquean la herencia</h2>
            <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
              <div className="space-y-6">
                {[
                  { title: "Vender sin posesión efectiva", desc: "El Conservador rechazará la inscripción y el banco no dará crédito. Primero inscribe la posesión." },
                  { title: "Omitir bienes en el inventario", desc: "Si omites una cuenta, no podrás cobrarla. Rectificar demora meses." },
                  { title: "No pagar impuesto SII", desc: "Sin pago, no hay inscripción y la venta se cae." },
                  { title: "Repartir sin partición", desc: "Posesión efectiva no es partición: reconoce cuotas, no asigna bienes específicos. Para adjudicar, necesitas partición." },
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
            <p className="text-amber-800">Las cuentas bancarias del causante se bloquean y los arriendos de sus bienes quedan sin destino. Inicia la posesión efectiva el primer mes para evitar que la comunidad hereditaria se complique.</p>
          </div>

          <InArticleCTA title="¿Necesitas tramitar una herencia?" message="Un abogado civil calcula tu legítima, tramita la posesión efectiva y te acompaña hasta la inscripción y el pago del impuesto." buttonText="Hablar con un abogado civil" category="Derecho Civil" />

          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-4">Conclusión: sin posesión efectiva no hay herencia disponible</h2>
            <p className="text-gray-600 leading-relaxed mb-4">La muerte abre la sucesión, pero solo la posesión efectiva la cierra: es el documento que el Conservador y el banco exigen para inscribir y pagar. Creer que "por ser hijo ya soy dueño" es el error que deja casas sin vender por años y cuentas bloqueadas. Sin testamento, el Registro Civil te reconoce en 45 días; con testamento, el Juzgado en meses, pero ambos exigen inventario completo y pago del impuesto.</p>
            <p className="text-gray-600 leading-relaxed mb-4">La posesión efectiva no reparte: solo declara cuotas. Si los herederos no se ponen de acuerdo, viene la partición ante partidor, que es otro juicio. Por eso, si tu familia es numerosa o hay bienes en disputa, no basta con el formulario: necesitas un abogado que calcule legítimas, revise si el testamento vulnera la cuarta y prepare la partición sin llegar a juicio.</p>
            <p className="text-gray-600 leading-relaxed">Si falleció un familiar, no esperes: pide certificados de nacimiento, defunción y dominio, haz tu inventario con roles y avalúos, y solicita la posesión. Consulta con un <Link to="/search?specialty=Derecho Civil" className="text-green-700 underline">abogado civil</Link> en LegalUp y revisa <Link to="/blog/cesion-de-derechos-chile-2026" className="text-green-700 underline">cesión de derechos hereditarios</Link> y <Link to="/blog/prescripcion-de-deudas-chile-2026" className="text-green-700 underline">prescripción de deudas hereditarias</Link> para que tu herencia no quede atrapada en papeles.</p>
          </div>

          <CategoryCTA category="civil" />

          <div className="mt-12 mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre herencia y posesión efectiva</h2>
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
        <div className="mt-8"><BlogShare title="Herencia y posesión efectiva en Chile 2026" url="https://legalup.cl/blog/herencia-posesion-efectiva-chile-2026" /></div>
        <BlogNavigation currentArticleId="herencia-posesion-efectiva-chile-2026" />
        <div className="mt-4 text-center"><Link to="/blog" className="inline-flex items-center gap-2 text-green-900 hover:text-green-600 font-medium"><ArrowLeft className="h-4 w-4" />Volver al Blog</Link></div>
      </div>
      <BlogConversionPopup category="Derecho Civil" topic="herencia" />
    </div>
  );
};
export default BlogArticle;
