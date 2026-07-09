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
            question: "¿Cuál es la diferencia entre robo y hurto?",
            answer: "La principal diferencia es que el robo requiere violencia, intimidación o fuerza para apropiarse del bien, mientras que el hurto ocurre sin utilizar esos medios.",
        },
        {
            question: "¿Dónde puedo denunciar un robo?",
            answer: "Puedes presentar la denuncia ante Carabineros de Chile, la Policía de Investigaciones o directamente en la Fiscalía.",
        },
        {
            question: "¿Qué pasa si recupero mis pertenencias?",
            answer: "La recuperación de las especies no necesariamente pone término a la investigación penal. La Fiscalía continuará evaluando si existen antecedentes suficientes para perseguir el delito.",
        },
        {
            question: "¿Siempre hay cárcel por un robo?",
            answer: "Depende de múltiples factores, como el tipo de robo investigado, las circunstancias del hecho y los antecedentes del imputado. Cada caso debe analizarse individualmente.",
        },
        {
            question: "¿Qué hago si me acusaron injustamente de robo?",
            answer: "Lo recomendable es buscar asesoría jurídica lo antes posible, evitar realizar declaraciones sin orientación profesional y conservar toda la evidencia que pueda respaldar tu versión de los hechos.",
        },
        {
            question: "¿Qué pruebas son importantes en un delito de robo?",
            answer: "Las más relevantes son grabaciones de cámaras de seguridad, declaraciones de la víctima y testigos, y evidencia física como huellas, ADN, objetos abandonados o armas.",
        },
        {
            question: "¿Puedo recuperar las especies robadas?",
            answer: "Sí. Uno de los objetivos de la investigación penal es recuperar los bienes sustraídos y restituirlos a su propietario cuando sea posible, especialmente si la denuncia es rápida y existen pruebas.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Robo en Chile 2026: tipos, penas y qué hacer si eres víctima o imputado"
                description="Aprende qué es el robo en Chile, sus tipos, penas, cómo denunciar y qué hacer si eres víctima o imputado. Guía actualizada 2026."
                image="/assets/robo-chile-2026.png"
                url="https://legalup.cl/blog/robo-chile-2026"
                datePublished="2026-07-01"
                dateModified="2026-07-01"
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
                        Robo en Chile 2026: tipos, penas y qué hacer si eres víctima o imputado
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "El robo es un delito contra la propiedad que implica violencia, intimidación o fuerza para apropiarse de un bien ajeno",
                                "El Código Penal chileno contempla distintos tipos de robo, cuyas penas varían según la forma en que se comete",
                                "Si eres víctima de un robo, denunciar rápidamente aumenta las posibilidades de identificar al responsable y recuperar las especies",
                                "Si estás siendo investigado, tienes derecho a guardar silencio, contar con un abogado y ejercer una defensa adecuada",
                                "Una asesoría penal temprana puede ser determinante para proteger tus derechos durante toda la investigación",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        El delito de robo en Chile constituye uno de los ilícitos patrimoniales más graves contemplados por el Código Penal debido a que, además de afectar el patrimonio de la víctima, suele comprometer su integridad física, seguridad o libertad.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>1 de Julio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="robo-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Robo en Chile 2026"
                        url="https://legalup.cl/blog/robo-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            A diferencia del hurto, el robo incorpora un elemento adicional: el uso de violencia, intimidación o fuerza para apropiarse de un bien ajeno. Precisamente esa diferencia explica que las penas sean considerablemente más severas.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía actualizada para 2026 explicamos qué es el delito de robo, cuáles son sus principales tipos, qué penas contempla la legislación chilena y qué hacer tanto si eres víctima como si estás siendo investigado.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando un conflicto patrimonial, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/hurto-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                hurto en Chile
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/apropiacion-indebida-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                apropiación indebida
                            </Link>{" "}
                            y{" "}
                            <Link
                                to="/blog/orden-de-alejamiento-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                orden de alejamiento
                            </Link>.
                        </p>
                    </div>

                    {/* QUE ES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es el delito de robo en Chile?</h2>
                        <p className="text-gray-600 mb-4">
                            El robo consiste en la apropiación de una cosa mueble ajena utilizando alguno de los siguientes medios: violencia sobre la víctima, intimidación o fuerza sobre las cosas, en los casos establecidos por la ley.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Estos elementos distinguen al robo del delito de hurto, donde la apropiación ocurre sin violencia ni fuerza.
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">El objetivo del legislador es sancionar con mayor severidad aquellas conductas que, además del perjuicio económico, ponen en riesgo la seguridad o integridad de las personas.</p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                La definición anterior describe el concepto general de robo. Sin embargo, en una investigación concreta la calificación jurídica depende de cómo la Fiscalía evalúe los antecedentes específicos: si existió violencia, si hubo intimidación real o si el ingreso fue forzado. Esa diferencia entre la regla general y su aplicación práctica es la que determina el curso de cada caso.
                            </p>
                        </div>
                    </div>

                    {/* DIFERENCIA ROBO Y HURTO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Diferencia entre robo y hurto</h2>
                        <p className="text-gray-600 mb-4">Aunque ambos delitos afectan el patrimonio de una persona, jurídicamente son distintos.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 p-3 text-left font-bold">Hurto</th>
                                        <th className="border border-gray-300 p-3 text-left font-bold">Robo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-300 p-3">No existe violencia ni intimidación</td>
                                        <td className="border border-gray-300 p-3">Existe violencia, intimidación o fuerza</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Generalmente aprovecha un descuido</td>
                                        <td className="border border-gray-300 p-3">Existe confrontación o ingreso forzado</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Las penas suelen ser menores</td>
                                        <td className="border border-gray-300 p-3">Las penas son considerablemente más altas</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-blue-50 p-5 rounded-xl mt-4">
                            <p className="text-blue-800">
                                <span className="font-bold">Ejemplo:</span> Una persona deja su mochila sobre una silla y alguien la toma sin que nadie lo advierta. Eso normalmente constituye hurto. En cambio, si una persona amenaza a la víctima para obligarla a entregar esa mochila, estaremos frente a un robo con intimidación.
                            </p>
                        </div>
                        <p className="text-gray-600 mt-4">
                            Si quieres conocer en detalle las diferencias entre ambos delitos, revisa también nuestra guía sobre{" "}
                            <Link to="/blog/hurto-chile-2026" className="text-green-700 underline">Hurto en Chile 2026</Link>.
                        </p>
                    </div>

                    {/* PRINCIPALES TIPOS DE ROBO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Principales tipos de robo en Chile</h2>
                        <p className="text-gray-600 mb-4">El Código Penal contempla distintas modalidades de robo. La calificación dependerá de la forma en que ocurrieron los hechos.</p>
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Robo con violencia</h3>
                                <p className="text-gray-600">Se produce cuando el autor utiliza fuerza física contra la víctima para obtener o mantener la posesión del bien. Ejemplos: golpear a una persona para quitarle su teléfono, empujar a la víctima para arrebatarle una cartera.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Robo con intimidación</h3>
                                <p className="text-gray-600">No necesariamente existe agresión física. Basta que la víctima entregue el bien debido a amenazas o intimidaciones, como amenazar con un arma, simular portar un arma o amenazar con causar lesiones graves.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Robo con fuerza en lugar habitado</h3>
                                <p className="text-gray-600">Ocurre cuando el autor ingresa utilizando fuerza para sustraer bienes desde una vivienda habitada, forzando puertas, rompiendo ventanas o escalando muros. Las penas suelen ser especialmente severas.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Robo con fuerza en lugar no habitado</h3>
                                <p className="text-gray-600">Puede configurarse cuando el ingreso forzado ocurre en oficinas, locales comerciales, bodegas, galpones o empresas. El uso de fuerza sobre las cosas constituye un elemento suficiente para diferenciarlo del hurto.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Robo por sorpresa</h3>
                                <p className="text-gray-600">Conocido popularmente como "lanzazo". Consiste en quitar rápidamente una especie desde la víctima aprovechando el factor sorpresa, como arrebatar un celular mientras la persona camina.</p>
                            </div>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                La clasificación del robo en uno u otro tipo no es automática. La Fiscalía debe reunir evidencia suficiente para acreditar cada elemento, y esa valoración probatoria varía según el caso. No es igual contar con una grabación que muestre el uso de violencia que enfrentar versiones contradictorias sobre lo ocurrido.
                            </p>
                        </div>
                    </div>

                    {/* PENAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuáles son las penas por robo?</h2>
                        <p className="text-gray-600 mb-4">Las penas dependen de diversos factores:</p>
                        <div className="grid sm:grid-cols-2 gap-3 mb-4">
                            {["Tipo de robo cometido", "Existencia de violencia", "Uso de armas", "Lesiones ocasionadas", "Participación de varias personas", "Existencia de antecedentes penales", "Reincidencia"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-gray-500">•</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">La calificación jurídica realizada por la Fiscalía será uno de los aspectos más relevantes durante la investigación. Mientras algunas modalidades pueden implicar penas privativas de libertad importantes, otras requieren un análisis específico según las circunstancias del caso.</p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                El marco penal ayuda a comprender el riesgo teórico, pero dos personas investigadas por el mismo tipo de robo pueden enfrentar resultados distintos. Una puede acceder a una suspensión condicional si cumple los requisitos; otra puede llegar a juicio oral. La diferencia no la determina solo la ley sino los antecedentes específicos que la Fiscalía reúna durante la investigación.
                            </p>
                        </div>
                    </div>

                    {/* QUE HACER SI VICTIMA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué hacer si fuiste víctima de un robo?</h2>
                        <p className="text-gray-600 mb-4">Actuar rápidamente puede aumentar considerablemente las posibilidades de recuperar las especies e identificar a los responsables.</p>
                        <div className="space-y-3 mb-4">
                            {["Mantener la calma", "Alejarse si existe peligro", "Llamar inmediatamente a Carabineros si el hecho acaba de ocurrir", "Evitar perseguir personalmente al autor cuando ello implique un riesgo"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-green-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <div className="bg-gray-50 p-5 rounded-xl">
                            <p className="font-bold mb-2">Información útil para reunir:</p>
                            <div className="grid sm:grid-cols-2 gap-2">
                                {["Hora aproximada", "Lugar exacto", "Descripción de los responsables", "Vehículos utilizados", "Fotografías", "Cámaras cercanas", "Documentación que acredite la propiedad de los bienes", "Testigos"].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-gray-500">•</span>
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">Mientras más antecedentes existan desde el inicio, más eficiente podrá ser la investigación.</p>
                    </div>

                    {/* DONDE DENUNCIAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Dónde denunciar un robo?</h2>
                        <p className="text-gray-600 mb-4">La denuncia puede realizarse ante:</p>
                        <div className="grid sm:grid-cols-3 gap-4">
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
                        <p className="text-gray-600 mt-4">En situaciones de flagrancia, las policías pueden iniciar diligencias inmediatas para intentar ubicar al autor y recuperar las especies. Posteriormente, el Ministerio Público dirigirá la investigación penal.</p>
                    </div>

                    {/* PRUEBAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pruebas son importantes en un delito de robo?</h2>
                        <p className="text-gray-600 mb-4">Las investigaciones actuales dependen en gran medida de la evidencia disponible.</p>
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Cámaras de seguridad</h3>
                                <p className="text-gray-600">Constituyen una de las principales fuentes de prueba. Pueden provenir de municipios, comercios, condominios, estaciones de servicio o transporte público.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Declaraciones de la víctima</h3>
                                <p className="text-gray-600">La versión entregada por la víctima suele ser el punto de partida de la investigación. Mientras más precisa sea la descripción, mayores posibilidades existen de orientar correctamente las diligencias.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Testigos</h3>
                                <p className="text-gray-600">Las personas que presenciaron el hecho pueden aportar información sobre número de participantes, vestimenta, vehículos, dirección de huida y uso de armas.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Evidencia física</h3>
                                <p className="text-gray-600">Huellas, ADN, objetos abandonados, herramientas utilizadas para ingresar o armas pueden resultar determinantes para identificar al responsable.</p>
                            </div>
                        </div>
                    </div>

                    <InArticleCTA
                        message="¿Fuiste víctima de un robo o te acusan de este delito? El momento más importante para contar con asesoría penal es antes de prestar declaración, no después."
                        buttonText="Habla con un abogado ahora"
                        category="Derecho Penal"
                    />

                    {/* DETENCION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si una persona es detenida por robo?</h2>
                        <p className="text-gray-600 mb-4">Cuando una persona es sorprendida cometiendo un robo o existen antecedentes suficientes para su detención en flagrancia, Carabineros o la PDI pueden privarla de libertad y ponerla a disposición del tribunal dentro del plazo legal.</p>
                        <p className="text-gray-600 mb-4">Posteriormente se realiza el control de detención, audiencia en la que el juez verifica si la detención fue legal y decide los pasos siguientes.</p>
                        <div className="bg-gray-50 p-5 rounded-xl">
                            <p className="font-bold mb-2">Durante esta etapa la Fiscalía puede solicitar:</p>
                            <ul className="space-y-1 text-gray-700">
                                <li>• Formalizar la investigación</li>
                                <li>• Aplicar medidas cautelares</li>
                                <li>• Fijar un plazo de investigación</li>
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">Dependiendo de la gravedad del delito y de los antecedentes del imputado, el tribunal puede decretar medidas como firma periódica, prohibición de acercarse a la víctima, arraigo nacional, arresto domiciliario o prisión preventiva.</p>
                    </div>

                    {/* DERECHOS DEL IMPUTADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Derechos de quien es investigado por robo</h2>
                        <p className="text-gray-600 mb-4">Ser imputado por un delito de robo no significa que exista una condena. Toda persona mantiene el derecho a la presunción de inocencia mientras no exista una sentencia firme.</p>
                        <div className="grid sm:grid-cols-2 gap-3 mb-4">
                            {["Derecho a guardar silencio", "Derecho a ser informado de los hechos investigados", "Derecho a contar con un abogado defensor", "Derecho a acceder a los antecedentes de la investigación", "Derecho a presentar pruebas", "Derecho a solicitar diligencias", "Derecho a un juicio justo"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-gray-500">•</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="text-red-800">Uno de los errores más frecuentes consiste en intentar explicar inmediatamente los hechos sin haber recibido asesoría jurídica. Una declaración apresurada puede generar contradicciones o afectar la estrategia de defensa durante el resto del procedimiento.</p>
                        </div>
                    </div>

                    {/* ROBO POR VARIAS PERSONAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si el robo fue cometido por varias personas?</h2>
                        <p className="text-gray-600 mb-4">Muchos robos son ejecutados por dos o más participantes. En estos casos la Fiscalía puede investigar la participación específica de cada uno.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Quién ejecutó directamente el robo", "Quién facilitó vehículos", "Quién vigiló el lugar", "Quién recibió posteriormente las especies", "Quién coordinó la actuación del grupo"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-gray-500">•</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">La responsabilidad penal dependerá de los antecedentes reunidos durante la investigación y del grado de participación que logre acreditarse respecto de cada imputado.</p>
                    </div>

                    {/* RECUPERAR ESPECIES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Es posible recuperar las especies robadas?</h2>
                        <p className="text-gray-600 mb-4">Sí. Uno de los objetivos de la investigación penal consiste precisamente en recuperar los bienes sustraídos y restituirlos a su propietario cuando ello sea posible.</p>
                        <div className="bg-green-50 p-5 rounded-xl">
                            <p className="font-bold text-green-800">Las probabilidades de recuperación aumentan cuando:</p>
                            <div className="grid sm:grid-cols-2 gap-2 mt-2">
                                {["La denuncia se presenta rápidamente", "Existen cámaras de seguridad", "Los objetos poseen número de serie", "Se cuenta con facturas o boletas", "Existen fotografías recientes", "Hay sistemas de geolocalización activos"].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-green-600 font-bold">✓</span>
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">Si las especies son encontradas durante un procedimiento policial, normalmente permanecen bajo custodia mientras se realizan las diligencias necesarias y posteriormente pueden ser restituidas mediante las resoluciones correspondientes.</p>
                    </div>

                    {/* DIFERENCIAS ENTRE DELITOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Diferencias entre robo, hurto, estafa y apropiación indebida</h2>
                        <p className="text-gray-600 mb-4">En la práctica muchas personas utilizan estos conceptos como sinónimos, pero jurídicamente corresponden a delitos diferentes.</p>
                        <div className="space-y-3">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Robo</h3>
                                <p className="text-gray-600">Existe violencia, intimidación o fuerza para obtener el bien. Ejemplo: amenazar a una persona con un arma para quitarle su teléfono.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Hurto</h3>
                                <p className="text-gray-600">No existe violencia ni fuerza. El autor aprovecha un descuido para apropiarse del bien. Ejemplo: tomar un computador dejado sin vigilancia en una cafetería.</p>
                                <p className="text-gray-500 text-sm mt-1">Puedes revisar más detalles en nuestro artículo sobre hurto en Chile.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Estafa</h3>
                                <p className="text-gray-600">La víctima entrega voluntariamente el dinero o el bien porque fue engañada. Ejemplo: pagar por un producto publicado en internet que nunca será entregado.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Apropiación indebida</h3>
                                <p className="text-gray-600">El bien fue recibido legítimamente, pero posteriormente quien lo recibió decide no devolverlo. Ejemplo: recibir un vehículo en préstamo y negarse a restituirlo.</p>
                                <p className="text-gray-500 text-sm mt-1">Puedes conocer este delito en nuestro artículo sobre apropiación indebida en Chile.</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">Comprender estas diferencias es importante porque una calificación jurídica incorrecta puede afectar el desarrollo completo del procedimiento penal.</p>
                    </div>

                    {/* ACUSADO INJUSTAMENTE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué hacer si eres acusado injustamente de robo?</h2>
                        <p className="text-gray-600 mb-4">Una denuncia no implica automáticamente una condena. En numerosas investigaciones la Fiscalía concluye que no existen antecedentes suficientes para acreditar la participación del imputado.</p>
                        <div className="space-y-3">
                            {["Mantener la calma", "No intentar contactar a la víctima para modificar su declaración", "Conservar toda la evidencia que pueda respaldar tu versión", "Identificar posibles testigos", "Buscar asesoría jurídica antes de declarar"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Una revisión temprana de la carpeta investigativa permite detectar inconsistencias, solicitar diligencias adicionales y preparar adecuadamente la estrategia de defensa.</p>
                    </div>

                    {/* CUANDO CONSULTAR ABOGADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿En qué situaciones conviene consultar cuanto antes a un abogado penal?</h2>
                        <p className="text-gray-600 mb-4">Tanto las víctimas como quienes son investigados pueden beneficiarse de recibir asesoría desde las primeras etapas del procedimiento.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Analizar la calificación jurídica del delito", "Revisar la evidencia reunida por la Fiscalía", "Representar a la víctima durante la investigación", "Preparar una estrategia de defensa", "Solicitar diligencias relevantes", "Asistir en audiencias ante el tribunal", "Explicar las distintas alternativas procesales disponibles"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-gray-500">•</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">En materia penal, actuar oportunamente suele ser determinante para proteger los derechos de todas las personas involucradas.</p>
                    </div>

                    {/* CTA PRINCIPAL */}
                    <div className="mb-12">
                        <div className="bg-green-900 rounded-2xl p-8 text-center">
                            <h3 className="text-2xl font-bold font-serif text-green-600 mb-3">¿Ya existe una investigación o denuncia en tu contra?</h3>
                            <p className="text-white mb-6">Si la Fiscalía ya formalizó la investigación o te citaron a declarar por un delito de robo, el momento más importante para contar con defensa penal es antes de presentarte a la audiencia — no después de haber declarado.</p>
                            <Link
                                to="/abogados-penales"
                                className="inline-block bg-white text-green-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                Ver abogados penalistas disponibles
                            </Link>
                        </div>
                    </div>

                    {/* CONCLUSION */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            El delito de robo en Chile constituye una de las infracciones patrimoniales más graves debido a que no solo afecta el patrimonio de la víctima, sino también su seguridad e integridad. Por ello, comprender las diferencias entre las distintas modalidades de robo, conocer las penas aplicables y actuar rápidamente frente a una denuncia resulta fundamental tanto para víctimas como para personas investigadas.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Además, distinguir correctamente el robo de otros delitos patrimoniales, como el hurto, la estafa o la apropiación indebida, permite entender mejor cómo se desarrollará la investigación y cuáles pueden ser sus consecuencias legales.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Esta guía describe las reglas generales del delito de robo en Chile. La pregunta que queda abierta es cómo se aplican esas reglas a los hechos específicos de cada investigación. Esa respuesta depende de los antecedentes concretos que la Fiscalía reúna durante el procedimiento. Si quieres revisar tu situación particular, puedes consultar con un{" "}
                            <Link to="/abogados-penales" className="text-green-700 underline hover:text-green-500">
                                abogado penalista en Chile
                            </Link>.
                        </p>
                    </div>

                    <CategoryCTA category="penal" />

                    {/* FAQS */}
                    <div className="mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre el robo en Chile</h2>
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
                        title="Robo en Chile 2026"
                        url="https://legalup.cl/blog/robo-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="robo-chile-2026" />

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