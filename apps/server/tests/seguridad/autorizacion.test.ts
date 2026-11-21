/**
 * Acceso a recursos ajenos por HTTP y WebSocket (spec 017, T067, FR-021, FR-022): recorre cada ruta de partida y
 * partido de `inventario.json` con otra cuenta y sin sesión.
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import type { ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { partidaTrasDraft } from '../helpers/partidas';
import { crearInvitado, crearRegistrado, iniciarServidorAtaque, peticion, type ServidorAtaque, type UsuarioPrueba } from './ayudas';

interface Entrada {
  tipo: string;
  metodo?: string;
  ruta?: string;
}

const inventario = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../../../specs/017-auditoria-seguridad-roles/inventario.json', import.meta.url)), 'utf8'),
) as Entrada[];

const conRecurso = inventario.filter((e) => e.tipo === 'http' && /^\/api\/(partidas|partidos)\/:id/.test(e.ruta!));

describe('recursos ajenos', () => {
  let bd: BdPruebas;
  let s: ServidorAtaque;
  let victima: UsuarioPrueba;
  let extrana: UsuarioPrueba;
  let partidaId: string;
  let partidoId: string;

  const url = (ruta: string) => ruta.replace(':id', ruta.startsWith('/api/partidos') ? partidoId : partidaId);

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
    s = await iniciarServidorAtaque(bd);
    const { anfitrion, partida } = await partidaTrasDraft(s as ServidorPruebas);
    victima = anfitrion;
    partidaId = partida.id;
    extrana = await crearRegistrado(s.url);
    const filas = await bd.db.execute<{ id: string }>(sql`select id from partidos where partida_id = ${partidaId} limit 1`);
    partidoId = filas.rows[0]!.id;
  });
  afterAll(async () => {
    await s.cerrar();
    await bd.detener();
  });

  it('SEG-007: leer el resumen de una partida ajena en torneo', async () => {
    const r = await peticion(s.url, `/api/partidas/${partidaId}`, { cookie: extrana.cookie });
    expect(r.estado).toBe(403);
    expect(r.cuerpo.error.codigo).toBe('NO_PARTICIPA');
    expect(JSON.stringify(r.cuerpo)).not.toContain(victima.id);
    expect((await peticion(s.url, `/api/partidas/${partidaId}`, { cookie: victima.cookie })).estado).toBe(200);
  });

  it('SEG-007: la sala de una partida abierta sigue visible para poder unirse', async () => {
    const anfitrion = await crearRegistrado(s.url);
    const abierta = await peticion(s.url, '/api/partidas', { cookie: anfitrion.cookie, cuerpo: { modo: 'liga', numParticipantes: 4, plazasHumanas: 2 } });
    const r = await peticion(s.url, `/api/partidas/${abierta.cuerpo.id}`, { cookie: extrana.cookie });
    expect(r.estado).toBe(200);
    expect(r.cuerpo.miParticipanteId).toBeNull();
  });

  it('SEG-007: leer la sala de la partida de un invitado, que no admite a nadie más', async () => {
    const invitado = await crearInvitado(s.url);
    const privada = await peticion(s.url, '/api/partidas', { cookie: invitado.cookie, cuerpo: { modo: 'liga', numParticipantes: 4 } });
    expect((await peticion(s.url, `/api/partidas/${privada.cuerpo.id}`, { cookie: extrana.cookie })).estado).toBe(403);
  });

  it('SEG-000: usar cada ruta de partida y partido sin sesión', async () => {
    expect(conRecurso.length).toBeGreaterThan(20);
    for (const e of conRecurso) {
      const r = await peticion(s.url, url(e.ruta!), { metodo: e.metodo!, ...(e.metodo === 'GET' ? {} : { cuerpo: {} }) });
      expect(r.estado, `${e.metodo} ${e.ruta}`).toBe(401);
    }
  });

  it('SEG-000: usar cada ruta de partida y partido con una cuenta ajena', async () => {
    for (const e of conRecurso) {
      const r = await peticion(s.url, url(e.ruta!), { metodo: e.metodo!, cookie: extrana.cookie, ...(e.metodo === 'GET' ? {} : { cuerpo: {} }) });
      expect(r.estado, `${e.metodo} ${e.ruta}: ${JSON.stringify(r.cuerpo)}`).toBeGreaterThanOrEqual(400);
      expect(r.estado, `${e.metodo} ${e.ruta}`).toBeLessThan(500);
    }
  });

  it('SEG-000: marcar como leído el aviso de otra cuenta', async () => {
    const id = randomUUID();
    await bd.db.execute(sql`insert into avisos (id, usuario_id, tipo, partida_id, texto, creado_en) values (${id}, ${victima.id}, 'jornada_abierta', ${partidaId}, 'aviso', now())`);
    expect((await peticion(s.url, `/api/avisos/${id}/leido`, { metodo: 'POST', cookie: extrana.cookie })).estado).toBe(404);
    const filas = await bd.db.execute<{ leido: boolean }>(sql`select leido from avisos where id = ${id}`);
    expect(filas.rows[0]!.leido).toBe(false);
  });

  it('SEG-000: abrir el canal en tiempo real de una partida ajena', async () => {
    const codigo = await new Promise<number>((resolve, reject) => {
      const ws = new WebSocket(`${s.urlWs}/ws?partidaId=${partidaId}`, { headers: { cookie: extrana.cookie } });
      ws.once('close', resolve);
      ws.once('error', reject);
    });
    expect(codigo).toBe(4403);
  });
});
