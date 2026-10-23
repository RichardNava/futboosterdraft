import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pino from 'pino';
import type { BaseDatos } from '../../src/persistencia/db';
import { AlmacenPeticionesMemoria } from '../../src/persistencia/peticiones';
import { Catalogo } from '../../src/persistencia/repos/catalogo';
import { RelojFalso } from '../../src/programador/reloj';
import { crearServidor, type Servidor } from '../../src/servidor';

// Las rutas probadas aquí no tocan la base de datos; las que sí, se prueban en tests/integration.
const dbSinUso = {} as BaseDatos;

describe('app HTTP (sin base de datos)', () => {
  let servidor: Servidor;
  const reloj = new RelojFalso(Date.UTC(2026, 9, 15));

  beforeAll(async () => {
    servidor = await crearServidor({
      db: dbSinUso,
      reloj,
      secreto: 'secreto-de-pruebas-suficientemente-largo-123',
      urlPublica: 'http://localhost:5173',
      logger: pino({ level: 'silent' }),
      peticiones: new AlmacenPeticionesMemoria(),
      catalogo: Catalogo.desdeLista([]),
    });
    await servidor.app.ready();
  });
  afterAll(() => servidor.app.close());

  it('GET /api/catalogo/formaciones devuelve las 10 formaciones', async () => {
    const r = await servidor.app.inject({ method: 'GET', url: '/api/catalogo/formaciones' });
    expect(r.statusCode).toBe(200);
    const formaciones = r.json() as { id: string; casillas: unknown[] }[];
    expect(formaciones).toHaveLength(10);
    expect(formaciones.every((f) => f.casillas.length === 11)).toBe(true);
  });

  it('GET /api/catalogo/rasgos devuelve las 39 virtudes y los 15 defectos con nombre, ámbito e impacto', async () => {
    const r = await servidor.app.inject({ method: 'GET', url: '/api/catalogo/rasgos' });
    type Texto = { id: string; nombre: string; ambito: string; impacto: number };
    const { virtudes, defectos } = r.json() as { virtudes: Texto[]; defectos: Texto[] };
    expect(virtudes).toHaveLength(39);
    expect(defectos).toHaveLength(15);
    expect(defectos.find((d) => d.id === 'Fragil')).toMatchObject({ nombre: 'Frágil', ambito: 'generico', impacto: 0.5 });
    expect(virtudes.find((s) => s.id === 'Capitania')).toMatchObject({ nombre: 'Capitanía', ambito: 'generico' });
    expect(virtudes.find((s) => s.id === 'BoxToBox')?.ambito).toBe('MED');
  });

  it('una ruta inexistente de la API devuelve el formato de error común', async () => {
    const r = await servidor.app.inject({ method: 'GET', url: '/api/no-existe' });
    expect(r.statusCode).toBe(404);
    expect(r.json()).toMatchObject({ error: { codigo: 'RUTA_NO_ENCONTRADA' } });
  });

  it('los errores de validación usan el formato común', async () => {
    const r = await servidor.app.inject({ method: 'POST', url: '/api/dev/reloj/avanzar', payload: { ms: -1 } });
    expect(r.statusCode).toBe(400);
    expect(r.json()).toEqual({ error: { codigo: 'MS_INVALIDO', mensaje: 'Indica "ms" ≥ 0', detalles: {} } });
  });

  it('un cuerpo JSON vacío o mal formado es un 400, no un error interno', async () => {
    for (const payload of ['', '{no-json']) {
      const r = await servidor.app.inject({ method: 'POST', url: '/api/dev/reloj/avanzar', headers: { 'content-type': 'application/json' }, payload });
      expect(r.statusCode).toBe(400);
      expect(r.json()).toMatchObject({ error: { codigo: 'PETICION_INVALIDA' } });
    }
  });

  it('una sesión que supera el límite recibe 429 con el formato común', async () => {
    const cookie = 'better-auth.session_token=sesion-de-prueba-limite';
    const respuestas = [];
    for (let i = 0; i < 70; i++) respuestas.push(await servidor.app.inject({ method: 'GET', url: '/api/no-existe', headers: { cookie } }));
    expect(respuestas.slice(0, 60).every((r) => r.statusCode === 404)).toBe(true);
    const limitada = respuestas.at(-1)!;
    expect(limitada.statusCode).toBe(429);
    expect(limitada.json()).toMatchObject({ error: { codigo: 'DEMASIADAS_PETICIONES' } });
    // Sin sesión no se limita aquí.
    expect((await servidor.app.inject({ method: 'GET', url: '/api/no-existe' })).statusCode).toBe(404);
  });

  it('un cuerpo mayor de 64 KB se rechaza con 413', async () => {
    const r = await servidor.app.inject({
      method: 'POST',
      url: '/api/dev/reloj/avanzar',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ ms: 1, relleno: 'x'.repeat(70 * 1024) }),
    });
    expect(r.statusCode).toBe(413);
    expect(r.json()).toMatchObject({ error: { codigo: 'MENSAJE_DEMASIADO_GRANDE' } });
  });

  it('Idempotency-Key: repetir la petición no repite el efecto', async () => {
    const antes = reloj.ahora();
    const peticion = {
      method: 'POST' as const,
      url: '/api/dev/reloj/avanzar',
      payload: { ms: 60_000 },
      headers: { 'idempotency-key': 'clave-1' },
    };
    const a = await servidor.app.inject(peticion);
    const b = await servidor.app.inject(peticion);
    expect(a.statusCode).toBe(200);
    expect(b.json()).toEqual(a.json());
    expect(b.headers['idempotent-replay']).toBe('true');
    expect(reloj.ahora() - antes).toBe(60_000); // solo avanzó una vez
  });
});
