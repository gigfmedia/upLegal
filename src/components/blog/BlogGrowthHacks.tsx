import { Helmet } from 'react-helmet-async';

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
  const structuredDataArray: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": title,
      "description": description,
      "image": `${window.location.origin}${image}`,
      "author": {
        "@type": "Organization",
        "name": "LegalUp",
        "url": "https://legalup.cl"
      },
      "publisher": {
        "@type": "Organization",
        "name": "LegalUp",
        "logo": {
          "@type": "ImageObject",
          "url": "https://legalup.cl/assets/logo.png"
        }
      },
      "datePublished": `${datePublished}T00:00:00Z`,
      "dateModified": `${dateModified}T00:00:00Z`,
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

  return (
    <Helmet>
      <title>{title} | LegalUp</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${window.location.origin}${image}`} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="article" />
      <meta property="og:site_name" content="LegalUp" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${window.location.origin}${image}`} />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredDataArray)}
      </script>
    </Helmet>
  );
};
