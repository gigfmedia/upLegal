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
            question: "¿Qué es la cobranza judicial en Chile?",
            answer:
            "Es el procedimiento mediante el cual un acreedor recurre a los tribunales para exigir el pago de una deuda cuando el deudor no la ha pagado voluntariamente. A diferencia de la cobranza extrajudicial — llamadas, cartas, empresas de cobranza — la cobranza judicial tiene consecuencias formales: embargo de bienes, retención de cuentas y eventualmente remate de propiedades.",
        },
        {
            question: "¿Qué diferencia hay entre cobranza judicial y extrajudicial?",
            answer:
            "La cobranza extrajudicial ocurre fuera de tribunales — llamadas telefónicas, correos, cartas de empresas de cobranza — y no tiene poder para embargar ni retener bienes. La cobranza judicial se desarrolla dentro de un procedimiento ante un tribunal y puede derivar en embargo, retención de cuentas bancarias o descuento de sueldo mediante resolución judicial.",
        },
        {
            question: "¿Una empresa de cobranza puede embargar mis bienes?",
            answer:
            "No por sí sola. Una empresa de cobranza extrajudicial no tiene ningún poder para embargar bienes ni retener cuentas — solo puede contactarte y negociar. El embargo requiere una resolución judicial dictada dentro de un procedimiento formal ante un tribunal. Si una empresa te amenaza con embargo directamente, eso no tiene respaldo legal sin una sentencia o resolución judicial de por medio.",
        },
        {
            question: "¿Me pueden demandar por una deuda antigua?",
            answer:
            "Depende del tipo de deuda y de cuánto tiempo ha pasado desde que se hizo exigible. En Chile las acciones civiles tienen plazos de prescripción — vencidos esos plazos, el acreedor pierde el derecho a cobrar judicialmente. Sin embargo, la prescripción debe ser alegada por el deudor dentro del juicio — el tribunal no la aplica de oficio. Si tienes una deuda antigua y te demandan, revisar la prescripción con un abogado es el primer paso.",
        },
        {
            question: "¿Qué pasa si me demandan por un pagaré?",
            answer:
            "Si el pagaré cumple los requisitos legales tiene mérito ejecutivo — lo que permite iniciar un juicio ejecutivo directamente sin necesidad de probar la deuda previamente. En ese juicio el deudor puede oponer excepciones como la prescripción, el pago anterior o vicios en el documento, pero dentro de plazos estrictos. Si recibes una notificación de demanda por un pagaré, no ignores los plazos.",
        },
        {
            question: "¿Puedo negociar una deuda después de que me demanden?",
            answer:
            "Sí, en muchos casos es posible llegar a un acuerdo incluso después de iniciada la demanda. Lo importante es documentar correctamente cualquier acuerdo — un correo o conversación verbal no es suficiente. El acuerdo debe quedar registrado en el juicio o formalizarse de manera que el acreedor no pueda seguir cobrando lo mismo después de cumplido el trato.",
        },
        {
            question: "¿Qué hago si recibo una demanda de cobranza judicial?",
            answer:
            "Lo primero es identificar el tribunal, el número de causa, el acreedor y el monto demandado. Lo segundo es revisar los plazos — en un juicio ejecutivo los plazos para oponer excepciones son cortos y su vencimiento puede ser decisivo. No ignorar la notificación es fundamental: un juicio sin defensa avanza automáticamente y puede derivar en embargo sin que hayas tenido oportunidad de defenderte.",
        },
        {
            question: "¿Me pueden embargar el sueldo por una deuda?",
            answer:
            "Sí, pero con límites. Las remuneraciones tienen protección legal especial en Chile — el sueldo mínimo es inembargable por regla general y solo puede retenerse una fracción del exceso según las reglas aplicables. No pueden embargar el sueldo completo. Si recibes una notificación de descuento de sueldo por embargo, revisa que se esté aplicando dentro de los límites legales.",
        },
    ];

    return (
        <div className="min-h-screen bg-white">
            <BlogGrowthHacks
                title="Cobranza judicial en Chile 2026: qué es, cómo funciona y qué hacer si te demandan"
                description="Conoce qué es la cobranza judicial en Chile, cómo funciona, qué diferencia hay con la cobranza extrajudicial, qué hacer si te demandan por una deuda y cómo defenderte."
                image="/assets/cobranza-judicial-chile-2026.png"
                url="https://legalup.cl/blog/cobranza-judicial-chile-2026"
                datePublished="2026-07-30"
                dateModified="2026-07-30"
                faqs={faqs}
            />

            <Header onAuthClick={() => {}} />
            <ReadingProgressBar />

            {/* HERO */}
            <div className="bg-[#f4efdf] text-white py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
                    <div className="flex items-center gap-2 mb-4 text-green-500"><Link to="/blog" className="hover:text-green-900 transition-colors">
                            Blog
                        </Link>
                        <ChevronRight className="h-4 w-4" />
                        <span>Artículo</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-bold text-green-900 font-serif mb-6">
                        Cobranza judicial en Chile 2026: qué es, cómo funciona y qué hacer si te demandan
                    </h1>

                    <div className="bg-white backdrop-blur-sm border rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2 text-green-900">
                            {[
                                "La cobranza judicial ocurre cuando un acreedor recurre a los tribunales para exigir el pago de una deuda",
                                "Una llamada o mensaje de una empresa de cobranza no significa necesariamente que ya exista una demanda",
                                "El procedimiento depende del tipo de deuda y del documento que la respalda",
                                "Un pagaré puede permitir iniciar un juicio ejecutivo cuando cumple los requisitos legales",
                                "Si recibes una demanda o requerimiento de pago, es importante revisar oportunamente el procedimiento y sus plazos",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-500 font-medium">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl text-green-900">
                        Cuando una persona deja de pagar una deuda, el acreedor puede intentar recuperar el dinero mediante gestiones extrajudiciales o recurriendo a los tribunales. Esta diferencia es importante porque recibir llamadas, correos o mensajes de una empresa de cobranza no significa necesariamente que exista una demanda.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6 text-green-900">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>30 de Julio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="cobranza-judicial-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white border sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Cobranza judicial en Chile 2026"
                        url="https://legalup.cl/blog/cobranza-judicial-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            La cobranza judicial supone que el acreedor inicia un procedimiento ante un tribunal para exigir el cumplimiento de una obligación. Dependiendo de los antecedentes, puede tratarse de un juicio ejecutivo u otro procedimiento.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía explicamos qué es la cobranza judicial, cuándo pueden demandarte por una deuda, qué ocurre después de una demanda, qué relación tiene el cobro judicial con un pagaré y qué alternativas puede tener el deudor.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si tu deuda está relacionada con un pagaré, también puedes revisar nuestra guía sobre{" "}
                            <Link
                                to="/blog/pagare-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                Pagaré en Chile 2026
                            </Link>
                            , además de{" "}
                            <Link
                                to="/blog/prescripcion-de-deudas-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                Prescripción de deudas en Chile 2026
                            </Link>.
                        </p>
                    </div>

                    {/* QUE ES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es la cobranza judicial?</h2>
                        <p className="text-gray-600 mb-4">
                            La cobranza judicial es la gestión destinada a obtener el pago de una deuda mediante un procedimiento ante los tribunales.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Antes de llegar a esta etapa, es frecuente que exista cobranza extrajudicial. Puede incluir llamadas, correos, cartas, mensajes o propuestas de convenio. Si estas gestiones no solucionan el incumplimiento, el acreedor puede evaluar iniciar una acción judicial.
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">No todas las deudas se cobran de la misma manera. El procedimiento depende de la naturaleza de la obligación, su vencimiento y los documentos disponibles.</p>
                        </div>
                    </div>

                    {/* DIFERENCIA CON EXTRAJUDICIAL */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuál es la diferencia entre cobranza judicial y extrajudicial?</h2>
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="bg-gray-50 p-5 rounded-xl">
                                <h3 className="font-bold text-gray-900 mb-2">Cobranza extrajudicial</h3>
                                <p className="text-gray-600">Ocurre fuera de un juicio. Una empresa de cobranza puede contactar al deudor para solicitar el pago o proponer un acuerdo.</p>
                            </div>
                            <div className="bg-gray-50 p-5 rounded-xl">
                                <h3 className="font-bold text-gray-900 mb-2">Cobranza judicial</h3>
                                <p className="text-gray-600">Implica la intervención de un tribunal y una causa judicial.</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">Por eso, una comunicación que diga "su deuda será enviada a cobranza judicial" no equivale por sí sola a una demanda. Antes de asumir que existe un juicio, conviene identificar al acreedor, el origen de la deuda y verificar si efectivamente se inició una causa.</p>
                    </div>

                    {/* RelatedLawyers */}
                    <RelatedLawyers category="Derecho Civil" />

                    {/* EMPRESA DE COBRANZA PUEDE DEMANDARME */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Una empresa de cobranza puede demandarme?</h2>
                        <p className="text-gray-600 mb-4">
                            Una empresa de cobranza puede gestionar una deuda por encargo del acreedor. Sin embargo, una llamada o mensaje enviado por esa empresa no constituye automáticamente una demanda.
                        </p>
                        <p className="text-gray-600">
                            Si te informan que ya existe una acción judicial, solicita antecedentes que permitan identificar el tribunal, número de causa, acreedor, monto reclamado y documento en que se basa el cobro. Esto permite distinguir entre una gestión extrajudicial y un procedimiento judicial efectivo.
                        </p>
                    </div>

                    {/* COMO SABER SI EXISTE DEMANDA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo saber si existe una demanda por deuda?</h2>
                        <p className="text-gray-600 mb-4">
                            Si existe una demanda, debe poder identificarse dentro de un procedimiento judicial. Una llamada telefónica, correo electrónico o mensaje de WhatsApp no reemplaza una notificación judicial.
                        </p>
                        <p className="text-gray-600 mb-4">
                            También es importante conocer qué tipo de procedimiento se inició. No es lo mismo una acción ejecutiva basada en un título con mérito ejecutivo que una demanda en la que primero debe discutirse la existencia de la obligación.
                        </p>
                        <p className="text-gray-600">
                            Si recibes documentación judicial, revisa el tribunal, número de causa, partes, monto reclamado y plazos.
                        </p>
                    </div>

                    {/* Primer InArticleCTA */}
                    <div className="mb-12">
                        <div className="bg-cream-900 rounded-2xl p-8 border border-gray-200 text-center">
                            <h3 className="text-2xl font-bold font-serif text-green-900 mb-2">
                                ¿Necesitas respaldar una deuda antes de llegar a un juicio?
                            </h3>
                            <p className="text-green-900 mb-4">
                                Evita problemas futuros generando un Mandato Pagaré profesional,
                                listo para utilizar y enviado inmediatamente a tu correo.
                            </p>
                            <Link
                                to="/documentos/pagare"
                                className="inline-block bg-gray-900 text-white font-bold px-6 py-3 rounded-lg hover:bg-green-900 transition-colors"
                            >
                                Generar Mandato Pagaré →
                            </Link>
                        </div>
                    </div>

                    {/* CUANDO PUEDEN INICIAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo pueden iniciar una cobranza judicial?</h2>
                        <p className="text-gray-600 mb-4">
                            El acreedor puede recurrir a los tribunales cuando existe una obligación cuyo cumplimiento puede ser exigido judicialmente y decide utilizar esa vía.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Antes deben considerarse elementos como el vencimiento de la deuda, su exigibilidad, el documento que la respalda, los pagos efectuados y una eventual prescripción.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">La existencia de una deuda no significa que cualquier procedimiento sea aplicable. La vía dependerá de las características concretas de la obligación.</p>
                        </div>
                    </div>

                    {/* TITULO EJECUTIVO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es un título ejecutivo?</h2>
                        <p className="text-gray-600 mb-4">
                            Un título ejecutivo es un documento al que la ley reconoce características que permiten exigir judicialmente determinadas obligaciones mediante un procedimiento ejecutivo, siempre que se cumplan los requisitos correspondientes.
                        </p>
                        <p className="text-gray-600 mb-4">
                            El pagaré puede tener mérito ejecutivo cuando reúne las condiciones legales. Esto puede permitir al acreedor utilizar un procedimiento de cobro específico.
                        </p>
                        <p className="text-gray-600">No todo documento firmado es automáticamente un título ejecutivo. Por eso, ante una demanda, conviene revisar exactamente qué documento está utilizando el acreedor.</p>
                    </div>

                    {/* RELACION CON JUICIO EJECUTIVO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué relación existe entre cobranza judicial y juicio ejecutivo?</h2>
                        <p className="text-gray-600 mb-4">
                            El juicio ejecutivo es una de las vías mediante las cuales puede exigirse judicialmente una obligación cuando existe un título ejecutivo y se cumplen los requisitos legales.
                        </p>
                        <p className="text-gray-600 mb-4">
                            En este procedimiento pueden producirse actuaciones como el requerimiento de pago y medidas destinadas a obtener el cumplimiento forzado.
                        </p>
                        <p className="text-gray-600">
                            El pagaré es especialmente relevante porque puede servir de fundamento para una ejecución. Si recibes una demanda ejecutiva, revisa no solo el monto reclamado, sino también el título, sus fechas y los pagos realizados.
                        </p>
                        <p className="text-gray-600 mt-2">
                            👉{" "}
                            <Link to="/blog/juicio-ejecutivo-chile-2026" className="text-green-700 underline hover:text-green-500">
                                Juicio ejecutivo en Chile 2026
                            </Link>
                        </p>
                    </div>

                    {/* ME PUEDEN EMBARGAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Me pueden embargar por una deuda?</h2>
                        <p className="text-gray-600 mb-4">
                            El embargo no ocurre simplemente porque una empresa te llame para cobrar. Se trata de una medida que se desarrolla dentro de un procedimiento judicial y debe cumplir las reglas correspondientes.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Por eso hay que diferenciar entre una gestión de cobranza y un embargo judicial. Incluso cuando existe un embargo, esto no significa que los bienes serán rematados inmediatamente.
                        </p>
                        <p className="text-gray-600">
                            👉{" "}
                            <Link to="/blog/embargo-chile-2026" className="text-green-700 underline hover:text-green-500">
                                Embargo en Chile 2026: qué bienes pueden embargarse
                            </Link>
                        </p>
                    </div>

                    {/* QUE BIENES PUEDEN EMBARGARSE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué bienes pueden embargarse?</h2>
                        <p className="text-gray-600 mb-4">
                            Dependiendo del procedimiento, pueden existir bienes y derechos patrimoniales susceptibles de embargo, como:
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Vehículos",
                                "Inmuebles",
                                "Determinados fondos",
                                "Bienes muebles",
                                "Maquinaria",
                                "Derechos patrimoniales",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">La posibilidad concreta depende de las características del bien y de las reglas aplicables. Además, existen bienes protegidos por la legislación.</p>
                        <p className="text-gray-600 mt-2">No es correcto afirmar que frente a cualquier deuda pueden embargarse automáticamente todos los bienes del deudor.</p>
                    </div>

                    {/* PUEDEN EMBARGAR MI CASA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Pueden embargar mi casa?</h2>
                        <p className="text-gray-600">
                            Depende de las circunstancias. La posibilidad de afectar un inmueble debe analizarse considerando la deuda, el procedimiento y la situación del bien. Que exista una deuda no significa que automáticamente se embargará la vivienda del deudor. Deben considerarse las reglas y protecciones aplicables.
                        </p>
                    </div>

                    {/* PUEDEN EMBARGAR MI VEHICULO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Pueden embargar mi vehículo?</h2>
                        <p className="text-gray-600 mb-4">
                            Sí, un vehículo perteneciente al deudor puede encontrarse entre los bienes susceptibles de embargo.
                        </p>
                        <p className="text-gray-600">Sin embargo, deben revisarse la propiedad y las circunstancias concretas. Si el vehículo pertenece a otra persona, ese tercero puede contar con mecanismos para proteger sus derechos.</p>
                    </div>

                    {/* PUEDEN EMBARGAR CUENTAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Pueden embargar cuentas bancarias?</h2>
                        <p className="text-gray-600 mb-4">
                            En determinados procedimientos pueden afectarse fondos del deudor mediante las medidas autorizadas judicialmente.
                        </p>
                        <p className="text-gray-600">Esto no significa que un acreedor pueda simplemente congelar una cuenta por su cuenta. La medida debe desarrollarse dentro del procedimiento correspondiente.</p>
                    </div>

                    {/* PUEDEN EMBARGAR EL SUELDO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Pueden embargar el sueldo?</h2>
                        <p className="text-gray-600 mb-4">
                            Las remuneraciones tienen reglas especiales. No todo el sueldo puede ser afectado libremente y existen límites y condiciones establecidos por la legislación.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">La situación puede variar según el tipo de obligación, por lo que no es recomendable asumir que cualquier deuda permite retener automáticamente una parte determinada del salario.</p>
                        </div>
                    </div>

                    {/* BIENES NO EMBARGABLES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué bienes no pueden embargarse?</h2>
                        <p className="text-gray-600 mb-4">
                            La legislación contempla bienes y derechos protegidos frente al embargo.
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Determinados bienes indispensables del hogar",
                                "Objetos personales",
                                "Herramientas necesarias para ejercer un oficio",
                                "Otros bienes expresamente protegidos",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">La protección concreta debe analizarse según el bien y la norma aplicable.</p>
                    </div>

                    {/* QUE OCURRE DESPUES DEL EMBARGO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre después del embargo?</h2>
                        <p className="text-gray-600 mb-4">
                            El embargo no significa que el bien será rematado inmediatamente. El procedimiento puede continuar con distintas actuaciones, entre ellas:
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Pago de la deuda",
                                "Acuerdo entre las partes",
                                "Levantamiento del embargo",
                                "Realización de bienes cuando corresponda",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Por eso, embargo y remate no son sinónimos.</p>
                    </div>

                    {/* SIEMPRE EXISTE REMATE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Siempre existe un remate?</h2>
                        <p className="text-gray-600 mb-4">
                            No. Un procedimiento puede terminar antes por distintas razones. El deudor puede pagar, las partes pueden llegar a un acuerdo o puede prosperar una defensa.
                        </p>
                        <p className="text-gray-600">
                            También pueden existir circunstancias relacionadas con la prescripción u otros problemas del procedimiento. Recibir una notificación de embargo, por tanto, no significa necesariamente que perderás tus bienes.
                        </p>
                    </div>

                    {/* QUE HACER SI RECIBES DEMANDA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué hacer si recibes una demanda por deuda?</h2>
                        <p className="text-gray-600 mb-4">
                            Lo primero es no ignorarla. Revisa:
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Tribunal",
                                "Número de causa",
                                "Acreedor",
                                "Monto reclamado",
                                "Documento utilizado",
                                "Fecha de las actuaciones",
                                "Plazos aplicables",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">
                            También reúne comprobantes de pago, contratos, pagarés, reconocimientos de deuda, transferencias y comunicaciones relacionadas con la obligación.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl mt-4">
                            <p className="text-red-800">Los plazos judiciales son importantes. Si existe una posibilidad de defensa, actuar tarde puede limitar las alternativas disponibles.</p>
                        </div>
                    </div>

                    {/* NEGOCIAR AUN CON DEMANDA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Puedo negociar una deuda aunque exista una demanda?</h2>
                        <p className="text-gray-600 mb-4">
                            En determinados casos las partes pueden llegar a un acuerdo después de iniciado el procedimiento.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Puede tratarse de un pago total, cuotas, modificación de plazos u otras condiciones.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">El acuerdo debe quedar correctamente documentado y, si existe una causa judicial, debe determinarse qué ocurrirá con ella. Una transferencia por sí sola no necesariamente significa que el juicio terminó.</p>
                        </div>
                    </div>

                    {/* DEUDA ANTIGUA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si la deuda es antigua?</h2>
                        <p className="text-gray-600 mb-4">
                            Una deuda antigua puede plantear un problema de prescripción. Sin embargo, no todas las obligaciones tienen el mismo plazo ni se analizan de la misma manera.
                        </p>
                        <p className="text-gray-600">
                            Debe revisarse el tipo de deuda, cuándo se hizo exigible y qué actuaciones ocurrieron posteriormente. Por eso, una deuda antigua no debe considerarse automáticamente vigente ni automáticamente prescrita.
                        </p>
                        <p className="text-gray-600 mt-2">
                            👉{" "}
                            <Link to="/blog/prescripcion-de-deudas-chile-2026" className="text-green-700 underline hover:text-green-500">
                                Prescripción de deudas en Chile 2026
                            </Link>
                        </p>
                    </div>

                    {/* DEFENSAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué defensas puede tener el deudor?</h2>
                        <p className="text-gray-600 mb-4">
                            Dependiendo del procedimiento y de los antecedentes, pueden existir defensas relacionadas con:
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Pago",
                                "Prescripción",
                                "Falsedad",
                                "Nulidad",
                                "Falta de requisitos del título",
                                "Otras circunstancias reconocidas por la ley",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Cada defensa tiene requisitos y plazos. Por eso, ante una demanda, es recomendable revisar el expediente y el documento utilizado antes de decidir cómo actuar.</p>
                    </div>

                    {/* BIEN EMBARGADO PERTENECE A OTRO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si el bien embargado pertenece a otra persona?</h2>
                        <p className="text-gray-600 mb-4">
                            No todos los bienes que se encuentran en el domicilio del deudor necesariamente le pertenecen.
                        </p>
                        <p className="text-gray-600">
                            Si un tercero acredita que es propietario, puede utilizar los mecanismos legales destinados a proteger sus derechos. La propiedad del bien y los antecedentes que la acrediten pueden ser relevantes para determinar si corresponde mantener el embargo.
                        </p>
                    </div>

                    {/* ACUERDO DESPUES DEL EMBARGO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Puedo llegar a un acuerdo después del embargo?</h2>
                        <p className="text-gray-600 mb-4">
                            Sí, en determinados casos las partes pueden negociar incluso después de practicada la medida.
                        </p>
                        <p className="text-gray-600">
                            Puede acordarse el pago en cuotas, una solución total u otras condiciones. Si se alcanza un acuerdo, es importante dejar constancia de sus términos y determinar cómo se gestionará el procedimiento judicial.
                        </p>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Ignorar una demanda judicial", desc: "No responder no hace desaparecer el procedimiento y puede limitar las defensas." },
                                    { title: "No revisar la prescripción", desc: "Una deuda antigua puede requerir un análisis específico." },
                                    { title: "Creer que embargo significa remate inmediato", desc: "El embargo es una etapa y no implica automáticamente la pérdida del bien." },
                                    { title: "Firmar un convenio sin revisar sus condiciones", desc: "Un acuerdo puede crear nuevas obligaciones." },
                                    { title: "Esperar demasiado para buscar orientación", desc: "Los plazos procesales pueden ser relevantes." },
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

                    <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl mb-6">
                        <p className="font-bold text-amber-900">No dejes pasar los plazos</p>
                        <p className="text-amber-800">Si ya recibiste una notificación judicial, los días cuentan. En un juicio ejecutivo los plazos para oponer defensas son cortos y su vencimiento puede ser decisivo. Cada día sin actuar reduce tus opciones de defender tus bienes.</p>
                    </div>

                    {/* Segundo InArticleCTA */}
                    <InArticleCTA
                        title="¿Recibiste una demanda por una deuda?"
                        message="Un abogado civil puede revisar tu expediente, analizar las alternativas disponibles y orientarte sobre cómo actuar."
                        buttonText="Hablar con un abogado civil"
                        category="Derecho Civil"
                    />

                    {/* CONCLUSION */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La cobranza judicial es distinta de una simple gestión realizada por una empresa de cobranza. Una llamada o mensaje no significa necesariamente que exista una demanda.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Cuando efectivamente existe un procedimiento judicial, es importante identificar el tribunal, la causa, el tipo de acción y el documento utilizado para exigir el pago.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Si la deuda está respaldada por un pagaré u otro título ejecutivo, pueden existir mecanismos de cobro que permitan avanzar hacia medidas como el embargo. Sin embargo, el deudor puede tener alternativas dependiendo de las circunstancias. Si recibiste una demanda, requerimiento de pago o actuación relacionada con un embargo, revisar oportunamente el caso puede ayudarte a conocer tus opciones antes de tomar una decisión. Puedes consultar con un{" "}
                            <Link to="/search?specialty=Derecho Civil" className="text-green-700 underline hover:text-green-500">abogado civil en Chile</Link>{" "}
                            a través de LegalUp.
                        </p>
                    </div>

                    <CategoryCTA category="civil" linkText="Hablar con un abogado civil" />

                    {/* FAQS */}
                    <div className="mt-12 mb-6" data-faq-section>
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
                        <h3 className="text-lg font-bold text-gray-900 mb-4">También te puede interesar</h3>
                        <div className="flex flex-wrap gap-3">
                            <Link
                                to="/blog/juicio-ejecutivo-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Juicio ejecutivo en Chile 2026
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/pagare-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Pagaré en Chile 2026
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/prescripcion-de-deudas-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Prescripción de deudas en Chile
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/embargo-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Embargo en Chile 2026
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                                to="/blog/reconocimiento-de-deuda-chile-2026"
                                className="text-green-700 underline hover:text-green-500 text-sm"
                            >
                                Reconocimiento de deuda en Chile
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
                <div className="mt-8">
                    <BlogShare
                        title="Cobranza judicial en Chile 2026"
                        url="https://legalup.cl/blog/cobranza-judicial-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="cobranza-judicial-chile-2026" />

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

            <BlogConversionPopup category="Derecho Civil" topic="cobranza-judicial" />
        </div>
    );
};

export default BlogArticle;