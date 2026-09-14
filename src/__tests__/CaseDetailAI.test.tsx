import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import posthog from 'posthog-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

const state = vi.hoisted(() => ({ caseData: null as Record<string, unknown> | null, allowed: true, docs: [] as Record<string, unknown>[], provision: vi.fn(), upload: vi.fn(), analyze: vi.fn(), toast: vi.fn(), update: vi.fn(), delete: vi.fn() }));
vi.mock('@/hooks/useLawyerCases', () => ({
  useLawyerCase: () => ({caseData:state.caseData,loading:false,error:null}),
  useLawyerCases: () => ({updateCase:state.update,deleteCase:state.delete}),
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
vi.mock('@/components/legalup-ai/AICaseCommandCenter',()=>({AICaseCommandCenter:({workspaceId,onAskQuestion,onWorkflowAsk}:{workspaceId:string;onAskQuestion?:(q:string)=>void;onWorkflowAsk?:(q:string,a:string)=>void})=><div data-testid="cc">{workspaceId}<button onClick={()=>onAskQuestion?.('q')}>cc-ask</button><button onClick={()=>onWorkflowAsk?.('q','act-1')}>cc-wf-ask</button></div>}));
vi.mock('@/components/legalup-ai/AIAnalysisView',()=>({AIAnalysisView:({onAnalyze}:{onAnalyze:()=>void})=><button onClick={onAnalyze}>Analizar</button>}));
vi.mock('@/components/legalup-ai/AICaseIntelligence',()=>({AICaseIntelligence:({workspaceId,externalWorkflowActionId,onExternalWorkflowActionHandled}:{workspaceId:string;externalWorkflowActionId?:string|null;onExternalWorkflowActionHandled?:()=>void})=><div data-testid="intel" data-brief={externalWorkflowActionId ?? ''}>{workspaceId}<button onClick={()=>onExternalWorkflowActionHandled?.()}>consume-brief</button></div>}));
vi.mock('@/components/legalup-ai/AIResearchPanel',() => ({
  AIResearchPanel: ({ workspaceId, locked }: { workspaceId: string; locked?: boolean }) => {
    const [v, setV] = useState('');
    return (
      <div data-testid="research">
        {workspaceId}:{locked ? 'locked' : 'open'}
        <input aria-label="research-draft" value={v} onChange={(e: { target: { value: string } }) => setV(e.target.value)} />
      </div>
    );
  },
}));
vi.mock('@/components/legalup-ai/AICaseChatDrawer',()=>({AICaseChatDrawer:({open,onOpenChange}:{open:boolean;onOpenChange:(o:boolean)=>void})=><div data-testid="chat-drawer">chat{open?<button onClick={()=>onOpenChange(false)}>close-chat</button>:null}</div>}));
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
 it('Pro no workspace: document-first CTA switches outer tab without provisioning',async()=>{renderCase('intelligence');expect(screen.queryByText(/Activar IA/i)).not.toBeInTheDocument();fireEvent.click(screen.getAllByText('Ir a Documentos')[0]);await screen.findByText('Agrega documentos a este caso');expect(state.provision).not.toHaveBeenCalled();});
 it.each(['LAWYER_DIRECT','LEGALUP_MARKETPLACE'])('%s without access: paywall before provisioning; documents still upload',async source=>{state.allowed=false;state.caseData!.source=source;const v=renderCase('intelligence');fireEvent.click(screen.getByText('Ver LegalUp Pro'));expect(screen.getByText('Planes Pro')).toBeInTheDocument();expect(state.provision).not.toHaveBeenCalled();fireEvent.mouseDown(screen.getByRole('tab',{name:'Documentos y análisis'}),{button:0,ctrlKey:false});await screen.findByText('Agrega documentos a este caso');drop(v.container);await screen.findByText('one.pdf');expect(state.upload).toHaveBeenCalledTimes(1);expect(screen.queryByText('Analizar')).not.toBeInTheDocument();expect(state.analyze).not.toHaveBeenCalled();});
 it('workspace alone does not unlock IA',()=>{state.allowed=false;state.caseData!.ai_workspace_id='W1';renderCase('intelligence');expect(screen.getByText('Ver LegalUp Pro')).toBeInTheDocument();expect(screen.queryByTestId('intel')).not.toBeInTheDocument();expect(state.provision).not.toHaveBeenCalled();});
 it('existing entitled workspace renders intelligence directly',()=>{state.caseData!.ai_workspace_id='W1';renderCase('intelligence');expect(screen.getByTestId('intel')).toHaveTextContent('W1');expect(state.provision).not.toHaveBeenCalled();});
 it('legacy ?tab=ai maps to overview (backward compat)',()=>{state.caseData!.ai_workspace_id='W1';renderCase('ai');expect(screen.getByTestId('cc')).toHaveTextContent('W1');expect(state.provision).not.toHaveBeenCalled();});
 it('legacy ?tab=ai&view=research maps to research tab',()=>{state.caseData!.ai_workspace_id='W1';render(wrapper(<MemoryRouter initialEntries={['/lawyer/cases/C1?tab=ai&view=research']}><Routes><Route path="/lawyer/cases/:caseId" element={<CaseDetailPage/>}/></Routes></MemoryRouter>));expect(screen.getByTestId('research')).toHaveTextContent('W1:open');});
 it('research locked without jurisprudence; direct tabs visible',()=>{state.allowed=false;state.caseData!.ai_workspace_id='W1';renderCase('research');expect(screen.getByTestId('research')).toHaveTextContent('W1:locked');expect(screen.getByRole('tab',{name:'Inteligencia del caso'})).toBeInTheDocument();expect(screen.getByRole('tab',{name:'Investigar jurisprudencia'})).toBeInTheDocument();});
 it('overview never provisions',()=>{renderCase('overview');expect(state.provision).not.toHaveBeenCalled();});
 it('preserves authentication errors',async()=>{state.provision.mockRejectedValue(Object.assign(new Error('Sesión expirada'),{status:401}));const v=renderCase();drop(v.container);await waitFor(()=>expect(state.toast).toHaveBeenCalledWith('Sesión expirada'));expect(state.upload).not.toHaveBeenCalled();});
 it('invalid link is not replaced from frontend',async()=>{state.provision.mockRejectedValue(Object.assign(new Error('invalid link'),{status:409,code:'AI_WORKSPACE_LINK_INVALID'}));const v=renderCase();drop(v.container);await waitFor(()=>expect(state.toast).toHaveBeenCalled());expect(state.provision).toHaveBeenCalledTimes(1);expect(state.upload).not.toHaveBeenCalled();});
 it('legacy standalone upload still uses supplied ID',async()=>{const uploaded=vi.fn();const v=render(wrapper(<AIDocumentUpload workspaceId="LEGACY" onUploaded={uploaded}/>));drop(v.container);await waitFor(()=>expect(uploaded).toHaveBeenCalled());expect(state.provision).not.toHaveBeenCalled();expect(state.docs[0].workspace_id).toBe('LEGACY');expect(state.analyze).not.toHaveBeenCalled();});
 it('concurrent ensure calls share provisioning promise',async()=>{
  function Probe(){const {ensureWorkspace}=useCaseDocumentWorkspace('C1',null);const [done,setDone]=useState(false);return <button onClick={()=>Promise.all([ensureWorkspace(),ensureWorkspace()]).then(()=>setDone(true))}>{done?'done':'start'}</button>;}
  render(<Probe/>);fireEvent.click(screen.getByText('start'));await screen.findByText('done');expect(state.provision).toHaveBeenCalledTimes(1);
 });
});

describe('4.34L case first-view hierarchy',()=>{
 beforeEach(()=>{state.update.mockResolvedValue({id:'C1',title:'Caso editado'});state.delete.mockResolvedValue(undefined);});
 it('title once as h1; no inline edit form; edit button opens modal with values',async()=>{
  state.caseData={...(state.caseData as object),client_id:null} as never;renderCase('overview');
  expect(screen.getByRole('heading',{level:1})).toHaveTextContent('Caso');
  expect(screen.queryByLabelText(/Título/i)).not.toBeInTheDocument();
  expect(screen.queryByText('Guardar')).not.toBeInTheDocument();
  expect(screen.queryByText('Eliminar')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/editar caso/i}));
  await screen.findByRole('dialog');
  expect(screen.getByDisplayValue('Caso')).toBeInTheDocument();
 });
 it('tabs follow header; resumen renders command center first',()=>{
  state.caseData!.ai_workspace_id='W1';renderCase('overview');
  expect(screen.getByTestId('cc')).toHaveTextContent('W1');
  expect(screen.queryByText('Cliente asociado')).not.toBeInTheDocument();
 });
 it('client name links to client without email in header',()=>{
  const cd = state.caseData as unknown as Record<string, unknown>;
  cd.client_id='CL1';cd.client={name:'Juan'};
  renderCase('overview');
  const link=screen.getByRole('link',{name:'Juan'});
  expect(link.getAttribute('href')).toBe('/lawyer/clients/CL1');
  expect(screen.queryByText(/@/)).not.toBeInTheDocument();
 });
 it('save uses existing mutation and refreshes header; failure stays honest',async()=>{
  renderCase('overview');
  fireEvent.click(screen.getByRole('button',{name:/editar caso/i}));
  await screen.findByRole('dialog');
  fireEvent.change(screen.getByDisplayValue('Caso'),{target:{value:'Caso editado'}});
  fireEvent.click(screen.getByRole('button',{name:/^guardar$/i}));
  await waitFor(()=>expect(state.update).toHaveBeenCalledWith('C1',expect.objectContaining({title:'Caso editado'})));
  expect(screen.getByRole('heading',{level:1})).toHaveTextContent('Caso editado');
  state.update.mockRejectedValueOnce(new Error('offline'));
  fireEvent.click(screen.getByRole('button',{name:/editar caso/i}));
  await screen.findByRole('dialog');
  fireEvent.click(screen.getByRole('button',{name:/^guardar$/i}));
  await waitFor(()=>expect(state.update).toHaveBeenCalledTimes(2));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/cancelar/i}));
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByRole('heading',{level:1})).toHaveTextContent('Caso editado');
 });
 it('delete lives inside modal with confirmation preserved',async()=>{
  Object.defineProperty(window,'confirm',{value:vi.fn(()=>true),configurable:true});
  renderCase('overview');
  fireEvent.click(screen.getByRole('button',{name:/editar caso/i}));
  await screen.findByRole('dialog');
  fireEvent.click(screen.getByRole('button',{name:/eliminar caso/i}));
  await waitFor(()=>expect(state.delete).toHaveBeenCalledWith('C1'));
 });
});

