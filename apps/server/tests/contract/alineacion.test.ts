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
    const p = (await peticion(srv.url, '/api/partidas', { cookie: g.cookie, cuerpo: { modo: 'liga', numParticipantes: 4, tipoSimulacion: 'rapida', ritmo: 'directo' } })).cuerpo;
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
    expect(r.cuerpo.previsualizacion).toHaveLength(11);
    expect(r.cuerpo.plantilla).toHaveLength(24);
    expect(r.cuerpo.alineacion.lanzadores.tanda).toHaveLength(5);
    expect(r.cuerpo.dorsales).toBeNull();
    expect(r.cuerpo.equipaciones.primera.principal).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('PUT confirma, crea una versión nueva y asigna los dorsales iniciales', async () => {
    const { alineacion } = (await peticion(srv.url, `${ruta}/alineacion`, { cookie: anfitrion.cookie })).cuerpo;
    const r = await peticion(srv.url, `${ruta}/alineacion`, { metodo: 'PUT', cookie: anfitrion.cookie, cuerpo: alineacion });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
    expect(r.cuerpo.confirmada).toBe(true);
    expect(r.cuerpo.version).toBe(1);
    const dorsales = Object.values(r.cuerpo.dorsales as Record<string, number>);
    expect(dorsales).toHaveLength(24);
    expect(new Set(dorsales).size).toBe(24);
    const portero = alineacion.titulares.find((t: any) => t.casillaId === 'POR').jugadorId;
    expect(r.cuerpo.dorsales[portero]).toBe(1);

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
    expect(r.cuerpo.previsualizacion.find((c: any) => c.casillaId === 'POR')).toMatchObject({ fueraDePosicion: true, penalizacion: 0.6 });
    const despues = (await peticion(srv.url, `${ruta}/alineacion`, { cookie: anfitrion.cookie })).cuerpo;
    expect(despues.version).toBe(version);
  });

  it('dorsales: 422 DORSAL_REPETIDO y DORSAL_FUERA_DE_RANGO; un cambio válido se guarda', async () => {
    const { dorsales } = (await peticion(srv.url, `${ruta}/alineacion`, { cookie: anfitrion.cookie })).cuerpo;
    const [a, b] = Object.keys(dorsales);
    const repetido = await peticion(srv.url, `${ruta}/dorsales`, { metodo: 'PUT', cookie: anfitrion.cookie, cuerpo: { dorsales: { [a!]: dorsales[b!] } } });
    expect(repetido.cuerpo.error.codigo).toBe('DORSAL_REPETIDO');
    const rango = await peticion(srv.url, `${ruta}/dorsales`, { metodo: 'PUT', cookie: anfitrion.cookie, cuerpo: { dorsales: { [a!]: 100 } } });
    expect(rango.cuerpo.error.codigo).toBe('DORSAL_FUERA_DE_RANGO');
    const libre = [...Array(99).keys()].map((i) => i + 1).find((n) => !Object.values(dorsales).includes(n))!;
    const ok = await peticion(srv.url, `${ruta}/dorsales`, { metodo: 'PUT', cookie: anfitrion.cookie, cuerpo: { dorsales: { [a!]: libre } } });
    expect(ok.cuerpo.dorsales[a!]).toBe(libre);
  });

  it('equipaciones: 422 COLOR_INVALIDO y EQUIPACIONES_IGUALES; un cambio válido se guarda', async () => {
    const primera = { principal: '#123456', secundario: '#ffffff' };
    const invalido = await peticion(srv.url, `${ruta}/equipaciones`, {
      metodo: 'PUT',
      cookie: anfitrion.cookie,
      cuerpo: { primera: { principal: 'azul', secundario: '#fff' }, segunda: primera },
    });
    expect(invalido.cuerpo.error.codigo).toBe('COLOR_INVALIDO');
    const iguales = await peticion(srv.url, `${ruta}/equipaciones`, { metodo: 'PUT', cookie: anfitrion.cookie, cuerpo: { primera, segunda: primera } });
    expect(iguales.cuerpo.error.codigo).toBe('EQUIPACIONES_IGUALES');
    const segunda = { principal: '#ff9900', secundario: '#000000' };
    const ok = await peticion(srv.url, `${ruta}/equipaciones`, { metodo: 'PUT', cookie: anfitrion.cookie, cuerpo: { primera, segunda } });
    expect(ok.estado).toBe(200);
    expect((await peticion(srv.url, `${ruta}/alineacion`, { cookie: anfitrion.cookie })).cuerpo.equipaciones).toEqual({ primera, segunda });
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
