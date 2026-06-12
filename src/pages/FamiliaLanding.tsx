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

const FamiliaLanding = () => {
    const [lawyers, setLawyers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
    const { user } = useAuth();

    const cardsRef = useRef<HTMLDivElement>(null);

    const scrollToCards = () => {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'click_cta_hero_familia');
        }
        cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    useEffect(() => {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'view_familia_landing');
        }
    }, []);

    useEffect(() => {
        const fetchLawyers = async () => {
            setIsLoading(true);
            try {
                const { searchLawyers } = await import('@/pages/api/search-lawyers');

                const { lawyers: results } = await searchLawyers({
                    query: "familia",
                    specialty: "Derecho de Familia",
                    page: 1,
                    pageSize: 15,
                    orderBy: 'review_count',
                    orderDirection: 'desc'
                });

                // Filtrar solo abogados con perfil completo
                let completeResults = (results || []).filter((lawyer) => {
                    return Boolean(
                        (lawyer.verified || lawyer.pjud_verified) &&
                        lawyer.hourly_rate_clp > 0 &&
                        lawyer.bio && lawyer.bio.trim() !== '' &&
                        lawyer.specialties && lawyer.specialties.length > 0 &&
                        lawyer.location && lawyer.location.trim() !== ''
                    );
                });

                // Ordenar para priorizar especialistas puros en familia
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
            question: "¿Qué materias cubre el derecho de familia?",
            answer: "El derecho de familia abarca divorcios, nulidad matrimonial, pensión de alimentos, cuidado personal de niños (tuición), régimen de visitas (relación directa y regular), compensación económica, liquidación de sociedad conyugal, y medidas de protección para niños, niñas y adolescentes."
        },
        {
            question: "¿Cuánto se demora un juicio de familia en Chile?",
            answer: "Depende de la complejidad. Un divorcio unilateral puede tomar 3-6 meses; una demanda de alimentos, 2-4 meses; un cuidado personal conflictivo puede extenderse hasta 8-12 meses. Los tribunales de familia son más rápidos que los civiles, pero los tiempos varían según la carga del tribunal."
        },
        {
            question: "¿Necesito un abogado para ir al Juzgado de Familia?",
            answer: "Sí, es obligatorio contar con un abogado para representarte en cualquier juicio de familia, a excepción de medidas de protección urgentes donde puedes presentarte sin abogado, pero luego el tribunal te designará uno de la Corporación de Asistencia Judicial si no tienes recursos."
        },
        {
            question: "¿Qué es la mediación familiar?",
            answer: "Es un procedimiento voluntario y gratuito donde un mediador ayuda a las parejas a llegar a acuerdos sobre divorcio, alimentos, cuidado personal, etc. Si se llega a acuerdo, se homologa ante el tribunal y tiene efecto de sentencia. Muchos tribunales derivan a mediación antes de iniciar el juicio."
        }
    ];

    return (
        <div className="min-h-screen bg-white pt-16">
            <Helmet>
                <title>Abogado de Familia en Chile | LegalUp</title>
                <meta name="description" content="Encuentra abogados especialistas en derecho de familia: divorcios, alimentos, cuidado personal, régimen de visitas y más. Compara precios y perfiles verificados." />
            </Helmet>

            <Header onAuthClick={() => setShowAuthModal(true)} />

            {/* Hero Section */}
            <div className="bg-gray-50 pt-20 pb-16 lg:pt-32 lg:pb-24 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center text-center mx-auto">
                        <span className="border border-gray-900 bg-gray-900 rounded-full p-1 text-sm text-white mb-8 max-w-3xl mx-auto w-fit px-2 mt-4 flex items-center gap-2">
                            Derecho de Familia
                        </span>
                        <h1 className="text-4xl md:text-5xl font-bold font-serif text-gray-900 mb-6 leading-tight">
                            ¿Necesitas un abogado para asuntos de familia?
                        </h1>
                        <p className="text-xl text-gray-900 mb-10 leading-relaxed">
                            Divorcios, pensión de alimentos, cuidado personal, régimen de visitas y más. Encuentra al especialista que necesitas.
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
                            Abogados especializados en Derecho de Familia
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
                                "Especialistas en familia y tribunales de familia",
                                "Agenda online y pagos seguros",
                                "Atención en todo Chile"
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Abogado de familia en Chile: asesoría integral para conflictos familiares</h2>
                    <p>
                        El derecho de familia regula las relaciones entre sus miembros: conyugues, padres e hijos, y otros parientes. Los conflictos familiares son emocionalmente desgastantes y requieren no solo conocimiento legal, sino también sensibilidad humana. Un abogado especializado en familia te guiará en procesos como divorcio, pensión de alimentos, cuidado personal de niños, régimen de visitas, compensación económica, y liquidación de bienes sociales.
                    </p>
                    <p>
                        En Chile, los Tribunales de Familia son los encargados de conocer estas materias, con un procedimiento más expedito y con enfoque en el interés superior del niño. Contar con un abogado experto es fundamental para proteger tus derechos y los de tus hijos, y para lograr acuerdos justos que eviten litigios prolongados.
                    </p>
                    <p>
                        Ya sea que necesites iniciar un divorcio unilateral, pedir alimentos para tus hijos, modificar el monto de una pensión, o definir quién tendrá el cuidado personal, en LegalUp encontrarás abogados verificados, con tarifas transparentes y experiencia en tribunales de familia.
                    </p>

                    <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">Principales materias de derecho de familia</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Divorcio:</strong> Contencioso (unilateral) o de mutuo acuerdo. Incluye efectos como cesación de los deberes conyugales y posibilidad de compensación económica.</li>
                        <li><strong>Pensión de alimentos:</strong> Obligación de los padres de contribuir a la mantención, educación y salud de los hijos hasta los 21 años (28 si estudian). También aplica entre cónyuges separados.</li>
                        <li><strong>Cuidado personal (tuición):</strong> Determina con quién vivirán los hijos tras la separación. Puede ser unilateral o compartida.</li>
                        <li><strong>Régimen de relación directa y regular:</strong> Establece días, horarios y modalidades de visitas del padre o madre que no tiene el cuidado personal.</li>
                        <li><strong>Compensación económica:</strong> Indemnización que puede pagar un cónyuge al otro si se dedicó al cuidado de los hijos o al hogar y sufrió menoscabo económico.</li>
                        <li><strong>Liquidación de sociedad conyugal:</strong> Repartición de bienes adquiridos durante el matrimonio al disolverse la sociedad.</li>
                        <li><strong>Nulidad matrimonial:</strong> Declaración de que el matrimonio nunca fue válido por vicios del consentimiento o impedimentos.</li>
                    </ul>

                    <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">¿Cómo elegir un buen abogado de familia?</h2>
                    <p>
                        Al buscar un abogado para asuntos familiares, es importante considerar su experiencia específica en Tribunales de Familia, su manejo en mediaciones, y su capacidad para generar acuerdos. Un buen abogado de familia debe ser empático, pero firme en la defensa de tus derechos. Revisa sus valoraciones de otros clientes, su especialización (evita abogados que atienden muchas áreas), y asegúrate de que tenga tarifas claras desde el inicio.
                    </p>
                    <p>
                        En LegalUp, todos los abogados publican su tarifa horaria y el precio de la primera consulta, lo que te permite comparar sin presiones. Además, puedes agendar directamente una reunión online o presencial según tu preferencia.
                    </p>

                    <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">¿Cuánto cuesta un abogado de familia en Chile?</h2>
                    <p className="mb-2">
                        Los honorarios varían según la complejidad del caso y la experiencia del profesional. Los rangos aproximados son:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Consulta inicial:</strong> $50.000 - $120.000 CLP (muchos abogados ofrecen tarifa reducida para la primera reunión).</li>
                        <li><strong>Divorcio unilateral sin bienes:</strong> $400.000 - $800.000 CLP.</li>
                        <li><strong>Divorcio con liquidación de bienes:</strong> $800.000 - $1.500.000 CLP.</li>
                        <li><strong>Demanda de alimentos:</strong> $300.000 - $700.000 CLP.</li>
                        <li><strong>Cuidado personal contencioso:</strong> $600.000 - $1.200.000 CLP.</li>
                    </ul>
                    <p className="mt-2">
                        Muchos abogados también aceptan pagos en cuotas o trabajan con honorarios de éxito parcial. En LegalUp puedes comparar precios y perfiles para tomar una decisión informada.
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
                            Todo lo que necesitas saber sobre derecho de familia en Chile
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
            </section>

            {/* Final CTA */}
            <section className="py-20 bg-green-900 text-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold font-serif text-green-600 mb-6">
                        ¿Necesitas asesoría legal en un tema de familia?
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

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                initialMode="login"
            />
        </div>
    );
};

export default FamiliaLanding;