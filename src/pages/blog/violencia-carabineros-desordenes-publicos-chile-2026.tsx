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
            question: "¿Ser detenido significa que seré condenado?",
            answer: "No. La detención únicamente permite iniciar o continuar una investigación. La responsabilidad penal solo puede establecerse mediante el procedimiento correspondiente y respetando el debido proceso.",
        },
        {
            question: "¿Puedo quedar libre después del control de detención?",
            answer: "Sí. Dependiendo de las circunstancias del caso, el tribunal puede decretar distintas medidas cautelares o incluso dejar al imputado sin medidas mientras continúa la investigación.",
        },
        {
            question: "¿Es obligatorio declarar ante Carabineros?",
            answer: "Toda persona tiene derecho a guardar silencio y a recibir asistencia de un abogado antes de prestar declaración.",
        },
        {
            question: "¿Qué pasa si la detención fue ilegal?",
            answer: "La defensa puede plantear esa situación durante la audiencia de control de detención para que el tribunal evalúe la legalidad del procedimiento.",
        },
        {
            question: "¿Cuánto dura una investigación penal?",
            answer: "Depende de la complejidad del caso. Algunas investigaciones concluyen en pocos meses, mientras que otras pueden extenderse por un período mayor conforme a los plazos fijados por el tribunal.",
        },
        {
            question: "¿Qué diferencia existe entre una detención y una condena?",
            answer: "La detención es una medida inicial dentro de una investigación. La condena solo puede dictarse después del procedimiento judicial correspondiente.",
        },
        {
            question: "¿Dónde puedo obtener ayuda jurídica?",
            answer: "Si enfrentas una investigación penal o un familiar fue detenido, es recomendable buscar asesoría profesional lo antes posible para conocer tus derechos y preparar adecuadamente la defensa.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Violencia contra Carabineros y desórdenes públicos en Chile 2026: qué hacer si fuiste detenido"
                description="Aprende qué son los desórdenes públicos y la violencia contra Carabineros en Chile, qué hacer si fuiste detenido, tus derechos y cómo funciona el control de detención."
                image="/assets/violencia-contra-carabineros-desordenes-publicos-chile-2026.png"
                url="https://legalup.cl/blog/violencia-carabineros-desordenes-publicos-chile-2026"
                datePublished="2026-07-03"
                dateModified="2026-07-03"
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
                        Violencia contra Carabineros y desórdenes públicos en Chile 2026: qué hacer si fuiste detenido
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "Los delitos de desórdenes públicos y violencia contra Carabineros pueden investigarse cuando existen antecedentes que los justifiquen",
                                "Una detención debe ser revisada posteriormente por un juez mediante el control de detención",
                                "Ser detenido durante una manifestación no significa automáticamente que exista responsabilidad penal",
                                "La Fiscalía debe acreditar la participación del imputado conforme a las reglas del proceso penal",
                                "Contar con un abogado penalista desde las primeras horas puede ser fundamental para proteger tus derechos",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Las manifestaciones públicas, marchas y reuniones masivas pueden terminar con personas detenidas por distintos motivos. En muchos casos la detención se relaciona con denuncias por desórdenes públicos, daños, lesiones o incluso por presuntas agresiones contra funcionarios policiales.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>3 de Julio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="violencia-contra-carabineros-desordenes-publicos-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Violencia contra Carabineros y desórdenes públicos en Chile 2026"
                        url="https://legalup.cl/blog/violencia-carabineros-desordenes-publicos-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            Después de una detención suelen aparecer muchas dudas: ¿Qué significa quedar detenido? ¿Puedo quedar preso? ¿Qué pasa en el control de detención? ¿Qué ocurre si me acusan de violencia contra Carabineros? ¿Qué pruebas necesita la Fiscalía?
                        </p>
                        <p className="text-gray-600 mt-4">
                            La respuesta depende siempre de las circunstancias particulares del caso, pero conocer cómo funciona el procedimiento penal puede ayudarte a comprender tus derechos y evitar errores durante las primeras horas de la investigación.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía actualizada para 2026 explicamos cómo funcionan estos delitos, qué ocurre después de una detención y cuáles son las principales etapas del proceso penal chileno.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando una situación penal, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/control-de-detencion-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                control de detención en Chile
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
                                to="/blog/robo-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                robo en Chile
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/lesiones-leves-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                lesiones leves en Chile
                            </Link>{" "}
                            y{" "}
                            <Link
                                to="/blog/constancia-por-amenazas-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                constancia por amenazas
                            </Link>.
                        </p>
                    </div>

                    {/* QUE SON LOS DESORDENES PUBLICOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué son los desórdenes públicos?</h2>
                        <p className="text-gray-600 mb-4">
                            Los desórdenes públicos corresponden a conductas que pueden afectar el orden público y cuya investigación dependerá de los hechos concretos ocurridos.
                        </p>
                        <p className="text-gray-600 mb-4">
                            No toda manifestación constituye un delito. De hecho, la gran mayoría de las reuniones públicas se desarrollan sin consecuencias penales.
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">
                                Sin embargo, cuando durante una manifestación ocurren hechos como daños, barricadas, lanzamiento de objetos o agresiones, la Fiscalía puede iniciar una investigación para determinar la eventual responsabilidad de las personas involucradas. Cada caso debe analizarse según las pruebas disponibles.
                            </p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                La descripción anterior define los desórdenes públicos en términos generales. En un caso concreto, la Fiscalía debe acreditar que la persona participó de manera activa en los hechos y no que estuvo presente en el lugar. Esa diferencia —entre asistir a una manifestación y participar en actos específicos— es determinante para la imputación.
                            </p>
                        </div>
                    </div>

                    {/* VIOLENCIA CONTRA CARABINEROS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué significa una denuncia por violencia contra Carabineros?</h2>
                        <p className="text-gray-600 mb-4">
                            En algunos procedimientos policiales puede denunciarse que una persona agredió física o materialmente a funcionarios policiales mientras estos ejercían sus funciones.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Cuando ello ocurre, la Fiscalía normalmente inicia una investigación para determinar: si existió realmente la agresión; quién habría participado; qué pruebas existen; cuál sería la eventual calificación jurídica.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">Es importante recordar que toda investigación debe respetar la presunción de inocencia. La sola denuncia no basta para acreditar responsabilidad penal.</p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                La afirmación anterior es correcta en teoría. En la práctica, una denuncia de Carabineros suele tener peso probatorio inicial, por lo que la defensa debe preparar los antecedentes para impugnar esa versión. La diferencia entre una denuncia y una condena depende de lo que las pruebas logren acreditar durante la investigación.
                            </p>
                        </div>
                    </div>

                    {/* CUANDO PUEDE PRODUCIRSE DETENCION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo puede producirse una detención?</h2>
                        <p className="text-gray-600 mb-4">Dependiendo de las circunstancias, Carabineros puede practicar una detención cuando concurren los requisitos establecidos por la ley.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Flagrancia", "Cumplimiento de una orden judicial", "Otros casos expresamente previstos por la legislación"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-gray-500">•</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Posteriormente será el juez quien revisará la legalidad de esa actuación mediante la audiencia correspondiente.</p>
                    </div>

                    {/* QUE PASA DESPUES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa después de ser detenido?</h2>
                        <p className="text-gray-600 mb-4">
                            Una vez realizada la detención, la persona es puesta a disposición del Ministerio Público. La Fiscalía revisa los antecedentes disponibles y decide si solicitará la formalización de la investigación durante la audiencia de control de detención.
                        </p>
                        <div className="bg-green-50 p-5 rounded-xl">
                            <p className="text-green-800">Mientras ello ocurre, el detenido mantiene todos sus derechos constitucionales.</p>
                        </div>
                    </div>

                    {/* DERECHOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Derechos de una persona detenida</h2>
                        <p className="text-gray-600 mb-4">Toda persona tiene derecho a:</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Guardar silencio", "Conocer el motivo de la detención", "Comunicarse con un abogado", "Ser presentada ante un juez", "Recibir un trato digno", "Ejercer plenamente su defensa"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Estos derechos existen cualquiera sea el delito investigado.</p>
                    </div>

                    {/* PRUEBAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pruebas utiliza normalmente la Fiscalía?</h2>
                        <p className="text-gray-600 mb-4">En investigaciones relacionadas con manifestaciones públicas suelen analizarse distintos medios probatorios.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Registros de cámaras corporales", "Cámaras municipales", "Grabaciones de teléfonos celulares", "Declaraciones de testigos", "Fotografías", "Informes policiales", "Peritajes", "Evidencia material"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-gray-500">•</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Será el tribunal quien posteriormente valore todas estas pruebas conforme a las reglas del proceso penal.</p>
                    </div>

                    {/* CONTROL DE DETENCION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre durante el control de detención?</h2>
                        <p className="text-gray-600 mb-4">
                            Toda persona detenida debe comparecer ante un juez para que éste revise la legalidad de la detención. Durante esta audiencia pueden discutirse materias como:
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            <li className="flex items-center gap-2">• Si la detención fue legal</li>
                            <li className="flex items-center gap-2">• Si la Fiscalía formalizará la investigación</li>
                            <li className="flex items-center gap-2">• Qué medidas cautelares solicitará el Ministerio Público</li>
                            <li className="flex items-center gap-2">• Cuál será el plazo de investigación</li>
                        </ul>
                        <p className="text-gray-600 mt-4">
                            Si quieres conocer esta audiencia en detalle, puedes revisar nuestra guía completa sobre{" "}
                            <Link to="/blog/control-de-detencion-chile-2026" className="text-green-700 underline">Control de detención en Chile 2026</Link>.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                El control de detención descrito sigue un procedimiento estándar, pero el resultado concreto depende de los antecedentes que la Fiscalía presente y de la preparación de la defensa. Dos personas detenidas en la misma manifestación pueden obtener medidas cautelares distintas según lo que logre acreditarse respecto de su participación.
                            </p>
                        </div>
                    </div>

                    {/* DECLARAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Es recomendable declarar inmediatamente?</h2>
                        <p className="text-gray-600 mb-4">
                            No necesariamente. Antes de prestar declaración resulta importante comprender exactamente qué hechos se investigan y cuáles son los antecedentes reunidos por la Fiscalía.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">En muchas ocasiones la estrategia de defensa comienza precisamente durante las primeras horas posteriores a la detención.</p>
                        </div>
                    </div>

                    {/* CTA IN-ARTICLE */}
                    <InArticleCTA
                        message="Si te detuvieron durante una manifestación, las primeras horas antes del control de detención definen tu estrategia de defensa. Después de formalizar, las decisiones del tribunal ya están tomadas."
                        buttonText="Habla con un abogado ahora"
                        category="Derecho Penal"
                    />

                    {/* MEDIDAS CAUTELARES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Medidas cautelares que puede solicitar la Fiscalía</h2>
                        <p className="text-gray-600 mb-4">
                            Si durante la audiencia de control de detención la Fiscalía formaliza la investigación, puede solicitar distintas medidas cautelares mientras continúa el proceso penal.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Estas medidas no constituyen una condena. Su objetivo es asegurar el correcto desarrollo de la investigación, proteger a las víctimas cuando corresponda y garantizar la comparecencia del imputado.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Firma periódica", "Prohibición de acercarse a determinadas personas", "Prohibición de salir del país", "Arraigo nacional", "Arresto domiciliario parcial o total", "Prisión preventiva (cuando concurren los requisitos legales)"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-gray-500">•</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">El juez analizará los antecedentes del caso y resolverá qué medida resulta proporcional según la gravedad de los hechos y los riesgos existentes.</p>
                    </div>

                    {/* PRISION PREVENTIVA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo puede decretarse prisión preventiva?</h2>
                        <p className="text-gray-600 mb-4">
                            La prisión preventiva es una de las medidas cautelares más intensas dentro del proceso penal chileno. No se aplica automáticamente por haber sido detenido ni por tratarse de una investigación relacionada con manifestaciones públicas.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Para decretarla, el tribunal debe evaluar si concurren los requisitos establecidos por la ley y escuchar tanto los argumentos de la Fiscalía como los de la defensa.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="text-red-800">En muchas investigaciones relacionadas con desórdenes públicos o presuntas agresiones contra funcionarios policiales, la discusión sobre la prisión preventiva suele ocupar un lugar importante durante la audiencia. Por ello resulta fundamental preparar adecuadamente la defensa desde las primeras horas.</p>
                        </div>
                    </div>

                    {/* DIFERENCIA ENTRE DELITOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Diferencia entre desórdenes públicos y otros delitos</h2>
                        <p className="text-gray-600 mb-4">
                            Durante una misma detención pueden investigarse distintos delitos de manera simultánea. Por ejemplo, una persona inicialmente detenida por desórdenes públicos también podría ser investigada por: daños a la propiedad, lesiones, amenazas, robo, hurto o porte de elementos prohibidos, según el caso.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">La calificación jurídica definitiva dependerá exclusivamente de los antecedentes reunidos durante la investigación. En algunos casos la Fiscalía modifica posteriormente la imputación inicial cuando aparecen nuevas pruebas. Por esa razón nunca debe asumirse que el delito informado al momento de la detención será necesariamente el mismo que llegue a juicio.</p>
                        </div>
                    </div>

                    {/* SIN PRUEBAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si finalmente no existen pruebas suficientes?</h2>
                        <p className="text-gray-600 mb-4">
                            Uno de los principios fundamentales del sistema penal chileno es la presunción de inocencia. Corresponde a la Fiscalía acreditar la existencia del delito y la participación del imputado.
                        </p>
                        <div className="bg-green-50 p-5 rounded-xl">
                            <p className="text-green-800">Si durante la investigación no se reúnen antecedentes suficientes, el procedimiento puede terminar sin condena. Cada caso depende de sus propias pruebas, declaraciones, registros audiovisuales y demás evidencia incorporada al expediente.</p>
                        </div>
                    </div>

                    {/* FAMILIAR DETENIDO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué hacer si un familiar fue detenido?</h2>
                        <p className="text-gray-600 mb-4">Cuando una persona cercana resulta detenida, es habitual que la familia no sepa qué hacer durante las primeras horas.</p>
                        <div className="space-y-2">
                            {["Mantener la calma y confirmar el lugar donde se encuentra la persona", "Obtener el RUT y nombre completo del detenido", "Averiguar en qué unidad policial permanece", "Reunir antecedentes que puedan ser útiles para la defensa", "Contactar cuanto antes a un abogado penalista"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Mientras antes pueda revisarse la causa, más posibilidades existen de preparar una estrategia adecuada para la audiencia.</p>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes después de una detención</h2>
                        <p className="text-gray-600 mb-4">Muchas personas, producto del nerviosismo, toman decisiones que terminan perjudicando su propia defensa.</p>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Declarar sin asesoría jurídica", desc: "Una declaración realizada sin conocer los antecedentes de la investigación puede generar contradicciones difíciles de corregir posteriormente." },
                                    { title: "Publicar información en redes sociales", desc: "Publicar fotografías, videos o comentarios sobre los hechos puede terminar siendo utilizado durante la investigación." },
                                    { title: "Eliminar conversaciones o archivos", desc: "La eliminación de evidencia puede complicar la defensa e incluso generar nuevos problemas procesales dependiendo del contexto." },
                                    { title: "Ignorar citaciones judiciales", desc: "Toda citación debe ser revisada cuidadosamente y cumplirse conforme a las instrucciones del tribunal." },
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

                    {/* CONDENA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si finalmente existe una condena?</h2>
                        <p className="text-gray-600 mb-4">Las consecuencias dependerán completamente del delito acreditado y de las circunstancias particulares del caso.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Multas", "Penas restrictivas de libertad", "Penas privativas de libertad cuando la legislación lo contempla", "Antecedentes penales", "Otras consecuencias establecidas por la ley"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-gray-500">•</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <div className="bg-amber-50 p-5 rounded-xl mt-4">
                            <p className="text-amber-800">No todas las investigaciones terminan en condena y no todas las condenas implican necesariamente el cumplimiento efectivo de una pena de cárcel. Cada procedimiento debe analizarse individualmente.</p>
                        </div>
                    </div>

                    {/* COMO AYUDA UN ABOGADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo puede ayudar un abogado penalista?</h2>
                        <p className="text-gray-600 mb-4">La intervención temprana de un abogado puede marcar una diferencia importante durante toda la investigación.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Revisar la legalidad de la detención", "Analizar la carpeta investigativa", "Participar en el control de detención", "Solicitar diligencias de investigación", "Preparar la estrategia de defensa", "Negociar eventuales salidas alternativas cuando la ley lo permita", "Representar al imputado durante todo el proceso"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Mientras antes intervenga la defensa, mayores serán las posibilidades de identificar problemas procesales o antecedentes favorables para el caso.</p>
                    </div>

                    {/* CUANDO CONSULTAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿En qué situaciones conviene consultar cuanto antes a un abogado penal?</h2>
                        <p className="text-gray-600 mb-4">Existen momentos específicos donde la asesoría legal urgente puede cambiar el curso del caso:</p>
                        <ul className="space-y-3 text-gray-600">
                            <li className="flex items-start gap-3">
                                <span className="text-green-600 font-bold mt-0.5">•</span>
                                <span>Inmediatamente después de una detención, antes de la audiencia de control de detención.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-green-600 font-bold mt-0.5">•</span>
                                <span>Cuando Carabineros levantó un parte o denuncia en tu contra y aún no has sido notificado formalmente.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-green-600 font-bold mt-0.5">•</span>
                                <span>Si la Fiscalía te citó a declarar como imputado y no sabes qué antecedentes existen en tu contra.</span>
                            </li>
                        </ul>
                    </div>

                    {/* CTA PRINCIPAL (antes de la conclusión) */}
                    <div className="mb-12">
                        <div className="bg-green-900 rounded-2xl p-8 text-center">
                            <h3 className="text-2xl font-bold mb-3 text-green-600 font-serif">¿Detuvieron a un familiar o a ti en una manifestación?</h3>
                            <p className="text-white mb-6">Las primeras horas antes de la audiencia de control de detención son el único momento para preparar una defensa efectiva. Después de la formalización, las decisiones del tribunal ya se adoptan sobre la base de los antecedentes presentados.</p>
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
                            Las investigaciones por desórdenes públicos o presunta violencia contra Carabineros pueden tener consecuencias importantes. Esta guía describe el procedimiento general y los derechos del detenido.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            La pregunta que queda abierta es cómo se aplican esas reglas a los hechos específicos de cada detención, qué pruebas existen y cómo la defensa puede impugnarlas. Esa respuesta depende de los antecedentes concretos. Si quieres revisar una situación particular, puedes consultar con un{" "}
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
                        title="Violencia contra Carabineros y desórdenes públicos en Chile 2026"
                        url="https://legalup.cl/blog/violencia-contra-carabineros-desordenes-publicos-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="violencia-contra-carabineros-desordenes-publicos-chile-2026" />

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