/**
 * Carga el `.env` de la raíz del repositorio en desarrollo (servidor, migraciones y seed). Las variables
 * que ya estén definidas en el entorno tienen prioridad. En producción no hay `.env`: las variables
 * llegan del contenedor (ver docs/despliegue.md).
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ruta = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(ruta)) process.loadEnvFile(ruta);
