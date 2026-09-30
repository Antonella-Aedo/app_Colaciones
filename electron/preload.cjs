/**
 * Preload: único punto de contacto entre el renderer (React) y el proceso
 * principal. Expone window.colaciones.invoke(op, ...args) que se despacha
 * al handler 'db:invoke' de main.cjs.
 *
 * Debe ser CommonJS (.cjs): los preload con sandbox:true no aceptan ESM.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('colaciones', {
  invoke: (op, ...args) => ipcRenderer.invoke('db:invoke', op, ...args),
  dbPath: () => ipcRenderer.invoke('db:path'),
});

// Auto-update: mismo patrón que 'colaciones' pero canal separado — el bridge
// de DB no debe conocer git. onProgreso devuelve el unsubscribe (cleanup
// del listener en el renderer al desmontar el componente).
contextBridge.exposeInMainWorld('actualizador', {
  verificar: () => ipcRenderer.invoke('update:check'),
  aplicar: () => ipcRenderer.invoke('update:apply'),
  onProgreso: (callback) => {
    const listener = (_event, paso) => callback(paso);
    ipcRenderer.on('update:progreso', listener);
    return () => ipcRenderer.removeListener('update:progreso', listener);
  },
});
