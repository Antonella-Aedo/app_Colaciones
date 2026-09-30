import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { installTestDb } from '../helpers/testDb';
import { AuthProvider } from '../../src/auth/AuthProvider';
import { LoginPage } from '../../src/pages/LoginPage';

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<div>PANEL</div>} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function ingresar(email: string) {
  fireEvent.change(screen.getByLabelText(/Correo/), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
}

beforeEach(() => {
  localStorage.clear();
  installTestDb();
});

describe('LoginPage', () => {
  it('renderiza marca, campo de correo y botón', () => {
    renderLogin();
    expect(screen.getByText('Colaciones')).toBeDefined();
    expect(screen.getByLabelText(/Correo/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeDefined();
  });

  it('registra el primer correo en colección vacía y navega al panel', async () => {
    renderLogin();
    ingresar('  Ana@Correo.cl ');
    await screen.findByText('PANEL');
  });

  it('rechaza un correo inválido sin tocar la base', async () => {
    renderLogin();
    ingresar('no-es-correo');
    await screen.findByText('Ingresa un correo válido.');
  });

  it('rechaza un correo no autorizado cuando ya hay usuarios', async () => {
    const db = installTestDb();
    db.replace('usuariosPermitidos', 'otra@correo.cl', { email: 'otra@correo.cl' });

    renderLogin();
    ingresar('intruso@correo.cl');
    await screen.findByText(/no está autorizado/);
  });

  it('permite el correo autorizado', async () => {
    const db = installTestDb();
    db.replace('usuariosPermitidos', 'ana@correo.cl', { email: 'ana@correo.cl' });

    renderLogin();
    ingresar('ana@correo.cl');
    await screen.findByText('PANEL');
  });

  it('restaura la sesión persistida y salta el formulario', async () => {
    localStorage.setItem('colaciones.usuario', JSON.stringify({ email: 'ana@correo.cl' }));
    renderLogin();
    await screen.findByText('PANEL');
  });

  it('integra el panel de auto-update con su botón de búsqueda', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: 'Buscar actualizaciones' })).toBeDefined();
  });
});
