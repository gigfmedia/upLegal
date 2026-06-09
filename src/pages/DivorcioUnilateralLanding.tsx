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

const DivorcioUnilateralLanding = () => {
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const { user } = useAuth();

  const cardsRef = useRef<HTMLDivElement>(null);

  const scrollToCards = () => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click_cta_hero_divorcio_unilateral');
    }
    cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'view_divorcio_unilateral_landing');
    }
  }, []);

  useEffect(() => {
    const fetchLawyers = async () => {
      setIsLoading(true);
      try {
        const { searchLawyers } = await import('@/pages/api/search-lawyers');

        const { lawyers: results } = await searchLawyers({
          query: "divorcio",
          specialty: "Derecho de Familia",
          page: 1,
          pageSize: 15,
          orderBy: 'review_count',
          orderDirection: 'desc'
        });

        // Filter out incomplete profiles entirely
        let completeResults = (results || []).filter((lawyer) => {
          return Boolean(
            (lawyer.verified || lawyer.pjud_verified) &&
            lawyer.hourly_rate_clp > 0 &&
            lawyer.bio && lawyer.bio.trim() !== '' &&
            lawyer.specialties && lawyer.specialties.length > 0 &&
            lawyer.location && lawyer.location.trim() !== ''
          );
        });

        // Sort to prioritize pure Family lawyers (fewer specialties = more specialized)
        completeResults.sort((a, b) => {
          const aLength = a.specialties?.length || 0;
          const bLength = b.specialties?.length || 0;

          if (aLength !== bLength) {
            return aLength - bLength;
          }
          // If they have the same number of specialties, sort by review_count (desc)
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
      question: "¿Qué es un divorcio unilateral?",
      answer: "Es aquel que se solicita por uno de los cónyuges sin el consentimiento del otro, cuando ha existido un cese efectivo de la convivencia matrimonial durante al menos 3 años."
    },
    {
      question: "¿Cuánto tarda un divorcio unilateral en Chile?",
      answer: "Por lo general, un divorcio unilateral puede demorar entre 3 y 6 meses dependiendo de la agenda del Tribunal de Familia respectivo y de la facilidad para notificar al otro cónyuge."
    },
    {
      question: "¿Necesito el consentimiento de mi ex pareja?",
      answer: "No. El divorcio unilateral se caracteriza precisamente porque no requiere el acuerdo de la otra parte. Solo basta con que tú lo solicites y pruebes el cese de convivencia por más de 3 años."
    },
    {
      question: "¿Cómo pruebo el cese de convivencia?",
      answer: "Puede probarse mediante testigos, un acta de cese de convivencia firmada en el Registro Civil o notaría, comprobantes de domicilio distintos, o sentencias de pensión de alimentos anteriores."
    }
  ];

  return (
    <div className="min-h-screen bg-white pt-16">
      <Helmet>
        <title>Abogado para Divorcio Unilateral en Chile | LegalUp</title>
        <meta name="description" content="Encuentra abogados especializados en divorcio unilateral en Chile. Compara perfiles, experiencia y valor de consulta." />
      </Helmet>

      <Header onAuthClick={() => setShowAuthModal(true)} />

      {/* Hero Section */}
      <div className="bg-gray-50 pt-20 pb-16 lg:pt-32 lg:pb-24 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <span className="bg-gray-900 text-white text-xs border border-gray-900 font-semibold px-3 py-1 rounded-full uppercase tracking-wide inline-flex mb-6">
              Derecho de Familia
            </span>
            <h1 className="text-4xl md:text-5xl font-bold font-serif text-gray-900 mb-6 leading-tight">
              ¿Necesitas iniciar un divorcio unilateral?
            </h1>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              Compara abogados especializados, revisa precios y agenda tu consulta online.
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

      {/* Lawyers List (Immediate after Hero) */}
      <section ref={cardsRef} className="py-20 bg-muted">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Abogados especializados en Divorcio Unilateral
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

          {/* Benefits moved down */}
          <div className="mt-16 flex justify-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-left w-full max-w-2xl bg-white p-8 rounded-2xl border border-gray-100">
              {[
                "Abogados verificados por el PJUD",
                "Agenda online y pagos seguros",
                "Atención remota o presencial",
                "Especialistas en derecho de familia"
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
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Abogado para divorcio unilateral en Chile</h2>
          <p>
            El divorcio unilateral es la vía legal adecuada cuando el vínculo matrimonial está irremediablemente roto, pero existe negativa o imposibilidad de que ambos cónyuges firmen un acuerdo. Esto suele suceder en situaciones donde se ha perdido contacto con el cónyuge, hay conflictos patrimoniales sin resolver o simplemente la otra parte se rehúsa a colaborar por distintos motivos.
          </p>
          <p>
            Necesitas un abogado especializado para iniciar esta demanda, notificar válidamente a la otra persona y probar ante el juez que efectivamente llevan más de tres años separados sin intención de reanudar la vida en común. Un experto en derecho de familia se asegurará de reunir las pruebas necesarias, como actas de cese de convivencia o testigos, acelerando el proceso.
          </p>
          <p>
            Además, si existen bienes en común, deudas, o hijos de por medio, el abogado te asesorará sobre temas conexos como compensación económica, liquidación de la sociedad conyugal y régimen de relación directa y regular, evitando que firmes acuerdos perjudiciales.
          </p>

          <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">Requisitos para divorcio unilateral en Chile</h2>
          <p>
            Para que los tribunales de familia en Chile decreten un divorcio unilateral, la ley exige el cumplimiento estricto de ciertos requisitos que tu abogado deberá probar en juicio:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Cese efectivo de la convivencia:</strong> Debe haber transcurrido un plazo ininterrumpido de al menos tres años desde que los cónyuges dejaron de vivir juntos.</li>
            <li><strong>Prueba del cese:</strong> Para matrimonios celebrados después del 2004, se requiere un documento formal (Acta de Cese de Convivencia en el Registro Civil, escritura pública, o constancia judicial). Para matrimonios anteriores, se admite la declaración de testigos.</li>
            <li><strong>Sin reanudación de vida en común:</strong> No debe haber existido reconciliación ni convivencia durante esos tres años.</li>
            <li><strong>Estar al día en pensiones (Cláusula de dureza):</strong> Si existe una obligación de pago de pensión de alimentos fijada por tribunal para el cónyuge o los hijos, el demandante no debe tener deudas pendientes. Si es deudor, el juez podría rechazar el divorcio.</li>
          </ul>

          <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">Precio de un abogado para divorcio unilateral en Chile</h2>
          <p>
            El costo de un divorcio unilateral en Chile varía dependiendo de la complejidad del caso y la experiencia del abogado. Generalmente, los honorarios profesionales oscilan entre $300.000 y $800.000 CLP.
          </p>
          <p>
            A este valor base se le pueden sumar costos adicionales si el cónyuge demandado es difícil de ubicar (gastos de notificaciones a través de receptores judiciales), o si durante el juicio de divorcio se demandan otras materias, como la compensación económica. Es crucial acordar previamente con el abogado si sus honorarios incluyen todos los trámites hasta la sentencia final y la subinscripción en el Registro Civil.
          </p>
          <p>
            En LegalUp puedes comparar abiertamente las tarifas de distintos profesionales verificados, asegurando transparencia desde el primer momento y evitando sorpresas económicas a mitad del juicio.
          </p>
        </div>
      </section>

      {/* FAQs (for SEO) */}
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
              Información útil sobre el divorcio unilateral en Chile
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
            ¿No sabes qué abogado elegir?
          </h2>
          <p className="text-xl text-white mb-10">
            Compara perfiles y agenda la consulta que mejor se adapte a tu caso.
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

export default DivorcioUnilateralLanding;
