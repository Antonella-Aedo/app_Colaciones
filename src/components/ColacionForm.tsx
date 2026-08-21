import { useMemo, useState } from 'react';
import type { Colacion, ColacionInput, ColacionItem, Producto, RolItem } from '../types';
import { hoyISO } from '../utils/date';
import styles from './ColacionForm.module.css';

const ROLES: RolItem[] = ['fondo', 'agregado', 'ensalada', 'extra'];

interface Props {
  productos: Producto[];
  inicial?: Colacion | null;
  onSubmit: (input: ColacionInput) => Promise<void>;
  onCancel: () => void;
}

export function ColacionForm({ productos, inicial, onSubmit, onCancel }: Props) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [fecha, setFecha] = useState(inicial?.fecha ?? hoyISO());
  const [activa, setActiva] = useState(inicial?.activa ?? false);
  const [creadoPor, setCreadoPor] = useState(inicial?.creadoPor ?? '');
  const [items, setItems] = useState<ColacionItem[]>(inicial?.items ?? []);
  const [productoSel, setProductoSel] = useState('');
  const [rolSel, setRolSel] = useState<RolItem>('fondo');
  const [nota, setNota] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const productosMap = useMemo(() => {
    const m = new Map<string, Producto>();
    productos.forEach((p) => m.set(p.id, p));
    return m;
  }, [productos]);

  const agregarItem = () => {
    if (!productoSel) {
      setError('Selecciona un producto del catálogo');
      return;
    }
    if (rolSel === 'agregado' && items.some((it) => it.rol === 'agregado')) {
      setError('Solo se permite un agregado por colación');
      return;
    }
    setError(null);
    const orden = items.length + 1;
    setItems((prev) => [...prev, { productoId: productoSel, rol: rolSel, orden, nota: nota.trim() || undefined }]);
    setProductoSel('');
    setNota('');
  };

  const quitarItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, orden: i + 1 })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (!fecha) {
      setError('La fecha es obligatoria');
      return;
    }
    if (items.length === 0) {
      setError('Agrega al menos un item a la colación');
      return;
    }
    const tieneFondo = items.some((it) => it.rol === 'fondo');
    if (!tieneFondo) {
      setError('La colación debe tener al menos un item con rol "fondo"');
      return;
    }
    const agregados = items.filter((it) => it.rol === 'agregado');
    if (agregados.length > 1) {
      setError('Solo se permite un agregado por colación');
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      await onSubmit({
        nombre: nombre.trim(),
        fecha,
        activa,
        creadoPor: creadoPor.trim(),
        items,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.title}>{inicial ? 'Editar colación' : 'Nueva colación'}</h2>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.row}>
        <label className={styles.field}>
          Nombre *
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus placeholder="ej. Menú del día 20/08" />
        </label>
        <label className={styles.field}>
          Fecha *
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label className={styles.field}>
          Armado por
          <input value={creadoPor} onChange={(e) => setCreadoPor(e.target.value)} placeholder="usuario" />
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} />
          Menú del día activo
        </label>
      </div>

      <div className={styles.addItem}>
        <select value={productoSel} onChange={(e) => setProductoSel(e.target.value)}>
          <option value="">— Producto del catálogo —</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} ({p.categoria})
            </option>
          ))}
        </select>
        <select value={rolSel} onChange={(e) => setRolSel(e.target.value as RolItem)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="nota opcional"
        />
        <button type="button" onClick={agregarItem}>Agregar</button>
      </div>

      {items.length > 0 && (
        <ul className={styles.items}>
          {items.map((it, idx) => {
            const prod = productosMap.get(it.productoId);
            return (
              <li key={idx}>
                <span className={styles.info}>
                  <span className={styles.rolBadge} data-rol={it.rol}>{it.rol}</span>{' '}
                  {prod?.nombre ?? it.productoId}
                  {it.nota && <small>{it.nota}</small>}
                </span>
                <button type="button" className="danger" onClick={() => quitarItem(idx)}>
                  Quitar
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className={styles.actions}>
        <button type="submit" className="primary" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar colación'}
        </button>
        <button type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
