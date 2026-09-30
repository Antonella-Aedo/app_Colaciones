import { describe, it, expect } from 'vitest';
import { dimensionesParaReduccion, FOTO_LADO_MAX } from '../../src/utils/imagen';
import { fotoDeMenu, MENU_FOTOS } from '../../src/assets/menuFotos';

describe('utils/imagen', () => {
  describe('dimensionesParaReduccion', () => {
    it('no agranda imágenes que ya caben', () => {
      expect(dimensionesParaReduccion(400, 300)).toEqual({ ancho: 400, alto: 300 });
      expect(dimensionesParaReduccion(FOTO_LADO_MAX, FOTO_LADO_MAX)).toEqual({
        ancho: FOTO_LADO_MAX,
        alto: FOTO_LADO_MAX,
      });
    });
    it('reduce el lado mayor a ladoMax conservando aspecto (horizontal)', () => {
      const { ancho, alto } = dimensionesParaReduccion(1600, 800);
      expect(ancho).toBe(FOTO_LADO_MAX);
      expect(alto).toBe(400);
    });
    it('reduce el lado mayor a ladoMax conservando aspecto (vertical)', () => {
      const { ancho, alto } = dimensionesParaReduccion(600, 1200);
      expect(alto).toBe(FOTO_LADO_MAX);
      expect(ancho).toBe(400);
    });
    it('acepta ladoMax custom', () => {
      expect(dimensionesParaReduccion(2000, 1000, 500)).toEqual({ ancho: 500, alto: 250 });
    });
  });
});

describe('assets/menuFotos', () => {
  it('resuelve claves empaquetadas al asset', () => {
    expect(fotoDeMenu('cazuela')).toBe(MENU_FOTOS.cazuela);
  });
  it('pasa los data URL tal cual (fotos subidas por el usuario)', () => {
    const dataUrl = 'data:image/jpeg;base64,xyz';
    expect(fotoDeMenu(dataUrl)).toBe(dataUrl);
  });
  it('undefined y claves inexistentes devuelven undefined', () => {
    expect(fotoDeMenu(undefined)).toBeUndefined();
    expect(fotoDeMenu('no-existe')).toBeUndefined();
  });
});
