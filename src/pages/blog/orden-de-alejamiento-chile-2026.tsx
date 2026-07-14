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
            question: "¿Quién puede solicitar una orden de alejamiento?",
            answer: "Generalmente puede solicitarla la Fiscalía, la víctima o su abogado, aunque el tribunal también puede decretarla cuando la ley lo permite y existen antecedentes suficientes.",
        },
        {
            question: "¿Es necesario existir una denuncia?",
            answer: "En la mayoría de los casos la medida se adopta dentro de una investigación o procedimiento judicial iniciado mediante denuncia o querella.",
        },
        {
            question: "¿Cuánto dura una orden de alejamiento?",
            answer: "No existe un plazo fijo. Su duración dependerá de las circunstancias del caso y de las decisiones adoptadas por el tribunal.",
        },
        {
            question: "¿Qué pasa si el imputado incumple la medida?",
            answer: "El incumplimiento puede generar nuevas consecuencias penales, modificaciones de las medidas cautelares e incluso medidas más gravosas según la gravedad de los hechos.",
        },
        {
            question: "¿La orden de alejamiento significa que la persona ya fue condenada?",
            answer: "No. Es una medida cautelar destinada a proteger a la víctima mientras continúa la investigación o el procedimiento judicial.",
        },
        {
            question: "¿Puede modificarse o dejarse sin efecto?",
            answer: "Sí. Si cambian las circunstancias que justificaron su dictación, cualquiera de las partes puede solicitar al tribunal revisar la medida.",
        },
        {
            question: "¿Necesito un abogado?",
            answer: "No siempre es obligatorio, pero contar con asesoría especializada permite presentar adecuadamente la solicitud, ejercer una defensa técnica y proteger mejor tus derechos durante todo el procedimiento.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Orden de alejamiento en Chile 2026: cómo solicitarla y cuándo procede (Guía Completa)"
                description="Aprende qué es una orden de alejamiento en Chile, cuándo procede, cómo solicitarla, cuánto dura y qué ocurre si la persona incumple la medida."
                image="/assets/orden-de-alejamiento-chile-2026.png"
                url="https://legalup.cl/blog/orden-de-alejamiento-chile-2026"
                datePublished="2026-06-26"
                dateModified="2026-06-26"
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
                        Orden de alejamiento en Chile 2026: cómo solicitarla y cuándo procede (Guía Completa)
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "La orden de alejamiento es una medida de protección dictada por un tribunal para evitar nuevos actos de violencia o amenazas",
                                "Puede decretarse en causas de violencia intrafamiliar, delitos sexuales, amenazas y otros delitos donde exista riesgo para la víctima",
                                "Su incumplimiento puede generar nuevas consecuencias penales",
                                "La medida puede incluir prohibición de acercarse, comunicarse o concurrir a determinados lugares",
                                "Contar con asesoría jurídica permite solicitar medidas de protección oportunamente o ejercer una adecuada defensa",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Cuando una persona enfrenta amenazas, agresiones, violencia intrafamiliar o situaciones que ponen en riesgo su seguridad, una de las principales preocupaciones es evitar que el agresor vuelva a acercarse. Precisamente para estos casos, la legislación chilena contempla diversas medidas cautelares destinadas a proteger a las víctimas mientras se desarrolla una investigación o un procedimiento judicial.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>26 de Junio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="orden-de-alejamiento-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Orden de alejamiento en Chile 2026"
                        url="https://legalup.cl/blog/orden-de-alejamiento-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            Una de las más conocidas es la orden de alejamiento, medida que busca impedir el contacto entre el imputado y la víctima cuando existen antecedentes que justifican dicha protección. En esta guía revisaremos cómo funciona la orden de alejamiento en Chile durante 2026, cuándo procede, quién puede solicitarla y cuáles son las consecuencias de incumplirla.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando una situación de riesgo o necesitas asesoría legal, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/lesiones-leves-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                lesiones leves
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/apropiacion-indebida-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                apropiación indebida
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/constancia-por-amenazas-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                constancia por amenazas
                            </Link>
                            ,{" "}
                            <Link
                                to="/blog/violacion-de-morada-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                violación de morada
                            </Link>{" "}
                            y{" "}
                            <Link
                                to="/blog/control-de-detencion-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                control de detención
                            </Link>.
                        </p>
                    </div>

                    {/* QUE ES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué es una orden de alejamiento?</h2>
                        <p className="text-gray-600 mb-4">
                            La orden de alejamiento es una medida de protección decretada por un tribunal cuyo objetivo es impedir que una persona se acerque, contacte o perturbe a otra cuando existe un riesgo para su integridad física o psicológica.
                        </p>
                        <p className="text-gray-600 mb-4">
                            No constituye una condena. Tampoco significa que la persona ya haya sido declarada culpable. Se trata de una medida preventiva destinada a proteger a la víctima mientras el proceso judicial continúa su curso.
                        </p>

                        <InArticleCTA category="Derecho Penal" />

                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">
                                Dependiendo del caso, puede ser decretada por un tribunal de garantía o por un tribunal de familia.
                            </p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                La definición anterior describe la orden de alejamiento como medida general. En la práctica, el tribunal evalúa los antecedentes concretos para determinar si existe riesgo real. No todas las solicitudes se conceden automáticamente: la Fiscalía o la víctima deben presentar evidencia suficiente que justifique la restricción, y la defensa puede oponerse.
                            </p>
                        </div>
                    </div>

                    {/* OBJETIVO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuál es el objetivo de esta medida?</h2>
                        <p className="text-gray-600 mb-4">
                            Su finalidad principal es prevenir nuevos hechos de violencia. Muchas investigaciones penales se desarrollan durante varios meses. Mientras ello ocurre, la víctima podría seguir expuesta a amenazas, hostigamientos o nuevas agresiones.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Proteger la seguridad física de la víctima", "Evitar intimidaciones", "Impedir represalias", "Evitar nuevos delitos", "Favorecer el desarrollo normal de la investigación"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CUANDO PUEDE SOLICITARSE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo puede solicitarse una orden de alejamiento?</h2>
                        <p className="text-gray-600 mb-4">No existe un único escenario. La medida puede decretarse cuando el tribunal aprecia antecedentes suficientes que hagan necesario proteger a una persona.</p>
                        <div className="space-y-3">
                            {[
                                { title: "Violencia intrafamiliar", desc: "Es probablemente el supuesto más conocido. Cuando existen agresiones entre cónyuges, convivientes, ex parejas o integrantes del grupo familiar, el tribunal puede ordenar que el imputado no se acerque a la víctima." },
                                { title: "Amenazas", desc: "Si una persona ha recibido amenazas serias y existen antecedentes que demuestran un riesgo real, también puede solicitarse una medida de protección." },
                                { title: "Delitos sexuales", desc: "En este tipo de investigaciones las órdenes de alejamiento son frecuentes para evitar nuevos contactos entre imputado y víctima." },
                                { title: "Lesiones", desc: "Cuando una agresión física genera un riesgo de reiteración, el tribunal puede decretar restricciones de acercamiento." },
                                { title: "Acoso", desc: "Dependiendo de las circunstancias concretas, también pueden adoptarse medidas destinadas a impedir contactos reiterados." },
                            ].map((item, i) => (
                                <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                                    <p className="text-gray-600">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Los supuestos anteriores describen escenarios donde puede solicitarse la medida. Pero en cada caso, el tribunal resuelve en función de los antecedentes concretos: dos situaciones de violencia intrafamiliar similares pueden tener resoluciones distintas si los medios de prueba disponibles son diferentes. La decisión depende de lo que cada parte logre acreditar.
                            </p>
                        </div>
                    </div>

                    {/* QUIEN PUEDE SOLICITAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Quién puede solicitar la orden?</h2>
                        <p className="text-gray-600 mb-4">Generalmente la solicitud puede ser presentada por:</p>
                        <div className="grid sm:grid-cols-3 gap-4">
                            {[
                                { title: "La Fiscalía", desc: "Inicia la investigación y solicita medidas de protección." },
                                { title: "La propia víctima", desc: "Puede solicitar directamente la medida de protección." },
                                { title: "El abogado querellante", desc: "Representa a la víctima y puede gestionar la solicitud." },
                            ].map((item, i) => (
                                <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                                    <p className="text-gray-500 text-sm mt-1">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">En algunos procedimientos, el tribunal puede decretarla de oficio. La evaluación siempre corresponde al juez, quien analizará si efectivamente existen antecedentes suficientes para justificar la restricción.</p>
                    </div>

                    {/* QUE DEBE ACREDITAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué debe acreditar la víctima?</h2>
                        <p className="text-gray-600 mb-4">No basta con manifestar temor. El tribunal normalmente analizará distintos antecedentes.</p>
                        <div className="space-y-3">
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="font-bold text-gray-900">Existencia de una denuncia</h3>
                                <p className="text-gray-600">Aunque no siempre es indispensable, una denuncia suele constituir el punto de partida de la investigación.</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="font-bold text-gray-900">Riesgo para la víctima</h3>
                                <p className="text-gray-600">Debe existir algún antecedente que permita concluir que la persona podría sufrir nuevas agresiones.</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="font-bold text-gray-900">Evidencia disponible</h3>
                                <p className="text-gray-600">Fotografías, informes médicos, mensajes, correos electrónicos, WhatsApp, grabaciones, testigos o denuncias anteriores.</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">Mientras más antecedentes existan, mayor fundamento tendrá la solicitud.</p>
                    </div>

                    {/* QUE PUEDE PROHIBIR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué puede prohibir una orden de alejamiento?</h2>
                        <p className="text-gray-600 mb-4">Dependiendo del caso, el tribunal puede establecer distintas restricciones.</p>
                        <div className="space-y-3">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Prohibición de acercamiento</h3>
                                <p className="text-gray-600">La persona no podrá acercarse al domicilio, trabajo o cualquier otro lugar frecuentado por la víctima.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Prohibición de comunicación</h3>
                                <p className="text-gray-600">También puede impedirse cualquier contacto mediante llamadas, WhatsApp, redes sociales, correos electrónicos, mensajes de texto o intermediarios.</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900">Prohibición de concurrir a determinados lugares</h3>
                                <p className="text-gray-600">En ocasiones ambas personas frecuentan los mismos establecimientos. El tribunal puede restringir el ingreso del imputado a determinados lugares para proteger a la víctima.</p>
                            </div>
                        </div>
                    </div>

                    {/* CUANTO DURA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuánto dura una orden de alejamiento?</h2>
                        <p className="text-gray-600 mb-4">No existe un plazo único. La duración dependerá de diversos factores.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Tipo de procedimiento", "Evolución de la investigación", "Riesgo existente", "Decisiones posteriores del tribunal"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-gray-500">•</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">En algunos casos la medida permanece vigente durante toda la investigación. En otros puede mantenerse incluso después de dictada una sentencia.</p>
                    </div>

                    {/* CONTROL DE CUMPLIMIENTO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo se controla su cumplimiento?</h2>
                        <p className="text-gray-600">
                            Una vez notificada la resolución judicial, el imputado debe respetar estrictamente las restricciones impuestas. Carabineros suele desempeñar un papel importante en la fiscalización cuando la víctima denuncia incumplimientos. Además, cualquier nuevo acercamiento puede ser informado inmediatamente al tribunal y a la Fiscalía.
                        </p>
                    </div>



                    {/* INCUMPLIMIENTO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si la persona incumple la orden?</h2>
                        <p className="text-gray-600 mb-4">El incumplimiento constituye una situación especialmente grave.</p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <ul className="space-y-2 text-red-800">
                                <li>• Nuevas investigaciones</li>
                                <li>• Modificación de medidas cautelares</li>
                                <li>• Prisión preventiva</li>
                                <li>• Agravamiento de la situación procesal</li>
                                <li>• Nuevos cargos penales</li>
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">Por esta razón resulta fundamental cumplir íntegramente todas las restricciones decretadas por el tribunal.</p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                El incumplimiento descrito tiene consecuencias graves, pero la valoración que el tribunal haga de ese incumplimiento depende de las circunstancias: no es lo mismo un contacto accidental que una infracción deliberada. La diferencia entre una y otra situación puede determinar si la consecuencia es una modificación de medidas o una prisión preventiva.
                            </p>
                        </div>
                    </div>

                    {/* MODIFICACION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Puede modificarse una orden de alejamiento?</h2>
                        <p className="text-gray-600 mb-4">Sí. Las medidas cautelares no son necesariamente permanentes. Si cambian las circunstancias del caso, cualquiera de las partes puede solicitar al tribunal revisar su procedencia.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Disminución del riesgo", "Nuevos antecedentes", "Cambios familiares", "Modificación del domicilio", "Evolución de la investigación"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-gray-500">•</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Será el juez quien determine si corresponde mantener, modificar o dejar sin efecto la medida.</p>
                    </div>

                    {/* DIFERENCIA CON PROHIBICION DE ACERCAMIENTO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Es lo mismo que una prohibición de acercamiento?</h2>
                        <p className="text-gray-600 mb-4">En la práctica muchas personas utilizan ambos conceptos como sinónimos. Sin embargo, jurídicamente la orden de alejamiento puede comprender distintas restricciones, siendo la prohibición de acercamiento una de ellas.</p>
                        <p className="text-gray-600">Además, dependiendo del caso, el tribunal puede incorporar otras medidas complementarias destinadas a proteger de mejor manera a la víctima.</p>
                    </div>

                    {/* DERECHOS DEL AFECTADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Derechos de la persona afectada por una orden de alejamiento</h2>
                        <p className="text-gray-600 mb-4">Aunque la orden de alejamiento tiene como finalidad proteger a la víctima, la persona respecto de la cual se dicta también mantiene una serie de derechos fundamentales durante todo el procedimiento.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Derecho a conocer las razones por las cuales se decretó la medida", "Derecho a ser representado por un abogado", "Derecho a presentar antecedentes en su defensa", "Derecho a solicitar la modificación o el levantamiento de la medida", "Derecho a un debido proceso y a la presunción de inocencia"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    {/* <CheckCircle className="h-4 w-4 text-green-600" /> */}
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <div className="bg-blue-50 p-5 rounded-xl mt-4">
                            <p className="text-blue-800">Es importante recordar que la existencia de una orden de alejamiento no implica automáticamente una condena penal. Se trata de una medida cautelar que busca prevenir nuevos hechos mientras el tribunal resuelve el fondo del asunto.</p>
                        </div>
                    </div>

                    {/* CAUSAS PENALES Y DE FAMILIA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Orden de alejamiento en causas penales y de familia</h2>
                        <p className="text-gray-600 mb-4">Una de las principales dudas es si esta medida solo existe en causas penales. La respuesta es no. Dependiendo de la naturaleza del conflicto, puede ser decretada tanto en procedimientos penales como en procedimientos de familia.</p>
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="bg-gray-50 p-5 rounded-xl">
                                <h3 className="font-bold text-gray-900 mb-2">En materia penal</h3>
                                <p className="text-gray-600">Es habitual en investigaciones por amenazas, lesiones, violencia intrafamiliar, delitos sexuales, acoso u otros delitos donde exista riesgo para la víctima. La medida busca proteger mientras la Fiscalía desarrolla la investigación.</p>
                            </div>
                            <div className="bg-gray-50 p-5 rounded-xl">
                                <h3 className="font-bold text-gray-900 mb-2">En materia de familia</h3>
                                <p className="text-gray-600">Los Tribunales de Familia también pueden adoptar medidas de protección cuando existen situaciones de violencia intrafamiliar o riesgo para alguno de los integrantes del grupo familiar, especialmente niños, cónyuges, ex convivientes, personas mayores o en situación de vulnerabilidad.</p>
                            </div>
                        </div>
                    </div>

                    {/* COMO SOLICITAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo solicitar una orden de alejamiento?</h2>
                        <p className="text-gray-600 mb-4">El procedimiento dependerá del tipo de causa. Sin embargo, generalmente comienza con la existencia de una denuncia o una investigación.</p>
                        <div className="bg-gray-50 p-5 rounded-xl">
                            <ul className="space-y-2 text-gray-800">
                                {["Fiscalía", "Carabineros", "Policía de Investigaciones", "Tribunal competente", "Abogados de las partes"].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        {/* <span className="text-green-600 font-bold">✓</span> */}
                                        <li>• {item}</li>
                                    </div>
                                ))}
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">Durante la audiencia correspondiente, el juez evaluará si existen antecedentes suficientes para decretar la medida. Para ello considerará tanto los antecedentes presentados por la víctima como aquellos aportados por la defensa.</p>
                    </div>

                    {/* QUE ANTECEDENTES FORTALECEN */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué antecedentes fortalecen la solicitud?</h2>
                        <p className="text-gray-600 mb-4">Mientras más evidencia exista, mayores posibilidades tendrá el tribunal de apreciar la existencia de un riesgo.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Denuncias anteriores", "Informes médicos", "Fotografías", "Mensajes (WhatsApp, correos, SMS)", "Testigos", "Grabaciones"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* QUE OCURRE SI AMBAS PERSONAS NECESITAN VERSE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si ambas personas necesitan verse?</h2>
                        <p className="text-gray-600 mb-4">Existen casos donde ambas personas mantienen algún vínculo permanente: tienen hijos en común, trabajan en el mismo lugar, son socios o viven cerca.</p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="text-amber-800">En estas situaciones el tribunal puede establecer reglas específicas destinadas a compatibilizar el cumplimiento de la medida con otras obligaciones legales. Cuando existen hijos, normalmente se procura que cualquier régimen de relación directa y regular pueda desarrollarse de forma segura, evitando el contacto directo entre los adultos involucrados.</p>
                        </div>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes al solicitar una orden de alejamiento</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Esperar demasiado tiempo", desc: "Muchas víctimas soportan amenazas o episodios de violencia durante meses antes de denunciar. Actuar oportunamente permite adoptar medidas de protección con mayor rapidez." },
                                    { title: "No conservar evidencia", desc: "Eliminar mensajes o perder fotografías puede dificultar la acreditación del riesgo." },
                                    { title: "Pensar que basta una constancia", desc: "En algunos casos será necesario presentar una denuncia formal para que la Fiscalía pueda investigar los hechos." },
                                    { title: "Incumplir la propia medida", desc: "Si el tribunal decretó restricciones, ambas partes deben respetar las condiciones establecidas. Intentar restablecer contacto por iniciativa propia puede generar dificultades posteriores." },
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

                    {/* QUE HACER SI INCUMPLEN */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué hacer si la otra persona incumple la orden?</h2>
                        <p className="text-gray-600 mb-4">Si la persona protegida advierte que el imputado incumplió la orden de alejamiento, resulta recomendable actuar inmediatamente.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Llamar a Carabineros", "Informar el incumplimiento a la Fiscalía", "Guardar evidencia del acercamiento", "Registrar mensajes o llamadas", "Identificar posibles testigos"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">Mientras más rápido se comunique el incumplimiento, más fácilmente podrán adoptarse nuevas medidas de protección.</p>
                    </div>

                    {/* CUANDO CONSULTAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿En qué situaciones conviene consultar cuanto antes a un abogado penal?</h2>
                        <p className="text-gray-600 mb-4">Existen momentos específicos donde la asesoría legal urgente puede cambiar el curso del caso:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Cuando te notificaron una orden de alejamiento y necesitas entender sus alcances antes de la audiencia de medidas cautelares.",
                                "Si eres víctima y quieres solicitar una orden pero no sabes qué antecedentes presentar para que el tribunal la conceda.",
                                "Cuando existe una denuncia cruzada donde ambas partes alegan agresiones y necesitas evaluar tu posición procesal.",
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
                            <h3 className="text-2xl font-bold font-serif text-green-600 mb-3">¿Te notificaron una orden de alejamiento?</h3>
                            <p className="text-white mb-6">Si el tribunal ya decretó una orden en tu contra, el momento de preparar tu defensa es antes de la audiencia donde se evalúan las medidas cautelares — no después de haber infringido la restricción.</p>
                            <Link
                                to="/abogados-penales"
                                className="inline-block bg-white text-green-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                Ver abogados penalistas disponibles
                            </Link>
                        </div>
                    </div>

                    {/* CONCLUSION */}

                    <RelatedLawyers category="Derecho Penal" />

                    <div className="mb-12 border-t pt-8">

                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La orden de alejamiento es una de las principales herramientas de protección en el sistema judicial chileno. Esta guía describe los tipos de órdenes, cómo solicitarlas y las consecuencias de incumplirlas.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            La pregunta que queda abierta es si en el caso concreto existen antecedentes suficientes para que el tribunal conceda o mantenga la medida — y esa respuesta depende de las pruebas que cada parte presente. Si quieres profundizar, revisa también nuestras guías sobre{" "}
                            <Link to="/blog/estafa-chile-2026" className="text-green-700 underline hover:text-green-500">Estafa en Chile: tipos, penas y cómo denunciar</Link>
                            ,{" "}
                            <Link to="/blog/hurto-chile-2026" className="text-green-700 underline hover:text-green-500">Hurto en Chile: diferencias con el robo y penas</Link>{" "}
                            y{" "}
                            <Link to="/blog/robo-chile-2026" className="text-green-700 underline hover:text-green-500">robo en Chile</Link>. Si quieres revisar tu situación, puedes consultar con un{" "}
                            <Link to="/abogados-penales" className="text-green-700 underline hover:text-green-500">abogado penalista en Chile</Link>.
                        </p>
                    </div>

                    <CategoryCTA category="penal" />

                    {/* FAQS */}

                    <div className="mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre la orden de alejamiento en Chile</h2>
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
                        title="Orden de alejamiento en Chile 2026"
                        url="https://legalup.cl/blog/orden-de-alejamiento-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="orden-de-alejamiento-chile-2026" />

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
            <BlogConversionPopup category="Derecho Penal" topic="orden-alejamiento" />
        </div>
    );
};

export default BlogArticle;