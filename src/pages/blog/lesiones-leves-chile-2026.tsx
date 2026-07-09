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
            question: "¿Qué se considera una lesión leve?",
            answer: "En Chile, una lesión leve corresponde a aquellas afectaciones físicas de baja gravedad que no comprometen funciones vitales ni generan incapacidad prolongada. Generalmente incluyen golpes, moretones, rasguños, contusiones o heridas superficiales que sanan en pocos días y no dejan secuelas permanentes. Su calificación final depende del informe médico legal del Servicio Médico Legal (SML).",
        },
        {
            question: "¿Dónde puedo denunciar una agresión?",
            answer: "Puedes denunciar una agresión en Carabineros de Chile, en la Policía de Investigaciones (PDI) o directamente en la Fiscalía. La denuncia puede hacerse presencialmente o, en algunos casos, de forma online. Es recomendable entregar todos los antecedentes disponibles, como informes médicos, fotos o datos de testigos, para facilitar la investigación.",
        },
        {
            question: "¿Es obligatorio constatar lesiones?",
            answer: "No es obligatorio en todos los casos, pero sí es altamente recomendable. El certificado de constatación de lesiones emitido en un centro de salud es una de las pruebas más relevantes en estos casos, ya que deja registro médico inmediato del daño sufrido y puede ser clave dentro de la investigación penal.",
        },
        {
            question: "¿Puedo denunciar si no tengo testigos?",
            answer: "Sí, es posible denunciar incluso sin testigos. El sistema penal chileno permite acreditar los hechos mediante otros medios de prueba como informes médicos, fotografías, grabaciones de cámaras de seguridad, mensajes de texto o cualquier evidencia que ayude a reconstruir lo ocurrido.",
        },
        {
            question: "¿Qué pasa si el agresor niega todo?",
            answer: "Si el agresor niega los hechos, la investigación no se basa únicamente en su declaración, sino en la evaluación de toda la evidencia disponible. Fiscalía reúne antecedentes, testimonios y pruebas para determinar lo ocurrido, y será finalmente el tribunal quien valore el conjunto de la prueba para dictar una resolución.",
        },
        {
            question: "¿Necesito abogado?",
            answer: "No es obligatorio contar con abogado en todos los casos, pero sí es muy recomendable. Un abogado puede orientar sobre el proceso, ayudar a presentar pruebas de forma adecuada, proteger los derechos de la víctima o del imputado y aumentar las posibilidades de un resultado favorable dentro del procedimiento penal.",
        },
        {
            question: "¿Las lesiones leves generan antecedentes penales?",
            answer: "Dependiendo del resultado del proceso judicial, una condena por lesiones leves puede generar antecedentes penales. Sin embargo, esto depende de factores como la sentencia, la existencia de acuerdos reparatorios o suspensiones condicionales del procedimiento, entre otros mecanismos legales.",
        },
        {
            question: "¿Qué hago si recibo una citación por lesiones?",
            answer: "Si recibes una citación, lo recomendable es no ignorarla y buscar asesoría legal antes de declarar. Un abogado puede ayudarte a entender el contexto del caso, preparar tu declaración y definir la mejor estrategia para enfrentar el procedimiento ante Fiscalía o tribunal.",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Lesiones leves en Chile 2026: penas, denuncia y procedimiento (Guía Completa)"
                description="Aprende qué son las lesiones leves en Chile, cuándo constituyen delito, cuáles son las penas aplicables, cómo denunciar y qué hacer si eres víctima o imputado."
                image="/assets/lesiones-leves-chile-2026.png"
                url="https://legalup.cl/blog/lesiones-leves-chile-2026"
                datePublished="2026-06-24"
                dateModified="2026-06-24"
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
                        Lesiones leves en Chile 2026: penas, denuncia y procedimiento (Guía Completa)
                    </h1>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
                            Resumen rápido
                        </p>
                        <ul className="space-y-2">
                            {[
                                "Las lesiones leves son una de las categorías más comunes de delitos contra las personas en Chile.",
                                "Generalmente corresponden a golpes o agresiones que provocan daños menores y de corta recuperación.",
                                "La gravedad de las lesiones es determinada mediante constatación médica y peritajes.",
                                "La víctima puede denunciar ante Carabineros, PDI o Fiscalía.",
                                "Tanto víctimas como imputados pueden beneficiarse de asesoría legal temprana para proteger sus derechos.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span className="text-sm sm:text-base">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xl max-w-3xl">
                        Las agresiones físicas forman parte de los delitos más denunciados en Chile. Una discusión familiar, una pelea en la vía pública, un conflicto vecinal o incluso un altercado laboral pueden terminar con una denuncia por lesiones.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>24 de Junio, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Equipo LegalUp</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <ReadTime slug="lesiones-leves-chile-2026" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare
                        title="Lesiones leves en Chile 2026"
                        url="https://legalup.cl/blog/lesiones-leves-chile-2026"
                        showBorder={false}
                    />

                    {/* INTRO */}
                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            En esta guía completa revisaremos cómo funcionan las lesiones leves en Chile durante 2026, cuáles son las sanciones aplicables y qué hacer si te encuentras involucrado en una investigación penal.
                        </p>
                        <p className="text-gray-600 mt-4">
                            Si estás enfrentando una situación legal, revisa también nuestras guías sobre{" "}
                            <Link
                                to="/blog/divorcio-unilateral-chile-2026"
                                className="text-green-900 underline hover:text-green-600"
                            >
                                divorcio unilateral
                            </Link>{" "}
                            y{" "}
                            <Link
                                to="/blog/compensacion-economica-divorcio-chile-2026"
                                className="text-green-900 underline hover:text-green-600"
                            >
                                compensación económica
                            </Link>.
                        </p>
                    </div>

                    {/* QUE SON */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué son las lesiones leves?</h2>
                        <p className="text-gray-600 mb-4">
                            Las lesiones leves son aquellas que provocan un daño físico menor a una persona y que no generan consecuencias permanentes ni incapacidades prolongadas. Generalmente se trata de lesiones que sanan en pocos días y que no producen secuelas relevantes.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3 mb-4">
                            {["Moretones", "Rasguños", "Contusiones leves", "Inflamaciones menores", "Golpes sin fracturas", "Lesiones superficiales"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-red-500">•</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                            <p className="font-bold text-blue-900">Importante</p>
                            <p className="text-blue-800">
                                Aunque puedan parecer situaciones de poca gravedad, siguen siendo conductas sancionadas por la legislación penal chilena.
                            </p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                La descripción anterior clasifica las lesiones según su gravedad física. Sin embargo, en la práctica penal el resultado de una investigación no depende solo del tipo de lesión, sino de lo que las pruebas logren acreditar: quién inició la agresión, si hubo testigos y si la versión de los hechos se sostiene ante el tribunal.
                            </p>
                        </div>
                    </div>

                    {/* CUANDO ES DELITO */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo una agresión se transforma en delito?</h2>
                        <p className="text-gray-600 mb-4">
                            No toda discusión constituye un delito. Sin embargo, cuando existe contacto físico que provoca una lesión corporal, incluso menor, puede configurarse una infracción penal.
                        </p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="font-bold text-red-800">Ejemplos de agresiones que pueden configurar delito:</p>
                            <ul className="mt-2 space-y-1 text-red-700">
                                <li>• Un golpe durante una pelea</li>
                                <li>• Un empujón que provoca una caída</li>
                                <li>• Una bofetada</li>
                                <li>• Un puñetazo</li>
                                <li>• Una agresión durante una discusión</li>
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">La evaluación concreta dependerá de las circunstancias del caso y de los antecedentes médicos disponibles.</p>
                    </div>

                    {/* COMO SE DETERMINA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo se determina si una lesión es leve?</h2>
                        <p className="text-gray-600 mb-4">
                            La clasificación no depende únicamente de lo que diga la víctima o el agresor. La determinación se realiza considerando antecedentes médicos y periciales.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {[
                                { title: "Tiempo de recuperación", desc: "Mientras más breve sea la recuperación, mayor probabilidad existe de que se clasifique como lesión leve." },
                                { title: "Necesidad de tratamiento médico", desc: "Las lesiones que requieren procedimientos complejos pueden recibir una clasificación distinta." },
                                { title: "Existencia de secuelas", desc: "Si quedan consecuencias permanentes, la gravedad aumenta considerablemente." },
                                { title: "Informes médicos", desc: "La constatación de lesiones suele transformarse en una prueba fundamental dentro de la investigación." },
                            ].map((item, i) => (
                                <div key={i} className="bg-gray-50 p-4 rounded-xl">
                                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                                    <p className="text-gray-600 mt-1">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                Los criterios anteriores entregan una referencia general. La calificación concreta de una lesión no la determina solo el tiempo de recuperación, sino cómo el Servicio Médico Legal evalúa los antecedentes del caso y cómo la Fiscalía presenta esos elementos ante el tribunal. Dos lesiones similares pueden tener clasificaciones distintas según el contexto de la agresión.
                            </p>
                        </div>
                    </div>

                    {/* QUE HACER INMEDIATAMENTE */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué hacer inmediatamente después de una agresión?</h2>
                        <p className="text-gray-600 mb-4">La actuación temprana puede ser determinante. Si has sido víctima de una agresión física, resulta recomendable:</p>
                        <div className="space-y-3">
                            {[
                                { title: "Buscar atención médica", desc: "La constatación de lesiones permite documentar objetivamente el daño sufrido." },
                                { title: "Guardar evidencia", desc: "Fotografías, videos o mensajes pueden ser relevantes." },
                                { title: "Identificar testigos", desc: "Personas que presenciaron los hechos pueden aportar información importante." },
                                { title: "Denunciar oportunamente", desc: "Mientras más rápido se denuncien los hechos, mayores posibilidades existen de recopilar evidencia útil." },
                            ].map((item, i) => (
                                <div key={i} className="border border-gray-100 bg-white p-5 rounded-xl flex items-start gap-4 hover:bg-gray-50 transition-colors shadow-sm">
                                    <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">{i + 1}</div>
                                    <div>
                                        <p className="text-lg font-bold text-gray-900 mb-1">{item.title}</p>
                                        <p className="text-gray-600">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* DONDE DENUNCIAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Dónde denunciar lesiones leves en Chile?</h2>
                        <p className="text-gray-600 mb-4">La denuncia puede realizarse ante diversas instituciones:</p>
                        <div className="grid sm:grid-cols-3 gap-4">
                            {[
                                { title: "Carabineros de Chile", desc: "Una de las vías más utilizadas por las víctimas." },
                                { title: "Policía de Investigaciones (PDI)", desc: "También puede recibir denuncias relacionadas con agresiones físicas." },
                                { title: "Fiscalía", desc: "Permite iniciar formalmente una investigación penal." },
                            ].map((item, i) => (
                                <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                                    <p className="text-gray-500 text-sm mt-1">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* COMO FUNCIONA DENUNCIA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cómo funciona una denuncia por lesiones leves?</h2>
                        <p className="text-gray-600 mb-4">Una vez presentada la denuncia, la Fiscalía puede iniciar diligencias para esclarecer los hechos.</p>
                        <div className="bg-gray-50 p-5 rounded-xl">
                            <p className="font-bold mb-2">Entre las diligencias posibles:</p>
                            <ul className="space-y-1 text-gray-700">
                                <li>• Declaraciones de víctimas</li>
                                <li>• Declaraciones de testigos</li>
                                <li>• Obtención de informes médicos</li>
                                <li>• Peritajes</li>
                                <li>• Revisión de cámaras de seguridad</li>
                                <li>• Recopilación de fotografías</li>
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">El objetivo es determinar si efectivamente existió una agresión y quién fue responsable.</p>
                    </div>

                    {/* CONSTATACION DE LESIONES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">La importancia de la constatación de lesiones</h2>
                        <p className="text-gray-600 mb-4">Uno de los pasos más importantes en este tipo de casos es la constatación médica.</p>
                        <div className="bg-green-50 p-5 rounded-xl">
                            <p className="font-bold text-green-800">Este procedimiento permite:</p>
                            <ul className="mt-2 space-y-1 text-green-700">
                                <li>• Verificar la existencia de lesiones</li>
                                <li>• Registrar su gravedad</li>
                                <li>• Determinar posibles mecanismos de producción</li>
                                <li>• Generar evidencia para una investigación posterior</li>
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">Muchas denuncias se fortalecen considerablemente cuando existe documentación médica oportuna.</p>
                    </div>

                    {/* PENAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué penas existen para las lesiones leves?</h2>
                        <p className="text-gray-600 mb-4">Las sanciones dependen de diversos factores: gravedad de las lesiones, circunstancias de la agresión, existencia de agravantes y antecedentes del imputado.</p>
                        <div className="bg-red-50 p-5 rounded-xl">
                            <p className="text-red-800">
                                La determinación específica corresponde a los tribunales de justicia. No obstante, incluso una agresión considerada menor puede generar antecedentes penales y consecuencias jurídicas relevantes.
                            </p>
                        </div>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mt-4">
                            <p className="text-amber-800 text-sm">
                                El marco penal es una referencia, pero dos personas imputadas por lesiones similares pueden enfrentar resultados procesales distintos: una puede acceder a una suspensión condicional si cumple los requisitos; la otra puede llegar a un juicio oral. Esa diferencia no la determina solo la lesión sino los antecedentes de la carpeta investigativa.
                            </p>
                        </div>
                    </div>

                    {/* VIF */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Lesiones leves en contexto de violencia intrafamiliar</h2>
                        <p className="text-gray-600 mb-4">Cuando la agresión ocurre entre personas unidas por vínculos familiares o afectivos, la situación adquiere especial relevancia.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Cónyuges", "Ex parejas", "Convivientes", "Padres e hijos", "Otros integrantes del grupo familiar"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-red-500">•</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">En estos casos pueden intervenir normas especiales de protección y medidas cautelares destinadas a resguardar a la víctima.</p>
                    </div>

                    <InArticleCTA
                        message="Si te notificaron una denuncia por lesiones, el momento más importante es antes de la primera audiencia — no después de haber prestado declaración sin asesoría."
                        buttonText="Consultar con abogado penal"
                        category="Derecho Penal"
                    />

                    {/* NEGACION */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué ocurre si el agresor niega los hechos?</h2>
                        <p className="text-gray-600 mb-4">Es una situación frecuente. Muchas investigaciones se desarrollan precisamente porque existen versiones contradictorias.</p>
                        <div className="bg-amber-50 p-5 rounded-xl">
                            <p className="font-bold text-amber-800">Elementos que adquieren importancia:</p>
                            <ul className="mt-2 space-y-1 text-amber-700">
                                <li>• Testigos</li>
                                <li>• Cámaras de seguridad</li>
                                <li>• Fotografías</li>
                                <li>• Informes médicos</li>
                                <li>• Mensajes previos o posteriores al incidente</li>
                            </ul>
                        </div>
                        <p className="text-gray-600 mt-4">La evaluación final corresponde al tribunal considerando el conjunto de la evidencia.</p>
                    </div>

                    {/* RETIRAR DENUNCIA */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Puedo retirar una denuncia por lesiones?</h2>
                        <p className="text-gray-600">
                            Muchas personas creen que una vez presentada la denuncia pueden simplemente desistirse. Sin embargo, los delitos de lesiones involucran el interés público de perseguir conductas ilícitas. Por esta razón, la decisión final sobre la continuación del procedimiento normalmente corresponde a la Fiscalía y al sistema de justicia.
                        </p>
                    </div>

                    {/* SI TE ACUSAN */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pasa si me acusan de lesiones leves?</h2>
                        <p className="text-gray-600 mb-4">Si eres investigado por una agresión física, es importante actuar con cautela.</p>
                        <div className="space-y-3">
                            {[
                                { title: "No declarar impulsivamente", desc: "Toda declaración puede influir en la investigación." },
                                { title: "Buscar asesoría legal", desc: "Un abogado penalista puede evaluar los antecedentes y diseñar una estrategia adecuada." },
                                { title: "Reunir evidencia", desc: "Testigos, registros audiovisuales y comunicaciones pueden ser relevantes." },
                                { title: "Respetar medidas cautelares", desc: "Si el tribunal dicta restricciones, deben cumplirse estrictamente." },
                            ].map((item, i) => (
                                <div key={i} className="border border-gray-100 bg-white p-5 rounded-xl flex items-start gap-4 hover:bg-gray-50 transition-colors shadow-sm">
                                    <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">{i + 1}</div>
                                    <div>
                                        <p className="text-lg font-bold text-gray-900 mb-1">{item.title}</p>
                                        <p className="text-gray-600">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* MEDIDAS CAUTELARES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Medidas cautelares en casos de lesiones</h2>
                        <p className="text-gray-600 mb-4">Dependiendo de las circunstancias, un juez podría decretar medidas cautelares.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {[
                                { title: "Prohibición de acercamiento", desc: "Especialmente frecuente cuando existe riesgo de nuevos conflictos." },
                                { title: "Firma periódica", desc: "Obligación de comparecer regularmente ante una autoridad." },
                                { title: "Arraigo nacional", desc: "Restricción para salir del país." },
                                { title: "Arresto domiciliario", desc: "Aplicable en situaciones de mayor gravedad." },
                            ].map((item, i) => (
                                <div key={i} className="bg-gray-50 p-3 rounded-xl">
                                    <h4 className="font-bold text-gray-900">{item.title}</h4>
                                    <p className="text-gray-600">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-4">La procedencia dependerá de los antecedentes específicos del caso.</p>
                    </div>

                    {/* PRUEBAS UTILES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Qué pruebas son útiles en una causa por lesiones?</h2>
                        <p className="text-gray-600 mb-4">Las investigaciones suelen apoyarse en múltiples tipos de evidencia.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {["Informes médicos", "Fotografías", "Cámaras de seguridad", "Testigos", "Mensajes y comunicaciones"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-green-600 font-bold">✓</span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* DIFERENCIAS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Diferencia entre lesiones leves, menos graves, graves y gravísimas</h2>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {[
                                { title: "Lesiones leves", desc: "Daños menores y recuperación rápida.", color: "green" },
                                { title: "Lesiones menos graves", desc: "Comprometen de forma más significativa la salud de la víctima.", color: "yellow" },
                                { title: "Lesiones graves", desc: "Generan consecuencias importantes o incapacidades relevantes.", color: "orange" },
                                { title: "Lesiones gravísimas", desc: "Producen secuelas permanentes extremadamente severas.", color: "red" },
                            ].map((item, i) => {
                                const bgColor = {
                                    green: "bg-green-50 border-green-200",
                                    yellow: "bg-yellow-50 border-yellow-200",
                                    orange: "bg-orange-50 border-orange-200",
                                    red: "bg-red-50 border-red-200",
                                }[item.color];
                                return (
                                    <div key={i} className={`${bgColor} border p-4 rounded-xl`}>
                                        <h3 className="font-bold text-gray-900">{item.title}</h3>
                                        <p className="text-gray-600">{item.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-gray-600 mt-4">La clasificación concreta dependerá de informes médicos y evaluación judicial.</p>
                    </div>

                    {/* ERRORES FRECUENTES */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes después de una agresión</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "No constatar lesiones", desc: "Puede dificultar enormemente la acreditación del daño." },
                                    { title: "Esperar demasiado para denunciar", desc: "El paso del tiempo puede hacer desaparecer evidencia." },
                                    { title: "Eliminar mensajes", desc: "Algunas conversaciones pueden transformarse en pruebas relevantes." },
                                    { title: "Enfrentar nuevamente al agresor", desc: "Esto puede agravar la situación y generar nuevos incidentes." },
                                    { title: "Declarar sin asesoría jurídica", desc: "Tanto víctimas como imputados pueden perjudicar su posición procesal." },
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

                    {/* ACUERDOS */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Se puede llegar a acuerdos en estos casos?</h2>
                        <p className="text-gray-600">
                            Dependiendo de las características del caso y de los delitos investigados, la legislación contempla mecanismos alternativos que podrían permitir soluciones distintas a un juicio oral completo. La procedencia de estas alternativas dependerá siempre de las circunstancias concretas y de la evaluación realizada por los intervinientes y el tribunal.
                        </p>
                    </div>

                    {/* CUANDO CONSULTAR */}
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿En qué situaciones conviene consultar cuanto antes a un abogado penal?</h2>
                        <p className="text-gray-600 mb-4">Existen momentos específicos donde la asesoría legal urgente puede cambiar el rumbo del caso:</p>
                        <ul className="space-y-3 text-gray-600">
                            <li className="flex items-start gap-3">
                                <span className="text-green-600 font-bold mt-0.5">•</span>
                                <span>Cuando recibes una citación a declarar como imputado por una denuncia de lesiones y aún no conoces los antecedentes de la carpeta.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-green-600 font-bold mt-0.5">•</span>
                                <span>Si la Fiscalía ya solicitó medidas cautelares en tu contra y necesitas evaluar tu situación procesal antes de la audiencia.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-green-600 font-bold mt-0.5">•</span>
                                <span>Cuando eres víctima de una agresión y necesitas orientación sobre la constatación de lesiones y los pasos para formalizar la denuncia.</span>
                            </li>
                        </ul>
                    </div>

                    {/* CTA PRINCIPAL */}
                    <div className="mb-12">
                        <div className="bg-green-900 rounded-2xl p-8 text-center">
                            <h3 className="text-2xl font-serif font-bold text-green-600 mb-3">¿Ya te citaron a declarar por lesiones?</h3>
                            <p className="text-white mb-6">Si la Fiscalía ya formalizó la investigación o recibiste una citación como imputado, el momento para contar con defensa penal es antes de prestar declaración — no después de haber entregado tu versión.</p>
                            <Link
                                to="/abogados-penales"
                                className="inline-block bg-white text-green-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                Ver abogados penalistas disponibles
                            </Link>
                        </div>
                    </div>

                    {/* CONCLUSION */}
                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Las lesiones leves son uno de los delitos más frecuentes en Chile. Esta guía describe las reglas generales y los pasos iniciales para víctimas e imputados.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            La pregunta que queda abierta es cómo se aplican esas reglas a los hechos específicos de cada caso — y esa respuesta depende de los antecedentes concretos de la carpeta investigativa. Si quieres revisar tu situación particular, puedes consultar con un{" "}
                            <Link to="/abogados-penales" className="text-green-700 underline hover:text-green-500">
                                abogado penalista en Chile
                            </Link>.
                        </p>
                    </div>

                    <CategoryCTA category="penal" />

                    {/* FAQS */}
                    <div className="mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre lesiones leves en Chile</h2>
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
                        title="Lesiones leves en Chile 2026"
                        url="https://legalup.cl/blog/lesiones-leves-chile-2026"
                    />
                </div>

                <BlogNavigation currentArticleId="lesiones-leves-chile-2026" />

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