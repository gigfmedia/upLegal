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
        { question: "¿Las amenazas por WhatsApp son delito en Chile?", answer: "Sí. Las amenazas de causar daño a una persona o sus bienes, cuando son serias y verosímiles, configuran el delito de amenazas del Código Penal, agravado si se hacen para imponer una exigencia o si provocan temor fundado. WhatsApp es solo el medio." },
        { question: "¿Qué pruebas sirven para denunciar amenazas por WhatsApp?", answer: "Capturas completas con fecha, hora y número visible, exportación del chat, respaldo notarial o ante Carabineros, audios y videos originales sin editar, y testigos que hayan visto los mensajes." },
        { question: "¿Dónde denuncio amenazas por WhatsApp en 2026?", answer: "Puedes denunciar ante Carabineros, PDI o directamente en la Fiscalía. También puedes hacer denuncia online en comisaría virtual para dejar constancia y luego formalizar la denuncia. Lleva tu cédula y toda la evidencia." },
        { question: "¿Debo borrar los mensajes amenazantes?", answer: "No. No borres ni edites nada. Guarda el chat completo, haz respaldo en Google Drive/iCloud y exporta la conversación. Borrar puede hacerte perder la única prueba y sugerir que no hubo amenaza." },
        { question: "¿Qué pasa si el agresor usa número oculto o extranjero?", answer: "Se puede investigar igual: la Fiscalía puede oficiar a las compañías telefónicas y a Meta (WhatsApp) con orden judicial para identificar la titularidad. Mensajes con foto de perfil, voz o datos contextuales ayudan a probar quién es." },
        { question: "¿Puedo pedir medidas de protección por amenazas por WhatsApp?", answer: "Sí. Si hay riesgo para ti o tu familia, la Fiscalía puede pedir al Juzgado de Garantía medidas como prohibición de acercamiento, de comunicación o vigilancia. Si hay contexto de violencia intrafamiliar, aplican las medidas de la Ley 20.066." },
        { question: "¿La constancia sirve como denuncia?", answer: "No. La constancia o el acta deja registro, pero la denuncia inicia la investigación penal. Si temes que escale, no te quedes solo con la constancia: denuncia." },
        { question: "¿Necesito abogado para denunciar amenazas digitales?", answer: "No es obligatorio para denunciar, pero un abogado penal acelera las diligencias, pide medidas de protección, corrige la calificación del delito y evita que tu caso quede archivado por falta de impulso." },
    ];
    return (
        <div className="min-h-screen bg-white">
            <BlogGrowthHacks
                title="Amenazas por WhatsApp en Chile 2026: cómo denunciar y qué pruebas necesitas"
                description="¿Te amenazan por WhatsApp en Chile? Qué delito es, cómo denunciar paso a paso y qué pruebas con capturas, audios y respaldo necesitas para que la Fiscalía actúe."
                image="/assets/amenazas-whatsapp-chile-2026.png"
                url="https://legalup.cl/blog/amenazas-whatsapp-chile-2026"
                datePublished="2026-08-11"
                dateModified="2026-08-11"
                faqs={faqs}
            />
            <Header onAuthClick={() => {}} />
            <ReadingProgressBar />
            <div className="bg-[#f4efdf] text-white py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
                    <div className="flex items-center gap-2 mb-4 text-green-500"><Link to="/blog" className="hover:text-green-900 transition-colors">Blog</Link><ChevronRight className="h-4 w-4" /><span>Artículo</span></div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-green-900 font-serif mb-6">Amenazas por WhatsApp en Chile 2026: cómo denunciar y qué pruebas necesitas</h1>
                    <div className="bg-white backdrop-blur-sm border rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-4">Resumen rápido</p>
                        <ul className="space-y-2 text-green-900">
                            {[
                                "Amenazar por WhatsApp sí es delito cuando la amenaza es seria y verosímil.",
                                "No borres nada: guarda capturas completas, audios originales y exporta el chat.",
                                "Bloquea al contacto solo después de respaldar y dejar constancia.",
                                "Denuncia ante Carabineros, PDI o Fiscalía y pide medidas de protección si hay riesgo.",
                                "Una constancia no reemplaza la denuncia: denuncia para que se investigue.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3"><span className="text-green-500 font-bold">✓</span><span className="text-sm sm:text-base">{item}</span></li>
                            ))}
                        </ul>
                    </div>
                    <p className="text-xl max-w-3xl text-green-900">Un mensaje amenazante en WhatsApp puede parecer solo una discusión, pero en Chile la ley lo toma en serio. Si te escriben "te voy a hacer algo", "sé dónde vives" o te extorsionan, necesitas saber cómo conservar la prueba y denunciar correctamente para que la Fiscalía no archive tu caso.</p>
                    <div className="flex flex-wrap items-center gap-4 mt-6 text-green-900">
                        <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>11 de Agosto, 2026</span></div>
                        <div className="flex items-center gap-2"><User className="h-4 w-4" /><span>Equipo LegalUp</span></div>
                        <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><ReadTime slug="amenazas-whatsapp-chile-2026" /></div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white border sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare title="Amenazas por WhatsApp en Chile 2026" url="https://legalup.cl/blog/amenazas-whatsapp-chile-2026" showBorder={false} />

                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">WhatsApp es el canal donde hoy ocurren la mayoría de las amenazas digitales: discusiones de pareja, conflictos por deudas, extorsiones o amedrentamiento entre vecinos. A diferencia de un insulto aislado, la amenaza es anunciar un mal futuro e injusto para atemorizar a otro.</p>
                        <p className="text-gray-600 mt-4">En esta guía 2026 aprenderás cuándo una amenaza por WhatsApp es delito, cómo diferenciarla de una simple constancia, qué capturas y respaldos sirven como prueba válida y cómo denunciar paso a paso. También veremos qué hacer si el agresor te bloquea, usa número extranjero o te amenaza con difundir fotos.</p>
                        <p className="text-gray-600 mt-4">Si vienes por una amenaza en general, revisa <Link to="/blog/constancia-por-amenazas-en-chile-2026" className="text-green-700 underline">constancia por amenazas en Chile</Link>. Si el contexto es violencia intrafamiliar, revisa <Link to="/blog/violencia-intrafamiliar-chile-2026" className="text-green-700 underline">VIF y medidas de protección</Link> y <Link to="/blog/orden-de-alejamiento-chile-2026" className="text-green-700 underline">orden de alejamiento</Link>.</p>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo un mensaje de WhatsApp es delito de amenazas?</h2>
                        <p className="text-gray-600 mb-4">El Código Penal chileno sanciona al que amenazare seriamente a otro con causarle un mal que constituya delito, siempre que la amenaza sea verosímil y genere temor. No se exige que el agresor cumpla la amenaza: basta con anunciarla de forma creíble.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Elemento</th><th className="border border-gray-300 p-3">Qué significa en WhatsApp</th><th className="border border-gray-300 p-3">Ejemplo</th></tr></thead>
                                <tbody>
                                    <tr><td className="border border-gray-300 p-3">Seriedad</td><td className="border border-gray-300 p-3">No es broma ni hipérbole evidente. Se percibe como intención real.</td><td className="border border-gray-300 p-3">"Te voy a esperar afuera del trabajo mañana a las 8".</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Verosimilitud</td><td className="border border-gray-300 p-3">El destinatario puede creer que se cumplirá: agresor sabe dónde vive, trabaja o estudia.</td><td className="border border-gray-300 p-3">"Sé dónde viven tus hijos, te voy a quemar la casa".</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Mal injusto</td><td className="border border-gray-300 p-3">Anuncia un daño ilegítimo: lesiones, muerte, daño a bienes, divulgar imágenes íntimas.</td><td className="border border-gray-300 p-3">"Si no me pagas, publico tus fotos".</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-gray-600 mt-4">Si la amenaza es condicional ("si no me depositas, te..."), puede agravarse como amenaza extorsiva. Si hay contexto de género o VIF, el tribunal aplica criterios más protectores. Un simple insulto sin anuncio de mal futuro ("eres un...") puede ser injuria, pero no amenaza.</p>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Constancia vs denuncia por amenazas digitales</h2>
                        <p className="text-gray-600 mb-4">Muchas personas dejan solo una constancia en Carabineros creyendo que basta. La diferencia es clave para que tu caso avance.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Trámite</th><th className="border border-gray-300 p-3">Para qué sirve</th><th className="border border-gray-300 p-3">Limitación</th></tr></thead>
                                <tbody>
                                    <tr><td className="border border-gray-300 p-3">Constancia / acta</td><td className="border border-gray-300 p-3">Deja registro fechado de lo ocurrido, útil como indicio o antecedente.</td><td className="border border-gray-300 p-3">No inicia investigación penal por sí sola.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Denuncia</td><td className="border border-gray-300 p-3">Obliga a la Fiscalía a abrir causa, pedir diligencias y evaluar medidas de protección.</td><td className="border border-gray-300 p-3">Requiere impulso: aportar prueba y hacer seguimiento.</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl mt-4">
                            <p className="font-bold text-blue-900">Recomendación</p>
                            <p className="text-blue-800">Si temes que la amenaza escale, haz la denuncia directamente. Puedes hacer primero la constancia y enseguida denunciar; no son excluyentes.</p>
                        </div>
                    </div>

                    <RelatedLawyers category="Derecho Penal" />

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Qué pruebas necesitas: capturas que sí valen</h2>
                        <p className="text-gray-600 mb-4">La Fiscalía archiva muchas causas digitales por prueba incompleta. Si preparas bien tu evidencia, aumentas mucho la probabilidad de que investiguen. Haz esto en orden:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Captura completa: abre el chat, que se vea el nombre y número arriba, el mensaje amenazante, la fecha y hora. No cortes ni edites.",
                                "Haz scroll y captura toda la conversación, no solo el mensaje aislado: el contexto importa (qué lo provocó).",
                                "Exporta el chat (WhatsApp > Info del chat > Exportar chat) con archivos. Guarda el .txt y los audios originales.",
                                "Guarda audios y videos sin editar, con metadatos. No reenvíes audios comprimidos si puedes exportar el original.",
                                "Verifica el número: captura la ficha del contacto (foto, info, número) y guarda si lo tienes agendado con nombre real.",
                                "Respalda en la nube y deja una copia ante notario o en Carabineros: fecha cierta y cadena de custodia mínima.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-2"><span className="text-green-600 flex-shrink-0">✓</span><span className="text-gray-700 font-bold">{item}</span></li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Si el agresor borra mensajes con "eliminar para todos", tu captura previa es la prueba. Por eso no esperes: respalda en cuanto recibas la amenaza. Si puedes, pide a un testigo que presencie la extracción de la conversación.</p>
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl mt-4">
                            <p className="font-bold text-amber-900">Peritaje</p>
                            <p className="text-amber-800">Un perito informático puede certificar la autenticidad de capturas y extraer metadatos. Si el caso llega a juicio, esa pericia vale más que diez capturas impresas sin validación.</p>
                        </div>
                    </div>

                    <InArticleCTA category="Derecho Penal" title="¿Te amenazan por WhatsApp y temes por tu seguridad?" message="Un abogado penal puede denunciar por ti, pedir medidas de protección y oficiar a las compañías para identificar el número." />

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Guía paso a paso para denunciar</h2>
                        <p className="text-gray-600 mb-4">Sigue estos pasos en orden. Puedes hacerlos el mismo día.</p>
                        <div className="space-y-3">
                            <div className="bg-white border p-4 rounded-xl"><h3 className="font-bold">1. Conserva y respalda</h3><p className="text-gray-600">No bloquees antes de respaldar. Exporta el chat, haz capturas con fecha y guarda audios originales.</p></div>
                            <div className="bg-white border p-4 rounded-xl"><h3 className="font-bold">2. Bloquea y no respondas</h3><p className="text-gray-600">Una vez respaldado, bloquea al contacto, silencia y no entres en провокации. Cada respuesta tuya puede ser usada para relativizar la amenaza.</p></div>
                            <div className="bg-white border p-4 rounded-xl"><h3 className="font-bold">3. Denuncia</h3><p className="text-gray-600">Acude a Carabineros, PDI o Fiscalía con tu cédula y la carpeta de evidencia. Pide copia del parte y el RUC de la causa. Si fue online, guarda el comprobante.</p></div>
                            <div className="bg-white border p-4 rounded-xl"><h3 className="font-bold">4. Pide medidas de protección</h3><p className="text-gray-600">Si hay riesgo, solicita prohibición de acercamiento, prohibición de comunicación y ronda policial. En VIF, la Fiscalía puede pedirlas el mismo día al Juzgado de Garantía.</p></div>
                            <div className="bg-white border p-4 rounded-xl"><h3 className="font-bold">5. Haz seguimiento</h3><p className="text-gray-600">Consulta el estado con el RUC, aporta nuevas amenazas si ocurren y ofrece testigos. Sin impulso, muchas causas por amenazas se archivan provisionalmente.</p></div>
                        </div>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Casos especiales frecuentes</h2>
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-5 rounded-xl border">
                                <h3 className="font-bold">Amenaza de difundir fotos íntimas</h3>
                                <p className="text-gray-600 mt-2">Si te extorsionan con imágenes ("si no me pagas, las publico"), además de amenazas puede haber chantaje, extorsión o difusión no consentida. No cedas al pago: guarda la conversación y denuncia. En paralelo, pide al tribunal la prohibición de difusión.</p>
                            </div>
                            <div className="bg-gray-50 p-5 rounded-xl border">
                                <h3 className="font-bold">Número desconocido, extranjero o con foto falsa</h3>
                                <p className="text-gray-600 mt-2">La identificación no se detiene por eso. Con la denuncia, la Fiscalía puede oficiar a la compañía telefónica para obtener titularidad y a Meta con orden judicial para logs de WhatsApp. Si reconoces la voz, la forma de escribir o datos que solo una persona conoce, dilo: es indicio de autoría.</p>
                            </div>
                            <div className="bg-gray-50 p-5 rounded-xl border">
                                <h3 className="font-bold">Me amenazó un familiar o expareja</h3>
                                <p className="text-gray-600 mt-2">Pide la calificación como VIF si corresponde. El estándar probatorio para medidas de protección es más bajo que para condena: basta el riesgo. Esto permite alejamientos rápidos aunque la investigación penal siga abierta.</p>
                            </div>
                            <div className="bg-gray-50 p-5 rounded-xl border">
                                <h3 className="font-bold">Amenaza entre vecinos o por deudas</h3>
                                <p className="text-gray-600 mt-2">Discusiones por ruidos, deslindes o cobranzas suelen escalar. Si te amenazan para cobrar ("te voy a ir a quebrar"), la amenaza es delito aunque exista una deuda real. El cobro debe ser judicial, nunca intimidatorio.</p>
                            </div>
                        </div>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Qué pasa después de la denuncia</h2>
                        <p className="text-gray-600 mb-4">Abierta la causa, la Fiscalía evalúa si la amenaza es seria y creíble. Puede citar al denunciado a declarar, pedir informe a Carabineros, oficiar a la compañía telefónica o archivar provisionalmente si falta prueba. Si hay formalización, el juez puede imponer medidas cautelares como prohibición de acercarse o de comunicarse.</p>
                        <p className="text-gray-600">Como víctima, tienes derecho a ser informada, a aportar antecedentes y a apelar el archivo provisional solicitando diligencias concretas. Si la amenaza se concreta en lesiones o daños, el caso se recalifica a delito más grave. Guarda cada nuevo mensaje: cada reiteración refuerza la seriedad.</p>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores que te hacen perder el caso</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Borrar el chat", desc: "Eliminar la conversación borra la única prueba directa. Respalda antes de cualquier acción." },
                                    { title: "Captura recortada", desc: "Enviar solo el mensaje amenazante sin contexto (sin número, fecha o conversación previa) permite a la defensa alegar montaje." },
                                    { title: "Responder con amenazas", desc: "Si respondes amenazando de vuelta, ambos pueden terminar investigados y se diluye tu calidad de víctima." },
                                    { title: "Quedarse solo con la constancia", desc: "La constancia no mueve la causa. Denuncia para que se abra investigación y se pidan medidas." },
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
                        <p className="text-amber-800">Si ya recibiste amenazas por WhatsApp, cada día sin denunciar puede significar perder mensajes, que se borren registros o que la amenaza escale sin medidas de protección. No esperes a que pase a hechos para buscar ayuda.</p>
                    </div>

                    <InArticleCTA
                        title="¿Te amenazaron por WhatsApp y temes que escale?"
                        message="Un abogado penal puede denunciar por ti, pedir medidas de protección y oficiar a las compañías para identificar el número."
                        buttonText="Hablar con un abogado penal"
                        category="Derecho Penal"
                    />

                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 mb-4">Las amenazas por WhatsApp no son un juego: son delito cuando son serias y verosímiles, y la Fiscalía puede actuar si aportas prueba ordenada. La clave está en conservar todo sin editar, denunciar rápido y pedir medidas de protección si hay riesgo.</p>
                        <p className="text-gray-600">Si te ocurrieron hechos como estos, no te quedes con la captura guardada. Consulta con un <Link to="/abogados-penales" className="text-green-700 underline">abogado penal</Link> en LegalUp y revisa nuestras guías de <Link to="/blog/constancia-por-amenazas-en-chile-2026" className="text-green-700 underline">constancia por amenazas</Link> y <Link to="/blog/violencia-intrafamiliar-chile-2026" className="text-green-700 underline">violencia intrafamiliar</Link>.</p>
                    </div>

                    <CategoryCTA category="penal" />

                    <div className="mt-12 mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre amenazas por WhatsApp</h2>
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
                <div className="mt-8"><BlogShare title="Amenazas por WhatsApp en Chile 2026" url="https://legalup.cl/blog/amenazas-whatsapp-chile-2026" /></div>
                <BlogNavigation currentArticleId="amenazas-whatsapp-chile-2026" />
                <div className="mt-4 text-center"><Link to="/blog" className="inline-flex items-center gap-2 text-green-900 hover:text-green-600 font-medium"><ArrowLeft className="h-4 w-4" />Volver al Blog</Link></div>
            </div>
            <BlogConversionPopup category="Derecho Penal" topic="amenazas-whatsapp" />
        </div>
    );
};
export default BlogArticle;
