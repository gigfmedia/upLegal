import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    // Only track in browser environment
    if (typeof window === 'undefined') return;

    const trackPageView = async () => {
      try {
        // Get user ID if logged in
        const { data: { user } } = await supabase.auth.getUser();
        
        // Get page information
        const pagePath = location.pathname + location.search;
        const pageTitle = document.title;
        const userAgent = navigator.userAgent;
        const referrer = document.referrer || null;

        // Send to Supabase
        await supabase.from('page_views').insert([
          {
            page_path: pagePath,
            page_title: pageTitle,
            user_id: user?.id || null,
            user_agent: userAgent,
            referrer: referrer
          }
        ]);
      } catch (error) {
        console.error('Error tracking page view:', error);
      }
    };

    // Track the page view
    trackPageView();
  }, [location]);

  return null;
}
