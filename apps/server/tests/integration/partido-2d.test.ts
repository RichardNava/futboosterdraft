import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { programarJornada } from '../../src/actores/preparacion';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

const TURNO = 46_000;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('partido 2D (US6)', () => {
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

  /** Liga de 4 en 2D con dos humanos que se enfrentan en la primera jornada; devuelve el partido ya empezado. */
  async function partidoEntreHumanos() {
    const humanos: UsuarioPrueba[] = [await crearRegistrado(srv.url), await crearRegistrado(srv.url)];
    const r = await peticion(srv.url, '/api/partidas', {
      cookie: humanos[0]!.cookie,
      cuerpo: { modo: 'liga', numParticipantes: 4, tipoSimulacion: '2d', ritmo: 'directo', plazasHumanas: 2 },
    });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(201);
    const partidaId: string = r.cuerpo.id;
    await peticion(srv.url, `/api/partidas/${partidaId}/unirse`, { metodo: 'POST', cookie: humanos[1]!.cookie });
    const [a, b] = await Promise.all(humanos.map((h) => ClienteWs.conectar(srv.urlWs, partidaId, h.cookie)));
    const c = await srv.gestor.obtenerOError(partidaId);
    c.programarPrimeraJornada = async (ctx) => {
      const [h1, h2] = c.participantes.filter((p) => p.tipo === 'humano').map((p) => p.id);
      const [n1, n2] = c.participantes.filter((p) => p.tipo === 'npc').map((p) => p.id);
      await programarJornada(c, ctx, 1, [{ local: h1!, visitante: h2! }, { local: n1!, visitante: n2! }], { inicial: true });
    };
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: humanos[0]!.cookie });
    for (let i = 0; i < 30 && ![a, b].every((cl) => cl!.recibidos.some((m) => m.t === 'preparacion.inicio')); i++) {
      srv.reloj.avanzar(TURNO);
      await espera(60);
    }
    const desde = a!.recibidos.length;
    srv.reloj.avanzar(300_001);
    const inicio = await a!.esperar('partido.inicio', { desde });
    const tramo = await a!.esperar('partido.tramo', { desde });
    await b!.esperar('partido.tramo');
    return { partidaId, humanos, a: a!, b: b!, inicio, tramo };
  }

  const reproducir = (ws: ClienteWs, partidoId: string, tick: number) => ws.enviar({ t: 'partido.reproduccion', partidoId, tick }, false);
  const tramos = (ws: ClienteWs) => ws.recibidos.filter((m) => m.t === 'partido.tramo');

  it('el tramo llega con fotogramas y la velocidad efectiva es la menor de los dos humanos', async () => {
    const { a, b, inicio, tramo } = await partidoEntreHumanos();
    expect(inicio.modalidad).toBe('2d');
    expect(tramo.fotogramas.length).toBeGreaterThan(0);
    expect(Object.keys(tramo.fotogramas[0].j)).toHaveLength(22);

    let desde = a.recibidos.length;
    let desdeB = b.recibidos.length;
    a.enviar({ t: 'partido.velocidad', partidoId: inicio.partidoId, velocidad: 32 }, false);
    b.enviar({ t: 'partido.velocidad', partidoId: inicio.partidoId, velocidad: 32 }, false);
    expect((await a.esperar('partido.velocidad', { desde })).velocidadEfectiva).toBe(32);
    expect((await b.esperar('partido.velocidad', { desde: desdeB })).velocidadEfectiva).toBe(32);
    desde = a.recibidos.length;
    desdeB = b.recibidos.length;
    b.enviar({ t: 'partido.velocidad', partidoId: inicio.partidoId, velocidad: 4 }, false);
    expect((await a.esperar('partido.velocidad', { desde })).velocidadEfectiva).toBe(4);
    expect((await b.esperar('partido.velocidad', { desde: desdeB })).velocidadEfectiva).toBe(4);
    await a.cerrar();
    await b.cerrar();
  });

  it('no simula el siguiente tramo hasta que los dos han llegado a la interrupción', async () => {
    const { a, b, inicio, tramo } = await partidoEntreHumanos();
    reproducir(a, inicio.partidoId, tramo.hastaTick);
    await espera(400);
    expect(tramos(a)).toHaveLength(1);
    const desde = a.recibidos.length;
    reproducir(b, inicio.partidoId, tramo.hastaTick);
    const siguiente = await a.esperar('partido.tramo', { desde });
    expect(siguiente.desdeTick).toBe(tramo.hastaTick);
    await a.cerrar();
    await b.cerrar();
  });

  it('una sustitución pedida con el balón en juego se aplica en la siguiente interrupción y la ven los dos', async () => {
    const { a, b, inicio, tramo } = await partidoEntreHumanos();
    const estado = await a.esperar('estado');
    const yo = inicio.local.id === estado.vista.partida.miParticipanteId ? 'local' : 'visitante';
    const mia = inicio.alineaciones[yo];
    const sale = mia.titulares.find((t: any) => t.casillaId !== 'POR').jugador.id;
    const entra = mia.suplentes[0].id;
    // A mitad de la reproducción del primer tramo, con el balón en juego.
    reproducir(a, inicio.partidoId, Math.floor(tramo.hastaTick / 2));
    const ack = await a.enviarYEsperarAck({ t: 'partido.decision', partidoId: inicio.partidoId, tipo: 'sustitucion', datos: { sale, entra } });
    expect(ack.ok, JSON.stringify(ack)).toBe(true);
    const desdeA = a.recibidos.length;
    const desdeB = b.recibidos.length;
    reproducir(a, inicio.partidoId, tramo.hastaTick);
    reproducir(b, inicio.partidoId, tramo.hastaTick);
    const aplicadaA = await a.esperar('partido.decision_aplicada', { desde: desdeA });
    const aplicadaB = await b.esperar('partido.decision_aplicada', { desde: desdeB });
    expect(aplicadaA.datos).toEqual({ sale, entra });
    expect(aplicadaB.datos).toEqual({ sale, entra });
    expect(aplicadaA.aplicadaEnTick).toBe(tramo.hastaTick);
    await a.cerrar();
    await b.cerrar();
  });

  it('tras una reconexión, el estado trae los tramos ya simulados', async () => {
    const { partidaId, humanos, a, b, inicio, tramo } = await partidoEntreHumanos();
    reproducir(a, inicio.partidoId, tramo.hastaTick);
    reproducir(b, inicio.partidoId, tramo.hastaTick);
    await a.esperar('partido.tramo', { desde: a.recibidos.indexOf(tramo) + 1 });
    await a.cerrar();
    const otra = await ClienteWs.conectar(srv.urlWs, partidaId, humanos[0]!.cookie);
    const estado = await otra.esperar('estado');
    const dosD = estado.vista.partido.dosD;
    expect(dosD.tramos.length).toBeGreaterThanOrEqual(2);
    expect(dosD.tramos[0].desdeTick).toBe(0);
    expect(dosD.tramos.at(-1).fotogramas.length).toBeGreaterThan(0);
    expect(dosD.tramos[0].fotogramas).toBeUndefined();
    expect(dosD.objetivoTick).toBe(dosD.tramos.at(-1).hastaTick);
    await otra.cerrar();
    await b.cerrar();
  });

  it('si un humano lleva 10 s desconectado, el partido sigue al ritmo del otro (SC-011)', async () => {
    const { a, b, inicio, tramo } = await partidoEntreHumanos();
    await b.cerrar();
    await espera(100);
    reproducir(a, inicio.partidoId, tramo.hastaTick);
    await espera(300);
    expect(tramos(a)).toHaveLength(1);
    const desde = a.recibidos.length;
    srv.reloj.avanzar(10_001);
    const siguiente = await a.esperar('partido.tramo', { desde });
    expect(siguiente.desdeTick).toBe(tramo.hastaTick);
    // Y sigue avanzando solo con la reproducción de A hasta el final.
    let ultimo = siguiente;
    for (let i = 0; i < 400 && ultimo.fase !== 'finalizado'; i++) {
      const n = a.recibidos.length;
      reproducir(a, inicio.partidoId, ultimo.hastaTick);
      ultimo = await a.esperar('partido.tramo', { desde: n });
    }
    expect(ultimo.fase).toBe('finalizado');
    await a.esperar('partido.fin', { desde });
    await a.cerrar();
  });
});
