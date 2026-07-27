import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft } from "lucide-react";

import { articles } from "@/data/blogArticles";

interface BlogNavigationProps {
  currentArticleId: string;
}

export const BlogNavigation = ({ currentArticleId }: BlogNavigationProps) => {
  const currentArticle = articles.find(a => a.id === currentArticleId);
  const category = currentArticle?.category;
  const cluster = currentArticle?.cluster;

  // Priority 1: Same cluster
  let relatedArticles = cluster
    ? articles.filter(a => a.cluster === cluster && a.id !== currentArticleId)
    : [];

  // If no cluster or single-article cluster, fall back to same category
  if (relatedArticles.length < 2 && category) {
    const categoryArticles = articles.filter(a => a.category === category && a.id !== currentArticleId);
    relatedArticles = [...relatedArticles, ...categoryArticles];
  }

  // Remove duplicates
  relatedArticles = Array.from(new Set(relatedArticles.map(a => a.id)))
    .map(id => articles.find(a => a.id === id)!);

  // Hide if no related articles at all
  if (relatedArticles.length < 1) {
    return null;
  }

  const currentIndex = relatedArticles.findIndex(a => a.id === currentArticleId);
  const showPrev = currentIndex >= 0 && currentIndex < relatedArticles.length - 1;
  const showNext = relatedArticles.length > 1;

  let nextArticle = showNext
    ? (currentIndex > 0 ? relatedArticles[currentIndex - 1] : currentIndex === -1 ? relatedArticles[0] : relatedArticles[currentIndex - 1])
    : undefined;

  let prevArticle = showPrev
    ? relatedArticles[currentIndex + 1]
    : undefined;



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
