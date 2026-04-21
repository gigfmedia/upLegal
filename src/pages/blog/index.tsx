import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, User, Clock, ChevronRight, Home, ArrowLeft, Search } from "lucide-react";
import Header from "@/components/Header";

const BlogPage = () => {
  const helmetData = (
    <Helmet>
      <title>Blog LegalUp - Guías y Artículos de Derecho en Chile</title>
      <meta name="description" content="Blog LegalUp: Artículos expertos sobre derecho laboral, civil, familiar e inmobiliario en Chile. Guías prácticas para proteger tus derechos." />
      <link rel="canonical" href="https://legalup.cl/blog" />
    </Helmet>
  );

  const articles = useMemo(() => [
    {
      id: "cuantos-meses-debo-arriendo-para-que-me-desalojen-chile-2026",
      title: "¿Cuántos meses debo de arriendo para que me desalojen en Chile? (Guía 2026 real)",
      excerpt: "¿Con cuántos meses de deuda te pueden desalojar en Chile? Descubre cuándo pueden demandarte, cuánto demora el proceso y cómo evitarlo.",
      category: "Derecho Civil",
      author: "LegalUp",
      date: "20 de Abril, 2026",
      readTime: "15 min",
      image: "/assets/desalojo-3-chile-2026.png"
    },
    {
      id: "contrato-de-arriendo-chile-2026",
      title: "Contrato de arriendo en Chile: modelo gratis, cláusulas clave y errores que debes evitar (Guía 2026)",
      excerpt: "Firmar un contrato de arriendo en Chile es uno de los pasos más importantes al arrendar una propiedad. Descubre qué debe incluir, qué cláusulas son ilegales, errores comunes y un modelo base gratuito.",
      category: "Derecho Inmobiliario",
      author: "LegalUp",
      date: "18 de Abril, 2026",
      readTime: "13 min",
      image: "/assets/contrato-arriendo-chile-2026.png"
    },
    {
      id: "derecho-arrendamiento-chile-guia-completa-2026",
      title: "Derecho de arrendamiento en Chile: guía completa 2026 (contrato, desalojo, garantía, IPC y derechos)",
      excerpt: "El arriendo de propiedades en Chile es una de las relaciones legales más frecuentes. Todo lo que necesitas saber sobre contratos, desalojos, garantías e IPC en esta guía completa 2026.",
      category: "Derecho Inmobiliario",
      author: "LegalUp",
      date: "15 de Abril, 2026",
      readTime: "16 min",
      image: "/assets/derecho-arrendamiento-chile-2026.png"
    },
    {
      id: "tacita-reconduccion-chile-2026",
      title: "Tácita reconducción en Chile: qué es y qué pasa si sigues arrendando sin contrato (Guía 2026)",
      excerpt: "Si tu contrato de arriendo terminó pero sigues pagando y viviendo ahí, entraste en tácita reconducción. Descubre tus derechos y qué implica.",
      category: "Derecho Inmobiliario",
      author: "LegalUp",
      date: "13 de Abril, 2026",
      readTime: "10 min",
      image: "/assets/tacita-reconduccion-chile-2026.png"
    },
    {
      id: "dicom-deuda-arriendo-chile-2026",
      title: "¿Me pueden meter a DICOM por deuda de arriendo en Chile? (Guía legal completa 2026)",
      excerpt: "Descubre cuándo una deuda de arriendo puede afectar tu DICOM en Chile. Requisitos legales, cómo salir y qué hacer si te amenazan. Consulta abogados en LegalUp.",
      category: "Derecho Inmobiliario",
      author: "LegalUp",
      date: "10 de Abril, 2026",
      readTime: "12 min",
      image: "/assets/dicom-arriendo-chile-2026.png"
    },
    {
      id: "no-devuelven-garantia-arriendo-chile-2026",
      title: "No me devuelven la garantía de arriendo en Chile: qué hacer y cómo recuperarla (Guía 2026)",
      excerpt: "Uno de los problemas más comunes al terminar un contrato de arriendo es que el arrendador no devuelve la garantía. Descubre cómo recuperar tu dinero paso a paso.",
      category: "Derecho Inmobiliario",
      author: "LegalUp",
      date: "8 de Abril, 2026",
      readTime: "11 min",
      image: "/assets/no-devuelven-garantia-arriendo-chile-2026.png"
    },
    {
      id: "reajuste-arriendo-ipc-chile-2026",
      title: "Reajuste de arriendo en Chile según IPC (2026): cuánto pueden subir y cómo calcularlo",
      excerpt: "El reajuste del arriendo según IPC es una de las dudas más frecuentes tanto para arrendadores como arrendatarios en Chile. Guía legal 2026.",
      category: "Derecho Inmobiliario",
      author: "LegalUp",
      date: "06 de Abril, 2026",
      readTime: "10 min",
      image: "/assets/reajuste-arriendo-ipc-2026.png"
    },
    {
      id: "despido-injustificado-chile-2026",
      title: "Despido injustificado en Chile: qué hacer, cómo demandar y cuánto puedes ganar (Guía 2026)",
      excerpt: "Si te despidieron sin causa válida, tienes derecho a indemnización y hasta un 100% de recargo adicional. Guía 2026 con plazos, pasos y ejemplo de cálculo real.",
      category: "Derecho Laboral",
      author: "LegalUp",
      date: "1 de Abril, 2026",
      readTime: "12 min",
      image: "/assets/despido-injustificado-chile-2026.png"
    },
    {
      id: "cuanto-me-corresponde-anos-de-servicio-chile-2026",
      title: "¿Cuánto me corresponde por años de servicio en Chile? (Cálculo de indemnización 2026)",
      excerpt: "Descubre cuánto te corresponde recibir por años de servicio en Chile. Guía 2026 sobre cálculo de indemnización, topes legales y qué hacer si no te pagan.",
      category: "Derecho Laboral",
      author: "LegalUp",
      date: "30 de Marzo, 2026",
      readTime: "10 min",
      image: "/assets/anos-de-servicio-chile-2026.png"
    },
    {
      id: "que-pasa-si-no-tengo-contrato-de-arriendo-chile-2026",
      title: "¿Qué pasa si no tengo contrato de arriendo en Chile? (Guía legal 2026)",
      excerpt: "Arrendar sin contrato escrito es mucho más común de lo que parece en Chile. Descubre tus derechos y qué hacer en esta Guía 2026.",
      category: "Derecho Inmobiliario",
      author: "LegalUp",
      date: "26 de Marzo, 2026",
      readTime: "8 min",
      image: "/assets/sin-contrato-arriendo-2026.png"
    },
    {
      id: "ley-devuelveme-mi-casa-chile-2026",
      title: 'Ley "Devuélveme Mi Casa" en Chile (Ley 21.461): Qué es y cómo recuperar tu propiedad en 2026',
      excerpt:
        "La Ley 21.461 agiliza el desalojo y la recuperación del inmueble ante incumplimiento: procedimiento monitorio, plazos, pasos y errores comunes. Guía 2026 para propietarios en Chile.",
      category: "Derecho Civil",
      author: "LegalUp",
      date: "25 de Marzo, 2026",
      readTime: "14 min",
      image: "/assets/ley-devuelveme-mi-casa-2026.png"
    },
    {
      id: "me-pueden-despedir-sin-motivo-chile-2026",
      title: "¿Me pueden despedir sin motivo en Chile? (Guía 2026: derechos y qué hacer)",
      excerpt: "Descubre si es legal que te despidan sin motivo en Chile 2026. Conoce las causales de despido, tus derechos, indemnizaciones y qué hacer si crees que fue injustificado.",
      category: "Derecho Laboral",
      author: "LegalUp",
      date: "22 de Marzo, 2026",
      readTime: "10 min",
      image: "/assets/despido-sin-motivo-chile-2026.png"
    },
    {
      id: "orden-desalojo-chile-2026",
      title: "Orden de desalojo en Chile: qué es, cuándo ocurre y cómo funciona (Guía 2026)",
      excerpt: "¿Qué es una orden de desalojo en Chile? Descubre cuándo se dicta, qué es el lanzamiento, qué ocurre después y qué hacer si recibes una. Guía legal completa 2026.",
      category: "Derecho Inmobiliario",
      author: "LegalUp",
      date: "20 de Marzo, 2026",
      readTime: "8 min",
      image: "/assets/orden-desalojo-chile-2026.png"
    },
    {
      id: "arrendador-puede-cambiar-cerradura-chile-2026",
      title: "¿El arrendador puede cambiar la cerradura en Chile? (Guía legal 2026)",
      excerpt: "¿Te cambiaron la cerradura? En Chile, el arrendador no puede hacerlo sin una orden judicial. Descubre qué dice la ley, qué hacer y cómo proteger tus derechos como arrendatario.",
      category: "Derecho Inmobiliario",
      author: "LegalUp",
      date: "18 de Marzo, 2026",
      readTime: "10 min",
      image: "/assets/cerradura-arriendo-chile-2026.png"
    },
    {
      id: "cuanto-demora-juicio-desalojo-chile-2026",
      title: "¿Cuánto demora un juicio de desalojo en Chile? Guía 2026",
      excerpt: "Descubre cuánto tarda realmente un juicio de desalojo en Chile en 2026. Etapas legales, plazos judiciales y consejos para arrendadores y arrendatarios bajo la ley actual.",
      category: "Derecho Civil",
      author: "LegalUp",
      date: "16 de Marzo, 2026",
      readTime: "15 min",
      image: "/assets/desalojo-2-chile-2026.png"
    },
    {
      id: "me-quieren-desalojar-que-hago-chile-2026",
      title: "¿Me pueden desalojar sin orden judicial en Chile? (Guía 2026)",
      excerpt: "Si arriendas una propiedad en Chile, es posible que en algún momento tengas problemas con el dueño del inmueble. Conoce tus derechos legales y el proceso correcto bajo la ley 'Devuélveme mi Casa'.",
      category: "Derecho Civil",
      author: "LegalUp",
      date: "13 de Marzo, 2026",
      readTime: "15 min",
      image: "/assets/desalojo-chile-2026.png"
    },
    {
      id: "derecho-penal-chile-2026",
      title: "¿Qué hacer si te acusan de un delito en Chile? Guía de Derecho Penal 2026",
      excerpt: "Enfrentar una acusación penal puede ser una de las situaciones más difíciles para cualquier persona. En esta Guía 2026 de Derecho Penal en Chile, explicamos qué significa ser acusado de un delito, cuáles son tus derechos, cómo funciona el proceso penal y qué pasos debes seguir para protegerte legalmente.",
      category: "Derecho Penal",
      author: "LegalUp",
      date: "10 de Marzo, 2026",
      readTime: "10 min",
      image: "/assets/derecho-penal-chile-2026.png"
    },
    {
      id: "derecho-de-familia-chile-2026",
      title: "¿Qué es el Derecho de Familia y cómo funciona en Chile? Guía 2026 completa",
      excerpt: "El Derecho de Familia en Chile regula las relaciones jurídicas entre padres, hijos, parejas y otros vínculos familiares. En esta Guía 2026, revisamos qué abarca, cuáles son los trámites más comunes, cómo funcionan los juicios y qué puedes hacer en caso de conflicto.",
      category: "Derecho de Familia",
      author: "LegalUp",
      date: "25 de Febrero, 2026",
      readTime: "15 min",
      image: "/assets/derecho-de-familia-chile-2026.png"
    },
    {
      id: "como-calcular-tu-finiquito-chile-2026",
      title: "¿Cómo calcular tu finiquito en Chile? Guía 2026 paso a paso",
      excerpt: "Calcular el finiquito en Chile puede generar dudas, especialmente porque intervienen distintos tipos de indemnizaciones, vacaciones pendientes y pagos proporcionales. Te explicamos cómo calcularlo correctamente.",
      category: "Derecho Laboral",
      author: "LegalUp",
      date: "18 de Febrero, 2026",
      readTime: "12 min",
      image: "/assets/finiquito-chile-2026.png"
    },
    {
      id: "me-subieron-el-arriendo-que-hago-2026",
      title: "Me subieron el arriendo, ¿qué hago? Guía completa para arrendatarios en Chile (2026)",
      excerpt: "Cuando llega el aviso de que subirá el valor del arriendo, el estrés aparece de inmediato. Pero no siempre el aumento es válido, y en Chile existen reglas claras para proteger al arrendatario.",
      category: "Derecho Inmobiliario",
      author: "LegalUp",
      date: "13 de Enero, 2026",
      readTime: "8 min",
      image: "/assets/arriendo-chile-2026.png"
    }
  ], []);

  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const categories = ["Derecho Inmobiliario", "Derecho Laboral", "Derecho de Familia", "Derecho Penal", "Derecho Civil"];

  const filteredArticles = useMemo(() => {
    let result = articles;
    if (selectedCategory) {
      result = result.filter(article => article.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        article =>
          article.title.toLowerCase().includes(query) ||
          article.excerpt.toLowerCase().includes(query) ||
          article.category.toLowerCase().includes(query)
      );
    }
    return result;
  }, [selectedCategory, searchQuery, articles]);

  // `articles` debe mantenerse ordenado del más reciente al más antiguo: el destacado es siempre el primero.
  const featuredArticle = useMemo(() => {
    // La búsqueda no afecta el destacado, siempre mostramos el primero (de categoría si hay, o general)
    if (selectedCategory) {
      return filteredArticles[0];
    }
    return articles[0];
  }, [selectedCategory, filteredArticles, articles]);

  const recentArticles = useMemo(() => {
    if (searchQuery.trim()) {
      return filteredArticles; // Mostrar todos los resultados de búsqueda en la sección de abajo
    }
    if (selectedCategory) {
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
      <div className="bg-green-900 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 text-white mb-4">
            <Link to="/" className="hover:text-white transition-colors">
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
        
        {/* Featured Article */}
        {/* Featured Article */}
        {featuredArticle && (
          <div key={featuredArticle.id} className="mb-12">
            <div 
              className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 cursor-pointer hover:shadow-xl transition-shadow group"
              onClick={() => navigate(`/blog/${featuredArticle.id}`)}
            >
              <div className="md:flex">
                <div className="md:w-1/3">
                  <div className="h-48 md:h-full flex md:py-8 items-center justify-center md:pl-8">
                    <img 
                      className="h-full w-full object-cover rounded-t-xl md:rounded-xl" 
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

        {/* Search and Categories */}
        <div className="mb-8 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar artículos..."
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-900 focus:border-transparent"
            />
          </div>

          {/* Categories Pills */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className={selectedCategory === null ? "bg-gray-900" : ""}
            >
              Todos
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category ? "bg-gray-900" : ""}
              >
                {category}
              </Button>
            ))}
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
            {(searchQuery || selectedCategory) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory(null);
                }}
                className="ml-2 text-green-700 hover:underline font-medium"
              >
                Limpiar filtros
              </button>
            )}
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
              onClick={() => window.location.href = '/consulta'}
            >
              Consultar con Abogado Ahora
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="bg-white border-gray-900 text-gray-900 hover:text-white hover:bg-green-900 px-8 py-3"
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
