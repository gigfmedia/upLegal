import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, AlertCircle, Info, Shield, FileText, MessageSquare } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import InArticleCTA from "@/components/blog/InArticleCTA";
import CategoryCTA from "@/components/blog/CategoryCTA";
import PreConclusionCTA from "@/components/blog/PreConclusionCTA";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";
import { ReadTime } from "@/components/blog/ReadTime";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Puedo demandar por no devolución de mes de garantía?",
      answer: "Sí. Si el arrendador retiene injustificadamente el mes de garantía, el arrendatario puede demandar judicialmente la devolución de los montos correspondientes."
    },
    {
      question: "¿El arrendador puede quedarse con toda la garantía?",
      answer:
        "Solo si justifica completamente los daños o deudas con respaldo documental — boletas, facturas o presupuestos de reparación. No puede retenerla de forma arbitraria ni por desgaste normal del inmueble. Si retiene la garantía sin respaldo, puedes demandar su devolución ante el tribunal civil competente.",
    },
    {
      question: "¿Puede el arrendador descontar por desgaste normal de la propiedad?",
      answer:
        "No. El desgaste natural del inmueble producto del uso habitual — pintura levemente desgastada, pequeñas marcas en paredes, deterioro normal de pisos — no puede cobrarse al arrendatario. Solo son descontables los daños que excedan el desgaste normal, como roturas, agujeros en paredes o daños por mal uso. Por eso es importante documentar el estado del inmueble con fotos al entrar y al salir.",
    },
    {
      question: "¿Qué pasa si el arrendador no responde mi solicitud de devolución?",
      answer:
        "Si el arrendador no responde ni devuelve la garantía dentro de un plazo razonable después de que entregaste el inmueble, puedes iniciar acciones legales ante el tribunal civil. Antes de demandar, documenta todos los intentos de comunicación — correos, WhatsApp, cartas — con fecha y hora. Ese registro es clave como prueba en el juicio.",
    },
    {
      question: "¿Hay plazo para reclamar la devolución de la garantía?",
      answer:
        "Sí. Las acciones civiles para cobrar deudas en Chile tienen plazos de prescripción — una vez vencidos, pierdes el derecho a demandar. No conviene dejar pasar más de un año desde que terminó el contrato sin actuar. Mientras antes reclames, más sólida es tu posición y más fácil es probar el estado del inmueble al momento de la entrega.",
    },
    {
      question: "¿Puedo recuperar la garantía sin ir a juicio?",
      answer:
        "Sí, y es lo más recomendable en primera instancia. Muchas veces una carta formal o la intervención de un abogado que contacte al arrendador resuelve el problema sin necesidad de juicio. El juicio es más lento, más costoso y más desgastante para ambas partes. Si la negociación directa falla, el tribunal civil es el siguiente paso.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="No me devuelven la garantía de arriendo en Chile: qué hacer y cómo recuperarla (Guía 2026)"
        description="Si el arrendador no te devuelve la garantía de arriendo en Chile, tienes derechos. Aprende paso a paso cómo recuperar tu dinero, cuándo pueden retenerla y cómo demandar."
        image="/assets/no-devuelven-garantia-arriendo-chile-2026.png"
        url="https://legalup.cl/blog/no-devuelven-garantia-arriendo-chile-2026"
        datePublished="2026-04-08"
        dateModified="2026-04-08"
        faqs={faqs}
      />
      <Header onAuthClick={() => { }} />
      <ReadingProgressBar />

      {/* Hero Section */}
      <div className="bg-green-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 text-white mb-4">
            <Link to="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>Artículo</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-600">
            No me devuelven la garantía de arriendo en Chile: qué hacer y cómo recuperarla (Guía 2026)
          </h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
              Resumen rápido
            </p>

            <ul className="space-y-2">
              {[
                "La garantía no puede ser retenida arbitrariamente por el arrendador",
                "Los descuentos deben estar justificados con daños o deudas reales",
                "El desgaste normal del inmueble no puede cobrarse al arrendatario",
                "Sin respaldo o inventario, retener la garantía puede ser ilegal",
                "Si no te devuelven el dinero, puedes exigirlo judicialmente"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm sm:text-base text-gray-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl text-white max-w-3xl leading-relaxed">
            Uno de los problemas más comunes al terminar un contrato de arriendo en Chile es que el arrendador no devuelve la garantía. Esta guía te explica cómo recuperar tu dinero paso a paso.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-white mt-6 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>8 de Abril, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <ReadTime slug="no-devuelven-garantia-arriendo-chile-2026" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
        <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare
            title="No me devuelven la garantía de arriendo en Chile: qué hacer y cómo recuperarla (Guía 2026)"
            url="https://legalup.cl/blog/no-devuelven-garantia-arriendo-chile-2026"
            showBorder={false}
          />

          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed font-medium">
              Muchas personas entregan la propiedad al finalizar su contrato de arriendo, esperan el pago de la garantía… y nunca reciben el dinero. Es uno de los conflictos más frecuentes entre arrendadores y arrendatarios en Chile.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed font-medium mt-2">
              Las dudas que surgen de inmediato son siempre las mismas:<br />
              ¿Es legal que no devuelvan la garantía?<br />
              ¿En qué casos pueden retenerla?<br />
              ¿Qué puedo hacer si no me la devuelven?
            </p>
            <p className="text-lg text-gray-600 leading-relaxed text-balance mt-2">
              En esta guía 2026 te explicamos cuáles son tus derechos, cuándo corresponde la devolución de la garantía de arriendo y cómo recuperar tu dinero paso a paso.
            </p>
          </div>

          {/* ¿Qué es la garantía? */}
          <div className="mb-6 py-2">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué es la garantía de arriendo?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              La garantía de arriendo es un monto que el arrendatario entrega al inicio del contrato como respaldo frente a posibles incumplimientos. Generalmente equivale a uno o dos meses de arriendo.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed font-medium">Su objetivo es cubrir:</p>
            <div className="space-y-3 mb-6">
              {[
                "Daños a la propiedad",
                "Deudas de arriendo",
                "Cuentas pendientes de servicios o gastos comunes"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cluster link 1 */}
          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/que-pasa-si-no-tengo-contrato-de-arriendo-chile-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 ¿Sin contrato escrito? Descubre tus derechos
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* ¿Se devuelve siempre? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿La garantía se devuelve siempre?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed font-semibold text-lg">
              No automáticamente, pero sí en la mayoría de los casos.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El arrendador puede retenerla solo si existen razones justificadas. A continuación te explicamos en qué casos corresponde devolverla y en cuáles pueden descontarla.
            </p>

            <div className="grid gap-6 mb-8">
              <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                <h3 className="font-bold text-green-900 mb-4 flex items-center gap-2">
                  {/* <CheckCircle className="h-5 w-5 text-green-600" /> */}
                  Casos en que SÍ deben devolverte la garantía
                </h3>
                <div className="space-y-2">
                  {[
                    "Propiedad entregada en buen estado",
                    "Arriendos pagados al día",
                    "Sin deudas de servicios o gastos comunes",
                    "Cumplimiento del contrato"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-base">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                <h3 className="font-bold text-red-900 mb-4 flex items-center gap-2">
                  {/* <AlertCircle className="h-5 w-5 text-red-500" /> */}
                  Casos en que pueden descontar o retener parte
                </h3>
                <div className="space-y-2">
                  {[
                    "Daños comprobables en la propiedad",
                    "Deudas de arriendo pendientes",
                    "Servicios impagos",
                    "Incumplimientos contractuales"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-red-800">
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span className="text-base">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8">
              <p className="text-gray-700 leading-relaxed font-bold">
                Importante: El arrendador debe justificar cualquier descuento con respaldo documental. No puede retener dinero de forma arbitraria.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Devolución sin descuentos</h3>
                <p className="text-green-700">Si entregaste la propiedad en buen estado y sin deudas, la garantía debe devolverse íntegramente en el plazo acordado.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Retención con respaldo documental</h3>
                <p className="text-red-700">El arrendador solo puede descontar si presenta boletas, facturas o presupuestos que acrediten daños reales que excedan el desgaste normal.</p>
              </div>
            </div>
          </div>

          {/* ¿Cuánto plazo? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuánto plazo tienen para devolver la garantía?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El plazo depende de lo que establezca el contrato de arriendo. En muchos casos se fija un plazo de 30 días desde la entrega del inmueble. Si el contrato no dice nada al respecto, la garantía debe devolverse en un plazo razonable.
            </p>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8">
              <h3 className="font-bold text-gray-900 mb-4 text-xl">Problema común en Chile</h3>
              <p className="text-gray-700 mb-4 leading-relaxed font-medium">Muchos arrendadores incumplen estas condiciones:</p>
              <div className="space-y-3">
                {[
                  "No devuelven la garantía sin justificación",
                  "Inventan descuentos sin respaldo",
                  "No entregan comprobantes ni boletas"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-gray-700">
                    <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <span className="text-base">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cluster link 2 */}
          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/me-subieron-el-arriendo-que-hago-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 ¿Te subieron el arriendo? Qué hacer hoy
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <InArticleCTA
            message="¿El arrendador no te devuelve la garantía? Un abogado puede orientarte sobre cómo recuperar tu dinero."
            buttonText="Hablar con abogado ahora"
            category="Derecho Arriendo"
          />

          {/* Qué hacer */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué hacer si no te devuelven la garantía?</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Si el arrendador no devuelve la garantía, existen pasos concretos que puedes seguir para recuperar tu dinero antes de tener que iniciar acciones legales.
            </p>

            <div className="space-y-4">
              {[
                {
                  title: "Revisar el contrato de arriendo",
                  desc: "Busca cláusulas sobre el plazo de devolución, las condiciones de descuento y el estado de entrega acordado. El contrato es tu principal respaldo legal.",
                  sublabel: "Revisa: Plazo de devolución · Condiciones de descuento · Estado de entrega"
                },
                {
                  title: "Verificar el estado de la propiedad",
                  desc: "Debes contar con evidencia que acredite el estado en que entregaste el inmueble: fotos, videos y acta de entrega firmada por ambas partes.",
                  sublabel: "Evidencias útiles: Fotos · Videos · Acta de entrega"
                },
                {
                  title: "Solicitar devolución formal",
                  desc: "Realiza una solicitud formal por correo electrónico, WhatsApp o carta. Incluye la fecha de entrega, el estado del inmueble y una solicitud clara de devolución.",
                  sublabel: "Medios válidos: Correo electrónico · WhatsApp · Carta certificada"
                },
                {
                  title: "Pedir respaldo de cualquier descuento",
                  desc: "Si el arrendador descuenta dinero de la garantía, está obligado a justificarlo con boletas, facturas o presupuestos de reparación.",
                  sublabel: "Exige: Boletas · Facturas · Presupuestos firmados"
                },
                {
                  title: "Negociar directamente",
                  desc: "Muchos casos se resuelven sin necesidad de ir a juicio. Una negociación directa o con apoyo de un abogado suele ser la solución más rápida.",
                  sublabel: "Opción más rápida y económica antes de demandar"
                },
                {
                  title: "Iniciar acciones legales",
                  desc: "Si no hay respuesta ni acuerdo, puedes demandar judicialmente para recuperar la garantía, más intereses y eventualmente costas.",
                  sublabel: "Procedimiento en tribunales civiles"
                }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900 mb-1">{item.title}</p>
                    <p className="text-base text-gray-600">{item.desc}</p>
                    <p className="text-xs text-gray-400 mt-2 italic">{item.sublabel}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Demandar */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Se puede demandar por la garantía?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed font-semibold text-lg">
              Sí. Puedes iniciar una acción civil para exigir la devolución del dinero.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Dependiendo del monto involucrado, el proceso puede tramitarse como procedimiento simplificado (más expedito) o como juicio ordinario ante un tribunal civil.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[
                { title: "Devolución del dinero", desc: "Puedes exigir el monto íntegro de la garantía retenida injustificadamente." },
                { title: "Intereses", desc: "Además del capital, puedes reclamar los intereses generados durante el período de retención." },
                { title: "Indemnización", desc: "En algunos casos corresponde indemnización adicional por los perjuicios causados." }
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <div className="bg-gray-900 w-7 h-7 rounded-full flex items-center justify-center text-white mb-4">{i + 1}</div>
                  <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-base text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8">
              <h3 className="font-bold text-gray-900 mb-4 text-xl">¿Necesito abogado para demandar?</h3>
              <p className="text-gray-700 leading-relaxed font-bold">
                En la mayoría de los casos, sí. Un abogado puede evaluar el caso, redactar la demanda correctamente y representarte adecuadamente, aumentando significativamente tus posibilidades de recuperar el dinero.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-6">
              <h3 className="font-bold text-gray-900 mb-3">Ejemplo práctico</h3>
              <p className="text-gray-600 leading-relaxed mb-3">
                Si entregaste una garantía de <strong>$500.000</strong> y el arrendador la retiene sin justificación, puedes reclamar:
              </p>
              <div className="space-y-2">
                {[
                  "$500.000 por concepto de garantía",
                  "Intereses legales desde la fecha de retención",
                  "Costas del proceso judicial"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="text-base">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Demanda con respaldo documental</h3>
                <p className="text-green-700">Si tienes fotos del estado de la propiedad al entregar, contrato y comunicaciones escritas, tu posición legal es mucho más sólida.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Sin pruebas del estado del inmueble</h3>
                <p className="text-red-700">Sin evidencia del estado de entrega, el arrendador puede alegar daños que no puedas refutar, debilitando tu caso.</p>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Se puede presentar una demanda por no devolución de mes de garantía?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Sí. Cuando el arrendador se niega injustificadamente a restituir el mes de garantía, el arrendatario puede presentar una demanda por no devolución de mes de garantía para exigir judicialmente el pago de los montos retenidos.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Para ello resulta importante conservar:
            </p>
            <div className="space-y-3 mb-6">
              {[
                "Contrato de arriendo",
                "Comprobantes de pago",
                "Inventario de entrega",
                "Fotografías del inmueble",
                "Comunicaciones con el arrendador"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si el propietario no logra justificar descuentos o daños atribuibles al arrendatario, el tribunal puede ordenar la devolución total o parcial del dinero retenido.
            </p>
          </div>

          {/* Cluster link 3 */}
          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/orden-desalojo-chile-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 Orden de desalojo: Guía completa 2026
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Errores comunes */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Errores comunes que debes evitar</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Estos son los errores más frecuentes al intentar recuperar una garantía de arriendo en Chile:
            </p>
            <div className="space-y-3 mb-6">
              {[
                "No dejar respaldo del estado del inmueble al momento de la entrega",
                "No exigir comprobantes de cualquier descuento al arrendador",
                "No revisar el contrato antes de firmar ni de reclamar",
                "Esperar demasiado tiempo para reclamar la garantía",
                "No formalizar la solicitud de devolución por escrito"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sin contrato */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si no hay contrato de arriendo?</h2>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8">
              <h3 className="font-bold text-gray-900 mb-4 text-xl">¿Qué pasa si no hay contrato de arriendo escrito?</h3>
              <p className="text-gray-700 leading-relaxed mb-6 font-medium">Aunque no tengas contrato escrito, también puedes reclamar la devolución de la garantía. Pruebas que sirven:</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  "Transferencias bancarias de pago",
                  "Mensajes de WhatsApp o correos",
                  "Testimonios de testigos",
                  "Fotografías y videos del inmueble",
                  "Recibos de pago de arriendo"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-gray-700">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-base text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Con pruebas de pago y comunicación</h3>
                <p className="text-green-700">Transferencias bancarias, mensajes y correos electrónicos sirven como prueba para reclamar la devolución de la garantía incluso sin contrato.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Sin registro de pagos ni acuerdos</h3>
                <p className="text-red-700">Sin evidencia de la relación de arriendo, reclamar la garantía se vuelve significativamente más difícil ante un tribunal.</p>
              </div>
            </div>
          </div>

          {/* Casos frecuentes */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Casos frecuentes en Chile</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Estos son los conflictos más habituales que enfrentan los arrendatarios chilenos al intentar recuperar su garantía:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { title: "Arrendador desaparece", desc: "No responde mensajes ni llamadas después de la entrega de la propiedad." },
                { title: "Descuentos sin justificación", desc: "Cobra reparaciones sin presentar boletas ni presupuestos firmados." },
                { title: "Retraso indefinido", desc: "Promete devolver el dinero pero aplaza la devolución semanas o meses." },
                { title: "Conflictos por daños menores", desc: "Discrepancias sobre si ciertos desgastes corresponden a daños reales o uso normal." }
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-base text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cluster link 4 */}
          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/reajuste-arriendo-ipc-chile-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 ¿Cómo calcular el reajuste por IPC?
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mb-12">
            <div className="bg-green-900 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-serif font-bold text-green-600 mb-3">¿El arrendador retiene tu garantía sin justificación?</h3>
              <p className="text-white mb-6">Un abogado inmobiliario puede evaluar si la retención es legal y ayudarte a recuperar tu dinero sin necesidad de llegar a juicio.</p>
              <Link to="/abogados-arriendo" className="inline-block bg-white text-green-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors">
                Ver abogados inmobiliarios disponibles
              </Link>
            </div>
          </div>

          {/* CTA before Conclusion */}
          <PreConclusionCTA
            description="Retener la garantía sin fundamento puede ser ilegal. Compara abogados especializados y recupera lo que te corresponde."
            link="/abogado-arriendo"
            buttonText="Comparar abogados especializados"
          />


          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿En qué situaciones conviene consultar cuanto antes a un abogado inmobiliario?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">La devolución de la garantía parece un trámite sencillo, pero hay situaciones donde el arrendador puede aprovecharse si no actúas con asesoría legal.</p>
            <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
              {["Cuando el arrendador retiene la garantía sin presentar boletas ni facturas que justifiquen los descuentos", "Cuando han pasado más de 30 días desde la entrega del inmueble y no hay señales de devolución", "Cuando el arrendador descuenta por desgaste normal del inmueble, como pintura o pequeñas marcas en paredes"].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 flex-shrink-0">•</span>
                  <span className="text-gray-700 font-bold">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Conclusión */}
          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              La garantía de arriendo no es un pago perdido — es tu dinero, y la ley chilena te da herramientas concretas para recuperarlo.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Aprender las reglas generales es el primer paso, pero la pregunta que queda abierta es cómo se aplican esas reglas a los hechos específicos de cada caso. Esa respuesta depende de los antecedentes concretos y de las circunstancias particulares de cada situación. Si quieres revisar una situación particular, puedes consultar con un <Link to="/abogados-arriendo" className="text-green-700 underline hover:text-green-500">abogado inmobiliario en Chile</Link>.
            </p>
          </div>

          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/derecho-arrendamiento-chile-guia-completa-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 Guía legal 2026: Todo sobre arriendos en Chile
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>


          <CategoryCTA category="arriendo" topic="arriendo" />
          {/* FAQ */}
          <div className="mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">Preguntas frecuentes sobre la devolución de la garantía de arriendo</h2>
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

      <RelatedLawyers category="Derecho Civil" />

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare
            title="No me devuelven la garantía de arriendo en Chile: qué hacer y cómo recuperarla (Guía 2026)"
            url="https://legalup.cl/blog/no-devuelven-garantia-arriendo-chile-2026"
          />
        </div>

        <BlogNavigation currentArticleId="no-devuelven-garantia-arriendo-chile-2026" />

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
      <BlogConversionPopup category="Derecho Inmobiliario" topic="garantia-arriendo" />
    </div>
  );
};

export default BlogArticle;
