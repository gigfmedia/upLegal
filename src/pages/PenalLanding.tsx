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

const PenalLanding = () => {
    const [lawyers, setLawyers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
    const { user } = useAuth();

    const cardsRef = useRef<HTMLDivElement>(null);

    const scrollToCards = () => {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'click_cta_hero_penal');
        }
        cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    useEffect(() => {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'view_penal_landing');
        }
    }, []);

    useEffect(() => {
        const fetchLawyers = async () => {
            setIsLoading(true);
            try {
                const { searchLawyers } = await import('@/pages/api/search-lawyers');

                const { lawyers: results } = await searchLawyers({
                    query: "penal",
                    specialty: "Derecho Penal",
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
            question: "¿Cuándo necesito un abogado penalista?",
            answer: "Necesitas un abogado penalista si fuiste detenido, recibiste una citación del Ministerio Público, eres imputado en una causa penal, o quieres querellarte como víctima de un delito. También si necesitas asesoría sobre posibles consecuencias penales de tus acciones."
        },
        {
            question: "¿Qué hace un abogado penalista en la primera audiencia?",
            answer: "En la audiencia de formalización, tu abogado debe: 1) Defender tus derechos, 2) Solicitar la libertad si estás detenido, 3) Negociar medidas cautelares menos gravosas, 4) Evaluar la evidencia del fiscal, y 5) Planear la estrategia de defensa para las siguientes etapas."
        },
        {
            question: "¿Cuánto cuesta un abogado penalista en Chile?",
            answer: "Los honorarios varían según la complejidad del caso. Una consulta simple cuesta entre $50.000 y $150.000 CLP. Una defensa completa en juicio oral puede costar entre $1.500.000 y $5.000.000 CLP o más, dependiendo de la gravedad del delito y la experiencia del abogado."
        },
        {
            question: "¿Puedo cambiar de abogado durante el proceso penal?",
            answer: "Sí, puedes cambiar de abogado en cualquier etapa del proceso. Solo debes comunicarlo al tribunal y al nuevo abogado para que asuma la defensa. El tribunal puede darte un plazo breve para conseguir uno nuevo si tu abogado actual se retira."
        }
    ];

    return (
        <div className="min-h-screen bg-white pt-16">
            <Helmet>
                <title>Abogado Penalista en Chile | Defensa Penal y Querellante | LegalUp</title>
                <meta name="description" content="Encuentra abogados penalistas expertos en Chile. Defensa en causas penales, querellas, delitos de lesiones, robos, estafas, y más. Compara precios y perfiles." />
            </Helmet>

            <Header onAuthClick={() => setShowAuthModal(true)} />

            {/* Hero Section */}
            <div className="bg-gray-100 pt-20 pb-16 lg:pt-32 lg:pb-24 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center text-center mx-auto">
                        <span className="border border-gray-900 bg-gray-900 rounded-full p-1 text-sm text-white mb-8 max-w-3xl mx-auto w-fit px-2 mt-4 flex items-center gap-2">
                            Derecho Penal
                        </span>
                        <h1 className="text-4xl md:text-5xl font-bold font-serif text-gray-900 mb-6 leading-tight">
                            ¿Necesitas defensa penal o asesoría legal?
                        </h1>
                        <p className="text-m sm:text-xl text-gray-900 mb-12 max-w-3xl mx-auto">
                            Abogados penalistas expertos te defienden ante tribunales o te asesoran como víctima.
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
                            Abogados especializados en Derecho Penal
                        </h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            Profesionales con experiencia en defensa penal, querellas, delitos económicos y más
                        </p>
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

                    {/* Benefits */}
                    <div className="mt-16 flex justify-center">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-left w-full max-w-2xl bg-white p-8 rounded-2xl border border-gray-100">
                            {[
                                "Defensa penal especializada",
                                "Asesoría como víctima o querellante",
                                "Atención en todas las regiones",
                                "Primera consulta a precio reducido"
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Abogado penalista en Chile: defensa y representación legal</h2>
                    <p>
                        El derecho penal es una de las ramas más complejas y delicadas del sistema judicial chileno. Un abogado penalista no solo defiende a quienes son acusados de cometer delitos, sino que también representa a víctimas que buscan justicia a través de una querella. Si enfrentas una investigación penal o fuiste víctima de un delito, contar con un abogado experto puede marcar la diferencia entre una condena, una absolución, o el éxito de tu caso como querellante.
                    </p>
                    <p>
                        En Chile, el sistema procesal penal se rige por el Código Procesal Penal, estableciendo plazos estrictos y formalidades que solo un abogado con experiencia puede manejar adecuadamente. Desde la detención y la formalización de la investigación, hasta el juicio oral y los recursos ante tribunales superiores, tu abogado será tu guía y defensor.
                    </p>
                    <p>
                        Ya sea que necesites defenderte de acusaciones de delitos como robo, lesiones, estafa, conducción en estado de ebriedad, o delitos de mayor connotación social, o que quieras querellarte como víctima, en LegalUp encuentras abogados penalistas verificados, con tarifas transparentes y experiencia comprobada.
                    </p>

                    <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">Tipos de defensa penal que ofrece un abogado</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Defensa en delitos contra la propiedad:</strong> Robo, hurto, estafa, apropiación indebida, receptación.</li>
                        <li><strong>Defensa en delitos contra las personas:</strong> Lesiones, homicidio, amenazas, violación de domicilio.</li>
                        <li><strong>Defensa en delitos de tránsito:</strong> Manejo en estado de ebriedad, homicidio o lesiones por conducción imprudente.</li>
                        <li><strong>Defensa en delitos económicos:</strong> Lavado de activos, delitos tributarios, fraudes al fisco.</li>
                        <li><strong>Defensa en delitos de drogas:</strong> Microtráfico, cultivo, posesión para consumo personal.</li>
                        <li><strong>Querella como víctima:</strong> Representación legal para iniciar acciones penales contra quienes te han dañado.</li>
                    </ul>

                    <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">El proceso penal en Chile y el rol del abogado</h2>
                    <p>
                        El proceso penal chileno consta de varias etapas. En la <strong>investigación preparatoria</strong>, el fiscal reúne evidencia. Tu abogado puede solicitar diligencias, impugnar ilegalidades y negociar salidas alternativas como suspensión condicional del procedimiento o acuerdos reparatorios.
                    </p>
                    <p>
                        Si el caso llega a <strong>juicio oral</strong>, tu abogado presentará una estrategia de defensa, interrogará testigos y argumentará ante el tribunal. Una buena defensa puede lograr la absolución o una pena reducida.
                    </p>
                    <p>
                        Para quienes actúan como <strong>querellantes</strong>, el abogado reúne pruebas, solicita medidas de protección y busca que se condene al acusado, además de obtener una reparación económica por los daños sufridos.
                    </p>

                    <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">¿Cuánto cobra un abogado penalista en Chile?</h2>
                    <p>
                        Los honorarios de un abogado penalista varían según la complejidad del delito, la etapa del proceso y la experiencia profesional. Generalmente:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 pt-4 pb-4">
                        <li><strong>Consulta inicial:</strong> $50.000 - $150.000 CLP</li>
                        <li><strong>Defensa en investigación preparatoria:</strong> $800.000 - $2.000.000 CLP</li>
                        <li><strong>Defensa hasta juicio oral:</strong> $1.500.000 - $5.000.000 CLP</li>
                        <li><strong>Querella como víctima:</strong> $1.000.000 - $3.000.000 CLP</li>
                    </ul>
                    <p>
                        Muchos abogados ofrecen <strong>consultas iniciales a precio reducido</strong> (aproximadamente la mitad de su tarifa horaria) para evaluar tu caso y definir presupuesto. En LegalUp puedes comparar tarifas y elegir al que mejor se ajuste a tu situación económica.
                    </p>
                </div>
            </section >

            {/* FAQs */}
            < section className="py-20 bg-gray-50" >
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <span className="bg-gray-900 text-white text-xs border border-gray-900 font-semibold px-3 py-1 rounded-full uppercase tracking-wide inline-flex mb-6">
                            FAQ
                        </span>
                        <h2 className="text-3xl font-bold font-serif text-gray-900 mb-4">
                            Preguntas Frecuentes
                        </h2>
                        <p className="text-gray-600">
                            Resuelve tus dudas sobre el derecho penal en Chile
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
                                        <ChevronDown
                                            className={`h-5 w-5 text-gray-600 transition-transform duration-200 ${openFaqIndex === index ? 'transform rotate-180' : ''
                                                }`}
                                        />
                                    </div>
                                </CardHeader>
                                {openFaqIndex === index && (
                                    <UICardContent className="p-6 pt-0">
                                        <p className="text-gray-600 leading-relaxed pl-10">
                                            {faq.answer}
                                        </p>
                                    </UICardContent>
                                )}
                            </Card>
                        ))}
                    </div>
                </div>
            </section >

            {/* SEO Tips Section */}
            {/* <section className="py-20 bg-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200">
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Consejos para elegir un buen abogado penalista</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="flex gap-3">
                                <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-gray-900">Verifica su especialización</h4>
                                    <p className="text-gray-600 text-sm">Asegúrate de que el abogado se dedique principalmente a derecho penal, no solo que lo incluya entre muchas áreas.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-gray-900">Experiencia en tribunales</h4>
                                    <p className="text-gray-600 text-sm">Pregunta cuántos casos similares ha llevado y cuál ha sido su tasa de éxito.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-gray-900">Honorarios claros</h4>
                                    <p className="text-gray-600 text-sm">Acuerda por escrito los costos, qué incluyen y si hay gastos adicionales (peritajes, traslados, etc.).</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-gray-900">Confianza y comunicación</h4>
                                    <p className="text-gray-600 text-sm">Debes sentirte cómodo hablando de detalles sensibles. Un buen abogado te explicará el proceso en términos claros.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section> */}

            {/* Final CTA */}
            <section className="py-20 bg-green-900 text-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold font-serif text-green-600 mb-6">
                        ¿Enfrentas una causa penal o necesitas querellarte?
                    </h2>
                    <p className="text-xl text-white mb-10">
                        No enfrentes el sistema penal solo. Un abogado especialista puede marcar la diferencia en tu caso.
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

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                initialMode="login"
            />
        </div >
    );
};

export default PenalLanding;