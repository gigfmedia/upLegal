import { Link } from "react-router-dom";
import {
    ArrowLeft,
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
            question: "¿Pierdo automáticamente mi indemnización si me despiden por artículo 160?",
            answer:
            "No necesariamente. Solo la perderás si el tribunal considera que la causal fue correctamente aplicada. Si el empleador no logra acreditar los hechos, el despido puede ser declarado injustificado y recuperas el derecho a indemnización más recargos. Por eso es fundamental impugnar el despido dentro del plazo de 60 días hábiles.",
        },
        {
            question: "¿El empleador debe demostrar los hechos que justifican el artículo 160?",
            answer:
            "Sí. En un juicio laboral corresponde al empleador acreditar la existencia de la causal invocada y los hechos concretos que la fundamentan. Si no puede probarlo, el tribunal puede declarar el despido injustificado aunque la causal esté correctamente citada en la carta.",
        },
        {
            question: "¿Puedo demandar aunque haya firmado el finiquito?",
            answer:
            "Depende de cómo firmaste. Si firmaste con reserva de derechos, puedes demandar la diferencia o impugnar el despido dentro del plazo legal. Si firmaste sin reserva, las posibilidades se reducen aunque no desaparecen en todos los casos — por ejemplo, si existen cotizaciones impagas. Consultar con un abogado laboral antes de asumir que perdiste el derecho es siempre recomendable.",
        },
        {
            question: "¿Cuánto demora un juicio laboral por despido artículo 160?",
            answer:
            "Un juicio laboral en Chile puede durar entre 3 y 8 meses dependiendo de la carga del tribunal y la complejidad del caso. Si hay acuerdo en la audiencia preparatoria puede resolverse antes. Si el empleador apela la sentencia, el proceso puede extenderse 6 meses adicionales.",
        },
        {
            question: "¿Qué pasa si el empleador no logra probar la causal del artículo 160?",
            answer:
            "Si el tribunal concluye que los hechos no fueron acreditados o no constituyen una causal válida del artículo 160, el despido es declarado injustificado. En ese caso el empleador debe pagar indemnización por años de servicio más un recargo de entre 30% y 100% según la causal invocada, además de la indemnización sustitutiva del aviso previo si corresponde.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Artículo 160 del Código del Trabajo en Chile 2026: causales, requisitos y cómo defenderte"
                description="Conoce qué dice el artículo 160 del Código del Trabajo, cuáles son sus causales, qué derechos conservas y cómo impugnar un despido por esta causal."
                image="/assets/articulo-160-codigo-trabajo-chile-2026.png"
                url="https://legalup.cl/blog/articulo-160-codigo-trabajo-chile-2026"
                datePublished="2026-07-22"
                dateModified="2026-07-22"
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
                        Artículo 160 del Código del Trabajo en Chile 2026: causales, requisitos y cómo defenderte
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "El artículo 160 regula las causales disciplinarias de despido sin indemnización",
                                "El empleador debe acreditar una conducta grave atribuible al trabajador",
                                "La carta de despido debe describir hechos concretos, no solo mencionar el artículo",
                                "Si la causal no se prueba, el despido puede ser declarado injustificado",
                                "Recibir una carta por artículo 160 no significa que pierdas automáticamente tu indemnización",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Recibir una carta de despido indicando el artículo 160 del Código del Trabajo suele generar preocupación. A diferencia de otras causales de término de la relación laboral, esta norma permite al empleador despedir al trabajador sin derecho a indemnización por años de servicio, siempre que pueda acreditar una conducta grave prevista por la ley.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>22 de Julio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="articulo-160-codigo-trabajo-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Artículo 160 del Código del Trabajo en Chile 2026"
                        url="https://legalup.cl/blog/articulo-160-codigo-trabajo-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            Sin embargo, que la carta mencione el artículo 160 no significa automáticamente que el despido sea legal. En muchos casos los tribunales declaran que la causal fue mal aplicada y condenan al empleador a pagar las indemnizaciones correspondientes.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía aprenderás qué establece el artículo 160, cuáles son sus causales, cuándo procede realmente, qué derechos conserva el trabajador y cómo impugnar un despido si consideras que fue injustificado.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando un conflicto laboral, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/carta-de-despido-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                carta de despido
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/nulidad-del-despido-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                nulidad del despido
                            </Link>{" "}
                            y{" "}
                            <Link
                                to="/blog/demanda-laboral-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                demanda laboral
                            </Link>.
                        </p>
                    </div>

                    {/* QUE DICE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué dice el artículo 160 del Código del Trabajo?</h2>
                        <p className="text-gray-600 mb-4">
                            El artículo 160 regula las denominadas causales disciplinarias de despido. Son situaciones en que el empleador puede poner término inmediato al contrato debido a un incumplimiento atribuible al trabajador.
                        </p>
                        <p className="text-gray-600 mb-4">Si la causal logra acreditarse, el trabajador normalmente:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "No recibe indemnización por años de servicio",
                                "No recibe indemnización por aviso previo",
                                "Mantiene el derecho al pago de remuneraciones pendientes",
                                "Mantiene el derecho al pago de vacaciones proporcionales y demás prestaciones devengadas",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-red-500">•</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl mt-4">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">
                                Precisamente porque sus consecuencias son importantes, los tribunales exigen que estas causales sean interpretadas de forma estricta.
                            </p>
                        </div>
                    </div>

                    {/* CAUSALES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué causales contempla el artículo 160?</h2>
                        <p className="text-gray-600 mb-4">Entre las más utilizadas se encuentran:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Falta de probidad del trabajador",
                                "Acoso sexual",
                                "Vías de hecho contra el empleador o compañeros",
                                "Injurias graves",
                                "Conducta inmoral que afecte a la empresa",
                                "Negociación incompatible",
                                "Abandono del trabajo",
                                "Actos u omisiones temerarias que afecten la seguridad",
                                "Incumplimiento grave de las obligaciones del contrato",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Cada una posee requisitos distintos y debe analizarse según las circunstancias concretas.</p>
                    </div>

                    <RelatedLawyers category="Derecho Laboral" />

                    {/* INCUMPLIMIENTO GRAVE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">La causal más utilizada: incumplimiento grave de las obligaciones</h2>
                        <p className="text-gray-600 mb-4">
                            Probablemente la causal más invocada por los empleadores es el incumplimiento grave de las obligaciones que impone el contrato de trabajo.
                        </p>
                        <p className="text-gray-600 mb-4">
                            No cualquier incumplimiento permite despedir por artículo 160. Debe tratarse de una conducta suficientemente seria como para hacer imposible continuar la relación laboral.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="font-bold text-amber-800">Por ejemplo:</p>
                            <ul className="mt-2 space-y-1 text-amber-700">
                                <li>• Incumplimientos reiterados de funciones esenciales</li>
                                <li>• Desobediencia grave frente a instrucciones legítimas</li>
                                <li>• Uso indebido de bienes de la empresa</li>
                                <li>• Incumplimientos que provoquen perjuicios relevantes al empleador</li>
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">En cambio, errores menores, diferencias de criterio o incumplimientos aislados normalmente no bastan para justificar esta causal.</p>
                    </div>

                    {/* FALTA DE PROBIDAD */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué significa la falta de probidad?</h2>
                        <p className="text-gray-600 mb-4">
                            La falta de probidad corresponde a conductas que implican deshonestidad o abuso de confianza.
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Apropiación de dinero",
                                "Adulteración de documentos",
                                "Falsificación de información",
                                "Utilización fraudulenta de recursos de la empresa",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">El empleador debe acreditar estos hechos mediante pruebas suficientes. Una simple sospecha no basta para justificar un despido.</p>
                    </div>

                    {/* CTA IN-ARTICLE 1 */}
                    <InArticleCTA
                        title="¿Te despidieron por el artículo 160?"
                        message="Un abogado laboral puede revisar la carta de despido y decirte si la causal fue correctamente aplicada o si corresponde demandar."
                        buttonText="Revisar mi despido"
                        category="Derecho Laboral"
                    />

                    {/* ABANDONO DEL TRABAJO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre con el abandono del trabajo?</h2>
                        <p className="text-gray-600 mb-4">
                            Otra causal frecuente corresponde al abandono del trabajo. No significa simplemente faltar un día. La ley exige circunstancias específicas, como:
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Abandonar injustificadamente el lugar de trabajo durante la jornada",
                                "Negarse sin causa justificada a ejecutar las labores convenidas",
                                "Ausencias que cumplan los requisitos legales establecidos para esta causal",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <div className="bg-amber-50 p-5 rounded-xl mt-4">
                            <p className="text-amber-800">Cada caso debe analizarse individualmente. Muchos despidos fundados en abandono terminan siendo declarados injustificados cuando el empleador no logra probar adecuadamente los hechos.</p>
                        </div>
                    </div>

                    {/* CARTA DE DESPIDO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Puede el empleador despedirme solo porque dice "artículo 160"?</h2>
                        <p className="text-gray-600 mb-4">No. La carta de despido debe explicar claramente:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Cuál causal específica invoca",
                                "Qué hechos concretos la fundamentan",
                                "Cuándo ocurrieron esos hechos",
                                "Por qué constituyen una infracción grave",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="bg-red-50 p-5 rounded-xl mt-4">
                            <p className="text-red-800">Si la carta contiene afirmaciones genéricas o carece de antecedentes suficientes, aumenta la posibilidad de impugnar judicialmente el despido.</p>
                        </div>
                    </div>

                    {/* QUIEN PRUEBA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Quién debe probar la causal?</h2>
                        <p className="text-gray-600 mb-4">
                            En un juicio laboral, corresponde al empleador demostrar que la causal realmente existió. No basta con afirmar que hubo incumplimiento.
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Documentos",
                                "Registros internos",
                                "Cámaras de seguridad",
                                "Correos electrónicos",
                                "Declaraciones de testigos",
                                "Informes técnicos",
                                "Cualquier otro medio de prueba permitido por la ley",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Si el empleador no logra acreditar los hechos, el tribunal puede declarar que el despido fue injustificado.</p>
                    </div>

                    {/* QUE HACER */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué hacer si te despidieron por artículo 160?</h2>
                        <p className="text-gray-600 mb-4">Si recibiste una carta de despido invocando el artículo 160, lo primero es mantener la calma y revisar cuidadosamente los antecedentes.</p>
                        <p className="text-gray-600 mb-4">Es recomendable:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Guardar la carta de despido",
                                "Conservar el contrato de trabajo y sus anexos",
                                "Descargar las liquidaciones de sueldo",
                                "Recopilar correos electrónicos, mensajes o documentos relacionados con los hechos",
                                "Identificar posibles testigos",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="bg-amber-50 p-5 rounded-xl mt-4">
                            <p className="text-amber-800">No siempre la causal utilizada por el empleador es suficiente para justificar el despido. En muchos casos existen antecedentes que permiten impugnarla judicialmente.</p>
                        </div>
                    </div>

                    {/* SE PUEDE DEMANDAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Se puede demandar un despido por artículo 160?</h2>
                        <p className="text-gray-600 mb-4">
                            Sí. El hecho de que el empleador invoque el artículo 160 no impide que el trabajador demande. Si el tribunal concluye que la causal no fue acreditada o fue aplicada incorrectamente, puede declarar el despido injustificado y condenar al empleador al pago de las indemnizaciones legales correspondientes.
                        </p>
                        <p className="text-gray-600">
                            Dependiendo del caso, también podrían ejercerse otras acciones, como la nulidad del despido cuando existan cotizaciones previsionales impagas o una acción de tutela laboral si se vulneraron derechos fundamentales.
                        </p>
                    </div>

                    {/* INDEMNIZACIONES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué indemnizaciones podrían corresponder?</h2>
                        <p className="text-gray-600 mb-4">Si el tribunal declara que el despido fue injustificado, el trabajador podría obtener, según las circunstancias del caso:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Indemnización sustitutiva del aviso previo",
                                "Indemnización por años de servicio",
                                "Recargo legal sobre la indemnización por años de servicio",
                                "Vacaciones pendientes o proporcionales",
                                "Remuneraciones adeudadas",
                                "Reajustes e intereses",
                                "Costas del juicio",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Cada caso dependerá de la causal utilizada, la antigüedad del trabajador y las pruebas rendidas durante el proceso.</p>
                    </div>

                    {/* PLAZOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuál es el plazo para demandar?</h2>
                        <p className="text-gray-600 mb-4">
                            Las acciones derivadas de un despido están sujetas a plazos establecidos por el Código del Trabajo. Por ello, es recomendable buscar asesoría jurídica apenas se produce el despido y no esperar hasta el último momento.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="text-red-800">Mientras antes se analice el caso, más fácil será reunir pruebas y preparar una estrategia adecuada.</p>
                        </div>
                    </div>

                    {/* PRUEBAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pruebas pueden ayudarte?</h2>
                        <p className="text-gray-600 mb-4">En un juicio laboral, las pruebas suelen ser determinantes.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Contrato de trabajo",
                                "Anexos",
                                "Carta de despido",
                                "Reglamento interno",
                                "Liquidaciones de sueldo",
                                "Correos electrónicos",
                                "Conversaciones por WhatsApp cuando sean pertinentes",
                                "Registros de asistencia",
                                "Informes internos",
                                "Testigos",
                                "Cualquier documento que permita desvirtuar la versión del empleador",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Muchas veces la propia documentación entregada por la empresa contiene inconsistencias que terminan favoreciendo al trabajador.</p>
                    </div>

                    {/* ERRORES DEL EMPLEADOR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes del empleador al aplicar el artículo 160</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Utilizar una causal genérica sin describir los hechos", desc: "La carta debe contener hechos concretos, no solo menciones vagas." },
                                    { title: "No indicar fechas concretas", desc: "La falta de fechas dificulta al trabajador conocer exactamente los hechos que se le imputan." },
                                    { title: "Sancionar dos veces la misma conducta", desc: "No se puede despedir por una conducta que ya fue sancionada anteriormente." },
                                    { title: "Despedir meses después de ocurridos los hechos", desc: "El paso del tiempo puede debilitar la conexión entre la conducta y el despido." },
                                    { title: "No contar con pruebas suficientes", desc: "El empleador debe acreditar los hechos en juicio." },
                                    { title: "Fundamentar el despido únicamente en rumores o sospechas", desc: "Las sospechas no son suficientes para justificar un despido disciplinario." },
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
                        <p className="text-gray-600 mt-4">Estos errores pueden ser determinantes para que el tribunal declare injustificado el despido.</p>
                    </div>

                    {/* ANALISIS TRIBUNALES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo analizan los tribunales un despido por artículo 160?</h2>
                        <p className="text-gray-600 mb-4">
                            Cuando un trabajador demanda un despido fundado en el artículo 160, el tribunal no se limita a revisar la carta de despido. También analiza si los hechos descritos realmente ocurrieron y si son lo suficientemente graves para justificar el término inmediato del contrato.
                        </p>
                        <div className="bg-gray-50 p-5 rounded-xl">
                            <p className="font-bold mb-2">Entre los aspectos que normalmente evalúa el juez se encuentran:</p>
                            <ul className="space-y-2 text-gray-700">
                                <li>• La gravedad de la conducta atribuida al trabajador</li>
                                <li>• Si existían antecedentes previos o sanciones disciplinarias</li>
                                <li>• La proporcionalidad entre la conducta y la sanción aplicada</li>
                                <li>• La existencia de pruebas objetivas</li>
                                <li>• El cumplimiento del procedimiento por parte del empleador</li>
                            </ul>
                        </div>
                        <div className="bg-amber-50 p-5 rounded-xl mt-4">
                            <p className="text-amber-800">No todo incumplimiento contractual constituye un incumplimiento grave. Por ello, dos casos aparentemente similares pueden tener resultados distintos dependiendo de las pruebas aportadas durante el juicio.</p>
                        </div>
                    </div>

                    {/* DIFERENCIAS TABLA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Diferencias entre el artículo 160 y el artículo 161</h2>
                        <p className="text-gray-600 mb-4">Es frecuente que los trabajadores confundan ambas causales de despido, pero sus efectos son muy diferentes.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 p-3 text-left font-bold">Artículo 160</th>
                                        <th className="border border-gray-300 p-3 text-left font-bold">Artículo 161</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Se basa en una conducta atribuible al trabajador.</td>
                                        <td className="border border-gray-300 p-3">Se basa en necesidades de la empresa o desahucio en casos específicos.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Si la causal es válida, normalmente no corresponde indemnización por años de servicio.</td>
                                        <td className="border border-gray-300 p-3">Generalmente sí corresponde indemnización legal.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">El empleador debe acreditar los hechos que justifican la causal.</td>
                                        <td className="border border-gray-300 p-3">El empleador debe justificar la causal económica u organizacional cuando corresponda.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Es una causal disciplinaria.</td>
                                        <td className="border border-gray-300 p-3">Es una causal objetiva prevista por la ley.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-gray-600 mt-4">Comprender esta diferencia es importante, ya que determina los derechos del trabajador y las acciones judiciales que pueden ejercerse.</p>
                    </div>

                    {/* FINIQUITO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Conviene firmar el finiquito si me despidieron por artículo 160?</h2>
                        <p className="text-gray-600 mb-4">
                            Dependerá de cada situación. En algunos casos el trabajador firma el finiquito porque necesita recibir los montos que no están en discusión, como remuneraciones pendientes o vacaciones proporcionales.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">
                                Sin embargo, si considera que la causal fue aplicada incorrectamente, puede ser recomendable evaluar la posibilidad de efectuar una reserva de derechos, permitiendo posteriormente demandar al empleador cuando la ley lo autorice. Antes de firmar cualquier documento conviene revisar cuidadosamente su contenido y comprender sus efectos jurídicos.
                            </p>
                        </div>
                    </div>

                    {/* RECOMENDACIONES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Recomendaciones antes de iniciar una demanda</h2>
                        <p className="text-gray-600 mb-4">Si crees que el artículo 160 fue utilizado de manera injustificada, procura actuar rápidamente.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Conservar todos los documentos laborales",
                                "Descargar los certificados previsionales",
                                "Guardar correos electrónicos y conversaciones relevantes",
                                "Elaborar una cronología de los hechos mientras aún están recientes",
                                "Consultar oportunamente con un abogado laboral",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Una evaluación temprana permite definir si conviene demandar por despido injustificado, nulidad del despido, tutela laboral u otras acciones que puedan corresponder según las circunstancias del caso.</p>
                    </div>

                    {/* CTA IN-ARTICLE 2 */}
                    <InArticleCTA
                        title="¿La carta de despido tiene errores?"
                        message="Si el artículo 160 fue mal aplicado o la carta no describe hechos concretos, podrías tener derecho a demandar. Un abogado laboral puede revisar tu caso."
                        buttonText="Revisar mi caso"
                        category="Derecho Laboral"
                    />

                    {/* CONCLUSION */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            El artículo 160 del Código del Trabajo permite despedir a un trabajador por determinadas conductas graves, pero ello no significa que cualquier carta de despido sea válida. El empleador tiene la obligación de acreditar los hechos y demostrar que la causal fue correctamente aplicada.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Si recibiste un despido por artículo 160, es recomendable revisar cuanto antes la carta de despido, reunir toda la documentación disponible y consultar con un abogado laboral para evaluar si corresponde impugnar la decisión. Puedes consultar con un{" "}
                            <Link to="/abogado-laboral" className="text-green-700 underline hover:text-green-500">abogado laboral en Chile</Link>{" "}
                            a través de LegalUp.
                        </p>
                    </div>

                    <CategoryCTA category="laboral" linkText="Hablar con un abogado laboral" />

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

                    {/* ARTICULOS RELACIONADOS */}
                    <div className="mt-8 border-t pt-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">También te puede interesar</h3>
                        <div className="flex flex-wrap gap-3">
                            <Link
                                to="/blog/despido-injustificado-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Despido injustificado en Chile 2026
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/carta-de-despido-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Carta de despido en Chile
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/demanda-laboral-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Demanda laboral en Chile
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/nulidad-del-despido-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Nulidad del despido (Ley Bustos)
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/inspeccion-del-trabajo-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Inspección del Trabajo en Chile
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/finiquito-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                ¿Qué pasa si no firmo el finiquito?
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
                <div className="mt-8">
                    <BlogShare
                        title="Artículo 160 del Código del Trabajo en Chile 2026"
                        url="https://legalup.cl/blog/articulo-160-codigo-trabajo-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="articulo-160-codigo-trabajo-chile-2026" />

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

            <BlogConversionPopup category="Derecho Laboral" topic="articulo-160" />
        </div>
    );
};

export default BlogArticle;