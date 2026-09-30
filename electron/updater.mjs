/**
 * Actualizador del sistema — la lógica git/npm detrás del auto-update.
 *
 * Corre solo en el proceso principal (main.cjs la invoca por IPC). Las
 * dependencias externas se inyectan en `crearActualizador`: `ejecutar`
 * (correr un comando) y `existeGit` (detectar si el cwd es un repo).
 * Producción usa child_process/fs reales; los tests, dobles falsos —
 * así el flujo completo se prueba sin ejecutar git ni npm de verdad.
 *
 * Ningún método lanza hacia afuera: devuelven objetos resultado
 * ({ ok } | { error: { code, mensaje } }) porque los errores que cruzan
 * IPC llegan al renderer como texto plano — el contrato es datos, no clases.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const TIMEOUT_GIT_MS = 120_000; // fetch/pull: tolera redes lentas
const TIMEOUT_NPM_MS = 300_000; // install / build

/**
 * Mensajes escritos para quien opera la app, no para quien la programa.
 * El `detalle` técnico (stderr) viaja aparte y solo sirve para logs.
 */
const MENSAJES = {
  SIN_GIT:
    'Git no está instalado o no está en el PATH de este equipo. ' +
    'La actualización automática no puede continuar.',
  SIN_REPO: 'El directorio de la aplicación no es un repositorio git válido.',
  SIN_RED:
    'No se pudo conectar con el repositorio remoto. ' +
    'Revisa tu conexión a internet e intenta de nuevo.',
  SIN_UPSTREAM:
    'La rama actual no sigue a ninguna rama remota; ' +
    'no es posible buscar actualizaciones automáticamente.',
  CONFLICTO_LOCAL:
    'Hay cambios locales que chocan con la actualización. ' +
    'Resuélvelos en una terminal (git status) e intenta de nuevo.',
  ARCHIVOS_BLOQUEADOS:
    'Windows bloqueó archivos que la aplicación tiene en uso. ' +
    'Cierra cualquier otra instancia de Colaciones e intenta de nuevo.',
  PULL_FALLIDO: 'No se pudieron descargar los cambios del repositorio.',
  INSTALL_FALLIDO:
    'El código nuevo se descargó, pero falló la instalación de dependencias (npm install).',
  BUILD_FALLIDO:
    'El código nuevo se descargó, pero la compilación falló (npm run build).',
  TIMEOUT:
    'La operación tardó demasiado y fue cancelada. ' +
    'Revisa tu conexión e intenta de nuevo.',
  DESCONOCIDO: 'Ocurrió un error inesperado al actualizar el sistema.',
};

const RE_RED =
  /could not resolve host|failed to connect|unable to connect|couldn't connect|connection refused|connection timed out|network is unreachable|could not read from remote repository|temporary failure in name resolution|terminal prompts disabled|could not read username|authentication failed|enotfound|etimedout|eai_again|econnreset|econnrefused|npm err! network/i;
const RE_UPSTREAM =
  /no upstream configured|does not point to a branch|no such branch|upstream.*not stored/i;
const RE_CONFLICTO =
  /local changes|would be overwritten|not possible to fast-forward|non-fast-forward|divergent|conflict/i;
const RE_NO_REPO = /not a git repository/i;
const RE_BLOQUEO = /eperm|ebusy|enotempty|access is denied|operation not permitted/i;

