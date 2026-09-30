// Página de comparación de diseños para la card de plato.
// Cinco direcciones con los mismos datos y los mismos estados; el toggle
// "disponible hoy" o eliminar en una variante actualiza todas — así se
// evalúa la ficha, no el dato. Las muestras cubren el dominio real:
// menús (fecha) y colaciones (valor fijo), con dos activos simultáneos.
import { useState } from 'react';
import type { Plato, PlatoItem, RolItem, TipoPlato } from '../types';
import { PageHeader } from '../components/PageHeader';
import { fotoDeMenu } from '../assets/menuFotos';
import styles from './TestColaciones.module.css';

const ROLES: RolItem[] = ['fondo', 'agregado', 'ensalada', 'extra'];

const ROL_LABEL: Record<RolItem, string> = {
  fondo: 'Fondo',
  agregado: 'Agregado',
  ensalada: 'Ensalada',
  extra: 'Extra',
};

const TIPO_LABEL: Record<TipoPlato, string> = {
  menu: 'Menú',
  colacion: 'Colación',
};

// --- Datos de muestra (catálogo semilla + platos plausibles) -----------------

const productosMap = new Map<string, string>([
  ['p-cazuela', 'Cazuela de osobuco'],
  ['p-tallarines', 'Tallarines al pesto'],
  ['p-chuleta', 'Chuleta'],
  ['p-costillar', 'Costillar a la BBQ'],
  ['p-pescado', 'Pescado frito o apanado'],
  ['p-arroz', 'Arroz'],
  ['p-pure', 'Puré'],
  ['p-papas', 'Papas fritas'],
  ['p-zapallo', 'Guiso de zapallo italiano'],
  ['p-surtida', 'Ensalada surtida'],
  ['p-bebida', 'Bebida 250 ml'],
  ['p-jugo', 'Jugo del valle 400 ml'],
  ['p-pan', 'Pan amasado'],
]);

const item = (
  productoId: string,
  rol: RolItem,
  orden: number,
  nota?: string,
): PlatoItem => {
  const it: PlatoItem = { productoId, rol, orden };
  if (nota) it.nota = nota;
  return it;
};

