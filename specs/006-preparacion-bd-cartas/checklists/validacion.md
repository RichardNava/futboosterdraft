# Validación de la spec 006

**Fecha**: 2026-11-20 · **Rama**: `main` (tras la spec 016) · Guía: [quickstart.md](../quickstart.md)

La spec se implementó en octubre y desde entonces la han ampliado la 011 (tienda solo con fragmentos para las cartas,
cosméticos) y la 016 (expansiones reales, desfragmentar a 25 / 75 / 125 / 175). Esta validación se hace sobre el
código actual: las pruebas que se citan son las que hoy cubren cada criterio.

## Pruebas automáticas

| Comando | Resultado |
|---|---|
| `pnpm typecheck` | ✅ sin errores |
| `pnpm lint` | ✅ sin errores |
| `pnpm test` | ✅ 144 ficheros, 1.430 pruebas |
| `test:integration` de `coleccion`, `tienda`, `recompensa`, `pool-anfitrion` y `cosmeticos` (más `auth` y `recuperar-contrasena`) | ✅ 7 ficheros, 56 pruebas |
| `pnpm e2e` completo (incluye `coleccion.spec.ts` y `tienda.spec.ts`) | ✅ 125 pruebas (ver [007/validacion.md](../../007-retoques-visuales/checklists/validacion.md)) |

## Criterios de éxito

| Criterio | Cómo se comprueba | Resultado |
|---|---|---|
| SC-001: 300 cartas Core y buscador en < 15 s | `coleccion.test.ts` («un usuario nuevo tiene las 300 cartas de Core activas…»); e2e `coleccion.spec.ts` («300 cartas, búsqueda sin tildes…»). Los 15 s con una persona, en el escenario A | ✅ automático · ⏳ tiempo con persona |
| SC-002: la cuadrícula responde en < 1 s con 500 cartas | Escenario manual (no hay medición automática) | ⏳ manual |
| SC-003: ninguna carta inactiva en los sobres del anfitrión y cupos del draft | `pool-anfitrion.test.ts` (la foto de las activas; ninguna inactiva en la mesa); cupos en `packages/domain/tests/draft/mesa.test.ts`. No se repite con 100 torneos: la foto se fija al crear la partida y la mesa se reparte solo de ella | ✅ |
| SC-004: la colección activa nunca baja del mínimo | `coleccion.test.ts`: desactivar con solo Core da 422 `MINIMO_ACTIVO`; dos desactivaciones simultáneas de la última sobrante aplican una; desfragmentar una activa que rompería el mínimo da 422 | ✅ |
| SC-005: sobres de la tienda sin repetidas ni poseídas y con el reparto del draft | `packages/domain/tests/sobres/tienda.test.ts` (8 distintas, de disponibles y con los cupos; misma semilla, mismas cartas); `tienda.test.ts` («con 1.000 fragmentos: cobra 1.000 y entrega 8 cartas nuevas y activas») | ✅ |
| SC-006: comprar una colección entrega lo que falta más los fragmentos; historial = saldo | `tienda.test.ts`: compensación según las poseídas, «comprar después B da fragmentos por las 6 compartidas» y «tras compras, desfragmentaciones y recompensas al azar, la suma del historial es el saldo» | ✅ |
| **SC-007: cada compra se cobra y entrega una vez y el saldo nunca es negativo** | Ver la sección siguiente | ✅ |
| SC-008: 10 fragmentos al campeón; Core no se desfragmenta | `recompensa.test.ts` (10 al registrado una vez, nada al invitado ni en una partida cancelada; la vista del campeón); `coleccion.test.ts` («una carta de Core da 422 `CARTA_CORE`») | ✅ |
| SC-009: bandera e imagen de fondo reconocibles y sin imágenes rotas | Escenario manual con una persona; las imágenes de Core las valida `pnpm --filter @fbd/fixtures core-real` | ⏳ manual |
| SC-010: compra simulada de un sobre en < 1 min | e2e `tienda.spec.ts` («sobre con fragmentos desde "Colección": apertura, 8 cartas nuevas y saldo −1.000»). El minuto y «sin dudar de que es de prueba», con una persona | ✅ automático · ⏳ con persona |

## SC-007: idempotencia de las compras

Toda compra lleva un `idCompra` (UUID) que genera el navegador una vez por intento de compra y reutiliza si repite el
envío (spec 013, FR-033): una doble pulsación o un reintento tras un corte llegan al servidor con el mismo `idCompra`.

| Situación | Prueba | Resultado |
|---|---|---|
| 50 repeticiones del mismo `idCompra` (25 a la vez y 25 seguidas) | `tienda.test.ts` («50 repeticiones del mismo idCompra… cobran y entregan una vez»): las 50 responden 200 con las mismas 8 cartas, se entregan 8 y el saldo pasa de 5.000 a 4.000 con el historial cuadrado | ✅ |
| Dos compras distintas a la vez con saldo para una sola | `tienda.test.ts`: una 200 y otra 422, saldo 0 (nunca negativo) | ✅ |
| `idCompra` reutilizado con otro producto, o que no es un UUID | `tienda.test.ts`: 409 `ID_COMPRA_REUTILIZADO` y 400 `CUERPO_INVALIDO` | ✅ |
| Repetir la compra de una expansión | `tienda.test.ts`: el mismo `idCompra` devuelve el mismo resumen y cobra una vez; otro da 409 `COLECCION_ADQUIRIDA` | ✅ |
| Cosméticos con el mismo `idCompra` repetido y en paralelo | `cosmeticos.test.ts`: misma respuesta y un solo cargo | ✅ |
| Corte de conexión real en mitad de la compra | No hay prueba con la red cortada; el reintento usa el mismo `idCompra`, que es el caso de las 50 repeticiones | ⏳ escenario manual |

## Escenarios manuales A–O (T103)

Sin recorrer. Hay que hacerlos a mano en `pnpm dev` siguiendo [quickstart.md](../quickstart.md), incluido el ancho de
360 px en «Colección» y «Tienda». Al terminar, anotar aquí el resultado de cada uno y marcar T103.

| Escenario | Resultado | Notas |
|---|---|---|
| A–O | ⏳ | |

## Pendiente fuera de esta validación

- T087: escudos oficiales con licencia sin revisar (`ESCUDOS_ACTIVOS = false`). Bloquea producción (INI-08, INI-10).
