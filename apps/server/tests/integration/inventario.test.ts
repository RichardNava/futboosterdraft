/**
 * Inventario de puntos de entrada (spec 017, FR-004, SC-001): cada ruta HTTP y cada mensaje WebSocket del servidor,
 * en desarrollo (con `/api/dev/*`) y en producción (con la web), debe estar en `inventario.json`, y al revés.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { RouteOptions } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { iniciarServidorAtaque } from '../seguridad/ayudas';

interface EntradaInventario {
  tipo: 'http' | 'ws';
  metodo?: string;
  ruta?: string;
  mensaje?: string;
  acceso: string[];
  comprobacion: string;
  hallazgos: string[];
}

const inventario = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../../../specs/017-auditoria-seguridad-roles/inventario.json', import.meta.url)), 'utf8'),
) as EntradaInventario[];

function capturador() {
  const rutas = new Set<string>();
  const alRegistrarRuta = (r: RouteOptions) => {
    // Fastify añade un HEAD por cada GET, con el mismo manejador y los mismos ganchos.
    for (const m of [r.method].flat()) if (m !== 'HEAD') rutas.add(`${m} ${r.url}`);
  };
  return { rutas, alRegistrarRuta };
}

describe('inventario de puntos de entrada', () => {
  let bd: BdPruebas;
  const rutas = new Set<string>();
  let mensajes: string[] = [];

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
    for (const produccion of [false, true]) {
      const c = capturador();
      const s = await iniciarServidorAtaque(bd, { produccion, alRegistrarRuta: c.alRegistrarRuta });
      for (const r of c.rutas) rutas.add(r);
      mensajes = s.pasarela.tiposMensaje();
      await s.cerrar();
    }
  });
  afterAll(() => bd.detener());

  it('contiene exactamente las rutas HTTP del servidor', () => {
    const anotadas = inventario.filter((e) => e.tipo === 'http').map((e) => `${e.metodo} ${e.ruta}`);
    expect(new Set(anotadas).size).toBe(anotadas.length);
    expect(anotadas.sort()).toEqual([...rutas].sort());
  });

  it('contiene exactamente los mensajes WebSocket del servidor', () => {
    expect(inventario.filter((e) => e.tipo === 'ws').map((e) => e.mensaje).sort()).toEqual([...mensajes].sort());
  });

  it('cada entrada indica quién puede usarla y qué la protege', () => {
    const incompletas = inventario.filter((e) => e.acceso.length === 0 || !e.comprobacion.trim() || !Array.isArray(e.hallazgos));
    expect(incompletas).toEqual([]);
  });
});
