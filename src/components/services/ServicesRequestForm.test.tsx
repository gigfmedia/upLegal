import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ServicesRequestForm } from './ServicesRequestForm';

function fillForm() {
  fireEvent.change(screen.getByLabelText(/Nombre de contacto/i), {
    target: { value: 'Camila Rojas' },
  });
  fireEvent.change(screen.getByLabelText(/^Empresa$/i), {
    target: { value: 'Comercial Andes SpA' },
  });
  fireEvent.change(screen.getByLabelText(/^Email$/i), {
    target: { value: 'camila@andes.cl' },
  });
  fireEvent.change(screen.getByLabelText(/^Servicio$/i), {
    target: { value: 'contratos' },
  });
  fireEvent.change(screen.getByLabelText(/¿Qué necesitas resolver\?/i), {
    target: {
      value: 'Necesitamos revisar un contrato de servicios antes de firmarlo con un cliente.',
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ServicesRequestForm', () => {
  it('valida los campos obligatorios antes de enviar', async () => {
    render(<ServicesRequestForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    expect(await screen.findByText('Ingresa tu nombre.')).toBeTruthy();
    expect(screen.getByText('Ingresa el nombre de tu empresa.')).toBeTruthy();
    expect(screen.getByText('Ingresa tu email.')).toBeTruthy();
    expect(screen.getByText('Selecciona un servicio.')).toBeTruthy();
    expect(screen.getByText('Debes aceptar la política de privacidad.')).toBeTruthy();
  });

  it('exige aceptar la política de privacidad', async () => {
    render(<ServicesRequestForm />);
    fillForm();

    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    expect(await screen.findByText('Debes aceptar la política de privacidad.')).toBeTruthy();
  });

  it('envía la solicitud y muestra la confirmación con referencia', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, id: 'abc', reference: 'ABC12345' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ServicesRequestForm />);
    fillForm();
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    expect(await screen.findByText('Solicitud recibida')).toBeTruthy();
    expect(screen.getByText('ABC12345')).toBeTruthy();
    expect(screen.getByText('Comercial Andes SpA')).toBeTruthy();
    expect(screen.getByText('Contratos')).toBeTruthy();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/services/inquiries');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toMatchObject({
      contactName: 'Camila Rojas',
      companyName: 'Comercial Andes SpA',
      email: 'camila@andes.cl',
      serviceCategory: 'contratos',
      privacyAccepted: true,
    });
  });

  it('mantiene los datos y muestra el error si el backend falla', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'No pudimos registrar tu solicitud. Intenta nuevamente.',
        code: 'PERSISTENCE_ERROR',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ServicesRequestForm />);
    fillForm();
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'No pudimos registrar tu solicitud. Intenta nuevamente.',
      );
    });
    expect((screen.getByLabelText(/Nombre de contacto/i) as HTMLInputElement).value).toBe(
      'Camila Rojas',
    );
  });
});
