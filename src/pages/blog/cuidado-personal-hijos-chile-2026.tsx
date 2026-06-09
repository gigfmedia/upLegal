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
import PreConclusionCTA from "@/components/blog/PreConclusionCTA";
import InArticleCTA from "@/components/blog/InArticleCTA";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

const CuidadoFeasibilityTest = () => {
  const [answers, setAnswers] = useState({
    cuidador: false,
    disponibilidad: false,
    estabilidad: false,
    vinculo: false,
    sinViolencia: false,
  });

  const handleCheckboxChange = (key: keyof typeof answers) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const score = Object.values(answers).filter(Boolean).length;

  const getEvaluation = () => {
    if (score === 5) {
      return {
        level: "Alta factibilidad para el proceso",
        color: "text-green-700 bg-green-50 border-green-200",
        message: "Cumples con todos los criterios fundamentales que los jueces de familia priorizan. Tienes una base sumamente sólida para solicitar o defender el cuidado personal de tu hijo.",
      };
    } else if (score >= 3) {
      return {
        level: "Factibilidad media, requiere robustecer pruebas",
        color: "text-amber-700 bg-amber-50 border-amber-200",
        message: "Cuentas con factores favorables importantes, pero hay aspectos débiles que la otra parte podría cuestionar ante el tribunal. Es crucial recopilar informes sociales, psicológicos y escolares sólidos.",
      };
    } else {
      return {
        level: "El caso requiere mayor preparación y asesoría",
        color: "text-blue-700 bg-blue-50 border-blue-200",
        message: "Actualmente posees pocos factores de viabilidad directa. Te recomendamos encarecidamente asesorarte con un abogado especialista de LegalUp para estructurar una estrategia adecuada y proteger el bienestar de tu hijo.",
      };
    }
  };

  const evalResult = getEvaluation();

  return (
    <div className="p-6 sm:p-8 rounded-2xl my-8 border border-gray-100 bg-white shadow-sm">
      <div className="max-w-xl mx-auto">
        <h3 className="text-xl font-bold mb-4 text-gray-900">
          Test de Factibilidad: Cuidado Personal
        </h3>
        <p className="text-gray-500 mb-6">
          Marca los criterios que cumples actualmente para simular la viabilidad de tu caso según lo que evalúan los tribunales chilenos.
        </p>

        <div className="space-y-3 mb-6">
          <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors border">
            <input
              type="checkbox"
              checked={answers.cuidador}
              onChange={() => handleCheckboxChange("cuidador")}
              className="mt-1 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <div className="text-sm text-gray-700">
              <span className="font-bold block text-gray-900">Rol de cuidador principal</span>
              He sido el/la responsable principal del cuidado directo cotidiano del niño, niña o adolescente en el último tiempo.
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors border">
            <input
              type="checkbox"
              checked={answers.disponibilidad}
              onChange={() => handleCheckboxChange("disponibilidad")}
              className="mt-1 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <div className="text-sm text-gray-700">
              <span className="font-bold block text-gray-900">Disponibilidad efectiva de tiempo</span>
              Cuento con tiempo real para llevarlo al colegio, controles médicos, tareas y acompañamiento diario.
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors border">
            <input
              type="checkbox"
              checked={answers.estabilidad}
              onChange={() => handleCheckboxChange("estabilidad")}
              className="mt-1 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <div className="text-sm text-gray-700">
              <span className="font-bold block text-gray-900">Estabilidad familiar y habitacional</span>
              Puedo ofrecer un hogar estable, rutinas claras y un entorno emocionalmente saludable.
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors border">
            <input
              type="checkbox"
              checked={answers.vinculo}
              onChange={() => handleCheckboxChange("vinculo")}
              className="mt-1 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <div className="text-sm text-gray-700">
              <span className="font-bold block text-gray-900">Vínculo afectivo fuerte</span>
              Existe un apego mutuo sólido, sano y expreso entre mi hijo y yo.
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors border">
            <input
              type="checkbox"
              checked={answers.sinViolencia}
              onChange={() => handleCheckboxChange("sinViolencia")}
              className="mt-1 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <div className="text-sm text-gray-700">
              <span className="font-bold block text-gray-900">Sin historial de riesgo o violencia</span>
              No poseo denuncias vigentes por violencia intrafamiliar ni antecedentes de negligencia o adicciones.
            </div>
          </label>
        </div>

        <div className={`p-5 rounded-xl border ${evalResult.color} transition-all`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-base uppercase tracking-wider">{evalResult.level}</span>
          </div>
          <p className="leading-relaxed text-gray-700 text-sm">{evalResult.message}</p>
        </div>

        <p className="text-xs text-gray-400 mt-4 leading-relaxed italic">
          *Este test es referencial para guiarte en los puntos clave que revisa la ley y no constituye asesoría jurídica formal. Todo dictamen de cuidado personal depende exclusivamente del Tribunal de Familia.
        </p>
      </div>
    </div>
  );
};

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Qué es el cuidado personal de un hijo?",
      answer: "El cuidado personal es el conjunto de derechos y deberes relacionados con la crianza, educación, protección y cuidado diario de un niño, niña o adolescente. Es la figura legal que reemplazó a la antigua \"tuición\" en Chile."
    },
    {
      question: "¿La madre tiene preferencia para obtener el cuidado personal?",
      answer: "No. Actualmente la ley chilena reconoce igualdad de derechos y deberes entre ambos padres. El tribunal decidirá considerando exclusivamente qué opción resulta más beneficiosa para el niño."
    },
    {
      question: "¿Un padre puede obtener el cuidado personal de sus hijos?",
      answer: "Sí. El padre puede obtener el cuidado personal si el tribunal determina que ello favorece el interés superior del niño, niña o adolecente. Cada caso se analiza según sus circunstancias particulares."
    },
    {
      question: "¿Qué diferencia existe entre cuidado personal y pensión de alimentos?",
      answer: "El cuidado personal determina con quién vive habitualmente el hijo. La pensión de alimentos corresponde al aporte económico destinado a cubrir sus necesidades de alimentación, educación, salud, vivienda y desarrollo."
    },
    {
      question: "¿Qué diferencia existe entre cuidado personal y régimen de visitas?",
      answer: "El cuidado personal regula quién tiene el cuidado cotidiano del niño, niña o adolescente. La relación directa y regular (antes llamada régimen de visitas) establece cómo se mantiene el vínculo con el otro progenitor."
    },
    {
      question: "¿Es obligatorio pasar por mediación antes de demandar?",
      answer: "En la mayoría de los casos sí. La mediación familiar es un requisito previo obligatorio para intentar alcanzar un acuerdo antes de iniciar un juicio de cuidado personal ante el Tribunal de Familia."
    },
    {
      question: "¿Qué factores considera el juez para decidir?",
      answer: "El tribunal analiza diversos elementos, incluyendo la estabilidad familiar, el vínculo afectivo con el niño, la disponibilidad para cuidarlo, su entorno, su bienestar emocional, antecedentes de violencia intrafamiliar y el interés superior del niño, niña o adolescente."
    },
    {
      question: "¿Puede modificarse una sentencia de cuidado personal?",
      answer: "Sí. Si las circunstancias cambian de manera relevante, cualquiera de las partes puede solicitar una modificación judicial para que el tribunal vuelva a evaluar la situación actual del niño, niña o adolescente."
    },
    {
      question: "¿Puede un abuelo obtener el cuidado personal?",
      answer: "Sí, aunque es excepcional. Cuando ninguno de los padres puede ejercer adecuadamente sus responsabilidades, el tribunal puede otorgar el cuidado personal a un abuelo u otro familiar que garantice el bienestar del niño, niña o adolescente."
    },
    {
      question: "¿A qué edad puede el niño expresar su opinión ante el tribunal?",
      answer: "No existe una edad fija establecida por la ley. El juez evaluará la madurez del niño y podrá considerar su opinión como un elemento relevante dentro del proceso, siempre velando por su protección y bienestar."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="Cuidado personal de hijos en Chile: qué es, quién puede obtenerlo y cómo funciona (Guía 2026)"
        description="Aprende qué es el cuidado personal de hijos en Chile, quién puede solicitarlo, qué evalúa el juez y cómo funciona el proceso judicial. Guía actualizada 2026."
        image="/assets/cuidado-personal-hijos-chile-2026.png"
        url="https://legalup.cl/blog/cuidado-personal-hijos-chile-2026"
        datePublished="2026-06-01"
        dateModified="2026-06-01"
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
            Cuidado personal de hijos en Chile: qué es, quién puede obtenerlo y cómo funciona (Guía 2026)
          </h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">Resumen rápido</p>
            <ul className="space-y-2">
              {[
                "La antigua \"tuición\" actualmente se denomina cuidado personal",
                "Puede corresponder a la madre, al padre o, excepcionalmente, a un tercero",
                "No existe preferencia automática por la madre o el padre",
                "El juez decide según el interés superior del niño, niña o adolescente",
                "La situación económica no es el único factor relevante",
                "El cuidado personal es distinto de la pensión de alimentos y las visitas",
                "Puede modificarse judicialmente si cambian las circunstancias",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm sm:text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl max-w-3xl leading-relaxed">
            Cuando una pareja con hijos se separa, una de las primeras preguntas que surge es: ¿con quién vivirán los hijos? Muchas personas siguen utilizando el término &quot;tuición&quot;, pero jurídicamente en Chile el concepto actual es cuidado personal.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>1 de Junio, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Tiempo de lectura: 11 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
        <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare
            title="Cuidado personal de hijos en Chile: qué es, quién puede obtenerlo y cómo funciona (Guía 2026)"
            url="https://legalup.cl/blog/cuidado-personal-hijos-chile-2026"
            showBorder={false}
          />

          {/* Intro */}
          <div className="prose prose-lg max-w-none mb-8">
            <p className="text-lg text-gray-600 leading-relaxed">
              Se trata de una de las materias más relevantes del Derecho de Familia, ya que determina quién será responsable del cuidado cotidiano, crianza y desarrollo del niño, niña o adolescente.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Si estás enfrentando una separación, un conflicto familiar o deseas modificar una situación ya establecida, esta guía te explicará todo lo que debes saber sobre el cuidado personal de hijos en Chile, incluyendo quién puede solicitarlo, qué factores considera el tribunal y cómo funciona el procedimiento judicial.
            </p>
          </div>

          {/* ¿Qué es el cuidado personal de un hijo? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Qué es el cuidado personal de un hijo?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              El cuidado personal es el conjunto de derechos y deberes relacionados con la crianza diaria de un niño, niña o adolescente.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              La persona que tiene el cuidado personal es quien vive habitualmente con el menor y se encarga de aspectos esenciales como:
            </p>
            <ul className="grid sm:grid-cols-2 gap-3 bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm text-gray-600 mb-4">
              {[
                "Alimentación",
                "Educación",
                "Salud",
                "Supervisión diaria",
                "Actividades extracurriculares",
                "Desarrollo emocional",
                "Protección y bienestar general"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm sm:text-base">
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600 mt-1" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-600 leading-relaxed">
              En términos simples, el cuidado personal determina quién asume la responsabilidad cotidiana de criar al hijo.
            </p>
            <p className="text-gray-600 leading-relaxed">
              No significa que el otro progenitor desaparezca de la vida del niño, niña o adolescente. Por el contrario, la ley busca mantener la participación activa de ambos padres siempre que ello sea beneficioso para el niño.
            </p>
          </div>

          {/* ¿La tuición y el cuidado personal son lo mismo? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿La tuición y el cuidado personal son lo mismo?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Prácticamente sí.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Durante muchos años la población utilizó el término &quot;tuición&quot; para referirse a la custodia de los hijos.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Sin embargo, las reformas legales reemplazaron ese concepto por el de cuidado personal, que refleja de mejor manera las responsabilidades parentales modernas.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Por esta razón, aunque muchas personas continúan buscando en internet:
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              {[
                { title: "Tuición de hijos", icon: "👤" },
                { title: "Custodia de hijos", icon: "🛡️" },
                { title: "Quién se queda con los hijos", icon: "🏠" }
              ].map((item, i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <span className="text-2xl block mb-2">{item.icon}</span>
                  <span className="font-bold text-gray-950 text-sm">{item.title}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 leading-relaxed font-medium">
              La figura jurídica correcta es el cuidado personal.
            </p>
          </div>

          {/* Checklist interactivo */}
          <CuidadoFeasibilityTest />

          {/* Interlink 1 */}
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

          {/* ¿Quién puede obtener el cuidado personal? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Quién puede obtener el cuidado personal?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Una de las creencias más extendidas es que los tribunales siempre favorecen a la madre.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Esto no es correcto.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Actualmente la legislación chilena establece que tanto el padre como la madre tienen igualdad de derechos y deberes respecto de sus hijos.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El juez analizará cada caso concreto para determinar qué alternativa resulta más favorable para el niño.
            </p>

            {/* Tarjetas informativas de quién puede obtenerlo */}
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">La madre puede obtener el cuidado personal</h4>
                <p className="text-gray-600 leading-relaxed mb-4">
                  La madre puede ejercer el cuidado personal cuando ello sea lo más beneficioso para el hijo. Por ejemplo:
                </p>
                <ul className="space-y-1 text-gray-600 text-sm">
                  <li>• Ha sido la principal cuidadora.</li>
                  <li>• Mantiene estabilidad emocional y familiar.</li>
                  <li>• Tiene disponibilidad efectiva para la crianza.</li>
                  <li>• Existe una relación afectiva sólida con el menor.</li>
                </ul>
                <p className="text-gray-500 italic mt-3 text-xs">
                  Sin embargo, el hecho de ser madre no garantiza automáticamente obtener el cuidado personal.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">El padre también puede obtenerlo</h4>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Cada vez existen más casos donde el cuidado personal es otorgado al padre. Esto ocurre cuando las circunstancias demuestran que dicha alternativa protege mejor el interés superior del niño, niña o adolescente. Por ejemplo:
                </p>
                <ul className="space-y-1 text-gray-600 text-sm">
                  <li>• Mayor estabilidad familiar.</li>
                  <li>• Mejor capacidad de cuidado.</li>
                  <li>• Participación activa en la crianza.</li>
                  <li>• Mayor disponibilidad diaria.</li>
                </ul>
                <p className="text-gray-500 italic mt-3 text-xs">
                  Los tribunales analizan hechos concretos, no estereotipos de género.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">¿Puede obtenerlo un abuelo u otro familiar?</h4>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Sí, aunque se trata de situaciones excepcionales. Cuando ninguno de los padres puede ejercer adecuadamente sus responsabilidades, el tribunal puede otorgar el cuidado personal a terceros. Algunos ejemplos son:
                </p>
                <ul className="space-y-1 text-gray-600 text-sm">
                  <li>• Abuelos.</li>
                  <li>• Tíos.</li>
                  <li>• Familiares cercanos.</li>
                  <li>• Personas con vínculos afectivos relevantes.</li>
                </ul>
                <p className="text-gray-500 italic mt-3 text-xs">
                  Estas situaciones suelen requerir antecedentes sólidos que demuestren que la permanencia con los padres no resulta adecuada para el menor.
                </p>
              </div>
            </div>
          </div>

          <div className="my-8">
            <InArticleCTA
              message="¿Necesitas regularizar el cuidado personal o estás enfrentando un conflicto de tuición? Consúltanos para guiarte de forma experta en los Tribunales de Familia."
              buttonText="Hablar con un especialista"
              category="Derecho de Familia"
            />
          </div>

          {/* ¿Qué evalúa el juez para decidir? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué evalúa el juez para decidir?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              La decisión nunca se toma de forma automática. El tribunal debe analizar múltiples factores relacionados con el bienestar del niño, niña o adolescente.
            </p>

            <div className="space-y-4">
              {[
                {
                  num: "1",
                  title: "Interés superior del niño",
                  desc: "Este es el criterio más importante. Toda decisión judicial debe orientarse a proteger el desarrollo integral del niño, niña o adolescente. No se trata de determinar quién \"gana\" el juicio, sino qué alternativa beneficia más al hijo, niña o adolescente."
                },
                {
                  num: "2",
                  title: "Vínculo afectivo",
                  desc: "El juez evaluará la relación emocional existente entre el niño, niña o adolescente y cada progenitor. Se considera: Apego emocional, participación en la crianza, presencia constante y historial de cuidado. Un vínculo fuerte suele tener gran relevancia en la decisión final."
                },
                {
                  num: "3",
                  title: "Estabilidad familiar",
                  desc: "Los tribunales valoran la capacidad de ofrecer un entorno estable. Esto incluye: Vivienda adecuada, rutinas consistentes, apoyo familiar y ambiente emocional saludable. La estabilidad suele ser un elemento clave para garantizar el bienestar del niño, niña o adolescente."
                },
                {
                  num: "4",
                  title: "Salud física y mental",
                  desc: "La capacidad de cuidado también depende del estado de salud de quien solicita el cuidado personal. No significa que una enfermedad impida automáticamente ejercerlo. Sin embargo, el tribunal analizará si existe capacidad efectiva para atender las necesidades del hijo."
                },
                {
                  num: "5",
                  title: "Disponibilidad real",
                  desc: "Muchas personas creen que tener mayores ingresos garantiza obtener el cuidado personal. Esto tampoco es cierto. Un factor especialmente importante es la disponibilidad efectiva para cuidar al menor. Por ejemplo: Llevarlo al colegio, asistir a controles médicos, supervisar tareas, participar en actividades diarias."
                },
                {
                  num: "6",
                  title: "Opinión del niño, niña o adolescente",
                  desc: "Dependiendo de su edad y nivel de madurez, el tribunal puede escuchar la opinión del niño, niña o adolescente. Esto no significa que el niño, niña o adolescente decida por sí solo. Sin embargo, su opinión constituye un antecedente relevante para comprender su situación emocional y familiar."
                },
                {
                  num: "7",
                  title: "Violencia intrafamiliar",
                  desc: "La existencia de violencia intrafamiliar es uno de los factores más importantes que considera el tribunal. Las denuncias, medidas cautelares, condenas o antecedentes relacionados con violencia pueden influir significativamente en la decisión. La protección del niño, niña o adolescente siempre será prioritaria."
                }
              ].map((item, idx) => (
                <div key={idx} className="p-5 rounded-2xl border border-gray-100 flex gap-4">
                  <div className="bg-gray-900 p-2 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0 font-bold">
                    {item.num}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
                    <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Diferencia entre cuidado personal, pensión de alimentos y visitas */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Diferencia entre cuidado personal, pensión de alimentos y visitas</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Muchas personas confunden estas instituciones jurídicas. Sin embargo, son materias distintas.
            </p>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">Pensión de alimentos</h4>
                <p className="text-gray-600 text-sm leading-relaxed mb-2">
                  Corresponde al aporte económico destinado a cubrir las necesidades del niño, niña o adolescente. Incluye gastos relacionados con:
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Alimentación</li>
                  <li>• Educación</li>
                  <li>• Salud</li>
                  <li>• Vestuario</li>
                  <li>• Vivienda</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">Relación directa y regular</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Antes conocida como régimen de visitas. Permite mantener el vínculo entre el hijo y el progenitor que no tiene el cuidado personal.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">Cuidado personal</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Determina con quién vive habitualmente el hijo.
                </p>
              </div>
            </div>
          </div>

          {/* Interlink 2 */}
          <div className="mb-6 space-y-3">
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  to="/blog/aumento-pension-alimentos-chile-2026"
                  className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                >
                  👉 Aumento de pensión de alimentos en Chile 2026
                </Link>
              </div>
            </div>
          </div>

          {/* ¿Cómo solicitar el cuidado personal? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cómo solicitar el cuidado personal?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Cuando existe acuerdo entre los padres, el proceso suele ser mucho más sencillo. Si no existe acuerdo, normalmente será necesario acudir al sistema judicial.
            </p>

            <div className="space-y-4">
              {[
                {
                  title: "Paso 1: Mediación familiar",
                  desc: "En la mayoría de los casos la ley exige intentar una mediación previa. La finalidad es que ambas partes alcancen un acuerdo voluntario. La mediación puede abordar: Cuidado personal, pensión de alimentos y relación directa y regular. Si se logra acuerdo, este puede ser aprobado por el tribunal."
                },
                {
                  title: "Paso 2: Presentar una demanda",
                  desc: "Cuando la mediación fracasa, cualquiera de las partes puede presentar una demanda ante el Tribunal de Familia. La demanda debe incluir: Identificación de las partes, fundamentación jurídica, solicitud concreta y medios de prueba."
                },
                {
                  title: "Paso 3: Audiencia preparatoria",
                  desc: "El tribunal citará a una audiencia donde se organizará el proceso. En esta etapa: Se fijan los puntos controvertidos, se presentan pruebas y se preparan las actuaciones posteriores."
                },
                {
                  title: "Paso 4: Juicio",
                  desc: "Durante la audiencia de juicio se revisan todos los antecedentes. Pueden presentarse: Testigos, informes psicológicos, informes sociales, documentos, certificados médicos, antecedentes educacionales."
                },
                {
                  title: "Paso 5: Sentencia",
                  desc: "Finalmente el juez dictará una resolución. La sentencia establecerá: Quién ejercerá el cuidado personal, condiciones específicas y medidas complementarias cuando corresponda."
                }
              ].map((step, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex gap-4">
                  {/* <div className="bg-green-900 p-2 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0 font-bold">
                    {idx + 1}
                  </div> */}
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{step.title}</h4>
                    <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ¿Qué pruebas suelen ser importantes? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Qué pruebas suelen ser importantes?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              La calidad de las pruebas puede marcar una diferencia importante. Algunos antecedentes frecuentemente utilizados son:
            </p>
            <ul className="grid sm:grid-cols-2 gap-3 bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm text-gray-600 mb-4">
              {[
                "Certificados escolares",
                "Informes psicológicos",
                "Informes sociales",
                "Antecedentes médicos",
                "Fotografías",
                "Mensajes",
                "Declaraciones de testigos",
                "Certificados de residencia"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm sm:text-base">
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600 mt-1" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-600 leading-relaxed font-semibold">
              Lo importante es demostrar objetivamente qué alternativa favorece mejor al niño.
            </p>
          </div>

          {/* ¿Se puede modificar el cuidado personal? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Se puede modificar el cuidado personal?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Sí.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Las sentencias relacionadas con niños pueden modificarse cuando cambian las circunstancias. Por ejemplo:
            </p>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl my-4">
              <ul className="space-y-1 text-amber-900">
                <li>• Cambio de residencia</li>
                <li>• Problemas de salud</li>
                <li>• Incumplimientos graves</li>
                <li>• Nuevas situaciones familiares</li>
                <li>• Riesgos para el niño, niña o adolescente</li>
              </ul>
            </div>
            <p className="text-gray-600 leading-relaxed">
              En esos casos es posible solicitar una modificación judicial. El tribunal volverá a evaluar los antecedentes actuales.
            </p>
          </div>

          {/* Errores comunes que debes evitar */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Errores comunes que debes evitar</h2>
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 sm:p-8">
              <div className="space-y-6">
                {[
                  {
                    title: "Hablar mal del otro progenitor frente al hijo",
                    desc: "Los tribunales consideran negativamente las conductas que afectan la relación del niño, niña o adolescente con el otro padre."
                  },
                  {
                    title: "Impedir las visitas sin autorización judicial",
                    desc: "Salvo situaciones excepcionales de riesgo, bloquear unilateralmente el contacto puede generar consecuencias legales."
                  },
                  {
                    title: "Utilizar al hijo como herramienta de conflicto",
                    desc: "Los jueces observan con especial atención las conductas que instrumentalizan emocionalmente a los niños."
                  },
                  {
                    title: "Pensar que ganar más dinero asegura el cuidado personal",
                    desc: "La capacidad económica es solo uno de muchos factores. El análisis siempre será mucho más amplio."
                  }
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

          {/* Interlink 3 */}
          <div className="mb-6 space-y-3">
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  to="/blog/derecho-de-familia-chile-2026"
                  className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                >
                  👉 Guía completa de Derecho de Familia
                </Link>
              </div>
            </div>
          </div>

          {/* CTA before Conclusion */}
          <PreConclusionCTA
            description="El cuidado personal define con quién viven los hijos. Compara abogados especializados y recibe orientación antes de presentar tu demanda."
            link="/search?specialty=Derecho%20de%20Familia"
            buttonText="Comparar abogados especializados"
          />


          {/* Conclusión */}
          <div className="prose prose-lg max-w-none mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              El cuidado personal de hijos en Chile es una de las instituciones más importantes del Derecho de Familia.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Su objetivo no es favorecer al padre ni a la madre, sino garantizar el bienestar integral del niño, niña o adolescente.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Los tribunales analizan múltiples factores, incluyendo estabilidad, vínculo afectivo, capacidad de cuidado, disponibilidad real y protección emocional.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4 font-semibold">
              Si existe acuerdo entre los padres, el proceso suele resolverse de forma más rápida. Cuando no hay acuerdo, será necesario acudir a mediación y eventualmente al Tribunal de Familia para que un juez determine la solución más adecuada.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Si enfrentas un conflicto relacionado con cuidado personal, tuición, custodia o crianza, actuar oportunamente y contar con asesoría especializada puede marcar una diferencia importante en el resultado del proceso y, sobre todo, en el bienestar de tu hijo.
            </p>
          </div>

          {/* CTA final */}
          <CategoryCTA category="familia" topic="familia" />

          {/* FAQs Schema */}
          <div className="mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes</h2>
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

      <RelatedLawyers category="Derecho de Familia" />

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare
            title="Cuidado personal de hijos en Chile: qué es, quién puede obtenerlo y cómo funciona (Guía 2026)"
            url="https://legalup.cl/blog/cuidado-personal-hijos-chile-2026"
          />
        </div>

        <BlogNavigation currentArticleId="cuidado-personal-hijos-chile-2026" />

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
      <BlogConversionPopup category="Derecho de Familia" topic="cuidado-personal" />
    </div>
  );
};

export default BlogArticle;
