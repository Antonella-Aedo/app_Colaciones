import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { app } from './config';

// App Check protege Firestore contra abuso desde clients no autorizados.
// Requiere configuracion en Firebase Console:
// 1. Project Settings → App Check → Register app for App Check
// 2. Obtener site key de reCAPTCHA v3
// 3. Agregar VITE_APPCHECK_RECAPTCHA_SITE_KEY a .env
// 4. En Firebase Console, habilitar App Check enforcement para Firestore

const recaptchaSiteKey = import.meta.env.VITE_APPCHECK_RECAPTCHA_SITE_KEY as string | undefined;

if (recaptchaSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
} else if (import.meta.env.DEV) {
  // En desarrollo, usar debug token (sin reCAPTCHA)
  // Ver: https://firebase.google.com/docs/app-check/web/debug-provider
  console.info('[App Check] VITE_APPCHECK_RECAPTCHA_SITE_KEY no definida — App Check deshabilitado en dev');
}
