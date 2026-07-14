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
import PreConclusionCTA from "@/components/blog/PreConclusionCTA";
import InArticleCTA from "@/components/blog/InArticleCTA";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";
import { ReadTime } from "@/components/blog/ReadTime";

const BlogArticle = () => {
    const faqs = [
        {
            question: "¿Cuántos años debo estar separado para pedir divorcio unilateral?",
            answer:
                "Debes acreditar al menos tres años de cese efectivo de convivencia. Es importante documentar esa separación con algún instrumento con fecha cierta — escritura ante notario, acta ante el Registro Civil, contrato de arriendo a nombre de uno solo, o cualquier documento oficial que permita probar cuándo dejaron de convivir.",
        },
        {
            question: "¿Necesito que mi cónyuge firme el divorcio?",
            answer:
                "No. El divorcio unilateral permite divorciarse incluso si la otra persona se opone o no quiere participar. Es justamente la diferencia principal con el divorcio de mutuo acuerdo — este proceso está diseñado para cuando una de las partes no está dispuesta a cooperar.",
        },
        {
            question: "¿Puedo divorciarme si no sé dónde vive mi cónyuge?",
            answer:
                "Sí. Existen mecanismos judiciales especiales para estos casos, como la notificación por avisos en diarios. Será necesario acreditar que hiciste gestiones razonables para ubicar a tu cónyuge antes de recurrir a esa vía.",
        },
        {
            question: "¿Qué pruebas sirven para acreditar la separación?",
            answer:
                "Actas de cese de convivencia ante notario u oficial del Registro Civil, contratos de arriendo a nombre de uno solo, certificados de residencia distintos, declaraciones de testigos, correos o mensajes que acrediten la fecha de separación, entre otras. Mientras más antigua y documentada esté la separación, más sólido es el caso.",
        },
        {
            question: "¿Qué pasa con los hijos durante el divorcio unilateral?",
            answer:
                "Las materias de cuidado personal, pensión de alimentos y régimen de visitas pueden resolverse dentro del mismo proceso de divorcio o en procedimientos separados ante el Tribunal de Familia. Si hay acuerdo entre los padres sobre estas materias, el proceso es más simple. Si no hay acuerdo, el tribunal las resuelve según el interés superior del niño.",
        },
        {
            question: "¿Cuánto demora un divorcio unilateral en Chile?",
            answer:
                "Generalmente entre 1 y 2 años, dependiendo de si el otro cónyuge se opone, la carga del tribunal y la complejidad del caso. Si el cónyuge no contesta la demanda y los requisitos están acreditados, el proceso puede resolverse en el límite inferior. Si hay controversia sobre los hijos o los bienes, puede extenderse.",
        },
        {
            question: "¿Se puede pedir divorcio unilateral con deuda de alimentos?",
            answer:
                "Sí, aunque el incumplimiento reiterado de obligaciones alimenticias puede generar dificultades dentro del procedimiento y ser considerado por el tribunal al evaluar las circunstancias del caso.",
        },
        {
            question: "¿Puedo volver a casarme después del divorcio unilateral?",
            answer:
                "Sí. Una vez que la sentencia queda firme y se inscribe en el Registro Civil, el vínculo matrimonial queda disuelto y puedes contraer matrimonio nuevamente.",
        },
        {
            question: "¿Cuál es la diferencia entre divorcio unilateral y divorcio de mutuo acuerdo?",
            answer:
                "El divorcio unilateral requiere tres años de separación y no necesita el consentimiento del otro cónyuge — puedes divorciarte aunque el otro se oponga. El divorcio de mutuo acuerdo exige solo un año de separación pero requiere que ambas partes estén de acuerdo y presenten un acuerdo completo sobre hijos y bienes.",
        },
        {
            question: "¿Qué ocurre si mi cónyuge no asiste al juicio?",
            answer:
                "La ausencia del cónyuge demandado no impide que el tribunal continúe el procedimiento. Si fue notificado correctamente y no comparece, el juicio puede avanzar y dictarse sentencia si se cumplen los requisitos legales.",
        },
        {
            question: "¿Necesito un abogado para un divorcio unilateral?",
            answer:
                "Sí. El divorcio unilateral debe tramitarse ante el Tribunal de Familia y requiere una demanda formal. Un abogado especializado en derecho de familia puede ayudarte a reunir las pruebas, redactar la demanda y representarte en el juicio. Puedes comparar abogados especializados en divorcio unilateral y revisar sus honorarios antes de agendar una consulta en legalup.cl/abogado-divorcio-unilateral.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Divorcio unilateral en Chile: requisitos, causales y proceso paso a paso (Guía 2026)"
                description="Conoce cómo funciona el divorcio unilateral en Chile 2026: requisitos de 3 años de separación, pruebas necesarias, proceso judicial y qué hacer si tu cónyuge no quiere firmar."
                image="/assets/divorcio-unilateral-chile-2026.png"
                url="https://legalup.cl/blog/divorcio-unilateral-chile-2026"
                datePublished="2026-06-03"
                dateModified="2026-06-03"
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
                        Divorcio unilateral en Chile: requisitos, causales y proceso paso a paso (Guía 2026)
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "No necesitas la firma de tu cónyuge para divorciarte",
                                "Se requiere acreditar 3 años de cese efectivo de convivencia",
                                "El proceso se tramita ante el Tribunal de Familia",
                                "La oposición del otro cónyuge no impide el divorcio",
                                "El divorcio no elimina las obligaciones con los hijos",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        El divorcio unilateral es uno de los procedimientos de familia más consultados en Chile. Muchas personas llevan años separadas de hecho, sin convivencia, sin proyectos en común y sin intención de retomar la relación, pero enfrentan una dificultad importante: su cónyuge simplemente no quiere firmar el divorcio.
                    </p>

                    <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Cuánto demora un divorcio unilateral en Chile?</h2>
                    <p className="text-gray-600 mb-4 leading-relaxed">Un divorcio unilateral en Chile puede demorar entre 6 meses y 2 años, dependiendo de la carga del tribunal, la complejidad de las pruebas y si hay oposición del otro cónyuge. El plazo mínimo legal es de 3 años de cese de convivencia, pero el proceso judicial en sí puede extenderse varios meses más. Con un abogado especializado y todos los antecedentes preparados, algunos casos se resuelven en aproximadamente 6 a 12 meses desde la presentación de la demanda.</p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>3 de Junio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="divorcio-unilateral-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Divorcio unilateral en Chile 2026"
                        url="https://legalup.cl/blog/divorcio-unilateral-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            En esta guía actualizada para 2026 aprenderás: qué es el divorcio unilateral, cuándo procede, cuántos años de separación exige la ley, qué pruebas necesitas, cómo funciona el juicio, qué ocurre con los hijos, qué pasa con las pensiones alimenticias, cuánto demora el procedimiento y cuáles son los errores más comunes.
                        </p>

                        <InArticleCTA category="Derecho de Familia" />

                        <p className="text-gray-600 mt-4">
                            Si además tienes conflictos por pensión de alimentos, revisa también nuestra guía sobre{" "}
                            <Link
                                to="/blog/deuda-pension-alimentos-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                deuda de pensión de alimentos en Chile
                            </Link>.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si ya cumples los requisitos y quieres iniciar el proceso, puedes comparar{" "}
                            <Link to="/abogado-divorcio-unilateral" className="text-green-700 underline hover:text-green-500">
                                abogados especializados en divorcio unilateral en Chile
                            </Link>{" "}
                            directamente online.
                        </p>
                    </div>

                    {/* QUE ES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es el divorcio unilateral?</h2>
                        <p className="text-gray-600 mb-4">
                            El divorcio unilateral es una acción judicial que permite poner término al matrimonio cuando uno de los cónyuges desea divorciarse y el otro no está de acuerdo.
                        </p>
                        <p className="text-gray-600 mb-4">
                            A diferencia del divorcio de común acuerdo, donde ambas partes presentan conjuntamente la solicitud, en el divorcio unilateral solo uno de los cónyuges inicia el procedimiento.
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">
                                El objetivo es evitar que una persona quede obligada a permanecer casada indefinidamente por la sola negativa del otro cónyuge.
                            </p>
                        </div>
                        <p className="text-gray-600 mt-4">Existen dos modalidades de divorcio unilateral que suelen confundirse: el divorcio por cese de convivencia (que exige tres años de separación) y el divorcio por falta imputable al otro cónyuge (causales como violencia intrafamiliar, abandono o infracción del deber de fidelidad). Cada una tiene requisitos probatorios distintos y plazos diferentes. Mientras el divorcio por cese requiere solo acreditar el tiempo de separación, el divorcio por falta exige probar la conducta del otro cónyuge, lo que puede hacer el procedimiento más complejo.</p>
                    </div>

                    {/* NO NECESITA FIRMA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Se necesita la firma del otro cónyuge?</h2>
                        <p className="text-gray-600 mb-4">
                            <span className="font-bold">No.</span> Este es uno de los mayores mitos que existen sobre el divorcio en Chile.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Cuando se cumplen los requisitos legales del divorcio unilateral, el juez puede declarar el divorcio incluso si la otra persona:
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-6 rounded-2xl mb-4">
                            {["No quiere divorciarse", "No está de acuerdo", "No firma documentos", "Se opone al procedimiento", "No coopera durante el juicio"].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600">La voluntad del demandado no impide que el tribunal dicte sentencia.</p>
                    </div>

                    {/* CUANDO PROCEDE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo procede el divorcio unilateral?</h2>
                        <p className="text-gray-600 mb-4">
                            La principal causal es el <span className="font-bold">cese efectivo de la convivencia durante al menos tres años</span>.
                        </p>
                        <p className="text-gray-600 mb-4">
                            No basta con vivir en habitaciones separadas dentro de la misma casa. Debe existir una verdadera ruptura de la convivencia.
                        </p>
                        <div className="bg-gray-50 p-6 rounded-2xl">
                            <p className="font-bold mb-2">Ejemplos de cese de convivencia:</p>
                            <ul className="space-y-1">
                                {["Vivir en domicilios distintos", "Llevar vidas independientes", "No compartir gastos familiares", "No desarrollar un proyecto de vida en común"].map((item, i) => (
                                    <li key={i} className="flex items-center gap-2">• {item}</li>
                                ))}
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">Acreditar el cese de convivencia por tres años no siempre es sencillo. El tribunal exige pruebas robustas y no se conforma con la mera declaración del demandante. Si el otro cónyuge niega la separación o sostiene una fecha distinta, el juez puede requerir prueba testimonial, documental e incluso informes sociales. Por eso, contar con un acta de cese de convivencia ante el Registro Civil o una escritura pública suele simplificar significativamente la acreditación de este requisito.</p>
                    </div>

                    {/* PLAZO LEGAL */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuántos años de separación exige la ley?</h2>
                        <div className="bg-green-100 p-6 rounded-xl text-center mb-4">
                            <p className="text-3xl font-bold text-green-700">3 años</p>
                            <p className="text-green-800">de cese efectivo de convivencia</p>
                        </div>
                        <p className="text-gray-600">
                            Muchas personas creen erróneamente que basta con estar separados algunos meses. Si no se cumplen los tres años, el tribunal normalmente rechazará la demanda.
                        </p>
                    </div>

                    {/* COMO ACREDITAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo se acredita el cese de convivencia?</h2>
                        <p className="text-gray-600 mb-4">El tribunal necesita pruebas. Entre los medios más comunes:</p>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {[
                                { title: "Acta de cese de convivencia", desc: "Registro Civil, escritura pública o acta judicial" },
                                { title: "Documentos oficiales", desc: "Contratos de arriendo, cuentas de servicios, certificados de residencia" },
                                { title: "Testigos", desc: "Familiares, vecinos, amigos o compañeros de trabajo" },
                                { title: "Antecedentes judiciales", desc: "Juicios previos de alimentos, VIF o cuidado personal" },
                            ].map((item, i) => (
                                <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                                    <p className="text-gray-600">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CTA after Requisitos */}
                    <div className="my-10 border rounded-md px-6 rounded-2xl p-6 sm:p-8 text-center">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">¿Llevas más de tres años separado y tu cónyuge no firma?</h3>
                        <p className="text-gray-600 mb-6">
                            Si cumples el requisito legal de cese de convivencia por tres años pero tu cónyuge se niega a firmar, el divorcio unilateral es la vía indicada. Un abogado especializado puede guiarte desde la recopilación de pruebas hasta obtener la sentencia.
                        </p>
                        <Link
                            to="/abogado-divorcio-unilateral"
                            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-green-900 text-white font-semibold px-8 py-3 rounded-xl transition-all shadow-md hover:shadow-lg"
                        >
                            Ver abogados para divorcio unilateral
                            <ChevronRight className="h-5 w-5" />
                        </Link>
                    </div>

                    {/* QUE PASA SI NO SE DOMICILIO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si no sé dónde vive mi cónyuge?</h2>
                        <p className="text-gray-600 mb-4">
                            Es una situación bastante frecuente. Muchas personas llevan años sin contacto con su ex pareja. Eso no impide necesariamente iniciar el divorcio.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">
                                El tribunal puede autorizar mecanismos especiales de notificación cuando se acredita que el domicilio es desconocido. Por eso resulta recomendable contar con asesoría jurídica desde el inicio.
                            </p>
                        </div>
                        <p className="text-gray-600 mt-4">Cuando se desconoce el paradero del otro cónyuge, se puede solicitar la notificación por avisos o mediante publicación en un diario de circulación nacional. Sin embargo, este mecanismo requiere que el demandante acredite haber agotado las gestiones razonables para ubicar al demandado. Si posteriormente se descubre que el domicilio era conocido o que no se realizaron las diligencias suficientes, la sentencia de divorcio podría ser impugnada, lo que obligaría a rehacer el procedimiento.</p>
                    </div>

                    {/* PROCESO PASO A PASO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-6">¿Cómo funciona el proceso paso a paso?</h2>
                        <div className="space-y-4">
                            {[
                                { step: "Paso 1: Reunir antecedentes", desc: "Certificado de matrimonio, certificados de nacimiento, documentos que acrediten separación." },
                                {
                                    step: "Paso 2: Presentar la demanda",
                                    desc: (
                                        <>
                                            El abogado presenta la demanda de divorcio unilateral ante el Tribunal de Familia.{" "}
                                            En este paso es fundamental contar con un{" "}
                                            <Link to="/abogado-divorcio-unilateral" className="text-green-700 underline hover:text-green-500">
                                                abogado de divorcio unilateral
                                            </Link>{" "}
                                            que redacte la demanda con los fundamentos y pruebas correctas desde el primer escrito.
                                        </>
                                    )
                                },
                                { step: "Paso 3: Notificación", desc: "El cónyuge demandado debe ser informado formalmente." },
                                { step: "Paso 4: Audiencia preparatoria", desc: "El tribunal revisa las pruebas y fija los puntos a discutir." },
                                { step: "Paso 5: Audiencia de juicio", desc: "Se presentan testigos, documentos y declaraciones." },
                                { step: "Paso 6: Sentencia", desc: "Si se acredita el cese de convivencia, el tribunal declara el divorcio." },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                                    <div>
                                        <h3 className="font-bold text-gray-900">{item.step}</h3>
                                        <p className="text-gray-600">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* QUE PASA CON LOS HIJOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa con los hijos?</h2>
                        <p className="text-gray-600 mb-4">
                            Uno de los errores más comunes es creer que el divorcio resuelve automáticamente todos los asuntos relacionados con los hijos. No siempre es así.
                        </p>
                        <ul className="space-y-3 bg-gray-50 p-6 rounded-2xl">
                            {["Cuidado personal", "Relación directa y regular", "Pensión de alimentos", "Gastos extraordinarios"].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">El interés superior del niño sigue siendo la prioridad principal. El divorcio nunca elimina las responsabilidades parentales.</p>
                    </div>

                    {/* INTERLINK 1 */}
                    <div className="mb-6 space-y-3">
                        <div className="text-center py-4 border-t border-b border-gray-100 my-8">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
                            <div className="flex flex-col sm:flex-row justify-center gap-3">
                                <Link
                                    to="/blog/cuidado-personal-hijos-chile-2026"
                                    className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                                >
                                    👉 Cuidado personal de hijos en Chile
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* DIVORCIO CON DEUDA DE ALIMENTOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Se puede pedir divorcio si existe deuda de alimentos?</h2>
                        <p className="text-gray-600 mb-4">
                            Sí. Sin embargo, la ley establece ciertas limitaciones. El cónyuge demandante debe demostrar que ha cumplido reiteradamente sus obligaciones alimenticias.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="text-red-800">Si existen incumplimientos graves y reiterados, esto puede generar dificultades importantes dentro del procedimiento.</p>
                        </div>
                    </div>

                    {/* INTERLINK 2 */}
                    <div className="mb-6 space-y-3">
                        <div className="text-center py-4 border-t border-b border-gray-100 my-8">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
                            <div className="flex flex-col sm:flex-row justify-center gap-3">
                                <Link
                                    to="/blog/deuda-pension-alimentos-chile-2026"
                                    className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                                >
                                    👉 Deuda de pensión de alimentos en Chile
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* CUANTO DEMORA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuánto demora un divorcio unilateral en Chile?</h2>
                        <p className="text-gray-600 mb-4">No existe un plazo único. Depende de factores como:</p>
                        <div className="grid sm:grid-cols-2 gap-4 mb-4">
                            {["Complejidad del caso", "Cantidad de pruebas", "Existencia de oposición", "Carga de trabajo del tribunal"].map((item, i) => (
                                <div key={i} className="bg-white p-4 rounded-xl border">
                                    <p className="text-gray-700">• {item}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600">En términos generales, puede extenderse desde varios meses hasta más de un año en situaciones complejas.</p>
                    </div>

                    {/* ERRORES COMUNES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores comunes que pueden retrasar el divorcio</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "No reunir pruebas suficientes", desc: "La falta de evidencia suele generar retrasos importantes." },
                                    { title: "Confundir separación con divorcio", desc: "Estar separado no significa estar divorciado." },
                                    { title: "Esperar demasiado tiempo", desc: "Esto suele complicar la obtención de documentos y testigos." },
                                    { title: "Ocultar información", desc: "Entregar antecedentes incompletos afecta la credibilidad." },
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

                    {/* DIFERENCIAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Diferencias: divorcio unilateral vs. divorcio de mutuo acuerdo</h2>
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="bg-green-50 p-5 rounded-xl">
                                <h3 className="font-bold text-green-800 text-lg mb-3">Divorcio de mutuo acuerdo</h3>
                                <ul className="space-y-2">
                                    <li>✓ Ambos quieren divorciarse</li>
                                    <li>✓ Requiere 1 año de separación</li>
                                    <li>✓ Suele ser más rápido</li>
                                    <li>✓ Generalmente menos conflicto</li>
                                </ul>
                            </div>
                            <div className="bg-orange-50 p-5 rounded-xl">
                                <h3 className="font-bold text-orange-800 text-lg mb-3">Divorcio unilateral</h3>
                                <ul className="space-y-2">
                                    <li>✓ Solo uno quiere divorciarse</li>
                                    <li>✓ Requiere 3 años de separación</li>
                                    <li>✓ Puede existir oposición</li>
                                    <li>✓ Proceso más extenso</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* INTERLINK 3 */}
                    <div className="mb-6 space-y-3">
                        <div className="text-center py-4 border-t border-gray-100 my-8">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
                            <div className="flex flex-col sm:flex-row justify-center gap-3">
                                <Link
                                    to="/blog/mediacion-familiar-chile-2026"
                                    className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                                >
                                    👉 Mediación familiar obligatoria en Chile
                                </Link>
                            </div>
                        </div>
                    </div>
                    {/* CUANDO CONSULTAR A UN ABOGADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿En qué situaciones conviene consultar cuanto antes a un abogado de familia?</h2>
                        <p className="text-gray-600 mb-4">Este artículo entrega información general, pero la asesoría oportuna es especialmente relevante en estos casos:</p>
                        <ul className="space-y-2 mb-4">
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600">Si llevas más de tres años separado pero no tienes pruebas documentales del cese de convivencia.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600">Cuando tu cónyuge se opone activamente al divorcio y necesitas preparar una estrategia procesal.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600">Si no sabes dónde vive tu cónyuge y se requiere gestionar notificaciones por avisos.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600">Cuando existen hijos, bienes o compensaciones económicas que deben resolverse paralelamente.</span></li>
                        </ul>
                        <p className="text-gray-600">Iniciar el procedimiento con asesoría desde el primer paso puede evitar errores procesales que retrasen la sentencia.</p>
                    </div>

                    {/* CTA before Conclusion */}
                    <PreConclusionCTA
                        description="Si cumples los requisitos para divorciarte pero no sabes cómo iniciar la demanda, puedes comparar abogados especializados en divorcio unilateral y agendar una consulta online."
                        link="/abogado-divorcio-unilateral"
                        buttonText="Comparar abogados especializados"
                    />

                    {/* CONCLUSION */}

                    <RelatedLawyers category="Derecho de Familia" />

                    <div className="mb-12 border-t pt-8">

                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            El divorcio unilateral es una herramienta legal que permite poner término al matrimonio cuando una de las partes ya no desea continuar la relación y el otro cónyuge se niega a colaborar. En Chile, este procedimiento existe precisamente para evitar que una persona permanezca unida legalmente de forma indefinida por la sola oposición de su pareja.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            El requisito más importante es acreditar un cese efectivo de convivencia de al menos tres años. Para ello será necesario presentar documentos, testigos u otros medios de prueba que permitan demostrar que la vida matrimonial terminó de manera permanente.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Este artículo entrega información de carácter general sobre el divorcio unilateral. La procedencia de la acción y los plazos aplicables dependen de la fecha del matrimonio, la existencia de causales adicionales y las circunstancias particulares de cada caso.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Si llevas años separado y tu cónyuge no quiere firmar el divorcio, un{" "}
                            <Link to="/abogado-divorcio-unilateral" className="text-green-700 underline hover:text-green-500">
                                abogado para divorcio sin acuerdo del cónyuge
                            </Link>{" "}
                            puede evaluar tu situación y guiarte en el proceso.
                        </p>
                    </div>

                    <CategoryCTA category="familia" topic="divorcio" />

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
                        title="Divorcio unilateral en Chile 2026"
                        url="https://legalup.cl/blog/divorcio-unilateral-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="divorcio-unilateral-chile-2026" />

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
            <BlogConversionPopup category="Derecho de Familia" topic="divorcio-unilateral" />
        </div>
    );
};

export default BlogArticle;