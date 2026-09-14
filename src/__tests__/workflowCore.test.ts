import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const server = () => read('server.mjs');
const syncFn = () => {
  const c = server();
  return c.slice(c.indexOf('async function syncCaseWorkflowItems'), c.indexOf('return sortWorkflowItems(refreshed'));
};

describe('4.34E — deterministic workflow Core contract', () => {
  it('sync derivation is provider-free (no LLM/search/embeddings)', () => {
    const fn = syncFn();
    expect(fn).not.toMatch(/chatCompletion|searchJurisprudence|runJurisprudence|fetch\(|axios|provider/i);
  });

  it('sync authorized as Core: general entitlement only, no workflow_generation gate', () => {
    const c = server();
    const at = c.indexOf("app.post('/api/ai/cases/:caseId/workflow/sync'");
    const block = c.slice(at, at + 1500);
    expect(block).toContain('requireAIEntitlement');
    expect(block).not.toContain("serverCanUseAIFeature('workflow_generation'");
    expect(block).not.toContain('AI_FEATURE_NOT_AVAILABLE');
  });

  it('feature key preserved for future generative use; pro map unchanged', () => {
    const c = server();
    expect(c).toContain("'document_analysis','case_chat','jurisprudence','document_drafting','case_analysis','workflow_generation'");
    expect(c).toContain("pro_limited: ['document_analysis','case_chat','case_analysis']");
  });

  it('GET/PATCH use existing-resource semantics (no creation quota)', () => {
    const c = server();
    for (const route of [
      "app.get('/api/ai/cases/:caseId/workflow'",
      "app.patch('/api/ai/cases/:caseId/workflow/:itemId'",
    ]) {
      const block = c.slice(c.indexOf(route), c.indexOf(route) + 1200);
      expect(block).toContain('{ metered: false }');
    }
  });

  it('PATCH validates ownership triple, status allowlist and transitions', () => {
    const c = server();
    const at = c.indexOf("app.patch('/api/ai/cases/:caseId/workflow/:itemId'");
    const block = c.slice(at, at + 3000);
    expect(block).toContain('WORKFLOW_STATUSES.has(status)');
    expect(block).toContain('WORKFLOW_ALLOWED_TRANSITIONS[existing.status]');
    expect(block).toContain(".eq('workspace_id', workspace.id)");
    expect(block).toContain(".eq('lawyer_id', userId)");
    // Only status/timestamps mutate — never linkage fields from body.
    expect(block).not.toMatch(/updates\.(lawyer_id|workspace_id|action_id)/);
  });

  it('sync preserves user status, upserts by action_id', () => {
    const fn = syncFn();
    expect(fn).toContain('byActionId');
    expect(fn).toContain('never reset completed');
    expect(fn).not.toMatch(/\.update\(\{\s*status/);
  });

  it('frontend auto-sync no longer gated on workflow_generation (obsolete 403 removed)', () => {
    const c = read('src/components/legalup-ai/AICaseIntelligence.tsx');
    expect(c).not.toContain("canUse('workflow_generation')");
    expect(c).not.toContain('canGenerateWorkflow');
    expect(c).toContain('syncWorkflow.mutate()');
  });

  it('Command Center stays primary surface; drawer keeps chat+evidence continuity', () => {
    const cc = read('src/components/legalup-ai/AICaseCommandCenter.tsx');
    expect(cc).toContain('useAICaseWorkflow');
    const drawer = read('src/components/legalup-ai/AICaseWorkflowActionDrawer.tsx');
    expect(drawer).toContain('onAsk(question)');
    expect(drawer).toContain('EvidenceNavigator');
    // Drawer opens evidence via shared navigator, never a workflow-specific one.
    expect(drawer).not.toContain('WorkflowEvidence');
  });

  it('activity reflects completion without a second timeline', () => {
    const c = read('src/components/lawyer/CaseActivity.tsx');
    expect(c).toContain('workflow_completed');
    expect(read('src/hooks/useCaseActivityItems.ts')).toContain('useAICaseWorkflow');
  });

  it('copy is case-management language, not generator framing', () => {
    const all =
      read('src/components/legalup-ai/AICaseCommandCenter.tsx') +
      read('src/components/legalup-ai/AICaseWorkflowActionDrawer.tsx') +
      read('src/components/legalup-ai/AICaseIntelligence.tsx');
    expect(all).not.toMatch(/AI Workflow Generator|Generate workflow|Create AI workflow/i);
  });

  it('workflow never auto-triggers research/chat/document analysis', () => {
    expect(syncFn()).not.toMatch(/jurisprudence|case_chat|document_analysis|analyze/i);
    expect(read('src/hooks/useAICaseWorkflow.ts')).not.toMatch(/useRunAIResearch|useSendChatMessage|useAnalyzeAIDocument/);
  });
});
