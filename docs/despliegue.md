# Despliegue

Fútboosterdraft se despliega como **una sola imagen Docker** con Node 22. El mismo proceso sirve la API HTTP, el WebSocket (`/ws`) y la web compilada. Solo necesita una base de datos PostgreSQL 16 y, si quieres avisos por correo, un servidor SMTP.

> **Una sola réplica.** Cada partida vive en memoria en un actor del proceso y sus plazos se reprograman al arrancar (research R4 y R6). Con varias réplicas habría que repartir las partidas entre ellas (cada partida en una sola) o volver a una cola compartida. Para la beta (100 partidas simultáneas, SC-017), basta con una réplica.

## 1. Construir la imagen

```bash
docker build -t futboosterdraft .
```

La compilación usa pnpm (`corepack enable` y `pnpm install --frozen-lockfile`) y ejecuta `pnpm -r build`. Esto compila el servidor con tsup (los paquetes `@fbd/*` van dentro del bundle) y la web con Vite. La imagen final solo lleva:

- `dist/main.js`: el servidor.
- `dist/seed.js`: la carga del catálogo.
- `drizzle/`: las migraciones.
- `web/`: la web compilada.
- `data/`: las cartas (`core.json`, `cartas-prueba.json`) y las colecciones (`colecciones.json`).
- Las dependencias de producción.

## 2. Variables de entorno

| Variable | Obligatoria | Valor por defecto | Para qué sirve |
|---|---|---|---|
| `DATABASE_URL` | Sí | `postgres://fbd:fbd@localhost:5432/futboosterdraft` | Conexión a PostgreSQL 16. |
| `AUTH_SECRET` | Sí | — | Secreto para firmar las sesiones. Debe ser largo y aleatorio, p. ej. `openssl rand -base64 48`. Si cambia, se cierran todas las sesiones. |
| `PUBLIC_URL` | Sí | `http://localhost:5173` | URL pública de la web, p. ej. `https://futboosterdraft.example`. Es el único origen desde el que un navegador puede abrir el WebSocket, y también se usa en los enlaces de los correos. |
| `PORT` | No | `3000` | Puerto HTTP del contenedor. |
| `SMTP_URL` | No | — | Servidor de correo para los avisos del modo asíncrono (FR-056b), p. ej. `smtps://usuario:clave@smtp.example:465`. Sin él, los avisos solo aparecen en la aplicación. |
| `LOG_LEVEL` | No | `info` | Nivel de los logs (pino, JSON en la salida estándar). |
| `MIGRAR_AL_ARRANCAR` | No | (activado) | `false` desactiva las migraciones al arrancar. |
| `DB_POOL_MAX` | No | `25` | Conexiones simultáneas a PostgreSQL. Cada partida escribe desde su actor; con 10 conexiones, la carga de beta hacía esperar a los comandos. |
| `NODE_ENV` | — | `production` en la imagen | Activa las cookies `Secure` y el servido de la web. No lo cambies. |
| `CARPETA_MIGRACIONES`, `CARPETA_WEB` | — | ya fijadas en la imagen | Rutas de las migraciones y de la web dentro del contenedor. |

La web y la API comparten origen, así que las cookies de sesión son `HttpOnly`, `Secure` y `SameSite=Lax`. **Sirve la aplicación por HTTPS** (por ejemplo, detrás de un proxy inverso con TLS). Sin HTTPS, el navegador no guarda una cookie `Secure`.

## 3. Arrancar

```bash
docker run -d --name futboosterdraft -p 3000:3000 \
  -e DATABASE_URL=postgres://usuario:clave@db:5432/futboosterdraft \
  -e AUTH_SECRET=... \
  -e PUBLIC_URL=https://futboosterdraft.example \
  futboosterdraft
```

Al arrancar, el servidor:

1. **Aplica las migraciones pendientes** de `drizzle/`. Son idempotentes: si no hay ninguna pendiente, no hace nada.
2. **Rehidrata las partidas activas** (en sala, draft o torneo) y reprograma sus plazos: turnos de draft, preparación y vencimientos de jornada. **Limitación conocida del MVP**: un partido que se estaba jugando justo en el momento del reinicio no se reanuda a mitad. Evita reiniciar con partidos en juego (consulta `partidas_activas` en `/metrics`).
3. Empieza a escuchar en `PORT`.

### Desplegar la versión con los parámetros 2.0.0 (spec 002)

El motor de la spec 002 (capa espacial, parámetros de equilibrado 2.0.0) **no puede volver a simular
partidos jugados con los parámetros 1.x** (research R12): se rechazan con `VersionNoSoportada`.

1. Antes de desplegar, deja que terminen los partidos en juego (o termínalos) con la versión anterior:
   comprueba que `partidas_activas` en `/metrics` no tiene partidos en curso.
2. Los partidos ya terminados con 1.x siguen visibles por su resumen; su reproducción 2D responde
   `409 VERSION_NO_REPRODUCIBLE`.
3. Un partido entre humanos que quede en juego (síncrono, de la spec 001) se termina al arrancar con
   `resolverResto` y las decisiones automáticas de los dos lados (research R9).
4. Las migraciones `0004_mejoras` y `0005_colocacion` se aplican solas al arrancar.

### Desplegar la versión con los parámetros 3.0.0 (spec 003)

El motor de la spec 003 (zonas híbridas, tiro por distancia y ángulo, métricas por jugador) **no vuelve a simular
partidos jugados con los parámetros 2.x** (research R2): se rechazan con `VersionNoSoportada`.

