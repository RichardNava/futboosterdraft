/**
 * Premium de cortesía (spec 013, FR-035): equivale a un pase activo sin fecha de fin y no aparece en la tienda. Lo
 * sustituirán los roles de la futura spec de RBAC.
 *
 * Uso: `pnpm --filter @fbd/server premium <email> <si|no>`.
 */
import '../entorno';
import { eq, sql } from 'drizzle-orm';
import { conectar, urlBaseDatos } from '../persistencia/db';
import { pasesPremium, usuarios } from '../persistencia/esquema/index';

async function principal(): Promise<void> {
  const [email, valor] = process.argv.slice(2).filter((a) => a !== '--');
  if (!email || (valor !== 'si' && valor !== 'no')) throw new Error('Uso: pnpm --filter @fbd/server premium <email> <si|no>');
  const conexion = conectar(urlBaseDatos());
  try {
    const [usuario] = await conexion.db
      .select({ id: usuarios.id, invitado: usuarios.isAnonymous })
      .from(usuarios)
      .where(eq(sql`lower(${usuarios.email})`, email.toLowerCase()));
    if (!usuario || usuario.invitado) throw new Error(`No hay ninguna cuenta registrada con el email ${email}`);
    const cortesia = valor === 'si';
    const ahora = new Date();
    await conexion.db
      .insert(pasesPremium)
      .values({ usuarioId: usuario.id, cortesia, actualizadoEn: ahora })
      .onConflictDoUpdate({ target: pasesPremium.usuarioId, set: { cortesia, actualizadoEn: ahora } });
    console.log(`${email}: premium de cortesía ${cortesia ? 'activado' : 'desactivado'}.`);
  } finally {
    await conexion.cerrar();
  }
}

principal().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
