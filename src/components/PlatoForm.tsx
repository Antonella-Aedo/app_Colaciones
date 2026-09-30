import { useMemo, useRef, useState } from 'react';
import type { Plato, PlatoInput, PlatoItem, Producto, RolItem, TipoPlato } from '../types';
import { fotoDeMenu } from '../assets/menuFotos';
import { archivoADataUrl } from '../utils/imagen';
import { hoyISO } from '../utils/date';
import styles from './PlatoForm.module.css';
import { mensajeDeError } from '../utils/errores';

const ROLES: RolItem[] = ['fondo', 'agregado', 'ensalada', 'extra'];

interface Props {
  productos: Producto[];
  inicial?: Plato | null;
  onSubmit: (input: PlatoInput) => Promise<void>;
  onCancel: () => void;
}

export function PlatoForm({ productos, inicial, onSubmit, onCancel }: Props) {
  const [tipo, setTipo] = useState<TipoPlato>(inicial?.tipo ?? 'menu');
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [fecha, setFecha] = useState(inicial?.fecha ?? hoyISO());
  const [valor, setValor] = useState(inicial?.valor?.toString() ?? '');
  const [activa, setActiva] = useState(inicial?.activa ?? false);
  const [creadoPor, setCreadoPor] = useState(inicial?.creadoPor ?? '');
  const [items, setItems] = useState<PlatoItem[]>(inicial?.items ?? []);
  const [foto, setFoto] = useState<string | undefined>(inicial?.foto);
  const [cargandoFoto, setCargandoFoto] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);
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
      setError('Solo se permite un agregado por plato');
      return;
    }
    setError(null);
    const orden = items.length + 1;
    // `nota` es opcional: si esta vacia se OMITE la clave (mismo criterio que
    // el resto de campos opcionales del modelo documental).
    const notaLimpia = nota.trim();
    const nuevoItem: PlatoItem = { productoId: productoSel, rol: rolSel, orden };
    if (notaLimpia) nuevoItem.nota = notaLimpia;
    setItems((prev) => [...prev, nuevoItem]);
    setProductoSel('');
    setNota('');
  };

  const quitarItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, orden: i + 1 })));
  };

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Resetea el input: permite volver a elegir el mismo archivo.
    e.target.value = '';
    if (!file) return;
    setError(null);
    setCargandoFoto(true);
    try {
      setFoto(await archivoADataUrl(file));
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargandoFoto(false);
    }
  };

  const fotoUrl = fotoDeMenu(foto);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (tipo === 'menu' && !fecha) {
      setError('La fecha es obligatoria en un menú');
      return;
    }
    if (tipo === 'colacion' && !(Number(valor) > 0)) {
      setError('Una colación requiere un valor predeterminado mayor que cero');
      return;
    }
    if (items.length === 0) {
      setError('Agrega al menos un item al plato');
      return;
    }
    const tieneFondo = items.some((it) => it.rol === 'fondo');
    if (!tieneFondo) {
      setError('El plato debe tener al menos un item con rol "fondo"');
      return;
    }
    const agregados = items.filter((it) => it.rol === 'agregado');
    if (agregados.length > 1) {
      setError('Solo se permite un agregado por plato');
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      const input: PlatoInput = {
        nombre: nombre.trim(),
        tipo,
        activa,
        creadoPor: creadoPor.trim(),
        items,
      };
      // Opcionales: se OMITE la clave cuando no aplica (sin undefined).
      if (fecha) input.fecha = fecha;
      if (tipo === 'colacion' && valor.trim()) input.valor = Number(valor);
      // Foto opcional: clave de MENU_FOTOS (seed) o data URL subida por el
      // usuario. Si se quitó, la clave se omite y `replace` la elimina.
      if (foto) input.foto = foto;
      await onSubmit(input);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <p className={styles.error}>{error}</p>}

      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Datos del plato</legend>
        <div className={styles.row}>
          <label className={styles.field}>
            Tipo *
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoPlato)}>
              <option value="menu">Menú — ítems libres, del día</option>
              <option value="colacion">Colación — set con valor fijo</option>
            </select>
          </label>
          <label className={styles.field}>
            Nombre *
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus placeholder="ej. Menú del día 20/08" />
          </label>
        </div>
        <div className={styles.row}>
          <label className={styles.field}>
            Fecha {tipo === 'menu' ? '*' : '(opcional)'}
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
          {tipo === 'colacion' && (
            <label className={styles.field}>
              Valor fijo *
              <input
                type="number"
                inputMode="numeric"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="6500"
              />
            </label>
          )}
          <label className={styles.field}>
            Armado por
            <input value={creadoPor} onChange={(e) => setCreadoPor(e.target.value)} placeholder="usuario" />
          </label>
        </div>
        <label className={styles.check}>
          <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} />
          Disponible hoy
        </label>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Foto (opcional)</legend>
        <div className={styles.fotoRow}>
          {fotoUrl ? (
            <img className={styles.fotoPreview} src={fotoUrl} alt="Foto del plato" />
          ) : (
            <div className={styles.fotoVacia}>Sin foto</div>
          )}
          <div className={styles.fotoAcciones}>
            <button
              type="button"
              onClick={() => fotoInputRef.current?.click()}
              disabled={cargandoFoto}
            >
              {cargandoFoto ? 'Procesando…' : foto ? 'Cambiar foto' : 'Subir foto'}
            </button>
            {foto && (
              <button type="button" className="danger" onClick={() => setFoto(undefined)}>
                Quitar
              </button>
            )}
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              className={styles.fotoInputOculto}
              aria-label="Archivo de foto del plato"
              onChange={handleFoto}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Composición de la bandeja</legend>

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

        {items.length === 0 ? (
          <p className={styles.vacio}>Todavía no hay nada en la bandeja.</p>
        ) : (
          <ul className={styles.items}>
            {items.map((it, idx) => {
              const prod = productosMap.get(it.productoId);
              return (
                <li key={idx} data-rol={it.rol}>
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
      </fieldset>

      <div className={styles.actions}>
        <button type="submit" className="primary" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar plato'}
        </button>
        <button type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
