import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Calendar, User, Clock, ChevronRight, CheckCircle, Shield } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import { ReadTime } from "@/components/blog/ReadTime";
import InArticleCTA from "@/components/blog/InArticleCTA";
import CategoryCTA from "@/components/blog/CategoryCTA";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Qué pasa si no firmo el finiquito en Chile?",
      answer:
        "El contrato laboral puede terminar igualmente aunque no firmes el finiquito, siempre que el despido haya sido notificado correctamente. No firmar no te protege del despido — pero sí te da tiempo para revisar los montos, consultar con un abogado y evaluar si conviene demandar o negociar una corrección antes de cerrar el proceso.",
    },
    {
      question: "¿Pierdo el dinero que me deben si no firmo el finiquito?",
      answer:
        "No. El empleador sigue obligado a pagarte las indemnizaciones que corresponden por ley, independientemente de si firmas o no. Lo que puede pasar es que el pago se retrase mientras no hay acuerdo. Si el empleador retiene el pago injustificadamente, esa deuda se reajusta con IPC y genera intereses — lo que en la práctica te beneficia si terminas demandando.",
    },
    {
      question: "¿Puedo demandar si ya firmé el finiquito?",
      answer:
        "Depende de cómo firmaste. Si firmaste con reserva de derechos, puedes demandar la diferencia o impugnar el despido dentro del plazo legal. Si firmaste sin reserva, el finiquito tiene efecto liberatorio y las posibilidades se reducen significativamente — aunque hay excepciones como cotizaciones impagas o nulidad del despido. Consulta con un abogado antes de asumir que perdiste el derecho.",
    },
    {
      question: "¿Qué significa firmar el finiquito con reserva de derechos?",
      answer:
        "Significa que aceptas recibir el pago que el empleador te ofrece, pero dejas constancia escrita de que no estás de acuerdo con algún monto o condición y que te reservas el derecho de reclamarlo judicialmente. Se escribe a mano antes de tu firma: 'Firmo con reserva de derechos en todos sus términos.' Es la mejor opción cuando quieres el dinero hoy pero crees que te deben más.",
    },
    {
      question: "¿Cuánto tiempo tengo para reclamar después de no firmar o firmar con reserva?",
      answer:
        "Tienes 60 días hábiles desde la fecha de término del contrato para presentar una demanda ante el Juzgado del Trabajo o un reclamo en la Inspección del Trabajo. Si vas primero a la Inspección, el plazo se extiende hasta 90 días hábiles desde el despido. Este plazo corre igual tanto si firmaste con reserva como si no firmaste — no esperes.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="¿Qué pasa si no firmo el finiquito en Chile? Derechos, riesgos y qué hacer (Guía 2026)"
        description="Descubre qué ocurre si no firmas tu finiquito, los riesgos legales, cuándo hacer una reserva de derechos y cómo proteger tus indemnizaciones."
        image="/assets/que-pasa-si-no-firmo-finiquito-chile-2026.png"
        url="https://legalup.cl/blog/que-pasa-si-no-firmo-el-finiquito-chile-2026"
        datePublished="2026-05-20"
        dateModified="2026-05-20"
        faqs={faqs}
      />
      <Header onAuthClick={() => { }} />
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
            ¿Qué pasa si no firmo el finiquito? Guía completa Chile 2026
          </h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
              Resumen rápido
            </p>
            <ul className="space-y-2">
              {[
                "No estás obligado a firmar el finiquito inmediatamente",
                "Puedes revisar el documento antes de aceptar",
                "Firmar sin “reserva de derechos” puede limitar futuros reclamos",
                "Si no estás de acuerdo con los montos, puedes negarte a firmar",
                "Tienes plazos legales cortos para demandar"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-base sm:text-base text-gray-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl leading-relaxed">
            Si no firmas el finiquito no pierdes automáticamente tus derechos laborales. Sin embargo, las consecuencias dependen del motivo por el cual decides no firmarlo. Después de un despido o término de contrato, muchas personas sienten presión para firmar el finiquito rápidamente. A veces el empleador dice frases como "firma ahora" o "si no firmas, no te pagaremos".
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6 text-base sm:text-base">
            <div className="flex items-center gap-2 text-gray-300">
              <Calendar className="h-4 w-4" />
              <span>20 de Mayo, 2026</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Clock className="h-4 w-4" />
              <ReadTime slug="que-pasa-si-no-firmo-el-finiquito-chile-2026" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
        <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare
            title="¿Qué pasa si no firmo el finiquito en Chile? Derechos, riesgos y qué hacer (Guía 2026)"
            url="https://legalup.cl/blog/que-pasa-si-no-firmo-el-finiquito-chile-2026"
            showBorder={false}
          />

          <div className="prose max-w-none mb-12">
            <p className="text-base text-gray-600 leading-relaxed mb-6">
              Después de un despido o término de contrato, muchas personas sienten presión para firmar el finiquito rápidamente. A veces el empleador dice frases como:
            </p>
            <ul className="list-disc pl-5 mb-6 text-gray-600 font-bold">
              <li>“Firma ahora”</li>
              <li>“Si no firmas, no te pagaremos”</li>
              <li>“Esto es estándar”</li>
              <li>“Si no aceptas hoy, pierdes el dinero”</li>
            </ul>
            <p className="text-base text-gray-600 leading-relaxed mb-6">
              Y ahí aparece una de las dudas laborales más comunes en Chile:
            </p>
            <p className="text-gray-900 font-bold text-xl mb-4">¿Qué pasa si no firmo el finiquito?</p>
            <p className="text-gray-600 leading-relaxed mb-6">La respuesta corta es esta:</p>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 mb-6 flex items-start gap-3">
              <span className="text-xl">👉</span>
              <p className="text-blue-900 font-bold">
                No estás obligado a firmarlo inmediatamente si no estás de acuerdo o necesitas revisarlo.
              </p>
            </div>

            <p className="text-gray-600 leading-relaxed mb-6">
              En algunos casos, firmar apresuradamente puede hacerte perder indemnizaciones, limitar demandas futuras o aceptar montos incorrectos.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              En esta guía 2026 te explicamos qué ocurre si no firmas el finiquito, qué riesgos existen, cuándo conviene firmar con reserva de derechos y qué hacer si el empleador te presiona.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué es el finiquito laboral?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              El finiquito es el documento que pone término formal a la relación laboral entre trabajador y empleador.
            </p>
            <div className="bg-green-50 p-8 rounded-2xl border border-green-100 mb-8 mt-6">
              <h3 className="text-green-900 font-bold mb-4">En este documento normalmente se incluyen:</h3>
              <ul className="grid sm:grid-cols-2 gap-3 list-none p-0">
                {[
                  "Indemnizaciones",
                  "Vacaciones pendientes",
                  "Aviso previo",
                  "Remuneraciones adeudadas",
                  "Bonos pendientes",
                  "Acuerdos entre las partes"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-green-800 text-base">
                    <CheckCircle className="h-4 w-4 mt-1 flex-shrink-0 text-green-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-gray-600 mb-4 font-medium">Una vez firmado, el finiquito tiene valor legal importante.</p>
            <p className="text-gray-600 font-bold">Por eso revisarlo antes de firmar es fundamental.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Estoy obligado a firmar el finiquito?</h2>
            <p className="text-gray-900 font-black text-xl mb-6">No.</p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              En Chile, ningún trabajador está obligado a firmar inmediatamente.
            </p>
            <p className="text-gray-600 mb-4 font-bold">Tienes derecho a:</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {[
                "Leer el documento",
                "Revisar los montos",
                "Consultar con un abogado",
                "Verificar cálculos",
                "Hacer observaciones",
                "Negarte si no estás de acuerdo"
              ].map((item, i) => (
                <span key={i} className="bg-gray-100 px-4 py-2 rounded-full text-gray-700 text-base font-medium">{item}</span>
              ))}
            </div>

            <p className="text-gray-600 mb-4 font-bold">Esto es especialmente importante cuando:</p>
            <ul className="space-y-3 mb-6">
              {[
                "El despido parece injustificado",
                "Faltan pagos",
                "Hay errores",
                "Existen cotizaciones impagas",
                "Quieres demandar posteriormente"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-700">
                  <Shield className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4">¿Firmar apenas te entregan el finiquito o tomarte tiempo para revisarlo?</h2>
              <p className="text-gray-600 mb-4">La decisión de firmar inmediatamente o tomarte un tiempo para revisar puede cambiar completamente el resultado de tu finiquito.</p>
              <div className="grid sm:grid-cols-2 gap-6 mt-6">
                  <div className="bg-green-50 p-5 rounded-xl">
                      <h3 className="font-bold text-green-800 text-lg mb-2">Tomarte tiempo para revisar</h3>
                      <p className="text-green-700">Tienes derecho a leer el documento, consultar con un abogado y verificar los montos antes de firmar. Esto te permite detectar errores, negociar mejores condiciones y proteger tus derechos laborales.</p>
                  </div>
                  <div className="bg-red-50 p-5 rounded-xl">
                      <h3 className="font-bold text-red-800 text-lg mb-2">Firmar de inmediato bajo presión</h3>
                      <p className="text-red-700">Firmar sin revisar puede hacer que aceptes montos incorrectos, renuncies a acciones legales futuras y pierdas indemnizaciones que legalmente te corresponden.</p>
                  </div>
              </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si no firmo el finiquito?</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">Depende de la situación.</p>

            <div className="space-y-6">
              <div className="p-6 border rounded-2xl bg-white shadow-sm">
                <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <span className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center text-base font-normal">1</span>
                  El contrato igualmente termina
                </h3>
                <p className="text-gray-600 font-medium mb-2">No firmar NO revive el contrato laboral.</p>
                <p className="text-gray-600 mb-2">Si el empleador ya notificó legalmente el despido:</p>
                <ul className="list-disc pl-5 mb-4 text-gray-600">
                  <li>La relación laboral termina igual</li>
                  <li>Aunque no firmes el finiquito</li>
                </ul>
                <p className="text-gray-600 mb-2 font-bold">Este punto genera mucha confusión.</p>
                <p className="text-gray-600">El finiquito acredita pagos y cierre de obligaciones, pero no siempre determina si el despido existe o no.</p>
              </div>

              <div className="p-6 border rounded-2xl bg-white shadow-sm">
                <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <span className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center text-base font-normal">2</span>
                  Puedes discutir los montos
                </h3>
                <p className="text-gray-600 mb-2">Negarte a firmar te permite:</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {["Revisar cálculos", "Reclamar diferencias", "Evaluar acciones legales"].map((item, i) => (
                    <span key={i} className="bg-gray-100 px-3 py-1 rounded-full text-sm">{item}</span>
                  ))}
                </div>
                <p className="text-gray-600 mb-2 font-medium">Por ejemplo:</p>
                <ul className="list-disc pl-5 text-gray-600">
                  <li>Años de servicio mal calculados</li>
                  <li>Vacaciones pendientes incompletas</li>
                  <li>Falta aviso previo</li>
                  <li>Bonos no incluidos</li>
                </ul>
              </div>

              <div className="p-6 border rounded-2xl bg-white shadow-sm">
                <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <span className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center text-base font-normal">3</span>
                  Puedes demandar
                </h3>
                <p className="text-gray-600 mb-2">En muchos casos, no firmar es una señal de que:</p>
                <ul className="list-disc pl-5 mb-4 text-gray-600">
                  <li>No aceptas el despido</li>
                  <li>No aceptas los montos</li>
                  <li>Evaluarás acciones judiciales</li>
                </ul>
                <p className="text-gray-600 mb-2 font-medium">Esto ocurre frecuentemente en:</p>
                <div className="flex flex-wrap gap-2">
                  {["Despidos injustificados", "Autodespidos", "Nulidad del despido", "Cotizaciones impagas"].map((item, i) => (
                    <span key={i} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">{item}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <InArticleCTA
            message="¿No firmaste el finiquito y no sabes qué hacer? Un abogado laboral puede revisar tu caso y orientarte antes de que venzan los plazos."
            buttonText="Hablar con un abogado laboral"
            category="Derecho Laboral"
          />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿El empleador puede negarse a pagar si no firmo?</h2>
            <p className="text-gray-600 mb-4 font-bold">Aquí hay un punto importante.</p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El empleador NO puede usar el finiquito para eliminar derechos laborales legales.
            </p>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-2xl mb-8">
              <p className="font-bold text-amber-900 mb-2">Sin embargo, en la práctica:</p>
              <ul className="list-disc pl-5 text-amber-800">
                <li>Muchas empresas retienen pagos</li>
                <li>Esperan firma</li>
                <li>Intentan cerrar el conflicto rápido</li>
              </ul>
            </div>

            <p className="text-gray-600 mb-4 font-bold">Por eso cada caso debe evaluarse estratégicamente.</p>
            <p className="text-gray-600 mb-4">A veces conviene:</p>
            <ul className="space-y-2 mb-6">
              {[
                "Firmar con reserva de derechos",
                "Aceptar parte del dinero",
                "Luego demandar diferencias"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4">¿Negarte a firmar el finiquito o firmar con reserva de derechos?</h2>
              <p className="text-gray-600 mb-4">Muchos trabajadores creen que negarse a firmar es la única opción para proteger sus derechos, pero existe una alternativa estratégica.</p>
              <div className="grid sm:grid-cols-2 gap-6 mt-6">
                  <div className="bg-green-50 p-5 rounded-xl">
                      <h3 className="font-bold text-green-800 text-lg mb-2">Firmar con reserva de derechos</h3>
                      <p className="text-green-700">Recibes los pagos inmediatos del empleador mientras te reservas el derecho de demandar diferencias después. Es la opción más equilibrada cuando necesitas el dinero pero crees que te deben más.</p>
                  </div>
                  <div className="bg-red-50 p-5 rounded-xl">
                      <h3 className="font-bold text-red-800 text-lg mb-2">Negarte completamente a firmar</h3>
                      <p className="text-red-700">El empleador puede retener los pagos mientras no haya acuerdo, generando incertidumbre económica. Además, el contrato termina igual y los plazos legales para demandar siguen corriendo.</p>
                  </div>
              </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué significa firmar con reserva de derechos?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              La reserva de derechos es probablemente una de las herramientas laborales más importantes en Chile.
            </p>
            <p className="text-gray-600 mb-4">Consiste en firmar el finiquito indicando que:</p>
            <div className="bg-green-50 p-4 rounded-xl border border-green-100 mb-6 text-center">
              <p className="text-green-800 font-bold text-lg">NO renuncias a futuras acciones legales</p>
            </div>
            <p className="text-gray-600 mb-4 font-medium">Por ejemplo:</p>
            <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700 mb-6">
              “Me reservo el derecho de demandar por despido injustificado.”
            </blockquote>
            <p className="text-gray-600 mb-2 font-bold">Esto permite:</p>
            <ul className="list-disc pl-5 text-gray-600">
              <li>Recibir pagos inmediatos</li>
              <li>Sin perder la posibilidad de demandar después</li>
            </ul>

            <div className="text-center py-6 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Guía paso a paso</p>
              <Link
                to="/blog/reserva-de-derechos-finiquito-chile-2026"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
              >
                👉 Guía detallada: Cómo escribir la reserva de derechos
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuándo conviene firmar con reserva de derechos?</h2>
            <p className="text-gray-600 mb-4">Es muy común cuando existen dudas sobre:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {[
                "Despido injustificado",
                "Cálculo de indemnizaciones",
                "Cotizaciones impagas",
                "Acoso laboral",
                "Autodespido",
                "Diferencias salariales",
                "Nulidad del despido"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <span className="text-gray-700 font-medium text-base">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 font-bold">En muchos casos, es más conveniente que negarse completamente a firmar.</p>
          </div>

          <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4">¿Consultar con un abogado antes de firmar o firmar primero y preguntar después?</h2>
              <p className="text-gray-600 mb-4">El momento en que buscas asesoría legal puede determinar si recuperas lo que te deben o si pierdes derechos importantes.</p>
              <div className="grid sm:grid-cols-2 gap-6 mt-6">
                  <div className="bg-green-50 p-5 rounded-xl">
                      <h3 className="font-bold text-green-800 text-lg mb-2">Consultar con un abogado antes de firmar</h3>
                      <p className="text-green-700">Un abogado laboral puede revisar el finiquito, detectar errores en los cálculos, evaluar la causal de despido y recomendar la mejor estrategia antes de que tomes una decisión irrevocable.</p>
                  </div>
                  <div className="bg-red-50 p-5 rounded-xl">
                      <h3 className="font-bold text-red-800 text-lg mb-2">Firmar primero y consultar después</h3>
                      <p className="text-red-700">Una vez firmado sin reserva de derechos, las opciones legales se reducen significativamente. El empleador puede argumentar que aceptaste los montos y renunciaste a reclamar.</p>
                  </div>
              </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si firmé sin reserva de derechos?</h2>
            <p className="text-gray-600 mb-4 font-bold">Esto puede complicar futuros reclamos.</p>
            <p className="text-gray-600 mb-4">Porque el empleador podría argumentar que:</p>
            <ul className="list-disc pl-5 mb-6 text-gray-600">
              <li>Aceptaste los montos</li>
              <li>Renunciaste a acciones posteriores</li>
              <li>Diste por cerrado el conflicto</li>
            </ul>
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-8">
              <p className="text-blue-900 font-bold mb-2">Sin embargo:</p>
              <ul className="list-disc pl-5 text-blue-800">
                <li>No siempre significa perder automáticamente</li>
                <li>Depende del caso</li>
                <li>Existen excepciones legales</li>
              </ul>
            </div>
            <p className="text-gray-600 font-bold">Por eso es importante actuar rápido y evaluar la situación con asesoría laboral.</p>
          </div>

          <InArticleCTA
            message="¿Ya firmaste sin reserva de derechos y crees que te deben más? Consulta con un abogado laboral para evaluar si aún puedes reclamar."
            buttonText="Consultar mi caso ahora"
            category="Derecho Laboral"
          />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuánto tiempo tengo para demandar?</h2>
            <p className="text-gray-600 mb-4">Los plazos laborales son cortos.</p>
            <div className="flex items-center gap-4 p-6 bg-red-50 border border-red-100 rounded-2xl mb-6">
              <Clock className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-red-900 font-bold">Generalmente: 60 días hábiles</p>
                <p className="text-red-800 text-base">desde el despido.</p>
              </div>
            </div>
            <p className="text-gray-600 mb-4">Si haces reclamo en Inspección del Trabajo, el plazo puede extenderse hasta 90 días hábiles.</p>
            <p className="text-gray-900 font-bold">Esperar demasiado puede hacerte perder derechos importantes.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Errores comunes al firmar un finiquito</h2>
            <div className="space-y-6">
              <div className="border border-gray-200 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 mb-2">Firmar sin leer</h4>
                <p className="text-gray-600 text-base mb-2">Muchos trabajadores firman rápido por presión o nervios. Después descubren montos incorrectos, pagos faltantes o errores graves.</p>
              </div>
              <div className="border border-gray-200 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 mb-2">No revisar cotizaciones</h4>
                <p className="text-gray-600 text-base mb-2">Es muy común encontrar AFP impaga, salud pendiente o seguro de cesantía impago. Esto puede cambiar completamente el caso.</p>
              </div>
              <div className="border border-gray-200 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 mb-2">No calcular vacaciones pendientes</h4>
                <p className="text-gray-600 text-base mb-2">Algunas empresas calculan mal el feriado legal, el feriado proporcional o los días acumulados.</p>
              </div>
              <div className="border border-gray-200 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 mb-2">Firmar sin reserva de derechos</h4>
                <p className="text-gray-600 text-base mb-2">Especialmente peligroso cuando el despido parece injustificado, hubo vulneraciones o existen diferencias económicas.</p>
              </div>
              <div className="border border-gray-200 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 mb-2">Esperar demasiado para asesorarse</h4>
                <p className="text-gray-600 text-base mb-2">Los plazos laborales pasan rápido. Muchos trabajadores consultan cuando ya es tarde.</p>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Puedo firmar después?</h2>
            <p className="text-xl font-bold mb-4">Sí.</p>
            <p className="text-gray-600 mb-4">En algunos casos el trabajador:</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {["Revisa", "Consulta", "Negocia", "Firma posteriormente"].map((item, i) => (
                <span key={i} className="bg-gray-100 px-4 py-2 rounded-full text-gray-700 text-sm">{item}</span>
              ))}
            </div>
            <p className="text-gray-900 font-bold">Lo importante es no actuar impulsivamente.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué revisar antes de firmar un finiquito?</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white border rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">Causal de despido</h4>
                <p className="text-gray-600 text-base">Debe coincidir con la carta de despido, los hechos reales y el procedimiento legal.</p>
              </div>
              <div className="bg-white border rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">Años de servicio</h4>
                <p className="text-gray-600 text-base">Verifica la antigüedad correcta, el cálculo adecuado y los topes legales.</p>
              </div>
              <div className="bg-white border rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">Vacaciones pendientes</h4>
                <p className="text-gray-600 text-base">Deben incluir las vacaciones acumuladas y el feriado proporcional.</p>
              </div>
              <div className="bg-white border rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">Aviso previo</h4>
                <p className="text-gray-600 text-base">Si no avisaron con 30 días, normalmente corresponde un sueldo adicional.</p>
              </div>
              <div className="bg-white border rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">Cotizaciones</h4>
                <p className="text-gray-600 text-base">Clave revisar AFP, salud y AFC.</p>
              </div>
              <div className="bg-white border rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">Bonos y comisiones</h4>
                <p className="text-gray-600 text-base">Muchas veces quedan fuera por error.</p>
              </div>
            </div>

            <div className="text-center py-6 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Evita errores</p>
              <Link
                to="/blog/como-calcular-tu-finiquito-chile-2026"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
              >
                👉 Finiquito en Chile 2026: qué revisar antes de firmar
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si me presionan para firmar?</h2>
            <p className="text-gray-600 mb-4">Esto ocurre muchísimo. Algunos empleadores presionan, apuran, amenazan o dicen que “debes firmar hoy”.</p>
            <div className="bg-green-50 p-8 rounded-2xl border border-green-100 mb-8 mt-6">
              <h3 className="text-green-900 font-bold mb-4">Pero el trabajador tiene derecho a:</h3>
              <ul className="grid sm:grid-cols-2 gap-3 list-none p-0">
                {["Revisar", "Consultar", "Pedir copia", "Analizar montos"].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-green-800 text-base">
                    <CheckCircle className="h-4 w-4 mt-1 flex-shrink-0 text-green-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-gray-800 font-bold">Firmar bajo presión puede generar problemas importantes después.</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Conviene no firmar el finiquito?</h2>
            <p className="text-gray-600 mb-6 font-bold">Depende completamente del caso.</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {[
                "Conviene firmar con reserva",
                "Conviene negociar",
                "Conviene demandar directamente",
                "Conviene esperar revisión legal"
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 p-4 rounded-xl border text-base text-gray-700 font-medium">
                  {item}
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-4">No existe una respuesta universal.</p>
            <div className="bg-red-950 p-6 rounded-2xl text-white relative overflow-hidden">
              <p className="font-bold text-red-200 uppercase tracking-widest text-xs mb-2">Pero sí existe una regla importante:</p>
              <p className="mt-2 text-lg font-serif">Nunca conviene firmar algo que no entiendes completamente.</p>
            </div>

            <div className="text-center py-6 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Inicia tu reclamo</p>
              <Link
                to="/blog/me-pueden-despedir-sin-motivo-chile-2026"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
              >
                👉 Despido injustificado en Chile: qué hacer
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12 border bg-gray-50 p-6 rounded-2xl">
            <h3 className="text-xl font-bold mb-4 text-gray-900">Ejemplo típico</h3>
            <p className="text-gray-600 mb-4">Supongamos: 6 años trabajados, despido por necesidades de la empresa, finiquito sin vacaciones pendientes, cotizaciones parcialmente impagas.</p>
            <p className="text-gray-600 mb-4 font-bold">El trabajador firma sin revisar y sin reserva de derechos.</p>
            <p className="text-gray-600 mb-4">Semanas después descubre que faltaban millones en pagos.</p>
            <p className="text-gray-900 font-bold">Ahí recuperar diferencias puede volverse mucho más complejo.</p>

            <div className="text-center py-6 border-t border-b border-gray-100 mt-8 mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link
                to="/blog/cuanto-me-corresponde-anos-de-servicio-chile-2026"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100"
              >
                👉 ¿Cuánto corresponde por años de servicio?
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Puede existir demanda aunque firmé?</h2>
            <p className="text-xl mb-4 font-bold">Sí.</p>
            <p className="text-gray-600 mb-4">En algunos casos todavía es posible demandar por:</p>
            <ul className="list-disc pl-5 mb-6 text-gray-600">
              <li>Nulidad de despido</li>
              <li>Cotizaciones impagas</li>
              <li>Derechos irrenunciables</li>
              <li>Vicios en el consentimiento</li>
            </ul>
            <p className="text-gray-600 mb-4 font-bold">Pero dependerá de:</p>
            <div className="flex flex-wrap gap-2">
              {["Cómo se firmó", "Qué decía el finiquito", "Si hubo reserva de derechos", "El tipo de incumplimiento"].map((item, i) => (
                <span key={i} className="bg-gray-100 px-4 py-2 rounded-full text-base text-gray-700 text-sm">{item}</span>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si el finiquito tiene errores?</h2>
            <p className="text-gray-600 mb-4">Puedes:</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {["Rechazarlo", "Pedir corrección", "Negociar cambios", "Demandar diferencias"].map((item, i) => (
                <span key={i} className="bg-blue-50 text-blue-800 px-4 py-2 rounded-full font-medium text-sm">{item}</span>
              ))}
            </div>
            <p className="text-gray-600 mb-4 font-bold">Errores comunes:</p>
            <ul className="list-disc pl-5 text-gray-600">
              <li>Fechas incorrectas</li>
              <li>Montos mal calculados</li>
              <li>Causal errónea</li>
              <li>Vacaciones omitidas</li>
            </ul>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿En qué situaciones conviene consultar cuanto antes a un abogado laboral?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Aunque no firmar el finiquito no implica perder automáticamente tus derechos, hay situaciones donde esperar demasiado puede complicar tu caso. Si el empleador te presiona para firmar, si sospechas que los montos son incorrectos, si las cotizaciones están impagas o si el despido te parece injustificado, lo recomendable es buscar asesoría legal antes de tomar una decisión.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Los plazos laborales en Chile son cortos y cada día que pasa puede reducir tus opciones. Un abogado laboral puede evaluar tu caso en minutos y decirte si conviene firmar con reserva, negociar el finiquito o preparar una demanda.
            </p>
          </div>

          <div className="mb-12 bg-green-900 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold font-serif text-green-600 mb-3">¿No firmaste el finiquito y el empleador te presiona o te debe dinero?</h3>
            <p className="text-white mb-6">Consulta con un abogado laboral especializado antes de que venzan los plazos. Revisaremos tu caso y te diremos qué opciones tienes.</p>
            <Link
              to="/abogado-laboral"
              className="inline-flex items-center gap-2 bg-white text-green-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors group"
            >
              Hablar con un abogado laboral <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Conclusion */}
          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              No firmar el finiquito no te protege del despido ni revive el contrato laboral, pero sí te da un margen para revisar los montos, consultar con un abogado y decidir la estrategia más conveniente. La clave está en entender que el finiquito es un documento con efectos legales importantes y que cada alternativa —firmar, no firmar, firmar con reserva— tiene consecuencias distintas según el caso.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Sin embargo, comprender tus derechos es solo el primer paso. Si estás en medio de un despido o término de contrato y tienes dudas sobre tu finiquito, lo más inteligente es actuar rápido. <Link to="/abogado-laboral" className="text-green-700 underline hover:text-green-500">Consulta con un abogado laboral</Link> para que revise tu caso y te indique el mejor camino a seguir antes de que los plazos legales se cierren.
            </p>
          </div>


          <CategoryCTA category="laboral" topic="despido" />
          {/* FAQ */}
          <div className="mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">Preguntas frecuentes</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-700">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>


      </div>

      <RelatedLawyers category="Derecho Laboral" />

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare
            title="¿Qué pasa si no firmo el finiquito en Chile? Derechos, riesgos y qué hacer (Guía 2026)"
            url="https://legalup.cl/blog/que-pasa-si-no-firmo-el-finiquito-chile-2026"
          />
        </div>

        <BlogNavigation currentArticleId="que-pasa-si-no-firmo-el-finiquito-chile-2026" />

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

      <BlogConversionPopup category="Derecho Laboral" topic="no-firmo-finiquito" />
    </div>
  );
};

export default BlogArticle;
