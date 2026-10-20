import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { partidaTrasDraft } from '../helpers/partidas';
import { crearInvitado, crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

describe('contrato HTTP de alineación (US2)', () => {
  let bd: BdPruebas;
  let srv: ServidorPruebas;
  let anfitrion: UsuarioPrueba;
  let partidaId: string;
  let ruta: string;

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
    srv = await iniciarServidorPruebas(bd);
    const r = await partidaTrasDraft(srv, { invitado: true });
    anfitrion = r.anfitrion;
    partidaId = r.partida.id;
    ruta = `/api/partidas/${partidaId}`;
  });
  afterAll(async () => {
    await srv?.cerrar();
    await bd?.detener();
  });

  it('no se puede preparar el equipo durante el draft (409 DRAFT_EN_CURSO)', async () => {
    const g = await crearInvitado(srv.url);
    const p = (await peticion(srv.url, '/api/partidas', { cookie: g.cookie, cuerpo: { modo: 'liga', numParticipantes: 4 } })).cuerpo;
    await peticion(srv.url, `/api/partidas/${p.id}/iniciar`, { metodo: 'POST', cookie: g.cookie });
    const r = await peticion(srv.url, `/api/partidas/${p.id}/alineacion`, { cookie: g.cookie });
    expect(r.estado).toBe(409);
    expect(r.cuerpo.error.codigo).toBe('DRAFT_EN_CURSO');
  });

  it('GET devuelve una alineación automática válida, con previsualización, lanzadores y equipaciones', async () => {
    const r = await peticion(srv.url, `${ruta}/alineacion`, { cookie: anfitrion.cookie });
    expect(r.estado).toBe(200);
    expect(r.cuerpo.confirmada).toBe(false);
    expect(r.cuerpo.alineacion.titulares).toHaveLength(11);
    expect(r.cuerpo.previsualizacion.titulares).toHaveLength(11);
    expect(r.cuerpo.previsualizacion.personalizada).toBe(false);
    expect(r.cuerpo.plantilla).toHaveLength(24);
    expect(r.cuerpo.alineacion.lanzadores.tanda).toHaveLength(5);
    // Los dorsales se asignan al terminar el draft, por la alineación automática (spec 003, FR-001b).
    const dorsales = r.cuerpo.dorsales as Record<string, number>;
    expect(Object.values(dorsales).sort((a, b) => a - b)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    expect(dorsales[r.cuerpo.alineacion.titulares.find((t: any) => t.casillaId === 'POR').jugadorId]).toBe(1);
    expect(r.cuerpo.equipaciones.primera.colores[0]).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('PUT confirma y crea una versión nueva, sin reasignar los dorsales del draft (FR-001b)', async () => {
    const { alineacion, dorsales: delDraft } = (await peticion(srv.url, `${ruta}/alineacion`, { cookie: anfitrion.cookie })).cuerpo;
    // Otro once (dos titulares intercambiados): los dorsales siguen siendo los del draft.
    const [a, b] = alineacion.titulares.filter((t: any) => t.casillaId !== 'POR');
    const cambiada = {
      ...alineacion,
      titulares: alineacion.titulares.map((t: any) => (t === a ? { ...t, jugadorId: b.jugadorId } : t === b ? { ...t, jugadorId: a.jugadorId } : t)),
    };
    const r = await peticion(srv.url, `${ruta}/alineacion`, { metodo: 'PUT', cookie: anfitrion.cookie, cuerpo: cambiada });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
    expect(r.cuerpo.confirmada).toBe(true);
    expect(r.cuerpo.version).toBe(1);
    expect(r.cuerpo.dorsales).toEqual(delDraft);

    const otra = await peticion(srv.url, `${ruta}/alineacion`, {
      metodo: 'PUT',
      cookie: anfitrion.cookie,
      cuerpo: { ...alineacion, tactica: { ...alineacion.tactica, alturaBloque: 'presion_alta' } },
    });
    expect(otra.cuerpo.version).toBe(2);
    // Los dorsales no se reasignan al cambiar la alineación.
    expect(otra.cuerpo.dorsales).toEqual(r.cuerpo.dorsales);
  });

  it('422 ALINEACION_INVALIDA con todos los motivos', async () => {
    const { alineacion } = (await peticion(srv.url, `${ruta}/alineacion`, { cookie: anfitrion.cookie })).cuerpo;
    const r = await peticion(srv.url, `${ruta}/alineacion`, {
      metodo: 'PUT',
      cookie: anfitrion.cookie,
      cuerpo: { ...alineacion, titulares: alineacion.titulares.slice(0, 10), suplentes: [123_456] },
    });
    expect(r.estado).toBe(422);
    expect(r.cuerpo.error.codigo).toBe('ALINEACION_INVALIDA');
    expect(r.cuerpo.error.detalles.motivos.length).toBeGreaterThanOrEqual(2);
  });

  it('422 TACTICA_INCOMPATIBLE', async () => {
    const { alineacion } = (await peticion(srv.url, `${ruta}/alineacion`, { cookie: anfitrion.cookie })).cuerpo;
    const r = await peticion(srv.url, `${ruta}/alineacion`, {
      metodo: 'PUT',
      cookie: anfitrion.cookie,
      cuerpo: { ...alineacion, tactica: { ...alineacion.tactica, alturaBloque: 'catenaccio', lineaAdelantada: true } },
    });
    expect(r.estado).toBe(422);
    expect(r.cuerpo.error.codigo).toBe('TACTICA_INCOMPATIBLE');
  });

  it('previsualizar calcula stats efectivos sin guardar', async () => {
    const { alineacion, version } = (await peticion(srv.url, `${ruta}/alineacion`, { cookie: anfitrion.cookie })).cuerpo;
    const t = alineacion.titulares;
    const porteroIdx = t.findIndex((x: any) => x.casillaId === 'POR');
    const otroIdx = porteroIdx === 0 ? 1 : 0;
    const cambiada = t.map((x: any, i: number) =>
      i === porteroIdx ? { ...x, jugadorId: t[otroIdx].jugadorId } : i === otroIdx ? { ...x, jugadorId: t[porteroIdx].jugadorId } : x,
    );
    const r = await peticion(srv.url, `${ruta}/alineacion/previsualizar`, { cookie: anfitrion.cookie, cuerpo: { ...alineacion, titulares: cambiada } });
    expect(r.estado).toBe(200);
    expect(r.cuerpo.previsualizacion.titulares.find((c: any) => c.casillaId === 'POR')).toMatchObject({ fueraDePosicion: true, penalizacion: 0.6 });
    const despues = (await peticion(srv.url, `${ruta}/alineacion`, { cookie: anfitrion.cookie })).cuerpo;
    expect(despues.version).toBe(version);
  });

  it('colocación libre: PUT la guarda y previsualizar devuelve la Previsualizacion (FR-034, T118)', async () => {
    const { alineacion } = (await peticion(srv.url, `${ruta}/alineacion`, { cookie: anfitrion.cookie })).cuerpo;
    const campo = alineacion.titulares.find((t: any) => t.casillaId !== 'POR');
    const colocacion = [{ jugadorId: campo.jugadorId, x: 800, y: 300 }];
    const vista = await peticion(srv.url, `${ruta}/alineacion/previsualizar`, { cookie: anfitrion.cookie, cuerpo: { ...alineacion, colocacion } });
    expect(vista.estado).toBe(200);
    const p = vista.cuerpo.previsualizacion;
    expect(Object.keys(p).sort()).toEqual(['amplitud', 'avisos', 'ofensividad', 'personalizada', 'reparto', 'titulares']);
    expect(p.personalizada).toBe(true);
    const movido = p.titulares.find((t: any) => t.jugadorId === campo.jugadorId);
    expect(movido).toMatchObject({ x: 800, y: 300, posicionEfectiva: 'DC', zonaId: 'C-DC-ATQ' });
    expect(movido).toHaveProperty('penalizacion');
    expect(p.reparto.defensa + p.reparto.medio + p.reparto.ataque).toBe(10);

    const r = await peticion(srv.url, `${ruta}/alineacion`, { metodo: 'PUT', cookie: anfitrion.cookie, cuerpo: { ...alineacion, colocacion } });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
    expect(r.cuerpo.alineacion.colocacion).toEqual(colocacion);
  });

  it('colocación no válida: 422 ALINEACION_INVALIDA con los motivos nuevos (FR-034a)', async () => {
    const { alineacion } = (await peticion(srv.url, `${ruta}/alineacion`, { cookie: anfitrion.cookie })).cuerpo;
    const portero = alineacion.titulares.find((t: any) => t.casillaId === 'POR').jugadorId;
    const campo = alineacion.titulares.find((t: any) => t.casillaId !== 'POR').jugadorId;
    for (const [colocacion, motivo] of [
      [[{ jugadorId: portero, x: 500, y: 320 }], 'PORTERO_FUERA_DE_PORTERIA'],
      [[{ jugadorId: campo, x: 50, y: 320 }], 'JUGADOR_EN_PORTERIA'],
      [[{ jugadorId: campo, x: 1200, y: 320 }], 'COLOCACION_FUERA_DEL_CAMPO'],
    ] as const) {
      const r = await peticion(srv.url, `${ruta}/alineacion`, { metodo: 'PUT', cookie: anfitrion.cookie, cuerpo: { ...alineacion, colocacion } });
      expect(r.estado).toBe(422);
      expect(r.cuerpo.error.codigo).toBe('ALINEACION_INVALIDA');
      expect(r.cuerpo.error.detalles.motivos).toContain(motivo);
    }
  });

  it('dorsales: { jugadorId, dorsal } → { dorsales, sinDorsal }; 422 DORSAL_FUERA_DE_RANGO (FR-037)', async () => {
    const { dorsales } = (await peticion(srv.url, `${ruta}/alineacion`, { cookie: anfitrion.cookie })).cuerpo;
    const [a, b] = Object.keys(dorsales).map(Number);
    const rango = await peticion(srv.url, `${ruta}/dorsales`, { metodo: 'PUT', cookie: anfitrion.cookie, cuerpo: { jugadorId: a, dorsal: 100 } });
    expect(rango.estado).toBe(422);
    expect(rango.cuerpo.error.codigo).toBe('DORSAL_FUERA_DE_RANGO');
    // El dorsal de b pasa a a, y b se queda sin dorsal (ya no hay DORSAL_REPETIDO).
    const r = await peticion(srv.url, `${ruta}/dorsales`, { metodo: 'PUT', cookie: anfitrion.cookie, cuerpo: { jugadorId: a, dorsal: dorsales[b!] } });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
    expect(r.cuerpo.dorsales[a!]).toBe(dorsales[b!]);
    expect(r.cuerpo.dorsales[b!]).toBeUndefined();
    expect(r.cuerpo.sinDorsal).toEqual([b]);
    const valores = Object.values(r.cuerpo.dorsales as Record<string, number>);
    expect(new Set(valores).size).toBe(valores.length);
  });

  it('equipaciones v2: 422 COLOR_INVALIDO, DISENO_INVALIDO, NUM_COLORES_INVALIDO y EQUIPACIONES_PARECIDAS; v1 se convierte; un cambio válido se guarda', async () => {
    const put = (cuerpo: unknown) => peticion(srv.url, `${ruta}/equipaciones`, { metodo: 'PUT', cookie: anfitrion.cookie, cuerpo });
    const primera = { diseno: 'rayas', colores: ['#d01010', '#ffffff'] };
    const segunda = { diseno: 'lisa', colores: ['#1030d0', '#f0c000'] };
    expect((await put({ primera: { diseno: 'lisa', colores: ['azul'] }, segunda })).cuerpo.error.codigo).toBe('COLOR_INVALIDO');
    expect((await put({ primera: { diseno: 'cuadros', colores: ['#d01010'] }, segunda })).cuerpo.error.codigo).toBe('DISENO_INVALIDO');
    expect((await put({ primera: { diseno: 'lisa', colores: [] }, segunda })).cuerpo.error.codigo).toBe('NUM_COLORES_INVALIDO');
    const parecidas = await put({ primera, segunda: { diseno: 'lisa', colores: ['#c81818', '#ffffff'] } });
    expect(parecidas.estado).toBe(422);
    expect(parecidas.cuerpo.error.codigo).toBe('EQUIPACIONES_PARECIDAS');
    const ok = await put({ primera, segunda });
    expect(ok.estado).toBe(200);
    expect((await peticion(srv.url, `${ruta}/alineacion`, { cookie: anfitrion.cookie })).cuerpo.equipaciones).toEqual({ primera, segunda });
    // v1, durante la compatibilidad: se guarda como lisas.
    const v1 = await put({ primera: { principal: '#123456', secundario: '#ffffff' }, segunda: { principal: '#ff9900', secundario: '#000000' } });
    expect(v1.estado).toBe(200);
    expect(v1.cuerpo.equipaciones).toEqual({
      primera: { diseno: 'lisa', colores: ['#123456', '#ffffff'] },
      segunda: { diseno: 'lisa', colores: ['#ff9900', '#000000'] },
    });
  });

  it('nombre de equipo: 422 por formato, 409 NOMBRE_REPETIDO; 200 antes del primer partido y 409 TORNEO_INICIADO después', async () => {
    // Partida propia: en la compartida, otras pruebas ya han abierto partidos.
    const { anfitrion, partida } = await partidaTrasDraft(srv, { invitado: true });
    const ruta = `/api/partidas/${partida.id}`;
    const put = (nombre: string) => peticion(srv.url, `${ruta}/nombre-equipo`, { metodo: 'PUT', cookie: anfitrion.cookie, cuerpo: { nombre } });
    expect((await put('  ')).cuerpo.error.codigo).toBe('NOMBRE_VACIO');
    expect((await put('Ab')).cuerpo.error.codigo).toBe('NOMBRE_CORTO');
    expect((await put('x'.repeat(25))).estado).toBe(422);
    expect((await put('x'.repeat(25))).cuerpo.error.codigo).toBe('NOMBRE_LARGO');
    const torneo = (await peticion(srv.url, `${ruta}/torneo`, { cookie: anfitrion.cookie })).cuerpo;
    const yo = (await peticion(srv.url, ruta, { cookie: anfitrion.cookie })).cuerpo.miParticipanteId;
    const otro = torneo.clasificacion.find((f: any) => f.participanteId !== yo).nombre as string;
    const repetido = await put(otro.toUpperCase());
    expect(repetido.estado).toBe(409);
    expect(repetido.cuerpo.error.codigo).toBe('NOMBRE_REPETIDO');
    const ok = await put('  Los   Halcones ');
    expect(ok.estado, JSON.stringify(ok.cuerpo)).toBe(200);
    expect(ok.cuerpo.nombreEquipo).toBe('Los Halcones');
    // Se abre el primer partido del torneo: ya no se puede cambiar (FR-042).
    const mio = torneo.jornadas[0].partidos.find((p: any) => p.local?.id === yo || p.visitante?.id === yo);
    await peticion(srv.url, `/api/partidos/${mio.partidoId}/abrir`, { metodo: 'POST', cookie: anfitrion.cookie });
    const tarde = await put('Los Leones');
    expect(tarde.estado).toBe(409);
    expect(tarde.cuerpo.error.codigo).toBe('TORNEO_INICIADO');
  });

  it('nadie ajeno a la partida puede ver ni tocar su alineación (FR-054a)', async () => {
    const ajeno = await crearRegistrado(srv.url);
    const r = await peticion(srv.url, `${ruta}/alineacion`, { cookie: ajeno.cookie });
    expect(r.estado).toBe(403);
    // No existe ninguna ruta para la alineación de otro participante.
    const rival = (await peticion(srv.url, ruta, { cookie: anfitrion.cookie })).cuerpo.participantes[1].id;
    const r2 = await peticion(srv.url, `${ruta}/alineacion/${rival}`, { cookie: anfitrion.cookie });
    expect(r2.estado).toBe(404);
  });
});
