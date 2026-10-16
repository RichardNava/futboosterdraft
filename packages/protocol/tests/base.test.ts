import { describe, expect, it } from 'vitest';
import { MsgAck, MsgEstado, RespuestaError } from '../src';

describe('protocolo base', () => {
  it('valida un ack correcto y uno con error', () => {
    const requestId = '0b8f4d7e-6a0d-4a4b-9a43-2f3c2a1b0c9d';
    expect(MsgAck.safeParse({ t: 'ack', requestId, ok: true }).success).toBe(true);
    expect(
      MsgAck.safeParse({ t: 'ack', requestId, ok: false, error: { codigo: 'YA_ELEGIDO', mensaje: 'Ya elegiste' } })
        .success,
    ).toBe(true);
    expect(MsgAck.safeParse({ t: 'ack', requestId: 'no-uuid', ok: true }).success).toBe(false);
  });

  it('valida el sobre del mensaje estado', () => {
    expect(
      MsgEstado.safeParse({ t: 'estado', serverTime: '2026-10-15T10:00:00.000Z', fase: 'draft', vista: {} }).success,
    ).toBe(true);
    expect(MsgEstado.safeParse({ t: 'estado', serverTime: 'ayer', fase: 'draft', vista: {} }).success).toBe(false);
  });

  it('el error HTTP rellena detalles por defecto', () => {
    const r = RespuestaError.parse({ error: { codigo: 'X', mensaje: 'y' } });
    expect(r.error.detalles).toEqual({});
  });
});
