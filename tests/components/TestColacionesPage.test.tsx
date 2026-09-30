import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestColacionesPage } from '../../src/pages/TestColacionesPage';

describe('TestColacionesPage', () => {
  it('renderiza las cinco variantes con platos de muestra (menú y colación)', () => {
    render(<TestColacionesPage />);
    expect(screen.getByText('Bandeja')).toBeDefined();
    expect(screen.getByText('Pizarra del día')).toBeDefined();
    expect(screen.getByText('Fila compacta')).toBeDefined();
    expect(screen.getByText('Poster (producción)')).toBeDefined();
    expect(screen.getByText('Ticket de cocina')).toBeDefined();
    // La muestra activa aparece en las variantes que la incluyen
    expect(screen.getAllByText('Cazuela de osobuco').length).toBeGreaterThanOrEqual(3);
    // Colación muestra su valor fijo
    expect(screen.getAllByText(/\$6\.500/).length).toBeGreaterThanOrEqual(1);
  });

  it('el toggle de disponible es independiente: varios platos activos a la vez', () => {
    render(<TestColacionesPage />);
    // Dos platos parten activos: 'Menú del día — completo' (en A, B y D)
    // y 'Colación clásica' (en B, D y E) → 6 botones '★ Disponible hoy'
    // (la variante C usa solo '★'/'☆', no cuenta).
    const estrellasLlenas = () => screen.getAllByText('★ Disponible hoy').length;
    const iniciales = estrellasLlenas();
    expect(iniciales).toBe(6);

    // Activar 'Menú del día — ayer' desde la fila compacta (variante C, ☆).
    const estrellas = screen.getAllByRole('button', { name: '☆' });
    fireEvent.click(estrellas[0]);

    // Los activos anteriores NO se apagan. 'Menú de ayer' se renderiza en
    // las variantes D y E → el botón completo aparece dos veces más.
    expect(estrellasLlenas()).toBe(iniciales + 2);
  });
});
