import { Link } from "react-router-dom";
import {
    ArrowLeft,
    Calendar,
    User,
    Clock,
    ChevronRight,
    CheckCircle,
    AlertCircle,
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
            question: "¿Qué hago si no me dejan ver a mi hijo?",
            answer: "Debes acudir al Tribunal de Familia y solicitar el cumplimiento del régimen establecido. No intentes resolverlo por tu cuenta ni dejes de pagar alimentos.",
        },
        {
            question: "¿Puedo dejar de pagar alimentos si no me dejan verlo?",
            answer: "No. Ambas materias son independientes. El incumplimiento del régimen de visitas no suspende la obligación alimenticia.",
        },
        {
            question: "¿Qué pruebas sirven para acreditar incumplimientos?",
            answer: "Mensajes de WhatsApp, correos electrónicos, testigos, constancias policiales, grabaciones (lícitas) y cualquier evidencia que demuestre la negativa sistemática.",
        },
        {
            question: "¿El tribunal puede multar al padre incumplidor?",
            answer: "Sí. El juez puede imponer multas, amonestaciones, compensación de visitas perdidas y, en casos graves, apremios o incluso modificar el cuidado personal.",
        },
        {
            question: "¿Se pueden recuperar las visitas perdidas?",
            answer: "Sí. El tribunal puede ordenar la compensación de los días no ejercidos, por ejemplo, ampliando el tiempo en vacaciones o fines de semana.",
        },
        {
            question: "¿Qué pasa si existe violencia intrafamiliar?",
            answer: "Las visitas pueden ser restringidas o supervisadas. La seguridad del niño, niña o adolescente es prioritaria y el tribunal evaluará el riesgo antes de decidir.",
        },
        {
            question: "¿Se puede modificar el régimen de visitas?",
            answer: "Sí, cuando existen cambios relevantes en las circunstancias familiares, como cambio de domicilio, horarios laborales o necesidades del niño, niña o adolescente.",
        },
        {
            question: "¿Necesito abogado para denunciar el incumplimiento?",
            answer: "Es altamente recomendable. Un abogado de familia puede presentar correctamente la solicitud, reunir pruebas y proteger tus derechos ante el tribunal.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Incumplimiento del régimen de relación directa y regular en Chile 2026: qué hacer si no te dejan ver a tus hijos"
                description="Aprende qué hacer si no te permiten cumplir el régimen de visitas en Chile. Conoce las medidas judiciales, sanciones, mediación y cómo exigir el cumplimiento de la relación directa y regular."
                image="/assets/incumplimiento-regimen-visitas-chile-2026.png"
                url="https://legalup.cl/blog/incumplimiento-regimen-visitas-chile-2026"
                datePublished="2026-06-15"
                dateModified="2026-06-15"
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
                        Incumplimiento del régimen de relación directa y regular en Chile 2026: qué hacer si no te dejan ver a tus hijos
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "El incumplimiento ocurre cuando se impide, dificulta o entorpece el contacto establecido con los hijos",
                                "No debes dejar de pagar alimentos; son materias independientes",
                                "Reúne pruebas (mensajes, testigos, constancias) y acude al Tribunal de Familia",
                                "El juez puede aplicar multas, compensar visitas perdidas o modificar el cuidado personal",
                                "La mediación es obligatoria en muchos casos, excepto cuando hay violencia intrafamiliar",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Uno de los conflictos familiares más frecuentes después de una separación o divorcio ocurre cuando uno de los padres impide que el otro mantenga contacto con sus hijos pese a existir un régimen de relación directa y regular establecido judicialmente o mediante acuerdo aprobado por un tribunal.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>15 de Junio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="incumplimiento-regimen-visitas-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Incumplimiento del régimen de relación directa y regular en Chile 2026"
                        url="https://legalup.cl/blog/incumplimiento-regimen-visitas-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            En términos simples, muchas personas lo conocen como "incumplimiento del régimen de visitas". Sin embargo, jurídicamente el concepto utilizado actualmente por la legislación chilena es relación directa y regular, una institución que busca proteger el derecho del niño a mantener vínculos permanentes con ambos padres.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Cuando uno de los progenitores incumple reiteradamente el régimen establecido, el problema no afecta únicamente al otro padre. También puede perjudicar gravemente el desarrollo emocional del niño, generando conflictos familiares de largo plazo.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía completa revisaremos qué hacer cuando no te permiten ver a tus hijos, cuáles son las herramientas legales disponibles, qué sanciones puede aplicar el tribunal y cómo funciona el procedimiento en Chile durante 2026.
                        </p>
                    </div>

                    {/* QUE ES LA RELACION DIRECTA Y REGULAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es la relación directa y regular?</h2>
                        <p className="text-gray-600 mb-4">
                            La relación directa y regular es el derecho y deber que tiene un padre o madre que no ejerce el cuidado personal de mantener una relación permanente con sus hijos. Su objetivo principal es proteger el vínculo afectivo entre padres e hijos después de una separación.
                        </p>
                        <p className="text-gray-600 mb-4">
                            La relación directa y regular puede establecerse por acuerdo entre los padres, mediante mediación familiar o por resolución judicial. El tribunal siempre priorizará el interés superior del niño al momento de definir este régimen.
                        </p>

                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">Si todavía no conoces el funcionamiento general de esta institución, revisa nuestra guía sobre <Link to="/blog/regimen-visitas-chile-2026" className="underline">Régimen de visitas en Chile 2026</Link>.</p>
                        </div>
                        <p className="text-gray-600 mt-4">La relación directa y regular no se limita a la entrega y devolución del niño en fechas determinadas. Comprende también el derecho a mantener comunicaciones regulares, a recibir información sobre la educación y salud del hijo, y a participar en decisiones relevantes de su vida. El incumplimiento de cualquiera de estas facetas puede ser igualmente reclamable ante el tribunal, aunque muchas personas se concentran únicamente en el régimen presencial.</p>
                    </div>

                    <RelatedLawyers category="Derecho de Familia" />


                    {/* QUE SE CONSIDERA INCUMPLIMIENTO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué se considera incumplimiento del régimen de visitas?</h2>
                        <p className="text-gray-600 mb-4">Existe incumplimiento cuando uno de los padres impide, dificulta o entorpece el contacto establecido con el hijo. Algunos ejemplos frecuentes incluyen:</p>
                        <div className="space-y-3">
                            {["Negarse a entregar al niño", "Cambiar unilateralmente los horarios", "Ocultar información relevante (cambios de domicilio, colegio)", "Impedir comunicaciones (llamadas, videollamadas)", "Interferir psicológicamente en el vínculo"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* QUE PASA SI NO ME DEJAN VER A MI HIJO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si no me dejan ver a mi hijo?</h2>
                        <p className="text-gray-600 mb-4">
                            Si existe un régimen vigente aprobado por tribunal o mediación, no debes intentar resolver el problema por tu cuenta. Muchas personas reaccionan dejando de pagar alimentos, acudiendo al domicilio sin autorización o generando conflictos frente al niño. Estas conductas suelen empeorar la situación.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl mb-4">
                            <p className="font-bold text-red-800">La vía correcta:</p>
                            <p className="text-red-700">Solicitar judicialmente el cumplimiento del régimen a través del Tribunal de Familia.</p>
                        </div>

                        


                    </div>
<InArticleCTA category="Derecho de Familia"  title="¿Incumplen el régimen de visitas de tus hijos?" message="Un abogado de familia puede evaluar el incumplimiento, solicitar modificaciones y buscar medidas para proteger el derecho de relación." />


                    {/* INDEPENDENCIA ENTRE ALIMENTOS Y VISITAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Importante: la pensión de alimentos y las visitas son independientes</h2>
                        <p className="text-gray-600 mb-4">
                            Uno de los errores más frecuentes es creer que el incumplimiento de visitas permite dejar de pagar pensión de alimentos. Esto es falso. La obligación de pagar alimentos y el derecho de mantener relación con los hijos son materias completamente independientes.
                        </p>
                        <div className="bg-yellow-50 p-5 rounded-xl">
                            <p className="text-yellow-800">Por ejemplo: si no te dejan ver a tu hijo, debes seguir pagando alimentos. Si existe deuda de alimentos, igualmente puedes exigir visitas. El tribunal analizará ambas materias por separado.</p>
                        </div>
                        <p className="text-gray-600 mt-4">
                            Si tienes dudas sobre este tema, revisa nuestras guías sobre{" "}
                            <Link to="/blog/pension-alimentos-chile-2026" className="text-green-700 underline">pensión de alimentos</Link>,{" "}
                            <Link to="/blog/deuda-pension-alimentos-chile-2026" className="text-green-700 underline">deuda de pensión de alimentos</Link>{" "}
                            y{" "}
                            <Link to="/blog/aumento-pension-alimentos-chile-2026" className="text-green-700 underline">aumento de pensión de alimentos</Link>.
                        </p>
                    </div>

                    {/* COMO DENUNCIAR EL INCUMPLIMIENTO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo denunciar el incumplimiento?</h2>
                        <div className="space-y-4">
                            {[
                                { step: "Paso 1: Reunir evidencia", desc: "WhatsApp, correos, testigos, constancias. Mientras más antecedentes, más fácil será acreditar la situación." },
                                { step: "Paso 2: Presentar solicitud ante el tribunal", desc: "Un abogado puede solicitar medidas para asegurar el cumplimiento del régimen." },
                                { step: "Paso 3: Audiencia", desc: "El juez escucha ambas versiones y puede ordenar informes psicosociales." },
                                { step: "Paso 4: Resolución", desc: "Si se acredita el incumplimiento, el tribunal aplica multas, compensaciones u otras sanciones." },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                                    {/* <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">{i + 1}</div> */}
                                    <div>
                                        <h3 className="font-bold text-gray-900">{item.step}</h3>
                                        <p className="text-gray-600">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SANCIONES QUE PUEDE APLICAR EL TRIBUNAL */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué sanciones puede aplicar el tribunal?</h2>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {["Amonestaciones formales", "Multas económicas", "Compensación de visitas perdidas", "Apremios (medidas más intensas)", "Modificación del cuidado personal (en casos graves)"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-green-50 p-3 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">En la práctica, la imposición de sanciones no es automática. El tribunal requiere que se acredite fehacientemente el incumplimiento y que se hayan agotado las instancias previas de diálogo o mediación. Las multas suelen fijarse en unidades tributarias y pueden repetirse si el incumplimiento persiste, pero el tribunal también puede optar por medidas correctivas como la compensación del tiempo perdido o la modificación del régimen si el actual no se ajusta a la realidad familiar.</p>
                    </div>

                    {/* INCUMPLIMIENTO REITERADO (nuevo) */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre cuando el incumplimiento es reiterado?</h2>
                        <p className="text-gray-600 mb-4">
                            Cuando los incumplimientos ocurren de manera aislada, muchas veces los padres logran resolver el conflicto mediante comunicación o mediación. Sin embargo, cuando uno de los progenitores impide sistemáticamente el contacto entre el niño y el otro padre, la situación adquiere una gravedad mucho mayor.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Los tribunales de familia consideran especialmente preocupantes los casos donde existe una conducta permanente destinada a obstaculizar el vínculo familiar. Por ejemplo: negarse constantemente a entregar al niño, inventar actividades para evitar las visitas, cambiar unilateralmente los horarios, mudarse sin informar o bloquear comunicaciones.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="font-bold text-red-800">Consecuencia:</p>
                            <p className="text-red-700">La reiteración de incumplimientos suele influir negativamente en la evaluación judicial y puede justificar medidas más severas para asegurar el cumplimiento futuro, incluyendo la modificación del cuidado personal.</p>
                        </div>
                        <p className="text-gray-600 mt-4">Sin embargo, modificar el cuidado personal no es una decisión que el tribunal adopte a la ligera. Debe acreditarse que el incumplimiento reiterado afecta el bienestar del niño y que el cambio de cuidado personal es beneficioso para su desarrollo. No basta con demostrar que el otro progenitor incumple; se requiere una evaluación integral del interés superior del menor, incluyendo informes psicosociales y peritajes que respalden la medida.</p>
                    </div>

                    {/* QUE EVALÚA EL TRIBUNAL (nuevo) */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué evalúa el tribunal al resolver estos conflictos?</h2>
                        <p className="text-gray-600 mb-4">El objetivo principal de los tribunales de familia no es sancionar a los padres, sino proteger el interés superior del niño. Por esta razón, el juez analizará diversos factores antes de adoptar una decisión.</p>
                        <div className="grid sm:grid-cols-2 gap-3 mb-4">
                            {["Edad del niño, niña o adolescente", "Relación previa con ambos padres", "Nivel de conflicto familiar", "Opinión del niño (según edad y madurez)", "Antecedentes de violencia o vulneración"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* MEDIACIÓN PREVIA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Es obligatoria la mediación antes de acudir a tribunales?</h2>
                        <p className="text-gray-600 mb-4">
                            En muchas materias de familia, la mediación constituye un requisito previo antes de presentar una demanda. La mediación busca que los padres encuentren soluciones colaborativas sin necesidad de un juicio prolongado. Durante este proceso, un mediador imparcial ayuda a las partes a construir acuerdos relacionados con relación directa y regular, cuidado personal y pensión de alimentos.
                        </p>
                        <div className="bg-blue-50 p-5 rounded-xl">
                            <p className="font-bold text-blue-900">Excepción importante:</p>
                            <p className="text-blue-800">Cuando existen antecedentes de violencia intrafamiliar u otras circunstancias graves, la mediación puede no ser procedente.</p>
                        </div>
                        <p className="text-gray-600 mt-4">
                            Puedes profundizar este tema en nuestra guía sobre{" "}
                            <Link to="/blog/mediacion-familiar-chile-2026" className="text-green-700 underline">Mediación Familiar Obligatoria en Chile</Link>.
                        </p>
                    </div>

                    {/* ¿PUEDE PERDER EL CUIDADO PERSONAL? (nuevo) */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Puede perder el cuidado personal quien incumple constantemente?</h2>
                        <p className="text-gray-600 mb-4">
                            Aunque no ocurre automáticamente, el incumplimiento reiterado puede transformarse en un elemento relevante dentro de futuras discusiones sobre cuidado personal.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Si un padre demuestra que el otro ha desarrollado una conducta permanente destinada a impedir el contacto con los hijos, el tribunal podría considerar que esa conducta afecta negativamente el bienestar del niño. En casos graves, el juez puede reevaluar el régimen existente y adoptar medidas más amplias para proteger el derecho del niño a mantener relaciones familiares sanas.
                        </p>
                        <div className="bg-orange-50 p-5 rounded-xl">
                            <p className="font-bold text-orange-800">Consecuencia clave:</p>
                            <p className="text-orange-700">Impedir injustificadamente el contacto con el otro progenitor puede generar consecuencias mucho más importantes que una simple multa, incluyendo la modificación del cuidado personal.</p>
                        </div>
                        <p className="text-gray-600 mt-4">
                            Revisa nuestra guía sobre{" "}
                            <Link to="/blog/cuidado-personal-hijos-chile-2026" className="text-green-700 underline">cuidado personal de hijos en Chile</Link>.
                        </p>
                    </div>

                    {/* DENUNCIAS FALSAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre cuando existen denuncias falsas?</h2>
                        <p className="text-gray-600">En algunos conflictos familiares aparecen acusaciones destinadas únicamente a impedir el contacto con los hijos. Por esta razón los tribunales analizan cuidadosamente las pruebas disponibles. No basta con realizar acusaciones. Los hechos deben acreditarse.</p>
                    </div>

                    {/* NIÑO NO QUIERE ASISTIR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si el niño no quiere asistir?</h2>
                        <p className="text-gray-600">El tribunal evaluará la edad del niño, su madurez, los motivos del rechazo y la existencia de influencia indebida. No siempre la negativa del niño justifica el incumplimiento.</p>
                    </div>

                    {/* ALIENACIÓN PARENTAL */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Alienación parental: un problema frecuente</h2>
                        <p className="text-gray-600 mb-4">
                            Aunque la legislación chilena no regula expresamente la alienación parental como figura autónoma, los tribunales sí consideran conductas destinadas a destruir el vínculo entre un hijo y uno de sus padres: hablar mal del otro progenitor, generar miedo injustificado, impedir el contacto o manipular emocionalmente al niño.
                        </p>
                        <p className="text-gray-600">Estas conductas pueden influir significativamente en las decisiones judiciales.</p>
                    </div>

                    {/* MODIFICACIÓN DEL RÉGIMEN */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Se puede modificar el régimen de relación directa y regular?</h2>
                        <p className="text-gray-600 mb-4">
                            Sí. Las circunstancias familiares cambian con el tiempo. Puede solicitarse una modificación cuando existen razones relevantes como cambio de domicilio, cambio de ciudad, problemas laborales, necesidades del niño, niña o adolescente o nuevas circunstancias familiares.
                        </p>
                        <p className="text-gray-600">
                            En estos casos normalmente se requiere mediación familiar previa. Puedes revisar nuestra guía sobre{" "}
                            <Link to="/blog/mediacion-familiar-chile-2026" className="text-green-700 underline">Mediación familiar obligatoria en Chile</Link>.
                        </p>
                    </div>

                    {/* VIF Y VISITAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Relación directa y regular y violencia intrafamiliar</h2>
                        <p className="text-gray-600 mb-4">
                            No todos los casos permiten visitas normales. Cuando existen antecedentes de violencia intrafamiliar, el tribunal puede restringir visitas, supervisar encuentros o suspender temporalmente el contacto. Si existe riesgo para el niño, niña o adolescente, la seguridad siempre tendrá prioridad.
                        </p>
                        <p className="text-gray-600">
                            Revisa también nuestra guía sobre{" "}
                            <Link to="/blog/violencia-intrafamiliar-chile-2026" className="text-green-700 underline">Violencia Intrafamiliar (VIF) en Chile</Link>.
                        </p>
                    </div>

                    {/* CASO PRÁCTICO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Caso práctico</h2>
                        <div className="bg-blue-50 p-6 rounded-2xl">
                            <p className="font-bold text-blue-800 mb-2">Juan y su hija</p>
                            <p className="text-blue-700 mb-2">Juan mantiene un régimen de visitas que le permite compartir con su hija fines de semana alternados. Durante cuatro meses consecutivos la madre impide la entrega de la niño argumentando problemas personales.</p>
                            <p className="text-blue-700 mb-2">Juan conserva mensajes, correos y testigos de cada incumplimiento. Tras presentar la solicitud correspondiente ante el Tribunal de Familia, el juez verifica los incumplimientos y ordena: recuperación de visitas perdidas, multa y advertencia formal. Además, establece seguimiento del caso para evitar nuevas vulneraciones.</p>
                        </div>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Dejar de pagar alimentos", desc: "Es uno de los errores más graves. Son materias independientes." },
                                    { title: "Discutir frente al niño", desc: "El conflicto parental nunca debe involucrar a los hijos." },
                                    { title: "No guardar evidencia", desc: "Sin pruebas el caso se vuelve mucho más difícil." },
                                    { title: "Esperar demasiado tiempo", desc: "Mientras más incumplimientos, más daño al vínculo familiar." },
                                    { title: "Intentar resolver por la fuerza", desc: "Esto suele empeorar el conflicto y puede generar consecuencias legales." },
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

                    {/* CUANDO CONSULTAR A UN ABOGADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿En qué situaciones conviene consultar cuanto antes a un abogado de familia?</h2>
                        <p className="text-gray-600 mb-4">La información general es orientativa, pero hay escenarios donde la consulta urgente puede cambiar el resultado:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Cuando el otro progenitor ha impedido las visitas de forma reiterada durante semanas o meses.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Si existen indicios de alienación parental o interferencia en el vínculo afectivo con el hijo.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Cuando se requiere modificar el régimen de visitas por cambio de domicilio, horarios laborales o necesidades del niño.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Si el incumplimiento es mutuo y se necesita reestructurar completamente el régimen para evitar nuevos conflictos.</span></li>
                        </ul>
                        <p className="text-gray-600 mt-4">La evidencia temprana es clave para acreditar la conducta ante el tribunal y obtener las medidas más efectivas.</p>
                    </div>

                                        <InArticleCTA
                        title="¿Necesitas resolver tu situación familiar?"
                        message="Un abogado de familia puede orientarte sobre los pasos a seguir en tu caso y ayudarte a tomar decisiones informadas."
                        buttonText="Habla con un abogado ahora"
                        category="Derecho de Familia"
                    />

{/* CONCLUSION */}                    <div className="mb-12 border-t pt-8">

                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            El incumplimiento del régimen de relación directa y regular no afecta únicamente al padre o madre perjudicado. También genera consecuencias importantes para el desarrollo emocional y psicológico del niño, que tiene derecho a mantener un vínculo real y regular con ambos padres independientemente de los conflictos entre ellos.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Por esta razón, los tribunales cuentan con diversas herramientas para garantizar ese vínculo: multas, amonestaciones, compensación de visitas perdidas y, en casos graves, modificación del cuidado personal. El sistema está diseñado para que el incumplimiento tenga consecuencias reales — pero requiere que la parte perjudicada actúe y lo haga correctamente.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            El error más frecuente es esperar demasiado o intentar resolver el conflicto por cuenta propia — retener al hijo como respuesta, dejar de pagar alimentos o enfrentar al otro padre directamente. Ninguna de esas acciones ayuda al niño ni mejora tu posición legal. Al contrario, pueden perjudicarte ante el tribunal.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Este artículo presenta información general. Cada caso de incumplimiento de visitas involucra circunstancias específicas — frecuencia del régimen, edad del niño, historial de cumplimiento y contexto familiar — que un tribunal evaluará de forma particular.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Si enfrentas esta situación, un{" "}
                            <Link to="/abogado-pension-alimentos" className="text-green-700 underline hover:text-green-500">
                                abogado de familia
                            </Link>{" "}
                            puede ayudarte a documentar los incumplimientos y solicitar las medidas judiciales adecuadas para restablecer el vínculo con tu hijo.
                        </p>
                    </div>

                    <CategoryCTA category="familia" />

                    {/* FAQS */}

                    <div className="mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre incumplimiento del régimen de visitas</h2>
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
                        title="Incumplimiento del régimen de relación directa y regular en Chile 2026"
                        url="https://legalup.cl/blog/incumplimiento-regimen-visitas-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="incumplimiento-regimen-visitas-chile-2026" />

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
            <BlogConversionPopup category="Derecho de Familia" topic="incumplimiento-visitas" />
        </div>
    );
};

export default BlogArticle;