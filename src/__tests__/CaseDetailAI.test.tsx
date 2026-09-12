import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

const state = vi.hoisted(() => ({ caseData: null as Record<string, unknown> | null, allowed: true, docs: [] as Record<string, unknown>[], provision: vi.fn(), upload: vi.fn(), analyze: vi.fn(), toast: vi.fn() }));
vi.mock('@/hooks/useLawyerCases', () => ({
  useLawyerCase: () => ({caseData:state.caseData,loading:false,error:null}),
  useLawyerCases: () => ({updateCase:vi.fn(),deleteCase:vi.fn()}),
  useProvisionAIWorkspace: () => ({provision:state.provision}),
}));
vi.mock('@/hooks/useLawyerClients', () => ({useLawyerClients:()=>({clients:[]})}));
vi.mock('@/hooks/useAISubscription', () => ({useAIFeatureAccess:()=>({canUse:()=>state.allowed,isLoading:false})}));
vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({useAuth:()=>({user:{id:'L1'}})}));
vi.mock('@/hooks/use-toast', () => ({useToast:()=>({toast:vi.fn()})}));
vi.mock('posthog-js',()=>({default:{capture:vi.fn()}}));
vi.mock('sonner',()=>({toast:{success:vi.fn(),error:(...args:unknown[])=>state.toast(...args)}}));
vi.mock('@/lib/supabaseClient',()=>({supabase:{
  storage:{from:()=>({upload:state.upload})},
  from:(table:string)=>{
    let payload:Record<string,unknown>|undefined;
    const q={select:()=>q,eq:()=>q,order:()=>q,delete:()=>q,insert:(p:Record<string,unknown>)=>{payload=p;return q;},
      single:async()=>{ const doc={...payload};state.docs.push(doc);return {data:doc,error:null};},
      then:(resolve:(v:unknown)=>void)=>Promise.resolve({data:table==='bookings'?[]:state.docs,count:state.docs.length,error:null}).then(resolve)};
    return q;
  },
}}));
vi.mock('@/hooks/useAIDocuments',async()=>{
 const actual=await vi.importActual<Record<string,unknown>>('@/hooks/useAIDocuments');
 return {...actual,useAIDocuments:()=>({data:state.docs,isLoading:false,isError:false,refetch:vi.fn()}),useAIDocumentAnalysis:()=>({data:null}),useAnalyzeAIDocument:()=>({mutate:state.analyze,isPending:false})};
});
vi.mock('@/components/legalup-ai/AIDocumentList',()=>({AIDocumentList:({documents,onSelect}:{documents:{id:string;original_filename:string}[];onSelect:(id:string)=>void})=><div>{documents.map(doc=><button key={doc.id} onClick={()=>onSelect(doc.id)}>{doc.original_filename}</button>)}</div>}));
vi.mock('@/components/legalup-ai/AIAnalysisView',()=>({AIAnalysisView:({onAnalyze}:{onAnalyze:()=>void})=><button onClick={onAnalyze}>Analizar</button>}));
vi.mock('@/components/legalup-ai/AICaseWorkspaceContent',()=>({AICaseWorkspaceContent:({workspaceId}:{workspaceId:string})=><div data-testid="ai-content">{workspaceId}</div>}));
vi.mock('@/components/legalup-pro/ProPricingModal',()=>({ProPricingModal:({open}:{open:boolean})=>open?<div>Planes Pro</div>:null}));
import CaseDetailPage from '@/pages/lawyer/CaseDetailPage';
import { AIDocumentUpload } from '@/components/legalup-ai/AIDocumentUpload';
import { useCaseDocumentWorkspace } from '@/hooks/useCaseDocumentWorkspace';

function wrapper(children:React.ReactNode){return <QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}})}>{children}</QueryClientProvider>;}
function renderCase(tab='documents'){return render(wrapper(<MemoryRouter initialEntries={[`/lawyer/cases/C1?tab=${tab}`]}><Routes><Route path="/lawyer/cases/:caseId" element={<CaseDetailPage/>}/></Routes></MemoryRouter>));}
function drop(container:HTMLElement,name='one.pdf'){fireEvent.change(container.querySelector('input[type=file]')!,{target:{files:[new File(['pdf'],name,{type:'application/pdf'})]}});}
beforeEach(()=>{cleanup();vi.clearAllMocks();state.docs=[];state.allowed=true;state.caseData={id:'C1',title:'Caso',status:'new',source:'LAWYER_DIRECT',ai_workspace_id:null,created_at:'2026-01-01',updated_at:'2026-01-01'};state.provision.mockResolvedValue({workspace:{id:'W1'},created:true});state.upload.mockResolvedValue({error:null});});

