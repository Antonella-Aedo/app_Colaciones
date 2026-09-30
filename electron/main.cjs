/**
 * Proceso principal de Electron.
 *
 * - Abre la base de datos local (SQLite) al arrancar — "se prende sola".
 * - Siembra el catálogo de productos en el primer arranque.
 * - Expone las operaciones de la DB al renderer vía IPC (preload.cjs →
 *   window.colaciones.invoke(op, ...args)).
 * - En dev (`electron . --dev`) carga el dev server de Vite; en producción
 *   carga dist/index.html.
 *
 * Es .cjs a propósito: el specifier 'electron' solo devuelve la API real
 * cuando se resuelve via require() (parche interno de Electron). En ESM,
 * import 'electron' resuelve al paquete npm (que exporta un path string).
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const isDev = process.argv.includes('--dev');
const DEV_URL = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';

/** Ops expuestas al renderer. 'close' y otras internas quedan fuera. */
const PUBLIC_OPS = ['list', 'get', 'find', 'insert', 'replace', 'update', 'remove', 'count', 'tx'];

let db = null;
let dbFile = null;
let actualizador = null;

/** updater.mjs es ESM (lo comparten los tests); desde CJS se importa así. */
async function getActualizador() {
  if (!actualizador) {
    const { crearActualizador } = await import('./updater.mjs');
    actualizador = crearActualizador();
  }
  return actualizador;
}

async function initDb() {
  // db.mjs / seed-data.mjs son ESM (los comparten los tests de vitest);
  // desde CJS se importan con dynamic import.
  const { createDb } = await import('./db.mjs');
  const { seedProductosSiVacio } = await import('./seed-data.mjs');

  const dir = app.getPath('userData');
  fs.mkdirSync(dir, { recursive: true });
  dbFile = path.join(dir, 'colaciones.db');
  db = createDb(dbFile);
  const sembrados = seedProductosSiVacio(db);
  console.log(`[colaciones] DB lista en ${dbFile}` + (sembrados ? ` — ${sembrados} productos sembrados` : ''));
}

function registerIpc() {
  ipcMain.handle('db:invoke', (_event, op, ...args) => {
    if (!PUBLIC_OPS.includes(op)) {
      throw new Error(`Operación no permitida: "${op}"`);
    }
    return db[op](...args);
  });
  ipcMain.handle('db:path', () => dbFile);
}

/**
 * IPC del auto-update. El contrato cruza el bridge como objetos resultado
 * (verificar → { soportado, disponible, ... } | { error }), nunca excepciones:
 * Electron serializa los errores de ipcMain.handle como texto plano.
 *
 * El repo es app.getAppPath(): la raíz del proyecto al correr desde fuente.
 * Empaquetado (.exe) es app.asar — sin .git ni npm, se reporta no soportado.
 */
function registerUpdateIpc() {
  const repoDir = app.getAppPath();
  let aplicando = false; // mutex: dos apply concurrentes corromperían el working tree

  ipcMain.handle('update:check', async () => {
    if (app.isPackaged) return { soportado: false };
    const upd = await getActualizador();
    const resultado = await upd.verificar(repoDir);
    if (resultado.error?.detalle) {
      console.error(`[update:check] ${resultado.error.code} — ${resultado.error.detalle}`);
    }
    return resultado;
  });

  ipcMain.handle('update:apply', async (event) => {
    if (app.isPackaged) {
      return {
        ok: false,
        error: { code: 'SIN_REPO', mensaje: 'La actualización automática solo está disponible al correr desde el código fuente.' },
      };
    }
    if (aplicando) {
      return {
        ok: false,
        error: { code: 'EN_CURSO', mensaje: 'Ya hay una actualización en curso.' },
      };
    }
    aplicando = true;
    const upd = await getActualizador();
    const avisar = (paso) => {
      if (!event.sender.isDestroyed()) event.sender.send('update:progreso', paso);
    };
    const resultado = await upd.aplicar(repoDir, avisar);
    if (!resultado.ok) {
      aplicando = false;
      console.error(`[update:apply] ${resultado.error?.code} — ${resultado.error?.detalle}`);
      return resultado;
    }

    // Reinicio: SIN el flag --dev — el nuevo proceso carga dist/ recién
    // compilado. (Relanzar en dev dejaría pantalla en blanco: `concurrently
    // -k` mata al dev server de vite cuando el electron viejo se cierra.)
    avisar('reiniciando');
    setTimeout(() => {
      try {
        app.relaunch({ args: [repoDir] });
      } catch (err) {
        // Si el relaunch falla igual conviene cerrar: el código nuevo ya está
        // en dist/ y la siguiente apertura manual lo cargará.
        console.error('[update:apply] relaunch falló:', err);
      }
      app.exit(0);
    }, 500); // margen para que el renderer pinte "Reiniciando…" antes de morir
    return resultado;
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: '#f6f4ee',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(async () => {
  await initDb();
  registerIpc();
  registerUpdateIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  db?.close();
});
