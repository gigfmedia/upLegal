import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
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
    { question: "¿Qué es manejar en estado de ebriedad en Chile?", answer: "Es conducir con alcohol en sangre igual o superior a 0,8 gramos por litro (art. 196 Ley 18.290). Conducir bajo la influencia es de 0,3 a 0,79 g/L. Ambas son delito: la diferencia está en la pena. El alcotest en terreno es indiciario; la alcoholemia (sangre) es la prueba que el tribunal valora. Con 0,8 ya arriesgas presidio, multa e inhabilidad, y con víctimas la pena se multiplica por la Ley Emilia." },
    { question: "¿Qué es la Ley Emilia?", answer: "Es la Ley 20.770 (2014) que endureció el manejo en estado de ebriedad con resultado de muerte o lesiones graves/gravísimas: pasó de falta a crimen (presidio de 1 año y 1 día a 10 años), sin pena sustitutiva (cárcel efectiva mínima 1 año), sin reclusión nocturna ni libertad vigilada, y con inhabilidad perpetua para conducir si hay muerte. También sanciona con cárcel la fuga sin prestar ayuda." },
    { question: "¿Cuál es la pena por manejo en estado de ebriedad sin lesionados?", answer: "Sin lesionados ni daños graves, la pena es presidio menor en grado mínimo (61 a 540 días), multa de 2 a 10 UTM e inhabilidad de 2 años si es primera vez, 5 años si ya tenías una condena por lo mismo y perpetua si es tercera. El tribunal puede ofrecer suspensión condicional del procedimiento si no tienes condenas previas, pagas multa y asistes a programa vial; si incumples, se revoca." },
    { question: "¿Me pueden quitar el auto por manejar ebrio?", answer: "Sí. Carabineros retiene el vehículo en el acto y lo deja en custodia. Si causas muerte o lesiones graves en ebriedad, el auto queda incautado como evidencia y puede ser comiso. Además el seguro obligatorio y el complementario no cubren si ibas ebrio, y la víctima puede demandarte civilmente por daño emergente, lucro cesante y daño moral por todo el perjuicio." },
    { question: "¿Qué pasa si me niego al alcotest?", answer: "Negarse al alcotest o a la alcoholemia es delito autónomo (art. 193 bis): presidio menor en grado mínimo (61 a 540 días), multa de 2 a 10 UTM e inhabilidad, además la ley presume tu ebriedad. Carabineros te llevará igual al hospital para la alcoholemia y tu negativa agrava tu situación en el control de detención." },
    { question: "¿Puedo quedar con pena sustitutiva si manejo ebrio y mato a alguien?", answer: "No. La Ley Emilia eliminó las sustitutivas para manejo ebrio con muerte: debes cumplir cárcel efectiva al menos 1 año, sin reclusión nocturna, sin libertad vigilada intensiva ni remisión condicional. Es una de las pocas situaciones donde la ley exige cárcel real mínima. Solo puedes optar a rebaja por colaboración sustancial, pero no a evitar la cárcel." },
    { question: "¿Qué hago si me detienen por manejo en estado de ebriedad?", answer: "Entrega licencia y padrón, guarda silencio sobre cuánto tomaste ('quiero hablar con mi abogado'), no firmes sin leer el parte, sóplate al alcotest pero exige de inmediato alcoholemia si dudas del resultado, y llama a tu abogado antes del control de detención (tienes 24 horas). Lleva a la audiencia tu licencia, certificado de alcoholemia y antecedentes." },
    { question: "¿Necesito abogado aunque sea primera vez?", answer: "Sí, y es cuando más lo necesitas. Aunque sea primera vez arriesgas licencia por 2 años, multa de hasta 10 UTM y antecedentes penales. Un abogado penal revisa si el alcotest está bien calibrado, pide la alcoholemia de contraste, negocia la suspensión condicional y evita que aceptes una salida que te deje con inhabilidad perpetua por un error técnico." },
    { question: "¿Qué pasa si manejo drogado o con medicamentos?", answer: "Manejar bajo influencia de drogas o psicotrópicos también es delito (art. 193 Ley de Tránsito), con las mismas penas que el alcohol. Carabineros usa narcotest y examen de sangre. El consumo recreativo no es atenuante. Si tomas medicamentos que advierten 'no conducir', avisa a tu abogado: la receta y la dosis importan para la calificación." },
    { question: "¿Cuánto dura la suspensión de licencia y cómo la recupero?", answer: "Primera vez sin víctimas: 2 años sin licencia. Segunda vez: 5 años. Tercera o con muerte: perpetua. La suspensión corre desde la sentencia ejecutoriada y la anota el Registro Civil. Para recuperarla debes cumplir el plazo, pagar la multa, hacer curso de reeducación vial y rendir examen teórico-práctico. Manejar suspendido es nuevo delito." },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <link rel="canonical" href="https://legalup.cl/blog/manejo-estado-ebriedad-ley-emilia-chile-2026" />
      </Helmet>
      <BlogGrowthHacks
        title="Manejo en estado de ebriedad y Ley Emilia en Chile 2026: penas y qué hacer si te detienen"
        description="Manejo en estado de ebriedad y Ley Emilia en Chile 2026: penas por 0,8 g/L, diferencias con influencia, cárcel, multa, licencia y qué hacer si te detienen."
        image="/assets/manejo-estado-ebriedad-ley-emilia-chile-2026.png"
        url="https://legalup.cl/blog/manejo-estado-ebriedad-ley-emilia-chile-2026"
        datePublished="2026-08-18"
        dateModified="2026-08-18"
        faqs={faqs}
      />
      <Header onAuthClick={() => {}} />
      <ReadingProgressBar />

      <div className="bg-[#f4efdf] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 mb-4 text-green-500"><Link to="/blog" className="hover:text-green-900 transition-colors">Blog</Link><ChevronRight className="h-4 w-4" /><span>Artículo</span></div>
          <h1 className="text-3xl sm:text-4xl font-bold text-green-900 font-serif mb-6">Manejo en estado de ebriedad y Ley Emilia en Chile 2026: penas y qué hacer si te detienen</h1><div className="bg-white backdrop-blur-sm border rounded-2xl p-6 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-4">Resumen rápido</p>
            <ul className="space-y-2 text-green-900">
              {[
                "Ebriedad = 0,8 g/L o más. Influencia = 0,3 a 0,79. Sobriedad = menos de 0,3.",
                "Ley Emilia (20.770): si matas ebrio, 1 a 10 años de cárcel efectiva + nunca más licencia.",
                "Negarte al alcotest/alcoholemia también es delito.",
                "Primera vez sin víctimas: puedes optar a suspensión condicional si cumples requisitos.",
                "El seguro no cubre si ibas ebrio y te demandarán civilmente.",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3"><span className="text-green-500 font-bold">✓</span><span className="text-sm sm:text-base">{item}</span></li>
              ))}
            </ul>
          </div>
          <p className="text-xl max-w-3xl text-green-900">Un control de Carabineros, un alcotest positivo y tu vida cambia en minutos. En Chile la tolerancia es mínima y la Ley Emilia hizo que manejar ebrio con muerte sea uno de los delitos más graves. Saber la diferencia entre influencia y ebriedad y qué decir en el control es decisivo.</p>
          <div className="flex flex-wrap items-center gap-4 mt-6 text-green-900">
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>18 de Agosto, 2026</span></div>
            <div className="flex items-center gap-2"><User className="h-4 w-4" /><span>Equipo LegalUp</span></div>
            <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><ReadTime slug="manejo-estado-ebriedad-ley-emilia-chile-2026" /></div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
        <div className="bg-white border sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare title="Manejo en estado de ebriedad y Ley Emilia en Chile 2026" url="https://legalup.cl/blog/manejo-estado-ebriedad-ley-emilia-chile-2026" showBorder={false} />

          <div className="prose prose-lg max-w-none mb-8">
            <p className="text-lg text-gray-600 leading-relaxed">La Ley de Tránsito (18.290) y la Ley Emilia (20.770) fijan un sistema de tramos por gramos de alcohol por litro de sangre. Superar 0,3 ya es delito; superar 0,8 agrava la pena y si hay víctimas, la Ley Emilia impone cárcel efectiva.</p>
            <p className="text-gray-600 mt-4">Esta guía 2026 explica los tramos, penas, multas, suspensión de licencia, qué pasa si te niegas al examen y qué hacer en el control de detención. También revisamos cómo un abogado puede pedir suspensión condicional o acuerdo.</p>
            <p className="text-gray-600 mt-4">Si te detuvieron, revisa <Link to="/blog/control-de-detencion-chile-2026" className="text-green-700 underline">control de detención</Link>, <Link to="/blog/formalizacion-chile-2026" className="text-green-700 underline">formalización</Link> y <Link to="/blog/accidente-transito-chile-2026" className="text-green-700 underline">accidente de tránsito</Link>.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿Cuánto alcohol es delito? Tramos en Chile</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Tramo</th><th className="border border-gray-300 p-3">Gramos por litro</th><th className="border border-gray-300 p-3">Calificación</th><th className="border border-gray-300 p-3">Pena base</th></tr></thead>
                <tbody>
                  <tr><td className="border border-gray-300 p-3">Sobriedad</td><td className="border border-gray-300 p-3">0 a 0,29</td><td className="border border-gray-300 p-3">No delito</td><td className="border border-gray-300 p-3">—</td></tr>
                  <tr><td className="border border-gray-300 p-3">Bajo influencia</td><td className="border border-gray-300 p-3">0,30 a 0,79</td><td className="border border-gray-300 p-3">Delito art. 193</td><td className="border border-gray-300 p-3">61-540 días + multa + 2 años sin licencia</td></tr>
                  <tr><td className="border border-gray-300 p-3 font-bold">Estado ebriedad</td><td className="border border-gray-300 p-3 font-bold">0,80 o más</td><td className="border border-gray-300 p-3 font-bold">Delito art. 196</td><td className="border border-gray-300 p-3">541 días a 3 años + multa + inhabilidad</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-600 mt-4">El alcohol se mide con alcotest en terreno y se confirma con alcoholemia (sangre) en el hospital. La alcoholemia es la prueba que vale en juicio.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Qué es la Ley Emilia y por qué cambia todo</h2>
            <p className="text-gray-600 mb-4">La Ley 20.770 (2014) nació tras la muerte de Emilia y endureció el manejo ebrio con víctimas. Antes, muchos conductores con muerte quedaban con pena sustitutiva. Hoy:</p>
            <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
              {[
                "Si causas muerte en ebriedad: presidio 3 años y 1 día a 10 años (crimen), cárcel efectiva mínima 1 año, sin reclusión nocturna.",
                "Si causas lesiones gravísimas en ebriedad: 3 años y 1 día a 5 años.",
                "Inhabilidad perpetua para conducir si matas (nunca más licencia).",
                "Fuga del lugar sin prestar ayuda también es delito grave y agrava la pena.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2"><span className="text-green-600 flex-shrink-0">✓</span><span className="text-gray-700 font-bold">{item}</span></li>
              ))}
            </ul>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl mt-4">
              <p className="font-bold text-blue-900">Resumen clave</p>
              <p className="text-blue-800">Ley Emilia en Chile = manejo en ebriedad (0,8+) con muerte o lesiones graves: pena 1 a 10 años cárcel efectiva + inhabilidad perpetua, sin sustitutiva (Ley 20.770).</p>
            </div>
          </div>

          <RelatedLawyers category="Derecho Penal" />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Penas según resultado</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Resultado</th><th className="border border-gray-300 p-3">Con alcohol 0,3-0,79</th><th className="border border-gray-300 p-3">Con 0,8+</th></tr></thead>
                <tbody>
                  <tr><td className="border border-gray-300 p-3">Sin lesiones</td><td className="border border-gray-300 p-3">61-540 días</td><td className="border border-gray-300 p-3">541 días -3 años</td></tr>
                  <tr><td className="border border-gray-300 p-3">Lesiones graves</td><td className="border border-gray-300 p-3">541 días -3 años</td><td className="border border-gray-300 p-3">3-5 años</td></tr>
                  <tr><td className="border border-gray-300 p-3">Muerte (Ley Emilia)</td><td className="border border-gray-300 p-3">3-5 años</td><td className="border border-gray-300 p-3">3-10 años + perpetua</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-600 mt-4">Además: multa 2 a 10 UTM, comiso del vehículo en casos graves y suspensión de licencia de 2 años (primera vez) a perpetua.</p>
          </div>

          <InArticleCTA category="Derecho Penal" title="¿Te detuvieron por manejar ebrio?" message="Un abogado penal puede revisar tu alcoholemia, pedir la suspensión condicional y evitar que pierdas tu licencia por años." />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Qué hacer si te detienen: paso a paso</h2>
            <div className="space-y-4">
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">1. No discutas y guarda silencio parcial</h3><p className="text-gray-600 mt-2">Entrega tu licencia y padrón, pero no declares sobre cuánto tomaste. Pide hablar con tu abogado antes de firmar.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">2. Sóplate al alcotest pero exige alcoholemia si dudas</h3><p className="text-gray-600 mt-2">Si el alcotest marca 0,82 y tomaste una cerveza hace 5 horas, el resultado puede estar inflado. La alcoholemia es más precisa y puedes exigirla.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">3. No te niegues al examen</h3><p className="text-gray-600 mt-2">Negarte es delito autónomo. Es mejor someterte y luego impugnar la medición con peritaje.</p></div>
              <div className="bg-white border p-5 rounded-xl"><h3 className="font-bold">4. Llama a tu abogado para el control de detención</h3><p className="text-gray-600 mt-2">En la audiencia el fiscal pedirá inhabilidad inmediata. Tu abogado puede ofrecer arraigo, firma y, si es primera vez y sin víctimas, pedir suspensión condicional.</p></div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿Cuándo puedes evitar la cárcel?</h2>
            <p className="text-gray-600 mb-4">Sin víctimas y primera vez, el tribunal puede ofrecer suspensión condicional del procedimiento (cumples condiciones 1 año y se archiva). Requisitos: no tener condenas previas, pagar multa y asistir a charla vial.</p>
            <div className="bg-green-50 p-5 rounded-xl">
              <p className="text-green-800">Si hay lesiones leves y el fiscal está de acuerdo, también cabe acuerdo reparatorio: indemnizas a la víctima y se cierra la causa. Con Ley Emilia y muerte, no hay salida alternativa.</p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Casos prácticos</h2>
            <div className="space-y-4">
              <div className="bg-gray-50 p-5 rounded-xl border"><h3 className="font-bold">Asado con 0,9 y control sin accidente</h3><p className="text-gray-600 mt-2">Te detienen con 0,9, sin lesionados. Pena: 541 días a 3 años, pero con suspensión condicional quedas sin antecedentes si cumples. Pierdes licencia 2 años.</p></div>
              <div className="bg-gray-50 p-5 rounded-xl border"><h3 className="font-bold">Choque con heridos graves y 1,2</h3><p className="text-gray-600 mt-2">Chocas ebrio y dejas lesionados graves. Pena: 3 a 5 años + inhabilidad perpetua si reincides. Solo queda juicio y atenuante de colaboración.</p></div>
              <div className="bg-gray-50 p-5 rounded-xl border"><h3 className="font-bold">Muerte con fuga</h3><p className="text-gray-600 mt-2">Matas ebrio y huyes sin ayudar. Se suman dos delitos: manejo ebrio con muerte (Ley Emilia) + no prestar ayuda. Pena efectiva mínima 1 año, real de 3 a 10.</p></div>
            </div>
          </div>

          
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Multa, licencia y seguro: lo que pagas además de la cárcel</h2>
            <p className="text-gray-600 mb-4">La pena privativa de libertad es solo una parte. Todo manejo ebrio lleva aparejada multa e inhabilidad, y si hay víctimas, el costo civil se dispara.</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Concepto</th><th className="border border-gray-300 p-3">Primera vez sin víctimas</th><th className="border border-gray-300 p-3">Con muerte (Ley Emilia)</th></tr></thead>
                <tbody>
                  <tr><td className="border border-gray-300 p-3">Multa</td><td className="border border-gray-300 p-3">2 a 10 UTM ($130.000 a $650.000 aprox.)</td><td className="border border-gray-300 p-3">Misma + indemnización civil millonaria</td></tr>
                  <tr><td className="border border-gray-300 p-3">Licencia</td><td className="border border-gray-300 p-3">2 años suspendida</td><td className="border border-gray-300 p-3">Perpetua (nunca más)</td></tr>
                  <tr><td className="border border-gray-300 p-3">Seguro</td><td className="border border-gray-300 p-3">No cubre daños si ibas ebrio</td><td className="border border-gray-300 p-3">No cubre y te demandan por todo</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-600 mt-4">La multa se paga en UTM al valor del día de pago. La inhabilidad la anota el Registro Civil y Carabineros la verifica en cada control. Manejar suspendido es nuevo delito y te cierra cualquier suspensión condicional.</p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl mt-4">
              <p className="font-bold text-blue-900">Dato práctico</p>
              <p className="text-blue-800">Si te condenan, la multa y la inhabilidad corren desde que la sentencia queda ejecutoriada. Pagar la multa antes no acorta la suspensión.</p>
            </div>
          </div>


          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Errores que te hacen perder la licencia por años</h2>
            <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
              <div className="space-y-6">
                {[
                  { title: "Soplar sin exigir alcoholemia", desc: "El alcotest puede marcar 0,3 más que la sangre. Pide alcoholemia para tener contraprueba." },
                  { title: "Declarar cuánto tomaste", desc: "Decir 'me tomé 3 piscolas' es confesión. Di 'quiero hablar con mi abogado'." },
                  { title: "Manejar suspendido", desc: "Si te suspenden y manejas igual, es nuevo delito y pierdes la suspensión condicional." },
                  { title: "No pedir suspensión a tiempo", desc: "Debes pedirla en el control de detención. Si esperas a la formalización, ya es tarde." },
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
            <p className="text-amber-800">Tienes 24 horas hasta el control de detención para conseguir abogado y pedir la alcoholemia de contraste. Después, la licencia queda suspendida de inmediato.</p>
          </div>

          <InArticleCTA title="¿Manejo en estado de ebriedad con control mañana?" message="Un abogado penal revisa tu alcotest, gestiona la suspensión condicional y pelea tu licencia." buttonText="Hablar con un abogado penal" category="Derecho Penal" />

          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-4">Conclusión: tu licencia y tus antecedentes están en juego</h2>
            <p className="text-gray-600 leading-relaxed mb-4">En Chile el límite de 0,8 gramos separa una falta de un delito que puede darte cárcel. La Ley Emilia convirtió el manejo ebrio con muerte en un crimen con cárcel efectiva mínima de un año, sin sustitutivas, y con inhabilidad perpetua. No es una amenaza: es la pena que los tribunales aplican cada semana.</p>
            <p className="text-gray-600 leading-relaxed mb-4">Lo que hagas en las primeras 24 horas define los próximos dos años: exigir alcoholemia si el alcotest te parece alto, guardar silencio hasta hablar con tu abogado, no manejar suspendido y pedir la suspensión condicional en el control de detención son las cuatro decisiones que separan a quien recupera su licencia en 2 años de quien la pierde para siempre. La multa y el seguro sin cobertura son el segundo golpe: sin prueba de alcoholemia, no tienes cómo pelear la medición.</p>
            <p className="text-gray-600 leading-relaxed">Si te detuvieron, no improvises tu declaración ni firmes sin leer. Reúne tu licencia, padrón y certificado de alcoholemia y consulta hoy con un <Link to="/abogados-penales" className="text-green-700 underline">abogado penal</Link> en LegalUp. Revisa también <Link to="/blog/accidente-transito-chile-2026" className="text-green-700 underline">accidente de tránsito: quién paga</Link> y <Link to="/blog/control-de-detencion-chile-2026" className="text-green-700 underline">control de detención: qué hacer si te detienen</Link> para llegar a la audiencia con estrategia, no con improvisación.</p>
          </div>

          <CategoryCTA category="penal" />

          <div className="mt-12 mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre manejo ebrio y Ley Emilia</h2>
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
        <div className="mt-8"><BlogShare title="Manejo en estado de ebriedad y Ley Emilia en Chile 2026" url="https://legalup.cl/blog/manejo-estado-ebriedad-ley-emilia-chile-2026" /></div>
        <BlogNavigation currentArticleId="manejo-estado-ebriedad-ley-emilia-chile-2026" />
        <div className="mt-4 text-center"><Link to="/blog" className="inline-flex items-center gap-2 text-green-900 hover:text-green-600 font-medium"><ArrowLeft className="h-4 w-4" />Volver al Blog</Link></div>
      </div>
      <BlogConversionPopup category="Derecho Penal" topic="ley-emilia" />
    </div>
  );
};
export default BlogArticle;
