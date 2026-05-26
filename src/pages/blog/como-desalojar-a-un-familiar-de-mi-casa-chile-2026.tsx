import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  User,
  Clock,
  ChevronRight,
  CheckCircle,
  Info,
  AlertCircle,
  XCircle,
} from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import InArticleCTA from "@/components/blog/InArticleCTA";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

const faqs = [
  {
    question: "¿Puedo sacar a un familiar de mi casa sin ir a juicio en Chile?",
    answer: "Solo si el familiar acepta irse voluntariamente. Si no hay acuerdo, el único camino legal es a través de un tribunal. No puedes cambiar la cerradura, cortar servicios ni usar la fuerza aunque seas el dueño — hacerlo puede tener consecuencias legales para ti.",
  },
  {
    question: "¿Qué es la acción de precario y cuándo aplica?",
    answer: "La acción de precario es la demanda que permite recuperar un inmueble de quien lo ocupa sin título ni permiso del dueño. Aplica cuando un familiar vive en tu propiedad sin contrato, sin comodato documentado y sin ningún acuerdo formal que justifique su ocupación. Para ejercerla debes acreditar que eres el dueño y que el familiar no tiene título para ocupar el inmueble.",
  },
  {
    question: "¿Cuánto demora desalojar a un familiar en Chile?",
    answer: "Si el familiar acepta irse voluntariamente, puede resolverse en días o semanas. Si hay que ir a juicio, el proceso puede tomar entre 3 y 12 meses dependiendo de si el familiar se opone, la carga del tribunal y si hay factores adicionales como menores de edad o disputa sobre derechos en el inmueble.",
  },
  {
    question: "¿Qué pasa si el familiar tiene hijos viviendo en la propiedad?",
    answer: "La presencia de menores no impide el desalojo pero puede influir en los plazos que fije el tribunal. El juez puede considerar la situación de los menores al determinar cuánto tiempo tiene el familiar para abandonar el inmueble. Es una variable que puede alargar el proceso.",
  },
  {
    question: "¿El familiar puede alegar derechos sobre la propiedad?",
    answer: "Sí. Si el familiar argumenta que tiene algún derecho sobre el inmueble — por herencia, aportes económicos u otras razones — eso complica el proceso porque hay que resolver esa disputa antes o durante el juicio. En estos casos es especialmente importante contar con asesoría legal desde el inicio.",
  },
];

