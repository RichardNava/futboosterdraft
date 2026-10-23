/** El documento de referencia está sincronizado con la tabla de rasgos (spec 005, T095; FR-054, SC-007). */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEFECTOS, generarDocumentoRasgos, RASGOS, TODAS_LAS_VIRTUDES } from '../../src/index';

const ruta = fileURLToPath(new URL('../../../../docs/juego/virtudes-y-defectos.md', import.meta.url));

describe('docs/juego/virtudes-y-defectos.md', () => {
  it('coincide con lo que genera la tabla de rasgos (si falla: pnpm --filter @fbd/domain rasgos:doc)', () => {
    expect(readFileSync(ruta, 'utf-8').replace(/\r\n/g, '\n')).toBe(generarDocumentoRasgos());
  });

  it('nombra todas las virtudes y todos los defectos con su impacto', () => {
    const doc = generarDocumentoRasgos();
    for (const id of [...TODAS_LAS_VIRTUDES, ...DEFECTOS]) {
      expect(doc).toContain(`\`${id}\``);
      expect(doc).toContain(RASGOS[id].nombre);
    }
    expect(doc).toContain('No basta con añadir un rasgo a este documento: debe implementarse y probarse.');
  });
});
