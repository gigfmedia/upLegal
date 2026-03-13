import { useEffect } from 'react';

interface FAQ {
  question: string;
  answer: string;
}

interface HomeGrowthHacksProps {
  faqs: FAQ[];
}

export const HomeGrowthHacks = ({ faqs }: HomeGrowthHacksProps) => {
  useEffect(() => {
    // 1. JSON-LD (Rich Snippets for Home Page)
    const structuredDataArray: any[] = [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "LegalUp",
        "url": "https://legalup.cl",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://legalup.cl/search?q={search_term_string}",
          "query-input": "required name=search_term_string"
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
    script.id = 'home-growth-hacks-jsonld';
    script.textContent = JSON.stringify(structuredDataArray);
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.getElementById('home-growth-hacks-jsonld');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [faqs]);

  return null;
};
