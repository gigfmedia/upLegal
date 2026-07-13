import { useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowLeft,
    ArrowRight,
    Calendar,
    User,
    Clock,
    ChevronRight,
    CheckCircle,
} from "lucide-react";

import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import CategoryCTA from "@/components/blog/CategoryCTA";
import InArticleCTA from "@/components/blog/InArticleCTA";
import { ReadTime } from "@/components/blog/ReadTime";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

const BlogArticle = () => {
    const faqs = [
        {
            question: "¿Toda discusión con el empleador permite presentar una tutela laboral?",
            answer: "No. Debe existir una vulneración de derechos fundamentales y esa vulneración debe poder acreditarse mediante antecedentes suficientes.",
        },
        {
            question: "¿La tutela laboral solo procede si fui despedido?",
            answer: "No necesariamente. En algunos casos puede presentarse mientras la relación laboral continúa vigente.",
        },
        {
            question: "¿Puedo demandar por tutela laboral y despido injustificado al mismo tiempo?",
            answer: "Dependiendo de los hechos, ambas acciones pueden coexistir. Será necesario analizar cuál es la estrategia jurídica más adecuada.",
        },
        {
            question: "¿Necesito testigos para presentar una tutela laboral?",
            answer: "No siempre. Correos electrónicos, documentos, mensajes y otros antecedentes también pueden constituir medios de prueba relevantes.",
        },
        {
            question: "¿Qué pasa si no tengo todas las pruebas?",
            answer: "Eso no significa necesariamente que la demanda sea inviable. Un abogado puede evaluar qué antecedentes existen y cuáles pueden obtenerse durante el proceso judicial.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Tutela laboral en Chile 2026: cuándo procede, qué derechos protege y cómo demandar"
                description="Conoce cuándo procede una demanda de tutela laboral en Chile, qué derechos protege, cuáles son los plazos, qué pruebas sirven y cómo reclamar frente a una vulneración de derechos fundamentales."
                image="/assets/tutela-laboral-chile-2026.png"
                url="https://legalup.cl/blog/tutela-laboral-chile-2026"
                datePublished="2026-07-09"
                dateModified="2026-07-09"
                faqs={faqs}
            />

            <Header onAuthClick={() => {}} />
            <ReadingProgressBar />

            {/* HERO */}
            <div className="bg-green-900 text-white py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
                    <div className="flex items-center gap-2 mb-4">
                        <Link to="/blog" className="hover:text-white transition-colors">
                            Blog
                        </Link>
                        <ChevronRight className="h-4 w-4" />
                        <span>Artículo</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-bold text-green-600 font-serif mb-6">
                        Tutela laboral en Chile 2026: cuándo procede, qué derechos protege y cómo demandar
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "La tutela laboral protege los derechos fundamentales de los trabajadores",
                                "Puede interponerse durante la relación laboral o después del despido",
                                "No reemplaza todas las demandas laborales, sino que procede en situaciones específicas",
                                "La prueba disponible suele ser determinante para el resultado del juicio",
                                "Actuar rápidamente permite preservar antecedentes importantes",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Cuando un trabajador sufre discriminación, represalias, acoso o cualquier vulneración de sus derechos fundamentales dentro de la empresa, el conflicto puede ir mucho más allá de un simple despido injustificado. En estos casos existe una acción judicial especial conocida como tutela laboral, cuyo objetivo es proteger derechos constitucionales durante la relación laboral o con ocasión de su término.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>9 de Julio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="tutela-laboral-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Tutela laboral en Chile 2026"
                        url="https://legalup.cl/blog/tutela-laboral-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            Sin embargo, no todo conflicto con el empleador constituye automáticamente una vulneración de derechos fundamentales. Determinar cuándo corresponde interponer una demanda de tutela laboral requiere analizar cuidadosamente los antecedentes del caso, las pruebas disponibles y la forma en que ocurrieron los hechos.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía conocerás cuándo procede la tutela laboral en Chile, qué derechos protege, cuáles son los plazos para demandar y qué hacer si crees que tus derechos fueron vulnerados.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando un conflicto laboral, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/despido-necesidades-empresa-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                despido por necesidades de la empresa
                            </Link>{" "}
                            y{" "}
                            <Link
                                to="/blog/cuanto-dura-juicio-laboral-despido-injustificado-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                juicio laboral por despido injustificado
                            </Link>.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si necesitas evaluar tu situación después de un despido o una vulneración de derechos, puedes consultar con un{" "}
                            <Link to="/abogado-laboral" className="text-green-700 underline hover:text-green-500">
                                abogado laboral en Chile
                            </Link>{" "}
                            directamente online.
                        </p>
                    </div>

                    {/* QUE ES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es la tutela laboral?</h2>
                        <p className="text-gray-600 mb-4">
                            La tutela laboral es un procedimiento judicial regulado por el Código del Trabajo destinado a proteger los derechos fundamentales de los trabajadores cuando estos han sido vulnerados por el empleador.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Su finalidad no es únicamente obtener una indemnización económica, sino también restablecer los derechos afectados y reparar las consecuencias de la vulneración.
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">
                                Es uno de los procedimientos más relevantes del derecho laboral chileno debido a que involucra garantías constitucionales.
                            </p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Comprender qué protege la tutela laboral permite conocer la regla general, pero eso no significa que cualquier trato injusto o conflicto interno constituya automáticamente una vulneración de derechos fundamentales. Los tribunales analizan las circunstancias específicas, la intensidad de los hechos y las pruebas disponibles antes de determinar si corresponde este procedimiento.
                            </p>
                        </div>
                    </div>

                    {/* DERECHOS QUE PROTEGE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué derechos protege la tutela laboral?</h2>
                        <p className="text-gray-600 mb-4">Entre los principales derechos protegidos se encuentran:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Derecho a la igualdad y no discriminación",
                                "Derecho a la honra",
                                "Derecho a la vida privada",
                                "Integridad física y psíquica",
                                "Libertad de expresión cuando corresponda",
                                "Libertad sindical",
                                "Garantía de indemnidad frente a represalias",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Dependiendo del caso, también pueden verse involucrados otros derechos fundamentales reconocidos por la Constitución y la legislación laboral.</p>
                    </div>

                    {/* CUANDO PROCEDE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo procede una demanda de tutela laboral?</h2>
                        <p className="text-gray-600 mb-4">Generalmente este procedimiento puede ser procedente cuando existe una vulneración de derechos fundamentales atribuible al empleador.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Despidos discriminatorios",
                                "Represalias por denunciar incumplimientos",
                                "Acoso laboral grave",
                                "Hostigamiento reiterado",
                                "Vulneración de la privacidad del trabajador",
                                "Sanciones arbitrarias relacionadas con derechos fundamentales",
                                "Discriminación por género, edad, nacionalidad, discapacidad u otras categorías protegidas",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Cada situación debe analizarse individualmente.</p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Dos trabajadores pueden experimentar situaciones aparentemente similares y obtener resultados completamente distintos en tribunales. Lo que determina la viabilidad de una acción de tutela no es solo lo ocurrido, sino también la capacidad de demostrar la vulneración mediante documentos, testigos, comunicaciones internas y otros antecedentes.
                            </p>
                        </div>
                    </div>

                    {/* DIFERENCIA CON DESPIDO INJUSTIFICADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué diferencia existe entre tutela laboral y despido injustificado?</h2>
                        <p className="text-gray-600 mb-4">Es habitual confundir ambos procedimientos.</p>
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Despido injustificado</h3>
                                <p className="text-gray-600">Busca determinar si la causal utilizada por el empleador fue correcta.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Tutela laboral</h3>
                                <p className="text-gray-600">Analiza si durante la relación laboral o al momento del despido se vulneraron derechos fundamentales del trabajador.</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">
                            En algunos casos ambas acciones pueden coexistir, dependiendo de los hechos. Por ejemplo, un trabajador podría alegar que fue despedido invocando una causal improcedente y, además, que el despido tuvo un carácter discriminatorio o constituyó una represalia.
                        </p>
                    </div>

                    {/* SITUACIONES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué situaciones suelen dar origen a una tutela laboral?</h2>
                        <p className="text-gray-600 mb-4">Aunque cada caso es distinto, las situaciones más frecuentes incluyen:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Denuncias internas que terminaron en represalias",
                                "Discriminación por embarazo",
                                "Discriminación por edad",
                                "Despidos vinculados a actividades sindicales",
                                "Acoso laboral persistente",
                                "Difusión de información privada",
                                "Vigilancia excesiva",
                                "Medidas disciplinarias desproporcionadas",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">No obstante, la existencia de alguno de estos hechos no garantiza por sí sola el éxito de la demanda.</p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Muchas personas llegan convencidas de que existe tutela laboral porque vivieron una situación injusta. Sin embargo, el procedimiento exige demostrar una conexión entre los hechos y la vulneración de un derecho fundamental específico. Esa diferencia suele definir el éxito o fracaso de la demanda.
                            </p>
                        </div>
                    </div>

                    {/* PRUEBAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pruebas son importantes en una tutela laboral?</h2>
                        <p className="text-gray-600 mb-4">Algunas de las pruebas que habitualmente adquieren relevancia son:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Correos electrónicos",
                                "Mensajes de WhatsApp",
                                "Cartas de amonestación",
                                "Evaluaciones de desempeño",
                                "Informes internos",
                                "Testigos",
                                "Grabaciones cuando sean legalmente utilizables",
                                "Certificados médicos cuando exista afectación psicológica",
                                "Denuncias realizadas previamente",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Mientras antes se reúnan estos antecedentes, mayores posibilidades existirán de preparar una estrategia sólida.</p>
                    </div>

                    {/* EMPRESA NIEGA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si la empresa niega los hechos?</h2>
                        <p className="text-gray-600 mb-4">
                            Es frecuente que el empleador rechace las acusaciones formuladas por el trabajador y sostenga que nunca existió una vulneración de derechos fundamentales. En estos casos, el conflicto deja de centrarse únicamente en lo que cada parte afirma y pasa a depender de las pruebas que puedan presentarse durante el juicio.
                        </p>
                        <p className="text-gray-600 mb-4">
                            La empresa puede aportar documentos internos, registros de asistencia, correos electrónicos, declaraciones de otros trabajadores o protocolos internos para justificar su actuación. Del mismo modo, el trabajador podrá presentar los antecedentes que acrediten la existencia de discriminación, represalias, acoso u otra conducta ilegal.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                            <p className="text-amber-800 text-sm">
                                En muchas oportunidades no existe una única prueba decisiva. Los tribunales valoran el conjunto de los antecedentes para reconstruir lo ocurrido y determinar si efectivamente existió una vulneración de derechos fundamentales. No basta con que una persona se sienta afectada para que exista una tutela laboral. Del mismo modo, tampoco basta con que la empresa niegue los hechos para descartar la vulneración. La decisión final depende de cómo el tribunal valore todas las pruebas disponibles y de la coherencia entre los distintos antecedentes incorporados al proceso.
                            </p>
                        </div>
                    </div>

                    {/* CTA IN-ARTICLE */}
                    <InArticleCTA
                        message="¿Crees que tus derechos fundamentales fueron vulnerados en el trabajo? Un abogado laboral puede evaluar tu caso y determinar si corresponde una demanda de tutela laboral."
                        buttonText="Habla con un abogado ahora"
                        category="Derecho Laboral"
                    />

                    {/* PLAZOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuánto tiempo existe para presentar una demanda de tutela laboral?</h2>
                        <p className="text-gray-600 mb-4">
                            La tutela laboral está sujeta a plazos legales relativamente breves, por lo que actuar oportunamente resulta fundamental.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Cuando la vulneración ocurre con ocasión del despido, el trabajador dispone de un plazo determinado por la legislación laboral para presentar la demanda. Si la vulneración ocurre mientras la relación laboral continúa vigente, también existen límites temporales que conviene revisar cuanto antes.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="text-red-800">Esperar demasiado puede significar perder definitivamente la posibilidad de ejercer esta acción.</p>
                        </div>
                    </div>

                    {/* INSPECCION DEL TRABAJO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Es obligatorio pasar por la Inspección del Trabajo antes de demandar?</h2>
                        <p className="text-gray-600 mb-4">
                            Una duda habitual es si siempre debe presentarse un reclamo ante la Inspección del Trabajo antes de iniciar una acción judicial. La respuesta depende de las características del caso.
                        </p>
                        <p className="text-gray-600 mb-4">
                            En algunas situaciones acudir previamente a la Inspección puede facilitar la obtención de antecedentes o abrir espacios de conciliación. En otras, la estrategia más conveniente puede ser preparar directamente la demanda judicial considerando los plazos legales aplicables.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                            <p className="text-amber-800 text-sm">
                                Por esa razón resulta recomendable analizar cada caso antes de decidir el camino a seguir, especialmente cuando ya existe un despido o una vulneración que continúa produciéndose.
                            </p>
                        </div>
                    </div>

                    {/* QUE PUEDE ORDENAR EL TRIBUNAL */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué puede ordenar el tribunal?</h2>
                        <p className="text-gray-600 mb-4">Si la demanda es acogida, el tribunal puede adoptar distintas medidas dependiendo de las circunstancias del caso.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Indemnizaciones legales",
                                "Indemnizaciones adicionales contempladas para la tutela laboral",
                                "Pago de remuneraciones adeudadas cuando corresponda",
                                "Declaración de vulneración de derechos fundamentales",
                                "Otras medidas destinadas a reparar la afectación sufrida",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Cada sentencia dependerá de la gravedad de la vulneración y de las pruebas incorporadas al juicio.</p>
                    </div>

                    {/* INDEMNIZACION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué indemnización puede obtener un trabajador mediante la tutela laboral?</h2>
                        <p className="text-gray-600 mb-4">
                            Además de las indemnizaciones laborales que puedan corresponder por otras acciones, la tutela laboral contempla mecanismos especiales destinados a reparar la vulneración de derechos fundamentales cuando el tribunal acoge la demanda.
                        </p>
                        <p className="text-gray-600 mb-4">El monto final nunca es automático. Dependerá de factores como:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["La gravedad de la vulneración", "La prueba presentada", "La duración de los hechos", "Las consecuencias sufridas por el trabajador", "Los criterios aplicados por el tribunal"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Por ello, aunque dos trabajadores invoquen la misma vulneración, las indemnizaciones reconocidas pueden ser completamente distintas según las circunstancias particulares de cada caso. Esa evaluación solo puede realizarse revisando detalladamente los antecedentes específicos del conflicto laboral.
                            </p>
                        </div>
                    </div>

                    {/* QUE HACER SI TRABAJAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué hacer si todavía trabajas en la empresa?</h2>
                        <p className="text-gray-600 mb-4">
                            Muchas personas creen que solo pueden iniciar acciones una vez despedidas. Eso no es correcto. En algunos casos la tutela laboral puede ejercerse mientras la relación laboral continúa vigente, especialmente cuando la vulneración sigue ocurriendo.
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Conservar todos los correos electrónicos", "Guardar mensajes relevantes", "Registrar fechas y hechos importantes", "Identificar posibles testigos", "Evitar eliminar antecedentes que puedan servir posteriormente como prueba"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Mientras antes se recopile la información, más sencilla suele ser la preparación del caso.</p>
                    </div>

                    {/* COMPLEJIDAD 1: TUTELA VIABLE VS INVIABLE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Tutela laboral viable o inviable? La diferencia está en las pruebas</h2>
                        <p className="text-gray-600 mb-4">El mismo hecho puede dar lugar a resultados completamente distintos dependiendo de la calidad de las pruebas disponibles y la forma en que se presenten ante el tribunal.</p>
                        <div className="grid sm:grid-cols-2 gap-6 mt-6">
                            <div className="bg-green-50 p-5 rounded-xl">
                                <h3 className="font-bold text-green-800 text-lg mb-2">Demanda viable: antecedentes sólidos</h3>
                                <p className="text-green-700">El trabajador cuenta con correos electrónicos, mensajes, testigos o documentos que acreditan la vulneración. Existe una conexión clara entre la conducta del empleador y el derecho fundamental afectado. El tribunal cuenta con elementos suficientes para acoger la demanda y ordenar las indemnizaciones y medidas reparatorias correspondientes.</p>
                            </div>
                            <div className="bg-red-50 p-5 rounded-xl">
                                <h3 className="font-bold text-red-800 text-lg mb-2">Demanda inviable: antecedentes insuficientes</h3>
                                <p className="text-red-700">El trabajador percibe una situación injusta pero no cuenta con pruebas que acrediten la vulneración de un derecho fundamental específico. Sin correos, documentos, testigos u otros antecedentes verificables, el tribunal no puede dar por acreditados los hechos y la demanda es rechazada, incluso si existió una afectación real.</p>
                            </div>
                        </div>
                    </div>

                    {/* COMPLEJIDAD 2: INDEMNIZACION COMPLETA VS INSUFICIENTE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué diferencia hay entre una indemnización completa y aceptar lo mínimo?</h2>
                        <p className="text-gray-600 mb-4">El monto final de una tutela laboral no depende solo de la gravedad de la vulneración, sino también de cómo se presenten y valoren las pruebas durante el juicio.</p>
                        <div className="grid sm:grid-cols-2 gap-6 mt-6">
                            <div className="bg-green-50 p-5 rounded-xl">
                                <h3 className="font-bold text-green-800 text-lg mb-2">Indemnización completa: evaluación profesional</h3>
                                <p className="text-green-700">Considera todas las aristas del caso: la gravedad de la vulneración, las consecuencias sufridas por el trabajador, las indemnizaciones legales, los recargos especiales de la tutela laboral y las medidas reparatorias. Una estrategia bien preparada maximiza las posibilidades de obtener una reparación integral.</p>
                            </div>
                            <div className="bg-red-50 p-5 rounded-xl">
                                <h3 className="font-bold text-red-800 text-lg mb-2">Indemnización insuficiente: avanzar sin asesoría</h3>
                                <p className="text-red-700">El trabajador puede perder la oportunidad de reclamar conceptos adicionales, omitir antecedentes relevantes o presentar mal la demanda. Sin una revisión profesional, es posible recibir menos de lo que corresponde o incluso perder el caso por errores procesales evitables.</p>
                            </div>
                        </div>
                    </div>

                    {/* COMPLEJIDAD 3: ACTUAR A TIEMPO VS DEJAR PASAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué cambia entre actuar rápido y dejar pasar el tiempo?</h2>
                        <p className="text-gray-600 mb-4">En materia de tutela laboral, el tiempo juega un rol fundamental. Actuar durante los primeros días puede marcar una gran diferencia en el resultado del caso.</p>
                        <div className="grid sm:grid-cols-2 gap-6 mt-6">
                            <div className="bg-green-50 p-5 rounded-xl">
                                <h3 className="font-bold text-green-800 text-lg mb-2">Actuar dentro del plazo legal</h3>
                                <p className="text-green-700">Conservas todos tus derechos para presentar la demanda. Puedes reunir pruebas frescas, testigos disponibles y documentos completos. Tienes tiempo para elegir una buena estrategia y negociar desde una posición más sólida, incluyendo la posibilidad de un acuerdo antes del juicio.</p>
                            </div>
                            <div className="bg-red-50 p-5 rounded-xl">
                                <h3 className="font-bold text-red-800 text-lg mb-2">Dejar pasar los días</h3>
                                <p className="text-red-700">Las pruebas se debilitan, los testigos se vuelven difíciles de localizar y algunos documentos pueden perderse. Si vence el plazo legal, pierdes definitivamente la posibilidad de ejercer la acción de tutela laboral, incluso si la vulneración de derechos fue grave.</p>
                            </div>
                        </div>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Esperar demasiado para consultar", desc: "Los plazos para la tutela laboral son breves y pueden vencerse rápidamente." },
                                    { title: "Renunciar creyendo que ya no existen alternativas", desc: "Incluso después de renunciar, puede existir la posibilidad de demandar por vulneración de derechos." },
                                    { title: "Eliminar correos electrónicos o conversaciones relevantes", desc: "Las comunicaciones escritas son una prueba fundamental en cualquier reclamo laboral." },
                                    { title: "Firmar documentos sin leer su contenido", desc: "Un finiquito mal firmado puede limitar las posibilidades de reclamar posteriormente." },
                                    { title: "Pensar que cualquier conflicto constituye automáticamente tutela laboral", desc: "No toda situación injusta configura una vulneración de derechos fundamentales." },
                                    { title: "Publicar información del caso en redes sociales", desc: "Difundir detalles del conflicto puede afectar la estrategia legal y la credibilidad." },
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="text-red-500 font-bold text-xl flex-shrink-0">✕</div>
                                        <div>
                                            <h4 className="font-bold text-red-900">{item.title}</h4>
                                            <p className="text-red-800 opacity-90">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* CUANDO CONSULTAR ABOGADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo conviene consultar cuanto antes a un abogado laboral?</h2>
                        <p className="text-gray-600 mb-4">Aunque cada situación debe analizarse individualmente, suele ser recomendable buscar asesoría cuando:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Recibiste una carta de despido que consideras discriminatoria", "Sufriste represalias después de denunciar irregularidades", "Eres víctima de acoso laboral reiterado", "Tu empleador vulneró tu privacidad", "Fuiste sancionado por ejercer derechos laborales", "Existe una investigación interna que podría afectar tu continuidad laboral", "Estás próximo a firmar un finiquito relacionado con estos hechos", "Ya recibiste una notificación judicial o una citación"].map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-600 flex-shrink-0">•</span>
                                    <span className="text-gray-700 font-bold">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">En estas situaciones resulta especialmente importante revisar la estrategia antes de tomar decisiones que puedan afectar posteriormente una eventual demanda.</p>
                    </div>

                    {/* CTA PRINCIPAL */}
                    <div className="mb-12">
                        <div className="bg-green-900 rounded-2xl p-8 text-center">
                            <h3 className="text-2xl font-bold font-serif text-green-600 mb-3">¿Crees que tus derechos fundamentales fueron vulnerados?</h3>
                            <p className="text-white mb-6">Si ya sufriste un despido, represalias, discriminación o acoso laboral, el momento más importante para revisar tu caso suele ser antes de firmar documentos, aceptar acuerdos o dejar transcurrir los plazos legales. Una evaluación temprana permite identificar si corresponde una acción de tutela laboral u otra vía de protección de tus derechos.</p>
                            <Link
                                to="/abogado-laboral"
                                className="inline-flex items-center gap-2 bg-white text-green-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors group"
                            >
                                Hablar con un abogado laboral <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    {/* CONCLUSION */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La tutela laboral constituye uno de los mecanismos más importantes para proteger los derechos fundamentales de los trabajadores frente a actuaciones ilegales del empleador. Conocer cuándo procede, qué derechos resguarda y cuáles son los plazos permite comprender el funcionamiento general de este procedimiento.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Sin embargo, la viabilidad de una demanda no depende únicamente de la existencia de un conflicto laboral. Los documentos, comunicaciones, testigos y circunstancias específicas pueden cambiar completamente la evaluación jurídica de un caso concreto. Si consideras que tus derechos fueron vulnerados, puedes revisar tu situación con un{" "}
                            <Link to="/abogado-laboral" className="text-green-700 underline hover:text-green-500">abogado laboral en Chile</Link>{" "}
                            a través de LegalUp.
                        </p>
                    </div>

                    <CategoryCTA category="laboral" />

                    {/* FAQS */}
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

            <RelatedLawyers category="Derecho Laboral" />

            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
                <div className="mt-8">
                    <BlogShare
                        title="Tutela laboral en Chile 2026"
                        url="https://legalup.cl/blog/tutela-laboral-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="tutela-laboral-chile-2026" />

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
            <BlogConversionPopup category="Derecho Laboral" topic="tutela-laboral" />
        </div>
    );
};

export default BlogArticle;