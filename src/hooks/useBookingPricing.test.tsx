import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBookingPricing } from './useBookingPricing';
import { fetchPlatformSettings } from '@/services/platformSettings';
vi.mock('@/services/platformSettings', () => ({ fetchPlatformSettings: vi.fn() }));
function wrapper({children}) {
  return <QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>{children}</QueryClientProvider>;
}
beforeEach(()=>vi.clearAllMocks());
describe('booking configuration readiness',()=>{
 it('waits for public settings instead of allowing checkout at a default rate',async()=>{
  let resolve;
  vi.mocked(fetchPlatformSettings).mockImplementation(()=>new Promise(r=>{resolve=r;}));
  const {result}=renderHook(()=>useBookingPricing(),{wrapper});
  expect(result.current.pricingReady).toBe(false);
  resolve({client_surcharge_percent:.15,platform_fee_percent:.2,currency:'CLP'});
  await waitFor(()=>expect(result.current.pricingReady).toBe(true));
  expect(result.current.clientSurchargePercent).toBe(.15);
  expect(fetchPlatformSettings).toHaveBeenCalledWith(true);
 });
 it('does not allow checkout after configuration failure',async()=>{
  vi.mocked(fetchPlatformSettings).mockRejectedValue(new Error('unavailable'));
  const {result}=renderHook(()=>useBookingPricing(),{wrapper});
  await waitFor(()=>expect(result.current.pricingError).toBe(true),{timeout:2500});
  expect(result.current.pricingReady).toBe(false);
 });
});
