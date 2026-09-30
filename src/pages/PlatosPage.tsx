import { useMemo, useState } from 'react';
import { usePlatos } from '../hooks/usePlatos';
import { useProductos } from '../hooks/useProductos';
import { PlatoForm } from '../components/PlatoForm';
import { PageHeader } from '../components/PageHeader';
import { Drawer } from '../components/Drawer';
import { PlatoList } from '../components/PlatoList';
import { filtrarPlatos } from '../utils/platoFiltros';
import type { Plato, PlatoInput, TipoPlato } from '../types';
import styles from './PlatosPage.module.css';

const TIPOS: { valor: TipoPlato | null; label: string }[] = [
  { valor: null, label: 'Todos' },
  { valor: 'menu', label: 'Menús' },
  { valor: 'colacion', label: 'Colaciones' },
];

export function PlatosPage() {
  const { platos, loading, error, create, update, remove, setActiva } = usePlatos();
  const { productos } = useProductos();
  const [editando, setEditando] = useState<Plato | null>(null);
  const [mostrandoForm, setMostrandoForm] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState<TipoPlato | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const productosMap = useMemo(() => {
    const m = new Map<string, string>();
    productos.forEach((p) => m.set(p.id, p.nombre));
    return m;
  }, [productos]);

  const visibles = useMemo(
    () => filtrarPlatos(platos, { tipo: tipoFiltro, busqueda }),
    [platos, tipoFiltro, busqueda],
  );

  const handleSubmit = async (input: PlatoInput) => {
    if (editando) {
      await update(editando.id, input);
    } else {
      await create(input);
    }
    setMostrandoForm(false);
  };

  const editar = (p: Plato) => {
    setEditando(p);
    setMostrandoForm(true);
  };

  const nuevo = () => {
    setEditando(null);
    setMostrandoForm(true);
  };

  // No se limpia `editando` al cerrar: Vaul mantiene el contenido montado
  // durante la animación de salida y el formulario parpadearía a vacío. Cada
  // camino de apertura fija `editando` explícitamente.
  const cancelar = () => setMostrandoForm(false);

  const eliminar = async (id: string) => {
    if (confirm('¿Eliminar este plato?')) {
      await remove(id);
    }
  };

  // Toggle "disponible hoy": varios platos pueden estar activos a la vez.
  const toggleDisponible = async (p: Plato) => {
    await setActiva(p.id, !p.activa);
  };

  return (
    <div>
      <PageHeader
        titulo="Platos"
        descripcion="Menús del día (ítems libres) y colaciones de valor fijo. Pueden estar disponibles varios a la vez."
        acciones={
          <button className="primary" onClick={nuevo}>
            Nuevo plato
          </button>
        }
      />

      <div className={styles.filtros}>
        <input
          type="search"
          className={styles.busqueda}
          placeholder="Buscar por nombre…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar plato por nombre"
        />
        <div className={styles.chips} role="group" aria-label="Filtrar por tipo">
          {TIPOS.map((t) => (
            <button
              key={t.label}
              type="button"
              className={`${styles.chip} ${tipoFiltro === t.valor ? styles.chipActivo : ''}`}
              aria-pressed={tipoFiltro === t.valor}
              onClick={() => setTipoFiltro(t.valor)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <Drawer
        open={mostrandoForm}
        onOpenChange={(open) => {
          if (!open) cancelar();
        }}
        title={editando ? 'Editar plato' : 'Nuevo plato'}
      >
        <PlatoForm
          productos={productos}
          inicial={editando}
          onSubmit={handleSubmit}
          onCancel={cancelar}
        />
      </Drawer>

      <PlatoList
        platos={visibles}
        productosMap={productosMap}
        onEdit={editar}
        onDelete={eliminar}
        onToggleActiva={toggleDisponible}
        loading={loading}
        error={error}
      />
    </div>
  );
}
