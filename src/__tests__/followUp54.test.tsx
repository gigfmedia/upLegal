import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  COMM_CHANNELS,
  formatCommLine,
  formatLastContact,
  isValidChannel,
  latestByCase,
  latestComm,
} from '@/lib/followUp';
import { buildActionCenter } from '@/lib/actionCenter';
import { ActionCenter } from '@/components/lawyer/ActionCenter';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');
const NOW = new Date(2026, 9, 6, 12, 0, 0).getTime();
const iso = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h, 0, 0).toISOString();

describe('FASE 5.4 — modelo y canales', () => {
  it('2. canales válidos + nota opcional (contrato del hook)', () => {
    expect(COMM_CHANNELS).toEqual(['whatsapp', 'email', 'phone', 'meeting', 'other']);
    expect(isValidChannel('whatsapp')).toBe(true);
    expect(isValidChannel('sms')).toBe(false);
    const hook = read('src/hooks/useClientCommunications.ts');
    expect(hook).toContain('note: input.note?.trim().slice(0, 500) || null');
  });
  it('3/4. fecha válida requerida; nota opcional', () => {
    const hook = read('src/hooks/useClientCommunications.ts');
    expect(hook).toContain('Fecha inválida');
    expect(hook).toContain('Cliente requerido');
  });
  it('5/6/7. asociar a caso + última correcta + orden desc', () => {
    const comms = [
      { id: 'a', client_id: 'CL', case_id: 'C1', channel: 'email', note: null, communicated_at: iso(2026, 8, 3) },
      { id: 'b', client_id: 'CL', case_id: 'C1', channel: 'whatsapp', note: 'Avance', communicated_at: iso(2026, 8, 15) },
    ];
    expect(latestComm(comms)).toMatchObject({ id: 'b' });
    expect(latestByCase(comms).get('C1')).toMatchObject({ id: 'b' });
    expect(formatCommLine(comms[1])).toBe('15 sep 2026 · WhatsApp');
    expect(formatLastContact(iso(2026, 9, 3), NOW)).toBe('Hace 3 días');
  });
});

describe('FASE 5.4 — seguimiento en Action Center', () => {
  const C = (over: Record<string, unknown> = {}) => ({
    id: 'C1', title: 'Caso Pérez', status: 'in_progress', updated_at: iso(2026, 8, 30),
    next_action: null, next_action_due_at: null, next_action_completed_at: null,
    client: { name: 'María González' }, ...over,
  });
  it('8. seguimiento vencido en Vencidos', () => {
    const d = buildActionCenter([C({ client_follow_up_due_at: iso(2026, 9, 4) })], [], NOW);
    expect(d.overdue).toHaveLength(1);
    expect(d.overdue[0]).toMatchObject({ kind: 'follow_up', title: 'Actualizar a María González' });
  });
  it('9/10. hoy y futuro; sin fecha no aparece', () => {
    const d = buildActionCenter(
      [C({ id: 'A', client_follow_up_due_at: iso(2026, 9, 6, 9) }),
       C({ id: 'B', title: 'Otro', client_follow_up_due_at: iso(2026, 9, 9) }),
       C({ id: 'C', title: 'Tercero' })], [], NOW);
    expect(d.today).toHaveLength(1);
    expect(d.next7).toHaveLength(1);
    expect(d.overdue).toHaveLength(0);
  });
  it('14. item follow_up abre el caso correcto (sin card nueva)', () => {
    const onOpenCase = vi.fn();
    render(
      <ActionCenter
        cases={[C({ client_follow_up_due_at: iso(2026, 9, 6, 9) }) as never]}
        tasks={[]}
        loading={false}
        nowMs={NOW}
        onOpenCase={onOpenCase}
        onCompleteTask={async () => {}}
      />
    );
    fireEvent.click(screen.getByText('Actualizar a María González'));
    expect(onOpenCase).toHaveBeenCalledWith('C1');
  });
  it('15. chip Actualizar cliente diferencia el tipo', () => {
    render(
      <ActionCenter
        cases={[C({ client_follow_up_due_at: iso(2026, 9, 6, 9) }) as never]}
        tasks={[]}
        loading={false}
        nowMs={NOW}
        onOpenCase={() => {}}
        onCompleteTask={async () => {}}
      />
    );
    expect(screen.getByText('Actualizar cliente')).toBeInTheDocument();
  });
});

describe('FASE 5.4 — drawer, clientes, seguridad', () => {
  it('drawer: sección Cliente secundaria con registro (fuente)', () => {
    const drawer = read('src/components/lawyer/CaseManagementDrawer.tsx');
    expect(drawer).toContain('CaseClientSection');
    const section = read('src/components/lawyer/CaseClientSection.tsx');
    expect(section).toContain('Registrar actualización');
    expect(section).toContain('Marcar seguimiento actual como cumplido');
    expect(section).toContain('Próxima actualización');
    expect(section).toContain('Cliente aún no actualizado');
  });
  it('11/12. registrar puede cerrar el actual y programar nuevo', () => {
    const section = read('src/components/lawyer/CaseClientSection.tsx');
    expect(section).toContain('client_follow_up_due_at');
    expect(section).toContain('nextDate');
  });
  it('16. ClientsPage: último contacto + señal vencido', () => {
    const page = read('src/pages/lawyer/ClientsPage.tsx');
    expect(page).toContain('Último contacto');
    expect(page).toContain('Actualizar cliente');
    expect(page).toContain('useClientFollowUpOverview');
  });
  it('ClientDetail: último contacto + historial máx 5', () => {
    const page = read('src/pages/lawyer/ClientDetailPage.tsx');
    expect(page).toContain('Último contacto');
    expect(page).toContain('.slice(0, 5)');
  });
  it('17. RLS owner + valida cliente y caso del lawyer', () => {
    const sql = read('supabase/migrations/20261009000000_client_follow_up.sql');
    for (const op of ['owner_select', 'owner_insert', 'owner_update', 'owner_delete']) {
      expect(sql).toContain(op);
    }
    expect(sql).toContain('c.lawyer_id = auth.uid()');
    expect(sql).toContain('case_id IS NULL OR EXISTS');
  });
  it('18/19. sin gates; agrupado sin N+1', () => {
    const sql = read('supabase/migrations/20261009000000_client_follow_up.sql');
    expect(sql).not.toMatch(/\b(pro|plus|plan|entitlement|paywall)\b/i);
    const hook = read('src/hooks/useClientCommunications.ts');
    expect(hook).toContain('useAllCommunications');
    expect(hook).toContain('useClientFollowUpOverview');
    // 3 lecturas agrupadas + 1 escritura: nada por cliente/caso.
    expect(hook.match(/\.from\('lawyer_client_communications'\)/g)).toHaveLength(4);
    expect(hook).toContain('Promise.all');
  });
});
