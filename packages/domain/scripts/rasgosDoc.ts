/**
 * Escribe `docs/juego/virtudes-y-defectos.md` a partir de la tabla de rasgos (spec 005, T097, T098).
 * Uso: `pnpm --filter @fbd/domain rasgos:doc`. Es la única E/S del paquete y vive fuera de `src/`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generarDocumentoRasgos } from '../src/catalogo/documentoRasgos';

const ruta = fileURLToPath(new URL('../../../docs/juego/virtudes-y-defectos.md', import.meta.url));
mkdirSync(dirname(ruta), { recursive: true });
writeFileSync(ruta, generarDocumentoRasgos(), 'utf-8');
console.log(`Escrito ${ruta}`);
