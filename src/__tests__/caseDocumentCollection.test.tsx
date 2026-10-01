import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { AIDocumentListItem } from '@/hooks/useAIDocuments';
import { CaseDocumentCollection } from '@/components/lawyer/CaseDocumentCollection';

const state = vi.hoisted(() => ({ plan: 'pro_limited', used: 32, limit: 50 as number | null, loading: false, missing: false, remove: vi.fn(), retry: vi.fn() }));
vi.mock('@/hooks/useAIUsage', () => ({ useAIUsage: () => ({ data: state.missing ? null : { allowance: { plan: state.plan, documents: { used: state.used, limit: state.limit } } }, isLoading: state.loading, refetch: state.retry }) }));
vi.mock('@/hooks/useAIDocuments', async () => ({ ...await vi.importActual('@/hooks/useAIDocuments'), useDeleteAIDocument: () => ({ mutate: state.remove, isPending: false }) }));
vi.mock('@/components/legalup-ai/AIDocumentUpload', () => ({ AIDocumentUpload: ({ disabled, ensureWorkspace }: { disabled: boolean; ensureWorkspace?: () => Promise<string> }) => <button disabled={disabled} onClick={() => ensureWorkspace?.()}>Subir documento</button> }));
vi.mock('@/components/legalup-ai/AIDocumentPreviewDialog', () => ({ AIDocumentPreviewDialog: ({ doc }: { doc: AIDocumentListItem | null }) => doc ? <div>Vista previa: {doc.original_filename}</div> : null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const doc = (id: string, extra = {}): AIDocumentListItem => ({ id, lawyer_id: 'owner', workspace_id: 'W', original_filename: `${id}.pdf`, file_path: `owner/W/${id}/original.pdf`, file_size_bytes: 2048, mime_type: 'application/pdf', status: 'ready', analysis_status: 'none', analysis_error: null, model: null, page_count: 1, created_at: '2026-10-01T12:00:00Z', updated_at: '2026-10-01T12:00:00Z', ...extra });
const select = vi.fn(), ask = vi.fn(), upgrade = vi.fn(), ensure = vi.fn(), process = vi.fn();
function view(documents = [doc('contrato')], extra = {}) { return render(<CaseDocumentCollection documents={documents} workspaceId="W" ensureWorkspace={ensure} selectedId={null} onSelect={select} onUploaded={vi.fn()} onAskDocument={ask} onRetryProcess={process} processPending={false} canChat onUpgrade={upgrade} loading={false} failed={false} onReload={vi.fn()} {...extra} />); }
const desktop = () => within(screen.getByTestId('desktop-document-table'));
function menu(id = 'contrato') { fireEvent.keyDown(desktop().getByRole('button', { name: `Acciones de ${id}.pdf` }), { key: 'Enter' }); }
beforeEach(() => { vi.clearAllMocks(); Object.assign(state, { plan: 'pro_limited', used: 32, limit: 50, loading: false, missing: false }); });

describe('Case document collection', () => {
  it.each([['free_case',0,2],['free_case',1,2],['pro_limited',49,50],['plus',149,150]])('allows upload below authoritative %s capacity %s/%s', (plan, used, limit) => {
    Object.assign(state,{plan,used,limit}); view(); expect(screen.getByText(`${used} de ${limit} documentos utilizados`)).toBeInTheDocument(); expect(screen.getByRole('button',{name:'Subir documento'})).toBeEnabled(); expect(ensure).not.toHaveBeenCalled();
  });
  it.each([['free_case',2,'Pro'],['pro_limited',50,'Plus']])('routes saturated %s to %s upgrade', (plan,limit,target) => {
    Object.assign(state,{plan,used:limit,limit});view();fireEvent.click(screen.getByRole('button',{name:`Ver LegalUp ${target}`}));expect(upgrade).toHaveBeenCalledOnce();expect(screen.queryByRole('button',{name:'Subir documento'})).not.toBeInTheDocument();
  });
  it('Plus at capacity has no higher tier CTA',()=>{Object.assign(state,{plan:'plus',used:150,limit:150});view();expect(screen.getByRole('button',{name:'Subir documento'})).toBeDisabled();expect(screen.queryByText(/Ver LegalUp/)).not.toBeInTheDocument();expect(screen.getByText(/150 documentos actuales/)).toBeInTheDocument();});
  it('shows global paid usage even with only eight case documents',()=>{view(Array.from({length:8},(_,i)=>doc(`doc${i}`)));expect(screen.getByText('32 de 50 documentos utilizados')).toBeInTheDocument();expect(screen.getByText('Incluye los documentos de todos tus casos.')).toBeInTheDocument();});
  it('4.58A.7 toolbar orders upload before capacity and keeps single upload CTA', () => {
    view();
    const upload = screen.getByRole('button', { name: 'Subir documento' });
    const capacity = screen.getByText('32 de 50 documentos utilizados');
    expect(upload.compareDocumentPosition(capacity) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Subir documento' })).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: 'Buscar documentos del caso' })).toBeInTheDocument();
  });
  it('4.58A.2 Pro usage 5/50 renders authoritative global count', () => {
    Object.assign(state, { plan: 'pro_limited', used: 5, limit: 50 });
    view(Array.from({ length: 2 }, (_, i) => doc(`doc${i}`)));
    expect(screen.getByText('5 de 50 documentos utilizados')).toBeInTheDocument();
  });
  it.each([['free_case',2],['pro_limited',50],['plus',150]])('restores upload after authoritative capacity refresh for %s', (plan,limit)=>{Object.assign(state,{plan,used:limit,limit});const ui=view();state.used=limit-1;ui.rerender(<CaseDocumentCollection documents={[]} selectedId={null} onSelect={select} onUploaded={vi.fn()} onAskDocument={ask} onRetryProcess={process} processPending={false} canChat onUpgrade={upgrade} loading={false} failed={false} onReload={vi.fn()} />);expect(screen.getByRole('button',{name:'Subir documento'})).toBeEnabled();expect(screen.getByText(`${limit-1} de ${limit} documentos utilizados`)).toBeInTheDocument();});
  it('unknown capacity does not invent a quota or paywall',()=>{state.missing=true;view();expect(screen.queryByText(/de 50/)).not.toBeInTheDocument();expect(screen.queryByText(/Ver LegalUp/)).not.toBeInTheDocument();fireEvent.click(screen.getByText('Reintentar'));expect(state.retry).toHaveBeenCalledOnce();});
  it('loading does not flash zero usage',()=>{state.loading=true;view();expect(screen.queryByText(/documentos utilizados/)).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Subir documento'})).toBeDisabled();});
  it('separates extraction and failed analysis statuses without leaking raw errors',()=>{view([doc('ready',{analysis_status:'failed',analysis_error:'private stack trace'}),doc('processing',{status:'processing'}),doc('failed',{status:'failed'}),doc('pending',{status:'pending'}),doc('analyzing',{analysis_status:'processing'}),doc('analyzed',{analysis_status:'ready'})]);expect(desktop().getByText('Análisis fallido')).toBeInTheDocument();expect(desktop().getAllByText('Listo')).toHaveLength(3);expect(desktop().getAllByLabelText('Análisis no disponible')).toHaveLength(3);expect(screen.queryByText('private stack trace')).not.toBeInTheDocument();});
  it('search composes with analysis filter and reset restores 150 rows',()=>{view(Array.from({length:150},(_,i)=>doc(`Contrato-${i}`,{analysis_status:i%2?'ready':'none'})));expect(screen.getByTestId('desktop-document-table').querySelectorAll('tbody tr')).toHaveLength(150);fireEvent.change(screen.getByRole('textbox'),{target:{value:'CONTRATO-1'}});fireEvent.change(screen.getByRole('combobox'),{target:{value:'none'}});expect(desktop().getByText('Contrato-10.pdf')).toBeInTheDocument();expect(desktop().queryByText('Contrato-11.pdf')).not.toBeInTheDocument();fireEvent.change(screen.getByRole('textbox'),{target:{value:'inexistente'}});expect(screen.getByText('No encontramos documentos con esos criterios.')).toBeInTheDocument();expect(screen.queryByText('Aún no hay documentos')).not.toBeInTheDocument();fireEvent.click(screen.getByText('Limpiar filtros'));expect(screen.getByTestId('desktop-document-table').querySelectorAll('tbody tr')).toHaveLength(150);});
  it('filename selects the existing detail and escapes markup',()=>{view([doc('test',{original_filename:'<script>alert(1)</script>.pdf'})]);fireEvent.click(desktop().getByRole('button',{name:'<script>alert(1)</script>.pdf PDF · 2 KB'}));expect(select).toHaveBeenCalledWith('test');expect(document.querySelector('script')).toBeNull();});
  it('uses newest uploaded order',()=>{view([doc('old',{created_at:'2025-01-01'}),doc('new')]);expect(desktop().getAllByRole('row')[1]).toHaveTextContent('new.pdf');});
  it('opens preview only on its real action; no fabricated rename/download/bulk',()=>{view();menu();fireEvent.click(screen.getByRole('menuitem',{name:'Ver documento'}));expect(screen.getByText('Vista previa: contrato.pdf')).toBeInTheDocument();expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();menu();expect(screen.queryByRole('menuitem',{name:/Renombrar|Editar|Descargar/})).not.toBeInTheDocument();});
  it('document chat passes selected document without a default question',()=>{view();menu();fireEvent.click(screen.getByRole('menuitem',{name:'Preguntar sobre este documento'}));expect(ask).toHaveBeenCalledWith(expect.objectContaining({id:'contrato'}));expect(ask.mock.calls[0]).toHaveLength(1);});
  it('analysis action selects detail without automatically spending quota',()=>{view();menu();fireEvent.click(screen.getByRole('menuitem',{name:'Analizar con LegalUp AI'}));expect(select).toHaveBeenCalledWith('contrato');expect(process).not.toHaveBeenCalled();});
  it('disables analyze during extraction/analysis',()=>{view([doc('contrato',{analysis_status:'processing'})]);menu();expect(screen.getByRole('menuitem',{name:'Analizando…'})).toHaveAttribute('aria-disabled','true');});
  it('retries extraction only for failed document',()=>{view([doc('contrato',{status:'failed'})]);menu();fireEvent.click(screen.getByRole('menuitem',{name:'Reintentar procesamiento'}));expect(process).toHaveBeenCalledWith('contrato');});
  it('4.58A.1 no delete action in desktop, mobile, ready, analyzed or failed menus', () => {
    view([doc('contrato'), doc('analyzed', { analysis_status: 'ready' }), doc('failed', { status: 'failed' })]);
    for (const id of ['contrato', 'analyzed', 'failed']) {
      menu(id);
      expect(screen.queryByRole('menuitem', { name: 'Eliminar' })).not.toBeInTheDocument();
      fireEvent.keyDown(document.body, { key: 'Escape' });
    }
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(state.remove).not.toHaveBeenCalled();
  });
  it('mobile has filename, statuses and reachable menu independently of table',()=>{view();const mobile=within(screen.getByTestId('mobile-document-cards'));expect(mobile.getByText('contrato.pdf')).toBeInTheDocument();fireEvent.click(mobile.getByRole('button',{name:'contrato.pdf PDF · 2 KB'}));expect(select).toHaveBeenCalledWith('contrato');expect(mobile.getByRole('button',{name:'Acciones de contrato.pdf'})).toBeInTheDocument();});
});
