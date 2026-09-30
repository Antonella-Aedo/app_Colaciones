/**
 * Tests del panel de auto-update del login — todos los estados visibles:
 * botón, "al día", "hay updates", overlay de carga por paso, errores
 * con reintento y la nota de "no disponible" (app empaquetada / sin bridge).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ActualizacionPanel } from '../../src/components/ActualizacionPanel';
import { installTestUpdater, uninstallTestUpdater } from '../helpers/testUpdater';

const conUpdates = {
  soportado: true,
  disponible: true,
  pendientes: 2,
  rama: 'development',
};

const alDia = { soportado: true, disponible: false, pendientes: 0, rama: 'development' };

function clickBuscar() {
  fireEvent.click(screen.getByRole('button', { name: 'Buscar actualizaciones' }));
}

afterEach(uninstallTestUpdater);

describe('ActualizacionPanel', () => {
  it('ofrece el botón para buscar actualizaciones', () => {
    installTestUpdater();
    render(<ActualizacionPanel />);
    expect(screen.getByRole('button', { name: 'Buscar actualizaciones' })).toBeDefined();
  });

  it('informa que el sistema está actualizado cuando no hay commits pendientes', async () => {
    installTestUpdater({ verificar: () => Promise.resolve(alDia) });
    render(<ActualizacionPanel />);
    clickBuscar();
    await screen.findByText('El sistema está actualizado.');
  });

  it('muestra el aviso y el botón de actualizar cuando hay commits nuevos', async () => {
    installTestUpdater({ verificar: () => Promise.resolve(conUpdates) });
    render(<ActualizacionPanel />);
    clickBuscar();
    await screen.findByText('Existen actualizaciones disponibles');
    expect(screen.getByText(/2 cambios pendientes en la rama development/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Actualizar ahora' })).toBeDefined();
  });

  it('muestra la pantalla de carga y refleja cada paso reportado por IPC', async () => {
    // aplicar queda pendiente: en producción la app se relanza antes de resolver
    const fake = installTestUpdater({
      verificar: () => Promise.resolve(conUpdates),
      aplicar: () => new Promise(() => {}),
    });
    render(<ActualizacionPanel />);
    clickBuscar();
    fireEvent.click(await screen.findByRole('button', { name: 'Actualizar ahora' }));

    await screen.findByText('Actualizando el sistema');
    expect(screen.getByText('Descargando los cambios del repositorio…')).toBeDefined();
    expect(screen.getByText('No cierres la aplicación.')).toBeDefined();

    act(() => fake.emitirPaso('instalando'));
    await screen.findByText('Instalando dependencias…');
    act(() => fake.emitirPaso('compilando'));
    await screen.findByText('Compilando la nueva versión…');
    act(() => fake.emitirPaso('reiniciando'));
    await screen.findByText('Reiniciando la aplicación…');
  });

  it('muestra el error del apply como mensaje claro y permite reintentar', async () => {
    const fake = installTestUpdater({
      verificar: () => Promise.resolve(conUpdates),
      aplicar: () =>
        Promise.resolve({
          ok: false,
          paso: 'descargando' as const,
          error: {
            code: 'CONFLICTO_LOCAL',
            mensaje: 'Hay cambios locales que chocan con la actualización.',
          },
        }),
    });
    render(<ActualizacionPanel />);
    clickBuscar();
    fireEvent.click(await screen.findByRole('button', { name: 'Actualizar ahora' }));

    await screen.findByText('Hay cambios locales que chocan con la actualización.');
    expect(screen.queryByText('Actualizando el sistema')).toBeNull();

    // Reintentar vuelve a consultar — no relanza el apply a ciegas
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByText('Existen actualizaciones disponibles');
    expect(fake.bridge.verificar).toHaveBeenCalledTimes(2);
  });

  it('muestra el error de la verificación como mensaje claro', async () => {
    installTestUpdater({
      verificar: () =>
        Promise.resolve({
          soportado: true,
          error: { code: 'SIN_RED', mensaje: 'No se pudo conectar con el repositorio remoto.' },
        }),
    });
    render(<ActualizacionPanel />);
    clickBuscar();
    await screen.findByText('No se pudo conectar con el repositorio remoto.');
  });

  it('cuando la instalación no es un repo, reemplaza el botón por una nota', async () => {
    installTestUpdater({ verificar: () => Promise.resolve({ soportado: false }) });
    render(<ActualizacionPanel />);
    clickBuscar();
    await screen.findByText(/no está disponible en esta instalación/);
    expect(screen.queryByRole('button', { name: 'Buscar actualizaciones' })).toBeNull();
  });

  it('sin bridge (navegador) muestra la misma nota de no disponible', async () => {
    render(<ActualizacionPanel />);
    clickBuscar();
    await screen.findByText(/no está disponible en esta instalación/);
  });
});
