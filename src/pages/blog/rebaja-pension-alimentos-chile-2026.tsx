import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, AlertCircle } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import CategoryCTA from "@/components/blog/CategoryCTA";
import PreConclusionCTA from "@/components/blog/PreConclusionCTA";
import InArticleCTA from "@/components/blog/InArticleCTA";
import { ReadTime } from "@/components/blog/ReadTime";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

const RebajaSimulator = () => {
  const [currentPension, setCurrentPension] = useState(300000);
  const [newIncome, setNewIncome] = useState(1000000);
  const [children, setChildren] = useState(1);

  const calculateRatio = () => {
    if (newIncome <= 0) return 100;
    return Math.round((currentPension / newIncome) * 100);
  };

  const getRecommendation = () => {
    const ratio = calculateRatio();
    if (ratio >= 40) {
      return {
        level: "Alta probabilidad",
        color: "text-red-600 bg-red-50 border-red-100",
        message: `Tu pensión actual representa un ${ratio}% de tus nuevos ingresos. En Chile, la ley establece un tope máximo del 50% de los ingresos totales para el pago de pensiones alimenticias. Tu situación actual ejerce una carga económica desproporcionada, lo que constituye una base muy sólida para solicitar judicialmente la rebaja.`,
      };
    } else if (ratio >= 25) {
      return {
        level: "Probabilidad media-alta",
        color: "text-amber-600 bg-amber-50 border-amber-100",
        message: `Tu pensión actual representa un ${ratio}% de tus nuevos ingresos. Si bien no supera el tope legal, la disminución importante de ingresos justifica una revisión. Tienes buenas probabilidades si demuestras que el cambio es involuntario y permanente, y si se suman otras cargas (ej. nuevos hijos o problemas de salud).`,
      };
    } else {
      return {
        level: "Probabilidad moderada",
        color: "text-green-600 bg-green-50 border-green-100",
        message: `Tu pensión representa el ${ratio}% de tus nuevos ingresos. Para tener éxito en tribunales, deberás demostrar no solo el cambio en tus ingresos, sino un aumento justificado en tus gastos indispensables o que las necesidades del alimentario han disminuido de forma acreditable.`,
      };
    }
  };

  const rec = getRecommendation();

  return (
    <div className="p-6 sm:p-8 rounded-2xl my-8 border border-gray-100 bg-white shadow-sm">
      <div className="max-w-xl mx-auto">
        <h3 className="text-xl font-bold mb-4 text-gray-900">
          Simulador de Factibilidad de Rebaja
        </h3>
        <p className="text-gray-500 mb-6">
          Ingresa tus datos actuales para evaluar si existe mérito suficiente para pedir una rebaja en tribunales.
        </p>

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Pensión de alimentos actual ($)
            </label>
            <input
              type="number"
              value={currentPension}
              onChange={(e) => setCurrentPension(Number(e.target.value))}
              className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Tu nuevo ingreso líquido ($)
            </label>
            <input
              type="number"
              value={newIncome}
              onChange={(e) => setNewIncome(Number(e.target.value))}
              className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <div className={`p-5 rounded-xl border ${rec.color} transition-all`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-base uppercase tracking-wider">{rec.level}</span>
          </div>
          <p className="leading-relaxed text-gray-700">{rec.message}</p>
        </div>

        <p className="text-sm text-gray-400 mt-4 leading-relaxed italic">
          *Esta simulación es referencial y no constituye asesoría legal. El resultado definitivo en tribunales dependerá de las pruebas aportadas, las necesidades reales del alimentario y el criterio del juez de familia.
        </p>
      </div>
    </div>
  );
};

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Puedo bajar la pensión de alimentos por mi cuenta?",
      answer:
        "No. La rebaja debe ser aprobada judicialmente o mediante acuerdo visado por el tribunal. Si pagas menos unilateralmente, la diferencia se acumula automáticamente como deuda exigible.",
    },
    {
      question: "¿Qué pasa si perdí mi trabajo?",
      answer:
        "Puedes solicitar rebaja acreditando desempleo o disminución importante de ingresos, pero la obligación de pagar el monto previamente fijado sigue vigente hasta que el tribunal resuelva formalmente.",
    },
    {
      question: "¿Cuánto demora una rebaja de pensión?",
      answer:
        "El proceso completo (mediación previa obligatoria y eventual juicio) puede tardar desde unas semanas si hay acuerdo voluntario, hasta varios meses si se debe resolver mediante sentencia judicial.",
    },
    {
      question: "¿Tener nuevos hijos sirve para pedir rebaja?",
      answer:
        "Sí. La ley considera las nuevas cargas familiares como una circunstancia relevante, ya que tu capacidad económica debe distribuirse proporcionalmente entre todos tus hijos.",
    },
    {
      question: "¿Qué pasa si me demandan por deuda mientras pido rebaja?",
      answer:
        "La deuda acumulada y la solicitud de rebaja corren por carriles independientes. La deuda anterior sigue vigente y te la pueden cobrar judicialmente, por lo que actuar rápido es fundamental.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="Rebaja de pensión de alimentos en Chile: cuándo se puede pedir y cómo funciona (Guía 2026)"
        description="Aprende cuándo y cómo solicitar una rebaja de pensión de alimentos en Chile en 2026. Requisitos, motivos válidos y el proceso legal paso a paso para evitar deudas."
        image="/assets/rebaja-pension-chile-2026.png"
        url="https://legalup.cl/blog/rebaja-pension-alimentos-chile-2026"
        datePublished="2026-05-28"
        dateModified="2026-05-28"
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
            Rebaja de pensión de alimentos en Chile: cuándo se puede pedir y cómo funciona (Guía 2026)
          </h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">Resumen rápido</p>
            <ul className="space-y-2">
              {[
                "Sí es posible pedir rebaja de pensión de alimentos en Chile",
                "Debes demostrar un cambio importante en tu situación económica",
                "El tribunal NO rebaja automáticamente la pensión",
                "Seguir pagando menos por tu cuenta puede generar deuda",
                "La rebaja debe solicitarse judicialmente"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm sm:text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl max-w-3xl leading-relaxed">
            Muchas personas en Chile llegan a un punto donde simplemente ya no pueden seguir pagando la misma pensión de alimentos fijada hace meses o años atrás. Si te encuentras en este escenario, debes saber que la ley permite ajustar este monto, pero requiere de un trámite judicial riguroso.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>27 de Mayo, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <ReadTime slug="rebaja-pension-alimentos-chile-2026" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
        <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare
            title="Rebaja de pensión de alimentos en Chile: cuándo se puede pedir y cómo funciona (Guía 2026)"
            url="https://legalup.cl/blog/rebaja-pension-alimentos-chile-2026"
            showBorder={false}
          />

          {/* Intro */}
          <div className="prose prose-lg max-w-none mb-8">
            <p className="text-lg text-gray-600 leading-relaxed">
              Las razones más comunes para requerir una modificación suelen ser la pérdida de trabajo, disminución de ingresos, nuevas cargas familiares, enfermedades, deudas o crisis económicas generales. Y ahí aparece una duda muy frecuente: <strong>¿Se puede rebajar la pensión de alimentos en Chile?</strong> La respuesta es sí.
            </p>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-xl my-6">
              <p className="font-bold text-amber-950">¡Cuidado!</p>
              <p className="text-amber-800 leading-relaxed">
                La rebaja NO ocurre automáticamente. Aunque tus ingresos hayan bajado, debes solicitar formalmente la modificación ante el tribunal. Si simplemente comienzas a pagar menos por tu cuenta, la diferencia se transformará en deuda de pensión con intereses y severas medidas de apremio.
              </p>
            </div>
            <p className="text-gray-600 leading-relaxed">
              En esta guía 2026 te explicamos cuándo se puede pedir rebaja de pensión de alimentos, qué requisitos existen, cómo funciona el proceso y qué errores debes evitar al gestionar este cambio.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Si tu situación ya cambió y necesitas actuar, puedes revisar tu caso con un{" "}
              <Link to="/abogado-pension-alimentos" className="text-green-700 underline hover:text-green-600">
                abogado para rebaja de pensión de alimentos
              </Link>{" "}
              antes de que la deuda se acumule.
            </p>
          </div>

          {/* Qué es una rebaja */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Qué es una rebaja de pensión de alimentos?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Es una solicitud judicial para disminuir el monto de una pensión de alimentos que ya fue fijada previamente de manera formal, ya sea por una sentencia del tribunal, un acuerdo en mediación aprobada, o una transacción judicial.
            </p>
            <p className="text-gray-600 mb-4">La idea es ajustar el aporte cuando:</p>

            <InArticleCTA category="Derecho de Familia" />

            <ul className="space-y-2 bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm text-gray-600 mb-4">
              {[
                "Cambió sustancialmente la situación económica de quien paga.",
                "El monto original se volvió desproporcionado respecto a los nuevos ingresos.",
                "Existen nuevas circunstancias relevantes (ej. nuevos dependientes)."
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm sm:text-base">
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600 mt-1" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-600 leading-relaxed text-sm border-l-4 border-green-500 pl-4 italic mt-4">
              La rebaja de pensión se fundamenta en el principio de alteración de las circunstancias, recogido en el artículo 323 del Código Civil chileno. Para que proceda, el cambio en la situación económica del alimentante debe ser objetivo, relevante y de cierta permanencia. Los tribunales han establecido que las fluctuaciones temporales de ingresos o las disminuciones voluntarias no configuran causal suficiente, pues la obligación alimenticia debe cumplirse con esfuerzo y sacrificio.
            </p>
          </div>

          {/* ¿Se puede bajar porque quiero? */}
          <div className="mb-12">
            <h3 className="text-xl font-bold mb-3 text-gray-800">¿Se puede bajar la pensión porque quiero?</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              <strong>No.</strong> El tribunal exige fundamentos reales, objetivos y acreditables. Debes demostrar de manera fehaciente un cambio importante, permanente o relevante que afecte severamente tu capacidad de pago real.
            </p>
          </div>

          {/* Motivos comunes */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Motivos más comunes para pedir rebaja</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              La ley chilena no rebaja pensiones por capricho. El juez buscará constatar que las circunstancias del alimentante realmente variaron. Las causas más recurrentes son:
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {[
                {
                  title: "Pérdida de empleo",
                  desc: "Uno de los casos más frecuentes: despido injustificado, término de contrato, cierre de empresa o desempleo prolongado.",
                  icon: "💼"
                },
                {
                  title: "Disminución de ingresos",
                  desc: "Baja demostrable de sueldo, menos clientes si eres independiente, caída en ventas de tu negocio o pérdida de contratos clave.",
                  icon: "📉"
                },
                {
                  title: "Nuevos hijos o cargas",
                  desc: "Nuevos hijos nacidos con posterioridad o personas legalmente dependientes. La capacidad económica debe repartirse proporcionalmente.",
                  icon: "👶"
                },
                {
                  title: "Enfermedades o salud",
                  desc: "Gastos médicos altos imprevistos, incapacidad laboral temporal o permanente, o disminución drástica en la capacidad de trabajo.",
                  icon: "🏥"
                }
              ].map((c, i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-gray-200 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{c.icon}</span>
                    <span className="font-bold text-gray-950 text-base">{c.title}</span>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl mb-4">
              <p className="font-bold text-blue-900">Cambios en necesidades del hijo</p>
              <p className="text-blue-800 leading-relaxed">
                En algunos casos específicos, la rebaja también puede justificarse si disminuyen drásticamente ciertos gastos esenciales del niño, niña o adolecente (ej. egresar de la universidad, cambio de colegio a uno significativamente más económico por mutuo acuerdo, etc.).
              </p>
            </div>
          </div>

          <RebajaSimulator />

          <div className="mb-12">

          </div>

          {/* ¿Qué no suele servir? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Qué NO suele servir para pedir rebaja?</h2>
            <p className="text-gray-600 mb-6">Existen varios errores comunes que llevan al rechazo inmediato de la demanda por parte del juez:</p>

            <div className="space-y-4 bg-red-50 border border-red-100 rounded-2xl p-6 sm:p-8 text-gray-800">
              {[
                {
                  title: "“Tengo muchas deudas”",
                  desc: "El simple hecho de contraer créditos de consumo, deudas comerciales o de tarjetas de crédito voluntarias NO basta por sí solo, ya que el tribunal prioriza la subsistencia del niño, niña o adolescente por sobre tus acreedores comerciales."
                },
                {
                  title: "“Solo quiero pagar menos”",
                  desc: "El tribunal no acogerá un requerimiento sin fundamentos económicos objetivos. La voluntad unilateral de reducir el aporte es insuficiente."
                },
                {
                  title: "Gastos personales voluntarios",
                  desc: "Comprar vehículos nuevos, realizar viajes de turismo o asumir gastos suntuarios o de lujo difícilmente justificarán una reducción del deber de alimentos."
                }
              ].map((err, i) => (
                <div key={i} className="flex gap-4">
                  <div className="text-red-500 font-bold text-lg mt-0.5 flex-shrink-0">✕</div>
                  <div>
                    <h4 className="font-bold text-red-950">{err.title}</h4>
                    <p className="text-red-800 leading-relaxed">{err.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* No bajar por su cuenta */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Importante: NO puedes bajar la pensión por tu cuenta</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Este es probablemente el error más grave y extendido. Muchas personas dejan de pagar completo, reducen el depósito unilateralmente o “ajustan” el monto bajo la promesa informal de regularizarlo después.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              En la práctica, esto suele desencadenar una acumulación descontrolada de deuda, cobro de intereses penales y medidas de apremio inmediatas.
            </p>

            <div className="bg-red-950 p-6 rounded-2xl text-white relative overflow-hidden my-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 blur-2xl rounded-full -mr-16 -mt-16"></div>
              <p className="font-bold text-red-200 uppercase tracking-widest text-xs mb-2">Apremios por no pago</p>
              <p className="text-lg font-serif leading-relaxed">
                Si pagas menos sin autorización judicial, la diferencia se acumula como deuda y te arriesgas a: <strong>liquidación de deuda, embargo de bienes, retención de sueldo o impuestos, arraigo nacional, suspensión de licencia de conducir o arresto nocturno/completo.</strong>
              </p>
            </div>
          </div>

          {/* Cómo pedir rebaja */}
          <div className="mb-8 mt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cómo pedir rebaja de pensión de alimentos?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El proceso judicial en Chile consta de etapas obligatorias diseñadas para buscar el equilibrio económico entre ambas partes.
            </p>

            <div className="space-y-4">
              {[
                {
                  title: "Reunir pruebas económicas",
                  desc: "Debes compilar y acreditar detalladamente tus nuevos ingresos, tus gastos fijos indispensables y tus nuevas cargas. Sirven liquidaciones de sueldo, finiquitos, boletas de honorarios, cartolas bancarias, certificados médicos y certificados de nacimiento de nuevos hijos."
                },
                {
                  title: "Mediación familiar obligatoria",
                  desc: "Antes de demandar, la ley exige pasar por un proceso de mediación familiar. Si ambas partes acuerdan un nuevo monto, se firma un acta que se envía al juez para su aprobación, cerrando el caso rápidamente."
                },
                {
                  title: "Presentar demanda de rebaja",
                  desc: (
                    <>
                      Si la mediación se frustra (no hay acuerdo o una de las partes no asiste), el mediador emite
                      un acta de mediación frustrada. Con ella, un{" "}
                      <Link to="/abogado-pension-alimentos" className="text-green-700 underline hover:text-green-600">
                        abogado especialista en pensión de alimentos
                      </Link>{" "}
                      redacta y presenta la demanda de rebaja ante el Tribunal de Familia competente.
                    </>
                  ),
                },
                {
                  title: "Audiencia de juicio",
                  desc: "El tribunal citará a una audiencia donde el juez revisará con rigor las pruebas de ingresos, gastos y necesidades reales del hijo, evaluando la capacidad económica de ambas partes."
                },
                {
                  title: "Resolución judicial",
                  desc: "El juez dictará sentencia, la cual puede acoger la rebaja total, rechazar la solicitud o ajustar la pensión de manera parcial al nuevo escenario."
                }
              ].map((step, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex gap-4">
                  <div className="bg-gray-900 p-2 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0 font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{step.title}</h4>
                    <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl my-6">
              <p className="font-bold text-blue-900">¿La rebaja aplica de inmediato al presentar la demanda?</p>
              <p className="text-blue-800">
                <strong>No necesariamente.</strong> Mientras el juez no dicte una resolución que apruebe provisional o definitivamente el nuevo monto, la pensión original sigue plenamente vigente. Dejar de pagar completo durante el transcurso del juicio generará deuda exigible.
              </p>
            </div>
          </div>



          {/* Cuánto puede rebajarse */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Cuánto puede rebajarse la pensión?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              No existe un porcentaje fijo ni una regla matemática en la ley. El tribunal analiza con pinzas los ingresos reales, las necesidades vigentes del alimentario, la capacidad económica del otro progenitor y el principio de proporcionalidad para no desamparar al menor.
            </p>

            <div className="bg-green-900 text-white p-8 rounded-3xl relative overflow-hidden my-6">
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 blur-3xl rounded-full -mr-32 -mt-32"></div>
              <h4 className="text-lg font-bold mb-4 text-green-400">Ejemplo de Escenario Práctico</h4>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <p className="font-bold text-xs mb-2 uppercase tracking-wider text-green-300">Antes:</p>
                  <ul className="space-y-1">
                    <li>Sueldo: $2.000.000 líquido</li>
                    <li>Pensión fijada: $500.000</li>
                  </ul>
                </div>
                <div>
                  <p className="font-bold text-xs mb-2 uppercase tracking-wider text-green-300">Después:</p>
                  <ul className="space-y-1 text-red-100">
                    <li>Despido e ingresos informales o nuevo sueldo de $1.000.000</li>
                    <li>La pensión representaría el 50% de sus ingresos líquidos</li>
                  </ul>
                </div>
              </div>
              <p className="text-green-200 mt-6 pt-4 border-t border-white/10 leading-relaxed">
                *En este caso existe una base razonable para pedir rebaja, pero el resultado final dependerá de la capacidad de probar los hechos y las necesidades reales del hijo.
              </p>
            </div>

            <p className="text-gray-600 leading-relaxed text-sm border-l-4 border-green-500 pl-4 italic">
              El monto de la rebaja no está predeterminado legalmente, pero los tribunales suelen aplicar un criterio de proporcionalidad inversa: a mayor disminución de ingresos, mayor posibilidad de rebaja, siempre que el nuevo monto no desatienda las necesidades básicas del alimentario. En la práctica, rebajas superiores al 40% del monto original solo prosperan cuando el alimentante acredita una disminución drástica y permanente de su capacidad económica.
            </p>
          </div>


          {/* Enlaces relacionados */}
          <div className="mb-6 space-y-3">
            <div className="text-center py-4 border-t border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículos relacionados</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3"></div>
              <Link
                to="/blog/deuda-pension-alimentos-chile-2026"
                className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
              >
                👉 Deuda de pensión de alimentos en Chile
              </Link>
            </div>
          </div>

          {/* Qué revisa el juez */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué revisa el juez para decidir?</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { title: "Necesidades del hijo", desc: "El interés superior del niño sigue siendo la prioridad absoluta." },
                { title: "Capacidad económica real", desc: "No solo el sueldo formal: también evalúa tu patrimonio general, bienes e ingresos informales." },
                { title: "Buena fe procesal", desc: "El tribunal investigará si estás ocultando ingresos reales, simulando desempleo o transfiriendo bienes a terceros." },
                { title: "Proporcionalidad", desc: "Se busca que la pensión sea realista y no arrastre a la quiebra al alimentante ni desampare al alimentario." }
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                  <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                  <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-gray-600 leading-relaxed text-sm border-l-4 border-green-500 pl-4 italic mt-4">
              La jurisprudencia chilena ha precisado que el tribunal no solo verifica los ingresos formales del alimentante, sino que puede ordenar diligencias probatorias oficiosas para determinar su capacidad económica real. Entre estas diligencias destaca el informe socioeconómico del consejo técnico, que puede revelar gastos inconsistentes con los ingresos declarados. La buena fe procesal es esencial: el ocultamiento de ingresos puede ser sancionado con el rechazo de la solicitud de rebaja.
            </p>
          </div>

          {/* Enlaces relacionados */}
          <div className="mb-6 space-y-3">
            <div className="text-center py-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículos relacionados</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  to="/blog/derecho-de-familia-chile-2026"
                  className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                >
                  👉 Guía completa: Derecho de Familia
                </Link>
              </div>
            </div>
          </div>

          {/* CUANDO CONSULTAR A UN ABOGADO */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">¿En qué situaciones conviene consultar cuanto antes a un abogado de familia?</h2>
            <p className="text-gray-600 mb-4">Este artículo ofrece información general, pero hay escenarios donde la asesoría temprana marca la diferencia:</p>
            <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
              <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Cuando has perdido tu empleo o tus ingresos han disminuido drásticamente y necesitas adecuar la pensión a tu nueva realidad económica.</span></li>
              <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Si han nacido nuevos hijos o has adquirido nuevas cargas familiares que hacen insostenible el monto actual.</span></li>
              <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Cuando padeces una enfermedad grave o discapacidad que afecta tu capacidad de generar ingresos.</span></li>
              <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Si ya has reducido el pago por tu cuenta y necesitas regularizar la situación antes de que la deuda acumulada active medidas de apremio.</span></li>
            </ul>
            <p className="text-gray-600 mt-4">Una evaluación temprana permite reunir las pruebas correctas y evitar que la deuda siga creciendo mientras tramitas la rebaja.</p>
          </div>

          {/* CTA before Conclusion */}
          <PreConclusionCTA
            description="Si tus ingresos bajaron y ya no puedes mantener el mismo monto de pensión, un abogado de familia puede orientarte para solicitar la rebaja judicial antes de que la deuda se acumule."
            link="/abogado-pension-alimentos"
            buttonText="Ver abogados de pensión de alimentos"
          />

          {/* Conclusión */}
          <RelatedLawyers category="Derecho de Familia" />

          <div className="prose prose-lg max-w-none mb-12 border-t pt-8">

            <h2 className="text-2xl font-bold mb-4 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Sí es posible pedir una rebaja de pensión de alimentos en Chile, pero el cambio nunca ocurre automáticamente ni por decisión unilateral de quien paga. El error más peligroso es comenzar a pagar menos sin autorización judicial pensando que "después se arreglará". En la práctica, eso suele transformarse rápidamente en deuda acumulada, intereses y medidas de apremio que pueden empeorar muchísimo tu situación personal y financiera.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Los tribunales de familia sí consideran los cambios económicos reales: pérdida de trabajo, disminución demostrable de ingresos, enfermedades graves o nuevas cargas familiares. Sin embargo, todo debe acreditarse correctamente y de buena fe. El juez analizará el caso velando siempre por el bienestar del hijo — lo que significa que una rebaja sin respaldo sólido tiene pocas probabilidades de prosperar.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              La diferencia entre una rebaja exitosa y una solicitud rechazada está casi siempre en la documentación y en el momento en que actúas. Quien presenta la solicitud rápido, con liquidaciones de sueldo, finiquito, certificados médicos o cualquier evidencia que respalde el cambio real en su situación, tiene muchas más posibilidades de obtener una modificación justa.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Si tu situación económica cambió y ya no puedes mantener el monto actual, no esperes a
              acumular deuda antes de actuar. El tribunal puede considerar la rebaja desde la fecha de
              la solicitud — no desde el momento en que empezaste a tener dificultades.
            </p>

            <p className="text-gray-600 leading-relaxed mb-4">
              Este artículo entrega información de carácter general sobre la rebaja de pensión de alimentos en Chile. Las particularidades de cada caso, la existencia de otros hijos, las necesidades del alimentario y la capacidad económica real del solicitante pueden incidir en la decisión del tribunal de familia.
            </p>

            <p className="text-gray-600 leading-relaxed">
              Si necesitas solicitar una rebaja de pensión y no sabes cómo hacerlo, un{" "}
              <Link to="/abogado-pension-alimentos" className="text-green-700 underline hover:text-green-600">
                abogado de familia
              </Link>{" "}
              puede ayudarte a documentar tu caso y representarte ante el tribunal.
            </p>
          </div>

          {/* CTA Section - Specific Category */}
          <CategoryCTA category="familia" topic="pension" />

          {/* FAQs */}

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
      </div>



      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare
            title="Rebaja de pensión de alimentos en Chile: cuándo se puede pedir y cómo funciona (Guía 2026)"
            url="https://legalup.cl/blog/rebaja-pension-alimentos-chile-2026"
          />
        </div>

        <BlogNavigation currentArticleId="rebaja-pension-alimentos-chile-2026" />

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
      <BlogConversionPopup category="Derecho de Familia" topic="rebaja-pension" />
    </div>
  );
};

export default BlogArticle;
