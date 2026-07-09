import { articles } from '@/data/blogArticles';

interface ReadTimeProps {
  slug: string;
}

export const ReadTime = ({ slug }: ReadTimeProps) => {
  const article = articles.find(a => a.id === slug);
  if (!article) return null;
  return <span>Tiempo de lectura: {article.readTime}</span>;
};
