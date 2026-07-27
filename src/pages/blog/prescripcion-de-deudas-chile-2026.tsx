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
            question: "¿Cuándo prescribe una deuda en Chile?",
            answer: "Depende del tipo de obligación, del documento firmado y de las actuaciones judiciales que hayan existido.",
        },
        {
            question: "¿Las deudas bancarias prescriben?",
            answer: "Sí. Sin embargo, el plazo dependerá del crédito específico y de las acciones que haya ejercido el banco para cobrar la deuda.",
        },
        {
            question: "¿Un pagaré prescribe?",
            answer: "Sí. Los pagarés tienen reglas especiales de prescripción y su análisis depende, entre otros factores, de la fecha de vencimiento y de la existencia de demandas judiciales.",
        },
        {
            question: "¿Una deuda desaparece cuando prescribe?",
            answer: "No necesariamente. Lo que normalmente prescribe es la posibilidad de exigir judicialmente el cumplimiento de la obligación.",
        },
        {
            question: "¿La prescripción se aplica automáticamente?",
            answer: "No siempre. En numerosos casos debe alegarse oportunamente dentro del procedimiento judicial correspondiente.",
        },
        {
            question: "¿Qué pasa si me demandan por una deuda antigua?",
            answer: "No conviene ignorar la demanda. Lo recomendable es revisar inmediatamente el expediente y obtener asesoría jurídica para determinar si corresponde ejercer alguna defensa, incluida la prescripción.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Prescripción de deudas en Chile 2026: cuándo prescribe una deuda y qué ocurre después"
                description="Aprende cuándo prescribe una deuda en Chile, qué tipos de deudas pueden prescribir, cómo funciona la prescripción de pagarés y qué hacer si te están cobrando una deuda antigua."
                image="/assets/prescripcion-de-deudas-chile-2026.png"
                url="https://legalup.cl/blog/prescripcion-de-deudas-chile-2026"
                datePublished="2026-07-24"
                dateModified="2026-07-24"
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
                        Prescripción de deudas en Chile 2026: cuándo prescribe una deuda y qué ocurre después
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "La prescripción de una deuda extingue la acción judicial para cobrarla, no necesariamente la deuda misma",
                                "El plazo de prescripción varía según el tipo de obligación y el documento que la respalda",
                                "Los pagarés, cheques, créditos bancarios y contratos civiles tienen reglas de prescripción distintas",
                                "Una demanda judicial puede interrumpir la prescripción y reiniciar el cómputo del plazo",
                                "Si te están cobrando una deuda antigua, conviene revisar los antecedentes antes de pagar o responder",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Muchas personas creen que una deuda desaparece automáticamente con el paso del tiempo. Sin embargo, en Chile la realidad es distinta: una deuda no se extingue simplemente porque hayan transcurrido algunos años, sino que puede llegar a prescribir si se cumplen determinados requisitos legales.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>24 de Julio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="prescripcion-de-deudas-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Prescripción de deudas en Chile 2026"
                        url="https://legalup.cl/blog/prescripcion-de-deudas-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            Conocer cómo funciona la prescripción de deudas en Chile resulta fundamental tanto para quienes mantienen obligaciones pendientes como para quienes buscan cobrar una deuda. Dependiendo del tipo de obligación, los plazos pueden variar considerablemente y, en algunos casos, una demanda judicial puede interrumpir la prescripción.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía actualizada para 2026 encontrarás: cuándo prescribe una deuda en Chile, qué tipos de deudas prescriben, qué ocurre con las deudas bancarias, cómo funciona la prescripción de un pagaré, qué sucede si ya existe un juicio ejecutivo y cuándo conviene consultar con un abogado.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando un conflicto por deudas, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/pagare-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                pagaré en Chile
                            </Link>
                            {/* ,{" "}
                            <Link
                                to="/blog/juicio-ejecutivo-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                juicio ejecutivo
                            </Link>{" "}
                            y{" "}
                            <Link
                                to="/blog/embargo-de-bienes-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                embargo de bienes
                            </Link> */}.
                        </p>
                    </div>

                    {/* H2: ¿Qué significa que una deuda prescriba? */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué significa que una deuda prescriba?</h2>
                        <p className="text-gray-600 mb-4">
                            La prescripción de una deuda significa que el acreedor pierde la posibilidad de exigir judicialmente el cumplimiento de la obligación porque transcurrió el plazo que establece la ley sin ejercer oportunamente sus acciones.
                        </p>
                        <p className="text-gray-600 mb-4">Esto no significa que la deuda desaparezca automáticamente.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "La obligación puede seguir existiendo.",
                                "El acreedor podría continuar intentando cobrar de manera extrajudicial.",
                                "Lo que prescribe normalmente es la acción judicial para exigir el pago.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Por esa razón, muchas personas hablan de una deuda prescrita, aunque jurídicamente lo que prescribe suele ser la acción para cobrarla.</p>
                    </div>

                    {/* H2: ¿Cuándo prescribe una deuda en Chile? */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo prescribe una deuda en Chile?</h2>
                        <p className="text-gray-600 mb-4">No existe un único plazo para todas las deudas. El tiempo depende del tipo de obligación y del documento que la respalda.</p>
                        <p className="text-gray-600 mb-4">Entre los casos más comunes se encuentran:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Pagarés",
                                "Letras de cambio",
                                "Cheques",
                                "Créditos bancarios",
                                "Contratos civiles",
                                "Juicios ejecutivos",
                                "Obligaciones reconocidas por sentencia",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <div className="bg-amber-50 p-5 rounded-xl mt-4">
                            <p className="text-amber-800">Además, existen situaciones que pueden interrumpir o suspender la prescripción, haciendo que el plazo vuelva a comenzar desde cero. Por eso nunca conviene asumir que una deuda ya prescribió únicamente porque han pasado varios años.</p>
                        </div>
                    </div>

                    {/* RelatedLawyers */}
                    <RelatedLawyers category="Derecho Civil" />

                    {/* H2: ¿Todas las deudas prescriben? */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Todas las deudas prescriben?</h2>
                        <p className="text-gray-600 mb-4">
                            En general, la mayoría de las obligaciones civiles están sujetas a reglas de prescripción. Sin embargo, cada tipo de acción posee un plazo distinto establecido por la ley.
                        </p>
                        <p className="text-gray-600 mb-4">Algunos ejemplos son:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Créditos de consumo",
                                "Préstamos entre particulares",
                                "Pagarés",
                                "Deudas bancarias",
                                "Contratos civiles",
                                "Obligaciones derivadas de resoluciones judiciales",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Antes de concluir que una deuda ya no puede cobrarse judicialmente es indispensable revisar:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "La fecha de origen",
                                "Si hubo demandas",
                                "Si existieron reconocimientos de deuda",
                                "Si se realizaron pagos parciales",
                                "El tipo de documento firmado",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Todos estos antecedentes pueden modificar completamente el plazo aplicable.</p>
                    </div>

                    {/* H2: ¿Qué tipos de deudas prescriben con mayor frecuencia? (🆕) */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué tipos de deudas prescriben con mayor frecuencia?</h2>
                        <p className="text-gray-600 mb-4">No todas las personas mantienen el mismo tipo de obligaciones. Las consultas más habituales suelen referirse a:</p>
                        <div className="space-y-3">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Deudas bancarias</h3>
                                <p className="text-gray-600">Créditos de consumo, avances, líneas de crédito y otros productos financieros pueden quedar sujetos a reglas de prescripción dependiendo de la acción ejercida por la institución financiera.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Deudas por pagarés</h3>
                                <p className="text-gray-600">Los pagarés constituyen uno de los documentos ejecutivos más utilizados en Chile y poseen reglas especiales respecto de su cobro y prescripción.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Préstamos entre particulares</h3>
                                <p className="text-gray-600">Cuando existe un contrato o reconocimiento de deuda también pueden aplicarse normas de prescripción dependiendo del caso concreto.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Deudas comerciales</h3>
                                <p className="text-gray-600">Empresas y proveedores también pueden ejercer acciones judiciales dentro de los plazos que establece la legislación.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Deudas que ya tienen sentencia</h3>
                                <p className="text-gray-600">Una sentencia judicial modifica completamente el escenario jurídico, por lo que los plazos aplicables pueden ser distintos a los de la obligación original.</p>
                            </div>
                        </div>
                    </div>

                    {/* InArticleCTA #1 */}
                    <InArticleCTA
                        title="¿No sabes si una deuda realmente prescribió?"
                        message="Un abogado puede revisar las fechas, documentos y actuaciones judiciales para determinar si todavía pueden cobrarte o si corresponde alegar la prescripción."
                        buttonText="Hablar con un abogado civil"
                        category="Derecho Civil"
                    />

                    {/* H2: ¿Qué ocurre si la deuda ya prescribió? */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si la deuda ya prescribió?</h2>
                        <p className="text-gray-600 mb-4">
                            Cuando efectivamente se cumplen los requisitos legales, el deudor puede oponer la prescripción como defensa dentro del procedimiento correspondiente.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Esto es importante porque la prescripción no siempre opera automáticamente. En muchos casos será necesario alegarla oportunamente ante el tribunal.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="text-red-800">Si el deudor no ejerce esa defensa, podría perder una oportunidad importante dentro del juicio. Por esa razón, antes de pagar una deuda antigua o responder una demanda, resulta recomendable analizar el caso concreto con un abogado.</p>
                        </div>
                    </div>

                    {/* H2: ¿Cómo saber si una deuda está prescrita? (🆕) */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo saber si una deuda está prescrita?</h2>
                        <p className="text-gray-600 mb-4">
                            Muchas personas no saben si realmente una obligación ya prescribió o si todavía puede ser cobrada judicialmente. La única forma de determinarlo es revisar los antecedentes específicos del caso.
                        </p>
                        <p className="text-gray-600 mb-4">Entre los elementos que normalmente deben analizarse se encuentran:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "La fecha en que nació la deuda.",
                                "El documento que la respalda (pagaré, contrato, crédito, sentencia, etc.).",
                                "La fecha de vencimiento.",
                                "Si existieron pagos parciales posteriores.",
                                "Si el acreedor presentó una demanda.",
                                "Si hubo actuaciones judiciales que interrumpieran la prescripción.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <div className="bg-amber-50 p-5 rounded-xl mt-4">
                            <p className="text-amber-800">En algunos casos dos deudas aparentemente iguales pueden tener situaciones completamente distintas desde el punto de vista legal. Por ello, antes de pagar una obligación antigua o asumir que ya no puede cobrarse, resulta recomendable revisar todos los antecedentes.</p>
                        </div>
                    </div>

                    {/* H2: ¿Una deuda bancaria prescribe? */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Una deuda bancaria prescribe?</h2>
                        <p className="text-gray-600 mb-4">
                            Sí. Las deudas bancarias también pueden prescribir, pero el plazo dependerá del tipo de crédito, de los documentos firmados y de las acciones judiciales que haya iniciado la institución financiera.
                        </p>
                        <p className="text-gray-600">
                            Por ejemplo, no es lo mismo un crédito respaldado por un pagaré que una obligación reconocida mediante una sentencia judicial. En consecuencia, siempre es necesario revisar la documentación específica antes de determinar si existe una deuda prescrita.
                        </p>
                    </div>

                    {/* H2: ¿Cuánto tiempo tarda en prescribir un pagaré? */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuánto tiempo tarda en prescribir un pagaré?</h2>
                        <p className="text-gray-600 mb-4">
                            Una de las dudas más frecuentes es si un pagaré prescribe y cuánto tiempo debe transcurrir para que ello ocurra. La respuesta es sí: los pagarés tienen reglas especiales de prescripción establecidas por la legislación chilena.
                        </p>
                        <p className="text-gray-600 mb-4">Sin embargo, el plazo dependerá de diversos factores, entre ellos:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "La fecha de vencimiento",
                                "Si el acreedor presentó una demanda",
                                "Si existieron actuaciones judiciales",
                                "Si hubo reconocimiento de la deuda por parte del deudor",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <div className="bg-amber-50 p-5 rounded-xl mt-4">
                            <p className="text-amber-800">Por eso, no basta con contar los años desde que se firmó el documento. En muchos casos, un pagaré que parecía prescrito puede seguir siendo plenamente exigible.</p>
                        </div>

                        <div className="mt-4 p-6 sm:p-8 bg-cream-900 rounded-xl border border-gray-200 text-left">
                            <h3 className="text-2xl text-green-900 font-bold font-serif">¿Necesitas generar un pagaré?</h3>
                            <p className="text-green-900 mt-1 mb-4">Si vas a prestar dinero o formalizar una deuda, puedes generar un Mandato Pagaré listo para firmar en pocos minutos.</p>
                            <ul className="text-green-900 mt-2 text-sm space-y-1 mb-5">
                                <li><span className="font-bold text-green-600 mr-1.5">✓</span> Basado en formato utilizado por abogados.</li>
                                <li><span className="font-bold text-green-600 mr-1.5">✓</span> Disponible inmediatamente.</li>
                                <li><span className="font-bold text-green-600 mr-1.5">✓</span> Enviado también a tu correo.</li>
                                <li><span className="font-bold text-green-600 mr-1.5">✓</span> Incluye código único de verificación.</li>
                            </ul>
                            <div className="text-3xl font-bold text-green-900 mb-4">
                                $9.990
                            </div>
                            <Link
                                to="/documentos/pagare"
                                className="inline-block bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-green-900 transition-colors"
                            >
                                Generar Mandato Pagaré →
                            </Link>
                        </div>
                    </div>

                    {/* H2: ¿Qué ocurre con una deuda que ya está en juicio? */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre con una deuda que ya está en juicio?</h2>
                        <p className="text-gray-600 mb-4">
                            Cuando el acreedor presenta una demanda antes de que venza el plazo legal, la situación cambia completamente. Dependiendo del procedimiento y de las actuaciones realizadas, la prescripción puede interrumpirse, haciendo que el tiempo vuelva a contarse conforme a las reglas que establece la ley.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">Por ello es frecuente que una persona piense que una deuda "ya prescribió", cuando en realidad existe un juicio iniciado hace años que mantiene vigente la acción judicial. Antes de asumir que una deuda no puede cobrarse, conviene revisar el expediente correspondiente.</p>
                        </div>
                    </div>

                    {/* H2: ¿Qué puede interrumpir la prescripción? */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué puede interrumpir la prescripción?</h2>
                        <p className="text-gray-600 mb-4">
                            La prescripción no siempre avanza de forma continua. Existen situaciones que pueden hacer que el plazo vuelva a comenzar.
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "La presentación de una demanda",
                                "Determinados actos procesales",
                                "El reconocimiento de la deuda por parte del deudor",
                                "Algunos pagos parciales",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Cada caso debe analizarse individualmente. Por eso, antes de responder una cobranza o negociar una deuda antigua, es recomendable revisar el historial completo de la obligación.</p>
                    </div>

                    {/* H2: ¿Conviene pagar una deuda que podría estar prescrita? (🆕) */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Conviene pagar una deuda que podría estar prescrita?</h2>
                        <p className="text-gray-600 mb-4">
                            No existe una respuesta única. Antes de realizar cualquier pago conviene analizar la situación jurídica de la obligación.
                        </p>
                        <p className="text-gray-600 mb-4">
                            En algunos casos puede ser conveniente negociar. En otros, podría corresponder ejercer la prescripción como defensa. También existen situaciones donde pagar voluntariamente permite evitar intereses, costas o procedimientos judiciales futuros.
                        </p>
                        <p className="text-gray-600 mb-4">Cada alternativa depende de factores como:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "El monto de la deuda",
                                "La existencia de demandas",
                                "El tipo de documento firmado",
                                "Los objetivos del deudor",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <div className="bg-amber-50 p-5 rounded-xl mt-4">
                            <p className="text-amber-800">Por eso resulta recomendable tomar una decisión informada y no actuar únicamente por presión de una empresa de cobranza.</p>
                        </div>
                    </div>

                    {/* H2: Errores frecuentes sobre la prescripción de deudas */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes sobre la prescripción de deudas</h2>
                        <p className="text-gray-600 mb-4">Muchas personas toman decisiones basadas en información incorrecta.</p>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Pensar que todas las deudas prescriben en el mismo plazo", desc: "Cada obligación tiene reglas distintas. No existe un plazo único aplicable a todas las deudas." },
                                    { title: "Creer que la deuda desaparece automáticamente", desc: "La prescripción no elimina necesariamente la existencia de la deuda. En muchos casos debe ser alegada dentro del procedimiento judicial correspondiente." },
                                    { title: "Asumir que una llamada de cobranza significa que la deuda sigue vigente", desc: "Las empresas pueden continuar realizando gestiones extrajudiciales incluso respecto de obligaciones antiguas. Lo relevante es determinar si todavía existe acción judicial para exigir el pago." },
                                    { title: "Ignorar una demanda pensando que 'ya pasaron muchos años'", desc: "Es uno de los errores más graves. Si existe una demanda, siempre conviene analizarla antes de decidir cómo responder." },
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

                    {/* H2: ¿Qué hacer si crees que una deuda ya prescribió? */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué hacer si crees que una deuda ya prescribió?</h2>
                        <p className="text-gray-600 mb-4">Si sospechas que una obligación podría encontrarse prescrita, lo recomendable es:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Reunir los documentos disponibles",
                                "Identificar la fecha de origen de la deuda",
                                "Verificar si existe algún juicio vigente",
                                "Revisar si hubo pagos o reconocimientos posteriores",
                                "Consultar con un abogado antes de pagar o responder una demanda",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Una revisión preventiva puede evitar pagos innecesarios o permitir ejercer adecuadamente la defensa correspondiente.</p>
                    </div>

                    {/* H2: ¿Qué documentos conviene revisar antes de consultar a un abogado? (🆕) */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué documentos conviene revisar antes de consultar a un abogado?</h2>
                        <p className="text-gray-600 mb-4">Si deseas saber si una deuda podría encontrarse prescrita, intenta reunir previamente toda la información disponible.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Contratos",
                                "Pagarés",
                                "Cartas de cobranza",
                                "Correos electrónicos",
                                "Comprobantes de pago",
                                "Demandas judiciales",
                                "Notificaciones recibidas",
                                "Certificados del tribunal si existe un juicio",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Mientras más antecedentes existan, más precisa podrá ser la evaluación jurídica.</p>
                    </div>

                    {/* H2: ¿Cuándo conviene consultar con un abogado? (🆕) */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo conviene consultar con un abogado?</h2>
                        <p className="text-gray-600 mb-4">Existen situaciones donde la asesoría profesional puede evitar errores importantes. Por ejemplo cuando:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Recibiste una demanda ejecutiva",
                                "Un receptor judicial intentó notificarte",
                                "El banco inició acciones de cobro",
                                "Una empresa de cobranza insiste en exigir el pago",
                                "Sospechas que la deuda podría haber prescrito",
                                "Deseas negociar antes de llegar a juicio",
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-600 flex-shrink-0">•</span>
                                    <span className="text-gray-700 font-bold">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Una revisión temprana puede permitir ejercer defensas oportunamente o negociar desde una mejor posición.</p>
                    </div>

                    {/* InArticleCTA #2 */}
                    <InArticleCTA
                        title="¿Te están cobrando una deuda antigua?"
                        message="Antes de pagar o responder una demanda, un abogado puede revisar si la deuda sigue siendo exigible o si corresponde alegar la prescripción."
                        buttonText="Hablar con un abogado civil"
                        category="Derecho Civil"
                    />

                    {/* CONCLUSION */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La prescripción de deudas en Chile es una institución jurídica que protege la seguridad jurídica, pero no opera de la misma manera para todas las obligaciones.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Determinar si una deuda está prescrita exige analizar el tipo de documento, las fechas relevantes y las actuaciones judiciales que hayan ocurrido durante los años posteriores. Antes de asumir que una deuda ya no puede cobrarse —o antes de pagar una obligación antigua— resulta recomendable obtener asesoría profesional para conocer la situación jurídica específica de tu caso. Puedes consultar con un{" "}
                            <Link to="/abogado-civil" className="text-green-700 underline hover:text-green-500">abogado civil en Chile</Link>{" "}
                            a través de LegalUp.
                        </p>
                    </div>

                    <CategoryCTA category="civil" linkText="Hablar con un abogado civil" />

                    {/* FAQS */}
                    <div className="mt-12 mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre la prescripción de deudas</h2>
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
                            {/* <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/juicio-ejecutivo-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Juicio ejecutivo en Chile
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/embargo-de-bienes-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Embargo de bienes en Chile
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/cobranza-judicial-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Cobranza judicial: cómo funciona
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/dicom-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                DICOM: cuándo una deuda puede informarse
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/contrato-de-mutuo-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Contrato de mutuo en Chile
                            </Link> */}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
                <div className="mt-8">
                    <BlogShare
                        title="Prescripción de deudas en Chile 2026"
                        url="https://legalup.cl/blog/prescripcion-de-deudas-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="prescripcion-de-deudas-chile-2026" />

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

            <BlogConversionPopup category="Derecho Civil" topic="prescripcion-deudas" />
        </div>
    );
};

export default BlogArticle;