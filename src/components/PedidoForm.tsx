import { useEffect, useMemo, useState } from 'react';
import type {
  Cliente,
  ClienteInput,
  Colacion,
  EstadoPago,
  MetodoPago,
  Pedido,
  PedidoInput,
  PedidoItem,
  Producto,
  TipoEntrega,
} from '../types';
import { DELIVERY_COST, DELIVERY_ZONA } from '../constants/delivery';
import { hoyISO } from '../utils/date';
import styles from './PedidoForm.module.css';
import { mensajeDeError } from '../utils/errores';

// --- Tipos internos: el menú es la unidad de composición ------------------
// Cada menú es una "bandeja": 1 fondo + 1 agregado + 1 ensalada + extras.
// Todos los campos son opcionales — un menú puede ser solo una bebida.
// El modelo de datos (PedidoItem[]) sigue siendo plano: el menú es una
// agrupación visual que se aplana al guardar y se reconstruye al editar.

interface ExtraForm {
  id: string;
  productoId: string;
  cantidad: number;
}

interface MenuForm {
  id: string;
  fondoId: string;
  fondoCantidad: number;
  agregadoId: string;
  ensaladaId: string;
  notas: string;
  extras: ExtraForm[];
}

let menuCounter = 0;
function newId(prefix: string) {
  menuCounter += 1;
  return `${prefix}-${menuCounter}`;
}

function emptyMenu(): MenuForm {
  return {
    id: newId('menu'),
    fondoId: '',
    fondoCantidad: 1,
    agregadoId: '',
    ensaladaId: '',
    notas: '',
    extras: [],
  };
}

/** Reconstruye los menús a partir de los items planos del pedido. */
function itemsToMenus(items: PedidoItem[], productos: Producto[]): MenuForm[] {
  if (items.length === 0) return [emptyMenu()];
  const menus: MenuForm[] = [];
  let current: MenuForm | null = null;

  const findIdByNombre = (nombre: string) =>
    productos.find((p) => p.nombre === nombre)?.id ?? '';

  for (const item of items) {
    if (item.rol === 'fondo') {
      if (current) menus.push(current);
      current = {
        id: newId('menu'),
        fondoId: item.productoId,
        fondoCantidad: item.cantidad,
        agregadoId: item.agregado ? findIdByNombre(item.agregado) : '',
        ensaladaId: item.ensalada ? findIdByNombre(item.ensalada) : '',
        notas: item.notas ?? '',
        extras: [],
      };
    } else if (item.rol === 'agregado') {
      if (!current) current = emptyMenu();
      current.agregadoId = item.productoId;
    } else if (item.rol === 'ensalada') {
      if (!current) current = emptyMenu();
      current.ensaladaId = item.productoId;
    } else {
      // bebida, crema, extra → extras del menú actual
      if (!current) current = emptyMenu();
      current.extras.push({
        id: newId('extra'),
        productoId: item.productoId,
        cantidad: item.cantidad,
      });
    }
  }
  if (current) menus.push(current);
  return menus.length > 0 ? menus : [emptyMenu()];
}

/** Convierte los menús visuales de vuelta al modelo plano (PedidoItem[]).
 *  Cada componente (fondo, agregado, ensalada, extras) se aplana a un
 *  PedidoItem independiente, consistente con el modelo de colación. */
function menusToItems(menus: MenuForm[], productos: Producto[]): PedidoItem[] {
  const items: PedidoItem[] = [];
  for (const menu of menus) {
    if (menu.fondoId) {
      const prod = productos.find((p) => p.id === menu.fondoId);
      if (prod) {
        const item: PedidoItem = {
          productoId: prod.id,
          nombre: prod.nombre,
          precio: prod.precio,
          cantidad: menu.fondoCantidad,
          rol: 'fondo',
        };
        if (menu.notas.trim()) item.notas = menu.notas.trim();
        items.push(item);
      }
    }
    if (menu.agregadoId) {
      const prod = productos.find((p) => p.id === menu.agregadoId);
      if (prod) {
        items.push({
          productoId: prod.id,
          nombre: prod.nombre,
          precio: prod.precio,
          cantidad: 1,
          rol: 'agregado',
        });
      }
    }
    if (menu.ensaladaId) {
      const prod = productos.find((p) => p.id === menu.ensaladaId);
      if (prod) {
        items.push({
          productoId: prod.id,
          nombre: prod.nombre,
          precio: prod.precio,
          cantidad: 1,
          rol: 'ensalada',
        });
      }
    }
    for (const extra of menu.extras) {
      const prod = productos.find((p) => p.id === extra.productoId);
      if (prod) {
        items.push({
          productoId: prod.id,
          nombre: prod.nombre,
          precio: prod.precio,
          cantidad: extra.cantidad,
          rol: (prod.categoria as PedidoItem['rol']) || 'extra',
        });
      }
    }
  }
  return items;
}

