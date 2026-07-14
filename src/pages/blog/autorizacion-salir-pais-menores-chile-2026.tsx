import { Link } from "react-router-dom";
import {
    ArrowLeft,
    Calendar,
    User,
    Clock,
    ChevronRight,
    CheckCircle,
    AlertCircle,
    Plane,
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
            question: "¿Necesito autorización para viajar con mi hijo al extranjero?",
            answer: "En muchos casos sí, especialmente cuando viajas sin el otro progenitor. Si viajas con ambos padres, normalmente no se requiere autorización adicional.",
        },
        {
            question: "¿La autorización debe ser notarial?",
            answer: "Generalmente sí. La autorización notarial es la forma más común y recomendada para acreditar el consentimiento del otro progenitor.",
        },
        {
            question: "¿Qué pasa si el otro padre no quiere firmar?",
            answer: "Puedes solicitar autorización judicial ante el Tribunal de Familia. El juez evaluará el interés superior del niño, niña o adolescente y decidirá si autoriza el viaje.",
        },
        {
            question: "¿El tribunal siempre autoriza el viaje?",
            answer: "No. El tribunal analizará el interés superior del niño, niña o adolescente y puede rechazar la solicitud si existe riesgo de no retorno, perjuicio al vínculo familiar o falta de información.",
        },
        {
            question: "¿Puedo viajar con mis hijos si estoy divorciado?",
            answer: "Sí, cumpliendo los requisitos legales correspondientes. El divorcio no impide viajar, pero sí exige cumplir con las autorizaciones necesarias.",
        },
        {
            question: "¿Qué ocurre si el padre está desaparecido o no se sabe su paradero?",
            answer: "Puedes solicitar autorización judicial, acreditando los esfuerzos realizados para ubicarlo. El tribunal evaluará la situación y podrá autorizar el viaje.",
        },
        {
            question: "¿La opinión del niño es importante?",
            answer: "Sí, dependiendo de su edad y madurez. El tribunal puede escuchar al niño, niña o adolescente, aunque su opinión no es vinculante.",
        },
        {
            question: "¿Necesito abogado para obtener autorización judicial?",
            answer: "Sí, es altamente recomendable cuando existe oposición o conflicto familiar. Un abogado de familia puede presentar correctamente la solicitud y proteger tus derechos.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Autorización para salir del país con menores en Chile 2026: requisitos, permiso notarial y autorización judicial (Guía Completa)"
                description="Aprende cuándo un menor necesita autorización para salir de Chile, quién debe otorgarla, cómo obtener permiso notarial o judicial y qué hacer si uno de los padres se niega."
                image="/assets/autorizacion-salir-pais-menores-chile-2026.png"
                url="https://legalup.cl/blog/autorizacion-salir-pais-menores-chile-2026"
                datePublished="2026-06-16"
                dateModified="2026-06-16"
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
                        Autorización para salir del país con menores en Chile 2026: requisitos, permiso notarial y autorización judicial (Guía Completa)
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "Todo menor de edad necesita autorización para salir de Chile si no viaja con ambos padres",
                                "La autorización notarial es la forma más común y recomendada",
                                "Si un padre se niega injustificadamente, se puede solicitar autorización judicial",
                                "El tribunal prioriza el interés superior del niño al decidir",
                                "Planificar con anticipación evita problemas de última hora",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Viajar al extranjero con hijos menores de edad es una situación habitual para muchas familias chilenas. Vacaciones, visitas familiares, estudios, competencias deportivas o incluso cambios de residencia pueden requerir que un niño, niña o adolescente salga del país acompañado por uno de sus padres o por un tercero autorizado.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>17 de Junio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="autorizacion-salir-pais-menores-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Autorización para salir del país con menores en Chile 2026"
                        url="https://legalup.cl/blog/autorizacion-salir-pais-menores-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            Sin embargo, cuando los padres están separados, existe un conflicto familiar o uno de ellos no está disponible para otorgar autorización, surgen numerosas dudas sobre los requisitos legales exigidos para que el niño, niña o adolescente pueda abandonar Chile.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Muchas personas descubren este problema pocos días antes del viaje, cuando intentan abordar un vuelo y se encuentran con que falta documentación esencial. En otros casos, uno de los padres se niega injustificadamente a firmar el permiso, obligando a iniciar un procedimiento judicial urgente.
                        </p>
                        <p className="text-gray-600 mt-4">
                            La legislación chilena establece reglas claras para proteger el interés superior del niño y evitar traslados internacionales sin el consentimiento correspondiente. Por ello, es fundamental conocer cuándo se necesita autorización, quién debe otorgarla y qué alternativas existen cuando no hay acuerdo entre los padres.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía completa revisaremos cómo funciona la autorización para salir del país con menores en Chile durante 2026, los requisitos exigidos por la ley, el procedimiento judicial cuando existe oposición y los errores más frecuentes que debes evitar.
                        </p>
                    </div>

                    {/* CUANDO UN MENOR NECESITA AUTORIZACIÓN */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo un niño necesita autorización para salir de Chile?</h2>
                        <p className="text-gray-600 mb-4">
                            La regla general es simple: <strong>todo menor de edad que salga de Chile debe cumplir requisitos especiales de autorización</strong> dependiendo de quién lo acompañe.
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Finalidad</p>

                            <InArticleCTA category="Derecho de Familia" />

                            <p className="text-blue-800">Proteger los derechos del niño, niña o adolescente y evitar situaciones de sustracción internacional o traslados no autorizados.</p>
                        </div>
                        <p className="text-gray-600 mt-4">La regla de autorización no aplica solo a viajes turísticos. También cubre viajes por estudios, tratamientos médicos en el extranjero, visitas a familiares o cualquier otra salida del territorio nacional. Además, el nivel de exigencia puede variar según el país de destino: algunos destinos requieren documentación adicional o trámites consulares que deben coordinarse con suficiente antelación.</p>
                    </div>

                    {/* QUÉ SE CONSIDERA MENOR DE EDAD */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué se considera menor de edad?</h2>
                        <p className="text-gray-600">En Chile son menores de edad todas las personas que no han cumplido 18 años. Por lo tanto, cualquier niño, niña o adolescente que viaje al extranjero debe cumplir las reglas especiales establecidas por la legislación vigente.</p>
                    </div>

                    {/* VIAJE CON AMBOS PADRES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Salida del país cuando viaja con ambos padres</h2>
                        <p className="text-gray-600 mb-4">Esta es la situación más sencilla. Cuando el niño, niña o adolescente viaja acompañado por ambos padres, normalmente basta con presentar cédula de identidad o pasaporte del niño, niña o adolescente, documentación de viaje y documentos de identificación de los padres. En este escenario no suele requerirse autorización adicional.</p>
                    </div>

                    {/* VIAJE CON UNO DE LOS PADRES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Salida del país cuando viaja con uno de los padres</h2>
                        <p className="text-gray-600 mb-4">
                            Aquí aparece una de las situaciones más frecuentes. Si el niño viajará únicamente con su madre o únicamente con su padre, normalmente se requiere autorización del otro progenitor. Esto aplica incluso cuando los padres están separados, nunca estuvieron casados, mantienen una buena relación o tienen acuerdos informales.
                        </p>
                        <div className="bg-yellow-50 p-5 rounded-xl">
                            <p className="font-bold text-yellow-800">Importante</p>
                            <p className="text-yellow-700">La autorización busca asegurar que ambos padres conozcan y consientan el viaje internacional.</p>
                        </div>
                    </div>

                    {/* VIAJE CON TERCEROS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Salida del país cuando viaja con un tercero</h2>
                        <p className="text-gray-600 mb-4">
                            Si el niño viaja acompañado por abuelos, tíos, hermanos mayores, profesores, delegaciones deportivas o amigos de la familia, la exigencia es aún más estricta. Generalmente será necesario contar con autorización formal de quienes ejercen la representación legal del niño.
                        </p>
                    </div>

                    {/* QUIÉN DEBE OTORGAR LA AUTORIZACIÓN */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Quién debe otorgar la autorización?</h2>
                        <p className="text-gray-600 mb-4">La respuesta dependerá de la situación familiar específica. Normalmente la autorización corresponde a ambos padres, el padre o madre que tenga el cuidado personal cuando corresponda, el representante legal o la persona determinada judicialmente.</p>
                        <p className="text-gray-600">Por esta razón es importante revisar previamente las resoluciones existentes en materia de familia.</p>
                    </div>

                    {/* AUTORIZACIÓN NOTARIAL */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿La autorización debe firmarse ante notario?</h2>
                        <p className="text-gray-600 mb-4">
                            Sí. En la mayoría de los casos la autorización debe formalizarse mediante un documento válido que permita acreditar el consentimiento correspondiente. La autorización notarial suele ser la forma más utilizada.
                        </p>
                        <div className="bg-gray-50 p-5 rounded-xl">
                            <p className="font-bold text-gray-900">El documento notarial normalmente incluye:</p>
                            <ul className="mt-2 space-y-1 text-gray-700">
                                <li>• Identificación del niño</li>
                                <li>• Identificación de quien autoriza</li>
                                <li>• Destino del viaje</li>
                                <li>• Fechas</li>
                                <li>• Persona acompañante</li>
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">Mientras más específico sea el documento, menos problemas existirán al momento del viaje.</p>
                        <p className="text-gray-600 mt-4">No obstante, la autorización notarial no es la única forma válida. Cuando un progenitor se encuentra en el extranjero, puede otorgar autorización ante el cónsul chileno en ese país. Asimismo, si existe una resolución judicial que regula la relación directa y regular, el juez puede haber establecido reglas especiales para viajes internacionales, caso en el cual la autorización notarial podría no ser necesaria si el fallo ya contempla la facultad de viajar.</p>
                    </div>

                    {/* NEGATIVA DE UN PADRE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre cuando uno de los padres se niega a firmar?</h2>
                        <p className="text-gray-600 mb-4">
                            Este es uno de los conflictos más frecuentes en familias separadas. Algunas veces la negativa tiene fundamentos legítimos (riesgo de no retorno, antecedentes de incumplimientos previos, falta de información sobre el viaje). Sin embargo, en otras situaciones la negativa responde únicamente a conflictos personales entre los padres.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="font-bold text-red-800">Solución</p>
                            <p className="text-red-700">Cuando no existe acuerdo, puede ser necesario acudir al Tribunal de Familia para solicitar autorización judicial.</p>
                        </div>
                        <p className="text-gray-600 mt-4">En la práctica, la negativa sostenida puede ser indicio de otros conflictos familiares subyacentes. El tribunal, al evaluar la solicitud, podrá considerar no solo los motivos del viaje, sino también el historial de relación entre los padres, el cumplimiento previo del régimen comunicacional y si existe riesgo de sustracción internacional. Países como Argentina y Perú forman parte del Acuerdo de Cooperación en materia de sustracción internacional, mientras que destinos fuera del Mercosur presentan un nivel de riesgo distinto que el juez evaluará caso a caso.</p>
                    </div>

                    {/* AUTORIZACIÓN JUDICIAL */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Autorización judicial para salir del país</h2>
                        <p className="text-gray-600 mb-4">
                            Cuando uno de los padres se niega injustificadamente a otorgar autorización, el otro puede solicitar permiso judicial. Esta herramienta permite que el tribunal evalúe la situación y determine si corresponde autorizar el viaje. La decisión siempre se adoptará considerando el interés superior del niño.
                        </p>
                    </div>

                    {/* PROCEDIMIENTO JUDICIAL */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-6">¿Cómo funciona el procedimiento judicial?</h2>
                        <div className="space-y-4">
                            {[
                                { step: "Paso 1: Presentar la solicitud", desc: "El padre o madre interesado debe presentar una solicitud ante el Tribunal de Familia explicando motivo del viaje, duración, destino y beneficios para el niño." },
                                { step: "Paso 2: Notificación", desc: "La otra parte será informada del procedimiento para que pueda exponer sus argumentos." },
                                { step: "Paso 3: Audiencia", desc: "El juez escuchará a ambas partes y analizará los antecedentes." },
                                { step: "Paso 4: Resolución", desc: "Finalmente el tribunal decidirá si corresponde o no autorizar la salida del país." },
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

                    {/* QUÉ EVALÚA EL JUEZ */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué evalúa el juez?</h2>
                        <p className="text-gray-600 mb-4">El tribunal no analiza únicamente la voluntad de los padres. Su principal preocupación será el bienestar del niño.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Edad del niño", "Finalidad del viaje", "Duración", "Situación familiar", "Vínculo con ambos padres", "Riesgo de no retorno"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">La pregunta central será siempre si el viaje beneficia o perjudica al niño.</p>
                    </div>

                    {/* RELACIÓN CON RÉGIMEN DE VISITAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si existe régimen de relación directa y regular?</h2>
                        <p className="text-gray-600 mb-4">
                            Cuando existe una resolución de visitas vigente, el tribunal deberá analizar cómo el viaje afecta dicho régimen: si el viaje coincide con períodos de visitas, si el traslado impedirá el contacto con el otro progenitor, o si existen mecanismos alternativos de comunicación.
                        </p>
                        <p className="text-gray-600">
                            Puedes revisar también nuestra guía sobre{" "}
                            <Link to="/blog/incumplimiento-regimen-visitas-chile-2026" className="text-green-700 underline">Incumplimiento del régimen de relación directa y regular en Chile</Link>.
                        </p>
                    </div>

                    {/* CUIDADO PERSONAL EXCLUSIVO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si existe cuidado personal exclusivo?</h2>
                        <p className="text-gray-600 mb-4">
                            Cuando uno de los padres ejerce el cuidado personal, muchas personas creen que puede viajar libremente al extranjero con el niño. Sin embargo, esto no siempre elimina la necesidad de autorización. Las circunstancias específicas deben analizarse caso a caso.
                        </p>
                        <p className="text-gray-600">
                            Si deseas profundizar, revisa nuestra guía sobre{" "}
                            <Link to="/blog/cuidado-personal-hijos-chile-2026" className="text-green-700 underline">Cuidado personal de hijos en Chile</Link>.
                        </p>
                    </div>

                    {/* PADRE AUSENTE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre cuando el padre está ausente o no se conoce su paradero?</h2>
                        <p className="text-gray-600 mb-4">
                            Cuando resulta imposible ubicar al otro progenitor, puede ser necesario acudir igualmente al tribunal para obtener autorización judicial. El juez evaluará los esfuerzos realizados para ubicarlo, la relación existente y el interés del niño. No basta simplemente con afirmar que el otro padre desapareció; normalmente será necesario acreditar dicha situación.
                        </p>
                    </div>

                    {/* DENEGACIÓN DE SALIDA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Puede negarse la salida del país?</h2>
                        <p className="text-gray-600 mb-4">
                            Sí. La autorización judicial no es automática. El tribunal puede rechazar la solicitud cuando considera que el viaje resulta perjudicial para el menor, por ejemplo, por riesgo de sustracción internacional, incumplimientos anteriores, información insuficiente o perjuicio importante al vínculo con el otro progenitor.
                        </p>
                    </div>

                    {/* VIAJES POR VACACIONES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Viajes por vacaciones</h2>
                        <p className="text-gray-600">Son las solicitudes más comunes. Generalmente los tribunales suelen autorizar viajes temporales cuando existe planificación adecuada, se conocen fechas de retorno, el viaje beneficia al niño y no existe riesgo relevante.</p>
                    </div>

                    {/* VIAJES PARA ESTUDIAR EN EL EXTRANJERO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Viajes para estudiar en el extranjero</h2>
                        <p className="text-gray-600">Estos casos suelen requerir un análisis más profundo. La duración prolongada puede afectar la relación con el otro padre, el régimen de visitas y los vínculos familiares existentes. Por ello la evaluación judicial suele ser más detallada.</p>
                    </div>

                    {/* OPINIÓN DEL MENOR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si el niño no quiere viajar?</h2>
                        <p className="text-gray-600">Dependiendo de su edad y madurez, la opinión del niño puede ser considerada por el tribunal. Esto no significa que el niño decida el resultado, pero su opinión puede transformarse en un antecedente relevante dentro del análisis judicial.</p>
                    </div>

                    {/* RELACIÓN CON PENSIÓN DE ALIMENTOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Relación con la pensión de alimentos</h2>
                        <p className="text-gray-600 mb-4">
                            Algunas personas creen erróneamente que la existencia de deuda de alimentos impide automáticamente la salida del país. La situación debe analizarse caso a caso. Aunque ambas materias pueden relacionarse, la autorización para viajar y la obligación alimentaria son instituciones distintas.
                        </p>
                        <p className="text-gray-600">
                            Puedes revisar también nuestras guías sobre{" "}
                            <Link to="/blog/pension-alimentos-chile-2026" className="text-green-700 underline">pensión de alimentos</Link>,{" "}
                            <Link to="/blog/deuda-pension-alimentos-chile-2026" className="text-green-700 underline">deuda de pensión de alimentos</Link>{" "}
                            y{" "}
                            <Link to="/blog/pension-alimentos-hijos-mayores-18-chile-2026" className="text-green-700 underline">pensión para hijos mayores de 18 años</Link>.
                        </p>
                    </div>



                    {/* CASO PRÁCTICO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Caso práctico</h2>
                        <div className="bg-blue-50 p-6 rounded-2xl">
                            <p className="font-bold text-blue-800 mb-2">María y su viaje a Argentina</p>
                            <p className="text-blue-700 mb-2">María planea viajar durante dos semanas a Argentina junto a su hija de 10 años. El padre mantiene una relación directa y regular vigente, pero se niega a firmar la autorización sin entregar motivos claros.</p>
                            <p className="text-blue-700 mb-2">María presenta una solicitud judicial explicando destino, fechas, reserva de pasajes, itinerario y fecha de regreso. El tribunal concluye que el viaje beneficia al niño y autoriza la salida del país pese a la oposición del padre.</p>
                        </div>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Esperar hasta último momento", desc: "Es uno de los errores más comunes. La autorización judicial puede demorar días o semanas." },
                                    { title: "Comprar pasajes antes de resolver el conflicto", desc: "La autorización puede ser rechazada, lo que genera pérdidas económicas." },
                                    { title: "No revisar resoluciones vigentes", desc: "Algunas personas desconocen obligaciones establecidas por tribunales." },
                                    { title: "Intentar viajar sin documentación completa", desc: "Puede impedir el embarque y arruinar el viaje." },
                                    { title: "Suponer que el cuidado personal elimina todos los requisitos", desc: "Cada situación requiere análisis específico." },
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
                        <p className="text-gray-600 mb-4">La información general es útil, pero hay momentos donde la asesoría legal urgente marca la diferencia:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Cuando el otro progenitor se niega a firmar la autorización y el viaje está próximo (menos de 30 días).</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Si existen sospechas fundadas de riesgo de no retorno o sustracción internacional del menor.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Cuando el viaje responde a una oportunidad académica o terapéutica y no se puede postergar.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Si uno de los padres se encuentra en el extranjero y se requiere coordinar la autorización consular.</span></li>
                        </ul>
                        <p className="text-gray-600 mt-4">Cada situación tiene plazos y requisitos distintos que un abogado de familia puede evaluar rápidamente para evitar la pérdida del viaje o del derecho a salir del país.</p>
                    </div>

                    {/* CTA PRINCIPAL */}
                    <div className="mb-12">
                        <div className="bg-green-900 rounded-2xl p-8 text-center text-white">
                            <h3 className="text-2xl text-green-600 font-bold font-serif mb-3">El viaje está planificado pero la autorización no está lista</h3>
                            <p className="text-white mb-6">Si compraste los pasajes y el otro padre no firma, no esperes al día antes del vuelo. Un abogado de familia puede evaluar si corresponde una autorización judicial urgente y preparar la solicitud ante el Tribunal de Familia para que resuelva antes de la fecha de viaje.</p>
                            <Link
                                to="/abogado-pension-alimentos"
                                className="inline-block bg-white text-green-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                Ver abogados de familia
                            </Link>
                        </div>
                    </div>

                    {/* CONCLUSION */}

                    <RelatedLawyers category="Derecho de Familia" />

                    <div className="mb-12 border-t pt-8">

                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La autorización para salir del país con niños es una herramienta destinada a proteger el interés superior del niño y garantizar que las decisiones importantes se adopten de forma responsable por ambos padres.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Cuando existe acuerdo, el trámite es simple — una escritura ante notario con anticipación suficiente resuelve el problema. El error más frecuente es dejarlo para los días previos al viaje y encontrarse con que el otro padre no está disponible, no quiere firmar o simplemente no responde.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Cuando hay negativa injustificada, el tribunal puede autorizar el viaje evaluando el interés superior del niño. Pero ese proceso toma tiempo — solicitar la autorización judicial con semanas o meses de anticipación es fundamental para no llegar al aeropuerto sin los papeles en orden.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Este artículo contiene información de carácter general. Las reglas sobre autorización de salida del país varían según la situación familiar específica, el país de destino y las resoluciones judiciales vigentes aplicables al menor. Solo un abogado puede determinar qué documentación se requiere en tu caso concreto.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Si tienes un viaje planificado con tus hijos y no estás seguro de qué documentos necesitas o el otro padre se niega a cooperar, un{" "}
                            <Link to="/abogado-pension-alimentos" className="text-green-700 underline hover:text-green-500">
                                abogado de familia especializado
                            </Link>{" "}
                            puede orientarte sobre el procedimiento correcto según tu situación específica.
                        </p>
                    </div>

                    <CategoryCTA category="familia" />

                    {/* FAQS */}

                    <div className="mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre autorización para salir del país con menores</h2>
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
                        title="Autorización para salir del país con menores en Chile 2026"
                        url="https://legalup.cl/blog/autorizacion-salir-pais-menores-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="autorizacion-salir-pais-menores-chile-2026" />

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
            <BlogConversionPopup category="Derecho de Familia" topic="salir-pais" />
        </div>
    );
};

export default BlogArticle;