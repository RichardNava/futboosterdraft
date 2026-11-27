/**
 * Punto de entrada del servidor.
 * Variables de entorno: ver `.env.example`. `--fake-clock` activa el reloj simulado (solo desarrollo).
 */
import { cerrarPartidasMotor9 } from './actores/cierreMotor9';
import { validarEntornoProduccion } from './entorno';
import { conectar, urlBaseDatos } from './persistencia/db';
import { aplicarMigraciones } from './persistencia/migrar';
import { RelojFalso, RelojReal } from './programador/reloj';
import { hilosConfigurados } from './simulacion/grupo';
import { crearServidor } from './servidor';

async function principal(): Promise<void> {
  const relojFalso = process.argv.includes('--fake-clock');
  if (relojFalso && process.env.NODE_ENV === 'production') {
    throw new Error('--fake-clock no está permitido en producción');
  }
  if (process.env.NODE_ENV === 'production') {
    const problemas = validarEntornoProduccion(process.env);
    if (problemas.length) throw new Error(`Configuración de producción insegura (ver docs/despliegue.md):\n- ${problemas.join('\n- ')}`);
  }
  const secreto = process.env.AUTH_SECRET;
  if (!secreto) throw new Error('Falta la variable de entorno AUTH_SECRET (ver .env.example)');

  const conexion = conectar(urlBaseDatos());
  // Las migraciones pendientes se aplican al arrancar (MIGRAR_AL_ARRANCAR=false lo desactiva).
  if (process.env.MIGRAR_AL_ARRANCAR !== 'false') await aplicarMigraciones(conexion.db);
  // Hilos de simulación (spec 009, FR-007): por defecto, núcleos − 1; 0 simula en el hilo principal.
  const reloj = relojFalso ? new RelojFalso(Date.now()) : new RelojReal();
  // Cierre único de las partidas 8.x (spec 018, FR-046): antes de crear el servidor, para que ningún servicio las vea.
  // Si falla, `principal` lanza y el proceso termina sin aceptar tráfico.
  const cierre = await cerrarPartidasMotor9(conexion.db, reloj);
  if (cierre.ejecutado) console.info('Cierre de partidas del motor 9.0.0', cierre);
  const { hilos, aviso } = hilosConfigurados(process.env.HILOS_SIMULACION);
  const servidor = await crearServidor({
    db: conexion.db,
    reloj,
    secreto,
    urlPublica: process.env.PUBLIC_URL ?? 'http://localhost:5173',
    smtpUrl: process.env.SMTP_URL,
    smtpRemitente: process.env.SMTP_FROM,
    hilosSimulacion: hilos,
    // Desglose por fases (spec 010, FR-003): activado en todos los entornos; MEDIR_FASES=0 lo apaga.
    medirFases: process.env.MEDIR_FASES !== '0',
    // Con el reloj simulado (desarrollo y pruebas e2e), los recorridos automáticos consultan en bucle; la prueba de
    // carga sale de una sola IP. El arranque rechaza `LIMITES_DESACTIVADOS` en producción.
    limitesDesactivados: relojFalso || process.env.LIMITES_DESACTIVADOS === '1',
    proxiesConfianza: Number(process.env.PROXIES_CONFIANZA ?? 0),
    metricasToken: process.env.METRICAS_TOKEN,
  });

  if (aviso) servidor.logger.warn({ hilos }, aviso);
  else servidor.logger.info({ hilos }, 'Hilos de simulación');

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
