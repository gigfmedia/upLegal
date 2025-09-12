import { useState, useEffect } from 'react';

export const useFreeConsultationTracker = () => {
  const [isFirstFree, setIsFirstFree] = useState(true);

  useEffect(() => {
    // Check localStorage to see if they've used their free consultation
    const hasUsedFreeConsultation = localStorage.getItem('hasUsedFreeConsultation');
    if (hasUsedFreeConsultation === 'true') {
      setIsFirstFree(false);
    }
  }, []);

  const markConsultationUsed = () => {
    localStorage.setItem('hasUsedFreeConsultation', 'true');
    setIsFirstFree(false);
  };

  return { isFirstFree, markConsultationUsed };
};
