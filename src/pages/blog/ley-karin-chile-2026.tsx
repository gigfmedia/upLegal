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
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

const BlogArticle = () => {
    const faqs = [
        {
            question: "¿La Ley Karin solo protege frente al acoso laboral?",
            answer: "No. También contempla medidas relacionadas con el acoso sexual y diversas situaciones de violencia que pueden producirse en el contexto laboral.",
        },
        {
            question: "¿Puedo denunciar si los hechos ocurrieron hace varios meses?",
            answer: "Dependerá de las circunstancias y de las acciones que aún puedan ejercerse. Mientras antes se recopilen los antecedentes y se obtenga asesoría, mayores serán las posibilidades de preservar la evidencia.",
        },
        {
            question: "¿Necesito un abogado para presentar una denuncia?",
            answer: "No necesariamente. Sin embargo, cuando los hechos son graves, existe riesgo de despido, represalias o un eventual juicio laboral, contar con asesoría desde el inicio puede ayudar a definir una estrategia adecuada.",
        },
        {
            question: "¿Qué ocurre si la empresa concluye que no existió acoso?",
            answer: "Esa decisión no siempre impide ejercer otras acciones legales. Dependiendo del caso, un tribunal laboral puede revisar posteriormente los antecedentes y llegar a conclusiones distintas.",
        },
        {
            question: "¿La Ley Karin protege también a trabajadores con contrato a plazo fijo?",
            answer: "Sí. La protección frente al acoso y la violencia laboral no depende únicamente del tipo de contrato.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Ley Karin en Chile 2026: qué es, cómo funciona y cuáles son tus derechos"
                description="Conoce qué es la Ley Karin en Chile, cómo funciona, qué conductas protege, cómo presentar una denuncia, cuáles son tus derechos y cuándo conviene consultar a un abogado laboral."
                image="/assets/ley-karin-chile-2026.png"
                url="https://legalup.cl/blog/ley-karin-chile-2026"
                datePublished="2026-07-13"
                dateModified="2026-07-13"
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
                        Ley Karin en Chile 2026: qué es, cómo funciona y cuáles son tus derechos
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "La Ley Karin obliga a las empresas a prevenir, investigar y sancionar situaciones de acoso laboral, acoso sexual y violencia en el trabajo.",
                                "Toda empresa debe contar con procedimientos internos para recibir denuncias.",
                                "La investigación debe respetar principios de imparcialidad, confidencialidad y protección de las personas involucradas.",
                                "La ley protege tanto a trabajadores del sector privado como, en determinados casos, del sector público conforme a su normativa.",
                                "Dependiendo del caso, pueden existir acciones adicionales como tutela laboral, autodespido o indemnizaciones.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        La Ley Karin modificó la normativa laboral chilena para fortalecer la prevención, investigación y sanción del acoso laboral, el acoso sexual y la violencia en el trabajo. Desde su entrada en vigencia, las empresas tienen nuevas obligaciones y los trabajadores cuentan con mecanismos más claros para denunciar este tipo de conductas.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>13 de Julio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="ley-karin-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Ley Karin en Chile 2026"
                        url="https://legalup.cl/blog/ley-karin-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            Sin embargo, muchas personas todavía tienen dudas sobre cómo funciona realmente la ley, qué situaciones cubre, cómo presentar una denuncia y qué ocurre después de iniciado el procedimiento.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía encontrarás todo lo que debes saber sobre la Ley Karin en Chile durante 2026, cuáles son tus derechos y en qué casos puede ser recomendable solicitar asesoría de un abogado laboral.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando una situación de acoso laboral, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/acoso-laboral-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                acoso laboral en Chile
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/tutela-laboral-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                tutela laboral
                            </Link>{" "}
                            y{" "}
                            <Link
                                to="/blog/despido-necesidades-empresa-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                despido por necesidades de la empresa
                            </Link>.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si necesitas evaluar tu situación después de una denuncia bajo la Ley Karin, puedes consultar con un{" "}
                            <Link to="/abogado-laboral" className="text-green-700 underline hover:text-green-500">
                                abogado laboral en Chile
                            </Link>{" "}
                            directamente online.
                        </p>
                    </div>

                    {/* QUE ES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es la Ley Karin?</h2>
                        <p className="text-gray-600 mb-4">
                            La Ley Karin corresponde a una modificación de la legislación laboral chilena destinada a fortalecer la protección de los trabajadores frente a conductas que afecten su dignidad dentro del lugar de trabajo.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Su objetivo principal es prevenir: el acoso laboral, el acoso sexual y la violencia ejercida en el contexto laboral. Además, establece obligaciones concretas para los empleadores respecto de la recepción de denuncias, investigación de los hechos y adopción de medidas preventivas.
                        </p>

                        <InArticleCTA category="Derecho Laboral" />

                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">
                                La ley busca que las empresas no solo reaccionen frente a un conflicto, sino que implementen mecanismos permanentes destinados a evitar que estas situaciones ocurran.
                            </p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                La existencia de una denuncia no significa automáticamente que exista una infracción a la Ley Karin. Cada investigación debe analizar antecedentes concretos, pruebas, contexto y la forma en que ocurrieron los hechos. Dos denuncias aparentemente similares pueden terminar con conclusiones completamente distintas según la evidencia disponible.
                            </p>
                        </div>
                    </div>

                    {/* CONDUCTAS QUE PROTEGE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué conductas protege la Ley Karin?</h2>
                        <p className="text-gray-600 mb-4">La normativa contempla diversas situaciones que pueden afectar la integridad física o psicológica de los trabajadores.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Hostigamientos reiterados",
                                "Humillaciones",
                                "Amenazas",
                                "Agresiones físicas",
                                "Acoso sexual",
                                "Conductas intimidatorias",
                                "Violencia ejercida por terceros relacionada con el trabajo",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">No todas las discusiones o conflictos laborales constituyen necesariamente una infracción. Será necesario analizar la gravedad, reiteración y contexto de cada situación.</p>
                    </div>

                    {/* QUIENES PUEDEN DENUNCIAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Quiénes pueden presentar una denuncia?</h2>
                        <p className="text-gray-600 mb-4">
                            En general, cualquier trabajador que considere haber sido víctima de una conducta comprendida dentro de la Ley Karin puede utilizar los mecanismos establecidos por la empresa.
                        </p>
                        <p className="text-gray-600 mb-4">
                            También pueden existir denuncias relacionadas con hechos presenciados por terceros cuando ello resulte pertinente conforme al procedimiento correspondiente.
                        </p>
                        <p className="text-gray-600">Cada organización debe informar claramente cómo presentar estas denuncias y cuál será el procedimiento que seguirá posteriormente.</p>
                    </div>

                    {/* DONDE SE PRESENTA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Dónde se presenta la denuncia?</h2>
                        <p className="text-gray-600 mb-4">Habitualmente la denuncia puede presentarse mediante los canales internos definidos por la empresa.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Recursos humanos",
                                "Canales éticos",
                                "Plataformas digitales",
                                "Comités internos",
                                "Otros procedimientos establecidos en el reglamento interno",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">
                            La denuncia debería contener una descripción clara de los hechos, las personas involucradas y, cuando sea posible, antecedentes que permitan iniciar la investigación.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Muchas personas creen que basta con presentar una denuncia para quedar automáticamente protegidas. Sin embargo, el procedimiento posterior puede variar según cómo se formuló la denuncia, la información entregada y las medidas adoptadas por la empresa. La estrategia utilizada desde el inicio puede influir en el desarrollo completo del caso.
                            </p>
                        </div>
                    </div>

                    {/* QUE DEBE HACER LA EMPRESA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué debe hacer la empresa después de recibir una denuncia?</h2>
                        <p className="text-gray-600 mb-4">Una vez recibida la denuncia, el empleador debe activar el procedimiento correspondiente.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Revisar los antecedentes",
                                "Iniciar una investigación",
                                "Adoptar medidas de resguardo cuando corresponda",
                                "Entrevistar a las personas involucradas",
                                "Recopilar documentos y otros medios de prueba",
                                "Emitir una resolución conforme al procedimiento aplicable",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Todo ello debe desarrollarse respetando principios de confidencialidad, imparcialidad y protección de quienes participan en la investigación.</p>
                    </div>

                    {/* CUANTO DEMORA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuánto demora una investigación?</h2>
                        <p className="text-gray-600 mb-4">El tiempo puede variar dependiendo de la complejidad del caso.</p>
                        <p className="text-gray-600 mb-4">
                            Algunas investigaciones pueden resolverse relativamente rápido, mientras que otras requieren entrevistas, revisión de documentos, declaraciones de testigos y recopilación de distintos antecedentes antes de adoptar una decisión.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                            <p className="text-amber-800 text-sm">
                                Lo importante es que el procedimiento avance de manera diligente y respetando las garantías establecidas por la legislación vigente. Una investigación rápida no siempre significa una investigación adecuada. Del mismo modo, una investigación extensa tampoco garantiza que la decisión final sea correcta. Si posteriormente existe un juicio laboral, el tribunal podrá revisar cómo se desarrolló todo el procedimiento y valorar nuevamente la prueba presentada.
                            </p>
                        </div>
                    </div>

                    {/* EMPRESA NO INVESTIGA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si la empresa no investiga una denuncia?</h2>
                        <p className="text-gray-600 mb-4">
                            Uno de los objetivos principales de la Ley Karin es que las denuncias sean efectivamente investigadas. Si un empleador ignora los hechos denunciados, demora injustificadamente el procedimiento o simplemente no adopta ninguna medida, ello puede generar consecuencias jurídicas dependiendo de las circunstancias del caso.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                            <p className="text-amber-800 text-sm">
                                En algunos casos, la falta de investigación también puede transformarse en un antecedente relevante dentro de una eventual acción judicial, especialmente cuando el trabajador continúa expuesto a situaciones de hostigamiento o violencia. No toda investigación deficiente genera automáticamente responsabilidad del empleador. Sin embargo, cuando la empresa incumple sus obligaciones legales o permite que continúe una situación de vulneración de derechos, el análisis cambia completamente y puede abrir la puerta a acciones adicionales. Esa evaluación depende siempre de los antecedentes concretos de cada caso.
                            </p>
                        </div>
                    </div>

                    {/* CTA IN-ARTICLE */}


                    {/* MEDIDAS DE PROTECCION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué medidas de protección pueden adoptarse?</h2>
                        <p className="text-gray-600 mb-4">Mientras se desarrolla la investigación, la empresa puede adoptar distintas medidas destinadas a proteger a las personas involucradas.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Cambios temporales de funciones",
                                "Modificación de turnos",
                                "Separación de las personas involucradas",
                                "Restricciones de contacto",
                                "Otras medidas compatibles con la organización del trabajo",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Estas decisiones deben buscar proteger a los trabajadores sin transformarse en una sanción anticipada para ninguna de las partes.</p>
                    </div>

                    {/* PRUEBAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pruebas sirven en una denuncia bajo la Ley Karin?</h2>
                        <p className="text-gray-600 mb-4">No existe una prueba única que determine el resultado de una investigación.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Correos electrónicos",
                                "Conversaciones de WhatsApp",
                                "Mensajes internos",
                                "Grabaciones cuando sean legalmente admisibles",
                                "Testigos",
                                "Informes médicos",
                                "Certificados psicológicos",
                                "Fotografías",
                                "Registros de cámaras cuando existan",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Lo importante es conservar la mayor cantidad de antecedentes posible desde el momento en que comienzan los hechos.</p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                La existencia de pruebas no garantiza por sí sola un resultado favorable. Muchas veces el aspecto decisivo es cómo esas pruebas se relacionan entre sí y qué logran demostrar respecto de los hechos denunciados. Una misma conversación puede tener interpretaciones completamente distintas dependiendo del contexto general de la investigación.
                            </p>
                        </div>
                    </div>

                    {/* REEMPLAZA DEMANDA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿La Ley Karin reemplaza una demanda judicial?</h2>
                        <p className="text-gray-600 mb-4">No. La investigación interna y una eventual demanda laboral son procedimientos distintos.</p>
                        <p className="text-gray-600 mb-4">
                            Dependiendo de lo ocurrido, un trabajador podría posteriormente ejercer acciones judiciales cuando estime que existieron vulneraciones de sus derechos laborales. Entre ellas podrían encontrarse acciones de tutela laboral, indemnizaciones u otras que correspondan conforme a la legislación vigente.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                            <p className="text-amber-800 text-sm">Por eso es importante entender que la investigación interna no siempre pone término definitivo al conflicto.</p>
                        </div>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Esperar demasiado tiempo antes de denunciar", desc: "El paso del tiempo puede dificultar la obtención de pruebas y testigos." },
                                    { title: "Eliminar mensajes o correos relevantes", desc: "Las comunicaciones escritas son una prueba fundamental en cualquier reclamo laboral." },
                                    { title: "No guardar evidencia de los hechos", desc: "Sin evidencia, resulta difícil acreditar la existencia de acoso." },
                                    { title: "Pensar que cualquier conflicto constituye automáticamente acoso laboral", desc: "No todo conflicto laboral es una infracción a la Ley Karin." },
                                    { title: "Renunciar sin evaluar previamente las consecuencias legales", desc: "Una renuncia apresurada puede limitar las alternativas legales disponibles." },
                                    { title: "Declarar durante una investigación sin conocer el alcance jurídico de sus respuestas", desc: "Una declaración mal preparada puede afectar el desarrollo del procedimiento." },
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

                    {/* CUANDO CONSULTAR ABOGADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo conviene consultar a un abogado?</h2>
                        <p className="text-gray-600 mb-4">Aunque la Ley Karin busca resolver muchos conflictos dentro de la empresa, existen situaciones donde resulta recomendable obtener asesoría jurídica cuanto antes.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Ya presentaste una denuncia y la empresa no responde",
                                "Recibiste una citación para declarar",
                                "La investigación comenzó pero consideras que no está siendo imparcial",
                                "Te aplicaron medidas que afectan tu trabajo",
                                "Sufriste represalias después de denunciar",
                                "Estás evaluando un autodespido",
                                "Crees que existió vulneración de derechos fundamentales",
                                "Recibiste una carta de despido relacionada con los hechos denunciados",
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-600 flex-shrink-0">•</span>
                                    <span className="text-gray-700 font-bold">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">En todos estos casos, conocer la regla general de la Ley Karin no basta para saber cuál es la mejor decisión. La estrategia dependerá de los antecedentes específicos, las pruebas disponibles y la etapa en que se encuentre el procedimiento.</p>
                    </div>

                    {/* CTA PRINCIPAL */}
                    <div className="mb-12">
                        <div className="bg-green-900 rounded-2xl p-8 text-center">
                            <h3 className="text-2xl font-bold font-serif text-green-600 mb-3">¿Necesitas orientación sobre un caso de Ley Karin?</h3>
                            <p className="text-white mb-6">Si ya presentaste una denuncia, recibiste una citación, consideras que la investigación no está siendo imparcial o estás evaluando demandar a tu empleador, obtener asesoría jurídica antes de tomar decisiones importantes puede marcar una diferencia relevante. Un abogado laboral puede revisar los antecedentes específicos de tu caso, explicar las alternativas disponibles y ayudarte a definir la estrategia más adecuada desde el inicio.</p>
                            <Link
                                to="/abogado-laboral"
                                className="inline-block bg-white text-green-900 font-bold px-8 py-3 rounded-md hover:bg-gray-100 transition-colors"
                            >
                                Consulta con un abogado laboral
                            </Link>
                        </div>
                    </div>

                    {/* CONCLUSION */}

                    <RelatedLawyers category="Derecho Laboral" />

                    <div className="mb-12 border-t pt-8">

                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La Ley Karin representa un avance importante en la protección de los trabajadores frente al acoso laboral, el acoso sexual y la violencia en el trabajo. Sin embargo, conocer las reglas generales no siempre permite determinar cuál es la mejor decisión cuando ya existe una denuncia, una investigación interna o un conflicto con el empleador.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Si estás enfrentando una situación de este tipo, es recomendable analizar tu caso antes de declarar, firmar documentos o adoptar decisiones que puedan afectar tus derechos. En LegalUp puedes revisar tu situación con un{" "}
                            <Link to="/abogado-laboral" className="text-green-700 underline hover:text-green-500">abogado laboral online</Link>
                            , quien podrá evaluar los antecedentes específicos de tu caso y orientarte sobre las alternativas legales disponibles.
                        </p>
                    </div>

                    <CategoryCTA category="laboral" />

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



            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
                <div className="mt-8">
                    <BlogShare
                        title="Ley Karin en Chile 2026"
                        url="https://legalup.cl/blog/ley-karin-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="ley-karin-chile-2026" />

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
            <BlogConversionPopup category="Derecho Laboral" topic="ley-karin" />
        </div>
    );
};

export default BlogArticle;