describe('4.30B case documents',()=>{
 it('first file provisions once and uploads automatically; subsequent files reuse workspace',async()=>{
  const view=renderCase();expect(state.provision).not.toHaveBeenCalled();
  drop(view.container);await screen.findByText('one.pdf');
  expect(state.provision).toHaveBeenCalledExactlyOnceWith('C1');expect(state.upload).toHaveBeenCalledTimes(1);
  expect(state.upload.mock.calls[0][0]).toMatch(/^L1\/W1\//);expect(state.docs[0].workspace_id).toBe('W1');expect(state.analyze).not.toHaveBeenCalled();
  drop(view.container,'two.pdf');await screen.findByText('two.pdf');drop(view.container,'three.pdf');await screen.findByText('three.pdf');
  expect(state.provision).toHaveBeenCalledTimes(1);expect(state.upload).toHaveBeenCalledTimes(3);
  fireEvent.click(screen.getByText('Analizar'));expect(state.analyze).toHaveBeenCalledTimes(1);
 });
 it('existing workspace skips provisioning',async()=>{state.caseData!.ai_workspace_id='OLD';const v=renderCase();drop(v.container);await screen.findByText('one.pdf');expect(state.provision).not.toHaveBeenCalled();expect(state.docs[0].workspace_id).toBe('OLD');});
 it('failure prevents upload and next attempt retries',async()=>{state.provision.mockRejectedValueOnce(new Error('offline'));const v=renderCase();drop(v.container);await waitFor(()=>expect(state.toast).toHaveBeenCalled());expect(state.upload).not.toHaveBeenCalled();expect(state.docs).toHaveLength(0);drop(v.container);await screen.findByText('one.pdf');expect(state.provision).toHaveBeenCalledTimes(2);expect(state.upload).toHaveBeenCalledTimes(1);});
 it('duplicate file selection while provisioning uploads only once',async()=>{let finish:(v:unknown)=>void=()=>{};state.provision.mockImplementation(()=>new Promise(r=>{finish=r;}));const v=renderCase();drop(v.container);await waitFor(()=>expect(state.provision).toHaveBeenCalledTimes(1));drop(v.container);finish({workspace:{id:'W1'}});await screen.findByText('one.pdf');expect(state.provision).toHaveBeenCalledTimes(1);expect(state.upload).toHaveBeenCalledTimes(1);});
 it('Pro no workspace: document-first CTA switches outer tab without provisioning',async()=>{renderCase('ai');expect(screen.queryByText(/Activar IA/i)).not.toBeInTheDocument();fireEvent.click(screen.getByText('Ir a Documentos'));await screen.findByText('Agrega documentos a este caso');expect(state.provision).not.toHaveBeenCalled();});
 it.each(['LAWYER_DIRECT','LEGALUP_MARKETPLACE'])('%s without access: paywall before provisioning; documents still upload',async source=>{state.allowed=false;state.caseData!.source=source;const v=renderCase('ai');fireEvent.click(screen.getByText('Ver LegalUp Pro'));expect(screen.getByText('Planes Pro')).toBeInTheDocument();expect(state.provision).not.toHaveBeenCalled();fireEvent.mouseDown(screen.getByRole('tab',{name:'Documentos'}),{button:0,ctrlKey:false});await screen.findByText('Agrega documentos a este caso');drop(v.container);await screen.findByText('one.pdf');expect(state.upload).toHaveBeenCalledTimes(1);expect(screen.queryByText('Analizar')).not.toBeInTheDocument();expect(state.analyze).not.toHaveBeenCalled();});
 it('workspace alone does not unlock IA',()=>{state.allowed=false;state.caseData!.ai_workspace_id='W1';renderCase('ai');expect(screen.getByText('Ver LegalUp Pro')).toBeInTheDocument();expect(screen.queryByTestId('ai-content')).not.toBeInTheDocument();expect(state.provision).not.toHaveBeenCalled();});
 it('existing entitled workspace renders unchanged AI content',()=>{state.caseData!.ai_workspace_id='W1';renderCase('ai');expect(screen.getByTestId('ai-content')).toHaveTextContent('W1');expect(state.provision).not.toHaveBeenCalled();});
 it('overview never provisions',()=>{renderCase('overview');expect(state.provision).not.toHaveBeenCalled();});
 it('preserves authentication errors',async()=>{state.provision.mockRejectedValue(Object.assign(new Error('Sesión expirada'),{status:401}));const v=renderCase();drop(v.container);await waitFor(()=>expect(state.toast).toHaveBeenCalledWith('Sesión expirada'));expect(state.upload).not.toHaveBeenCalled();});
 it('invalid link is not replaced from frontend',async()=>{state.provision.mockRejectedValue(Object.assign(new Error('invalid link'),{status:409,code:'AI_WORKSPACE_LINK_INVALID'}));const v=renderCase();drop(v.container);await waitFor(()=>expect(state.toast).toHaveBeenCalled());expect(state.provision).toHaveBeenCalledTimes(1);expect(state.upload).not.toHaveBeenCalled();});
 it('legacy standalone upload still uses supplied ID',async()=>{const uploaded=vi.fn();const v=render(wrapper(<AIDocumentUpload workspaceId="LEGACY" onUploaded={uploaded}/>));drop(v.container);await waitFor(()=>expect(uploaded).toHaveBeenCalled());expect(state.provision).not.toHaveBeenCalled();expect(state.docs[0].workspace_id).toBe('LEGACY');expect(state.analyze).not.toHaveBeenCalled();});
 it('concurrent ensure calls share provisioning promise',async()=>{
  function Probe(){const {ensureWorkspace}=useCaseDocumentWorkspace('C1',null);const [done,setDone]=useState(false);return <button onClick={()=>Promise.all([ensureWorkspace(),ensureWorkspace()]).then(()=>setDone(true))}>{done?'done':'start'}</button>;}
  render(<Probe/>);fireEvent.click(screen.getByText('start'));await screen.findByText('done');expect(state.provision).toHaveBeenCalledTimes(1);
 });
});
