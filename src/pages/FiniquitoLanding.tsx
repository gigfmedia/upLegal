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

const FiniquitoLanding = () => {
    const [lawyers, setLawyers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
    const { user } = useAuth();

    const cardsRef = useRef<HTMLDivElement>(null);

    const scrollToCards = () => {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'click_cta_hero_finiquito');
        }
        cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    useEffect(() => {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'view_finiquito_landing');
        }
    }, []);

    useEffect(() => {
        const fetchLawyers = async () => {
            setIsLoading(true);
            try {
                const { searchLawyers } = await import('@/pages/api/search-lawyers');

                const { lawyers: results } = await searchLawyers({
                    query: "finiquito laboral",
                    specialty: "Derecho Laboral",
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
            question: "¿Qué debo revisar antes de firmar un finiquito?",
            answer: "Debes verificar que incluya todos los conceptos adeudados: feriado proporcional, indemnización por años de servicio (si aplica), aviso previo, mes de aviso, y cualquier beneficio pactado en tu contrato. Nunca firmes sin asesoría legal."
        },
        {
            question: "¿Puedo demandar después de firmar un finiquito?",
            answer: "Depende. Si renunciaste voluntariamente, generalmente no puedes demandar. Pero si fuiste despedido y el finiquito es injusto o te presionaron para firmar, puedes reclamar dentro de 60 días hábiles ante la Inspección del Trabajo o tribunales laborales."
        },
        {
            question: "¿Qué es el feriado proporcional?",
            answer: "Es la compensación por los días de vacaciones que ganaste pero no usaste hasta tu salida de la empresa. Se calcula como (días hábiles de feriado por año / 365) × los días trabajados en el año."
        },
        {
            question: "¿Cuánto tiempo tengo para cobrar el finiquito?",
            answer: "El empleador tiene 10 días hábiles desde el término del contrato para pagar el finiquito completo. Si no paga, puedes demandar por cobro de prestaciones laborales dentro de 2 años desde el despido."
        }
    ];

    return (
        <div className="min-h-screen bg-white pt-16">
            <Helmet>
                <title>Abogado para Finiquito Laboral en Chile | LegalUp</title>
                <meta name="description" content="Asesoría legal para revisión y firma de finiquitos laborales. Abogados especialistas en derecho laboral te ayudan a obtener lo que te corresponde." />
            </Helmet>

            <Header onAuthClick={() => setShowAuthModal(true)} />

            <div className="bg-gray-100 pt-20 pb-16 lg:pt-32 lg:pb-24 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center text-center mx-auto">
                        <span className="border border-gray-900 bg-gray-900 rounded-full p-1 text-sm text-white mb-8 max-w-3xl mx-auto w-fit px-2 mt-4 flex items-center gap-2">
                            Derecho Laboral
                        </span>
                        <h1 className="text-4xl md:text-5xl font-bold font-serif text-gray-900 mb-6 leading-tight">
                            ¿Necesitas revisar o impugnar tu finiquito?
                        </h1>
                        <p className="text-m sm:text-xl text-gray-900 mb-12 max-w-3xl mx-auto">
                            Abogados especialistas revisan tu finiquito para que no pierdas beneficios legales.
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

            <section ref={cardsRef} className="py-20 bg-muted">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Abogados especializados en Revisión de Finiquitos
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
                                "Revisión legal de finiquitos",
                                "Cálculo de indemnizaciones",
                                "Negociación con empleadores",
                                "Demandas laborales"
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

            <section className="py-20 bg-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-lg text-gray-600">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Abogado para finiquito laboral en Chile</h2>
                    <p>
                        El finiquito es uno de los documentos más importantes que firmarás en tu vida laboral. Sin embargo, muchas personas lo firman sin entender completamente su contenido, perdiendo beneficios legales que les corresponden por años de trabajo.
                    </p>
                    <p>
                        Un abogado especialista en derecho laboral puede revisar tu finiquito antes de firmarlo, detectar si el monto es correcto, si incluye todos los conceptos legales (feriado proporcional, indemnización por años de servicio, aviso previo, etc.), y asesorarte sobre si debes firmar o impugnar el despido.
                    </p>
                    <p>
                        Si ya firmaste un finiquito y crees que fue injusto o te presionaron, un abogado puede evaluar si es posible demandar por nulidad del finiquito dentro de los plazos legales.
                    </p>

                    <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">Conceptos que debe incluir tu finiquito</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Remuneración pendiente:</strong> Sueldos impagos hasta la fecha de salida, incluyendo comisiones y bonos.</li>
                        <li><strong>Feriado legal proporcional:</strong> Días de vacaciones ganados pero no disfrutados.</li>
                        <li><strong>Indemnización por años de servicio:</strong> 30 días por cada año trabajado (máximo 330 días) si fuiste despedido sin causa justa.</li>
                        <li><strong>Aviso previo o mes de aviso:</strong> 30 días de sueldo si no te avisaron con anticipación.</li>
                        <li><strong>Horas extras no pagadas:</strong> Si no te las pagaron durante la relación laboral.</li>
                    </ul>

                    <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">¿Cuánto cobra un abogado para revisar un finiquito?</h2>
                    <p>
                        Revisar un finiquito suele ser un servicio rápido y económico. Muchos abogados cobran entre $50.000 y $150.000 CLP por una revisión completa y asesoría inicial. Si hay que negociar con el empleador o demandar, los honorarios suben a un porcentaje del monto recuperado (generalmente 20-30%).
                    </p>
                    <p>
                        En LegalUp puedes comparar precios transparentes de múltiples abogados laboralistas y elegir el que mejor se ajuste a tu caso.
                    </p>
                </div>
            </section>

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
                            Información clave sobre finiquitos laborales
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

            <section className="py-20 bg-green-900 text-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold font-serif text-green-600 mb-6">
                        ¿Te ofrecieron un finiquito y tienes dudas?
                    </h2>
                    <p className="text-xl text-white mb-10">
                        Revisa tu finiquito con un abogado antes de firmar y asegura lo que te corresponde por ley.
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

export default FiniquitoLanding;