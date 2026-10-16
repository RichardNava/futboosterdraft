/**
 * Punto de entrada del servidor.
 * Variables de entorno: ver `.env.example`. `--fake-clock` activa el reloj simulado (solo desarrollo).
 */
import './entorno';
import { conectar, urlBaseDatos } from './persistencia/db';
import { aplicarMigraciones } from './persistencia/migrar';
import { RelojFalso, RelojReal } from './programador/reloj';
import { crearServidor } from './servidor';

async function principal(): Promise<void> {
  const relojFalso = process.argv.includes('--fake-clock');
  if (relojFalso && process.env.NODE_ENV === 'production') {
    throw new Error('--fake-clock no está permitido en producción');
  }
  const secreto = process.env.AUTH_SECRET;
  if (!secreto) throw new Error('Falta la variable de entorno AUTH_SECRET (ver .env.example)');

  const conexion = conectar(urlBaseDatos());
  // Las migraciones pendientes se aplican al arrancar (MIGRAR_AL_ARRANCAR=false lo desactiva).
  if (process.env.MIGRAR_AL_ARRANCAR !== 'false') await aplicarMigraciones(conexion.db);
  const servidor = await crearServidor({
    db: conexion.db,
    reloj: relojFalso ? new RelojFalso(Date.now()) : new RelojReal(),
    secreto,
    urlPublica: process.env.PUBLIC_URL ?? 'http://localhost:5173',
    smtpUrl: process.env.SMTP_URL,
    // Con el reloj simulado (desarrollo y pruebas e2e), los recorridos automáticos consultan en bucle:
    // no se limitan las peticiones por sesión.
    ...(relojFalso ? { limites: { http: { capacidad: 10_000, porSegundo: 10_000 }, ws: { capacidad: 10_000, porSegundo: 10_000 } } } : {}),
  });

  const cerrar = async () => {
    await servidor.app.close();
    await conexion.cerrar();
    process.exit(0);
  };
  process.on('SIGINT', () => void cerrar());
  process.on('SIGTERM', () => void cerrar());

  const rehidratadas = await servidor.gestor.rehidratar();
  if (rehidratadas) servidor.logger.info({ rehidratadas }, 'Partidas activas recuperadas');

  const puerto = Number(process.env.PORT ?? 3000);
  await servidor.app.listen({ port: puerto, host: '0.0.0.0' });
  if (relojFalso) servidor.logger.warn('Reloj simulado activo: POST /api/dev/reloj/avanzar { ms }');
}

principal().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
