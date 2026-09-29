import { createContext, useContext, useState, type ReactNode } from 'react';
import { dbInvoke } from '../api/clientDb';

export interface LocalUser {
  email: string;
}

interface AuthContextValue {
  user: LocalUser | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
  authError: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SESSION_KEY = 'colaciones.usuario';

const normalizar = (email: string) => email.trim().toLowerCase();

/**
 * Verifica si el email está autorizado en la colección `usuariosPermitidos`
 * de la base local. Si la colección está vacía (primer arranque), el primer
 * usuario que ingresa queda registrado automáticamente como autorizado —
 * la app es local y de un solo equipo; alguien tiene que ser el primero.
 */
async function verificarORegistrar(email: string): Promise<boolean> {
  const total = await dbInvoke<number>('count', 'usuariosPermitidos');
  if (total === 0) {
    await dbInvoke('replace', 'usuariosPermitidos', email, { email, creadoEn: new Date().toISOString() });
    return true;
  }
  const doc = await dbInvoke<{ email: string } | null>('get', 'usuariosPermitidos', email);
  return doc !== null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Restaurar sesión persistida (sin revalidar: la app es local). La lectura
  // de localStorage es síncrona, así que va en el initializer — sin effect.
  const [user, setUser] = useState<LocalUser | null>(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      const parsed = raw ? (JSON.parse(raw) as LocalUser) : null;
      return parsed?.email ? { email: parsed.email } : null;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  });
  const [loading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const login = async (emailInput: string) => {
    setAuthError(null);
    const email = normalizar(emailInput);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError('Ingresa un correo válido.');
      return;
    }
    let autorizado: boolean;
    try {
      autorizado = await verificarORegistrar(email);
    } catch {
      setAuthError('No se pudo verificar la autorización. Intenta nuevamente.');
      return;
    }
    if (!autorizado) {
      setAuthError(
        `El correo ${email} no está autorizado para acceder a esta aplicación. ` +
          'Contacta al administrador para ser agregado a la lista de usuarios permitidos.',
      );
      return;
    }
    const u = { email };
    setUser(u);
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, authError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
