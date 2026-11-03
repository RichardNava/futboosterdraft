/**
 * Serializar una vez por mensaje (spec 010, FR-011, research R8): un mensaje para todos se convierte en
 * texto una sola vez y todos los sockets reciben la misma cadena; los mensajes por participante, uno por
 * destinatario.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import { Pasarela, type ContextoConexion, type OpcionesPasarela } from '../../src/ws/pasarela';

const PARTIDA = 'p1';

function socketFalso() {
  const recibidos: string[] = [];
  const socket = { OPEN: 1, readyState: 1, send: (texto: string) => recibidos.push(texto) };
  return { socket: socket as unknown as WebSocket, recibidos };
}

/** Pasarela con `n` participantes conectados, dos sockets cada uno (dos pestañas). */
function pasarelaConectada(n: number) {
  const pasarela = new Pasarela({} as OpcionesPasarela);
  const anadir = (pasarela as unknown as { anadir(ctx: ContextoConexion, s: WebSocket): void }).anadir.bind(pasarela);
  const porParticipante = new Map<string, ReturnType<typeof socketFalso>[]>();
  for (let i = 0; i < n; i++) {
    const participanteId = `j${i}`;
    const sockets = [socketFalso(), socketFalso()];
    for (const { socket } of sockets) anadir({ partidaId: PARTIDA, participanteId } as ContextoConexion, socket);
    porParticipante.set(participanteId, sockets);
  }
  return { pasarela, porParticipante };
}

describe('Pasarela.enviar (FR-011)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('un mensaje para todos se serializa una vez y todos reciben la misma cadena', () => {
    const { pasarela, porParticipante } = pasarelaConectada(4);
    const stringify = vi.spyOn(JSON, 'stringify');

    pasarela.enviar(PARTIDA, { destino: { tipo: 'todos' }, mensaje: { t: 'draft.turno', turno: 3 } });

    expect(stringify).toHaveBeenCalledTimes(1);
    const texto = stringify.mock.results[0]!.value as string;
    const recibidos = [...porParticipante.values()].flat().map((s) => s.recibidos);
    expect(recibidos).toHaveLength(8);
    for (const r of recibidos) {
      expect(r).toHaveLength(1);
      expect(r[0]).toBe(texto);
    }
  });

  it('los mensajes por participante se serializan uno por destinatario y solo le llegan a él', () => {
    const { pasarela, porParticipante } = pasarelaConectada(3);
    const stringify = vi.spyOn(JSON, 'stringify');

    for (const participanteId of porParticipante.keys()) {
      pasarela.enviar(PARTIDA, {
        destino: { tipo: 'participante', participanteId },
        mensaje: { t: 'draft.sobre', para: participanteId },
      });
    }

    expect(stringify).toHaveBeenCalledTimes(3);
    for (const [participanteId, sockets] of porParticipante) {
      for (const { recibidos } of sockets) {
        expect(recibidos.map((t) => JSON.parse(t))).toEqual([{ t: 'draft.sobre', para: participanteId }]);
      }
    }
  });
});
