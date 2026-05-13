import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from 'react-helmet-async';
import { ChevronRight, MessageSquare, CheckCircle, ArrowRight, Star, Shield, Clock, ChevronDown, Calendar } from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LawyerCard } from "@/components/LawyerCard";
import { categoryContent } from "@/data/categoryContent";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent as UICardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { articles } from "@/data/blogArticles";


interface CategoryLandingProps {
  category?: string;
}

const CategoryLanding = ({ category: propCategory }: CategoryLandingProps) => {
  const { category: urlCategory } = useParams<{ category: string }>();
  const category = propCategory || urlCategory;
  
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const { user } = useAuth();

  const content = category ? categoryContent[category] : null;

  useEffect(() => {
    const fetchLawyers = async () => {
      if (!category) return;
      
      setIsLoading(true);
      try {
        const { searchLawyers } = await import('@/pages/api/search-lawyers');
        
        let specialty = "";
        if (category === "laboral") specialty = "Derecho Laboral";
        if (category === "divorcio") specialty = "Derecho de Familia";
        if (category === "arriendo") specialty = "Derecho Civil";
        if (category === "penal") specialty = "Derecho Penal";

        const { lawyers: results } = await searchLawyers({
          specialty: specialty || "all",
          page: 1,
          pageSize: 12, // Fetch more to have a better sorting pool
          orderBy: 'review_count',
          orderDirection: 'desc'
        });

        // Sort: Complete profiles first
        const sortedResults = [...(results || [])].sort((a, b) => {
          const isCompleteA = Boolean(
            (a.verified || a.pjud_verified) &&
            a.hourly_rate_clp > 0 &&
            a.bio && a.bio.trim() !== '' &&
            a.specialties && a.specialties.length > 0 &&
            a.location && a.location.trim() !== ''
          );
          const isCompleteB = Boolean(
            (b.verified || b.pjud_verified) &&
            b.hourly_rate_clp > 0 &&
            b.bio && b.bio.trim() !== '' &&
            b.specialties && b.specialties.length > 0 &&
            b.location && b.location.trim() !== ''
          );

          if (isCompleteA && !isCompleteB) return -1;
          if (!isCompleteA && isCompleteB) return 1;
          return 0;
        });

        setLawyers(sortedResults.slice(0, 6)); // Only show top 6 after sorting
      } catch (error) {
        console.error("Error fetching category lawyers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLawyers();
  }, [category]);

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Página no encontrada</h1>
          <Link to="/" className="text-green-600 hover:underline">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-16">
      <Helmet>
        <title>{content.title}</title>
        <meta name="description" content={content.description} />
      </Helmet>

      <Header onAuthClick={() => setShowAuthModal(true)} />

      {/* JSON-LD Schema */}
      {content && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "LegalService",
                "name": content.h1,
                "description": content.description,
                "url": `https://legalup.cl/abogados-${category}`,
                "serviceType": "Legal Consulting",
                "areaServed": "CL",
                "provider": {
                  "@type": "Organization",
                  "name": "LegalUp",
                  "url": "https://legalup.cl"
                }
              },
              {
                "@type": "FAQPage",
                "mainEntity": content.faqs.map(faq => ({
                  "@type": "Question",
                  "name": faq.question,
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": faq.answer
                  }
                }))
              }
            ]
          })}
        </script>
      )}

      {/* Hero Section */}
      <div className="bg-green-900 text-white pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-6 text-green-400 text-sm">
            <Link to="/" className="hover:text-white transition-colors">Inicio</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white">Especialidades</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white capitalize">{category}</span>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold font-serif text-green-600 mb-6 leading-tight">
                {content.h1}
              </h1>
              <p className="text-xl text-white mb-8 leading-relaxed max-w-2xl">
                {content.introText}
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="md" 
                  className="bg-white hover:bg-green-400 text-gray-900 border-none h-14 px-8 text-lg"
                  onClick={() => {
                    const specialtyMap: Record<string, string> = {
                      'laboral': 'Derecho Laboral',
                      'divorcio': 'Derecho de Familia',
                      'arriendo': 'Derecho Civil',
                      'penal': 'Derecho Penal'
                    };
                    const specialty = category ? specialtyMap[category] : '';
                    if (!user) setShowAuthModal(true);
                    else window.location.href = `/search?specialty=${encodeURIComponent(specialty || '')}`;
                  }}
                >
                  Hablar con un Abogado
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <div className="flex items-center gap-4 text-sm text-green-100">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-white">4.9/5 valoración</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="h-4 w-4 text-green-400" />
                    <span className="text-white">100% Seguro</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden lg:block relative">
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 mb-8">
                <div className="flex items-center gap-4 mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-green-400/80">Asesoría Inmediata</h3>
                </div>
                <ul className="space-y-4">
                  {[
                    "Abogados verificados por el PJUD",
                    "Precios transparentes y sin sorpresas",
                    "Atención 100% online y segura",
                    "Garantía de satisfacción LegalUp"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-green-50">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* SEO Text Block */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              {content.longSeoTitle || `¿Por qué elegir un abogado de LegalUp para tu caso ${category}?`}
            </h2>
            
            {content.longSeoText ? (
              <div 
                className="space-y-6"
                dangerouslySetInnerHTML={{ __html: content.longSeoText }}
              />
            ) : (

              <>
                <p className="mb-6">
                  Encontrar el abogado adecuado puede marcar la diferencia entre resolver un problema legal de forma rápida o enfrentar un proceso largo y costoso. En nuestra plataforma, cada profesional pasa por un riguroso proceso de verificación, asegurando que cuente con su título vigente ante la Corte Suprema y experiencia comprobable en el área.
                </p>
                <div className="grid sm:grid-cols-2 gap-8 my-12">
                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 text-green-700">
                      <Shield className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Verificación PJUD</h3>
                    <p className="text-sm">Validamos la identidad y vigencia de cada abogado ante el Poder Judicial de Chile.</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 text-green-700">
                      <Clock className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Respuesta Rápida</h3>
                    <p className="text-sm">Nuestro sistema de notificaciones asegura que recibas una respuesta en tiempo récord.</p>
                  </div>
                </div>
                <p>
                  Nuestra misión es democratizar el acceso a la justicia en Chile, permitiendo que cualquier persona pueda recibir orientación legal de calidad desde la comodidad de su casa, con precios transparentes y sin costos ocultos.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="border bg-gray-900 rounded-full p-1 text-sm text-white mb-4 max-w-3xl mx-auto w-fit px-2 mt-4 uppercase tracking-widest">FAQ</p>
            <h2 className="text-3xl font-bold font-serif text-gray-900 mb-2">
              Preguntas Frecuentes
            </h2>
            <p className="text-gray-600">
              Resuelve tus dudas sobre {category === 'laboral' ? 'derecho laboral' : category === 'divorcio' ? 'divorcios y familia' : category === 'arriendo' ? 'arriendos' : 'derecho penal'}
            </p>
          </div>

          <div className="space-y-4">
            {content.faqs.map((faq, index) => (
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
                      className={`h-5 w-5 text-gray-600 transition-transform duration-200 ${
                        openFaqIndex === index ? 'transform rotate-180' : ''
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
          {/* <div className="text-center mt-12">
            <p className="text-gray-900 font-bold mb-4">¿Tienes otra duda?</p>
            <Button
              onClick={() => {
                const specialtyMap: Record<string, string> = {
                  'laboral': 'Derecho Laboral',
                  'divorcio': 'Derecho de Familia',
                  'arriendo': 'Derecho Civil',
                  'penal': 'Derecho Penal'
                };
                const specialty = category ? specialtyMap[category] : '';
                if (!user) setShowAuthModal(true);
                else window.location.href = `/search?specialty=${encodeURIComponent(specialty || '')}`;
              }}
              className="bg-gray-900 text-white hover:bg-green-900 h-12 px-8"
            >
              Hablar con un abogado
            </Button>
          </div> */}
        </div>
      </section>

      {/* Related Blog Articles */}
      {category && articles.filter(a => {
        if (category === "laboral") return a.category === "Derecho Laboral";
        if (category === "divorcio") return a.category === "Derecho de Familia";
        if (category === "arriendo") return a.category === "Derecho Inmobiliario" || a.category === "Derecho Civil";
        if (category === "penal") return a.category === "Derecho Penal";
        return false;
      }).length > 0 && (
        <section className="py-20 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between mb-12 gap-6">

              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Guías y artículos relacionados
                </h2>
                <p className="text-gray-600 max-w-2xl">
                  Aprende más sobre tus derechos y cómo funciona el sistema legal en Chile con nuestras guías especializadas.
                </p>
              </div>
              <Link to="/blog">
                <Button variant="outline" className="border-gray-800 text-gray-900 hover:bg-green-900 hover:text-white">
                  Ver todo el blog
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {articles
                .filter(a => {
                  if (category === "laboral") return a.category === "Derecho Laboral";
                  if (category === "divorcio") return a.category === "Derecho de Familia";
                  if (category === "arriendo") return a.category === "Derecho Inmobiliario" || a.category === "Derecho Civil";
                  if (category === "penal") return a.category === "Derecho Penal";
                  return false;
                })
                .slice(0, 6)

                .map((article) => (
                  <Card 
                    key={article.id} 
                    className="hover:shadow-lg transition-shadow flex flex-col h-full cursor-pointer group overflow-hidden bg-white"
                    onClick={() => window.location.href = `/blog/${article.id}`}
                  >
                    <div className="h-48 w-full overflow-hidden">
                      <img 
                        src={article.image || "/assets/arriendo.png"} 
                        alt={article.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/assets/arriendo.png";
                        }}
                      />
                    </div>
                    <UICardContent className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                          {article.category}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-green-900 mb-3">
                        <Link 
                          to={`/blog/${article.id}`}
                          className="group-hover:text-green-600 transition-colors"
                        >
                          {article.title}
                        </Link>
                      </h3>
                      
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {article.excerpt}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500 mt-auto pt-4 border-t border-gray-50">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{article.date}</span>
                        </div>
                        
                        <Link 
                          to={`/blog/${article.id}`}
                          className="text-green-900 hover:text-green-600 font-medium"
                        >
                          Leer →
                        </Link>
                      </div>
                    </UICardContent>
                  </Card>
                ))}
            </div>

          </div>
        </section>
      )}

      {/* Lawyers List */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between mb-12 gap-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Abogados destacados en esta área
              </h2>

              <p className="text-gray-600 max-w-2xl">
                Hemos seleccionado a los profesionales con mejores valoraciones y mayor experiencia para ayudarte con tu caso.
              </p>
            </div>
            <Link to="/search">
              <Button variant="outline" className="border-gray-800 text-gray-900 hover:bg-green-900 hover:text-white">
                Ver todos los abogados
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl h-96 animate-pulse border border-gray-100" />
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
        </div>
      </section>



      {/* CTA Section */}
      <section className="py-20 bg-green-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-green-600 mb-6">¿Tienes más dudas?</h2>
          <p className="text-xl text-white mb-10">
            Explica tu caso hoy mismo y deja que un especialista te guíe.
          </p>
          <Button 
            size="lg" 
            className="bg-white text-green-900 hover:bg-green-400 h-14 px-10 text-md"
            onClick={() => {
              const specialtyMap: Record<string, string> = {
                'laboral': 'Derecho Laboral',
                'divorcio': 'Derecho de Familia',
                'arriendo': 'Derecho Civil',
                'penal': 'Derecho Penal'
              };
              const specialty = category ? specialtyMap[category] : '';
              if (!user) setShowAuthModal(true);
              else window.location.href = `/search?specialty=${encodeURIComponent(specialty || '')}`;
            }}
          >
            Comenzar mi consulta ahora →
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

export default CategoryLanding;
