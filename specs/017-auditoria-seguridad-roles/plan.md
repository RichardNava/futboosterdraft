# Implementation Plan: Auditoría de seguridad y roles

**Branch**: `017-auditoria-seguridad-roles` (carpeta de la spec; la rama de git activa sigue siendo `main`) | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/017-auditoria-seguridad-roles/spec.md`

## Summary

La spec se resuelve en cinco fases, en este orden, sin dependencias nuevas de producción:

1. **Auditoría**: informe único [auditoria.md](auditoria.md) (se crea en la implementación) con el inventario de puntos
   de entrada, `pnpm audit` y un escaneo de OWASP ZAP contra un entorno local (R1, R2, R23).
2. **Corrección**: se cierran los indicios de la spec y lo que salga. Casi todo cabe en piezas que ya existen:
   `Limitador`, los ganchos de Fastify, Better Auth y `ServicioEconomia` (R3 a R15).
3. **Roles y panel**: una columna `rol`, un registro de administración inalterable y un panel web en `/admin`. Las
   órdenes de consola siguen como vía de emergencia (R16 a R21).
4. **robots.txt**: fichero estático que permite la portada y los recursos que necesita para pintarse (R22).
5. **Repetición de la auditoría** sobre lo cambiado (FR-007) y resumen legible de todos los ataques (FR-011).

La lectura del código añade cuatro problemas a los indicios de la spec (detalle en [research.md](research.md), R3, R13,
R14 y R24): el login con `Idempotency-Key` guarda su respuesta con el token de sesión; las herramientas de pruebas
acaban en la imagen de producción; 11 vulnerabilidades críticas o altas en dependencias de producción exigen tres
subidas de versión mayor; y **una cuenta con pase premium no se puede eliminar**.

## Technical Context

**Language/Version**: TypeScript 5 sobre Node ≥ 22, ESM.

**Primary Dependencies**: Fastify 5, Better Auth 1.7, Drizzle + `pg`, zod, nodemailer, React 19 + Vite. Sin dependencias
nuevas de producción. Suben de versión mayor por seguridad: zod 3 → 4, nodemailer 6 → 10 y `@fastify/static` 8 → 10
(R14). OWASP ZAP se usa con su imagen Docker y no entra en el repositorio.

**Storage**: PostgreSQL, migración `0018_spec017.sql` ([data-model.md](data-model.md)).

**Testing**: Vitest (unidad e integración), Playwright (`pnpm e2e`), `test:equivalence` y un comando nuevo,
`pnpm seguridad`, que repite los ataques y escribe el resumen (R2).

**Target Platform**: servidor Linux en contenedor, detrás de un proxy inverso con HTTPS, y navegador desde 360 px.

**Project Type**: monorepo web (`apps/server`, `apps/web`, `packages/{domain,protocol}`, `tools/`).

**Performance Goals**:

- ninguna consulta nueva por petición HTTP: el rol y la suspensión llegan en la lectura de sesión que ya se hace;
- una sola consulta cada 3 s para revisar todas las conexiones WebSocket (R8), lo que garantiza SC-007;
- la prueba de carga de la beta no empeora (INI-07).

**Constraints**:

- no cambian las reglas ni los resultados del motor (FR-012, SC-012);
- el servidor sigue siendo una sola réplica, así que los límites pueden vivir en memoria;
- ningún ataque se lanza fuera de entornos propios (FR-005);
- solo la persona responsable puede aceptar un riesgo (FR-009).

**Scale/Scope**: unas 70 rutas HTTP y 9 tipos de mensaje WebSocket por auditar; 1 pantalla nueva; 4 tablas o columnas
nuevas; beta de 100 partidas simultáneas.

Sin NEEDS CLARIFICATION: la spec quedó aclarada el 2026-11-21 y las decisiones técnicas están en
[research.md](research.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitución 1.7.0.

| Principio | Antes del diseño | Después del diseño |
|---|---|---|
| I. Estrategia determinante | No se tocan reglas | Cumple: ningún rol altera el partido |
| II. Draft como núcleo | No se toca | Cumple: el cierre de partida no cambia el draft |
| III. Reglas de dominio explícitas | Roles y permisos en un solo sitio | Cumple: matriz en `packages/domain` (R16) |
| IV. Simulación verificable | No se toca el motor | Cumple: `test:equivalence` como puerta (SC-012) |
| V. Un único motor | No se toca | Cumple |
| VI. Integridad multijugador | Objetivo de la spec | Cumple: identidad, permiso y duplicados en el servidor (R3, R8) |
| VII. Monetización | Pago simulado cerrado en producción; betatester con condiciones | Cumple: entrega manual, con motivo, tope de 10.000 y registro; el rol no se vende (R13, R20) |
| VIII. Modularidad | Administración como módulo propio | Cumple: `apps/server/src/admin/` |
| IX. Calidad con pruebas | Cada ataque con su prueba | Cumple: `pnpm seguridad` y su resumen para personas no técnicas (R2) |
| X. Incremental y trazable | Fases con su criterio | Cumple: cada hallazgo enlaza con su prueba o decisión |
| XI. Sin desplazamiento | Panel nuevo | Cumple: pestañas y listas paginadas ([contracts/ui.md](contracts/ui.md)) |
| Flujo de git | Los agentes no confirman | Cumple |

Resultado: **pasa** antes y después del diseño, sin excepciones.

## Project Structure

### Documentation (this feature)

```text
specs/017-auditoria-seguridad-roles/
├── plan.md              # Este fichero
├── research.md          # Decisiones técnicas (R1 a R24)
├── data-model.md        # Migración 0018 y entidades
├── quickstart.md        # Validación de punta a punta
├── contracts/
│   ├── seguridad.md     # Límites, cabeceras, entorno, informe y verificación
│   ├── http-admin.md    # API del panel y cambios en la API actual
│   └── ui.md            # Panel, tienda y mensajes
├── auditoria.md         # Informe (se crea en la implementación)
├── inventario.json      # Puntos de entrada (se crea en la implementación)
├── verificacion.md      # Resumen de ataques (lo genera `pnpm seguridad`)
└── tasks.md             # Lo crea /speckit-tasks
```

### Source Code (repository root)

```text
packages/domain/src/
└── roles/                    # NUEVO: roles, permisos y rolEfectivo

