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
      id: "me-subieron-el-arriendo-que-hago",
      title: "Me subieron el arriendo, ¿qué hago? Guía completa para arrendatarios en Chile (2026)",
      excerpt: "Cuando llega el aviso de que subirá el valor del arriendo, el estrés aparece de inmediato. Pero no siempre el aumento es válido, y en Chile existen reglas claras para proteger al arrendatario.",
      category: "Derecho Inmobiliario",
      author: "LegalUp",
      date: "13 de Enero, 2026",
      readTime: "8 min",
      image: "/images/arriendo-chile-2026.jpg",
      featured: true
    }
  ];

  const categories = ["Derecho Inmobiliario", "Derecho Laboral", "Derecho de Familia", "Derecho Civil", "Derecho Penal"];

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
        {articles.filter(article => article.featured).map(article => (
          <div key={article.id} className="mb-12">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="md:flex">
                <div className="md:w-1/3">
                  <div className="h-48 md:h-full flex pl-8 items-center justify-center">
                    <div className="text-white text-center">
                      <img className="h-full w-full object-cover rounded-xl" src="../assets/arriendo.jpg" alt="Derecho Inmobiliario" />
                      {/* <div className="text-sm font-medium">Derecho Inmobiliario</div> */}
                    </div>
                  </div>
                </div>
                <div className="md:w-2/3 p-8">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                      {article.category}
                    </span>
                    <span>•</span>
                    <span>Artículo Destacado</span>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    <Link 
                      to={`/blog/${article.id}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {article.title}
                    </Link>
                  </h2>
                  
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {article.excerpt}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{article.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{article.readTime}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{article.author}</span>
                      </div>
                    </div>
                    
                    <Button 
                      asChild
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Link to={`/blog/${article.id}`}>
                        Leer Artículo
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Recent Articles */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Artículos Recientes</h2>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.filter(article => !article.featured).map(article => (
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
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{article.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{article.readTime}</span>
                      </div>
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
        </div>

        {/* Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Explorar por Categorías</h2>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map(category => (
              <Card key={category} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{category}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {category === "Derecho Inmobiliario" ? "1 artículo" : "Próximamente"}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            ))}
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
