import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore } from '../helpers/mockFirestore';
import { getProductos, createProducto, updateProducto, deleteProducto } from '../../src/api/productos';
import type { ProductoInput } from '../../src/types';

const productoInput: ProductoInput = {
  nombre: 'Sándwich',
  descripcion: 'jamón y queso',
  precio: 1500,
  categoria: 'fondo',
  disponible: true,
};

beforeEach(() => {
  resetStore();
});

describe('api/productos (Firestore)', () => {
  it('createProducto agrega a la colección y devuelve el producto con id', async () => {
    const creado = await createProducto(productoInput);
    expect(creado.id).toBeTruthy();
    expect(creado.nombre).toBe('Sándwich');

    const lista = await getProductos();
    expect(lista).toHaveLength(1);
    expect(lista[0].nombre).toBe('Sándwich');
  });

  it('updateProducto reemplaza los datos', async () => {
    const creado = await createProducto(productoInput);
    const actualizado = await updateProducto(creado.id, { ...productoInput, nombre: 'X' });
    expect(actualizado.nombre).toBe('X');

    const lista = await getProductos();
    expect(lista[0].nombre).toBe('X');
  });

  it('deleteProducto elimina de la colección', async () => {
    const creado = await createProducto(productoInput);
    await deleteProducto(creado.id);
    const lista = await getProductos();
    expect(lista).toHaveLength(0);
  });
});
