# Implementation Plan: Mejora de cartas y nivel de rareza del draft

**Branch**: `main` (sin rama propia, como las specs 008 a 012) | **Date**: 2026-11-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/013-mejora-cartas-rareza-draft/spec.md`

## Summary

Siete historias. Dos son de contenido (fondos y legibilidad), una es la novedad de juego (rareza del draft, con pase
premium y cobro por partida) y cuatro son arreglos cuya causa ya está localizada:

1. **Fondos (US1)**: script `fondos-core` que verifica 1 ilustración por id, convierte a WebP 600 × 900 (≈ 55 KB) y
   escribe `imagen_bg` en `core-real.json`. La carta ya pinta `imagen_bg`; el plan B solo toca `conIdentidad` (R1, R2).
2. **Legibilidad (US2)**: CSS (recuadro menos translúcido + sombra fina) y un test de contraste en el peor caso,
   recuadro sobre blanco (R3).
3. **Rareza (US3)**: el reparto por nivel entra en los parámetros versionados; `generarSobre` recibe un reparto y
   consume el RNG igual que hoy con el reparto actual (regresión exacta, SC-005). Rico degrada hueco a hueco
   (L ↔ G → Crack). Acceso por ajuste `libre`/`restringido`, pase premium general en tabla propia, cobro idempotente
   en la misma transacción que crea la partida (R4–R7).
4. **Arreglos (US4–US6)**: `api()` reintenta los GET cuando el servidor no responde (hoy `cargar()` se queda en
   `cargando` para siempre); «Mis partidas» deja de reconstruir un controlador por partida terminada y pagina por clave,
   con índice nuevo; aviso de login arriba sin mover la portada; tooltip invisible hasta colocarse (el `toggle` es
   asíncrono); media del equipo sin cajas fijas en px (R8–R12).
5. **Mi perfil (US7)**: rejilla de dos columnas, sin cambiar el guardado (R13).

## Technical Context

**Language/Version**: TypeScript 5 sobre Node ≥ 22, ESM.

**Primary Dependencies**: Fastify 5, Drizzle + `pg`, zod, React 19 + Vite, zustand; `sharp` (ya en `@fbd/fixtures`).
Sin dependencias nuevas.

**Storage**: PostgreSQL, migración `0016_spec013.sql` ([data-model §1](data-model.md#1-migración-0016_spec013sql)):
`partidas.nivel_rareza`, `cobro_rareza`, `clave_creacion`; índice `participantes_usuario_idx`; tabla `pases_premium`;
tipo de compra `pase_premium` y tres motivos de movimiento. 300 WebP nuevos en `apps/web/public/cartas/fondos/jugadores/`.

**Testing**: Vitest (dominio, web, integración del servidor), fixture de regresión del generador, informe de
`pnpm balance` (sección nueva «Rareza del draft») y Playwright (`pnpm --filter @fbd/web e2e`).

**Target Platform**: navegador (escritorio y móvil desde 360 px) y servidor Linux en contenedor.

**Project Type**: monorepo web (`apps/server`, `apps/web`, `packages/{domain,engine,protocol}`, `tools/`).

**Performance Goals**: «Mis partidas» < 1 s con 200 terminadas (una consulta indexada, sin cargar controladores);
recuperación < 5 s tras volver el servidor; ilustraciones ≤ 120 KB de media; el ensayo del generador al crear una
partida tarda pocos ms.

**Constraints**:

- misma semilla y reparto actual ⇒ mismos sobres (SC-005);
- ningún jugador repetido en una mesa, ningún draft incompleto (FR-020, FR-021);
- un solo cobro por envío, validado en el servidor (FR-033);
- contraste ≥ 4,5:1 en rasgos y stats (SC-003);
- Principio XI en crear partida, Mis partidas, login y Mi perfil.

**Scale/Scope**: 300 imágenes, 5 niveles, ~30 ficheros tocados.

Sin NEEDS CLARIFICATION: los niveles, Rico, el acceso, el pase y su precio se cerraron en las sesiones del 2026-11-09
y 2026-11-10; las causas de los errores se resolvieron en [research.md](research.md) (R8–R12).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|-----------|----------------|--------|
| I. La estrategia es determinante | El nivel cambia la materia prima del draft, igual para todos; elegir sigue siendo lo que decide. | ✅ |
| II. Draft | 3 sobres de 8, misma circulación, 24 cartas; solo cambia la proporción de niveles, con los cupos de demarcación intactos (FR-014). | ✅ |
| III. Reglas de dominio explícitas | `rareza.ts`, `accesoNivelRareza`, `premiumActivo` y el reparto en parámetros versionados, todo puro y con tests. | ✅ |
| IV. Simulación coherente | El motor no cambia; los parámetros de partido de la nueva versión son los mismos. | ✅ |
| V. Un único motor | Sin cambios. | ✅ |
| VI. Integridad multijugador | Nivel fijado al crear y validado en el servidor (existencia, acceso, pool suficiente); cobro idempotente con clave única y bloqueo de saldo. | ✅ |
| VII. Colecciones y monetización | Mismas reglas de draft para todos los de la partida (el nivel es de la partida, no de la cuenta) y composición transparente (visible en sala). La venta del pase en euros la permite la enmienda 1.5.0 (opciones de partida comunes a todos sus participantes, sin entregar cartas, sobres, colecciones ni fragmentos). | ✅ (constitución 1.5.0) |
| VIII. Modularidad | Reparto en sobres/parámetros, acceso y pase en economía, ajuste en `ajustes`, UI aparte. | ✅ |
| IX. Calidad con pruebas | Tests por historia ([R14](research.md#r14-pruebas)); SC-004 en el informe de `pnpm balance`; recorrido en el [quickstart](quickstart.md). | ✅ |
| X. Incremental y trazable | Historias entregables por separado (orden abajo); cada decisión cita su FR. | ✅ |
| XI. Sin desplazarse | Login con el aviso arriba, Mi perfil en dos columnas (SC-010), Mis partidas con 5 + «Cargar más». | ✅ |
| Flujo git | El agente no hace commit ni push; `jugadores_bg/` (sin seguimiento) solo se borra con confirmación. | ✅ |

**Re-check tras el diseño (Fase 1)**: todo en verde. El punto de VII se resolvió el 2026-11-10 con la enmienda 1.5.0
(opción a). La futura expansión de 20 cartas «regalo con la primera compra del pase» (fuera de alcance) seguiría
chocando con VII si el pase se compra con euros, porque entregaría cartas: queda anotado para su spec.

## Project Structure

### Documentation (this feature)

```text
specs/013-mejora-cartas-rareza-draft/
├── plan.md              # Este fichero
├── research.md          # Fase 0: R1–R14
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── generador.md     # Invariantes G1–G8 del generador por nivel
│   ├── http.md          # Crear partida, niveles, mis partidas, pase premium, CLI
│   └── ui.md            # Crear partida, tienda, perfil, conexión, login, cartas
├── checklists/
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
data/core-real.json                                   # imagen_bg → /cartas/fondos/jugadores/<id>.webp
apps/web/public/cartas/fondos/jugadores/              # NUEVO: 300 WebP
tools/fixtures/src/
├── fondosCore.ts                                     # NUEVO: verificar + convertir + escribir imagen_bg
└── coreReal.ts                                       # regla nueva de imagen_bg
tools/balance/src/                                    # sección «Rareza del draft» (SC-004)
packages/domain/src/
├── sobres/rareza.ts                                  # NUEVO: niveles, reparto, accesoNivelRareza
├── sobres/generador.ts                               # reparto como parámetro, degradación L↔G→C
├── sobres/tienda.ts                                  # reparto actual
├── parametros/v7.json + index.ts                     # sobres.niveles
├── economia/premium.ts                               # NUEVO: premiumActivo, nuevoFin
├── economia/parametros.ts                            # precioNivelRareza, pasePremium
├── partida/partida.ts                                # ConfigPartida.nivelRareza
└── catalogo/identidad.ts                             # plan B del fondo
packages/protocol/src/http/                           # CrearPartida, PartidaResumen, mis-partidas, premium, motivos
apps/server/
├── drizzle/0016_spec013.sql                          # NUEVO
├── src/persistencia/esquema/{base,coleccion}.ts      # columnas, pases_premium
├── src/persistencia/repos/partidas.ts                # terminadas paginadas, buscar por clave_creacion
├── src/ajustes/{servicio,cli}.ts                     # acceso_niveles_rareza
├── src/premium/cli.ts                                # NUEVO: premium de cortesía
├── src/economia/servicio.ts                          # cobro/devolución de rareza, compra del pase
├── src/actores/{gestor,draft,misPartidas}.ts         # validar + ensayo + cobro; reparto; paginación
└── src/http/{partidas,tienda}.ts                     # niveles-rareza, premium, mis-partidas?antes
apps/web/src/
├── api/cliente.ts                                    # reintento de GET + estado conectando
├── estado/{sesion,conexionServidor}.ts               # conectando
├── app/Marco.tsx, componentes/Esqueleto.tsx          # «Conectando con el servidor…»
├── pantallas/{CrearPartida,Sala,PartidaResumen,MisPartidas,Inicio,Perfil,Tienda}.tsx
├── componentes/{CartaJugador,MediaEquipo,AvisoAcceso}.tsx
└── estilos/{cartas,base}.css
```

**Structure Decision**: el monorepo existente; ningún paquete nuevo. Lo nuevo de dominio va en `sobres/` y
`economia/`, junto a lo que ya decide sobres y precios.

### Orden de entrega

1. US4 (arranque y Mis partidas) y US1 + US2 (fondos y legibilidad): independientes y P1.
2. US3 en dos pasos: (a) niveles, generador y selector con acceso `libre`; (b) ajuste `restringido`, cobro, pase
   premium y tienda.
3. US5, US6 y US7.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| ~~Principio VII (1.4.0): el pase premium se vende también en euros (2,99 €) y da acceso a niveles que cambian la composición de los sobres.~~ **Resuelto el 2026-11-10** con la enmienda 1.5.0 del Principio VII. | Lo pidió la persona (aclaraciones del 2026-11-09 y 2026-11-10) como primera vía de monetización no cosmética; el nivel es de la partida y lo comparten todos sus participantes, así que no hay ventaja entre jugadores de una misma partida. | Vender el pase solo con fragmentos (opción b): descartada por la persona, que eligió enmendar la constitución (opción a). |
