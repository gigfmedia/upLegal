import { useEffect } from 'react';

interface FAQ {
  question: string;
  answer: string;
}

interface BlogGrowthHacksProps {
  title: string;
  description: string;
  image: string;
  url: string;
  datePublished: string;
  dateModified: string;
  faqs?: FAQ[];
}

export const BlogGrowthHacks = ({
  title,
  description,
  image,
  url,
  datePublished,
  dateModified,
  faqs
}: BlogGrowthHacksProps) => {
  useEffect(() => {
    // 1. Basic SEO
    document.title = `${title} | LegalUp`;
    
    const setMeta = (name: string, content: string, property = false) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector);
      if (!meta) {
        meta = document.createElement('meta');
        if (property) meta.setAttribute('property', name);
        else meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    setMeta('description', description);
    
    // 2. Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    // 3. Open Graph (Viral Sharing)
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:image', `${window.location.origin}${image}`, true);
    setMeta('og:url', url, true);
    setMeta('og:type', 'article', true);
    setMeta('og:site_name', 'LegalUp', true);

    // 4. Twitter
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', `${window.location.origin}${image}`);

    // 5. JSON-LD (Rich Snippets)
    const structuredDataArray: any[] = [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": description,
        "image": `${window.location.origin}${image}`,
        "author": {
          "@type": "Organization",
          "name": "LegalUp"
        },
        "publisher": {
          "@type": "Organization",
          "name": "LegalUp",
          "logo": {
            "@type": "ImageObject",
            "url": "https://legalup.cl/logo.png"
          }
        },
        "datePublished": datePublished,
        "dateModified": dateModified,
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": url
        }
      }
    ];

    if (faqs && faqs.length > 0) {
      structuredDataArray.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer
          }
        }))
      });
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'blog-growth-hacks-jsonld';
    script.textContent = JSON.stringify(structuredDataArray);
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.getElementById('blog-growth-hacks-jsonld');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [title, description, image, url, datePublished, dateModified, faqs]);

  return null;
};
