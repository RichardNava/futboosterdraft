import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SELECCIONES, esSeleccion } from '../../src/catalogo/selecciones';

const esquema = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../../protocol/schemas/player-data.schema.json', import.meta.url)), 'utf-8'),
) as { $defs: { nacionalidad: { enum: string[] } } };

describe('SELECCIONES (R6)', () => {
  it('el esquema de cartas enumera exactamente los códigos de SELECCIONES', () => {
    expect([...esquema.$defs.nacionalidad.enum].sort()).toEqual(Object.keys(SELECCIONES).sort());
  });

  it('GBR no es una selección; las naciones del Reino Unido sí', () => {
    expect(esSeleccion('GBR')).toBe(false);
    expect(['ENG', 'SCO', 'WAL', 'NIR'].every(esSeleccion)).toBe(true);
  });
});
