import { Helmet } from 'react-helmet-async';

interface FAQ {
  question: string;
  answer: string;
}

interface HomeGrowthHacksProps {
  faqs: FAQ[];
}

export const HomeGrowthHacks = ({ faqs }: HomeGrowthHacksProps) => {
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
    },
    {
      "@context": "https://schema.org",
      "@type": "LegalService",
      "name": "LegalUp",
      "description": "Plataforma de asesoría legal online en Chile que conecta personas con abogados verificados para resolver consultas jurídicas de forma rápida y confiable.",
      "url": "https://legalup.cl",
      "logo": "https://legalup.cl/assets/logo.png",
      "areaServed": {
        "@type": "Country",
        "name": "Chile"
      },
      "serviceType": "Asesoría legal online",
      "sameAs": [
        "https://www.instagram.com/legalupcl",
        "https://www.tiktok.com/@legalupcl"
      ]
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

  return (
    <Helmet>
      {/* FASE 5.18A: título explícito idéntico al del shell (index.html).
          Sin esto, volver al home por navegación SPA deja el <title> del
          artículo anterior y el page_view sale con título stale. El valor
          servido no cambia: es byte-idéntico al shell. */}
      <title>LegalUp — Consulta con abogados online en Chile</title>
      {/* Render schemas individually to avoid crashing crawler pixels expecting objects */}
      {structuredDataArray.map((data, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
};
