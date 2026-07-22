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
            question: "¿Es obligatorio contratar un abogado para presentar una demanda laboral?",
            answer: "En el procedimiento laboral chileno no siempre es obligatorio contar con abogado desde el inicio, pero en la práctica es altamente recomendable. El empleador generalmente tiene representación legal, lo que genera una asimetría importante. Un abogado laboral puede calcular correctamente las indemnizaciones, presentar la demanda dentro de los plazos y representarte en las audiencias.",
        },
        {
            question: "¿Puedo demandar si ya firmé el finiquito?",
            answer: "Depende de cómo firmaste el finiquito. Si lo firmaste con reserva de derechos, puedes demandar la diferencia o impugnar el despido dentro del plazo legal. Si firmaste sin reserva, las posibilidades se reducen aunque no desaparecen en todos los casos — por ejemplo, si existen cotizaciones impagas o nulidad del despido. Consultar con un abogado laboral antes de asumir que perdiste el derecho es siempre lo recomendable.",
        },
        {
            question: "¿Puedo demandar aunque ya no trabaje en la empresa?",
            answer: "Sí. La mayoría de las demandas laborales se presentan precisamente después de terminada la relación laboral. Lo importante es actuar dentro del plazo de 60 días hábiles desde el término del contrato — vencido ese plazo, el derecho a demandar por despido injustificado prescribe.",
        },
        {
            question: "¿La Inspección del Trabajo reemplaza una demanda laboral?",
            answer: "No. La Inspección del Trabajo cumple funciones administrativas — fiscaliza, facilita conciliaciones y puede multar al empleador — pero no puede ordenar el pago de indemnizaciones. Si no hay acuerdo en la conciliación, el paso siguiente es la demanda ante el Juzgado del Trabajo, que es el único que puede condenar al empleador a pagar.",
        },
        {
            question: "¿Qué pasa si pierdo la demanda laboral?",
            answer: "Si el tribunal falla en tu contra, no recibes las indemnizaciones que reclamabas. Dependiendo del caso, también podrías ser condenado a pagar las costas del juicio. Por eso es importante evaluar la solidez del caso antes de demandar — un abogado laboral puede darte una estimación realista de las probabilidades de éxito según tus antecedentes específicos.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Demanda laboral en Chile 2026: cuándo conviene demandar, plazos, costos y cómo funciona el juicio"
                description="Conoce cuándo conviene presentar una demanda laboral en Chile, cuáles son los plazos, cuánto demora un juicio, qué pruebas sirven y qué hacer para proteger tus derechos."
                image="/assets/demanda-laboral-chile-2026.png"
                url="https://legalup.cl/blog/demanda-laboral-chile-2026"
                datePublished="2026-07-18"
                dateModified="2026-07-18"
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
                        Demanda laboral en Chile 2026: cuándo conviene demandar, plazos, costos y cómo funciona el juicio
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "Una demanda laboral permite reclamar judicialmente incumplimientos del empleador",
                                "Los plazos para demandar suelen ser breves, por lo que es importante actuar oportunamente",
                                "Las pruebas son clave para acreditar los hechos ante el tribunal",
                                "No todas las demandas terminan en sentencia; muchas se resuelven mediante acuerdos",
                                "Contar con asesoría jurídica desde el inicio puede marcar la diferencia en el resultado",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Muchos trabajadores saben que sus derechos fueron vulnerados, pero no tienen claro si realmente conviene iniciar una demanda laboral. En otros casos, existe temor por los costos, la duración del juicio o las posibles consecuencias frente al empleador.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>17 de Julio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="demanda-laboral-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Demanda laboral en Chile 2026"
                        url="https://legalup.cl/blog/demanda-laboral-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            La legislación laboral chilena permite reclamar judicialmente distintos incumplimientos cuando estos afectan los derechos del trabajador. Sin embargo, no todas las situaciones requieren una demanda inmediata, ni todos los conflictos se resuelven de la misma forma.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía conocerás cuándo conviene demandar, cuáles son los principales tipos de demandas laborales, qué pruebas suelen utilizarse, cuánto demora un juicio y en qué casos resulta recomendable consultar con un abogado laboral.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando un conflicto laboral, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/carta-de-despido-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                carta de despido
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/despido-necesidades-empresa-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                despido por necesidades de la empresa
                            </Link>{" "}
                            y{" "}
                            <Link
                                to="/blog/tutela-laboral-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                tutela laboral
                            </Link>.
                        </p>
                    </div>

                    {/* QUE ES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es una demanda laboral?</h2>
                        <p className="text-gray-600 mb-4">
                            Una demanda laboral es una acción judicial mediante la cual un trabajador solicita que un tribunal resuelva un conflicto derivado de la relación laboral.
                        </p>
                        <p className="text-gray-600 mb-4">A través de una demanda es posible reclamar, entre otras materias:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Despido injustificado",
                                "Despido indebido",
                                "Despido improcedente",
                                "Tutela laboral",
                                "Nulidad del despido",
                                "Cobro de remuneraciones",
                                "Cotizaciones previsionales impagas",
                                "Indemnizaciones",
                                "Discriminación laboral",
                                "Vulneración de derechos fundamentales",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">El objetivo será que el tribunal determine si existió un incumplimiento legal y, cuando corresponda, ordene las medidas o indemnizaciones que establece la ley.</p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Conocer qué materias pueden demandarse no significa que necesariamente exista una acción viable en un caso concreto. Dos trabajadores pueden enfrentar situaciones aparentemente similares, pero obtener resultados completamente distintos dependiendo de los antecedentes disponibles, las pruebas existentes y la estrategia jurídica adoptada desde el inicio del conflicto.
                            </p>
                        </div>
                    </div>

                    {/* CTA IN-ARTICLE */}

                    <RelatedLawyers category="Derecho Laboral" />


                    {/* CUANDO CONVIENE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo conviene presentar una demanda laboral?</h2>
                        <p className="text-gray-600 mb-4">No todos los conflictos laborales requieren acudir inmediatamente a tribunales.</p>
                        <p className="text-gray-600 mb-4">Generalmente una demanda puede ser recomendable cuando:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "El empleador despidió al trabajador sin fundamento legal",
                                "No se pagaron las indemnizaciones correspondientes",
                                "Existen cotizaciones previsionales impagas",
                                "Hubo discriminación",
                                "Existe acoso laboral o sexual",
                                "Se vulneraron derechos fundamentales",
                                "El empleador incumplió gravemente sus obligaciones",
                                "Fracasó la conciliación ante la Inspección del Trabajo",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Cada situación debe evaluarse considerando tanto los hechos como la prueba disponible.</p>
                    </div>

                    {/* TIPOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué tipos de demandas laborales existen?</h2>
                        <p className="text-gray-600 mb-4">Dependiendo del conflicto, pueden presentarse distintas acciones judiciales.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Demanda por despido injustificado",
                                "Demanda de tutela laboral",
                                "Demanda por nulidad del despido",
                                "Demanda por cobro de prestaciones laborales",
                                "Demanda por indemnización de perjuicios",
                                "Demanda por incumplimiento contractual",
                                "Acciones relacionadas con accidentes del trabajo, cuando corresponda",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Cada procedimiento posee requisitos y plazos específicos.</p>
                    </div>

                        <InArticleCTA
                                                                                title="¿No sabes si tu caso realmente justifica una demanda laboral?"
                                                                                message="Un abogado laboral puede analizar tus antecedentes y ayudarte a decidir cuál es la mejor estrategia antes de que venzan los plazos legales."
                                                                                buttonText="Habla con un abogado ahora"
                                                                                category="Derecho Laboral"
                                                                            />


                    {/* PRUEBAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pruebas sirven en un juicio laboral?</h2>
                        <p className="text-gray-600 mb-4">Uno de los aspectos más importantes de cualquier demanda es la prueba.</p>
                        <p className="text-gray-600 mb-4">Habitualmente pueden utilizarse:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Contrato de trabajo",
                                "Anexos",
                                "Liquidaciones de sueldo",
                                "Finiquito",
                                "Carta de despido",
                                "Correos electrónicos",
                                "Conversaciones de WhatsApp",
                                "Registros de asistencia",
                                "Certificados previsionales",
                                "Testigos",
                                "Informes periciales cuando correspondan",
                                "Cualquier otro antecedente relacionado con los hechos discutidos",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Mientras mejor documentado esté el conflicto, mayores serán las posibilidades de acreditar la posición del trabajador.</p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                No todas las pruebas tienen el mismo peso dentro de un juicio. En algunos casos un correo electrónico puede ser determinante, mientras que en otros será necesario complementar la evidencia con testigos, documentos o informes técnicos. La forma en que se presentan y relacionan los antecedentes suele ser tan importante como los documentos mismos.
                            </p>
                        </div>
                    </div>

                    {/* INSPECCION DEL TRABAJO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Es obligatorio pasar primero por la Inspección del Trabajo?</h2>
                        <p className="text-gray-600 mb-4">
                            No siempre. Dependiendo del conflicto, algunas personas optan por presentar primero un reclamo administrativo, mientras que otras inician directamente una demanda judicial.
                        </p>
                        <p className="text-gray-600">
                            La conveniencia de seguir uno u otro camino dependerá del tipo de incumplimiento, los plazos aplicables y los objetivos del trabajador. En determinadas situaciones acudir previamente a la Inspección puede facilitar una conciliación; en otras, retrasar innecesariamente el inicio de un juicio.
                        </p>
                    </div>

                    {/* PLAZOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuáles son los plazos para presentar una demanda laboral?</h2>
                        <p className="text-gray-600 mb-4">
                            Uno de los errores más frecuentes es esperar demasiado tiempo antes de buscar asesoría.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Dependiendo del tipo de acción judicial, la legislación establece distintos plazos para demandar. En materias relacionadas con despidos, esos plazos suelen ser breves, por lo que dejar pasar semanas o meses puede significar perder definitivamente la posibilidad de reclamar.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="text-red-800">Por esa razón, si existe un conflicto laboral importante, es recomendable obtener orientación jurídica lo antes posible para evitar que prescriban las acciones disponibles.</p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Muchas personas creen que el plazo comienza el día en que deciden demandar. En realidad, depende del tipo de acción ejercida, de la fecha del despido, de si existieron reclamos administrativos y de otros antecedentes que pueden modificar el cálculo. Una diferencia de pocos días puede determinar si una demanda será admitida o rechazada.
                            </p>
                        </div>
                    </div>

                    {/* CUANTO DEMORA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuánto demora un juicio laboral?</h2>
                        <p className="text-gray-600 mb-4">No existe un plazo único.</p>
                        <p className="text-gray-600 mb-4">La duración dependerá de factores como:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Complejidad del conflicto",
                                "Cantidad de pruebas",
                                "Número de testigos",
                                "Carga de trabajo del tribunal",
                                "Existencia de recursos judiciales",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Algunos procedimientos concluyen mediante conciliación en pocos meses, mientras que otros pueden extenderse considerablemente cuando existe abundante prueba o múltiples controversias jurídicas.</p>
                        <div className="bg-amber-50 p-5 rounded-xl mt-4">
                            <p className="text-amber-800">Lo importante es entender que iniciar una demanda no significa necesariamente llegar hasta una sentencia definitiva. Muchos conflictos se resuelven mediante acuerdos antes de finalizar el juicio.</p>
                        </div>
                    </div>

                    {/* COSTOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuánto cuesta presentar una demanda laboral?</h2>
                        <p className="text-gray-600 mb-4">El costo dependerá principalmente del sistema de honorarios acordado con el abogado.</p>
                        <p className="text-gray-600 mb-4">Algunos profesionales trabajan con:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Honorarios fijos",
                                "Honorarios por etapas",
                                "Porcentaje sobre el resultado obtenido",
                                "Sistemas mixtos",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Antes de contratar asesoría es recomendable solicitar un presupuesto claro que indique qué servicios están incluidos y cuáles podrían generar costos adicionales durante el proceso.</p>
                    </div>

                    {/* QUE PUEDE ORDENAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué puede ordenar el tribunal?</h2>
                        <p className="text-gray-600 mb-4">Si el tribunal acoge la demanda, dependiendo del caso concreto podría ordenar distintas medidas.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Pago de indemnizaciones",
                                "Pago de remuneraciones adeudadas",
                                "Pago de cotizaciones",
                                "Nulidad del despido",
                                "Reincorporación cuando la ley lo permita",
                                "Indemnizaciones por vulneración de derechos fundamentales",
                                "Otras medidas establecidas por la legislación laboral",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Cada sentencia dependerá de los hechos acreditados durante el juicio.</p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Dos demandas aparentemente similares no siempre producen el mismo resultado. La decisión final dependerá de las pruebas presentadas, la forma en que se acrediten los hechos y la estrategia jurídica desarrollada durante todo el proceso. Por eso resulta difícil estimar el resultado de una demanda únicamente comparándola con casos publicados en internet.
                            </p>
                        </div>
                    </div>

                    {/* ACUERDO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Es posible llegar a un acuerdo sin terminar el juicio?</h2>
                        <p className="text-gray-600 mb-4">
                            No todos los conflictos laborales terminan con una sentencia. Durante el procedimiento existen distintas oportunidades para que trabajador y empleador alcancen un acuerdo que permita poner fin al conflicto sin continuar hasta el final del juicio.
                        </p>
                        <p className="text-gray-600 mb-4">
                            En muchos casos, las partes negocian el pago de indemnizaciones, remuneraciones u otras prestaciones, evitando la incertidumbre, el tiempo y los costos que implica continuar litigando.
                        </p>
                        <p className="text-gray-600 mb-4">Un acuerdo puede resultar conveniente cuando ambas partes buscan una solución rápida y existe disposición para negociar.</p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                            <p className="text-amber-800 text-sm">
                                Aceptar o rechazar una propuesta de acuerdo no depende únicamente del monto ofrecido. También deben evaluarse aspectos como las probabilidades de éxito del juicio, la calidad de las pruebas disponibles, los tiempos del proceso y los riesgos de una sentencia desfavorable. Una oferta aparentemente atractiva puede ser insuficiente dependiendo de los derechos que realmente correspondan al trabajador.
                            </p>
                        </div>
                    </div>

                    {/* DOCUMENTOS REUNIR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué documentos conviene reunir antes de presentar una demanda?</h2>
                        <p className="text-gray-600 mb-4">Preparar adecuadamente la documentación puede facilitar el trabajo del abogado y fortalecer la posición del trabajador desde el inicio del proceso.</p>
                        <p className="text-gray-600 mb-4">Entre los antecedentes que normalmente resulta conveniente reunir se encuentran:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Contrato de trabajo",
                                "Anexos",
                                "Carta de despido",
                                "Finiquito",
                                "Liquidaciones de sueldo",
                                "Certificado de cotizaciones previsionales",
                                "Correos electrónicos",
                                "Conversaciones de WhatsApp relacionadas con el conflicto",
                                "Registros de asistencia",
                                "Certificados médicos cuando tengan relación con los hechos",
                                "Fotografías, videos u otros medios de prueba, cuando correspondan",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">No es indispensable contar con todos estos documentos para evaluar un caso, pero mientras mayor sea la información disponible, más precisa podrá ser la estrategia jurídica.</p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Muchas personas creen que únicamente sirven documentos firmados por el empleador. Sin embargo, dependiendo del conflicto, conversaciones electrónicas, registros digitales, testigos o antecedentes obtenidos durante la relación laboral también pueden adquirir relevancia probatoria. Lo importante no es reunir la mayor cantidad de documentos posible, sino identificar cuáles realmente permiten acreditar los hechos discutidos.
                            </p>
                        </div>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes antes de presentar una demanda laboral</h2>
                        <p className="text-gray-600 mb-4">Muchos trabajadores perjudican involuntariamente su propio caso.</p>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Dejar pasar los plazos legales", desc: "Los plazos laborales son breves y su vencimiento puede impedir cualquier reclamación." },
                                    { title: "Firmar documentos sin comprender sus efectos", desc: "Un finiquito mal firmado puede limitar las posibilidades de reclamar posteriormente." },
                                    { title: "Eliminar conversaciones o correos electrónicos", desc: "Las comunicaciones escritas son una prueba fundamental en cualquier reclamo laboral." },
                                    { title: "No guardar liquidaciones de sueldo", desc: "Las liquidaciones son clave para acreditar la remuneración y calcular indemnizaciones." },
                                    { title: "Confiar únicamente en acuerdos verbales", desc: "Lo que se dice verbalmente no siempre coincide con lo que después puede acreditarse." },
                                    { title: "Renunciar sin analizar previamente las consecuencias", desc: "Una renuncia puede limitar las acciones disponibles." },
                                    { title: "Intentar enfrentar el proceso sin asesoría cuando existen montos importantes involucrados", desc: "Un error en la estrategia puede afectar significativamente el resultado final." },
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
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo conviene consultar a un abogado laboral?</h2>
                        <p className="text-gray-600 mb-4">Es recomendable buscar asesoría cuando:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Recibiste una carta de despido",
                                "Consideras que el despido fue injustificado",
                                <span key="finiquito">No pagaron tu <Link to="/blog/como-calcular-tu-finiquito-chile-2026" className="text-green-700 underline hover:text-green-500">finiquito</Link> correctamente</span>,
                                "Existen cotizaciones previsionales impagas",
                                "Sufriste acoso laboral o sexual",
                                "Fueron vulnerados tus derechos fundamentales",
                                <span key="autodespido">Estás evaluando un <Link to="/blog/autodespido-chile-2026" className="text-green-700 underline hover:text-green-500">autodespido</Link></span>,
                                "Deseas presentar una demanda pero no sabes cuál corresponde",
                                "Tienes dudas sobre los plazos para demandar",
                                "El empleador ya cuenta con representación jurídica",
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-600 flex-shrink-0">•</span>
                                    <span className="text-gray-700 font-bold">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">En estos casos, una revisión temprana puede evitar errores que luego resulten difíciles de corregir.</p>
                    <InArticleCTA
                        title="¿Los plazos para demandar están por vencer?"
                        message="No dejes pasar los días hábiles para reclamar. Un abogado laboral puede revisar tu caso y ayudarte a decidir antes de que sea demasiado tarde."
                        buttonText="Habla con un abogado ahora"
                        category="Derecho Laboral"
                    />

                    </div>

                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Presentar una demanda laboral puede ser una herramienta efectiva para proteger los derechos de los trabajadores cuando existen incumplimientos por parte del empleador. Sin embargo, conocer las reglas generales no permite determinar automáticamente si una demanda será conveniente o cuáles son las probabilidades de éxito.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Factores como las pruebas disponibles, los plazos legales, la documentación existente y la estrategia procesal pueden modificar completamente el resultado de un juicio. Si enfrentas un conflicto laboral importante, recibir asesoría antes de tomar decisiones suele ser la mejor forma de proteger tus derechos. Puedes consultar con un{" "}
                            <Link to="/abogados-laborales" className="text-green-700 underline hover:text-green-500">abogado laboral en Chile</Link>{" "}
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

                    {/* ARTICULOS RELACIONADOS */}
                    <div className="mt-8 border-t pt-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Artículos relacionados</h3>
                        <div className="flex flex-wrap gap-3">
                            <Link
                                to="/blog/carta-de-despido-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Carta de despido en Chile 2026
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/despido-necesidades-empresa-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Despido por necesidades de la empresa
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/tutela-laboral-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Tutela laboral en Chile
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/acoso-laboral-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Acoso laboral en Chile
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/inspeccion-del-trabajo-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Inspección del Trabajo en Chile
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
                <div className="mt-8">
                    <BlogShare
                        title="Demanda laboral en Chile 2026"
                        url="https://legalup.cl/blog/demanda-laboral-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="demanda-laboral-chile-2026" />

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

            <BlogConversionPopup category="Derecho Laboral" topic="demanda-laboral" />
        </div>
    );
};

export default BlogArticle;