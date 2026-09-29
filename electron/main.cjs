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
