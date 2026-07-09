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
import InArticleCTA from "@/components/blog/InArticleCTA";
import { ReadTime } from "@/components/blog/ReadTime";

const BlogArticle = () => {
    const faqs = [
        {
            question: "¿Qué es la liquidación de sociedad conyugal?",
            answer:
                "Es el proceso legal mediante el cual se reparten los bienes y deudas acumulados durante un matrimonio celebrado bajo el régimen de sociedad conyugal. Incluye identificar qué bienes forman parte del haber social, tasarlos y distribuirlos entre los cónyuges, generalmente en partes iguales.",
        },
        {
            question: "¿La liquidación de sociedad conyugal ocurre automáticamente con el divorcio?",
            answer:
                "No. El divorcio termina el vínculo matrimonial, pero la liquidación de la sociedad conyugal es un procedimiento independiente que puede realizarse antes, durante o después del divorcio. Muchas parejas se divorcian y dejan la liquidación pendiente por años, lo que puede generar conflictos posteriores sobre los bienes.",
        },
        {
            question: "¿Se reparten las herencias recibidas durante el matrimonio?",
            answer:
                "Normalmente no. Las herencias y donaciones recibidas por uno de los cónyuges durante el matrimonio suelen considerarse bienes propios de quien las recibió, no bienes sociales. Por lo tanto, no se incluyen en la liquidación. Sin embargo, los frutos o rentas generados por esos bienes sí pueden ser sociales dependiendo del caso.",
        },
        {
            question: "¿Qué pasa con la vivienda familiar en la liquidación?",
            answer:
                "Depende del acuerdo entre las partes o de la resolución judicial. Las opciones más comunes son: vender la propiedad y repartir el producto, adjudicarla a uno de los cónyuges compensando al otro con dinero u otros bienes, o mantenerla en copropiedad. Si hay hijos menores viviendo ahí, el tribunal puede considerar ese factor al decidir.",
        },
        {
            question: "¿Es obligatorio acudir a tribunales para liquidar la sociedad conyugal?",
            answer:
                "No siempre. Si existe acuerdo entre las partes, la liquidación puede realizarse mediante escritura pública ante notario, sin necesidad de juicio. Si no hay acuerdo sobre cómo repartir los bienes, cualquiera de los cónyuges puede demandar la liquidación ante el tribunal civil competente.",
        },
        {
            question: "¿Qué ocurre si uno de los cónyuges oculta bienes durante la liquidación?",
            answer:
                "El ocultamiento de bienes puede generar consecuencias legales serias — el cónyuge que oculta puede perder su derecho sobre los bienes ocultados y enfrentar acciones legales adicionales. El tribunal tiene herramientas para investigar el patrimonio real de cada parte, incluyendo declaraciones de renta, registros del Conservador de Bienes Raíces y cuentas bancarias.",
        },
        {
            question: "¿Se pueden repartir las deudas en la liquidación?",
            answer:
                "Sí. Las deudas que forman parte del pasivo de la sociedad conyugal también deben considerarse durante la liquidación. En general, las deudas contraídas durante el matrimonio para el beneficio de la familia son deudas sociales y deben distribuirse entre los cónyuges según las reglas de la liquidación.",
        },
        {
            question: "¿Necesito abogado para liquidar la sociedad conyugal?",
            answer:
                "No siempre es obligatorio, pero en casos con propiedades, empresas, inversiones o conflictos relevantes la asesoría de un abogado especializado suele marcar una diferencia significativa en el resultado. Un error en la tasación de bienes o en la redacción de la escritura puede tener consecuencias patrimoniales importantes.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Liquidación de sociedad conyugal en Chile 2026: cómo se reparten los bienes después del divorcio (Guía Completa)"
                description="Aprende cómo funciona la liquidación de sociedad conyugal en Chile 2026. Descubre qué bienes se reparten, cómo se valoran, qué pasa con las deudas y cómo realizar el proceso paso a paso."
                image="/assets/liquidacion-sociedad-conyugal-chile-2026.png"
                url="https://legalup.cl/blog/liquidacion-sociedad-conyugal-chile-2026"
                datePublished="2026-06-09"
                dateModified="2026-06-09"
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
                        Liquidación de sociedad conyugal en Chile 2026: cómo se reparten los bienes después del divorcio (Guía Completa)
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "La liquidación divide los bienes y deudas de la sociedad conyugal",
                                "No ocurre automáticamente con el divorcio: es un proceso independiente",
                                "Se pueden liquidar inmuebles, vehículos, inversiones y cuentas bancarias",
                                "Las herencias y bienes prematrimoniales normalmente no se reparten",
                                "Si hay acuerdo, se puede liquidar sin juicio mediante escritura pública",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        La liquidación de sociedad conyugal es el proceso mediante el cual se dividen los bienes y deudas que pertenecen a la sociedad conyugal una vez que esta termina. En esta guía completa para 2026 te explicamos cómo funciona, qué bienes se reparten y cómo realizar el proceso paso a paso.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>9 de Junio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="liquidacion-sociedad-conyugal-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Liquidación de sociedad conyugal en Chile 2026"
                        url="https://legalup.cl/blog/liquidacion-sociedad-conyugal-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            La liquidación de sociedad conyugal es el procedimiento que permite determinar qué bienes forman parte del patrimonio común, cuánto vale cada bien, qué deudas existen y qué porcentaje corresponde a cada cónyuge.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás en proceso de divorcio, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/divorcio-unilateral-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                divorcio unilateral en Chile
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/divorcio-mutuo-acuerdo-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                divorcio de mutuo acuerdo
                            </Link>{" "}
                            y{" "}
                            <Link
                                to="/blog/compensacion-economica-divorcio-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                compensación económica
                            </Link>
                            .
                        </p>
                    </div>

                    {/* QUE ES LIQUIDACION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es la liquidación de sociedad conyugal?</h2>
                        <p className="text-gray-600 mb-4">
                            La liquidación de sociedad conyugal es el proceso mediante el cual se dividen los bienes y deudas que pertenecen a la sociedad conyugal una vez que esta termina.
                        </p>
                        <p className="text-gray-600 mb-4">
                            La liquidación puede realizarse después de un divorcio, una nulidad matrimonial, la sustitución del régimen matrimonial o la muerte de uno de los cónyuges.
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">
                                Muchas personas creen que el divorcio automáticamente divide los bienes. Sin embargo, esto no ocurre. Primero termina el matrimonio y luego debe liquidarse la sociedad conyugal para repartir el patrimonio común.
                            </p>
                        </div>
                        <p className="text-gray-600 mt-4">Es importante distinguir entre la disolución de la sociedad conyugal (que ocurre automáticamente con el divorcio, la nulidad o el cambio de régimen) y su liquidación (que requiere un procedimiento posterior). Durante el período entre la disolución y la liquidación efectiva, los bienes quedan en un estado de comunidad que puede generar problemas de administración si no se gestiona adecuadamente. Cualquier acto de disposición de bienes comunes durante este período requiere el consentimiento de ambos ex cónyuges.</p>
                    </div>

                    {/* QUE ES SOCIEDAD CONYUGAL */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es la sociedad conyugal?</h2>
                        <p className="text-gray-600 mb-4">
                            La sociedad conyugal es uno de los regímenes patrimoniales que existen en Chile. Cuando las personas se casan bajo este régimen, determinados bienes y deudas pasan a formar parte de un patrimonio común.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Actualmente existen tres regímenes matrimoniales: sociedad conyugal, separación total de bienes y participación en los gananciales.
                        </p>
                        <div className="bg-gray-50 p-5 rounded-xl">
                            <p className="text-gray-700">
                                La liquidación solamente aplica cuando existió sociedad conyugal o cuando corresponde repartir ganancias acumuladas en otros regímenes.
                            </p>
                        </div>
                    </div>

                    {/* CUANDO TERMINA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo termina la sociedad conyugal?</h2>
                        <p className="text-gray-600 mb-4">La sociedad conyugal puede terminar por distintas causas. Las más frecuentes son:</p>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {[
                                { title: "Divorcio", desc: "Cuando existe sentencia firme de divorcio." },
                                { title: "Cambio de régimen", desc: "Los cónyuges pueden acordar cambiar a separación total de bienes." },
                                { title: "Nulidad del matrimonio", desc: "Cuando el matrimonio es declarado nulo por los tribunales." },
                                { title: "Fallecimiento", desc: "La muerte de uno de los cónyuges también pone término a la sociedad conyugal." },
                            ].map((item, i) => (
                                <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                                    <p className="text-gray-500">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">
                            Si estás iniciando el proceso de divorcio, revisa nuestra guía sobre{" "}
                            <Link to="/blog/divorcio-unilateral-chile-2026" className="text-green-700 underline">
                                divorcio unilateral en Chile
                            </Link>.
                        </p>
                    </div>

                    {/* QUE BIENES SE REPARTEN */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué bienes se reparten en la liquidación?</h2>
                        <p className="text-gray-600 mb-4">
                            Uno de los conflictos más comunes es determinar qué bienes forman parte de la sociedad conyugal. No todo lo que poseen los cónyuges necesariamente se divide.
                        </p>

                        <h3 className="text-xl font-bold mb-3 mt-4 text-gray-800">Bienes que normalmente se reparten</h3>
                        <div className="grid sm:grid-cols-2 gap-2 mb-6">
                            {["Casas compradas durante el matrimonio", "Departamentos", "Vehículos", "Dinero acumulado", "Inversiones", "Acciones", "Fondos de inversión", "Negocios adquiridos durante el matrimonio", "Muebles relevantes"].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 bg-green-50 p-3 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>

                        <h3 className="text-xl font-bold mb-3 text-gray-800">Bienes que normalmente no se reparten</h3>
                        <div className="grid sm:grid-cols-2 gap-2 mb-4">
                            {["Herencias", "Donaciones personales", "Bienes adquiridos antes del matrimonio", "Objetos de uso personal"].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                                    <span className="text-gray-500">✕</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600">Cada caso debe analizarse individualmente.</p>
                        <p className="text-gray-600 mt-4">Un aspecto que genera frecuentes controversias son las recompensas que los cónyuges se deben entre sí o a la sociedad conyugal. Por ejemplo, si uno de los cónyuges usó fondos de la sociedad para pagar una deuda personal o, inversamente, si usó dinero propio para adquirir un bien que ingresó a la sociedad. Estas recompensas deben calcularse y compensarse durante la liquidación, y su determinación puede requerir una revisión contable detallada de los movimientos patrimoniales durante todo el matrimonio.</p>
                    </div>

                    {/* CTA PRINCIPAL */}
                    <InArticleCTA
                        message="¿Necesitas ayuda para dividir bienes, propiedades o deudas después del divorcio? Un abogado especializado puede ayudarte a proteger tus derechos."
                        buttonText="Habla con un abogado ahora"
                        category="Derecho de Familia"
                    />

                    {/* CASA FAMILIAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa con la casa familiar?</h2>
                        <p className="text-gray-600 mb-4">La vivienda suele ser el activo más importante de la sociedad conyugal. Existen varias alternativas:</p>
                        <div className="space-y-3">
                            {[
                                { title: "Venta del inmueble", desc: "La propiedad se vende y el dinero obtenido se distribuye entre ambos cónyuges." },
                                { title: "Adjudicación a uno de los cónyuges", desc: "Uno de ellos conserva la propiedad y compensa económicamente al otro." },
                                { title: "Copropiedad", desc: "En algunos casos ambas personas mantienen la propiedad compartida." },
                            ].map((item, i) => (
                                <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                                    <p className="text-gray-600">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">La mejor alternativa dependerá de la situación familiar y económica de cada caso.</p>
                    </div>

                    {/* DEUDAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre con las deudas?</h2>
                        <p className="text-gray-600 mb-4">La liquidación no solo implica repartir activos. También deben considerarse las obligaciones existentes.</p>
                        <div className="bg-red-50 p-5 rounded-xl mb-4">
                            <p className="font-bold text-red-800">Ejemplos de deudas a considerar:</p>
                            <div className="grid sm:grid-cols-2 gap-2 mt-2">
                                {["Créditos hipotecarios", "Créditos de consumo", "Deudas comerciales", "Obligaciones tributarias"].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-red-500">•</span>
                                        <span className="text-red-800">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-gray-600">Las deudas asociadas a la sociedad conyugal generalmente deben incorporarse al proceso de liquidación. Por eso es fundamental realizar un inventario completo antes de cualquier acuerdo.</p>
                    </div>

                    {/* PROCESO PASO A PASO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-6">¿Cómo funciona el proceso paso a paso?</h2>
                        <div className="space-y-4">
                            {[
                                { step: "Paso 1: Identificar los bienes", desc: "Se realiza un listado completo de activos y pasivos: inmuebles, vehículos, cuentas bancarias, inversiones y deudas." },
                                { step: "Paso 2: Valoración del patrimonio", desc: "Cada bien debe ser valorizado mediante tasaciones inmobiliarias, informes comerciales, peritajes o avalúos especializados." },
                                { step: "Paso 3: Determinar qué pertenece a la sociedad conyugal", desc: "No todos los bienes ingresan automáticamente al reparto. Aquí suele existir gran parte de la discusión jurídica." },
                                { step: "Paso 4: Pago de deudas", desc: "Antes de repartir bienes, normalmente deben considerarse las obligaciones pendientes para calcular correctamente el patrimonio neto." },
                                { step: "Paso 5: Reparto final", desc: "Una vez determinado el patrimonio líquido, se realiza la adjudicación correspondiente a cada cónyuge." },
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

                    {/* LIQUIDACION SIN JUICIO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Se puede liquidar sin juicio?</h2>
                        <p className="text-gray-600 mb-4">
                            Sí. Cuando existe acuerdo entre las partes, la liquidación puede realizarse mediante escritura pública. Esta suele ser la opción más rápida y económica.
                        </p>
                        <div className="bg-green-50 p-5 rounded-xl">
                            <p className="font-bold text-green-800">Ventajas:</p>
                            <div className="grid sm:grid-cols-2 gap-2 mt-2">
                                {["Menor costo", "Menor tiempo", "Menos conflictos", "Mayor control sobre los acuerdos"].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-green-600 font-bold">✓</span>
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* SIN ACUERDO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si no existe acuerdo?</h2>
                        <p className="text-gray-600 mb-4">
                            Cuando los cónyuges no logran ponerse de acuerdo, la liquidación puede transformarse en un procedimiento judicial.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="font-bold text-amber-800">Esto suele ocurrir cuando existen conflictos sobre:</p>
                            <div className="grid sm:grid-cols-2 gap-2 mt-2">
                                {["Propiedades", "Empresas", "Deudas", "Bienes ocultos", "Valoración de activos"].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-amber-600">•</span>
                                        <span className="text-amber-800">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">En estos casos resulta fundamental contar con asesoría legal especializada.</p>
                        <p className="text-gray-600 mt-4">Cuando el desacuerdo persiste, el juicio de liquidación puede extenderse por varios meses o incluso años, dependiendo de la cantidad de bienes, la necesidad de peritajes y la disposición de las partes a negociar. Durante este período, los bienes comunes no pueden administrarse libremente: cualquier acto de disposición importante requiere autorización judicial o el consentimiento de ambos, lo que puede paralizar decisiones como la venta de un inmueble o el retiro de inversiones.</p>
                    </div>

                    {/* RELACION CON DIVORCIO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Relación entre divorcio y liquidación de sociedad conyugal</h2>
                        <p className="text-gray-600 mb-4">
                            Muchas personas creen que ambos procesos son lo mismo. No lo son. El divorcio pone fin al vínculo matrimonial. La liquidación determina cómo se distribuirán los bienes.
                        </p>
                        <div className="bg-blue-50 p-5 rounded-xl mb-4">
                            <p className="text-blue-800">
                                Por ejemplo: una pareja puede estar legalmente divorciada y mantener pendiente la liquidación durante años.
                            </p>
                        </div>
                        <p className="text-gray-600">
                            Si aún no conoces las diferencias entre ambos procedimientos, revisa nuestra guía sobre{" "}
                            <Link to="/blog/divorcio-mutuo-acuerdo-chile-2026" className="text-green-700 underline">divorcio de mutuo acuerdo en Chile</Link>{" "}
                            y nuestra guía sobre{" "}
                            <Link to="/blog/divorcio-unilateral-chile-2026" className="text-green-700 underline">divorcio unilateral en Chile</Link>.
                        </p>
                    </div>

                    {/* RELACION CON COMPENSACION ECONOMICA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué relación tiene con la compensación económica?</h2>
                        <p className="text-gray-600 mb-4">
                            La compensación económica es una institución distinta. Su finalidad es reparar el menoscabo económico sufrido por uno de los cónyuges debido a haberse dedicado principalmente al cuidado de los hijos o al hogar.
                        </p>
                        <div className="bg-gray-50 p-5 rounded-xl">
                            <p className="text-gray-700">
                                La compensación económica no reemplaza la liquidación. La liquidación no reemplaza la compensación económica. Ambas pueden coexistir.
                            </p>
                        </div>
                        <p className="text-gray-600 mt-4">
                            Si quieres profundizar, revisa nuestra guía sobre{" "}
                            <Link to="/blog/compensacion-economica-divorcio-chile-2026" className="text-green-700 underline">compensación económica en el divorcio en Chile</Link>.
                        </p>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes al liquidar una sociedad conyugal</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "No identificar todos los bienes", desc: "Algunos activos quedan fuera del inventario inicial. Esto puede generar conflictos posteriores." },
                                    { title: "No considerar las deudas", desc: "Muchas personas solo analizan los bienes y olvidan las obligaciones financieras." },
                                    { title: "Firmar acuerdos sin asesoría", desc: "Un acuerdo mal redactado puede generar problemas futuros." },
                                    { title: "No realizar tasaciones", desc: "Una valoración incorrecta puede perjudicar significativamente a una de las partes." },
                                    { title: "Confundir divorcio con liquidación", desc: "Son procesos jurídicos distintos que deben abordarse adecuadamente." },
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
                        <p className="text-gray-600 mb-4">Este artículo entrega información general, pero la consulta temprana es clave en estos casos:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Cuando el divorcio ya está en curso y no se ha iniciado ninguna gestión para liquidar la sociedad conyugal.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Si existen bienes inmuebles, empresas o inversiones que requerirán valoración pericial.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Cuando sospechas que tu cónyuge ha realizado movimientos patrimoniales para disminuir los activos de la sociedad.</span></li>
                            <li className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> <span className="text-gray-600 font-bold">Si se necesita acordar el uso de la vivienda familiar mientras se tramita la liquidación.</span></li>
                        </ul>
                        <p className="text-gray-600 mt-4">Actuar oportunamente puede evitar la pérdida de derechos patrimoniales y facilitar un acuerdo más rápido.</p>
                    </div>

                    {/* CTA FINAL */}
                    <div className="mb-12">
                        <div className="bg-green-900 rounded-2xl p-8 text-center text-white">
                            <h3 className="text-2xl font-serif font-bold text-green-600 mb-3">¿El divorcio avanza y los bienes comunes siguen sin dividirse?</h3>
                            <p className="text-white mb-6">Si el matrimonio terminó pero la sociedad conyugal sigue pendiente de liquidación, cada día sin resolver puede generar conflictos sobre la administración de los bienes. Un abogado de familia puede iniciar el proceso de liquidación y proteger tu parte del patrimonio.</p>
                            <Link
                                to="/abogado-divorcio-unilateral"
                                className="inline-block bg-white text-green-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                Ver abogados especializados en familia
                            </Link>
                        </div>
                    </div>

                    {/* CONCLUSION */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La liquidación de sociedad conyugal es el procedimiento que permite repartir los bienes y deudas acumulados durante el matrimonio bajo este régimen patrimonial.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Aunque muchas veces se relaciona directamente con el divorcio, se trata de un proceso independiente que puede requerir acuerdos, tasaciones y análisis jurídicos complejos.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Comprender qué bienes se reparten, cómo se valoran y cuáles son las alternativas disponibles permite tomar mejores decisiones y evitar conflictos que pueden prolongarse durante años.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La información de este artículo tiene carácter general. Cada liquidación de sociedad conyugal depende del régimen matrimonial aplicable, los bienes existentes, las deudas y las circunstancias particulares de cada pareja.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Si necesitas iniciar una liquidación o enfrentas un conflicto patrimonial post-divorcio, un{" "}
                            <Link to="/abogado-divorcio-unilateral" className="text-green-700 underline hover:text-green-500">
                                abogado especializado en liquidación de bienes
                            </Link>{" "}
                            puede evaluar tu caso y proteger tus intereses patrimoniales.
                        </p>
                    </div>

                    <CategoryCTA category="familia" />

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

            <RelatedLawyers category="Derecho de Familia" />

            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
                <div className="mt-8">
                    <BlogShare
                        title="Liquidación de sociedad conyugal en Chile 2026"
                        url="https://legalup.cl/blog/liquidacion-sociedad-conyugal-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="liquidacion-sociedad-conyugal-chile-2026" />

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