import { supabase } from './supabase';

// Track page view for analytics
export const trackPageView = async (path: string, title?: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('page_views').insert({
      page_path: path,
      page_title: title || document.title,
      user_id: user?.id || null,
      user_agent: navigator.userAgent,
      referrer: document.referrer,
    });
  } catch (error) {
    // Silently fail to not break user experience
    console.warn('Failed to track page view:', error);
  }
};

// Track payment event for analytics
export const trackPaymentEvent = async (
  eventType: 'started' | 'success' | 'failure' | 'pending',
  amount?: number,
  metadata?: Record<string, unknown>
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('payment_events').insert({
      event_type: eventType,
      amount: amount,
      status: eventType === 'success' ? 'completed' : eventType === 'failure' ? 'failed' : 'processing',
      metadata: metadata || {},
      user_id: user?.id || null,
    });
  } catch (error) {
    console.warn('Failed to track payment event:', error);
  }
};

// Log error for analytics
export const logError = async (
  type: string,
  message: string,
  details?: Record<string, unknown>,
  path?: string,
  isDatabaseError = false
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('error_logs').insert({
      type,
      message,
      details,
      path,
      user_id: user?.id || null,
      is_database_error: isDatabaseError,
    });
  } catch (error) {
    console.warn('Failed to log error:', error);
  }
};
