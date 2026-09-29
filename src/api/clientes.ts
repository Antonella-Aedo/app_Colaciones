import { dbInvoke } from './clientDb';
import type { Cliente, ClienteInput } from '../types';
import { ClienteInputSchema } from './schemas';

const COL = 'clientes';

export async function getClientes(): Promise<Cliente[]> {
  return dbInvoke<Cliente[]>('list', COL, { orderBy: 'direccion' });
}

export async function getCliente(id: string): Promise<Cliente | null> {
  return dbInvoke<Cliente | null>('get', COL, id);
}

export async function createCliente(input: ClienteInput): Promise<Cliente> {
  const validado = ClienteInputSchema.parse(input);
  // Normalizar direccion y contacto para que findOrCreateCliente funcione
  const data = {
    ...validado,
    direccion: validado.direccion.trim().toLowerCase(),
    contacto: validado.contacto.trim().toLowerCase(),
  };
  return dbInvoke<Cliente>('insert', COL, data);
}

export async function updateCliente(id: string, input: ClienteInput): Promise<Cliente> {
  const validado = ClienteInputSchema.parse(input);
  const data = {
    ...validado,
    direccion: validado.direccion.trim().toLowerCase(),
    contacto: validado.contacto.trim().toLowerCase(),
  };
  return dbInvoke<Cliente>('replace', COL, id, data);
}

export async function deleteCliente(id: string): Promise<{ id: string }> {
  return dbInvoke<{ id: string }>('remove', COL, id);
}

/**
 * Busca un cliente por direccion + contacto (normalizados).
 * Si existe, lo retorna; si no, lo crea. Útil para evitar duplicados
 * al registrar pedidos.
 */
export async function findOrCreateCliente(input: ClienteInput): Promise<Cliente> {
  const dirNorm = input.direccion.trim().toLowerCase();
  const contNorm = input.contacto.trim().toLowerCase();
  const docs = await dbInvoke<Cliente[]>('find', COL, {
    direccion: dirNorm,
    contacto: contNorm,
  });
  if (docs.length > 0) return docs[0];
  return createCliente(input);
}
