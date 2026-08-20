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
            question: "¿Qué significa ser formalizado?",
            answer: "La formalización de la investigación es la comunicación que el fiscal hace al imputado, en presencia del juez de garantía, de que desarrolla una investigación en su contra por uno o más delitos determinados. No es una condena ni un juicio: es el hito que fija el inicio formal de la investigación respecto de esa persona.",
        },
        {
            question: "¿La formalización significa que soy culpable?",
            answer: "No. La formalización solo informa que la Fiscalía está investigando. Toda persona se presume inocente hasta que una sentencia firme determine lo contrario. De hecho, muchas investigaciones formalizadas terminan en sobreseimiento, salidas alternativas o absolución.",
        },
        {
            question: "¿Qué ocurre después de la formalización?",
            answer: "El juez fija un plazo de investigación, normalmente de hasta dos años, durante el cual la Fiscalía reúne antecedentes. Al final puede acusar, solicitar un sobreseimiento, aplicar una salida alternativa o dejar el caso sin más trámite, según los antecedentes reunidos.",
        },
        {
            question: "¿Puedo quedar detenido después de la formalización?",
            answer: "La formalización en sí no implica detención. Sin embargo, durante la misma audiencia la Fiscalía puede solicitar medidas cautelares, entre ellas la prisión preventiva, si cumple los requisitos legales. La prisión preventiva es excepcional y debe justificarse con antecedentes concretos.",
        },
        {
            question: "¿Necesito un abogado para la audiencia de formalización?",
            answer: "Sí. El imputado tiene derecho a una defensa técnica desde los primeros actos de la investigación. En la audiencia de formalización debe estar presente su defensor, quien puede hacer observaciones, solicitar que se fije un plazo razonable y defenderse de la solicitud de medidas cautelares.",
        },
        {
            question: "¿Pueden formalizarme sin que yo lo sepa?",
            answer: "No. La formalización se realiza en una audiencia ante el juez de garantía, con presencia del imputado y su defensor. Es precisamente el acto mediante el cual el imputado conoce oficialmente los hechos que se le atribuyen y los derechos que tiene en el proceso.",
        },
        {
            question: "¿Qué pasa si el fiscal no formaliza?",
            answer: "Si no se formaliza la investigación, el imputado no pasa a tener la calidad procesal de formalizado y no se fija plazo de investigación en su contra. La Fiscalía puede continuar con diligencias, pero el imputado conserva sus derechos y puede solicitar que se active o se ponga término a la investigación si esta se extiende.",
        },
        {
            question: "¿La formalización interrumpe o suspende la prescripción?",
            answer: "La formalización produce efectos procesales importantes, entre ellos sobre los plazos. Si tienes dudas sobre la prescripción en tu caso concreto, es recomendable que un abogado revise las fechas y los antecedentes específicos de la investigación.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Formalización de la investigación en Chile 2026: qué es, cómo funciona y qué derechos tienes"
                description="Conoce qué es la formalización de la investigación penal en Chile, cómo se desarrolla la audiencia, qué efectos produce y cuáles son los derechos del imputado."
                image="/assets/formalizacion-chile-2026.png"
                url="https://legalup.cl/blog/formalizacion-chile-2026"
                datePublished="2026-08-04"
                dateModified="2026-08-04"
                faqs={faqs}
            />

            <Header onAuthClick={() => { }} />
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
                        Formalización de la investigación en Chile 2026: qué es, cómo funciona y qué derechos tienes
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "La formalización es la comunicación oficial de que la Fiscalía investiga hechos en tu contra.",
                                "Se realiza en una audiencia ante el juez de garantía, con presencia del imputado y su defensor.",
                                "No es una condena: se mantiene la presunción de inocencia.",
                                "El juez fija un plazo de investigación, que en general no puede exceder de dos años.",
                                "En la audiencia también pueden solicitarse medidas cautelares, incluida la prisión preventiva.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        La formalización de la investigación es uno de los hitos más relevantes del proceso penal chileno. Para quien la enfrenta, suele ser el momento en que por primera vez se entera oficialmente de los hechos que se le atribuyen y de los riesgos que puede enfrentar.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>4 de Agosto, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="formalizacion-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Formalización de la investigación en Chile 2026"
                        url="https://legalup.cl/blog/formalizacion-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            En Chile, cuando el Ministerio Público reúne antecedentes sobre un hecho que puede ser delito y estima que existe participación de una persona, puede comunicárselo formalmente en una audiencia ante el juez de garantía. Ese acto se llama formalización de la investigación.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía actualizada para 2026 explicamos qué es la formalización, cuándo procede, cómo se desarrolla la audiencia, qué efectos produce y cuáles son los derechos del imputado durante todo el proceso.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando una situación penal, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/citacion-fiscalia-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                citación de la Fiscalía
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/declarar-fiscalia-imputado-testigo-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                cómo declarar en la Fiscalía
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/control-de-detencion-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                control de detención
                            </Link>{" "}
                            y{" "}
                            <Link
                                to="/blog/constancia-por-amenazas-en-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                constancia por amenazas
                            </Link>.
                        </p>
                    </div>

                    {/* QUE ES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es la formalización de la investigación?</h2>
                        <p className="text-gray-600 mb-4">
                            La ley la define como la comunicación que el fiscal hace al imputado, en presencia del juez de garantía, de que desarrolla actualmente una investigación en su contra por uno o más delitos determinados.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Su propósito es poner al imputado en conocimiento de los hechos que se le atribuyen, asegurar su derecho a defenderse y fijar un plazo para que la investigación avance. Marca la diferencia entre una investigación reservada y una etapa en que el imputado pasa a ser parte formal del procedimiento.
                        </p>

                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">La formalización no implica culpabilidad. Es una comunicación procesal destinada a garantizar los derechos del imputado y ordenar la investigación.</p>
                        </div>
                    </div>

                    {/* CUANDO SE FORMALIZA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo procede la formalización?</h2>
                        <p className="text-gray-600 mb-4">
                            La Fiscalía formaliza cuando estima necesario adoptar medidas que requieren control judicial o cuando la investigación entra en una etapa en que el imputado debe conocer oficialmente los hechos. Entre los casos más frecuentes se encuentran:
                        </p>
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">1. Solicitud de medidas que afectan derechos</h3>
                                <p className="text-gray-600">Si la Fiscalía necesita, por ejemplo, interceptar comunicaciones o solicitar medidas cautelares, en general debe formalizar previamente la investigación.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">2. El imputado está detenido o privado de libertad</h3>
                                <p className="text-gray-600">En las audiencias de control de detención, la Fiscalía suele aprovechar para formalizar la investigación cuando existen antecedentes suficientes.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">3. Recepción anticipada de prueba o diligencias relevantes</h3>
                                <p className="text-gray-600">Cuando la investigación requiere actuaciones que deben realizarse pronto o en condiciones especiales, la formalización ordena el marco procesal para llevarlas a cabo.</p>
                            </div>
                        </div>
                    </div>

                    <RelatedLawyers category="Derecho Penal" />

                    {/* LA AUDIENCIA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo se desarrolla la audiencia de formalización?</h2>
                        <p className="text-gray-600 mb-4">La audiencia se realiza ante el juez de garantía y en ella participan el fiscal, el imputado y su defensor.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 p-3 text-left font-bold">Etapa</th>
                                        <th className="border border-gray-300 p-3 text-left font-bold">Qué ocurre</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Comunicación de la Fiscalía</td>
                                        <td className="border border-gray-300 p-3">El fiscal expone los hechos investigados, los delitos que atribuye y la participación que imputa, con los antecedentes que los sustentan.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Intervención de la defensa</td>
                                        <td className="border border-gray-300 p-3">El defensor puede formular observaciones, precisar antecedentes y plantear solicitudes al tribunal.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Medidas cautelares</td>
                                        <td className="border border-gray-300 p-3">La Fiscalía puede solicitar medidas para asegurar el proceso: firma, arraigo, prohibiciones, arresto domiciliario o prisión preventiva.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Plazo de investigación</td>
                                        <td className="border border-gray-300 p-3">El juez fija el plazo dentro del cual la Fiscalía debe cerrar la investigación, generalmente de hasta dos años.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                El desarrollo concreto de la audiencia depende de cada caso. La calidad de los antecedentes presentados por la Fiscalía y la capacidad de la defensa para controvertirlos influyen directamente en las decisiones que adopta el juez.
                            </p>
                        </div>
                    </div>

                    <InArticleCTA
                        category="Derecho Penal"
                        title="¿Tienes una audiencia de formalización próxima?"
                        message="Un abogado penal puede preparar tu defensa, revisar la solicitud de medidas cautelares y representarte en la audiencia."
                    />

                    {/* ETAPAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Dónde se ubica la formalización en el proceso penal?</h2>
                        <p className="text-gray-600 mb-4">Para dimensionar su importancia, conviene ubicar la formalización dentro de las etapas del proceso penal chileno.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 p-3 text-left font-bold">Investigación</th>
                                        <th className="border border-gray-300 p-3 text-left font-bold">Formalización</th>
                                        <th className="border border-gray-300 p-3 text-left font-bold">Juicio oral</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-300 p-3">La Fiscalía reúne antecedentes, muchas veces de forma reservada.</td>
                                        <td className="border border-gray-300 p-3">El imputado conoce oficialmente los hechos y se fija plazo de investigación.</td>
                                        <td className="border border-gray-300 p-3">Si se acusa, se realiza el juicio donde se rinde la prueba y se decide la responsabilidad.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Puede no existir imputado formalizado.</td>
                                        <td className="border border-gray-300 p-3">Es un hito intermedio: ni condena ni absolución.</td>
                                        <td className="border border-gray-300 p-3">Concluye con sentencia condenatoria o absolutoria.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-gray-600 mt-4">Muchos casos no llegan al juicio oral: pueden terminar en sobreseimiento, salidas alternativas o acuerdos antes de esa etapa.</p>
                    </div>

                    {/* EFECTOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué efectos produce la formalización?</h2>
                        <p className="text-gray-600 mb-4">La formalización no resuelve la culpabilidad, pero produce efectos procesales relevantes:</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["El imputado pasa a ser parte formal del procedimiento", "Se fija un plazo máximo de investigación", "Pueden solicitarse medidas cautelares", "El imputado puede ejercer plenamente su derecho a defensa", "Permite la eventual aplicación de salidas alternativas", "Ordena la etapa de cierre de la investigación"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Estos efectos buscan equilibrar la persecución penal con las garantías del imputado.</p>
                    </div>

                    {/* PLAZO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuánto dura la investigación formalizada?</h2>
                        <p className="text-gray-600 mb-4">
                            La ley establece que la investigación formalizada no puede exceder de dos años, salvo prórrogas solicitadas por la Fiscalía y autorizadas por el juez en casos calificados.
                        </p>
                        <p className="text-gray-600">
                            Al vencerse el plazo, la Fiscalía debe cerrar la investigación, acusar, solicitar sobreseimiento o aplicar alguna salida alternativa. Si no lo hace dentro del plazo, el imputado o el tribunal pueden instar por el término del procedimiento según corresponda.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl mt-4">
                            <p className="text-amber-800">El plazo exacto aplicable a un caso depende de las fechas de la formalización, de eventuales suspensiones y de las prórrogas que se hayan solicitado. Cada situación debe revisarse con los antecedentes del expediente.</p>
                        </div>
                    </div>

                    {/* DERECHOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuáles son los derechos del imputado?</h2>
                        <p className="text-gray-600 mb-4">Desde los primeros actos de la investigación, la ley reconoce al imputado garantías fundamentales:</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Derecho a ser informado de los hechos y derechos", "Derecho a ser asistido por un abogado desde el inicio", "Derecho a guardar silencio y no autoincriminarse", "Derecho a solicitar diligencias de investigación", "Derecho a pedir audiencia para declarar", "Derecho a solicitar el sobreseimiento y recurrir las resoluciones"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Estos derechos existen con independencia del delito investigado y de la etapa del procedimiento.</p>
                    </div>

                    {/* DESPUES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre después de la formalización?</h2>
                        <p className="text-gray-600 mb-4">Una vez formalizada la investigación, pueden suceder distintos escenarios:</p>
                        <div className="space-y-3">
                            <div className="bg-green-50 p-4 rounded-xl">
                                <h3 className="font-bold text-green-800">Sobreseimiento</h3>
                                <p className="text-green-700">Si no existen antecedentes suficientes o el hecho no es delito, la investigación puede terminar con un sobreseimiento.</p>
                            </div>
                            <div className="bg-amber-50 p-4 rounded-xl">
                                <h3 className="font-bold text-amber-800">Salidas alternativas</h3>
                                <p className="text-amber-700">En ciertos delitos y con los requisitos legales, puede aplicarse suspensión condicional del procedimiento o acuerdos reparatorios.</p>
                            </div>
                            <div className="bg-red-50 p-4 rounded-xl">
                                <h3 className="font-bold text-red-800">Acusación y juicio</h3>
                                <p className="text-red-700">Si la Fiscalía estima que hay antecedentes suficientes, presentará acusación y el caso avanzará hacia la etapa de juicio oral.</p>
                            </div>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Cuál de estos escenarios ocurre depende de la prueba reunida durante la investigación y de las decisiones que adopten la Fiscalía, la defensa y el tribunal. Dos casos formalizados por hechos similares pueden tener trayectorias muy distintas.
                            </p>
                        </div>
                    </div>

                    <InArticleCTA
                        title="¿Fuiste formalizado y no sabes qué sigue?"
                        message="Un abogado penalista puede revisar los antecedentes de tu caso, evaluar las defensas disponibles y representarte en las próximas audiencias."
                        buttonText="Habla con un abogado penal ahora"
                        category="Derecho Penal"
                    />

                    {/* ERRORES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes después de la formalización</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Declarar sin asesoría", desc: "Después de la formalización, cualquier declaración puede usarse en tu contra. Es recomendable definir la estrategia con tu abogado antes de hablar." },
                                    { title: "No asistir a las audiencias", desc: "La inasistencia puede llevar a que se solicite tu detención. Comparecer es fundamental para ejercer tus derechos." },
                                    { title: "Ignorar los plazos de investigación", desc: "Si la Fiscalía no cierra la investigación en el plazo, existen mecanismos para instar por el término del procedimiento. No dejarlos correr es parte de una defensa activa." },
                                    { title: "No conservar evidencia", desc: "Documentos, mensajes y registros pueden ser claves para acreditar tu versión. Guardarlos desde el inicio facilita la defensa." },
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

                    {/* CULPABILIDAD */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿La formalización implica culpabilidad?</h2>
                        <p className="text-gray-600 mb-4">
                            Una duda frecuente es pensar que ser formalizado equivale a ser culpable o a estar condenado. No es así. La formalización es una comunicación procesal: la Fiscalía informa al juez y al imputado que desarrolla una investigación en su contra, describiendo los hechos que se atribuyen y las circunstancias de participación. No es una sentencia ni un reconocimiento de culpabilidad.
                        </p>
                        <p className="text-gray-600 mb-4">
                            En el sistema penal chileno rige el principio de inocencia: el imputado se considera inocente mientras no exista una sentencia firme que lo condene. Muchas formalizaciones terminan en sobreseimiento, en archivo del caso o en acuerdos, y solo una parte de las investigaciones llega efectivamente a juicio oral.
                        </p>
                        <p className="text-gray-600">
                            Por eso, lo relevante es lo que ocurre después: conocer los antecedentes de la investigación, preparar la estrategia de defensa y decidir de forma informada cómo responder en cada etapa. Si fuiste formalizado, lo importante es comparecer con asistencia de un abogado y entender que todavía hay un camino procesal amplio por delante.
                        </p>
                    </div>

                    {/* CUANDO ABOGADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo conviene consultar a un abogado penal?</h2>
                        <p className="text-gray-600 mb-4">La etapa posterior a la formalización define gran parte del resultado del proceso. Una defensa técnica temprana permite:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Revisar la legalidad de la formalización", "Preparar observaciones a la solicitud de medidas cautelares", "Solicitar diligencias de investigación", "Explorar salidas alternativas", "Preparar la defensa para el juicio si corresponde", "Instar por el término del procedimiento cuando procede"].map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-600 flex-shrink-0">•</span>
                                    <span className="text-gray-700 font-bold">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Mientras antes exista asesoría, mayores son las posibilidades de influir en el desarrollo del proceso.</p>
                    </div>

                    {/* CONCLUSION */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La formalización de la investigación es un hito clave del proceso penal chileno: es el momento en que el imputado conoce oficialmente los hechos que se le atribuyen y se ordena el plazo de la investigación.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            No implica culpabilidad, pero sí marca el inicio de una etapa en la que las decisiones de la defensa importan. Si quieres profundizar, revisa nuestras guías sobre{" "}
                            <Link to="/blog/citacion-fiscalia-chile-2026" className="text-green-700 underline hover:text-green-500">citación de la Fiscalía</Link>
                            ,{" "}
                            <Link to="/blog/declarar-fiscalia-imputado-testigo-chile-2026" className="text-green-700 underline hover:text-green-500">cómo declarar en la Fiscalía</Link>{" "}
                            y{" "}
                            <Link to="/blog/control-de-detencion-chile-2026" className="text-green-700 underline hover:text-green-500">el control de detención</Link>. Para revisar tu situación particular, puedes consultar con un{" "}
                            <Link to="/abogados-penales" className="text-green-700 underline hover:text-green-500">
                                abogado penalista en Chile
                            </Link>.
                        </p>
                    </div>

                    <CategoryCTA category="penal" />

                    {/* FAQS */}
                    <div className="mt-12 mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre la formalización de la investigación</h2>
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
                        title="Formalización de la investigación en Chile 2026"
                        url="https://legalup.cl/blog/formalizacion-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="formalizacion-chile-2026" />

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
            <BlogConversionPopup category="Derecho Penal" topic="formalizacion" />
        </div>
    );
};

export default BlogArticle;