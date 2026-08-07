import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft } from "lucide-react";

import { articles } from "@/data/blogArticles";

interface BlogNavigationProps {
  currentArticleId: string;
}

const MONTHS: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
  julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
};

function parseDate(dateStr: string): Date {
  const match = dateStr.match(/(\d+)\s+de\s+(\w+)\s*,\s*(\d+)/);
  if (!match) return new Date(0);
  const [, day, month, year] = match;
  return new Date(`${year}-${MONTHS[month.toLowerCase()]}-${day.padStart(2, '0')}`);
}

export const BlogNavigation = ({ currentArticleId }: BlogNavigationProps) => {
  const currentArticle = articles.find(a => a.id === currentArticleId);
  const category = currentArticle?.category;
  const cluster = currentArticle?.cluster;

  let relatedArticles: typeof currentArticle[] = [];

  if (cluster) {
    relatedArticles = articles.filter(a => a.cluster === cluster);
    if (relatedArticles.length < 2 && category) {
      relatedArticles = articles.filter(a => a.category === category);
    }
  } else if (category) {
    relatedArticles = articles.filter(a => a.category === category);
  }

  const sorted = [...relatedArticles].sort(
    (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()
  );

  const currentIndex = sorted.findIndex(a => a.id === currentArticleId);

  let prevArticle: typeof currentArticle | undefined;
  let nextArticle: typeof currentArticle | undefined;

  if (sorted.length >= 2 && currentIndex >= 0) {
    const total = sorted.length;
    prevArticle = sorted[(currentIndex - 1 + total) % total];
    nextArticle = sorted[(currentIndex + 1) % total];
  }

  if (!prevArticle && !nextArticle) return null;

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
                  width={400}
                  height={300}
                  loading="lazy"
                  decoding="async"
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
                  width={400}
                  height={300}
                  loading="lazy"
                  decoding="async"
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
