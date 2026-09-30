/**
 * Tests de electron/updater.mjs — la lógica git/npm detrás del auto-update.
 * `ejecutar` y `existeGit` se inyectan: ningún test toca git, npm ni el
 * sistema de archivos reales.
 */
import { describe, it, expect } from 'vitest';
import {
  crearActualizador,
  type Ejecutar,
  type OpcionesEjecucion,
} from '../../electron/updater.mjs';

type Respuesta = { stdout?: string; stderr?: string } | { throw: unknown };

/** ejecutar falso: responde según la línea de comando exacta. */
function fakeEjecutar(respuestas: Record<string, Respuesta>) {
  const llamadas: string[] = [];
  const opciones: OpcionesEjecucion[] = [];
  const ejecutar: Ejecutar = async (cmd, args, opts) => {
    const clave = `${cmd} ${args.join(' ')}`;
    llamadas.push(clave);
    opciones.push(opts);
    const r = respuestas[clave];
    if (!r) throw new Error(`comando inesperado: ${clave}`);
    if ('throw' in r) throw r.throw;
    return { stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
  };
  return { ejecutar, llamadas, opciones };
}

const ok = (stdout = ''): Respuesta => ({ stdout });
const falla = (stderr: string, extra: object = {}): Respuesta => ({
  throw: Object.assign(new Error(stderr || 'falló'), { stderr, ...extra }),
});

const CWD = '/repo';
const FETCH = 'git fetch --quiet --prune';
const COUNT = 'git rev-list --count HEAD..@{u}';
const RAMA = 'git rev-parse --abbrev-ref HEAD';
const PULL = 'git pull --ff-only';
const INSTALL = 'npm install --no-audit --no-fund';
const BUILD = 'npm run build';

function crearCon(respuestas: Record<string, Respuesta>, existeGit = true) {
  const { ejecutar, llamadas, opciones } = fakeEjecutar(respuestas);
  const upd = crearActualizador({ ejecutar, existeGit: () => existeGit });
  return { upd, llamadas, opciones };
}

describe('updater.verificar', () => {
  it('informa no soportado cuando el directorio no es un repo git (sin ejecutar comandos)', async () => {
    const { upd, llamadas } = crearCon({}, false);
    const r = await upd.verificar(CWD);
    expect(r.soportado).toBe(false);
    expect(llamadas).toHaveLength(0);
  });

  it('informa "sin actualizaciones" cuando no hay commits pendientes', async () => {
    const { upd } = crearCon({ [FETCH]: ok(), [COUNT]: ok('0\n'), [RAMA]: ok('development\n') });
    const r = await upd.verificar(CWD);
    expect(r).toMatchObject({
      soportado: true,
      disponible: false,
      pendientes: 0,
      rama: 'development',
    });
  });

  it('informa actualizaciones disponibles con la cantidad de commits', async () => {
    const { upd } = crearCon({ [FETCH]: ok(), [COUNT]: ok('3\n'), [RAMA]: ok('development\n') });
    const r = await upd.verificar(CWD);
    expect(r).toMatchObject({ soportado: true, disponible: true, pendientes: 3 });
  });

  it('mapea fallo de red en fetch a un mensaje claro', async () => {
    const { upd } = crearCon({
      [FETCH]: falla('fatal: unable to connect: Could not resolve host: github.com'),
    });
    const r = await upd.verificar(CWD);
    expect(r.error?.code).toBe('SIN_RED');
    expect(r.error?.mensaje).toMatch(/conexi.n|internet/i);
  });

  it('mapea rama sin upstream a un mensaje claro', async () => {
    const { upd } = crearCon({
      [FETCH]: ok(),
      [COUNT]: falla('fatal: no upstream configured for branch'),
    });
    const r = await upd.verificar(CWD);
    expect(r.error?.code).toBe('SIN_UPSTREAM');
    expect(r.error?.mensaje).toMatch(/rama remota/i);
  });

  it('mapea git no instalado (ENOENT) a un mensaje claro', async () => {
    const { upd } = crearCon({
      [FETCH]: { throw: Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' }) },
    });
    const r = await upd.verificar(CWD);
    expect(r.error?.code).toBe('SIN_GIT');
  });

  it('pasa env anti-prompts a git (sin diálogos de credenciales sorpresa)', async () => {
    const { upd, opciones } = crearCon({ [FETCH]: ok(), [COUNT]: ok('0\n'), [RAMA]: ok('dev\n') });
    await upd.verificar(CWD);
    expect(opciones[0].env?.GIT_TERMINAL_PROMPT).toBe('0');
    expect(opciones[0].env?.GCM_INTERACTIVE).toBe('Never');
  });

  it('una salida no numérica de rev-list reporta error en vez de fingir "al día"', async () => {
    const { upd } = crearCon({ [FETCH]: ok(), [COUNT]: ok('¡basura!\n'), [RAMA]: ok('dev\n') });
    const r = await upd.verificar(CWD);
    expect(r.error?.code).toBe('DESCONOCIDO');
    expect(r.disponible).toBeUndefined();
  });
});

describe('updater.aplicar', () => {
  it('ejecuta pull, install y build en orden emitiendo cada paso', async () => {
    const { upd, llamadas } = crearCon({ [PULL]: ok(), [INSTALL]: ok(), [BUILD]: ok() });
    const pasos: string[] = [];
    const r = await upd.aplicar(CWD, (p) => pasos.push(p));
    expect(r.ok).toBe(true);
    expect(pasos).toEqual(['descargando', 'instalando', 'compilando']);
    expect(llamadas).toEqual([PULL, INSTALL, BUILD]);
  });

  it('detiene el flujo si el pull choca con cambios locales', async () => {
    const { upd, llamadas } = crearCon({
      [PULL]: falla('error: Your local changes to the following files would be overwritten'),
      [INSTALL]: ok(),
      [BUILD]: ok(),
    });
    const r = await upd.aplicar(CWD, () => {});
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe('CONFLICTO_LOCAL');
    expect(llamadas).not.toContain(INSTALL);
    expect(llamadas).not.toContain(BUILD);
  });

  it('reporta fallo de npm install con mensaje claro', async () => {
    const { upd } = crearCon({ [PULL]: ok(), [INSTALL]: falla('npm ERR! code EACCES'), [BUILD]: ok() });
    const r = await upd.aplicar(CWD, () => {});
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe('INSTALL_FALLIDO');
  });

  it('reporta fallo de build con mensaje claro', async () => {
    const { upd } = crearCon({ [PULL]: ok(), [INSTALL]: ok(), [BUILD]: falla('tsc: error TS2345') });
    const r = await upd.aplicar(CWD, () => {});
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe('BUILD_FALLIDO');
  });

  it('un conflicto de dependencias npm (ERESOLVE) NO se confunde con conflicto git', async () => {
    // Regresión: "dependency conflict" matcheaba el regex de git y el usuario
    // recibía instrucciones de git para un problema de package.json.
    const { upd } = crearCon({
      [PULL]: ok(),
      [INSTALL]: falla('npm ERR! ERESOLVE unable to resolve dependency tree\nFix the upstream dependency conflict.'),
      [BUILD]: ok(),
    });
    const r = await upd.aplicar(CWD, () => {});
    expect(r.error?.code).toBe('INSTALL_FALLIDO');
    expect(r.error?.code).not.toBe('CONFLICTO_LOCAL');
  });

  it('un file-lock de Windows (EPERM/EBUSY) en install tiene mensaje dedicado', async () => {
    const { upd } = crearCon({
      [PULL]: ok(),
      [INSTALL]: falla('npm ERR! code EPERM\nnpm ERR! syscall rename'),
      [BUILD]: ok(),
    });
    const r = await upd.aplicar(CWD, () => {});
    expect(r.error?.code).toBe('ARCHIVOS_BLOQUEADOS');
    expect(r.error?.mensaje).toMatch(/en uso/);
  });

  it('un fallo de red de npm (ENOTFOUND) se reporta como problema de conexión', async () => {
    const { upd } = crearCon({
      [PULL]: ok(),
      [INSTALL]: falla('npm ERR! code ENOTFOUND\nnpm ERR! errno ENOTFOUND registry.npmjs.org'),
      [BUILD]: ok(),
    });
    const r = await upd.aplicar(CWD, () => {});
    expect(r.error?.code).toBe('SIN_RED');
  });

  it('un fallo genérico de pull reporta PULL_FALLIDO con detalle de diagnóstico', async () => {
    const { upd } = crearCon({ [PULL]: falla('fatal: something bad happened') });
    const r = await upd.aplicar(CWD, () => {});
    expect(r.error?.code).toBe('PULL_FALLIDO');
    expect(r.error?.detalle).toMatch(/something bad/);
    expect(r.paso).toBe('descargando');
  });

  it('reporta timeout como operación cancelada', async () => {
    const { upd } = crearCon({
      [PULL]: { throw: Object.assign(new Error('timed out'), { killed: true }) },
    });
    const r = await upd.aplicar(CWD, () => {});
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe('TIMEOUT');
  });

  it('un pull "Already up to date" igual termina ok (idempotente)', async () => {
    const { upd } = crearCon({ [PULL]: ok('Already up to date.\n'), [INSTALL]: ok(), [BUILD]: ok() });
    const r = await upd.aplicar(CWD, () => {});
    expect(r.ok).toBe(true);
  });
});
