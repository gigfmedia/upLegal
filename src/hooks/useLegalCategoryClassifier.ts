import { useState } from "react";

type LegalCategory =
  | "Derecho Arrendamiento"
  | "Derecho Laboral"
  | "Derecho Familia"
  | "Derecho Penal"
  | "Derecho Civil"
  | "Derecho del Consumidor";

const CATEGORY_SLUGS: Record<LegalCategory, string> = {
  "Derecho Arrendamiento": "arriendo",
  "Derecho Laboral": "laboral",
  "Derecho Familia": "familia",
  "Derecho Penal": "penal",
  "Derecho Civil": "civil",
  "Derecho del Consumidor": "consumidor",
};

const getApiBaseUrl = (): string => {
  const base =
    (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL ||
    (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_URL ||
    "http://localhost:3001";
  return (base as string).replace(/\/+$/, "");
};

export function useLegalCategoryClassifier() {
  const [isClassifying, setIsClassifying] = useState(false);

  const classify = async (userText: string): Promise<{
    category: LegalCategory;
    slug: string;
  }> => {
    setIsClassifying(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/legal-category/classify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: userText }),
      });

      const data = await response.json();
      const rawCategory = (data.category as string)?.trim() as LegalCategory;

      const validCategories = Object.keys(CATEGORY_SLUGS) as LegalCategory[];
      const category = validCategories.includes(rawCategory)
        ? rawCategory
        : "Derecho Civil";

      if (typeof window !== "undefined" && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
        (window as unknown as { gtag: (...args: unknown[]) => void }).gtag("event", "case_classified", {
          category,
          text_length: userText.length,
        });
      }

      return {
        category,
        slug: CATEGORY_SLUGS[category],
      };
    } catch (error) {
      console.error("[LegalClassifier] Error:", error);
      return {
        category: "Derecho Civil",
        slug: "",
      };
    } finally {
      setIsClassifying(false);
    }
  };

  return { classify, isClassifying };
}

export type { LegalCategory };
export { CATEGORY_SLUGS };