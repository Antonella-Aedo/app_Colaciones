import { useEffect, useMemo, useState } from 'react';
import type {
  Cliente,
  Colacion,
  EstadoPago,
  MetodoPago,
  Pedido,
  PedidoInput,
  PedidoItem,
  Producto,
  RolItem,
  TipoEntrega,
} from '../types';
import { DELIVERY_COST, DELIVERY_ZONA } from '../constants/delivery';
import { hoyISO } from '../utils/date';
import styles from './PedidoForm.module.css';

interface Props {
  productos: Producto[];
  colaciones: Colacion[];
  clientes: Cliente[];
  inicial?: Pedido | null;
  onSubmit: (input: PedidoInput) => Promise<void>;
  onCancel: () => void;
  /** Verifica si ya existe otro pedido con la misma dirección esa fecha. Retorna la lista de coincidencias. */
  onVerificarDireccion?: (direccion: string, fecha: string, excludeId?: string) => Promise<Pedido[]>;
}

export function PedidoForm({
  productos,
  colaciones,
  clientes,
  inicial,
  onSubmit,
  onCancel,
  onVerificarDireccion,
}: Props) {
  const [clienteId, setClienteId] = useState<string>(inicial?.clienteId ?? '');
  const [clienteNombre, setClienteNombre] = useState<string | null>(
    inicial?.clienteNombre ?? null,
  );
  const [clienteDireccion, setClienteDireccion] = useState<string>(
    inicial?.clienteDireccion ?? '',
  );
  const [clienteContacto, setClienteContacto] = useState<string>(
    inicial?.clienteContacto ?? '',
  );
  const [registradoPor, setRegistradoPor] = useState(inicial?.registradoPor ?? '');
  const [fecha, setFecha] = useState(inicial?.fecha ?? hoyISO());
  const [colacionId, setColacionId] = useState<string | null>(inicial?.colacionId ?? null);
  const [items, setItems] = useState<PedidoItem[]>(inicial?.items ?? []);
  const [productoSel, setProductoSel] = useState('');
  const [rolSel, setRolSel] = useState<RolItem | 'bebida' | 'crema'>('fondo');
  const [cantidad, setCantidad] = useState(1);
  const [agregadoSel, setAgregadoSel] = useState('');
  const [ensaladaSel, setEnsaladaSel] = useState('');
  const [notas, setNotas] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>(inicial?.tipoEntrega ?? 'retiro');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(inicial?.metodoPago ?? 'efectivo');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [avisoDireccion, setAvisoDireccion] = useState<string | null>(null);

  const disponibles = useMemo(() => productos.filter((p) => p.disponible), [productos]);
  const agregados = useMemo(() => productos.filter((p) => p.categoria === 'agregado'), [productos]);
  const ensaladas = useMemo(() => productos.filter((p) => p.categoria === 'ensalada'), [productos]);

  const productoSeleccionado = useMemo(
    () => productos.find((p) => p.id === productoSel) ?? null,
    [productos, productoSel],
  );
  const esFondo = rolSel === 'fondo';

  const subtotal = useMemo(
    () => items.reduce((acc, it) => acc + it.precio * it.cantidad, 0),
    [items],
  );
  const deliveryCost = tipoEntrega === 'delivery' ? DELIVERY_COST : 0;
  const total = subtotal + deliveryCost;

  // Aviso informativo de dirección duplicada (solo para delivery).
  // No bloquea el guardado ni altera el deliveryCost.
  useEffect(() => {
    let cancelado = false;
    if (!onVerificarDireccion || !clienteDireccion || !fecha || tipoEntrega !== 'delivery') {
      setAvisoDireccion(null);
      return;
    }
    void onVerificarDireccion(clienteDireccion, fecha, inicial?.id).then((coincidencias) => {
      if (cancelado) return;
      if (coincidencias.length > 0) {
        setAvisoDireccion(
          `Ya existe${coincidencias.length > 1 ? `n ${coincidencias.length} pedidos` : ' 1 pedido'} con la misma dirección hoy. El delivery se cobra igual.`,
        );
      } else {
        setAvisoDireccion(null);
      }
    });
    return () => { cancelado = true; };
  }, [clienteDireccion, fecha, tipoEntrega, inicial?.id, onVerificarDireccion]);

  const seleccionarCliente = (id: string) => {
    setClienteId(id);
    if (!id) {
      setClienteNombre(null);
      setClienteDireccion('');
      setClienteContacto('');
      return;
    }
    const c = clientes.find((cl) => cl.id === id);
    if (c) {
      setClienteNombre(c.nombre ?? null);
      setClienteDireccion(c.direccion);
      setClienteContacto(c.contacto);
    }
  };

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
        notas: ci.nota,
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
    if (!clienteId) {
      setError('El cliente es obligatorio');
      return;
    }
    if (items.length === 0) {
      setError('Agrega al menos un item');
      return;
    }
    const estadoPago: EstadoPago = metodoPago === 'efectivo' ? 'pagado' : 'pendiente';
    setError(null);
    setGuardando(true);
    try {
      await onSubmit({
        fecha,
        clienteId,
        clienteNombre,
        clienteDireccion,
        clienteContacto,
        registradoPor: registradoPor.trim(),
        colacionId,
        items,
        total,
        tipoEntrega,
        deliveryCost,
        metodoPago,
        estadoPago,
        estado: inicial?.estado,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.title}>{inicial ? 'Editar pedido' : 'Nuevo pedido'}</h2>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.row}>
        <label className={styles.field}>
          Cliente *
          <select
            value={clienteId}
            onChange={(e) => seleccionarCliente(e.target.value)}
          >
            <option value="">— Seleccionar cliente —</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre ? c.nombre : c.direccion} · {c.contacto}
              </option>
            ))}
          </select>
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

      {clienteId && (clienteDireccion || clienteContacto) && (
        <div className={styles.clienteInfo}>
          {clienteDireccion && <span>Dirección: {clienteDireccion}</span>}
          {clienteContacto && <span>Contacto: {clienteContacto}</span>}
        </div>
      )}

      <fieldset className={styles.entregaGroup}>
        <legend className={styles.entregaLegend}>Tipo de entrega</legend>
        <label className={styles.radioOption}>
          <input
            type="radio"
            name="tipoEntrega"
            value="delivery"
            checked={tipoEntrega === 'delivery'}
            onChange={() => setTipoEntrega('delivery')}
          />
          Delivery ({DELIVERY_ZONA}) — ${DELIVERY_COST.toLocaleString('es-CL')}
        </label>
        <label className={styles.radioOption}>
          <input
            type="radio"
            name="tipoEntrega"
            value="retiro"
            checked={tipoEntrega === 'retiro'}
            onChange={() => setTipoEntrega('retiro')}
          />
          Retiro en local — $0
        </label>
      </fieldset>

      {avisoDireccion && (
        <p className={styles.aviso} role="status">{avisoDireccion}</p>
      )}

      <div className={styles.row}>
        <label className={styles.field}>
          Método de pago
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
          >
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
          </select>
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
                <em className={styles.rol}>[{it.rol}]</em>{' '}
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

      <div className={styles.total}>
        <span>Subtotal: ${subtotal.toLocaleString('es-CL')}</span>
        {deliveryCost > 0 && <span>Delivery: ${deliveryCost.toLocaleString('es-CL')}</span>}
        <strong>Total: ${total.toLocaleString('es-CL')}</strong>
      </div>

      <div className={styles.actions}>
        <button type="submit" className="primary" disabled={guardando}>
          {guardando ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Guardar pedido'}
        </button>
        <button type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
