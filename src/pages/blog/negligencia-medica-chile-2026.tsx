import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import InArticleCTA from "@/components/blog/InArticleCTA";
import BlogContextualCTA from "@/components/blog/BlogContextualCTA";
import CategoryCTA from "@/components/blog/CategoryCTA";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";
import { ReadTime } from "@/components/blog/ReadTime";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Qué se considera negligencia médica en Chile?",
      answer: "Que un prestador de salud (médico, clínica u hospital) haya actuado por debajo del estándar exigible —error de diagnóstico evitable, cirugía equivocada, falta de consentimiento informado, abandono del paciente— y que esa falla te haya causado un daño concreto. Sin daño acreditado no hay indemnización, aunque haya habido un error.",
    },
    {
      question: "¿Cuánto plazo tengo para demandar por negligencia médica?",
      answer: "Depende de la vía: la responsabilidad extracontractual prescribe en 4 años desde que se produjo el daño, y la contractual en 5 años. Como el cómputo y la vía aplicable dependen de tu caso (clínica privada, hospital público, Isapre o Fonasa), no esperes al límite: asesórate pronto para no perder el plazo.",
    },
    {
      question: "¿Qué indemnización puedo pedir por negligencia médica?",
      answer: "Puedes pedir daño emergente (gastos médicos, remedios, traslados), lucro cesante (ingresos que dejaste de percibir) y daño moral (sufrimiento, secuelas, impacto en tu vida). El monto lo fija el tribunal según la gravedad y la prueba. No existen tablas oficiales: cada caso se valora por sus hechos.",
    },
    {
      question: "¿Necesito una mediación antes de demandar?",
      answer: "Si la atención fue en un establecimiento público de salud, la ley exige una mediación previa ante el Consejo de Defensa del Estado antes de demandar. Si fue en una clínica privada, puedes demandar directamente en tribunales civiles, aunque una reclamación previa por escrito siempre fortalece tu posición.",
    },
    {
      question: "¿Qué pruebas necesito para una demanda por negligencia médica?",
      answer: "Las claves son: ficha clínica completa (tienes derecho a pedir copia), certificados y segundas opiniones médicas, boletas de todos los gastos, registro de fechas y síntomas, y un peritaje médico que conecte la falla con tu daño. Sin peritaje que acredite la relación entre el error y el daño, la demanda casi no tiene chances.",
    },
    {
      question: "¿Puedo reclamar contra una clínica privada en el SERNAC?",
      answer: "Sí. Las clínicas privadas son proveedores bajo la Ley del Consumidor, así que puedes reclamar ante el SERNAC por mala calidad del servicio. Esa vía sirve para presionar una solución y deja constancia, pero la indemnización relevante se obtiene en tribunales civiles con una demanda de perjuicios.",
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <BlogGrowthHacks
        title="Negligencia médica en Chile 2026: cuándo demandar y qué indemnización pedir"
        description="¿Sufriste un daño por una atención médica? Revisa cuándo hay negligencia médica en Chile, qué pruebas necesitas y qué indemnización puedes pedir."
        image="/assets/negligencia-medica-chile-2026.png"
        url="https://legalup.cl/blog/negligencia-medica-chile-2026"
        datePublished="2026-09-28"
        dateModified="2026-09-28"
        faqs={faqs}
      />
      <Header onAuthClick={() => { }} />
      <ReadingProgressBar />

      {/* Hero Section */}
      <div className="bg-[#f4efdf] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 mb-4 text-green-500"><Link to="/blog" className="hover:text-green-900 transition-colors">
            Blog
          </Link>
            <ChevronRight className="h-4 w-4" />
            <span>Artículo</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-900">
            Negligencia médica en Chile 2026: cuándo puedes demandar y qué indemnización pedir
          </h1>

          <div className="bg-white backdrop-blur-sm border rounded-2xl p-6 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-4">
              Resumen rápido
            </p>

            <ul className="space-y-2 text-green-900">
              {[
                "Hay caso si hubo falla del prestador Y un daño concreto causado por esa falla",
                "Pide hoy mismo copia de tu ficha clínica: es tu prueba base y es tu derecho",
                "Puedes pedir gastos médicos, ingresos perdidos y daño moral",
                "Hospital público exige mediación previa; clínica privada permite demanda directa",
                "Los plazos de prescripción corren: no esperes años para asesorarte"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-green-500 font-medium">✓</span>
                  <span className="text-sm sm:text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl max-w-3xl leading-relaxed text-green-900">
            Una operación que salió mal, un diagnóstico que llegó tarde, un tratamiento que te dejó peor. No todo mal resultado médico es negligencia demandable, pero cuando hay una falla evitable que te causó daño, la ley chilena te permite exigir reparación. Esto es cómo saber si tu caso califica y qué pasos dar.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6 text-green-900 text-sm sm:text-base">
            <div className="flex items-center gap-2 text-green-900">
              <Calendar className="h-4 w-4" />
              <span>28 de Septiembre, 2026</span>
            </div>
            <div className="flex items-center gap-2 text-green-900">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2 text-green-900">
              <Clock className="h-4 w-4" />
              <ReadTime slug="negligencia-medica-chile-2026" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
        <div className="bg-white border sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare
            title="Negligencia médica en Chile 2026: cuándo puedes demandar y qué indemnización pedir"
            url="https://legalup.cl/blog/negligencia-medica-chile-2026"
          />

          <p className="text-base text-gray-600 leading-relaxed mb-8 -mt-4">
            La medicina no garantiza resultados: un tratamiento bien aplicado puede fallar. Por eso los tribunales no indemnizan el mal resultado en sí, sino la falla evitable. La pregunta que define tu caso no es "¿quedé mal?", sino "¿un profesional diligente habría evitado este daño?".
          </p>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Cuándo hay negligencia médica (y cuándo no)</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Para que exista un caso indemnizable deben juntarse tres elementos: una conducta por debajo del estándar (error de diagnóstico, técnica incorrecta, falta de consentimiento informado, demora injustificada), un daño concreto en tu salud o patrimonio, y una conexión directa entre esa falla y tu daño.
            </p>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-5 rounded-xl">
                <h3 className="font-bold text-green-800 text-lg mb-2">Casos que suelen calificar</h3>
                <p className="text-green-700">Cirugía en zona equivocada, diagnóstico tardío de algo detectable, alta prematura con complicaciones, medicamentos contraindicados, falta de información de riesgos relevantes.</p>
              </div>
              <div className="bg-red-50 p-5 rounded-xl">
                <h3 className="font-bold text-red-800 text-lg mb-2">Casos que suelen no calificar</h3>
                <p className="text-red-700">Riesgo conocido e informado que se materializó, evolución natural de la enfermedad pese a tratamiento correcto, resultado estético subóptimo sin falla técnica.</p>
              </div>
            </div>
          </div>

          <RelatedLawyers category="Derecho Civil" />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Qué indemnización puedes pedir</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              La demanda de perjuicios puede incluir tres partidas, y debes probar cada una:
            </p>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-base text-gray-700"><strong>Daño emergente:</strong> lo que ya gastaste por la falla: nuevas operaciones, remedios, traslados, cuidadores. Guarda cada boleta.</span>
              </div>
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-base text-gray-700"><strong>Lucro cesante:</strong> ingresos que dejaste de percibir por licencias, incapacidad o pérdida de capacidad laboral. Se acredita con liquidaciones y certificados.</span>
              </div>
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-base text-gray-700"><strong>Daño moral:</strong> dolor, secuelas, impacto en tu vida familiar y proyecto de vida. Lo fija el tribunal según gravedad y prueba: no hay tabla oficial.</span>
              </div>
            </div>
          </div>

          <BlogContextualCTA articleSlug="negligencia-medica-chile-2026" legalCategory="civil" />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Clínica privada vs hospital público: la vía cambia</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si la atención fue en una clínica o consulta privada, demandas directamente ante juzgados civiles, y además puedes reclamar ante el SERNAC por ser un servicio de consumo. Si fue en un hospital o consultorio público, la ley exige primero una mediación ante el Consejo de Defensa del Estado: sin esa mediación, tu demanda será declarada inadmisible.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              En ambos casos, el paso cero es el mismo: solicita por escrito copia íntegra de tu ficha clínica. Es tu derecho como paciente y es la base sobre la que cualquier abogado evaluará tu caso.
            </p>
          </div>

          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/juicio-ejecutivo-chile-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 Juicio ejecutivo en Chile: cómo cobrar lo que te deben por sentencia
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Qué hacer hoy si crees que fuiste víctima</h2>
            <div className="space-y-3 mb-6">
              {["Pide por escrito tu ficha clínica completa y guarda el comprobante de la solicitud", "Junta boletas, recetas, licencias y un registro con fechas de todo lo ocurrido", "Busca una segunda opinión médica que documente tu estado actual", "Reclama por escrito ante la clínica u hospital (deja constancia temprana)", "Asesórate con un abogado civil antes de que corran los plazos de prescripción"].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-green-600 font-bold flex-shrink-0">{i + 1}.</span>
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿En qué situaciones conviene consultar cuanto antes a un abogado?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">La negligencia médica exige prueba técnica, así que la evaluación legal temprana marca la diferencia.</p>
            <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
              {["Cuando hay secuelas permanentes, segunda cirugía o fallecimiento", "Cuando la clínica niega la ficha clínica o presiona por un acuerdo rápido", "Cuando el daño ocurrió hace tiempo y el plazo de prescripción puede estar corriendo"].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-green-600 flex-shrink-0">•</span>
                  <span className="text-gray-700 font-bold">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <InArticleCTA
            category="Derecho Civil"
            title="¿Sufriste un daño por una atención médica?"
            message="Un abogado civil evalúa si tu caso es negligencia demandable, qué pruebas te faltan y cuánta indemnización puedes pedir."
            buttonText="Evaluar mi caso de negligencia médica"
          />

          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              No todo mal resultado es negligencia, pero la falla evitable con daño concreto sí se indemniza en Chile: gastos, ingresos perdidos y daño moral. Tu caso se gana o se pierde en la prueba —ficha clínica, gastos documentados y peritaje— y en actuar dentro de plazo.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Si tienes secuelas o dudas de que tu atención fue correcta, una evaluación legal temprana te dice si hay caso antes de invertir años en él. Puedes partir buscando un <Link to="/search" className="text-green-700 underline hover:text-green-500">abogado civil en Chile</Link> con experiencia en responsabilidad médica.
            </p>
          </div>

          <CategoryCTA category="civil" topic="negligencia médica" />

          <div className="mb-6 pt-6" data-faq-section>
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

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8 mb-8">
          <BlogShare
            title="Negligencia médica en Chile 2026: cuándo puedes demandar y qué indemnización pedir"
            url="https://legalup.cl/blog/negligencia-medica-chile-2026"
          />
        </div>

        <BlogNavigation currentArticleId="negligencia-medica-chile-2026" />

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
      <BlogConversionPopup category="Derecho Civil" topic="negligencia médica" targetUrl="/search" title="¿Tienes secuelas de una atención médica?" message="Evalúa tu caso con un abogado civil antes de que venza el plazo para demandar." buttonText="Evaluar mi caso" />
    </div>
  );
};

export default BlogArticle;
