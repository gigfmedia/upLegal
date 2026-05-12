import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Qué es la Ley 21.461 o Ley Devuélveme Mi Casa?",
      answer:
        "La Ley 21.461, conocida como 'Devuélveme Mi Casa', fue promulgada en Chile para agilizar los procesos de desalojo. Redujo los plazos judiciales en casos de no pago de arriendo y ocupación ilegal, permitiendo a los propietarios recuperar sus inmuebles más rápidamente que con el procedimiento anterior.",
    },
    {
      question: "¿Puedo desalojar a un arrendatario de inmediato con esta ley?",
      answer:
        "No. La ley agilizó el proceso pero no elimina la necesidad de un juicio. Siempre se requiere presentar una demanda, notificar al arrendatario y obtener una orden judicial de desalojo. Lo que cambió es que los plazos son más cortos que antes de la reforma.",
    },
    {
      question: "¿Qué pasa si no tengo contrato escrito con el arrendatario?",
      answer:
        "El contrato verbal también puede ser válido en Chile, pero deberás probar su existencia ante el tribunal con otros medios: transferencias de pago, mensajes, testigos u otros documentos. Sin contrato escrito el proceso es más complejo, por lo que es recomendable contar con asesoría legal desde el inicio.",
    },
    {
      question: "¿Se puede demandar el desalojo y el pago de la deuda al mismo tiempo?",
      answer:
        "Sí. Puedes demandar tanto el término del contrato y el desalojo como el cobro de las rentas adeudadas en el mismo proceso judicial. Esto permite recuperar el inmueble y exigir el pago de la deuda acumulada sin necesidad de dos juicios separados.",
    },
    {
      question: "¿Qué pasa si el arrendatario se niega a salir después de la sentencia?",
      answer:
        "Si el tribunal dicta la orden de desalojo y el arrendatario se niega a abandonar el inmueble, se puede solicitar el lanzamiento con auxilio de la fuerza pública. Carabineros puede intervenir para ejecutar la orden judicial y permitir al propietario recuperar el inmueble.",
    },
  ];


  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title='Ley "Devuélveme Mi Casa" en Chile (Ley 21.461): Qué es y cómo recuperar tu propiedad en 2026'
        description="Ley Devuélveme Mi Casa (21.461): procedimiento monitorio de arriendo, desalojo, plazos, pasos y derechos en Chile 2026. Guía para propietarios ante arrendatario que no paga o no desocupa."
        image="/assets/ley-devuelveme-mi-casa-2026.png"
        url="https://legalup.cl/blog/ley-devuelveme-mi-casa-chile-2026"
        datePublished="2026-03-25"
        dateModified="2026-03-25"
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

          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-600">
            Ley &quot;Devuélveme Mi Casa&quot; en Chile (Ley 21.461): Qué es y cómo recuperar tu propiedad en 2026
          </h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
              Resumen rápido
            </p>

            <ul className="space-y-2">
              {[
                "La Ley Devuélveme Mi Casa busca acelerar desalojos en Chile",
                "Permite procedimientos más rápidos en ciertos casos de arriendo",
                "El arrendador igualmente necesita intervención judicial",
                "No autoriza desalojos por la fuerza ni cambios de cerradura",
                "Actuar rápido puede evitar que la deuda y el conflicto aumenten"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm sm:text-base text-gray-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl max-w-3xl leading-relaxed">
            La Ley &quot;Devuélveme Mi Casa&quot; (Ley 21.461) se ha convertido en una de las normas más relevantes en Chile para propietarios que enfrentan problemas con arrendatarios que no pagan o se niegan a abandonar una propiedad.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>25 de Marzo, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Tiempo de lectura: 15 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
        <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare
            title='Ley "Devuélveme Mi Casa" en Chile (Ley 21.461): Qué es y cómo recuperar tu propiedad en 2026'
            url="https://legalup.cl/blog/ley-devuelveme-mi-casa-chile-2026"
            showBorder={false}
          />

          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed mb-4">
              Si tienes una vivienda arrendada y el arrendatario dejó de pagar o no quiere desalojar, esta ley permite acelerar el proceso de recuperación del inmueble mediante un procedimiento judicial más rápido.
            </p>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8">
              <p className="font-bold text-gray-900 mb-4">En esta guía 2026 te explicamos:</p>
              <ul className="space-y-3 list-none p-0 m-0">
                {[
                  "Qué es la Ley 21.461",
                  "Cuándo se aplica",
                  "Cómo funciona el nuevo proceso de desalojo",
                  "Cuánto demora recuperar tu propiedad",
                  "Qué hacer paso a paso"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700 leading-relaxed">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-base font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué es la Ley &quot;Devuélveme Mi Casa&quot;?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              La Ley 21.461 es una modificación a la legislación de arrendamientos en Chile que busca agilizar los procesos de desalojo en casos donde el arrendatario incumple el contrato.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Antes de esta ley, los juicios de arriendo podían tardar varios meses o incluso años. Con esta nueva normativa, se establecen procedimientos más rápidos para:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {["Recuperar la propiedad por no pago", "Terminar contratos de arriendo", "Obtener el desalojo del arrendatario"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 leading-relaxed">
              En simple: le da más herramientas al propietario para recuperar su inmueble en menos tiempo.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuándo se puede aplicar esta ley?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">La Ley 21.461 se aplica principalmente en casos de:</p>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="bg-gray-900 rounded-full text-white text-sm font-bold w-8 h-8 flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-gray-900 text-lg block mb-2">No pago del arriendo</span>
                  <p className="text-gray-600 leading-relaxed">Cuando el arrendatario deja de pagar una o más rentas.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="bg-gray-900 rounded-full text-white text-sm font-bold w-8 h-8 flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-gray-900 text-lg block mb-2">Incumplimiento del contrato</span>
                  <p className="text-gray-600 mb-2 leading-relaxed">Por ejemplo:</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {["Subarriendo sin autorización", "Uso indebido del inmueble", "Daños graves a la propiedad"].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                        <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                        <span className="text-base text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="bg-gray-900 rounded-full text-white text-sm font-bold w-8 h-8 flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-gray-900 text-lg block mb-2">Término del contrato</span>
                  <p className="text-gray-600 leading-relaxed">
                    Cuando el contrato ya terminó y el arrendatario no se retira voluntariamente.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿La ley permite desalojar sin juicio?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed font-semibold">No.</p>
            <p className="text-gray-600 mb-4 leading-relaxed">Este es uno de los errores más comunes.</p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              En Chile no puedes desalojar por tu cuenta, aunque el arrendatario no pague.
            </p>
            <p className="text-gray-600 mb-2 leading-relaxed">No puedes:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {["Cambiar la cerradura", "Sacar sus pertenencias", "Cortar servicios básicos"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-red-50 p-3 rounded-lg border border-red-100 h-full min-h-[3rem]">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-4 leading-relaxed">Esto podría ser ilegal y perjudicarte judicialmente, siempre necesitas un proceso judicial.</p>
            <p className="text-gray-600 mb-4 leading-relaxed">Si quieres profundizar en esto, revisa:</p>
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link
                to="/blog/me-quieren-desalojar-que-hago-chile-2026"
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 ¿Me pueden desalojar sin orden judicial en Chile?
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="text-gray-600 mb-4 mt-8 leading-relaxed">Sobre cambiar la cerradura sin orden judicial:</p>
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link
                to="/blog/arrendador-puede-cambiar-cerradura-chile-2026"
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 ¿El arrendador puede cambiar la cerradura en Chile?
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué cambia con la Ley 21.461?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              El gran cambio es la creación de un procedimiento monitorio de arriendo, que permite acelerar el juicio.
            </p>
            <p className="text-gray-600 mb-2 font-semibold">Antes:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {["Juicio largo", "Múltiples audiencias", "Alta demora"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <span className="text-red-500 text-lg font-bold flex-shrink-0">❌</span>
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-2 font-semibold">Ahora:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {["Procedimiento más rápido", "Menos etapas", "Posibilidad de orden de desalojo en menos tiempo"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-4 mt-6 leading-relaxed">
              Si quieres entender qué es una orden de desalojo y cuándo ocurre en el proceso, revisa también:
            </p>
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link
                to="/blog/orden-desalojo-chile-2026"
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 Orden de desalojo en Chile: Guía 2026
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cómo funciona el procedimiento monitorio?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">Este es el punto más importante de la ley.</p>
            <p className="text-gray-600 mb-6 font-semibold">Paso a paso:</p>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="bg-gray-900 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-gray-900 text-lg block mb-2">Presentación de la demanda</span>
                  <p className="text-gray-600 mb-2 leading-relaxed">
                    El propietario presenta una demanda de arriendo ante el tribunal, solicitando:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {["Pago de rentas adeudadas", "Término del contrato", "Restitución del inmueble"].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-base text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="bg-gray-900 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-gray-900 text-lg block mb-2">Notificación al arrendatario</span>
                  <p className="text-gray-600 mb-2 leading-relaxed">
                    El tribunal notifica al arrendatario, quien tiene un plazo para:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {["Pagar la deuda", "Oponerse", "O no hacer nada"].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-base text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="bg-gray-900 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-gray-900 text-lg block mb-2">Si el arrendatario NO responde</span>
                  <p className="text-gray-600 mb-2 leading-relaxed">El tribunal puede dictar una resolución ordenando:</p>
                  <div className="grid sm:grid-cols-2 gap-3 mb-2">
                    {["Pago de la deuda", "Desalojo del inmueble"].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-base text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-gray-600 leading-relaxed">Esto acelera muchísimo el proceso.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="bg-gray-900 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0">
                  4
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-gray-900 text-lg block mb-2">Si el arrendatario se opone</span>
                  <p className="text-gray-600 leading-relaxed">
                    El caso pasa a un juicio más tradicional, pero ya con base avanzada.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="bg-gray-900 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0">
                  5
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-gray-900 text-lg block mb-2">Lanzamiento (desalojo)</span>
                  <p className="text-gray-600 leading-relaxed">
                    Si el tribunal falla a favor del propietario, se ordena el lanzamiento con auxilio de la fuerza pública si es necesario.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuánto demora recuperar una propiedad?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">Depende del caso, pero con la Ley 21.461:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {["Casos rápidos: 1 a 3 meses", "Casos con oposición: 3 a 6 meses o más"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-4 leading-relaxed">Antes podía tardar más de un año.</p>
            <p className="text-gray-600 mb-4 leading-relaxed">Si quieres entender cuánto demora todo este proceso, revisa también:</p>
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
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si el arrendatario no paga?</h2>
            <p className="text-gray-600 mb-2 leading-relaxed">Puedes demandar:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {["Rentas adeudadas", "Gastos comunes", "Servicios básicos", "Daños al inmueble"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-2 leading-relaxed">Además, puedes solicitar:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {["Intereses", "Costas del juicio"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Errores comunes de los propietarios</h2>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 my-8">
              <p className="text-gray-900 font-bold text-lg mb-6 leading-relaxed">
                Evita estos errores comunes para asegurar la recuperación legal de tu inmueble:
              </p>
              <div className="space-y-5">
                {[
                  { title: "Intentar desalojar por la fuerza", desc: "Es ilegal y perjudica seriamente tu posición judicial." },
                  { title: "No tener contrato de arriendo escrito", desc: "Dificulta comprobar la relación, aunque no impide demandar." },
                  { title: "No documentar la deuda", desc: "Es vital guardar comprobantes y comunicaciones." },
                  { title: "Esperar meses antes de actuar", desc: "Mientras más tiempo pasa, es más costoso recuperar la renta." }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <XCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-gray-900">{item.title}</p>
                      <p className="text-gray-600 text-base mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué derechos tiene el arrendatario?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Aunque la ley favorece al propietario, el arrendatario también tiene derechos:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {["Derecho a defensa", "Derecho a oponerse a la demanda", "Derecho a un juicio justo"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mt-4 leading-relaxed">Esto asegura equilibrio en el proceso.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Conviene usar esta ley sin abogado?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">No es recomendable.</p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              El procedimiento puede parecer simple, pero tiene aspectos técnicos como:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {["Redacción de la demanda", "Pruebas", "Plazos procesales"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 leading-relaxed">Un error puede retrasar todo el proceso.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuándo contactar a un abogado?</h2>
            <p className="text-gray-600 mb-2 leading-relaxed">Deberías hacerlo cuando:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                "El arrendatario deja de pagar",
                "No quiere desalojar",
                "Hay daños en la propiedad",
                "Necesitas recuperar el inmueble rápido"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Casos más comunes en Chile</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">Los problemas más frecuentes son:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                "Arrendatarios que dejan de pagar",
                "Ocupación ilegal tras término de contrato",
                "Conflictos por garantía",
                "Daños a la propiedad"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Relación con otros problemas de arriendo</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              La recuperación del inmueble forma parte de un proceso más amplio.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Por ejemplo, muchos conflictos comienzan con situaciones como:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {["Aumento del arriendo", "Deudas acumuladas", "Incumplimientos contractuales"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-4 leading-relaxed">Si estás enfrentando un problema de este tipo, también puede interesarte:</p>
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link
                to="/blog/me-subieron-el-arriendo-que-hago-2026"
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 ¿Me subieron el arriendo? Qué hacer hoy
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              La Ley "Devuélveme Mi Casa" (Ley 21.461) representa un cambio concreto para los propietarios en Chile: redujo los plazos del juicio de desalojo y simplificó el proceso en casos de no pago y ocupación ilegal. Antes de esta ley, recuperar un inmueble podía tomar años. Hoy el proceso es más rápido, aunque sigue siendo judicial.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Eso es lo más importante que debes entender: más rápido no significa inmediato. Todavía necesitas presentar una demanda, notificar al arrendatario y esperar la resolución del tribunal. No hay atajos legales para recuperar tu propiedad sin pasar por ese proceso.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Lo que sí cambia es que actuar bien desde el inicio — con la documentación correcta y asesoría legal adecuada — puede hacer la diferencia entre un proceso de 3 meses y uno de 12. Los errores en la demanda, las notificaciones mal hechas o los plazos vencidos son las razones más comunes por las que estos juicios se alargan innecesariamente.
            </p>
            <p className="text-gray-600 mb-4 font-bold leading-relaxed">
              Si eres propietario y necesitas recuperar tu inmueble, o si eres arrendatario y te acaban de notificar una demanda bajo esta ley, el momento de actuar es ahora.
            </p>
          </div>

          <div className="mb-12" data-faq-section>
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Preguntas frecuentes sobre la Ley 21.461</h2>
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

        {/* CTA Section */}
        <section className="bg-white rounded-xl shadow-sm p-8 text-center mt-8 border">
          <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">¿Necesitas recuperar tu propiedad?</h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
            Si estás enfrentando un problema de arriendo, puedes hablar con un abogado especialista en Derecho Civil y arrendamientos. ¿Problemas con tu arrendatario? Encuentra abogados expertos en arriendos y desalojos en Chile.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/search?category=Derecho+Civil">
              <Button
                size="lg"
                onClick={() => {
                  window.gtag?.("event", "click_consultar_abogado", {
                    article: window.location.pathname,
                    location: "blog_cta_ley_devuelveme_mi_casa_primary"
                  });
                }}
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
        <div className="mt-8">
          <BlogShare
            title='Ley "Devuélveme Mi Casa" en Chile (Ley 21.461): Qué es y cómo recuperar tu propiedad en 2026'
            url="https://legalup.cl/blog/ley-devuelveme-mi-casa-chile-2026"
          />
        </div>

        <BlogNavigation currentArticleId="ley-devuelveme-mi-casa-chile-2026" />

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
  );
};

export default BlogArticle;
