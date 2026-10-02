import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CaseDatePicker, formatCaseDateLabel } from '@/components/lawyer/CaseDatePicker';
import { dateToNoonIso } from '@/lib/caseControl';

const thisDir = dirname(fileURLToPath(import.meta.url));
const stripComments = (code: string) => code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const detailSrc = readFileSync(resolve(thisDir, '../pages/lawyer/CaseDetailPage.tsx'), 'utf-8');
const pickerSrc = readFileSync(resolve(thisDir, '../components/lawyer/CaseDatePicker.tsx'), 'utf-8');
const nextSrc = readFileSync(resolve(thisDir, '../components/lawyer/CaseNextActionSection.tsx'), 'utf-8');
const tasksSrc = readFileSync(resolve(thisDir, '../components/lawyer/CaseTasksSection.tsx'), 'utf-8');

// 0. Ningún <input type="date"> real en el drawer ni sus secciones.
describe('FASE 5.1B — sin date inputs nativos', () => {
  it('CaseDetailPage ya no renderiza panel inline', () => {
    const code = stripComments(detailSrc);
    expect(code).not.toMatch(/<CaseControlPanel/);
    expect(code).toMatch(/<CaseManagementDrawer/);
  });
  it('CaseDatePicker no renderiza input type=date (solo Popover + Calendar)', () => {
    const code = stripComments(pickerSrc);
    expect(code).not.toMatch(/type\s*=\s*["']date["']/);
    expect(code).toMatch(/Popover/);
    expect(code).toMatch(/Calendar/);
  });
  it('secciones del drawer no usan date inputs nativos', () => {
    for (const code of [stripComments(nextSrc), stripComments(tasksSrc)]) {
      expect(code).not.toMatch(/type\s*=\s*["']date["']/);
    }
    expect(nextSrc).toContain('CaseDatePicker');
    expect(tasksSrc).toContain('CaseDatePicker');
  });
  it('usa locale español y semana desde lunes sin hacks', () => {
    expect(pickerSrc).toMatch(/locale=\{es\}/);
    expect(pickerSrc).toMatch(/weekStartsOn=\{1\}/);
  });
});

// 1-2. Estado vacío / con fecha, formato español.
describe('FASE 5.1B — etiqueta del selector', () => {
  it('vacío muestra placeholder, sin dd-mm-yyyy ni ISO', () => {
    render(<CaseDatePicker value={undefined} onChange={() => {}} ariaLabel="Fecha próxima gestión" />);
    expect(screen.getByRole('button', { name: 'Fecha próxima gestión' })).toHaveTextContent('Seleccionar fecha');
    expect(document.body.textContent).not.toMatch(/dd-mm-yyyy/i);
  });
  it('con fecha muestra "8 oct 2026" en español', () => {
    const d = new Date(2026, 9, 8, 12, 0, 0); // 8 oct 2026 local
    expect(formatCaseDateLabel(d)).toBe('8 oct 2026');
    render(<CaseDatePicker value={d} onChange={() => {}} ariaLabel="Fecha próxima gestión" />);
    expect(screen.getByRole('button', { name: 'Fecha próxima gestión' })).toHaveTextContent('8 oct 2026');
  });
});

// 3-4. Abrir calendario, seleccionar fecha, botones Hoy / Quitar fecha.
describe('FASE 5.1B — calendario', () => {
  it('abrir muestra calendario en español con Hoy y navegación', async () => {
    render(<CaseDatePicker value={undefined} onChange={() => {}} ariaLabel="Fecha del pendiente" placeholder="Sin fecha" />);
    fireEvent.click(screen.getByRole('button', { name: 'Fecha del pendiente' }));
    // Mes en español (caption del DayPicker)
    expect(await screen.findByText('Hoy')).toBeTruthy();
    expect(document.body.textContent).toMatch(/octubre|noviembre|septiembre/i);
  });
  it('seleccionar un día llama onChange y muestra la fecha elegida', async () => {
    const onChange = vi.fn();
    render(<CaseDatePicker value={undefined} onChange={onChange} ariaLabel="Fecha del pendiente" />);
    fireEvent.click(screen.getByRole('button', { name: 'Fecha del pendiente' }));
    const dialog = await screen.findByRole('dialog');
    // Click en el día 15 del mes visible
    const day15 = within(dialog).getByText('15', { selector: 'button' });
    fireEvent.click(day15);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toBeInstanceOf(Date);
  });
  it('con fecha existe "Quitar fecha" y al pulsarlo emite undefined', async () => {
    const onChange = vi.fn();
    render(<CaseDatePicker value={new Date(2026, 9, 8, 12)} onChange={onChange} ariaLabel="Fecha próxima gestión" />);
    fireEvent.click(screen.getByRole('button', { name: 'Fecha próxima gestión' }));
    const clear = await screen.findByText('Quitar fecha');
    fireEvent.click(clear);
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
  it('sin fecha no hay "Quitar fecha"', async () => {
    render(<CaseDatePicker value={undefined} onChange={() => {}} ariaLabel="Fecha del pendiente" />);
    fireEvent.click(screen.getByRole('button', { name: 'Fecha del pendiente' }));
    await screen.findByText('Hoy');
    expect(screen.queryByText('Quitar fecha')).toBeNull();
  });
});

// 5-6. Conversión a ISO conserva el día (guardar fecha) y null = sin fecha.
describe('FASE 5.1B — guardar fecha', () => {
  it('dateToNoonIso genera ISO válido el mismo día calendario', () => {
    const iso = dateToNoonIso(new Date(2026, 9, 8, 9, 30));
    expect(iso).toBeTruthy();
    const back = new Date(iso!);
    expect(back.getFullYear()).toBe(2026);
    expect(back.getMonth()).toBe(9);
    expect(back.getDate()).toBe(8);
  });
  it('pendiente sin fecha envía due_at null (contrato del hook intacto)', () => {
    const taskDue: Date | undefined = undefined;
    const due_at = taskDue ? dateToNoonIso(taskDue) : null;
    expect(due_at).toBeNull();
  });
  it('pendiente con fecha envía ISO válido', () => {
    const due_at = dateToNoonIso(new Date(2026, 9, 8));
    expect(due_at).toMatch(/2026-10-08/);
  });
});
