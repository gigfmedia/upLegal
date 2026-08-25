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
            question: "¿Estoy obligado a asistir si la Fiscalía me cita a declarar?",
            answer: "Si te citan como testigo, en general sí: la ley establece un deber de comparecer y declarar para quienes tienen información relevante sobre un hecho investigado. La situación es distinta si la citación se dirige a ti como imputado, caso en el que tu presencia se vincula a tus garantías y derecho a defensa, pero nunca puedes ser obligado a declarar en tu contra.",
        },
        {
            question: "¿Qué pasa si no asisto a una citación de la Fiscalía?",
            answer: "Si eres testigo y no compareces sin causa justificada, el tribunal puede aplicar apercibimientos, que van desde multas hasta la comparecencia por medio de la fuerza pública. Si eres imputado, la inasistencia puede llevar a que se solicite tu detención para la audiencia respectiva. Siempre es mejor avisar y coordinar antes que dejar pasar la citación.",
        },
        {
            question: "¿Puedo negarme a declarar si me citan como testigo?",
            answer: "Existen excepciones legales: los parientes cercanos del imputado (cónyuge, conviviente, ascendientes, descendientes, hermanos) no están obligados a declarar en su contra, y quienes tienen deber de guardar secreto profesional pueden abstenerse solo respecto de ese secreto. Fuera de esos casos, el testigo debe declarar verazmente.",
        },
        {
            question: "¿Me citan a la Fiscalía y soy imputado: debo ir?",
            answer: "Sí, es recomendable asistir, pero idealmente con un abogado. Como imputado tienes derecho a conocer los hechos que se investigan, a guardar silencio y a no autoincriminarte. Presentarse con asesoría desde el inicio permite tomar decisiones informadas y proteger tus garantías.",
        },
        {
            question: "¿Puedo ir acompañado a declarar a la Fiscalía?",
            answer: "Como imputado tienes derecho a estar asistido por un abogado durante tu declaración. Como testigo, en general puedes solicitar apoyo y plantear dudas al fiscal; en ciertos casos de vulnerabilidad la ley contempla protecciones especiales para rendir declaración en condiciones adecuadas.",
        },
        {
            question: "¿Una citación de la Fiscalía significa que ya hay una denuncia en mi contra?",
            answer: "No necesariamente. Las citaciones pueden tener distintos motivos: una denuncia, una querella, o simplemente que seas testigo de un hecho que se investiga. En la citación o al asistir podrás conocer el rol que se te asigna. Si tienes dudas, conviene verificar con la Fiscalía o con un abogado.",
        },
        {
            question: "¿Qué documentos debo llevar a la citación de la Fiscalía?",
            answer: "Lleva la citación recibida, tu cédula de identidad y cualquier documento que respalde lo que puedas aportar: contratos, mensajes, registros, boletas o antecedentes médicos. En caso de dudas sobre qué entregar, un abogado puede orientarte sobre qué documentos conviene presentar y cuáles no.",
        },
        {
            question: "¿Puedo presentarme espontáneamente a la Fiscalía sin citación?",
            answer: "Sí. Si tienes información relevante sobre un hecho que se investiga, puedes acercarte a la Fiscalía y manifestar tu intención de aportar antecedentes. La declaración espontánea puede ser útil para aclarar tu situación o colaborar con la investigación.",
        },
    ];

    return (
        <div className="min-h-screen bg-white">
            <BlogGrowthHacks
                title="Citación de la Fiscalía en Chile 2026: qué hacer, cómo prepararte y si es obligatorio asistir"
                description="Conoce qué significa una citación de la Fiscalía en Chile, si es obligatorio asistir, qué pasa si no vas, cómo preparar tu declaración y cuándo conviene hablar con un abogado penal."
                image="/assets/citacion-fiscalia-chile-2026.png"
                url="https://legalup.cl/blog/citacion-fiscalia-chile-2026"
                datePublished="2026-08-03"
                dateModified="2026-08-03"
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
                        Citación de la Fiscalía en Chile 2026: qué hacer, cómo prepararte y si es obligatorio asistir
                    </h1>

                    <div className="bg-white backdrop-blur-sm border rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2 text-green-900">
                            {[
                                "Una citación de la Fiscalía puede tener distintas finalidades: testigo, víctima o imputado.",
                                "En general, el testigo tiene el deber de comparecer y declarar verazmente.",
                                "El imputado nunca puede ser obligado a declarar en su contra: tiene derecho a guardar silencio.",
                                "No asistir sin causa justificada puede generar apercibimientos, incluso comparecencia por la fuerza pública.",
                                "Asistir con un abogado desde el inicio te permite conocer el rol que se te asigna y proteger tus derechos.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl text-green-900">
                        Recibir una citación de la Fiscalía genera mucha incertidumbre. Muchas personas se preguntan si están obligadas a asistir, si se trata de una denuncia en su contra o si pueden negarse a declarar. La respuesta depende del rol que se te asigne: testigo, víctima o imputado.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6 text-green-900">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>3 de Agosto, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="citacion-fiscalia-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white border sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Citación de la Fiscalía en Chile 2026"
                        url="https://legalup.cl/blog/citacion-fiscalia-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            En Chile, la Fiscalía (Ministerio Público) dirige la investigación de los hechos que pueden constituir delito. Para reunir antecedentes, la ley le permite citar a distintas personas: testigos que presenciaron un hecho, víctimas que sufrieron un delito o imputados sobre quienes recae la sospecha de participación.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía actualizada para 2026 explicamos qué significa una citación de la Fiscalía, cuáles son tus obligaciones según el rol que se te asigne, qué pasa si no asistes y cómo prepararte para la diligencia.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando una situación penal, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/constancia-por-amenazas-en-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                constancia por amenazas
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/control-de-detencion-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                control de detención
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/declarar-fiscalia-imputado-testigo-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                cómo declarar en la Fiscalía
                            </Link>{" "}
                            y{" "}
                            <Link
                                to="/blog/formalizacion-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                la formalización de la investigación
                            </Link>.
                        </p>
                    </div>

                    {/* QUE ES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es una citación de la Fiscalía?</h2>
                        <p className="text-gray-600 mb-4">
                            La citación es la comunicación formal mediante la cual el Ministerio Público pide a una persona que comparezca a una diligencia, normalmente a prestar declaración, a participar en un reconocimiento o a aportar antecedentes dentro de una investigación penal.
                        </p>
                        <p className="text-gray-600 mb-4">
                            No se trata de una orden de detención ni de una citación al tribunal: es una convocatoria a la propia Fiscalía o a las oficinas que esta designe. Sin embargo, puede tener consecuencias importantes según el rol que se te asigne, por lo que conviene no ignorarla.
                        </p>

                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">La citación indica día, hora y lugar de la diligencia. Antes de asistir, procura confirmar el motivo de la citación y el rol en que se te convoca.</p>
                        </div>
                    </div>

                    {/* TIPOS DE CITACION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Por qué razones puede citarte la Fiscalía?</h2>
                        <p className="text-gray-600 mb-4">La citación puede tener distintos motivos, y de ellos depende tu posición en el proceso:</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 p-3 text-left font-bold">Motivo</th>
                                        <th className="border border-gray-300 p-3 text-left font-bold">Qué significa</th>
                                        <th className="border border-gray-300 p-3 text-left font-bold">Tu obligación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Testigo</td>
                                        <td className="border border-gray-300 p-3">Tienes información sobre un hecho que se investiga.</td>
                                        <td className="border border-gray-300 p-3">Deber de comparecer y declarar verazmente.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Víctima</td>
                                        <td className="border border-gray-300 p-3">Fuiste afectado por el delito investigado.</td>
                                        <td className="border border-gray-300 p-3">Puedes declarar, aportar antecedentes y ejercer tus derechos como víctima.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Imputado</td>
                                        <td className="border border-gray-300 p-3">Existen antecedentes que te vinculan con el hecho.</td>
                                        <td className="border border-gray-300 p-3">Puedes comparecer y declarar, pero nunca estás obligado a declarar en tu contra.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-gray-600 mt-4">Conocer tu rol es el primer paso para preparar la diligencia de manera adecuada.</p>
                    </div>

                    <RelatedLawyers category="Derecho Penal" />

                    {/* ES OBLIGATORIO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Es obligatorio asistir a una citación de la Fiscalía?</h2>
                        <p className="text-gray-600 mb-4">
                            La respuesta depende del rol que se te asigne. La ley establece el deber de comparecer y declarar para quienes tienen información relevante sobre un hecho investigado. Esto significa que, en general, el testigo está obligado a asistir y a declarar verazmente.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Si eres imputado, la situación es distinta: la ley te garantiza el derecho a defensa y a guardar silencio, y ninguna persona puede ser obligada a declarar contra sí misma. Aun así, comparecer tiene relevancia procesal y la inasistencia puede tener consecuencias.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                La descripción anterior refleja el marco legal general. En la práctica, cada citación depende de la etapa de la investigación y de los antecedentes reunidos por el fiscal, por lo que el resultado de la diligencia varía según el caso concreto.
                            </p>
                        </div>
                    </div>

                    {/* QUE PASA SI NO ASISTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si no asisto a la citación?</h2>
                        <p className="text-gray-600 mb-4">
                            Si eres testigo y no compareces sin causa justificada, la Fiscalía puede solicitar al tribunal que se apliquen apercibimientos. En el sistema penal chileno, quienes son legalmente citados y no comparecen pueden ser compelidos a comparecer, incluso por medio de la fuerza pública.
                        </p>
                        <p className="text-gray-600">
                            Si eres imputado, la inasistencia a una audiencia o diligencia en que tu presencia sea necesaria puede llevar a que se solicite tu detención para la celebración de la respectiva audiencia. Por eso, si tienes un impedimento, conviene comunicarlo oportunamente y solicitar la reprogramación.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl mt-4">
                            <p className="text-red-800">Dejar pasar la citación sin avisar es el error más común y también el que mayores complicaciones genera. Coordinar con la Fiscalía o con un abogado permite resolver el tema sin escalar la situación.</p>
                        </div>
                    </div>

                    {/* QUE OCURRE EN LA DILIGENCIA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre durante la diligencia?</h2>
                        <p className="text-gray-600 mb-4">Dependiendo del motivo de la citación, la diligencia puede incluir:</p>
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">1. Toma de declaración</h3>
                                <p className="text-gray-600">El fiscal o su equipo registra tu versión de los hechos. Como testigo debes decir la verdad; como imputado puedes guardar silencio o declarar con la asistencia de tu abogado.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">2. Aportes de antecedentes</h3>
                                <p className="text-gray-600">Puedes entregar documentos, fotografías, registros o cualquier elemento que ayude a la investigación. Con frecuencia se solicita dejar constancia de lo aportado.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">3. Reconocimientos u otras diligencias</h3>
                                <p className="text-gray-600">En ciertos casos la citación puede tener por objeto participar en un reconocimiento, un peritaje o un careo, según lo que la investigación requiera.</p>
                            </div>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                El desarrollo concreto de la diligencia depende del motivo de la citación y de la etapa de la investigación. En casos complejos pueden existir preguntas adicionales o diligencias complementarias que se comunicarán oportunamente.
                            </p>
                        </div>
                    </div>

                    <InArticleCTA
                        category="Derecho Penal"
                        title="¿Te citaron a la Fiscalía y tienes dudas?"
                        message="Un abogado penal puede explicarte el motivo de la citación, tu rol en la investigación y cómo preparar tu declaración."
                    />

                    {/* DERECHOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuáles son tus derechos ante una citación?</h2>
                        <p className="text-gray-600 mb-4">La legislación chilena reconoce garantías tanto al imputado como al testigo y a la víctima.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Derecho a conocer los hechos investigados", "Derecho a guardar silencio (imputado)", "Derecho a estar asistido por un abogado", "Derecho a no autoincriminarse", "Derecho a solicitar la presencia de un abogado antes de declarar", "Protecciones especiales en casos de vulnerabilidad"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Estas garantías existen con independencia del delito que se investigue y del rol que se te asigne.</p>
                    </div>

                    {/* EXCEPCIONES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Puedo negarme a declarar como testigo?</h2>
                        <p className="text-gray-600 mb-4">
                            La regla general es que el testigo debe declarar. Sin embargo, la ley contempla excepciones importantes.
                        </p>
                        <div className="space-y-3">
                            <div className="bg-green-50 p-4 rounded-xl">
                                <h3 className="font-bold text-green-800">Parientes del imputado</h3>
                                <p className="text-green-700">El cónyuge o conviviente, los ascendientes, descendientes y parientes colaterales hasta el segundo grado de consanguinidad o afinidad no están obligados a declarar en contra del imputado.</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-xl">
                                <h3 className="font-bold text-green-800">Secreto profesional</h3>
                                <p className="text-green-700">Abogados, médicos, confesores y otras personas que por su profesión tienen deber de guardar secreto pueden abstenerse, pero solo respecto de la información protegida por ese secreto.</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">Si invocas alguna de estas causales, conviene hacerlo de manera informada y, idealmente, con la orientación de un abogado.</p>
                    </div>

                    {/* COMO PREPARARTE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Cómo prepararte para tu citación</h2>
                        <p className="text-gray-600 mb-4">La preparación adecuada puede marcar una gran diferencia en cómo se desarrolla la diligencia.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Confirma el motivo y el rol de la citación", "Lleva tu cédula de identidad y la citación recibida", "Reúne los documentos que respalden tu información", "Ordena tu relato de manera cronológica", "Consulta con un abogado si tienes dudas sobre qué declarar", "Avisa oportunamente si necesitas reprogramar"].map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-600 flex-shrink-0">✓</span>
                                    <span className="text-gray-700 font-bold">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Declarar de forma clara y ordenada no solo facilita la investigación, sino que también protege tu propia situación procesal.</p>
                    </div>

                    {/* CUANDO ABOGADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo conviene consultar a un abogado antes de la citación?</h2>
                        <p className="text-gray-600 mb-4">No siempre se necesita un abogado para una declaración como testigo. Sin embargo, existen situaciones en las que la asesoría previa resulta especialmente recomendable:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Si te citan como imputado", "Si la investigación se relaciona con hechos que podrían afectarte", "Si declaraste antes y cambiaste de versión", "Si existen antecedentes que puedan interpretarse en tu contra", "Si tienes dudas sobre qué documentos entregar", "Si recibiste la citación mucho tiempo después del hecho"].map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-600 flex-shrink-0">•</span>
                                    <span className="text-gray-700 font-bold">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">En esos casos, contar con orientación jurídica antes de la diligencia puede evitar errores que se arrastran durante toda la investigación.</p>
                    </div>

                    <InArticleCTA
                        title="¿Necesitas preparar tu declaración ante la Fiscalía?"
                        message="Un abogado penalista puede revisar tu situación, explicarte el rol que se te asigna y ayudarte a decidir si conviene declarar."
                        buttonText="Habla con un abogado penal ahora"
                        category="Derecho Penal"
                    />

                    {/* DIFERENCIAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Citación, formalización y control de detención: ¿en qué se diferencian?</h2>
                        <p className="text-gray-600 mb-4">
                            Estos tres conceptos corresponden a momentos distintos del proceso penal, y entenderlos ayuda a saber qué etapa enfrentas. La citación es la notificación para comparecer ante la Fiscalía en una diligencia determinada. No presupone un estatus penal específico: puedes ser citado como testigo, como víctima o como imputado.
                        </p>
                        <p className="text-gray-600 mb-4">
                            La formalización, en cambio, es una audiencia ante el juez de garantía en la que la Fiscalía comunica formalmente al imputado que desarrolla una investigación en su contra, describe los hechos que se le atribuyen y puede solicitar medidas cautelares. El control de detención es la audiencia que se realiza cuando una persona fue detenida, para que el juez verifique que la detención fue legal y resuelva su situación.
                        </p>
                        <p className="text-gray-600">
                            Si te citaron, conviene revisar también nuestras guías sobre{" "}
                            <Link to="/blog/formalizacion-chile-2026" className="text-green-700 underline hover:text-green-500">la formalización de la investigación</Link>{" "}
                            y sobre{" "}
                            <Link to="/blog/control-de-detencion-chile-2026" className="text-green-700 underline hover:text-green-500">el control de detención</Link>{" "}
                            para ubicar tu situación dentro del proceso penal chileno.
                        </p>
                    </div>

                    {/* CONCLUSION */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Una citación de la Fiscalía no implica necesariamente que exista una denuncia en tu contra ni que vayas a ser formalizado. Puede tratarte de un testigo, una víctima o un imputado, y las obligaciones y derechos cambian según ese rol.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Lo importante es no ignorarla: averiguar el motivo, preparar la diligencia y, cuando sea necesario, contar con asesoría penal. Si quieres profundizar, revisa nuestras guías sobre{" "}
                            <Link to="/blog/declarar-fiscalia-imputado-testigo-chile-2026" className="text-green-700 underline hover:text-green-500">cómo declarar en la Fiscalía</Link>
                            ,{" "}
                            <Link to="/blog/formalizacion-chile-2026" className="text-green-700 underline hover:text-green-500">la audiencia de formalización</Link>{" "}
                            y{" "}
                            <Link to="/blog/control-de-detencion-chile-2026" className="text-green-700 underline hover:text-green-500">el control de detención</Link>. Si necesitas revisar tu situación particular, puedes consultar con un{" "}
                            <Link to="/abogados-penales" className="text-green-700 underline hover:text-green-500">
                                abogado penalista en Chile
                            </Link>.
                        </p>
                    </div>

                    <CategoryCTA category="penal" />

                    {/* FAQS */}
                    <div className="mt-12 mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre la citación de la Fiscalía</h2>
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
                        title="Citación de la Fiscalía en Chile 2026"
                        url="https://legalup.cl/blog/citacion-fiscalia-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="citacion-fiscalia-chile-2026" />

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
            <BlogConversionPopup category="Derecho Penal" topic="citacion-fiscalia" />
        </div>
    );
};

export default BlogArticle;