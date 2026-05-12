import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, AlertCircle, CheckCircle, XCircle, Gavel, Shield, MessageSquare, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import InArticleCTA from "@/components/blog/InArticleCTA";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Puedo desalojar a alguien sin ir a juicio en Chile?",
      answer:
        "No. En Chile todo desalojo requiere una orden judicial, independientemente de si hay contrato escrito, acuerdo verbal u ocupación sin permiso. El propietario no puede actuar por su cuenta para recuperar el inmueble — hacerlo puede constituir un delito.",
    },
    {
      question: "¿Cuánto demora desalojar a alguien en Chile?",
      answer:
        "Con contrato escrito y la Ley 21.461, un proceso bien llevado puede resolverse en 3 a 6 meses. Sin contrato o en casos de ocupación ilegal los plazos pueden extenderse hasta 12 meses o más, dependiendo de si el ocupante se defiende y de la carga del tribunal.",
    },
    {
      question: "¿Qué pasa si el ocupante no se va después de la orden judicial?",
      answer:
        "Si el ocupante no abandona el inmueble dentro del plazo fijado por el tribunal, puedes solicitar el lanzamiento con auxilio de la fuerza pública. Carabineros puede intervenir para ejecutar la orden y permitirte recuperar el inmueble.",
    },
    {
      question: "¿Puedo desalojar a un familiar o allegado?",
      answer:
        "Sí, pero el proceso puede ser más complejo. Si el familiar no tiene título ni permiso formal para ocupar el inmueble, existe una acción legal específica para recuperarlo. El tribunal puede considerar factores adicionales como menores de edad, por lo que la asesoría legal desde el inicio es especialmente importante.",
    },
    {
      question: "¿Puedo cambiar la cerradura para recuperar mi propiedad?",
      answer:
        "No mientras el ocupante esté dentro del inmueble. Cambiar la cerradura sin orden judicial puede constituir un acto ilegal aunque seas el propietario. El único camino legal es a través del proceso judicial correspondiente.",
    },
    {
      question: "¿Qué es la Ley Devuélveme Mi Casa y cómo me ayuda?",
      answer:
        "La Ley 21.461, conocida como Ley Devuélveme Mi Casa, redujo los plazos del proceso de desalojo en Chile para casos de no pago y ocupación ilegal. Con esta ley, propietarios con contratos vigentes pueden recuperar sus inmuebles más rápidamente que con el procedimiento anterior.",
    },
  ];

  const title = "¿Cómo desalojar a una persona de mi propiedad en Chile 2026? Guía completa para propietarios";
  const url = "https://legalup.cl/blog/como-desalojar-a-una-persona-de-mi-propiedad-chile-2026";

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title={title}
        description="Aprende cómo desalojar legalmente a un arrendatario, familiar u ocupante en Chile 2026. Pasos, plazos, costos y qué hacer según tu situación."
        image="/assets/como-desalojar-chile-2026.png"
        url={url}
        datePublished="2026-05-02"
        dateModified="2026-05-02"
        faqs={faqs}
      />

      <Header onAuthClick={() => {}} />
      <ReadingProgressBar />

      <div className="bg-green-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>Artículo</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-600 text-balance">{title}</h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">Resumen rápido</p>
            <ul className="space-y-3">
              {[
                "El desalojo siempre requiere orden judicial — no puedes actuar por tu cuenta",
                "El proceso varía según si hay contrato, contrato verbal u ocupación sin acuerdo",
                "Con la Ley 21.461 (\"Devuélveme Mi Casa\") los plazos son más cortos que antes",
                "Un abogado puede hacer la diferencia entre un proceso de 3 meses y uno de 12",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm sm:text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl max-w-3xl mb-8">
            Si tienes a alguien ocupando tu propiedad y quieres recuperarla, lo primero que debes entender es esto: en Chile no puedes desalojar a nadie por tu cuenta. No importa si eres el dueño, si no te están pagando o si nunca existió un acuerdo formal. El único camino legal es a través de un tribunal.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>2 de Mayo, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Tiempo de lectura: 14 min</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto py-12">
        <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8">
          <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare title={title} url={url} showBorder={false} />

          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed">
              Esta guía 2026 ha sido diseñada para brindarte claridad absoluta sobre el proceso de desalojo en Chile. Si tienes a alguien ocupando tu propiedad y quieres recuperarla, lo primero que debes entender es esto: en Chile no puedes desalojar a nadie por tu cuenta. No importa si eres el dueño legítimo, si no te están pagando hace meses o si nunca existió un acuerdo formal por escrito. <strong>El único camino legal y seguro es a través de un tribunal civil.</strong>
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              La recuperación de un inmueble es, para muchos propietarios, una carrera contra el tiempo y contra la acumulación de deudas de servicios básicos y gastos comunes. Con la entrada en vigencia de la Ley 21.461, conocida como "Devuélveme Mi Casa", el panorama legal ha cambiado drásticamente en favor del dueño, permitiendo procedimientos mucho más ágiles que el antiguo juicio ordinario de arrendamiento. Sin embargo, la celeridad del proceso depende directamente de la estrategia inicial y de la correcta clasificación de tu caso.
            </p>
          </div>

          <InArticleCTA
            message="¿Necesitas iniciar un proceso de desalojo? Un abogado puede evaluar tu caso y explicarte los plazos exactos según tu situación."
            buttonText="Consultar sobre desalojo"
            category="Derecho Arrendamiento"
          />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué dice la ley sobre el desalojo en Chile?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              En Chile, recuperar un inmueble ocupado por otra persona requiere intervención de tribunales. Aunque seas propietario, no puedes sacar a alguien por la fuerza ni impedirle el acceso sin una orden. Hacerlo por cuenta propia (autotutela) puede exponerte a graves consecuencias legales.
            </p>

            <div className="bg-red-50 border border-red-100 rounded-xl p-6 mb-6">
              <p className="font-bold text-red-900 mb-4 flex items-center gap-2">
                Acciones Prohibidas (Nunca las realices por tu cuenta)
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  "Cambiar la cerradura con el ocupante dentro",
                  "Cortar agua, luz o gas como presión",
                  "Sacar pertenencias del ocupante a la calle",
                  "Entrar al inmueble sin consentimiento",
                  "Amenazar o presionar con terceros",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-red-800">
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-100 p-5 rounded-xl flex gap-4">
              <div>
                <p className="font-bold text-gray-900 mb-1">Advertencia Legal</p>
                <p className="text-gray-600 leading-relaxed">
                  Cualquiera de estas acciones puede derivar en una denuncia en tu contra por violación de morada u otros delitos, incluso si eres el propietario legítimo. El único camino seguro es el proceso judicial.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Caso 1 — Cómo desalojar a un arrendatario con contrato escrito</h2>
            <p className="text-gray-600 mb-6 leading-relaxed font-semibold">
              Esta es la situación ideal para el propietario. El contrato escrito es tu "ley privada" y la prueba reina en el juicio.
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-800">¿Cuándo puedes demandar?</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              La Ley 18.101 (modificada por la Ley 21.461) permite iniciar el proceso de desalojo ante el incumplimiento de las obligaciones contractuales. Las causales más efectivas son:
            </p>
            
            <div className="grid gap-4 mb-8">
              <div className="bg-green-50 border rounded-xl p-5 border-green-100 transition-colors shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-base sm:text-lg">
                  <span className="text-green-600 font-bold">✓</span>
                  Mora en el pago de la renta
                </h4>
                <p className="text-gray-600 leading-relaxed">
                  Desde el primer mes de atraso, ya estás facultado para demandar. No necesitas esperar tres meses ni enviar cartas notariales si el contrato no lo exige explícitamente para constituir la mora.
                </p>
              </div>
              <div className="bg-green-50 border rounded-xl p-5 border-green-100 transition-colors shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-base sm:text-lg">
                  <span className="text-green-600 font-bold">✓</span>
                  Término por plazo vencido
                </h4>
                <p className="text-gray-600 leading-relaxed">
                  Si el contrato llegó a su fin (desahucio) y el arrendatario no restituye el inmueble en la fecha pactada, se convierte en un ocupante ilegítimo y la demanda procede de inmediato.
                </p>
              </div>
            </div>

            <h3 className="text-xl font-bold mb-4 text-gray-800">El Procedimiento Monitorio (Ley Devuélveme Mi Casa)</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              La gran ventaja de tener un contrato escrito es acceder al <strong>procedimiento monitorio</strong>. Este trámite funciona así:
            </p>

            <div className="space-y-6 mb-10">
              {[
                {
                  step: "Presentación de la Demanda",
                  desc: "Tu abogado presenta la demanda solicitando el pago de las rentas adeudadas y el desalojo. Se debe acompañar el contrato (idealmente autorizado ante notario) y certificados de deudas de servicios."
                },
                {
                  step: "Resolución de Pago y Desalojo",
                  desc: "Si el juez considera que los antecedentes son suficientes, dictará una resolución ordenando al arrendatario pagar la deuda en un plazo de 10 días corridos bajo apercibimiento de lanzamiento."
                },
                {
                  step: "La Notificación Crítica",
                  desc: "Un receptor judicial debe notificar personalmente al arrendatario. Si no se encuentra, se solicita la notificación por cédula (dejando la copia en la puerta), lo cual requiere una búsqueda previa por parte del receptor."
                },
                {
                  step: "Los 10 días de espera",
                  desc: "Una vez notificado, el arrendatario tiene 10 días para pagar, defenderse (u oponerse) o irse. Si no hace nada, la resolución de desalojo queda firme y ejecutoriada de inmediato."
                },
                {
                  step: "Orden de Lanzamiento",
                  desc: "Se solicita al juez la orden de lanzamiento con auxilio de la fuerza pública. Carabineros coordinará contigo el día y la hora para ingresar a la propiedad y retirar a los ocupantes."
                }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex-shrink-0 w-7 h-7 bg-gray-900 text-white rounded-lg flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 text-lg mb-1">{item.step}</h5>
                    <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-gray-50 border border-gray-100 rounded-2xl p-8">
              <p className="font-bold text-gray-900 mb-2 text-lg flex items-center gap-2">
                ¿Cuánto demora realmente este proceso?
              </p>
              <p className="text-gray-600 leading-relaxed">
                Si el arrendatario no se defiende y es notificado rápido, el desalojo puede concretarse en <strong>3 a 5 meses</strong> bajo la Ley 21.461. Sin embargo, si el demandado presenta incidentes o si el receptor judicial tiene problemas para encontrarlo, el plazo puede estirarse hasta los 8 meses.
              </p>
            </div>

            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Información Adicional</p>
              <Link 
                to="/blog/orden-desalojo-chile-2026"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
              >
                👉 ¿Qué es una orden de desalojo y cómo funciona?
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <InArticleCTA
              message="¿Necesitas iniciar un proceso de desalojo de forma urgente? Un abogado experto puede evaluar tu caso y calcular los plazos exactos según tu contrato."
              buttonText="Consultar sobre desalojo"
              category="Derecho Arrendamiento"
            />
          </div>

          <div className="mb-12 border-t border-gray-100 pt-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Caso 2 — Cómo desalojar a alguien sin contrato escrito (Arriendo Verbal)</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Muchos propietarios en Chile arriendan "de palabra" a conocidos o familiares. Aunque el contrato verbal es <strong>legalmente válido</strong>, el desafío aquí no es la ley, sino la <strong>prueba</strong>.
            </p>

            <h3 className="text-xl font-bold mb-4 text-gray-800">El concepto de "Arriendo por Conducta"</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              En ausencia de papel, el tribunal debe declarar que existe un contrato basándose en los hechos. Si tú recibías dinero y él ocupaba la casa, hay arriendo. Pero cuidado: si el ocupante niega el arriendo y dice que "está ahí por favor", el juicio cambia a uno de <strong>Precario</strong> (ver Caso 3).
            </p>

            <div className="bg-white border rounded-2xl p-8 mb-8 shadow-sm">
              <h4 className="font-bold text-gray-900 mb-4 text-lg border-b pb-2">Evidencia crítica para arriendos verbales</h4>
              <p className="text-gray-500 mb-6">Debes recopilar todo lo siguiente antes de llamar a un abogado:</p>
              <ul className="space-y-4">
                {[
                  { label: "Cartolas Bancarias", detail: "Transferencias periódicas con glosas como 'arriendo', 'pago casa', etc." },
                  { label: "Comunicaciones Digitales", detail: "Capturas de WhatsApp donde se acuerde el monto o se reconozca la deuda." },
                  { label: "Testigos Calificados", detail: "Vecinos, conserjes o el presidente del comité de administración que vean al ocupante habitando el lugar." },
                  { label: "Pagos de Cuentas", detail: "Comprobantes de que el ocupante pagaba la luz o el agua a su nombre o mediante tu cuenta." },
                  { label: "Recibos Informales", detail: "Cualquier papel firmado (aunque sea una servilleta) donde se acuse recibo de dinero." }
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-green-600 font-bold">✓</span>
                    <div>
                      <span className="font-bold text-gray-900 block">{item.label}</span>
                      <span className="text-gray-600 leading-relaxed">{item.detail}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-gray-600 mb-8 leading-relaxed">
              <strong>El proceso judicial:</strong> Al no tener contrato autorizado ante notario, no puedes acceder al procedimiento monitorio rápido. Deberás iniciar un <strong>Juicio Sumario de Arrendamiento</strong>. Esto implica una audiencia de conciliación, contestación y prueba, lo que suele demorar entre <strong>8 a 12 meses</strong>.
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl mb-8">
              <p className="font-bold text-blue-900 mb-2">Recomendación del Experto</p>
              <p className="text-blue-800 leading-relaxed">
                Si aún tienes una relación cordial con el ocupante, intenta que firme un <strong>Anexo de Reconocimiento de Arriendo</strong> o un contrato simple ahora. Esto "formaliza" el pasado y te permitirá usar la Ley Devuélveme Mi Casa si decide dejar de pagar en el futuro.
              </p>
            </div>
          </div>

          <div className="mb-12 border-t border-gray-100 pt-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Caso 3 — Cómo desalojar a un ocupante ilegal, familiar o allegado (Juicio de Precario)</h2>
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mb-8 shadow-sm">
              <div className="flex gap-4">
                <p className="text-red-900 leading-relaxed font-medium">
                  Esta es técnicamente la situación más compleja y frustrante: cuando alguien ocupa tu casa <strong>"por mera tolerancia"</strong> o <strong>"ignorancia"</strong> tuya, sin que haya existido jamás un contrato ni un pago de por medio.
                </p>
              </div>
            </div>

            <h3 className="text-xl font-bold mb-4 text-gray-800">¿Qué es la Acción de Precario?</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El Código Civil establece que si un dueño permite que alguien use su cosa (el inmueble) sin un contrato previo, puede pedirla de vuelta en cualquier momento. El demandado solo tiene una defensa posible: <strong>exhibir un título que justifique su ocupación</strong> (un contrato de arriendo vigente, un usufructo, etc.). Si no tiene nada, el juez ordenará el desalojo.
            </p>

            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              <div className="p-6 rounded-2xl border">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-base">
                  Familiares y Allegados
                </h4>
                <p className="text-gray-600 leading-relaxed">
                  Es el caso típico del hijo que se queda con la pareja, el sobrino o el amigo al que le prestaste la casa "por un tiempo". Al no haber arriendo, la acción es de Precario. Ten en cuenta que si hay menores de edad involucrados, el juez podría otorgar plazos de salida ligeramente más extensos.
                </p>
              </div>
              <div className="p-6 rounded-2xl border">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-base">
                  Ocupación Ilegal ("Tomas")
                </h4>
                <p className="text-gray-600 leading-relaxed">
                  Si alguien entró a la fuerza o aprovechando que la casa estaba sola, la Ley 21.461 también introdujo una medida de <strong>restitución anticipada</strong>. Si puedes demostrar que eres el dueño y que hay peligro de daño, el juez puede ordenar el desalojo inmediato.
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              {[
                {
                  n: 1,
                  title: "Acreditar propiedad",
                  desc: "Demostrar que eres el dueño legítimo del inmueble mediante certificado de dominio vigente.",
                },
                {
                  n: 2,
                  title: "Demostrar falta de título",
                  desc: "Acreditar que el ocupante no tiene título ni permiso legal para estar ahí (hecho negativo que debe probar el demandado).",
                },
                {
                  n: 3,
                  title: "Solicitar la restitución",
                  desc: "Pedir formalmente al tribunal la entrega del inmueble bajo apercibimiento de lanzamiento.",
                },
              ].map((step) => (
                <div key={step.n} className="flex items-start gap-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex-shrink-0 w-7 h-7 bg-gray-900 text-white rounded-lg flex items-center justify-center">
                    {step.n}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-gray-900 text-lg block mb-1">{step.title}</span>
                    <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-gray-600 mb-8 leading-relaxed">
              <strong>Plazos del Precario:</strong> Al ser un juicio sumario, el tiempo estimado de tramitación es de <strong>10 a 14 meses</strong>. La lentitud se debe a que el tribunal debe cerciorarse de que no existe ningún derecho del ocupante antes de ordenar el lanzamiento.
            </p>

            <InArticleCTA
              message="¿Tienes a alguien ocupando tu propiedad sin pagar o sin permiso? Un abogado puede orientarte sobre la acción legal correcta según tu caso."
              buttonText="Evaluar mi caso ahora"
              category="Derecho Arrendamiento"
            />
          </div>

          <div className="mb-12 border-t border-gray-100 pt-12">
            <h2 className="text-2xl font-bold mb-8 text-gray-900 flex items-center gap-2">
              Errores comunes que alargan el proceso (y cómo evitarlos)
            </h2>
            <div className="space-y-6">
              {[
                {
                  title: "No realizar una búsqueda de domicilio exhaustiva",
                  desc: "Si el receptor judicial no logra notificar al ocupante, el juicio no avanza. A veces, por ahorrar dinero, los propietarios dan una sola dirección. Lo ideal es investigar si el ocupante tiene otros domicilios o lugar de trabajo para asegurar la notificación."
                },
                {
                  title: "Intentar negociar 'en el aire'",
                  desc: "Muchos propietarios pierden 6 meses negociando promesas de pago que nunca llegan. Si vas a negociar, hazlo con una demanda ya presentada. El 'miedo' a la resolución judicial es el mejor incentivo para que el ocupante pague o se retire voluntariamente."
                },
                {
                  title: "No documentar el estado del inmueble",
                  desc: "Al recuperar la casa, muchos se encuentran con daños estructurales. Si no tienes un inventario inicial firmado, no podrás cobrar esos daños en el mismo juicio ni mediante la retención de la garantía."
                },
                {
                  title: "No considerar los costos del Receptor Judicial",
                  desc: "El abogado cobra por su trabajo, pero el Receptor Judicial (el ministro de fe que notifica y lanza) cobra por cada actuación. Debes presupuestar estos costos para no detener el juicio a la mitad por falta de fondos."
                }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex-shrink-0 w-7 h-7 bg-gray-900 text-white rounded-lg flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                    <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12 border-t border-gray-100 pt-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuánto cuesta el proceso de desalojo en 2026?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Recuperar una propiedad es una inversión para detener una pérdida mayor. Los costos se dividen en tres áreas:
            </p>
            
            <div className="grid sm:grid-cols-3 gap-6 mb-8">
              <div className="text-left p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all"> 
                <h4 className="font-bold text-gray-900 mb-2">Honorarios Abogado</h4>
                <p className="text-gray-600 leading-relaxed">Varían según complejidad. Se suele cobrar una base más un bono al éxito al recuperar el inmueble.</p>
              </div>
              <div className="text-left p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <h4 className="font-bold text-gray-900 mb-2">Gastos de Receptor</h4>
                <p className="text-gray-600 leading-relaxed">Notificaciones, búsquedas y lanzamiento. Son aranceles que se pagan directamente al ministro de fe.</p>
              </div>
              <div className="text-left p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <h4 className="font-bold text-gray-900 mb-2">Mudanza y Fuerza</h4>
                <p className="text-gray-600 leading-relaxed">Si hay lanzamiento forzado, el dueño provee el camión para retirar muebles al depósito municipal.</p>
              </div>
            </div>

            <p className="text-gray-600 leading-relaxed italic">
              * Nota: La Ley 21.461 permite que el juez condene al demandado al pago de todas las <strong>costas procesales y personales</strong> del juicio. Si el demandado tiene bienes, podrías recuperar parte de lo invertido.
            </p>

            <h2 className="text-2xl font-bold mb-6 mt-12 text-gray-900">¿Necesito abogado para desalojar a alguien?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              En Chile, para comparecer en juicios ante tribunales civiles es obligatorio contar con el patrocinio de un abogado habilitado. Además, su presencia es fundamental para:
            </p>
            <div className="space-y-4">
              {[
                { title: "Evitar nulidades", desc: "Un error formal en la notificación o en el petitorio de la demanda puede anular meses de juicio." },
                { title: "Gestión de Receptores", desc: "El abogado coordina directamente con los ministros de fe para asegurar que las notificaciones se realicen en tiempo récord." },
                { title: "Embargos Preventivos", desc: "Solo un abogado puede solicitar medidas precautorias para asegurar el pago de las deudas (como retención de impuestos)." },
              ].map((reason, i) => (
                <div key={i} className="flex items-start gap-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="bg-green-900 p-2 rounded-lg text-green-600 w-8 h-8 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1 text-lg">{reason.title}</h4>
                    <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{reason.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12 border-t border-gray-100 pt-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión: Recuperar tu propiedad es posible</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Recuperar una propiedad en Chile es un proceso legal que requiere paciencia y los pasos correctos. No existe un atajo fuera del sistema judicial, pero con la Ley 21.461 los plazos son más razonables que nunca.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              La clave del éxito reside en dos puntos: <strong>la evidencia y la celeridad</strong>. Mientras antes inicies el proceso con las pruebas correctas (contratos, mensajes, pagos), más rápido podrá el tribunal dictar la orden de lanzamiento. El tiempo es el mejor aliado del ocupante; la ley y la acción rápida son los tuyos.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Independientemente de tu situación —contrato escrito, acuerdo verbal u ocupante sin permiso— existen herramientas legales efectivas para que las llaves de tu casa vuelvan a tus manos de forma definitiva y legítima.
            </p>
          </div>


          <div className="mb-4 border-t border-gray-100 pt-12" data-faq-section>
            <h2 className="text-2xl font-bold mb-8 text-gray-900">Preguntas frecuentes sobre Desalojo</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="bg-white rounded-2xl shadow-sm p-8 text-center mt-8 border border-gray-100 mb-12">
          <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">¿Quieres recuperar tu propiedad y no sabes por dónde empezar?</h2>
          <p className="text-lg text-gray-600 mb-6">
            Un abogado puede evaluar tu caso y explicarte el proceso exacto.
          </p>
          <div className="grid gap-3 md:grid-cols-2 mb-8 max-w-2xl mx-auto text-left">
            {[
              "Iniciar el juicio de desalojo (Ley 21.461)",
              "Notificar al ocupante mediante receptor judicial",
              "Solicitar el lanzamiento con fuerza pública",
              "Gestionar el cobro de rentas y servicios",
              "Recuperar la posesión definitiva de tu inmueble",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/search?category=Derecho+Arrendamiento">
              <Button
                size="lg"
                className="bg-gray-900 hover:bg-green-900 text-white px-8 py-3 w-full sm:w-auto transition-colors"
              >
                Hablar con un abogado ahora
              </Button>
            </Link>
          </div>
        </section>
      </div>

        <div className="w-full bg-gray-100/50">
          <RelatedLawyers category="Derecho Civil" />
        </div>

        <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
          <div className="mt-8">
            <BlogShare title={title} url={url} />
          </div>

          <BlogNavigation currentArticleId="como-desalojar-a-una-persona-de-mi-propiedad-chile-2026" />

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
      </div>
      <BlogConversionPopup category="Derecho Civil" />
    </div>
  );
};

export default BlogArticle;
