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
            question: "¿Comprar un celular robado siempre constituye receptación?",
            answer: "No necesariamente. La existencia del delito dependerá de los antecedentes concretos de la investigación y de si concurren los requisitos legales.",
        },
        {
            question: "¿Qué ocurre si devuelvo el objeto?",
            answer: "La devolución puede ser considerada dentro del procedimiento, pero no determina por sí sola el resultado de la investigación. Cada caso debe analizarse individualmente.",
        },
        {
            question: "¿Puedo denunciar si descubrí que me vendieron un objeto robado?",
            answer: "Sí. Si fuiste engañado durante la compra, puedes poner los antecedentes en conocimiento de las autoridades para que investiguen lo ocurrido.",
        },
        {
            question: "¿Qué pasa si compré un vehículo con encargo por robo?",
            answer: "Las investigaciones relacionadas con vehículos suelen requerir peritajes, revisión de números identificatorios y otros antecedentes técnicos. Es recomendable obtener asesoría jurídica lo antes posible.",
        },
        {
            question: "¿La receptación requiere que exista previamente un robo?",
            answer: "Generalmente el bien debe provenir de un delito que permita configurar posteriormente la receptación, aunque cada investigación debe analizar cuál fue el hecho previo y cómo se acredita.",
        },
        {
            question: "¿Necesito un abogado si soy investigado?",
            answer: "No siempre es obligatorio desde el primer momento, pero contar con defensa penal temprana puede ser fundamental para comprender la investigación, preparar la estrategia y ejercer adecuadamente tus derechos.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Receptación en Chile 2026: qué es este delito y cuáles son las penas"
                description="Conoce qué es el delito de receptación en Chile, cuándo se configura, cuáles son las penas, qué ocurre si compraste un objeto robado y cómo funciona la investigación penal."
                image="/assets/receptacion-chile-2026.png"
                url="https://legalup.cl/blog/receptacion-chile-2026"
                datePublished="2026-07-05"
                dateModified="2026-07-05"
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
                        Receptación en Chile 2026: qué es este delito y cuáles son las penas
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "La receptación consiste, en términos generales, en adquirir, recibir, ocultar, transportar o comercializar bienes provenientes de determinados delitos cuando concurren los requisitos establecidos por la ley",
                                "Comprar un objeto robado sin saber razonablemente su origen no significa automáticamente que exista responsabilidad penal",
                                "La Fiscalía debe acreditar los elementos necesarios para configurar el delito de receptación",
                                "La investigación puede iniciarse tras controles policiales, denuncias, ventas por internet o recuperación de especies robadas",
                                "Si eres investigado o fuiste víctima del delito precedente, contar con asesoría jurídica desde el inicio puede ser fundamental",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Comprar un teléfono usado, una bicicleta publicada en redes sociales o un computador ofrecido a un precio muy inferior al mercado puede parecer un buen negocio. Sin embargo, cuando esos bienes provienen de un delito, la situación puede transformarse en una investigación penal por receptación.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>7 de Julio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="receptacion-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Receptación en Chile 2026"
                        url="https://legalup.cl/blog/receptacion-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            Muchas personas creen que este delito solo afecta a quienes venden especies robadas, pero la legislación chilena contempla situaciones mucho más amplias. Dependiendo de las circunstancias, una persona puede ser investigada por adquirir, mantener, transportar, ocultar o comercializar bienes cuya procedencia ilícita debía conocer o respecto de los cuales existían antecedentes que hacían sospechar su origen.
                        </p>
                        <p className="text-gray-600 mt-4">
                            En esta guía actualizada para 2026 explicamos qué es el delito de receptación en Chile, cuándo se configura, cuáles son las penas aplicables, cómo funcionan las investigaciones y qué hacer si eres víctima o estás siendo investigado.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando un conflicto patrimonial, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/robo-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                robo en Chile
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
                                to="/blog/apropiacion-indebida-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                apropiación indebida en Chile
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/estafa-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                estafa en Chile
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/violacion-de-morada-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                violación de morada en Chile
                            </Link>{" "}
                            y{" "}
                            <Link
                                to="/blog/control-de-detencion-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                control de detención en Chile
                            </Link>.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás siendo investigado o necesitas evaluar tu situación, puedes consultar con un{" "}
                            <Link to="/abogados-penales" className="text-green-700 underline hover:text-green-500">
                                abogado penalista en Chile
                            </Link>{" "}
                            directamente online.
                        </p>
                    </div>

                    {/* QUE ES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es el delito de receptación?</h2>
                        <p className="text-gray-600 mb-4">
                            La receptación es un delito que busca sancionar a quienes intervienen posteriormente respecto de bienes provenientes de determinados delitos, favoreciendo su circulación o aprovechamiento.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Su objetivo es evitar que exista un mercado para especies obtenidas ilícitamente.
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">
                                No solo se persigue a quien comete el robo o el hurto original, sino también a quienes posteriormente participan en la cadena de adquisición, ocultamiento o comercialización de esos bienes cuando concurren los requisitos legales.
                            </p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Lo anterior describe el concepto general del delito. Sin embargo, esa evaluación rara vez depende de un solo antecedente. Declaraciones del vendedor, comprobantes de pago, mensajes entre las partes y cámaras de seguridad pueden modificar completamente la interpretación jurídica de los hechos.
                            </p>
                        </div>
                    </div>

                    {/* QUE BIENES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué bienes pueden dar origen a una investigación?</h2>
                        <p className="text-gray-600 mb-4">La receptación puede involucrar una gran variedad de especies.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Teléfonos celulares", "Computadores", "Televisores", "Bicicletas", "Herramientas", "Vehículos", "Joyas", "Maquinaria", "Dinero en determinados casos", "Otros bienes muebles"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Actualmente, muchas investigaciones comienzan a partir de publicaciones en redes sociales o plataformas de compraventa entre particulares.</p>
                    </div>

                    {/* CUANDO EXISTE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo existe realmente receptación?</h2>
                        <p className="text-gray-600 mb-4">No basta con que un objeto haya sido robado anteriormente. La Fiscalía deberá acreditar distintos elementos para configurar el delito.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["El origen ilícito del bien", "La forma en que fue adquirido", "El precio pagado", "Las circunstancias de la compra", "El comportamiento posterior del investigado", "La información que razonablemente podía conocer al momento de adquirir la especie"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Cada investigación es distinta.</p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                La definición legal sugiere que la receptación es sencilla de acreditar. En la práctica, la Fiscalía debe reunir evidencia suficiente para cada elemento, y esa valoración probatoria varía según el caso. No es igual contar con un peritaje que confirme la procedencia ilícita que enfrentar declaraciones contradictorias del vendedor o ausencia de documentación que respalde la compra.
                            </p>
                        </div>
                    </div>

                    {/* COMPRAR OBJETO ROBADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Comprar un objeto robado significa automáticamente cometer receptación?</h2>
                        <p className="text-gray-600 mb-4">
                            No. Este es probablemente el error más común. Muchas personas creen que basta con descubrir posteriormente que un bien era robado para transformarse automáticamente en imputados. No funciona de esa manera.
                        </p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">
                                El procedimiento penal exige analizar múltiples antecedentes antes de determinar si efectivamente concurren los requisitos del delito. Por ejemplo, no es igual comprar un computador en una tienda establecida con documentación tributaria que adquirir un teléfono de alta gama por una fracción de su valor real a un desconocido en la vía pública. Todas esas circunstancias pueden ser consideradas durante la investigación.
                            </p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                La respuesta general es no — pero si ya existe una investigación 
                                en tu contra, lo que importa no es la regla general sino los 
                                antecedentes específicos de tu caso. Eso requiere revisión profesional.
                            </p>
                        </div>
                    </div>

                    {/* SITUACIONES QUE GENERAN SOSPECHAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué situaciones suelen generar sospechas?</h2>
                        <p className="text-gray-600 mb-4">Existen ciertos antecedentes que frecuentemente llaman la atención de la Fiscalía o de las policías.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Precios extremadamente bajos", "Ausencia total de documentación", "Eliminación de números de serie", "Bienes con sistemas de bloqueo activos", "Ventas realizadas de forma apresurada", "Publicaciones anónimas", "Negativa del vendedor a acreditar la propiedad"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Estos antecedentes no prueban por sí solos la existencia del delito, pero pueden formar parte del análisis probatorio.</p>
                    </div>

                    {/* COMO COMIENZA INVESTIGACION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo comienza una investigación?</h2>
                        <p className="text-gray-600 mb-4">Las investigaciones por receptación pueden iniciarse de distintas maneras.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Denuncias por robo", "Controles policiales", "Fiscalizaciones de vehículos", "Recuperación de especies robadas", "Investigaciones de la PDI", "Publicaciones detectadas en plataformas digitales", "Información entregada por terceros"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Una vez iniciada la investigación, la Fiscalía determinará qué diligencias resultan necesarias.</p>
                    </div>

                    {/* DILIGENCIAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué diligencias puede realizar la Fiscalía?</h2>
                        <p className="text-gray-600 mb-4">Dependiendo del caso, pueden ordenarse distintas actuaciones investigativas.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Declaraciones", "Incautación de especies", "Peritajes", "Revisión de números de serie", "Análisis de dispositivos electrónicos", "Revisión de publicaciones en internet", "Levantamiento de cámaras de seguridad", "Informes policiales"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Todo ello busca establecer el origen del bien y la eventual participación del investigado.</p>
                    </div>

                    {/* OBJETO ROBADO EN PODER */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si la policía encuentra un objeto robado en mi poder?</h2>
                        <p className="text-gray-600 mb-4">Encontrar una especie robada no significa automáticamente que exista una condena. Sin embargo, sí puede dar origen a una investigación.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Cuándo fue adquirida", "Quién la vendió", "Cuánto se pagó", "Qué antecedentes tenía el comprador", "Si existían documentos", "Si era razonable sospechar del origen del bien"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Cada uno de estos elementos puede influir en el desarrollo de la causa.</p>
                    </div>

                    {/* DIFERENCIAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Diferencias entre receptación, robo y hurto</h2>
                        <p className="text-gray-600 mb-4">Es común confundir estos delitos. La diferencia principal radica en el momento en que interviene cada persona.</p>
                        <div className="space-y-3">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Robo</h3>
                                <p className="text-gray-600">El autor participa directamente en la sustracción mediante violencia, intimidación o fuerza cuando la ley así lo establece.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Hurto</h3>
                                <p className="text-gray-600">Existe una apropiación sin violencia ni intimidación en las personas.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Receptación</h3>
                                <p className="text-gray-600">La persona interviene posteriormente respecto del bien obtenido mediante otro delito, siempre que concurran los requisitos legales.</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">Por ello, una misma investigación puede involucrar simultáneamente delitos de robo, hurto y receptación respecto de distintas personas.</p>
                    </div>

                    {/* CTA IN-ARTICLE */}
                    <InArticleCTA
                        message="¿Ya existe una investigación en tu contra o la policía incautó algo tuyo? El momento de consultar con un abogado es antes de declarar, no después."
                        buttonText="Habla con un abogado ahora"
                        category="Derecho Penal"
                    />

                    {/* PENAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuáles son las penas por receptación en Chile?</h2>
                        <p className="text-gray-600 mb-4">Las sanciones aplicables dependerán de diversos factores establecidos por la legislación penal.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["La naturaleza del bien", "El delito del cual proviene", "Las circunstancias de la investigación", "La existencia de agravantes o atenuantes", "La participación atribuida al imputado"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Por esa razón, no todas las investigaciones por receptación terminan con la misma consecuencia jurídica. Cada caso requiere un análisis individual de los antecedentes reunidos por la Fiscalía.</p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                El marco penal ayuda a comprender el riesgo teórico, pero dos personas formalizadas por receptación pueden enfrentar resultados distintos. Una puede acceder a una suspensión condicional del procedimiento si cumple los requisitos; otra puede llegar a juicio oral. La diferencia no la determina solo la ley sino los antecedentes específicos que la Fiscalía reúna durante la investigación y la documentación que cada persona pueda aportar.
                            </p>
                        </div>
                    </div>

                    {/* MARKETPLACE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si compré un producto por Marketplace o redes sociales?</h2>
                        <p className="text-gray-600 mb-4">
                            Actualmente una parte importante de las investigaciones por receptación nace en plataformas de compraventa entre particulares. Facebook Marketplace, grupos de compraventa, Instagram y otras aplicaciones permiten vender objetos usados con facilidad, pero también pueden ser utilizadas para ofrecer especies obtenidas mediante delitos.
                        </p>
                        <p className="text-gray-600 mb-4">Comprar por estos medios no constituye un delito por sí mismo. Sin embargo, resulta recomendable adoptar ciertas precauciones:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Solicitar comprobantes de compra cuando existan", "Verificar la identidad del vendedor", "Desconfiar de precios muy inferiores al mercado", "Revisar números de serie cuando sea posible", "Evitar pagos en efectivo sin respaldo", "Conservar conversaciones y comprobantes de transferencia"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Estos antecedentes pueden resultar relevantes si posteriormente surge una investigación.</p>
                    </div>

                    {/* NO SABIA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si no sabía que era robado?</h2>
                        <p className="text-gray-600 mb-4">Es una de las preguntas más frecuentes. La respuesta depende completamente de las circunstancias del caso.</p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">
                                Durante la investigación, la Fiscalía analizará si existían antecedentes suficientes para que una persona razonable sospechara del origen ilícito del bien. No basta únicamente con afirmar que se desconocía el origen. También se evaluarán factores como el precio pagado, el lugar de compra, la conducta del vendedor, la documentación entregada, el estado del objeto y las explicaciones entregadas por el comprador.
                            </p>
                        </div>
                    </div>

                    {/* INC AUTA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué hacer si la policía incauta un objeto que compraste?</h2>
                        <p className="text-gray-600 mb-4">En algunos casos, durante un control policial o una investigación, las autoridades pueden incautar especies que aparecen registradas como robadas.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Mantener la calma", "Entregar los antecedentes solicitados", "Conservar los comprobantes de compra", "Identificar al vendedor", "No destruir evidencia", "Consultar con un abogado antes de prestar declaraciones extensas"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Una explicación clara y respaldada por documentación puede ser relevante para el desarrollo de la investigación.</p>
                        <p className="text-gray-600 mt-4">
                            En esta etapa es clave contar con un{" "}
                            <Link to="/abogados-penales" className="text-green-700 underline hover:text-green-500">
                                abogado especialista en defensa penal por receptación
                            </Link>{" "}
                            antes de prestar cualquier declaración formal.
                        </p>
                    </div>

                    {/* COMO SE DESARROLLA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo se desarrolla una investigación por receptación?</h2>
                        <p className="text-gray-600 mb-4">Una vez iniciada la causa, la Fiscalía puede ordenar distintas diligencias destinadas a establecer tanto el origen del bien como la participación de las personas involucradas.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Declaración del denunciante", "Declaración del imputado", "Revisión de publicaciones en internet", "Análisis de registros telefónicos", "Levantamiento de cámaras de seguridad", "Informes periciales", "Identificación del autor del delito precedente", "Recuperación de especies"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Dependiendo de los resultados, la investigación podrá avanzar hacia una formalización, archivarse o terminar mediante otras salidas previstas por la ley.</p>
                    </div>

                    {/* DETENCION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Puede haber detención por receptación?</h2>
                        <p className="text-gray-600 mb-4">
                            Sí. Si una persona es sorprendida en situación de flagrancia o concurren otros requisitos legales, puede ser detenida e ingresar posteriormente a una audiencia de control de detención.
                        </p>
                        <p className="text-gray-600">
                            En esa audiencia el juez revisará la legalidad de la detención y la Fiscalía comunicará, cuando corresponda, el inicio de la investigación. Si quieres conocer esa etapa con mayor detalle, revisa nuestra guía sobre{" "}
                            <Link to="/blog/control-de-detencion-chile-2026" className="text-green-700 underline">Control de detención en Chile 2026</Link>.
                        </p>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Comprar únicamente por el precio", desc: "Muchas investigaciones comienzan porque el comprador aceptó un precio extremadamente inferior al valor real del producto. Aunque las ofertas existen, precios desproporcionadamente bajos deben ser analizados con cautela." },
                                    { title: "No pedir ningún antecedente", desc: "Comprar sin solicitar el nombre del vendedor, comprobantes, documentos o registros de la operación dificulta posteriormente acreditar cómo se obtuvo el bien." },
                                    { title: "Eliminar conversaciones", desc: "Cuando surge una investigación algunas personas eliminan chats, publicaciones o comprobantes. Esto suele ser un error. Conservar toda la información puede ayudar a reconstruir correctamente la operación." },
                                    { title: "Declarar sin asesoría jurídica", desc: "Si ya existe una investigación penal, prestar declaraciones sin conocer previamente los antecedentes puede afectar la estrategia de defensa. Recibir orientación temprana suele ser una decisión prudente." },
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

                    {/* RELACION CON OTROS DELITOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Relación con otros delitos</h2>
                        <p className="text-gray-600 mb-4">La receptación muchas veces aparece vinculada a otros delitos patrimoniales.</p>
                        <div className="space-y-3">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Robo</h3>
                                <p className="text-gray-600">Cuando las especies provienen de una sustracción con violencia, intimidación o fuerza.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Hurto</h3>
                                <p className="text-gray-600">Cuando los bienes fueron obtenidos mediante una apropiación sin violencia sobre las personas.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Apropiación indebida</h3>
                                <p className="text-gray-600">Cuando la persona que tenía legítimamente un bien decide apropiárselo en contra de la ley.</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">
                            Cada uno posee requisitos distintos y sanciones propias, por lo que resulta importante identificar correctamente cuál es la figura jurídica aplicable. Si deseas conocer las diferencias, revisa nuestras guías sobre{" "}
                            <Link to="/blog/robo-chile-2026" className="text-green-700 underline">Robo en Chile</Link>
                            ,{" "}
                            <Link to="/blog/hurto-chile-2026" className="text-green-700 underline">Hurto en Chile</Link>{" "}
                            y{" "}
                            <Link to="/blog/apropiacion-indebida-chile-2026" className="text-green-700 underline">Apropiación indebida en Chile</Link>.
                        </p>
                    </div>

                    {/* CUANDO CONSULTAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿En qué situaciones conviene consultar cuanto antes a un abogado penal?</h2>
                        <p className="text-gray-600 mb-4">Existen situaciones concretas donde la asesoría jurídica suele ser especialmente relevante:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Carabineros encontró especies en tu poder durante un control",
                                "Recibiste una citación de la Fiscalía a declarar",
                                "Te notificaron una formalización de la investigación",
                                "La policía incautó especies que compraste",
                                "Existe una audiencia programada en el tribunal",
                                "La Fiscalía solicitó medidas cautelares en tu contra",
                                "Eres imputado en una causa penal por receptación",
                                "Quieres evaluar una salida alternativa como un acuerdo reparatorio",
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-600 flex-shrink-0">•</span>
                                    <span className="text-gray-700 font-bold">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* CTA PRINCIPAL */}
                    <div className="mb-12">
                        <div className="bg-green-900 rounded-2xl p-8 text-center">
                            <h3 className="text-2xl font-bold font-serif text-green-600 mb-3">¿Ya existe una investigación formal en tu contra?</h3>
                            <p className="text-white mb-6">Si la Fiscalía ya te citó a declarar o formalizó la investigación, el momento más importante para contar con asesoría jurídica es antes de presentarte a declarar — no después de haber prestado declaración.</p>
                            <Link
                                to="/abogados-penales"
                                className="inline-block bg-white text-green-900 font-bold px-8 py-3 rounded-md hover:bg-gray-100 transition-colors"
                            >
                                Ver abogados penalistas disponibles
                            </Link>
                        </div>
                    </div>

                    {/* CONCLUSION */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La receptación busca evitar que los bienes provenientes de delitos continúen circulando en el mercado. Por ello, tanto quienes compran como quienes venden objetos usados deben actuar con la debida diligencia y conservar antecedentes que acrediten el origen de las especies — boletas, contratos de compraventa, datos del vendedor.
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Esta guía describe las reglas generales del delito de receptación en Chile. La pregunta que queda abierta es cómo se aplican esas reglas a los hechos específicos de cada investigación. Esa respuesta depende de cómo se combinen y valoren los antecedentes concretos del caso. Si quieres profundizar, revisa también nuestras guías sobre{" "}
                            <Link to="/blog/orden-de-alejamiento-chile-2026" className="text-green-700 underline hover:text-green-500">Orden de alejamiento en Chile: guía legal 2026</Link>
                            ,{" "}
                            <Link to="/blog/lesiones-leves-chile-2026" className="text-green-700 underline hover:text-green-500">Lesiones leves en Chile: qué dice la ley</Link>{" "}
                            y{" "}
                            <Link to="/blog/derecho-penal-chile-2026" className="text-green-700 underline hover:text-green-500">derecho penal en Chile</Link>. Si quieres revisar tu situación particular, puedes consultar con un{" "}
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
                        title="Receptación en Chile 2026"
                        url="https://legalup.cl/blog/receptacion-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="receptacion-chile-2026" />

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
        <BlogConversionPopup category="Derecho Penal" topic="receptacion" />
        </div>
    );
};

export default BlogArticle;