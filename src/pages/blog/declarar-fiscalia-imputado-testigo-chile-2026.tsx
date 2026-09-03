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
            question: "¿Estoy obligado a declarar si me citan como testigo en la Fiscalía?",
            answer: "En general sí. Quien es citado como testigo tiene el deber de comparecer y declarar sobre lo que sabe respecto de los hechos investigados. Existen excepciones: los parientes cercanos del imputado pueden abstenerse de declarar en su contra, y quienes tienen deber de guardar secreto profesional pueden hacerlo solo respecto de esa información protegida.",
        },
        {
            question: "¿El imputado está obligado a declarar?",
            answer: "No. El imputado tiene derecho a guardar silencio y a no declarar contra sí mismo. Puede optar por declarar si lo estima conveniente, pero nadie puede obligarlo. Antes de decidir, es recomendable conocer los antecedentes de la investigación y contar con la orientación de un abogado.",
        },
        {
            question: "¿Qué diferencia hay entre declarar como testigo y como imputado?",
            answer: "El testigo declara sobre hechos que conoce y, por regla general, está obligado a decir la verdad; si miente puede enfrentar consecuencias penales. El imputado no está obligado a declarar, no presta juramento y puede guardar silencio o entregar su versión sin el riesgo de autoincriminarse.",
        },
        {
            question: "¿Puedo llevar abogado a mi declaración en la Fiscalía?",
            answer: "Sí. Si declaras como imputado, tienes derecho a ser asistido por un abogado desde los primeros actos de la investigación. Aun como testigo, puedes solicitar apoyo y asesoría, especialmente si el contenido de tu declaración puede comprometerte indirectamente.",
        },
        {
            question: "¿Qué pasa si me citan como testigo y no comparezco?",
            answer: "La ley contempla apercibimientos para quienes legalmente citados no comparecen sin causa justificada, que pueden incluir la comparecencia por medio de la fuerza pública. Si tienes un impedimento real, conviene comunicarlo a la Fiscalía o al tribunal con antelación y solicitar la reprogramación.",
        },
        {
            question: "¿Qué ocurre si miento en mi declaración?",
            answer: "El testigo debe declarar la verdad. Faltar a ella puede constituir un delito de falso testimonio con consecuencias penales. Por eso, si no recuerdas algo o tienes dudas, es preferible decirlo abiertamente que afirmar datos que no puedes respaldar.",
        },
        {
            question: "¿La víctima está obligada a declarar?",
            answer: "La víctima tiene derechos y puede declarar para aportar su versión, pero en casos de vulnerabilidad la ley contempla protecciones especiales. En general su participación es importante para la investigación, aunque puede coordinarse la forma y condiciones de su declaración.",
        },
        {
            question: "¿Puedo negarme a responder algunas preguntas?",
            answer: "Como testigo, fuera de las excepciones legales (parientes del imputado o secreto profesional), debes responder. Como imputado, puedes guardar silencio total o responder solo algunas preguntas. Es importante que un abogado te oriente sobre qué conviene en tu caso específico.",
        },
    ];

    return (
        <div className="min-h-screen bg-white">
            <BlogGrowthHacks
                title="Declarar en la Fiscalía en Chile 2026: guía para imputados, testigos y víctimas"
                description="Conoce cómo funciona una declaración en la Fiscalía de Chile, qué derechos tienes como imputado, testigo o víctima, si estás obligado a declarar y cómo prepararte."
                image="/assets/declarar-fiscalia-imputado-testigo-chile-2026.png"
                url="https://legalup.cl/blog/declarar-fiscalia-imputado-testigo-chile-2026"
                datePublished="2026-08-05"
                dateModified="2026-08-05"
                faqs={faqs}
            />

            <Header onAuthClick={() => { }} />
            <ReadingProgressBar />

            {/* HERO */}
            <div className="bg-[#f4efdf] text-white py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
                    <div className="flex items-center gap-2 mb-4 text-green-500"><Link to="/blog" className="hover:text-green-900 transition-colors">
                            Blog
                        </Link>
                        <ChevronRight className="h-4 w-4" />
                        <span>Artículo</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-bold text-green-900 font-serif mb-6">
                        Declarar en la Fiscalía en Chile 2026: guía para imputados, testigos y víctimas
                    </h1>

                    <div className="bg-white backdrop-blur-sm border rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2 text-green-900">
                            {[
                                "Los derechos y obligaciones al declarar cambian según tu rol: imputado, testigo o víctima.",
                                "El imputado nunca está obligado a declarar: tiene derecho a guardar silencio.",
                                "El testigo, por regla general, debe comparecer y declarar verazmente.",
                                "El imputado tiene derecho a estar asistido por un abogado durante su declaración.",
                                "Preparar la declaración y conocer tus derechos reduce errores que pueden afectar el proceso.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl text-green-900">
                        Ser citado a declarar a la Fiscalía es una experiencia que genera dudas en todas las personas: ¿estoy obligado?, ¿puedo llevar abogado?, ¿qué pasa si miento o si me equivoco? La respuesta correcta depende, ante todo, del rol que ocupes en la investigación.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6 text-green-900">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>5 de Agosto, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="declarar-fiscalia-imputado-testigo-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white border sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Declarar en la Fiscalía en Chile 2026"
                        url="https://legalup.cl/blog/declarar-fiscalia-imputado-testigo-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            La declaración es una de las diligencias más importantes de la investigación penal en Chile. A través de ella, la Fiscalía reúne la información que necesita para decidir si acusa, sobresee o aplica una salida alternativa, y los antecedentes que entregues pueden influir directamente en el desarrollo del caso.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía actualizada para 2026 explicamos cómo funciona una declaración ante la Fiscalía, cuáles son tus derechos según tu rol y cómo prepararte para rendir tu versión de la manera más segura posible.
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
                                to="/blog/formalizacion-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                formalización de la investigación
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

                    {/* ROLES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuál es tu rol en la investigación?</h2>
                        <p className="text-gray-600 mb-4">Antes de preparar tu declaración, debes identificar el rol que se te asigna. De él dependen tus derechos y obligaciones.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 p-3 text-left font-bold">Rol</th>
                                        <th className="border border-gray-300 p-3 text-left font-bold">¿Debe declarar?</th>
                                        <th className="border border-gray-300 p-3 text-left font-bold">Derechos clave</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Testigo</td>
                                        <td className="border border-gray-300 p-3">Sí, por regla general.</td>
                                        <td className="border border-gray-300 p-3">Excepciones por parentesco con el imputado o secreto profesional.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Víctima</td>
                                        <td className="border border-gray-300 p-3">Puede declarar; su participación se protege especialmente.</td>
                                        <td className="border border-gray-300 p-3">Derecho a información, protección y medidas especiales según el caso.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Imputado</td>
                                        <td className="border border-gray-300 p-3">No está obligado: puede guardar silencio.</td>
                                        <td className="border border-gray-300 p-3">Derecho a abogado, a no autoincriminarse y a no declarar bajo juramento.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-gray-600 mt-4">Identificar tu rol de forma correcta evita errores y permite ejercer tus garantías.</p>
                    </div>

                    <RelatedLawyers category="Derecho Penal" />

                    {/* TESTIGO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo declarar como testigo?</h2>
                        <p className="text-gray-600 mb-4">
                            Si fuiste citado como testigo, la ley te impone el deber de comparecer y declarar sobre los hechos que conoces. Tu declaración debe ser veraz: faltar a la verdad puede configurar un delito de falso testimonio.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Sin embargo, no estás obligado a declarar en ciertos casos. Por ejemplo, los parientes cercanos del imputado (cónyuge, conviviente, ascendientes, descendientes y colaterales hasta el segundo grado) pueden abstenerse de declarar en su contra, y quienes tienen deber de secreto profesional solo pueden negarse respecto de esa información.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">Si no estás seguro de si te corresponde alguna excepción, es prudente consultarlo antes de la diligencia con un abogado, especialmente si tu relación con el imputado podría invocarse como causal de abstención.</p>
                        </div>
                    </div>

                    {/* IMPUTADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo declarar como imputado?</h2>
                        <p className="text-gray-600 mb-4">
                            Si eres imputado, la ley te reconoce el derecho a no declarar contra ti mismo. Puedes guardar silencio total o parcial, y nadie puede obligarte a declarar. Tampoco prestas juramento ni promesa de decir la verdad, precisamente porque la ley protege tu derecho a no autoincriminarte.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Tienes derecho a estar asistido por un abogado desde los primeros actos de la investigación. Si decides declarar, es altamente recomendable hacerlo con tu defensa presente y después de conocer los hechos que se investigan.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="text-red-800">Declarar sin asesoría previa es uno de los errores más frecuentes y costosos en el proceso penal. Una declaración espontánea puede incorporarse a la investigación y utilizarse en tu contra.</p>
                        </div>
                    </div>

                    <InArticleCTA
                        category="Derecho Penal"
                        title="¿Te citaron a declarar y no sabes qué hacer?"
                        message="Un abogado penal puede revisar tu caso, explicarte tu rol y ayudarte a decidir si conviene declarar o guardar silencio."
                    />

                    {/* VICTIMA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo declarar como víctima?</h2>
                        <p className="text-gray-600 mb-4">
                            Como víctima, tu declaración es un aporte relevante para la investigación, pero la ley contempla protecciones especiales según el tipo de delito y tu situación de vulnerabilidad.
                        </p>
                        <div className="space-y-3">
                            <div className="bg-green-50 p-4 rounded-xl">
                                <h3 className="font-bold text-green-800">Derecho a información</h3>
                                <p className="text-green-700">La Fiscalía debe informarte sobre el estado de la investigación y las decisiones relevantes que se adopten.</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-xl">
                                <h3 className="font-bold text-green-800">Medidas de protección</h3>
                                <p className="text-green-700">En casos calificados, pueden aplicarse medidas para evitar que la declaración te exponga a riesgos, coordinando la forma y condiciones de tu participación.</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-xl">
                                <h3 className="font-bold text-green-800">Apoyo especializado</h3>
                                <p className="text-green-700">En ciertos delitos (violencia intrafamiliar, delitos sexuales, entre otros) existen mecanismos de acompañamiento para víctimas.</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">Si tienes dudas sobre cómo se realizará tu declaración, puedes consultarlas directamente en la Fiscalía o con un abogado.</p>
                    </div>

                    {/* DERECHOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Derechos comunes en la declaración</h2>
                        <p className="text-gray-600 mb-4">Independientemente de tu rol, existen garantías que debes conocer antes de declarar:</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Derecho a conocer los hechos investigados", "Derecho a estar asistido por un abogado", "Derecho a no autoincriminarse (imputado)", "Derecho a solicitar la presencia de intérprete si corresponde", "Derecho a que se registre tu declaración conforme a la ley", "Protecciones especiales en casos de vulnerabilidad"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* COMO PREPARARTE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Cómo preparar tu declaración</h2>
                        <p className="text-gray-600 mb-4">Una buena preparación reduce el riesgo de errores y contradicciones.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Confirma el motivo de la citación y tu rol", "Ordena tu relato cronológicamente", "Identifica qué sabes con certeza y qué no recuerdas", "Reúne documentos o registros que respalden tu versión", "Evita afirmar datos que no puedes respaldar", "Consulta con un abogado si el caso lo amerita"].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 flex-shrink-0">✓</span>
                                    <span className="text-gray-700 font-bold">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Declarar con claridad y honestidad protege tanto al proceso como tu propia situación.</p>
                    </div>

                    {/* ERRORES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes al declarar</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Declarar sin abogado siendo imputado", desc: "Tienes derecho a defensa desde el inicio. Declarar solo, sin conocer los antecedentes, puede perjudicarte gravemente." },
                                    { title: "Inventar o exagerar información", desc: "Como testigo, afirmar datos falsos puede constituir falso testimonio. Es preferible decir que no recuerdas a inventar." },
                                    { title: "No llevar documentos que respaldan tu versión", desc: "Los registros y documentos pueden ser decisivos. Llevarlos ordenados desde la primera declaración evita reconstrucciones posteriores." },
                                    { title: "Ignorar la citación", desc: "No comparecer sin causa justificada puede generar apercibimientos, incluida la comparecencia por medio de la fuerza pública." },
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

                    {/* SILENCIO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Puedo guardar silencio o negarme a declarar?</h2>
                        <p className="text-gray-600 mb-4">
                            Depende del rol en que comparescas. Si declaras como imputado, la ley te reconoce el derecho a guardar silencio y a no declarar contra ti mismo. Puedes optar por no declarar, y esa decisión no debiera interpretarse como un reconocimiento de culpabilidad. Si decides declarar, lo recomendable es hacerlo con tu abogado y después de conocer los antecedentes básicos de la investigación.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Si compareces como testigo, en general existe el deber de declarar la verdad, salvo que existan causales legales de abstención. Entre las más comunes están los vínculos con el imputado: el cónyuge o conviviente, los ascendientes, descendientes y colaterales hasta el segundo grado, así como el pupilo o guardador y el adoptante o adoptado, pueden abstenerse de declarar. La abstención debe comunicarse y fundarse en la causal correspondiente antes de la diligencia.
                        </p>
                        <p className="text-gray-600">
                            En cualquier caso, faltar a la verdad al declarar puede tener consecuencias: los testigos que afirman hechos falsos pueden enfrentar sanciones por falso testimonio. Si tienes dudas sobre si te corresponde declarar o abstenerte, una consulta previa con un abogado es la forma más segura de resolverlo.
                        </p>
                    </div>

                    {/* CUANDO ABOGADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo conviene consultar a un abogado antes de declarar?</h2>
                        <p className="text-gray-600 mb-4">Si bien no toda declaración requiere un abogado, hay situaciones donde la asesoría previa es especialmente recomendable:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Si declaras como imputado", "Si el contenido de tu declaración puede comprometerte", "Si tu relación con el imputado podría ser causal de abstención", "Si ya declaraste antes y necesitas aclarar tu versión", "Si tienes dudas sobre qué documentos entregar", "Si recibiste la citación después de mucho tiempo"].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 flex-shrink-0">•</span>
                                    <span className="text-gray-700 font-bold">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Una asesoría temprana permite tomar decisiones informadas y proteger tus derechos durante toda la investigación.</p>
                    </div>

                    <InArticleCTA
                        title="¿Necesitas preparar tu declaración ante la Fiscalía?"
                        message="Un abogado penalista puede revisar tu caso, explicarte las opciones y acompañarte en la diligencia si corresponde."
                        buttonText="Habla con un abogado penal ahora"
                        category="Derecho Penal"
                    />

                    {/* DESPUES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Qué ocurre después de declarar</h2>
                        <p className="text-gray-600 mb-4">
                            Después de la declaración, la Fiscalía continúa la investigación con los antecedentes recabados. Puede citarte nuevamente para aclarar puntos, realizar diligencias adicionales o decidir el curso del procedimiento: formalizar la investigación, archivar el caso o pedir el sobreseimiento, entre otras opciones.
                        </p>
                        <p className="text-gray-600 mb-4">
                            En la práctica, tu declaración se incorpora al expediente y puede ser utilizada en etapas posteriores, incluso en el juicio oral. Por eso es relevante declarar de forma ordenada, precisa y fiel a los hechos, evitando contradicciones que puedan restar credibilidad a tu versión.
                        </p>
                        <p className="text-gray-600">
                            Si con el tiempo recuerdas algo importante o cambian las circunstancias, comunícalo oportunamente a la Fiscalía o a tu abogado. Mantener una versión consistente y respaldada por documentos refuerza la solidez de lo que declaraste.
                        </p>
                    </div>

                    {/* CONCLUSION */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Declarar en la Fiscalía es una diligencia de alto impacto en el proceso penal chileno. Lo que digas puede influir en la investigación, en la decisión de acusar y en el desarrollo del juicio.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Por eso, antes de declarar conviene conocer tu rol, tus derechos y las consecuencias de lo que dirás. Si eres imputado, nunca estás obligado a declarar en tu contra; si eres testigo o víctima, tu aporte es valioso y debe hacerse con claridad y honestidad. Si quieres profundizar, revisa nuestras guías sobre{" "}
                            <Link to="/blog/citacion-fiscalia-chile-2026" className="text-green-700 underline hover:text-green-500">citación de la Fiscalía</Link>
                            ,{" "}
                            <Link to="/blog/formalizacion-chile-2026" className="text-green-700 underline hover:text-green-500">la formalización de la investigación</Link>{" "}
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
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre declarar en la Fiscalía</h2>
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
                        title="Declarar en la Fiscalía en Chile 2026"
                        url="https://legalup.cl/blog/declarar-fiscalia-imputado-testigo-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="declarar-fiscalia-imputado-testigo-chile-2026" />

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
            <BlogConversionPopup category="Derecho Penal" topic="declarar-fiscalia" />
        </div>
    );
};

export default BlogArticle;