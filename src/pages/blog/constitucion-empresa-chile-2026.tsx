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
        { question: "¿Qué es mejor para emprender en Chile: SpA o EIRL?", answer: "Depende de tu plan. La EIRL es para una sola persona que quiere separar su patrimonio sin socios. La SpA es más flexible: admite uno o más accionistas, entrada de inversionistas y emisión de acciones, ideal si proyectas crecer o levantar capital." },
        { question: "¿Cuánto cuesta constituir una empresa en Chile en 2026?", answer: "Por Empresa en un Día (Registro de Empresas) el trámite es gratuito; si lo haces por escritura pública ante notario y Diario Oficial pagas notaría y publicación. Luego debes considerar inicio de actividades ante el SII, patente municipal y, si corresponde, permisos." },
        { question: "¿Puedo constituir una SpA solo?", answer: "Sí. La SpA puede tener un solo accionista. Si después entra otro socio, basta con una cesión de acciones. La EIRL, en cambio, no puede tener socios: si quieres un socio debes transformarla o crear otra sociedad." },
        { question: "¿Qué responsabilidad tengo en una SpA y en una EIRL?", answer: "En ambas tu responsabilidad se limita al monto aportado, salvo que des garantías personales o cometas actos que levanten el velo. En la EIRL solo puedes tener una, y tu giro está restringido a un objeto específico." },
        { question: "¿Qué es Empresa en un Día y es seguro?", answer: "Es el Registro de Empresas y Sociedades del Ministerio de Economía (Ley 20.659) que permite constituir, modificar y disolver sociedades en línea con firma electrónica. Es seguro y plenamente válido; la alternativa es la vía tradicional notarial." },
        { question: "¿Necesito abogado para constituir mi empresa?", answer: "No es obligatorio, pero un abogado evita errores en objeto social, capital, administración y pactos entre socios que luego generan conflictos. Es especialmente útil si habrá varios socios o inversionistas." },
        { question: "¿Puedo cambiar de EIRL a SpA después?", answer: "No es transformación directa automática: debes extinguir la EIRL y constituir la SpA, o aportar el patrimonio a la nueva sociedad. Por eso conviene elegir bien desde el inicio si proyectas crecer." },
        { question: "¿Qué elijo si quiero postular a fondos o traer inversionistas?", answer: "La SpA. Los fondos CORFO, capital semilla y los inversionistas prefieren SpA por su flexibilidad accionaria, pactos de accionistas y facilidad para ceder acciones." },
    ];
    return (
        <div className="min-h-screen bg-white">
            <BlogGrowthHacks
                title="Constitución de empresa en Chile 2026: SpA vs EIRL, cuál conviene según tu negocio"
                description="¿SpA o EIRL en Chile 2026? Diferencias, costos, responsabilidad y pasos para constituir tu empresa. Guía para emprendedores que quieren elegir bien desde el inicio."
                image="/assets/constitucion-empresa-chile-2026.png"
                url="https://legalup.cl/blog/constitucion-empresa-chile-2026"
                datePublished="2026-08-13"
                dateModified="2026-08-13"
                faqs={faqs}
            />
            <Header onAuthClick={() => {}} />
            <ReadingProgressBar />
            <div className="bg-[#f4efdf] text-white py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
                    <div className="flex items-center gap-2 mb-4 text-green-500"><Link to="/blog" className="hover:text-green-900 transition-colors">Blog</Link><ChevronRight className="h-4 w-4" /><span>Artículo</span></div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-green-900 font-serif mb-6">Constitución de empresa en Chile 2026: SpA vs EIRL, cuál conviene según tu negocio</h1>
                    <div className="bg-white backdrop-blur-sm border rounded-2xl p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-green-500 mb-4">Resumen rápido</p>
                        <ul className="space-y-2 text-green-900">
                            {[
                                "EIRL: solo una persona, un giro específico, no admite socios ni inversionistas.",
                                "SpA: uno o más accionistas, objeto amplio, fácil entrada y salida de socios.",
                                "Ambas limitan tu responsabilidad al aporte, si no das avales personales.",
                                "Empresa en un Día es gratis y válido; la vía notarial es la alternativa tradicional.",
                                "Si proyectas crecer, traer socios o postular a fondos, la SpA es la opción.",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3"><span className="text-green-500 font-bold">✓</span><span className="text-sm sm:text-base">{item}</span></li>
                            ))}
                        </ul>
                    </div>
                    <p className="text-xl max-w-3xl text-green-900">Elegir entre SpA y EIRL no es solo un trámite: define si podrás sumar socios, levantar capital o vender tu empresa sin rehacerla. Muchos emprendedores eligen la figura más simple y luego deben liquidarla para crear otra. Esta guía te ayuda a decidir bien desde el día uno.</p>
                    <div className="flex flex-wrap items-center gap-4 mt-6 text-green-900">
                        <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>13 de Agosto, 2026</span></div>
                        <div className="flex items-center gap-2"><User className="h-4 w-4" /><span>Equipo LegalUp</span></div>
                        <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><ReadTime slug="constitucion-empresa-chile-2026" /></div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pt-12">
                <div className="bg-white border sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
                    <BlogShare title="Constitución de empresa en Chile 2026: SpA vs EIRL" url="https://legalup.cl/blog/constitucion-empresa-chile-2026" showBorder={false} />

                    <div className="prose prose-lg max-w-none mb-8">
                        <p className="text-lg text-gray-600 leading-relaxed">En Chile, las dos figuras más usadas por emprendedores que parten solos son la Empresa Individual de Responsabilidad Limitada (EIRL) y la Sociedad por Acciones (SpA). Ambas separan tu patrimonio personal del negocio, pero su flexibilidad es opuesta.</p>
                        <p className="text-gray-600 mt-4">En esta guía 2026 comparamos SpA y EIRL en simple, revisamos costos y pasos de constitución, y te damos una regla de decisión según tu plan de negocio. Si buscas formalizar tu emprendimiento y operar tranquilo con el SII, bancos y proveedores, esta es tu hoja de ruta. Si tu tema es cobrar o firmar contratos, revisa también <Link to="/blog/como-cobrar-deuda-legalmente-chile-2026" className="text-green-700 underline">cómo cobrar una deuda</Link> y <Link to="/blog/reconocimiento-de-deuda-chile-2026" className="text-green-700 underline">reconocimiento de deuda</Link>.</p>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">SpA y EIRL en simple: qué son</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Figura</th><th className="border border-gray-300 p-3">Qué es</th><th className="border border-gray-300 p-3">Para quién es</th></tr></thead>
                                <tbody>
                                    <tr><td className="border border-gray-300 p-3 font-bold">EIRL</td><td className="border border-gray-300 p-3">Una persona que constituye una empresa con patrimonio separado. No es sociedad: eres tú, con RUT de empresa.</td><td className="border border-gray-300 p-3">Profesional independiente, oficio con giro acotado, sin planes de socios.</td></tr>
                                    <tr><td className="border border-gray-300 p-3 font-bold">SpA</td><td className="border border-gray-300 p-3">Sociedad por acciones: uno o más accionistas, capital en acciones, administración flexible.</td><td className="border border-gray-300 p-3">Emprendedor que proyecta crecer, sumar socios, capital o vender participación.</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-gray-600 mt-4">La diferencia cultural es clave: la EIRL es "yo, empresa", la SpA es "nosotros, empresa" aunque partas solo. Esa mentalidad define si tu negocio puede escalar sin rehacer la estructura legal.</p>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Comparativa SpA vs EIRL: todo lo que importa</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Criterio</th><th className="border border-gray-300 p-3">EIRL</th><th className="border border-gray-300 p-3">SpA</th></tr></thead>
                                <tbody>
                                    <tr><td className="border border-gray-300 p-3">N° de titulares</td><td className="border border-gray-300 p-3">1 persona natural, solo una EIRL por persona.</td><td className="border border-gray-300 p-3">1 o más accionistas, sin límite. Fácil sumar o salir.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Objeto / giro</td><td className="border border-gray-300 p-3">Uno específico (ej. "servicios informáticos"). Cambiarlo requiere modificación.</td><td className="border border-gray-300 p-3">Amplio o múltiple (puedes poner varios giros).</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Responsabilidad</td><td className="border border-gray-300 p-3">Limitada al aporte, salvo aval o fraude.</td><td className="border border-gray-300 p-3">Limitada al aporte, salvo aval o fraude.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Capital</td><td className="border border-gray-300 p-3">Aporte declarado, sin acciones.</td><td className="border border-gray-300 p-3">Capital en acciones, fácil ajustar y transferir.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Inversionistas / fondos</td><td className="border border-gray-300 p-3">No atractiva para fondos, no emite acciones.</td><td className="border border-gray-300 p-3">Preferida por CORFO, bancos e inversionistas.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Administración</td><td className="border border-gray-300 p-3">Titular.</td><td className="border border-gray-300 p-3">Administrador o directorio, flexible.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Cambio a otra figura</td><td className="border border-gray-300 p-3">No se transforma en SpA: hay que crear otra.</td><td className="border border-gray-300 p-3">Admite transformaciones, fusiones y divisiones.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Costo de mantención</td><td className="border border-gray-300 p-3">Bajo.</td><td className="border border-gray-300 p-3">Bajo-medio (libro de accionistas, juntas).</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <RelatedLawyers category="Derecho Civil" />

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Regla de decisión en 2 minutos</h2>
                        <p className="text-gray-600 mb-4">Hazte estas tres preguntas:</p>
                        <div className="space-y-3">
                            <div className="bg-green-50 p-4 rounded-xl border border-green-200"><h3 className="font-bold text-green-900">¿Tendrás socios o inversionistas en los próximos 2 años?</h3><p className="text-green-800">Si la respuesta es sí o "quizás", elige SpA. Entrar y salir de una EIRL es un dolor de cabeza.</p></div>
                            <div className="bg-green-50 p-4 rounded-xl border border-green-200"><h3 className="font-bold text-green-900">¿Tu giro cambiará o harás varias cosas?</h3><p className="text-green-800">Si venderás productos, servicios y asesorías, la SpA con objeto amplio te evita modificar la empresa cada vez.</p></div>
                            <div className="bg-green-50 p-4 rounded-xl border border-green-200"><h3 className="font-bold text-green-900">¿Postularás a fondos, licitaciones o créditos?</h3><p className="text-green-800">La SpA transmite más seriedad y permite pactos de accionistas, vesting y rondas de capital.</p></div>
                        </div>
                        <p className="text-gray-600 mt-4">Si respondiste no a todo y solo quieres facturar como independiente con un giro fijo, la EIRL basta y es más simple de llevar.</p>
                    </div>

                    <InArticleCTA category="Derecho Civil" title="¿Vas a formalizar tu emprendimiento?" message="Un abogado te ayuda a elegir SpA o EIRL, redactar objeto y pactos y dejar tu empresa lista para operar con el SII." />

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Paso a paso: cómo constituir tu empresa en Chile</h2>
                        <p className="text-gray-600 mb-4">Tienes dos vías válidas. La más usada hoy es Empresa en un Día.</p>
                        <div className="space-y-4">
                            <div className="bg-white border p-5 rounded-xl">
                                <h3 className="font-bold">Vía 1: Registro de Empresas (Empresa en un Día) — Ley 20.659</h3>
                                <p className="text-gray-600 mt-2">1) Entra a tuempresaenundia.cl con Clave Única. 2) Elige SpA o EIRL y completa datos: nombre, domicilio, objeto, capital, administración. 3) Firma con firma electrónica avanzada. 4) Obtienes RUT y certificado. 5) Haz inicio de actividades en el SII y solicita facturación electrónica. 6) Pide patente municipal y permisos según tu comuna.</p>
                                <p className="text-gray-600 mt-2">Costo: gratuito en el Registro; pagas solo firma electrónica si no tienes, patente y permisos.</p>
                            </div>
                            <div className="bg-white border p-5 rounded-xl">
                                <h3 className="font-bold">Vía 2: Escritura pública (vía tradicional)</h3>
                                <p className="text-gray-600 mt-2">1) Redacción de estatutos ante abogado. 2) Escritura en notaría. 3) Inscripción en el Conservador y publicación en el Diario Oficial. 4) Inicio de actividades en el SII y patente. Es más cara y lenta, pero algunos bancos aún la prefieren para ciertos trámites.</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mt-4">Después de constituir, no olvides: timbraje electrónico en el SII, contrato de cuenta corriente empresa, inscripción en Mercado Público si licitarás y registro de marca en INAPI si tu nombre es valioso.</p>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Errores frecuentes al constituir tu empresa</h2>
                        <div className="bg-red-50 rounded-2xl p-6 sm:p-8">
                            <div className="space-y-6">
                                {[
                                    { title: "Capital simbólico de $10.000", desc: "Poner un capital irrisorio transmite desconfianza a bancos y proveedores. Declara un capital creíble según tu operación inicial (ej. $1.000.000) y entéralo según tus posibilidades." },
                                    { title: "Objeto demasiado estrecho", desc: "Si pones \"venta de ropa online\" y luego quieres dar asesorías, tendrás que modificar la empresa. Prefiere un objeto amplio que cubra tu plan a 2 años." },
                                    { title: "Sin pacto de accionistas", desc: "En SpA con más de un socio, el pacto regula vesting, salida, no competencia y toma de decisiones. Sin pacto, cualquier desacuerdo bloquea la empresa." },
                                    { title: "No prever el crecimiento", desc: "Constituir una EIRL cuando proyectas sumar socios te obligará a liquidarla y crear una SpA. Elige la figura pensando a dos años." },
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

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Costos y mantención anual</h2>
                        <p className="text-gray-600 mb-4">Constituir por Empresa en un Día es gratis, pero operar tiene costos fijos:</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead><tr className="bg-gray-100"><th className="border border-gray-300 p-3">Concepto</th><th className="border border-gray-300 p-3">EIRL</th><th className="border border-gray-300 p-3">SpA</th></tr></thead>
                                <tbody>
                                    <tr><td className="border border-gray-300 p-3">Contabilidad mensual</td><td className="border border-gray-300 p-3">Sí, según régimen tributario.</td><td className="border border-gray-300 p-3">Sí.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Patente municipal (anual)</td><td className="border border-gray-300 p-3">Sí.</td><td className="border border-gray-300 p-3">Sí.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Libro de accionistas / juntas</td><td className="border border-gray-300 p-3">No.</td><td className="border border-gray-300 p-3">Sí, aunque sea simple.</td></tr>
                                    <tr><td className="border border-gray-300 p-3">Modificaciones</td><td className="border border-gray-300 p-3">En línea, bajo costo.</td><td className="border border-gray-300 p-3">En línea, bajo costo.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">¿Cuándo elegir EIRL sin dudar?</h2>
                        <p className="text-gray-600 mb-4">Elige EIRL si cumples todo esto: trabajas solo y seguirás solo, tienes un giro claro que no cambiará, no buscarás inversionistas ni postularás a fondos, y quieres lo más simple para facturar y separar patrimonio. Para todo lo demás, SpA.</p>
                        <p className="text-gray-600">Un ejemplo típico de EIRL: diseñadora freelance que presta servicios de branding a clientes y factura mensual sin socios. Un ejemplo de SpA: dos socios que crean una marca de alimentos saludables y en 12 meses quieren entrar a supermercados y levantar capital.</p>
                    </div>

                    <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl mb-6">
                        <p className="font-bold text-amber-900">El tiempo juega en tu contra</p>
                        <p className="text-amber-800">Si ya estás operando sin empresa o con la figura equivocada, cada día puede significar perder un contrato, un fondo o una inversión por no tener tu sociedad y tu pacto al día. No esperes a que llegue el inversionista para ordenar tu empresa.</p>
                    </div>

                    <InArticleCTA
                        title="¿Vas a constituir tu empresa y quieres hacerlo bien desde el inicio?"
                        message="Un abogado comercial revisa tu objeto, capital y pacto de accionistas para que no tengas que rehacer tu empresa en un año."
                        buttonText="Hablar con un abogado comercial"
                        category="Derecho Civil"
                    />

                    <div className="mb-12 border-t pt-8">
                        <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
                        <p className="text-gray-600 mb-4">Si tu horizonte es crecer, sumar socios o levantar inversión, la SpA es la figura que no te obliga a rehacer la empresa a mitad de camino. Si solo necesitas facturar como independiente con un giro acotado, la EIRL es suficiente y más liviana.</p>
                        <p className="text-gray-600">Antes de firmar, define tu objeto, capital y administración con mirada a dos años. Si dudas, consulta con un <Link to="/search?specialty=Derecho Civil" className="text-green-700 underline">abogado comercial</Link> en LegalUp y revisa también <Link to="/blog/contrato-de-arriendo-chile-2026" className="text-green-700 underline">contrato de arriendo</Link> y <Link to="/blog/pagare-chile-2026" className="text-green-700 underline">pagaré</Link> para operar con respaldo.</p>
                    </div>

                    <CategoryCTA category="civil" />

                    <div className="mt-12 mb-6" data-faq-section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre SpA y EIRL</h2>
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
                <div className="mt-8"><BlogShare title="Constitución de empresa en Chile 2026: SpA vs EIRL" url="https://legalup.cl/blog/constitucion-empresa-chile-2026" /></div>
                <BlogNavigation currentArticleId="constitucion-empresa-chile-2026" />
                <div className="mt-4 text-center"><Link to="/blog" className="inline-flex items-center gap-2 text-green-900 hover:text-green-600 font-medium"><ArrowLeft className="h-4 w-4" />Volver al Blog</Link></div>
            </div>
            <BlogConversionPopup category="Derecho Civil" topic="constitucion-empresa" />
        </div>
    );
};
export default BlogArticle;
