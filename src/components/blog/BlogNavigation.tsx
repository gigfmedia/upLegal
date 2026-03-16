import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft } from "lucide-react";

interface ArticleInfo {
  id: string;
  title: string;
  excerpt: string;
  image: string;
}

interface BlogNavigationProps {
  prevArticle?: ArticleInfo;
  nextArticle?: ArticleInfo;
}

export const BlogNavigation = ({ prevArticle, nextArticle }: BlogNavigationProps) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        {prevArticle ? (
          <Link 
            to={`/blog/${prevArticle.id}`}
            className="group block bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all h-full"
          >
            <div className="flex h-full">
              <div className="w-1/3 relative hidden sm:block">
                <img 
                  src={prevArticle.image} 
                  alt={prevArticle.title} 
                  className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                />
              </div>
              <div className="w-full sm:w-2/3 p-6 flex flex-col justify-between">
                <div>
                  <span className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    <ArrowLeft className="h-3 w-3" />
                    Anterior
                  </span>
                  <h4 className="text-gray-900 font-bold leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {prevArticle.title}
                  </h4>
                </div>
              </div>
            </div>
          </Link>
        ) : <div />}

        {nextArticle ? (
          <Link 
            to={`/blog/${nextArticle.id}`}
            className="group block bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all h-full"
          >
            <div className="flex h-full flex-row-reverse">
              <div className="w-1/3 relative hidden sm:block">
                <img 
                  src={nextArticle.image} 
                  alt={nextArticle.title} 
                  className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                />
              </div>
              <div className="w-full sm:w-2/3 p-6 flex flex-col justify-between text-right">
                <div>
                  <span className="flex items-center justify-end gap-2 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-2">
                    Siguiente
                    <ArrowRight className="h-3 w-3" />
                  </span>
                  <h4 className="text-gray-900 font-bold leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {nextArticle.title}
                  </h4>
                </div>
              </div>
            </div>
          </Link>
        ) : <div />}
      </div>
    </div>
  );
};
