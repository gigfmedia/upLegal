import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/hooks/useAIDocuments', () => ({
  useAIDocuments: () => ({ data: [] }),
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

describe('AICaseWorkspaceContent 4.30C — flattened embedded vs standalone', () => {
  it('embedded renders Command Center directly, no nested tab bar', () => {
    render(<AICaseWorkspaceContent workspaceId="ws-1" workspaceName="Caso" mode="embedded-case" />);
    expect(screen.getByTestId('command-center')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('embedded has no inner Documents content, deep intelligence reachable via action', () => {
    render(<AICaseWorkspaceContent workspaceId="ws-1" workspaceName="Caso" mode="embedded-case" />);
    expect(screen.queryByTestId('deep-intelligence')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Ver análisis completo'));
    expect(screen.getByTestId('deep-intelligence')).toBeInTheDocument();
  });

  it('embedded has no Research surface and no Timeline', () => {
    render(<AICaseWorkspaceContent workspaceId="ws-1" workspaceName="Caso" mode="embedded-case" />);
    expect(screen.queryByTestId('research')).not.toBeInTheDocument();
    expect(screen.queryByTestId('timeline')).not.toBeInTheDocument();
  });

  it('embedded Command Center documents CTA opens outer Case Documents', () => {
    const onOpenDocuments = vi.fn();
    render(<AICaseWorkspaceContent workspaceId="ws-1" workspaceName="Caso" mode="embedded-case" onOpenDocuments={onOpenDocuments} />);
    fireEvent.click(screen.getByText('cmd-docs'));
    expect(onOpenDocuments).toHaveBeenCalledTimes(1);
  });

  it('standalone legacy keeps Documents, Research and Timeline', () => {
    render(<AICaseWorkspaceContent workspaceId="ws-1" workspaceName="Caso" mode="standalone" />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Documentos' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Investigar' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Timeline' })).toBeInTheDocument();
  });

  it('chat drawer preserved in both modes', () => {
    const { unmount } = render(<AICaseWorkspaceContent workspaceId="ws-1" workspaceName="Caso" mode="embedded-case" />);
    expect(screen.getByTestId('chat-drawer')).toBeInTheDocument();
    unmount();
    render(<AICaseWorkspaceContent workspaceId="ws-1" workspaceName="Caso" mode="standalone" />);
    expect(screen.getByTestId('chat-drawer')).toBeInTheDocument();
  });
});
