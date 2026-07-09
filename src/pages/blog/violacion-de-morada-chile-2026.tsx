import { useState } from "react";
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

const BlogArticle = () => {
    const faqs = [
        {
            question: "¿Entrar a un patio constituye violación de morada?",
            answer: "Dependerá de las características del inmueble y de si ese espacio forma parte de la morada protegida por la ley. Cada situación debe analizarse individualmente.",
        },
        {
            question: "¿Puedo denunciar si la persona no rompió ninguna puerta?",
            answer: "Sí. El delito no exige necesariamente fuerza o daños materiales. Lo relevante es la ausencia de autorización para ingresar o permanecer en el domicilio.",
        },
        {
            question: "¿Qué ocurre si el inmueble estaba desocupado?",
            answer: "No todos los inmuebles desocupados constituyen una morada protegida. Será necesario analizar las circunstancias específicas del caso.",
        },
        {
            question: "¿Puede existir violación de morada entre familiares?",
            answer: "Sí. El vínculo familiar no elimina automáticamente la protección penal del domicilio.",
        },
        {
            question: "¿La víctima necesita contratar un abogado para denunciar?",
            answer: "No es obligatorio para presentar una denuncia, aunque recibir asesoría jurídica puede ser útil para comprender el procedimiento y proteger adecuadamente sus derechos.",
        },
        {
            question: "¿Qué pasa si soy investigado por este delito?",
            answer: "Lo recomendable es evitar declarar sin conocer previamente los antecedentes de la investigación y buscar asesoría de un abogado penalista para preparar la defensa.",
        },
        {
            question: "¿Qué diferencia hay entre violación de morada y usurpación?",
            answer: "La violación de morada sanciona el ingreso o permanencia ilegítima en un domicilio. La usurpación busca proteger la posesión o tenencia de un inmueble durante un período prolongado.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Violación de morada en Chile 2026: penas, denuncia y cuándo existe el delito"
                description="Conoce qué es la violación de morada en Chile, cuándo constituye un delito, cuáles son las penas, cómo denunciar y qué hacer si eres víctima o estás siendo investigado."
                image="/assets/violacion-de-morada-chile-2026.png"
                url="https://legalup.cl/blog/violacion-de-morada-chile-2026"
                datePublished="2026-07-04"
                dateModified="2026-07-04"
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
                        Violación de morada en Chile 2026: cuándo es delito y cuáles son las penas
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "La violación de morada ocurre cuando una persona entra o permanece en un domicilio ajeno contra la voluntad de quien tiene derecho a excluirla",
                                "No toda entrada a una propiedad constituye este delito; depende del lugar, las circunstancias y la autorización existente",
                                "El delito puede investigarse tanto si hubo ingreso forzado como si la persona se negó a abandonar el inmueble",
                                "Existen diferencias importantes entre violación de morada, allanamiento y usurpación",
                                "Si eres víctima o estás siendo investigado, contar con asesoría penal temprana puede ser determinante para el desarrollo del caso",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Entrar a una propiedad privada sin autorización puede generar consecuencias penales importantes. Muchas personas creen que basta con cruzar un portón o ingresar a una casa ajena para cometer automáticamente un delito, mientras que otras piensan que si conocen al propietario o estuvieron invitados anteriormente no existe ningún problema.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>4 de Julio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="violacion-de-morada-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Violación de morada en Chile 2026"
                        url="https://legalup.cl/blog/violacion-de-morada-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            La realidad jurídica es bastante más compleja. En Chile, el delito de violación de morada protege la inviolabilidad del domicilio y la privacidad de las personas. Dependiendo de las circunstancias, ingresar o permanecer en un inmueble contra la voluntad de quien lo habita puede dar origen a una investigación penal, una denuncia e incluso a una condena.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía actualizada para 2026 explicamos qué es la violación de morada, cuándo existe realmente este delito, cuáles son las penas aplicables, cómo denunciar y qué hacer si eres víctima o si estás siendo investigado.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando un conflicto relacionado con una propiedad, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/robo-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                robo en Chile
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/hurto-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                hurto en Chile
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/lesiones-leves-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                lesiones leves
                            </Link>{" "}
                            y{" "}
                            <Link
                                to="/blog/control-de-detencion-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                control de detención en Chile
                            </Link>.
                        </p>
                    </div>

                    {/* QUE ES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es la violación de morada?</h2>
                        <p className="text-gray-600 mb-4">
                            La violación de morada es un delito contemplado en la legislación penal chilena que sanciona el ingreso o permanencia ilegítima en un domicilio ajeno.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Su finalidad es proteger uno de los derechos fundamentales de toda persona: la inviolabilidad del hogar. Esto significa que nadie puede ingresar libremente a la vivienda de otra persona sin autorización, salvo en los casos expresamente permitidos por la ley.
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">
                                El delito no protege únicamente la propiedad del inmueble. Lo que protege principalmente es el derecho de quien ocupa el lugar a decidir quién puede entrar y quién no. Por esa razón, incluso un propietario puede enfrentar problemas legales si ingresa arbitrariamente a una vivienda que se encuentra legítimamente ocupada por otra persona.
                            </p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                La definición anterior describe el delito en abstracto. Acreditarlo en un caso concreto exige demostrar no solo que existió un ingreso, sino que el ocupante se oponía a ese acceso y que el imputado actuó contra esa voluntad. Esa distinción —entre una entrada tolerada y una intrusion— depende de los antecedentes específicos de cada investigación.
                            </p>
                        </div>
                    </div>

                    {/* QUE SE ENTIENDE POR MORADA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué se entiende por morada?</h2>
                        <p className="text-gray-600 mb-4">
                            Uno de los errores más comunes consiste en pensar que solamente una casa constituye una morada. En realidad, el concepto es bastante más amplio.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3 mb-4">
                            {["Una casa", "Un departamento", "Una habitación", "Una parcela habitada", "Una cabaña", "Una residencia temporal", "Cualquier lugar destinado efectivamente a la vida privada de una persona"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-500">•</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600">Lo relevante es que el lugar sea utilizado como espacio de habitación y privacidad. No importa si quien vive allí es propietario, arrendatario, usufructuario o simplemente ocupa legítimamente el inmueble.</p>
                    </div>

                    {/* CUANDO EXISTE EL DELITO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo existe el delito?</h2>
                        <p className="text-gray-600 mb-4">Para que exista violación de morada normalmente deben concurrir varios elementos.</p>
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">1. Debe tratarse de un domicilio protegido</h3>
                                <p className="text-gray-600">El inmueble debe constituir un lugar destinado a la habitación o vida privada: viviendas particulares, departamentos, habitaciones de hoteles ocupadas, segundas viviendas mientras están siendo utilizadas. En cambio, normalmente no constituyen morada: terrenos baldíos, sitios eriazos, bodegas abandonadas o inmuebles completamente desocupados.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">2. No debe existir autorización</h3>
                                <p className="text-gray-600">El ingreso debe producirse sin consentimiento de quien tiene derecho a controlar el acceso. Si existe autorización válida, en principio no hay delito. Sin embargo, la autorización puede revocarse. Por ejemplo, si una persona fue invitada inicialmente pero luego el ocupante le exige retirarse y esta se niega, la situación puede adquirir relevancia penal.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">3. Debe existir oposición del ocupante</h3>
                                <p className="text-gray-600">La oposición puede manifestarse de distintas maneras: cerrar el acceso, pedir expresamente que la persona no ingrese, solicitar que abandone el inmueble o impedir físicamente el acceso dentro de los límites legales. La negativa puede ser verbal o deducirse claramente de las circunstancias.</p>
                            </div>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Los elementos anteriores describen la estructura del delito. En la práctica, la Fiscalía debe probar cada uno de ellos con los antecedentes disponibles. La ausencia de testigos, la inexistencia de grabaciones o la falta de una negativa expresa pueden dificultar esa acreditación y la defensa puede impugnar cada elemento según las circunstancias del caso.
                            </p>
                        </div>
                    </div>

                    {/* PUERTA ABIERTA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si la puerta estaba abierta?</h2>
                        <p className="text-gray-600 mb-4">
                            Muchas personas creen que ingresar por una puerta abierta elimina cualquier responsabilidad penal. Eso no es correcto.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">Lo importante no es si hubo fuerza para ingresar. Lo relevante es la ausencia de autorización. Si una persona entra a una vivienda simplemente porque encontró la puerta abierta, igualmente podría configurarse una violación de morada si sabía o podía comprender que no tenía autorización para hacerlo.</p>
                        </div>
                    </div>

                    {/* CONOCIA AL PROPIETARIO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Y si conocía al propietario?</h2>
                        <p className="text-gray-600 mb-4">
                            Tampoco basta con conocer al dueño. Es frecuente que existan conflictos entre exparejas, familiares, vecinos, antiguos convivientes, propietarios y arrendatarios.
                        </p>
                        <div className="bg-blue-50 p-5 rounded-xl">
                            <p className="text-blue-800">El hecho de haber ingresado anteriormente con autorización no significa que exista un permiso permanente. Cada ingreso debe evaluarse según las circunstancias concretas.</p>
                        </div>
                    </div>

                    {/* DIFERENCIA CON USURPACION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Diferencia entre violación de morada y usurpación</h2>
                        <p className="text-gray-600 mb-4">Es habitual confundir ambos delitos.</p>
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="bg-red-50 p-5 rounded-xl border border-red-200">
                                <h3 className="font-bold text-red-800 text-lg mb-2">Violación de morada</h3>
                                <p className="text-red-700">Sanciona el ingreso o permanencia ilegítima en un domicilio. Ejemplo: entrar a una vivienda habitada contra la voluntad del ocupante.</p>
                            </div>
                            <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
                                <h3 className="font-bold text-blue-800 text-lg mb-2">Usurpación</h3>
                                <p className="text-blue-700">Busca proteger la posesión o tenencia de un inmueble durante un período prolongado. Ejemplo: ocupar ilegalmente un terreno o inmueble.</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">Aunque ambas figuras pueden relacionarse, tienen requisitos distintos y consecuencias jurídicas diferentes.</p>
                    </div>

                    {/* DIFERENCIA CON ALLANAMIENTO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Diferencia entre violación de morada y allanamiento</h2>
                        <p className="text-gray-600 mb-4">
                            El allanamiento corresponde al ingreso autorizado por la ley realizado por autoridades competentes, generalmente mediante una orden judicial o en situaciones excepcionales previstas legalmente. Por ejemplo, Carabineros o la PDI pueden ingresar a un inmueble cuando existen fundamentos legales suficientes.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">En esos casos no existe violación de morada, porque el ingreso se encuentra respaldado por normas legales específicas. Por el contrario, un particular no puede invocar esas facultades.</p>
                        </div>
                    </div>

                    {/* PENAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuáles son las penas?</h2>
                        <p className="text-gray-600 mb-4">Las penas dependerán de las circunstancias específicas del caso y de la forma en que se produjo el ingreso.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Si existió violencia", "Si hubo intimidación", "Si se produjeron daños", "Si concurrieron otros delitos", "Si existían agravantes o atenuantes"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-gray-500">•</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Por ello resulta indispensable revisar cada situación concreta antes de determinar las consecuencias penales.</p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                El marco penal indica el riesgo teórico, pero la consecuencia concreta depende de los antecedentes de cada investigación. Dos ingresos sin autorización similares pueden tener resultados procesales distintos según lo que la Fiscalía logre acreditar y la capacidad de la defensa para impugnar esos elementos.
                            </p>
                        </div>
                    </div>

                    {/* QUE HACER SI ALGUIEN ENTRA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué hacer si alguien entra a tu casa sin autorización?</h2>
                        <p className="text-gray-600 mb-4">Si una persona ingresa a tu domicilio sin permiso, lo recomendable es actuar con prudencia.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Mantener la calma", "Evitar enfrentamientos físicos innecesarios", "Llamar a Carabineros cuando corresponda", "Registrar evidencia disponible", "Identificar posibles testigos", "Conservar grabaciones de cámaras de seguridad"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Toda esta información puede resultar relevante durante una eventual investigación.</p>
                    </div>

                    {/* CTA IN-ARTICLE */}
                    <InArticleCTA
                        message="Si te imputan violación de morada o ingresaste a un domicilio sin autorización, el momento de preparar tu defensa es antes de declarar ante la Fiscalía."
                        buttonText="Habla con un abogado ahora"
                        category="Derecho Penal"
                    />

                    {/* COMO DENUNCIAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo denunciar una violación de morada en Chile?</h2>
                        <p className="text-gray-600 mb-4">Si consideras que una persona ingresó o permaneció en tu domicilio contra tu voluntad, puedes presentar una denuncia para que los hechos sean investigados.</p>
                        <div className="grid sm:grid-cols-3 gap-4 mb-4">
                            {[
                                { title: "Carabineros", desc: "Una de las vías más utilizadas por las víctimas." },
                                { title: "Policía de Investigaciones (PDI)", desc: "También puede recibir denuncias por este delito." },
                                { title: "Fiscalía", desc: "Permite iniciar formalmente una investigación penal." },
                            ].map((item, i) => (
                                <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                                    <p className="text-gray-500 text-sm mt-1">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">No es necesario conocer exactamente qué delito se configuró para denunciar. Lo importante es relatar los hechos con la mayor precisión posible para que la autoridad determine la calificación jurídica correspondiente. Mientras más antecedentes puedas aportar, más fácil será para la Fiscalía iniciar la investigación.</p>
                        </div>
                    </div>

                    {/* PRUEBAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pruebas pueden servir en una investigación?</h2>
                        <p className="text-gray-600 mb-4">Como ocurre en cualquier delito, la prueba resulta fundamental.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Grabaciones de cámaras de seguridad", "Fotografías del inmueble", "Videos tomados por vecinos", "Mensajes o conversaciones relacionadas con el ingreso", "Declaraciones de testigos", "Registros de llamados a Carabineros", "Informes policiales"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">En algunos casos también pueden existir peritajes que permitan acreditar daños, violencia o la forma en que ocurrió el ingreso. No todas las investigaciones cuentan con el mismo tipo de evidencia, por lo que cada caso debe evaluarse individualmente.</p>
                    </div>

                    {/* NEGATIVA A SALIR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si la persona se niega a salir?</h2>
                        <p className="text-gray-600 mb-4">
                            Una situación relativamente frecuente ocurre cuando alguien ingresó inicialmente con autorización, pero posteriormente se niega a abandonar el inmueble: una expareja, un familiar, un antiguo conviviente o un invitado.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">En estos casos la situación puede adquirir relevancia penal si la permanencia continúa pese a la oposición expresa de quien tiene derecho a excluir a esa persona. Sin embargo, también pueden existir conflictos civiles o familiares paralelos, por lo que resulta importante analizar cuidadosamente los antecedentes antes de adoptar cualquier decisión.</p>
                        </div>
                    </div>

                    {/* FLAGRANCIA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Puede existir flagrancia?</h2>
                        <p className="text-gray-600 mb-4">
                            Sí. Si una persona es sorprendida ingresando o permaneciendo ilegítimamente en un domicilio, pueden darse las condiciones para una detención en situación de flagrancia conforme a las reglas generales del proceso penal.
                        </p>
                        <p className="text-gray-600">
                            Posteriormente, esa detención deberá ser revisada por un juez durante la correspondiente audiencia de control de detención. Si quieres conocer cómo funciona esa etapa, puedes revisar nuestra guía sobre{" "}
                            <Link to="/blog/control-de-detencion-chile-2026" className="text-green-700 underline">Control de detención en Chile 2026</Link>.
                        </p>
                    </div>

                    {/* INVESTIGACION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre durante la investigación?</h2>
                        <p className="text-gray-600 mb-4">Una vez presentada la denuncia, la Fiscalía puede ordenar distintas diligencias destinadas a esclarecer los hechos.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Tomar declaraciones", "Solicitar registros audiovisuales", "Inspeccionar el inmueble", "Requerir informes policiales", "Citar testigos", "Recopilar otros antecedentes relevantes"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Con toda esa información decidirá si corresponde formalizar la investigación, solicitar nuevas diligencias o cerrar el procedimiento.</p>
                    </div>

                    {/* ESTRATEGIAS DE DEFENSA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Posibles estrategias de defensa</h2>
                        <p className="text-gray-600 mb-4">Cuando una persona es investigada por violación de morada, la defensa dependerá completamente de las circunstancias del caso.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Existencia de autorización para ingresar", "Error respecto del consentimiento", "Ausencia de oposición del ocupante", "Discusión sobre si el inmueble constituía realmente una morada", "Problemas en la identificación del presunto autor", "Insuficiencia de prueba"].map((item, i) => (
                                <li key={i} className="fflex items-center gap-2">
                                    <span className="text-gray-600">• {item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Cada estrategia debe construirse considerando únicamente los antecedentes concretos de la investigación.</p>
                    </div>

                    {/* CASOS FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Casos frecuentes</h2>
                        <div className="space-y-3">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Exparejas</h3>
                                <p className="text-gray-600">Uno de los conflictos más comunes ocurre cuando una relación termina y una de las personas continúa ingresando al domicilio que anteriormente compartía. Dependiendo de la situación jurídica del inmueble y de quién tenga derecho a ocuparlo, pueden surgir investigaciones penales o conflictos propios del derecho de familia.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Conflictos entre vecinos</h3>
                                <p className="text-gray-600">También es frecuente que vecinos ingresen a patios, jardines o viviendas durante discusiones relacionadas con cierres, medianeros, mascotas o ruidos molestos. No todos estos conflictos constituyen violación de morada, pero algunos pueden dar origen a investigaciones cuando existe un ingreso ilegítimo al domicilio.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Arrendamientos</h3>
                                <p className="text-gray-600">En ocasiones un propietario ingresa a un inmueble arrendado sin autorización del arrendatario. Aunque sea dueño del inmueble, el arrendatario mantiene el derecho a la inviolabilidad de la vivienda mientras dure el contrato, salvo las excepciones legales o contractuales correspondientes.</p>
                            </div>
                        </div>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Enfrentar físicamente al intruso", desc: "La reacción inmediata muchas veces es intentar sacar por la fuerza a quien ingresó al domicilio. Sin embargo, dependiendo de cómo ocurran los hechos, esa respuesta puede generar nuevos conflictos penales. Siempre resulta recomendable privilegiar la intervención de las autoridades cuando la situación lo permita." },
                                    { title: "Eliminar evidencia", desc: "Borrar grabaciones o modificar elementos del lugar puede dificultar posteriormente la investigación. Es preferible conservar toda la información disponible hasta que sea revisada por las autoridades." },
                                    { title: "No denunciar oportunamente", desc: "Mientras más tiempo transcurre, más difícil puede resultar obtener declaraciones, registros de cámaras o evidencia relevante. Una denuncia oportuna facilita el trabajo investigativo." },
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

                    {/* RELACION CON OTROS DELITOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Relación con otros delitos</h2>
                        <p className="text-gray-600 mb-4">Dependiendo de los hechos, la violación de morada puede investigarse junto con otros delitos:</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Daños", "Amenazas", "Lesiones", "Robo", "Hurto", "Apropiación indebida"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-gray-500">•</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">
                            Cada uno posee requisitos propios y sanciones distintas. Si deseas conocer las diferencias, también puedes revisar nuestras guías sobre{" "}
                            <Link to="/blog/robo-chile-2026" className="text-green-700 underline">Robo en Chile</Link>
                            ,{" "}
                            <Link to="/blog/hurto-chile-2026" className="text-green-700 underline">Hurto en Chile</Link>
                            ,{" "}
                            <Link to="/blog/lesiones-leves-chile-2026" className="text-green-700 underline">Lesiones leves en Chile</Link>{" "}
                            y{" "}
                            <Link to="/blog/apropiacion-indebida-chile-2026" className="text-green-700 underline">Apropiación indebida en Chile</Link>.
                        </p>
                    </div>

                    {/* CUANDO CONSULTAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿En qué situaciones conviene consultar cuanto antes a un abogado penal?</h2>
                        <p className="text-gray-600 mb-4">Existen momentos específicos donde la asesoría legal urgente puede cambiar el curso del caso:</p>
                        <ul className="space-y-3 text-gray-600">
                            <li className="flex items-start gap-3">
                                <span className="text-green-600 font-bold mt-0.5">•</span>
                                <span>Cuando la otra persona ya presentó una denuncia en Fiscalía por ingreso no autorizado y aún no has declarado.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-green-600 font-bold mt-0.5">•</span>
                                <span>Si Carabineros te notificó una citación por violación de morada y no sabes qué antecedentes existen en tu contra.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-green-600 font-bold mt-0.5">•</span>
                                <span>Cuando existe un conflicto entre ex parejas o familiares por el uso de una vivienda y necesitas determinar si es un tema penal o civil.</span>
                            </li>
                        </ul>
                    </div>

                    {/* CTA PRINCIPAL */}
                    <div className="mb-12">
                        <div className="bg-green-900 rounded-2xl p-8 text-center">
                            <h3 className="text-2xl font-bold font-serif text-green-600 mb-3">¿Ya hay una denuncia por ingreso no autorizado?</h3>
                            <p className="text-white mb-6">Si la otra persona ya denunció un ingreso no autorizado a su domicilio, el momento clave es antes de que la Fiscalía formalice la investigación — después de la formalización, las opciones de defensa se reducen significativamente.</p>
                            <Link
                                to="/abogados-penales"
                                className="inline-block bg-white text-green-900 font-bold px-8 py-3 rounded-md hover:bg-gray-100 transition-colors"
                            >
                                Ver abogados penalistas disponibles
                            </Link>
                        </div>
                    </div>

                    {/* CONCLUSION */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La violación de morada protege uno de los derechos fundamentales de toda persona: la inviolabilidad del hogar. Esta guía describe las reglas generales del delito y los pasos iniciales para víctimas e imputados.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            La pregunta que queda abierta es si en el caso concreto existía o no autorización, si el ingreso fue realmente contra la voluntad del ocupante y qué pruebas existen para acreditarlo. Esa respuesta depende de los antecedentes específicos. Si quieres revisar tu situación, puedes consultar con un{" "}
                            <Link to="/abogados-penales" className="text-green-700 underline hover:text-green-500">abogado penalista en Chile</Link>.
                        </p>
                    </div>

                    <CategoryCTA category="penal" />

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
                </div>
            </div>

            <RelatedLawyers category="Derecho Penal" />

            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
                <div className="mt-8">
                    <BlogShare
                        title="Violación de morada en Chile 2026"
                        url="https://legalup.cl/blog/violacion-de-morada-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="violacion-de-morada-chile-2026" />

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