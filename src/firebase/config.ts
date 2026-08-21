import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

function getConfig(): FirebaseOptions {
  const raw = import.meta.env.VITE_FIREBASE_CONFIG as string | undefined;
  if (!raw) {
    throw new Error('VITE_FIREBASE_CONFIG no definida. Configúrala en .env con el config de Firebase (Firebase Console > Project Settings > Web app).');
  }
  try {
    return JSON.parse(raw) as FirebaseOptions;
  } catch {
    throw new Error('VITE_FIREBASE_CONFIG no es JSON válido. Debe ser un objeto JSON serializado.');
  }
}

export const app = initializeApp(getConfig());
export const db = getFirestore(app);

// Inicializa App Check como side-effect al cargar la config de Firebase.
// Si VITE_APPCHECK_RECAPTCHA_SITE_KEY no esta definida, se omite silenciosamente.
import './appCheck';
