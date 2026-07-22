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
            question: "¿La nulidad del despido significa que vuelvo a trabajar?",
            answer: "No. La nulidad del despido no implica necesariamente la reincorporación al empleo. Su principal efecto es que el empleador continúa obligado a cumplir determinadas obligaciones económicas mientras no regularice las cotizaciones previsionales.",
        },
        {
            question: "¿Puedo demandar aunque el empleador pague las cotizaciones después?",
            answer: "Sí. El pago posterior puede producir efectos jurídicos respecto de la convalidación del despido, pero no elimina automáticamente las consecuencias generadas durante el período en que existieron cotizaciones impagas.",
        },
        {
            question: "¿La nulidad aplica para cualquier causal de despido?",
            answer: "Puede aplicarse respecto de distintas causales cuando al momento del despido existían cotizaciones previsionales impagas. Cada situación debe analizarse individualmente.",
        },
        {
            question: "¿Necesito un abogado?",
            answer: "Los juicios laborales suelen involucrar normas procesales, plazos y pruebas técnicas. Contar con asesoría legal permite evaluar correctamente las acciones más convenientes y preparar adecuadamente la demanda.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Nulidad del despido en Chile 2026: cuándo procede, requisitos y cómo demandar"
                description="Conoce qué es la nulidad del despido en Chile, cuándo procede, cómo se aplica la Ley Bustos, qué ocurre con las cotizaciones impagas y cómo demandar para proteger tus derechos laborales."
                image="/assets/nulidad-despido-chile-2026.png"
                url="https://legalup.cl/blog/nulidad-despido-chile-2026"
                datePublished="2026-07-20"
                dateModified="2026-07-20"
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
                        Nulidad del despido en Chile 2026: cuándo procede, requisitos y cómo demandar
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "La nulidad del despido es una sanción por cotizaciones previsionales impagas al momento del despido",
                                "Conocida como Ley Bustos, busca asegurar que los empleadores cumplan con sus obligaciones previsionales",
                                "Mientras las cotizaciones no sean pagadas, el empleador debe seguir pagando remuneraciones y prestaciones",
                                "Puede demandarse junto con otras acciones como despido injustificado",
                                "Actuar rápidamente es clave para no perder los plazos legales",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Si fuiste despedido y luego descubriste que tu empleador no pagó todas tus cotizaciones previsionales, podrías tener derecho a solicitar la nulidad del despido, una protección establecida por el Código del Trabajo que busca impedir que un empleador despida válidamente a un trabajador mientras mantiene obligaciones previsionales pendientes.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>20 de Julio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="nulidad-despido-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Nulidad del despido en Chile 2026"
                        url="https://legalup.cl/blog/nulidad-despido-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            Este mecanismo, conocido comúnmente como Ley Bustos, puede obligar al empleador a seguir pagando remuneraciones y demás prestaciones laborales hasta regularizar completamente las cotizaciones adeudadas.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía conocerás cuándo procede la nulidad del despido, cuáles son los requisitos, qué ocurre con las cotizaciones impagas, cómo presentar una demanda y qué efectos produce una sentencia favorable.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando un conflicto laboral, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/carta-de-despido-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                carta de despido
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/despido-necesidades-empresa-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                despido por necesidades de la empresa
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
                        <h2 className="text-2xl font-bold mb-4">¿Qué es la nulidad del despido?</h2>
                        <p className="text-gray-600 mb-4">
                            La nulidad del despido es una sanción establecida en el artículo 162 del Código del Trabajo que impide que un despido produzca plenamente sus efectos cuando el empleador mantiene cotizaciones previsionales impagas al momento de poner término al contrato.
                        </p>
                        <p className="text-gray-600 mb-4">
                            En otras palabras, el despido existe, pero mientras las cotizaciones no sean enteradas completamente, el empleador continúa obligado a pagar al trabajador:
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Remuneraciones",
                                "Cotizaciones previsionales",
                                "Beneficios pactados",
                                "Demás prestaciones derivadas del contrato",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl mt-4">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">
                                El objetivo de esta institución no es impedir los despidos, sino asegurar que los empleadores cumplan previamente con sus obligaciones previsionales.
                            </p>
                        </div>
                    </div>

                    {/* LEY BUSTOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es la Ley Bustos?</h2>
                        <p className="text-gray-600 mb-4">
                            La denominada Ley Bustos corresponde a la Ley N.º 19.631, que modificó el Código del Trabajo incorporando la sanción conocida como nulidad del despido.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Antes de esta reforma era frecuente que algunos empleadores despidieran trabajadores manteniendo meses o incluso años de cotizaciones previsionales impagas.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">
                                Con esta modificación legal se estableció un fuerte incentivo económico para regularizar las cotizaciones antes de despedir al trabajador. Actualmente ambas expresiones suelen utilizarse como sinónimos: nulidad del despido y Ley Bustos.
                            </p>
                        </div>
                    </div>

                    <RelatedLawyers category="Derecho Laboral" />

                    {/* CUANDO PROCEDE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo procede la nulidad del despido?</h2>
                        <p className="text-gray-600 mb-4">Generalmente procede cuando concurren estos requisitos:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Existe un contrato de trabajo",
                                "El trabajador fue despedido",
                                "El empleador mantenía cotizaciones previsionales impagas al momento del despido",
                                "Las cotizaciones corresponden al período trabajado",
                                "El empleador no acreditó oportunamente su pago",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">No basta con afirmar que existen deudas previsionales. Es necesario demostrar que efectivamente las cotizaciones estaban pendientes al momento del despido.</p>
                    </div>

                    {/* COTIZACIONES IMPAGAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué cotizaciones deben estar impagas?</h2>
                        <p className="text-gray-600 mb-4">La nulidad puede fundarse en cotizaciones previsionales obligatorias que el empleador tenía el deber legal de enterar.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "AFP",
                                "Cotizaciones de salud (Fonasa o Isapre)",
                                "Seguro de Cesantía",
                                "Cotizaciones adicionales cuando correspondan",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Si estas obligaciones no fueron enteradas oportunamente, el trabajador puede evaluar ejercer la acción judicial correspondiente.</p>
                    </div>

                    {/* CTA IN-ARTICLE 1 */}
                    <InArticleCTA
                        title="¿Te despidieron y descubriste que tus cotizaciones no estaban pagadas?"
                        message="Un abogado laboral puede revisar tus cotizaciones previsionales y evaluar si corresponde demandar la nulidad del despido para proteger tus derechos."
                        buttonText="Hablar con un abogado laboral"
                        category="Derecho Laboral"
                    />

                    {/* COMO SABER */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo saber si tus cotizaciones están pagadas?</h2>
                        <p className="text-gray-600 mb-4">Antes de demandar conviene revisar toda la información previsional disponible.</p>
                        <p className="text-gray-600 mb-4">Puedes consultar directamente en:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "AFP",
                                "AFC Chile",
                                "Fonasa",
                                "Isapre correspondiente",
                                "Previred (cuando sea posible verificar pagos)",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">También es recomendable conservar:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl mt-4">
                            {[
                                "Liquidaciones de sueldo",
                                "Contrato de trabajo",
                                "Anexos",
                                "Carta de despido",
                                "Certificado de cotizaciones",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Estos antecedentes serán fundamentales durante un eventual juicio.</p>
                    </div>

                    {/* PAGO POSTERIOR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si el empleador paga las cotizaciones después del despido?</h2>
                        <p className="text-gray-600 mb-4">
                            Este es uno de los aspectos más importantes. El empleador puede regularizar posteriormente las cotizaciones adeudadas.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Sin embargo, la nulidad del despido produce efectos hasta que dicha regularización sea completa y pueda acreditarse legalmente.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">
                                Mientras ello no ocurra, el trabajador podría tener derecho a seguir percibiendo las remuneraciones y prestaciones establecidas por la ley. Por esta razón resulta fundamental revisar las fechas de pago y la documentación previsional antes de aceptar cualquier propuesta o firmar acuerdos.
                            </p>
                        </div>
                    </div>

                    {/* TODAS LAS DEUDAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Todas las deudas previsionales generan nulidad?</h2>
                        <p className="text-gray-600 mb-4">No necesariamente. Cada caso debe analizarse considerando aspectos como:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "El período efectivamente adeudado",
                                "La existencia de cotizaciones pendientes",
                                "La fecha del despido",
                                "La documentación disponible",
                                "La jurisprudencia aplicable",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Por ello es recomendable que un abogado laboral revise previamente los antecedentes antes de iniciar una demanda.</p>
                    </div>

                    {/* DIFERENCIA CON DESPIDO INJUSTIFICADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿La nulidad reemplaza la demanda por despido injustificado?</h2>
                        <p className="text-gray-600 mb-4">
                            No. Ambas acciones pueden coexistir dependiendo de las circunstancias. Por ejemplo, un trabajador podría sostener simultáneamente que:
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "El despido fue injustificado",
                                "Además existían cotizaciones previsionales impagas",
                                "Corresponde el pago de indemnizaciones",
                                "También procede la nulidad del despido",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">En muchos casos ambas acciones se presentan dentro del mismo juicio laboral, permitiendo al tribunal analizar conjuntamente todas las infracciones cometidas por el empleador.</p>
                    </div>

                    {/* COMO DEMANDAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo se presenta una demanda por nulidad del despido?</h2>
                        <p className="text-gray-600 mb-4">
                            La demanda se presenta ante el Juzgado de Letras del Trabajo competente y normalmente se interpone junto con otras acciones laborales cuando corresponda.
                        </p>
                        <p className="text-gray-600 mb-4">En ella pueden solicitarse, entre otras materias:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Declaración de nulidad del despido",
                                "Pago de remuneraciones desde el despido hasta la convalidación",
                                "Cotizaciones previsionales adeudadas",
                                "Indemnización por años de servicio",
                                "Indemnización sustitutiva del aviso previo",
                                "Recargos legales por despido injustificado, cuando procedan",
                                "Reajustes, intereses y costas del juicio",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">La estrategia dependerá de las circunstancias de cada caso y de la documentación disponible.</p>
                    </div>

                    {/* PLAZOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuál es el plazo para demandar?</h2>
                        <p className="text-gray-600 mb-4">
                            La acción de nulidad del despido está sujeta a plazos legales. En la práctica, es importante consultar con un abogado apenas ocurre el despido para evitar perder la posibilidad de ejercer las acciones correspondientes.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="text-red-800">Mientras más tiempo transcurra, más difícil puede resultar reunir antecedentes, testigos y documentación relevante. Por ello, si sospechas que existen cotizaciones previsionales impagas, conviene revisar inmediatamente tu situación previsional.</p>
                        </div>
                    </div>

                    {/* CTA IN-ARTICLE 2 */}
                    <InArticleCTA
                        title="¿No sabes si tu empleador pagó tus cotizaciones?"
                        message="Un abogado laboral puede revisar tus antecedentes previsionales y decirte si corresponde presentar una demanda por nulidad del despido."
                        buttonText="Consultar mi caso"
                        category="Derecho Laboral"
                    />

                    {/* PRUEBAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pruebas sirven en un juicio por nulidad del despido?</h2>
                        <p className="text-gray-600 mb-4">Entre las pruebas más utilizadas se encuentran:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Contrato de trabajo",
                                "Anexos del contrato",
                                "Carta de despido",
                                "Liquidaciones de remuneraciones",
                                "Certificados de cotizaciones previsionales",
                                "Certificados de AFC",
                                "Certificados de AFP",
                                "Certificados de Fonasa o Isapre",
                                "Comprobantes de pago cuando existan",
                                "Comunicaciones entre trabajador y empleador",
                                "Testigos, cuando corresponda",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Mientras más completa sea la documentación, mayores posibilidades existen de acreditar la existencia de cotizaciones previsionales impagas.</p>
                    </div>

                    {/* QUE OCURRE SI ACOGE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si el tribunal acoge la demanda?</h2>
                        <p className="text-gray-600 mb-4">Si el tribunal declara la nulidad del despido, el empleador deberá asumir las consecuencias establecidas por la ley.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Pago de remuneraciones por el período correspondiente",
                                "Entero de las cotizaciones previsionales pendientes",
                                "Pago de indemnizaciones laborales",
                                "Reajustes e intereses",
                                "Costas del juicio cuando corresponda",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Cada sentencia dependerá de los hechos acreditados y de las acciones ejercidas por el trabajador.</p>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes que cometen los trabajadores</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "No revisar las cotizaciones previsionales después del despido", desc: "Muchos trabajadores nunca revisan si sus cotizaciones fueron pagadas." },
                                    { title: "Firmar documentos sin comprender su contenido", desc: <span>Un <Link to="/blog/como-calcular-tu-finiquito-chile-2026" className="text-green-700 underline hover:text-green-500">finiquito</Link> mal firmado puede limitar las posibilidades de reclamar.</span> },
                                    { title: "Dejar pasar los plazos legales", desc: "Los plazos para demandar son breves y su vencimiento puede impedir cualquier reclamación." },
                                    { title: "No conservar liquidaciones de sueldo", desc: "Las liquidaciones son clave para acreditar la remuneración y calcular indemnizaciones." },
                                    { title: "Asumir que todas las cotizaciones fueron pagadas solo porque aparecían descontadas en la liquidación", desc: "El descuento no significa que el empleador haya enterado efectivamente las cotizaciones." },
                                    { title: "Esperar varios meses antes de consultar a un abogado", desc: "Detectar oportunamente una deuda previsional puede cambiar completamente el resultado del proceso." },
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

                    {/* JURISPRUDENCIA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Jurisprudencia sobre la nulidad del despido</h2>
                        <p className="text-gray-600 mb-4">
                            Los tribunales laborales han reiterado que la finalidad de la nulidad del despido es proteger el derecho del trabajador a que sus cotizaciones previsionales sean enteradas oportunamente por el empleador.
                        </p>
                        <div className="bg-gray-50 p-5 rounded-xl">
                            <p className="font-bold mb-2">En términos generales, la jurisprudencia ha señalado que:</p>
                            <ul className="space-y-2 text-gray-700">
                                <li>• La obligación de pagar las cotizaciones corresponde exclusivamente al empleador</li>
                                <li>• El descuento efectuado al trabajador no libera al empleador de enterarlas en las instituciones previsionales</li>
                                <li>• La nulidad del despido constituye una sanción frente al incumplimiento de dicha obligación</li>
                                <li>• Corresponde al empleador acreditar el pago íntegro y oportuno de las cotizaciones cuando existe controversia</li>
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">Cada caso será resuelto considerando sus propios antecedentes, pero la existencia de cotizaciones previsionales impagas suele ser uno de los elementos centrales del juicio.</p>
                    </div>

                    {/* DIFERENCIAS TABLA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué diferencias existen entre la nulidad del despido y el despido injustificado?</h2>
                        <p className="text-gray-600 mb-4">Muchas personas creen que ambos conceptos significan lo mismo, pero en realidad corresponden a acciones distintas.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 p-3 text-left font-bold">Nulidad del despido</th>
                                        <th className="border border-gray-300 p-3 text-left font-bold">Despido injustificado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Se basa en cotizaciones previsionales impagas.</td>
                                        <td className="border border-gray-300 p-3">Se basa en una causal de despido mal aplicada o inexistente.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Busca sancionar el incumplimiento previsional del empleador.</td>
                                        <td className="border border-gray-300 p-3">Busca obtener indemnizaciones por un despido ilegal.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Puede obligar al empleador a seguir pagando remuneraciones hasta regularizar las cotizaciones.</td>
                                        <td className="border border-gray-300 p-3">Puede aumentar las indemnizaciones mediante los recargos legales establecidos en el Código del Trabajo.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Puede coexistir con otras acciones laborales.</td>
                                        <td className="border border-gray-300 p-3">También puede ejercerse junto con otras acciones, incluida la nulidad del despido.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-gray-600 mt-4">En muchos juicios laborales ambas acciones se presentan conjuntamente cuando el trabajador fue despedido sin fundamento y, además, existían cotizaciones previsionales impagas.</p>
                    </div>

                    {/* INSPECCION DEL TRABAJO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Conviene reclamar primero en la Inspección del Trabajo?</h2>
                        <p className="text-gray-600 mb-4">
                            Depende de cada situación. En algunos casos, acudir previamente a la Inspección del Trabajo permite obtener antecedentes útiles, intentar una conciliación o reunir documentación que posteriormente será utilizada en un juicio.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Sin embargo, cuando existen cotizaciones previsionales impagas y el trabajador pretende ejercer acciones judiciales, resulta recomendable consultar oportunamente con un abogado laboral para definir la estrategia más adecuada y evitar que transcurran los plazos legales.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">La decisión de acudir primero a la Inspección o demandar directamente dependerá de las circunstancias particulares del caso, del tipo de despido y de los objetivos del trabajador.</p>
                        </div>
                    </div>

                    {/* CONCLUSION */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La nulidad del despido constituye una importante protección para los trabajadores cuando el empleador incumple su obligación de pagar las cotizaciones previsionales. Si al revisar tus antecedentes descubres que existen cotizaciones impagas, podrías tener derecho a exigir no solo su pago, sino también las consecuencias económicas contempladas por la Ley Bustos.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Actuar rápidamente, reunir la documentación necesaria y recibir asesoría jurídica especializada puede marcar una diferencia importante en el resultado del juicio. Si necesitas orientación, puedes consultar con un{" "}
                            <Link to="/abogado-laboral" className="text-green-700 underline hover:text-green-500">abogado laboral en Chile</Link>{" "}
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
                                to="/blog/despido-injustificado-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Despido injustificado en Chile 2026
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/demanda-laboral-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Cómo demandar por despido injustificado
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
                                to="/blog/inspeccion-del-trabajo-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Inspección del Trabajo en Chile
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/como-calcular-tu-finiquito-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Finiquito en Chile 2026
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/tutela-laboral-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Tutela laboral en Chile
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/autodespido-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Autodespido en Chile 2026
                            </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
                <div className="mt-8">
                    <BlogShare
                        title="Nulidad del despido en Chile 2026"
                        url="https://legalup.cl/blog/nulidad-despido-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="nulidad-despido-chile-2026" />

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

            <BlogConversionPopup category="Derecho Laboral" topic="nulidad-despido" />
        </div>
    );
};

export default BlogArticle;