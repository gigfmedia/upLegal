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
            question: "¿Un solo hecho constituye acoso laboral?",
            answer:
                "No necesariamente. Los tribunales habitualmente analizan la reiteración, gravedad y contexto de las conductas. El acoso laboral se caracteriza por ser sistemático — conductas repetidas que afectan la dignidad o integridad del trabajador. Un hecho aislado grave puede configurar otros delitos o infracciones laborales, pero generalmente no es suficiente por sí solo para acreditar acoso.",
        },
        {
            question: "¿Puedo denunciar acoso laboral si proviene de un compañero?",
            answer:
                "Sí. El acoso laboral puede provenir de compañeros, superiores jerárquicos u otras personas dentro del entorno laboral. El empleador tiene la obligación de investigar y adoptar medidas cuando toma conocimiento de una situación de acoso, independientemente de quién sea el agresor.",
        },
        {
            question: "¿Necesito testigos para demostrar el acoso laboral?",
            answer:
                "No siempre. Correos electrónicos, mensajes de WhatsApp, documentos, registros de asistencia, informes médicos o psicológicos y otros antecedentes también pueden servir como prueba. Lo importante es conservar toda la evidencia disponible desde el primer momento — incluyendo fechas, lugares y descripción de cada incidente.",
        },
        {
            question: "¿Puedo renunciar y luego demandar por acoso laboral?",
            answer:
                "Depende de las circunstancias. Si el acoso fue tan grave que hizo insostenible continuar trabajando, podrías invocar la figura del autodespido — también llamado despido indirecto — que permite terminar el contrato por incumplimiento grave del empleador y exigir indemnizaciones. Esta acción debe presentarse dentro de los 60 días hábiles desde el término del contrato.",
        },
        {
            question: "¿La empresa puede despedirme por denunciar acoso laboral?",
            answer:
                "No legalmente. La legislación protege a los trabajadores frente a represalias por denunciar vulneraciones de derechos fundamentales. Si la empresa te despide después de una denuncia por acoso, ese despido puede ser impugnado como vulneratorio de derechos fundamentales ante el Juzgado del Trabajo, con indemnizaciones adicionales significativas.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Acoso laboral en Chile 2026: qué es, cómo denunciar y cuáles son tus derechos"
                description="Conoce qué es el acoso laboral en Chile, cuándo constituye una infracción, cómo denunciar, qué pruebas sirven, cuáles son tus derechos y cuándo conviene consultar a un abogado laboral."
                image="/assets/acoso-laboral-chile-2026.png"
                url="https://legalup.cl/blog/acoso-laboral-chile-2026"
                datePublished="2026-07-10"
                dateModified="2026-07-10"
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
                        Acoso laboral en Chile 2026: qué es, cómo denunciar y cuáles son tus derechos
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "El acoso laboral consiste en conductas reiteradas que afectan la dignidad del trabajador",
                                "Puede provenir de jefaturas o de otros trabajadores",
                                "No toda discusión o conflicto laboral constituye acoso",
                                "Las pruebas suelen ser determinantes para acreditar los hechos",
                                "En algunos casos puede dar lugar a tutela laboral u otras acciones judiciales",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        El acoso laboral puede afectar gravemente la salud física y psicológica de un trabajador. Comentarios humillantes, aislamiento, amenazas, sobrecarga injustificada de trabajo o conductas reiteradas destinadas a afectar la dignidad de una persona pueden dar origen a responsabilidades para el empleador y, en determinados casos, a acciones judiciales.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>10 de Julio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="acoso-laboral-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Acoso laboral en Chile 2026"
                        url="https://legalup.cl/blog/acoso-laboral-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            Sin embargo, no todo conflicto entre compañeros o con una jefatura constituye automáticamente acoso laboral. La ley exige analizar distintos elementos antes de concluir que existe una vulneración de derechos.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía conocerás qué es el acoso laboral en Chile, cómo denunciarlo, qué pruebas son importantes y qué alternativas existen si estás viviendo esta situación.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando un conflicto laboral, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/tutela-laboral-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                tutela laboral en Chile
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
                            Si necesitas evaluar tu situación después de una denuncia de acoso, puedes consultar con un{" "}
                            <Link to="/abogado-laboral" className="text-green-700 underline hover:text-green-500">
                                abogado laboral en Chile
                            </Link>{" "}
                            directamente online.
                        </p>
                    </div>

                    {/* QUE ES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es el acoso laboral?</h2>
                        <p className="text-gray-600 mb-4">
                            El acoso laboral corresponde a conductas reiteradas ejercidas dentro del contexto laboral que buscan intimidar, hostigar, humillar o afectar la dignidad de un trabajador.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Estas conductas pueden provocar consecuencias psicológicas, emocionales e incluso económicas para la persona afectada.
                        </p>

                        <InArticleCTA category="Derecho Laboral" />

                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">
                                No siempre existe violencia física. Muchas veces el acoso se manifiesta mediante acciones constantes que, vistas de forma individual, parecen menores, pero que en conjunto generan un ambiente laboral hostil.
                            </p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Comprender la definición legal del acoso laboral permite identificar la regla general, pero eso no significa que cualquier mal ambiente laboral configure automáticamente una infracción. Los tribunales suelen analizar la frecuencia de los hechos, su gravedad, el contexto en que ocurrieron y la prueba disponible antes de determinar si existe realmente acoso laboral.
                            </p>
                        </div>
                    </div>

                    {/* CONDUCTAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué conductas pueden constituir acoso laboral?</h2>
                        <p className="text-gray-600 mb-4">Dependiendo del caso, algunas conductas pueden ser consideradas acoso laboral cuando son reiteradas y afectan la dignidad del trabajador.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Insultos o humillaciones constantes",
                                "Burlas públicas",
                                "Aislamiento deliberado",
                                "Amenazas permanentes",
                                "Asignación de tareas imposibles de cumplir",
                                "Exclusión de reuniones importantes",
                                "Descalificaciones frente a clientes o compañeros",
                                "Difusión de rumores",
                                "Vigilancia excesiva sin justificación",
                                "Cambios arbitrarios destinados a perjudicar al trabajador",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Cada situación debe analizarse considerando todas las circunstancias.</p>
                    </div>

                    {/* QUE NO CONSTITUYE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué situaciones NO constituyen necesariamente acoso laboral?</h2>
                        <p className="text-gray-600 mb-4">También existen situaciones que muchas personas interpretan como acoso, pero que no siempre cumplen los requisitos legales.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Llamados de atención fundados",
                                "Evaluaciones de desempeño objetivas",
                                "Cambios organizacionales legítimos",
                                "Exigencias normales propias del cargo",
                                "Diferencias de criterio entre trabajadores",
                                "Decisiones de administración adoptadas conforme a la ley",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">La existencia de un conflicto laboral no implica automáticamente que exista acoso.</p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Dos trabajadores pueden vivir situaciones similares y obtener resultados completamente distintos en un juicio. La diferencia suele estar en la continuidad de las conductas, la intención de afectar la dignidad del trabajador y los antecedentes concretos que puedan acreditarse durante el proceso.
                            </p>
                        </div>
                    </div>

                    {/* QUIEN PUEDE COMETER */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Quién puede cometer acoso laboral?</h2>
                        <p className="text-gray-600 mb-4">El acoso no necesariamente proviene del empleador. Puede ser ejercido por:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Superiores jerárquicos", "Jefaturas intermedias", "Compañeros de trabajo", "Subordinados, en ciertos casos"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">La empresa tiene el deber de adoptar medidas para prevenir, investigar y abordar estas situaciones cuando toma conocimiento de ellas.</p>
                    </div>

                    {/* PRUEBAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pruebas sirven para demostrar el acoso laboral?</h2>
                        <p className="text-gray-600 mb-4">Uno de los aspectos más importantes en este tipo de casos es la evidencia.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Correos electrónicos",
                                "Mensajes de WhatsApp",
                                "Conversaciones por plataformas corporativas",
                                "Testigos",
                                "Grabaciones cuando sean legalmente utilizables",
                                "Certificados médicos",
                                "Informes psicológicos",
                                "Licencias médicas",
                                "Denuncias internas",
                                "Protocolos de investigación",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Mientras antes se conserven estos antecedentes, mayores posibilidades existirán de reconstruir correctamente lo ocurrido.</p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Muchas investigaciones fracasan no porque el trabajador no haya sufrido acoso, sino porque las conductas ocurrieron durante meses sin que existiera un registro suficiente. La estrategia probatoria suele comenzar mucho antes de presentar una demanda y depende de los antecedentes específicos que puedan reunirse en cada caso.
                            </p>
                        </div>
                    </div>

                    {/* COMO DENUNCIAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo denunciar el acoso laboral?</h2>
                        <p className="text-gray-600 mb-4">Si consideras que estás siendo víctima de acoso laboral, es recomendable actuar de manera ordenada y conservar la mayor cantidad posible de antecedentes.</p>
                        <p className="text-gray-600 mb-4">Dependiendo del caso, las alternativas pueden incluir:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Informar los hechos a la jefatura correspondiente",
                                "Utilizar los canales internos establecidos por la empresa",
                                "Activar el procedimiento contemplado en la Ley Karin cuando corresponda",
                                "Presentar antecedentes ante la Inspección del Trabajo en los casos que permita la legislación",
                                "Iniciar acciones judiciales cuando exista una vulneración de derechos",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">No todos los casos siguen el mismo camino. La estrategia dependerá de la gravedad de los hechos y de la evidencia disponible.</p>
                    </div>

                    {/* EMPRESA NO INVESTIGA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si la empresa no investiga?</h2>
                        <p className="text-gray-600 mb-4">
                            El empleador tiene obligaciones legales destinadas a prevenir y abordar situaciones de acoso dentro del lugar de trabajo.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Cuando una denuncia es ignorada, investigada de manera deficiente o simplemente archivada sin realizar diligencias mínimas, esa actuación también puede tener consecuencias jurídicas.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                            <p className="text-amber-800 text-sm">
                                La ausencia de una investigación adecuada no significa que el trabajador pierda sus derechos. Por el contrario, en algunos casos ese incumplimiento puede transformarse en un antecedente relevante dentro de un eventual juicio. Muchas personas creen que si la empresa rechazó la denuncia ya no existen alternativas legales. Sin embargo, la conclusión de una investigación interna no obliga al tribunal. En un juicio pueden incorporarse nuevas pruebas, testigos y antecedentes que modifiquen completamente la evaluación del caso.
                            </p>
                        </div>
                    </div>

                    {/* LEY KARIN */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué relación existe entre la Ley Karin y el acoso laboral?</h2>
                        <p className="text-gray-600 mb-4">
                            La Ley Karin fortaleció las obligaciones de los empleadores para prevenir, investigar y sancionar situaciones de acoso laboral, acoso sexual y violencia en el trabajo.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Entre otras materias, exige que las empresas cuenten con procedimientos internos claros para recibir denuncias, desarrollar investigaciones y adoptar medidas de protección cuando corresponda.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                            <p className="text-amber-800 text-sm">
                                Sin embargo, la existencia de un protocolo interno no garantiza automáticamente que la investigación sea suficiente ni que la decisión adoptada sea jurídicamente correcta. Cada procedimiento debe respetar las garantías establecidas por la legislación vigente.
                            </p>
                        </div>
                    </div>

                    {/* CTA IN-ARTICLE */}


                    {/* TUTELA LABORAL */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿El acoso laboral permite presentar una tutela laboral?</h2>
                        <p className="text-gray-600 mb-4">
                            En determinados casos, sí. Cuando las conductas constituyen una vulneración de derechos fundamentales del trabajador, puede ser procedente una acción de tutela laboral.
                        </p>
                        <p className="text-gray-600 mb-4">No obstante, no toda denuncia de acoso termina necesariamente en una demanda de tutela. Será necesario analizar aspectos como:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "La naturaleza de las conductas",
                                "La reiteración de los hechos",
                                "La prueba existente",
                                "Las consecuencias sufridas por el trabajador",
                                "Las actuaciones del empleador frente a la denuncia",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">
                            Si deseas conocer en profundidad esta acción judicial puedes revisar nuestra guía sobre{" "}
                            <Link to="/blog/tutela-laboral-chile-2026" className="text-green-700 underline hover:text-green-500">tutela laboral en Chile</Link>.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Dos trabajadores pueden denunciar situaciones similares de acoso y seguir caminos judiciales completamente distintos. En algunos casos será suficiente una investigación interna; en otros podrá existir tutela laboral, autodespido u otras acciones. La diferencia depende de los antecedentes específicos del caso y no únicamente del tipo de conducta denunciada.
                            </p>
                        </div>
                    </div>

                    {/* QUE HACER MIENTRAS TRABAJAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué hacer mientras continúa la relación laboral?</h2>
                        <p className="text-gray-600 mb-4">Si todavía trabajas en la empresa, es recomendable actuar con prudencia.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Guardar correos electrónicos relevantes",
                                "Respaldar mensajes laborales",
                                "Registrar fechas y hechos importantes",
                                "Identificar posibles testigos",
                                "Conservar licencias médicas e informes profesionales",
                                "Evitar eliminar evidencia",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Mientras antes se documenten los hechos, más sencillo suele ser reconstruir lo ocurrido en caso de una investigación o juicio.</p>
                    </div>

                    {/* ACOSO SIN INSULTOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Puede existir acoso laboral aunque no haya insultos?</h2>
                        <p className="text-gray-600 mb-4">
                            Sí. Muchas personas creen que el acoso laboral solo existe cuando hay gritos, amenazas o insultos directos. Sin embargo, las conductas pueden ser mucho más sutiles.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Por ejemplo, excluir permanentemente a un trabajador de reuniones relevantes, asignarle tareas imposibles de cumplir, modificar constantemente sus funciones sin justificación, controlar de manera excesiva su trabajo o desacreditarlo frente al resto del equipo pueden ser antecedentes que, analizados en conjunto, adquieran relevancia jurídica.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                            <p className="text-amber-800 text-sm">
                                Lo importante no es un hecho aislado, sino la forma en que esas conductas afectan de manera reiterada la dignidad del trabajador y el ambiente laboral. Una misma conducta puede tener significados completamente distintos según el contexto. Un cambio de funciones, por ejemplo, puede responder a necesidades legítimas de la empresa o formar parte de un patrón de hostigamiento. Esa diferencia solo puede determinarse analizando todos los antecedentes específicos del caso y no únicamente un hecho individual.
                            </p>
                        </div>
                    </div>

                    {/* QUE OCURRE DESPUES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre después de presentar una denuncia?</h2>
                        <p className="text-gray-600 mb-4">
                            Una vez presentada la denuncia, normalmente comienza un proceso de investigación destinado a recopilar antecedentes y escuchar a las personas involucradas.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Dependiendo de cada situación, pueden realizarse entrevistas, revisarse documentos, analizar comunicaciones internas y adoptar medidas destinadas a proteger a quienes participan en el procedimiento mientras se desarrolla la investigación.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Finalizada esa etapa, la empresa deberá adoptar una decisión conforme a los antecedentes recopilados. Sin embargo, esa resolución no siempre pone término al conflicto.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                            <p className="text-amber-800 text-sm">
                                Si el trabajador considera que la investigación fue insuficiente, que las medidas adoptadas fueron inadecuadas o que continúan las vulneraciones, podrían existir otras acciones legales dependiendo de las circunstancias concretas.
                            </p>
                        </div>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Renunciar impulsivamente sin evaluar las consecuencias", desc: "Una renuncia apresurada puede limitar las alternativas legales disponibles." },
                                    { title: "No conservar pruebas", desc: "Sin evidencia, resulta difícil acreditar la existencia de acoso." },
                                    { title: "Confiar únicamente en conversaciones verbales", desc: "Lo que se dice verbalmente no siempre coincide con lo que después puede acreditarse." },
                                    { title: "Esperar varios meses para denunciar", desc: "El paso del tiempo puede dificultar la obtención de pruebas y testigos." },
                                    { title: "Eliminar mensajes importantes", desc: "Las comunicaciones escritas son una prueba fundamental en cualquier reclamo laboral." },
                                    { title: "Publicar el conflicto en redes sociales", desc: "Difundir detalles del caso puede afectar la estrategia legal y la credibilidad." },
                                    { title: "Firmar documentos sin comprender su contenido", desc: "Un finiquito mal firmado puede limitar las posibilidades de reclamar posteriormente." },
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
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo conviene consultar cuanto antes a un abogado laboral?</h2>
                        <p className="text-gray-600 mb-4">Es recomendable solicitar asesoría especialmente cuando:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Presentaste una denuncia interna y fue rechazada",
                                "La empresa no inició ninguna investigación",
                                "Continúas sufriendo hostigamientos",
                                "Recibiste represalias después de denunciar",
                                "Existe una investigación en curso",
                                "Estás evaluando un autodespido",
                                "Recibiste una carta de despido relacionada con estos hechos",
                                "Necesitas decidir si corresponde una tutela laboral u otra acción judicial",
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-600 flex-shrink-0">•</span>
                                    <span className="text-gray-700 font-bold">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">En estos escenarios suele ser importante revisar la estrategia antes de declarar, firmar documentos o dejar transcurrir los plazos legales.</p>
                    </div>

                    {/* CTA PRINCIPAL */}
                    <div className="mb-12">
                        <div className="bg-green-900 rounded-2xl p-8 text-center">
                            <h3 className="text-2xl font-bold font-serif text-green-600 mb-3">¿El acoso laboral continúa o ya existe una investigación en tu empresa?</h3>
                            <p className="text-white mb-6">Si los hechos siguen ocurriendo o la empresa ya inició una investigación interna, el momento más importante para revisar tu situación suele ser antes de presentar nuevos antecedentes, firmar documentos o tomar decisiones que puedan afectar una futura acción judicial. Analizar oportunamente el caso permite definir la estrategia más adecuada según los hechos y las pruebas disponibles.</p>
                            <Link
                                to="/abogado-laboral"
                                className="inline-block bg-white text-green-900 font-bold px-8 py-3 rounded-md hover:bg-gray-100 transition-colors"
                            >
                                Hablar con un abogado laboral
                            </Link>
                        </div>
                    </div>

                    {/* CONCLUSION */}

                    <RelatedLawyers category="Derecho Laboral" />

                    <div className="mb-12 border-t pt-8">

                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            El acoso laboral puede tener consecuencias importantes tanto para el trabajador como para el empleador. Conocer qué conductas pueden constituir acoso, cómo funciona una investigación y cuáles son las herramientas legales disponibles permite comprender el marco general que regula estas situaciones.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Sin embargo, determinar si existe realmente acoso laboral, si corresponde una tutela laboral, un autodespido u otra acción judicial depende de circunstancias muy específicas que no pueden resolverse únicamente con información general. Los antecedentes, las pruebas y la forma en que ocurrieron los hechos pueden cambiar completamente la evaluación jurídica de un caso concreto. Si estás enfrentando una situación de este tipo, puedes revisar tu caso con un{" "}
                            <Link to="/abogado-laboral" className="text-green-700 underline hover:text-green-500">abogado laboral en Chile</Link>{" "}
                            a través de LegalUp.
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
                        title="Acoso laboral en Chile 2026"
                        url="https://legalup.cl/blog/acoso-laboral-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="acoso-laboral-chile-2026" />

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
            <BlogConversionPopup category="Derecho Laboral" topic="acoso-laboral" />
        </div>
    );
};

export default BlogArticle;