import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface PrevArticle {
  id: string;
  title: string;
  excerpt: string;
  image: string;
}

interface BlogNavigationProps {
  prevArticle: PrevArticle;
}

export const BlogNavigation = ({ prevArticle }: BlogNavigationProps) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col md:flex-row min-h-[220px]">
        {/* Image Section */}
        <div className="md:w-1/3 relative h-48 md:h-auto">
          <img 
            src={prevArticle.image} 
            alt={prevArticle.title} 
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>

        {/* Content Section */}
        <div className="md:w-2/3 p-6 sm:p-8 flex flex-col justify-center">
          <span className="text-gray-400 text-sm font-medium mb-2 uppercase tracking-wider">
            Artículo anterior
          </span>
          
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 leading-tight">
            {prevArticle.title}
          </h3>
          
          <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-6 line-clamp-2">
            {prevArticle.excerpt}
          </p>
          
          <div className="flex justify-end sm:justify-end">
            <Link 
              to={`/blog/${prevArticle.id}`}
              className="inline-flex items-center gap-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              Leer
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
