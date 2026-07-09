import { Link } from "react-router-dom";
import {
    ArrowLeft,
    Calendar,
    User,
    Clock,
    ChevronRight,
    CheckCircle,
    AlertTriangle,
    Shield,
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

const BlogArticle = () => {
    const faqs = [
        {
            question: "¿Qué se considera violencia intrafamiliar?",
            answer: "Toda conducta que afecte la integridad física o psicológica de una persona dentro de una relación familiar o de convivencia, incluyendo violencia física, psicológica, económica y sexual.",
        },
        {
            question: "¿Puedo denunciar violencia psicológica?",
            answer: "Sí. La ley protege tanto frente a violencia física como psicológica. Insultos constantes, humillaciones, amenazas y control excesivo pueden ser denunciados.",
        },
        {
            question: "¿Necesito tener lesiones visibles para denunciar?",
            answer: "No. Las amenazas, agresiones psicológicas y conductas de control también pueden justificar medidas de protección, incluso sin lesiones físicas.",
        },
        {
            question: "¿Qué es una orden de alejamiento?",
            answer: "Es una medida judicial que impide al agresor acercarse a la víctima en su domicilio, trabajo, lugares de estudio u otros sitios habituales.",
        },
        {
            question: "¿La violencia intrafamiliar puede afectar el régimen de visitas?",
            answer: "Sí. El tribunal puede restringir, suspender o establecer visitas supervisadas cuando existe riesgo para los hijos.",
        },
        {
            question: "¿Qué ocurre si hay hijos involucrados?",
            answer: "Los tribunales priorizan el interés superior del niño y pueden adoptar medidas especiales de protección, como suspender el cuidado personal o regular visitas supervisadas.",
        },
        {
            question: "¿La violencia intrafamiliar constituye un delito?",
            answer: "Dependiendo de los hechos, sí. Las lesiones, amenazas o violaciones pueden ser perseguidas penalmente además de las medidas de protección en familia.",
        },
        {
            question: "¿Puedo denunciar años después?",
            answer: "Sí, aunque generalmente es recomendable actuar lo antes posible para proteger la integridad y recopilar pruebas frescas.",
        },
        {
            question: "¿Necesito un abogado para denunciar?",
            answer: "No es obligatorio para la denuncia inicial, pero es altamente recomendable en casos complejos, con hijos o cuando se requieren medidas urgentes.",
        },
        {
            question: "¿Dónde puedo obtener ayuda inmediata?",
            answer: "En Carabineros (133), PDI (134), Fiscalía, Tribunales de Familia, y a través de abogados especializados en violencia intrafamiliar.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Violencia Intrafamiliar en Chile 2026: qué hacer, cómo denunciar y qué medidas de protección existen"
                description="Aprende qué es la violencia intrafamiliar en Chile, cómo denunciar, qué medidas de protección existen, qué ocurre cuando hay hijos involucrados y cómo funciona el proceso legal."
                image="/assets/violencia-intrafamiliar-chile-2026.png"
                url="https://legalup.cl/blog/violencia-intrafamiliar-chile-2026"
                datePublished="2026-06-12"
                dateModified="2026-06-12"
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
                        Violencia Intrafamiliar (VIF) en Chile 2026: qué hacer, cómo denunciar y qué medidas de protección existen
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "La VIF incluye violencia física, psicológica, económica y sexual",
                                "Se puede denunciar en Carabineros, PDI, Fiscalía o Tribunales de Familia",
                                "El tribunal puede decretar órdenes de alejamiento, prohibición de contacto y retención de armas",
                                "Cuando hay hijos, la violencia puede afectar el cuidado personal y el régimen de visitas",
                                "Actuar rápido y guardar evidencia es clave para proteger a las víctimas",
                                "Existen medidas de protección inmediatas incluso antes de una sentencia definitiva",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        La violencia intrafamiliar (VIF) es una de las problemáticas más relevantes que enfrentan los tribunales de familia y los tribunales penales en Chile. Cada año miles de personas denuncian agresiones físicas, psicológicas, económicas y sexuales ocurridas dentro de relaciones familiares o de convivencia.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>12 de Junio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="violencia-intrafamiliar-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Violencia Intrafamiliar en Chile 2026"
                        url="https://legalup.cl/blog/violencia-intrafamiliar-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO - Expandida */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            A diferencia de lo que muchas personas creen, la violencia intrafamiliar no se limita a golpes o lesiones visibles. La ley chilena reconoce que amenazas, humillaciones constantes, control económico, aislamiento social y otras conductas pueden generar un daño significativo y merecen protección judicial.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Muchas víctimas permanecen durante años en situaciones de riesgo por miedo, dependencia económica o desconocimiento de sus derechos. Por ello, conocer cómo funciona el sistema de protección resulta fundamental.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía revisaremos qué se considera violencia intrafamiliar, cómo denunciar, qué medidas puede decretar un tribunal, qué ocurre cuando existen hijos involucrados y cuándo es recomendable buscar asesoría jurídica especializada. Además, incluimos ejemplos concretos y estadísticas relevantes para dimensionar el problema en Chile.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Según datos del Ministerio de la Mujer y la Equidad de Género, durante 2025 se registraron más de 150.000 denuncias por VIF en el país, siendo la violencia psicológica la más frecuente. Sin embargo, se estima que una gran cantidad de casos nunca son denunciados por temor o falta de información.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si necesitas orientación legal urgente, puedes consultar con un{" "}
                            <Link to="/abogados-divorcio" className="text-green-700 underline hover:text-green-500">
                                abogado especialista en violencia intrafamiliar en Chile
                            </Link>{" "}
                            directamente online.
                        </p>
                    </div>

                    {/* QUE ES VIF */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es la violencia intrafamiliar?</h2>
                        <p className="text-gray-600 mb-4">
                            La violencia intrafamiliar corresponde a cualquier acción u omisión que afecte la vida, integridad física o psicológica de una persona cuando existe una relación familiar o de convivencia con el agresor.
                        </p>
                        <p className="text-gray-600 mb-4">
                            No es necesario que la agresión se repita en el tiempo; un solo episodio grave puede ser suficiente para solicitar medidas de protección. Tampoco se requiere que exista una relación de parentesco directo: las parejas en convivencia, incluso si no están casadas, también están protegidas.
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Personas protegidas por la ley</p>
                            <p className="text-blue-800">Cónyuges, ex cónyuges, convivientes, ex convivientes, padres e hijos, hermanos, abuelos y nietos, y personas que comparten un hogar. No es necesario estar casado para que exista violencia intrafamiliar.</p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                La definición anterior describe el concepto legal de violencia intrafamiliar. En un caso concreto, acreditar que existe violencia no depende solo del relato de la víctima, sino de los antecedentes que puedan presentarse: certificados médicos, mensajes, testigos o registros de llamadas. La valoración que el tribunal haga de esas pruebas determina si concede o no las medidas de protección.
                            </p>
                        </div>
                    </div>

                    {/* TIPOS DE VIF - Más detalles */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Tipos de violencia intrafamiliar</h2>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><span className="text-red-500">👊</span> Violencia física</h3>
                                <p className="text-gray-600">Golpes, empujones, patadas, quemaduras, lesiones con objetos, agresiones que generan daño corporal. Incluye también el uso de armas blancas o de fuego, así como cualquier acción que ponga en riesgo la integridad física de la víctima.</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><span className="text-red-500">🧠</span> Violencia psicológica</h3>
                                <p className="text-gray-600">Insultos constantes, humillaciones, amenazas, manipulación emocional, celos extremos, control excesivo, aislamiento social. También se incluye el desprecio, la indiferencia sistemática y la intimidación a través de gestos o miradas.</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><span className="text-red-500">💰</span> Violencia económica</h3>
                                <p className="text-gray-600">Impedir trabajar, retener ingresos, control completo de gastos, negarse injustificadamente a aportar recursos para el hogar, destrucción de bienes personales o laborales, y ocultamiento de documentos necesarios para realizar trámites económicos.</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><span className="text-red-500">🔞</span> Violencia sexual</h3>
                                <p className="text-gray-600">Cualquier conducta sexual realizada sin consentimiento, incluso dentro del matrimonio o convivencia. También incluye la exposición forzada a material pornográfico, la coerción para realizar actos no deseados y el abuso sexual infantil.</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">Es común que estos tipos de violencia se presenten de manera combinada, agravando el daño a la víctima.</p>
                    </div>

                    {/* QUIEN PUEDE DENUNCIAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Quién puede denunciar violencia intrafamiliar?</h2>
                        <p className="text-gray-600 mb-4">La denuncia puede ser presentada por la propia víctima. Además, dependiendo del caso, también pueden denunciar familiares, vecinos, profesionales de salud, profesores o funcionarios públicos. Cuando existen niños, niñas o adolescentes involucrados, la obligación de protección adquiere especial relevancia.</p>
                        <p className="text-gray-600">Incluso cualquier persona que tenga conocimiento de hechos de violencia intrafamiliar puede ponerlos en conocimiento de las autoridades, especialmente si la víctima se encuentra en una situación de vulnerabilidad o no puede hacerlo por sí misma.</p>
                    </div>

                    {/* DONDE DENUNCIAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Dónde denunciar?</h2>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Carabineros de Chile (24/7)", "Policía de Investigaciones (PDI)", "Fiscalía (cuando hay delito)", "Tribunal de Familia (medidas de protección)"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                                    <Shield className="h-4 w-4 text-red-600" />
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Además, existen líneas de ayuda como el fono 1455 del Servicio Nacional de la Mujer y la Equidad de Género (Sernameg), que entrega orientación y derivación a redes de apoyo.</p>
                    </div>

                    {/* PROCESO PASO A PASO - Más detallado */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-6">¿Cómo funciona el proceso paso a paso?</h2>
                        <div className="space-y-4">
                            {[
                                { step: "Paso 1: Presentación de la denuncia", desc: "La víctima o un tercero informa los hechos ante una autoridad competente (Carabineros, PDI, Fiscalía o Tribunal de Familia)." },
                                { step: "Paso 2: Evaluación del riesgo", desc: "Se analiza la gravedad de la situación y la posibilidad de nuevas agresiones. Se aplica una pauta de riesgo que considera antecedentes, existencia de armas, consumo de alcohol/drogas, entre otros." },
                                { step: "Paso 3: Medidas de protección inmediatas", desc: "Si existe riesgo, pueden decretarse medidas cautelares incluso antes de una sentencia, como orden de alejamiento o prohibición de contacto." },
                                { step: "Paso 4: Audiencias", desc: "El tribunal revisa antecedentes y escucha a las partes involucradas. Normalmente se realizan audiencias preparatoria y de juicio." },
                                { step: "Paso 5: Resolución", desc: "Finalmente se determinan las medidas definitivas o las sanciones correspondientes, que pueden incluir multas, programas de rehabilitación o penas privativas de libertad si hay delito." },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                                    <div>
                                        <h3 className="font-bold text-gray-900">{item.step}</h3>
                                        <p className="text-gray-600">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                El proceso descrito sigue una estructura general, pero cada caso avanza a un ritmo distinto según los antecedentes disponibles. Dos denuncias con hechos similares pueden tener resoluciones diferentes si los medios de prueba aportados por cada víctima no son equivalentes. La rapidez del proceso y las medidas que se decreten dependen de lo que se logre acreditar.
                            </p>
                        </div>
                    </div>

                    {/* NUEVA SECCIÓN: ORDEN DE ALEJAMIENTO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Orden de alejamiento en Chile: cuándo se puede solicitar</h2>
                        <p className="text-gray-600 mb-4">
                            La orden de alejamiento es una de las medidas de protección más importantes que puede decretar un tribunal en casos de violencia intrafamiliar. Su objetivo es impedir que el agresor se acerque a la víctima en su domicilio, lugar de trabajo, establecimiento educacional o cualquier otro sitio que frecuente.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Para solicitar una orden de alejamiento, la víctima debe presentar una denuncia por VIF ante Carabineros, PDI, Fiscalía o directamente en el Tribunal de Familia. El tribunal evaluará el riesgo y, si existen antecedentes suficientes, puede decretar la medida de forma inmediata, incluso sin audiencia previa.
                        </p>
                        <p className="text-gray-600 mb-4">
                            La orden de alejamiento puede ser temporal (por ejemplo, durante la tramitación del proceso) o definitiva, si se acredita la situación de violencia. El incumplimiento de esta medida constituye un delito penal que puede llevar a la prisión del agresor.
                        </p>
                        <div className="bg-yellow-50 p-5 rounded-xl">
                            <p className="font-bold text-yellow-800">Consejo práctico</p>
                            <p className="text-yellow-700">Conserva siempre una copia de la orden de alejamiento y llama al 133 si el agresor la viola. La policía puede detenerlo inmediatamente.</p>
                        </div>
                    </div>

                    {/* MEDIDAS DE PROTECCION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Medidas de protección por violencia intrafamiliar</h2>
                        <div className="space-y-3">
                            {["Orden de alejamiento (domicilio, trabajo, escuela)", "Prohibición de contacto (llamadas, mensajes, redes sociales)", "Abandono del hogar común", "Protección policial y vigilancia preventiva", "Retención de armas de fuego", "Asignación de vivienda provisional a la víctima", "Inscripción en programa de atención psicológica para el agresor"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-green-50 p-3 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">
                            <strong>Importante:</strong> En casos de violencia intrafamiliar, <strong>la mediación familiar no procede</strong> debido al desequilibrio de poder y al riesgo para la víctima. Si se ha decretado una medida de protección, el tribunal derivará el caso a otros mecanismos como programas de intervención para agresores.
                        </p>
                    </div>

                    {/* HIJOS INVOLUCRADOS - Expandido */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre cuando existen hijos?</h2>
                        <p className="text-gray-600 mb-4">La presencia de niños aumenta la gravedad del caso. Los tribunales deben priorizar el interés superior del niño y evaluar cómo la violencia afecta su bienestar. Los hijos pueden ser víctimas directas o testigos de la violencia, lo que genera daños psicológicos significativos.</p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="font-bold text-red-800">Influencia en materias de familia:</p>
                            <ul className="mt-2 space-y-1 text-red-700">
                                <li>• <Link to="/blog/cuidado-personal-hijos-chile-2026" className="underline hover:text-red-900">Cuidado personal</Link> (puede ser suspendido o modificado)</li>
                                <li>• <Link to="/blog/regimen-de-visitas-chile-2026" className="underline hover:text-red-900">Régimen de visitas</Link> (puede restringirse o ser supervisado)</li>
                                <li>• <Link to="/blog/deuda-pension-alimentos-chile-2026" className="underline hover:text-red-900">Pensión de alimentos</Link> (se mantiene independientemente)</li>
                                <li>• Medidas de protección especiales para niños, como la prohibición de que el agresor se acerque a la escuela</li>
                                <li>• Posible intervención de equipos psicosociales del tribunal para evaluar el vínculo parentofilial</li>
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">
                            Si hay hijos involucrados y necesitas regularizar el cuidado personal o la pensión, un{" "}
                            <Link to="/abogados-divorcio" className="text-green-700 underline hover:text-green-500">
                                abogado de familia para casos de VIF
                            </Link>{" "}
                            puede orientarte sobre las medidas disponibles y cómo proteger a tus hijos durante el proceso.
                        </p>
                    </div>

                    {/* VIF Y DIVORCIO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Violencia intrafamiliar y divorcio</h2>
                        <p className="text-gray-600 mb-4">
                            La violencia intrafamiliar suele estar presente en numerosos procesos de separación y divorcio. En ocasiones constituye una de las principales razones por las cuales una persona decide poner término a la relación. Incluso, la existencia de VIF puede ser causal de divorcio culposo (aunque el divorcio unilateral por cese de convivencia es más común hoy).
                        </p>
                        <p className="text-gray-600">
                            La existencia de antecedentes de violencia puede influir en diversas materias familiares. Conoce más sobre{" "}
                            <Link to="/blog/divorcio-unilateral-chile-2026" className="text-green-700 underline">divorcio unilateral en Chile</Link>,{" "}
                            <Link to="/blog/compensacion-economica-divorcio-chile-2026" className="text-green-700 underline">compensación económica</Link>{" "}
                            y{" "}
                            <Link to="/blog/acuerdo-completo-suficiente-chile-2026" className="text-green-700 underline">Acuerdo Completo y Suficiente (ACS)</Link>.
                        </p>
                    </div>

                    {/* PRUEBAS - Más opciones */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pruebas sirven para acreditar violencia intrafamiliar?</h2>
                        <p className="text-gray-600 mb-4">Uno de los errores más comunes es pensar que solo sirven las lesiones físicas visibles. En realidad, pueden utilizarse múltiples medios:</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Informes médicos", "Informes psicológicos", "Fotografías de lesiones", "Mensajes de WhatsApp y SMS", "Correos electrónicos", "Capturas de redes sociales", "Testigos (familiares, vecinos)", "Denuncias previas", "Grabaciones de audio o video (siempre que sean lícitas)", "Certificados de atenciones de salud mental", "Declaraciones de profesionales del colegio o jardín infantil (si los hijos manifiestan haber presenciado hechos)", "Registros de llamadas al fono 133 o 1455"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-4 rounded-lg">
                                    {/* <CheckCircle className="h-4 w-4 text-green-600" /> */}
                                    <span className="text-base">{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Es recomendable conservar todos estos antecedentes ordenados cronológicamente y presentarlos ante el tribunal lo antes posible.</p>
                    </div>

                    <InArticleCTA
                        message="Si sufres violencia intrafamiliar, el momento más importante para pedir medidas de protección es antes de la próxima agresión — no después de que el tribunal haya evaluado los primeros antecedentes."
                        buttonText="Ver Abogados disponibles"
                        category="Derecho Familia"
                    />

                    {/* CASO PRACTICO - Más detallado */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Caso práctico</h2>
                        <div className="bg-blue-50 p-6 rounded-2xl">
                            <p className="font-bold text-blue-800 mb-2">María: violencia psicológica y económica</p>
                            <p className="text-blue-700 mb-2">María convivió durante ocho años con su pareja. Comenzaron insultos, amenazas y control económico: revisaba sus comunicaciones, limitaba el acceso a dinero y la descalificaba constantemente. Luego vinieron empujones y agresiones físicas.</p>
                            <p className="text-blue-700 mb-2">Tras un episodio grave, denunció en Carabineros. El tribunal decretó orden de alejamiento, prohibición de contacto, protección para los hijos y evaluación de riesgo permanente.</p>
                            <p className="text-blue-700">Gracias a la intervención temprana fue posible evitar situaciones más graves. María también recibió asesoría psicológica y pudo acceder a un programa de protección de víctimas.</p>
                        </div>
                    </div>

                    {/* RETIRO DE DENUNCIA - Expandido */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si la víctima retira la denuncia?</h2>
                        <p className="text-gray-600">Muchas personas creen que retirar la denuncia pone fin automáticamente al procedimiento. Sin embargo, dependiendo de la gravedad de los hechos, las autoridades pueden continuar actuando, especialmente cuando existen niños involucrados, hay riesgo relevante para la víctima o los hechos podrían constituir delitos. En algunos casos, el Ministerio Público puede seguir adelante con la investigación aunque la víctima desista, si existen otros antecedentes que acrediten la comisión de un delito.</p>
                    </div>

                    {/* DENUNCIAS FALSAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si la denuncia es falsa?</h2>
                        <p className="text-gray-600">Las denuncias deben basarse en hechos reales. Si una persona realiza acusaciones falsas deliberadamente, podrían existir consecuencias legales, como una querella por denuncia calumniosa o por perjurio. Sin embargo, la simple falta de pruebas suficientes no significa necesariamente que la denuncia sea falsa. Cada situación debe analizarse cuidadosamente. El sistema judicial presume la buena fe del denunciante hasta que se demuestre lo contrario.</p>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "No denunciar por miedo", desc: "Muchas víctimas esperan demasiado tiempo antes de buscar ayuda. Esto puede permitir que la violencia escale y dificultar la obtención de pruebas." },
                                    { title: "No guardar evidencia", desc: "Mensajes, fotografías e informes médicos pueden resultar fundamentales. Borrar estas pruebas o no guardarlas adecuadamente debilita el caso." },
                                    { title: "Minimizar amenazas", desc: "Las amenazas pueden transformarse posteriormente en agresiones físicas. Toda amenaza debe ser denunciada." },
                                    { title: "Exponer a los hijos", desc: "La exposición constante a situaciones de violencia puede generar consecuencias psicológicas importantes en los niños, como trastornos de ansiedad, depresión o conductas agresivas." },
                                    { title: "No buscar ayuda profesional", desc: "La orientación jurídica temprana suele mejorar significativamente la protección disponible y la efectividad de las medidas." },
                                    { title: "Regresar con el agresor después de una denuncia", desc: "Esto puede complicar el proceso judicial y exponer a la víctima a un riesgo aún mayor." },
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

                    {/* QUE HACER - Expandido */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué hacer si estás sufriendo violencia intrafamiliar?</h2>
                        <div className="bg-yellow-50 p-6 rounded-2xl">
                            <ol className="space-y-2 list-decimal list-inside text-yellow-900">
                                <li>Busca ayuda inmediata (familiar, vecino, autoridad).</li>
                                <li>Denuncia en Carabineros, PDI o Fiscalía.</li>
                                <li>Conserva toda la evidencia posible (mensajes, fotos, certificados médicos, audios).</li>
                                <li>Solicita medidas de protección ante el Tribunal de Familia (puedes hacerlo incluso sin abogado en forma urgente).</li>
                                <li>Informa a personas de confianza sobre tu situación y establece una red de apoyo.</li>
                                <li>Busca asesoría jurídica especializada para que te guíe en el proceso y represente tus intereses.</li>
                                <li>Acude a centros de atención a víctimas (como los CAVAD) o al Sernameg para apoyo psicológico y social.</li>
                            </ol>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Los pasos anteriores son una guía general. La efectividad de cada uno depende de las circunstancias concretas: no todas las denuncias terminan en medidas de protección inmediatas, y la evaluación de riesgo que realice la autoridad puede variar según los antecedentes disponibles. Por eso es importante contar con asesoría que ayude a presentar la situación del modo más completo posible.
                            </p>
                        </div>
                    </div>

                    {/* CUANDO CONSULTAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿En qué situaciones conviene consultar cuanto antes a un abogado?</h2>
                        <p className="text-gray-600 mb-4">Existen momentos específicos donde la asesoría legal urgente puede cambiar el curso del caso:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Inmediatamente después de una agresión, antes de la primera audiencia donde se evalúan las medidas de protección.",
                                "Cuando existe una denuncia cruzada y necesitas evaluar tu posición procesal antes de declarar.",
                                "Si te notificaron una orden de alejamiento o medidas cautelares y necesitas entender sus alcances.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-600 flex-shrink-0">•</span>
                                    <span className="text-gray-700 font-bold">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* CTA PRINCIPAL */}
                    <div className="mb-12">
                        <div className="bg-green-900 rounded-2xl p-8 text-center text-white">
                            <h3 className="text-2xl text-green-600 font-serif font-bold mb-3">¿Sufriste una agresión en contexto familiar?</h3>
                            <p className="text-white mb-6">Si hubo una agresión física o psicológica, el momento de pedir medidas de protección es antes de que los hechos se repitan — no después. Un abogado especializado puede orientarte sobre los pasos inmediatos para proteger tu integridad.</p>
                            <Link
                                to="/abogados-divorcio"
                                className="inline-block bg-white text-green-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                Ver abogados especializados en VIF
                            </Link>
                        </div>
                    </div>

                    {/* CONCLUSION - Expandida */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La violencia intrafamiliar es un problema serio que afecta a miles de personas en Chile. Esta guía describe las herramientas legales disponibles y los pasos iniciales para buscar protección.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            La pregunta que queda abierta es cómo se aplican esas herramientas a los hechos específicos de cada caso — qué medidas de protección concede el tribunal, con qué rapidez avanza el proceso y qué pruebas resultan determinantes. Esa respuesta depende de los antecedentes concretos. Si quieres revisar tu situación, puedes consultar con un{" "}
                            <Link to="/abogados-divorcio" className="text-green-700 underline hover:text-green-500">
                                abogado especializado en violencia intrafamiliar
                            </Link>.
                        </p>
                    </div>

                    <CategoryCTA category="familia" />

                    {/* FAQS */}
                    <div className="mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre violencia intrafamiliar en Chile</h2>
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

            <RelatedLawyers category="Derecho de Familia" />

            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
                <div className="mt-8">
                    <BlogShare
                        title="Violencia Intrafamiliar en Chile 2026"
                        url="https://legalup.cl/blog/violencia-intrafamiliar-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="violencia-intrafamiliar-chile-2026" />

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
        </div>
    );
};

export default BlogArticle;