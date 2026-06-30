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

const BlogArticle = () => {
    const faqs = [
        {
            question: "¿Cuál es la diferencia entre hurto y robo?",
            answer: "La principal diferencia es que el robo implica violencia, intimidación o fuerza para apropiarse del bien, mientras que el hurto ocurre sin utilizar esos medios.",
        },
        {
            question: "¿Siempre hay cárcel por un delito de hurto?",
            answer: "No. La pena dependerá de diversos factores, especialmente del valor de las especies sustraídas y de las circunstancias particulares del caso.",
        },
        {
            question: "¿Dónde puedo denunciar un hurto?",
            answer: "La denuncia puede presentarse ante Carabineros, la Policía de Investigaciones o directamente en la Fiscalía.",
        },
        {
            question: "¿Qué pruebas ayudan a demostrar un hurto?",
            answer: "Las más frecuentes son grabaciones de cámaras de seguridad, declaraciones de testigos, boletas, facturas, fotografías y números de serie de los objetos sustraídos.",
        },
        {
            question: "¿Qué hago si me acusaron injustamente de hurto?",
            answer: "Lo recomendable es buscar asesoría jurídica lo antes posible, evitar realizar declaraciones sin orientación profesional y conservar toda la evidencia que pueda respaldar tu versión de los hechos.",
        },
        {
            question: "¿Se puede recuperar el objeto hurtado?",
            answer: "Sí. Uno de los objetivos principales de la investigación es recuperar las especies sustraídas y devolverlas a su propietario, siempre que existan las autorizaciones judiciales correspondientes.",
        },
        {
            question: "¿Qué ocurre si el hurto fue cometido en un supermercado?",
            answer: "Generalmente comienza con la detección del personal de seguridad y puede incluir registro de cámaras, declaraciones de guardias e inventario de mercadería. La Fiscalía debe acreditar todos los elementos del delito.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Hurto en Chile 2026: penas, denuncia y diferencias con el robo"
                description="Aprende qué es el hurto en Chile, cuáles son las penas, cómo denunciar, diferencias con el robo y qué hacer si eres víctima o imputado."
                image="/assets/hurto-chile-2026.png"
                url="https://legalup.cl/blog/hurto-chile-2026"
                datePublished="2026-06-30"
                dateModified="2026-06-30"
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
                        Hurto en Chile 2026: penas, denuncia y diferencias con el robo
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "El hurto consiste en apropiarse de un bien ajeno sin utilizar violencia, intimidación o fuerza.",
                                "La pena depende principalmente del valor económico de la especie sustraída.",
                                "No todos los hurtos implican cárcel efectiva; existen sanciones que varían según el monto y las circunstancias del caso.",
                                "Tanto la víctima como la persona investigada tienen derechos durante el procedimiento penal.",
                                "Contar con asesoría de un abogado penalista desde el inicio puede influir significativamente en el resultado del proceso.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        El delito de hurto en Chile es uno de los ilícitos patrimoniales más frecuentes dentro del sistema penal. Cada año miles de denuncias son presentadas por la sustracción de celulares, computadores, bicicletas, herramientas, mercadería en tiendas y otros bienes muebles.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>30 de Junio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>Tiempo de lectura: 11 min</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Hurto en Chile 2026"
                        url="https://legalup.cl/blog/hurto-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            Muchas personas confunden el hurto con el robo, creyendo que ambos delitos significan exactamente lo mismo. Sin embargo, el Código Penal chileno establece diferencias importantes entre ambos, especialmente respecto al uso de violencia, intimidación o fuerza para apropiarse de un bien.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía actualizada para 2026 explicamos qué es el delito de hurto, cuáles son las penas contempladas por la legislación chilena, cómo denunciar un hurto, qué pruebas suelen ser relevantes y cuáles son las principales diferencias con el delito de robo.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando un conflicto patrimonial, revisa también nuestras guías sobre{" "}
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
                        <h2 className="text-2xl font-bold mb-4">¿Qué es el delito de hurto en Chile?</h2>
                        <p className="text-gray-600 mb-4">
                            El hurto consiste en apropiarse de una cosa mueble ajena, sin autorización de su dueño y con ánimo de obtener un beneficio, sin emplear violencia, intimidación ni fuerza.
                        </p>
                        <p className="text-gray-600 mb-4">
                            En otras palabras, la persona toma un bien que pertenece a otro con la intención de hacerlo suyo, pero lo hace aprovechando un descuido, una distracción o una oportunidad, sin agredir físicamente a la víctima.
                        </p>
                        <div className="bg-gray-50 p-5 rounded-xl">
                            <p className="font-bold mb-2">Ejemplos frecuentes:</p>
                            <ul className="space-y-1 text-gray-700">
                                <li>• Sustraer un teléfono celular olvidado sobre una mesa</li>
                                <li>• Llevarse una bicicleta estacionada sin autorización</li>
                                <li>• Tomar dinero desde una cartera descuidada</li>
                                <li>• Sacar productos desde un supermercado sin pagarlos</li>
                                <li>• Apropiarse de herramientas dejadas temporalmente en una obra</li>
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">En todos estos casos puede configurarse el delito de hurto, siempre que concurran los requisitos establecidos por la ley.</p>
                    </div>

                    {/* ELEMENTOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Elementos que debe acreditar la Fiscalía</h2>
                        <p className="text-gray-600 mb-4">Para obtener una condena por hurto, el Ministerio Público debe demostrar diversos elementos.</p>
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Existencia de un bien mueble</h3>
                                <p className="text-gray-600">El objeto sustraído debe ser un bien susceptible de traslado: dinero, celulares, vehículos menores, computadores, herramientas, joyas, mercadería. Los inmuebles no pueden ser objeto del delito de hurto.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Que el bien pertenezca a otra persona</h3>
                                <p className="text-gray-600">Debe existir un propietario o poseedor legítimo distinto del imputado. Si existe controversia civil sobre la propiedad, el caso puede presentar complejidades adicionales.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Apropiación sin consentimiento</h3>
                                <p className="text-gray-600">La víctima nunca autorizó la entrega del objeto. Muchas investigaciones buscan establecer si existió consentimiento o si la entrega fue obtenida mediante engaño.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Ánimo de apropiación</h3>
                                <p className="text-gray-600">No basta con tomar temporalmente un objeto. Debe existir la intención de hacerlo propio o de privar permanentemente a su dueño de ese bien.</p>
                            </div>
                        </div>
                    </div>

                    {/* DIFERENCIA HURTO Y ROBO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Diferencia entre hurto y robo</h2>
                        <p className="text-gray-600 mb-4">Esta es una de las consultas más frecuentes. Aunque ambos delitos protegen el patrimonio de las personas, la diferencia principal radica en la forma en que se obtiene el bien.</p>
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
                                        <td className="border border-gray-300 p-3">No existe violencia</td>
                                        <td className="border border-gray-300 p-3">Existe violencia o intimidación</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">No hay fuerza sobre las cosas</td>
                                        <td className="border border-gray-300 p-3">Puede existir fuerza para ingresar o sustraer</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Generalmente ocurre aprovechando un descuido</td>
                                        <td className="border border-gray-300 p-3">Existe mayor afectación a la víctima</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 p-3">Las penas suelen ser menores</td>
                                        <td className="border border-gray-300 p-3">Las penas suelen ser considerablemente mayores</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-blue-50 p-5 rounded-xl mt-4">
                            <p className="text-blue-800">
                                <span className="font-bold">Ejemplo:</span> Una persona deja su mochila en una cafetería y otra se la lleva cuando nadie observa. Eso normalmente constituye hurto. Distinto sería si alguien amenaza con un arma para obligar a entregar esa mochila. En ese caso hablamos de robo con intimidación.
                            </p>
                        </div>
                        <p className="text-gray-600 mt-4">Comprender correctamente esta diferencia resulta fundamental porque determina tanto las penas como el procedimiento aplicable.</p>
                    </div>

                    {/* PENAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuáles son las penas por hurto en Chile?</h2>
                        <p className="text-gray-600 mb-4">Las sanciones dependen principalmente del valor económico de las especies sustraídas. Mientras mayor sea el perjuicio patrimonial, más severas pueden ser las consecuencias penales.</p>
                        <div className="bg-gray-50 p-5 rounded-xl mb-4">
                            <p className="font-bold mb-2">Circunstancias que el tribunal puede considerar:</p>
                            <ul className="space-y-1 text-gray-700">
                                <li>• Existencia de condenas anteriores</li>
                                <li>• Reincidencia</li>
                                <li>• Participación de varias personas</li>
                                <li>• Forma de ejecución</li>
                                <li>• Colaboración durante la investigación</li>
                            </ul>
                        </div>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">No todos los delitos de hurto terminan con penas privativas de libertad efectivas. En determinados casos pueden existir medidas alternativas contempladas por la legislación chilena, especialmente cuando se trata de personas sin antecedentes penales y el hecho reviste menor gravedad. Cada caso debe analizarse individualmente.</p>
                        </div>
                    </div>

                    {/* HURTO EN SUPERMERCADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si el hurto fue cometido en un supermercado?</h2>
                        <p className="text-gray-600 mb-4">Los llamados "hurtos de supermercado" representan una parte importante de las investigaciones penales en Chile. Generalmente comienzan cuando el personal de seguridad detecta a una persona intentando salir del establecimiento sin pagar determinados productos.</p>
                        <div className="grid sm:grid-cols-2 gap-3 mb-4">
                            {["Registro de cámaras", "Declaraciones de guardias", "Inventario de mercadería", "Boletas", "Evidencia física recuperada"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <div className="bg-blue-50 p-5 rounded-xl">
                            <p className="text-blue-800">Es importante entender que abandonar la caja sin pagar no implica automáticamente una condena. La Fiscalía igualmente debe acreditar todos los elementos del delito y respetar los derechos del imputado durante el procedimiento.</p>
                        </div>
                    </div>

                    {/* COMO DENUNCIAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo denunciar un hurto?</h2>
                        <p className="text-gray-600 mb-4">Si has sido víctima de un hurto, es recomendable denunciar los hechos lo antes posible.</p>
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
                            <p className="font-bold text-amber-800">Al momento de denunciar conviene aportar:</p>
                            <ul className="mt-2 space-y-1 text-amber-700">
                                <li>• Lugar exacto del hecho</li>
                                <li>• Fecha y hora aproximada</li>
                                <li>• Descripción del objeto</li>
                                <li>• Valor estimado</li>
                                <li>• Fotografías</li>
                                <li>• Número de serie si existe</li>
                                <li>• Testigos</li>
                                <li>• Grabaciones de cámaras</li>
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">Toda esta información puede facilitar considerablemente la investigación.</p>
                    </div>

                    {/* PRUEBAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pruebas son importantes en una investigación por hurto?</h2>
                        <p className="text-gray-600 mb-4">Las investigaciones por hurto suelen apoyarse en distintos tipos de evidencia.</p>
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Cámaras de seguridad</h3>
                                <p className="text-gray-600">Actualmente constituyen una de las pruebas más relevantes. Pueden provenir de comercios, condominios, municipios, estacionamientos o transporte público. Las grabaciones permiten reconstruir la dinámica de los hechos e identificar a los participantes.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Declaraciones de testigos</h3>
                                <p className="text-gray-600">Las personas presentes al momento del hurto pueden aportar antecedentes importantes sobre la identidad del autor, forma de ocurrencia, dirección de huida y descripción de los objetos sustraídos.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Documentación de propiedad</h3>
                                <p className="text-gray-600">Facturas, boletas, garantías, fotografías, número IMEI en celulares y número de serie pueden ayudar a acreditar que el bien efectivamente pertenecía a la víctima.</p>
                            </div>
                        </div>
                    </div>

                    <InArticleCTA
                        message="¿Necesitas ayuda por un delito de hurto? Un abogado penalista puede orientarte y proteger tus derechos."
                        buttonText="Habla con un abogado ahora"
                        category="Derecho Penal"
                    />

                    {/* FLAGRANCIA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si la persona es sorprendida en flagrancia?</h2>
                        <p className="text-gray-600 mb-4">En algunos casos, el presunto autor del hurto es sorprendido mientras comete el delito o inmediatamente después de ocurrido. En estas situaciones puede producirse una detención en flagrancia, permitiendo la intervención inmediata de Carabineros o de la PDI.</p>
                        <div className="bg-gray-50 p-5 rounded-xl mb-4">
                            <p className="font-bold mb-2">La flagrancia puede configurarse cuando la persona:</p>
                            <ul className="space-y-1 text-gray-700">
                                <li>• Es sorprendida apropiándose del bien</li>
                                <li>• Es perseguida inmediatamente después del hecho</li>
                                <li>• Es encontrada con las especies recientemente sustraídas</li>
                                <li>• Es identificada por la víctima o por testigos pocos minutos después del delito</li>
                            </ul>
                        </div>
                        <p className="text-gray-600">
                            Cuando existe una detención en flagrancia, el detenido normalmente pasa a control de detención dentro de las siguientes horas, instancia en la que un juez revisa si la privación de libertad fue legal y si corresponde formalizar la investigación.
                        </p>
                    </div>

                    {/* DERECHOS DEL INVESTIGADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Derechos de quien es investigado por hurto</h2>
                        <p className="text-gray-600 mb-4">Ser investigado por un delito de hurto no significa ser culpable. Toda persona mantiene la presunción de inocencia hasta que un tribunal dicte una sentencia condenatoria.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Derecho a guardar silencio", "Derecho a conocer los hechos que se investigan", "Derecho a contar con un abogado defensor", "Derecho a revisar los antecedentes de la investigación", "Derecho a presentar pruebas", "Derecho a solicitar diligencias", "Derecho a un juicio imparcial"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <div className="bg-red-50 p-5 rounded-xl mt-4">
                            <p className="text-red-800">Uno de los errores más frecuentes consiste en prestar declaración inmediatamente ante la policía sin haber recibido asesoría jurídica. Una declaración mal preparada puede generar contradicciones difíciles de corregir posteriormente. Siempre es recomendable consultar previamente con un abogado penalista.</p>
                        </div>
                    </div>

                    {/* RECUPERAR OBJETO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Se puede recuperar el objeto robado o hurtado?</h2>
                        <p className="text-gray-600 mb-4">Sí. Uno de los objetivos principales de la investigación es precisamente recuperar las especies sustraídas y devolverlas a su propietario.</p>
                        <p className="text-gray-600 mb-4">Cuando Carabineros, la PDI o la Fiscalía logran incautar los bienes durante la investigación, éstos pueden ser restituidos una vez que existan las autorizaciones judiciales correspondientes.</p>
                        <div className="bg-green-50 p-5 rounded-xl">
                            <p className="font-bold text-green-800">Mientras más rápida sea la denuncia, mayores posibilidades existen de recuperar los objetos, especialmente cuando se trata de:</p>
                            <div className="grid sm:grid-cols-2 gap-2 mt-2">
                                {["Celulares", "Computadores", "Bicicletas", "Herramientas", "Vehículos menores", "Equipos electrónicos"].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-green-600 font-bold">✓</span>
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">Por ello es recomendable conservar números de serie, facturas, fotografías y cualquier antecedente que permita acreditar la propiedad.</p>
                    </div>

                    {/* SALIDAS ALTERNATIVAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Puede terminar el caso sin llegar a juicio?</h2>
                        <p className="text-gray-600 mb-4">Sí. No todas las investigaciones por hurto terminan mediante un juicio oral. Dependiendo de las circunstancias del caso, la gravedad del hecho, los antecedentes del imputado y las decisiones del Ministerio Público, pueden existir distintas alternativas contempladas por la legislación chilena.</p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">Cada situación debe ser analizada individualmente. Por ello resulta importante recibir asesoría jurídica antes de aceptar cualquier salida propuesta durante la investigación.</p>
                        </div>
                    </div>

                    {/* DIFERENCIAS HURTO, APROPIACION INDEBIDA Y ESTAFA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Diferencias entre hurto, apropiación indebida y estafa</h2>
                        <p className="text-gray-600 mb-4">Otro error frecuente consiste en confundir estos tres delitos. Aunque todos pueden generar un perjuicio económico, cada uno protege situaciones distintas.</p>
                        <div className="space-y-3">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Hurto</h3>
                                <p className="text-gray-600">La persona toma directamente un bien ajeno sin autorización y sin utilizar violencia. Ejemplo: alguien aprovecha un descuido y se lleva un computador desde una oficina.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Apropiación indebida</h3>
                                <p className="text-gray-600">El bien fue entregado legítimamente, pero posteriormente quien lo recibió decide no devolverlo. Ejemplo: una persona recibe un vehículo en préstamo y posteriormente se niega a devolverlo.</p>
                                <p className="text-gray-500 text-sm mt-1">Si quieres conocer este delito en detalle, revisa nuestra guía sobre apropiación indebida en Chile.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Estafa</h3>
                                <p className="text-gray-600">El autor obtiene el dinero o el bien mediante engaños. La víctima entrega voluntariamente el patrimonio porque fue inducida a error. Ejemplo: una persona vende un producto inexistente por internet y desaparece después de recibir el dinero.</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">Comprender estas diferencias resulta importante porque la Fiscalía calificará jurídicamente los hechos según la forma en que ocurrieron, lo que puede modificar completamente el procedimiento y las penas aplicables.</p>
                    </div>

                    {/* SI TE ACUSAN INJUSTAMENTE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué hacer si fuiste acusado injustamente de hurto?</h2>
                        <p className="text-gray-600 mb-4">No todas las denuncias terminan con una condena. Existen investigaciones donde finalmente se determina que no hubo participación del imputado o que las pruebas resultan insuficientes.</p>
                        <div className="space-y-3">
                            {["No destruir evidencia", "No intentar contactar a la víctima para presionarla", "Conservar documentos, boletas o registros que puedan respaldar tu versión", "Identificar posibles testigos", "Buscar asesoría jurídica lo antes posible"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Una defensa preparada desde el inicio permite revisar la carpeta investigativa, detectar inconsistencias y proponer diligencias que puedan favorecer tu posición.</p>
                    </div>

                    {/* CUANDO CONSULTAR ABOGADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo conviene consultar con un abogado penalista?</h2>
                        <p className="text-gray-600 mb-4">Tanto las víctimas como las personas investigadas pueden beneficiarse de recibir asesoría temprana.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Evaluar si los hechos efectivamente constituyen un delito de hurto", "Revisar las pruebas existentes", "Solicitar diligencias adicionales", "Preparar declaraciones", "Representar a la víctima durante la investigación", "Diseñar una estrategia de defensa cuando existe una imputación"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm">{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Cada procedimiento penal presenta particularidades, por lo que una evaluación individual suele ser la mejor forma de proteger los derechos de quien interviene en el proceso.</p>
                    </div>

                    {/* CTA PRINCIPAL */}
                    <div className="mb-12">
                        <div className="bg-green-900 rounded-2xl p-8 text-center">
                            <h3 className="text-2xl font-bold font-serif text-green-600 mb-3">¿Necesitas ayuda por un delito de hurto?</h3>
                            <p className="text-white mb-6">Si necesitas orientación porque sufriste un hurto o enfrentas una investigación penal, puedes contactar a un abogado penalista para analizar tu situación y recibir asesoría personalizada.</p>
                            <Link
                                to="/abogados-penales"
                                className="inline-block bg-white text-green-800 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                Ver abogados penalistas disponibles
                            </Link>
                        </div>
                    </div>

                    {/* CONCLUSION */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            El delito de hurto en Chile continúa siendo una de las infracciones patrimoniales más investigadas por la Fiscalía. Aunque muchas personas lo consideran un hecho menor, sus consecuencias pueden ser importantes tanto para la víctima como para quien resulta imputado.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Comprender la diferencia entre hurto y robo, conocer las penas aplicables, saber cómo denunciar correctamente y entender cuáles son los derechos durante la investigación permite enfrentar el procedimiento con mayor seguridad y tomar decisiones informadas.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Si además existen dudas respecto de la calificación jurídica de los hechos, es importante recordar que algunos casos pueden corresponder realmente a otros delitos patrimoniales, como la estafa o la apropiación indebida, los cuales poseen requisitos y consecuencias distintas.
                        </p>
                        <p className="text-gray-600 leading-relaxed font-semibold">
                            Tanto si fuiste víctima de un hurto como si estás siendo investigado por este delito,
                            conocer tus derechos y actuar oportunamente puede marcar una diferencia importante en el
                            desarrollo del procedimiento. Si necesitas orientación sobre una denuncia, una defensa
                            penal o quieres evaluar las alternativas disponibles en tu caso, puedes consultar con un{" "}
                            <Link to="/abogados-penales" className="text-green-700 underline hover:text-green-500">
                                abogado penalista en Chile
                            </Link>{" "}
                            para recibir asesoría personalizada desde las primeras etapas de la investigación.
                        </p>
                    </div>

                    <CategoryCTA category="penal" />

                    {/* FAQS */}
                    <div className="mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre el delito de hurto en Chile</h2>
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
                        title="Hurto en Chile 2026"
                        url="https://legalup.cl/blog/hurto-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="hurto-chile-2026" />

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