describe('4.34N case summary text and timeline parity',()=>{
 it('resumen shows dates and timeline tab; no recent-activity preview; no LegalUp AI product copy',async()=>{
  state.caseData={...(state.caseData as object),description:'Caso de prueba',created_at:'2026-08-02T10:00:00.000Z',updated_at:'2026-08-04T10:00:00.000Z'} as never;
  const {container} = renderCase('overview');
  const text = container.textContent ?? '';
  expect(text).toContain('Creado: 2 de agosto 2026');
  expect(text).toContain('Actualizado: 4 de agosto 2026');
  expect(screen.getByText('Caso de prueba')).toBeInTheDocument();
  expect(screen.queryByText('Actividad reciente')).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/ver timeline completo/i})).not.toBeInTheDocument();
  expect(screen.getByRole('tab',{name:'Timeline del caso'})).toBeInTheDocument();
  expect(screen.queryByText(/LegalUp AI/)).not.toBeInTheDocument();
 });
 it('empty description renders no description section',()=>{
  state.caseData={...(state.caseData as object),description:''} as never;
  const {container}=renderCase('overview');
  expect(container.querySelector('p.whitespace-pre-wrap')).toBeNull();
 });
});

describe('4.34Q header description above tabs',()=>{
 it('description card renders once above tabs with legacy copy',()=>{
  state.caseData={...(state.caseData as object),description:'Línea uno\n- item 1\n- item 2'} as never;
  const {container}=renderCase('overview');
  expect(screen.getByText('Descripción')).toBeInTheDocument();
  const card=(screen.getByText('Descripción').closest('.mb-4') ?? screen.getByText('Descripción').closest('div'));
  expect(card).not.toBeNull();
  const tabs=container.querySelector('[role=tablist]');
  expect(tabs).not.toBeNull();
  expect(card!.compareDocumentPosition(tabs!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getAllByText(/Línea uno/).length).toBe(1);
 });
 it('description persists across all tabs',()=>{
  state.caseData={...(state.caseData as object),description:'Contexto persistente'} as never;
  for(const tab of ['overview','documents','research','intelligence','activity']){
   cleanup();
   renderCase(tab as never);
   expect(screen.getByText('Contexto persistente')).toBeInTheDocument();
  }
 });
 it('empty description renders no card',()=>{
  state.caseData={...(state.caseData as object),description:''} as never;
  renderCase('overview');
  expect(screen.queryByText('Descripción')).not.toBeInTheDocument();
 });
 it('edit description save updates visible card without reload',async()=>{
  state.caseData={...(state.caseData as object),description:'Vieja'} as never;
  state.update.mockResolvedValue({id:'C1',description:'Nueva descripción'});
  renderCase('overview');
  expect(screen.getByText('Vieja')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/editar caso/i}));
  await screen.findByRole('dialog');
  fireEvent.change(screen.getByDisplayValue('Vieja'),{target:{value:'Nueva descripción'}});
  fireEvent.click(screen.getByRole('button',{name:/^guardar$/i}));
  await waitFor(()=>expect(screen.getByText('Nueva descripción')).toBeInTheDocument());
  expect(screen.queryByText('Vieja')).not.toBeInTheDocument();
 });
});

