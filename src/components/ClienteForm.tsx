import { useState } from 'react';
import type { Cliente, ClienteInput } from '../types';
import styles from './ClienteForm.module.css';

interface Props {
  inicial?: Cliente | null;
  onSubmit: (input: ClienteInput) => Promise<void>;
  onCancel: () => void;
}

const VACIO: ClienteInput = {
  direccion: '',
  contacto: '',
  nombre: null,
};

export function ClienteForm({ inicial, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<ClienteInput>(inicial ?? VACIO);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const set = (campo: keyof ClienteInput, valor: string | null) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.direccion.trim()) {
      setError('La dirección es obligatoria');
      return;
    }
    if (!form.contacto.trim()) {
      setError('El contacto es obligatorio');
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      await onSubmit({
        ...form,
        direccion: form.direccion.trim(),
        contacto: form.contacto.trim(),
        nombre: form.nombre?.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.title}>{inicial ? 'Editar cliente' : 'Nuevo cliente'}</h2>
      {error && <p className={styles.error}>{error}</p>}
      <label className={styles.field}>
        Dirección *
        <input value={form.direccion} onChange={(e) => set('direccion', e.target.value)} autoFocus />
      </label>
      <label className={styles.field}>
        Contacto *
        <input value={form.contacto} onChange={(e) => set('contacto', e.target.value)} />
      </label>
      <label className={styles.field}>
        Nombre
        <input
          value={form.nombre ?? ''}
          onChange={(e) => set('nombre', e.target.value)}
          placeholder="opcional"
        />
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
