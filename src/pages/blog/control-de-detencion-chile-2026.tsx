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
            question: "¿Cuánto tiempo puede permanecer detenida una persona antes del control de detención?",
            answer: "Por regla general, la persona detenida debe ser puesta a disposición del tribunal dentro del plazo legal, normalmente dentro de las primeras 24 horas desde la detención.",
        },
        {
            question: "¿Es obligatorio declarar durante la detención?",
            answer: "No. Toda persona tiene derecho a guardar silencio y a consultar previamente con un abogado antes de prestar declaración.",
        },
        {
            question: "¿El control de detención significa que habrá una condena?",
            answer: "No. La audiencia solo revisa la legalidad de la detención y permite que la Fiscalía comunique formalmente la investigación cuando corresponda. La responsabilidad penal solo puede determinarse mediante una sentencia.",
        },
        {
            question: "¿Puede una persona quedar en libertad después del control de detención?",
            answer: "Sí. Dependiendo de los antecedentes del caso, el juez puede decretar libertad inmediata, imponer medidas cautelares o, en casos excepcionales, ordenar prisión preventiva.",
        },
        {
            question: "¿Qué ocurre si el juez declara ilegal la detención?",
            answer: "El tribunal puede reconocer que la detención no cumplió los requisitos legales, lo que puede producir efectos relevantes en el proceso penal. Sin embargo, ello no implica automáticamente que la investigación termine ni que exista una absolución.",
        },
        {
            question: "¿Qué puedo hacer si un familiar fue detenido?",
            answer: "Confirmar en qué unidad policial se encuentra, reunir antecedentes personales, conocer el horario de la audiencia, contactar a un abogado penalista y evitar difundir versiones no confirmadas en redes sociales.",
        },
        {
            question: "¿Qué pasa si no asisto a una audiencia posterior?",
            answer: "La inasistencia puede traer consecuencias procesales importantes. Es fundamental comparecer cuando el tribunal fije nuevas audiencias.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Control de detención en Chile 2026: qué es, cómo funciona y qué hacer si fuiste detenido"
                description="Aprende qué es el control de detención en Chile, cómo funciona la audiencia, cuáles son tus derechos y qué hacer si tú o un familiar fueron detenidos."
                image="/assets/control-de-detencion-chile-2026.png"
                url="https://legalup.cl/blog/control-de-detencion-chile-2026"
                datePublished="2026-07-02"
                dateModified="2026-07-02"
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
                        Control de detención en Chile 2026: qué es, cómo funciona y qué hacer si fuiste detenido
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "Toda persona detenida debe ser presentada ante un juez para controlar la legalidad de la detención.",
                                "El control de detención normalmente debe realizarse dentro de las 24 horas siguientes a la detención.",
                                "Durante la audiencia la Fiscalía puede formalizar la investigación y solicitar medidas cautelares.",
                                "Ser detenido no significa ser culpable; toda persona mantiene la presunción de inocencia.",
                                "Contar con un abogado penalista desde las primeras horas puede ser clave para proteger tus derechos.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Ser detenido por Carabineros o por la Policía de Investigaciones suele ser una experiencia inesperada y estresante. En muchos casos ocurre durante manifestaciones, controles policiales, denuncias por lesiones, robos, amenazas, violencia intrafamiliar o desórdenes públicos, generando incertidumbre tanto para la persona detenida como para su familia.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>2 de Julio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="control-de-detencion-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Control de detención en Chile 2026"
                        url="https://legalup.cl/blog/control-de-detencion-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            En Chile ninguna persona puede permanecer detenida indefinidamente sin control judicial. La ley exige que la detención sea revisada por un juez mediante una audiencia denominada control de detención, instancia donde se verifica si la privación de libertad fue legal y se decide cómo continuará la investigación.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía actualizada para 2026 explicamos cómo funciona el control de detención, cuáles son los derechos del imputado, qué ocurre durante la audiencia y qué hacer si un familiar fue detenido.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando una situación penal, revisa también nuestras guías sobre{" "}
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
                            </Link>{" "}
                            y{" "}
                            <Link
                                to="/blog/lesiones-leves-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                lesiones leves
                            </Link>.
                        </p>
                    </div>

                    {/* QUE ES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es el control de detención?</h2>
                        <p className="text-gray-600 mb-4">
                            El control de detención es la audiencia mediante la cual un juez revisa si la detención realizada por Carabineros, la PDI u otra autoridad se ajustó a la ley.
                        </p>
                        <p className="text-gray-600 mb-4">
                            No se trata de un juicio ni implica determinar la culpabilidad del detenido. Su finalidad principal consiste en responder preguntas como: ¿La detención fue legal? ¿Existían motivos suficientes para detener? ¿Se respetaron los derechos del detenido? ¿Debe mantenerse privado de libertad? ¿La Fiscalía formalizará la investigación?
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">Es una garantía fundamental del debido proceso reconocida por la legislación chilena.</p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                La definición anterior describe la función del control de detención en abstracto. En la práctica, el desarrollo de la audiencia y lo que ocurra después depende de la calidad de los antecedentes que la Fiscalía presente y de la capacidad de la defensa para cuestionarlos. Dos detenciones por hechos similares pueden tener resultados muy distintos según la preparación de cada interviniente.
                            </p>
                        </div>
                    </div>

                    {/* CUANDO SE REALIZA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo se realiza la audiencia de control de detención?</h2>
                        <p className="text-gray-600 mb-4">
                            Generalmente la audiencia debe celebrarse dentro de las primeras 24 horas desde que la persona fue detenida.
                        </p>
                        <p className="text-gray-600">
                            Durante ese período el Ministerio Público analiza los antecedentes disponibles para decidir si solicitará la formalización de la investigación o si corresponde dejar en libertad al detenido. En la práctica, muchas audiencias se realizan al día siguiente de la detención.
                        </p>
                    </div>

                    {/* QUE OCURRE DURANTE LA AUDIENCIA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre durante la audiencia?</h2>
                        <p className="text-gray-600 mb-4">El procedimiento suele seguir las siguientes etapas:</p>
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">1. Revisión de la legalidad de la detención</h3>
                                <p className="text-gray-600">El juez escucha a la Fiscalía y a la defensa. Posteriormente determina si la detención cumplió los requisitos legales. Si concluye que fue ilegal, ello puede producir importantes consecuencias procesales.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">2. Formalización de la investigación</h3>
                                <p className="text-gray-600">Si existen antecedentes suficientes, la Fiscalía comunica oficialmente cuáles son los hechos investigados y qué delito atribuye al imputado. La formalización no constituye una condena, sino que informa el inicio formal de la investigación penal.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">3. Solicitud de medidas cautelares</h3>
                                <p className="text-gray-600">La Fiscalía puede solicitar medidas cautelares para asegurar el desarrollo del procedimiento: firma mensual, arraigo nacional, prohibición de acercarse a determinadas personas, arresto domiciliario o prisión preventiva. La defensa puede oponerse o solicitar medidas menos gravosas.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">4. Plazo de investigación</h3>
                                <p className="text-gray-600">El tribunal fija un plazo para que la Fiscalía continúe reuniendo antecedentes. Durante ese período podrán realizarse diversas diligencias investigativas antes de decidir si corresponde acusar, solicitar una salida alternativa o poner término al procedimiento.</p>
                            </div>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Las etapas anteriores describen el procedimiento estándar. En un caso concreto, cada una de esas fases puede desarrollarse de manera distinta según los antecedentes disponibles. La defensa puede impugnar la legalidad de la detención, la Fiscalía puede formalizar por un delito distinto al inicial, o el tribunal puede aplicar medidas cautelares inesperadas. Esa imprevisibilidad es propia de cada caso.
                            </p>
                        </div>
                    </div>

                    {/* DERECHOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuáles son los derechos de una persona detenida?</h2>
                        <p className="text-gray-600 mb-4">Toda persona detenida mantiene derechos fundamentales reconocidos por la Constitución y las leyes chilenas.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Derecho a guardar silencio", "Derecho a conocer el motivo de la detención", "Derecho a comunicarse con un abogado", "Derecho a ser presentada ante un juez", "Derecho a un trato digno", "Derecho a una defensa técnica"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Estos derechos existen independientemente del delito investigado.</p>
                    </div>

                    {/* ES OBLIGATORIO DECLARAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Es obligatorio declarar?</h2>
                        <p className="text-gray-600 mb-4">
                            No. Una persona detenida no está obligada a declarar inmediatamente. Antes de responder preguntas resulta recomendable conocer exactamente qué hechos se investigan y recibir orientación jurídica.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">En muchos casos una declaración precipitada puede generar contradicciones que luego sean utilizadas durante el proceso penal.</p>
                        </div>
                    </div>

                    <InArticleCTA
                        message="Si detuvieron a un familiar o a ti, las primeras horas antes de la audiencia son el único momento para preparar una defensa."
                        buttonText="Habla con un abogado ahora"
                        category="Derecho Penal"
                    />

                    {/* DESORDENES PUBLICOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Control de detención por desórdenes públicos</h2>
                        <p className="text-gray-600 mb-4">
                            Una de las situaciones más frecuentes ocurre durante manifestaciones o reuniones masivas. Cuando Carabineros considera que una persona participó en hechos que podrían constituir desórdenes públicos, puede practicar una detención para poner los antecedentes a disposición del Ministerio Público.
                        </p>
                        <p className="text-gray-600">Posteriormente será el juez quien determine si la detención fue legal y cómo continuará la investigación. Cada caso depende de los antecedentes específicos reunidos por la Fiscalía y de la participación que pueda atribuirse al imputado.</p>
                    </div>

                    {/* VIOLENCIA CONTRA CARABINEROS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si existe una denuncia por violencia contra Carabineros?</h2>
                        <p className="text-gray-600 mb-4">Cuando durante una detención se denuncia una agresión contra funcionarios policiales, la investigación suele adquirir mayor complejidad.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Declaraciones de funcionarios", "Cámaras corporales", "Registros municipales", "Videos de particulares", "Informes médicos", "Testigos"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-gray-500">•</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Corresponderá posteriormente al tribunal valorar toda la evidencia disponible para determinar la responsabilidad penal que pudiera existir.</p>
                    </div>

                    {/* DETENCION ILEGAL */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si el juez declara ilegal la detención?</h2>
                        <p className="text-gray-600 mb-4">Durante la audiencia, la defensa puede solicitar que el tribunal declare que la detención fue ilegal cuando no se respetaron las normas establecidas por la ley.</p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="font-bold text-red-800">Algunos ejemplos que podrían ser discutidos durante la audiencia:</p>
                            <ul className="mt-2 space-y-1 text-red-700">
                                <li>• Ausencia de flagrancia cuando la ley la exigía</li>
                                <li>• Falta de una orden judicial válida</li>
                                <li>• Vulneración de derechos fundamentales durante la detención</li>
                                <li>• Uso de procedimientos que no se ajustaron a la legislación vigente</li>
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">Si el juez concluye que la detención fue ilegal, ello puede producir importantes efectos dentro de la investigación. Sin embargo, cada caso debe analizarse individualmente y la declaración de ilegalidad no implica automáticamente que el procedimiento penal termine ni significa necesariamente que la persona quede absuelta.</p>
                    </div>

                    {/* QUE PASA DESPUES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa después del control de detención?</h2>
                        <p className="text-gray-600 mb-4">Una vez finalizada la audiencia, pueden ocurrir distintos escenarios dependiendo de los antecedentes reunidos por la Fiscalía.</p>
                        <div className="space-y-3">
                            <div className="bg-green-50 p-4 rounded-xl">
                                <h3 className="font-bold text-green-800">Libertad inmediata</h3>
                                <p className="text-green-700">Si no existen antecedentes suficientes para justificar medidas cautelares, el imputado puede quedar en libertad mientras continúa la investigación. Esto ocurre con relativa frecuencia en delitos de menor gravedad o cuando la Fiscalía aún necesita reunir más pruebas.</p>
                            </div>
                            <div className="bg-amber-50 p-4 rounded-xl">
                                <h3 className="font-bold text-amber-800">Libertad con medidas cautelares</h3>
                                <p className="text-amber-700">El juez puede decretar medidas destinadas a asegurar el correcto desarrollo del proceso: firma periódica, arraigo nacional, prohibición de acercarse a determinadas personas o arresto domiciliario. Estas medidas no constituyen una condena.</p>
                            </div>
                            <div className="bg-red-50 p-4 rounded-xl">
                                <h3 className="font-bold text-red-800">Prisión preventiva</h3>
                                <p className="text-red-700">Constituye la medida cautelar más gravosa del sistema penal chileno. No se aplica automáticamente. La Fiscalía debe acreditar ante el tribunal que concurren los requisitos establecidos por la ley y el juez debe resolver si corresponde aplicarla considerando los antecedentes del caso.</p>
                            </div>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Los escenarios descritos son los posibles, pero cuál de ellos ocurre en un caso concreto depende de los antecedentes específicos que la Fiscalía presente en la audiencia y de la capacidad de la defensa para impugnarlos. Dos personas detenidas por los mismos hechos pueden obtener medidas cautelares distintas según cómo se desarrolle la audiencia.
                            </p>
                        </div>
                    </div>

                    {/* FAMILIARES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pueden hacer los familiares de una persona detenida?</h2>
                        <p className="text-gray-600 mb-4">Cuando un familiar es detenido, es habitual que exista incertidumbre sobre su situación jurídica.</p>
                        <div className="space-y-2">
                            {["Confirmar en qué unidad policial se encuentra", "Reunir antecedentes personales que puedan ser necesarios", "Conocer el horario aproximado de la audiencia", "Contactar a un abogado penalista", "Evitar difundir versiones no confirmadas en redes sociales"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">La información obtenida durante las primeras horas suele ser relevante para preparar la defensa.</p>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes después de una detención</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Declarar sin asesoría jurídica", desc: "Muchas personas creen que explicar inmediatamente su versión resolverá el problema. Sin embargo, cualquier declaración puede incorporarse posteriormente a la investigación." },
                                    { title: "Eliminar evidencia", desc: "Intentar borrar conversaciones, destruir objetos o modificar registros puede generar consecuencias adicionales y afectar la estrategia de defensa." },
                                    { title: "Contactar a testigos para influir en su declaración", desc: "Cada testigo debe prestar declaración libremente. Intentar modificar versiones puede generar nuevos problemas jurídicos." },
                                    { title: "No asistir a las audiencias posteriores", desc: "Si el tribunal fija nuevas audiencias, es fundamental comparecer cuando corresponda. La inasistencia puede traer consecuencias procesales importantes." },
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

                    {/* DELITOS COMUNES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Delitos que habitualmente comienzan con un control de detención</h2>
                        <p className="text-gray-600 mb-4">Esta audiencia puede presentarse en investigaciones por numerosos delitos, entre ellos:</p>
                        <div className="grid sm:grid-cols-2 gap-2">
                            {["Robos", "Hurtos", "Lesiones", "Violencia intrafamiliar", "Amenazas", "Daños", "Porte de armas", "Tráfico de drogas", "Conducción en estado de ebriedad", "Desórdenes públicos"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-gray-500">•</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">
                            En LegalUp puedes revisar también nuestras guías sobre{" "}
                            <Link to="/blog/robo-chile-2026" className="text-green-700 underline">Robo en Chile 2026</Link>
                            ,{" "}
                            <Link to="/blog/hurto-chile-2026" className="text-green-700 underline">Hurto en Chile 2026</Link>
                            ,{" "}
                            <Link to="/blog/lesiones-leves-chile-2026" className="text-green-700 underline">Lesiones leves en Chile 2026</Link>{" "}
                            y{" "}
                            <Link to="/blog/constancia-por-amenazas-chile-2026" className="text-green-700 underline">Constancia por amenazas en Chile 2026</Link>.
                        </p>
                    </div>

                    {/* CUANDO CONSULTAR ABOGADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿En qué situaciones conviene consultar cuanto antes a un abogado penal?</h2>
                        <p className="text-gray-600 mb-4">En la práctica, la primera audiencia suele definir gran parte del desarrollo posterior del proceso.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Revisar la legalidad de la detención", "Preparar la estrategia de defensa", "Solicitar diligencias de investigación", "Oponerse a medidas cautelares desproporcionadas", "Representar al imputado durante todas las audiencias", "Explicar las alternativas procesales disponibles"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Mientras antes exista asesoría jurídica, mayores son las posibilidades de tomar decisiones informadas desde el inicio de la investigación.</p>
                    </div>

                    {/* CTA PRINCIPAL */}
                    <div className="mb-12">
                        <div className="bg-green-900 rounded-2xl p-8 text-center">
                            <h3 className="text-2xl font-bold mb-3 text-green-600 font-serif">¿Detuvieron a un familiar o a ti?</h3>
                            <p className="text-white mb-6">Las primeras horas antes de la audiencia de control de detención son el único momento para preparar una estrategia de defensa. Después de la formalización, las decisiones del tribunal ya están tomadas sobre la base de los antecedentes presentados.</p>
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
                            El control de detención es una de las etapas más relevantes del proceso penal chileno. Esta guía describe el procedimiento general y los derechos del detenido.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            La pregunta que queda abierta es cómo se desarrolla esa audiencia en un caso concreto, qué antecedentes presenta la Fiscalía y cómo la defensa puede impugnarlos. Esa respuesta depende de los hechos específicos de cada detención. Si quieres revisar una situación particular, puedes consultar con un{" "}
                            <Link to="/abogados-penales" className="text-green-700 underline hover:text-green-500">
                                abogado penalista en Chile
                            </Link>.
                        </p>
                    </div>

                    <CategoryCTA category="penal" />

                    {/* FAQS */}
                    <div className="mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre el control de detención</h2>
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
                        title="Control de detención en Chile 2026"
                        url="https://legalup.cl/blog/control-de-detencion-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="control-de-detencion-chile-2026" />

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