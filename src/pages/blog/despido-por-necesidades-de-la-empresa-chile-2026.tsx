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

const BlogArticle = () => {
    const faqs = [
        {
            question: "¿La empresa puede despedirme por necesidades de la empresa cuando quiera?",
            answer: "No. Debe existir una causa objetiva relacionada con el funcionamiento de la empresa y cumplir los requisitos establecidos por la legislación laboral.",
        },
        {
            question: "¿Siempre corresponde indemnización?",
            answer: "Generalmente sí, aunque dependerá del tipo de contrato, la antigüedad del trabajador y las circunstancias del despido.",
        },
        {
            question: "¿Puedo demandar si creo que la causal es falsa?",
            answer: "Sí. Si consideras que la empresa utilizó indebidamente esta causal, puedes impugnar el despido ante los tribunales laborales dentro de los plazos legales.",
        },
        {
            question: "¿Qué pasa si contrataron a otra persona para mi mismo cargo?",
            answer: "Ese antecedente podría ser relevante para cuestionar la existencia real de las necesidades de la empresa, aunque deberá analizarse junto con el resto de la prueba disponible.",
        },
        {
            question: "¿Debo firmar inmediatamente el finiquito?",
            answer: "No existe una obligación de firmarlo sin comprender previamente su contenido y sus efectos jurídicos.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Despido por necesidades de la empresa en Chile 2026: requisitos, indemnización y qué hacer"
                description="Conoce cuándo procede el despido por necesidades de la empresa, cómo calcular la indemnización, cuándo puede impugnarse y qué hacer si recibiste una carta de despido."
                image="/assets/despido-necesidades-empresa-chile-2026.png"
                url="https://legalup.cl/blog/despido-necesidades-empresa-chile-2026"
                datePublished="2026-07-08"
                dateModified="2026-07-08"
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
                        Despido por necesidades de la empresa en Chile 2026: requisitos, indemnización y qué hacer
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "La causal de necesidades de la empresa está regulada en el Código del Trabajo",
                                "El empleador debe fundamentar adecuadamente el despido",
                                "En la mayoría de los casos corresponde indemnización por años de servicio y sustitutiva del aviso previo, cuando proceda",
                                "El trabajador puede demandar si considera que la causal fue utilizada de manera improcedente",
                                "La evaluación depende de los antecedentes específicos de cada despido",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Recibir una carta de despido suele generar muchas dudas, especialmente cuando el empleador invoca la causal de necesidades de la empresa. ¿Puede despedirte por esta razón en cualquier momento? ¿Siempre corresponde el pago de indemnización? ¿Es posible demandar si consideras que el despido fue injustificado?
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>8 de Julio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="despido-necesidades-empresa-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Despido por necesidades de la empresa en Chile 2026"
                        url="https://legalup.cl/blog/despido-necesidades-empresa-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            En Chile, la causal de necesidades de la empresa es una de las más utilizadas por los empleadores para poner término a un contrato de trabajo. Sin embargo, no basta con mencionar esa causal en la carta de despido. La empresa debe cumplir requisitos legales y, en caso de un juicio laboral, acreditar que la decisión se fundó en circunstancias reales y objetivas.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Esta guía explica cómo funciona esta causal en 2026, cuándo procede, qué indemnizaciones corresponden y qué alternativas tiene un trabajador para impugnar un despido.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando un conflicto laboral, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/ley-del-consumidor-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                Ley del Consumidor
                            </Link>{" "}
                            y{" "}
                            <Link
                                to="/blog/receptacion-chile-2026"
                                className="text-green-700 underline hover:text-green-500"
                            >
                                receptación
                            </Link>.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si necesitas evaluar tu situación después de un despido, puedes consultar con un{" "}
                            <Link to="/abogado-laboral" className="text-green-700 underline hover:text-green-500">
                                abogado laboral en Chile
                            </Link>{" "}
                            directamente online.
                        </p>
                    </div>

                    {/* QUE SIGNIFICA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué significa el despido por necesidades de la empresa?</h2>
                        <p className="text-gray-600 mb-4">
                            La causal de necesidades de la empresa permite al empleador poner término al contrato cuando existen razones objetivas relacionadas con el funcionamiento de la empresa y no con la conducta del trabajador.
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Procesos de reorganización", "Cambios tecnológicos", "Disminución de actividad", "Racionalización de personal", "Dificultades económicas", "Cierre de áreas o sucursales"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                No obstante, la ley no permite utilizar esta causal simplemente porque el empleador quiera reemplazar a un trabajador o reducir costos sin una justificación suficiente.
                            </p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                La existencia de una reorganización o una reducción de personal no significa automáticamente que el despido sea válido. En un eventual juicio laboral, el tribunal analizará los antecedentes concretos del caso, la documentación de la empresa y las razones invocadas para determinar si realmente existían las necesidades alegadas.
                            </p>
                        </div>
                    </div>

                    {/* CUANDO PUEDE UTILIZARSE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo puede utilizarse esta causal?</h2>
                        <p className="text-gray-600 mb-4">La empresa debe demostrar que existen circunstancias objetivas que justifican el término del contrato.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Cierre de una línea de negocio", "Reducción permanente de operaciones", "Eliminación de un cargo", "Automatización de procesos", "Reestructuración interna"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Lo importante es que la decisión no responda únicamente a una evaluación subjetiva del desempeño del trabajador.</p>
                    </div>

                    {/* CARTA DE DESPIDO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué debe contener la carta de despido?</h2>
                        <p className="text-gray-600 mb-4">La carta de despido es uno de los documentos más importantes del procedimiento.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["La causal legal invocada", "Los hechos que la fundamentan", "La fecha de término del contrato", "Información sobre el finiquito", "Antecedentes relacionados con las cotizaciones previsionales"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Una carta insuficientemente fundamentada puede ser relevante si posteriormente el trabajador decide impugnar el despido.</p>
                    </div>

                    {/* SIEMPRE CORRESPONDE INDEMNIZACION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Siempre corresponde indemnización?</h2>
                        <p className="text-gray-600 mb-4">En la mayoría de los casos sí. Dependiendo de las circunstancias, el trabajador puede tener derecho a:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Indemnización por años de servicio", "Indemnización sustitutiva del aviso previo", "Feriado proporcional", "Remuneraciones pendientes", "Otras prestaciones que correspondan"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Aunque la ley establece reglas generales para calcular las indemnizaciones, el monto final puede variar considerablemente según el contrato, los anexos, las remuneraciones variables y otros antecedentes laborales. Incluso trabajadores despedidos el mismo día por la misma empresa pueden tener derechos económicos distintos.
                            </p>
                        </div>
                    </div>

                    {/* COMO SE CALCULA LA INDEMNIZACION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo se calcula la indemnización por años de servicio?</h2>
                        <p className="text-gray-600 mb-4">
                            Uno de los aspectos que más dudas genera tras un despido por necesidades de la empresa es el cálculo de la indemnización.
                        </p>
                        <p className="text-gray-600 mb-4">
                            En términos generales, la legislación laboral contempla una indemnización por años de servicio para los trabajadores que cumplen los requisitos legales, considerando factores como:
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Antigüedad en la empresa", "Última remuneración mensual", "Topes legales aplicables", "Existencia de pactos individuales o colectivos"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">
                            Además, pueden corresponder otras prestaciones, como la indemnización sustitutiva del aviso previo cuando el empleador no informó el despido con la anticipación exigida por la ley.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                El cálculo de las indemnizaciones no siempre es tan simple como multiplicar años de servicio por remuneración. Existen conceptos variables, bonos, comisiones, topes legales y cláusulas contractuales que pueden alterar el monto final. Una revisión profesional suele detectar diferencias que no siempre son evidentes para el trabajador.
                            </p>
                        </div>
                    </div>

                    {/* INJUSTIFICADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si considero que el despido fue injustificado?</h2>
                        <p className="text-gray-600 mb-4">
                            El trabajador puede impugnar judicialmente la causal cuando considera que las necesidades de la empresa nunca existieron o fueron utilizadas únicamente para poner término al contrato.
                        </p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["La carta de despido", "Documentos de la empresa", "Declaraciones de testigos", "Estructura organizacional", "Contrataciones posteriores", "Información financiera cuando corresponda"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">No basta con que el empleador afirme que existían necesidades de la empresa; deberá acreditarlo si el conflicto llega a tribunales.</p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Si el tribunal concluye que la empresa utilizó indebidamente la causal de necesidades de la empresa, el despido puede ser declarado injustificado, improcedente o indebido, según corresponda. En ese caso, además de las indemnizaciones legales, el empleador podría ser condenado al pago de un recargo sobre la indemnización por años de servicio.
                            </p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                No toda demanda laboral termina con un aumento de indemnización. El resultado depende de la prueba disponible: la carta de despido, los documentos de la empresa, la existencia de una verdadera reorganización y los antecedentes laborales específicos del trabajador. Dos despidos aparentemente iguales pueden terminar con decisiones completamente distintas.
                            </p>
                        </div>
                    </div>

                    {/* CONTRATAR A OTRA PERSONA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Puede la empresa contratar a otra persona después de despedirme?</h2>
                        <p className="text-gray-600 mb-4">
                            Una de las preguntas más frecuentes es si la empresa puede contratar inmediatamente a otra persona para realizar exactamente las mismas funciones.
                        </p>
                        <p className="text-gray-600 mb-4">La respuesta depende del contexto.</p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Si realmente existían necesidades de la empresa que justificaban la eliminación del cargo, una contratación inmediata para reemplazar al mismo trabajador podría transformarse en un antecedente relevante dentro de un juicio laboral. Sin embargo, no toda contratación posterior significa automáticamente que el despido fue ilegal.
                            </p>
                        </div>
                        <p className="text-gray-600 mt-4">Será necesario analizar aspectos como:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Si el cargo era realmente el mismo", "Las funciones asignadas", "El momento de la contratación", "La reorganización interna", "Los documentos que respaldan la decisión empresarial"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Muchos trabajadores creen que basta con demostrar que otra persona ocupó su puesto para ganar un juicio. En la práctica, los tribunales analizan múltiples antecedentes antes de concluir si la causal fue utilizada correctamente. El contexto específico suele ser más importante que un solo hecho aislado.
                            </p>
                        </div>
                    </div>

                    {/* CUANTO TIEMPO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuánto tiempo tengo para demandar?</h2>
                        <p className="text-gray-600 mb-4">Los plazos en materia laboral son breves. Por ello, si consideras que la causal fue utilizada incorrectamente, no conviene esperar hasta el último momento para buscar asesoría.</p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <ul className="space-y-2 text-red-800">
                                <li>• Puede ser más difícil reunir pruebas</li>
                                <li>• Algunos documentos dejan de estar disponibles</li>
                                <li>• Los plazos legales continúan corriendo</li>
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">Actuar rápidamente suele aumentar las posibilidades de preparar una mejor estrategia de defensa.</p>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes después de un despido</h2>
                        <p className="text-gray-600 mb-4">Muchas personas cometen errores durante las primeras horas o días posteriores al despido.</p>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Firmar el finiquito sin leerlo", desc: "Aceptar sin comprender el contenido puede implicar renunciar a derechos importantes." },
                                    { title: "Aceptar explicaciones verbales sin respaldo escrito", desc: "Lo que se dice verbalmente no siempre coincide con lo que después consta en los documentos." },
                                    { title: "No guardar la carta de despido", desc: "Es el documento principal para impugnar el despido." },
                                    { title: "Eliminar correos electrónicos relevantes", desc: "Las comunicaciones escritas son una prueba fundamental en cualquier reclamo laboral." },
                                    { title: "Pensar que la empresa siempre tiene la razón", desc: "La causal de necesidades de la empresa debe ser acreditada por el empleador." },
                                    { title: "Dejar pasar los plazos para demandar", desc: "Los plazos laborales son breves y su vencimiento puede impedir cualquier reclamación." },
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

                    {/* DOCUMENTOS CONVIENE GUARDAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué documentos conviene guardar después del despido?</h2>
                        <p className="text-gray-600 mb-4">Durante los primeros días posteriores al despido es recomendable conservar toda la documentación relacionada con la relación laboral.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Contrato de trabajo", "Anexos", "Liquidaciones de sueldo", "Carta de despido", "Finiquito", "Correos electrónicos relevantes", "Evaluaciones de desempeño", "Organigramas cuando existan", "Comunicaciones internas relacionadas con la reorganización"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Mientras mayor sea la documentación disponible, más fácil será reconstruir los hechos si posteriormente existe una reclamación judicial.</p>
                    </div>

                    {/* FIRMAR FINIQUITO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Firmar el finiquito impide demandar?</h2>
                        <p className="text-gray-600 mb-4">No necesariamente. Dependerá de cómo fue firmado el finiquito, si existen reservas de derechos y de las circunstancias particulares del caso.</p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Firmar un finiquito no produce exactamente las mismas consecuencias en todos los casos. La forma en que fue suscrito, las reservas incorporadas y el contenido del documento pueden modificar significativamente las posibilidades de reclamar posteriormente. Esa evaluación solo puede hacerse revisando la documentación específica del trabajador.
                            </p>
                        </div>
                        <p className="text-gray-600 mt-4">Por esa razón, antes de firmar cualquier documento es recomendable comprender sus efectos jurídicos.</p>
                    </div>

                    {/* ACEPTE FINIQUITO POR DINERO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si acepté el finiquito porque necesitaba el dinero?</h2>
                        <p className="text-gray-600 mb-4">
                            Muchas personas creen que aceptar el pago del finiquito significa perder automáticamente cualquier posibilidad de reclamar. No siempre es así.
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                            <p className="text-amber-800 text-sm">
                                Las consecuencias jurídicas dependerán de diversos factores, entre ellos: la forma en que se firmó, el contenido del documento, la existencia de reservas de derechos y las circunstancias en que se produjo la firma. Por eso, incluso después de haber firmado un finiquito, puede ser conveniente revisar la situación con un abogado antes de asumir que ya no existen alternativas legales.
                            </p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                El efecto jurídico de un finiquito no puede analizarse únicamente leyendo su título. La forma en que fue otorgado y las circunstancias del caso pueden modificar las posibilidades de reclamar posteriormente. Esa evaluación requiere revisar los documentos concretos de cada trabajador.
                            </p>
                        </div>
                    </div>

                    {/* CTA IN-ARTICLE */}
                    <InArticleCTA
                        message="¿Recibiste una carta de despido por necesidades de la empresa y tienes dudas sobre su legalidad? Un abogado laboral puede analizar tu caso antes de que firmes el finiquito."
                        buttonText="Habla con un abogado ahora"
                        category="Derecho Laboral"
                    />

                    {/* DEMOSTRAR NO EXISTIAN */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo demostrar que no existían necesidades de la empresa?</h2>
                        <p className="text-gray-600 mb-4">Cada caso será distinto, pero algunas pruebas que suelen resultar relevantes son:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Contratación de otro trabajador para el mismo cargo", "Publicación inmediata de la misma vacante", "Reorganizaciones que nunca ocurrieron", "Correos electrónicos internos", "Organigramas", "Declaraciones de compañeros de trabajo", "Documentos financieros cuando sean pertinentes"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2">• {item}</li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Será el tribunal quien determine si esos antecedentes son suficientes para desvirtuar la causal invocada por el empleador.</p>
                    </div>

                    {/* CUANDO CONSULTAR ABOGADO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo conviene consultar cuanto antes a un abogado laboral?</h2>
                        <p className="text-gray-600 mb-4">Buscar asesoría temprana suele ser recomendable cuando ocurre alguna de estas situaciones:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {["Recibiste una carta por necesidades de la empresa", "Te ofrecieron firmar un finiquito inmediatamente", "Dudas del cálculo de tus indemnizaciones", "La empresa contrató rápidamente a otra persona para tu mismo cargo", "Sospechas que la causal fue utilizada para ocultar otra razón del despido", "Existían conflictos previos con la empresa", "Sufriste represalias antes del despido", "Ya recibiste una citación judicial o administrativa"].map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-600 flex-shrink-0">•</span>
                                    <span className="text-gray-700 font-bold">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Mientras antes se revise la documentación, mayores serán las posibilidades de preparar una estrategia adecuada.</p>
                    </div>

                    {/* CTA PRINCIPAL */}
                    <div className="mb-12">
                        <div className="bg-green-900 rounded-2xl p-8 text-center">
                            <h3 className="text-2xl font-bold font-serif text-green-600 mb-3">¿Recibiste una carta de despido por necesidades de la empresa?</h3>
                            <p className="text-white mb-6">Si tu empleador invocó esta causal y tienes dudas sobre la legalidad del despido, es recomendable revisar el caso antes de firmar documentos o dejar transcurrir los plazos legales. Un abogado laboral puede analizar la carta de despido, calcular correctamente las indemnizaciones y evaluar si existen fundamentos para demandar.</p>
                            <Link
                                to="/abogado-laboral"
                                className="inline-block bg-white text-green-900 font-bold px-8 py-3 rounded-md hover:bg-gray-100 transition-colors"
                            >
                                Hablar con un abogado laboral
                            </Link>
                        </div>
                    </div>

                    {/* CONCLUSION */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            La causal de necesidades de la empresa busca permitir que los empleadores enfrenten cambios reales en su organización, pero no puede utilizarse de forma arbitraria ni como una justificación automática para despedir trabajadores. Si recibiste una carta de despido, es importante conservar toda la documentación relacionada, revisar correctamente el cálculo de las indemnizaciones y conocer los plazos para ejercer tus derechos.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Sin embargo, comprender cómo funciona esta causal en términos generales no permite determinar si tu despido fue legal o si tienes derecho a mayores indemnizaciones. Esa respuesta depende de antecedentes específicos como la carta de despido, la documentación de la empresa, la existencia de una verdadera reorganización y las pruebas disponibles en tu caso. Si tienes dudas sobre la legalidad del despido, puedes revisar tu situación con un{" "}
                            <Link to="/abogado-laboral" className="text-green-700 underline hover:text-green-500">abogado laboral en Chile</Link>{" "}
                            a través de LegalUp.
                        </p>
                    </div>

                    <CategoryCTA category="laboral" />

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

            <RelatedLawyers category="Derecho Laboral" />

            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
                <div className="mt-8">
                    <BlogShare
                        title="Despido por necesidades de la empresa en Chile 2026"
                        url="https://legalup.cl/blog/despido-necesidades-empresa-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="despido-necesidades-empresa-chile-2026" />

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