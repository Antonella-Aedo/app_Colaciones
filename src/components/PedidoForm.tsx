import { useMemo, useState } from 'react';
import type {
  Colacion,
  PedidoItem,
  PedidoInput,
  Producto,
  RolItem,
} from '../types';
import styles from './PedidoForm.module.css';

interface Props {
  productos: Producto[];
  colaciones: Colacion[];
  onSubmit: (input: PedidoInput) => Promise<void>;
  onCancel: () => void;
}

export function PedidoForm({ productos, colaciones, onSubmit, onCancel }: Props) {
  const [cliente, setCliente] = useState('');
  const [registradoPor, setRegistradoPor] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [colacionId, setColacionId] = useState<string | null>(null);
  const [items, setItems] = useState<PedidoItem[]>([]);
  const [productoSel, setProductoSel] = useState('');
  const [rolSel, setRolSel] = useState<RolItem | 'bebida' | 'crema'>('fondo');
  const [cantidad, setCantidad] = useState(1);
  const [agregadoSel, setAgregadoSel] = useState('');
  const [ensaladaSel, setEnsaladaSel] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const disponibles = useMemo(() => productos.filter((p) => p.disponible), [productos]);
  const agregados = useMemo(() => productos.filter((p) => p.categoria === 'agregado'), [productos]);
  const ensaladas = useMemo(() => productos.filter((p) => p.categoria === 'ensalada'), [productos]);

  const productoSeleccionado = useMemo(
    () => productos.find((p) => p.id === productoSel) ?? null,
    [productos, productoSel],
  );
  const esFondo = rolSel === 'fondo';

  const total = useMemo(
    () => items.reduce((acc, it) => acc + it.precio * it.cantidad, 0),
    [items],
  );

  const precargarColacion = (id: string) => {
    const col = colaciones.find((c) => c.id === id);
    if (!col) return;
    setColacionId(id);
    const itemsPrecargados: PedidoItem[] = col.items.map((ci) => {
      const prod = productos.find((p) => p.id === ci.productoId);
      return {
        productoId: ci.productoId,
        nombre: prod?.nombre ?? ci.productoId,
        precio: prod?.precio ?? 0,
        cantidad: 1,
        rol: ci.rol,
        nota: ci.nota,
      };
    });
    setItems(itemsPrecargados);
    setError(null);
  };

  const desdeCero = () => {
    setColacionId(null);
    setItems([]);
  };

  const agregarItem = () => {
    const prod = productoSeleccionado;
    if (!prod) {
      setError('Selecciona un producto');
      return;
    }
    if (cantidad < 1) {
      setError('La cantidad debe ser ≥ 1');
      return;
    }
    setError(null);
    const nuevoItem: PedidoItem = {
      productoId: prod.id,
      nombre: prod.nombre,
      precio: prod.precio,
      cantidad,
      rol: rolSel,
    };
    if (esFondo) {
      if (agregadoSel) nuevoItem.agregado = agregados.find((a) => a.id === agregadoSel)?.nombre ?? agregadoSel;
      if (ensaladaSel) nuevoItem.ensalada = ensaladas.find((a) => a.id === ensaladaSel)?.nombre ?? ensaladaSel;
      if (notas.trim()) nuevoItem.notas = notas.trim();
    }
    setItems((prev) => [...prev, nuevoItem]);
    setProductoSel('');
    setCantidad(1);
    setAgregadoSel('');
    setEnsaladaSel('');
    setNotas('');
  };

  const quitarItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente.trim()) {
      setError('El cliente es obligatorio');
      return;
    }
    if (items.length === 0) {
      setError('Agrega al menos un item');
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      await onSubmit({
        fecha,
        cliente: cliente.trim(),
        registradoPor: registradoPor.trim(),
        colacionId,
        items,
        total,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.title}>Nuevo pedido</h2>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.row}>
        <label className={styles.field}>
          Cliente *
          <input value={cliente} onChange={(e) => setCliente(e.target.value)} />
        </label>
        <label className={styles.field}>
          Registrado por
          <input value={registradoPor} onChange={(e) => setRegistradoPor(e.target.value)} placeholder="usuario" />
        </label>
        <label className={styles.field}>
          Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
      </div>

      <div className={styles.precarga}>
        <label className={styles.field}>
          Precargar desde colación
          <select
            value={colacionId ?? ''}
            onChange={(e) => (e.target.value ? precargarColacion(e.target.value) : desdeCero())}
          >
            <option value="">— Crear desde cero —</option>
            {colaciones.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.activa ? '★' : ''} ({c.fecha})
              </option>
            ))}
          </select>
        </label>
        {colacionId && (
          <button type="button" onClick={desdeCero}>Limpiar y crear desde cero</button>
        )}
      </div>

      <div className={styles.addItem}>
        <select value={productoSel} onChange={(e) => setProductoSel(e.target.value)}>
          <option value="">— Producto —</option>
          {disponibles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} — ${p.precio.toLocaleString('es-CL')}
            </option>
          ))}
        </select>
        <select value={rolSel} onChange={(e) => setRolSel(e.target.value as RolItem | 'bebida' | 'crema')}>
          <option value="fondo">fondo</option>
          <option value="agregado">agregado</option>
          <option value="ensalada">ensalada</option>
          <option value="extra">extra</option>
          <option value="bebida">bebida</option>
          <option value="crema">crema</option>
        </select>
        <input
          type="number"
          min={1}
          value={cantidad}
          onChange={(e) => setCantidad(Number(e.target.value))}
          className={styles.cant}
        />
        <button type="button" onClick={agregarItem}>Agregar</button>
      </div>

      {esFondo && (
        <div className={styles.personalizacion}>
          <span className={styles.personalizacionLabel}>Personalización del fondo:</span>
          <div className={styles.row}>
            <label className={styles.field}>
              Agregado (1, opcional)
              <select value={agregadoSel} onChange={(e) => setAgregadoSel(e.target.value)}>
                <option value="">— Sin agregado —</option>
                {agregados.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              Ensalada (opcional)
              <select value={ensaladaSel} onChange={(e) => setEnsaladaSel(e.target.value)}>
                <option value="">— Sin ensalada —</option>
                {ensaladas.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </label>
          </div>
          <label className={styles.field}>
            Notas
            <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="ej. sin cebolla" />
          </label>
        </div>
      )}

      {items.length > 0 && (
        <ul className={styles.items}>
          {items.map((it, idx) => (
            <li key={idx}>
              <span className={styles.itemInfo}>
                <em style={{ color: 'var(--color-muted)', fontSize: '0.8rem' }}>[{it.rol}]</em>{' '}
                {it.cantidad}× {it.nombre}
                {(it.agregado || it.ensalada || it.notas) && (
                  <small>
                    {it.agregado && <> · agregado: {it.agregado}</>}
                    {it.ensalada && <> · ensalada: {it.ensalada}</>}
                    {it.notas && <> · {it.notas}</>}
                  </small>
                )}
              </span>
              <span>${(it.precio * it.cantidad).toLocaleString('es-CL')}</span>
              <button type="button" className="danger" onClick={() => quitarItem(idx)}>
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.total}>Total: ${total.toLocaleString('es-CL')}</div>

      <div className={styles.actions}>
        <button type="submit" className="primary" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar pedido'}
        </button>
        <button type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

