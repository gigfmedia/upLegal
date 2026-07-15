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
            question: "¿La carta de despido debe estar firmada?",
            answer: "Sí. Debe ser emitida por el empleador o por quien tenga facultades para representarlo.",
        },
        {
            question: "¿Pueden despedirme solo de palabra?",
            answer: "No es la forma que exige la ley. El despido debe comunicarse mediante una carta que cumpla los requisitos legales correspondientes.",
        },
        {
            question: "¿Debo firmar la carta de despido?",
            answer: "No. Firmarla solo acredita su recepción. Si no estás de acuerdo con el contenido, puedes igualmente ejercer las acciones legales que correspondan.",
        },
        {
            question: "¿Puedo demandar aunque haya firmado el finiquito?",
            answer: "Depende de cada caso. En determinadas circunstancias es posible impugnar el despido o ejercer otras acciones, especialmente si se formularon reservas de derechos o existen situaciones protegidas por la ley.",
        },
        {
            question: "¿Qué pasa si la carta contiene información falsa?",
            answer: "Si el empleador no logra acreditar los hechos que invoca en la carta, ello puede ser relevante para que el tribunal declare el despido injustificado o improcedente.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Carta de despido en Chile 2026: requisitos legales, plazos y qué hacer si recibiste una"
                description="Conoce qué debe contener una carta de despido en Chile, cuándo es válida, qué derechos tienes, cómo impugnarla y cuándo consultar a un abogado laboral."
                image="/assets/carta-de-despido-chile-2026.png"
                url="https://legalup.cl/blog/carta-de-despido-chile-2026"
                datePublished="2026-07-14"
                dateModified="2026-07-14"
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
                        Carta de despido en Chile 2026: requisitos legales, plazos y qué hacer si recibiste una
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "La carta de despido debe cumplir requisitos legales establecidos en el Código del Trabajo.",
                                "Debe indicar la causal invocada y los hechos concretos que la fundamentan.",
                                "Si la carta tiene errores, puede ser impugnada judicialmente.",
                                "El empleador no puede cambiar los motivos del despido después de emitir la carta.",
                                "Revisar la carta oportunamente es clave para no perder plazos legales.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Recibir una carta de despido suele generar muchas dudas e incertidumbre. Además del impacto económico, es común preguntarse si el empleador cumplió correctamente con la ley, si la causal utilizada es válida o si existe la posibilidad de reclamar judicialmente.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>14 de Julio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="carta-de-despido-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Carta de despido en Chile 2026"
                        url="https://legalup.cl/blog/carta-de-despido-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            En Chile, la carta de despido no es un simple documento administrativo. Es el instrumento mediante el cual el empleador comunica formalmente el término del contrato de trabajo y debe cumplir requisitos establecidos en el Código del Trabajo. Si la carta presenta errores o no cumple las exigencias legales, ello puede influir en una eventual demanda por despido injustificado.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía conocerás qué debe contener una carta de despido, cuáles son los plazos legales, qué ocurre si existen errores, cuándo puedes impugnar el despido y qué hacer para proteger tus derechos.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando un conflicto laboral, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/despido-necesidades-empresa-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                despido por necesidades de la empresa
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/tutela-laboral-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                tutela laboral
                            </Link>{" "}
                            y{" "}
                            <Link
                                to="/blog/acoso-laboral-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                acoso laboral
                            </Link>.
                        </p>
                    </div>

                    {/* QUE ES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es una carta de despido?</h2>
                        <p className="text-gray-600 mb-4">
                            La carta de despido es el documento mediante el cual el empleador comunica oficialmente al trabajador el término de la relación laboral.
                        </p>
                        <p className="text-gray-600 mb-4">
                            No basta con informar verbalmente el despido ni con impedir el ingreso al lugar de trabajo. La ley exige una comunicación formal que identifique claramente la causal invocada y los hechos que la justifican.
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">
                                Dependiendo de la causal utilizada, también deberán cumplirse otros requisitos, como el pago de cotizaciones previsionales y el envío de copias a la Dirección del Trabajo cuando corresponda.
                            </p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Conocer la definición general de una carta de despido no permite determinar automáticamente si el documento recibido cumple la ley. En una eventual demanda, los tribunales analizan aspectos específicos como la redacción utilizada, los antecedentes mencionados, la oportunidad de la comunicación y la coherencia entre la carta y las pruebas que posteriormente presenta el empleador. Esa evaluación siempre depende de las circunstancias concretas del caso.
                            </p>
                        </div>
                    </div>

                    {/* CTA IN-ARTICLE */}
                    <InArticleCTA
                        title="¿Recibiste una carta de despido y no sabes si es válida?"
                        message="Un abogado laboral puede revisar tu carta de despido antes de que venzan los plazos para reclamar."
                        buttonText="Habla con un abogado ahora"
                        category="Derecho Laboral"
                    />

                    {/* QUE DEBE CONTENER */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué debe contener una carta de despido?</h2>
                        <p className="text-gray-600 mb-4">Una carta de despido válida normalmente debe incluir:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Identificación del empleador",
                                "Identificación del trabajador",
                                "Fecha del despido",
                                "Fecha de término del contrato",
                                "Causal legal invocada",
                                "Hechos específicos que fundamentan la causal",
                                "Información sobre pago de cotizaciones previsionales",
                                "Firma del empleador o representante",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">
                            Cuando se utiliza una causal disciplinaria, la descripción de los hechos debe ser suficientemente clara para permitir que el trabajador conozca exactamente las razones del despido.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl mt-4">
                            <p className="font-bold text-red-800">No basta indicar frases generales como:</p>
                            <ul className="mt-2 space-y-1 text-red-700">
                                <li>• "Pérdida de confianza"</li>
                                <li>• "Mal desempeño"</li>
                                <li>• "Problemas laborales"</li>
                            </ul>
                            <p className="text-red-700 mt-2">La carta debe contener hechos concretos que posteriormente puedan acreditarse.</p>
                        </div>
                    </div>

                    {/* CAUSALES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué causales pueden aparecer en una carta de despido?</h2>
                        <p className="text-gray-600 mb-4">Las más frecuentes son:</p>
                        <div className="space-y-3">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Necesidades de la empresa</h3>
                                <p className="text-gray-600">Utilizada cuando existen razones económicas, técnicas, estructurales o de reorganización.</p>
                                <p className="text-gray-500 text-sm mt-1">
                                    Puedes revisar nuestra guía sobre{" "}
                                    <Link to="/blog/despido-necesidades-empresa-chile-2026" className="text-green-700 underline">Despido por necesidades de la empresa en Chile</Link>.
                                </p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Incumplimiento grave de las obligaciones</h3>
                                <p className="text-gray-600">Se utiliza cuando el empleador considera que el trabajador cometió una infracción suficientemente seria para justificar el despido.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Conductas indebidas</h3>
                                <p className="text-gray-600">Por ejemplo: faltas de probidad, acoso sexual, agresiones, abandono del trabajo, daños intencionales. Cada una posee requisitos distintos y deberá acreditarse mediante pruebas.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Vencimiento del plazo</h3>
                                <p className="text-gray-600">En contratos a plazo fijo.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Conclusión de la obra o faena</h3>
                                <p className="text-gray-600">Aplicable únicamente a contratos por obra determinada.</p>
                            </div>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                La sola mención de una causal legal en la carta no significa que el despido sea válido. En muchos juicios laborales el empleador invoca correctamente una causal, pero posteriormente no logra demostrar los hechos que la sustentan. La diferencia entre una causal correctamente escrita y una causal efectivamente acreditada suele ser uno de los aspectos más relevantes del proceso judicial.
                            </p>
                        </div>
                    </div>

                    {/* PLAZOS EMPLEADOR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué plazo tiene el empleador para entregar la carta?</h2>
                        <p className="text-gray-600 mb-4">Los plazos dependen de la causal utilizada.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Algunas causales exigen entrega inmediata",
                                "Otras permiten comunicar el despido con determinados días de anticipación",
                                "En ciertos casos también debe enviarse copia a la Dirección del Trabajo",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">El incumplimiento de estos plazos puede tener consecuencias jurídicas relevantes.</p>
                    </div>

                    {/* NUNCA RECIBI LA CARTA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si nunca recibí la carta?</h2>
                        <p className="text-gray-600 mb-4">Puede ocurrir que:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "El empleador comunique verbalmente el despido",
                                "Impida el ingreso al trabajo",
                                "Deje de pagar remuneraciones",
                                "Simplemente desaparezca sin formalizar el término del contrato",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">
                            Estas situaciones pueden generar distintas acciones legales para el trabajador. La ausencia de una carta de despido no necesariamente significa que el despido sea inexistente, pero sí puede constituir un incumplimiento de las obligaciones legales del empleador y ser un antecedente importante en una eventual reclamación.
                        </p>
                    </div>

                    {/* IMPUGNAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Puedo impugnar una carta de despido?</h2>
                        <p className="text-gray-600 mb-4">
                            Sí. Si consideras que el despido no cumple los requisitos legales o que la causal invocada no corresponde a la realidad, puedes impugnarlo.
                        </p>
                        <p className="text-gray-600 mb-4">Dependiendo del caso, el trabajador puede solicitar que el tribunal declare el despido:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Injustificado", "Improcedente", "Indebido", "Vulneratorio de derechos fundamentales"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">El resultado puede implicar el pago de indemnizaciones adicionales e incluso otras compensaciones establecidas por la ley.</p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Que una carta de despido tenga errores no significa automáticamente que ganarás un juicio. Los tribunales analizan si esos errores afectaron efectivamente tus derechos y si el empleador logra acreditar los hechos invocados. Esa evaluación requiere revisar toda la documentación laboral y los antecedentes específicos del caso.
                            </p>
                        </div>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué errores son frecuentes en una carta de despido?</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "No indicar correctamente la causal legal", desc: "La carta debe mencionar la causal específica del Código del Trabajo." },
                                    { title: "Describir hechos demasiado generales", desc: "No basta con frases vagas; deben detallarse los hechos concretos." },
                                    { title: "Omitir antecedentes relevantes", desc: "La falta de información puede afectar la validez del despido." },
                                    { title: "Invocar hechos distintos a los que luego intenta probar el empleador", desc: "El empleador debe defender en juicio los hechos contenidos en la carta." },
                                    { title: "No acreditar el pago de cotizaciones previsionales cuando corresponde", desc: "Puede generar la nulidad del despido." },
                                    { title: "Entregar la carta fuera del plazo legal", desc: "El incumplimiento de plazos puede tener consecuencias relevantes." },
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

                    {/* NO PUEDE CAMBIAR MOTIVOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿El empleador puede cambiar después los motivos del despido?</h2>
                        <p className="text-gray-600 mb-4">
                            En términos generales, no. Uno de los principios más importantes del procedimiento laboral es que el empleador deberá defender en juicio los hechos contenidos en la carta de despido.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">No puede despedir utilizando una causal y posteriormente intentar justificar el término del contrato con hechos completamente distintos. Por ello, la redacción de la carta tiene enorme importancia durante todo el juicio.</p>
                        </div>
                    </div>

                    {/* COTIZACIONES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si las cotizaciones previsionales no estaban pagadas?</h2>
                        <p className="text-gray-600 mb-4">
                            Si al momento del despido las cotizaciones previsionales no estaban íntegramente pagadas, pueden producirse consecuencias jurídicas importantes para el empleador.
                        </p>
                        <p className="text-gray-600 mb-4">
                            En determinados casos puede operar la denominada nulidad del despido, lo que obliga al empleador a continuar pagando remuneraciones hasta regularizar completamente las cotizaciones.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                            <p className="text-amber-800 text-sm">
                                No toda deuda previsional produce automáticamente la nulidad del despido. Es necesario revisar cuáles cotizaciones estaban pendientes, los períodos involucrados, la forma en que fueron regularizadas y la documentación existente. Es un análisis que depende completamente de los antecedentes concretos de cada trabajador.
                            </p>
                        </div>
                    </div>

                    {/* PLAZOS RECLAMAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué plazo tengo para reclamar?</h2>
                        <p className="text-gray-600 mb-4">Los plazos laborales son breves.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Reclamar ante la Inspección del Trabajo",
                                "Demandar judicialmente",
                                "Solicitar indemnizaciones",
                                "Ejercer acciones por vulneración de derechos fundamentales",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <div className="bg-red-50 p-5 rounded-xl mt-4">
                            <p className="text-red-800">Esperar demasiado tiempo puede significar perder definitivamente el derecho a demandar. Por esa razón es recomendable revisar el caso apenas recibes la carta de despido.</p>
                        </div>
                    </div>

                    {/* DOCUMENTOS CONSERVAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué documentos debo conservar?</h2>
                        <p className="text-gray-600 mb-4">Si recibiste una carta de despido, procura guardar:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Carta de despido original",
                                "Contrato de trabajo",
                                "Anexos",
                                "Liquidaciones de sueldo",
                                "Finiquito (si existe)",
                                "Comprobantes de cotizaciones",
                                "Correos electrónicos",
                                "Mensajes relevantes",
                                "Cualquier documento relacionado con el despido",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Mientras más antecedentes existan, más precisa podrá ser la evaluación jurídica.</p>
                    </div>

                    {/* CUANDO CONSULTAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo conviene consultar a un abogado laboral?</h2>
                        <p className="text-gray-600 mb-4">Es recomendable solicitar asesoría profesional especialmente cuando:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "La causal indicada parece falsa",
                                "La carta contiene errores importantes",
                                "Nunca recibiste formalmente la carta",
                                "No te pagaron las indemnizaciones",
                                "Existen cotizaciones impagas",
                                "Sufriste acoso laboral antes del despido",
                                "Consideras que existió discriminación",
                                "Te despidieron estando con licencia médica",
                                "Deseas demandar al empleador",
                                "Tienes dudas antes de firmar el finiquito",
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-600 flex-shrink-0">•</span>
                                    <span className="text-gray-700 font-bold">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Mientras antes se revise el caso, mayores serán las posibilidades de adoptar una estrategia adecuada dentro de los plazos legales.</p>
                    </div>

                    {/* CTA PRINCIPAL */}
                    <div className="mb-12">
                        <div className="bg-green-900 rounded-2xl p-8 text-center text-white">
                            <h3 className="text-2xl font-bold font-serif text-green-600 mb-3">¿Recibiste una carta de despido y no sabes si es legal?</h3>
                            <p className="text-white mb-6">Antes de firmar un finiquito o dejar pasar los plazos para reclamar, un abogado laboral puede revisar la carta de despido, analizar la causal utilizada y orientarte sobre las acciones disponibles según los antecedentes de tu caso.</p>
                            <Link
                                to="/abogados-laborales"
                                className="inline-block bg-white text-green-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                Hablar con un abogado laboral
                            </Link>
                        </div>
                    </div>

                    <RelatedLawyers category="Derecho Laboral" />

                    {/* CONCLUSION */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La carta de despido constituye uno de los documentos más importantes dentro del término de una relación laboral. Debe cumplir requisitos legales específicos y servir de fundamento para cualquier defensa que posteriormente presente el empleador.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Sin embargo, conocer las reglas generales no basta para determinar si un despido es válido. Aspectos como la forma en que se redactó la carta, la prueba disponible, las cotizaciones previsionales, la causal invocada y la historia laboral del trabajador pueden cambiar completamente la evaluación jurídica de un caso concreto. Si recibiste una carta de despido y tienes dudas sobre su legalidad, resulta recomendable consultar oportunamente con un{" "}
                            <Link to="/abogados-laborales" className="text-green-700 underline hover:text-green-500">abogado laboral en Chile</Link>{" "}
                            antes de que expiren los plazos para reclamar.
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

            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
                <div className="mt-8">
                    <BlogShare
                        title="Carta de despido en Chile 2026"
                        url="https://legalup.cl/blog/carta-de-despido-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="carta-de-despido-chile-2026" />

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

            <BlogConversionPopup category="Derecho Laboral" topic="carta-despido" />
        </div>
    );
};

export default BlogArticle;