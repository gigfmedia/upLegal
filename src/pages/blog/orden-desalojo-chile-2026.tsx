import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, AlertCircle, XCircle, Shield } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Cuánto tiempo tengo para salir después de la orden de desalojo?",
      answer:
        "Depende de lo que establezca el tribunal en la resolución. En algunos casos se otorgan días para entregar voluntariamente el inmueble antes del lanzamiento. Si no abandonas la propiedad dentro del plazo fijado, el tribunal puede coordinar el desalojo forzado con auxilio de la fuerza pública."
    },
    {
      question: "¿Puedo evitar el desalojo en Chile?",
      answer:
        "En algunos casos sí. Actuar temprano puede marcar una diferencia importante. Dependiendo de la etapa del juicio, es posible negociar con el arrendador, pagar la deuda, solicitar más plazo o presentar defensas legales. Mientras antes reacciones, mayores son las opciones de evitar el lanzamiento."
    },
    {
      question: "¿Carabineros puede desalojar a un arrendatario?",
      answer:
        "Carabineros solo puede intervenir cuando existe una orden judicial válida emitida por el tribunal. El arrendador no puede sacar al arrendatario por su cuenta, cambiar cerraduras ni usar fuerza sin autorización judicial. Hacerlo puede ser ilegal."
    },
    {
      question: "¿Qué pasa con mis pertenencias durante el desalojo?",
      answer:
        "Las pertenencias deben ser retiradas conforme al procedimiento legal. Dependiendo del caso, pueden entregarse al arrendatario, quedar bajo custodia o levantarse un acta del procedimiento. El desalojo no autoriza destruir, apropiarse o botar los bienes del ocupante."
    },
    {
      question: "¿Qué pasa si no cumplo la orden de desalojo?",
      answer:
        "Si no entregas voluntariamente el inmueble dentro del plazo fijado, el tribunal puede ordenar el lanzamiento. En esa etapa puede intervenir receptor judicial y fuerza pública para ejecutar el desalojo. Además, la deuda de arriendo y los costos judiciales pueden seguir aumentando."
    },
    {
      question: "¿Se puede suspender una orden de desalojo?",
      answer:
        "En ciertos casos excepcionales sí. Dependiendo de la situación, se pueden presentar recursos, solicitar prórrogas, acreditar pagos, intentar acuerdos o discutir irregularidades del proceso. La posibilidad real de suspensión depende de la etapa del juicio y de los antecedentes del caso."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="Orden de desalojo en Chile: qué es, cuándo ocurre y cómo funciona (Guía 2026)"
        description="¿Qué es una orden de desalojo en Chile? Descubre cuándo se dicta, qué ocurre después, cómo funciona el lanzamiento y qué hacer si recibes una. Guía legal completa 2026."
        image="/assets/orden-desalojo-chile-2026.png"
        url="https://legalup.cl/blog/orden-desalojo-chile-2026"
        datePublished="2026-03-20"
        dateModified="2026-03-20"
        faqs={faqs}
      />
      <Header onAuthClick={() => {}} />
      <ReadingProgressBar />

      {/* Hero Section */}
      <div className="bg-green-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
            <ChevronRight className="h-4 w-4" />
            <span>Artículo</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-600 text-balance">
            Orden de desalojo en Chile: qué es, cuándo ocurre y cómo funciona (Guía 2026)
          </h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
              Resumen rápido
            </p>

            <ul className="space-y-2">
              {[
                "La orden de desalojo solo puede dictarla un tribunal",
                "No pueden sacarte sin proceso judicial",
                "El lanzamiento puede realizarse con Carabineros",
                "Ignorar la demanda aumenta el riesgo de desalojo",
                "Actuar rápido puede ayudarte a negociar o ganar tiempo"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm sm:text-base text-gray-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xl max-w-3xl leading-relaxed">
            Cuando existe un conflicto de arriendo, muchas personas escuchan el término "orden de desalojo", pero no siempre tienen claro qué significa ni en qué momento ocurre.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>20 de Marzo, 2026</span>
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
            title="Orden de desalojo en Chile: qué es, cuándo ocurre y cómo funciona (Guía 2026)"
            url="https://legalup.cl/blog/orden-desalojo-chile-2026"
            showBorder={false}
          />

          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed mb-4">
              Cuando existe un conflicto de arriendo, muchas personas escuchan el término "orden de desalojo", pero no siempre tienen claro qué significa ni en qué momento ocurre.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed mb-4">Entonces surge la duda:</p>
            <p className="text-lg text-gray-600 leading-relaxed mb-6 font-semibold">¿Qué es una orden de desalojo en Chile y cuándo puede aplicarse?</p>
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
              <p className="font-semibold text-blue-900 mb-3">En esta guía te explicamos:</p>
              <ul className="space-y-2">
                {[
                  "Qué es una orden de desalojo",
                  "En qué momento del proceso se dicta",
                  "Qué ocurre después (lanzamiento)",
                  "Qué hacer si recibes una orden de desalojo"
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
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué es una orden de desalojo en Chile?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Una orden de desalojo en Chile es una <strong>resolución judicial dictada por un tribunal</strong> que obliga al arrendatario a abandonar un inmueble.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">Esta orden:</p>
            <div className="space-y-3 mb-6">
              {[
                { text: "No es inmediata", icon: <XCircle className="h-5 w-5 text-red-500" /> },
                { text: "No la puede dictar el arrendador", icon: <XCircle className="h-5 w-5 text-red-500" /> },
                { text: "Solo puede ser emitida por un juez", icon: <CheckCircle className="h-5 w-5 text-green-600" /> }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {item.icon}
                  <span className="text-base text-gray-700">{item.text}</span>
                </div>
              ))}
            </div>
            <div className="bg-indigo-50 border-l-4 border-indigo-600 p-5 rounded-r-lg">
              <p className="text-indigo-900 leading-relaxed">
                Es importante entender que la orden de desalojo es el <strong>resultado de un proceso judicial previo</strong>, no una decisión unilateral.
              </p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuándo se dicta una orden de desalojo?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              La orden de desalojo se dicta al final de un juicio de arriendo, cuando el tribunal determina que el arrendatario debe restituir la propiedad.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">Esto puede ocurrir cuando:</p>
            <div className="space-y-3 mb-6">
              {[
                "Existe deuda de arriendo",
                "Se incumple el contrato",
                "El contrato ha terminado",
                "El arrendatario no abandona el inmueble"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 leading-relaxed">
              Es decir, la orden aparece cuando el conflicto ya ha sido analizado por un tribunal.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿En qué momento del proceso ocurre?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">Para entender bien este punto, es clave ver el proceso completo.</p>
            <h3 className="text-xl font-semibold mb-5 text-gray-800">Etapas hasta llegar a una orden de desalojo</h3>
            <div className="space-y-4 mb-6">
              {[
                { title: "Incumplimiento del contrato", desc: "El punto de partida del conflicto. El arrendatario no cumple con sus obligaciones, ya sea por falta de pago, permanencia no autorizada u otra infracción al contrato." },
                { title: "Presentación de la demanda", desc: "El arrendador acude al tribunal y presenta formalmente la demanda de término de arriendo o desalojo, iniciando el proceso judicial." },
                { title: "Notificación al arrendatario", desc: "El arrendatario es notificado del inicio del proceso legal, lo que le permite ejercer su derecho a defensa ante el tribunal." },
                { title: "Tramitación del juicio", desc: "Ambas partes presentan sus argumentos, pruebas y antecedentes. El tribunal evalúa el caso de forma objetiva durante esta etapa." },
                { title: "Sentencia del tribunal", desc: "El juez emite su resolución, determinando si el arrendatario debe o no restituir la propiedad al arrendador." },
                { title: "Orden de desalojo", desc: "Si la sentencia favorece al arrendador, el tribunal emite la orden formal. La orden es una consecuencia directa de la sentencia." }
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                  <div className="bg-gray-900 p-2 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0">{i + 1}</div>
                  <div>
                    <span className="font-bold text-gray-900">{step.title}</span>
                    <p className="text-base text-gray-600 mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
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
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuánto demora una orden de desalojo?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              La orden de desalojo no tiene un plazo propio, ya que depende del juicio.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">En términos generales:</p>
            <div className="space-y-3 mb-6">
              {[
                "Primero debe tramitarse el juicio",
                "Luego dictarse la sentencia",
                "Finalmente emitirse la orden"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="bg-gray-900 text-white rounded-full text-sm w-7 h-7 flex items-center justify-center flex-shrink-0">{i + 1}</div>
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 leading-relaxed italic">
              En la práctica, esto significa que la orden puede tardar varios meses en obtenerse.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa después de la orden de desalojo?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Una vez dictada la orden, el arrendatario debe abandonar el inmueble.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si no lo hace voluntariamente, se procede al lanzamiento.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-amber-900 text-xl mb-3">¿Qué es el lanzamiento?</h3>
              <p className="text-amber-800 mb-4 leading-relaxed">El lanzamiento es la ejecución de la orden de desalojo.</p>
              <p className="text-amber-800 mb-3 leading-relaxed">En esta etapa:</p>
              <ul className="space-y-2 mb-4">
                {[
                  "Se hace cumplir la resolución judicial",
                  "El arrendatario debe salir del inmueble",
                  "Puede intervenir la fuerza pública"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-amber-800">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-base">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-amber-900 font-bold">Es el momento en que el desalojo se materializa.</p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Diferencia entre orden de desalojo y lanzamiento</h2>
            <div className="overflow-x-auto border rounded-xl overflow-hidden shadow-sm mb-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-base font-bold text-gray-500 uppercase tracking-wider">Concepto</th>
                    <th className="px-6 py-4 text-left text-base font-bold text-gray-500 uppercase tracking-wider">Qué significa</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 text-base font-medium text-gray-900">Orden de desalojo</td>
                    <td className="px-6 py-4 text-base text-gray-600">Resolución judicial</td>
                  </tr>
                  <tr className="bg-gray-50/30">
                    <td className="px-6 py-4 text-base font-medium text-gray-900">Lanzamiento</td>
                    <td className="px-6 py-4 text-base text-gray-600">Ejecución de la orden</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-600 italic">Esta diferencia es clave para entender el proceso completo.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Puede haber desalojo sin orden judicial?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              En la mayoría de los casos, <strong>no es posible desalojar sin una orden judicial</strong>.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">Acciones como:</p>
            <div className="space-y-3 mb-4">
              {[
                "Cambiar la cerradura",
                "Impedir el acceso",
                "Sacar pertenencias"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-red-50 p-3 rounded-lg border border-red-100">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">pueden ser ilegales.</p>
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
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Relación con otros problemas de arriendo</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              La orden de desalojo forma parte de un proceso más amplio.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Por ejemplo, muchos conflictos comienzan con situaciones como:
            </p>
            <div className="space-y-3 mb-6">
              {[
                "Aumento del arriendo",
                "Deudas acumuladas",
                "Incumplimientos contractuales"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
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

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué hacer si recibes una orden de desalojo?</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Recibir una orden de desalojo es una situación delicada, por lo que es importante actuar rápidamente.
            </p>
            <div className="space-y-6">
              <div className="p-5 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gray-900 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0">1</div>
                  <span className="font-bold text-gray-900 text-lg">Revisar la resolución</span>
                </div>
                <p className="text-base text-gray-600 mb-3">Lee la orden cuidadosamente y verifica:</p>
                <ul className="space-y-2 ml-2">
                  {["Qué exige el tribunal", "Los plazos establecidos", "Las condiciones del desalojo"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-5 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gray-900 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0">2</div>
                  <span className="font-bold text-gray-900 text-lg">Evaluar opciones</span>
                </div>
                <p className="text-base text-gray-600 mb-3">Dependiendo del caso, podrías:</p>
                <ul className="space-y-2 ml-2">
                  {["Pagar la deuda", "Negociar con el arrendador", "Solicitar asesoría legal"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-5 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gray-900 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0">3</div>
                  <span className="font-bold text-gray-900 text-lg">Actuar dentro del plazo</span>
                </div>
                <p className="text-base text-gray-600">Los plazos son clave. No actuar puede llevar a la ejecución del lanzamiento.</p>
              </div>
              <div className="p-5 border rounded-xl hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gray-900 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0">4</div>
                  <span className="font-bold text-gray-900 text-lg">Buscar asesoría legal</span>
                </div>
                <p className="text-base text-gray-600 mb-3">Un abogado puede ayudarte a:</p>
                <ul className="space-y-2 ml-2">
                  {["Entender la situación", "Evaluar alternativas", "Tomar decisiones informadas"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué puede hacer el arrendador?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">El arrendador puede:</p>
            <div className="space-y-3 mb-6">
              {[
                "Iniciar una demanda",
                "Obtener una sentencia",
                "Solicitar una orden de desalojo",
                "Ejecutar el lanzamiento"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 leading-relaxed">Sin embargo, siempre debe actuar dentro del marco legal.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Errores comunes en desalojos</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">Muchos conflictos se agravan por errores evitables.</p>
            <p className="text-gray-600 mb-4 leading-relaxed">Entre los más comunes están:</p>
            <div className="space-y-3 mb-6">
              {[
                "Intentar desalojar sin orden judicial",
                "Cambiar la cerradura",
                "No seguir el proceso legal",
                "Desconocer los derechos del arrendatario"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-red-50 p-3 rounded-lg border border-red-100">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 leading-relaxed">Evitar estos errores es clave para resolver el conflicto correctamente.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Caso típico en Chile</h2>
            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
              <p className="text-indigo-900 leading-relaxed mb-3">Un arrendatario deja de pagar el arriendo durante varios meses.</p>
              <p className="text-indigo-900 leading-relaxed mb-3">El arrendador decide iniciar una demanda judicial.</p>
              <p className="text-indigo-900 leading-relaxed mb-3">Después del proceso, el tribunal dicta una orden de desalojo.</p>
              <p className="text-indigo-900 leading-relaxed mb-3">Si el arrendatario no abandona el inmueble, se ejecuta el lanzamiento.</p>
              <p className="text-indigo-900 leading-relaxed font-bold">Este es uno de los escenarios más comunes en Chile.</p>
            </div>
          </div>

          {/* Conclusion */}
          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              La orden de desalojo en Chile es una de las etapas más serias dentro de un conflicto de arriendo. Una vez que el tribunal la dicta, el proceso puede avanzar hasta el lanzamiento forzado del ocupante con auxilio de la fuerza pública. Por eso, ignorar una demanda o esperar “a ver qué pasa” suele empeorar rápidamente la situación.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Muchas personas creen que el desalojo ocurre automáticamente después de algunos meses sin pagar, pero la realidad es distinta. Siempre debe existir un proceso judicial, una resolución del tribunal y una ejecución formal. Sin embargo, eso no significa que el riesgo sea bajo: cuando la deuda aumenta y no existe respuesta del arrendatario, las probabilidades de perder el inmueble crecen considerablemente.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Para el arrendador, actuar a tiempo permite recuperar la propiedad más rápido y evitar que la deuda siga aumentando. Para el arrendatario, responder la demanda, negociar o buscar asesoría legal puede marcar una diferencia importante en los plazos y en las consecuencias económicas del caso.
            </p>
            <p className="text-gray-600 font-bold leading-relaxed">
              Lo más importante es entender que una orden de desalojo no aparece de un día para otro. Antes existen notificaciones, audiencias y oportunidades para actuar. Mientras antes enfrentes el problema, mayores serán las opciones de encontrar una solución y evitar consecuencias más graves.
            </p>
          </div>

          {/* Consulta con un abogado */}
          {/* <div className="mb-12 bg-blue-50 rounded-xl p-6 border border-blue-100">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Consulta con un abogado</h2>
            <p className="text-gray-600 mb-2 leading-relaxed">
              Si estás enfrentando un problema de arriendo o desalojo, es recomendable buscar orientación legal.
            </p>
            <p className="text-gray-600 leading-relaxed">
              En LegalUp puedes encontrar abogados que analicen tu caso y te orienten.
            </p>
          </div> */}

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

        {/* CTA Section */}
        <section className="bg-white rounded-xl shadow-sm p-8 text-center mt-8 border">
          <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">¿Tienes un problema de arriendo o desalojo?</h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
            Si estás enfrentando un problema de arriendo o desalojo, es recomendable buscar orientación legal. En LegalUp puedes encontrar abogados que analicen tu caso y te orienten.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/search?category=Derecho+Civil">
              <Button
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_consultar_abogado', {
                    article: window.location.pathname,
                    location: 'blog_cta_orden_desalojo_primary',
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

      <RelatedLawyers category="Arrendamiento" />

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare
            title="Orden de desalojo en Chile: qué es, cuándo ocurre y cómo funciona (Guía 2026)"
            url="https://legalup.cl/blog/orden-desalojo-chile-2026"
          />
        </div>

        <BlogNavigation currentArticleId="orden-desalojo-chile-2026" />

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
