import { it } from 'vitest';
import { FORMACIONES, calcularColocacion, parametrosActuales, penalizacionPorPosicion } from '../../src/index';
it('x', () => {
  const p = parametrosActuales();
  for (const f of Object.values(FORMACIONES)) {
    const tit = f.casillas.map((c, i) => ({ casillaId: c.id, jugadorId: i }));
    const r = calcularColocacion(f.id, tit, undefined, p);
    for (const t of r.titulares) {
      const c = f.casillas[t.jugadorId]!;
      if (!['CI','CD'].includes(c.id)) continue;
      const pens = ['MC','MII','MD','MCO','EI','LI'].map((pos) => pos + ':' + penalizacionPorPosicion({ demarcacion: ['EI'].includes(pos)?'DEL':pos==='LI'?'DEF':'MED', posicion: [pos as any], virtudes: [], defectos: [] } as any, { posicionesAdmitidas: [t.posicionEfectiva] }, p));
      console.log(f.id, c.id, t.x, t.zona.id, t.posicionEfectiva, pens.join(' '));
    }
  }
});
