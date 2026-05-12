import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, User, Clock, ChevronRight, Home, ArrowLeft, Search } from "lucide-react";
import Header from "@/components/Header";

import { articles, Article } from "@/data/blogArticles";

const BlogPage = () => {
  const helmetData = (
    <Helmet>
      <title>Blog LegalUp - Guías y Artículos de Derecho en Chile</title>
      <meta name="description" content="Blog LegalUp: Artículos expertos sobre derecho laboral, civil, familiar e inmobiliario en Chile. Guías prácticas para proteger tus derechos." />
      <link rel="canonical" href="https://legalup.cl/blog" />
    </Helmet>
  );

  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["Derecho Inmobiliario", "Derecho Laboral", "Derecho de Familia", "Derecho Penal", "Derecho Civil"];

  const filteredArticles = useMemo(() => {
    let result = articles;
    
    if (selectedCategory) {
      result = result.filter(article => article.category === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(article => 
        article.title.toLowerCase().includes(query) || 
        article.excerpt.toLowerCase().includes(query) ||
        article.category.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [selectedCategory, searchQuery, articles]);

  // `articles` debe mantenerse ordenado del más reciente al más antiguo: el destacado es siempre el primero.
  const featuredArticle = useMemo(() => {
    if (searchQuery || selectedCategory) {
      return filteredArticles[0];
    }
    return articles[0];
  }, [selectedCategory, searchQuery, filteredArticles, articles]);

  const recentArticles = useMemo(() => {
    if (searchQuery || selectedCategory) {
      return filteredArticles.slice(1);
    }
    return articles.slice(1);
  }, [selectedCategory, searchQuery, filteredArticles, articles]);

  const getArticleCount = (category: string) => {
    return articles.filter(a => a.category === category).length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {helmetData}
      <Header onAuthClick={() => {}} />
      
      {/* Hero Section */}
      <div className="bg-green-900 text-white py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
          <div className="flex items-center gap-2 text-white text-sm mb-4">
            <Link to="/" className="text-green-600 hover:text-white transition-colors">
              Inicio
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>Blog</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold font-serif text-green-600 mb-6">
            Blog LegalUp
          </h1>
          
          <p className="text-xl text-white max-w-3xl">
            Guías prácticas y artículos expertos para ayudarte a entender tus derechos y tomar mejores decisiones legales en Chile.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Search Bar */}
        <div className="mb-8 w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar artículos..."
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-900 focus:border-transparent"
            />
          </div>
        </div>

        {/* Results count */}
        {(searchQuery || selectedCategory) && (
          <div className="mb-6 text-sm text-gray-600">
            {filteredArticles.length === 0 ? (
              <span>No se encontraron artículos</span>
            ) : (
              <span>{filteredArticles.length} artículo{filteredArticles.length !== 1 ? 's' : ''} encontrado{filteredArticles.length !== 1 ? 's' : ''}</span>
            )}
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory(null);
              }}
              className="ml-2 text-green-700 hover:underline font-medium"
            >
              Limpiar filtros
            </button>
          </div>
        )}
        
        {/* Categories Pills */}
        <div className="mb-8 flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className={selectedCategory === null ? "bg-gray-900 group" : "group"}
          >
            Todos 
            <span className={`ml-1.5 px-2 py-0.2 rounded-full text-[10px] font-bold transition-colors ${
              selectedCategory === null 
                ? 'bg-white text-gray-900' 
                : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
            }`}>
              {articles.length}
            </span>
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={selectedCategory === category ? "bg-gray-900 group" : "group"}
            >
              {category}
              <span className={`ml-1.5 px-2 py-0.2 rounded-full text-[10px] font-bold transition-colors ${
                selectedCategory === category 
                  ? 'bg-white text-gray-900' 
                  : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
              }`}>
                {getArticleCount(category)}
              </span>
            </Button>
          ))}
        </div>
        {featuredArticle && (
          <div key={featuredArticle.id} className="mb-12">
            <div 
              className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 cursor-pointer hover:shadow-xl transition-shadow group"
              onClick={() => navigate(`/blog/${featuredArticle.id}`)}
            >
              <div className="md:flex">
                <div className="md:w-1/3">
                  <div className="h-48 md:h-full flex items-center justify-center">
                    <img 
                      className="h-full w-full object-cover" 
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
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                      {featuredArticle.category}
                    </span>
                    <span>•</span>
                    <span>{selectedCategory ? "Resultado de búsqueda" : "Artículo Destacado"}</span>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-green-900 mb-4">
                    <Link 
                      to={`/blog/${featuredArticle.id}`}
                      className="group-hover:text-green-600 transition-colors"
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
                        className="bg-gray-900 hover:bg-green-900"
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
                          className="border-gray-600 text-gray-900 hover:bg-gray-900 hover:text-white"
                          onClick={(e) => e.stopPropagation()}
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

        

        {/* Recent Articles */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {selectedCategory ? `Artículos en ${selectedCategory}` : "Artículos Recientes"}
          </h2>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recentArticles.map(article => (
              <Card 
                key={article.id} 
                className="hover:shadow-lg transition-shadow flex flex-col h-full cursor-pointer group overflow-hidden"
                onClick={() => navigate(`/blog/${article.id}`)}
              >
                <div className="h-48 w-full overflow-hidden">
                  <img 
                    src={article.image || "../assets/arriendo.png"} 
                    alt={article.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "../assets/arriendo.png";
                    }}
                  />
                </div>
                <CardContent className="p-6 flex flex-col flex-1">
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
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mt-auto pt-4">
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
                  className={`hover:shadow-md transition-all cursor-pointer border-2 ${selectedCategory === category ? 'border-gray-900 bg-white' : 'border-transparent'}`}
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
                      <ChevronRight className={`h-5 w-5 transition-colors ${selectedCategory === category ? 'text-gray-900' : 'text-gray-400'}`} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-white border rounded-xl shadow-sm p-8 text-center">
          <h2 className="text-2xl font-bold font-serif mb-4">¿Necesitas asesoría legal?</h2>
          <p className="mb-6 max-w-2xl mx-auto">
            Conecta con abogados verificados especializados en tu área de necesidad. Consultas online, precios transparentes y disponibilidad inmediata.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gray-900 text-white hover:bg-green-900 hover:text-white px-8 py-3"
              onClick={() => window.location.href = '/search'}
            >
              Hablar con abogado ahora
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