apps/server/
├── drizzle/0018_spec017.sql  # NUEVO
├── src/
│   ├── admin/                # NUEVO: servicio, rutas, registro, órdenes y CLI
│   ├── auth/                 # auth.ts y rutas.ts: sin API interna, límites, suspensión
│   ├── http/
│   │   ├── app.ts            # proxy, origen, idempotencia, límites
│   │   ├── cabeceras.ts      # NUEVO: protecciones del navegador
│   │   └── limitador.ts      # tope real de claves y fallos por cuenta
│   ├── entorno.ts            # validación de producción
│   ├── economia/servicio.ts  # pago simulado cerrado, entrega a betatester
│   ├── observabilidad/       # /metrics con token, /healthz mínimo, registros sin datos sensibles
│   ├── persistencia/         # esquema y almacén de peticiones por cuenta, con caducidad
│   ├── actores/              # cierre de partida por un administrador
│   └── ws/pasarela.ts        # revisión periódica de sesiones
└── tests/seguridad/          # NUEVO: un test por ataque y generador del resumen

apps/web/
├── public/robots.txt         # NUEVO
└── src/
    ├── pantallas/Admin.tsx   # NUEVO (carga diferida)
    ├── app/Rutas.tsx         # ruta /admin solo para administradores
    └── pantallas/            # Tienda (euros no disponibles), Inicio (token fuera de la URL)

.pnpmfile.cjs                 # NUEVO: saca las herramientas de pruebas de producción
Dockerfile, .env.example, docs/despliegue.md, .github/workflows/ci.yml
```

**Structure Decision**: se mantiene el monorepo. La administración es un módulo nuevo del servidor; los permisos van en
`packages/domain` para que servidor y web lean la misma matriz, y el servidor es siempre quien decide.

## Orden de implementación

1. Informe e inventario de la auditoría, con el estado actual reproducido.
2. Dependencias e imagen, porque zod 4 toca todo el protocolo y conviene aislarlo.
3. Correcciones críticas y altas, cada una con su ataque en `tests/seguridad/`.
4. Correcciones medias y bajas, o su propuesta de aceptación para la persona responsable.
5. Migración, roles, registro y API de administración.
6. Panel web.
7. robots.txt y documentación.
8. Repetición de la auditoría, ZAP y `pnpm seguridad`.

## Riesgos

| Riesgo | Efecto | Mitigación |
|---|---|---|
| zod 4 cambia validaciones del protocolo | Mensajes válidos rechazados | Subida aislada; pruebas de contrato, integración y e2e antes de seguir |
| Una cabecera CSP bloquea algo de la web | Pantalla rota | e2e que falla con cualquier violación de CSP en consola (R9) |
| Límites por origen frenan a grupos reales | Bloqueos legítimos | Los estrictos solo sin sesión; valores ajustables (spec, Assumptions) |
| La prueba de carga sale de una sola IP | Choca con los límites | Opción para desactivarlos, rechazada al arrancar en producción (R5) |
| La beta depende de INI-12 | No se puede abrir solo con esta spec | INI-12 pasa a P0 en el ROADMAP (D-1) |

## Complexity Tracking

Sin violaciones de la constitución que justificar.