const diaISO = (offset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Dos activos a la vez (menú del día + colación fija): así se ve el
// multi-disponible que ahora permite el dominio.
const PLATOS_INICIAL: Plato[] = [
  {
    id: 'p-hoy',
    nombre: 'Menú del día — completo',
    tipo: 'menu',
    fecha: diaISO(0),
    activa: true,
    creadoPor: 'cocina@colaciones.cl',
    foto: 'cazuela',
    items: [
      item('p-cazuela', 'fondo', 1, 'con hueso'),
      item('p-tallarines', 'fondo', 2),
      item('p-arroz', 'agregado', 3),
      item('p-surtida', 'ensalada', 4),
      item('p-pan', 'extra', 5, 'dos unidades'),
      item('p-bebida', 'extra', 6),
    ],
  },
  {
    id: 'col-clasica',
    nombre: 'Colación clásica',
    tipo: 'colacion',
    activa: true,
    valor: 6500,
    creadoPor: 'admin@colaciones.cl',
    foto: 'costillar',
    items: [
      item('p-costillar', 'fondo', 1),
      item('p-pure', 'agregado', 2),
      item('p-surtida', 'ensalada', 3),
      item('p-bebida', 'extra', 4),
    ],
  },
  {
    id: 'p-ayer',
    nombre: 'Menú del día — ayer',
    tipo: 'menu',
    fecha: diaISO(-1),
    activa: false,
    creadoPor: 'cocina@colaciones.cl',
    foto: 'chuleta',
    items: [
      item('p-chuleta', 'fondo', 1, '+ huevo frito'),
      item('p-papas', 'agregado', 2),
      item('p-surtida', 'ensalada', 3),
      item('p-jugo', 'extra', 4),
    ],
  },
  {
    id: 'col-veg',
    nombre: 'Colación vegetariana',
    tipo: 'colacion',
    activa: false,
    valor: 6000,
    creadoPor: 'admin@colaciones.cl',
    foto: 'vegetariano',
    items: [
      item('p-zapallo', 'fondo', 1),
      item('p-arroz', 'agregado', 2),
      item('p-surtida', 'ensalada', 3),
    ],
  },
];

// --- Helpers compartidos ----------------------------------------------------

const nombreDe = (id: string) => productosMap.get(id) ?? id;

const porRol = (p: Plato, rol: RolItem) =>
  p.items.filter((i) => i.rol === rol).sort((a, b) => a.orden - b.orden);

const rolesPresentes = (p: Plato) => ROLES.filter((r) => porRol(p, r).length > 0);

const fechaDate = (iso: string) => new Date(`${iso}T12:00:00`);

const diaSemana = (iso: string) =>
  fechaDate(iso).toLocaleDateString('es-CL', { weekday: 'long' });

const fechaCorta = (iso: string) =>
  fechaDate(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

const fechaLarga = (iso: string) =>
  fechaDate(iso).toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

const fmtValor = (valor?: number) =>
  valor === undefined ? null : `$${valor.toLocaleString('es-CL')}`;

/** Línea de contexto que cabe donde antes iba la fecha. */
const metaPlato = (p: Plato): string => {
  const partes = [
    TIPO_LABEL[p.tipo],
    p.tipo === 'menu' && p.fecha ? fechaLarga(p.fecha) : null,
    fmtValor(p.valor) ? `Valor fijo ${fmtValor(p.valor)}` : null,
    p.creadoPor,
  ];
  return partes.filter(Boolean).join(' · ');
};

interface VariantProps {
  p: Plato;
  foto?: string;
  onToggle: (p: Plato) => void;
  onEliminar: (id: string) => void;
}

function BadgeActiva() {
  return <span className={styles.badge}>Disponible hoy</span>;
}

function Acciones({ p, onToggle, onEliminar }: VariantProps) {
  return (
    <div className={styles.acciones}>
      <button className={p.activa ? 'primary' : ''} onClick={() => onToggle(p)}>
        {p.activa ? '★ Disponible hoy' : '☆ Disponible'}
      </button>
      <button>Editar</button>
      <button className="danger" onClick={() => onEliminar(p.id)}>
        Eliminar
      </button>
    </div>
  );
}

// --- A · Bandeja -------------------------------------------------------------
// La firma visual literal: la card es la bandeja. El fondo manda en el
// compartimento grande; los acompañamientos viven en la columna lateral.

function CardBandeja({ p, foto, onToggle, onEliminar }: VariantProps) {
  const fondos = porRol(p, 'fondo');
  const laterales = ROLES.filter((r) => r !== 'fondo' && porRol(p, r).length > 0);

  return (
    <article className={styles.aCard} data-activa={p.activa}>
      <header className={styles.aHead}>
        <div>
          <h3 className={styles.aNombre}>{p.nombre}</h3>
          <p className={styles.aMeta}>{metaPlato(p)}</p>
        </div>
        {p.activa && <BadgeActiva />}
      </header>

      <div className={styles.bandeja}>
        <div className={styles.comp} data-rol="fondo">
          {foto && <img className={styles.compFoto} src={foto} alt="" loading="lazy" />}
          <span className={styles.compLabel}>Fondo</span>
          <ul>
            {fondos.map((it, i) => (
              <li key={i}>
                {nombreDe(it.productoId)}
                {it.nota && <small>{it.nota}</small>}
              </li>
            ))}
          </ul>
        </div>
        {laterales.length > 0 && (
          <div className={styles.aCol}>
            {laterales.map((rol) => (
              <div key={rol} className={styles.comp} data-rol={rol}>
                <span className={styles.compLabel}>{ROL_LABEL[rol]}</span>
                <ul>
                  {porRol(p, rol).map((it, i) => (
                    <li key={i}>
                      {nombreDe(it.productoId)}
                      {it.nota && <small>{it.nota}</small>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <Acciones p={p} onToggle={onToggle} onEliminar={onEliminar} />
    </article>
  );
}

// --- B · Pizarra -------------------------------------------------------------
// Carta de restaurant: banda oscura con el día, líneas con puntos de guía
// entre el rol y el plato. Familiar para quien viene de un menú impreso.

function CardPizarra({ p, foto, onToggle, onEliminar }: VariantProps) {
  return (
    <article className={styles.bCard} data-activa={p.activa}>
      {foto && <img className={styles.bFoto} src={foto} alt="" loading="lazy" />}
      <div className={styles.bTop}>
        <span>
          {TIPO_LABEL[p.tipo]}
          {p.activa ? ' · disponible hoy' : ''}
        </span>
        <time className={styles.bFecha}>
          {p.tipo === 'menu' && p.fecha ? fechaLarga(p.fecha) : `Valor fijo ${fmtValor(p.valor)}`}
        </time>
      </div>
      <div className={styles.bBody}>
        <h3 className={styles.bNombre}>{p.nombre}</h3>
        <div className={styles.bLineas}>
          {rolesPresentes(p).map((rol) => (
            <div key={rol} className={styles.bLinea} data-rol={rol}>
              <span className={styles.bRol}>{ROL_LABEL[rol]}</span>
              <i className={styles.bLeader} aria-hidden="true" />
              <span className={styles.bItems}>
                {porRol(p, rol).map((it, i) => (
                  <span key={i}>
                    {nombreDe(it.productoId)}
                    {it.nota && <em className={styles.bNota}> ({it.nota})</em>}
                    {i < porRol(p, rol).length - 1 && <span className={styles.bSep}> · </span>}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
      <footer className={styles.bFoot}>
        <span className={styles.bCreador}>por {p.creadoPor}</span>
        <Acciones p={p} onToggle={onToggle} onEliminar={onEliminar} />
      </footer>
    </article>
  );
}

// --- C · Fila compacta -------------------------------------------------------
// Densidad: una fila por plato. Menú: fecha en bloque tipo calendario;
// colación: valor fijo en el mismo bloque. Chips de color por rol.

function FilaCompacta({ p, foto, onToggle, onEliminar }: VariantProps) {
  const esMenu = p.tipo === 'menu';
  return (
    <li className={styles.cFila} data-activa={p.activa}>
      {foto && <img className={styles.cFoto} src={foto} alt="" loading="lazy" />}
      <div className={styles.cFecha}>
        {esMenu && p.fecha ? (
          <>
            <b>{fechaDate(p.fecha).getDate()}</b>
            <span>{diaSemana(p.fecha).slice(0, 3)}</span>
          </>
        ) : (
          <>
            <b>{fmtValor(p.valor)}</b>
            <span>fijo</span>
          </>
        )}
      </div>
      <div className={styles.cInfo}>
        <span className={styles.cTit}>
          <strong>{p.nombre}</strong>
          {p.activa && <BadgeActiva />}
        </span>
        <span className={styles.cChips}>
          {rolesPresentes(p).flatMap((rol) =>
            porRol(p, rol).map((it, i) => (
              <span key={`${rol}-${i}`} className={styles.chip} data-rol={rol}>
                {nombreDe(it.productoId)}
              </span>
            )),
          )}
        </span>
      </div>
      <div className={styles.cAct}>
        <button onClick={() => onToggle(p)}>{p.activa ? '★' : '☆'}</button>
        <button onClick={() => onEliminar(p.id)}>✕</button>
      </div>
    </li>
  );
}

// --- D · Poster --------------------------------------------------------------
// La variante en producción (PlatoList). Menú: el día manda en tipografía
// grande. Colación: el nombre manda y el valor fijo va en la línea meta.
// Los activos llevan el riel de tres compartimentos del logo.

function CardPoster({ p, foto, onToggle, onEliminar }: VariantProps) {
  const esMenu = p.tipo === 'menu';
  const valor = fmtValor(p.valor);
  return (
    <article className={styles.dCard} data-activa={p.activa}>
      {foto && <img className={styles.dFoto} src={foto} alt="" loading="lazy" />}
      <div>
        <span className={styles.dEyebrow}>
          {esMenu ? p.nombre : `Colación${valor ? ` · ${valor}` : ''}`}
          {p.activa ? ' — disponible hoy' : ''}
        </span>
        <div className={styles.dDia}>{esMenu && p.fecha ? diaSemana(p.fecha) : p.nombre}</div>
        <span className={styles.dFecha}>
          {esMenu && p.fecha
            ? `${fechaCorta(p.fecha)} · ${p.creadoPor}`
            : `Valor fijo · ${p.creadoPor}`}
        </span>
      </div>

      <ul className={styles.dItems}>
        {rolesPresentes(p).flatMap((rol) =>
          porRol(p, rol).map((it, i) => (
            <li key={`${rol}-${i}`} className={styles.dItem} data-rol={rol}>
              <span>
                {nombreDe(it.productoId)}
                {it.nota && <span className={styles.dNota}> · {it.nota}</span>}
              </span>
              <span className={styles.dRol}>{ROL_LABEL[rol]}</span>
            </li>
          )),
        )}
      </ul>

      <footer className={styles.dFoot}>
        <Acciones p={p} onToggle={onToggle} onEliminar={onEliminar} />
      </footer>
    </article>
  );
}

// --- E · Ticket --------------------------------------------------------------
// Ficha de cocina: tabla de roles con etiqueta de color a la izquierda e
// ítems a la derecha, separadores punteados de boleta. El más administrativo.

function CardTicket({ p, foto, onToggle, onEliminar }: VariantProps) {
  return (
    <article className={styles.eCard} data-activa={p.activa}>
      <header className={styles.eHead}>
        <div>
          <h3 className={styles.eNombre}>{p.nombre}</h3>
          <span className={styles.eFecha}>{metaPlato(p)}</span>
        </div>
        <span className={styles.eHeadRight}>
          {p.activa && <BadgeActiva />}
          {foto && <img className={styles.eFoto} src={foto} alt="" loading="lazy" />}
        </span>
      </header>

      <div className={styles.eTabla}>
        {rolesPresentes(p).map((rol) => (
          <div key={rol} className={styles.eFila}>
            <span className={styles.eRol} data-rol={rol}>
              {ROL_LABEL[rol]}
            </span>
            <span className={styles.eItems}>
              {porRol(p, rol).map((it, i) => (
                <span key={i}>
                  {i > 0 && <span className={styles.eSep}> · </span>}
                  <b>{nombreDe(it.productoId)}</b>
                  {it.nota && <span className={styles.eNota}> ({it.nota})</span>}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>

      <footer className={styles.eFoot}>
        <Acciones p={p} onToggle={onToggle} onEliminar={onEliminar} />
      </footer>
    </article>
  );
}

// --- Página ------------------------------------------------------------------

function Variante({
  letra,
  titulo,
  desc,
  modo,
  children,
}: {
  letra: string;
  titulo: string;
  desc: string;
  modo: 'col' | 'grid' | 'filas';
  children: React.ReactNode;
}) {
  return (
    <section className={styles.variante}>
      <header className={styles.vHead}>
        <span className={styles.letra}>{letra}</span>
        <div>
          <h2>{titulo}</h2>
          <p>{desc}</p>
        </div>
      </header>
      <div className={styles.muestra} data-modo={modo}>
        {children}
      </div>
    </section>
  );
}

export function TestColacionesPage() {
  const [platos, setPlatos] = useState<Plato[]>(PLATOS_INICIAL);

  // Toggle "disponible hoy": varios platos pueden estar activos a la vez.
  const toggle = (p: Plato) =>
    setPlatos((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, activa: !x.activa } : x)),
    );

  const eliminar = (id: string) =>
    setPlatos((prev) => prev.filter((x) => x.id !== id));

  const buscar = (id: string) => platos.find((p) => p.id === id);
  const hoy = buscar('p-hoy');
  const clasica = buscar('col-clasica');
  const ayer = buscar('p-ayer');
  const veg = buscar('col-veg');
  const props = { onToggle: toggle, onEliminar: eliminar };
  const fotoDe = (p: Plato) => fotoDeMenu(p.foto);

  return (
    <div>
      <PageHeader
        titulo="Test — cards de plato"
        descripcion="Cinco direcciones para la ficha de plato, con los mismos datos (menús con fecha + colaciones de valor fijo, dos activos a la vez). Marca o desmarca disponibles en cualquiera: todas se actualizan."
      />

      <Variante
        letra="A"
        titulo="Bandeja"
        desc="La firma visual literal: la card es la bandeja de compartimentos del logo. El fondo domina; los acompañamientos viven en la columna lateral, cada uno con el riel de su color. La más propia de la marca."
        modo="col"
      >
        {hoy && <CardBandeja p={hoy} foto={fotoDe(hoy)} {...props} />}
        {veg && <CardBandeja p={veg} foto={fotoDe(veg)} {...props} />}
      </Variante>

      <Variante
        letra="B"
        titulo="Pizarra del día"
        desc="Carta de restaurant: banda oscura con la fecha o el valor fijo (verde cuando está disponible), líneas con puntos de guía entre el rol y el plato. Familiar para quien viene de un menú impreso."
        modo="col"
      >
        {hoy && <CardPizarra p={hoy} foto={fotoDe(hoy)} {...props} />}
        {clasica && <CardPizarra p={clasica} foto={fotoDe(clasica)} {...props} />}
      </Variante>

      <Variante
        letra="C"
        titulo="Fila compacta"
        desc="Densidad: una fila por plato. Menú con bloque de fecha tipo calendario; colación con su valor fijo en el mismo bloque. Chips de color por rol — escanea rápido pero sacrifica la lectura del menú."
        modo="filas"
      >
        <ul className={styles.cLista}>
          {platos.map((p) => (
            <FilaCompacta key={p.id} p={p} foto={fotoDe(p)} {...props} />
          ))}
        </ul>
      </Variante>

      <Variante
        letra="D"
        titulo="Poster (producción)"
        desc="La variante actual de la página Platos. Menú: el día manda en tipografía grande. Colación: el nombre manda y el valor fijo va en la meta. Los disponibles llevan el riel de tres compartimentos del logo."
        modo="grid"
      >
        {platos.map((p) => (
          <CardPoster key={p.id} p={p} foto={fotoDe(p)} {...props} />
        ))}
      </Variante>

      <Variante
        letra="E"
        titulo="Ticket de cocina"
        desc="Formato boleta: tabla de roles con etiqueta de color a la izquierda e ítems a la derecha, separadores punteados. Ordenado y previsible — el más administrativo."
        modo="col"
      >
        {ayer && <CardTicket p={ayer} foto={fotoDe(ayer)} {...props} />}
        {clasica && <CardTicket p={clasica} foto={fotoDe(clasica)} {...props} />}
      </Variante>
    </div>
  );
}
