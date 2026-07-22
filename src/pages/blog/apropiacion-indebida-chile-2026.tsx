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
            question: "¿Qué diferencia existe entre apropiación indebida y estafa?",
            answer: "La principal diferencia es que en la estafa existe un engaño desde el inicio para obtener el dinero o los bienes. En la apropiación indebida, la entrega inicial es legítima y el delito aparece cuando posteriormente la persona decide quedarse con lo recibido.",
        },
        {
            question: "¿Puedo denunciar si existe un contrato firmado?",
            answer: "Sí. La existencia de un contrato no impide necesariamente que exista apropiación indebida. Sin embargo, será necesario analizar si los hechos configuran un delito o únicamente un incumplimiento contractual.",
        },
        {
            question: "¿Cuánto tiempo demora una investigación?",
            answer: "Depende de la complejidad del caso. Las investigaciones que requieren peritajes contables, análisis bancarios o numerosas declaraciones suelen extenderse más que aquellas con prueba documental clara.",
        },
        {
            question: "¿Qué pruebas son las más importantes?",
            answer: "Generalmente destacan los contratos, comprobantes de transferencias, rendiciones de cuentas, correos electrónicos, conversaciones de WhatsApp y declaraciones de testigos.",
        },
        {
            question: "¿Se puede recuperar el dinero perdido?",
            answer: "En algunos casos sí. Ello dependerá del estado de la investigación, de las acciones ejercidas y de la existencia de bienes que permitan responder por el perjuicio causado.",
        },
        {
            question: "¿Necesito un abogado para denunciar?",
            answer: "No siempre es obligatorio, pero contar con un abogado penalista suele facilitar la preparación de la denuncia, la recopilación de pruebas y el seguimiento de la investigación.",
        },
        {
            question: "¿Qué ocurre si soy inocente?",
            answer: "Toda persona investigada mantiene la presunción de inocencia. Una defensa técnica adecuada permitirá revisar los antecedentes de la carpeta investigativa y demostrar, cuando corresponda, que los hechos no constituyen un delito o que no existió participación en ellos.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Apropiación indebida en Chile: penas, ejemplos y cómo denunciar (2026)"
                description="¿Te apropiaron dinero o bienes en Chile? Descubre qué es la apropiación indebida, ejemplos comunes, las penas asociadas y cómo presentar una denuncia penal paso a paso."
                image="/assets/apropiacion-indebida-chile-2026.png"
                url="https://legalup.cl/blog/apropiacion-indebida-chile-2026"
                datePublished="2026-06-25"
                dateModified="2026-06-25"
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
                        Apropiación indebida en Chile: penas, ejemplos y cómo denunciar (2026)
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "La apropiación indebida ocurre cuando una persona se queda ilícitamente con dinero o bienes que recibió legítimamente",
                                "No toda deuda o incumplimiento contractual constituye apropiación indebida",
                                "Es frecuente en relaciones comerciales, mandatos, administraciones, arriendos y sociedades",
                                "La víctima puede denunciar ante Fiscalía, Carabineros o PDI",
                                "Contar con un abogado penalista permite evaluar si existe un delito o un conflicto exclusivamente civil",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Uno de los delitos patrimoniales que más dudas genera en Chile es la apropiación indebida. Muchas personas escuchan este concepto cuando un tercero no devuelve dinero, cuando desaparecen fondos administrados por otra persona o cuando alguien se niega a entregar bienes que recibió de forma legítima.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>25 de Junio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="apropiacion-indebida-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Apropiación indebida en Chile: penas, ejemplos y cómo denunciar (2026)"
                        url="https://legalup.cl/blog/apropiacion-indebida-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            En la práctica, este delito aparece con frecuencia en situaciones como: administradores que retienen dinero de una empresa, corredores que no entregan fondos recibidos, mandatarios que utilizan dinero ajeno para fines personales, socios que disponen indebidamente de bienes comunes, personas que reciben bienes para venderlos y nunca entregan el dinero obtenido, y trabajadores que administran recursos de terceros.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando un conflicto patrimonial, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/robo-chile-2026"
                                className="text-green-900 underline hover:text-green-600"
                            >
                                robo en Chile
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/hurto-chile-2026"
                                className="text-green-900 underline hover:text-green-600"
                            >
                                hurto en Chile
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/estafa-chile-2026"
                                className="text-green-900 underline hover:text-green-600"
                            >
                                estafa en Chile
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/receptacion-en-chile-2026"
                                className="text-green-900 underline hover:text-green-600"
                            >
                                receptación en Chile
                            </Link>{" "}
                            y{" "}
                            <Link
                                to="/blog/orden-de-alejamiento-chile-2026"
                                className="text-green-900 underline hover:text-green-600"
                            >
                                orden de alejamiento
                            </Link>.
                        </p>
                    </div>

                    {/* QUE ES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es la apropiación indebida?</h2>
                        <p className="text-gray-600 mb-4">
                            La apropiación indebida es un delito patrimonial que ocurre cuando una persona recibe legítimamente dinero, bienes o cualquier otro patrimonio ajeno y posteriormente decide apropiarse de ellos como si fueran propios.
                        </p>
                        <p className="text-gray-600 mb-4">
                            A diferencia del robo o del hurto, aquí el bien llega inicialmente de forma voluntaria al autor. Lo ilícito aparece después, cuando quien recibió esos bienes incumple la obligación de devolverlos, entregarlos o administrarlos conforme al acuerdo existente.
                        </p>

                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">
                                El problema no está en cómo recibió los bienes, sino en el uso indebido que realiza posteriormente.
                            </p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                La definición anterior describe la figura penal en abstracto. En la práctica, acreditar que hubo intención de apropiarse de los bienes y no un mero retraso en la devolución requiere analizar las comunicaciones entre las partes, el destino de los fondos y las gestiones de cobro previas. Esa diferencia entre la regla general y la prueba concreta es la que define el rumbo de cada investigación.
                            </p>
                        </div>
                    </div>

                    <RelatedLawyers category="Derecho Penal" />


                    {/* CUANDO EXISTE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo existe apropiación indebida?</h2>
                        <p className="text-gray-600 mb-4">No basta con que exista una pérdida económica. Para que se configure este delito normalmente deben concurrir diversos elementos.</p>
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Recepción legítima del bien</h3>
                                <p className="text-gray-600">El dinero o los bienes son entregados voluntariamente. Inicialmente no existe ningún acto ilícito.</p>
                                <div className="mt-2 text-sm text-gray-500">Ejemplos: cliente entrega dinero a un mandatario, empresa entrega equipos a un trabajador, propietario entrega recursos a un administrador.</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Obligación de devolver o rendir cuentas</h3>
                                <p className="text-gray-600">La persona recibe los bienes con una obligación jurídica determinada: restituir el dinero, entregar el producto de una venta, administrar fondos, custodiar especies o ejecutar un mandato.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Apropiación posterior</h3>
                                <p className="text-gray-600">El delito aparece cuando quien recibió esos bienes decide actuar como si fueran propios: gastar el dinero, vender los bienes, negarse a devolverlos, ocultarlos o desconocer la obligación existente.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Perjuicio económico</h3>
                                <p className="text-gray-600">La conducta debe generar un daño patrimonial para el verdadero propietario. Si no existe perjuicio económico, difícilmente podrá configurarse el delito.</p>
                            </div>
                        </div>
                    </div>

                    {/* DIFERENCIA CON ESTAFA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Diferencia entre apropiación indebida y estafa</h2>
                        <p className="text-gray-600 mb-4">Es muy frecuente que ambos delitos se confundan. Sin embargo, presentan diferencias importantes.</p>
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="bg-red-50 p-5 rounded-xl border border-red-200">
                                <h3 className="font-bold text-red-800 text-lg mb-2">Estafa</h3>
                                <p className="text-red-700">El engaño existe desde el comienzo. La víctima entrega voluntariamente su dinero porque fue engañada.</p>
                                <p className="text-red-600 text-sm mt-2">Ejemplo: una persona vende un automóvil inexistente.</p>
                            </div>

                        


                            <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
                                <h3 className="font-bold text-blue-800 text-lg mb-2">Apropiación indebida</h3>
                                <p className="text-blue-700">No existe un engaño inicial. La entrega de bienes es completamente legítima. El problema aparece cuando posteriormente quien recibió esos bienes decide quedarse con ellos.</p>
                                <p className="text-blue-600 text-sm mt-2">Ejemplo: una persona recibe un vehículo para venderlo y nunca entrega el dinero obtenido.</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">Esta diferencia resulta fundamental al momento de presentar una denuncia.</p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                La diferencia entre uno y otro delito parece clara en la teoría. En la práctica, una misma relación de hechos puede ser calificada como estafa o apropiación indebida según lo que las pruebas muestren sobre la intención inicial de quien recibió los bienes. La Fiscalía debe determinar si existió engaño desde el origen, y esa calificación cambia la estrategia de defensa.
                            </p>
                        </div>
                    </div>
<InArticleCTA category="Derecho Penal"  title="¿Te acusan de apropiación indebida?" message="Un abogado penal puede revisar si hubo ánimo de lucro, evaluar las pruebas y definir tu estrategia de defensa." />


                    {/* EJEMPLOS FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Ejemplos frecuentes de apropiación indebida</h2>
                        <p className="text-gray-600 mb-4">En Chile los casos más comunes suelen involucrar relaciones de confianza.</p>
                        <div className="space-y-3">
                            {[
                                { title: "Administrador que utiliza dinero de la empresa", desc: "Una empresa entrega recursos para pagar proveedores. El administrador utiliza esos fondos para gastos personales." },
                                { title: "Corredor de propiedades", desc: "Recibe garantías o arriendos y nunca entrega el dinero al propietario." },
                                { title: "Mandatario", desc: "Administra bienes de un tercero y termina apropiándose de ellos." },
                                { title: "Venta por consignación", desc: "Una persona recibe productos para vender. Realiza la venta, pero nunca paga al dueño." },
                                { title: "Sociedades", desc: "Un socio dispone de bienes sociales exclusivamente en beneficio propio." },
                                { title: "Administración de comunidades", desc: "Fondos comunes son utilizados para fines completamente distintos a los autorizados." },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                                    <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mt-0.5">{i + 1}</div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">{item.title}</h4>
                                        <p className="text-gray-600">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Estos casos suelen generar investigaciones penales cuando existen antecedentes suficientes para acreditar la apropiación.</p>
                    </div>

                    {/* PRUEBAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pruebas sirven para acreditar la apropiación indebida?</h2>
                        <p className="text-gray-600 mb-4">La evidencia es uno de los aspectos más importantes.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Contratos", "Transferencias bancarias", "Facturas", "Boletas", "Correos electrónicos", "WhatsApp", "Testigos", "Rendiciones de cuentas"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* COMO DENUNCIAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo denunciar una apropiación indebida?</h2>
                        <p className="text-gray-600 mb-4">Si consideras que alguien se apropió ilegalmente de bienes o dinero que le entregaste, es recomendable actuar oportunamente.</p>
                        <div className="grid sm:grid-cols-3 gap-4 mb-4">
                            {[
                                { title: "Fiscalía", desc: "Permite iniciar formalmente una investigación penal." },
                                { title: "Carabineros", desc: "Una de las vías más utilizadas por las víctimas." },
                                { title: "Policía de Investigaciones (PDI)", desc: "También puede recibir denuncias por este delito." },
                            ].map((item, i) => (
                                <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                                    <p className="text-gray-500 text-sm mt-1">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">Mientras más antecedentes existan al momento de denunciar, mayores posibilidades tendrá la investigación de avanzar rápidamente. Por ello conviene reunir previamente toda la documentación disponible.</p>
                        </div>
                    </div>

                    {/* QUE OCURRE DESPUES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre después de presentar la denuncia?</h2>
                        <p className="text-gray-600 mb-4">Una vez iniciada la investigación, la Fiscalía puede ordenar diversas diligencias.</p>
                        <div className="bg-gray-50 p-5 rounded-xl">
                            <ul className="space-y-1 text-gray-700">
                                <li>• Declaraciones</li>
                                <li>• Solicitud de antecedentes bancarios</li>
                                <li>• Incautación de documentación</li>
                                <li>• Peritajes contables</li>
                                <li>• Revisión de contratos</li>
                                <li>• Declaración de testigos</li>
                                <li>• Obtención de información financiera</li>
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">El objetivo será determinar si efectivamente existía una obligación de restitución y si posteriormente ocurrió una apropiación ilícita.</p>
                    </div>

                    {/* ENTRE FAMILIARES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Puede existir apropiación indebida entre familiares?</h2>
                        <p className="text-gray-600">
                            Sí. La existencia de vínculos familiares no impide necesariamente que se investigue este delito. Por ejemplo: administración de herencias, manejo de cuentas bancarias, bienes entregados para custodia o mandatos familiares. Sin embargo, cada caso debe analizarse individualmente considerando las circunstancias específicas y la evidencia disponible.
                        </p>
                    </div>

                    {/* PENAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué penas contempla la apropiación indebida?</h2>
                        <p className="text-gray-600 mb-4">
                            Las sanciones por apropiación indebida dependen principalmente del valor económico involucrado y de las circunstancias específicas del caso. La legislación chilena contempla distintas penas según la gravedad de los hechos y el perjuicio ocasionado a la víctima.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="text-red-800">
                                Además de las sanciones penales, el responsable puede verse obligado a indemnizar los daños y perjuicios ocasionados, devolver los bienes apropiados o restituir el dinero recibido.
                            </p>
                        </div>
                        <p className="text-gray-600 mt-4">
                            Cuando el delito afecta importantes sumas de dinero o involucra múltiples víctimas, la investigación suele ser más compleja y puede requerir peritajes contables y financieros para determinar el monto exacto del perjuicio.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                El marco penal ayuda a dimensionar el riesgo abstracto. Pero dos personas imputadas por apropiación indebida pueden transitar caminos procesales distintos: una puede quedar con una suspensión condicional del procedimiento, la otra puede enfrentar un juicio oral si los antecedentes así lo justifican. Esa diferencia no la determina solo el monto sino los elementos concretos de la carpeta investigativa.
                            </p>
                        </div>
                    </div>

                    {/* INCUMPLIMIENTO DE CONTRATO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Apropiación indebida o incumplimiento de contrato</h2>
                        <p className="text-gray-600 mb-4">
                            Uno de los errores más frecuentes consiste en pensar que cualquier persona que no paga una deuda está cometiendo apropiación indebida. Esto no es correcto.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="bg-gray-50 p-5 rounded-xl">
                                <h3 className="font-bold text-gray-900 mb-2">Incumplimiento de contrato</h3>
                                <p className="text-gray-600">Un cliente que no paga una factura, un comprador que incumple un contrato, una empresa que retrasa un pago o un proveedor que incumple plazos de entrega.</p>
                                <p className="text-gray-500 text-sm mt-2">Estas situaciones normalmente generan acciones civiles por incumplimiento de contrato, pero no necesariamente configuran un delito.</p>
                            </div>
                            <div className="bg-blue-50 p-5 rounded-xl">
                                <h3 className="font-bold text-blue-800 mb-2">Apropiación indebida</h3>
                                <p className="text-blue-700">Supone que la persona recibió bienes o dinero ajeno con una obligación específica de administrarlos, entregarlos o devolverlos y posteriormente decidió apropiarse de ellos.</p>
                                <p className="text-blue-600 text-sm mt-2">Distinguir correctamente ambas situaciones resulta fundamental antes de presentar una denuncia.</p>
                            </div>
                        </div>
                    </div>

                    {/* DEVOLUCION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si la persona devuelve el dinero?</h2>
                        <p className="text-gray-600 mb-4">Una pregunta frecuente es si devolver posteriormente el dinero elimina el delito. La respuesta dependerá de las circunstancias del caso.</p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">
                                La devolución puede influir en el desarrollo del proceso penal, especialmente respecto de la reparación del daño causado, pero ello no significa automáticamente que desaparezca la responsabilidad penal. Cada investigación es distinta y corresponde a la Fiscalía y posteriormente al tribunal evaluar todos los antecedentes disponibles.
                            </p>
                        </div>
                        <p className="text-gray-600 mt-4">Por ello, nunca debe asumirse que una devolución tardía pone término inmediato al procedimiento.</p>
                    </div>

                    {/* SI TE ACUSAN */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué hacer si te acusan de apropiación indebida?</h2>
                        <p className="text-gray-600 mb-4">Ser denunciado por este delito no significa automáticamente que exista responsabilidad penal. Toda persona mantiene la presunción de inocencia mientras no exista una sentencia condenatoria.</p>
                        <div className="space-y-3">
                            {[
                                { title: "No ocultar documentación", desc: "Eliminar contratos, comprobantes o registros puede agravar la investigación. Es preferible conservar toda la documentación relacionada con los hechos." },
                                { title: "No declarar impulsivamente", desc: "Muchas personas intentan explicar inmediatamente lo ocurrido sin conocer los antecedentes que existen en la carpeta investigativa. Antes de prestar declaración es recomendable recibir asesoría jurídica." },
                                { title: "Reunir evidencia", desc: "Contratos, transferencias, correos electrónicos, WhatsApp, facturas y rendiciones de cuentas. Todo aquello que permita demostrar cómo ocurrieron realmente los hechos puede resultar relevante para la defensa." },
                                { title: "Buscar asesoría penal temprana", desc: "Un abogado penalista podrá revisar si efectivamente concurren los elementos del delito o si el conflicto corresponde únicamente a una controversia civil." },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                                    <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mt-0.5">{i + 1}</div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">{item.title}</h4>
                                        <p className="text-gray-600">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* QUE DEBE HACER LA VICTIMA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué debe hacer la víctima?</h2>
                        <p className="text-gray-600 mb-4">Si consideras que alguien se apropió indebidamente de dinero o bienes tuyos, es recomendable actuar rápidamente. Mientras más tiempo transcurra, mayores dificultades pueden existir para recuperar evidencia.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Reunir contratos", "Guardar comprobantes bancarios", "Conservar conversaciones", "No eliminar correos electrónicos", "Identificar testigos", "Solicitar asesoría jurídica antes de presentar acciones"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-green-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Una denuncia bien documentada facilita considerablemente el trabajo de la Fiscalía.</p>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes en casos de apropiación indebida</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Esperar demasiado tiempo", desc: "Muchas personas intentan resolver el conflicto informalmente durante meses o incluso años. Mientras tanto, la evidencia puede desaparecer y los antecedentes financieros pueden resultar más difíciles de reconstruir." },
                                    { title: "No conservar documentación", desc: "Contratos extraviados, comprobantes eliminados, conversaciones borradas. Estos errores dificultan acreditar la existencia de la obligación inicial." },
                                    { title: "Confundir una deuda con un delito", desc: "No toda obligación impaga constituye apropiación indebida. Antes de iniciar acciones penales conviene evaluar jurídicamente el caso." },
                                    { title: "Firmar acuerdos sin asesoría", desc: "En ocasiones las partes celebran documentos que terminan perjudicando su posición jurídica. Por ello resulta recomendable revisar cualquier acuerdo junto a un abogado." },
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

                    {/* COMO DEMOSTRAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo demostrar la existencia del delito?</h2>
                        <p className="text-gray-600 mb-4">La Fiscalía debe acreditar diversos elementos para obtener una condena.</p>
                        <div className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Que existió una entrega legítima de bienes o dinero",
                                "Que había obligación de devolución, administración o entrega",
                                "Que posteriormente el imputado actuó como propietario de esos bienes",
                                "Que ello produjo un perjuicio económico para la víctima",
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-red-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">La combinación de prueba documental, financiera y testimonial suele ser determinante en este tipo de investigaciones.</p>
                    </div>

                    {/* RECUPERAR DINERO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Es posible recuperar el dinero?</h2>
                        <p className="text-gray-600 mb-4">Muchas víctimas presentan una denuncia con el objetivo principal de recuperar los fondos perdidos.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Existencia de bienes del imputado", "Estado de la investigación", "Posibles medidas cautelares", "Acciones civiles complementarias", "Acuerdos entre las partes"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-gray-500">•</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Por ello resulta importante evaluar la estrategia jurídica más conveniente desde el inicio del conflicto.</p>
                    </div>

                    {/* CUANDO CONSULTAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿En qué situaciones conviene consultar cuanto antes a un abogado penal?</h2>
                        <p className="text-gray-600 mb-4">Existen momentos específicos donde la asesoría legal urgente puede cambiar el resultado del caso:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Cuando la otra parte ya presentó una denuncia en Fiscalía y aún no has sido notificado — puedes anticiparte con una estrategia de defensa.",
                                "Si la Fiscalía te citó a declarar como imputado sin que sepas exactamente qué antecedentes existen en tu contra.",
                                "Cuando te notifican medidas cautelares o una formalización inminente y necesitas evaluar las salidas alternativas disponibles.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-600 flex-shrink-0">•</span>
                                    <span className="text-gray-700 font-bold">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                                        <InArticleCTA
                        title="¿Enfrentas una situación penal urgente?"
                        message="Cada minuto cuenta. Un abogado penalista puede revisar tu situación y asesorarte sobre los pasos a seguir."
                        buttonText="Habla con un abogado ahora"
                        category="Derecho Penal"
                    />

{/* CONCLUSION */}                    <div className="mb-12 border-t pt-8">

                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La apropiación indebida es uno de los delitos patrimoniales que más dudas genera porque su frontera con un incumplimiento civil no siempre es evidente. Esta guía ha descrito las reglas generales y los elementos que la Fiscalía debe acreditar.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            La pregunta que queda abierta es cómo se aplican esas reglas a los hechos específicos de cada situación — y esa respuesta depende de los antecedentes concretos, de las comunicaciones entre las partes y del destino de los fondos. Si quieres profundizar, revisa también nuestras guías sobre{" "}
                            <Link to="/blog/control-de-detencion-chile-2026" className="text-green-900 underline hover:text-green-600">Control de detención en Chile: guía legal</Link>
                            ,{" "}
                            <Link to="/blog/lesiones-leves-chile-2026" className="text-green-900 underline hover:text-green-600">Lesiones leves en Chile: qué dice la ley</Link>{" "}
                            y{" "}
                            <Link to="/blog/violacion-de-morada-chile-2026" className="text-green-900 underline hover:text-green-600">Violación de morada en Chile: penas y consecuencias</Link>. Si quieres revisar tu caso particular, puedes consultar con un{" "}
                            <Link to="/abogados-penales" className="text-green-900 underline hover:text-green-600">
                                abogado penal para casos de apropiación indebida en Chile
                            </Link>.
                        </p>
                    </div>

                    <CategoryCTA category="penal" />

                    {/* FAQS */}

                    <div className="mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre apropiación indebida en Chile</h2>
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
                        title="Apropiación indebida en Chile: penas, ejemplos y cómo denunciar (2026)"
                        url="https://legalup.cl/blog/apropiacion-indebida-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="apropiacion-indebida-chile-2026" />

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
            <BlogConversionPopup category="Derecho Penal" topic="apropiacion-indebida" />
        </div>
    );
};

export default BlogArticle;