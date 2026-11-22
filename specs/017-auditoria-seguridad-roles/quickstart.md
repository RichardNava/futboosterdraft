# Quickstart: validar la spec 017

Guía para comprobar la spec cuando esté implementada. Los ataques se lanzan **solo contra un entorno propio** (FR-005).

## Preparación

```bash
docker compose up -d
pnpm install
pnpm db:migrate
pnpm seed
pnpm dev
```

Para los escenarios C, D, E, F y G, construye la imagen y arráncala detrás de un proxy HTTPS local. Sin él, la dirección
del navegador no coincide con `PUBLIC_URL`, el servidor rechaza sus POST con `403 ORIGEN_NO_PERMITIDO` y la cookie
`Secure` no se guarda:

```bash
docker build -t futboosterdraft:seguridad .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgres://<usuario-propio>:<clave-propia>@host.docker.internal:5432/futboosterdraft \
  -e AUTH_SECRET="$(openssl rand -base64 48)" \
  -e PUBLIC_URL=https://localhost:8443 \
  -e PROXIES_CONFIANZA=1 \
  -e METRICAS_TOKEN="$(openssl rand -hex 32)" \
  futboosterdraft:seguridad

# En otra terminal. El certificado es local: acepta el aviso del navegador.
docker run --rm --name proxy-fbd -p 8443:8443 --add-host=host.docker.internal:host-gateway caddy:2 \
  caddy reverse-proxy --from https://localhost:8443 --to host.docker.internal:3000 --internal-certs
```

La web de estos escenarios es `https://localhost:8443`.

## A. Informe (US1, SC-001)

1. Abre `specs/017-auditoria-seguridad-roles/auditoria.md`.
2. Comprueba que aparecen todas las áreas de FR-003, también las que no tienen hallazgos.
3. Comprueba que cada hallazgo tiene severidad, evidencia, riesgo, estado y cierre.
4. Ejecuta `pnpm --filter @fbd/server test:integration inventario`.

**Resultado esperado**: el inventario coincide con las rutas y mensajes reales, y el informe no contiene secretos.

## B. Ataques (US2, SC-002, SC-003, SC-005, SC-006, SC-007)

```bash
pnpm seguridad
```

**Resultado esperado**: termina sin errores y `verificacion.md` muestra todos los ataques como «Bloqueado».

## C. Producción (FR-028, FR-033, FR-034, FR-036)

Con la imagen en marcha:

```bash
curl -ik https://localhost:8443/healthz
curl -ik https://localhost:8443/metrics
curl -ik -X POST https://localhost:8443/api/dev/reloj/avanzar
```

**Resultado esperado**: `/healthz` responde solo `{"estado":"ok"}`; las otras dos, `404`.

Arranca la imagen con `-e AUTH_SECRET=corto`.

**Resultado esperado**: no arranca, nombra `AUTH_SECRET` y no muestra su valor.

Con una cuenta registrada, abre la tienda.

**Resultado esperado**: las opciones en euros aparecen como no disponibles.

## D. Roles y panel (US3, SC-004, SC-008, SC-009)

1. En `https://localhost:8443`, registra dos cuentas y designa la primera, con `DATABASE_URL` apuntando a la misma base
   de datos que la imagen:

   ```bash
   pnpm --filter @fbd/server admin designar <email-de-prueba>
   ```

2. Entra con ella en `/admin` y cambia un ajuste. Debe llevar menos de 1 minuto.
3. Asigna el rol betatester a la segunda y entrégale 1.000 fragmentos con un motivo.
4. Intenta entregar 10.001.
5. Intenta quitarte el rol.
6. Abre la pestaña Registro.
7. Entra con la segunda cuenta y abre `/admin`.

**Resultado esperado**: el saldo sube una vez; 10.001 y quitarte el rol se rechazan; el registro muestra quién, qué y
cuándo; la segunda cuenta no entra.

## E. Suspensión y cierre (US3)

1. Con la segunda cuenta, juega un draft en otra ventana.
2. Suspéndela desde el panel.
3. Crea otra partida con una tercera cuenta y ciérrala desde el panel con un motivo.

**Resultado esperado**: la cuenta suspendida sale en 5 s como máximo y no puede volver a entrar; el draft sigue para el
resto; los participantes de la partida cerrada reciben el aviso y no hay premios.

## F. robots.txt (US4, SC-010)

Con la imagen y el proxy en marcha, abre `https://localhost:8443/robots.txt` y compruébalo con un validador de robots.

**Resultado esperado**: se recibe texto; `/` está permitida; `/api/`, `/ws`, `/metrics`, `/admin`, `/partidas/x/draft`,
`/?restablecer=x` y una ruta inventada están bloqueadas.

## G. Escaneo externo (FR-006)

Con la imagen y el proxy en marcha. ZAP comparte la red del contenedor del proxy para llegar a él como `localhost`:

```bash
docker run --rm -t --network container:proxy-fbd ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t https://localhost:8443
```

**Resultado esperado**: el informe de la auditoría recoge cada alerta y cómo se resolvió.

## H. Calidad (SC-011, SC-012)

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:equivalence
pnpm e2e
pnpm audit --audit-level=high
```

**Resultado esperado**: todo en verde, sin vulnerabilidades altas ni críticas, y los resultados de equivalencia no cambian.
