import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * 4.31C.4 — stacking contract: SelectContent must render above DialogContent.
 * Proven in production: DialogContent resolves to z-index 1200 while
 * SelectContent was z-50, so the client dropdown rendered behind the modal
 * (elementFromPoint hit FORM/DIV/TEXTAREA instead of the options).
 * jsdom cannot validate real browser stacking; this test locks the class
 * contract (select z > dialog z) that the fix relies on.
 */
describe('4.31C.4 — Select renders above Dialog', () => {
  it('SelectContent z-index is above DialogContent z-index', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Dialog</DialogTitle>
          <Select value="none">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin cliente</SelectItem>
              <SelectItem value="client-a">Client A</SelectItem>
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>
    );

    fireEvent.click(screen.getByRole('combobox'));
    const content = document.querySelector('[data-radix-popper-content-wrapper] [role="listbox"]');
    expect(content).not.toBeNull();
    expect(content?.className).toMatch(/z-\[1300\]/);

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.className).toMatch(/z-\[1200\]/);
  });

  it('all client options are present in the open dropdown', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Dialog</DialogTitle>
          <Select value="none">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin cliente</SelectItem>
              <SelectItem value="client-a">Juan Guajardo</SelectItem>
              <SelectItem value="client-b">Cliente Test</SelectItem>
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>
    );
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: 'Sin cliente' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Juan Guajardo' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Cliente Test' })).toBeInTheDocument();
  });
});
