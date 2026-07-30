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
            question: "¿Todos los pagarés terminan en juicio ejecutivo?",
            answer:
            "No. Muchas obligaciones se pagan normalmente, se renegocian o se acuerdan antes de llegar a tribunales. El juicio ejecutivo es la vía judicial que puede usar el acreedor cuando el deudor no paga voluntariamente y el documento tiene mérito ejecutivo — pero no es el único camino ni el inevitable.",
        },
        {
            question: "¿Puedo seguir trabajando si tengo un juicio ejecutivo?",
            answer:
            "Sí. La existencia de un juicio ejecutivo no impide trabajar ni afecta tu situación laboral directamente. Lo que puede ocurrir es que si el tribunal ordena un embargo, podría retenerse parte de tu sueldo dependiendo de las circunstancias y de los montos involucrados. Eso es distinto a perder el empleo.",
        },
        {
            question: "¿Un juicio ejecutivo significa tener antecedentes penales?",
            answer:
            "No. El juicio ejecutivo es un procedimiento civil destinado al cobro de una obligación patrimonial — una deuda. No tiene ninguna relación con el sistema penal ni genera antecedentes criminales. Son vías completamente distintas del sistema judicial chileno.",
        },
        {
            question: "¿Puedo vender mis bienes si tengo una demanda ejecutiva?",
            answer:
            "Depende del estado del procedimiento. Si el tribunal ya decretó medidas cautelares o un embargo sobre bienes específicos, venderlos puede tener consecuencias legales serias. Si aún no hay medidas decretadas, la situación es distinta. Lo recomendable es revisar el estado del juicio con un abogado antes de cualquier transacción.",
        },
        {
            question: "¿Qué pasa si nunca fui notificado del juicio ejecutivo?",
            answer:
            "La notificación válida es un requisito esencial del procedimiento. Si no fuiste notificado correctamente o nunca recibiste la notificación, eso puede ser una defensa relevante dentro del juicio. Corresponde revisar cómo se practicó la notificación y en qué etapa está el proceso — para eso es importante actuar rápido antes de que el juicio avance sin tu participación.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Juicio ejecutivo en Chile 2026: qué es, cómo funciona y qué hacer si te demandan"
                description="Conoce qué es un juicio ejecutivo en Chile, cuándo puede iniciarse, qué documentos permiten demandar, cómo funciona el embargo y qué opciones tiene el deudor para defenderse."
                image="/assets/juicio-ejecutivo-chile-2026.png"
                url="https://legalup.cl/blog/juicio-ejecutivo-chile-2026"
                datePublished="2026-07-28"
                dateModified="2026-07-28"
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
                        Juicio ejecutivo en Chile 2026: qué es, cómo funciona y qué hacer si te demandan
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "El juicio ejecutivo es un procedimiento rápido para cobrar deudas respaldadas por títulos ejecutivos",
                                "Documentos como pagarés, cheques y escrituras públicas permiten iniciar este procedimiento",
                                "El embargo no es inmediato; el procedimiento tiene etapas y plazos legales",
                                "El deudor puede presentar excepciones como pago, prescripción o vicios del título",
                                "Actuar rápidamente ante una notificación puede marcar la diferencia en el resultado",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Recibir una demanda ejecutiva suele generar preocupación porque muchas personas creen que el embargo ocurre de inmediato o que ya no existe ninguna forma de defenderse. Sin embargo, un juicio ejecutivo tiene etapas, requisitos legales y mecanismos de defensa que pueden cambiar completamente el resultado del proceso.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>28 de Julio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="juicio-ejecutivo-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Juicio ejecutivo en Chile 2026"
                        url="https://legalup.cl/blog/juicio-ejecutivo-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            En Chile, este procedimiento se utiliza cuando el acreedor posee un documento que acredita una obligación clara y exigible, como un pagaré, un cheque, una escritura pública u otro título ejecutivo reconocido por la ley.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía aprenderás: qué es un juicio ejecutivo, cuándo puede iniciarse, qué documentos permiten demandar, cómo funciona el embargo, qué excepciones puede presentar el deudor, cuándo prescribe la acción ejecutiva y qué hacer si recibes una demanda.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando un conflicto por deudas, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/pagare-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                pagaré en Chile
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/prescripcion-de-deudas-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                prescripción de deudas
                            </Link>{" "}
                            {/* y{" "}
                            <Link
                                to="/blog/embargo-de-bienes-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                embargo de bienes
                            </Link>. */}
                        </p>
                    </div>

                    {/* QUE ES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es un juicio ejecutivo?</h2>
                        <p className="text-gray-600 mb-4">
                            El juicio ejecutivo es un procedimiento judicial destinado a cobrar rápidamente una deuda cuando existe un documento que demuestra claramente la obligación de pago.
                        </p>
                        <p className="text-gray-600 mb-4">
                            A diferencia de un juicio ordinario, aquí no se discute inicialmente si la deuda existe o no. La ley presume que la obligación ya está acreditada mediante un título ejecutivo, por lo que el proceso busca principalmente obtener el pago.
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">Por esta razón, el acreedor puede solicitar desde el inicio medidas como el embargo de bienes si el deudor no paga oportunamente.</p>
                        </div>
                    </div>

                    {/* QUE SIGNIFICA DEMANDA EJECUTIVA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué significa demanda ejecutiva?</h2>
                        <p className="text-gray-600 mb-4">
                            Una demanda ejecutiva es el escrito presentado ante el tribunal mediante el cual el acreedor solicita iniciar el juicio ejecutivo.
                        </p>
                        <p className="text-gray-600 mb-4">En ella normalmente se acompaña:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "El documento que acredita la deuda",
                                "El monto adeudado",
                                "Intereses",
                                "Reajustes",
                                "Costas judiciales",
                                "Solicitud de requerimiento de pago",
                                "Eventual embargo de bienes",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">No basta con afirmar que existe una deuda. Debe acompañarse un documento que la ley reconozca como título ejecutivo.</p>
                    </div>

                    <RelatedLawyers category="Derecho Civil" />

                    {/* QUE DOCUMENTOS PERMITEN INICIAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué documentos permiten iniciar un juicio ejecutivo?</h2>
                        <p className="text-gray-600 mb-4">No cualquier documento sirve. Los más comunes son:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Pagaré",
                                "Cheque",
                                "Letra de cambio",
                                "Escritura pública",
                                "Sentencia firme",
                                "Contrato con mérito ejecutivo en los casos establecidos por la ley",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <div className="bg-amber-50 p-5 rounded-xl mt-4">
                            <p className="text-amber-800">En la práctica, el documento más utilizado entre particulares suele ser el pagaré. Por eso, si firmaste uno, es importante comprender cómo funciona antes de asumir que perderás automáticamente el juicio.</p>
                        </div>
                    </div>

                    {/* Primer InArticleCTA */}
                    <div className="mb-12">
                        <div className="bg-cream-900 rounded-2xl p-8 border border-gray-200 text-center">
                            <h3 className="text-2xl font-bold font-serif text-green-900 mb-2">¿Necesitas generar un pagaré válido para respaldar una deuda?</h3>
                            <p className="text-green-900 mb-4">En LegalUp puedes crear un Mandato Pagaré completamente online, basado en un formato profesional y listo para utilizar.</p>
                            <Link
                                to="/documentos/pagare"
                                className="inline-block bg-gray-900 text-white font-bold px-6 py-3 rounded-lg hover:bg-green-900 transition-colors"
                            >
                                Generar Mandato Pagaré →
                            </Link>
                        </div>
                    </div>

                    {/* SIEMPRE PAGARE PERMITE DEMANDAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Siempre un pagaré permite demandar?</h2>
                        <p className="text-gray-600 mb-4">
                            En la mayoría de los casos sí. Pero existen situaciones donde el deudor puede presentar defensas.
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Deuda prescrita",
                                "Firma falsificada",
                                "Pago ya realizado",
                                "Nulidad del documento",
                                "Defectos legales del pagaré",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Por ello, incluso cuando existe un pagaré firmado, todavía pueden existir opciones jurídicas para defenderse.</p>
                        <p className="text-gray-600 mt-4">
                            Relacionado: Si quieres entender cómo funciona este documento, revisa nuestra guía sobre{" "}
                            <Link to="/blog/pagare-chile-2026" className="text-green-700 underline hover:text-green-500">Pagaré en Chile 2026</Link>.
                        </p>
                    </div>

                    {/* CUANDO PUEDE INICIARSE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo puede iniciarse un juicio ejecutivo?</h2>
                        <p className="text-gray-600 mb-4">Generalmente cuando:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "La deuda ya venció",
                                "El pago era exigible",
                                "Existe un título ejecutivo válido",
                                "El acreedor decide acudir a tribunales",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">No es necesario esperar años. Muchas acciones ejecutivas comienzan pocos meses después del incumplimiento.</p>
                    </div>

                    {/* COMO COMIENZA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo comienza el procedimiento?</h2>
                        <p className="text-gray-600 mb-4">El proceso normalmente sigue estas etapas:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Presentación de la demanda",
                                "Revisión del tribunal",
                                "Resolución que despacha mandamiento de ejecución y embargo",
                                "Requerimiento de pago al deudor",
                                "Plazo para presentar excepciones",
                                "Eventual embargo",
                                "Remate de bienes si corresponde",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-gray-900 font-bold">{i + 1}.</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Aunque suele hablarse del embargo como si fuera inmediato, en realidad el procedimiento contempla varias etapas previas.</p>
                    </div>

                    {/* REQUERIMIENTO DE PAGO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es el requerimiento de pago?</h2>
                        <p className="text-gray-600 mb-4">
                            Es la actuación mediante la cual se informa formalmente al deudor que existe una demanda ejecutiva en su contra.
                        </p>
                        <p className="text-gray-600 mb-4">En ese momento el receptor judicial normalmente:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Entrega copia de la demanda",
                                "Comunica el monto reclamado",
                                "Requiere el pago",
                                "Puede practicar embargo si corresponde",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Desde esa notificación comienzan a correr diversos plazos legales.</p>
                    </div>

                    {/* EMBARGO AUTOMATICO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿El embargo ocurre automáticamente?</h2>
                        <p className="text-gray-600 mb-4">
                            No. Existe mucha desinformación respecto a este punto. El embargo no significa que el acreedor se lleve inmediatamente los bienes del deudor.
                        </p>
                        <p className="text-gray-600">
                            Primero deben cumplirse diversas actuaciones procesales. Además, muchos bienes pueden quedar protegidos por las reglas sobre bienes inembargables establecidas en la legislación chilena.
                        </p>
                    </div>

                    {/* QUE BIENES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué bienes pueden embargarse?</h2>
                        <p className="text-gray-600 mb-4">Dependiendo del caso, podrían embargarse:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Vehículos",
                                "Inmuebles",
                                "Cuentas bancarias",
                                "Derechos",
                                "Bienes muebles de valor",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Sin embargo, la ley también protege determinados bienes indispensables para la subsistencia del deudor y su familia.</p>
                    </div>

                    {/* SI NO TENGO BIENES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si no tengo bienes?</h2>
                        <p className="text-gray-600 mb-4">
                            El hecho de no poseer bienes embargables no elimina automáticamente la deuda. El acreedor puede continuar realizando gestiones de cobro mientras la acción no haya prescrito.
                        </p>
                        <p className="text-gray-600">Además, la situación patrimonial del deudor puede cambiar con el tiempo.</p>
                    </div>

                    {/* PUEDO DEFENDERME */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Puedo defenderme?</h2>
                        <p className="text-gray-600 mb-4">
                            Sí. Ese es uno de los errores más frecuentes. Muchas personas creen que una demanda ejecutiva significa que ya perdieron. No es así.
                        </p>
                        <p className="text-gray-600">La ley permite presentar diversas excepciones dentro del plazo correspondiente.</p>
                    </div>

                    {/* DEFENSAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué defensas puede presentar el deudor?</h2>
                        <p className="text-gray-600 mb-4">
                            Aunque el juicio ejecutivo busca facilitar el cobro de una deuda, eso no significa que el deudor no tenga derecho a defenderse. El Código de Procedimiento Civil permite presentar diversas excepciones, siempre que se interpongan dentro del plazo legal.
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Pago de la deuda",
                                "Prescripción",
                                "Falta de requisitos del título ejecutivo",
                                "Nulidad de la obligación",
                                "Falsificación de la firma",
                                "Compensación",
                                "Remisión o condonación de la deuda",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Cada una debe analizarse según las circunstancias del caso y la documentación disponible.</p>
                    </div>

                    {/* PLAZO PARA DEFENDERME */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuánto tiempo tengo para defenderme?</h2>
                        <p className="text-gray-600 mb-4">
                            El plazo depende principalmente de la forma en que fue practicada la notificación. Por esa razón, es importante actuar rápidamente apenas se recibe la demanda.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="text-red-800">Esperar varios días antes de consultar con un abogado puede significar perder oportunidades procesales importantes.</p>
                        </div>
                    </div>

                    {/* QUE PASA SI NO RESPONDO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si no respondo la demanda?</h2>
                        <p className="text-gray-600 mb-4">
                            Si el deudor no ejerce oportunamente sus defensas, el juicio continúa. En ese escenario el acreedor podrá solicitar que avance el procedimiento hasta obtener el pago mediante los mecanismos que contempla la ley, incluyendo el remate de bienes embargados cuando corresponda.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="text-red-800">No responder una demanda nunca es una buena estrategia.</p>
                        </div>
                    </div>

                    {/* PRESCRIPCION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo prescribe un juicio ejecutivo?</h2>
                        <p className="text-gray-600 mb-4">
                            La acción ejecutiva no es eterna. En términos generales, la acción para exigir judicialmente el cumplimiento de una obligación mediante juicio ejecutivo prescribe en los plazos establecidos por la legislación para cada tipo de título ejecutivo.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Una vez cumplidos esos plazos, el deudor puede alegar la prescripción como defensa. Sin embargo, la prescripción no opera automáticamente. Debe ser alegada dentro del juicio.
                        </p>
                        <p className="text-gray-600">
                            Si quieres conocer los distintos plazos según el tipo de deuda, revisa nuestra guía sobre{" "}
                            <Link to="/blog/prescripcion-de-deudas-chile-2026" className="text-green-700 underline hover:text-green-500">Prescripción de deudas en Chile 2026</Link>.
                        </p>
                    </div>

                    {/* QUE PASA SI PRESCRIBE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si la deuda prescribe?</h2>
                        <p className="text-gray-600 mb-4">
                            Cuando el tribunal acoge la excepción de prescripción, el acreedor pierde la posibilidad de utilizar esa acción ejecutiva para cobrar la obligación.
                        </p>
                        <p className="text-gray-600">Eso no significa necesariamente que la deuda "desaparezca", sino que cambia la posibilidad jurídica de exigir su cumplimiento por esa vía. Cada caso debe analizarse individualmente.</p>
                    </div>

                    {/* INTERESES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa con los intereses?</h2>
                        <p className="text-gray-600 mb-4">
                            En un juicio ejecutivo normalmente no solo se cobra el capital. También pueden incluirse:
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Intereses",
                                "Reajustes",
                                "Costas judiciales",
                                "Gastos procesales",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Por ello, mientras más tiempo transcurra sin resolver la situación, mayor puede ser el monto reclamado.</p>
                    </div>

                    {/* DIFERENCIA CON ORDINARIO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué diferencia existe entre un juicio ejecutivo y un juicio ordinario?</h2>
                        <p className="text-gray-600 mb-4">Aunque ambos son procedimientos judiciales, tienen objetivos distintos.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 p-3 text-left font-bold">Juicio Ejecutivo</th>
                                        <th className="border border-gray-300 p-3 text-left font-bold">Juicio Ordinario</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Existe un título ejecutivo</td>
                                        <td className="border border-gray-300 p-3">La deuda debe probarse</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Procedimiento más rápido</td>
                                        <td className="border border-gray-300 p-3">Procedimiento más extenso</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Puede existir embargo</td>
                                        <td className="border border-gray-300 p-3">No necesariamente</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">El debate se centra en las excepciones</td>
                                        <td className="border border-gray-300 p-3">Se discute toda la existencia de la obligación</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-gray-600 mt-4">Por esta razón, cuando existe un pagaré o un reconocimiento de deuda correctamente firmado, normalmente el acreedor opta por un juicio ejecutivo.</p>
                    </div>

                    {/* ME PUEDEN EMBARGAR INMEDIATAMENTE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Me pueden embargar inmediatamente?</h2>
                        <p className="text-gray-600 mb-4">
                            No necesariamente. Existe la idea de que apenas llega la demanda el receptor judicial retira bienes del domicilio. Eso no refleja cómo funciona normalmente el procedimiento.
                        </p>
                        <p className="text-gray-600">
                            Primero deben cumplirse diversas actuaciones judiciales y respetarse los derechos procesales del deudor. Además, la legislación protege ciertos bienes que no pueden embargarse.
                        </p>
                    </div>

                    {/* CONVIENE NEGOCIAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Conviene negociar antes del juicio?</h2>
                        <p className="text-gray-600 mb-4">
                            En muchos casos sí. Cuando ambas partes están dispuestas a conversar, puede ser posible alcanzar acuerdos como:
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Pago en cuotas",
                                "Rebaja de intereses",
                                "Ampliación del plazo",
                                "Refinanciamiento",
                                "Pago parcial",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Negociar oportunamente suele ser menos costoso que enfrentar un juicio completo.</p>
                    </div>

                    {/* QUE PASA SI YA EXISTE EMBARGO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si ya existe un embargo?</h2>
                        <p className="text-gray-600">
                            Incluso cuando el procedimiento ya avanzó, todavía pueden existir alternativas legales dependiendo de la etapa del juicio. Cada situación requiere un análisis específico. Por eso resulta recomendable consultar con un abogado apenas se recibe una notificación judicial.
                        </p>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Ignorar la demanda", desc: "Es el error más grave y puede resultar en un embargo sin haber ejercido defensas." },
                                    { title: "Creer que la deuda desaparece sola", desc: "El tiempo no elimina automáticamente una obligación." },
                                    { title: "Pensar que el embargo ocurre inmediatamente", desc: "El procedimiento tiene etapas y plazos que deben respetarse." },
                                    { title: "Firmar acuerdos sin leerlos", desc: "Un mal acuerdo puede empeorar la situación." },
                                    { title: "No revisar si la deuda ya prescribió", desc: "La prescripción es una defensa que debe alegarse oportunamente." },
                                    { title: "Esperar hasta el remate para buscar asesoría", desc: "Mientras antes se revise el caso, mayores suelen ser las alternativas disponibles." },
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

                    {/* COMO EVITAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo evitar un juicio ejecutivo?</h2>
                        <p className="text-gray-600 mb-4">No siempre es posible. Sin embargo, existen medidas que reducen considerablemente el riesgo:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Mantener respaldos de todos los pagos realizados",
                                "Conservar comprobantes y transferencias",
                                "Revisar cuidadosamente cualquier pagaré antes de firmarlo",
                                "Negociar directamente con el acreedor cuando existan dificultades económicas",
                                "Buscar asesoría jurídica antes de responder una demanda",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl mb-6">
                        <p className="font-bold text-amber-900">Los plazos no se detienen</p>
                        <p className="text-amber-800">Si fuiste notificado de una demanda ejecutiva, el reloj corre. Los plazos para presentar excepciones son limitados y una vez vencidos, el tribunal puede ordenar el embargo sin que hayas podido defenderte. Actuar hoy puede marcar la diferencia.</p>
                    </div>

                    {/* Segundo InArticleCTA */}
                    <InArticleCTA
                        title="¿Recibiste una demanda ejecutiva o una notificación de embargo?"
                        message="Un abogado civil puede revisar tu caso, analizar las defensas disponibles y orientarte sobre la mejor estrategia para proteger tus derechos."
                        buttonText="Hablar con un abogado civil"
                        category="Derecho Civil"
                    />

                    {/* CONCLUSION */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            El juicio ejecutivo es uno de los mecanismos más utilizados en Chile para cobrar judicialmente deudas respaldadas por documentos como pagarés, cheques o reconocimientos de deuda.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Aunque el procedimiento busca facilitar el cobro al acreedor, el deudor mantiene derechos importantes, incluyendo la posibilidad de presentar excepciones, alegar la prescripción cuando corresponda y cuestionar la validez del título ejecutivo. Si recibiste una demanda ejecutiva o quieres saber cuáles son tus opciones antes de enfrentar un embargo, obtener asesoría jurídica temprana puede marcar una diferencia importante en el resultado del proceso. Puedes consultar con un{" "}
                            <Link to="/abogado-civil" className="text-green-700 underline hover:text-green-500">abogado civil en Chile</Link>{" "}
                            a través de LegalUp.
                        </p>
                    </div>

                    <CategoryCTA category="civil" linkText="Hablar con un abogado civil" />

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
                                to="/blog/pagare-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Pagaré en Chile 2026
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/prescripcion-de-deudas-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Prescripción de deudas en Chile
                            </Link>
                            {/* <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/embargo-de-bienes-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Embargo de bienes en Chile
                            </Link> */}
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/reconocimiento-de-deuda-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Reconocimiento de deuda en Chile
                            </Link>
                            {/* <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/cobro-de-deudas-entre-particulares-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Cobro de deudas entre particulares
                            </Link> */}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
                <div className="mt-8">
                    <BlogShare
                        title="Juicio ejecutivo en Chile 2026"
                        url="https://legalup.cl/blog/juicio-ejecutivo-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="juicio-ejecutivo-chile-2026" />

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

            <BlogConversionPopup category="Derecho Civil" topic="juicio-ejecutivo" />
        </div>
    );
};

export default BlogArticle;