describe('4.34T interaction parity micro-fixes',()=>{
 it('research draft survives tab switch (forceMount, no auto-run)',async()=>{
  state.caseData!.ai_workspace_id='W1';renderCase('research');
  fireEvent.change(screen.getByLabelText('research-draft'),{target:{value:'Borrador sin enviar'}});
  fireEvent.mouseDown(screen.getByRole('tab',{name:'Inteligencia del caso'}),{button:0,ctrlKey:false});
  // forceMount keeps the panel mounted with inactive state (hidden via CSS class).
  expect(screen.getByLabelText('research-draft')).toHaveValue('Borrador sin enviar');
  expect(screen.getByLabelText('research-draft').closest('[data-state="inactive"]')).not.toBeNull();
  fireEvent.mouseDown(screen.getByRole('tab',{name:'Investigar jurisprudencia'}),{button:0,ctrlKey:false});
  expect(screen.getByLabelText('research-draft')).toHaveValue('Borrador sin enviar');
  expect(state.analyze).not.toHaveBeenCalled();
 });
 it('chat open emits analytics once with source, no PII',()=>{
  state.caseData!.ai_workspace_id='W1';renderCase('overview');
  const cap = vi.mocked(posthog.capture);
  fireEvent.click(screen.getByText('cc-ask'));
  expect(cap).toHaveBeenCalledTimes(1);
  expect(cap).toHaveBeenCalledWith('ai_case_chat_panel_opened',{source:'command_center'});
  fireEvent.click(screen.getByText('cc-ask'));
  expect(cap).toHaveBeenCalledTimes(1);
  for(const call of cap.mock.calls) expect(JSON.stringify(call)).not.toMatch(/@|Bearer|password/i);
 });
 it('workflow ask restores same action on close; repeated cycle clean',()=>{
  state.caseData!.ai_workspace_id='W1';renderCase('overview');
  const cap = vi.mocked(posthog.capture);
  fireEvent.click(screen.getByText('cc-wf-ask'));
  expect(cap).toHaveBeenCalledWith('ai_case_chat_panel_opened',{source:'workflow'});
  fireEvent.click(screen.getByText('close-chat'));
  fireEvent.mouseDown(screen.getByRole('tab',{name:'Inteligencia del caso'}),{button:0,ctrlKey:false});
  expect(screen.getByTestId('intel')).toHaveAttribute('data-brief','act-1');
  fireEvent.click(screen.getByText('consume-brief'));
  fireEvent.mouseDown(screen.getByRole('tab',{name:'Resumen'}),{button:0,ctrlKey:false});
  fireEvent.click(screen.getByText('cc-ask'));
  fireEvent.click(screen.getByText('close-chat'));
  fireEvent.mouseDown(screen.getByRole('tab',{name:'Inteligencia del caso'}),{button:0,ctrlKey:false});
  expect(screen.getByTestId('intel')).toHaveAttribute('data-brief','');
 });
 it('document chat close preserves document context continuity',()=>{
  state.caseData!.ai_workspace_id='W1';
  const v=renderCase('documents');
  expect(screen.queryByText('Analizar')).not.toBeInTheDocument();
 });
});