/** Credenciales: sin prompts — un fallo de auth se clasifica, no cuelga. */
const ENV_GIT = { GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' };

function ejecutarReal(comando, args, opts) {
  return new Promise((resolve, reject) => {
    // Callback (no promisify): necesitamos el child para limpiar el árbol
    // de procesos si salta el timeout — execFile mata al padre (cmd.exe)
    // pero un npm hijo quedaría huérfano escribiendo node_modules.
    const child = execFile(
      comando,
      args,
      {
        cwd: opts.cwd,
        timeout: opts.timeout,
        shell: opts.shell ?? false, // npm es un .cmd en Windows: necesita shell
        windowsHide: true,
        maxBuffer: 8 * 1024 * 1024,
        env: { ...process.env, ...opts.env },
      },
      (error, stdout, stderr) => {
        if (!error) return resolve({ stdout: String(stdout), stderr: String(stderr) });
        error.stderr = String(stderr);
        if (error.killed && process.platform === 'win32' && child.pid) {
          try {
            execFile('taskkill', ['/pid', String(child.pid), '/T', '/F'], () => {});
          } catch {
            /* best-effort: el árbol ya murió o el PID se reusó */
          }
        }
        reject(error);
      },
    );
  });
}

function existeGitReal(cwd) {
  return fs.existsSync(path.join(cwd, '.git'));
}

/** Recorte del stderr para logs — nunca se muestra crudo al usuario. */
function detalleDe(err) {
  const texto = [err?.stderr, err?.message].filter(Boolean).join('\n').trim();
  if (!texto) return undefined;
  return texto.length > 600 ? `…${texto.slice(-600)}` : texto;
}

/**
 * Traduce el fallo de un proceso a { code, mensaje } para la UI.
 * Los regex de git solo se aplican a comandos git: un "dependency conflict"
 * de npm (ERESOLVE) no es un conflicto de cambios locales, y un EPERM de
 * npm en Windows es un file-lock, no un pull fallido.
 */
function clasificar(err, { paso, comando }) {
  const salida = [err?.stderr, err?.message].filter(Boolean).join('\n');

  let code;
  if (err?.code === 'ENOENT') {
    code =
      comando === 'git' ? 'SIN_GIT' : paso === 'instalando' ? 'INSTALL_FALLIDO' : 'BUILD_FALLIDO';
  } else if (err?.killed) {
    code = 'TIMEOUT';
  } else if (comando === 'git') {
    if (RE_RED.test(salida)) code = 'SIN_RED';
    else if (RE_UPSTREAM.test(salida)) code = 'SIN_UPSTREAM';
    else if (RE_CONFLICTO.test(salida)) code = 'CONFLICTO_LOCAL';
    else if (RE_NO_REPO.test(salida)) code = 'SIN_REPO';
    else code = paso === 'descargando' ? 'PULL_FALLIDO' : 'DESCONOCIDO';
  } else {
    // npm (install/build): sin upstream/conflicto — red, file-lock o el paso
    if (RE_RED.test(salida)) code = 'SIN_RED';
    else if (RE_BLOQUEO.test(salida)) code = 'ARCHIVOS_BLOQUEADOS';
    else code = paso === 'instalando' ? 'INSTALL_FALLIDO' : 'BUILD_FALLIDO';
  }

  return { code, mensaje: MENSAJES[code], detalle: detalleDe(err) };
}

export function crearActualizador({ ejecutar = ejecutarReal, existeGit = existeGitReal } = {}) {
  const git = (cwd, args) =>
    ejecutar('git', args, { cwd, timeout: TIMEOUT_GIT_MS, env: ENV_GIT });
  const npm = (cwd, args) =>
    ejecutar('npm', args, { cwd, timeout: TIMEOUT_NPM_MS, shell: true });

  /**
   * Compara la rama local contra su remoto sin tocar el working tree:
   * fetch actualiza refs y rev-list cuenta los commits que faltan.
   */
  async function verificar(cwd) {
    if (!existeGit(cwd)) return { soportado: false };
    try {
      await git(cwd, ['fetch', '--quiet', '--prune']);
      const { stdout } = await git(cwd, ['rev-list', '--count', 'HEAD..@{u}']);
      const pendientes = Number.parseInt(String(stdout).trim(), 10);
      // Salida corrupta con exit 0 sería silenciosa si la mapeáramos a 0
      // ("al día" escondería updates reales): mejor reportar error.
      if (Number.isNaN(pendientes)) {
        return { soportado: true, error: { code: 'DESCONOCIDO', mensaje: MENSAJES.DESCONOCIDO } };
      }
      let rama;
      try {
        const r = await git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
        rama = String(r.stdout).trim() || undefined;
      } catch {
        rama = undefined; // informativo; nunca bloquea el chequeo
      }
      return { soportado: true, disponible: pendientes > 0, pendientes, rama };
    } catch (err) {
      return { soportado: true, error: clasificar(err, { paso: 'verificando', comando: 'git' }) };
    }
  }

  /**
   * Aplica la actualización: pull fast-forward → deps → build.
   * Emite `onPaso(paso)` antes de cada etapa para la pantalla de carga.
   * Si un paso falla, el flujo se detiene ahí (el repo no queda a medias:
   * git pull es atómico por ref y npm install/build no mutan el código).
   */
  async function aplicar(cwd, onPaso) {
    const pasos = [
      { paso: 'descargando', run: () => git(cwd, ['pull', '--ff-only']) },
      { paso: 'instalando', run: () => npm(cwd, ['install', '--no-audit', '--no-fund']) },
      { paso: 'compilando', run: () => npm(cwd, ['run', 'build']) },
    ];

    for (const { paso, run } of pasos) {
      onPaso?.(paso);
      try {
        await run();
      } catch (err) {
        const comando = paso === 'descargando' ? 'git' : 'npm';
        return { ok: false, paso, error: clasificar(err, { paso, comando }) };
      }
    }
    return { ok: true };
  }

  return { verificar, aplicar };
}
