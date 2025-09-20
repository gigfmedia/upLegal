import { useState, useEffect } from 'react';

interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number;
}

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load services from localStorage
    const loadServices = () => {
      try {
        const savedServices = localStorage.getItem('lawyerServices');
        if (savedServices) {
          setServices(JSON.parse(savedServices));
        }
      } catch (error) {
        console.error('Error loading services:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadServices();
    
    // Listen for storage events to sync across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lawyerServices') {
        loadServices();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return { services, isLoading };
}
