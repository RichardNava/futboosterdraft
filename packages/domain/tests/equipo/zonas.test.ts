/** Zonas del campo para la colocación libre (data-model §2; T114). */
import { describe, expect, it } from 'vitest';
import { FORMACIONES, FORMACIONES_IDS } from '../../src/equipo/formaciones';
import { ANCHO_CAMPO, LARGO_CAMPO, ZONA_PORTERIA, ZONAS, zonaEn } from '../../src/equipo/zonas';

describe('zonas del campo (T114)', () => {
  it('cubren el campo sin huecos ni solapes (rectángulos semiabiertos)', () => {
    for (let x = 0; x <= LARGO_CAMPO; x += 5) {
      for (let y = 0; y <= ANCHO_CAMPO; y += 5) {
        const dentro = ZONAS.filter((z) => {
          const r = z.rect;
          const enX = x >= r.x0 && (x < r.x1 || (r.x1 === LARGO_CAMPO && x === LARGO_CAMPO));
          const enY = y >= r.y0 && (y < r.y1 || (r.y1 === ANCHO_CAMPO && y === ANCHO_CAMPO));
          return enX && enY;
        });
        expect(dentro, `(${x}, ${y})`).toHaveLength(1);
      }
    }
  });

  it('la zona de portería tiene prioridad y admite solo POR', () => {
    expect(ZONA_PORTERIA.posicionesAdmitidas).toEqual(['POR']);
    expect(zonaEn(0, 200).id).toBe('POR');
    expect(zonaEn(109, 439).id).toBe('POR');
    expect(zonaEn(110, 320).id).not.toBe('POR');
    expect(zonaEn(50, 199).id).not.toBe('POR');
    expect(zonaEn(50, 440).id).not.toBe('POR');
  });

  it('cada casilla de las 10 formaciones cae en una zona que admite su posición', () => {
    expect(FORMACIONES_IDS).toHaveLength(10);
    for (const f of FORMACIONES_IDS) {
      for (const c of FORMACIONES[f].casillas) {
        const z = zonaEn(c.zona.x, c.zona.y);
        expect(c.posicionesAdmitidas.every((p) => z.posicionesAdmitidas.includes(p)), `${f} ${c.id} en ${z.id}`).toBe(true);
      }
    }
  });

  it('la rejilla reproduce el ejemplo de la spec: retrasar un poco a un DC lo convierte en SD', () => {
    expect(zonaEn(760, 320).posicionesAdmitidas).toEqual(['DC']);
    expect(zonaEn(700, 320).posicionesAdmitidas).toEqual(['SD']);
  });
});
