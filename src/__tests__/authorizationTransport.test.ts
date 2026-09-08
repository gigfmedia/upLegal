import { beforeEach,describe,it,expect,vi } from 'vitest';
const getSession=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/supabaseClient',()=>({supabase:{auth:{getSession}}}));
import { createSubscriptionPreference,cancelSubscription,getCompanySubscription } from '@/services/empresaService';
describe('Empresas subscription clients use authenticated API',()=>{
 beforeEach(()=>{vi.restoreAllMocks();getSession.mockResolvedValue({data:{session:{access_token:'session-token'}},error:null})});
 for(const action of ['create','cancel','get'])it(`${action} carries Bearer session token`,async()=>{
  const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({subscription:{id:'S'},initPoint:'https://mp.example.test'})));
  if(action==='create')await createSubscriptionPreference('C','P');
  if(action==='cancel')await cancelSubscription('S');
  if(action==='get')expect(await getCompanySubscription('C')).toEqual({id:'S'});
  const [url,options]=fetch.mock.calls[0];expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer session-token');
  expect(url).toBe(action==='create'?'/api/empresas/subscription/create':action==='cancel'?'/api/empresas/subscription/S/cancel':'/api/empresas/subscription/C');
 });
 it('missing session cannot create checkout',async()=>{getSession.mockResolvedValue({data:{session:null},error:null});const fetch=vi.spyOn(globalThis,'fetch');await expect(createSubscriptionPreference('C','P')).rejects.toThrow('iniciar sesión');expect(fetch).not.toHaveBeenCalled()});
});
