import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft } from "lucide-react";

import { articles } from "@/data/blogArticles";

interface BlogNavigationProps {
  currentArticleId: string;
}

export const BlogNavigation = ({ currentArticleId }: BlogNavigationProps) => {
  const currentArticle = articles.find(a => a.id === currentArticleId);
  const category = currentArticle?.category;
  
  // Filter articles to stay within the same category for navigation
  const categoryArticles = category 
    ? articles.filter(a => a.category === category)
    : articles;

  const currentIndex = categoryArticles.findIndex(a => a.id === currentArticleId);
  
  // Articles are ordered from newest to oldest in the array
  // If at the beginning (newest), "Next" (newer) loops to the end (oldest)
  let nextArticle = categoryArticles.length > 1
    ? (currentIndex > 0 ? categoryArticles[currentIndex - 1] : categoryArticles[categoryArticles.length - 1])
    : undefined;

    
  // If at the end (oldest), "Prev" (older) loops to the beginning (newest)
  let prevArticle = categoryArticles.length > 1
    ? (currentIndex < categoryArticles.length - 1 ? categoryArticles[currentIndex + 1] : categoryArticles[0])
    : undefined;

  // If next and prev are the same (happens with only 2 articles), hide prev to avoid redundancy
  // We keep "Next" to encourage forward navigation
  if (nextArticle && prevArticle && nextArticle.id === prevArticle.id) {
    prevArticle = undefined;
  }



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
                  <h4 className="text-green-900 font-bold leading-tight line-clamp-2 group-hover:text-green-600 transition-colors">
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
                  <span className="flex items-center justify-end gap-2 text-green-600 text-xs font-semibold uppercase tracking-wider mb-2">
                    Siguiente
                    <ArrowRight className="h-3 w-3" />
                  </span>
                  <h4 className="text-green-900 font-bold leading-tight line-clamp-2 group-hover:text-green-600 transition-colors">
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
