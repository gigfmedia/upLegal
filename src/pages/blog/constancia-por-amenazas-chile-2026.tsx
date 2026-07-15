import { Link } from "react-router-dom";
import {
    ArrowLeft,
    Calendar,
    User,
    Clock,
    ChevronRight,
    CheckCircle,
    AlertCircle,
    Shield,
    FileText,
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
            question: "¿Qué es una constancia por amenazas?",
            answer: "Es un registro formal mediante el cual una persona informa una situación para que quede registrada oficialmente ante una autoridad.",
        },
        {
            question: "¿La constancia es lo mismo que una denuncia?",
            answer: "No. La constancia deja registro de un hecho, mientras que la denuncia informa un posible delito y puede iniciar una investigación penal.",
        },
        {
            question: "¿Dónde puedo hacer una constancia por amenazas?",
            answer: "Generalmente ante Carabineros de Chile, Policía de Investigaciones (PDI), Fiscalía o Tribunales competentes.",
        },
        {
            question: "¿Las amenazas por WhatsApp sirven como prueba?",
            answer: "Sí, especialmente si se conservan correctamente mediante capturas de pantalla y respaldos de las conversaciones.",
        },
        {
            question: "¿Qué hago si me amenazan de muerte?",
            answer: "Lo recomendable es denunciar inmediatamente los hechos ante Carabineros, PDI o Fiscalía, ya que constituye una situación de extrema gravedad.",
        },
        {
            question: "¿Las amenazas por redes sociales pueden ser delito?",
            answer: "Sí, dependiendo del contenido, intención, contexto y reiteración. Las amenazas graves pueden ser sancionadas penalmente.",
        },
        {
            question: "¿Debo guardar capturas de pantalla de las amenazas?",
            answer: "Sí. Constituyen evidencia importante que puede ser utilizada en una investigación o juicio.",
        },
        {
            question: "¿Necesito abogado para denunciar amenazas?",
            answer: "Es recomendable cuando las amenazas son graves, reiteradas o forman parte de un conflicto más amplio como violencia intrafamiliar o acoso laboral.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Constancia por amenazas en Chile 2026: dónde hacerla, cuándo corresponde y qué hacer si te amenazan (Guía Completa)"
                description="Aprende qué es una constancia por amenazas, cuándo corresponde realizarla, dónde se presenta y cuándo debes hacer una denuncia formal en Chile."
                image="/assets/constancia-amenazas-chile-2026.png"
                url="https://legalup.cl/blog/constancia-amenazas-chile-2026"
                datePublished="2026-06-22"
                dateModified="2026-06-22"
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
                        Constancia por amenazas en Chile 2026: dónde hacerla, cuándo corresponde y qué hacer si te amenazan (Guía Completa)
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "La constancia es un registro formal de un hecho, no necesariamente inicia una investigación penal",
                                "Las amenazas pueden ser verbales, por escrito o a través de medios digitales",
                                "Si la amenaza es grave (muerte, armas, extorsión), corresponde denunciar, no solo constatar",
                                "Conserva toda la evidencia: capturas de pantalla, audios, testigos y fechas",
                                "En contexto de violencia intrafamiliar, existen medidas especiales de protección",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Recibir amenazas puede generar preocupación, miedo e incertidumbre. Muchas personas no saben cómo reaccionar cuando alguien las amenaza por teléfono, WhatsApp, redes sociales o de forma presencial. Una de las dudas más frecuentes es si corresponde realizar una constancia, presentar una denuncia o acudir directamente a tribunales.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>22 de Junio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="constancia-por-amenazas-en-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Constancia por amenazas en Chile 2026"
                        url="https://legalup.cl/blog/constancia-amenazas-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            En Chile, las amenazas pueden constituir un delito dependiendo de su gravedad, contexto y forma en que fueron realizadas. Sin embargo, no todas las situaciones requieren exactamente la misma respuesta legal.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Por esta razón es importante comprender la diferencia entre una constancia y una denuncia por amenazas, cuándo corresponde cada una y qué antecedentes conviene recopilar para proteger tus derechos.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía revisaremos cómo funciona la constancia por amenazas en Chile durante 2026, dónde puede realizarse, cuándo conviene denunciar y qué medidas puedes adoptar para resguardar tu seguridad.
                        </p>
                    </div>

                    {/* QUE ES UNA CONSTANCIA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es una constancia por amenazas?</h2>
                        <p className="text-gray-600 mb-4">
                            Una constancia es un registro formal que deja constancia de un hecho ocurrido. En términos simples, permite informar una situación ante una autoridad para que quede registrada oficialmente.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Muchas personas utilizan este mecanismo cuando desean dejar evidencia de una situación que podría agravarse posteriormente. Por ejemplo: amenazas verbales, mensajes intimidatorios, hostigamiento reiterado, conflictos vecinales, problemas familiares o situaciones de acoso.
                        </p>

                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">La constancia no equivale necesariamente a una denuncia penal. Su principal objetivo es dejar registro de los hechos.</p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                La constancia descrita en términos generales tiene un valor práctico que depende del uso que se le dé después. Si los hechos escalan, ese registro puede ser un antecedente relevante, pero por sí solo no inicia una investigación. La diferencia entre tener una constancia y tener una investigación en curso depende de los pasos que se tomen posteriormente.
                            </p>
                        </div>
                    </div>

                    <InArticleCTA category="Derecho Penal"  title="¿Recibes amenazas y necesitas una constancia?" message="Un abogado penal puede ayudarte a denunciar, obtener la constancia de Carabineros y evaluar medidas de protección." />

                    {/* QUE SE CONSIDERA UNA AMENAZA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué se considera una amenaza?</h2>
                        <p className="text-gray-600 mb-4">
                            Existe amenaza cuando una persona anuncia o advierte que causará un daño a otra persona. Ese daño puede estar relacionado con integridad física, bienes materiales, familia, patrimonio, reputación o seguridad personal.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {['"Te voy a golpear."', '"Te voy a matar."', '"Voy a incendiar tu casa."', '"Te voy a hacer daño si no haces lo que te digo."'].map((item, i) => (
                                <div key={i} className="bg-red-50 p-3 rounded-lg text-center font-medium font-serif text-red-700">
                                    {item}
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Dependiendo del contexto, estas conductas pueden constituir delitos sancionados por la legislación chilena.</p>
                    </div>

                    {/* CUANDO CORRESPONDE UNA CONSTANCIA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo corresponde hacer una constancia por amenazas?</h2>
                        <p className="text-gray-600 mb-4">La constancia suele ser útil cuando una persona desea dejar registro formal de hechos que considera preocupantes, especialmente cuando:</p>
                        <div className="space-y-3">
                            {[
                                { title: "Existen amenazas verbales", desc: "Por ejemplo, durante una discusión con vecinos, familiares o terceros." },
                                { title: "Hay mensajes intimidatorios", desc: "WhatsApp, SMS, correos electrónicos o mensajes en redes sociales." },
                                { title: "Existe temor de futuras agresiones", desc: "La constancia puede servir para acreditar que el problema existía previamente." },
                                { title: "Hay conflictos reiterados", desc: "Particularmente en contextos familiares o vecinales." },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{item.title}</h3>
                                        <p className="text-gray-600">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CUANDO CORRESPONDE UNA DENUNCIA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo corresponde una denuncia por amenazas?</h2>
                        <p className="text-gray-600 mb-4">
                            Muchas personas confunden ambos conceptos. La denuncia tiene un alcance distinto. Su objetivo es informar la posible comisión de un delito para que las autoridades investiguen.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="font-bold text-red-800">¿Cuándo denunciar?</p>
                            <ul className="mt-2 space-y-1 text-red-700">
                                <li>• Amenazas de muerte</li>
                                <li>• Amenazas con armas</li>
                                <li>• Extorsiones</li>
                                <li>• Amenazas reiteradas</li>
                                <li>• Amenazas en contexto de violencia intrafamiliar</li>
                                <li>• Amenazas asociadas a otros delitos</li>
                            </ul>
                        </div>
                    </div>

                    {/* DIFERENCIA ENTRE CONSTANCIA Y DENUNCIA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Diferencia entre constancia y denuncia</h2>
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="bg-blue-50 p-5 rounded-xl">
                                <h3 className="font-bold text-blue-800 text-lg mb-2">Constancia</h3>
                                <ul className="space-y-1 text-blue-700">
                                    <li>• Deja registro de un hecho</li>
                                    <li>• No necesariamente inicia una investigación penal</li>
                                    <li>• Sirve como antecedente futuro</li>
                                </ul>
                            </div>
                            <div className="bg-red-50 p-5 rounded-xl">
                                <h3 className="font-bold text-red-800 text-lg mb-2">Denuncia</h3>
                                <ul className="space-y-1 text-red-700">
                                    <li>• Informa un posible delito</li>
                                    <li>• Puede iniciar una investigación</li>
                                    <li>• Permite la intervención del Ministerio Público</li>
                                </ul>
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">Esta diferencia es fundamental para actuar correctamente.</p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                La diferencia conceptual entre constancia y denuncia parece clara, pero en la práctica la autoridad puede tratar una constancia como antecedente para una investigación si los hechos lo ameritan. La decisión de iniciar o no una investigación no la toma quien presenta la constancia sino la Fiscalía, y esa evaluación depende de los antecedentes concretos del caso.
                            </p>
                        </div>
                    </div>

                    {/* DONDE SE REALIZA LA CONSTANCIA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Dónde se puede realizar una constancia por amenazas?</h2>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Carabineros de Chile", "Policía de Investigaciones (PDI)", "Tribunales competentes", "Fiscalía (cuando los hechos podrían constituir delitos)"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                                    {/* <Shield className="h-4 w-4 text-green-600" /> */}
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* QUE ANTECEDENTES CONVIENE REUNIR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué antecedentes conviene reunir?</h2>
                        <p className="text-gray-600 mb-4">Mientras más evidencia exista, más fácil será acreditar los hechos.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Capturas de pantalla", "Correos electrónicos", "Audios (si fueron obtenidos legalmente)", "Testigos", "Fotografías"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                                    {/* <FileText className="h-4 w-4 text-green-600" /> */}
                                    <span className="text-center">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AMENAZAS POR WHATSAPP */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Amenazas por WhatsApp en Chile</h2>
                        <p className="text-gray-600 mb-4">
                            Actualmente una gran cantidad de amenazas se realizan mediante aplicaciones de mensajería como WhatsApp, Telegram, Messenger, Instagram y Facebook.
                        </p>
                        <div className="bg-yellow-50 p-5 rounded-xl">
                            <p className="font-bold text-yellow-800">Recomendación</p>
                            <ul className="mt-2 space-y-1 text-yellow-700">
                                <li>• No borres mensajes</li>
                                <li>• Realiza capturas de pantalla</li>
                                <li>• Guarda conversaciones completas</li>
                                <li>• Respaldar evidencia</li>
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">Muchas investigaciones utilizan este tipo de antecedentes.</p>
                    </div>

                    {/* AMENAZAS POR REDES SOCIALES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Las amenazas por redes sociales son delito?</h2>
                        <p className="text-gray-600">
                            Pueden serlo. Todo dependerá del contenido del mensaje, intención, contexto, reiteración y pruebas disponibles. Por esta razón resulta recomendable conservar toda la información posible.
                        </p>
                    </div>

                    {/* AMENAZAS EN CONTEXTO DE VIF */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Amenazas en contexto de violencia intrafamiliar</h2>
                        <p className="text-gray-600 mb-4">
                            Uno de los escenarios más delicados ocurre cuando las amenazas se producen dentro del grupo familiar (ex parejas, cónyuges, padres, hijos, convivientes). En estos casos pueden existir medidas especiales de protección.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="font-bold text-red-800">Importante</p>
                            <p className="text-red-700">Si la amenaza ocurre en un contexto de violencia intrafamiliar, es importante actuar rápidamente.</p>
                        </div>
                        <p className="text-gray-600 mt-4">
                            Puedes revisar también nuestra guía sobre{" "}
                            <Link to="/blog/violencia-intrafamiliar-chile-2026" className="text-green-700 underline">Violencia Intrafamiliar en Chile</Link>
                            . También puedes revisar nuestras guías sobre{" "}
                            <Link to="/blog/orden-de-alejamiento-chile-2026" className="text-green-700 underline">orden de alejamiento</Link>
                            ,{" "}
                            <Link to="/blog/lesiones-leves-chile-2026" className="text-green-700 underline">lesiones leves</Link>
                            ,{" "}
                            <Link to="/blog/control-de-detencion-chile-2026" className="text-green-700 underline">control de detención</Link>{" "}
                            y{" "}
                            <Link to="/blog/robo-chile-2026" className="text-green-700 underline">robo en Chile</Link>.
                        </p>
                    </div>

                    {/* AMENAZAS DE MUERTE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si me amenazan de muerte?</h2>
                        <p className="text-gray-600 mb-4">
                            Las amenazas de muerte constituyen una de las situaciones más graves. En estos casos normalmente no basta con una simple constancia. Lo recomendable es denunciar inmediatamente los hechos, especialmente si existen antecedentes que permitan pensar que la amenaza podría concretarse.
                        </p>
                    </div>

                    {/* QUE HACER INMEDIATAMENTE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué hacer inmediatamente después de recibir una amenaza?</h2>
                        <div className="space-y-3">
                            {["Mantener la evidencia (no eliminar mensajes ni registros)", "Evitar confrontaciones (responder agresivamente suele empeorar el conflicto)", "Registrar fechas y horarios", "Buscar testigos", "Solicitar asesoría jurídica"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* QUE EVALUAN LAS AUTORIDADES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué evalúan las autoridades?</h2>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {[
                                { title: "Credibilidad de la amenaza", desc: "No todas las expresiones tienen la misma gravedad." },
                                { title: "Contexto", desc: "Una discusión aislada no siempre tiene el mismo alcance." },
                                { title: "Antecedentes previos", desc: "Las constancias anteriores pueden adquirir relevancia." },
                                { title: "Evidencia disponible", desc: "Mensajes, testigos y documentos suelen ser determinantes." },
                            ].map((item, i) => (
                                <div key={i} className="bg-gray-50 p-4 rounded-xl">
                                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                                    <p className="text-gray-600">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* OTRAS SITUACIONES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Amenazas entre vecinos, cobranza de deudas y contexto laboral</h2>
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="font-bold text-gray-900">Amenazas entre vecinos</h3>
                                <p className="text-gray-600">Conflictos por ruidos, estacionamientos, límites de propiedad o mascotas. Si escalan a amenazas, documenta adecuadamente los hechos.</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="font-bold text-gray-900">Amenazas por cobranza de deudas</h3>
                                <p className="text-gray-600">Ninguna empresa o particular puede utilizar amenazas ilegales para exigir el pago de una deuda. Reúne antecedentes y evalúa acciones legales.</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="font-bold text-gray-900">Amenazas en el trabajo</h3>
                                <p className="text-gray-600">Entre trabajadores, jefaturas o clientes. Dependiendo de las circunstancias, pueden existir responsabilidades laborales y penales.</p>
                            </div>
                        </div>
                    </div>



                    {/* CASO PRÁCTICO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Caso práctico</h2>
                        <div className="bg-blue-50 p-6 rounded-2xl">
                            <p className="font-bold text-blue-800 mb-2">María y las amenazas de su expareja</p>
                            <p className="text-blue-700 mb-2">María comenzó a recibir mensajes intimidatorios de una expareja después de una separación conflictiva. Inicialmente pensó que se trataba solo de comentarios impulsivos y decidió ignorarlos.</p>
                            <p className="text-blue-700 mb-2">Sin embargo, las amenazas continuaron durante semanas y comenzaron a incluir referencias específicas a su domicilio y lugar de trabajo. Ante esta situación, guardó capturas de pantalla, registró fechas y presentó una denuncia formal.</p>
                            <p className="text-blue-700">Gracias a ello las autoridades pudieron analizar los antecedentes y adoptar las medidas correspondientes.</p>
                        </div>
                    </div>

                    {/* PENAS PARA EL DELITO DE AMENAZAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué penas existen para el delito de amenazas en Chile?</h2>
                        <p className="text-gray-600 mb-4">
                            La legislación chilena contempla distintas sanciones dependiendo de la gravedad de la amenaza y de las circunstancias en que fue realizada.
                        </p>
                        <p className="text-gray-600 mb-4">
                            No es lo mismo una amenaza realizada durante una discusión aislada que una amenaza seria acompañada de antecedentes que demuestren la intención real de causar daño.
                        </p>
                        <div className="bg-gray-50 p-5 rounded-xl">
                            <p className="font-bold text-gray-900 mb-2">Por ejemplo, los tribunales pueden considerar factores como:</p>
                            <ul className="mt-2 space-y-1 text-gray-700">
                                <li>• La gravedad del daño anunciado.</li>
                                <li>• La existencia de armas u otros medios para concretar la amenaza.</li>
                                <li>• La reiteración de las conductas.</li>
                                <li>• La relación entre víctima y agresor.</li>
                                <li>• La existencia de antecedentes de violencia previa.</li>
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">
                            Por esta razón, cuando una persona recibe amenazas, resulta importante no minimizar la situación y recopilar toda la evidencia disponible para facilitar una eventual investigación.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                El marco penal entrega una referencia sobre las sanciones posibles, pero el resultado concreto depende de lo que la Fiscalía logre acreditar. Dos amenazas similares pueden tener consecuencias procesales distintas según la gravedad del daño anunciado, la relación entre las partes y los antecedentes de violencia previa que existan.
                            </p>
                        </div>
                    </div>

                    {/* GRABACIONES COMO PRUEBA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Puedo grabar una amenaza para usarla como prueba?</h2>
                        <p className="text-gray-600 mb-4">
                            Una de las preguntas más frecuentes es si una grabación puede utilizarse como evidencia.
                        </p>
                        <p className="text-gray-600 mb-4">
                            En general, las grabaciones pueden transformarse en antecedentes relevantes dentro de una investigación, especialmente cuando permiten acreditar el contenido exacto de las amenazas.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Sin embargo, la forma en que fueron obtenidas puede influir en su valoración posterior.
                        </p>
                        <div className="bg-blue-50 p-5 rounded-xl">
                            <p className="font-bold text-blue-800 mb-2">Además de las grabaciones, suelen ser útiles:</p>
                            <ul className="mt-2 space-y-1 text-blue-700">
                                <li>• Capturas de pantalla.</li>
                                <li>• Correos electrónicos.</li>
                                <li>• Mensajes de texto.</li>
                                <li>• Registros de llamadas.</li>
                                <li>• Testimonios de terceros.</li>
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">
                            Mientras más evidencia exista, mayores serán las posibilidades de acreditar adecuadamente los hechos denunciados.
                        </p>
                    </div>

                    {/* MEDIDAS DE PROTECCION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué medidas de protección pueden solicitarse?</h2>
                        <p className="text-gray-600 mb-4">
                            Cuando existe riesgo para la seguridad de una persona, las autoridades pueden adoptar diversas medidas destinadas a prevenir nuevos hechos de violencia o intimidación.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Dependiendo del caso, pueden existir mecanismos orientados a proteger a la víctima mientras se desarrolla la investigación correspondiente.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="font-bold text-red-800 mb-2">Esto es especialmente frecuente en situaciones relacionadas con:</p>
                            <ul className="mt-2 space-y-1 text-red-700">
                                <li>• Violencia intrafamiliar.</li>
                                <li>• Acoso reiterado.</li>
                                <li>• Hostigamiento.</li>
                                <li>• Amenazas graves.</li>
                                <li>• Conflictos con exparejas.</li>
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">
                            La necesidad de adoptar medidas concretas dependerá siempre de las circunstancias específicas de cada caso y de los antecedentes disponibles.
                        </p>
                    </div>

                    {/* QUE HACER SI AMENAZAS CONTINUAN */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué hacer si las amenazas continúan después de denunciar?</h2>
                        <p className="text-gray-600 mb-4">
                            Presentar una constancia o una denuncia no siempre implica que el problema desaparezca inmediatamente.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Si las amenazas continúan, es importante seguir documentando cada nuevo incidente.
                        </p>
                        <div className="bg-yellow-50 p-5 rounded-xl">
                            <p className="font-bold text-yellow-800 mb-2">Se recomienda:</p>
                            <ul className="mt-2 space-y-1 text-yellow-700">
                                <li>• Guardar nuevos mensajes.</li>
                                <li>• Registrar fechas y horarios.</li>
                                <li>• Identificar testigos.</li>
                                <li>• Informar nuevamente a las autoridades si la situación se agrava.</li>
                                <li>• Buscar asesoría jurídica especializada.</li>
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">
                            La reiteración de las amenazas puede transformarse en un antecedente relevante para evaluar la gravedad de los hechos y la necesidad de adoptar medidas adicionales de protección.
                        </p>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Esperar demasiado tiempo", desc: "Mientras más rápido se registren los hechos, mejor." },
                                    { title: "Eliminar conversaciones", desc: "Puede significar perder evidencia importante." },
                                    { title: "No identificar testigos", desc: "Los testigos suelen ser relevantes." },
                                    { title: "Confiar únicamente en una constancia", desc: "En situaciones graves normalmente corresponde denunciar." },
                                    { title: "Responder con amenazas", desc: "Esto puede generar nuevos problemas legales." },
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

                    {/* CUANDO CONSULTAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿En qué situaciones conviene consultar cuanto antes a un abogado penal?</h2>
                        <p className="text-gray-600 mb-4">Existen momentos específicos donde la asesoría legal urgente puede cambiar el curso del caso:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Cuando recibes amenazas de muerte o con daño grave y no sabes si debes hacer una constancia o una denuncia formal.",
                                "Si la persona que amenaza tiene antecedentes de violencia o acceso a armas.",
                                "Cuando existe una denuncia cruzada y necesitas evaluar tu posición procesal antes de declarar.",
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
                            <h3 className="text-2xl font-bold font-serif text-green-600 mb-3">¿Te están amenazando y no sabes qué hacer?</h3>
                            <p className="text-white mb-6">Si las amenazas son graves o reiteradas, el momento de actuar es antes de que los hechos escalen — no después. Un abogado penalista puede orientarte sobre si corresponde una constancia o una denuncia y qué pruebas reunir.</p>
                            <Link
                                to="/abogados-penales"
                                className="inline-block bg-white text-green-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                Ver abogados penalistas disponibles
                            </Link>
                        </div>
                    </div>

                    {/* CONCLUSION */}

                    <RelatedLawyers category="Derecho Penal" />

                    <div className="mb-12 border-t pt-8">

                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La constancia por amenazas puede ser una herramienta útil para dejar registro formal de situaciones preocupantes. Esta guía describe los pasos iniciales y la diferencia entre constancia y denuncia.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            La pregunta que queda abierta es si en el caso concreto los hechos constituyen un delito que la Fiscalía deba investigar o si corresponde solo un registro preventivo. Esa respuesta depende de la gravedad y reiteración de las amenazas. Si quieres profundizar, revisa también nuestras guías sobre{" "}
                            <Link to="/blog/estafa-chile-2026" className="text-green-700 underline hover:text-green-500">Estafa en Chile: tipos, penas y cómo denunciar</Link>
                            ,{" "}
                            <Link to="/blog/receptacion-en-chile-2026" className="text-green-700 underline hover:text-green-500">Receptación en Chile: qué es y cuáles son las penas</Link>{" "}
                            y{" "}
                            <Link to="/blog/apropiacion-indebida-chile-2026" className="text-green-700 underline hover:text-green-500">Apropiación indebida en Chile: qué dice la ley</Link>. Si quieres revisar tu situación, puedes consultar con un{" "}
                            <Link to="/abogados-penales" className="text-green-700 underline hover:text-green-500">abogado penalista en Chile</Link>.
                        </p>
                    </div>

                    <CategoryCTA category="penal" />

                    {/* FAQS */}

                    <div className="mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre constancia por amenazas en Chile</h2>
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
                        title="Constancia por amenazas en Chile 2026"
                        url="https://legalup.cl/blog/constancia-por-amenazas-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="constancia-por-amenazas-en-chile-2026" />

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
            <BlogConversionPopup category="Derecho Penal" topic="constancia-amenazas" />
        </div>
    );
};

export default BlogArticle;