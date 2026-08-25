import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, User, Clock, ChevronRight } from "lucide-react";
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
        { question: "¿Quién paga los daños en un accidente de tránsito en Chile?", answer: "Paga quien causó el accidente por culpa o dolo. Si ambos tuvieron culpa, se reparte proporcionalmente. El dueño del vehículo puede responder solidariamente y el seguro (SOAP y complementarios) cubre según sus condiciones." },
        { question: "¿Qué cubre el SOAP en un accidente de tránsito?", answer: "El SOAP solo cubre lesiones corporales y muerte de víctimas del accidente (conductor, pasajeros y peatones), no los daños materiales de los vehículos. Tiene topes por persona y exige denuncia y atención médica oportuna." },
        { question: "¿Qué hacer inmediatamente después de un choque?", answer: "Detenerte, señalizar, asistir a heridos, llamar a Carabineros y al 131 si hay lesionados, no mover vehículos si hay heridos graves, intercambiar datos y fotos, y hacer la denuncia. No firmes acuerdos apresurados ni reconozcas culpa en el momento." },
        { question: "¿Cómo reclamo daños materiales tras un accidente?", answer: "Reúne parte policial, fotos, cotizaciones o facturas de reparación, informe de Carabineros y testigos. Puedes reclamar extrajudicialmente al responsable o demandar indemnización por responsabilidad extracontractual ante el Juzgado Civil." },
        { question: "¿Puedo demandar si ambos tuvimos la culpa?", answer: "Sí, pero la indemnización se reduce según tu porcentaje de culpa. Si ibas sin licencia, con alcohol o a exceso de velocidad, eso influye en la distribución de responsabilidad." },
        { question: "¿Qué plazo tengo para demandar por accidente de tránsito?", answer: "La acción por responsabilidad extracontractual prescribe en cuatro años desde el accidente. Si hubo lesiones, el plazo cuenta desde que se consolidan. No esperes al alta definitiva para asesorarte." },
        { question: "¿Qué pasa si el otro conductor se dio a la fuga?", answer: "Haz la denuncia con patente, modelo, color y testigos. Carabineros y Fiscalía pueden investigar. Tu SOAP igual cubre tus lesiones como víctima; los daños materiales los perseguirás civilmente una vez identificado el responsable." },
        { question: "¿Necesito abogado para un accidente de tránsito?", answer: "Si hay lesionados, daños materiales relevantes o disputa sobre culpa, sí. Un abogado civil fija el monto (lucro cesante, daño emergente, daño moral), negocia con seguros y demanda si no hay acuerdo." },
    ];
    return (
        <div className="min-h-screen bg-white">
            <BlogGrowthHacks
                title="Accidente de tránsito en Chile 2026: quién paga los daños y cómo reclamar"
                description="Sufriste un accidente de tránsito en Chile? Conoce quién paga daños materiales y lesiones, qué cubre el SOAP y cómo reclamar indemnización paso a paso."
                image="/assets/accidente-transito-chile-2026.png"
                url="https://legalup.cl/blog/accidente-transito-chile-2026"
                datePublished="2026-08-12"
                dateModified="2026-08-12"
                faqs={faqs}
            />
            <Header onAuthClick={() => {}} />
            <ReadingProgressBar />
            <div className="bg-[#f4efdf] text-white py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
                    <div className="flex items-center gap-2 mb-4 text-green-500"><Link to="/blog" className="hover:text-green-900 transition-colors">Blog</Link><ChevronRight className="h-4 w-4" /><span>Artículo</span></div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-green-900 font-serif mb-6">Accidente de tránsito en Chile 2026: quién paga los daños y cómo reclamar</h1>
                    <div className="bg-white backdrop-blur-sm border rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-4">Resumen rápido</p>
                        <ul className="space-y-2 text-green-900">
                            {[
                                "El que causa el accidente por culpa paga: daños materiales, lesiones y perjuicios.",
                                "El SOAP solo cubre personas (lesiones/muerte), no el auto.",
                                "Documenta todo: parte, fotos, testigos y cotizaciones.",
                                "Reclama extrajudicial primero; si no hay acuerdo, demanda civil por responsabilidad extracontractual.",
                                "Tienes 4 años para demandar, pero actúa en las primeras semanas.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3"><span className="text-green-500 font-bold">✓</span><span className="text-sm sm:text-base">{item}</span></li>
                            ))}
                        </ul>
                    </div>
                    <p className="text-xl max-w-3xl text-green-900">Un choque deja más que latas abolladas: deja cuentas médicas, días sin trabajar y discusiones sobre quién tuvo la culpa. En Chile, la ley es clara sobre quién responde, qué cubre el seguro obligatorio y cómo se cobra la diferencia. Esta guía te ordena los pasos para no perder plata por no saber qué hacer en el momento.</p>
                    <div className="flex flex-wrap items-center gap-4 mt-6 text-green-900">
                        <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>12 de Agosto, 2026</span></div>
                        <div className="flex items-center gap-2"><User className="h-4 w-4" /><span>Equipo LegalUp</span></div>
                        <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><ReadTime slug="accidente-transito-chile-2026" /></div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white border sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare title="Accidente de tránsito en Chile 2026" url="https://legalup.cl/blog/accidente-transito-chile-2026" showBorder={false} />

                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">En Chile los accidentes de tránsito se rigen por la Ley de Tránsito y por las reglas de responsabilidad civil extracontractual. Eso significa que, además de las multas y la eventual responsabilidad penal si hubo lesiones o muerte, el responsable debe indemnizar a las víctimas por todos los perjuicios causados.</p>
                        <p className="text-gray-600 mt-4">Esta guía 2026 explica quién paga, qué cubre el SOAP y qué no, cómo se prueba la culpa y cómo reclamar daños materiales y lesiones, con o sin demanda. Si te deben plata por otro motivo, revisa <Link to="/blog/no-me-pagan-una-deuda-chile-2026" className="text-green-700 underline">qué hacer cuando no te pagan una deuda</Link> y <Link to="/blog/como-cobrar-deuda-legalmente-chile-2026" className="text-green-700 underline">cómo cobrar legalmente</Link>; si hubo amenazas tras el choque, revisa <Link to="/blog/constancia-por-amenazas-en-chile-2026" className="text-green-700 underline">constancia por amenazas</Link>.</p>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Quién es responsable en un accidente de tránsito?</h2>
                        <p className="text-gray-600 mb-4">La responsabilidad civil exige culpa. El conductor que por imprudencia, negligencia o infracción causa el choque responde por los daños. No basta con haber participado en el accidente: hay que probar que actuó sin el cuidado debido.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Situación</th><th className="border border-gray-300 p-3">Quién responde</th><th className="border border-gray-300 p-3">Prueba clave</th></tr></thead>
                                <tbody>
                                    <tr><td className="border border-gray-300 p-3">Choque por alcance</td><td className="border border-gray-300 p-3">Quien no mantuvo distancia o velocidad razonable.</td><td className="border border-gray-300 p-3">Parte policial, frenadas, dashcam.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Cruce con luz roja / disco pare</td><td className="border border-gray-300 p-3">Quien no respetó la señal.</td><td className="border border-gray-300 p-3">Testigos, cámaras, informe SIAT.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Giro sin señalizar</td><td className="border border-gray-300 p-3">Quien giró sin precaución.</td><td className="border border-gray-300 p-3">Posición final de vehículos, peritaje.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Peatón atropellado</td><td className="border border-gray-300 p-3">Conductor si no respetó preferencia; peatón si cruzó imprudentemente.</td><td className="border border-gray-300 p-3">Paso de cebra, semáforo, velocidad.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Falla mecánica</td><td className="border border-gray-300 p-3">Dueño si hubo falta de mantención.</td><td className="border border-gray-300 p-3">Revisión técnica, mantenciones.</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-gray-600 mt-4">Si ambos tuvieron culpa, el juez reparte la responsabilidad. Por ejemplo, si el otro no respetó el pare pero tú ibas a exceso de velocidad, ambos soportan parte del daño. El dueño del vehículo responde solidariamente con el conductor si no prueba que el uso fue sin su autorización.</p>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Qué hacer en el momento del accidente: checklist</h2>
                        <p className="text-gray-600 mb-4">Lo que hagas en los primeros 30 minutos condiciona todo el reclamo posterior. Sigue este orden:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Detente y señaliza: balizas, triángulo y chaleco. No muevas vehículos si hay heridos graves hasta que llegue ayuda.",
                                "Asiste y llama: 131 si hay lesionados, 133 Carabineros. No dejes el lugar si hay heridos: es delito.",
                                "Documenta: fotos de patente, posición de autos, frenadas, semáforos, daños y entorno. Graba un video de 360°.",
                                "Intercambia datos: nombre, RUT, patente, seguro, teléfono. Pide datos de testigos.",
                                "No firmes nada ni reconozcas culpa apresurada: el parte y el peritaje dirán quién tuvo la culpa.",
                                "Haz la denuncia y constancia: parte policial, informe al seguro en 24-48 horas y guarda boletas médicas.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-2"><span className="text-green-600 flex-shrink-0">✓</span><span className="text-gray-700 font-bold">{item}</span></li>
                            ))}
                        </ul>
                        <div className="bg-red-50 p-5 rounded-xl mt-4">
                            <p className="text-red-800 font-bold">Nunca te vayas sin dejar datos</p>
                            <p className="text-red-700">Abandonar el lugar sin prestar auxilio ni dar cuenta a la autoridad cuando hay lesionados configura cuasidelito con sanciones penales y civiles agravadas.</p>
                        </div>
                    </div>

                    <RelatedLawyers category="Derecho Civil" />

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Qué cubre el SOAP y qué no cubre</h2>
                        <p className="text-gray-600 mb-4">El Seguro Obligatorio de Accidentes Personales es obligatorio para todos los vehículos motorizados. Su lógica es proteger personas, no fierros.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Cubre</th><th className="border border-gray-300 p-3">No cubre</th><th className="border border-gray-300 p-3">Requisitos</th></tr></thead>
                                <tbody>
                                    <tr><td className="border border-gray-300 p-3">Muerte, incapacidad y gastos médicos de víctimas (conductor, pasajeros, peatones).</td><td className="border border-gray-300 p-3">Daños materiales del auto, remolque, lucro cesante del conductor culpable.</td><td className="border border-gray-300 p-3">Denuncia policial y atención en servicio de urgencia. Plazo para cobrar es acotado.</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-gray-600 mt-4">El SOAP tiene topes por persona y por concepto (por ejemplo, gastos médicos hasta cierto UF). Si tus gastos superan el tope, la diferencia la pagas tú o la reclamas al responsable por vía civil. Los seguros complementarios (responsabilidad civil, pérdida total, auto de reemplazo) sí pueden cubrir daños materiales si los contrataste.</p>
                    </div>

                    <InArticleCTA category="Derecho Civil" title="¿Chocaste y no sabes cuánto reclamar?" message="Un abogado civil calcula tu indemnización completa: reparación del auto, días sin trabajar, gastos médicos y daño moral." />

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Cómo reclamar la indemnización paso a paso</h2>
                        <p className="text-gray-600 mb-4">Reclamar bien no es solo pedir el presupuesto del taller. La indemnización civil incluye tres partidas:</p>
                        <div className="space-y-3">
                            <div className="bg-white border p-4 rounded-xl"><h3 className="font-bold">1. Daño emergente</h3><p className="text-gray-600">Lo que efectivamente gastaste: reparación, grúa, hospital, medicamentos, transporte mientras el auto estuvo en taller. Guarda facturas y cotizaciones de talleres reconocidos.</p></div>
                            <div className="bg-white border p-4 rounded-xl"><h3 className="font-bold">2. Lucro cesante</h3><p className="text-gray-600">Lo que dejaste de ganar: días sin trabajar, viajes perdidos, arriendo no percibido si eres conductor de app. Acredita con liquidaciones, boletas o contrato.</p></div>
                            <div className="bg-white border p-4 rounded-xl"><h3 className="font-bold">3. Daño moral</h3><p className="text-gray-600">El sufrimiento, dolor o aflicción por lesiones o por el impacto. Se prueba con informe médico, psicológico y con la gravedad del hecho. El juez lo fija prudencialmente.</p></div>
                        </div>
                        <p className="text-gray-600 mt-4">El camino práctico es: 1) reclama por escrito al responsable y a su aseguradora con presupuesto y pruebas, 2) intenta acuerdo extrajudicial con plazo, 3) si no hay acuerdo, demanda de indemnización ante Juzgado Civil por responsabilidad extracontractual. Un abogado valora si conviene demandar al conductor, al dueño y a la aseguradora en conjunto.</p>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Y si el culpable no tiene seguro o se fugó?</h2>
                        <p className="text-gray-600 mb-4">La falta de seguro no elimina la responsabilidad civil: el culpable responde con su patrimonio. Si se fugó, la patente, videos de cámaras y testigos permiten identificarlo. Haz la denuncia con todos los datos: color, modelo, hora, dirección y fotos. Tu SOAP igual cubre tus lesiones como víctima aunque el otro no sea habido.</p>
                        <p className="text-gray-600">Si el vehículo tenía seguro complementario, la víctima puede demandar directamente a la aseguradora. Si no, persigues los bienes del responsable por vía ejecutiva una vez que tengas sentencia.</p>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Pruebas que ganan juicios de tránsito</h2>
                        <p className="text-gray-600 mb-4">La culpa se prueba. Estas son las pruebas que más pesan para el juez:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Parte policial y croquis de Carabineros o informe SIAT en casos graves.",
                                "Fotos y videos del lugar, posición final, frenadas y semáforos.",
                                "Testigos presenciales con relato coherente y sin interés en el juicio.",
                                "Dashcam o cámaras de seguridad de locales cercanos: pídela en 72 horas antes de que se borren.",
                                "Peritaje mecánico y de velocidad: estima la velocidad por deformación y frenada.",
                                "Documentos médicos: certificado de lesiones, licencias y gastos.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-2"><span className="text-green-600 flex-shrink-0">✓</span><span className="text-gray-700 font-bold">{item}</span></li>
                            ))}
                        </ul>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Plazos, costos y errores comunes</h2>
                        <p className="text-gray-600 mb-4">El plazo para demandar indemnización por accidente prescribe en cuatro años desde el hecho. Parece mucho, pero la prueba se pierde rápido: testigos olvidan, cámaras se borran y presupuestos vencen. Actuar en las primeras semanas es clave.</p>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Aceptar el primer presupuesto del seguro sin revisar", desc: "El seguro del culpable intentará pagar el mínimo. Cotiza en taller de marca y suma lucro cesante y daño moral." },
                                    { title: "No hacer denuncia", desc: "Sin parte policial, tu relato pierde fuerza. Hazla aunque el daño parezca menor." },
                                    { title: "Reparar antes de documentar", desc: "Si reparas sin fotos ni informe, luego no podrás probar la magnitud del daño." },
                                    { title: "Demorar la demanda", desc: "Esperar años debilita la prueba y acerca la prescripción." },
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
                        <p className="font-bold text-amber-900">El tiempo juega en tu contra</p>
                        <p className="text-amber-800">Si ya sufriste un accidente, cada día sin actuar puede significar perder cámaras que se borran en 72 horas, testigos que olvidan o plazos del seguro que vencen. No esperes a que prescriba tu acción para buscar ayuda.</p>
                    </div>

                    <InArticleCTA
                        title="¿Chocaste y el seguro no responde?"
                        message="Un abogado civil puede calcular tu indemnización completa, negociar con la aseguradora y demandar por daño emergente, lucro cesante y daño moral."
                        buttonText="Hablar con un abogado civil"
                        category="Derecho Civil"
                    />

                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 mb-4">En un accidente de tránsito paga quien causó el daño por culpa, el SOAP cubre solo personas y el resto se cobra por vía civil con prueba ordenada. Documentar en el lugar, reclamar por escrito y demandar a tiempo marcan la diferencia entre recuperar todo y perder plata.</p>
                        <p className="text-gray-600">Si sufriste un choque con lesionados o daños relevantes, consulta con un <Link to="/search?specialty=Derecho Civil" className="text-green-700 underline">abogado civil</Link> en LegalUp. Revisa también <Link to="/blog/embargo-chile-2026" className="text-green-700 underline">embargo</Link>, <Link to="/blog/juicio-ejecutivo-chile-2026" className="text-green-700 underline">juicio ejecutivo</Link> y <Link to="/blog/como-cobrar-deuda-legalmente-chile-2026" className="text-green-700 underline">cómo cobrar legalmente</Link>.</p>
                    </div>

                    <CategoryCTA category="civil" />

                    <div className="mt-12 mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre accidentes de tránsito</h2>
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
                <div className="mt-8"><BlogShare title="Accidente de tránsito en Chile 2026" url="https://legalup.cl/blog/accidente-transito-chile-2026" /></div>
                <BlogNavigation currentArticleId="accidente-transito-chile-2026" />
                <div className="mt-4 text-center"><Link to="/blog" className="inline-flex items-center gap-2 text-green-900 hover:text-green-600 font-medium"><ArrowLeft className="h-4 w-4" />Volver al Blog</Link></div>
            </div>
            <BlogConversionPopup category="Derecho Civil" topic="accidente-transito" />
        </div>
    );
};
export default BlogArticle;