/** Convierte una colación en un menú visual. */
function colacionToMenu(col: Colacion): MenuForm {
  const menu = emptyMenu();
  const notas: string[] = [];
  for (const ci of col.items) {
    if (ci.rol === 'fondo') {
      menu.fondoId = ci.productoId;
      if (ci.nota) notas.push(ci.nota);
    } else if (ci.rol === 'agregado') {
      menu.agregadoId = ci.productoId;
      if (ci.nota) notas.push(ci.nota);
    } else if (ci.rol === 'ensalada') {
      menu.ensaladaId = ci.productoId;
      if (ci.nota) notas.push(ci.nota);
    } else {
      menu.extras.push({
        id: newId('extra'),
        productoId: ci.productoId,
        cantidad: 1,
      });
      if (ci.nota) notas.push(ci.nota);
    }
  }
  if (notas.length > 0) menu.notas = notas.join(' · ');
  return menu;
}

// --- Componente ------------------------------------------------------------

interface Props {
  productos: Producto[];
  colaciones: Colacion[];
  clientes: Cliente[];
  inicial?: Pedido | null;
  onSubmit: (input: PedidoInput) => Promise<void>;
  onCancel: () => void;
  /** Verifica si ya existe otro pedido con la misma dirección esa fecha. */
  onVerificarDireccion?: (direccion: string, fecha: string, excludeId?: string) => Promise<Pedido[]>;
  /** Crea (o encuentra) un cliente nuevo desde el formulario de pedido. */
  onCrearCliente?: (input: ClienteInput) => Promise<Cliente>;
}

