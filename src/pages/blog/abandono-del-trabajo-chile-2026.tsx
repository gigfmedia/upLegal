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
            question: "¿Cuántos días debo faltar para que exista abandono del trabajo?",
            answer:
            "La ley no establece un número fijo de días. Lo relevante es que concurran los requisitos de la causal prevista en el artículo 160 del Código del Trabajo y que el empleador pueda acreditarlos ante el tribunal. Una ausencia prolongada e injustificada, especialmente combinada con otras conductas, puede configurar la causal.",
        },
        {
            question: "¿Si falto un día pueden despedirme por abandono del trabajo?",
            answer:
            "No necesariamente. Una ausencia aislada de un día generalmente no constituye abandono del trabajo en los términos que exige la ley. Para que la causal sea válida debe existir una ausencia injustificada de cierta entidad o una conducta que demuestre la intención del trabajador de no continuar con sus funciones. El empleador debe poder acreditar eso ante el tribunal.",
        },
        {
            question: "¿La empresa debe demostrar el abandono del trabajo?",
            answer:
            "Sí. En un juicio laboral corresponde al empleador probar los hechos concretos que fundamentan la causal de despido invocada. Si no puede acreditarlo, el tribunal puede declarar el despido injustificado aunque la carta de despido cite correctamente el artículo 160.",
        },
        {
            question: "¿Puedo demandar aunque haya firmado el finiquito?",
            answer:
            "Depende de cómo firmaste el finiquito. Si lo firmaste con reserva de derechos, puedes impugnar el despido dentro del plazo legal. Si firmaste sin reserva, las posibilidades se reducen aunque no desaparecen en todos los casos. Revisar la documentación con un abogado laboral antes de asumir que perdiste el derecho es siempre recomendable.",
        },
        {
            question: "¿Qué ocurre si el tribunal rechaza la causal de abandono del trabajo?",
            answer:
            "Si el juez concluye que no existió abandono del trabajo o que el empleador no logró acreditarlo, el despido es declarado injustificado. En ese caso el empleador debe pagar indemnización por años de servicio más recargos de entre 30% y 100% según la causal invocada, además de la indemnización sustitutiva del aviso previo si corresponde.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Abandono del trabajo en Chile 2026: cuándo es causal de despido y qué consecuencias tiene"
                description="Conoce qué es el abandono del trabajo en Chile, cuándo procede como causal de despido, qué consecuencias tiene y cómo defenderte si consideras que fue aplicado injustificadamente."
                image="/assets/abandono-del-trabajo-chile-2026.png"
                url="https://legalup.cl/blog/abandono-del-trabajo-chile-2026"
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
                        Abandono del trabajo en Chile 2026: cuándo es causal de despido y qué consecuencias tiene
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "El abandono del trabajo es una causal disciplinaria del artículo 160 del Código del Trabajo.",
                                "No basta con una ausencia ocasional; la ley exige requisitos específicos.",
                                "El empleador debe probar los hechos si el trabajador impugna el despido.",
                                "Si la causal no se acredita, el despido puede ser declarado injustificado.",
                                "Si te despiden por esta causal, revisa la carta y busca asesoría legal oportunamente.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Faltar al trabajo uno o varios días no siempre constituye abandono del trabajo. Sin embargo, muchas personas reciben una carta de despido invocando esta causal sin saber si realmente corresponde o si el empleador la está aplicando correctamente.
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
                            <ReadTime slug="abandono-del-trabajo-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Abandono del trabajo en Chile 2026"
                        url="https://legalup.cl/blog/abandono-del-trabajo-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            El abandono del trabajo es una de las causales disciplinarias contempladas en el artículo 160 del Código del Trabajo, pero para que sea válida deben cumplirse requisitos específicos establecidos por la ley y desarrollados por los tribunales.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía conocerás cuándo existe abandono del trabajo, qué diferencia hay entre faltar al trabajo y abandonar las funciones, cuáles son las consecuencias para el trabajador, cuándo el empleador puede despedir sin indemnización y qué hacer si consideras que la causal fue aplicada de manera injustificada.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando un conflicto laboral, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/articulo-160-codigo-trabajo-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                artículo 160 del Código del Trabajo
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/carta-de-despido-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                carta de despido
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

                    {/* QUE ES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es el abandono del trabajo?</h2>
                        <p className="text-gray-600 mb-4">
                            El abandono del trabajo es una conducta mediante la cual el trabajador deja de cumplir deliberadamente sus obligaciones laborales en situaciones expresamente previstas por el Código del Trabajo.
                        </p>
                        <p className="text-gray-600 mb-4">
                            No basta con una ausencia ocasional o un atraso. La ley exige circunstancias específicas que demuestren un incumplimiento grave de las obligaciones del contrato.
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">
                                Por ello, antes de despedir a un trabajador por esta causal, el empleador debe analizar cuidadosamente los hechos y contar con antecedentes suficientes para acreditarlos.
                            </p>
                        </div>
                    </div>

                    {/* DONDE ESTA REGULADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Dónde está regulado?</h2>
                        <p className="text-gray-600 mb-4">
                            El abandono del trabajo se encuentra regulado en el artículo 160 N.º 4 del Código del Trabajo.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Esta disposición permite al empleador poner término al contrato cuando el trabajador incurre en determinadas conductas relacionadas con el abandono de sus funciones o la negativa injustificada a prestar servicios.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">Al tratarse de una causal disciplinaria, el empleador tiene la carga de probar los hechos si el trabajador decide impugnar el despido ante los tribunales.</p>
                        </div>
                    </div>

                    <RelatedLawyers category="Derecho Laboral" />

                    {/* CUANDO EXISTE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo existe abandono del trabajo?</h2>
                        <p className="text-gray-600 mb-4">La ley contempla principalmente dos situaciones.</p>

                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">1. Abandonar injustificadamente el lugar de trabajo</h3>
                                <p className="text-gray-600">Ocurre cuando el trabajador deja su puesto durante la jornada sin autorización y sin una causa que lo justifique.</p>
                                <ul className="mt-2 space-y-1 text-gray-600 text-sm">
                                    <li>• Retirarse antes del término de la jornada sin permiso</li>
                                    <li>• Abandonar una faena dejando tareas críticas sin ejecutar</li>
                                    <li>• Salir del establecimiento durante el horario laboral sin autorización</li>
                                </ul>
                                <div className="bg-amber-50 p-3 rounded-xl mt-2">
                                    <p className="text-amber-800 text-sm">No toda salida constituye automáticamente abandono. Será necesario analizar el contexto, la duración, la existencia de permisos y la gravedad de las consecuencias.</p>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">2. Negarse injustificadamente a trabajar</h3>
                                <p className="text-gray-600">También puede configurarse la causal cuando el trabajador se niega a ejecutar las labores para las cuales fue contratado sin una razón legal que lo justifique.</p>
                                <ul className="mt-2 space-y-1 text-gray-600 text-sm">
                                    <li>• Rechazar reiteradamente realizar funciones propias del cargo</li>
                                    <li>• Negarse a cumplir instrucciones legítimas del empleador</li>
                                    <li>• Abandonar una tarea esencial durante la jornada</li>
                                </ul>
                                <p className="text-gray-600 text-sm mt-2">En estos casos, el empleador deberá demostrar que la negativa fue injustificada y que afectó de manera relevante la relación laboral.</p>
                            </div>
                        </div>
                    </div>

                    {/* FALTAR AL TRABAJO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Faltar al trabajo significa abandono?</h2>
                        <p className="text-gray-600 mb-4">
                            No necesariamente. Esta es una de las confusiones más frecuentes. Muchas personas creen que faltar uno o dos días permite al empleador despedir inmediatamente por abandono del trabajo. Eso no es correcto.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">La simple inasistencia puede dar lugar a otras causales dependiendo de las circunstancias, pero abandono del trabajo exige los requisitos específicos establecidos en el artículo 160. Cada situación debe analizarse individualmente.</p>
                        </div>
                    </div>

                    {/* LICENCIA MEDICA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si tengo licencia médica?</h2>
                        <p className="text-gray-600 mb-4">
                            Cuando el trabajador cuenta con una licencia médica válida, las ausencias se encuentran justificadas. En consecuencia, el empleador no puede invocar abandono del trabajo únicamente por el hecho de que el trabajador no haya asistido mientras estaba con reposo autorizado.
                        </p>
                        <div className="bg-green-50 p-5 rounded-xl">
                            <p className="text-green-800">Si existe una controversia respecto de la licencia, deberá resolverse conforme a las normas aplicables, pero la sola existencia de una licencia médica normalmente excluye esta causal.</p>
                        </div>
                    </div>

                    {/* EMERGENCIA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si tuve una emergencia?</h2>
                        <p className="text-gray-600 mb-4">
                            Existen situaciones excepcionales que pueden justificar una ausencia o la necesidad de abandonar temporalmente el lugar de trabajo.
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Una urgencia médica", "Un accidente", "Una emergencia familiar grave", "Un caso fortuito o fuerza mayor"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">En estos casos será importante acreditar lo ocurrido mediante documentos, certificados u otros antecedentes que permitan demostrar que existía una razón objetiva para actuar de esa manera.</p>
                    </div>

                    {/* CTA IN-ARTICLE 1 */}
                    <InArticleCTA
                        title="¿Te despidieron por abandono del trabajo?"
                        message="Un abogado laboral puede revisar tu carta de despido y evaluar si la causal fue correctamente aplicada o si corresponde demandar por despido injustificado."
                        buttonText="Ver abogados"
                        category="Derecho Laboral"
                    />

                    {/* QUE DEBE PROBAR EL EMPLEADOR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué debe probar el empleador?</h2>
                        <p className="text-gray-600 mb-4">Si el trabajador demanda posteriormente, el empleador deberá acreditar:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Qué ocurrió exactamente", "Cuándo ocurrieron los hechos", "Por qué considera que hubo abandono del trabajo", "Qué pruebas respaldan esa conclusión"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Para ello puede presentar:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Registros de asistencia", "Cámaras de seguridad", "Correos electrónicos", "Informes internos", "Declaraciones de testigos", "Otros medios de prueba admitidos por la legislación laboral"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <div className="bg-red-50 p-5 rounded-xl mt-4">
                            <p className="text-red-800">Si la empresa no logra demostrar suficientemente los hechos, el tribunal podría declarar que el despido fue injustificado.</p>
                        </div>
                    </div>

                    {/* INDEMNIZACION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Pierdo automáticamente mi indemnización?</h2>
                        <p className="text-gray-600 mb-4">
                            No. El trabajador solo perderá el derecho a determinadas indemnizaciones si la causal es declarada válida.
                        </p>
                        <div className="bg-green-50 p-5 rounded-xl">
                            <p className="text-green-800">Si posteriormente un tribunal concluye que el abandono del trabajo nunca existió o que la empresa no logró probarlo, el trabajador puede recuperar el derecho a las indemnizaciones legales e incluso obtener los recargos establecidos por la ley.</p>
                        </div>
                    </div>

                    {/* ERRORES DE EMPRESAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué errores cometen las empresas al invocar esta causal?</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Confundir inasistencias con abandono del trabajo", desc: "No toda ausencia justifica un despido por esta causal." },
                                    { title: "Despedir sin realizar una investigación mínima", desc: "La empresa debe analizar los hechos antes de despedir." },
                                    { title: "No contar con pruebas suficientes", desc: "Sin evidencia, el empleador difícilmente podrá acreditar la causal." },
                                    { title: "Utilizar la causal por conflictos personales", desc: "La causal no puede usarse como represalia por desacuerdos." },
                                    { title: "Redactar cartas de despido demasiado genéricas", desc: "La carta debe describir hechos concretos, no solo mencionar la causal." },
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
                        <p className="text-gray-600 mt-4">Estos errores suelen ser analizados por los tribunales cuando el trabajador presenta una demanda laboral.</p>
                    </div>

                    {/* QUE HACER SI TE DESPIDEN */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué hacer si te despidieron por abandono del trabajo?</h2>
                        <p className="text-gray-600 mb-4">
                            Si recibiste una carta de despido invocando el abandono del trabajo, lo primero es revisar cuidadosamente los hechos que el empleador describe.
                        </p>
                        <p className="text-gray-600 mb-4">Verifica si la carta indica:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "La fecha exacta del supuesto abandono",
                                "Los hechos concretos que se te atribuyen",
                                "La causal específica del artículo 160 utilizada",
                                "Las razones por las cuales el empleador considera que hubo un incumplimiento grave",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <div className="bg-amber-50 p-5 rounded-xl mt-4">
                            <p className="text-amber-800">Una carta de despido genérica o poco precisa puede debilitar la posición del empleador en un eventual juicio laboral.</p>
                        </div>
                    </div>

                    {/* PUEDES DEMANDAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Puedo demandar si me despidieron por abandono del trabajo?</h2>
                        <p className="text-gray-600 mb-4">
                            Sí. El hecho de que el empleador invoque el abandono del trabajo no impide presentar una demanda. Si el tribunal concluye que la causal fue aplicada incorrectamente o que no existen pruebas suficientes, podrá declarar el despido injustificado.
                        </p>
                        <p className="text-gray-600">En ese caso, el trabajador podría recuperar las indemnizaciones que inicialmente fueron rechazadas por la empresa.</p>
                    </div>

                    {/* INDEMNIZACIONES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué indemnizaciones podrían corresponder?</h2>
                        <p className="text-gray-600 mb-4">Cuando un despido por abandono del trabajo es declarado injustificado, el trabajador podría tener derecho, según las circunstancias del caso, a:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Indemnización sustitutiva del aviso previo",
                                "Indemnización por años de servicio",
                                "Recargos legales sobre la indemnización",
                                "Remuneraciones adeudadas",
                                "Vacaciones pendientes o proporcionales",
                                "Reajustes e intereses",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Cada situación dependerá de la antigüedad del trabajador, la causal utilizada y las pruebas rendidas durante el juicio.</p>
                    </div>

                    {/* DIFERENCIAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Diferencias entre abandono del trabajo e inasistencias injustificadas</h2>
                        <p className="text-gray-600 mb-4">Aunque suelen confundirse, no son exactamente lo mismo.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 p-3 text-left font-bold">Abandono del trabajo</th>
                                        <th className="border border-gray-300 p-3 text-left font-bold">Inasistencias injustificadas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Está regulado expresamente por el artículo 160.</td>
                                        <td className="border border-gray-300 p-3">Puede dar lugar a distintas consecuencias dependiendo del caso.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Requiere un análisis específico de la conducta del trabajador.</td>
                                        <td className="border border-gray-300 p-3">No toda ausencia constituye abandono del trabajo.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Debe acreditarse judicialmente si existe demanda.</td>
                                        <td className="border border-gray-300 p-3">También requiere prueba, pero la evaluación jurídica puede ser distinta.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Puede implicar despido sin indemnización si la causal es válida.</td>
                                        <td className="border border-gray-300 p-3">No siempre permite aplicar esa consecuencia.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-gray-600 mt-4">Por esta razón, muchas cartas de despido son impugnadas exitosamente cuando el empleador confunde ambos conceptos.</p>
                    </div>

                    {/* PRUEBAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pruebas pueden ayudarte?</h2>
                        <p className="text-gray-600 mb-4">Si consideras que nunca abandonaste el trabajo o que existía una justificación, reúne toda la evidencia disponible.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Registros de asistencia",
                                "Correos electrónicos",
                                "Conversaciones de WhatsApp",
                                "Certificados médicos",
                                "Licencias médicas",
                                "Comprobantes de permisos",
                                "Testigos",
                                "Cualquier comunicación con el empleador relacionada con la ausencia",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Mientras antes recopiles estos antecedentes, más fácil será preparar una defensa adecuada.</p>
                    </div>

                    {/* CASOS DE DISCUSION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Casos en que normalmente existe discusión judicial</h2>
                        <p className="text-gray-600 mb-4">Los tribunales suelen analizar con especial cuidado situaciones como:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Trabajadores que abandonan temporalmente el lugar por una emergencia",
                                "Problemas de salud repentinos",
                                "Instrucciones contradictorias del empleador",
                                "Cambios unilaterales de funciones",
                                "Conflictos relacionados con condiciones inseguras de trabajo",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">En estos escenarios no siempre resulta evidente que exista abandono del trabajo, por lo que cada caso debe estudiarse individualmente.</p>
                    </div>

                    {/* RECOMENDACIONES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Recomendaciones si recibes una carta de despido</h2>
                        <p className="text-gray-600 mb-4">Antes de tomar cualquier decisión, procura:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Leer completamente la carta de despido",
                                "Solicitar copia de toda la documentación entregada por la empresa",
                                "Conservar el contrato de trabajo y sus anexos",
                                "Descargar las liquidaciones de sueldo",
                                "Guardar toda la evidencia disponible",
                                "Consultar con un abogado laboral antes de firmar documentos que puedan afectar tus derechos",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Una revisión temprana puede marcar una diferencia importante en un eventual juicio.</p>
                    </div>

                    {/* CTA 2 */}
                    <InArticleCTA
                        title="¿Necesitas revisar tu caso con un abogado?"
                        message="Un abogado laboral puede analizar los hechos de tu despido, evaluar las pruebas y decirte si tienes un caso sólido para demandar."
                        buttonText="Hablar con un abogado"
                        category="Derecho Laboral"
                    />

                    {/* CONCLUSION */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            El abandono del trabajo es una de las causales más utilizadas para despedir trabajadores sin indemnización, pero también una de las más discutidas ante los tribunales. No basta con que el empleador afirme que existió abandono: debe demostrar los hechos y acreditar que la conducta encuadra realmente en el artículo 160 del Código del Trabajo.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Si recibiste una carta de despido por esta causal, reúne toda la documentación disponible y busca asesoría jurídica cuanto antes. Un análisis oportuno permitirá determinar si corresponde impugnar el despido y ejercer las acciones necesarias para proteger tus derechos. Puedes consultar con un{" "}
                            <Link to="/abogados-laborales" className="text-green-700 underline hover:text-green-500">abogado laboral en Chile</Link>{" "}
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
                                to="/blog/articulo-160-codigo-trabajo-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Artículo 160 del Código del Trabajo en Chile
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
                                to="/blog/despido-injustificado-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Despido injustificado en Chile
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
                                to="/blog/nulidad-despido-chile-2026"
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
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
                <div className="mt-8">
                    <BlogShare
                        title="Abandono del trabajo en Chile 2026"
                        url="https://legalup.cl/blog/abandono-del-trabajo-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="abandono-del-trabajo-chile-2026" />

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

            <BlogConversionPopup category="Derecho Laboral" topic="abandono-trabajo" />
        </div>
    );
};

export default BlogArticle;