1. Antes de desplegar, **termina los partidos 2.x en juego** con la versión anterior (o deja que terminen):
   `partidas_activas` en `/metrics` no debe tener partidos en curso.
2. Los partidos terminados con 2.x siguen visibles por su resumen y su pantalla de resultado; la reproducción 2D
   avisa de que se jugó con una versión anterior del motor.
3. Las migraciones se aplican solas al arrancar:
   - `0006_modo_simulacion`: el tipo de simulación pasa de la partida a cada participante y partido
     (`participantes.ultima_modalidad`, `partidos.modalidades`, tabla `perfiles_usuario`);
   - `0007_pantallas_torneo`: `participantes.derrota_vista_en` y `campeon_visto_en`;
   - `0008_identidad`: nombre y equipaciones por defecto en `perfiles_usuario`, equipaciones convertidas a v2 (lisas) y
     nombre de equipo único por partida sin distinguir mayúsculas (los duplicados existentes reciben « 2», « 3»…).

### Rendimiento del motor

`pnpm --filter @fbd/engine bench` mide el coste por partido (con y sin fotogramas). Úsalo para dimensionar
el servidor: cada partido en directo y cada «Finalizar partido» simulan con este motor.

### Proxy inverso

El proxy debe dejar pasar la mejora de conexión a WebSocket en `/ws`. Además, conviene que el tiempo de inactividad sea de al menos 60 s, porque el cliente envía un `ping` cada 25 s. Por ejemplo, en nginx:

```nginx
location /ws {
  proxy_pass http://futboosterdraft:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_read_timeout 120s;
}
location / {
  proxy_pass http://futboosterdraft:3000;
  proxy_set_header Host $host;
}
```

## 4. Cargar el catálogo

La primera vez, y cada vez que cambien las cartas o las colecciones, carga el catálogo. Por defecto lee `data/core.json`, `data/cartas-prueba.json` y `data/colecciones.json` (spec 006). La carga es idempotente (*upsert* por `id`) y va en una transacción: si cualquier fichero tiene un error, rechaza el lote entero (FR-024). Informa del recuento por demarcación × nivel de cada colección y, si una colección de pago ya vendida gana cartas, de lo que entrega a sus compradores.

```bash
docker exec futboosterdraft node dist/seed.js
docker exec futboosterdraft node dist/seed.js --file data/core.json --file otras.json --colecciones colecciones.json
```

**Después de cargar el catálogo, reinicia el servidor** (`docker restart futboosterdraft`): el catálogo se lee en memoria al arrancar, y hasta reiniciar no conoce las cartas nuevas (quien recibió una al ampliarse su colección vería un error en «Colección»).

Formato de los ficheros: `specs/006-preparacion-bd-cartas/contracts/datos-cartas.md` (esquemas en `packages/protocol/schemas/`).

> **Riesgo abierto que bloquea producción: escudos de las selecciones.** Las cartas pueden mostrar el escudo oficial de cada selección junto a su bandera (FR-044), pero su licencia no está revisada. Hasta entonces los escudos están desactivados (`ESCUDOS_ACTIVOS = false` en `apps/web/src/textos/selecciones.ts`) y la carpeta `apps/web/public/escudos/` no existe. Para activarlos: obtener los escudos con licencia, guardarlos como `apps/web/public/escudos/{CODIGO}.svg` (códigos de `SELECCIONES`) y poner la constante a `true`. Las banderas son de `flag-icons` (MIT; `apps/web/public/banderas/LICENSE`).
>
> **Pagos simulados.** Todas las compras en euros de la tienda son de prueba (`compras.simulada = true`, FR-031): no hay pasarela de pago.

## 5. Comprobaciones y métricas

- **`GET /healthz`**: `200 {"estado":"ok","baseDatos":"ok"}` si el proceso responde y llega a la base de datos. La imagen ya incluye un `HEALTHCHECK` que lo usa.
- **`GET /metrics`**: métricas en formato Prometheus. Además de las de Node.js, publica:
  - `partidas_activas`: partidas en memoria.
  - `turno_draft_resolucion_ms`: tiempo de resolución de cada turno de draft. Con carga de beta debe quedar por debajo de 1 s en el p95 (SC-017).
  - `partidos_simulados_total`.
  - `desconexiones_total`: cierres de WebSocket.

  No expongas `/metrics` a Internet: limítalo en el proxy a la red interna.

## 6. Límites y seguridad

- **Peticiones por sesión**: 60 en ráfaga y 20 por segundo sostenidas en HTTP (si se supera, `429 DEMASIADAS_PETICIONES`). En el WebSocket, 40 mensajes en ráfaga y 10 por segundo por participante (si se supera, `error DEMASIADOS_MENSAJES`).
- **Tamaño máximo**: 64 KB por cuerpo HTTP (`413`) y por mensaje WebSocket.
- **WebSocket**: se rechaza (`4403`) la conexión de un navegador cuyo `Origin` no sea `PUBLIC_URL`.
- **Visibilidad**: el servidor nunca envía elecciones ajenas durante el draft ni la alineación del rival antes del partido (FR-054a). Lo comprueba `apps/server/tests/integration/visibilidad.test.ts`.
- El reloj simulado (`--fake-clock`) y la ruta `/api/dev/reloj/avanzar` no están disponibles con `NODE_ENV=production`.

## 7. Copias de seguridad

Todo el estado persistente está en PostgreSQL: usuarios, partidas, drafts, alineaciones, partidos y avisos. Basta con copiar la base de datos (`pg_dump`). La memoria del proceso se reconstruye a partir de ella al arrancar.
