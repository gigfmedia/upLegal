import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useAIDocuments', () => ({
  useAIDocuments: () => ({ data: [] }),
}));
vi.mock('@/hooks/useAISubscription', () => ({
  useAIFeatureAccess: () => ({ canUse: () => true, isLoading: false }),
}));
vi.mock('@/components/legalup-ai/AICaseCommandCenter', () => ({
  AICaseCommandCenter: ({ onViewDocuments, onViewIntelligence }: { onViewDocuments?: () => void; onViewIntelligence?: () => void }) => (
    <div>
      <div data-testid="command-center">command center</div>
      <button type="button" onClick={onViewDocuments}>cmd-docs</button>
      <button type="button" onClick={onViewIntelligence}>cmd-intel</button>
    </div>
  ),
}));
vi.mock('@/components/legalup-ai/AICaseIntelligence', () => ({
  AICaseIntelligence: ({ onNavigateToDocuments }: { onNavigateToDocuments?: () => void }) => (
    <div>
      <div data-testid="deep-intelligence">deep intelligence</div>
      <button type="button" onClick={onNavigateToDocuments}>intel-docs</button>
    </div>
  ),
}));
vi.mock('@/components/legalup-ai/AICaseTimeline', () => ({
  AICaseTimeline: () => <div data-testid="timeline">timeline</div>,
}));
vi.mock('@/components/legalup-ai/AIResearchPanel', () => ({
  AIResearchPanel: () => <div data-testid="research">research</div>,
}));
vi.mock('@/components/legalup-ai/AICaseChatDrawer', () => ({
  AICaseChatDrawer: () => <div data-testid="chat-drawer">chat</div>,
}));

import { AICaseWorkspaceContent } from '@/components/legalup-ai/AICaseWorkspaceContent';

const renderEmbedded = (props = {}) =>
  render(
    <MemoryRouter initialEntries={['/lawyer/cases/c1?tab=ai']}>
      <AICaseWorkspaceContent workspaceId="ws-1" workspaceName="Caso" mode="embedded-case" {...props} />
    </MemoryRouter>
  );

describe('AICaseWorkspaceContent 4.30C — flattened embedded vs standalone', () => {
  it('embedded renders Command Center directly, no nested tab bar', () => {
    renderEmbedded();
    expect(screen.getByTestId('command-center')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('embedded has no inner Documents content, deep intelligence reachable via action', () => {
    renderEmbedded();
    expect(screen.queryByTestId('deep-intelligence')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Ver análisis completo'));
    expect(screen.getByTestId('deep-intelligence')).toBeInTheDocument();
  });

  it('4.34D — embedded research entry opens panel in place, no standalone navigation', () => {
    renderEmbedded();
    expect(screen.queryByTestId('research')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Investigar jurisprudencia' }));
    expect(screen.getByTestId('research')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('4.34J — IA secondary nav exposes overview/intelligence/research directly', () => {
    renderEmbedded();
    expect(screen.getByRole('button', { name: 'Resumen IA' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inteligencia del caso' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Investigar jurisprudencia' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resumen IA' })).toHaveAttribute('aria-current', 'page');
  });

  it('4.34J — intelligence view renders via nav without hidden CTA', () => {
    renderEmbedded();
    expect(screen.queryByTestId('deep-intelligence')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Inteligencia del caso' }));
    expect(screen.getByTestId('deep-intelligence')).toBeInTheDocument();
  });

  it('4.34J — deep link view=intelligence restores on load', () => {
    render(
      <MemoryRouter initialEntries={['/lawyer/cases/c1?tab=ai&view=intelligence']}>
        <AICaseWorkspaceContent workspaceId="ws-1" workspaceName="Caso" mode="embedded-case" />
      </MemoryRouter>
    );
    expect(screen.getByTestId('deep-intelligence')).toBeInTheDocument();
  });

  it('4.34J — invalid view falls back to overview safely', () => {
    render(
      <MemoryRouter initialEntries={['/lawyer/cases/c1?tab=ai&view=foobar']}>
        <AICaseWorkspaceContent workspaceId="ws-1" workspaceName="Caso" mode="embedded-case" />
      </MemoryRouter>
    );
    expect(screen.getByTestId('command-center')).toBeInTheDocument();
    expect(screen.queryByTestId('deep-intelligence')).not.toBeInTheDocument();
    expect(screen.queryByTestId('research')).not.toBeInTheDocument();
  });

  it('embedded has no Timeline', () => {
    renderEmbedded();
    expect(screen.queryByTestId('timeline')).not.toBeInTheDocument();
  });

  it('embedded Command Center documents CTA opens outer Case Documents', () => {
    const onOpenDocuments = vi.fn();
    renderEmbedded({ onOpenDocuments });
    fireEvent.click(screen.getByText('cmd-docs'));
    expect(onOpenDocuments).toHaveBeenCalledTimes(1);
  });

  it('standalone legacy keeps Documents, Research and Timeline', () => {
    render(
      <MemoryRouter initialEntries={['/lawyer/ai']}>
        <AICaseWorkspaceContent workspaceId="ws-1" workspaceName="Caso" mode="standalone" />
      </MemoryRouter>
    );
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Documentos' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Investigar' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Timeline' })).toBeInTheDocument();
  });

  it('chat drawer preserved in both modes', () => {
    const { unmount } = renderEmbedded();
    expect(screen.getByTestId('chat-drawer')).toBeInTheDocument();
    unmount();
    render(
      <MemoryRouter initialEntries={['/lawyer/ai']}>
        <AICaseWorkspaceContent workspaceId="ws-1" workspaceName="Caso" mode="standalone" />
      </MemoryRouter>
    );
    expect(screen.getByTestId('chat-drawer')).toBeInTheDocument();
  });
});
