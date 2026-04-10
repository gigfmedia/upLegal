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
      question: "¿Puedo desalojar a un arrendatario inmediatamente?",
      answer: "No. Siempre necesitas una orden judicial."
    },
    {
      question: "¿Qué pasa si no hay contrato escrito?",
      answer: "El contrato verbal también puede ser válido, pero deberás probar su existencia."
    },
    {
      question: "¿Se puede recuperar la propiedad si deben varios meses?",
      answer: "Sí. Puedes demandar el desalojo y el pago de la deuda."
    },
    {
      question: "¿La ley aplica a todas las propiedades?",
      answer: "Principalmente a contratos de arriendo, especialmente de uso habitacional."
    },
    {
      question: "¿Qué pasa si el arrendatario se niega a salir?",
      answer: "El tribunal puede ordenar el desalojo con apoyo de Carabineros."
    }
  ];


  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title='Ley "Devuélveme Mi Casa" en Chile (Ley 21.461): Qué es y cómo recuperar tu propiedad en 2026'
        description="Ley Devuélveme Mi Casa (21.461): procedimiento monitorio de arriendo, desalojo, plazos, pasos y derechos en Chile 2026. Guía para propietarios ante arrendatario que no paga o no desocupa."
        image="/assets/orden-desalojo-chile-2026.png"
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

          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-600 text-balance">
            Ley &quot;Devuélveme Mi Casa&quot; en Chile (Ley 21.461): Qué es y cómo recuperar tu propiedad en 2026
          </h1>

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
              <span>Tiempo de lectura: 14 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <BlogShare
            title='Ley "Devuélveme Mi Casa" en Chile (Ley 21.461): Qué es y cómo recuperar tu propiedad en 2026'
            url="https://legalup.cl/blog/ley-devuelveme-mi-casa-chile-2026"
            showBorder={false}
          />

          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed mb-4">
              Si tienes una vivienda arrendada y el arrendatario dejó de pagar o no quiere desalojar, esta ley permite acelerar el proceso de recuperación del inmueble mediante un procedimiento judicial más rápido.
            </p>
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 mb-6">
              <p className="font-semibold text-blue-900 mb-3">En esta guía 2026 te explicamos:</p>
              <ul className="space-y-2 list-none p-0 m-0">
                {[
                  "Qué es la Ley 21.461",
                  "Cuándo se aplica",
                  "Cómo funciona el nuevo proceso de desalojo",
                  "Cuánto demora recuperar tu propiedad",
                  "Qué hacer paso a paso"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-blue-800">
                    <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <span className="text-base">{item}</span>
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
            <div className="text-center py-4 border-t border-b border-gray-100">
              <Link
                to="/blog/me-quieren-desalojar-que-hago-chile-2026"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
              >
                👉 ¿Me pueden desalojar sin orden judicial en Chile?
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="text-gray-600 mb-4 mt-8 leading-relaxed">Sobre cambiar la cerradura sin orden judicial:</p>
            <div className="text-center py-4 border-t border-b border-gray-100">
              <Link
                to="/blog/arrendador-puede-cambiar-cerradura-chile-2026"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
              >
                👉 ¿El arrendador puede cambiar la cerradura en Chile? (Guía legal 2026)
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
            <div className="text-center py-4 border-t border-b border-gray-100">
              <Link
                to="/blog/orden-desalojo-chile-2026"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
              >
                👉 Orden de desalojo en Chile: qué es, cuándo ocurre y cómo funciona (Guía 2026)
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
            <div className="text-center py-4 border-t border-b border-gray-100">
              <Link
                to="/blog/cuanto-demora-juicio-desalojo-chile-2026"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
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
            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-lg">
              <p className="text-red-900 font-medium mb-6 leading-relaxed">
                Evita estos errores, son más comunes de lo que crees:
              </p>
              <div className="space-y-5">
                {[
                  { title: "Intentar desalojar por la fuerza", desc: "Puede ser ilegal y jugar en tu contra." },
                  { title: "No tener contrato de arriendo", desc: "Dificulta el proceso (aunque igual puedes demandar)." },
                  { title: "No documentar la deuda", desc: "Siempre guarda comprobantes." },
                  { title: "Esperar demasiado", desc: "Mientras más tiempo pasa, más difícil recuperar dinero." }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900">{item.title}</p>
                      <p className="text-red-800 text-base mt-1 leading-relaxed">{item.desc}</p>
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
            <div className="text-center py-4 border-t border-b border-gray-100">
              <Link
                to="/blog/me-subieron-el-arriendo-que-hago-2026"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
              >
                👉 Me subieron el arriendo, ¿qué hago?
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              La Ley &quot;Devuélveme Mi Casa&quot; (Ley 21.461) representa un cambio importante en Chile, permitiendo a los propietarios recuperar sus inmuebles de forma más rápida y efectiva.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Sin embargo, el proceso sigue siendo judicial, por lo que es clave actuar correctamente desde el inicio para evitar errores que retrasen el desalojo.
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
            <Link to="/consulta">
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
                Consultar con Abogado Ahora
              </Button>
            </Link>
            <Link to="/search?category=Derecho+Civil">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  window.gtag?.("event", "click_ver_abogados", {
                    article: window.location.pathname,
                    location: "blog_cta_ley_devuelveme_mi_casa_secondary"
                  });
                }}
                className="border-green-900 text-green-900 hover:bg-green-900 hover:text-white px-8 py-3 w-full sm:w-auto"
              >
                Ver abogados civiles
              </Button>
            </Link>
          </div>
        </section>
      </div>

      <RelatedLawyers category="Derecho Civil" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare
            title='Ley "Devuélveme Mi Casa" en Chile (Ley 21.461): Qué es y cómo recuperar tu propiedad en 2026'
            url="https://legalup.cl/blog/ley-devuelveme-mi-casa-chile-2026"
          />
        </div>

        <BlogNavigation
          prevArticle={{
            id: "me-pueden-despedir-sin-motivo-chile-2026",
            title: "¿Me pueden despedir sin motivo en Chile? (Guía 2026: derechos y qué hacer)",
            excerpt: "Descubre si es legal que te despidan sin motivo en Chile 2026. Conoce las causales de despido, tus derechos e indemnizaciones.",
            image: "/assets/despido-sin-motivo-chile-2026.png"
          }}
          nextArticle={{
            id: "que-pasa-si-no-tengo-contrato-de-arriendo-chile-2026",
            title: "¿Qué pasa si no tengo contrato de arriendo en Chile? (Guía legal 2026)",
            excerpt: "Arrendar sin contrato escrito es mucho más común de lo que parece en Chile. Descubre tus derechos.",
            image: "/assets/sin-contrato-arriendo-2026.png"
          }}
        />

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
