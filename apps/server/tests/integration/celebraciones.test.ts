/**
 * Celebraciones de gol (spec 012, US1; T022): catálogo con las 5, elección en el perfil, copia al unirse y
 * `celebraciones` en `partido.inicio` (NPC → la del juego).
 */
import { CELEBRACION_DEL_JUEGO } from '@fbd/domain';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { avanzarHasta } from '../helpers/torneo';
import { crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

const TURNO = 46_000;

describe('celebraciones de gol (spec 012, US1)', () => {
  let bd: BdPruebas;
  let srv: ServidorPruebas;

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
  });
  beforeEach(async () => {
    await srv?.cerrar();
    await bd.limpiar();
    srv = await iniciarServidorPruebas(bd);
  });
  afterAll(async () => {
    await srv?.cerrar();
    await bd?.detener();
  });

  const elegir = (u: UsuarioPrueba, cuerpo: Record<string, unknown>) => peticion(srv.url, '/api/perfil/aspecto', { metodo: 'PUT', cookie: u.cookie, cuerpo });
  async function crear(u: UsuarioPrueba, cuerpo: Record<string, unknown> = {}): Promise<string> {
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4, plazasHumanas: 1, ...cuerpo } });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(201);
    return r.cuerpo.id as string;
  }

  it('el catálogo tiene las 5 celebraciones; GET /api/cosmeticos lista las activas con sus datos', async () => {
    const filas = await bd.db.execute<{ id: string; activo: boolean; datos: { clase: string; duracionMs: number } }>(
      sql`select id, activo, datos from cosmeticos where tipo = 'celebracion' order by orden`,
    );
    expect(filas.rows.map((f) => f.id)).toEqual([
      'celebracion-clasica',
      'celebracion-estadio',
      'celebracion-neon',
      'celebracion-pizarra',
      'celebracion-prueba-secuencia',
    ]);
    for (const f of filas.rows) if (f.datos.clase === 'juego') expect(f.datos.duracionMs).toBeLessThanOrEqual(3000);
    const r = await peticion(srv.url, '/api/cosmeticos');
    const celebraciones = (r.cuerpo.cosmeticos as { id: string; tipo: string; datos?: unknown }[]).filter((c) => c.tipo === 'celebracion');
    expect(celebraciones.map((c) => c.id)).not.toContain('celebracion-prueba-secuencia');
    expect(celebraciones).toHaveLength(4);
    for (const c of celebraciones) expect(c.datos).toBeTruthy();
  });

  it('PUT aspecto: una celebración activa vale; la de prueba (inactiva) o un escudo, 422 COSMETICO_NO_DISPONIBLE', async () => {
    const u = await crearRegistrado(srv.url);
    expect((await peticion(srv.url, '/api/perfil/aspecto', { cookie: u.cookie })).cuerpo).toMatchObject({ celebracion: null, modoIncidencias: 'automatico' });
    const ok = await elegir(u, { celebracion: 'celebracion-neon', modoIncidencias: 'control_total' });
    expect(ok.estado, JSON.stringify(ok.cuerpo)).toBe(200);
    expect(ok.cuerpo).toMatchObject({ celebracion: 'celebracion-neon', modoIncidencias: 'control_total' });
    for (const id of ['celebracion-prueba-secuencia', 'escudo-flor-de-lis-azul-oro', 'no-existe']) {
      const r = await elegir(u, { celebracion: id });
      expect(r.estado, id).toBe(422);
      expect(r.cuerpo.error.codigo).toBe('COSMETICO_NO_DISPONIBLE');
    }
    expect((await elegir(u, { modoIncidencias: 'otro' })).estado).toBe(400);
  });

  it('se copian al unirse y partido.inicio lleva la del humano y la del juego para el NPC', async () => {
    const u = await crearRegistrado(srv.url);
    await elegir(u, { celebracion: 'celebracion-pizarra', modoIncidencias: 'control_total' });
    const id = await crear(u);
    const fila = await bd.db.execute<{ celebracion: string | null; modo_incidencias: string }>(
      sql`select celebracion, modo_incidencias from participantes where partida_id = ${id} and usuario_id = ${u.id}`,
    );
    expect(fila.rows[0]).toEqual({ celebracion: 'celebracion-pizarra', modo_incidencias: 'control_total' });

    const ws = await ClienteWs.conectar(srv.urlWs, id, u.cookie);
    await ws.esperar('estado');
    await peticion(srv.url, `/api/partidas/${id}/iniciar`, { metodo: 'POST', cookie: u.cookie });
    await avanzarHasta(srv, TURNO, async () => ws.recibidos.some((m) => m.t === 'preparacion.inicio'), 400);
    const prep = await ws.esperar('preparacion.inicio');
    const c = await srv.gestor.obtenerOError(id);
    const yo = c.participanteDeUsuario(u.id)!.id;
    const desde = ws.recibidos.length;
    await peticion(srv.url, `/api/partidos/${prep.partidoId}/abrir`, { metodo: 'POST', cookie: u.cookie });
    const inicio = await ws.esperar('partido.inicio', { desde });
    const miLado = inicio.local.id === yo ? 'local' : 'visitante';
    const suLado = miLado === 'local' ? 'visitante' : 'local';
    expect(inicio.celebraciones[miLado]).toEqual({ id: 'celebracion-pizarra', datos: { clase: 'juego', duracionMs: 2800 } });
    expect(inicio.celebraciones[suLado].id).toBe(CELEBRACION_DEL_JUEGO);
    expect(inicio.modoIncidencias).toBe('control_total');
    await ws.cerrar();
  });
});