export function PedidoForm({
  productos,
  colaciones,
  clientes,
  inicial,
  onSubmit,
  onCancel,
  onVerificarDireccion,
  onCrearCliente,
}: Props) {
  // --- Cliente ---
  const [modoCliente, setModoCliente] = useState<'existente' | 'nuevo'>('existente');
  const [clienteId, setClienteId] = useState<string>(inicial?.clienteId ?? '');
  const [clienteNombre, setClienteNombre] = useState<string | null>(inicial?.clienteNombre ?? null);
  const [clienteDireccion, setClienteDireccion] = useState<string>(inicial?.clienteDireccion ?? '');
  const [clienteContacto, setClienteContacto] = useState<string>(inicial?.clienteContacto ?? '');
  const [registradoPor, setRegistradoPor] = useState(inicial?.registradoPor ?? '');
  const [fecha, setFecha] = useState(inicial?.fecha ?? hoyISO());

  // --- Composición (menús) ---
  const [menus, setMenus] = useState<MenuForm[]>(() =>
    inicial ? itemsToMenus(inicial.items, productos) : [emptyMenu()],
  );
  const [colacionId, setColacionId] = useState<string | null>(inicial?.colacionId ?? null);
  // Selección temporal de extra por menú (menuId → { productoId, cantidad })
  const [extraSel, setExtraSel] = useState<Record<string, { productoId: string; cantidad: number }>>({});

  // --- Envío y pago ---
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>(inicial?.tipoEntrega ?? 'retiro');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(inicial?.metodoPago ?? 'efectivo');

  // --- UI state ---
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [avisoDireccion, setAvisoDireccion] = useState<string | null>(null);

  // --- Productos filtrados por categoría ---
  const fondos = useMemo(
    () => productos.filter((p) => p.disponible && p.categoria === 'fondo'),
    [productos],
  );
  const agregados = useMemo(
    () => productos.filter((p) => p.disponible && p.categoria === 'agregado'),
    [productos],
  );
  const ensaladas = useMemo(
    () => productos.filter((p) => p.disponible && p.categoria === 'ensalada'),
    [productos],
  );
  const extrasDisponibles = useMemo(
    () => productos.filter((p) => p.disponible && !['fondo', 'agregado', 'ensalada'].includes(p.categoria)),
    [productos],
  );

  // --- Items planos derivados de los menús (para total y submit) ---
  const items = useMemo(() => menusToItems(menus, productos), [menus, productos]);
  const subtotal = useMemo(
    () => items.reduce((acc, it) => acc + it.precio * it.cantidad, 0),
    [items],
  );
  const deliveryCost = tipoEntrega === 'delivery' ? DELIVERY_COST : 0;
  const total = subtotal + deliveryCost;

  // --- Aviso de dirección duplicada ---
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

  // --- Handlers de cliente ---
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

  // --- Handlers de menús ---
  const actualizarMenu = (id: string, patch: Partial<MenuForm>) => {
    setMenus((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const agregarMenu = () => {
    setMenus((prev) => [...prev, emptyMenu()]);
  };

  const quitarMenu = (id: string) => {
    setMenus((prev) => (prev.length > 1 ? prev.filter((m) => m.id !== id) : prev));
  };

  const agregarExtra = (menuId: string) => {
    const sel = extraSel[menuId];
    if (!sel?.productoId) return;
    setMenus((prev) =>
      prev.map((m) =>
        m.id === menuId
          ? { ...m, extras: [...m.extras, { id: newId('extra'), productoId: sel.productoId, cantidad: sel.cantidad || 1 }] }
          : m,
      ),
    );
    setExtraSel((prev) => ({ ...prev, [menuId]: { productoId: '', cantidad: 1 } }));
  };

  const quitarExtra = (menuId: string, extraId: string) => {
    setMenus((prev) =>
      prev.map((m) =>
        m.id === menuId ? { ...m, extras: m.extras.filter((e) => e.id !== extraId) } : m,
      ),
    );
  };

  // --- Precarga desde colación ---
  const precargarColacion = (id: string) => {
    const col = colaciones.find((c) => c.id === id);
    if (!col) return;
    setColacionId(id);
    setMenus((prev) => {
      // Si solo hay un menú vacío, lo reemplaza; si no, añade
      if (prev.length === 1 && !prev[0].fondoId && prev[0].extras.length === 0) {
        return [colacionToMenu(col)];
      }
      return [...prev, colacionToMenu(col)];
    });
    setError(null);
  };

  const desdeCero = () => {
    setColacionId(null);
    setMenus([emptyMenu()]);
  };

  // --- Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError('Agrega al menos un item');
      return;
    }
    const estadoPago: EstadoPago = metodoPago === 'efectivo' ? 'pagado' : 'pendiente';
    setError(null);
    setGuardando(true);
    try {
      let idFinal = clienteId;
      let nombreFinal = clienteNombre;
      let dirFinal = clienteDireccion;
      let contFinal = clienteContacto;

      if (modoCliente === 'nuevo') {
        if (!clienteDireccion.trim() || !clienteContacto.trim()) {
          setError('Dirección y contacto son obligatorios para el cliente nuevo');
          setGuardando(false);
          return;
        }
        if (!onCrearCliente) {
          setError('No se puede crear un cliente nuevo desde aquí');
          setGuardando(false);
          return;
        }
        const nuevoCliente = await onCrearCliente({
          nombre: clienteNombre?.trim() || null,
          direccion: clienteDireccion.trim(),
          contacto: clienteContacto.trim(),
        });
        idFinal = nuevoCliente.id;
        nombreFinal = nuevoCliente.nombre ?? null;
        dirFinal = nuevoCliente.direccion;
        contFinal = nuevoCliente.contacto;
      } else if (!idFinal) {
        setError('El cliente es obligatorio');
        setGuardando(false);
        return;
      }

      const payload: PedidoInput = {
        fecha,
        clienteId: idFinal,
        clienteNombre: nombreFinal,
        clienteDireccion: dirFinal,
        clienteContacto: contFinal,
        registradoPor: registradoPor.trim(),
        colacionId,
        items,
        total,
        tipoEntrega,
        deliveryCost,
        metodoPago,
        estadoPago,
      };
      // `estado` solo viaja al editar. En un pedido nuevo la clave se OMITE:
      // ponerla en `undefined` es lo que Firestore rechaza con
      // "Unsupported field value: undefined".
      if (inicial?.estado) payload.estado = inicial.estado;

      await onSubmit(payload);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  };

  // --- Render ---
  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <p className={styles.error}>{error}</p>}

      {/* ═══ SECCIÓN 1: COMPOSICIÓN (menús) ═══ */}
      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Composición del pedido</legend>

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

        {menus.map((menu, idx) => (
          <fieldset key={menu.id} className={styles.menu}>
            <header className={styles.menuHeader}>
              <legend className={styles.menuTitulo}>Menú {idx + 1}</legend>
              {menus.length > 1 && (
                <button
                  type="button"
                  className={styles.menuQuitar}
                  onClick={() => quitarMenu(menu.id)}
                  aria-label={`Quitar menú ${idx + 1}`}
                >
                  Quitar menú
                </button>
              )}
            </header>

            {/* Fondo */}
            <label className={styles.field}>
              Fondo (opcional)
              <select
                value={menu.fondoId}
                onChange={(e) => actualizarMenu(menu.id, { fondoId: e.target.value })}
              >
                <option value="">— Sin fondo —</option>
                {fondos.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre} — ${f.precio.toLocaleString('es-CL')}
                  </option>
                ))}
              </select>
            </label>

            {/* Personalización del fondo: solo aparece cuando hay fondo seleccionado */}
            {menu.fondoId && (
              <div className={styles.personalizacion}>
                <span className={styles.personalizacionLabel}>Personalización del fondo:</span>
                <div className={styles.row}>
                  <label className={styles.field}>
                    Cantidad
                    <input
                      type="number"
                      min={1}
                      value={menu.fondoCantidad}
                      onChange={(e) => actualizarMenu(menu.id, { fondoCantidad: Number(e.target.value) })}
                      className={styles.cant}
                    />
                  </label>
                  <label className={styles.field}>
                    Agregado (opcional)
                    <select
                      value={menu.agregadoId}
                      onChange={(e) => actualizarMenu(menu.id, { agregadoId: e.target.value })}
                    >
                      <option value="">— Sin agregado —</option>
                      {agregados.map((a) => (
                        <option key={a.id} value={a.id}>{a.nombre}</option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    Ensalada (opcional)
                    <select
                      value={menu.ensaladaId}
                      onChange={(e) => actualizarMenu(menu.id, { ensaladaId: e.target.value })}
                    >
                      <option value="">— Sin ensalada —</option>
                      {ensaladas.map((en) => (
                        <option key={en.id} value={en.id}>{en.nombre}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className={styles.field}>
                  Notas
                  <input
                    value={menu.notas}
                    onChange={(e) => actualizarMenu(menu.id, { notas: e.target.value })}
                    placeholder="ej. sin cebolla"
                  />
                </label>
              </div>
            )}

            {/* Extras (bebidas, cremas, otros) */}
            <div className={styles.extras}>
              <span className={styles.extrasLabel}>Extras y bebidas</span>

              {menu.extras.length > 0 && (
                <ul className={styles.extraLista}>
                  {menu.extras.map((extra) => {
                    const prod = productos.find((p) => p.id === extra.productoId);
                    return (
                      <li key={extra.id} className={styles.extraItem}>
                        <span className={styles.extraInfo}>
                          {extra.cantidad}× {prod?.nombre ?? extra.productoId}
                        </span>
                        <span className={styles.extraPrecio}>
                          ${((prod?.precio ?? 0) * extra.cantidad).toLocaleString('es-CL')}
                        </span>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => quitarExtra(menu.id, extra.id)}
                        >
                          Quitar
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className={styles.addExtra}>
                <select
                  value={extraSel[menu.id]?.productoId ?? ''}
                  onChange={(e) =>
                    setExtraSel((prev) => ({
                      ...prev,
                      [menu.id]: { productoId: e.target.value, cantidad: prev[menu.id]?.cantidad ?? 1 },
                    }))
                  }
                >
                  <option value="">— Producto —</option>
                  {extrasDisponibles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} — ${p.precio.toLocaleString('es-CL')}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={extraSel[menu.id]?.cantidad ?? 1}
                  onChange={(e) =>
                    setExtraSel((prev) => ({
                      ...prev,
                      [menu.id]: { productoId: prev[menu.id]?.productoId ?? '', cantidad: Number(e.target.value) },
                    }))
                  }
                  className={styles.cant}
                />
                <button type="button" onClick={() => agregarExtra(menu.id)}>
                  Agregar extra
                </button>
              </div>
            </div>
          </fieldset>
        ))}

        <button type="button" className={styles.addMenu} onClick={agregarMenu}>
          + Añadir menú
        </button>
      </fieldset>

      {/* ═══ SECCIÓN 2: CLIENTE ═══ */}
      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Cliente</legend>

        <div className={styles.modoCliente} role="tablist" aria-label="Modo de cliente">
          <button
            type="button"
            role="tab"
            aria-selected={modoCliente === 'existente'}
            className={styles.modoTab}
            data-activo={modoCliente === 'existente'}
            onClick={() => {
              setModoCliente('existente');
              setClienteId('');
              setClienteNombre(null);
              setClienteDireccion('');
              setClienteContacto('');
            }}
          >
            Cliente existente
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={modoCliente === 'nuevo'}
            className={styles.modoTab}
            data-activo={modoCliente === 'nuevo'}
            onClick={() => {
              setModoCliente('nuevo');
              setClienteId('');
              setClienteNombre(null);
              setClienteDireccion('');
              setClienteContacto('');
            }}
          >
            Crear cliente nuevo
          </button>
        </div>

        {modoCliente === 'existente' ? (
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
        ) : (
          <>
            <label className={styles.field}>
              Nombre (opcional)
              <input
                value={clienteNombre ?? ''}
                onChange={(e) => setClienteNombre(e.target.value || null)}
                placeholder="ej. Juan Pérez"
              />
            </label>
            <div className={styles.row}>
              <label className={styles.field}>
                Dirección *
                <input
                  value={clienteDireccion}
                  onChange={(e) => setClienteDireccion(e.target.value)}
                  placeholder="ej. Av. Siempre Viva 742"
                />
              </label>
              <label className={styles.field}>
                Contacto *
                <input
                  value={clienteContacto}
                  onChange={(e) => setClienteContacto(e.target.value)}
                  placeholder="ej. +56 9 1234 5678"
                />
              </label>
            </div>
          </>
        )}

        {clienteId && (clienteDireccion || clienteContacto) && (
          <div className={styles.clienteInfo}>
            {clienteDireccion && <span>Dirección: {clienteDireccion}</span>}
            {clienteContacto && <span>Contacto: {clienteContacto}</span>}
          </div>
        )}

        <div className={styles.row}>
          <label className={styles.field}>
            Registrado por
            <input value={registradoPor} onChange={(e) => setRegistradoPor(e.target.value)} placeholder="usuario" />
          </label>
          <label className={styles.field}>
            Fecha
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
        </div>
      </fieldset>

      {/* ═══ SECCIÓN 3: ENVÍO Y PAGO ═══ */}
      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Envío y pago</legend>

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
      </fieldset>

      {/* ═══ TOTAL ═══ */}
      <div className={styles.total}>
        <span className={styles.totalLinea}>
          Subtotal <span>${subtotal.toLocaleString('es-CL')}</span>
        </span>
        {deliveryCost > 0 && (
          <span className={styles.totalLinea}>
            Delivery <span>${deliveryCost.toLocaleString('es-CL')}</span>
          </span>
        )}
        <strong className={styles.totalFinal}>
          Total <span>${total.toLocaleString('es-CL')}</span>
        </strong>
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
