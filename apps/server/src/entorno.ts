/**
 * Carga el `.env` de la raíz del repositorio en desarrollo (servidor, migraciones y seed). Las variables
 * que ya estén definidas en el entorno tienen prioridad. En producción no hay `.env`: las variables
 * llegan del contenedor (ver docs/despliegue.md).
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ruta = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(ruta)) process.loadEnvFile(ruta);

const SECRETO_DE_EJEMPLO = 'cambia-esto-por-un-secreto-largo-y-aleatorio';
const CREDENCIAL_DE_EJEMPLO = 'fbd:fbd@';

/** Problemas de la configuración de producción (spec 017, FR-036). Nombra cada variable y nunca muestra su valor. */
export function validarEntornoProduccion(env: Record<string, string | undefined>): string[] {
  const problemas: string[] = [];
  const { AUTH_SECRET: secreto, PUBLIC_URL: url, DATABASE_URL: bd, PROXIES_CONFIANZA: proxies, METRICAS_TOKEN: metricas } = env;
  if (!secreto || secreto.length < 32 || secreto === SECRETO_DE_EJEMPLO) problemas.push('AUTH_SECRET debe tener 32 caracteres o más y no ser el valor de ejemplo');
  if (!url?.startsWith('https://') || !URL.canParse(url)) problemas.push('PUBLIC_URL debe ser una dirección https://');
  if (!bd || bd.includes(CREDENCIAL_DE_EJEMPLO)) problemas.push('DATABASE_URL es obligatoria y no puede usar la credencial de ejemplo');
  if (!proxies || !/^\d+$/.test(proxies)) problemas.push('PROXIES_CONFIANZA debe ser un entero mayor o igual que 0');
  if (metricas !== undefined && metricas.length < 32) problemas.push('METRICAS_TOKEN debe tener 32 caracteres o más');
  if (env.LIMITES_DESACTIVADOS !== undefined) problemas.push('LIMITES_DESACTIVADOS no se admite en producción');
  return problemas;
}
