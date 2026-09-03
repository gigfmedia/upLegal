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
            question: "¿Qué puedo hacer si me deben dinero y no me pagan?",
            answer: "Lo primero es reunir toda la documentación de la deuda (contrato, pagaré, reconocimiento de deuda, facturas, transferencias), enviar un reclamo formal por escrito al deudor y, si no hay respuesta, evaluar las vías legales de cobro según el monto y los documentos disponibles. Un abogado puede ayudarte a elegir la vía correcta.",
        },
        {
            question: "¿Cuánto tiempo tengo para cobrar una deuda?",
            answer: "Depende del tipo de acción. En Chile, la acción ejecutiva prescribe en tres años y la acción ordinaria en cinco, contados desde que la deuda se hizo exigible. Existen plazos especiales para documentos como el pagaré. Si el plazo está por vencer, es urgente actuar para interrumpir la prescripción.",
        },
        {
            question: "¿Qué documento necesito para poder demandar?",
            answer: "Idealmente un título ejecutivo: pagaré, escritura pública, sentencia firme, acta de avenimiento o instrumento privado reconocido judicialmente. Si no tienes título ejecutivo, aún puedes demandar por la vía ordinaria, pero el juicio suele ser más largo y requiere probar la existencia de la deuda.",
        },
        {
            question: "¿Me pagan con un pagaré o reconocimiento de deuda, qué hago?",
            answer: "Si el deudor no cumple con el pago comprometido en un pagaré o reconocimiento de deuda, puedes evaluar iniciar un juicio ejecutivo para cobrar, siempre que el documento cumpla los requisitos legales y la deuda no esté prescrita. Es recomendable que un abogado revise el documento antes de demandar.",
        },
        {
            question: "¿Puedo cobrar una deuda sin abogado?",
            answer: "Las gestiones extrajudiciales (cartas, correos, llamadas) puedes hacerlas tú mismo. Sin embargo, las demandas y comparecencias ante tribunales en general requieren patrocinio de abogado. Además, una asesoría evita errores de forma que pueden alargar el juicio o afectar el cobro.",
        },
        {
            question: "¿Qué hago si el deudor no tiene bienes?",
            answer: "Aunque demandes, cobrar depende de que el deudor tenga bienes embargables o ingresos. Un abogado puede evaluar la situación patrimonial del deudor y las alternativas reales de cobro antes de iniciar un juicio, para evitar gastos inútiles.",
        },
        {
            question: "¿Puedo negociar antes de demandar?",
            answer: "Sí, y suele ser recomendable. Muchas deudas se resuelven con acuerdos: pago en cuotas, reprogramación o daciones en pago. Formalizar el acuerdo por escrito (por ejemplo, con un reconocimiento de deuda) protege tu posición y puede interrumpir la prescripción.",
        },
        {
            question: "¿Qué pasa si la deuda es muy antigua?",
            answer: "Si transcurrió el plazo de prescripción sin que se interrumpiera, el deudor puede oponer la prescripción como defensa y el cobro se vuelve inviable. Si la deuda está próxima a prescribir, presentar la demanda o lograr un reconocimiento escrito del deudor puede interrumpir el plazo.",
        },
    ];

    return (
        <div className="min-h-screen bg-white">
            <BlogGrowthHacks
                title="No me pagan una deuda en Chile 2026: qué hacer paso a paso para recuperar tu dinero"
                description="Conoce qué hacer cuando no te pagan una deuda en Chile: qué pasos seguir, qué documentos necesitas, cuándo conviene demandar y cómo evitar la prescripción."
                image="/assets/no-me-pagan-una-deuda-chile-2026.png"
                url="https://legalup.cl/blog/no-me-pagan-una-deuda-chile-2026"
                datePublished="2026-08-06"
                dateModified="2026-08-06"
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
                        No me pagan una deuda en Chile 2026: qué hacer paso a paso para recuperar tu dinero
                    </h1>

                    <div className="bg-white backdrop-blur-sm border rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2 text-green-900">
                            {[
                                "Reúne toda la documentación de la deuda antes de cualquier gestión.",
                                "Envía un reclamo formal por escrito y guarda registro de los intentos de cobro.",
                                "Verifica el plazo de prescripción: en general 3 años para acciones ejecutivas y 5 para ordinarias.",
                                "Si el deudor no responde, evalúa demandar por la vía ejecutiva u ordinaria según el caso.",
                                "Un abogado puede ayudarte a elegir la vía correcta y evitar errores que perjudiquen el cobro.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl text-green-900">
                        Que te deban dinero y no te paguen es una situación estresante y muy frecuente en Chile. Préstamos entre familiares, ventas en cuotas, trabajos por encargo o facturas impagas: cuando el deudor no cumple, surge la pregunta de qué hacer para recuperar el dinero.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6 text-green-900">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>6 de Agosto, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="no-me-pagan-una-deuda-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white border sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="No me pagan una deuda en Chile 2026"
                        url="https://legalup.cl/blog/no-me-pagan-una-deuda-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            Ante un deudor moroso, lo primero es entender que el tiempo juega en tu contra: en Chile, las deudas prescriben si el acreedor no ejerce acciones dentro de los plazos legales. Por eso, actuar de forma ordenada y oportuna puede marcar la diferencia entre recuperar tu dinero o perder el derecho a cobrarlo.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía actualizada para 2026 te explicamos paso a paso qué hacer cuando no te pagan, qué documentos necesitas, cuándo conviene demandar y cómo protegerte de la prescripción.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si te deben dinero, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/prescripcion-de-deudas-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                prescripción de deudas
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/como-cobrar-deuda-legalmente-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                cómo cobrar una deuda legalmente
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/pagare-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                el pagaré en Chile
                            </Link>{" "}
                            y{" "}
                            <Link
                                to="/blog/reconocimiento-de-deuda-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                el reconocimiento de deuda
                            </Link>.
                        </p>
                    </div>

                    {/* PASO 1 */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Paso 1: Reúne toda la documentación</h2>
                        <p className="text-gray-600 mb-4">
                            Antes de cualquier gestión, junta toda la evidencia de la deuda. Este es el cimiento de cualquier cobro, ya sea extrajudicial o judicial.
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 p-3 text-left font-bold">Documento</th>
                                        <th className="border border-gray-300 p-3 text-left font-bold">Qué acredita</th>
                                        <th className="border border-gray-300 p-3 text-left font-bold">Fuerza para cobrar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Pagaré</td>
                                        <td className="border border-gray-300 p-3">Promesa escrita de pago de una suma determinada.</td>
                                        <td className="border border-gray-300 p-3">Título ejecutivo: permite juicio ejecutivo.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Reconocimiento de deuda</td>
                                        <td className="border border-gray-300 p-3">Declaración escrita del deudor de que debe la suma.</td>
                                        <td className="border border-gray-300 p-3">Puede ser título ejecutivo si cumple requisitos.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Factura o boleta</td>
                                        <td className="border border-gray-300 p-3">Registro de la operación comercial o venta.</td>
                                        <td className="border border-gray-300 p-3">Depende del caso y de la ley aplicable.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Contrato o transferencias</td>
                                        <td className="border border-gray-300 p-3">Existencia y condiciones de la obligación.</td>
                                        <td className="border border-gray-300 p-3">Permite acreditar la deuda en juicio ordinario.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-gray-600 mt-4">Conserva copias, correos, mensajes y cualquier registro de la relación con el deudor: todo puede servir como prueba.</p>
                    </div>

                    <RelatedLawyers category="Derecho Civil" />

                    {/* PASO 2 */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Paso 2: Envía un reclamo formal</h2>
                        <p className="text-gray-600 mb-4">
                            Antes de demandar, intenta resolver la deuda de forma extrajudicial. Un reclamo formal por escrito (carta o correo) tiene dos objetivos: darle al deudor la oportunidad de pagar y dejar constancia de tu gestión de cobro.
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Identifica el monto exacto y la fecha de la obligación", "Señala el plazo para pagar (por ejemplo, 10 días hábiles)", "Advierte que, de no pagar, iniciarás acciones legales", "Fija una vía de contacto clara para negociar", "Guarda copia de la carta y el comprobante de envío"].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 flex-shrink-0">✓</span>
                                    <span className="text-gray-700 font-bold">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">La gestión extrajudicial también te permite evaluar la disposición del deudor a negociar antes de incurrir en costos judiciales.</p>
                    </div>

                    {/* PASO 3 */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Paso 3: Revisa el plazo de prescripción</h2>
                        <p className="text-gray-600 mb-4">
                            En Chile, el derecho a cobrar no es eterno. La ley establece plazos dentro de los cuales el acreedor debe ejercer sus acciones, contados desde que la deuda se hace exigible.
                        </p>
                        <p className="text-gray-600">
                            Por regla general, la acción ejecutiva prescribe en tres años y la acción ordinaria en cinco. La acción ejecutiva vencida se convierte en ordinaria, que dura otros dos años. Existen plazos especiales según el tipo de título.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl mt-4">
                            <p className="font-bold text-amber-900">Importante</p>
                            <p className="text-amber-800">La prescripción se interrumpe, entre otras formas, por el reconocimiento escrito del deudor o por la presentación de la demanda. Si el plazo está cerca de vencer, actuar con urgencia es decisivo. Te recomendamos revisar nuestra{" "}
                                <Link to="/blog/prescripcion-de-deudas-chile-2026" className="underline">guía completa de prescripción de deudas</Link>.
                            </p>
                        </div>
                    </div>

                    <InArticleCTA
                        category="Derecho Civil"
                        title="¿Te deben dinero y el plazo corre?"
                        message="Un abogado civil puede revisar tu documentación, verificar si la deuda está por prescribir y orientarte sobre los pasos a seguir."
                    />

                    {/* PASO 4 */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Paso 4: Negocia o llega a un acuerdo</h2>
                        <p className="text-gray-600 mb-4">
                            Muchas deudas se resuelven fuera de los tribunales. La negociación puede terminar en un pago total, en cuotas, o en un acuerdo con nuevas condiciones. Lo importante es que el acuerdo quede por escrito.
                        </p>
                        <div className="bg-green-50 p-5 rounded-xl">
                            <p className="text-green-800">Un reconocimiento de deuda firmado por el deudor no solo documenta el acuerdo, sino que además interrumpe la prescripción y fortalece tu posición para un eventual cobro judicial.</p>
                        </div>
                    </div>

                    {/* PASO 5 */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Paso 5: Evalúa demandar por la vía ejecutiva</h2>
                        <p className="text-gray-600 mb-4">
                            Si tienes un título ejecutivo (pagaré, escritura pública, reconocimiento de deuda que cumpla requisitos, entre otros) y el deudor no paga, puedes iniciar un juicio ejecutivo. Este procedimiento es más rápido que el juicio ordinario porque parte de un documento que ya acredita la obligación.
                        </p>
                        <p className="text-gray-600">
                            En el juicio ejecutivo se puede solicitar el embargo de bienes del deudor para asegurar el pago. Si quieres profundizar, revisa nuestra{" "}
                            <Link to="/blog/juicio-ejecutivo-chile-2026" className="text-green-700 underline hover:text-green-500">guía completa del juicio ejecutivo</Link>{" "}
                            y la de{" "}
                            <Link to="/blog/embargo-chile-2026" className="text-green-700 underline hover:text-green-500">embargo en Chile</Link>.
                        </p>
                    </div>

                    {/* PASO 6 */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Paso 6: Considera la vía ordinaria</h2>
                        <p className="text-gray-600 mb-4">
                            Si no tienes un título ejecutivo, aún puedes demandar por la vía ordinaria. En ese caso deberás probar la existencia de la deuda mediante contratos, transferencias, correos u otros medios. El juicio suele ser más largo, pero es la vía adecuada cuando no existe título ejecutivo.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">Elegir entre la vía ejecutiva y la ordinaria depende del tipo de documento y del monto. Un abogado puede evaluar cuál es la vía más eficiente para tu caso concreto.</p>
                        </div>
                    </div>

                    {/* DEUDOR SIN BIENES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Y si el deudor no tiene bienes?</h2>
                        <p className="text-gray-600 mb-4">
                            Es una pregunta clave antes de demandar. Aunque tengas un título ejecutivo, el cobro efectivo depende de que el deudor tenga bienes embargables o ingresos regulares. Si el deudor no tiene patrimonio, un juicio puede terminar en una sentencia que no se pueda cobrar en la práctica.
                        </p>
                        <p className="text-gray-600">
                            Un abogado puede evaluar la situación patrimonial del deudor (por ejemplo, mediante informes o averiguaciones) antes de iniciar el juicio. En esos casos, suele ser más eficiente negociar un acuerdo de pago realista que demandar por una suma que difícilmente podrá cobrarse.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl mt-4">
                            <p className="text-amber-800">Si el deudor tiene ingresos formales (sueldo o pensión), en ciertos casos es posible solicitar la retención de parte de esos ingresos para pagar la deuda, siempre que la ley lo permita y se haga mediante el procedimiento correspondiente.</p>
                        </div>
                    </div>

                    {/* EXTRAJUDICIAL VS JUDICIAL */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Cobranza extrajudicial vs. cobranza judicial</h2>
                        <p className="text-gray-600 mb-4">
                            La cobranza extrajudicial incluye todas las gestiones que realizas antes de los tribunales: cartas, correos, llamadas, reuniones y acuerdos de pago. No requiere abogado y su costo es bajo, pero su eficacia depende de la voluntad del deudor.
                        </p>
                        <p className="text-gray-600 mb-4">
                            La cobranza judicial, en cambio, utiliza la fuerza de la ley: se ejerce mediante una demanda, ejecutiva u ordinaria, y puede terminar en embargo y remate de bienes. No siempre hace falta llegar a tribunales, pero cuando la deuda es alta, el plazo corre o el deudor no coopera, la vía judicial suele ser la única forma real de cobro.
                        </p>
                        <p className="text-gray-600">
                            La decisión entre una y otra no es excluyente: muchas cobranzas comienzan extrajudicialmente y se judicializan si el deudor no responde. Si quieres profundizar en cómo funciona la vía judicial, revisa nuestra{" "}
                            <Link to="/blog/cobranza-judicial-chile-2026" className="text-green-700 underline hover:text-green-500">guía de cobranza judicial en Chile</Link>.
                        </p>
                    </div>

                    {/* COSTOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuánto cuesta cobrar una deuda?</h2>
                        <p className="text-gray-600 mb-4">Los costos varían según la vía elegida y el monto involucrado. En términos generales incluyen:</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 p-3 text-left font-bold">Concepto</th>
                                        <th className="border border-gray-300 p-3 text-left font-bold">Descripción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Gestión extrajudicial</td>
                                        <td className="border border-gray-300 p-3">Cartas y llamadas: bajo costo, pero sin fuerza de cobro directa.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Honorarios de abogado</td>
                                        <td className="border border-gray-300 p-3">Dependen del profesional y de la complejidad del caso.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Costas judiciales</td>
                                        <td className="border border-gray-300 p-3">Gastos del procedimiento, que en general se pagan por el deudor si pierde el juicio.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-gray-600 mt-4">Antes de iniciar un juicio, conviene comparar el monto de la deuda con los costos del procedimiento para evaluar si el cobro vale la pena.</p>
                    </div>

                    <InArticleCTA
                        title="¿Necesitas cobrar una deuda y no sabes por dónde empezar?"
                        message="Un abogado civil puede revisar tus documentos, evaluar la vía de cobro más adecuada y asesorarte sobre los costos y tiempos."
                        buttonText="Hablar con un abogado civil"
                        category="Derecho Civil"
                    />

                    {/* INTERESES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Puedo cobrar intereses por la demora?</h2>
                        <p className="text-gray-600 mb-4">
                            Si la deuda genera intereses, estos pueden sumarse al capital que se cobra. En Chile existen límites legales a los intereses que se pueden pactar y cobrar: la tasa de interés máximo convencional la fija periódicamente el Banco Central, y cobrar por sobre ella puede configurar un delito de usura.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Para saber qué intereses aplican a tu deuda, conviene revisar el contrato o documento original. Si las partes pactaron una tasa, esa es la referencia; si no hay pacto, pueden corresponder intereses legales o moratorios según la ley y el tipo de obligación.
                        </p>
                        <p className="text-gray-600">
                            En la demanda se puede solicitar el cobro del capital más los intereses devengados, siempre que se acrediten y se respeten los topes legales. Un abogado puede ayudarte a calcular qué montos proceden y a incluirlos correctamente en la gestión de cobro.
                        </p>
                    </div>

                    {/* CONCLUSION */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Cuando no te pagan una deuda, el orden y la oportunidad son claves. Reúne la documentación, envía un reclamo formal, revisa los plazos de prescripción y, si es necesario, evalúa las vías legales de cobro.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            No todos los casos terminan en tribunales: muchos se resuelven con acuerdos bien documentados. Pero cuando la vía judicial es necesaria, contar con asesoría especializada marca la diferencia. Si quieres profundizar, revisa nuestras guías sobre{" "}
                            <Link to="/blog/como-cobrar-deuda-legalmente-chile-2026" className="text-green-700 underline hover:text-green-500">cómo cobrar una deuda legalmente</Link>
                            ,{" "}
                            <Link to="/blog/juicio-ejecutivo-chile-2026" className="text-green-700 underline hover:text-green-500">el juicio ejecutivo</Link>{" "}
                            y{" "}
                            <Link to="/blog/prescripcion-de-deudas-chile-2026" className="text-green-700 underline hover:text-green-500">la prescripción de deudas</Link>. Puedes consultar con un{" "}
                            <Link to="/search?specialty=Derecho Civil" className="text-green-700 underline hover:text-green-500">abogado civil en Chile</Link>{" "}
                            a través de LegalUp.
                        </p>
                    </div>

                    <CategoryCTA category="civil" />

                    {/* FAQS */}
                    <div className="mt-12 mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre el cobro de deudas</h2>
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
                        title="No me pagan una deuda en Chile 2026"
                        url="https://legalup.cl/blog/no-me-pagan-una-deuda-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="no-me-pagan-una-deuda-chile-2026" />

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

            <BlogConversionPopup category="Derecho Civil" topic="cobro-deuda" />
        </div>
    );
};

export default BlogArticle;