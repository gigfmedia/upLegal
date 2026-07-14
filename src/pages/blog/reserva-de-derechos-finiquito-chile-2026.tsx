import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calendar, User, Clock, ChevronRight, CheckCircle, ShieldCheck, FileText, Gavel } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import { ReadTime } from "@/components/blog/ReadTime";
import InArticleCTA from "@/components/blog/InArticleCTA";
import CategoryCTA from "@/components/blog/CategoryCTA";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

const faqs = [
  {
    question: "¿Es válida la reserva de derechos si la empresa no está de acuerdo?",
    answer: "Sí, absolutamente. La reserva de derechos es un derecho irrenunciable del trabajador. No necesitas la autorización ni el visto bueno de tu empleador, de Recursos Humanos ni del notario para escribirla. Es un acto unilateral tuyo."
  },
  {
    question: "¿Pueden negarse a pagarme el finiquito si escribo la reserva?",
    answer: "No. El notario tiene la obligación de procesar el documento y el empleador tiene la obligación de entregarte el pago o el vale vista en ese mismo momento. Retener tu pago por haber escrito una reserva de derechos es ilegal."
  },
  {
    question: "¿Qué pasa si firmo digitalmente en la Dirección del Trabajo (DT)?",
    answer: "En el portal de la DT, justo antes de firmar electrónicamente con tu Clave Única, el sistema te muestra un recuadro específico que pregunta si deseas hacer una reserva de derechos. Debes escribirla en ese recuadro antes de confirmar la firma."
  },
  {
    question: "¿Cuánto tiempo tengo para demandar después de firmar?",
    answer: "Tienes un plazo legal de 60 días hábiles (no se cuentan domingos ni festivos) desde la fecha de tu despido para presentar una demanda por despido injustificado en los tribunales laborales. Ese reloj no se detiene."
  },
  {
    question: "¿Sirve la reserva si renuncié voluntariamente?",
    answer: "Generalmente no, ya que la renuncia voluntaria no da derecho a indemnización por años de servicio ni a recargos legales. La reserva está pensada principalmente para despidos por 'Necesidades de la empresa' u otras causales aplicadas por el empleador."
  }
];