const BlogArticle = () => {

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="¿Cómo desalojar a un familiar de mi casa en Chile 2026? Guía legal paso a paso"
        description="Aprende cómo recuperar legalmente tu propiedad de un familiar en Chile 2026. Qué acción legal corresponde, cuánto demora y qué hacer si el familiar no quiere irse."
        image="/assets/desalojar-familiar-chile-2026.png"
        url="https://legalup.cl/blog/como-desalojar-a-un-familiar-de-mi-casa-chile-2026"
        datePublished="2026-05-25"
        dateModified="2026-05-25"
        faqs={faqs}
      />
      <Header onAuthClick={() => { }} />
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

          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-600">
            ¿Cómo desalojar a un familiar de mi casa en Chile 2026? Guía legal paso a paso
          </h1>

          {/* Quick Summary Card */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
              Resumen rápido
            </p>
            <ul className="space-y-2">
              {[
                "En Chile no puedes sacar a un familiar por la fuerza aunque seas el dueño",
                "El proceso legal depende de si hay contrato, acuerdo verbal o ningún acuerdo",
                "La acción legal más común es la demanda de precario o comodato",
                "El proceso puede tomar entre 3 y 12 meses dependiendo del tribunal y si hay oposición",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm sm:text-base text-gray-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl max-w-3xl leading-relaxed">
            Desalojar a un familiar es una de las situaciones legales más incómodas que existe. No es solo un problema jurídico — es una decisión que afecta relaciones personales y que muchas personas evitan hasta que ya no tienen opción.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>25 de Mayo, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Tiempo de lectura: 8 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
        <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare
            title="¿Cómo desalojar a un familiar de mi casa en Chile 2026? Guía legal paso a paso"
            url="https://legalup.cl/blog/como-desalojar-a-un-familiar-de-mi-casa-chile-2026"
            showBorder={false}
          />

          {/* Introducción */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed mb-6 font-medium">
              Pero cuando llega ese momento, la pregunta es siempre la misma: ¿qué puedo hacer legalmente para recuperar mi propiedad?
            </p>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              Esta guía te explica cómo funciona el proceso en Chile según tu situación específica.
            </p>
          </div>

          {/* Lo primero que debes entender */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Lo primero que debes entender: no puedes actuar por tu cuenta</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Aunque seas el dueño de la propiedad, en Chile no puedes sacar a un familiar por la fuerza, cambiar la cerradura mientras está dentro ni cortar servicios básicos para presionarlo a irse. Hacerlo puede constituir un delito, incluso si el familiar no tiene ningún derecho legal a estar ahí.
            </p>

            <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-lg mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-amber-900 font-bold text-base">
                  El único camino legal es a través de un tribunal. Sin orden judicial, no hay desalojo posible.
                </p>
              </div>
            </div>
          </div>

          {/* Qué tipo de relación tienes */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué tipo de relación tienes con el familiar?</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              El proceso legal varía según cómo llegó el familiar a vivir en tu propiedad.
            </p>

            {/* Caso 1 */}
            <div className="border border-gray-100 bg-white p-5 rounded-xl flex items-start gap-4 mb-4 shadow-sm">
              <div className="bg-gray-900 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
              <div>
                <p className="text-xl font-bold mb-2 text-gray-900">Le prestaste la propiedad (comodato)</p>
                <p className="text-gray-600 leading-relaxed">
                  Si le prestaste la propiedad formalmente — con o sin documento escrito — existe un contrato de comodato, que es un préstamo de uso gratuito. Para recuperarla, debes seguir las condiciones del acuerdo o, si no hay plazo definido, notificar al familiar que debe restituir el inmueble.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  Si el familiar no restituye voluntariamente, puedes demandar la restitución ante el tribunal civil.
                </p>
              </div>
            </div>

            {/* Caso 2 */}
            <div className="border border-gray-100 bg-white p-5 rounded-xl flex items-start gap-4 mb-4 shadow-sm">
              <div className="bg-gray-900 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
              <div>
                <p className="text-xl font-bold mb-2 text-gray-900">Vive ahí sin acuerdo formal (precario)</p>
                <p className="text-gray-600 leading-relaxed">
                  Esta es la situación más frecuente: el familiar empezó a vivir contigo o en tu propiedad de forma progresiva, sin ningún acuerdo formal. No hay contrato, no hay comodato documentado, simplemente está ahí.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  En este caso la acción legal se llama <strong>acción de precario</strong> — permite recuperar un inmueble de quien lo ocupa sin título ni permiso del dueño.
                </p>
                <p className="text-gray-600 mt-4 mb-3 font-medium">Para ejercerla necesitas:</p>
                <div className="space-y-2">
                  {[
                    "Acreditar que eres el dueño del inmueble",
                    "Demostrar que el familiar no tiene título ni permiso formal para ocuparlo",
                    "Presentar la demanda ante el tribunal civil competente",
                  ].map((req, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{req}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Caso 3 */}
            <div className="border border-gray-100 bg-white p-5 rounded-xl flex items-start gap-4 mb-4 shadow-sm">
              <div className="bg-gray-900 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
              <div>
                <p className="text-xl font-bold mb-2 text-gray-900">Tenía permiso pero ya no lo tienes</p>
                <p className="text-gray-600 leading-relaxed">
                  Si en algún momento le diste permiso explícito de vivir ahí pero ahora quieres que se vaya, debes revocar ese permiso formalmente antes de iniciar acciones legales. Lo recomendable es hacerlo por escrito — correo, carta notarial o mensaje con registro — dando un plazo razonable para que abandone el inmueble.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  Si no se va después del plazo, puedes demandar la restitución.
                </p>
              </div>
            </div>
          </div>

          {/* Interlink */}
          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/como-desalojar-a-una-persona-de-mi-propiedad-chile-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 ¿Cómo desalojar a cualquier persona de tu propiedad?
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Pasos del proceso */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Pasos del proceso legal</h2>

            <div className="space-y-4">
              {/* Paso 1 */}
              <div className="border border-gray-100 bg-white p-5 rounded-xl flex items-start gap-4 hover:bg-gray-50 transition-colors shadow-sm">
                <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">1</div>
                <div>
                  <p className="text-lg font-bold text-gray-900 mb-1">Intenta el acuerdo directo primero</p>
                  <p className="text-gray-700 leading-relaxed">
                    Antes de ir a tribunales, un acuerdo directo con el familiar es siempre la opción más rápida y menos costosa. Plantea claramente que necesitas recuperar la propiedad, da un plazo razonable y deja todo por escrito.
                  </p>
                  <p className="text-gray-600 mt-2 leading-relaxed">
                    Si hay acuerdo, formalízalo ante notario — un papel firmado que establezca la fecha de salida evita problemas futuros.
                  </p>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="border border-gray-100 bg-white p-5 rounded-xl flex items-start gap-4 hover:bg-gray-50 transition-colors shadow-sm">
                <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">2</div>
                <div>
                  <p className="text-lg font-bold text-gray-900 mb-1">Notificación formal si no hay acuerdo</p>
                  <p className="text-gray-700 leading-relaxed">
                    Si el acuerdo directo no funciona, el siguiente paso es enviar una carta notarial notificando al familiar que debe abandonar el inmueble en un plazo determinado. Esta carta tiene valor legal y puede ser relevante en el juicio posterior como evidencia de que intentaste resolver la situación antes de demandar.
                  </p>
                </div>
              </div>

              {/* Paso 3 */}
              <div className="border border-gray-100 bg-white p-5 rounded-xl flex items-start gap-4 hover:bg-gray-50 transition-colors shadow-sm">
                <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">3</div>
                <div>
                  <p className="text-lg font-bold text-gray-900 mb-1">Presentar la demanda</p>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Si el familiar no se va después de la notificación, presentas la demanda ante el Juzgado de Letras en lo Civil competente según la ubicación del inmueble.
                  </p>
                  <p className="text-gray-600 mb-3 font-medium">La demanda debe incluir:</p>
                  <div className="space-y-2">
                    {[
                      "Acreditación de tu dominio sobre el inmueble (escritura, certificado del Conservador de Bienes Raíces)",
                      "Documentación que pruebe que el familiar ocupa el inmueble sin título",
                      "La notificación previa si la hiciste",
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <InArticleCTA
            message="¿Necesitas recuperar tu propiedad de un familiar y no sabes por dónde empezar? Un abogado puede orientarte sobre la acción legal correcta."
            buttonText="Consultar sobre mi caso"
            category="Derecho Arrendamiento"
          />

          <div className="space-y-4 mt-12 mb-12">
            {/* Paso 4 */}
            <div className="border border-gray-100 bg-white p-5 rounded-xl flex items-start gap-4 hover:bg-gray-50 transition-colors shadow-sm">
              <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">4</div>
              <div>
                <p className="text-lg font-bold text-gray-900 mb-1">Notificación al familiar por receptor judicial</p>
                <p className="text-gray-700 leading-relaxed">
                  El tribunal notifica al familiar a través de un receptor judicial. Esta etapa puede tomar algunas semanas dependiendo de la disponibilidad del receptor y si el familiar es fácil de ubicar.
                </p>
              </div>
            </div>

            {/* Paso 5 */}
            <div className="border border-gray-100 bg-white p-5 rounded-xl flex items-start gap-4 hover:bg-gray-50 transition-colors shadow-sm">
              <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">5</div>
              <div>
                <p className="text-lg font-bold text-gray-900 mb-1">Audiencia y sentencia</p>
                <p className="text-gray-700 leading-relaxed">
                  El familiar tiene derecho a defenderse. Si no contesta la demanda, el proceso avanza más rápido. Si contesta y presenta argumentos, se fijan audiencias para presentar pruebas.
                </p>
                <p className="text-gray-600 mt-2 leading-relaxed">
                  Una vez que el juez dicta sentencia favorable, el familiar tiene un plazo para abandonar voluntariamente.
                </p>
              </div>
            </div>

            {/* Paso 6 */}
            <div className="border border-gray-100 bg-white p-5 rounded-xl flex items-start gap-4 hover:bg-gray-50 transition-colors shadow-sm">
              <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">6</div>
              <div>
                <p className="text-lg font-bold text-gray-900 mb-1">Lanzamiento si no cumple</p>
                <p className="text-gray-700 leading-relaxed">
                  Si el familiar no abandona el inmueble dentro del plazo fijado por el tribunal, puedes solicitar el lanzamiento con auxilio de la fuerza pública. Carabineros puede intervenir para ejecutar la orden.
                </p>
              </div>
            </div>
          </div>

          {/* Factores que complican */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Factores que complican el proceso</h2>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 p-5 bg-orange-50/50 rounded-xl border border-orange-100">
                <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-gray-900 mb-1">Menores de edad en el inmueble</p>
                  <p className="text-gray-700 leading-relaxed text-sm">
                    Si hay niños viviendo en la propiedad, el tribunal puede considerar su situación al fijar plazos o condiciones. Esto no impide el desalojo pero puede alargarlo.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 bg-orange-50/50 rounded-xl border border-orange-100">
                <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-gray-900 mb-1">El familiar alega derechos sobre la propiedad</p>
                  <p className="text-gray-700 leading-relaxed text-sm">
                    Si el familiar argumenta que tiene algún derecho sobre el inmueble — herencia, sociedad conyugal, aportes económicos — el proceso se vuelve más complejo porque hay que resolver esa disputa primero. En estos casos es especialmente importante contar con abogado desde el inicio.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 bg-orange-50/50 rounded-xl border border-orange-100">
                <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-gray-900 mb-1">Años de ocupación</p>
                  <p className="text-gray-700 leading-relaxed text-sm">
                    Aunque en Chile la prescripción adquisitiva requiere muchos años de posesión continua y en condiciones específicas, una ocupación muy prolongada puede generar argumentos adicionales para el familiar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 bg-orange-50/50 rounded-xl border border-orange-100">
                <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-gray-900 mb-1">Relación familiar tensa</p>
                  <p className="text-gray-700 leading-relaxed text-sm">
                    Los conflictos emocionales durante el proceso pueden llevar a situaciones que complican el juicio — amenazas, daños al inmueble, negativa a recibir notificaciones. Documentar todo desde el inicio es clave.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Interlink */}
          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/cuanto-demora-juicio-desalojo-chile-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 ¿Cuánto demora un juicio de desalojo en Chile?
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Cuánto demora */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuánto demora el proceso?</h2>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden mb-8">
              <div className="bg-gray-900 px-6 py-3 border-b border-gray-800 uppercase tracking-widest text-xs font-bold text-white">
                Duración estimada por escenario
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { escenario: "Acuerdo directo con el familiar", duracion: "Días a semanas" },
                  { escenario: "Notificación y salida voluntaria", duracion: "2 a 4 semanas" },
                  { escenario: "Demanda sin oposición del familiar", duracion: "3 a 6 meses" },
                  { escenario: "Demanda con oposición y audiencias", duracion: "6 a 12 meses" },
                ].map((row, i) => (
                  <div key={i} className="grid grid-cols-2 px-6 py-4">
                    <span className="text-gray-700 font-medium text-sm">{row.escenario}</span>
                    <span className="text-gray-900 font-bold text-sm text-right">{row.duracion}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ¿Necesito abogado? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Necesito abogado?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Para casos simples donde el familiar no tiene ningún argumento legal y hay buena disposición de su parte, puede resolverse sin abogado. Pero en la práctica, tener un abogado desde el inicio acelera el proceso y evita errores en la demanda que pueden costar meses adicionales.
            </p>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-6">
              <div className="flex items-start gap-4">
                <Info className="h-6 w-6 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-gray-900 mb-2 text-lg">Cuando el abogado es necesario</p>
                  <p className="text-gray-600 leading-relaxed">
                    Si el familiar alega algún derecho sobre el inmueble, si hay menores involucrados o si la relación es especialmente conflictiva, el abogado no es opcional — es necesario.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Conclusión */}
          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Desalojar a un familiar en Chile es un proceso legal que requiere paciencia y los pasos correctos. No existe forma de hacerlo por la fuerza aunque seas el dueño — el único camino es judicial.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Lo más importante es actuar con claridad desde el inicio: intenta el acuerdo directo, documenta todo por escrito, y si no hay solución, presenta la demanda dentro de los plazos correctos. La acción de precario existe precisamente para estas situaciones y los tribunales chilenos la conocen bien.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed font-bold">
              Si hay menores involucrados, si el familiar alega derechos sobre el inmueble o si la situación es especialmente conflictiva, busca asesoría legal antes de tomar cualquier paso. Un error en la demanda puede costar meses adicionales de ocupación.
            </p>
          </div>

          <InArticleCTA
            message="¿Necesitas recuperar tu propiedad de un familiar y no sabes cómo hacerlo legalmente? Un abogado puede evaluar tu caso y explicarte el proceso exacto."
            buttonText="Consultar sobre mi caso"
            category="Derecho Arrendamiento"
          />

          {/* FAQ */}
          <div className="mb-6 pt-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="bg-gray-50 p-6 rounded-xl border border-gray-200 cursor-pointer"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Final */}
        <section className="bg-white rounded-xl shadow-sm p-8 text-center mt-8 border">
          <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">
            ¿Necesitas recuperar tu propiedad de un familiar?
          </h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
            Conectamos a personas con abogados especialistas en desalojo y recuperación de inmuebles. Evalúa tu caso hoy y entiende cuáles son tus opciones legales concretas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/search?category=Derecho+Civil">
              <Button
                size="lg"
                className="bg-gray-900 hover:bg-green-900 text-white px-8 py-3 w-full sm:w-auto shadow-md"
              >
                Hablar con abogado ahora
              </Button>
            </Link>
          </div>
        </section>
      </div>

      <RelatedLawyers category="Derecho Civil" />

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8 mb-8">
          <BlogShare
            title="¿Cómo desalojar a un familiar de mi casa en Chile 2026? Guía legal paso a paso"
            url="https://legalup.cl/blog/como-desalojar-a-un-familiar-de-mi-casa-chile-2026"
          />
        </div>

        <BlogNavigation currentArticleId="como-desalojar-a-un-familiar-de-mi-casa-chile-2026" />

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

      <BlogConversionPopup category="Derecho Civil" topic="desalojo-familiar" />
    </div>
  );
};

export default BlogArticle;
