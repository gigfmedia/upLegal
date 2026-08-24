import { Link } from "react-router-dom";
import {
    ArrowLeft,
    Calendar,
    User,
    Clock,
    ChevronRight,
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
            question: "¿Cuáles son las vías legales para cobrar una deuda en Chile?",
            answer: "Las principales vías son la negociación o mediación extrajudicial, el juicio ejecutivo (cuando existe título ejecutivo como pagaré o escritura pública) y el juicio ordinario (cuando hay que probar la existencia de la deuda). La elección depende del tipo de documento y del monto involucrado.",
        },
        {
            question: "¿Qué es un juicio ejecutivo y cuándo procede?",
            answer: "Es un procedimiento judicial que se inicia cuando el acreedor tiene un título ejecutivo: pagaré, escritura pública, sentencia firme, acta de avenimiento, entre otros. Permite cobrar de forma más rápida y solicitar el embargo de bienes del deudor para asegurar el pago.",
        },
        {
            question: "¿Puedo cobrar una deuda sin título ejecutivo?",
            answer: "Sí. Si no existe título ejecutivo, puedes demandar por la vía ordinaria, donde deberás probar la existencia y el monto de la deuda con contratos, transferencias, correos u otros medios de prueba. El juicio suele ser más largo, pero permite recuperar el dinero cuando no hay documento ejecutivo.",
        },
        {
            question: "¿Cuánto cuesta demandar por una deuda?",
            answer: "Los costos varían según la vía elegida: honorarios de abogado, tasas y costas judiciales. En el juicio ejecutivo y ordinario, en general las costas las paga el deudor si es condenado. Antes de demandar, conviene comparar el monto adeudado con los costos estimados del procedimiento.",
        },
        {
            question: "¿Cuál es el plazo para demandar el cobro de una deuda?",
            answer: "Por regla general, la acción ejecutiva prescribe en tres años y la ordinaria en cinco, contados desde que la deuda se hizo exigible. Existen plazos especiales según el título. La prescripción se interrumpe con la demanda o con el reconocimiento escrito del deudor.",
        },
        {
            question: "¿Qué pasa si el deudor no tiene bienes?",
            answer: "El cobro depende de que existan bienes embargables o ingresos del deudor. Un abogado puede evaluar la situación patrimonial del deudor antes de iniciar el juicio para evitar costos inútiles. En algunos casos conviene negociar un acuerdo de pago en cuotas.",
        },
        {
            question: "¿Me sirve un abogado para cobrar una deuda?",
            answer: "Sí. Las demandas requieren patrocinio de abogado y una asesoría permite elegir la vía correcta, verificar la prescripción, redactar correctamente la demanda y evitar errores de forma que pueden alargar o perjudicar el cobro.",
        },
        {
            question: "¿Cómo puedo cobrar una deuda sin ir a juicio?",
            answer: "La negociación directa y la mediación son alternativas válidas. Enviar un reclamo formal por escrito, ofrecer facilidades de pago o llegar a un acuerdo documentado con un reconocimiento de deuda puede resolver el conflicto sin tribunales y con menor costo.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Cómo cobrar una deuda legalmente en Chile 2026: las vías legales para recuperar tu dinero"
                description="Descubre las vías legales para cobrar una deuda en Chile: negociación, juicio ejecutivo, juicio ordinario y embargo. Plazos, costos y qué hacer paso a paso."
                image="/assets/como-cobrar-deuda-legalmente-chile-2026.png"
                url="https://legalup.cl/blog/como-cobrar-deuda-legalmente-chile-2026"
                datePublished="2026-08-07"
                dateModified="2026-08-07"
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
                        Cómo cobrar una deuda legalmente en Chile 2026: las vías legales para recuperar tu dinero
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "Empieza siempre por la gestión extrajudicial: reclamo escrito y negociación.",
                                "Si tienes título ejecutivo (pagaré, escritura), la vía rápida es el juicio ejecutivo.",
                                "Si no tienes título ejecutivo, la vía es el juicio ordinario, que requiere probar la deuda.",
                                "Verifica los plazos de prescripción antes de iniciar cualquier gestión judicial.",
                                "En el juicio ejecutivo se puede pedir el embargo de bienes del deudor para asegurar el pago.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Cobrar una deuda de forma legal en Chile es posible, pero requiere elegir la vía correcta según el tipo de documento que tengas y el monto involucrado. Conocer tus opciones antes de actuar puede ahorrarte tiempo, dinero y frustraciones.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>7 de Agosto, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="como-cobrar-deuda-legalmente-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Cómo cobrar una deuda legalmente en Chile"
                        url="https://legalup.cl/blog/como-cobrar-deuda-legalmente-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            En Chile, la ley entrega al acreedor distintas herramientas para recuperar su dinero. La clave está en identificar cuál se ajusta a tu situación: a veces basta una negociación bien planteada; otras veces, solo un juicio permite forzar el pago.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía actualizada para 2026 te explicamos las vías legales de cobro, en qué casos conviene cada una, cuánto cuestan y qué pasos debes seguir para cobrar tu deuda de forma efectiva.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si te deben dinero, te recomendamos también revisar{" "}
                            <Link
                                to="/blog/no-me-pagan-una-deuda-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                qué hacer cuando no te pagan una deuda
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/prescripcion-de-deudas-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                la prescripción de deudas
                            </Link>{" "}
                            y{" "}
                            <Link
                                to="/blog/juicio-ejecutivo-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                el juicio ejecutivo
                            </Link>.
                        </p>
                    </div>

                    {/* VÍAS DE COBRO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Las vías legales para cobrar una deuda</h2>
                        <p className="text-gray-600 mb-4">
                            Existen tres vías principales, y la elección depende de tus documentos y de la disposición del deudor a pagar.
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 p-3 text-left font-bold">Vía</th>
                                        <th className="border border-gray-300 p-3 text-left font-bold">Cuándo usar</th>
                                        <th className="border border-gray-300 p-3 text-left font-bold">Ventajas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Negociación o mediación</td>
                                        <td className="border border-gray-300 p-3">Cuando el deudor está dispuesto a conversar y existe margen de acuerdo.</td>
                                        <td className="border border-gray-300 p-3">Rápida, de bajo costo y mantiene la relación entre las partes.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Juicio ejecutivo</td>
                                        <td className="border border-gray-300 p-3">Cuando tienes un título ejecutivo (pagaré, escritura, sentencia firme).</td>
                                        <td className="border border-gray-300 p-3">Más rápido y permite solicitar embargo de bienes.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Juicio ordinario</td>
                                        <td className="border border-gray-300 p-3">Cuando no hay título ejecutivo y hay que probar la deuda.</td>
                                        <td className="border border-gray-300 p-3">Permite cobrar deudas sin documento ejecutivo.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* VÍA 1 */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Vía 1: La negociación y el acuerdo extrajudicial</h2>
                        <p className="text-gray-600 mb-4">
                            Antes de acudir a tribunales, intenta resolver la deuda de forma extrajudicial. Un reclamo formal por escrito, con plazo para pagar, suele motivar al deudor y deja constancia de tu gestión.
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Envía una carta o correo con el detalle de la deuda y un plazo para pagar.",
                                "Ofrece facilidades: pago total, en cuotas o con renegociación de plazos.",
                                "Si llegas a acuerdo, formalízalo por escrito con un reconocimiento de deuda.",
                                "El reconocimiento escrito interrumpe la prescripción y refuerza tu posición.",
                                "Mantén registro de todos los correos y mensajes intercambiados.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-600 flex-shrink-0">✓</span>
                                    <span className="text-gray-700 font-bold">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">
                            La negociación no solo evita costos judiciales: si no resulta, te entrega información valiosa sobre la disposición del deudor y su situación patrimonial. Si quieres profundizar, revisa nuestra{" "}
                            <Link to="/blog/reconocimiento-de-deuda-chile-2026" className="text-green-700 underline hover:text-green-500">guía del reconocimiento de deuda</Link>.
                        </p>
                    </div>

                    <RelatedLawyers category="Derecho Civil" />

                    {/* VÍA 2 */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Vía 2: El juicio ejecutivo (cobro rápido con título ejecutivo)</h2>
                        <p className="text-gray-600 mb-4">
                            El juicio ejecutivo es la vía más rápida para cobrar cuando cuentas con un título ejecutivo: pagaré, escritura pública, sentencia firme, acta de avenimiento o instrumento privado reconocido judicialmente, entre otros.
                        </p>
                        <p className="text-gray-600">
                            En este procedimiento no se discute la existencia de la deuda, porque el documento ya la acredita. El tribunal despacha mandamiento de ejecución y embargo, y el deudor solo puede defenderse oponiendo excepciones dentro de un plazo breve.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl mt-4">
                            <p className="font-bold text-amber-900">Importante</p>
                            <p className="text-amber-800">
                                El pagaré es uno de los títulos ejecutivos más usados en Chile. Si tu deuda está documentada en un pagaré, revisa nuestra{" "}
                                <Link to="/blog/pagare-chile-2026" className="underline">guía del pagaré en Chile</Link>{" "}
                                antes de iniciar el cobro.
                            </p>
                        </div>
                    </div>

                    <InArticleCTA
                        category="Derecho Civil"
                        title="¿Tienes un título ejecutivo y el deudor no paga?"
                        message="Un abogado civil puede revisar tu documento, verificar que cumpla los requisitos y orientarte sobre el juicio ejecutivo y el embargo."
                    />

                    {/* VÍA 3 */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Vía 3: El juicio ordinario (cobro sin título ejecutivo)</h2>
                        <p className="text-gray-600 mb-4">
                            Si no tienes un título ejecutivo, aún puedes demandar por la vía ordinaria. En este caso, la deuda no parte acreditada, por lo que deberás probar su existencia con contratos, transferencias, correos, facturas u otros medios.
                        </p>
                        <p className="text-gray-600">
                            El juicio ordinario es más largo que el ejecutivo, pero es la vía correcta cuando no existe documento ejecutivo. Un abogado puede evaluar si las pruebas disponibles son suficientes para sostener la demanda.
                        </p>
                        <div className="bg-green-50 p-5 rounded-xl mt-4">
                            <p className="text-green-800">En ambos juicios, si el deudor es condenado, en general debe pagar además las costas del procedimiento, lo que refuerza la conveniencia de ejercer la acción correspondiente.</p>
                        </div>
                    </div>

                    {/* PRESCRIPCIÓN */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">El plazo de prescripción: corre en tu contra</h2>
                        <p className="text-gray-600 mb-4">
                            El derecho a cobrar una deuda no es eterno. En Chile, por regla general la acción ejecutiva prescribe en tres años y la ordinaria en cinco, contados desde que la deuda se hizo exigible. Cuando la acción ejecutiva prescribe, se transforma en ordinaria por dos años más.
                        </p>
                        <p className="text-gray-600">
                            La prescripción se interrumpe, entre otras formas, por el reconocimiento escrito del deudor o por la interposición de la demanda. Si el plazo está por vencer, actuar de inmediato es decisivo.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl mt-4">
                            <p className="text-amber-800">Te recomendamos revisar nuestra{" "}
                                <Link to="/blog/prescripcion-de-deudas-chile-2026" className="underline">guía completa de prescripción de deudas</Link>{" "}
                                para conocer los plazos aplicables a tu caso.
                            </p>
                        </div>
                    </div>

                    {/* EMBARGO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">El embargo: cómo se asegura el pago</h2>
                        <p className="text-gray-600 mb-4">
                            En el juicio ejecutivo, el acreedor puede solicitar el embargo de bienes del deudor para asegurar el pago. El embargo es una medida cautelar: los bienes quedan afectos al cumplimiento de la obligación y, si no se paga, pueden rematarse.
                        </p>
                        <p className="text-gray-600">
                            La ley protege ciertos bienes inembargables, como los necesarios para la subsistencia del deudor y su familia. Si quieres saber más, revisa nuestra{" "}
                            <Link to="/blog/embargo-chile-2026" className="text-green-700 underline hover:text-green-500">guía del embargo en Chile</Link>.
                        </p>
                    </div>

                    {/* DURACION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuánto demora el cobro judicial de una deuda?</h2>
                        <p className="text-gray-600 mb-4">
                            La duración depende del tipo de juicio y de la defensa que ejerza el deudor. Un juicio ejecutivo, cuando el título es claro y el deudor no opone excepciones, puede resolverse en un plazo relativamente breve en comparación con un juicio ordinario. Si el deudor presenta excepciones o defensas, el procedimiento se alarga porque esas cuestiones deben discutirse.
                        </p>
                        <p className="text-gray-600 mb-4">
                            El juicio ordinario, en el que se prueba la existencia de la deuda, suele tomar más tiempo: incluye etapas de discusión, prueba y sentencia, y puede extenderse por varios meses e incluso más si se presentan recursos. Después de una sentencia favorable, aún queda la etapa de cobro efectivo: solicitar el embargo de bienes y, si el deudor no paga, el remate.
                        </p>
                        <p className="text-gray-600">
                            En la práctica, el tiempo total depende de la cooperación del deudor y de la carga de trabajo del tribunal. Una asesoría temprana ayuda a estimar plazos realistas y a elegir la vía más rápida según el caso. Lo importante es no quedarse inactivo: los plazos de prescripción corren aunque estés negociando.
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
                                        <td className="border border-gray-300 p-3">Cartas, correos y llamadas: bajo costo, sin fuerza de cobro directa.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Honorarios de abogado</td>
                                        <td className="border border-gray-300 p-3">Dependen del profesional y de la complejidad del caso.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Costas judiciales</td>
                                        <td className="border border-gray-300 p-3">Gastos del procedimiento que, en general, paga el deudor si pierde.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-gray-600 mt-4">Antes de demandar, conviene comparar el monto de la deuda con los costos estimados para evaluar si el cobro judicial vale la pena.</p>
                    </div>

                    {/* CUANDO CONSULTAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo conviene consultar a un abogado?</h2>
                        <p className="text-gray-600 mb-4">
                            No siempre necesitas un abogado para el primer acercamiento: las gestiones extrajudiciales puedes hacerlas tú mismo. Sin embargo, conviene buscar asesoría en ciertos momentos clave.
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Antes de demandar, para elegir la vía correcta y verificar la prescripción.",
                                "Cuando el monto es alto o la documentación es compleja.",
                                "Si el deudor se declara insolvente o hay sospechas de que oculta bienes.",
                                "Si recibiste una contra-propuesta de negociación que quieres formalizar sin errores.",
                                "Cuando el juicio ya está en curso y necesitas defensa o seguimiento técnico.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-600 flex-shrink-0">✓</span>
                                    <span className="text-gray-700 font-bold">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">
                            La asesoría temprana suele costar menos que corregir errores después. Un abogado puede revisar tus documentos, evaluar la viabilidad del cobro y decirte con realismo cuánto demorará y qué puedes esperar.
                        </p>
                    </div>

                    {/* ERRORES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores comunes al cobrar una deuda</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Esperar demasiado", desc: "Cada día que pasa acerca la prescripción. Si la deuda está próxima a prescribir, actúa de inmediato." },
                                    { title: "Cobrar sin documentos", desc: "Sin pruebas de la deuda, cualquier vía legal se debilita. Reúne la documentación antes de actuar." },
                                    { title: "Elegir mal la vía", desc: "Demandar por la vía ejecutiva sin título ejecutivo, o a la inversa, puede alargar el proceso y aumentar los costos." },
                                    { title: "No formalizar los acuerdos", desc: "Un acuerdo verbal no interrumpe la prescripción ni sirve de título. Formaliza siempre por escrito." },
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

                    <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl mb-6">
                        <p className="font-bold text-amber-900">El tiempo juega en tu contra</p>
                        <p className="text-amber-800">Si ya existe un embargo o una demanda en tu contra, cada día sin actuar puede significar perder la oportunidad de oponer defensas como la prescripción o la nulidad de la notificación. No esperes a que el remate esté cerca para buscar ayuda.</p>
                    </div>

                    <InArticleCTA
                        title="¿Te deben dinero y no sabes por dónde empezar?"
                        message="Un abogado civil puede revisar tu documentación, verificar la prescripción y orientarte sobre la vía más rápida para recuperar tu dinero."
                        buttonText="Hablar con un abogado civil"
                        category="Derecho Civil"
                    />

                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Cobrar una deuda en Chile es legal y posible, siempre que elijas la vía correcta y actúes dentro de los plazos. La negociación resuelve muchos casos; el juicio ejecutivo, los que tienen título ejecutivo; y el juicio ordinario, los que requieren probar la deuda.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Antes de iniciar cualquier gestión, reúne los documentos, verifica la prescripción y evalúa los costos. Si necesitas orientación, puedes consultar con un{" "}
                            <Link to="/search?specialty=Derecho Civil" className="text-green-700 underline hover:text-green-500">abogado civil en Chile</Link>{" "}
                            a través de LegalUp. Revisa también nuestras guías de{" "}
                            <Link to="/blog/no-me-pagan-una-deuda-chile-2026" className="text-green-700 underline hover:text-green-500">qué hacer si no te pagan</Link>
                            ,{" "}
                            <Link to="/blog/juicio-ejecutivo-chile-2026" className="text-green-700 underline hover:text-green-500">juicio ejecutivo</Link>{" "}
                            y{" "}
                            <Link to="/blog/prescripcion-de-deudas-chile-2026" className="text-green-700 underline hover:text-green-500">prescripción de deudas</Link>.
                        </p>
                    </div>

                    <CategoryCTA category="civil" />

                    {/* FAQS */}
                    <div className="mt-12 mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre el cobro legal de deudas</h2>
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
                        title="Cómo cobrar una deuda legalmente en Chile"
                        url="https://legalup.cl/blog/como-cobrar-deuda-legalmente-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="como-cobrar-deuda-legalmente-chile-2026" />

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