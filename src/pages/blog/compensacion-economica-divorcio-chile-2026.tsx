import { useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowLeft,
    Calendar,
    User,
    Clock,
    ChevronRight,
    CheckCircle,
    AlertCircle,
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
import { ReadTime } from "@/components/blog/ReadTime";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

const BlogArticle = () => {
    const faqs = [
        {
            question: "¿Qué es la compensación económica en el divorcio en Chile?",
            answer:
                "Es un derecho que puede solicitar uno de los cónyuges cuando, debido al cuidado de los hijos o del hogar, vio afectado su desarrollo laboral o profesional durante el matrimonio. Su objetivo es compensar el desequilibrio económico que genera el divorcio para el cónyuge que postergó su carrera o educación por dedicarse a la familia.",
        },
        {
            question: "¿Quién puede pedir compensación económica?",
            answer:
                "Cualquiera de los cónyuges — hombre o mujer — que logre acreditar un perjuicio económico derivado de su dedicación a la familia durante el matrimonio. En la práctica, suele ser quien se dedicó principalmente al hogar o al cuidado de los hijos mientras el otro desarrolló su carrera profesional.",
        },
        {
            question: "¿La compensación económica es automática al divorciarse?",
            answer:
                "No. Debe solicitarse expresamente durante el proceso de divorcio y acreditarse mediante pruebas suficientes. Si no se pide en el momento oportuno, el derecho puede perderse. El tribunal no la otorga de oficio — es responsabilidad de quien la solicita demostrar el perjuicio económico.",
        },
        {
            question: "¿Se puede pedir compensación económica en un divorcio unilateral?",
            answer:
                "Sí. Puede solicitarse tanto en el divorcio de mutuo acuerdo como en el divorcio unilateral. En el mutuo acuerdo, el monto puede acordarse entre las partes. En el unilateral, si no hay acuerdo, el tribunal lo determina según los factores legales establecidos.",
        },
        {
            question: "¿Existe un monto mínimo o máximo de compensación económica?",
            answer:
                "No. La ley chilena no establece montos fijos — cada caso se analiza individualmente. El tribunal considera factores como la duración del matrimonio, la situación patrimonial de ambos cónyuges, la edad y estado de salud del que la solicita, y el grado real en que se postergó el desarrollo laboral.",
        },
        {
            question: "¿La compensación económica puede pagarse en cuotas o con bienes?",
            answer:
                "Sí. El tribunal puede autorizar el pago en cuotas cuando el monto es significativo y el cónyuge no puede pagarlo de una vez. También puede pagarse mediante la transferencia de bienes — inmuebles, vehículos, derechos — si así lo acuerdan las partes o lo determina el juez.",
        },
        {
            question: "¿La compensación económica es lo mismo que la pensión de alimentos?",
            answer:
                "No. Son instituciones completamente distintas. La compensación económica es un pago único o en cuotas que busca compensar el desequilibrio producido por el divorcio. La pensión de alimentos es una obligación periódica destinada a cubrir las necesidades del hijo o del cónyuge que lo requiere. Pueden coexistir en el mismo proceso.",
        },
        {
            question: "¿Qué pruebas son importantes para pedir compensación económica?",
            answer:
                "Liquidaciones de sueldo históricas, cotizaciones previsionales que muestren lagunas o montos bajos, contratos de trabajo anteriores al matrimonio, certificados de nacimiento de los hijos, registros de gastos del hogar y cualquier antecedente que permita demostrar el perjuicio económico concreto causado por la dedicación a la familia.",
        },
        {
            question: "¿Qué pasa si el juez rechaza la solicitud de compensación económica?",
            answer:
                "Si el tribunal rechaza la solicitud por falta de pruebas o porque no se acreditó el perjuicio económico, simplemente no se otorga la compensación. El divorcio igual se produce con sus efectos normales. Por eso es fundamental preparar bien la documentación y contar con asesoría legal antes de presentar la solicitud.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Compensación económica en el divorcio en Chile: qué es, quién puede pedirla y cómo se calcula (Guía 2026)"
                description="Qué es la compensación económica en el divorcio en Chile, quién puede solicitarla, cómo la calcula el tribunal, qué pruebas necesitas y cuándo se pierde el derecho."
                image="/assets/compensacion-economica-divorcio-chile-2026.png"
                url="https://legalup.cl/blog/compensacion-economica-divorcio-chile-2026"
                datePublished="2026-06-04"
                dateModified="2026-06-04"
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
                        Compensación económica en el divorcio en Chile: qué es, quién puede pedirla y cómo se calcula (Guía 2026)
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "Compensa el perjuicio económico por dedicación al hogar o hijos",
                                "Puede pedirla cualquiera de los cónyuges",
                                "No es automática: debe solicitarse y acreditarse",
                                "No existe fórmula fija, cada caso se analiza individualmente",
                                "Se puede pagar en dinero, cuotas o bienes",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Cuando una pareja se divorcia en Chile, muchas personas creen que el proceso termina simplemente con la sentencia que pone fin al matrimonio. Sin embargo, existe una institución jurídica que puede tener un impacto económico muy importante para uno de los cónyuges: la compensación económica.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>4 de Junio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="compensacion-economica-divorcio-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Compensación económica en el divorcio en Chile 2026"
                        url="https://legalup.cl/blog/compensacion-economica-divorcio-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            Esta figura busca proteger a quien, durante el matrimonio, dejó de trabajar, redujo su desarrollo profesional o sacrificó oportunidades laborales para dedicarse al cuidado del hogar común o de los hijos.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía actualizada para 2026 aprenderás: qué es la compensación económica, quién puede solicitarla, cuándo procede, cómo la calcula el tribunal, qué pruebas se necesitan, cuánto dinero podría corresponder y qué errores debes evitar.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás iniciando un proceso de divorcio, también puede interesarte conocer nuestra guía sobre{" "}
                            <Link
                                to="/blog/divorcio-unilateral-chile-2026"
                                className="text-green-700 underline hover:text-green-500 font-semibold"
                            >
                                divorcio unilateral en Chile
                            </Link>.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si ya quieres evaluar tu caso, puedes consultar con un{" "}
                            <Link to="/abogados-divorcio" className="text-green-700 underline hover:text-green-500">
                                abogado especialista en compensación económica por divorcio
                            </Link>{" "}
                            directamente online.
                        </p>
                    </div>

                    {/* QUE ES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es la compensación económica?</h2>
                        <p className="text-gray-600 mb-4">
                            La compensación económica es un derecho reconocido por la Ley de Matrimonio Civil que permite que uno de los cónyuges reciba una compensación cuando el divorcio le genera un perjuicio económico derivado de haber postergado su desarrollo laboral o profesional durante el matrimonio.
                        </p>
                        <p className="text-gray-600 mb-4">
                            No se trata de una indemnización por sufrimiento emocional. Tampoco es un castigo para quien solicita el divorcio. Su finalidad es equilibrar el impacto económico que pudo generar la distribución de roles dentro del matrimonio.
                        </p>

                        <InArticleCTA category="Derecho de Familia" />

                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">
                                La compensación económica busca corregir el desequilibrio cuando una persona se encuentra en una situación económica significativamente peor que la del otro cónyuge tras el divorcio.
                            </p>
                        </div>
                        <p className="text-gray-600 mt-4">Es relevante distinguir la compensación económica de figuras afines como la pensión de alimentos o la liquidación de sociedad conyugal. Mientras los alimentos cubren necesidades futuras y la liquidación reparte bienes existentes, la compensación mira hacia atrás: busca reparar un perjuicio causado durante el matrimonio por la dedicación preferente al hogar o a los hijos. Esta distinción es relevante porque una persona puede tener derecho a compensación económica incluso si ya recibió su parte de la sociedad conyugal o si no tiene hijos menores.</p>
                    </div>

                    {/* QUIEN PUEDE PEDIR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Quién puede pedir compensación económica?</h2>
                        <p className="text-gray-600 mb-4">
                            Puede solicitarla cualquiera de los cónyuges. Aunque históricamente la mayoría de los casos han sido mujeres, la ley no establece diferencias de género.
                        </p>
                        <div className="bg-gray-50 p-6 rounded-2xl">
                            <p className="font-bold mb-3">Puede solicitarla quien:</p>
                            <div className="grid gap-4">
                                {[
                                    "✅ No trabajó durante el matrimonio",
                                    "✅ Trabajó menos de lo que podía",
                                    "✅ Interrumpió su carrera profesional",
                                    "✅ Renunció a oportunidades laborales relevantes",
                                    "✅ Se dedicó principalmente al cuidado de hijos o familiares",
                                    "✅ Dependía económicamente del otro cónyuge",
                                ].map((item, i) => (
                                    <div key={i} className="text-gray-700">{item}</div>
                                ))}
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">La carga de acreditar el perjuicio económico recae en quien solicita la compensación. Esto significa que no basta con haber estado casado y haberse dedicado al hogar; se requiere demostrar que dicha dedicación se tradujo en un menoscabo patrimonial concreto. Los tribunales valoran elementos como la duración efectiva de la dedicación, la empleabilidad previa y posterior al matrimonio, los ingresos que se dejaron de percibir y las posibilidades reales de reinserción laboral. La ausencia de prueba suficiente es una de las causas más frecuentes de rechazo de estas solicitudes.</p>
                    </div>

                    {/* CUANDO PROCEDE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo procede la compensación económica?</h2>
                        <p className="text-gray-600 mb-4">No basta con divorciarse para tener derecho a ella. El tribunal debe verificar que existan ciertos requisitos.</p>
                        <div className="space-y-4">
                            {[
                                { title: "Existencia de matrimonio", desc: "La compensación económica solo existe para matrimonios. No aplica en relaciones de convivencia." },
                                { title: "Divorcio o nulidad", desc: "Puede solicitarse en divorcio unilateral, divorcio de común acuerdo o nulidad matrimonial." },
                                { title: "Dedicación al hogar o hijos", desc: "Debe existir una dedicación relevante al cuidado familiar: crianza, cuidado del hogar o atención de familiares dependientes." },
                                { title: "Perjuicio económico", desc: "Debe existir un perjuicio económico concreto: menores ingresos, menor patrimonio, menor empleabilidad o pérdida de oportunidades profesionales." },
                            ].map((item, i) => (
                                <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                                    <p className="text-gray-600">{item.desc}</p>
                                </div>
                            ))}
                        </div>

                        {/* INTERLINK 2 */}
                        <div className="mb-6 space-y-3">
                            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
                                <div className="flex flex-col sm:flex-row justify-center gap-3">
                                    <Link
                                        to="/blog/divorcio-unilateral-chile-2026"
                                        className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                                    >
                                        👉 Leer más sobre Divorcio Unilateral en Chile
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PERJUICIO ECONOMICO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué entiende la ley por perjuicio económico?</h2>
                        <p className="text-gray-600 mb-4">
                            El perjuicio económico no significa simplemente ganar menos dinero. Se refiere a una situación donde el desarrollo profesional o laboral fue afectado por decisiones tomadas en beneficio de la familia.
                        </p>
                        <div className="grid sm:grid-cols-1 gap-4">
                            {[
                                { title: "Caso 1", desc: "Una profesional dejó de ejercer durante 15 años para criar a sus hijos. Al divorciarse tiene enormes dificultades para reinsertarse laboralmente." },
                                { title: "Caso 2", desc: "Un trabajador rechazó múltiples ascensos para mantener horarios compatibles con el cuidado familiar." },
                                { title: "Caso 3", desc: "Una persona abandonó estudios universitarios para dedicarse al hogar." },
                            ].map((item, i) => (
                                <div key={i} className="bg-gray-50 p-5 rounded-xl">
                                    <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                                    <p className="text-gray-600">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* COMO SE CALCULA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo se calcula la compensación económica?</h2>
                        <div className="bg-amber-50 p-5 rounded-xl mb-4">
                            <p className="font-bold text-amber-800">No existe una fórmula matemática.</p>
                            <p className="text-amber-700 mt-1">No hay tabla oficial, ni porcentaje legal, ni calculadora obligatoria. Cada caso es analizado individualmente.</p>
                        </div>
                        <p className="text-gray-600 mb-4 font-bold">Factores que revisa el juez:</p>
                        <div className="grid sm:grid-cols-2 gap-3 mb-6">
                            {["Duración del matrimonio", "Edad del cónyuge solicitante", "Estado de salud", "Situación patrimonial", "Posibilidades laborales futuras", "Dedicación al cuidado de los hijos"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-gray-700">{item}</span>
                                </div>
                            ))}
                        </div>
                        <div className="bg-green-50 p-5 rounded-xl">
                            <p className="font-bold text-green-800 mb-2">Ejemplo práctico</p>
                            <p className="text-green-700">Matrimonio de 18 años, dos hijos. Una cónyuge dejó de trabajar durante 15 años mientras el otro desarrolló una carrera exitosa. Al divorcio: uno gana $4.000.000 mensuales, el otro no tiene ingresos permanentes. En este escenario existe una base sólida para solicitar compensación económica.</p>
                        </div>

                        <p className="text-gray-600 mt-4">
                            Para determinar si tu caso tiene mérito, un{" "}
                            <Link to="/abogados-divorcio" className="text-green-700 underline hover:text-green-500">
                                abogado de familia para compensación económica
                            </Link>{" "}
                            puede revisar los antecedentes antes de iniciar el procedimiento.
                        </p>

                        {/* INTERLINK 3 */}
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
                    </div>

                    {/* FORMAS DE PAGO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo puede pagarse la compensación económica?</h2>
                        <p className="text-gray-600 mb-4">La ley contempla diversas formas:</p>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {[
                                { title: "Pago único", desc: "Una suma determinada pagada de una sola vez. Ejemplo: $20.000.000, $50.000.000, $80.000.000" },
                                { title: "Cuotas", desc: "Puede acordarse o decretarse el pago en cuotas cuando no existe liquidez inmediata." },
                                { title: "Entrega de bienes", desc: "Inmuebles, vehículos o derechos sobre determinados bienes." },
                                { title: "Derechos reales", desc: "En algunos casos se pueden establecer derechos sobre bienes específicos." },
                            ].map((item, i) => (
                                <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                                    <p className="text-gray-500 mt-1">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">La forma de pago tiene implicancias prácticas relevantes. Un pago único puede ser más conveniente para el cónyuge que recibe la compensación, pero puede resultar difícil de cumplir para quien debe pagarla si no cuenta con liquidez. Por otro lado, el pago en cuotas ofrece flexibilidad pero introduce el riesgo de incumplimiento, lo que podría requerir medidas de apremio posteriores. El tribunal determina la forma de pago considerando la capacidad económica de ambas partes y la naturaleza del perjuicio a reparar.</p>
                    </div>

                    {/* PRUEBAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pruebas sirven para acreditar el derecho?</h2>
                        <p className="text-gray-600 mb-4">Las pruebas son fundamentales. Entre las más utilizadas:</p>
                        <ul className="space-y-3 bg-gray-50 p-6 rounded-2xl">
                            {["Certificados de nacimiento de hijos", "Contratos de trabajo", "Liquidaciones de sueldo", "Certificados previsionales (lagunas previsionales)", "Títulos profesionales", "Testigos (familiares, amigos o personas cercanas)"].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>

                        {/* INTERLINK 4 */}
                        <div className="mb-6 space-y-3">
                            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
                                <div className="flex flex-col sm:flex-row justify-center gap-3">
                                    <Link
                                        to="/blog/mediacion-familiar-chile-2026"
                                        className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                                    >
                                        👉 Ver guía de mediación familiar obligatoria
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DIFERENCIAS CON ALIMENTOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿La compensación económica es igual a la pensión de alimentos?</h2>
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="bg-blue-50 p-5 rounded-xl">
                                <h3 className="font-bold text-blue-800 text-lg mb-2">Pensión de alimentos</h3>
                                <p className="text-blue-700">Busca cubrir necesidades actuales: alimentación, salud, educación, vivienda.</p>
                            </div>
                            <div className="bg-green-50 p-5 rounded-xl">
                                <h3 className="font-bold text-green-800 text-lg mb-2">Compensación económica</h3>
                                <p className="text-green-700">Busca reparar un perjuicio económico derivado del matrimonio. No está orientada a cubrir gastos cotidianos.</p>
                            </div>
                        </div>

                        {/* INTERLINK 5 */}
                        <div className="mb-6 space-y-3">
                            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
                                <div className="flex flex-col sm:flex-row justify-center gap-3">
                                    <Link
                                        to="/blog/derecho-de-familia-chile-2026"
                                        className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                                    >
                                        👉 Leer más sobre Pensión de alimentos en Chile
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ERRORES COMUNES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores comunes al solicitar compensación económica</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Pensar que siempre corresponde", desc: "No todos los divorcios generan compensación económica." },
                                    { title: "No presentar pruebas", desc: "Sin evidencia concreta será difícil acreditar el perjuicio." },
                                    { title: "Confundirla con alimentos", desc: "Son acciones distintas con objetivos distintos." },
                                    { title: "Esperar demasiado tiempo", desc: "La solicitud debe plantearse dentro del proceso correspondiente." },
                                    { title: "Creer que depende de quién tuvo la culpa", desc: "La compensación económica no busca castigar conductas matrimoniales. Lo relevante es el perjuicio económico." },
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

                        {/* INTERLINK 6 */}
                        <div className="mb-6 space-y-3">
                            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
                                <div className="flex flex-col sm:flex-row justify-center gap-3">
                                    <Link
                                        to="/blog/deuda-pension-alimentos-chile-2026"
                                        className="inline-flex items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-6 py-3 rounded-xl transition-all hover:bg-blue-100"
                                    >
                                        👉 Conoce las consecuencias de la deuda de pensión de alimentos
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* QUE REVISA EL JUEZ */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué revisa el juez antes de decidir?</h2>
                        <div className="grid sm:grid-cols-2 gap-3 bg-gray-50 p-6 rounded-2xl">
                            {["Duración del matrimonio", "Edad de los cónyuges", "Estado de salud", "Situación patrimonial", "Nivel de ingresos", "Desarrollo profesional", "Posibilidades futuras de empleo", "Dedicación al hogar", "Cuidado de hijos", "Existencia de perjuicio económico real"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <span className="text-gray-700">{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4 text-center italic">La decisión siempre será caso a caso.</p>
                    </div>

                    {/* CUANDO CONSULTAR A UN ABOGADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿En qué situaciones conviene consultar cuanto antes a un abogado de familia?</h2>
                        <p className="text-gray-600 mb-4">Este artículo entrega información general, pero la consulta temprana es determinante en estos escenarios:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Si te dedicaste al cuidado del hogar o los hijos durante el matrimonio y tu desarrollo profesional se vio afectado.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Cuando el divorcio está próximo y no has evaluado si tienes derecho a compensación económica.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Si tu cónyuge tiene un patrimonio significativamente mayor y existe desequilibrio económico post-divorcio.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Cuando el divorcio se tramita de mutuo acuerdo y se necesita incluir la compensación en el ACS.</span></li>
                        </ul>
                        <p className="text-gray-600">La compensación económica no se otorga de oficio: debe solicitarse expresamente y acreditarse con pruebas. Consultar a tiempo puede marcar la diferencia entre obtenerla o perder el derecho.</p>
                    </div>

                    {/* CTA before Conclusion */}
                    <PreConclusionCTA
                        description="La compensación económica depende de pruebas concretas. Compara abogados especializados en divorcio y patrimonio familiar antes de iniciar la demanda."
                        link="/abogados-divorcio"
                        buttonText="Comparar abogados especializados"
                    />

                    {/* CONCLUSION */}

                    <RelatedLawyers category="Derecho de Familia" />

                    <div className="mb-12 border-t pt-8">

                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La compensación económica es uno de los derechos más importantes que pueden surgir durante un proceso de divorcio en Chile. Su objetivo es corregir el desequilibrio económico cuando una persona sacrificó parte de su desarrollo laboral o profesional en beneficio de la familia.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Muchas personas desconocen este derecho y llegan al divorcio sin solicitarlo, perdiendo una oportunidad que la ley reconoce expresamente. Por eso resulta fundamental analizar cada situación de manera individual, considerando la duración del matrimonio, la dedicación al hogar y las consecuencias económicas que ello generó.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            También es importante recordar que no existe una fórmula automática ni un monto garantizado. El éxito de la solicitud dependerá principalmente de la capacidad para acreditar el perjuicio económico mediante pruebas sólidas.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Este artículo entrega información de carácter general sobre la compensación económica. La procedencia y el monto dependen de las circunstancias particulares de cada matrimonio y de la prueba que se pueda presentar ante el tribunal.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Si crees que tu desarrollo profesional se vio afectado durante el matrimonio, un{" "}
                            <Link to="/abogados-divorcio" className="text-green-700 underline hover:text-green-500">
                                abogado de divorcio y patrimonio familiar
                            </Link>{" "}
                            puede evaluar si corresponde solicitar compensación económica en tu caso.
                        </p>
                    </div>

                    <CategoryCTA category="familia" topic="divorcio" />

                    {/* FAQS */}

                    <div className="mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre compensación económica en Chile</h2>
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
                        title="Compensación económica en el divorcio en Chile 2026"
                        url="https://legalup.cl/blog/compensacion-economica-divorcio-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="compensacion-economica-divorcio-chile-2026" />

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
            <BlogConversionPopup category="Derecho de Familia" topic="divorcio" />
        </div>
    );
};

export default BlogArticle;