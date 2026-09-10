import { useQuery } from '@tanstack/react-query';
import { fetchPlatformSettings } from '@/services/platformSettings';

/** Public settings read; never silently quote defaults on a failed query. */
export function useBookingPricing() {
  const query = useQuery({
    queryKey: ['booking-pricing-settings'],
    queryFn: () => fetchPlatformSettings(true),
    staleTime: 0,
    retry: 1,
  });
  return {
    clientSurchargePercent: query.data?.client_surcharge_percent ?? 0.1,
    pricingReady: !!query.data && !query.isError,
    pricingError: query.isError,
  };
}
