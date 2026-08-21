import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from './config';

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Verifica si el email del usuario está autorizado en la colección
 * `usuariosPermitidos` de Firestore. Cada documento en esa colección
 * tiene como ID el email del usuario autorizado (sin el @, reemplazado
 * por _ si contiene caracteres especiales, o simplemente el email crudo).
 * Para simplicidad, el doc ID es el email en minúsculas.
 */
async function estaAutorizado(email: string): Promise<boolean> {
  const ref = doc(db, 'usuariosPermitidos', email.toLowerCase());
  const snap = await getDoc(ref);
  return snap.exists();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u?.email) {
        // Verificar autorización antes de permitir el acceso
        try {
          const autorizado = await estaAutorizado(u.email);
          if (!autorizado) {
            await signOut(auth);
            setUser(null);
            setAuthError(
              `El correo ${u.email} no está autorizado para acceder a esta aplicación. ` +
              'Contacta al administrador para ser agregado a la lista de usuarios permitidos.',
            );
            setLoading(false);
            return;
          }
        } catch {
          // Si Firestore no responde (ej: rules bloquean, sin conexión),
          // denegar acceso por seguridad.
          await signOut(auth);
          setUser(null);
          setAuthError('No se pudo verificar la autorización. Intenta nuevamente.');
          setLoading(false);
          return;
        }
      }
      setUser(u);
      setAuthError(null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const loginWithGoogle = async () => {
    setAuthError(null);
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, authError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
