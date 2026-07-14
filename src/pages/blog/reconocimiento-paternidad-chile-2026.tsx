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
            question: "¿Qué es el reconocimiento de paternidad?",
            answer: "Es el acto mediante el cual se establece legalmente la relación entre un padre y su hijo, generando derechos y obligaciones como alimentos, herencia, identidad y relación directa y regular.",
        },
        {
            question: "¿Se puede obligar a un padre a reconocer a un hijo?",
            answer: "Sí. La madre, el hijo o el representante legal pueden iniciar una demanda de reclamación de paternidad para que el tribunal determine judicialmente la filiación.",
        },
        {
            question: "¿La prueba de ADN es obligatoria en estos casos?",
            answer: "Frecuentemente se utiliza y suele ser la prueba principal. Sin embargo, el tribunal puede valorar otros antecedentes como testigos o documentos si la prueba genética no es posible.",
        },
        {
            question: "¿Qué pasa si el padre se niega a realizarse la prueba de ADN?",
            answer: "El tribunal puede valorar dicha conducta al momento de resolver. La negativa injustificada no impide que el juez determine la filiación considerando otros medios de prueba.",
        },
        {
            question: "¿Un hijo adulto puede reclamar paternidad?",
            answer: "Sí. La mayoría de edad no impide ejercer acciones relacionadas con filiación. Muchas personas descubren su origen durante la adultez y pueden iniciar el procedimiento.",
        },
        {
            question: "¿El reconocimiento genera obligación de alimentos?",
            answer: "Sí. Una vez establecida la filiación, el padre puede ser obligado a contribuir económicamente al bienestar del hijo, con efectos retroactivos desde la demanda.",
        },
        {
            question: "¿También genera derechos hereditarios?",
            answer: "Sí. Los hijos reconocidos tienen derechos sucesorios respecto de sus padres, pudiendo heredar bienes y participar en la sucesión.",
        },
        {
            question: "¿Necesito abogado para reclamar paternidad?",
            answer: "Es altamente recomendable. Un abogado especializado en derecho de familia puede presentar correctamente la demanda, reunir pruebas y proteger tus derechos durante todo el proceso.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Reconocimiento de paternidad en Chile 2026: requisitos, demanda y procedimiento"
                description="Aprende cómo funciona el reconocimiento de paternidad en Chile, cuándo es voluntario, qué hacer si el padre no reconoce al hijo y cómo funciona la prueba de ADN."
                image="/assets/reconocimiento-paternidad-chile-2026.png"
                url="https://legalup.cl/blog/reconocimiento-paternidad-chile-2026"
                datePublished="2026-06-17"
                dateModified="2026-06-17"
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
                        Reconocimiento de paternidad en Chile 2026: cómo funciona, requisitos y qué hacer si el padre no reconoce al hijo (Guía Completa)
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "El reconocimiento puede ser voluntario (en el registro civil o escritura) o judicial",
                                "Si el padre se niega, se puede iniciar una demanda de reclamación de paternidad",
                                "La prueba de ADN es la evidencia más relevante en estos juicios",
                                "La filiación genera derechos a alimentos, herencia, identidad y relación directa y regular",
                                "El hijo mayor de edad también puede reclamar su paternidad",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        El reconocimiento de paternidad es uno de los procedimientos más importantes dentro del Derecho de Familia chileno. A través de este mecanismo se determina legalmente quién es el padre de un niño, permitiendo que el hijo acceda a derechos fundamentales como identidad, alimentos, herencia y vínculo jurídico con su familia paterna.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>17 de Junio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="reconocimiento-paternidad-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Reconocimiento de paternidad en Chile 2026"
                        url="https://legalup.cl/blog/reconocimiento-paternidad-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            Aunque muchas personas creen que la paternidad se determina automáticamente por el simple hecho biológico, la realidad es que la legislación exige mecanismos formales para que dicha relación produzca efectos legales.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Cuando el padre reconoce voluntariamente al hijo, el procedimiento suele ser simple. Sin embargo, cuando existe negativa, dudas respecto de la filiación o conflictos familiares, puede ser necesario iniciar una acción judicial para que los tribunales determinen la paternidad mediante pruebas biológicas y otros antecedentes.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía completa revisaremos cómo funciona el reconocimiento de paternidad en Chile durante 2026, cuáles son los derechos involucrados, qué ocurre cuando el padre se niega a reconocer al hijo y cómo se desarrolla el procedimiento judicial.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si ya tienes clara la situación y necesitas actuar, puedes consultar con un{" "}
                            <Link to="/abogado-pension-alimentos" className="text-green-700 underline hover:text-green-500">
                                abogado especialista en filiación y pensión de alimentos
                            </Link>{" "}
                            directamente online.
                        </p>
                    </div>

                    {/* QUE ES EL RECONOCIMIENTO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es el reconocimiento de paternidad?</h2>
                        <p className="text-gray-600 mb-4">
                            El reconocimiento de paternidad es el acto mediante el cual una persona declara legalmente ser padre de un hijo. Este reconocimiento genera una relación jurídica de filiación entre ambos.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Como consecuencia, nacen diversos derechos y obligaciones:
                        </p>

                        <InArticleCTA category="Derecho de Familia" />

                        <div className="grid sm:grid-cols-2 gap-2">
                            {["Derecho a alimentos", "Derechos hereditarios", "Derechos de identidad", "Relación directa y regular", "Derechos sucesorios", "Obligaciones parentales"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">La filiación no solo tiene consecuencias emocionales o familiares. También produce efectos legales importantes durante toda la vida.</p>
                        <p className="text-gray-600 mt-4">Un punto que suele pasar inadvertido es que no todos los reconocimientos producen los mismos efectos jurídicos. La filiación derivada de un reconocimiento voluntario puede ser cuestionada judicialmente si se acredita que no se ajusta a la realidad biológica, mientras que la filiación establecida por sentencia firme tiene un régimen de impugnación más restringido. Esta diferencia es relevante al evaluar la estabilidad del vínculo filiativo en el tiempo.</p>
                    </div>

                    {/* POR QUE ES IMPORTANTE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Por qué es importante el reconocimiento?</h2>
                        <p className="text-gray-600 mb-4">El reconocimiento permite que el hijo tenga una identidad jurídica completa y garantiza el acceso a múltiples derechos.</p>
                        <div className="space-y-3">
                            <div className="bg-blue-50 p-4 rounded-xl">
                                <h3 className="font-bold text-blue-900">Derecho a conocer su origen</h3>
                                <p className="text-blue-800">Toda persona tiene derecho a conocer su identidad y filiación.</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-xl">
                                <h3 className="font-bold text-blue-900">Derecho a recibir alimentos</h3>
                                <p className="text-blue-800">Una vez establecida la filiación, el padre puede ser obligado a contribuir económicamente al bienestar del hijo.</p>
                                <p className="text-blue-700 text-sm mt-1">Si deseas profundizar, revisa nuestra guía sobre <Link to="/blog/pension-alimentos-chile-2026" className="underline">Pensión de alimentos en Chile</Link>.</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-xl">
                                <h3 className="font-bold text-blue-900">Derecho a heredar</h3>
                                <p className="text-blue-800">Los hijos reconocidos tienen derechos hereditarios respecto de sus padres.</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-xl">
                                <h3 className="font-bold text-blue-900">Derecho a mantener relaciones familiares</h3>
                                <p className="text-blue-800">La filiación también genera derechos relacionados con cuidado personal, relación directa y regular, y participación en decisiones importantes.</p>
                            </div>
                        </div>
                    </div>

                    {/* COMO SE PUEDE RECONOCER */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo se puede reconocer a un hijo?</h2>
                        <p className="text-gray-600 mb-4">Existen diversas formas.</p>
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Reconocimiento al momento de la inscripción de nacimiento</h3>
                                <p className="text-gray-600">Es la situación más común. Cuando el padre comparece al momento de la inscripción, puede reconocer inmediatamente al hijo. Este reconocimiento produce efectos legales desde ese momento.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Reconocimiento posterior</h3>
                                <p className="text-gray-600">También es posible reconocer al hijo con posterioridad: años después del nacimiento, durante la infancia, la adolescencia, o incluso cuando el hijo ya es adulto.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Reconocimiento mediante escritura pública</h3>
                                <p className="text-gray-600">La ley permite formalizar el reconocimiento mediante instrumentos legales específicos.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Reconocimiento judicial</h3>
                                <p className="text-gray-600">Cuando existe conflicto o negativa, puede intervenir el tribunal para determinar la filiación.</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">Sin embargo, no todo reconocimiento formal es definitivo. Si se otorga mediante escritura pública o por acta ante el Registro Civil sin que el hijo haya prestado consentimiento (tratándose de un mayor de edad), la validez del acto puede ser discutida. Además, cuando el reconocimiento se realiza bajo error, dolo o violencia, podría eventualmente impugnarse, aunque las causales y plazos difieren de los aplicables a la impugnación de paternidad propiamente tal.</p>
                    </div>

                    {/* QUE OCURRE SI EL PADRE NO QUIERE RECONOCER */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si el padre no quiere reconocer al hijo?</h2>
                        <p className="text-gray-600 mb-4">
                            Esta es una de las situaciones más frecuentes. La negativa del padre no impide necesariamente que se determine la filiación. La madre, el hijo o quienes tengan legitimación legal pueden iniciar una acción judicial destinada a establecer la paternidad.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="font-bold text-red-800">Solución</p>
                            <p className="text-red-700">En estos casos será el tribunal quien determine la existencia del vínculo biológico y jurídico mediante una demanda de reclamación de paternidad.</p>
                        </div>
                    </div>

                    {/* QUIEN PUEDE SOLICITAR EL RECONOCIMIENTO JUDICIAL */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Quién puede solicitar el reconocimiento judicial?</h2>
                        <p className="text-gray-600 mb-4">Dependiendo del caso, pueden hacerlo:</p>
                        <ul className="space-y-2">
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> La madre</li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> El hijo</li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> El representante legal del niño, niña o adolecente</li>
                            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Otras personas autorizadas por la ley</li>
                        </ul>
                        <p className="text-gray-600 mt-4">El objetivo será obtener una sentencia que declare la filiación correspondiente.</p>
                    </div>

                    {/* DEMANDA DE RECLAMACION DE PATERNIDAD */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo funciona la demanda de reclamación de paternidad?</h2>
                        <p className="text-gray-600 mb-4">Cuando no existe reconocimiento voluntario, normalmente debe iniciarse una acción judicial.</p>
                        <div className="space-y-4">
                            {[
                                { step: "Paso 1: Presentación de la demanda", desc: "Se presenta una demanda ante el Tribunal de Familia competente solicitando que el tribunal declare judicialmente la paternidad." },
                                { step: "Paso 2: Notificación", desc: "La persona demandada será informada formalmente del procedimiento." },
                                { step: "Paso 3: Prueba biológica", desc: "En la mayoría de los casos se solicitará una prueba genética (ADN)." },
                                { step: "Paso 4: Audiencia", desc: "El tribunal analizará los antecedentes presentados." },
                                { step: "Paso 5: Sentencia", desc: "Finalmente el juez determinará si existe o no filiación." },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                                    {/* <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">{i + 1}</div> */}
                                    <div>
                                        <h3 className="font-bold text-gray-900">{item.step}</h3>
                                        <p className="text-gray-600">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* PRUEBA DE ADN */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es la prueba de ADN?</h2>
                        <p className="text-gray-600 mb-4">
                            La prueba genética constituye el medio probatorio más relevante en este tipo de procedimientos. Permite comparar muestras biológicas para determinar la existencia de vínculo biológico. Actualmente la prueba de ADN posee niveles extremadamente altos de precisión, por lo que suele transformarse en la evidencia central dentro de los juicios de filiación.
                        </p>
                        <div className="bg-yellow-50 p-5 rounded-xl">
                            <div className="flex items-center gap-2">
                                <Dna className="h-5 w-5 text-yellow-800" />
                                <p className="font-bold text-yellow-800">Precisión de la prueba de ADN</p>
                            </div>
                            <p className="text-yellow-700">La prueba de ADN tiene una precisión superior al 99,99%, lo que la convierte en la evidencia más confiable para determinar la filiación biológica.</p>
                        </div>
                    </div>

                    {/* NEGATIVA DEL DEMANDADO A REALIZARSE LA PRUEBA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si el demandado se niega a realizarse la prueba de ADN?</h2>
                        <p className="text-gray-600 mb-4">
                            Una de las dudas más frecuentes es qué ocurre cuando el supuesto padre rechaza participar en el examen. La negativa no necesariamente impide el avance del juicio. Los tribunales pueden valorar dicha conducta al momento de resolver. La ley contempla mecanismos destinados a evitar que la negativa injustificada impida determinar la verdad biológica.
                        </p>
                    </div>

                    {/* ¿LA PRUEBA DE ADN SIEMPRE ES NECESARIA? */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿La prueba de ADN siempre es necesaria?</h2>
                        <p className="text-gray-600 mb-4">No siempre. Aunque suele ser la prueba más importante, el tribunal puede analizar otros antecedentes como testigos, documentos, comunicaciones, fotografías o antecedentes familiares. Sin embargo, en la práctica la prueba genética suele tener un peso determinante.</p>
                    </div>

                    {/* DERECHOS DEL HIJO UNA VEZ RECONOCIDA LA PATERNIDAD */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué derechos obtiene el hijo una vez reconocida la paternidad?</h2>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {[
                                { title: "Derecho a alimentos", desc: "El padre puede ser obligado a contribuir económicamente." },
                                { title: "Derechos hereditarios", desc: "El hijo adquiere derechos sucesorios respecto del padre." },
                                { title: "Derecho a usar apellidos", desc: "Dependiendo del caso, podrán realizarse modificaciones registrales." },
                                { title: "Derecho a mantener relaciones familiares", desc: "Nacen derechos relacionados con visitas y vínculo familiar." },
                            ].map((item, i) => (
                                <div key={i} className="bg-green-50 p-4 rounded-xl">
                                    <h3 className="font-bold text-green-800">{item.title}</h3>
                                    <p className="text-green-700">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">La extensión de estos derechos puede generar conflictos prácticos relevantes. Por ejemplo, si el padre tiene otros hijos previamente reconocidos, la irrupción de un nuevo hijo puede alterar las cuotas hereditarias o la distribución de la pensión de alimentos. La determinación de la filiación no solo afecta la relación entre padre e hijo, sino que puede repercutir en derechos de terceros que ya tenían un vínculo jurídico consolidado.</p>
                    </div>



                    {/* RECLAMACIÓN DE PATERNIDAD SI EL HIJO ES ADULTO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Se puede reclamar la paternidad cuando el hijo ya es adulto?</h2>
                        <p className="text-gray-600 mb-4">
                            Sí. La mayoría de edad no impide ejercer acciones relacionadas con filiación. Muchas personas descubren información relevante sobre su origen durante la adultez. En estos casos puede iniciarse el procedimiento correspondiente.
                        </p>
                    </div>

                    {/* PLAZO PARA RECLAMAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Existe plazo para reclamar la paternidad?</h2>
                        <p className="text-gray-600">Las reglas varían según el tipo de acción y circunstancias específicas. Por ello resulta recomendable obtener asesoría jurídica especializada antes de iniciar cualquier procedimiento.</p>
                    </div>

                    {/* RECONOCIMIENTO Y PENSIÓN DE ALIMENTOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Reconocimiento de paternidad y pensión de alimentos</h2>
                        <p className="text-gray-600 mb-4">
                            Una de las consecuencias más importantes de la filiación es el nacimiento de obligaciones alimentarias. Una vez establecida la paternidad, el hijo puede solicitar alimentos cuando corresponda. Esto explica por qué numerosos procedimientos de filiación terminan vinculándose posteriormente con demandas de alimentos.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Si el hijo ya fue reconocido y el padre no cumple, un{" "}
                            <Link to="/abogado-pension-alimentos" className="text-green-700 underline hover:text-green-600">
                                abogado para cobrar pensión de alimentos tras reconocimiento de paternidad
                            </Link>{" "}
                            puede ayudarte a activar las medidas de apremio correspondientes.
                        </p>
                        <p className="text-gray-600">
                            Revisa nuestras guías sobre{" "}
                            <Link to="/blog/pension-alimentos-chile-2026" className="text-green-700 underline hover:text-green-600">pensión de alimentos</Link>,{" "}
                            <Link to="/blog/pension-alimentos-hijos-mayores-18-chile-2026" className="text-green-700 underline hover:text-green-600">pensión para mayores de 18 años</Link>{" "}
                            y{" "}
                            <Link to="/blog/deuda-pension-alimentos-chile-2026" className="text-green-700 underline hover:text-green-600">deuda de alimentos</Link>.
                        </p>
                    </div>

                    {/* RECONOCIMIENTO Y RÉGIMEN DE VISITAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Reconocimiento de paternidad y régimen de visitas</h2>
                        <p className="text-gray-600 mb-4">
                            La filiación también genera derechos relacionados con la relación directa y regular. Una vez reconocida la paternidad, pueden surgir solicitudes relacionadas con visitas, cuidado personal y participación parental. Por ello es habitual que distintos procedimientos familiares se relacionen entre sí.
                        </p>
                    </div>

                    {/* FALLECIMIENTO DEL PADRE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si el padre falleció?</h2>
                        <p className="text-gray-600">La muerte del supuesto padre no necesariamente impide ejercer acciones relacionadas con la filiación. Dependiendo de las circunstancias, pueden existir mecanismos judiciales para determinar la relación biológica y sus efectos legales. Este tipo de casos suele requerir un análisis jurídico más complejo.</p>
                    </div>

                    {/* DIFERENCIA ENTRE RECONOCIMIENTO E IMPUGNACIÓN */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Diferencia entre reconocimiento e impugnación de paternidad</h2>
                        <p className="text-gray-600 mb-4">
                            El reconocimiento busca establecer una filiación. La impugnación de paternidad busca cuestionar una filiación ya existente. Aunque ambas materias se relacionan, corresponden a procedimientos distintos. De hecho, la impugnación de paternidad será el siguiente tema dentro de nuestro cluster de Derecho de Familia.
                        </p>
                    </div>

                    {/* CASO PRÁCTICO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Caso práctico</h2>
                        <div className="bg-blue-50 p-6 rounded-2xl">
                            <p className="font-bold text-blue-800 mb-2">Carolina y su hija</p>
                            <p className="text-blue-700 mb-2">Carolina tuvo una hija en 2016. Durante años el padre biológico mantuvo contacto ocasional, pero nunca realizó un reconocimiento formal.</p>
                            <p className="text-blue-700 mb-2">Cuando la niña cumplió ocho años, Carolina decidió iniciar una acción judicial de reclamación de paternidad. El tribunal ordenó una prueba de ADN. Los resultados confirmaron la filiación.</p>
                            <p className="text-blue-700 mb-2">Posteriormente se dictó sentencia declarando la paternidad y se inició un procedimiento destinado a fijar pensión de alimentos. Gracias a ello la niña pudo acceder plenamente a los derechos derivados de la filiación.</p>
                        </div>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Esperar demasiado tiempo para consultar", desc: "Muchas personas desconocen sus derechos y postergan decisiones importantes." },
                                    { title: "Pensar que el reconocimiento solo sirve para obtener alimentos", desc: "La filiación genera múltiples efectos jurídicos, incluyendo herencia, identidad y relaciones familiares." },
                                    { title: "Creer que la negativa del padre impide el reconocimiento", desc: "Los tribunales pueden determinar judicialmente la paternidad mediante prueba de ADN." },
                                    { title: "No reunir antecedentes", desc: "Aunque exista ADN, toda evidencia adicional (mensajes, fotos, testigos) puede resultar útil." },
                                    { title: "Confundir reconocimiento con cuidado personal", desc: "Son instituciones distintas que producen efectos diferentes." },
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
                        <p className="text-gray-600 mb-4">Este artículo ofrece información general, pero hay momentos en que la consulta temprana con un abogado puede ser determinante:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Cuando el padre se niega a reconocer voluntariamente y es necesario evaluar la viabilidad de una demanda de reclamación de paternidad.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Si han transcurrido varios años desde el nacimiento y se requiere determinar si la acción está prescrita o si aún es posible ejercerla.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Cuando existen otros herederos o hijos previamente reconocidos que podrían verse afectados por el nuevo vínculo filiativo.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Si el supuesto padre ha fallecido y se necesita determinar si la acción puede dirigirse contra la sucesión.</span></li>
                        </ul>
                        <p className="text-gray-600 mt-4">En cada uno de estos escenarios, la asesoría jurídica especializada permite tomar decisiones informadas y evitar riesgos procesales.</p>
                    </div>

                    {/* CTA PRINCIPAL */}
                    <div className="mb-12">
                        <div className="bg-green-900 rounded-2xl p-8 text-center text-white">
                            <h3 className="text-2xl font-bold font-serif text-green-600 mb-3">¿Recibiste una negativa o tienes dudas sobre cómo reconocer a tu hijo?</h3>
                            <p className="text-white mb-6">El momento de consultar a un abogado es antes de presentar cualquier solicitud o demanda. Un especialista en derecho de familia puede evaluar los antecedentes, determinar la vía más adecuada (voluntaria o judicial) y preparar la estrategia probatoria incluyendo la prueba de ADN si fuera necesaria.</p>
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
                            El reconocimiento de paternidad es mucho más que un trámite administrativo. Se trata de un procedimiento fundamental para garantizar derechos esenciales relacionados con identidad, alimentos, herencia y relaciones familiares — derechos que existen independientemente de si el padre quiere reconocerlos o no.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Cuando existe reconocimiento voluntario, el proceso es simple y rápido. Cuando hay negativa o conflicto, los tribunales cuentan con herramientas eficaces — incluyendo la prueba de ADN y la valoración de la negativa injustificada — para determinar la filiación y proteger al hijo.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La información de este artículo tiene un carácter general y no constituye asesoría legal. Cada caso de reconocimiento de paternidad involucra plazos, medios de prueba y situaciones familiares distintas que solo un abogado puede evaluar en su contexto específico.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Si necesitas iniciar una demanda de paternidad o enfrentas una negativa, un{" "}
                            <Link to="/abogado-pension-alimentos" className="text-green-700 underline hover:text-green-500">
                                abogado de familia para demanda de paternidad en Chile
                            </Link>{" "}
                            puede analizar las particularidades de tu caso y recomendarte el mejor curso de acción.
                        </p>
                    </div>

                    <CategoryCTA category="familia" />

                    {/* FAQS */}

                    <div className="mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre reconocimiento de paternidad en Chile</h2>
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
                        title="Reconocimiento de paternidad en Chile 2026"
                        url="https://legalup.cl/blog/reconocimiento-paternidad-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="reconocimiento-paternidad-chile-2026" />

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
            <BlogConversionPopup category="Derecho de Familia" topic="reconocimiento-paternidad" />
        </div>
    );
};

export default BlogArticle;