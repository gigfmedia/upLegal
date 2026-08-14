import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    // Only track in browser environment and NOT on localhost
    if (typeof window === 'undefined') return;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;

    const trackPageView = async () => {
      try {
        // Get or create persistent visitor ID
        let visitorId = localStorage.getItem('legalup_visitor_id');
        if (!visitorId) {
          visitorId = window.crypto?.randomUUID?.() || 
                      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          localStorage.setItem('legalup_visitor_id', visitorId);
        }

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
            visitor_id: visitorId,
            user_agent: userAgent,
            referrer: referrer
          }
        ]);
      } catch (error) {
        console.error('Error tracking page view:', error);
      }
    };

    // Track the page view de forma diferida: el insert a Supabase y la llamada
    // a auth.getUser() compiten con el primer render de la landing. Se ejecutan
    // cuando el navegador está idle (requestIdleCallback) o tras un timeout de
    // respaldo, sin perder el tracking.
    const trackWhenIdle = () => {
      trackPageView();
    };
    const win = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void };
    if (typeof win.requestIdleCallback === 'function') {
      win.requestIdleCallback(trackWhenIdle, { timeout: 3000 });
    } else {
      const timeoutId = win.setTimeout(trackWhenIdle, 1500);
      return () => win.clearTimeout(timeoutId);
    }
  }, [location]);

  return null;
}
