/**
 * Web App de Google Apps Script para app_Colaciones.
 *
 * Actúa como API JSON intermedia entre el frontend React y dos Google Sheets:
 *   - hoja "Productos":  id | nombre | descripcion | precio | categoria | disponible
 *   - hoja "Pedidos":    id | fecha | cliente | registradoPor | items | total | estado
 *   - hoja "Menus":      id | fecha | activo | items | creadoPor
 *
 * Despliegue:
 *   1. Crea un Google Sheet con dos hojas llamadas exactamente "Productos" y "Pedidos".
 *   2. Encabezados en la fila 1 con los nombres de columna de arriba.
 *   3. Extensiones > Apps Script, pega este archivo.
 *   4. Implementar > Nueva implementación > Aplicación web.
 *      - Ejecutar como: yo (tu cuenta)
 *      - Quién tiene acceso: cualquiera (para MVP sin auth)
 *   5. Copia la URL /exec y úsala como VITE_APPS_SCRIPT_URL en el frontend.
 *
 * Endpoints:
 *   GET  ?action=productos                 → lista productos
 *   GET  ?action=productos&id=<id>         → un producto
 *   POST (body: {action:"productos", method:"create", producto:{...}})  → crea
 *   POST (body: {action:"productos", method:"update", id, producto:{...}}) → actualiza
 *   POST (body: {action:"productos", method:"delete", id})              → elimina
 *   GET  ?action=pedidos                   → lista pedidos
 *   POST (body: {action:"pedidos", method:"create", pedido:{...}})      → crea pedido
 *   GET  ?action=menus                     → lista menúes del día
 *   GET  ?action=menus&fecha=<yyyy-MM-dd>  → menú de una fecha
 *   POST (body: {action:"menus", method:"create", menu:{...}})          → crea menú
 *   POST (body: {action:"menus", method:"update", id, menu:{...}})      → actualiza menú
 *   POST (body: {action:"menus", method:"delete", id})                  → elimina menú
 */

// === Configuración ===
var HOJA_PRODUCTOS = 'Productos';
var HOJA_PEDIDOS = 'Pedidos';
var HOJA_MENUS = 'Menus';
var COL_PRODUCTOS = ['id', 'nombre', 'descripcion', 'precio', 'categoria', 'disponible'];
var COL_PEDIDOS = ['id', 'fecha', 'cliente', 'registradoPor', 'items', 'total', 'estado'];
var COL_MENUS = ['id', 'fecha', 'activo', 'items', 'creadoPor'];

// === Puntos de entrada ===
function doGet(e) {
  return manejar(e, 'GET');
}

function doPost(e) {
  return manejar(e, 'POST');
}

function manejar(e, metodo) {
  try {
    var params = metodo === 'GET' ? (e.parameter || {}) : parsearBody(e);
    var action = params.action;

    if (action === 'productos') return json(rutaProductos(metodo, params));
    if (action === 'pedidos') return json(rutaPedidos(metodo, params));
    if (action === 'menus') return json(rutaMenus(metodo, params));

    return json({ ok: false, error: 'action inválido: ' + action });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// === Rutas Productos ===
function rutaProductos(metodo, params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PRODUCTOS);

  if (metodo === 'GET') {
    var rows = leerHoja(hoja, COL_PRODUCTOS);
    if (params.id) {
      var encontrado = rows.filter(function (r) { return r.id === params.id; })[0];
      return encontrado ? { ok: true, data: normalizarProducto(encontrado) } : { ok: false, error: 'no encontrado' };
    }
    return { ok: true, data: rows.map(normalizarProducto) };
  }

  // POST
  if (params.method === 'create') {
    var nuevo = params.producto;
    if (!nuevo || !nuevo.nombre) return { ok: false, error: 'producto.nombre requerido' };
    var id = Utilities.getUuid();
    var fila = [id, nuevo.nombre, nuevo.descripcion || '', Number(nuevo.precio) || 0, nuevo.categoria || '', nuevo.disponible ? 'TRUE' : 'FALSE'];
    hoja.appendRow(fila);
    return { ok: true, data: { id: id, nombre: nuevo.nombre, descripcion: nuevo.descripcion || '', precio: Number(nuevo.precio) || 0, categoria: nuevo.categoria || '', disponible: !!nuevo.disponible } };
  }

  if (params.method === 'update') {
    if (!params.id) return { ok: false, error: 'id requerido' };
    var filaIdx = buscarFilaPorId(hoja, params.id);
    if (filaIdx < 0) return { ok: false, error: 'no encontrado' };
    var u = params.producto || {};
    var valores = [
      params.id,
      u.nombre || '',
      u.descripcion || '',
      Number(u.precio) || 0,
      u.categoria || '',
      u.disponible ? 'TRUE' : 'FALSE'
    ];
    hoja.getRange(filaIdx, 1, 1, COL_PRODUCTOS.length).setValues([valores]);
    return { ok: true, data: { id: params.id, nombre: u.nombre, descripcion: u.descripcion, precio: Number(u.precio) || 0, categoria: u.categoria, disponible: !!u.disponible } };
  }

  if (params.method === 'delete') {
    if (!params.id) return { ok: false, error: 'id requerido' };
    var idx = buscarFilaPorId(hoja, params.id);
    if (idx < 0) return { ok: false, error: 'no encontrado' };
    hoja.deleteRow(idx);
    return { ok: true, data: { id: params.id } };
  }

  return { ok: false, error: 'method inválido: ' + params.method };
}

// === Rutas Pedidos ===
function rutaPedidos(metodo, params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_PEDIDOS);

  if (metodo === 'GET') {
    var rows = leerHoja(hoja, COL_PEDIDOS);
    return { ok: true, data: rows.map(normalizarPedido) };
  }

  if (params.method === 'create') {
    var p = params.pedido;
    if (!p || !p.cliente) return { ok: false, error: 'pedido.cliente requerido' };
    if (!p.items || !p.items.length) return { ok: false, error: 'pedido.items requerido' };
    var id = Utilities.getUuid();
    var fecha = p.fecha || hoyISO();
    var total = Number(p.total) || 0;
    var estado = 'pendiente';
    var registradoPor = p.registradoPor || '';
    var fila = [id, fecha, p.cliente, registradoPor, JSON.stringify(p.items), total, estado];
    hoja.appendRow(fila);
    return { ok: true, data: { id: id, fecha: fecha, cliente: p.cliente, registradoPor: registradoPor, items: p.items, total: total, estado: estado } };
  }

  return { ok: false, error: 'method inválido: ' + params.method };
}

