import { Link } from "react-router-dom";
import {
    ArrowLeft,
    Calendar,
    User,
    Clock,
    ChevronRight,
    CheckCircle,
    AlertCircle,
    Dna,
    Scale,
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
            question: "¿Qué es una impugnación de paternidad?",
            answer: "Es una acción judicial destinada a cuestionar y eventualmente dejar sin efecto una filiación previamente establecida, cuando existen antecedentes que demuestran que la paternidad legal no corresponde a la realidad biológica.",
        },
        {
            question: "¿Necesito una prueba de ADN para impugnar?",
            answer: "En la mayoría de los casos constituye la prueba más importante y suele ser determinante para la resolución del tribunal, aunque no es el único medio de prueba disponible.",
        },
        {
            question: "¿Se puede impugnar una paternidad después de muchos años?",
            answer: "Sí, aunque la situación jurídica puede ser más compleja. El tribunal analizará el interés superior del niño, la estabilidad familiar y las circunstancias particulares del caso.",
        },
        {
            question: "¿Qué ocurre si el hijo ya es adulto?",
            answer: "La mayoría de edad no necesariamente impide este tipo de acciones. Muchos casos de impugnación surgen durante la adultez, cuando se descubren antecedentes que generan dudas.",
        },
        {
            question: "¿La sentencia de impugnación afecta la pensión de alimentos?",
            answer: "Puede producir consecuencias respecto de futuras obligaciones derivadas de la filiación. Sin embargo, la situación de las obligaciones pasadas debe analizarse caso a caso.",
        },
        {
            question: "¿La prueba genética modifica automáticamente la filiación?",
            answer: "No. Se requiere una resolución judicial que declare la impugnación. La prueba de ADN es un medio de prueba, no un acto que modifique automáticamente el estado civil.",
        },
        {
            question: "¿Se puede recuperar pensión de alimentos pagada anteriormente?",
            answer: "Dependerá de las circunstancias particulares del caso y de las decisiones judiciales. La recuperación de alimentos pagados no es automática y requiere análisis jurídico detallado.",
        },
        {
            question: "¿Necesito abogado para impugnar la paternidad?",
            answer: "Sí, es altamente recomendable debido a la complejidad técnica de este tipo de procedimientos. Un abogado especializado en derecho de familia puede guiar todo el proceso y proteger tus derechos.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Impugnación de paternidad en Chile 2026: requisitos, plazos y procedimiento"
                description="Aprende qué es la impugnación de paternidad en Chile, cuándo procede, quién puede solicitarla, cómo funciona la prueba de ADN y qué efectos produce una sentencia favorable."
                image="/assets/impugnacion-paternidad-chile-2026.png"
                url="https://legalup.cl/blog/impugnacion-paternidad-chile-2026"
                datePublished="2026-06-19"
                dateModified="2026-06-19"
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
                        Impugnación de paternidad en Chile 2026: cuándo procede, requisitos y cómo funciona el juicio (Guía Completa)
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "La impugnación busca dejar sin efecto una filiación previamente establecida",
                                "La prueba de ADN es el elemento probatorio más relevante en estos juicios",
                                "Puede solicitarla el padre legal, el hijo u otras personas autorizadas por la ley",
                                "El tribunal evalúa el interés superior del niño, la estabilidad familiar y la evidencia científica",
                                "Una sentencia favorable puede afectar apellidos, alimentos, herencia y derechos sucesorios",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        La filiación es uno de los vínculos jurídicos más importantes dentro del Derecho de Familia. A través de ella se establecen derechos y obligaciones fundamentales entre padres e hijos, incluyendo alimentos, herencia, cuidado personal y relación directa y regular.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>19 de Junio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="impugnacion-paternidad-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Impugnación de paternidad en Chile 2026"
                        url="https://legalup.cl/blog/impugnacion-paternidad-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            Sin embargo, existen situaciones donde una persona figura legalmente como padre de un hijo pese a que no existe vínculo biológico real. En otros casos, surgen dudas fundadas respecto de la filiación previamente establecida, generando conflictos familiares, emocionales y patrimoniales complejos.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Para estos casos existe la acción de impugnación de paternidad, un procedimiento judicial que permite cuestionar una filiación ya determinada y solicitar que el tribunal declare que una persona no es legalmente el padre de un hijo.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Se trata de una materia especialmente sensible, ya que no solo involucra aspectos biológicos, sino también la identidad del hijo, la estabilidad familiar y derechos fundamentales protegidos por la legislación chilena.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía completa revisaremos cómo funciona la impugnación de paternidad en Chile durante 2026, quién puede ejercer esta acción, qué pruebas son necesarias, cuáles son sus efectos legales y qué errores deben evitarse durante el proceso.
                        </p>
                    </div>

                    {/* QUE ES LA IMPUGNACION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es la impugnación de paternidad?</h2>
                        <p className="text-gray-600 mb-4">
                            La impugnación de paternidad es una acción judicial destinada a dejar sin efecto una filiación previamente establecida. En términos simples, busca que un tribunal declare que una persona que actualmente aparece legalmente como padre no lo es realmente.
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Finalidad</p>

                            <InArticleCTA category="Derecho de Familia" />

                            <p className="text-blue-800">Corregir una filiación que no corresponde a la realidad biológica o jurídica. Una sentencia favorable puede producir importantes consecuencias respecto de apellidos, alimentos, herencia y derechos sucesorios.</p>
                        </div>
                        <p className="text-gray-600 mt-4">Conviene precisar que esta acción no persigue simplemente un resultado biológico, sino que ataca la presunción legal de paternidad. Dependiendo de si la filiación proviene de un reconocimiento voluntario o de una sentencia judicial, las reglas procesales y los plazos para impugnar pueden variar significativamente, lo que marca una diferencia sustancial en la estrategia jurídica que corresponda adoptar.</p>
                    </div>

                    {/* CUANDO PUEDE EXISTIR UNA IMPUGNACION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo puede existir una impugnación de paternidad?</h2>
                        <p className="text-gray-600 mb-4">Las situaciones son variadas. Algunos ejemplos frecuentes incluyen:</p>
                        <div className="space-y-3">
                            {[
                                { title: "Error respecto de la filiación biológica", desc: "Una persona descubre años después que no es el padre biológico del hijo que reconoció." },
                                { title: "Reconocimiento basado en información falsa", desc: "Existen casos donde el reconocimiento ocurrió bajo circunstancias que posteriormente resultan incorrectas." },
                                { title: "Dudas fundadas sobre la paternidad", desc: "La aparición de antecedentes nuevos puede generar cuestionamientos legítimos respecto de la filiación." },
                                { title: "Resultados de pruebas genéticas", desc: "La evidencia científica suele ser uno de los principales motivos para iniciar este tipo de acciones." },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl">
                                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-bold text-gray-900">{item.title}</h3>
                                        <p className="text-gray-600">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">En la práctica, la carga de la prueba puede distribuirse de forma distinta según quién sea el demandante. Si quien impugna es el padre legal, este debe acreditar los antecedentes que demuestran que la filiación no se ajusta a la realidad. En cambio, si la acción la ejerce el hijo o un tercero legitimado, el tribunal puede valorar la prueba con criterios distintos, incluyendo la eventual negativa a someterse a una prueba genética como indicio en contra.</p>
                    </div>

                    {/* DIFERENCIA ENTRE RECONOCIMIENTO E IMPUGNACION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Diferencia entre reconocimiento e impugnación de paternidad</h2>
                        <p className="text-gray-600 mb-4">Es importante no confundir ambas instituciones.</p>
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="bg-green-50 p-5 rounded-xl">
                                <h3 className="font-bold text-green-800 text-lg mb-2">Reconocimiento de paternidad</h3>
                                <p className="text-green-700">Busca establecer una filiación. Por ejemplo, cuando un padre no ha reconocido a un hijo y se pretende determinar legalmente dicho vínculo.</p>
                                <p className="text-green-600 mt-2">Revisa nuestra guía sobre <Link to="/blog/reconocimiento-paternidad-chile-2026" className="underline">Reconocimiento de paternidad en Chile</Link>.</p>
                            </div>
                            <div className="bg-red-50 p-5 rounded-xl">
                                <h3 className="font-bold text-red-800 text-lg mb-2">Impugnación de paternidad</h3>
                                <p className="text-red-700">Busca eliminar una filiación ya existente. En este caso la relación jurídica ya está establecida y lo que se pretende es dejarla sin efecto.</p>
                            </div>
                        </div>
                    </div>

                    {/* QUIEN PUEDE SOLICITAR LA IMPUGNACION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Quién puede solicitar la impugnación?</h2>
                        <p className="text-gray-600 mb-4">La ley establece quiénes pueden ejercer esta acción. Dependiendo de las circunstancias, pueden existir distintas personas legitimadas para demandar.</p>
                        <ul className="space-y-2">
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> El padre legal</li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> El hijo</li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Personas especialmente autorizadas por la ley</li>
                        </ul>
                        <p className="text-gray-600 mt-4">La procedencia dependerá de cada situación concreta. Por esta razón es recomendable obtener asesoría jurídica antes de iniciar cualquier acción.</p>
                    </div>

                    {/* PRUEBA DE ADN */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿La prueba de ADN es obligatoria?</h2>
                        <p className="text-gray-600 mb-4">
                            En la práctica, la prueba genética suele transformarse en el elemento más importante del juicio. La razón es simple: permite determinar con un alto nivel de precisión si existe vínculo biológico entre las personas involucradas.
                        </p>
                        <div className="bg-yellow-50 p-5 rounded-xl">
                            <div className="flex items-center gap-2">
                                <Dna className="h-5 w-5 text-yellow-800" />
                                <p className="font-bold text-yellow-800">Precisión de la prueba de ADN</p>
                            </div>
                            <p className="text-yellow-700">Actualmente los exámenes genéticos presentan porcentajes de certeza extremadamente elevados, por lo que suelen tener un peso decisivo al momento de resolver.</p>
                        </div>
                        <p className="text-gray-600 mt-4">El procedimiento consiste en comparar muestras biológicas de las personas involucradas. Posteriormente un laboratorio especializado emite un informe técnico que puede confirmar o excluir la paternidad.</p>
                        <p className="text-gray-600 mt-4">Sin embargo, la prueba de ADN no es un requisito de procedencia de la acción. El tribunal puede resolver la impugnación con otros medios de prueba cuando la prueba genética no está disponible, por ejemplo, si alguna de las partes ha fallecido o se niega a participar. En esos escenarios, la valoración judicial se apoya en indicios, documentación y testimonios, y el estándar probatorio se vuelve considerablemente más exigente.</p>
                    </div>

                    {/* NEGATIVA A REALIZAR LA PRUEBA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si una persona se niega a realizar la prueba de ADN?</h2>
                        <p className="text-gray-600">La negativa injustificada no necesariamente impide que el procedimiento continúe. Los tribunales pueden considerar dicha conducta al momento de valorar la prueba disponible. Cada caso debe analizarse individualmente.</p>
                    </div>

                    {/* PROCEDIMIENTO JUDICIAL */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-6">¿Cómo funciona el juicio de impugnación de paternidad?</h2>
                        <div className="space-y-4">
                            {[
                                { step: "Paso 1: Presentación de la demanda", desc: "La parte interesada presenta una demanda ante el Tribunal de Familia competente, exponiendo los antecedentes que justifican la impugnación." },
                                { step: "Paso 2: Notificación", desc: "La demanda debe ser comunicada a las demás personas involucradas en el procedimiento." },
                                { step: "Paso 3: Producción de prueba", desc: "Durante esta etapa se presentan informes genéticos, testigos, documentos y otros antecedentes relevantes." },
                                { step: "Paso 4: Audiencia", desc: "El tribunal escucha a las partes y analiza la evidencia disponible en el caso." },
                                { step: "Paso 5: Sentencia", desc: "Finalmente el juez determina si corresponde mantener o dejar sin efecto la filiación existente." },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                                    {/* <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">{i + 1}</div> */}
                                    <div>
                                        <h3 className="font-bold text-gray-900">{item.step}</h3>
                                        <p className="text-gray-600">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* QUE EVALUA EL TRIBUNAL */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué evalúa el tribunal al resolver?</h2>
                        <p className="text-gray-600 mb-4">La decisión judicial no depende únicamente de una prueba genética. Los jueces también consideran otros elementos relevantes.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {[
                                { title: "Interés superior del niño", desc: "Toda decisión debe considerar las consecuencias para el hijo." },
                                { title: "Estabilidad familiar", desc: "La existencia de vínculos afectivos consolidados puede ser relevante." },
                                { title: "Evidencia científica", desc: "Los informes genéticos suelen tener gran importancia." },
                                { title: "Circunstancias particulares", desc: "Cada caso presenta características únicas que deben ser analizadas." },
                            ].map((item, i) => (
                                <div key={i} className="bg-gray-50 p-4 rounded-xl">
                                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                                    <p className="text-gray-600">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* IMPUGNACION DESPUES DE MUCHOS AÑOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Puede impugnarse una paternidad después de muchos años?</h2>
                        <p className="text-gray-600 mb-4">
                            Sí. Sin embargo, el análisis jurídico suele volverse más complejo cuando han transcurrido largos períodos de tiempo. En estos casos pueden existir consideraciones relacionadas con la identidad del hijo, la estabilidad familiar, el interés superior del niño y las normas especiales sobre filiación.
                        </p>
                        <div className="bg-blue-50 p-5 rounded-xl">
                            <p className="font-bold text-blue-900">Recomendación</p>
                            <p className="text-blue-800">Por ello resulta especialmente importante revisar el caso con un abogado especializado antes de iniciar cualquier acción.</p>
                        </div>
                    </div>

                    {/* HIJO ADULTO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si el hijo ya es adulto?</h2>
                        <p className="text-gray-600">La mayoría de edad no necesariamente impide la existencia de acciones relacionadas con la filiación. Existen numerosos casos donde los conflictos sobre paternidad aparecen durante la adultez. La evaluación dependerá de las circunstancias específicas y de las normas aplicables al caso concreto.</p>
                    </div>

                    {/* EFECTOS DE UNA SENTENCIA FAVORABLE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Efectos de una sentencia favorable</h2>
                        <p className="text-gray-600 mb-4">Cuando el tribunal acoge la impugnación, pueden producirse diversas consecuencias jurídicas.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {[
                                { title: "Modificación de la filiación", desc: "La relación jurídica previamente existente puede quedar sin efecto." },
                                { title: "Modificación registral", desc: "Dependiendo del caso, pueden realizarse cambios en registros oficiales." },
                                { title: "Consecuencias hereditarias", desc: "La sentencia puede influir sobre determinados derechos sucesorios." },
                                { title: "Consecuencias alimentarias futuras", desc: "La obligación alimentaria derivada de la filiación puede verse afectada." },
                            ].map((item, i) => (
                                <div key={i} className="bg-green-50 p-4 rounded-xl">
                                    <h3 className="font-bold text-green-800">{item.title}</h3>
                                    <p className="text-green-700">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* PENSIÓN DE ALIMENTOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre con la pensión de alimentos?</h2>
                        <p className="text-gray-600 mb-4">
                            Esta es una de las consultas más frecuentes. Si la filiación constituye el fundamento de la obligación alimentaria, una sentencia favorable puede producir efectos relevantes respecto de futuras obligaciones. Sin embargo, cada caso debe analizarse individualmente. Las consecuencias concretas dependerán de múltiples factores jurídicos.
                        </p>
                        <p className="text-gray-600">
                            Revisa nuestras guías sobre{" "}
                            <Link to="/blog/pension-alimentos-chile-2026" className="text-green-700 underline">pensión de alimentos en Chile</Link>,{" "}
                            <Link to="/blog/deuda-pension-alimentos-chile-2026" className="text-green-700 underline">deuda de pensión de alimentos</Link>{" "}
                            y{" "}
                            <Link to="/blog/pension-alimentos-hijos-mayores-18-chile-2026" className="text-green-700 underline">pensión para mayores de 18 años</Link>.
                        </p>
                    </div>

                    {/* RECUPERACIÓN DE ALIMENTOS PAGADOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Se pueden recuperar alimentos pagados anteriormente?</h2>
                        <p className="text-gray-600 mb-4">
                            Muchas personas creen que si la impugnación prospera podrán recuperar automáticamente todas las pensiones pagadas durante años. La realidad jurídica suele ser bastante más compleja. La respuesta dependerá de las circunstancias específicas y de las decisiones judiciales adoptadas.
                        </p>
                        <div className="bg-yellow-50 p-5 rounded-xl">
                            <p className="font-bold text-yellow-800">Advertencia</p>
                            <p className="text-yellow-700">Por ello es importante recibir asesoría profesional antes de asumir consecuencias económicas determinadas.</p>
                        </div>
                    </div>

                    {/* OTRO PADRE BIOLÓGICO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si existe otro padre biológico?</h2>
                        <p className="text-gray-600">La impugnación de paternidad no siempre resuelve automáticamente la identidad del padre biológico. En algunos casos puede ser necesario iniciar procedimientos adicionales destinados a establecer una nueva filiación, como reconocimiento voluntario, acción de reclamación de paternidad o nuevos procedimientos judiciales.</p>
                    </div>

                    {/* IMPUGNACION Y HERENCIA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Impugnación de paternidad y herencia</h2>
                        <p className="text-gray-600">La filiación produce efectos hereditarios relevantes. Por ello las acciones relacionadas con paternidad suelen tener consecuencias patrimoniales importantes. Dependiendo del caso, una sentencia puede afectar la calidad de heredero, la participación sucesoria y los derechos hereditarios futuros.</p>
                    </div>



                    {/* CASO PRÁCTICO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Caso práctico</h2>
                        <div className="bg-blue-50 p-6 rounded-2xl">
                            <p className="font-bold text-blue-800 mb-2">Pedro y su hijo</p>
                            <p className="text-blue-700 mb-2">Pedro reconoció voluntariamente a un hijo cuando tenía 25 años. Durante más de una década ejerció como padre y cumplió sus obligaciones legales.</p>
                            <p className="text-blue-700 mb-2">Años después obtuvo antecedentes que generaron dudas fundadas respecto de la filiación biológica. Tras iniciar el procedimiento correspondiente, el tribunal ordenó una prueba genética.</p>
                            <p className="text-blue-700 mb-2">Los resultados descartaron la existencia de vínculo biológico. Posteriormente el juez analizó todos los antecedentes del caso y dictó una resolución conforme a las reglas aplicables en materia de filiación.</p>
                        </div>
                    </div>

                    {/* SITUACIONES DE MAYOR CONFLICTO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Situaciones donde suele existir mayor conflicto</h2>
                        <div className="space-y-3">
                            {["Separaciones conflictivas", "Procesos hereditarios", "Demandas de alimentos", "Descubrimientos tardíos por avances tecnológicos"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Actuar únicamente por sospechas", desc: "Las sospechas no siempre son suficientes para sostener una acción judicial. Se requiere evidencia seria." },
                                    { title: "No obtener asesoría especializada", desc: "La filiación es una materia técnicamente compleja que requiere conocimiento jurídico profundo." },
                                    { title: "Confundir ADN con sentencia judicial", desc: "Una prueba genética por sí sola no modifica registros ni produce automáticamente efectos legales." },
                                    { title: "Ignorar los efectos familiares del procedimiento", desc: "Las consecuencias emocionales pueden ser significativas para todas las partes involucradas." },
                                    { title: "Esperar demasiado tiempo para consultar", desc: "Mientras antes se analice la situación, mayores serán las alternativas disponibles." },
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
                        <p className="text-gray-600 mb-4">Aunque este artículo entrega información general sobre la impugnación de paternidad, existen escenarios donde la asesoría jurídica resulta particularmente urgente:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Cuando el padre legal recibe una demanda de reclamación de filiación y necesita preparar su defensa antes de la audiencia preparatoria.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Si existen procesos paralelos de pensión de alimentos o relación directa y regular que dependen de la filiación actual.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Cuando se avecina una partición de herencia y la filiación del hijo puede afectar la masa hereditaria.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Si han transcurrido varios años desde el reconocimiento y el plazo para impugnar podría estar vencido según la causal invocada.</span></li>
                        </ul>
                        <p className="text-gray-600 mt-4">Cada caso tiene particularidades que pueden modificar el análisis jurídico. La revisión temprana con un abogado permite identificar la estrategia más adecuada y evitar la pérdida de plazos o derechos.</p>
                    </div>

                    {/* RELACIÓN CON OTRAS MATERIAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Relación con otras materias de Derecho de Familia</h2>
                        <p className="text-gray-600 mb-4">Los conflictos de filiación suelen relacionarse con otros procedimientos familiares importantes.</p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { label: "Reconocimiento de paternidad", to: "/blog/reconocimiento-paternidad-chile-2026" },
                                { label: "Pensión de alimentos", to: "/blog/pension-alimentos-chile-2026" },
                                { label: "Cuidado personal", to: "/blog/cuidado-personal-hijos-chile-2026" },
                                { label: "Relación directa y regular", to: "/blog/regimen-de-visitas-chile-2026" },
                                { label: "Autorización para salir del país con menores", to: "/blog/autorizacion-salir-pais-menores-chile-2026" }
                            ].map((item, i) => (
                                <Link key={i} to={item.to} className="text-green-700 underline hover:text-green-500">{item.label}</Link>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Por ello resulta frecuente que varias materias deban abordarse simultáneamente.</p>
                    </div>

                    {/* CTA PRINCIPAL */}
                    <div className="mb-12">
                        <div className="bg-green-900 rounded-2xl p-8 text-center text-white">
                            <h3 className="text-2xl text-green-600 font-bold font-serif mb-3">Revisa tu caso con un abogado de familia antes de iniciar cualquier gestión</h3>
                            <p className="text-white mb-6">Si estás pensando en impugnar una paternidad o recibiste una notificación que cuestiona la filiación actual, el momento de consultar es antes de presentar cualquier escrito o responder ante el tribunal. Un abogado especializado puede evaluar los antecedentes, verificar los plazos aplicables y definir si la acción tiene viabilidad procesal.</p>
                            <Link
                                to="/abogado-pension-alimentos"
                                className="inline-block bg-white text-green-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                Ver abogados especializados en familia
                            </Link>
                        </div>
                    </div>

                    {/* CONCLUSION */}

                    <RelatedLawyers category="Derecho de Familia" />

                    <div className="mb-12 border-t pt-8">

                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La impugnación de paternidad es una de las acciones más relevantes y sensibles dentro del Derecho de Familia chileno. A través de este procedimiento es posible cuestionar una filiación previamente establecida cuando existen antecedentes que justifican dicha revisión.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Las consecuencias son profundas y permanentes — afectan la identidad legal del hijo, las obligaciones alimenticias, los derechos hereditarios y el vínculo familiar en su conjunto. Por eso el tribunal no solo considera la prueba genética, sino también el interés superior del niño y las circunstancias particulares de cada familia antes de resolver.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Un resultado positivo en una prueba de ADN no modifica automáticamente la filiación — se requiere una sentencia judicial. Y esa sentencia puede tener efectos que van mucho más allá de lo que inicialmente se anticipa.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La información contenida en este artículo tiene un carácter general y no constituye asesoría legal. Cada caso de impugnación de paternidad presenta particularidades que solo un abogado puede evaluar después de revisar los antecedentes específicos, los plazos transcurridos y la situación familiar concreta.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Si te encuentras ante una situación donde la filiación está siendo cuestionada o necesitas iniciar una acción, un{" "}
                            <Link to="/abogado-pension-alimentos" className="text-green-700 underline hover:text-green-500">
                                abogado de familia especializado en impugnación de paternidad
                            </Link>{" "}
                            puede analizar tu caso particular y recomendar el curso de acción más adecuado según tus circunstancias.
                        </p>
                    </div>

                    <CategoryCTA category="familia" />

                    {/* FAQS */}

                    <div className="mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre impugnación de paternidad en Chile</h2>
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
                        title="Impugnación de paternidad en Chile 2026"
                        url="https://legalup.cl/blog/impugnacion-paternidad-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="impugnacion-paternidad-chile-2026" />

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
            <BlogConversionPopup category="Derecho de Familia" topic="impugnacion-paternidad" />
        </div>
    );
};

export default BlogArticle;