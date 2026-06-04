import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, ShieldAlert } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import CategoryCTA from "@/components/blog/CategoryCTA";
import InArticleCTA from "@/components/blog/InArticleCTA";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

const MediationChecker = () => {
  const [selectedTopic, setSelectedTopic] = useState("");

  const getRequirement = () => {
    switch (selectedTopic) {
      case "pension":
      case "aumento":
      case "rebaja":
      case "cuidado":
      case "visitas":
        return {
          status: "MEDIACIÓN OBLIGATORIA",
          color: "text-red-700 bg-red-50 border-red-200",
          message: "La ley exige obligatoriamente cumplir la etapa de mediación familiar antes de que puedas ingresar una demanda en el Tribunal de Familia. Si no hay acuerdo o una parte no asiste, se emitirá el certificado de mediación frustrada para poder demandar.",
        };
      case "cese":
        return {
          status: "MEDIACIÓN VOLUNTARIA / NO OBLIGATORIA",
          color: "text-amber-700 bg-amber-50 border-amber-200",
          message: "Para el cese de pensión de alimentos no es obligatorio pasar por mediación, aunque puedes intentarla de forma voluntaria para evitar un juicio si ambas partes están de acuerdo.",
        };
      case "divorcio":
      case "patria":
        return {
          status: "NO REQUIERE MEDIACIÓN PREVIA",
          color: "text-blue-700 bg-blue-50 border-blue-200",
          message: "Esta materia no está sujeta al requisito de mediación obligatoria. Puedes presentar la demanda directamente ante el Tribunal de Familia con la representación de un abogado.",
        };
      case "vif":
        return {
          status: "MEDIACIÓN PROHIBIDA / NO CORRESPONDE",
          color: "text-rose-700 bg-rose-50 border-rose-200",
          message: "En casos de violencia intrafamiliar (VIF), la ley prohíbe expresamente la mediación para resguardar la seguridad de la víctima. Debes canalizar la situación directamente mediante denuncia o demanda judicial.",
        };
      default:
        return null;
    }
  };

  const result = getRequirement();

  return (
    <div className="p-6 sm:p-8 rounded-2xl my-8 border border-gray-100 bg-white shadow-sm">
      <div className="max-w-xl mx-auto">
        <h3 className="text-xl font-bold mb-4 text-gray-900">
          Validador de Obligatoriedad de Mediación
        </h3>
        <p className="text-gray-500 mb-6">
          Selecciona la materia de tu conflicto familiar para saber si debes iniciar obligatoriamente un proceso de mediación.
        </p>

        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            ¿Cuál es la materia de tu caso?
          </label>
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm"
          >
            <option value="">-- Selecciona una opción --</option>
            <option value="pension">Solicitar pensión de alimentos</option>
            <option value="aumento">Aumento de pensión de alimentos</option>
            <option value="rebaja">Rebaja de pensión de alimentos</option>
            <option value="cuidado">Cuidado personal (Tuición) de hijos</option>
            <option value="visitas">Relación directa y regular (Régimen de visitas)</option>
            <option value="cese">Cese de pensión de alimentos</option>
            <option value="divorcio">Divorcio (Mutuo acuerdo o unilateral)</option>
            <option value="vif">Violencia Intrafamiliar (VIF)</option>
          </select>
        </div>

        {result && (
          <div className={`p-5 rounded-xl border ${result.color} transition-all`}>
            <span className="font-bold text-xs uppercase tracking-wider block mb-1">{result.status}</span>
            <p className="leading-relaxed text-gray-700 text-sm">{result.message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿La mediación familiar es obligatoria en Chile?",
      answer: "Sí, en materias como alimentos, cuidado personal y relación directa y regular es un requisito previo para demandar. Sin embargo, hay excepciones: casos de violencia intrafamiliar, medidas cautelares urgentes y otros supuestos legales están exentos de este requisito."
    },
    {
      question: "¿Qué ocurre si la otra persona no asiste o no se llega a acuerdo?",
      answer: "La mediación se declara frustrada y se emite un certificado que acredita esta situación. Con ese documento puedes iniciar la demanda ante el Tribunal de Familia correspondiente."
    },
    {
      question: "¿La mediación familiar tiene costo?",
      answer: "Puede ser gratuita mediante programas financiados por el Estado o pagada cuando se realiza con mediadores privados."
    },
    {
      question: "¿Cuánto demora una mediación familiar?",
      answer: "Depende del caso, pero puede extenderse desde algunas semanas hasta varios meses según la complejidad y disponibilidad de las partes."
    },
    {
      question: "¿Puedo asistir sin abogado?",
      answer: "Sí. La mediación familiar generalmente no exige comparecer acompañado de un abogado."
    },
    {
      question: "¿El mediador toma decisiones?",
      answer: "No. Su función es facilitar el diálogo entre las partes y ayudar a construir acuerdos, sin imponer soluciones."
    },
    {
      question: "¿Qué pasa si llegamos a un acuerdo?",
      answer: "El acuerdo puede ser aprobado judicialmente y adquirir fuerza legal obligatoria, equivalente a una sentencia."
    },
    {
      question: "¿La mediación sirve para modificar pensiones de alimentos?",
      answer: "Sí. Tanto aumentos como rebajas de pensión generalmente requieren mediación previa antes de acudir al tribunal."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="Mediación familiar obligatoria en Chile: cuándo es necesaria y cómo funciona (Guía 2026)"
        description="Aprende qué es la mediación familiar en Chile, cuándo es obligatoria (alimentos, visitas, cuidado personal), cómo funciona el proceso y qué hacer si no hay acuerdo."
        image="/assets/mediacion-familiar-chile-2026.png"
        url="https://legalup.cl/blog/mediacion-familiar-chile-2026"
        datePublished="2026-06-02"
        dateModified="2026-06-02"
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
            Mediación familiar obligatoria en Chile: cuándo es necesaria y cómo funciona (Guía 2026)
          </h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">Resumen rápido</p>
            <ul className="space-y-2">
              {[
                "La mediación familiar es obligatoria en numerosas materias de familia",
                "Su objetivo es intentar alcanzar acuerdos antes de iniciar un juicio",
                "Un mediador no actúa como juez ni dicta sentencias",
                "La mediación puede terminar con acuerdo o sin acuerdo",
                "Si fracasa, se emite un certificado de mediación frustrada",
                "Ese certificado permite presentar una demanda ante el Tribunal de Familia",
                "En muchos casos el servicio puede ser gratuito",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm sm:text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl max-w-3xl leading-relaxed">
            Mediación familiar obligatoria Chile, certificado de mediación frustrada, mediación alimentos, cuidado personal y régimen de visitas son algunas de las búsquedas más frecuentes entre quienes necesitan resolver un conflicto familiar. Sin embargo, muchas personas descubren recién al intentar demandar que la ley exige cumplir primero una etapa previa obligatoria: la mediación familiar.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>2 de Junio, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Tiempo de lectura: 10 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
        <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare
            title="Mediación familiar obligatoria en Chile: cuándo es necesaria y cómo funciona (Guía 2026)"
            url="https://legalup.cl/blog/mediacion-familiar-chile-2026"
            showBorder={false}
          />

          {/* Intro */}
          <div className="prose prose-lg max-w-none mb-8">
            <p className="text-lg text-gray-600 leading-relaxed">
              Si estás pensando en demandar por pensión de alimentos, solicitar el cuidado personal de un hijo o regular un régimen de visitas, esta guía te explicará exactamente cómo funciona la mediación familiar obligatoria en Chile, cuándo es necesaria, cuánto demora, qué ocurre si no hay acuerdo y cómo obtener el certificado que permite continuar ante el Tribunal de Familia.
            </p>
          </div>

          {/* ¿Qué es la mediación familiar? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Qué es la mediación familiar?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              La mediación familiar es un procedimiento extrajudicial diseñado para ayudar a las personas a resolver conflictos familiares mediante el diálogo y la negociación asistida por un tercero imparcial denominado mediador.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Su principal objetivo es evitar litigios innecesarios y fomentar acuerdos voluntarios que beneficien a todas las partes involucradas, especialmente a los hijos.
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 my-4">
              <p className="text-blue-900 leading-relaxed">
                A diferencia de un juez, el mediador no impone soluciones ni decide quién tiene razón. Su función consiste en facilitar la comunicación, identificar intereses comunes y ayudar a construir acuerdos que puedan ser aceptados por ambas partes.
              </p>
            </div>
            <p className="text-gray-600 leading-relaxed">
              La mediación familiar busca disminuir el conflicto, reducir los costos emocionales y económicos de un juicio y permitir soluciones más rápidas que las obtenidas mediante una sentencia judicial.
            </p>
          </div>

          {/* ¿La mediación familiar es obligatoria en Chile? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿La mediación familiar es obligatoria en Chile?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Sí. La legislación chilena establece que ciertas materias familiares requieren pasar obligatoriamente por mediación antes de iniciar una demanda judicial.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Esto significa que el tribunal normalmente no admitirá la demanda si no se acredita previamente haber intentado una mediación.
            </p>
            <p className="text-gray-950 font-bold mb-4">Las materias más comunes son:</p>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">Pensión de alimentos</h4>
                <p className="text-gray-600 leading-relaxed">
                  Cuando una persona desea solicitar una pensión de alimentos para un hijo, normalmente deberá iniciar previamente una mediación familiar.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">Aumento de pensión de alimentos</h4>
                <p className="text-gray-600 leading-relaxed">
                  Si las necesidades del niño, niña o adolescente aumentaron o la capacidad económica del alimentante mejoró significativamente, también suele exigirse mediación previa.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">Rebaja de pensión de alimentos</h4>
                <p className="text-gray-600 leading-relaxed">
                  Las solicitudes de disminución del monto de alimentos normalmente requieren acreditar el intento de mediación antes de demandar.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">Cuidado personal de hijos</h4>
                <p className="text-gray-600 leading-relaxed">
                  Las controversias relacionadas con quién ejercerá el cuidado personal de un niño, niña o adolescente también suelen requerir esta etapa previa.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">Relación directa y regular</h4>
                <p className="text-gray-600 leading-relaxed">
                  Lo que antiguamente se conocía como régimen de visitas también está sujeto a mediación obligatoria en la mayoría de los casos.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl my-4">
              <p className="font-bold text-amber-900">Importante</p>
              <p className="text-amber-800 leading-relaxed">
                Muchas personas preparan una demanda, reúnen documentos e incluso contratan un abogado para luego descubrir que el tribunal exige acreditar una mediación previa. Conocer este requisito desde el principio permite ahorrar tiempo, dinero y frustraciones innecesarias.
              </p>
            </div>
          </div>

          {/* Interlink: Pensión de Alimentos */}
          <div className="mb-6 space-y-3">
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  to="/blog/deuda-pension-alimentos-chile-2026"
                  className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                >
                  👉 Pensión de alimentos en Chile
                </Link>
              </div>
            </div>
          </div>

          {/* Validador Interactivo */}
          <MediationChecker />

          {/* Interlink 1 */}
          <div className="mb-6 space-y-3">
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  to="/blog/cuidado-personal-hijos-chile-2026"
                  className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                >
                  👉 Cuidado personal de hijos en Chile 2026
                </Link>
              </div>
            </div>
          </div>

          {/* ¿Cuándo no es obligatoria la mediación? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Cuándo no es obligatoria la mediación?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Aunque la mediación es obligatoria en numerosas materias familiares, existen excepciones.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Por ejemplo, puede no exigirse cuando existen situaciones urgentes que requieren protección inmediata por parte del tribunal.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              También pueden existir excepciones vinculadas a determinados casos de violencia intrafamiliar, medidas de protección urgentes u otras circunstancias contempladas por la legislación vigente.
            </p>
            <p className="text-gray-600 leading-relaxed font-semibold">
              La necesidad o no de mediación dependerá siempre de la materia específica y de las características concretas del caso.
            </p>
          </div>

          {/* ¿Cuáles son los objetivos de la mediación familiar? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Cuáles son los objetivos de la mediación familiar?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              La mediación no existe únicamente para descongestionar los tribunales. Su finalidad principal es proteger las relaciones familiares y promover soluciones sostenibles en el tiempo.
            </p>

            <ul className="space-y-3 bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm text-gray-700 mb-6">
              {[
                "Reducir el conflicto entre las partes",
                "Promover acuerdos voluntarios",
                "Favorecer la comunicación",
                "Proteger el bienestar de los hijos",
                "Disminuir los costos emocionales de un juicio",
                "Obtener soluciones más rápidas",
                "Fomentar el cumplimiento voluntario de los acuerdos"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm sm:text-base">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p className="text-gray-600 leading-relaxed font-medium">
              Cuando las partes participan de buena fe, muchas veces logran acuerdos que resultan más efectivos y duraderos que una sentencia impuesta por un juez.
            </p>
          </div>

          <div className="my-8">
            <InArticleCTA
              message="¿Necesitas iniciar una mediación de alimentos o visitas, o se frustró la instancia y requieres preparar una demanda sólida?"
              buttonText="Hablar con un abogado"
              category="Derecho de Familia"
            />
          </div>

          {/* ¿Cómo funciona el proceso paso a paso? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cómo funciona el proceso paso a paso?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Una de las dudas más frecuentes es qué ocurre realmente durante la mediación. Aunque cada caso tiene particularidades, el procedimiento suele desarrollarse de la siguiente manera.
            </p>

            <div className="space-y-4">
              {[
                {
                  title: "Paso 1: Solicitar la mediación",
                  desc: (
                    <>
                      <p className="mb-2">
                        Todo comienza cuando una de las partes solicita formalmente una mediación familiar. La solicitud puede realizarse ante un centro de mediación autorizado o ante un mediador acreditado, dependiendo del caso.
                      </p>
                      <p className="mb-2">
                        En esta etapa se identifican las personas involucradas, la materia que será discutida y los antecedentes básicos necesarios para iniciar el procedimiento.
                      </p>
                      <p>
                        Es recomendable contar con información relevante desde el inicio, como datos de contacto de la otra parte, certificados relacionados con los hijos o antecedentes económicos cuando el conflicto se refiere a alimentos. Una vez ingresada la solicitud, el centro de mediación inicia las gestiones para contactar a la otra parte y coordinar las sesiones.
                      </p>
                    </>
                  )
                },
                {
                  title: "Paso 2: Citación de ambas partes",
                  desc: (
                    <>
                      <p className="mb-2">
                        Luego de recibir la solicitud, el mediador o el centro correspondiente procede a citar a ambas personas involucradas en el conflicto. La finalidad de esta etapa es informar oficialmente la existencia del proceso de mediación y fijar una fecha para la primera sesión.
                      </p>
                      <p>
                        La participación de ambas partes es fundamental para que exista una posibilidad real de alcanzar acuerdos. Si una de las personas no puede asistir a la fecha inicialmente programada, normalmente pueden realizarse reprogramaciones dentro de ciertos límites razonables. La asistencia demuestra disposición para resolver el conflicto mediante diálogo y evita retrasos innecesarios.
                      </p>
                    </>
                  )
                },
                {
                  title: "Paso 3: Sesiones de mediación",
                  desc: (
                    <>
                      <p className="mb-2">
                        Las sesiones constituyen el corazón del procedimiento. Durante estas reuniones, el mediador escucha a ambas partes, identifica los principales puntos de conflicto y facilita la búsqueda de soluciones. Cada persona puede exponer su posición, explicar sus preocupaciones y plantear propuestas.
                      </p>
                      <p className="mb-2">
                        El mediador mantiene una postura neutral e imparcial. No representa a ninguna de las partes ni emite juicios respecto de quién tiene la razón.
                      </p>
                      <p className="mb-2">
                        En asuntos relacionados con alimentos, por ejemplo, pueden analizarse ingresos, gastos y necesidades de los hijos. En conflictos sobre cuidado personal pueden discutirse aspectos relacionados con la estabilidad del niño, niña o adolescente, sus rutinas, necesidades educativas y bienestar emocional. Cuando el problema se relaciona con visitas o relación directa y regular, las conversaciones suelen centrarse en horarios, vacaciones, comunicación y formas de mantener un vínculo saludable con ambos padres.
                      </p>
                      <p>
                        Dependiendo de la complejidad del caso, pueden realizarse una o varias sesiones.
                      </p>
                    </>
                  )
                },
                {
                  title: "Paso 4: Acuerdo o fracaso de la mediación",
                  desc: (
                    <>
                      <p className="mb-2">
                        Una vez desarrolladas las conversaciones, el proceso puede concluir de dos maneras.
                      </p>
                      <ul className="space-y-2 mt-2 text-gray-600">
                        <li>
                          <strong className="text-gray-900">Existe acuerdo:</strong> Cuando ambas partes logran consenso respecto de los temas discutidos, se redacta un acuerdo formal. Este documento detalla las obligaciones y compromisos asumidos por cada persona. Posteriormente, el acuerdo puede ser presentado al tribunal para su aprobación y adquirir fuerza legal.
                        </li>
                        <li>
                          <strong className="text-gray-900">No existe acuerdo:</strong> Si las partes mantienen posiciones incompatibles, si una de ellas se niega a negociar o simplemente no se logra consenso, la mediación termina sin éxito. En estos casos el conflicto deberá resolverse mediante una demanda judicial.
                        </li>
                      </ul>
                    </>
                  )
                },
                {
                  title: "Paso 5: Emisión del certificado",
                  desc: (
                    <>
                      <p className="mb-2">
                        Cuando no se logra acuerdo, el mediador emite un documento denominado certificado de mediación frustrada.
                      </p>
                      <p>
                        Este certificado acredita que se intentó la mediación exigida por la ley. Su importancia es enorme porque permite continuar el conflicto ante el Tribunal de Familia. Sin este documento, muchas demandas simplemente no podrán avanzar.
                      </p>
                    </>
                  )
                }
              ].map((step, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex gap-4">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{step.title}</h4>
                    <div className="text-gray-600 leading-relaxed">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ¿Qué pasa si la otra persona no asiste? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Qué pasa si la otra persona no asiste?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Una situación extremadamente frecuente es que una de las partes ignore las citaciones o simplemente decida no participar.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Cuando esto ocurre, la mediación igualmente puede finalizar y generar la documentación necesaria para continuar.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              La inasistencia reiterada suele conducir a la emisión de un certificado que acredita la imposibilidad de desarrollar adecuadamente el proceso.
            </p>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 my-4">
              <p className="text-red-900 font-medium">
                Por esta razón, negarse a asistir rara vez impide que el conflicto llegue a tribunales. En la práctica, muchas veces solo provoca retrasos innecesarios.
              </p>
            </div>
          </div>

          {/* ¿Qué es el certificado de mediación frustrada? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Qué es el certificado de mediación frustrada?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              El certificado de mediación frustrada es uno de los documentos más importantes dentro del sistema de justicia familiar.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Se trata de un documento oficial emitido por el mediador cuando la mediación no logra alcanzar un acuerdo o cuando no puede desarrollarse adecuadamente.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Este certificado acredita que la etapa obligatoria exigida por la ley fue cumplida.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Gracias a él, la persona interesada puede presentar una demanda ante el Tribunal de Familia.
            </p>
            <p className="text-gray-600 leading-relaxed font-semibold">
              Sin este documento, numerosas acciones judiciales simplemente no serán admitidas. Por ello es fundamental conservarlo y entregarlo oportunamente al abogado o al tribunal correspondiente.
            </p>
          </div>

          {/* Interlink 2 */}
          <div className="mb-6 space-y-3">
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  to="/blog/regimen-de-visitas-chile-2026"
                  className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                >
                  👉 Régimen de visitas en Chile 2026
                </Link>
              </div>
            </div>
          </div>

          {/* ¿Cuánto demora una mediación familiar? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Cuánto demora una mediación familiar?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              No existe un plazo único aplicable a todos los casos. La duración dependerá de diversos factores:
            </p>
            <ul className="space-y-3 bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm text-gray-700 mb-6">
              {[
                "Disponibilidad de las partes",
                "Complejidad del conflicto",
                "Cantidad de materias discutidas",
                "Necesidad de varias sesiones",
                "Carga de trabajo del centro de mediación"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm sm:text-base">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-600 leading-relaxed">
              Algunos conflictos simples pueden resolverse en pocas semanas. Otros casos más complejos pueden extenderse durante varios meses antes de llegar a una conclusión definitiva.
            </p>
          </div>

          {/* Interlink: Rebaja de Pensión */}
          <div className="mb-6 space-y-3">
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  to="/blog/rebaja-pension-alimentos-chile-2026"
                  className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                >
                  👉 Rebaja de pensión de alimentos
                </Link>
              </div>
            </div>
          </div>

          {/* ¿La mediación familiar es gratuita? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿La mediación familiar es gratuita?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Muchas personas creen erróneamente que toda mediación tiene un costo elevado.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              La realidad es que existen mecanismos que permiten acceder a mediación familiar gratuita en numerosos casos.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 my-6">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">Mediación licitada por el Estado</h4>
                <p className="text-gray-600 leading-relaxed">
                  Existen centros que prestan servicios financiados por el Estado para personas que cumplen determinados requisitos. Estos programas permiten acceder a mediación sin asumir los costos de un procedimiento privado.
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">Mediación privada</h4>
                <p className="text-gray-600 leading-relaxed">
                  También existen mediadores particulares que ofrecen servicios profesionales remunerados. En estos casos el costo dependerá del profesional, la complejidad del conflicto y la cantidad de sesiones necesarias.
                </p>
              </div>
            </div>
          </div>

          {/* Ventajas de llegar a un acuerdo */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Ventajas de llegar a un acuerdo</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Alcanzar un acuerdo durante la mediación suele generar múltiples beneficios.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { title: "Menor tiempo", desc: "Los acuerdos suelen obtenerse mucho más rápido que una sentencia judicial." },
                { title: "Menor costo", desc: "Se reducen gastos asociados a procesos largos y complejos." },
                { title: "Menor desgaste emocional", desc: "Especialmente importante cuando existen hijos involucrados." },
                { title: "Mayor cumplimiento", desc: "Las personas tienden a respetar con mayor facilidad acuerdos que ayudaron a construir." },
                { title: "Mejor comunicación futura", desc: "La mediación puede sentar bases para relaciones parentales más saludables en el largo plazo." }
              ].map((item, i) => (
                <div key={i} className="p-5 rounded-2xl border border-gray-100">
                  <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                  <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ¿Qué pasa si llegamos a un acuerdo? / ¿Qué pasa si no llegamos? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Qué pasa si llegamos a un acuerdo?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Cuando la mediación termina exitosamente, se redacta un acuerdo formal que contiene los compromisos asumidos por las partes.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Dependiendo de la materia tratada, dicho acuerdo puede ser presentado ante el tribunal para su aprobación.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Una vez aprobado, adquiere valor legal y puede exigirse su cumplimiento. Esto significa que el acuerdo no queda simplemente como una promesa informal, sino que puede producir efectos jurídicos relevantes.
            </p>

            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Qué pasa si no llegamos a un acuerdo?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Si la mediación fracasa, el conflicto no termina.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              La diferencia es que ahora existe la posibilidad de acudir al Tribunal de Familia.
            </p>
            <p className="text-gray-600 leading-relaxed">
              El certificado de mediación frustrada permitirá presentar la demanda correspondiente para que un juez resuelva el conflicto mediante una sentencia. En otras palabras, la mediación no reemplaza al tribunal. Más bien constituye una etapa previa destinada a intentar una solución menos confrontacional.
            </p>
          </div>

          {/* Errores comunes que debes evitar */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Errores comunes que debes evitar</h2>
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 sm:p-8">
              <div className="space-y-6">
                {[
                  { title: "No asistir a las sesiones", desc: "La inasistencia suele generar retrasos y dificulta alcanzar soluciones rápidas." },
                  { title: "Llegar sin preparación", desc: "Es recomendable llevar antecedentes relevantes, especialmente cuando existen discusiones económicas." },
                  { title: "Pensar que el mediador decidirá", desc: "El mediador facilita acuerdos, pero no impone decisiones." },
                  { title: "Confundir mediación con juicio", desc: "La mediación es un espacio de diálogo, no una audiencia judicial." },
                  { title: "Negarse completamente a negociar", desc: "Las posiciones extremadamente rígidas suelen dificultar cualquier solución." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="text-red-500 font-bold text-lg flex-shrink-0">✕</div>
                    <div>
                      <h4 className="font-bold text-red-900">{item.title}</h4>
                      <p className="text-red-800 opacity-90">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Interlink: Derecho de Familia */}
          <div className="mb-6 space-y-3">
            <div className="text-center py-4 border-t border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  to="/blog/derecho-de-familia-chile-2026"
                  className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                >
                  👉 Derecho de Familia en Chile
                </Link>
              </div>
            </div>
          </div>

          {/* Conclusión */}
          <div className="prose prose-lg max-w-none mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              La mediación familiar obligatoria constituye una de las etapas más importantes dentro del sistema de justicia de familia en Chile. Antes de iniciar numerosas demandas relacionadas con pensión de alimentos, cuidado personal o relación directa y regular, la ley exige intentar primero una solución colaborativa mediante este procedimiento.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Aunque muchas personas la perciben como un simple requisito administrativo, la mediación cumple una función mucho más profunda. Permite reducir conflictos, fomentar acuerdos voluntarios y proteger de mejor manera el bienestar de los hijos involucrados. Además, suele ser más rápida, menos costosa y emocionalmente menos desgastante que un juicio prolongado.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Sin embargo, es importante comprender que la mediación no reemplaza al Tribunal de Familia. El mediador no actúa como juez ni tiene facultades para imponer soluciones. Su labor consiste en facilitar el diálogo y ayudar a construir acuerdos que beneficien a todas las partes.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Cuando existe voluntad de colaboración, la mediación puede resolver completamente el conflicto. Cuando ello no ocurre, el proceso igualmente cumple una función esencial: generar el certificado de mediación frustrada que permitirá continuar mediante una demanda judicial.
            </p>
            <p className="text-gray-600 leading-relaxed font-semibold">
              Por ello, conocer cómo funciona la mediación familiar obligatoria, cuáles son sus etapas y qué documentos genera puede evitar retrasos innecesarios y errores procesales. Si estás enfrentando un conflicto familiar y tienes dudas sobre cómo proceder, un abogado de familia puede orientarte antes de iniciar cualquier trámite.<br />
              ¿Necesitas hablar con un abogado de familia? En LegalUp puedes encontrar profesionales especializados de forma rápida y sin complicaciones.
            </p>
          </div>

          {/* CTA final */}
          <CategoryCTA category="familia" />

          {/* FAQs Schema */}
          <div className="mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <section className="bg-white rounded-xl shadow-sm p-8 text-center mt-8 border">
          <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">¿Necesitas asesoría en mediación familiar?</h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
            En LegalUp te guiamos paso a paso para resolver tu conflicto de familia en forma rápida y profesional a través de nuestros abogados especialistas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/search?category=Derecho+Familia">
              <Button
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_consultar_abogado', {
                    article: window.location.pathname,
                    location: 'blog_cta_mediacion_primary',
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

      <RelatedLawyers category="Derecho de Familia" />

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare
            title="Mediación familiar obligatoria en Chile: cuándo es necesaria y cómo funciona (Guía 2026)"
            url="https://legalup.cl/blog/mediacion-familiar-chile-2026"
          />
        </div>

        <BlogNavigation currentArticleId="mediacion-familiar-chile-2026" />

        <div className="mt-4 text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-green-900 hover:text-green-600 transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Blog
          </Link>
        </div>
      </div>
      <BlogConversionPopup category="Derecho de Familia" topic="mediacion" />
    </div>
  );
};

export default BlogArticle;
