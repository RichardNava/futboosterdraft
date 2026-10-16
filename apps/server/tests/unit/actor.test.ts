import { describe, expect, it } from 'vitest';
import { ActorPartida, RegistroActores, type MensajeSaliente } from '../../src/actores/actor';

function difusorDePrueba() {
  const enviados: MensajeSaliente[] = [];
  return { enviados, enviar: (_partidaId: string, s: MensajeSaliente) => enviados.push(s) };
}

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('ActorPartida', () => {
  it('ejecuta los comandos de uno en uno y en orden de llegada', async () => {
    const actor = new ActorPartida('p1', difusorDePrueba());
    const registro: string[] = [];
    const lento = actor.ejecutar(async () => {
      registro.push('inicio-a');
      await pausa(20);
      registro.push('fin-a');
    });
    const rapido = actor.ejecutar(() => {
      registro.push('b');
    });
    await Promise.all([lento, rapido]);
    expect(registro).toEqual(['inicio-a', 'fin-a', 'b']);
  });

  it('solo anuncia los mensajes cuando el comando termina bien (guardar antes de anunciar)', async () => {
    const difusor = difusorDePrueba();
    const actor = new ActorPartida('p1', difusor);
    await actor.ejecutar(async (ctx) => {
      ctx.emitirATodos({ t: 'draft.progreso' });
      expect(difusor.enviados).toHaveLength(0); // aún no se ha enviado nada
      await pausa(5);
    });
    expect(difusor.enviados).toHaveLength(1);
  });

  it('si el comando falla, descarta sus mensajes y la cola sigue funcionando', async () => {
    const difusor = difusorDePrueba();
    const actor = new ActorPartida('p1', difusor);
    await expect(
      actor.ejecutar((ctx) => {
        ctx.emitirA('x', { t: 'draft.turno' });
        throw new Error('fallo de persistencia');
      }),
    ).rejects.toThrow('fallo de persistencia');
    expect(difusor.enviados).toHaveLength(0);
    await expect(actor.ejecutar(() => 42)).resolves.toBe(42);
  });

  it('publicar() envía ya lo retenido; lo que se emite después espera al final del comando', async () => {
    const difusor = difusorDePrueba();
    const actor = new ActorPartida('p1', difusor);
    await actor.ejecutar(async (ctx) => {
      ctx.emitirATodos({ t: 'guardado' });
      ctx.publicar();
      expect(difusor.enviados.map((s) => s.mensaje.t)).toEqual(['guardado']);
      ctx.emitirATodos({ t: 'despues' });
      await pausa(5);
      expect(difusor.enviados).toHaveLength(1);
    });
    expect(difusor.enviados.map((s) => s.mensaje.t)).toEqual(['guardado', 'despues']);
  });

  it('no acepta comandos tras cerrarse', async () => {
    const actor = new ActorPartida('p1', difusorDePrueba());
    actor.cerrar();
    await expect(actor.ejecutar(() => 1)).rejects.toThrow();
  });
});

describe('RegistroActores', () => {
  it('crea una vez por partida, elimina y rehidrata', async () => {
    const tamanos: number[] = [];
    const registro = new RegistroActores<ActorPartida>((n) => tamanos.push(n));
    const difusor = difusorDePrueba();
    const a = registro.obtenerOCrear('p1', () => new ActorPartida('p1', difusor));
    expect(registro.obtenerOCrear('p1', () => new ActorPartida('p1', difusor))).toBe(a);
    registro.eliminar('p1');
    expect(a.estaCerrado).toBe(true);
    await registro.rehidratarTodos(
      async () => ['p2', 'p3'],
      async (id) => new ActorPartida(id, difusor),
    );
    expect(registro.tamano).toBe(2);
    expect(tamanos.at(-1)).toBe(2);
  });
});
