import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AI_MODELS, DEFAULT_AI_MODEL } from '@/lib/aiModels';

const state = vi.hoisted(() => ({ docs: [] as Record<string, unknown>[], analysis: null as Record<string, unknown> | null }));
vi.mock('@/hooks/useAIDocuments', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useAIDocuments')>('@/hooks/useAIDocuments');
  return { ...actual,
    useAIDocuments: () => ({ data: state.docs, isLoading: false, isError: false }),
    useAIDocumentAnalysis: () => ({ data: state.analysis }),
    useProcessAIDocument: () => ({ mutate: vi.fn(), isPending: false }),
    // useAnalyzeAIDocument is REAL: assertions inspect its HTTP request body.
  };
});
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'fixture' } } }) } } }));
vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({ useAuth: () => ({ user: { id: 'L1' } }) }));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));
vi.mock('@/components/legalup-ai/AIDocumentUpload', () => ({ AIDocumentUpload: () => null }));
vi.mock('@/components/legalup-ai/AIChat', () => ({ AIChat: () => null }));
vi.mock('@/components/legalup-ai/AIDocumentList', () => ({ AIDocumentList: ({ documents, onSelect }: { documents: { id: string }[]; onSelect: (id: string) => void }) => <>{documents.map(d => <button key={d.id} onClick={() => onSelect(d.id)}>{d.id}</button>)}</> }));
import { AICaseDocumentsWorkspace } from '@/components/legalup-ai/AICaseDocumentsWorkspace';
const [A,B,C] = AI_MODELS;
const doc = (id='d1', model=A.id, error='Error del proveedor (404).') => ({ id, workspace_id:'W1', lawyer_id:'L1', status:'ready', analysis_status:'failed', analysis_error:error, model, original_filename:`${id}.pdf` });
const fetchMock = vi.fn();
function mount(canAnalyze=true) {
 const client = new QueryClient({ defaultOptions:{ queries:{ retry:false }, mutations:{ retry:false } } });
 return render(<QueryClientProvider client={client}><AICaseDocumentsWorkspace workspaceId="W1" canAnalyze={canAnalyze} canChat={false} accessLoading={false} upgradeCtaLabel="Ver LegalUp Pro" onUpgrade={vi.fn()} onAskDocument={vi.fn()} analyticsSource="test" /></QueryClientProvider>);
}
async function selectModel(label: string) {
 fireEvent.keyDown(screen.getByRole('combobox', {name:'Modelo de IA'}), { key:'ArrowDown' });
 fireEvent.click(await screen.findByRole('option', { name:label }));
}
const payload = (i:number) => JSON.parse(fetchMock.mock.calls[i][1].body);
async function retry() {
 fireEvent.click(screen.getByRole('button',{name:'Reintentar análisis'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Reintentar análisis'})).not.toBeDisabled());
}
beforeEach(()=>{
 vi.clearAllMocks(); state.docs=[doc()];state.analysis=null;
 Element.prototype.scrollIntoView=vi.fn();
 Element.prototype.hasPointerCapture=vi.fn(()=>false);
 Element.prototype.setPointerCapture=vi.fn();Element.prototype.releasePointerCapture=vi.fn();
 fetchMock.mockImplementation(async()=>({ok:false,json:async()=>({error:'Error del proveedor'})}));
 vi.stubGlobal('fetch',fetchMock);
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('shared failed analysis model recovery (real mutation)',()=>{
 it('keeps valid failed model, lets user choose B and sends B to the existing endpoint',async()=>{
  mount();expect(screen.getByRole('combobox')).toHaveTextContent(A.label);
  await selectModel(B.label);await retry();
  expect(fetchMock.mock.calls[0][0]).toContain('/api/ai/documents/d1/analyze');
  expect(payload(0)).toEqual({model:B.id});
 });
 it('initial A request fails, then selecting B changes the next real request',async()=>{
  state.docs=[{...doc(),analysis_status:'none',analysis_error:null}];
  fetchMock.mockImplementation(async(_url,options)=>{const {model}=JSON.parse(options.body);state.docs=[doc('d1',model,'Proveedor (404)')];return {ok:false,json:async()=>({error:'Proveedor (404)'})};});
  mount();fireEvent.click(screen.getByRole('button',{name:'Analizar documento'}));
  await screen.findByText('El análisis falló');await waitFor(()=>expect(screen.getByRole('combobox')).not.toBeDisabled());
  expect(payload(0).model).toBe(A.id);await selectModel(B.label);await retry();expect(payload(1).model).toBe(B.id);
 });
 it('retry without changing a non-default selection preserves it',async()=>{state.docs=[doc('d1',C.id)];mount();await retry();expect(payload(0).model).toBe(C.id);});
 it('removed model falls back to existing default',async()=>{state.docs=[doc('d1','removed/model')];mount();await retry();expect(payload(0).model).toBe(DEFAULT_AI_MODEL);});
 it('second and third failures preserve current selection and allow another change',async()=>{
  mount();await retry();await selectModel(B.label);await retry();
  expect(screen.getByRole('combobox')).toHaveTextContent(B.label);
  await selectModel(C.label);await retry();expect([0,1,2].map(i=>payload(i).model)).toEqual([A.id,B.id,C.id]);
 });
 it('pending retry disables selector and rejects duplicate clicks',async()=>{
  let finish!:(value:unknown)=>void;fetchMock.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));mount();
  const button=screen.getByRole('button',{name:'Reintentar análisis'});fireEvent.click(button);fireEvent.click(button);
  await waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(1));expect(screen.getByRole('combobox')).toBeDisabled();
  finish({ok:false,json:async()=>({error:'again'})});await waitFor(()=>expect(screen.getByRole('combobox')).not.toBeDisabled());
 });
 it('selection/error stay scoped to each document, including returning to A',async()=>{
  state.docs=[doc('d1',A.id,'Error A'),doc('d2',C.id,'Error B')];mount();await selectModel(B.label);
  fireEvent.click(screen.getByText('d2'));expect(screen.queryByText('Error A')).not.toBeInTheDocument();expect(screen.getByText('Error B')).toBeInTheDocument();expect(screen.getByRole('combobox')).toHaveTextContent(C.label);
  await retry();expect(fetchMock.mock.calls[0][0]).toContain('/d2/analyze');expect(payload(0).model).toBe(C.id);
  fireEvent.click(screen.getByText('d1'));expect(screen.getByRole('combobox')).toHaveTextContent(B.label);expect(screen.getByText('Error A')).toBeInTheDocument();
 });
 it('entitlement denial exposes no retry selector or analysis request',()=>{mount(false);expect(screen.queryByRole('combobox')).not.toBeInTheDocument();expect(screen.queryByText('Reintentar análisis')).not.toBeInTheDocument();expect(fetchMock).not.toHaveBeenCalled();});
 it.each([400,404,429,500])('selector stays usable after provider %s',async code=>{state.docs=[doc('d1',A.id,`Proveedor (${code})`)];mount();await selectModel(B.label);await retry();expect(payload(0).model).toBe(B.id);});
 it('successful B retry removes failure, retains document and renders the B result',async()=>{
  fetchMock.mockImplementation(async(_url,options)=>{const {model}=JSON.parse(options.body);state.docs=[{...doc('d1',model),analysis_status:'ready',analysis_error:null}];state.analysis={id:'analysis',document_id:'d1',model,summary:'Resultado correcto',created_at:new Date().toISOString()};return {ok:true,json:async()=>({analysis:state.analysis})};});
  mount();await selectModel(B.label);fireEvent.click(screen.getByRole('button',{name:'Reintentar análisis'}));
  await waitFor(()=>expect(screen.queryByText('El análisis falló')).not.toBeInTheDocument());expect(screen.getByText('Resultado correcto')).toBeInTheDocument();expect(screen.getByRole('combobox')).toHaveTextContent(B.label);expect(payload(0).model).toBe(B.id);
 });
 it('initial analysis uses the same selector and current payload',async()=>{state.docs=[{...doc(),analysis_status:'none',analysis_error:null,model:null}];mount();await selectModel(C.label);fireEvent.click(screen.getByRole('button',{name:/Analizar documento/i}));await waitFor(()=>expect(fetchMock).toHaveBeenCalledOnce());expect(payload(0).model).toBe(C.id);});
});
