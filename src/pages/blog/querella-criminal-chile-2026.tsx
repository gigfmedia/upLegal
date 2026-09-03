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
    { question: "¿Qué es una querella criminal en Chile?", answer: "Es el escrito por el cual la víctima, su representante o cualquier persona pide al Juzgado de Garantía que tenga por interpuesta una acción penal para investigar un delito, ser parte en el proceso y poder acusar. A diferencia de la denuncia, la querella te hace interviniente con derechos." },
    { question: "¿Cuál es la diferencia entre denuncia y querella?", answer: "La denuncia informa un delito a Carabineros, PDI o Fiscalía y no te hace parte: la Fiscalía decide si investiga. La querella se presenta ante el Juzgado de Garantía, te hace querellante, puedes pedir diligencias, apelar archivos y acusar en juicio oral." },
    { question: "¿Cuánto cuesta presentar una querella?", answer: "Presentar la querella no tiene tasa judicial. Pagas patrocinio de abogado y su redacción. Si te querellas y luego no pruebas el delito, puedes ser condenado en costas, pero no hay multa por querellarte si actúas de buena fe." },
    { question: "¿Dónde se presenta una querella criminal?", answer: "En el Juzgado de Garantía del lugar donde ocurrió el hecho, con patrocinio de abogado. Se presenta por escrito con el relato, calificación jurídica, diligencias solicitadas y documentos. El tribunal la remite a la Fiscalía para investigar." },
    { question: "¿Puedo querellarme si ya denuncié?", answer: "Sí. Puedes denunciar primero y luego querellarte para hacerte parte. La querella refuerza la denuncia porque te permite controlar la investigación y evita el archivo sin tu conocimiento." },
    { question: "¿Qué pasa después de presentar la querella?", answer: "El Juzgado la declara admisible y la envía a la Fiscalía. La Fiscalía debe investigar y no puede archivar sin notificarte: puedes oponerte al archivo, pedir reapertura o forzar la formalización. Si hay antecedentes, el fiscal formaliza." },
    { question: "¿Necesito querella para ir a juicio?", answer: "No siempre. La Fiscalía puede acusar sin querella. Pero sin querellante, si la Fiscalía pide no perseverar o sobreseer, nadie puede acusar. Con querella, el querellante puede acusar por sí mismo y llevar el caso a juicio oral." },
    { question: "¿Cuánto demora una querella?", answer: "La admisibilidad demora días. La investigación posterior dura el plazo que fije el Juzgado (hasta 2 años). La querella en sí no acelera plazos, pero te da control para pedir diligencias y evitar el archivo." },
  ];

  return (
    <div className="min-h-screen bg-white">
      <BlogGrowthHacks
        title="Querella criminal en Chile 2026: qué es, cómo presentarla y diferencias con la denuncia"
        description="Querella criminal en Chile 2026: qué es, requisitos, dónde presentarla, qué pasa después, diferencias con la denuncia y cuánto demora. Guía para víctimas con patrocinio de abogado."
        image="/assets/querella-criminal-chile-2026.png"
        url="https://legalup.cl/blog/querella-criminal-chile-2026"
        datePublished="2026-08-19"
        dateModified="2026-08-19"
        faqs={faqs}
      />
      <Header onAuthClick={() => {}} />
      <ReadingProgressBar />

      <div className="bg-[#f4efdf] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 mb-4 text-green-500"><Link to="/blog" className="hover:text-green-900 transition-colors">Blog</Link><ChevronRight className="h-4 w-4" /><span>Artículo</span></div>
          <h1 className="text-3xl sm:text-4xl font-bold text-green-900 font-serif mb-6">Querella criminal en Chile 2026: qué es, cómo presentarla y diferencias con la denuncia</h1><div className="bg-white backdrop-blur-sm border rounded-2xl p-6 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-4">Resumen rápido</p>
            <ul className="space-y-2 text-green-900">
              {[
                "Denuncia informa; querella te hace querellante con derechos.",
                "Se presenta en Juzgado de Garantía con patrocinio de abogado.",
                "El tribunal la declara admisible y la envía a Fiscalía para investigar.",
                "Evita el archivo silencioso: te notifican y puedes oponerte.",
                "Permite acusar particular si la Fiscalía no persevera.",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3"><span className="text-green-500 font-medium">✓</span><span className="text-sm sm:text-base">{item}</span></li>
              ))}
            </ul>
          </div>
          <p className="text-xl max-w-3xl text-green-900">Denunciaste y la causa se archivó sin que te avisaran. O la Fiscalía dice que no persevera y te quedas sin juicio. La querella es la herramienta que te evita quedar fuera: te convierte en parte, te notifican todo y puedes llevar el caso a juicio aunque la Fiscalía se retire.</p>
          <div className="flex flex-wrap items-center gap-4 mt-6 text-green-900">
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>19 de Agosto, 2026</span></div>
            <div className="flex items-center gap-2"><User className="h-4 w-4" /><span>Equipo LegalUp</span></div>
            <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><ReadTime slug="querella-criminal-chile-2026" /></div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
        <div className="bg-white border sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare title="Querella criminal en Chile 2026" url="https://legalup.cl/blog/querella-criminal-chile-2026" showBorder={false} />

          <div className="prose prose-lg max-w-none mb-8">
            <p className="text-lg text-gray-600 leading-relaxed">En el sistema penal chileno la víctima no es dueña de la investigación: la dirige el Ministerio Público. La forma de intervenir es la querella del art. 113 del Código Procesal Penal: el escrito que pide al Juez de Garantía que te tenga por querellante.</p>
            <p className="text-gray-600 mt-4">Esta guía 2026 explica qué es la querella, diferencias con la denuncia, requisitos, dónde presentarla, qué pasa después y cómo usarla para evitar el archivo.</p>
            <p className="text-gray-600 mt-4">Si vienes por una investigación, revisa <Link to="/blog/citacion-fiscalia-chile-2026" className="text-green-700 underline">citación de Fiscalía</Link>, <Link to="/blog/formalizacion-chile-2026" className="text-green-700 underline">formalización</Link> y <Link to="/blog/control-de-detencion-chile-2026" className="text-green-700 underline">control de detención</Link>.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿Qué es la querella? Definición en simple</h2>
            <p className="text-gray-600 mb-4">La querella es la acción penal que ejerce la víctima (o cualquier persona en delitos de acción pública) ante el Juzgado de Garantía para ser parte en el procedimiento. Con la querella pides que se investigue, se castigue y se repare.</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Elemento</th><th className="border border-gray-300 p-3">Querella</th><th className="border border-gray-300 p-3">Denuncia</th></tr></thead>
                <tbody>
                  <tr><td className="border border-gray-300 p-3 font-bold">Dónde</td><td className="border border-gray-300 p-3">Juzgado de Garantía</td><td className="border border-gray-300 p-3">Carabineros / PDI / Fiscalía</td></tr>
                  <tr><td className="border border-gray-300 p-3 font-bold">Requiere abogado</td><td className="border border-gray-300 p-3">Sí, patrocinio</td><td className="border border-gray-300 p-3">No</td></tr>
                  <tr><td className="border border-gray-300 p-3 font-bold">Te hace parte</td><td className="border border-gray-300 p-3">Sí, querellante</td><td className="border border-gray-300 p-3">No</td></tr>
                  <tr><td className="border border-gray-300 p-3 font-bold">Puedes pedir diligencias</td><td className="border border-gray-300 p-3">Sí</td><td className="border border-gray-300 p-3">Solo sugerir</td></tr>
                  <tr><td className="border border-gray-300 p-3 font-bold">Evita archivo</td><td className="border border-gray-300 p-3">Sí, te notifican</td><td className="border border-gray-300 p-3">No, archivan sin avisarte</td></tr>
                </tbody>
              </table>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl mt-4">
              <p className="font-bold text-blue-900">Resumen clave</p>
              <p className="text-blue-800">Querella criminal en Chile = escrito de la víctima ante el Juzgado de Garantía (art. 113 CPP) que la hace querellante con derechos a pedir diligencias, oponerse al archivo y acusar. Requiere abogado.</p>
            </div>
          </div>

          <RelatedLawyers category="Derecho Penal" />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Requisitos de una querella (art. 113 CPP)</h2>
            <p className="text-gray-600 mb-4">La querella debe contener, bajo patrocinio de abogado:</p>
            <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
              {[
                "Tribunal (Juzgado de Garantía del territorio), nombre y domicilio del querellante y del querellado si lo conoces.",
                "Relato circunstanciado del hecho: fecha, lugar, cómo ocurrió.",
                "Calificación jurídica: delito que atribuyes (estafa art. 468, amenazas art. 296, etc.).",
                "Diligencias concretas que pides: oficios, peritajes, citaciones, cámaras.",
                "Patrocinio y firma de abogado.",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3"><span className="text-green-600 flex-shrink-0">✓</span><span className="text-gray-700 font-bold">{item}</span></li>
              ))}
            </ul>
            <p className="text-gray-600 mt-4">Adjunta documentos: contratos, transferencias, mensajes, fotos, informe médico, avalúo. Mientras más precisa, más probable la admisibilidad.</p>
          </div>

          <InArticleCTA category="Derecho Penal" title="¿Quieres querellarte?" message="Un abogado penal redacta tu querella, la presenta en el Juzgado de Garantía y pide las diligencias clave." />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Dónde y cómo se presenta paso a paso</h2>
            <div className="space-y-4">
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">1. Reúne antecedentes</h3><p className="text-gray-600 mt-2">Relato cronológico, documentos, testigos, RUC si ya denunciaste. Define el delito y el perjuicio.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">2. Redacta con tu abogado</h3><p className="text-gray-600 mt-2">Tu abogado califica el delito, pide diligencias y firma el patrocinio. La querella mal calificada se declara inadmisible.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">3. Ingresa en el Juzgado de Garantía</h3><p className="text-gray-600 mt-2">Se presenta por Oficina Judicial Virtual o presencial. El tribunal verifica requisitos formales y la declara admisible.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">4. El tribunal la remite a Fiscalía</h3><p className="text-gray-600 mt-2">Admisible, el Juzgado la envía al Ministerio Público para que la agregue a la investigación y te notifique todo.</p></div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Qué ganas con la querella: 3 derechos clave</h2>
            <div className="space-y-3">
              <div className="bg-green-50 p-4 rounded-xl"><h3 className="font-bold text-green-800">1. Control del archivo</h3><p className="text-green-700">La Fiscalía no puede archivar sin notificarte. Puedes oponerte y pedir al Juzgado que ordene diligencias. Sin querella, archivan y te enteras tarde.</p></div>
              <div className="bg-green-50 p-4 rounded-xl"><h3 className="font-bold text-green-800">2. Forzar la formalización</h3><p className="text-green-700">Puedes pedir al Juzgado que cite a audiencia para que el fiscal formalice. Con solo denuncia, no tienes esa herramienta.</p></div>
              <div className="bg-green-50 p-4 rounded-xl"><h3 className="font-bold text-green-800">3. Acusar tú mismo</h3><p className="text-green-700">Si la Fiscalía pide no perseverar o sobreseer, el querellante puede acusar particular y llevar el caso a juicio oral. Es tu seguro contra el abandono.</p></div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Casos prácticos</h2>
            <div className="space-y-4">
              <div className="bg-gray-50 p-5 rounded-xl border"><h3 className="font-bold">Estafa por transferencia</h3><p className="text-gray-600 mt-2">Te estafan con $2M por WhatsApp. Denuncias y la Fiscalía archiva por falta de diligencias. Con querella pides oficio a banco para trazar cuenta y peritaje de chats: la causa avanza.</p></div>
              <div className="bg-gray-50 p-5 rounded-xl border"><h3 className="font-bold">Amenazas de ex pareja</h3><p className="text-gray-600 mt-2">Te amenaza tu ex. Denuncias, pero quieres medidas de protección rápidas. La querella pide al Juzgado orden de alejamiento inmediata y diligencia de riesgo.</p></div>
              <div className="bg-gray-50 p-5 rounded-xl border"><h3 className="font-bold">Lesiones leves con formalizado</h3><p className="text-gray-600 mt-2">Te agreden y hay formalizado. Con querella participas en la preparación de juicio, ofreces prueba y puedes acusar si la Fiscalía pide suspensión.</p></div>
            </div>
          </div>

          
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Plazos y costos de una querella</h2>
            <p className="text-gray-600 mb-4">La querella no tiene plazo de caducidad mientras el delito no prescriba, pero presentarla pronto te da control. No pagas tasa judicial: solo honorarios de redacción y patrocinio.</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Delito</th><th className="border border-gray-300 p-3">Prescripción</th><th className="border border-gray-300 p-3">Plazo para querellarte</th></tr></thead>
                <tbody>
                  <tr><td className="border border-gray-300 p-3">Amenazas, lesiones leves</td><td className="border border-gray-300 p-3">5 años</td><td className="border border-gray-300 p-3">Dentro de 5 años desde el hecho</td></tr>
                  <tr><td className="border border-gray-300 p-3">Estafa, apropiación</td><td className="border border-gray-300 p-3">5-10 años</td><td className="border border-gray-300 p-3">Mientras no prescriba</td></tr>
                  <tr><td className="border border-gray-300 p-3">Delitos graves (homicidio)</td><td className="border border-gray-300 p-3">10-15 años</td><td className="border border-gray-300 p-3">Antes de la prescripción</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-600 mt-4">Una vez admitida, la investigación puede durar hasta 2 años. Si la Fiscalía archiva, tienes 10 días para oponerte desde la notificación. Sin querella, no te notifican.</p>
          </div>


          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿Qué puede pedir el querellante durante la investigación? Diligencias que cambian el caso</h2>
            <p className="text-gray-600 mb-4">Ser querellante no es solo tener un título: es poder pedirle al fiscal y al Juzgado diligencias concretas. Las que más mueven una causa son específicas, no genéricas.</p>
            <div className="space-y-4">
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">1. Oficio a banco o institución financiera</h3><p className="text-gray-600 mt-2">Para trazar transferencias, cheques o pagos. Pide: "Ofíciese al Banco X para que informe titular de cuenta Y y cartola entre fechas 01/03 y 15/03". Sin cuenta y fechas exactas, el oficio vuelve vacío.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">2. Peritaje de chats y correos</h3><p className="text-gray-600 mt-2">WhatsApp y mails se perician para probar autoría y no edición. Aporta el teléfono con respaldo y pide peritaje informático del LABOCAR o perito particular.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">3. Citación de testigos con apercibimiento</h3><p className="text-gray-600 mt-2">Testigos presenciales o de oídas que vieron la amenaza o la entrega. Pide citación con apercibimiento de arresto si no concurren: sin apercibimiento, muchos no van.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">4. Solicitud de cámaras</h3><p className="text-gray-600 mt-2">Municipales y privadas borran en 7 a 30 días. Pide oficio inmediato a la Municipalidad y a locales cercanos con fecha, hora y intersección exacta.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">5. Informe médico y peritaje psicológico</h3><p className="text-gray-600 mt-2">En lesiones y amenazas, pide informe del SAR y peritaje del Servicio Médico Legal para calificar lesiones y daño. Sin informe, la Fiscalía califica como falta.</p></div>
            </div>
            <div className="overflow-x-auto mt-4">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Diligencia</th><th className="border border-gray-300 p-3">Cuándo pedirla</th><th className="border border-gray-300 p-3">Qué aporta</th></tr></thead>
                <tbody>
                  <tr><td className="border border-gray-300 p-3">Oficio banco</td><td className="border border-gray-300 p-3">Estafa con transferencia</td><td className="border border-gray-300 p-3">Traza el dinero y al titular</td></tr>
                  <tr><td className="border border-gray-300 p-3">Peritaje chat</td><td className="border border-gray-300 p-3">Amenazas por WhatsApp</td><td className="border border-gray-300 p-3">Autenticidad y autoría</td></tr>
                  <tr><td className="border border-gray-300 p-3">Cámaras</td><td className="border border-gray-300 p-3">Hecho en vía pública</td><td className="border border-gray-300 p-3">Prueba objetiva del hecho</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-600 mt-4">Si la Fiscalía archiva, tienes 10 días desde la notificación para oponerte por escrito en el Juzgado de Garantía y pedir que se ordene la diligencia. Sin querella, no te notifican y pierdes ese plazo.</p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl mt-4">
              <p className="font-bold text-blue-900">Regla práctica</p>
              <p className="text-blue-800">Pide máximo 3 diligencias muy precisas en la querella inicial. Tres oficios con cuenta, fecha y motivo se tramitan; diez genéricos se archivan.</p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Errores que hacen inadmisible la querella</h2>
            <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
              <div className="space-y-6">
                {[
                  { title: "Sin patrocinio de abogado", desc: "La querella sin firma de abogado se declara inadmisible de plano." },
                  { title: "Relato vago", desc: "Decir 'me estafaron' sin fecha, monto y cómo ocurrió es insuficiente. El tribunal exige hechos circunstanciados." },
                  { title: "Pedir diligencias genéricas", desc: "Pedir 'investíguese todo' no sirve. Pide 'ofíciese al banco X por cuenta Y entre fechas'." },
                  { title: "Presentarla en Fiscalía en vez de Juzgado", desc: "Si la presentas en Fiscalía, es denuncia, no querella. Pierdes derechos de querellante." },
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
            <p className="text-amber-800">Si ya denunciaste, querellarte pronto evita que la causa se archive sin tu conocimiento. El archivo provisional se puede revertir solo si te notifican.</p>
          </div>

          <InArticleCTA title="¿Necesitas presentar una querella?" message="Un abogado penal califica tu caso, redacta la querella y la presenta en el Juzgado de Garantía para que seas parte." buttonText="Hablar con un abogado penal" category="Derecho Penal" />

          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-4">Conclusión: sin querella dependes de otros; con querella dependes de ti</h2>
            <p className="text-gray-600 leading-relaxed mb-4">La denuncia informa, la querella te hace parte. Esa diferencia no es formal: es la que decide si te enteras del archivo, si puedes pedir diligencias y si puedes llevar el caso a juicio cuando la Fiscalía no quiere. En Chile, muchas causas se archivan por falta de impulso, no por falta de delito, y la querella es el impulso.</p>
            <p className="text-gray-600 leading-relaxed mb-4">Presentarla no es caro ni lento —se admite en días—, pero hacerla bien exige calificar el delito, pedir diligencias concretas y fundarla con documentos. Una querella genérica de una página se declara inadmisible; una de cinco páginas con relato, calificación y tres diligencias precisas se admite y mueve la causa.</p>
            <p className="text-gray-600 leading-relaxed">Si fuiste víctima de estafa, amenazas o lesiones, no te quedes solo con la denuncia. Reúne tu relato cronológico, tus transferencias o mensajes, y presenta tu querella con patrocinio. Consulta con un <Link to="/abogados-penales" className="text-green-700 underline">abogado penal</Link> en LegalUp y revisa <Link to="/blog/estafa-chile-2026" className="text-green-700 underline">qué hacer si te estafaron</Link> y <Link to="/blog/constancia-por-amenazas-en-chile-2026" className="text-green-700 underline">constancia por amenazas</Link> para que tu caso no quede en un cajón.</p>
          </div>

          <CategoryCTA category="penal" />

          <div className="mt-12 mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre querella criminal</h2>
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
        <div className="mt-8"><BlogShare title="Querella criminal en Chile 2026" url="https://legalup.cl/blog/querella-criminal-chile-2026" /></div>
        <BlogNavigation currentArticleId="querella-criminal-chile-2026" />
        <div className="mt-4 text-center"><Link to="/blog" className="inline-flex items-center gap-2 text-green-900 hover:text-green-600 font-medium"><ArrowLeft className="h-4 w-4" />Volver al Blog</Link></div>
      </div>
      <BlogConversionPopup category="Derecho Penal" topic="querella" />
    </div>
  );
};
export default BlogArticle;