const BlogArticle = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="Reserva de derechos en el finiquito en Chile: qué es, cómo escribirla y cuándo usarla (Guía 2026)"
        description="La reserva de derechos te permite firmar el finiquito sin renunciar a reclamar diferencias. Aprende cómo escribirla paso a paso."
        image="/assets/reserva-derechos-finiquito-chile-2026.png"
        url="https://legalup.cl/blog/reserva-de-derechos-finiquito-chile-2026"
        datePublished="2026-05-11"
        dateModified="2026-05-11"
        faqs={faqs}
      />
      <Header onAuthClick={() => { }} />
      <ReadingProgressBar />

      {/* Hero */}
      <div className="bg-green-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
            <ChevronRight className="h-4 w-4" />
            <span>Artículo</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-green-600 font-serif mb-6">
            Reserva de derechos en el finiquito en Chile: qué es, cómo escribirla y cuándo usarla (Guía 2026)
          </h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">Resumen rápido</p>
            <ul className="space-y-2">
              {[
                "La reserva de derechos te permite firmar el finiquito sin renunciar a reclamar diferencias",
                "Se escribe a mano antes de tu firma en el documento",
                "Es válida aunque el empleador no esté de acuerdo",
                "Tienes 60 días hábiles desde el despido para demandar después de firmar con reserva"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm sm:text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl">
            Firmar un finiquito es uno de los momentos más importantes al terminar una relación laboral — y uno de los más arriesgados si no sabes lo que estás haciendo. Muchos trabajadores firman sin revisar los montos, o peor, sin saber que pueden protegerse aunque no estén de acuerdo con lo que les están pagando.
          </p>
          <p className="text-xl mt-4">
            La reserva de derechos existe precisamente para eso: te permite recibir el pago sin cerrar la puerta a reclamar lo que crees que te corresponde.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>11 de Mayo, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <ReadTime slug="reserva-de-derechos-finiquito-chile-2026" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
        <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">

          <BlogShare
            title="Reserva de derechos en el finiquito en Chile (Guía 2026)"
            url="https://legalup.cl/blog/reserva-de-derechos-finiquito-chile-2026"
            showBorder={false}
          />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">¿Qué es la reserva de derechos en el finiquito?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              La reserva de derechos es una declaración formal que el trabajador escribe en el finiquito antes de firmarlo. Su objetivo es muy simple y poderoso: declarar que, aunque estás recibiendo el dinero ofrecido en ese momento, no estás de acuerdo con la causal de despido, con los montos calculados, o con ambos, y que te reservas el derecho a demandar la diferencia en tribunales.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si firmas un finiquito de manera pura y simple (es decir, sin escribir nada y solo poniendo tu firma), la ley chilena asume que estás 100% de acuerdo con lo que te pagaron. Esto genera un "poder liberatorio", lo que significa que el empleador queda libre de cualquier obligación futura contigo y tú pierdes automáticamente tu derecho a presentar una demanda laboral.
            </p>

            <InArticleCTA category="Derecho Laboral" />

            <p className="text-gray-600 mb-6 leading-relaxed font-semibold">
              En resumen: La reserva de derechos es tu salvavidas legal para poder cobrar tu dinero hoy y demandar mañana.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿Firmar con reserva o firmar sin reserva?</h2>
            <p className="text-gray-600 mb-4">La diferencia entre firmar un finiquito con reserva de derechos versus hacerlo sin ella puede determinar si puedes o no reclamar judicialmente después. Ambas opciones son válidas, pero sus consecuencias son radicalmente distintas.</p>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Firmar con reserva de derechos</h3>
                <p className="text-green-700">Recibes el pago inmediato del finiquito, pero te reservas el derecho a demandar por diferencias. Conservas tu capacidad de reclamar despido injustificado, recargos, o montos mal calculados dentro de los 60 días hábiles siguientes.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Firmar sin reserva de derechos</h3>
                <p className="text-red-700">Al firmar "pura y simplemente", el finiquito tiene poder liberatorio total. Renuncias a todo derecho de reclamar, incluso si después descubres que los montos eran incorrectos o si te pagaron menos de lo que correspondía por ley.</p>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">¿Cuándo debes usar la reserva de derechos?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Existen situaciones muy específicas donde debes escribir esta frase. Si te encuentras en cualquiera de los siguientes casos, no firmes el documento en blanco:
            </p>
            <div className="space-y-4">
              {[
                { title: "Despido por Necesidades de la Empresa", desc: "Es la causal más mal utilizada en Chile. Si te despiden bajo esta causal (Artículo 161) y la empresa va a seguir funcionando o van a contratar a alguien para tu mismo puesto, el despido es injustificado. Debes hacer reserva para demandar el 30% de recargo sobre tus años de servicio." },
                { title: "Descuento del Seguro de Cesantía (AFC)", desc: "Cuando te despiden por Necesidades de la Empresa, el empleador suele descontar del finiquito el aporte que ellos hicieron a tu Seguro de Cesantía. La Corte Suprema ha dictaminado repetidamente que este descuento es ilegal si el despido fue injustificado. Si te descuentan la AFC, debes hacer reserva de derechos para recuperar ese dinero." },
                { title: "Montos mal calculados", desc: "Si al revisar el finiquito notas que no te pagaron horas extras, comisiones, bonos pendientes, o que tus años de servicio están mal calculados, debes reservar tus derechos para cobrar esa diferencia." },
                { title: "Despido durante licencia médica", desc: "Si el término de tu contrato se hizo efectivo mientras estabas con licencia médica, debes hacer reserva de derechos ya que este procedimiento es ilegal." },
                { title: "Otras causales disciplinarias (Sin indemnización)", desc: "Si te despiden por incumplimiento grave (Artículo 160) y te niegan tus años de servicio, siempre debes dejar reserva de derechos para probar en tribunales que la empresa no tenía la razón y cobrar tu indemnización más un 80% de recargo." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-5 bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="text-green-600 flex-shrink-0 mt-1"><CheckCircle className="h-5 w-5" /></div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
                    <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/como-calcular-tu-finiquito-chile-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 ¿Cuánto te deben pagar en el finiquito? Calculadora 2026
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">El texto exacto: ¿Cómo se escribe la reserva de derechos?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              No sirve escribir algo general como "No estoy de acuerdo". La jurisprudencia chilena exige que la reserva sea específica. Debes escribir exactamente qué es lo que te estás reservando el derecho a reclamar.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Aquí tienes las frases exactas que debes copiar y escribir a mano en todas las copias del finiquito (generalmente son tres), justo arriba o al lado de donde vas a poner tu firma:
            </p>

            <div className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                <h3 className="font-bold text-blue-900 mb-3">1. Para despido por Necesidades de la Empresa y descuento AFC:</h3>
                <div className="bg-white p-4 rounded-lg font-mono text-gray-800 text-sm border shadow-sm">
                  "Me reservo el derecho a demandar por despido injustificado, nulidad del despido, cobro de prestaciones adeudadas y devolución del descuento del aporte del empleador al Seguro de Cesantía (AFC)."
                </div>
              </div>

              <div className="bg-amber-50 p-6 rounded-xl border border-amber-100">
                <h3 className="font-bold text-amber-900 mb-3">2. Para reclamar bonos u horas extras no pagadas:</h3>
                <div className="bg-white p-4 rounded-lg font-mono text-gray-800 text-sm border shadow-sm">
                  "Me reservo el derecho a demandar por despido injustificado y por el cobro de horas extras adeudadas, comisiones y bonos de producción no pagados correspondientes a los meses de [Mes] y [Mes]."
                </div>
              </div>

              <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                <h3 className="font-bold text-red-900 mb-3">3. Para despido por causales graves (Sin pago de años de servicio):</h3>
                <div className="bg-white p-4 rounded-lg font-mono text-gray-800 text-sm border shadow-sm">
                  "Me reservo el derecho a demandar por despido injustificado, indebido o carente de motivo plausible, cobro de indemnización sustitutiva de aviso previo, indemnización por años de servicio y recargos legales correspondientes."
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500 mt-4 italic">
              * Escribe la frase a mano con lápiz pasta. Asegúrate de hacerlo en la copia de la Notaría, en la copia del Empleador y en tu propia copia. Si la reserva no está en la copia de la empresa, no será válida en el juicio.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿Redactar una reserva específica o una genérica?</h2>
            <p className="text-gray-600 mb-4">La precisión de tu reserva de derechos determina qué puedes reclamar después en tribunales. No todas las frases tienen el mismo efecto legal, y una redacción equivocada puede dejarte sin protección.</p>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Reserva específica y detallada</h3>
                <p className="text-green-700">Mencionar exactamente los conceptos que reclamas (despido injustificado, descuento AFC, horas extras, bonos no pagados) le indica al juez exactamente qué estás disputando. Una reserva bien redactada tiene alta probabilidad de ser acogida en tribunales.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Reserva vaga o genérica</h3>
                <p className="text-red-700">Escribir frases como "No estoy de acuerdo" o "me reservo derechos genéricamente" suele ser insuficiente. Los tribunales pueden interpretar que no hubo una intención clara de disputar montos específicos, debilitando gravemente tu demanda.</p>
              </div>
            </div>
          </div>



          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">El momento clave: La Notaría</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El proceso en la notaría suele ser intimidante, pero debes mantener la calma y conocer tus derechos. Sigue estos pasos:
            </p>
            <div className="space-y-4">
              {[
                { step: "1", title: "Lee el documento", desc: "Tómate tu tiempo para leer el finiquito completo, revisar los montos y verificar que el vale vista corresponda exactamente a lo que dice el papel." },
                { step: "2", title: "Escribe la reserva", desc: "Antes de firmar nada, toma tu lápiz y escribe la reserva de derechos en todas las copias." },
                { step: "3", title: "Firma", desc: "Recién ahora, firma el documento." },
                { step: "4", title: "Exige tu pago", desc: "Una vez firmado, el notario debe entregarte el vale vista o cheque. Es ilegal que te digan 'firme ahora y le transferimos mañana'. El pago debe ser simultáneo." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-4 border rounded-xl bg-white shadow-sm hover:shadow-md transition-all">
                  <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
                    <p className="text-gray-700 text-base leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿Asesorarte con un abogado o firmar por tu cuenta?</h2>
            <p className="text-gray-600 mb-4">La decisión de ir a la notaría con asesoría legal o sin ella puede marcar la diferencia entre un finiquito bien protegido y uno que deje tu demanda inviable. Conocer tus derechos no siempre es suficiente.</p>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Firmar con asesoría legal previa</h3>
                <p className="text-green-700">Un abogado laboral revisa tu finiquito antes de la notaría, verifica los montos, identifica irregularidades y te redacta la reserva de derechos exacta para tu caso. Llegas preparado, sabes qué escribir y reduces el riesgo de errores.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Firmar sin asesoría legal</h3>
                <p className="text-red-700">Sin conocimiento legal, puedes pasar por alto descuentos indebidos, aceptar una causal incorrecta o redactar una reserva insuficiente. Muchos trabajadores descubren demasiado tarde que firmaron mal y ya no pueden reclamar.</p>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">¿En qué situaciones conviene consultar cuanto antes a un abogado laboral?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si te despidieron por Necesidades de la Empresa pero tu puesto sigue ocupado, si te descontaron el aporte del empleador al Seguro de Cesantía (AFC), si estabas con licencia médica al momento del despido, o simplemente si los montos del finiquito no te cuadran, consultar a un abogado laboral antes de firmar puede significar la diferencia entre recibir lo justo o perder miles de pesos.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Incluso si ya firmaste con reserva de derechos, un abogado evaluará si tu caso tiene mérito y te guiará en los pasos para presentar la demanda dentro del plazo de 60 días hábiles.
            </p>
            <div className="bg-green-900 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold font-serif text-green-600 mb-3">¿Te finiquitaron y crees que los montos no son correctos?</h3>
              <p className="text-white mb-6">Un abogado laboral puede revisar tu caso y decirte si vale la pena demandar. La reserva de derechos solo funciona si actúas a tiempo.</p>
              <Link
                to="/abogado-laboral"
                className="inline-flex items-center gap-2 bg-white text-green-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors group"
              >
                Consultar con un abogado laboral <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Conclusion */}
          <RelatedLawyers category="Derecho Laboral" />

          <div className="mb-12 border-t pt-8">

            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Firmar un finiquito es el punto final de tu contrato, pero no tiene por qué ser el final de tus derechos. La reserva de derechos es una herramienta legal perfectamente válida en Chile que protege tu dinero y te da la libertad de buscar justicia laboral.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Sin embargo, comprender cómo funciona la reserva de derechos y redactarla correctamente es solo el primer paso. Para maximizar tus posibilidades de éxito en una eventual demanda, lo más recomendable es buscar asesoría de un <Link to="/abogado-laboral" className="text-green-700 underline hover:text-green-500">abogado laboral</Link> que evalúe los detalles de tu caso y te represente en tribunales si corresponde.
            </p>
          </div>

          <CategoryCTA category="laboral" topic="despido" />
          {/* FAQ */}

          <div className="mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">Preguntas frecuentes</h2>
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
        <div className="mt-8">
          <BlogShare
            title="Reserva de derechos en el finiquito en Chile: qué es y cómo usarla (Guía 2026)"
            url="https://legalup.cl/blog/reserva-de-derechos-finiquito-chile-2026"
          />
        </div>

        <BlogNavigation currentArticleId="reserva-de-derechos-finiquito-chile-2026" />

        <div className="mt-4 text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-green-900 hover:text-green-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Blog
          </Link>
        </div>
      </div>

      <BlogConversionPopup category="Derecho Laboral" topic="reserva de derechos" />
    </div>
  );
};

export default BlogArticle;
