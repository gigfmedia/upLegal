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
    { question: "¿Qué es la usurpación de inmueble en Chile?", answer: "Es el delito del artículo 458 del Código Penal: ocupar un inmueble sin derecho, con violencia o intimidación en las personas o fuerza en las cosas, o expulsando al poseedor. No es lo mismo que la violación de morada (art. 144) ni que un conflicto civil por arriendo." },
    { question: "¿Cuál es la diferencia entre usurpación y violación de morada?", answer: "La violación de morada (art. 144) es entrar o permanecer contra la voluntad del morador en su hogar. La usurpación (art. 458) es ocupar un inmueble ajeno para quedarse, con fuerza o expulsión. La usurpación exige animo de señor y despojo; la violación, solo la entrada." },
    { question: "¿Qué pena tiene la usurpación en Chile?", answer: "Presidio menor en su grado medio a máximo (541 días a 5 años) según el art. 458. Además el tribunal puede ordenar la restitución del inmueble. La pena aumenta si hay violencia o si participa más de una persona." },
    { question: "¿Dónde denuncio una usurpación?", answer: "En Carabineros, PDI o directamente en la Fiscalía. Lleva tu título de dominio (inscripción Conservador), certificado de avalúo, fotos, videos y testigos. La Fiscalía puede pedir al Juzgado de Garantía la restitución anticipada." },
    { question: "¿Puedo sacar a los ocupantes por mi cuenta?", answer: "No. Cambiar chapas, cortar luz o usar fuerza te expone a una denuncia por usurpación o desalojo ilegal. Solo un tribunal puede ordenar el lanzamiento con auxilio de la fuerza pública." },
    { question: "¿La usurpación es lo mismo que una toma?", answer: "Las tomas masivas suelen tratarse inicialmente como usurpación, pero su tramitación es compleja y el Estado prioriza soluciones habitacionales. La usurpación de un domicilio particular, en cambio, se denuncia como delito común y el Ministerio Público debe investigar." },
    { question: "¿Qué pasa si el ocupante dice que le arrendé?", answer: "Si existe contrato de arriendo, aunque sea verbal, el conflicto es civil (precario o desalojo), no usurpación. La Fiscalía archivará y deberás demandar ante el Juzgado Civil (precario, comodato o desalojo). Por eso es clave probar que nunca hubo título." },
    { question: "¿Necesito abogado para denunciar usurpación?", answer: "Puedes denunciar sin abogado, pero un abogado penal te ayuda a calificar correctamente el delito (usurpación vs violación morada vs estafa), a reunir prueba y a pedir en la querella la restitución inmediata del inmueble." },
  ];

  return (
    <div className="min-h-screen bg-white">
      <BlogGrowthHacks
        title="Usurpación de inmueble en Chile 2026: qué es, penas y cómo denunciar"
        description="Usurpación de inmueble en Chile 2026: qué es (art. 458 Código Penal), penas, diferencias con violación de morada y qué hacer paso a paso para denunciar y recuperar tu propiedad."
        image="/assets/usurpacion-inmueble-chile-2026.png"
        url="https://legalup.cl/blog/usurpacion-inmueble-chile-2026"
        datePublished="2026-08-17"
        dateModified="2026-08-17"
        faqs={faqs}
      />
      <Header onAuthClick={() => {}} />
      <ReadingProgressBar />

      <div className="bg-[#f4efdf] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 mb-4 text-green-500"><Link to="/blog" className="hover:text-green-900 transition-colors">Blog</Link><ChevronRight className="h-4 w-4" /><span>Artículo</span></div>
          <h1 className="text-3xl sm:text-4xl font-bold text-green-900 font-serif mb-6">Usurpación de inmueble en Chile 2026: qué es, penas y cómo denunciar</h1><div className="bg-white backdrop-blur-sm border rounded-2xl p-6 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-4">Resumen rápido</p>
            <ul className="space-y-2 text-green-900">
              {[
                "Usurpación = ocupar inmueble ajeno con violencia/fuerza o expulsando al poseedor (art. 458).",
                "Violación de morada = entrar a morada ajena contra voluntad (art. 144) — delito distinto.",
                "Pena usurpación: presidio menor 541 días a 5 años + restitución del inmueble.",
                "Denuncia en Fiscalía/PDI/Carabineros con dominio y pruebas; el tribunal puede ordenar restitución anticipada.",
                "Si había arriendo, es conflicto civil (precario), no penal.",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3"><span className="text-green-500 font-bold">✓</span><span className="text-sm sm:text-base">{item}</span></li>
              ))}
            </ul>
          </div>
          <p className="text-xl max-w-3xl text-green-900">Llegas a tu casa y encuentras ocupantes que cambiaron la chapa. O dejas tu parcela sin visitar meses y aparece cercada por terceros. No es solo un problema civil: en Chile ocupar un inmueble ajeno con fuerza es delito. Entender cuándo es usurpación y qué hacer las primeras horas define si recuperas tu propiedad en semanas o entras en un juicio de años.</p>
          <div className="flex flex-wrap items-center gap-4 mt-6 text-green-900">
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>17 de Agosto, 2026</span></div>
            <div className="flex items-center gap-2"><User className="h-4 w-4" /><span>Equipo LegalUp</span></div>
            <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><ReadTime slug="usurpacion-inmueble-chile-2026" /></div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
        <div className="bg-white border sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare title="Usurpación de inmueble en Chile 2026" url="https://legalup.cl/blog/usurpacion-inmueble-chile-2026" showBorder={false} />

          <div className="prose prose-lg max-w-none mb-8">
            <p className="text-lg text-gray-600 leading-relaxed">En Chile el derecho penal protege la posesión, no solo la propiedad inscrita. El artículo 458 del Código Penal castiga a quien con violencia en las personas o fuerza en las cosas ocupa un inmueble ajeno, o al que expulsa al poseedor para ocuparlo. La clave es el despojo con animo de señor, no la simple permanencia.</p>
            <p className="text-gray-600 mt-4">Esta guía 2026 explica qué es usurpación, cómo se diferencia de violación de morada y de los conflictos civiles por arriendo, qué penas arriesga el ocupante, qué documentos necesitas y cómo denunciar paso a paso para pedir la restitución.</p>
            <p className="text-gray-600 mt-4">Si tu caso es de arriendo impago, revisa <Link to="/blog/me-pueden-demandar-por-no-pagar-el-arriendo-chile-2026" className="text-green-700 underline">qué hacer si no pagan el arriendo</Link>, <Link to="/blog/como-desalojar-a-una-persona-de-mi-propiedad-chile-2026" className="text-green-700 underline">cómo desalojar a una persona</Link> y <Link to="/blog/violacion-de-morada-chile-2026" className="text-green-700 underline">violación de morada</Link>. Si te amenazaron para entrar, revisa <Link to="/blog/amenazas-whatsapp-chile-2026" className="text-green-700 underline">amenazas por WhatsApp</Link>.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿Qué es la usurpación según el art. 458 del Código Penal?</h2>
            <p className="text-gray-600 mb-4">La usurpación protege al que tiene la cosa, aunque no sea el dueño inscrito. Comete usurpación quien:</p>
            <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
              {[
                "Ocupa un inmueble ajeno con violencia o intimidación en las personas.",
                "Ocupa con fuerza en las cosas: rompe chapa, candado, cerco, ventana.",
                "Expulsa al ocupante legítimo para ocupar él, aunque la entrada inicial haya sido pacífica.",
                "Actúa con ánimo de señor: quiere quedarse, no solo pasar.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2"><span className="text-green-600 flex-shrink-0">✓</span><span className="text-gray-700 font-bold">{item}</span></li>
              ))}
            </ul>
            <p className="text-gray-600 mt-4">No hay usurpación si entraste con permiso del dueño y luego no te vas: eso es precario (civil), no penal. Tampoco si retuviste el inmueble por deuda: el tribunal lo verá como conflicto civil.</p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl mt-4">
              <p className="font-bold text-blue-900">Resumen clave</p>
              <p className="text-blue-800">Usurpación en Chile = ocupación de inmueble ajeno con violencia/fuerza o expulsión del poseedor, con ánimo de apropiación (art. 458). Pena: presidio 541 días a 5 años. Se denuncia en Fiscalía/PDI/Carabineros.</p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Usurpación vs Violación de morada vs Conflicto civil por arriendo</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Figura</th><th className="border border-gray-300 p-3">Artículo</th><th className="border border-gray-300 p-3">Conducta</th><th className="border border-gray-300 p-3">Vía</th></tr></thead>
                <tbody>
                  <tr><td className="border border-gray-300 p-3 font-bold">Usurpación</td><td className="border border-gray-300 p-3">458</td><td className="border border-gray-300 p-3">Ocupar con fuerza/violencia para quedarse</td><td className="border border-gray-300 p-3">Penal — Fiscalía</td></tr>
                  <tr><td className="border border-gray-300 p-3 font-bold">Violación de morada</td><td className="border border-gray-300 p-3">144</td><td className="border border-gray-300 p-3">Entrar/permanecer en morada contra voluntad</td><td className="border border-gray-300 p-3">Penal — Fiscalía</td></tr>
                  <tr><td className="border border-gray-300 p-3 font-bold">Precario / Desalojo</td><td className="border border-gray-300 p-3">Civil</td><td className="border border-gray-300 p-3">Ocupante entró con permiso y no restituye</td><td className="border border-gray-300 p-3">Civil — Juzgado Civil</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-600 mt-4">La calificación inicial la hace Carabineros al tomar la denuncia, pero la Fiscalía puede recalificar. Si denuncias usurpación y había contrato, la causa se archiva y te derivan a sede civil.</p>
          </div>

          <RelatedLawyers category="Derecho Penal" />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Qué hacer paso a paso si te usurparon</h2>
            <div className="space-y-4">
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">1. No entres en confrontación y asegura prueba</h3><p className="text-gray-600 mt-2">Fotos del candado roto, video de la ocupación, fecha y hora. No uses fuerza: cualquier lesión te perjudica. Graba desde fuera y pide a vecinos que sean testigos.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">2. Reúne tu título</h3><p className="text-gray-600 mt-2">Copia de inscripción del Conservador de Bienes Raíces (dominio vigente), avalúo fiscal, contribuciones, cuentas de luz/agua a tu nombre y contrato de compraventa. Si heredas, posesión efectiva.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">3. Denuncia en Fiscalía / PDI / Carabineros</h3><p className="text-gray-600 mt-2">Relata: fecha en que saliste, cuándo notaste la ocupación, cómo entraron, si te expulsaron o forzaron acceso. Pide que se fije en el parte que solicitas restitución del inmueble.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">4. Pide restitución anticipada</h3><p className="text-gray-600 mt-2">Tu abogado puede presentar querella por art. 458 y solicitar al Juzgado de Garantía la restitución del inmueble como medida cautelar real. Si hay flagrancia, Carabineros puede detener en el acto.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">5. No firmes acuerdos informales sin asesoría</h3><p className="text-gray-600 mt-2">Promesas de "me voy en 15 días" sin acta son comunes y luego se retractan. Cualquier acuerdo debe quedar en audiencia con el tribunal.</p></div>
            </div>
          </div>

          <InArticleCTA category="Derecho Penal" title="¿Te usurparon tu casa o terreno?" message="Un abogado penal puede calificar el delito, presentar la querella y pedir la restitución inmediata de tu inmueble." />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Qué documentos y pruebas necesitas</h2>
            <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
              {[
                "Inscripción de dominio con vigencia (Conservador) y plano si es rural.",
                "Fotos y videos del antes/después, cercos rotos, chapas forzadas, con fecha.",
                "Comprobantes de posesión: luz, agua, aseo, contribuciones, patente si es local.",
                "Testigos: vecinos que vieron la ocupación o la expulsión.",
                "Parte policial y RUC de la causa para hacer seguimiento.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2"><span className="text-green-600 flex-shrink-0">✓</span><span className="text-gray-700 font-bold">{item}</span></li>
              ))}
            </ul>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Penas y consecuencias</h2>
            <p className="text-gray-600 mb-4">El art. 458 sanciona con presidio menor en grado medio a máximo (541 días a 5 años). Si hay concurso con amenazas, lesiones o daños, las penas se suman. El tribunal debe ordenar la restitución, pero la entrega material puede demorar si hay controversia sobre el título.</p>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl">
              <p className="font-bold text-amber-900">Agravante frecuente</p>
              <p className="text-amber-800">Si la ocupación fue con violencia o participó un grupo, la pena se aplica en su grado máximo y es más probable la prisión preventiva. Documenta cualquier amenaza.</p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Casos prácticos</h2>
            <div className="space-y-4">
              <div className="bg-gray-50 p-5 rounded-xl border"><h3 className="font-bold">Casa de veraneo ocupada tras invierno</h3><p className="text-gray-600 mt-2">Viajas 3 meses, vuelves y hay ocupantes que forzaron la puerta trasera. Es usurpación: denuncia con dominio y fotos del forzamiento. La Fiscalía pide restitución anticipada y el Juzgado la concede en audiencia.</p></div>
              <div className="bg-gray-50 p-5 rounded-xl border"><h3 className="font-bold">Parcela cercada por vecino</h3><p className="text-gray-600 mt-2">Vecino mueve cerco 3 metros y siembra. No hay violencia pero hay fuerza en las cosas (destrucción de cerco) y ánimo de señor: también es usurpación. Aporta plano y georreferenciación.</p></div>
              <div className="bg-gray-50 p-5 rounded-xl border"><h3 className="font-bold">Familiar que no se va</h3><p className="text-gray-600 mt-2">Prestaste la casa a tu hermano y no la devuelve. No es usurpación (hubo permiso inicial): es precario civil. Debes demandar restitución ante Juzgado Civil, no denunciar en Fiscalía.</p></div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿Qué pasa después de la denuncia? Investigación y restitución</h2>
            <p className="text-gray-600 mb-4">Presentada la denuncia o querella, el Ministerio Público abre una investigación. No es instantánea, pero tiene hitos claros que debes conocer para no quedarte esperando sin hacer nada.</p>
            <div className="space-y-4">
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">1. Investigación desformalizada</h3><p className="text-gray-600 mt-2">La Fiscalía pide a Carabineros o PDI que constaten la ocupación, tomen fotos del inmueble, empadronen testigos y soliciten el dominio vigente al Conservador. Esta etapa puede durar semanas. Si aportas plano y fotos fechadas, aceleras el peritaje.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">2. Citación y formalización</h3><p className="text-gray-600 mt-2">Si hay antecedentes de fuerza (chapa forzada, cerco destruido) y tu título es claro, el fiscal cita a los ocupantes y puede formalizar por art. 458. En la audiencia de formalización tu abogado puede pedir como medida cautelar real la restitución anticipada del inmueble (art. 157 CPP).</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">3. Restitución anticipada</h3><p className="text-gray-600 mt-2">El Juzgado de Garantía puede ordenar la entrega inmediata si la usurpación es manifiesta y tu dominio no se discute. Es más rápida que un juicio civil de precario (semanas vs meses). Si el tribunal duda del título, te derivará a sede civil.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">4. Juicio oral y sentencia</h3><p className="text-gray-600 mt-2">Si no hay salida alternativa, el caso va a juicio oral. La Fiscalía debe probar la fuerza y tu posesión previa. La sentencia condena y ordena la restitución definitiva con auxilio de la fuerza pública y lanzamiento si los ocupantes no salen.</p></div>
            </div>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl mt-4">
              <p className="font-bold text-amber-900">Cuánto demora</p>
              <p className="text-amber-800">Con flagrancia y dominio claro, la restitución anticipada puede lograrse en 2 a 6 semanas. Sin flagrancia o con título discutido, la investigación puede extenderse 3 a 8 meses.</p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Errores que te hacen perder tiempo</h2>
            <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
              <div className="space-y-6">
                {[
                  { title: "Entrar por la fuerza para recuperar", desc: "Te expones a ser denunciado por usurpación, lesiones o violación de morada. El desalojo solo lo ejecuta Carabineros con orden del tribunal." },
                  { title: "Denunciar usurpación con contrato de arriendo vigente", desc: "La Fiscalía archivará por atipicidad y perderás semanas. Si hubo arriendo, ve directo a precario/desalojo civil." },
                  { title: "No llevar dominio vigente", desc: "Sin inscripción del Conservador, Carabineros no puede verificar que eres poseedor y la denuncia queda débil." },
                  { title: "Negociar sin acta", desc: "Acuerdos verbales de salida en 15 días se incumplen. Todo acuerdo debe quedar registrado en audiencia." },
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
            <p className="text-amber-800">Si detectaste ocupantes, cada día sin denunciar borra huellas de fuerza y debilita la flagrancia. Denuncia el mismo día y pide que se deje constancia del estado del inmueble.</p>
          </div>

          <InArticleCTA title="¿Te quitaron tu casa o terreno?" message="Un abogado penal revisa tu dominio, presenta la querella por usurpación y solicita la restitución urgente de tu inmueble." buttonText="Hablar con un abogado penal" category="Derecho Penal" />

          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-4">Conclusión: recupera tu propiedad con la vía correcta</h2>
            <p className="text-gray-600 leading-relaxed mb-4">La usurpación en Chile no es un simple problema de "quién está adentro". Es un delito que protege tu posesión: si te sacaron con fuerza, te expulsaron o rompieron accesos para quedarse, la ley penal te respalda. La distinción con la violación de morada (entrar a tu hogar sin permiso) y con el precario civil (te presté la casa y no me la devuelves) es decisiva: la primera se denuncia en Fiscalía y puede darte restitución en semanas; la segunda también es penal pero con otra pena; la tercera es civil y demora meses.</p>
            <p className="text-gray-600 leading-relaxed mb-4">La experiencia muestra que los casos que se recuperan rápido tienen tres cosas en común: dominio vigente del Conservador en mano, fotos y videos de la fuerza con fecha, y denuncia el mismo día con solicitud expresa de restitución. Los que se entrampan suelen tener título discutido (herencia sin posesión efectiva, compraventa no inscrita) o prueba tardía (fotos tomadas semanas después, sin testigos).</p>
            <p className="text-gray-600 leading-relaxed mb-4">No negocies la salida sin acta, no entres por la fuerza y no pierdas tiempo denunciando usurpación si hubo contrato de arriendo: en ese caso ve directo a precario. Si dudas de la calificación, un abogado penal puede revisar tu dominio, tu relato y tus fotos y decirte en una sola reunión si tu caso es penal o civil y qué diligencias pedir.</p>
            <p className="text-gray-600 leading-relaxed">Si te ocuparon tu propiedad, actúa hoy: reúne tu inscripción, documenta la fuerza, denuncia en Fiscalía/PDI y pide restitución anticipada. Consulta con un <Link to="/abogados-penales" className="text-green-700 underline">abogado penal</Link> en LegalUp, revisa <Link to="/blog/violacion-de-morada-chile-2026" className="text-green-700 underline">violación de morada</Link> y <Link to="/blog/como-desalojar-a-una-persona-de-mi-propiedad-chile-2026" className="text-green-700 underline">cómo desalojar a una persona</Link>, y deja que el tribunal ordene el lanzamiento. Tu posesión no se defiende sola.</p>
          </div>

          <CategoryCTA category="penal" />

          <div className="mt-12 mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre usurpación</h2>
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
        <div className="mt-8"><BlogShare title="Usurpación de inmueble en Chile 2026" url="https://legalup.cl/blog/usurpacion-inmueble-chile-2026" /></div>
        <BlogNavigation currentArticleId="usurpacion-inmueble-chile-2026" />
        <div className="mt-4 text-center"><Link to="/blog" className="inline-flex items-center gap-2 text-green-900 hover:text-green-600 font-medium"><ArrowLeft className="h-4 w-4" />Volver al Blog</Link></div>
      </div>
      <BlogConversionPopup category="Derecho Penal" topic="usurpacion" />
    </div>
  );
};
export default BlogArticle;
