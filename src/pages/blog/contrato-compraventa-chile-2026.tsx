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
        { question: "¿Qué debe tener un contrato de compraventa en Chile para ser válido?", answer: "Identificación de partes, cosa vendida, precio, forma de pago, plazo y lugar de entrega, declaración de dominio, saneamiento, gastos y firma. Si es inmueble, exige escritura pública e inscripción en el Conservador." },
        { question: "¿La compraventa de auto entre particulares necesita contrato?", answer: "Sí. El contrato + formulario de transferencia y la inscripción en el Registro Civil acreditan quién es dueño. Sin contrato escrito, cobrar, reclamar vicios ocultos o defender la posesión es mucho más difícil." },
        { question: "¿Qué es la promesa de compraventa y cuándo conviene firmarla?", answer: "Es un contrato preparatorio donde te obligas a firmar la compraventa futura si se cumplen condiciones (crédito aprobado, alzamiento de hipoteca). Conviene cuando necesitas amarrar el negocio y fijar multa si una parte se arrepiente." },
        { question: "¿Cómo me protejo si compro con pago en cuotas?", answer: "Fija precio total, número de cuotas, vencimiento, reajuste, interés por mora, cláusula resolutoria y reserva de dominio o prenda hasta el pago total. Paga siempre contra comprobante y deja constancia de cada abono." },
        { question: "¿Qué son los vicios ocultos y qué puedo hacer?", answer: "Son defectos graves no visibles al momento de la compra que hacen la cosa impropia para su uso. Puedes pedir resolución con devolución del precio o rebaja del precio, además de indemnización si hubo dolo." },
        { question: "¿Necesito notario para un contrato de compraventa?", answer: "Para muebles entre privados basta firma privada con dos testigos, pero la firma ante notario da fecha cierta y fuerza probatoria. Para inmuebles es obligatorio escritura pública." },
        { question: "¿Qué pasa si no me entregan lo que compré?", answer: "Puedes exigir cumplimiento forzado con indemnización o resolver el contrato y pedir devolución del precio más multas pactadas. La cláusula penal bien redactada agiliza ese cobro." },
        { question: "¿Un contrato por WhatsApp es válido?", answer: "Un acuerdo por WhatsApp puede valer como principio de prueba, pero es débil. Formaliza siempre en un documento con precio, cosa, plazo y firma. Un abogado lo deja a prueba de conflictos." },
    ];
    return (
        <div className="min-h-screen bg-gray-50">
            <BlogGrowthHacks
                title="Contrato de compraventa en Chile 2026: qué debe incluir y cómo protegerte"
                description="Firmas una compraventa en Chile? Qué debe incluir un contrato de compraventa, promesa, cláusulas clave y cómo protegerte si compras auto, casa o entre privados."
                image="/assets/contrato-compraventa-chile-2026.png"
                url="https://legalup.cl/blog/contrato-compraventa-chile-2026"
                datePublished="2026-08-14"
                dateModified="2026-08-14"
                faqs={faqs}
            />
            <Header onAuthClick={() => {}} />
            <ReadingProgressBar />
            <div className="bg-green-900 text-white py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
                    <div className="flex items-center gap-2 mb-4"><Link to="/blog" className="hover:text-white transition-colors">Blog</Link><ChevronRight className="h-4 w-4" /><span>Artículo</span></div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-green-600 font-serif mb-6">Contrato de compraventa en Chile 2026: qué debe incluir y cómo protegerte</h1>
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">Resumen rápido</p>
                        <ul className="space-y-2">
                            {[
                                "Sin contrato escrito no hay prueba clara de precio, cosa ni plazos.",
                                "Inmueble exige escritura pública + inscripción en Conservador.",
                                "Vehículo: contrato + transferencia en Registro Civil.",
                                "Fija precio total, forma de pago, entrega, multas y vicios ocultos.",
                                "Si hay cuotas, asegura reserva de dominio y cláusula resolutoria.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3"><span className="text-green-600 font-bold">✓</span><span className="text-sm sm:text-base">{item}</span></li>
                            ))}
                        </ul>
                    </div>
                    <p className="text-xl max-w-3xl">En Chile se firman a diario compraventas de autos, casas, máquinas y productos sin un contrato decente. Luego llegan los problemas: precio impago, cosa distinta a la prometida, multas sin pacto y juicios que se pudieron evitar con dos páginas bien redactadas. Esta guía te da el checklist que usan los abogados.</p>
                    <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>14 de Agosto, 2026</span></div>
                        <div className="flex items-center gap-2"><User className="h-4 w-4" /><span>Equipo LegalUp</span></div>
                        <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><ReadTime slug="contrato-compraventa-chile-2026" /></div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare title="Contrato de compraventa en Chile 2026" url="https://legalup.cl/blog/contrato-compraventa-chile-2026" showBorder={false} />

                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">El Código Civil define la compraventa como el contrato donde una parte se obliga a dar una cosa y la otra a pagar un precio en dinero. Parece simple, pero la práctica exige precisar cada detalle: qué se vende exactamente, cuánto vale, cómo y cuándo se paga, cuándo se entrega y qué pasa si alguien incumple.</p>
                        <p className="text-gray-600 mt-4">En esta guía 2026 revisamos qué debe incluir un contrato de compraventa entre privados, cuándo usar promesa, qué formalidades exige cada bien y qué cláusulas te blindan frente a impagos y vicios ocultos. Si tu tema es cobrar, revisa <Link to="/blog/como-cobrar-deuda-legalmente-chile-2026" className="text-green-700 underline">cómo cobrar una deuda</Link>, <Link to="/blog/reconocimiento-de-deuda-chile-2026" className="text-green-700 underline">reconocimiento de deuda</Link> y <Link to="/blog/pagare-chile-2026" className="text-green-700 underline">pagaré</Link>; si arriendas, revisa <Link to="/blog/contrato-de-arriendo-chile-2026" className="text-green-700 underline">contrato de arriendo</Link>.</p>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo necesitas contrato de compraventa?</h2>
                        <p className="text-gray-600 mb-4">Siempre que haya precio en dinero, aunque sea entre familiares o por Marketplace. Los casos más frecuentes:</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Bien</th><th className="border border-gray-300 p-3">Formalidad mínima</th><th className="border border-gray-300 p-3">Riesgo si no hay contrato</th></tr></thead>
                                <tbody>
                                    <tr><td className="border border-gray-300 p-3">Auto / moto usado</td><td className="border border-gray-300 p-3">Contrato privado + formulario transferencia + inscripción Registro Civil.</td><td className="border border-gray-300 p-3">Multas, deudas y accidentes quedan a tu nombre si no transfieres.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Casa / departamento</td><td className="border border-gray-300 p-3">Escritura pública + inscripción Conservador de Bienes Raíces.</td><td className="border border-gray-300 p-3">Sin inscripción no eres dueño, aunque hayas pagado.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Máquina, inventario, negocio</td><td className="border border-gray-300 p-3">Contrato privado con inventario y estado.</td><td className="border border-gray-300 p-3">Fallas ocultas y deudas sin responsable claro.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Producto online entre privados</td><td className="border border-gray-300 p-3">Contrato simple con precio, entrega y garantía.</td><td className="border border-gray-300 p-3">No podrás exigir devolución o indemnización.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">El checklist de 12 cláusulas que no pueden faltar</h2>
                        <p className="text-gray-600 mb-4">Un contrato de compraventa sólido responde a todas estas preguntas. Úsalo como lista de verificación antes de firmar.</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "1. Partes: nombres, RUT, domicilio, correo y representación si es empresa.",
                                "2. Cosa vendida: descripción precisa (marca, modelo, año, patente, metros, deslindes, N° de serie).",
                                "3. Precio: monto total en CLP, impuestos incluidos o no, y si es fijo o reajustable por IPC/UF.",
                                "4. Forma de pago: contado, transferencia, cuotas (n°, fechas, cuenta), vale vista o crédito hipotecario.",
                                "5. Entrega: lugar, fecha, estado de la cosa y acta de entrega con fotos.",
                                "6. Saneamiento: vendedor declara dominio, que la cosa está libre de gravámenes y responde por evicción y vicios ocultos.",
                                "7. Gastos: quién paga notaría, inscripción, impuestos y comisiones.",
                                "8. Cláusula penal / multa por retracto o mora: monto fijo que agiliza el cobro sin ir a juicio largo.",
                                "9. Resolución por incumplimiento: permite dejar sin efecto el contrato si no te pagan o no te entregan.",
                                "10. Reserva de dominio o prenda: el vendedor sigue siendo dueño hasta el pago total (clave en cuotas).",
                                "11. Jurisdicción y notificaciones: tribunal competente y correos válidos para notificar.",
                                "12. Firma y fecha cierta: ante notario o con dos testigos; anexa Cédulas y poder si firmas por empresa.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-2"><span className="text-green-600 flex-shrink-0">✓</span><span className="text-gray-700 font-bold">{item}</span></li>
                            ))}
                        </ul>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl mt-4">
                            <p className="font-bold text-blue-900">Tip de abogado</p>
                            <p className="text-blue-800">Describe la cosa como si tuvieras que identificarla sin estar presente. "Auto blanco" no sirve; "Hyundai Accent 2019, patente AB1234, VIN 9ABC..." sí. Mientras más precisa la descripción, menos espacio para discutir qué se vendió.</p>
                        </div>
                    </div>

                    <RelatedLawyers category="Derecho Civil" />

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Promesa de compraventa: el contrato que amarra el negocio</h2>
                        <p className="text-gray-600 mb-4">La promesa no vende; obliga a vender en el futuro si se cumplen condiciones (crédito aprobado, alzamiento de hipoteca, entrega de subdivisión). Es esencial cuando hay banco o plazo.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Elemento de la promesa</th><th className="border border-gray-300 p-3">Qué fijar</th></tr></thead>
                                <tbody>
                                    <tr><td className="border border-gray-300 p-3">Precio y pie</td><td className="border border-gray-300 p-3">Monto, forma de reajuste y comprobante del pie.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Plazo para firmar la compraventa</td><td className="border border-gray-300 p-3">Fecha cierta y qué pasa si el banco se demora.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Condiciones suspensivas</td><td className="border border-gray-300 p-3">Aprobación de crédito, alzamiento, recepción municipal.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Multa por retracto</td><td className="border border-gray-300 p-3">Monto fijo (ej. 10% del precio) para quien se arrepienta sin causa.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Custodia del pie</td><td className="border border-gray-300 p-3">Vale vista en notaría o cuenta custodia, no en manos del vendedor.</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-gray-600 mt-4">Sin promesa escrita, el pie queda como simple entrega sin regla y el retracto es gratis. Con promesa, el negocio tiene costo de salida y disciplina a ambas partes.</p>
                    </div>

                    <InArticleCTA category="Derecho Civil" title="¿Vas a firmar una compraventa importante?" message="Un abogado civil revisa tu contrato, corrige cláusulas riesgosas y te deja la promesa lista para que no pierdas el pie ni el negocio." />

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Compraventa de auto y de casa: formalidades que no puedes saltarte</h2>
                        <div className="space-y-4">
                            <div className="bg-white border p-5 rounded-xl">
                                <h3 className="font-bold">Auto usado entre privados</h3>
                                <p className="text-gray-600 mt-2">Firma contrato con precio, forma de pago y declaración de que el auto se entrega libre de multas y prendas. Luego firmen el formulario de transferencia y haz la inscripción en el Registro Civil. Solo desde la inscripción el comprador es dueño frente a terceros. Pide certificado de anotaciones vigentes, multas impagas y prendas antes de pagar.</p>
                                <p className="text-gray-600 mt-2">Si el vendedor se niega a transferir después de recibir el precio, puedes demandar cumplimiento forzado con el contrato como prueba.</p>
                            </div>
                            <div className="bg-white border p-5 rounded-xl">
                                <h3 className="font-bold">Casa, departamento o terreno</h3>
                                <p className="text-gray-600 mt-2">Exige escritura pública ante notario e inscripción en el Conservador de Bienes Raíces. Verifica dominio vigente, hipotecas, prohibiciones y si hay copropiedad. Si compras con crédito, el banco pedirá título de 10 años o más y tasación. No entregues el precio total sin inscripción: usa vale vista en custodia notarial con instrucciones.</p>
                            </div>
                        </div>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Cómo protegerte si pagas en cuotas</h2>
                        <p className="text-gray-600 mb-4">La compraventa en cuotas es donde más impagos ocurren. Blíndate con estas tres herramientas combinadas:</p>
                        <ul className="space-y-2 bg-gray-50 p-5 rounded-xl">
                            {[
                                "Reserva de dominio: la propiedad no se transfiere hasta el pago total. Si no pagan, recuperas la cosa sin discutir dominio.",
                                "Cláusula de aceleración: si falla una cuota, haces exigible todo el saldo.",
                                "Cláusula penal y resolución: multa fija por mora y derecho a resolver el contrato y retener lo pagado a título de indemnización, según lo pactado.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-2"><span className="text-green-600 flex-shrink-0">✓</span><span className="text-gray-700 font-bold">{item}</span></li>
                            ))}
                        </ul>
                        <p className="text-gray-600 mt-4">Deja cada pago trazable: transferencia con glosa "cuota N° X contrato fecha Y". Un pagaré por el saldo como garantía adicional permite ir directo a juicio ejecutivo si incumplen, pero no reemplaza la reserva de dominio.</p>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Vicios ocultos, entrega distinta y saneamiento</h2>
                        <p className="text-gray-600 mb-4">Si la cosa tiene un defecto grave que no podías ver al comprar —motor fundido, humedad estructural, deuda de contribuciones oculta—, la ley te protege con las acciones por vicios redhibitorios.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Remedio</th><th className="border border-gray-300 p-3">Cuándo procede</th></tr></thead>
                                <tbody>
                                    <tr><td className="border border-gray-300 p-3">Resolución + devolución del precio</td><td className="border border-gray-300 p-3">Defecto hace la cosa inútil o muy distinta a lo pactado.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Rebaja del precio</td><td className="border border-gray-300 p-3">Defecto disminuye valor pero la cosa aún sirve.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Indemnización adicional</td><td className="border border-gray-300 p-3">Si el vendedor conocía el vicio y no lo advirtió (dolo).</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-gray-600 mt-4">El plazo para demandar es breve (meses, según el bien), así que reclama por escrito en cuanto detectes el vicio y pide peritaje. Guarda la publicación original, fotos de la entrega y el contrato: son tu prueba.</p>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores que te dejan sin cobro</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Precio sin forma de pago", desc: "Poner solo el monto sin decir cómo, cuándo y dónde se paga invita al incumplimiento." },
                                    { title: "Entrega sin acta", desc: "Sin acta firmada, no puedes probar en qué estado se entregó la cosa ni cuándo." },
                                    { title: "Sin multa por incumplimiento", desc: "Sin cláusula penal, cobrar el daño exige probar monto en juicio. Con multa fija, ejecutas rápido." },
                                    { title: "Pagar el total antes de la inscripción", desc: "En inmuebles, pagar todo sin custodia te deja sin palanca si el vendedor no firma la escritura." },
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
                        <p className="text-amber-800">Si ya firmaste o estás por firmar una compraventa, cada día sin revisar puede significar dejar sin efecto defensas como la nulidad por vicios ocultos o la resolución por incumplimiento. No esperes a que el pago se pierda para buscar ayuda.</p>
                    </div>

                    <InArticleCTA
                        title="¿Vas a firmar una compraventa importante?"
                        message="Un abogado civil revisa tu contrato, corrige cláusulas de pago, entrega y multas, y deja tu compra a prueba de incumplimientos."
                        buttonText="Hablar con un abogado civil"
                        category="Derecho Civil"
                    />

                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 mb-4">Un contrato de compraventa no es burocracia: es la prueba que te permite cobrar, exigir entrega, reclamar vicios y ejecutar multas sin depender de la buena voluntad del otro. Dos páginas bien hechas valen más que un juicio de meses.</p>
                        <p className="text-gray-600">Antes de firmar, verifica dominio y deudas, fija precio, pago, entrega y sanciones por escrito y deja constancia de cada abono. Si el monto es relevante, haz revisar el contrato por un <Link to="/search?specialty=Derecho Civil" className="text-green-700 underline">abogado civil</Link> en LegalUp. Revisa también <Link to="/blog/pagare-chile-2026" className="text-green-700 underline">pagaré</Link> y <Link to="/blog/reconocimiento-de-deuda-chile-2026" className="text-green-700 underline">reconocimiento de deuda</Link> para reforzar tu cobro.</p>
                    </div>

                    <CategoryCTA category="civil" />

                    <div className="mt-12 mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre contrato de compraventa</h2>
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
                <div className="mt-8"><BlogShare title="Contrato de compraventa en Chile 2026" url="https://legalup.cl/blog/contrato-compraventa-chile-2026" /></div>
                <BlogNavigation currentArticleId="contrato-compraventa-chile-2026" />
                <div className="mt-4 text-center"><Link to="/blog" className="inline-flex items-center gap-2 text-green-900 hover:text-green-600 font-medium"><ArrowLeft className="h-4 w-4" />Volver al Blog</Link></div>
            </div>
            <BlogConversionPopup category="Derecho Civil" topic="contrato-compraventa" />
        </div>
    );
};
export default BlogArticle;
