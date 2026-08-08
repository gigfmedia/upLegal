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

const ArriendoLanding = () => {
    const [lawyers, setLawyers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
    const { user } = useAuth();

    const cardsRef = useRef<HTMLDivElement>(null);

    const scrollToCards = () => {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'click_cta_hero_arriendo');
        }
        cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    useEffect(() => {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'view_arriendo_landing');
        }
    }, []);

    useEffect(() => {
        const fetchLawyers = async () => {
            setIsLoading(true);
            try {
                const { searchLawyers } = await import('@/pages/api/search-lawyers');

                const { lawyers: results } = await searchLawyers({
                    query: "arriendo",
                    specialty: "Derecho Civil",
                    page: 1,
                    pageSize: 15,
                    orderBy: 'review_count',
                    orderDirection: 'desc'
                });

                let completeResults = (results || []).filter((lawyer) => {
                    return Boolean(
                        lawyer.pjud_verified === true &&
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
            question: "¿Qué hago si mi arrendatario no paga el arriendo?",
            answer: "Debes enviar una carta de término de contrato por falta de pago y luego iniciar un juicio de arriendo para recuperar la propiedad y cobrar las rentas adeudadas. Un abogado puede acelerar este proceso que normalmente toma 3-6 meses."
        },
        {
            question: "¿Cuánto puede subir el arriendo cada año?",
            answer: "Legalmente no hay un tope obligatorio. Se aplica el IPC si el contrato lo estipula, pero si no hay cláusula, el dueño puede pedir el valor de mercado. Un abogado puede ayudarte a negociar aumentos razonables."
        },
        {
            question: "¿Qué pasa si el arrendador no quiere devolver la garantía?",
            answer: "La garantía debe devolverse dentro de 30 días desde el término del contrato si no hay daños. Si el dueño no la devuelve sin justificación, puedes demandar por el cobro de la garantía más intereses y costas."
        },
        {
            question: "¿Puedo subarrendar la propiedad que arriendo?",
            answer: "Solo si el contrato lo permite expresamente. La mayoría de los contratos lo prohíben. Si lo haces sin autorización, es causal de término inmediato del contrato y posible demanda por parte del dueño."
        }
    ];

    return (
        <div className="min-h-screen bg-white pt-16">
            <Helmet>
                <title>Abogado Arriendo Chile | Recupera Rentas y Propiedad | LegalUp</title>
                <meta name="description" content="Abogado para arriendos en Chile: recupera rentas impagas y tu propiedad cuando el arrendatario no paga. Compara abogados verificados por el PJUD, precio por hora y agenda online." />
            </Helmet>

            <Header onAuthClick={() => setShowAuthModal(true)} />

            <div className="bg-gray-100 pt-20 pb-16 lg:pt-32 lg:pb-24 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center text-center mx-auto">
                        <span className="border border-gray-900 bg-gray-900 rounded-full p-1 text-sm text-white mb-8 max-w-3xl mx-auto w-fit px-2 mt-4 flex items-center gap-2">
                            Derecho Civil / Arrendamiento
                        </span>
                        <h1 className="text-4xl md:text-5xl font-bold font-serif text-gray-900 mb-6 leading-tight">
                            Tu arrendatario no paga: recupera las rentas y la propiedad
                        </h1>
                        <p className="text-m sm:text-xl text-gray-900 mb-12 max-w-3xl mx-auto">
                            Encuentra un abogado de arriendo en Chile que inicia el juicio, cobra las rentas impagas y recupera tu departamento o casa. Precio por hora claro y sin sorpresas.
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
                                {lawyers.length > 0 ? `${lawyers.length} abogados verificados por el PJUD` : 'Abogados disponibles'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <section ref={cardsRef} className="py-20 bg-muted">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Abogados especializados en Arrendamiento
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
                                "Redacción de contratos de arriendo",
                                "Cobranza de rentas impagas",
                                "Juicios de terminación de contrato",
                                "Recuperación de propiedades"
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Abogado para problemas de arriendo en Chile</h2>
                    <p>
                        Los conflictos de arrendamiento son una de las causas más comunes en los juzgados civiles chilenos. Ya seas arrendador o arrendatario, un abogado especialista puede proteger tus derechos y resolver disputas sobre rentas impagas, incumplimientos de contrato, daños a la propiedad, o devolución de garantías.
                    </p>
                    <p>
                        Para los arrendadores, el principal dolor de cabeza es cuando el inquilino deja de pagar. Un abogado puede iniciar un juicio sumario de arriendo para recuperar la propiedad en 3-6 meses y cobrar las rentas adeudadas más intereses.
                    </p>
                    <p>
                        Para los arrendatarios, los problemas suelen ser el no pago de la garantía al término del contrato, aumentos abusivos de renta, o el dueño que se niega a hacer reparaciones necesarias. Un abogado te asesora sobre tus derechos como inquilino según la Ley de Arrendamiento de Propiedades Urbanas.
                    </p>

                    <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">Problemas comunes en arriendos y cómo resolverlos</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Falta de pago de rentas:</strong> El abogado puede iniciar un juicio de terminación de contrato y cobro de rentas adeudadas.</li>
                        <li><strong>No devolución de la garantía:</strong> Puedes demandar el cobro de la garantía más intereses si no hay justificación para retenerla.</li>
                        <li><strong>Daños a la propiedad:</strong> El arrendador puede retener parte de la garantía o demandar por daños adicionales.</li>
                        <li><strong>Subarriendo no autorizado:</strong> Es causal de término inmediato del contrato.</li>
                        <li><strong>Contratos mal redactados:</strong> Un abogado puede redactar un contrato que proteja ambas partes según la ley chilena.</li>
                    </ul>

                    <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">¿Cuánto cuesta un abogado para problemas de arriendo?</h2>
                    <p>
                        En LegalUp cada abogado publica su propia tarifa por hora, así que el precio que ves es el que pagas. Para evaluar tu caso puedes agendar una consulta inicial que vale la mitad de la tarifa por hora del abogado (una sesión de 30 minutos de media, según la tarifa publicada en su perfil).
                    </p>
                    <p>
                        Al pagar en línea se agrega un recargo del 10% por los costos de la plataforma (tarifas de Mercado Pago y procesamiento de tu pago). El valor del abogado y el recargo se muestran desglosados antes de confirmar el pago, sin cargos ocultos.
                    </p>
                    <p>
                        Un juicio de arriendo o la redacción de un contrato tienen tarifas variables según la complejidad del caso. Al comparar abogados en LegalUp verás su tarifa por hora y podrás elegir al especialista que mejor se ajuste a tu presupuesto.
                    </p>

                    <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
                            <div className="text-2xl font-bold text-gray-900">{lawyers.length > 0 ? `${lawyers.length} abogados` : 'Abogados verificados'}</div>
                            <p className="text-sm text-gray-500 mt-1">Verificados por el PJUD y disponibles para tu caso</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
                            <div className="text-2xl font-bold text-gray-900">Pago online</div>
                            <p className="text-sm text-gray-500 mt-1">Procesado de forma segura por Mercado Pago</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
                            <div className="text-2xl font-bold text-gray-900">Tarifa 100% transparente</div>
                            <p className="text-sm text-gray-500 mt-1">El precio que ves es el que pagas.</p>
                        </div>
                    </div>
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
                            Todo sobre arrendamientos en Chile
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
                        Recupera tu propiedad y las rentas que te deben
                    </h2>
                    <p className="text-xl text-white mb-10">
                        Agenda una consulta inicial por la mitad de la tarifa por hora de un abogado verificado y evalúa tu caso hoy mismo.
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

export default ArriendoLanding;