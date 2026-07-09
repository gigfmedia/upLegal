import { Link } from "react-router-dom";
import {
    ArrowLeft,
    Calendar,
    User,
    Clock,
    ChevronRight,
    AlertCircle,
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
            question: "¿La pensión termina automáticamente a los 18 años?",
            answer: "No. Cumplir 18 años no extingue automáticamente la obligación. Puede mantenerse hasta los 21 años o hasta los 28 si el hijo estudia.",
        },
        {
            question: "¿Hasta qué edad puede mantenerse la pensión?",
            answer: "Generalmente hasta los 21 años, o hasta los 28 años cuando el hijo cursa estudios superiores técnicos o universitarios.",
        },
        {
            question: "¿Qué pasa si el hijo estudia en la universidad?",
            answer: "La obligación puede mantenerse hasta los 28 años, siempre que exista regularidad académica y avance razonable en los estudios.",
        },
        {
            question: "¿Puedo dejar de pagar si abandonó los estudios?",
            answer: "No. Debes solicitar judicialmente el término de la pensión. Suspender pagos unilateralmente puede generar deuda.",
        },
        {
            question: "¿Qué ocurre si trabaja?",
            answer: "Dependerá de sus ingresos. Trabajos esporádicos no extinguen la pensión, pero un empleo estable con ingresos suficientes podría justificar el cese.",
        },
        {
            question: "¿Necesito abogado para solicitar el cese?",
            answer: "Es altamente recomendable. Un abogado de familia puede presentar correctamente la solicitud y reunir las pruebas necesarias.",
        },
        {
            question: "¿Las deudas desaparecen cuando cumple 18 años?",
            answer: "No. Las deudas acumuladas antes de la mayoría de edad siguen siendo exigibles incluso si el hijo ya es mayor.",
        },
        {
            question: "¿Puedo solicitar una rebaja en lugar del término?",
            answer: "Sí, cuando existen cambios en las circunstancias económicas o disminuyen las necesidades del hijo.",
        },
        {
            question: "¿Qué pasa si mi hijo cambia de carrera universitaria?",
            answer: "El cambio de carrera no extingue automáticamente la pensión de alimentos. El tribunal evaluará si los estudios continúan desarrollándose de manera seria y razonable antes de decidir si corresponde mantener o terminar la obligación."
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Pensión de alimentos para hijos mayores de 18 años en Chile 2026: hasta cuándo se paga y cuándo termina la obligación (Guía Completa)"
                description="Aprende hasta cuándo se debe pagar pensión de alimentos a hijos mayores de 18 años en Chile, cuándo termina la obligación, qué ocurre con estudiantes universitarios y cómo solicitar el cese o rebaja."
                image="/assets/pension-alimentos-hijos-mayores-18-chile-2026.png"
                url="https://legalup.cl/blog/pension-alimentos-hijos-mayores-18-chile-2026"
                datePublished="2026-06-16"
                dateModified="2026-06-16"
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
                        Pensión de alimentos para hijos mayores de 18 años en Chile 2026: hasta cuándo se paga y cuándo termina la obligación (Guía Completa)
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "La pensión NO termina automáticamente a los 18 años",
                                "Puede mantenerse hasta los 21 años sin necesidad de estudios",
                                "Si estudia en la universidad, puede extenderse hasta los 28 años",
                                "Suspender pagos sin autorización judicial genera deuda",
                                "El cese o rebaja debe solicitarse formalmente ante el Tribunal de Familia",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Una de las dudas más frecuentes después de que un hijo cumple 18 años es si la pensión de alimentos termina automáticamente o si el padre o madre obligado a pagar debe continuar realizando los pagos. Muchas personas creen que al alcanzar la mayoría de edad la obligación desaparece de inmediato. Sin embargo, la legislación chilena establece reglas distintas.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>16 de Junio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="pension-alimentos-mayores-18-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Pensión de alimentos para hijos mayores de 18 años en Chile 2026"
                        url="https://legalup.cl/blog/pension-alimentos-hijos-mayores-18-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            Esta situación suele generar conflictos familiares importantes. Algunos padres continúan pagando sin saber cuándo pueden solicitar el término de la obligación, mientras que otros suspenden unilateralmente los pagos pensando que la mayoría de edad pone fin automáticamente a la pensión, lo que puede generar deudas y acciones judiciales.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía completa revisaremos hasta cuándo se paga la pensión de alimentos en Chile, qué ocurre con los hijos universitarios, cuándo es posible solicitar el cese, cómo funciona el procedimiento judicial y cuáles son los errores más comunes que debes evitar.
                        </p>
                    </div>

                    {/* ¿LA PENSIÓN TERMINA A LOS 18? */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿La pensión de alimentos termina a los 18 años?</h2>
                        <p className="text-gray-600 mb-4">
                            <span className="font-bold text-gray-900">No.</span> Este es probablemente el error más común en materia de alimentos. Cumplir 18 años no significa automáticamente que la pensión termine. La ley chilena permite que los hijos continúen recibiendo alimentos después de alcanzar la mayoría de edad cuando se cumplen ciertos requisitos.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="font-bold text-red-800">Advertencia</p>
                            <p className="text-red-700">Dejar de pagar únicamente porque el hijo cumplió 18 años puede transformarse en un problema importante y generar deuda de alimentos.</p>
                        </div>
                        <p className="text-gray-600 mt-4">Para que proceda la extensión de la pensión más allá de los 18 años, el hijo debe carecer de medios para subsistir por sí mismo. Este concepto es más amplio que el simple desempleo: un hijo que trabaja puede seguir necesitando alimentos si sus ingresos son insuficientes para cubrir todas sus necesidades. La jurisprudencia ha interpretado que debe tratarse de una autosuficiencia real, no meramente formal, valorando cada caso según las circunstancias.</p>
                    </div>

                    {/* HASTA QUÉ EDAD */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Hasta qué edad se puede recibir pensión de alimentos?</h2>
                        <div className="grid sm:grid-cols-3 gap-4">
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-2">Hasta los 21 años</h3>
                                <p className="text-gray-600">El hijo puede exigir alimentos sin necesidad de estudiar, siempre que no tenga medios para mantenerse por sí mismo.</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-2">Hasta los 28 años</h3>
                                <p className="text-gray-600">Si el hijo estudia una carrera técnica, profesional o universitaria, la pensión puede extenderse hasta los 28 años.</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-2">Más allá de 28 años</h3>
                                <p className="text-gray-600">Excepcionalmente, por discapacidad o enfermedad grave, puede continuar indefinidamente.</p>
                            </div>
                        </div>
                    </div>

                    {/* ¿QUÉ SE ENTIENDE POR ALIMENTOS? */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué se entiende por alimentos?</h2>
                        <p className="text-gray-600 mb-4">La pensión de alimentos no se limita únicamente a entregar dinero. Legalmente busca cubrir necesidades esenciales del alimentario:</p>
                        <div className="grid sm:grid-cols-2 gap-2">
                            {["Alimentación", "Vivienda", "Educación", "Salud", "Vestuario", "Transporte", "Gastos básicos de desarrollo"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* HIJO ESTUDIA UNIVERSIDAD */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si el hijo estudia en la universidad?</h2>
                        <p className="text-gray-600 mb-4">
                            Cuando el hijo continúa estudios superiores, la pensión generalmente puede mantenerse hasta los 28 años. Sin embargo, no basta simplemente con estar matriculado. Los tribunales suelen evaluar la existencia efectiva de estudios, regularidad académica, avance razonable y necesidades económicas.
                        </p>
                        <div className="bg-blue-50 p-5 rounded-xl">
                            <p className="text-blue-800">La finalidad no es financiar indefinidamente estudios sin progreso, sino permitir una formación profesional real.</p>
                        </div>
                        <p className="text-gray-600 mt-4">La carga de acreditar la continuidad de los estudios recae inicialmente en quien solicita mantener la pensión. Sin embargo, una vez presentados los certificados de alumno regular, corresponde al obligado al pago demostrar que los estudios no se están realizando efectivamente o que el hijo cuenta con ingresos propios suficientes. Esta distribución probatoria es relevante al momento de decidir si se solicita el cese o se espera a que el tribunal resuelva.</p>
                    </div>

                    {/* HIJO TRABAJA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si el hijo trabaja?</h2>
                        <p className="text-gray-600 mb-4">Dependerá de las circunstancias. No todo trabajo implica automáticamente el término de la pensión.</p>
                        <span className="font-bold">Trabajos esporádicos:</span><br className="hidden sm:inline" /> Muchos estudiantes realizan trabajos temporales. Esto no necesariamente elimina la necesidad de alimentos.<br /><br />
                        <span className="font-bold">Trabajo permanente con ingresos suficientes:</span><br className="hidden sm:inline" /> Si el hijo cuenta con ingresos estables que le permiten mantenerse adecuadamente, podría existir fundamento para solicitar el cese.
                    </div>

                    {/* ABANDONO DE ESTUDIOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si el hijo abandona los estudios?</h2>
                        <p className="text-gray-600 mb-4">
                            Cuando la extensión de la pensión se justifica por estudios superiores, abandonar la carrera puede constituir un motivo relevante para solicitar el término de la obligación. Sin embargo, no basta con suspender unilateralmente los pagos. Es necesario obtener una resolución judicial.
                        </p>
                        <div className="bg-yellow-50 p-5 rounded-xl">
                            <p className="font-bold text-yellow-800">Punto fundamental</p>
                            <p className="text-yellow-700">Muchas personas dejan de pagar al enterarse de que el hijo abandonó la universidad y posteriormente enfrentan cobros por deuda de alimentos acumulada.</p>
                        </div>
                    </div>

                    {/* NUEVA SECCIÓN: CAMBIO DE CARRERA O DEMORA EN ESTUDIOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si el hijo cambia de carrera o se demora más de lo normal?</h2>
                        <p className="text-gray-600 mb-4">
                            Una situación frecuente ocurre cuando el hijo mayor de edad cambia de carrera, congela estudios o extiende significativamente el tiempo necesario para obtener un título profesional.
                        </p>
                        <p className="text-gray-600 mb-4">
                            En estos casos, la obligación de pagar pensión de alimentos no desaparece automáticamente. El tribunal analizará las circunstancias concretas y determinará si la continuidad de los estudios sigue justificando la mantención de la pensión.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Por ejemplo, un cambio de carrera durante los primeros años universitarios normalmente no será suficiente para extinguir el derecho a alimentos. Sin embargo, cuando existen abandonos reiterados, largos períodos sin estudiar o falta de avance académico durante varios años, el obligado al pago podría solicitar judicialmente el cese o una revisión de la pensión.
                        </p>
                        <div className="bg-blue-50 p-5 rounded-xl">
                            <p className="font-bold text-blue-900">¿Qué evalúa el juez?</p>
                            <p className="text-blue-800">Certificados de alumno regular, historial académico, duración efectiva de los estudios, situación económica de ambas partes, y siempre el principio de proporcionalidad y las necesidades reales del hijo.</p>
                        </div>
                        <p className="text-gray-600 mt-4">Cuando el hijo cambia de carrera o se demora más del tiempo habitual de titulación, el tribunal no aplica una regla automática. Se evalúa si existe un plan de estudios coherente, si ha habido cambios injustificados o si la demora responde a circunstancias objetivas como problemas de salud o falta de cupos. En casos de abandono reiterado, puede proceder el cese, pero cada periodo debe analizarse por separado, no siendo válido suspender pagos por un cambio que aisladamente podría considerarse razonable.</p>
                    </div>

                    <InArticleCTA
                        message="¿Necesitas ayuda con una pensión de alimentos para hijo mayor de edad? Un abogado especializado puede asesorarte sobre el cese, rebaja o continuidad de la obligación."
                        buttonText="Abogados especializados en alimentos"
                        category="Derecho de Familia"
                    />

                    {/* PENSIÓN TERMINA AUTOMÁTICAMENTE? */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿La pensión termina automáticamente a los 21 o 28 años?</h2>
                        <p className="text-gray-600">No siempre. Aunque el derecho pueda extinguirse legalmente al cumplirse ciertos requisitos, en la práctica suele ser necesario solicitar judicialmente el cese. Mientras exista una resolución vigente, es recomendable obtener una nueva resolución que declare terminada la obligación.</p>
                    </div>

                    {/* CÓMO SOLICITAR EL CESE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo solicitar el cese de pensión de alimentos?</h2>
                        <div className="space-y-4">
                            {[
                                { step: "Paso 1: Reunir antecedentes", desc: "Certificados de estudios, certificados de egreso, contratos de trabajo, liquidaciones de sueldo." },
                                { step: "Paso 2: Presentar la solicitud", desc: "Ante el Tribunal de Familia competente, con patrocinio de abogado." },
                                { step: "Paso 3: Audiencia", desc: "El tribunal escuchará a ambas partes y analizará la evidencia." },
                                { step: "Paso 4: Resolución", desc: "El juez determina si corresponde mantener, modificar o extinguir la obligación." },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                                    {/* <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">{i + 1}</div> */}
                                    <div>
                                        <h3 className="font-bold text-gray-900">{item.step}</h3>
                                        <p className="text-gray-600">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* REBAJA EN LUGAR DEL TÉRMINO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Se puede solicitar una rebaja en lugar del término?</h2>
                        <p className="text-gray-600 mb-4">
                            Sí. En algunos casos el hijo continúa teniendo derecho a alimentos, pero sus necesidades han disminuido (comenzó a trabajar parcialmente, recibe becas, disminuyeron gastos educacionales, cambió la situación económica del alimentante). En estos casos puede resultar más apropiado solicitar una rebaja.
                        </p>
                        <p className="text-gray-600">
                            Si deseas profundizar, revisa nuestra guía sobre{" "}
                            <Link to="/blog/rebaja-pension-alimentos-chile-2026" className="text-green-700 underline">Rebaja de pensión de alimentos en Chile</Link>.
                        </p>
                    </div>

                    {/* SUSPENDER PAGOS SIN AUTORIZACIÓN */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si dejo de pagar sin autorización judicial?</h2>
                        <p className="text-gray-600 mb-4">Es uno de los errores más graves. Mientras exista una resolución vigente, la obligación sigue produciendo efectos. Podrían generarse:</p>
                        <div className="grid sm:grid-cols-2 gap-2">
                            {["Deuda de alimentos", "Liquidaciones judiciales", "Retenciones", "Medidas de apremio", "Registro Nacional de Deudores"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-red-50 p-2 rounded-lg">
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">La recomendación siempre es obtener una resolución judicial antes de suspender pagos.</p>
                    </div>

                    {/* DEUDA DE ALIMENTOS Y MAYORES DE EDAD */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Deuda de alimentos y mayores de edad</h2>
                        <p className="text-gray-600 mb-4">
                            Muchas personas creen que una vez que el hijo cumple 18 años desaparecen automáticamente las deudas anteriores. Esto es incorrecto. Las deudas acumuladas siguen siendo exigibles. Incluso si el hijo ya es mayor de edad, los montos adeudados pueden continuar siendo cobrados.
                        </p>
                        <p className="text-gray-600">
                            Puedes revisar también nuestra guía sobre{" "}
                            <Link to="/blog/deuda-pension-alimentos-chile-2026" className="text-green-700 underline">Deuda de pensión de alimentos en Chile</Link>.
                        </p>
                    </div>

                    {/* QUIÉN RECIBE LA PENSIÓN DESPUÉS DE 18 */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Quién recibe la pensión después de los 18 años?</h2>
                        <p className="text-gray-600">Cuando el hijo alcanza la mayoría de edad pueden producirse cambios. En muchos casos el propio hijo mayor de edad pasa a ser titular del derecho. Por esta razón resulta importante revisar el expediente antes de modificar la forma de pago.</p>
                    </div>

                    {/* QUÉ EVALÚA EL TRIBUNAL */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué evalúa el tribunal para mantener la pensión?</h2>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Necesidades del hijo", "Capacidad económica del alimentante", "Continuidad y seriedad de los estudios", "Existencia de ingresos propios", "Estado de salud"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CASO PRÁCTICO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Caso práctico</h2>
                        <div className="bg-blue-50 p-6 rounded-2xl">
                            <p className="font-bold text-blue-800 mb-2">Carlos y su hijo universitario</p>
                            <p className="text-blue-700 mb-2">Carlos paga pensión de alimentos para su hijo desde que este tenía 10 años. Cuando el hijo cumple 18 años, Carlos decide dejar de pagar porque considera que la obligación terminó. Sin embargo, el hijo se encuentra cursando segundo año de universidad.</p>
                            <p className="text-blue-700 mb-2">La madre solicita una liquidación de deuda y el tribunal determina que la obligación seguía vigente. Como resultado, Carlos debe pagar los montos acumulados más los reajustes correspondientes.</p>
                            <p className="text-blue-700">Si hubiera solicitado oportunamente una revisión judicial, habría evitado el problema.</p>
                        </div>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Creer que los 18 años terminan automáticamente la pensión", desc: "Es el error más común y costoso." },
                                    { title: "Suspender pagos sin resolución judicial", desc: "Puede generar deuda importante y medidas de apremio." },
                                    { title: "No revisar si el hijo continúa estudiando", desc: "La continuidad de estudios puede extender la obligación hasta los 28 años." },
                                    { title: "No solicitar rebaja cuando corresponde", desc: "Muchas personas mantienen montos desactualizados durante años." },
                                    { title: "Ignorar cambios en la situación económica", desc: "Las circunstancias familiares evolucionan y pueden justificar modificaciones." },
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

                    {/* RELACIÓN CON OTRAS MATERIAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Relación con otras materias de familia</h2>
                        <p className="text-gray-600">Los conflictos sobre alimentos suelen aparecer junto a otras materias familiares relevantes como cuidado personal de hijos, relación directa y regular, incumplimiento de visitas, divorcio o violencia intrafamiliar. Por ello resulta frecuente que una misma familia tenga varios procedimientos relacionados simultáneamente.</p>
                    </div>

                    {/* CUANDO CONSULTAR A UN ABOGADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿En qué situaciones conviene consultar cuanto antes a un abogado de familia?</h2>
                        <p className="text-gray-600 mb-4">Este artículo ofrece un marco general, pero la asesoría oportuna puede marcar la diferencia en estos escenarios:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl"> font-bold
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Cuando el hijo está próximo a cumplir 18 años y se necesita anticipar si la obligación continuará o se extinguirá.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Si el hijo abandonó los estudios o cambió de carrera y se quiere solicitar el cese de la pensión judicialmente.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Cuando el hijo mayor de edad comienza a trabajar con ingresos estables que podrían justificar una rebaja.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Si se han acumulado meses de deuda por no haber gestionado oportunamente el cese de la pensión.</span></li>
                        </ul>
                        <p className="text-gray-600 mt-4">En cada caso, el análisis de los plazos y las pruebas disponibles determina la viabilidad de la acción.</p>
                    </div>

                    {/* CTA PRINCIPAL */}
                    <div className="mb-12">
                        <div className="bg-green-900 rounded-2xl p-8 text-center text-white">
                            <h3 className="text-2xl font-bold font-serif text-green-600 mb-3">¿Crees que la pensión debería terminar o necesitas mantenerla?</h3>
                            <p className="text-white mb-6">Si tu hijo cumplió 18 años y no sabes si la obligación continúa, o si eres el hijo mayor de edad que necesita seguir recibiendo alimentos, el momento de consultar es antes de que surja un conflicto. Un abogado de familia puede revisar tu situación y determinar si corresponde solicitar el cese, la rebaja o la continuación de la pensión.</p>
                            <Link
                                to="/abogado-pension-alimentos"
                                className="inline-block bg-white text-green-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                Ver abogados en Familia
                            </Link>
                        </div>
                    </div>

                    {/* CONCLUSION */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La pensión de alimentos no termina automáticamente cuando un hijo cumple 18 años. Dependiendo de las circunstancias — especialmente cuando existen estudios superiores en curso — la obligación puede mantenerse hasta los 21 o los 28 años, y en situaciones excepcionales incluso más allá.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            El error más frecuente es asumir que la mayoría de edad extingue la obligación y suspender los pagos sin resolución judicial. Eso genera deuda acumulada desde el primer mes impago, con intereses y posibles medidas de apremio — exactamente lo que se quiere evitar.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La información de este artículo es de carácter general. La procedencia del término, la rebaja o la continuación de una pensión de alimentos depende de circunstancias específicas como la situación económica actual, la continuidad efectiva de los estudios y los antecedentes particulares de cada familia.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Si necesitas determinar si la obligación sigue vigente o solicitar una modificación, un{" "}
                            <Link to="/abogado-pension-alimentos" className="text-green-700 underline hover:text-green-500">
                                abogado especializado en pensión de alimentos
                            </Link>{" "}
                            puede evaluar tu caso y recomendarte el curso de acción más adecuado.
                        </p>
                    </div>

                    <CategoryCTA category="familia" />

                    {/* FAQS */}
                    <div className="mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre pensión de alimentos para hijos mayores de 18 años</h2>
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

            <RelatedLawyers category="Derecho de Familia" />

            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
                <div className="mt-8">
                    <BlogShare
                        title="Pensión de alimentos para hijos mayores de 18 años en Chile 2026"
                        url="https://legalup.cl/blog/pension-alimentos-hijos-mayores-18-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="pension-alimentos-mayores-18-chile-2026" />

                <div className="mt-4 text-center">
                    <Link
                        to="/blog"
                        className="inline-flex items-center gap-2 text-green-700 hover:text-green-500 transition-colors font-medium"
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