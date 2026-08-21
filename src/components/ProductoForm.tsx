import { useState } from 'react';
import type { Producto, ProductoInput } from '../types';
import styles from './ProductoForm.module.css';

interface Props {
  inicial?: Producto | null;
  onSubmit: (input: ProductoInput) => Promise<void>;
  onCancel: () => void;
}

const CATEGORIAS_FIJAS = ['fondo', 'ensalada', 'agregado', 'bebida', 'crema'] as const;
const OTRA = '__otra__';

const VACIO: ProductoInput = {
  nombre: '',
  descripcion: '',
  precio: 0,
  categoria: '',
  disponible: true,
};

function esFija(cat: string): boolean {
  return (CATEGORIAS_FIJAS as readonly string[]).includes(cat);
}

export function ProductoForm({ inicial, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<ProductoInput>(inicial ?? VACIO);
  const [categoriaSel, setCategoriaSel] = useState<string>(
    inicial && esFija(inicial.categoria) ? inicial.categoria : inicial?.categoria ? OTRA : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const set = (campo: keyof ProductoInput, valor: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const cambiarCategoria = (valor: string) => {
    setCategoriaSel(valor);
    if (valor === OTRA) {
      // mantener la categoria custom existente o vaciar
      set('categoria', esFija(form.categoria) ? '' : form.categoria);
    } else {
      set('categoria', valor);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (form.precio < 0) {
      setError('El precio no puede ser negativo');
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      await onSubmit({ ...form, categoria: form.categoria.trim().toLowerCase() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.title}>{inicial ? 'Editar producto' : 'Nuevo producto'}</h2>
      {error && <p className={styles.error}>{error}</p>}
      <label className={styles.field}>
        Nombre *
        <input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} autoFocus />
      </label>
      <label className={styles.field}>
        Descripción
        <textarea
          value={form.descripcion}
          onChange={(e) => set('descripcion', e.target.value)}
          rows={2}
        />
      </label>
      <label className={styles.field}>
        Precio
        <input
          type="number"
          min={0}
          value={form.precio}
          onChange={(e) => set('precio', Number(e.target.value))}
        />
      </label>
      <label className={styles.field}>
        Categoría
        <select value={categoriaSel} onChange={(e) => cambiarCategoria(e.target.value)}>
          <option value="">— Selecciona —</option>
          {CATEGORIAS_FIJAS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
          <option value={OTRA}>Otra…</option>
        </select>
      </label>
      {categoriaSel === OTRA && (
        <label className={styles.field}>
          Categoría personalizada
          <input
            value={form.categoria}
            onChange={(e) => set('categoria', e.target.value)}
            placeholder="escribe el nombre"
            autoFocus
          />
        </label>
      )}
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={form.disponible}
          onChange={(e) => set('disponible', e.target.checked)}
        />
        Disponible
      </label>
      <div className={styles.actions}>
        <button type="submit" className="primary" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
