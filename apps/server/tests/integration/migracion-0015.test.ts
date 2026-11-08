/**
 * Migración 0015 (spec 012, T005; data-model §1): celebraciones como cosmético, celebración y modo de incidencias del
 * perfil y del participante, y el aviso «baja_sustituida».
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bdHasta, type BdParcial } from '../helpers/migraciones';

describe('migración 0015 (spec 012)', () => {
  let bd: BdParcial;

  beforeAll(async () => {
    bd = await bdHasta('0014_cosmeticos');
    await bd.db.execute(sql`insert into usuarios (id, apodo, email) values ('u014', 'Ana', 'ana@x.es')`);
    await bd.db.execute(sql`insert into perfiles_usuario (usuario_id, nombre_equipo, actualizado_en) values ('u014', 'Los Ana', now())`);
    await bd.db.execute(
      sql`insert into partidas (anfitrion_id, modo, num_participantes, plazas_humanas, tiempos, semilla) values ('u014', 'liga', 4, 1, '{}'::jsonb, 's')`,
    );
    await bd.db.execute(
      sql`insert into participantes (partida_id, tipo, usuario_id, nombre_equipo) select id, 'humano', 'u014', 'Los Ana' from partidas`,
    );
    await bd.completar();
  });
  afterAll(async () => {
    await bd?.detener();
  });

  it('valores por defecto en las filas existentes', async () => {
    const perfil = await bd.db.execute(sql`select celebracion, modo_incidencias from perfiles_usuario`);
    expect(perfil.rows).toEqual([{ celebracion: null, modo_incidencias: 'automatico' }]);
    const participante = await bd.db.execute(sql`select celebracion, modo_incidencias from participantes`);
    expect(participante.rows).toEqual([{ celebracion: null, modo_incidencias: 'automatico' }]);
  });

  it('cosmeticos admite celebraciones con datos', async () => {
    await bd.db.execute(
      sql`insert into cosmeticos (id, tipo, nombre, gratuito, orden, datos) values ('celebracion-clasica', 'celebracion', 'Clásica', true, 1, '{"clase":"juego","duracionMs":2500}'::jsonb)`,
    );
    const r = await bd.db.execute(sql`select datos from cosmeticos where id = 'celebracion-clasica'`);
    expect(r.rows).toEqual([{ datos: { clase: 'juego', duracionMs: 2500 } }]);
  });

  it('rechaza un modo de incidencias desconocido', async () => {
    await expect(bd.db.execute(sql`update perfiles_usuario set modo_incidencias = 'otro'`)).rejects.toThrow();
    await expect(bd.db.execute(sql`update participantes set modo_incidencias = 'otro'`)).rejects.toThrow();
    await bd.db.execute(sql`update participantes set modo_incidencias = 'control_total'`);
  });

  it('la celebración elegida debe existir en cosmeticos', async () => {
    await expect(bd.db.execute(sql`update perfiles_usuario set celebracion = 'no-existe'`)).rejects.toThrow();
    await expect(bd.db.execute(sql`update participantes set celebracion = 'no-existe'`)).rejects.toThrow();
    await bd.db.execute(sql`update perfiles_usuario set celebracion = 'celebracion-clasica'`);
    await bd.db.execute(sql`update participantes set celebracion = 'celebracion-clasica'`);
  });

  it('avisos admite «baja_sustituida»', async () => {
    await bd.db.execute(sql`insert into avisos (usuario_id, tipo, texto, creado_en) values ('u014', 'baja_sustituida', 'x', now())`);
    await expect(bd.db.execute(sql`insert into avisos (usuario_id, tipo, texto, creado_en) values ('u014', 'otro', 'x', now())`)).rejects.toThrow();
  });
});
