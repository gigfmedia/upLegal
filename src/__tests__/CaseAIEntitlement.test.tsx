import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
const state=vi.hoisted(()=>({ai:null as Record<string,unknown>|null,pro:null as Record<string,unknown>|null}));
vi.mock('@/contexts/AuthContext/clean/useAuth',()=>({useAuth:()=>({user:{id:'L1'}})}));
vi.mock('@/lib/supabaseClient',()=>({supabase:{}}));
vi.mock('@tanstack/react-query',()=>({
 useQuery:({queryKey}:{queryKey:string[]})=>({data:queryKey[0]==='ai-subscription'?state.ai:state.pro,isLoading:false}),
 useMutation:vi.fn(),useQueryClient:vi.fn(),
}));
import { useAIFeatureAccess } from '@/hooks/useAISubscription';
beforeEach(()=>{cleanup();state.ai=null;state.pro=null;});
describe('Case UX uses existing combined entitlement',()=>{
 it('no subscription does not gain AI from case/workspace existence',()=>{const {result}=renderHook(useAIFeatureAccess);expect(result.current.canUse('document_analysis')).toBe(false);expect(result.current.canUse('case_chat')).toBe(false);expect(result.current.canUse('case_analysis')).toBe(false);});
 it.each(['active','trialing'])('legacy AI %s still grants core features without Pro',status=>{
  state.ai={status,plan:'essential',current_period_end:'2099-01-01',trial_ends_at:'2099-01-01'};
  const {result}=renderHook(useAIFeatureAccess);expect(result.current.hasAccess).toBe(true);expect(result.current.canUse('document_analysis')).toBe(true);expect(result.current.canUse('case_analysis')).toBe(true);
 });
 it('Pro limited grants core and denies advanced features',()=>{
  state.pro={status:'active',current_period_end:'2099-01-01'};const {result}=renderHook(useAIFeatureAccess);
  for(const feature of ['document_analysis','case_chat','case_analysis'] as const)expect(result.current.canUse(feature)).toBe(true);
  for(const feature of ['jurisprudence','workflow_generation','document_drafting'] as const)expect(result.current.canUse(feature)).toBe(false);
 });
});
