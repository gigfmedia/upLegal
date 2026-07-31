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
            question: "¿Qué significa ceder un derecho?",
            answer:
            "Significa transferir un derecho que pertenece a una persona — el cedente — a otra — el cesionario — conforme a las reglas aplicables al tipo de derecho involucrado. La cesión puede ser a título oneroso, como una venta, o a título gratuito, como una donación.",
        },
        {
            question: "¿Qué es un contrato de cesión de derechos?",
            answer:
            "Es el documento que establece las condiciones bajo las cuales un derecho es transferido de un cedente a un cesionario. Debe identificar claramente el derecho que se cede, las partes involucradas y las condiciones de la transferencia. Dependiendo del tipo de derecho, puede requerir formalidades específicas como escritura pública o notificación al deudor.",
        },
        {
            question: "¿Se puede ceder cualquier derecho?",
            answer:
            "No necesariamente. Algunos derechos son intransferibles por su naturaleza — como los derechos personalísimos — o porque la ley lo prohíbe expresamente. La posibilidad de ceder un derecho y las formalidades aplicables dependen del tipo de derecho y de la legislación correspondiente.",
        },
        {
            question: "¿Se puede ceder un crédito en Chile?",
            answer:
            "Sí. El Código Civil contempla reglas específicas para la cesión de créditos personales. Para que la cesión sea válida entre las partes basta el acuerdo, pero para que sea oponible al deudor y a terceros deben cumplirse los requisitos de notificación o aceptación establecidos por la ley.",
        },
        {
            question: "¿Se pueden ceder derechos hereditarios?",
            answer:
            "Sí. La legislación chilena contempla la cesión de derechos hereditarios, que implica transferir la calidad de heredero o la cuota en una herencia. Es importante distinguirla de la venta de un inmueble específico perteneciente a la herencia, ya que son operaciones distintas con requisitos y efectos diferentes.",
        },
        {
            question: "¿Se pueden ceder derechos litigiosos?",
            answer:
            "Sí. Existen reglas específicas para la cesión de derechos litigiosos — aquellos que son objeto de un juicio. El Código Civil contempla incluso el derecho de retracto, que permite al deudor rescatar el crédito pagando lo que el cesionario pagó por él, dentro de ciertos plazos.",
        },
        {
            question: "¿El deudor debe saber que se cedió el crédito?",
            answer:
            "Depende del efecto que se quiera producir. La cesión puede ser válida entre cedente y cesionario sin que el deudor lo sepa, pero para que sea oponible al deudor y a terceros generalmente se requiere notificación o aceptación. Hasta que eso ocurra, el deudor puede pagar válidamente al cedente original.",
        },
        {
            question: "¿Es lo mismo ceder derechos hereditarios que vender una propiedad?",
            answer:
            "No. Ceder derechos hereditarios implica transferir la cuota o posición de heredero en la herencia como un todo. Vender un inmueble específico de la herencia es una operación distinta que requiere otros requisitos, como la liquidación previa de la sociedad hereditaria en ciertos casos. Confundir ambas figuras puede generar problemas legales importantes.",
        },
        {
            question: "¿Conviene que un abogado revise una cesión de derechos?",
            answer:
            "Cuando existen montos importantes, inmuebles, herencias, créditos relevantes o litigios, una revisión jurídica puede detectar riesgos antes de firmar — formalidades incumplidas, derechos no cedibles, deudas ocultas o efectos imprevistos frente a terceros. Una cesión mal estructurada puede ser ineficaz o generar responsabilidades no anticipadas.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Cesión de derechos en Chile 2026: qué es, cómo funciona y qué debes saber antes de firmar"
                description="Conoce qué es una cesión de derechos en Chile, cómo funciona, qué tipos existen, qué debe contener el contrato y qué riesgos conviene revisar antes de firmar."
                image="/assets/cesion-de-derechos-chile-2026.png"
                url="https://legalup.cl/blog/cesion-de-derechos-chile-2026"
                datePublished="2026-07-31"
                dateModified="2026-07-31"
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
                        Cesión de derechos en Chile 2026: qué es, cómo funciona y qué debes saber antes de firmar
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "La cesión de derechos permite transferir un derecho de una persona a otra",
                                "Puede aplicarse a créditos, derechos hereditarios o derechos litigiosos",
                                "No todas las cesiones funcionan igual ni requieren las mismas formalidades",
                                "Es clave identificar correctamente el derecho que se está cediendo",
                                "Revisar los antecedentes antes de firmar puede evitar problemas futuros",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        La cesión de derechos es una operación jurídica mediante la cual una persona transfiere a otra un derecho que le pertenece. Puede utilizarse, entre otras situaciones, para transferir créditos, derechos hereditarios o determinados derechos relacionados con un juicio.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>31 de Julio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="cesion-de-derechos-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Cesión de derechos en Chile 2026"
                        url="https://legalup.cl/blog/cesion-de-derechos-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            En Chile, las reglas aplicables dependen del tipo de derecho que se quiera ceder. Por eso, no todas las cesiones funcionan de la misma manera ni requieren necesariamente las mismas formalidades.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Antes de firmar un contrato de cesión, es importante entender qué derecho se está transfiriendo, quién lo tiene actualmente, quién lo recibirá y qué efectos tendrá la operación frente a otras personas.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía explicamos qué es una cesión de derechos en Chile, cómo funciona, qué debe contener el contrato, qué tipos existen y qué conviene revisar antes de firmar.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás realizando una operación de compraventa o cesión, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/reconocimiento-de-deuda-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                reconocimiento de deuda
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/pagare-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                pagaré
                            </Link>{" "}
                            y{" "}
                            <Link
                                to="/blog/juicio-ejecutivo-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                juicio ejecutivo
                            </Link>.
                        </p>
                    </div>

                    {/* QUE ES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es una cesión de derechos?</h2>
                        <p className="text-gray-600 mb-4">
                            Una cesión de derechos ocurre cuando el titular de un derecho lo transfiere a otra persona.
                        </p>
                        <p className="text-gray-600 mb-4">En una cesión normalmente intervienen:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Cedente: quien transfiere el derecho.",
                                "Cesionario: quien recibe el derecho.",
                                "Derecho cedido: aquello que se está transfiriendo.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">
                            Por ejemplo, una persona puede tener un crédito de $5.000.000 contra otra y decidir transferir ese crédito a un tercero. En ese caso, quien originalmente tenía el crédito es el cedente y quien lo adquiere es el cesionario.
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl mt-4">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">La cesión puede tener diferentes características dependiendo de la naturaleza del derecho involucrado.</p>
                        </div>
                    </div>

                    {/* PARA QUE SIRVE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Para qué sirve una cesión de derechos?</h2>
                        <p className="text-gray-600 mb-4">La cesión permite transferir determinados derechos de una persona a otra. Puede utilizarse, por ejemplo, para:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Transferir un crédito",
                                "Ceder derechos hereditarios",
                                "Transferir determinados derechos litigiosos",
                                "Facilitar operaciones comerciales",
                                "Transferir derechos económicos",
                                "Reorganizar determinadas obligaciones o activos",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">La utilidad concreta depende del derecho que se esté transfiriendo y de las condiciones de la operación. Por eso, antes de utilizar un contrato de cesión, es importante identificar exactamente qué se pretende transferir.</p>
                        </div>
                    </div>

                    <RelatedLawyers category="Derecho Civil" />

                    {/* TIPOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué tipos de cesión de derechos existen en Chile?</h2>
                        <p className="text-gray-600 mb-4">No existe un único tipo de cesión. Entre las situaciones más conocidas se encuentran las siguientes.</p>

                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Cesión de créditos personales</h3>
                                <p className="text-gray-600">Es aquella en que el titular de un crédito transfiere su derecho a cobrarlo a otra persona. Por ejemplo, una empresa tiene un crédito de $10.000.000 contra un cliente y decide transferir ese crédito a otra empresa.</p>
                                <p className="text-gray-500 text-sm mt-1">El Código Civil regula la cesión de créditos personales en sus artículos 1901 y siguientes.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Cesión de derechos hereditarios</h3>
                                <p className="text-gray-600">Una persona que tiene derechos en una herencia puede realizar una cesión de sus derechos hereditarios bajo las condiciones establecidas por la legislación. Esta operación no debe confundirse automáticamente con la venta de un inmueble específico que forme parte de una herencia.</p>
                                <p className="text-gray-500 text-sm mt-1">El Código Civil contempla reglas particulares para la cesión del derecho de herencia.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Cesión de derechos litigiosos</h3>
                                <p className="text-gray-600">También existen derechos relacionados con procesos judiciales que pueden encontrarse dentro de las reglas de cesión de derechos litigiosos. En estos casos es especialmente importante conocer el estado del juicio y cuál es exactamente el derecho que se pretende transferir.</p>
                                <div className="bg-amber-50 p-3 rounded-xl mt-2">
                                    <p className="text-amber-800 text-sm">Por eso, una cesión relacionada con un litigio debería analizarse con especial cuidado.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CONTRATO DE CESION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es un contrato de cesión?</h2>
                        <p className="text-gray-600 mb-4">
                            El contrato de cesión es el documento mediante el cual las partes establecen las condiciones de la transferencia del derecho.
                        </p>
                        <p className="text-gray-600 mb-4">Dependiendo de la operación, puede establecer:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Quién es el cedente",
                                "Quién es el cesionario",
                                "Cuál es el derecho cedido",
                                "Cuál es el origen del derecho",
                                "Precio de la operación",
                                "Forma de pago",
                                "Declaraciones de las partes",
                                "Obligaciones del cedente",
                                "Obligaciones del cesionario",
                                "Fecha de la cesión",
                                "Documentación relacionada",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">El contenido debe adaptarse al tipo de derecho involucrado.</p>
                    </div>

                    <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl mb-6">
                        <p className="font-bold text-amber-900">Firmar sin revisar puede costarte caro</p>
                        <p className="text-amber-800">Una cesión mal redactada puede ser ineficaz o generarte responsabilidades que no anticipaste: ceder un derecho que no es tuyo, omitir formalidades legales o transferir algo distinto a lo que creíste. Revisar el contrato antes de firmar es mucho más barato que discutirlo después en un juicio.</p>
                    </div>

                    {/* InArticleCTA */}
                    <InArticleCTA
                        title="¿Tienes un contrato de cesión de derechos?"
                        message="Un abogado civil puede revisar el documento, identificar riesgos y explicarte qué estás transfiriendo o adquiriendo antes de que firmes."
                        buttonText="Revisar mi contrato"
                        category="Derecho Civil"
                    />

                    {/* QUE DEBE CONTENER */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué debe contener un contrato de cesión?</h2>
                        <p className="text-gray-600 mb-4">Aunque cada operación requiere un análisis particular, un contrato de cesión debería identificar claramente los elementos principales.</p>

                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Identificación de las partes</h3>
                                <p className="text-gray-600">Debe indicarse quién transfiere y quién recibe el derecho. Normalmente se incluyen datos como: nombre completo o razón social, RUT, domicilio y representante legal cuando corresponda.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Identificación del derecho</h3>
                                <p className="text-gray-600">Esta es una de las partes más importantes. El contrato debe explicar claramente qué derecho se está cediendo y cuál es su origen.</p>
                                <div className="bg-amber-50 p-3 rounded-xl mt-2">
                                    <p className="text-amber-800 text-sm">No es recomendable utilizar descripciones excesivamente generales que puedan generar dudas posteriormente.</p>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Precio y forma de pago</h3>
                                <p className="text-gray-600">Si existe un precio por la cesión, debería establecerse: monto, forma de pago, fecha, condiciones y consecuencias en caso de incumplimiento.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Declaraciones de las partes</h3>
                                <p className="text-gray-600">Dependiendo de la operación, pueden incorporarse declaraciones respecto de la titularidad, existencia o situación del derecho.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Fecha y firma</h3>
                                <p className="text-gray-600">El documento debe establecer cuándo se celebra la operación y contener las firmas correspondientes.</p>
                            </div>
                        </div>
                    </div>

                    {/* ES OBLIGATORIO POR ESCRITO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Es obligatorio hacer una cesión por escrito?</h2>
                        <p className="text-gray-600 mb-4">
                            Depende del tipo de derecho y de las formalidades que correspondan a la operación. No todas las cesiones se rigen exactamente por las mismas reglas.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                            <p className="text-amber-800 text-sm">En particular, el Código Civil establece disposiciones específicas para la cesión de créditos personales, incluyendo reglas relacionadas con la entrega del título y los efectos respecto del deudor y terceros. Por eso, no conviene asumir que cualquier cesión queda completamente perfeccionada simplemente porque las partes firmaron un documento privado.</p>
                        </div>
                    </div>

                    {/* DEUDOR DEBE ACEPTAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿El deudor debe aceptar una cesión de crédito?</h2>
                        <p className="text-gray-600 mb-4">
                            En una cesión de crédito es importante distinguir entre la relación entre cedente y cesionario y los efectos de la cesión respecto del deudor.
                        </p>
                        <p className="text-gray-600 mb-4">
                            El Código Civil establece reglas específicas para que la cesión produzca efectos frente al deudor y terceros.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                            <p className="text-amber-800 text-sm">Por eso, si una persona recibe una comunicación indicando que ahora debe pagar una deuda a alguien distinto del acreedor original, es recomendable revisar los antecedentes que respaldan la cesión. Esto no es lo mismo que cambiar al deudor de una obligación.</p>
                        </div>
                    </div>

                    {/* EJEMPLO CEDE CREDITO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa cuando se cede un crédito?</h2>
                        <div className="bg-blue-50 p-6 rounded-2xl">
                            <p className="font-bold text-blue-800 mb-2">Ejemplo:</p>
                            <p className="text-blue-700 mb-2">Supongamos que Juan tiene un crédito de $5.000.000 contra Pedro. Juan decide ceder ese crédito a María.</p>
                            <ul className="space-y-1 text-blue-700">
                                <li>• <span className="font-bold">Cedente:</span> Juan</li>
                                <li>• <span className="font-bold">Cesionario:</span> María</li>
                                <li>• <span className="font-bold">Deudor:</span> Pedro</li>
                            </ul>
                            <p className="text-blue-700 mt-2">María adquiere el derecho cedido y, dependiendo de las circunstancias y formalidades aplicables, podrá ejercer las acciones correspondientes para obtener el pago.</p>
                        </div>
                        <p className="text-gray-600 mt-4">La situación concreta dependerá del contrato, del crédito y de las reglas aplicables.</p>
                    </div>

                    {/* DERECHOS SOBRE PROPIEDAD */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Se pueden ceder derechos sobre una propiedad?</h2>
                        <p className="text-gray-600 mb-4">
                            Esta es una de las preguntas que más confusión genera. Decir que alguien "cede derechos sobre una propiedad" no necesariamente significa que esté vendiendo el inmueble.
                        </p>
                        <p className="text-gray-600 mb-4">Puede tratarse, por ejemplo, de:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Derechos hereditarios",
                                "Derechos de una comunidad",
                                "Derechos derivados de un contrato",
                                "Derechos relacionados con un litigio",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <div className="bg-red-50 p-5 rounded-xl mt-4">
                            <p className="text-red-800">Por eso es fundamental determinar qué derecho tiene realmente el cedente. Si existen inmuebles involucrados, conviene revisar los títulos y antecedentes correspondientes antes de firmar.</p>
                        </div>
                    </div>

                    {/* RIESGOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué riesgos existen al comprar o ceder derechos?</h2>
                        <p className="text-gray-600 mb-4">Una cesión puede generar problemas cuando no se revisan adecuadamente los antecedentes.</p>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "El cedente no es titular", desc: "La persona que ofrece el derecho podría no tener realmente la facultad para transferirlo." },
                                    { title: "El derecho tiene limitaciones", desc: "Puede existir alguna restricción legal o contractual que afecte la operación." },
                                    { title: "El derecho está siendo discutido", desc: "Esto puede ocurrir especialmente cuando existen procesos judiciales." },
                                    { title: "El contrato es ambiguo", desc: "Una descripción poco clara puede generar conflictos respecto de qué fue exactamente lo cedido." },
                                    { title: "No se cumplen las formalidades necesarias", desc: "Dependiendo del derecho, pueden existir requisitos específicos para que la cesión produzca determinados efectos." },
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

                    {/* QUE REVISAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué revisar antes de firmar una cesión?</h2>
                        <p className="text-gray-600 mb-4">Antes de firmar un contrato de cesión, conviene revisar al menos:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Quién es el titular del derecho",
                                "Cuál es exactamente el derecho que se está transfiriendo",
                                "Qué documentos respaldan ese derecho",
                                "Si existen restricciones o limitaciones",
                                "Si existen juicios relacionados",
                                "Cuál es el precio de la operación",
                                "Qué responsabilidades asume el cedente",
                                "Qué formalidades requiere la cesión",
                                "Qué efectos tendrá frente a terceros",
                                "Qué ocurre si posteriormente aparece un problema con el derecho cedido",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Mientras mayor sea el valor económico de la operación, más importante resulta revisar estos antecedentes antes de firmar.</p>
                    </div>

                    {/* NECESITO ABOGADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Necesito un abogado para una cesión de derechos?</h2>
                        <p className="text-gray-600 mb-4">
                            No todas las cesiones tienen el mismo nivel de complejidad. Una operación sencilla puede parecer relativamente directa, pero la situación cambia cuando existen:
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Inmuebles",
                                "Herencias",
                                "Créditos importantes",
                                "Empresas",
                                "Varios cedentes",
                                "Juicios",
                                "Derechos discutidos",
                                "Montos elevados",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">
                            En estos casos, una revisión jurídica puede ayudar a identificar problemas que no necesariamente son evidentes al leer el contrato. El abogado puede revisar el documento y los antecedentes disponibles para determinar qué se está transfiriendo y cuáles son los principales riesgos.
                        </p>
                    </div>

                    {/* CUANTO CUESTA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuánto cuesta hacer una cesión de derechos?</h2>
                        <p className="text-gray-600 mb-4">No existe un precio único para una cesión. El costo dependerá principalmente del tipo de operación y de las formalidades necesarias.</p>
                        <p className="text-gray-600 mb-4">Puede influir, por ejemplo:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Complejidad del contrato",
                                "Necesidad de revisar antecedentes",
                                "Intervención de abogado",
                                "Intervención de notaría",
                                "Existencia de inmuebles",
                                "Existencia de una herencia",
                                "Existencia de un juicio",
                                "Necesidad de realizar determinadas inscripciones o actuaciones",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Por eso, una cesión sencilla y una operación que involucre derechos hereditarios o litigiosos pueden tener costos muy diferentes.</p>
                    </div>

                    {/* DIFERENCIA CON COMPRAVENTA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuál es la diferencia entre una cesión de derechos y una compraventa?</h2>
                        <p className="text-gray-600 mb-4">Aunque pueden estar relacionadas, no son exactamente lo mismo.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 p-3 text-left font-bold">Cesión de derechos</th>
                                        <th className="border border-gray-300 p-3 text-left font-bold">Compraventa</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Transfiere un derecho determinado.</td>
                                        <td className="border border-gray-300 p-3">Tiene por objeto una cosa o derecho a cambio de un precio.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Puede involucrar créditos, herencias o derechos litigiosos.</td>
                                        <td className="border border-gray-300 p-3">Es un contrato regulado por reglas generales de compraventa.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Tiene reglas específicas según el derecho cedido.</td>
                                        <td className="border border-gray-300 p-3">Su regulación depende del objeto de la compraventa.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-gray-600 mt-4">Por ejemplo, una cesión de derechos hereditarios no equivale automáticamente a la compraventa de un inmueble específico.</p>
                    </div>

                    {/* DIFERENCIA CON RECONOCIMIENTO DE DEUDA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuál es la diferencia entre cesión de derechos y reconocimiento de deuda?</h2>
                        <p className="text-gray-600 mb-4">
                            Son operaciones completamente diferentes. En un reconocimiento de deuda, una persona deja constancia de que mantiene una obligación frente a otra.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="bg-gray-50 p-5 rounded-xl">
                                <h3 className="font-bold text-gray-900 mb-2">Reconocimiento de deuda</h3>
                                <p className="text-gray-600">Pedro reconoce deber $2.000.000 a Juan.</p>
                            </div>
                            <div className="bg-gray-50 p-5 rounded-xl">
                                <h3 className="font-bold text-gray-900 mb-2">Cesión de derechos</h3>
                                <p className="text-gray-600">Juan cede a María el crédito de $2.000.000 que tiene contra Pedro.</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">En el primer caso se documenta una deuda. En el segundo, se transfiere un derecho.</p>
                    </div>

                    {/* YA FIRME */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si ya firmé una cesión de derechos?</h2>
                        <p className="text-gray-600 mb-4">
                            Firmar una cesión no significa necesariamente que exista un problema. Si tienes dudas sobre el documento, conviene revisar:
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Qué derecho se cedió",
                                "Quién era su titular",
                                "Qué precio se pagó",
                                "Qué documentos respaldaban el derecho",
                                "Qué obligaciones asumió cada parte",
                                "Si existen terceros afectados",
                                "Si se cumplieron las formalidades correspondientes",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl mb-6">
                        <p className="font-bold text-amber-900">Si ya firmaste, aún puedes actuar</p>
                        <p className="text-amber-800">Haber firmado una cesión no significa que sea tarde. Un abogado puede revisar el documento, verificar si se cumplieron las formalidades y evaluar si hay vías para corregir la situación antes de que genere más problemas.</p>
                    </div>

                    {/* CTA 2 */}
                    <InArticleCTA
                        title="¿Firmaste una cesión de derechos y tienes dudas?"
                        message="Un abogado civil puede revisar lo que firmaste, identificar riesgos y decirte si aún hay medidas que puedas tomar."
                        buttonText="Hablar con un abogado civil"
                        category="Derecho Civil"
                    />

                    {/* CONCLUSION */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La cesión de derechos en Chile permite transferir determinados derechos de una persona a otra, pero las reglas aplicables dependen de la naturaleza del derecho involucrado.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            No es lo mismo ceder un crédito personal que ceder derechos hereditarios o derechos relacionados con un juicio.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Antes de firmar un contrato de cesión, es importante verificar quién es el titular, qué derecho se está transfiriendo, qué documentos lo respaldan, cuál es el precio y qué formalidades deben cumplirse. Si la operación involucra una cantidad importante de dinero, una herencia, un inmueble o un litigio, una revisión jurídica puede ayudarte a comprender exactamente qué estás adquiriendo o transfiriendo y cuáles son los riesgos. Puedes consultar con un{" "}
                            <Link to="/abogado-civil" className="text-green-700 underline hover:text-green-500">abogado civil en Chile</Link>{" "}
                            a través de LegalUp.
                        </p>
                    </div>

                    <CategoryCTA category="civil" linkText="Hablar con un abogado civil" />

                    {/* FAQS */}
                    <div className="mt-12 mb-6" data-faq-section>
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
                                to="/blog/reconocimiento-de-deuda-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Reconocimiento de deuda en Chile
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/prescripcion-de-deudas-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Prescripción de deudas en Chile
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/pagare-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Pagaré en Chile
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/cobranza-judicial-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Cobranza Judicial
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/juicio-ejecutivo-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Juicio ejecutivo en Chile
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/embargo-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Embargo Chile
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
                <div className="mt-8">
                    <BlogShare
                        title="Cesión de derechos en Chile 2026"
                        url="https://legalup.cl/blog/cesion-de-derechos-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="cesion-de-derechos-chile-2026" />

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

            <BlogConversionPopup category="Derecho Civil" topic="cesion-derechos" />
        </div>
    );
};

export default BlogArticle;