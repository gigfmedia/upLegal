import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Helmet } from 'react-helmet-async';
import { ChevronRight, ArrowRight, Star, Shield, Clock, ChevronDown, CheckCircle2 } from "lucide-react";

import Header from "@/components/Header";
import { LawyerCard } from "@/components/LawyerCard";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent as UICardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";

const PensionAlimentosLanding = () => {
    const [lawyers, setLawyers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
    const { user } = useAuth();

    const cardsRef = useRef<HTMLDivElement>(null);

    const scrollToCards = () => {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'click_cta_hero_pension_alimentos');
        }
        cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    useEffect(() => {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'view_pension_alimentos_landing');
        }
    }, []);

    useEffect(() => {
        const fetchLawyers = async () => {
            setIsLoading(true);
            try {
                const { searchLawyers } = await import('@/pages/api/search-lawyers');

                const { lawyers: results } = await searchLawyers({
                    query: "pension alimentos",
                    specialty: "Derecho de Familia",
                    page: 1,
                    pageSize: 15,
                    orderBy: 'review_count',
                    orderDirection: 'desc'
                });

                let completeResults = (results || []).filter((lawyer) => {
                    return Boolean(
                        (lawyer.verified || lawyer.pjud_verified) &&
                        lawyer.hourly_rate_clp > 0 &&
                        lawyer.bio && lawyer.bio.trim() !== '' &&
                        lawyer.specialties && lawyer.specialties.length > 0 &&
                        lawyer.location && lawyer.location.trim() !== ''
                    );
                });

                completeResults.sort((a, b) => {
                    const aLength = a.specialties?.length || 0;
                    const bLength = b.specialties?.length || 0;
                    if (aLength !== bLength) return aLength - bLength;
                    return (b.review_count || 0) - (a.review_count || 0);
                });

                setLawyers(completeResults.slice(0, 9));
            } catch (error) {
                console.error("Error fetching category lawyers:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLawyers();
    }, []);

    const faqs = [
        {
            question: "¿Cómo se calcula la pensión de alimentos en Chile?",
            answer: "Se calcula como un porcentaje de los ingresos del alimentante, generalmente entre un 20% y 40% dependiendo del número de hijos. El tribunal considera ingresos líquidos, número de cargas, necesidades del alimentado y posibilidades económicas del obligado."
        },
        {
            question: "¿Hasta qué edad se paga pensión de alimentos?",
            answer: "Generalmente hasta los 21 años, pero se extiende hasta los 28 si el hijo está estudiando educación superior. No hay límite de edad si el hijo tiene alguna discapacidad que le impide valerse por sí mismo."
        },
        {
            question: "¿Qué pasa si el padre/madre no paga la pensión?",
            answer: "Se puede solicitar el cumplimiento forzoso por medio de un abogado. Las sanciones incluyen: retención de sueldo, arraigo nacional, retención de devolución de impuestos, e incluso penas de cárcel en casos graves."
        },
        {
            question: "¿Puedo pedir aumento o reducción de la pensión?",
            answer: "Sí, si cambian las circunstancias económicas de cualquiera de las partes. Debes presentar una demanda de alteración de alimentos con la asesoría de un abogado especialista en derecho de familia."
        }
    ];

    return (
        <div className="min-h-screen bg-white pt-16">
            <Helmet>
                <title>Abogado para Pensión de Alimentos en Chile | LegalUp</title>
                <meta name="description" content="Encuentra abogados especializados en pensión de alimentos en Chile. Asesoría para fijar, aumentar o cobrar pensiones de alimentos." />
            </Helmet>

            <Header onAuthClick={() => setShowAuthModal(true)} />

            {/* Hero Section */}
            <div className="bg-gray-100 pt-20 pb-16 lg:pt-32 lg:pb-24 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center text-center mx-auto">
                        <span className="border border-gray-900 bg-gray-900 rounded-full p-1 text-sm text-white mb-8 max-w-3xl mx-auto w-fit px-2 mt-4 flex items-center gap-2">
                            Derecho de Familia
                        </span>
                        <h1 className="text-4xl md:text-5xl font-bold font-serif text-gray-900 mb-6 leading-tight">
                            ¿Necesitas fijar o cobrar pensión de alimentos?
                        </h1>
                        <p className="text-m sm:text-xl text-gray-900 mb-12 max-w-3xl mx-auto">
                            Encuentra abogados especializados en alimentos, compara precios y resuelve tu situación familiar.
                        </p>

                        <div className="flex flex-col items-center gap-3 mb-12">
                            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                                <Button
                                    size="lg"
                                    className="bg-gray-900 hover:bg-green-900 text-white h-14 px-8 mb-4 text-lg font-semibold w-full sm:w-auto shadow-lg hover:shadow-xl transition-all"
                                    onClick={scrollToCards}
                                >
                                    Comparar abogados especializados
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </div>
                            <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                Abogados verificados por el PJUD
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lawyers List */}
            <section ref={cardsRef} className="py-20 bg-muted">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Abogados especializados en Pensión de Alimentos
                        </h2>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="bg-gray-50 rounded-2xl h-96 animate-pulse border border-gray-100" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {lawyers.map((lawyer) => (
                                <LawyerCard
                                    key={lawyer.id}
                                    lawyer={{
                                        ...lawyer,
                                        name: `${lawyer.first_name} ${lawyer.last_name}`,
                                        image: lawyer.avatar_url,
                                        reviews: lawyer.review_count,
                                        hourlyRate: lawyer.hourly_rate_clp,
                                        consultationPrice: Math.round(lawyer.hourly_rate_clp * 0.5)
                                    }}
                                    user={user}
                                />
                            ))}
                        </div>
                    )}

                    <div className="mt-16 flex justify-center">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-left w-full max-w-2xl bg-white p-8 rounded-2xl border border-gray-100">
                            {[
                                "Abogados verificados por el PJUD",
                                "Especialistas en derecho de familia",
                                "Cobranza judicial de pensiones",
                                "Modificación de montos"
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                                    <span className="text-gray-700 font-medium">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* SEO Content Section */}
            <section className="py-20 bg-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-lg text-gray-600">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Abogado para pensión de alimentos en Chile</h2>
                    <p>
                        La pensión de alimentos es un derecho fundamental de los niños, niñas y adolescentes consagrado en la Constitución y en la Ley de Menores. También aplica para el cónyuge que no puede trabajar o necesita apoyo económico. Un abogado especializado en derecho de familia te ayudará a determinar el monto justo según la ley chilena.
                    </p>
                    <p>
                        El proceso puede ser complejo si la otra parte no quiere pagar o si hay disputas sobre los ingresos reales del alimentante. Un buen abogado sabe cómo solicitar medios preparatorios para investigar ingresos, bancos y propiedades del deudor, garantizando que pague lo que corresponde.
                    </p>
                    <p>
                        Además, si necesitas aumentar la pensión porque los gastos de tus hijos han crecido (colegio, salud, actividades extraprogramáticas), o reducirla porque tus ingresos han bajado, un abogado te guiará en la demanda de alteración de alimentos.
                    </p>

                    <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">Tipos de pensiones de alimentos en Chile</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Pensión para hijos:</strong> Obligación de ambos padres de contribuir a la mantención de sus hijos hasta los 21 años (28 si estudian). Incluye vivienda, alimentación, salud, educación y vestuario.</li>
                        <li><strong>Pensión para cónyuge:</strong> Si un cónyuge no puede trabajar por cuidado de hijos, discapacidad o edad, puede pedir alimentos al otro cónyuge durante el matrimonio o después del divorcio.</li>
                        <li><strong>Pensión provisoria:</strong> Monto temporal que fija el tribunal mientras se tramita la demanda definitiva, especialmente útil en emergencias.</li>
                    </ul>

                    <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">¿Cuánto cuesta un abogado para pensión de alimentos?</h2>
                    <p>
                        Los honorarios de un abogado para pensiones de alimentos en Chile varían según la complejidad. Un juicio ordinario puede costar entre $400.000 y $900.000 CLP, mientras que un simple acuerdo ante el Juzgado de Familia puede ser más económico.
                    </p>
                    <p>
                        En LegalUp puedes comparar tarifas de múltiples abogados especialistas. Algunos ofrecen consultas por un valor reducido (generalmente la mitad de su hora) para revisar tu caso antes de iniciar la demanda.
                    </p>
                </div>
            </section>

            {/* FAQs */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <span className="bg-gray-900 text-white text-xs border border-gray-900 font-semibold px-3 py-1 rounded-full uppercase tracking-wide inline-flex mb-6">
                            FAQ
                        </span>
                        <h2 className="text-3xl font-bold font-serif text-gray-900 mb-4">
                            Preguntas Frecuentes
                        </h2>
                        <p className="text-gray-600">
                            Todo lo que necesitas saber sobre pensión de alimentos
                        </p>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <Card
                                key={index}
                                className="border border-gray-200 hover:border-black transition-colors cursor-pointer bg-white"
                                onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                            >
                                <CardHeader className="p-6">
                                    <div className="flex justify-between items-center gap-3">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="bg-gray-900 p-2 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0">{index + 1}</div>
                                            <CardTitle className="text-lg font-semibold text-gray-900">
                                                {faq.question}
                                            </CardTitle>
                                        </div>
                                        <ChevronDown className={`h-5 w-5 text-gray-600 transition-transform duration-200 ${openFaqIndex === index ? 'transform rotate-180' : ''}`} />
                                    </div>
                                </CardHeader>
                                {openFaqIndex === index && (
                                    <UICardContent className="p-6 pt-0">
                                        <p className="text-gray-600 leading-relaxed pl-10">{faq.answer}</p>
                                    </UICardContent>
                                )}
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-20 bg-green-900 text-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold font-serif text-green-600 mb-6">
                        ¿Necesitas asesoría para tu pensión de alimentos?
                    </h2>
                    <p className="text-xl text-white mb-10">
                        Compara abogados especialistas y agenda tu consulta online.
                    </p>
                    <Button
                        size="lg"
                        className="bg-white text-green-900 hover:bg-gray-100 h-14 px-10 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                        onClick={scrollToCards}
                    >
                        Comparar abogados especializados
                    </Button>
                </div>
            </section>

            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode="login" />
        </div>
    );
};

export default PensionAlimentosLanding;