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

const DespidoInjustificadoLanding = () => {
    const [lawyers, setLawyers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
    const { user } = useAuth();

    const cardsRef = useRef<HTMLDivElement>(null);

    const scrollToCards = () => {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'click_cta_hero_despido_injustificado');
        }
        cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    useEffect(() => {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'view_despido_injustificado_landing');
        }
    }, []);

    useEffect(() => {
        const fetchLawyers = async () => {
            setIsLoading(true);
            try {
                const { searchLawyers } = await import('@/pages/api/search-lawyers');

                const { lawyers: results } = await searchLawyers({
                    query: "despido injustificado",
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
            question: "¿Cuándo se considera un despido injustificado?",
            answer: "Cuando el empleador no prueba las causales legales que invocó para despedirte. Ejemplos: despidos por necesidades de la empresa sin prueba real, bajo rendimiento sin evaluaciones objetivas, o simplemente porque 'ya no te necesitan' sin justificación."
        },
        {
            question: "¿Cuánto me corresponde por un despido injustificado?",
            answer: "Tienes derecho a: 1) Indemnización por años de servicio (30 días por cada año trabajado, máximo 330 días), 2) Aviso previo (30 días de sueldo), 3) Feriado proporcional, y 4) Recargos del 50% sobre prestaciones adeudadas si fue un despido discriminatorio."
        },
        {
            question: "¿Cuánto tiempo tengo para demandar por despido injustificado?",
            answer: "Tienes 60 días hábiles desde la fecha del despido para presentar la demanda. Pasado ese plazo, pierdes el derecho a reclamar. Por eso es crucial contactar a un abogado de inmediato."
        },
        {
            question: "¿Puedo ser despedido por necesidades de la empresa?",
            answer: "Sí, pero el empleador debe probar causas reales como pérdidas económicas graves, cierre de área, o externalización. No es válido si la empresa sigue contratando personal para el mismo cargo."
        }
    ];

    return (
        <div className="min-h-screen bg-white pt-16">
            <Helmet>
                <title>Abogado para Despido Injustificado en Chile | LegalUp</title>
                <meta name="description" content="Abogados laboralistas para demandar por despido injustificado. Reclama tu indemnización y protege tus derechos laborales." />
            </Helmet>

            <Header onAuthClick={() => setShowAuthModal(true)} />

            <div className="bg-gray-100 pt-20 pb-16 lg:pt-32 lg:pb-24 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center text-center mx-auto">
                        <span className="border border-gray-900 bg-gray-900 rounded-full p-1 text-sm text-white mb-8 max-w-3xl mx-auto w-fit px-2 mt-4 flex items-center gap-2">
                            Derecho Laboral
                        </span>
                        <h1 className="text-4xl md:text-5xl font-bold font-serif text-gray-900 mb-6 leading-tight">
                            ¿Fuiste despedido injustificadamente?
                        </h1>
                        <p className="text-m sm:text-xl text-gray-900 mb-12 max-w-3xl mx-auto">
                            Abogados laboralistas te ayudan a reclamar tu indemnización y lo que te corresponde por ley.
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
                            Abogados especializados en Despido Injustificado
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
                                "Evaluación de tu despido",
                                "Cálculo de indemnizaciones",
                                "Demandas laborales en tribunales",
                                "Negociación con empleadores"
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Abogado para despido injustificado en Chile</h2>
                    <p>
                        Ser despedido es una situación estresante, pero más aún cuando crees que fue sin justificación real. El Código del Trabajo chileno protege a los trabajadores y establece causales específicas para un despido válido: necesidades de la empresa, abandono del trabajo, conductas graves, entre otras.
                    </p>
                    <p>
                        Si tu empleador no puede probar la causal que invocó, el despido es injustificado y tienes derecho a una indemnización adicional por años de servicio, además de otros beneficios. Un abogado laboralista evaluará si tu caso califica como despido injustificado o incluso discriminatorio (con mayores sanciones).
                    </p>
                    <p>
                        El plazo para demandar es solo de 60 días hábiles desde el despido. Por eso es urgente contactar a un abogado de inmediato para no perder tus derechos.
                    </p>

                    <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">Tipos de despido injustificado en Chile</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Despido sin causa legal:</strong> El empleador no invoca ninguna causal o invoca una que no existe en la ley.</li>
                        <li><strong>Despido con causal no probada:</strong> El empleador alega una causal (ej: necesidades de la empresa) pero no la prueba en juicio.</li>
                        <li><strong>Despido discriminatorio:</strong> Por razones de raza, género, religión, discapacidad, sindicalización, etc. Tiene recargos del 50% sobre todas las prestaciones.</li>
                        <li><strong>Despido por fuero laboral:</strong> Si estabas con fuero (embarazo, sindicalista, comité paritario) y no pidieron autorización judicial previa.</li>
                    </ul>

                    <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">¿Cuánto cuesta un abogado para despido injustificado?</h2>
                    <p>
                        La mayoría de los abogados laboralistas trabajan con honorarios de éxito: cobran un porcentaje (generalmente 20-30%) del monto que recuperes en el juicio. Esto significa que si no ganas, no pagas.
                    </p>
                    <p>
                        Algunos ofrecen consulta inicial gratuita o a un costo reducido para evaluar tu caso. En LegalUp puedes comparar diferentes abogados, sus tarifas y experiencia, y elegir al que mejor se adapte a tu situación.
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
                            Resuelve tus dudas sobre el despido injustificado
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
                        ¿Te despidieron y crees que fue injustificado?
                    </h2>
                    <p className="text-xl text-white mb-10">
                        No dejes pasar los 60 días hábiles. Un abogado puede evaluar tu caso hoy mismo.
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

export default DespidoInjustificadoLanding;