// === Rutas Menú del día ===
function rutaMenus(metodo, params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_MENUS);

  if (metodo === 'GET') {
    var rows = leerHoja(hoja, COL_MENUS);
    if (params.fecha) {
      var encontrado = rows.filter(function (r) { return String(r.fecha) === String(params.fecha); })[0];
      return encontrado ? { ok: true, data: normalizarMenu(encontrado) } : { ok: false, error: 'no encontrado' };
    }
    return { ok: true, data: rows.map(normalizarMenu) };
  }

  // POST
  if (params.method === 'create') {
    var m = params.menu;
    if (!m || !m.fecha) return { ok: false, error: 'menu.fecha requerido' };
    if (!m.items || !m.items.length) return { ok: false, error: 'menu.items requerido' };
    var id = Utilities.getUuid();
    var activo = m.activo ? 'TRUE' : 'FALSE';
    var creadoPor = m.creadoPor || '';
    var fila = [id, m.fecha, activo, JSON.stringify(m.items), creadoPor];
    hoja.appendRow(fila);
    return { ok: true, data: { id: id, fecha: m.fecha, activo: !!m.activo, items: m.items, creadoPor: creadoPor } };
  }

  if (params.method === 'update') {
    if (!params.id) return { ok: false, error: 'id requerido' };
    var filaIdx = buscarFilaPorId(hoja, params.id);
    if (filaIdx < 0) return { ok: false, error: 'no encontrado' };
    var u = params.menu || {};
    var valores = [
      params.id,
      u.fecha || hoyISO(),
      u.activo ? 'TRUE' : 'FALSE',
      JSON.stringify(u.items || []),
      u.creadoPor || ''
    ];
    hoja.getRange(filaIdx, 1, 1, COL_MENUS.length).setValues([valores]);
    return { ok: true, data: { id: params.id, fecha: u.fecha, activo: !!u.activo, items: u.items || [], creadoPor: u.creadoPor || '' } };
  }

  if (params.method === 'delete') {
    if (!params.id) return { ok: false, error: 'id requerido' };
    var idx = buscarFilaPorId(hoja, params.id);
    if (idx < 0) return { ok: false, error: 'no encontrado' };
    hoja.deleteRow(idx);
    return { ok: true, data: { id: params.id } };
  }

  return { ok: false, error: 'method inválido: ' + params.method };
}

// === Helpers ===
function leerHoja(hoja, columnas) {
  var ultima = hoja.getLastRow();
  if (ultima < 2) return [];
  var rango = hoja.getRange(2, 1, ultima - 1, columnas.length);
  var valores = rango.getValues();
  return valores.map(function (fila) {
    var obj = {};
    columnas.forEach(function (col, i) { obj[col] = fila[i]; });
    return obj;
  });
}

function buscarFilaPorId(hoja, id) {
  var ultima = hoja.getLastRow();
  if (ultima < 2) return -1;
  var ids = hoja.getRange(2, 1, ultima - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2; // +2: fila 1 es header, índice 0-based
  }
  return -1;
}

function normalizarProducto(r) {
  return {
    id: String(r.id),
    nombre: String(r.nombre),
    descripcion: String(r.descripcion || ''),
    precio: Number(r.precio) || 0,
    categoria: String(r.categoria || ''),
    disponible: String(r.disponible).toUpperCase() === 'TRUE'
  };
}

function normalizarPedido(r) {
  var items = [];
  try { items = JSON.parse(r.items || '[]'); } catch (e) { items = []; }
  return {
    id: String(r.id),
    fecha: String(r.fecha || ''),
    cliente: String(r.cliente || ''),
    registradoPor: String(r.registradoPor || ''),
    items: items,
    total: Number(r.total) || 0,
    estado: String(r.estado || 'pendiente')
  };
}

function hoyISO() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function normalizarMenu(r) {
  var items = [];
  try { items = JSON.parse(r.items || '[]'); } catch (e) { items = []; }
  return {
    id: String(r.id),
    fecha: String(r.fecha || ''),
    activo: String(r.activo).toUpperCase() === 'TRUE',
    items: items,
    creadoPor: String(r.creadoPor || '')
  };
}

function parsearBody(e) {
  if (!e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    return {};
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
