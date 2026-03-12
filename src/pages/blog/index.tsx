import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, User, Clock, ChevronRight, Home, ArrowLeft } from "lucide-react";
import Header from "@/components/Header";

const BlogPage = () => {
  // Set SEO meta tags
  document.title = "Blog LegalUp - Guías y Artículos de Derecho en Chile";
  
  // Update meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', 'Blog LegalUp: Artículos expertos sobre derecho laboral, civil, familiar e inmobiliario en Chile. Guías prácticas para proteger tus derechos.');
  }

  // Update canonical URL
  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', 'https://legalup.cl/blog');

  const articles = [
    {
      id: "derecho-penal-chile-2026",
      title: "¿Qué hacer si te acusan de un delito en Chile? Guía de Derecho Penal 2026",
      excerpt: "Enfrentar una acusación penal puede ser una de las situaciones más difíciles para cualquier persona. En esta Guía 2026 de Derecho Penal en Chile, explicamos qué significa ser acusado de un delito, cuáles son tus derechos, cómo funciona el proceso penal y qué pasos debes seguir para protegerte legalmente.",
      category: "Derecho Penal",
      author: "LegalUp",
      date: "10 de Marzo, 2026",
      readTime: "10 min",
      image: "/assets/derecho-penal-chile-2026.png",
      featured: true
    },
    {
      id: "derecho-de-familia-chile-2026",
      title: "¿Qué es el Derecho de Familia y cómo funciona en Chile? Guía 2026 completa",
      excerpt: "El Derecho de Familia en Chile regula las relaciones jurídicas entre padres, hijos, parejas y otros vínculos familiares. En esta Guía 2026, revisamos qué abarca, cuáles son los trámites más comunes, cómo funcionan los juicios y qué puedes hacer en caso de conflicto.",
      category: "Derecho de Familia",
      author: "LegalUp",
      date: "25 de Febrero, 2026",
      readTime: "15 min",
      image: "/assets/derecho-de-familia-chile-2026.png",
      featured: false
    },
    {
      id: "como-calcular-tu-finiquito-chile-2026",
      title: "¿Cómo calcular tu finiquito en Chile? Guía 2026 paso a paso",
      excerpt: "Calcular el finiquito en Chile puede generar dudas, especialmente porque intervienen distintos tipos de indemnizaciones, vacaciones pendientes y pagos proporcionales. Te explicamos cómo calcularlo correctamente.",
      category: "Derecho Laboral",
      author: "LegalUp",
      date: "18 de Febrero, 2026",
      readTime: "12 min",
      image: "/assets/finiquito-chile-2026.png",
      featured: false
    },
    {
      id: "me-subieron-el-arriendo-que-hago-2026",
      title: "Me subieron el arriendo, ¿qué hago? Guía completa para arrendatarios en Chile (2026)",
      excerpt: "Cuando llega el aviso de que subirá el valor del arriendo, el estrés aparece de inmediato. Pero no siempre el aumento es válido, y en Chile existen reglas claras para proteger al arrendatario.",
      category: "Derecho Inmobiliario",
      author: "LegalUp",
      date: "13 de Enero, 2026",
      readTime: "8 min",
      image: "/assets/arriendo-chile-2026.png",
      featured: false
    }
  ];

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = ["Derecho Inmobiliario", "Derecho Laboral", "Derecho de Familia", "Derecho Penal", "Derecho Civil"];

  const filteredArticles = useMemo(() => {
    if (!selectedCategory) return articles;
    return articles.filter(article => article.category === selectedCategory);
  }, [selectedCategory, articles]);

  const featuredArticle = useMemo(() => {
    // If a category is selected, use the first article of that category as "featured" for the view
    // if it exists, otherwise use the global featured article if its category matches, 
    // or just don't show a featured section if it doesn't match.
    if (selectedCategory) {
      return filteredArticles[0];
    }
    return articles.find(article => article.featured);
  }, [selectedCategory, filteredArticles, articles]);

  const recentArticles = useMemo(() => {
    if (selectedCategory) {
      return filteredArticles.slice(1); // Exclude the one used in featured section
    }
    return articles.filter(article => !article.featured);
  }, [selectedCategory, filteredArticles, articles]);

  const getArticleCount = (category: string) => {
    return articles.filter(a => a.category === category).length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onAuthClick={() => {}} />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
          <div className="flex items-center gap-2 text-blue-100 mb-4">
            <Link to="/" className="hover:text-white transition-colors">
              Inicio
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>Blog</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold mb-6">
            Blog LegalUp
          </h1>
          
          <p className="text-xl text-blue-100 max-w-3xl">
            Guías prácticas y artículos expertos para ayudarte a entender tus derechos y tomar mejores decisiones legales en Chile.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Featured Article */}
        {/* Featured Article */}
        {featuredArticle && (
          <div key={featuredArticle.id} className="mb-12">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="md:flex">
                <div className="md:w-1/3">
                  <div className="h-48 md:h-full flex py-8 items-center justify-center pl-8">
                    <img 
                      className="h-full w-full object-cover rounded-xl" 
                      src={featuredArticle.image || "../assets/arriendo.png"} 
                      alt={featuredArticle.category} 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "../assets/arriendo.png";
                      }}
                    />
                  </div>
                </div>
                <div className="md:w-2/3 p-8">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                      {featuredArticle.category}
                    </span>
                    <span>•</span>
                    <span>{selectedCategory ? "Resultado de búsqueda" : "Artículo Destacado"}</span>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    <Link 
                      to={`/blog/${featuredArticle.id}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {featuredArticle.title}
                    </Link>
                  </h2>
                  
                  <p className="text-gray-600 mb-6 leading-relaxed line-clamp-3">
                    {featuredArticle.excerpt}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{featuredArticle.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{featuredArticle.readTime}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        asChild
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Link to={`/blog/${featuredArticle.id}`}>
                          Leer Artículo
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                      
                      {selectedCategory && (
                        <Button
                          variant="outline"
                          asChild
                          className="border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                          <Link to={`/search?category=${encodeURIComponent(selectedCategory)}`}>
                            Ver Abogados especialistas
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Categories Pills */}
        <div className="mb-8 flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className={selectedCategory === null ? "bg-blue-600" : ""}
          >
            Todos
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={selectedCategory === category ? "bg-blue-600" : ""}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Recent Articles */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {selectedCategory ? `Artículos en ${selectedCategory}` : "Artículos Recientes"}
          </h2>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recentArticles.map(article => (
              <Card key={article.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                      {article.category}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    <Link 
                      to={`/blog/${article.id}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {article.title}
                    </Link>
                  </h3>
                  
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {article.excerpt}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{article.date}</span>
                    </div>
                    
                    <Link 
                      to={`/blog/${article.id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Leer →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredArticles.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <p className="text-gray-500">No hay artículos publicados en esta categoría todavía.</p>
              <Button 
                variant="link" 
                onClick={() => setSelectedCategory(null)}
                className="mt-2 text-blue-600"
              >
                Ver todos los artículos
              </Button>
            </div>
          )}
        </div>

        {/* Explorer Cards */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 font-primary">Explorar por Categorías</h2>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map(category => {
              const count = getArticleCount(category);
              return (
                <Card 
                  key={category} 
                  className={`hover:shadow-md transition-all cursor-pointer border-2 ${selectedCategory === category ? 'border-blue-600 bg-blue-50/50' : 'border-transparent'}`}
                  onClick={() => {
                    setSelectedCategory(category);
                    window.scrollTo({ top: 330, behavior: 'smooth' });
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{category}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {count > 0 ? `${count} artículo${count === 1 ? '' : 's'}` : "Próximamente"}
                        </p>
                      </div>
                      <ChevronRight className={`h-5 w-5 transition-colors ${selectedCategory === category ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-white border rounded-xl shadow-sm p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">¿Necesitas asesoría legal?</h2>
          <p className="mb-6 max-w-2xl mx-auto">
            Conecta con abogados verificados especializados en tu área de necesidad. Consultas online, precios transparentes y disponibilidad inmediata.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-blue-600 text-white hover:bg-blue-700 hover:text-white px-8 py-3"
              onClick={() => window.location.href = '/consulta'}
            >
              Consultar con Abogado Ahora
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="bg-white border-blue-700 text-blue-600 hover:text-blue-600 hover:bg-blue-100 px-8 py-3"
              onClick={() => window.location.href = '/search'}
            >
              Explorar Abogados
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
