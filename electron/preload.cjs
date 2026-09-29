/**
 * Preload: único punto de contacto entre el renderer (React) y el proceso
 * principal. Expone window.colaciones.invoke(op, ...args) que se despacha
 * al handler 'db:invoke' de main.mjs.
 *
 * Debe ser CommonJS (.cjs): los preload con sandbox:true no aceptan ESM.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('colaciones', {
  invoke: (op, ...args) => ipcRenderer.invoke('db:invoke', op, ...args),
  dbPath: () => ipcRenderer.invoke('db:path'),
});
