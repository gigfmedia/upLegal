import { useState, useEffect } from "react";

export const ReadingProgressBar = () => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = window.scrollY;
      
      // Find the FAQ section element
      const faqSection = document.querySelector('[data-faq-section]');
      const windowHeight = faqSection 
        ? (faqSection as HTMLElement).offsetTop + (faqSection as HTMLElement).offsetHeight - window.innerHeight
        : document.documentElement.scrollHeight - window.innerHeight;
      
      const scrollProgress = Math.min((totalScroll / windowHeight) * 100, 100);
      setWidth(scrollProgress);
    };

    // Initial check
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <div className="fixed top-16 left-0 w-full z-[60] h-[3px] pointer-events-none">
      <div 
        className="h-full bg-blue-700 transition-all duration-150 ease-out shadow-[0_0_8px_rgba(29,78,216,0.3)]" 
        style={{ width: `${width}%` }} 
      />
    </div>
  );
};
