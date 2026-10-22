# Validación de la spec 002 (T159)

**Fecha**: 2026-10-17 · **Rama**: `002-mejoras-mvp` · **Parámetros de equilibrado**: 2.0.0

Registro de la validación de [quickstart.md](../quickstart.md). Las casillas marcadas se han comprobado; las
que quedan sin marcar necesitan personas o un equipo concreto, o no se cumplen todavía (ver notas).

## Pruebas automáticas

| Comando | Resultado |
|---|---|
| `pnpm lint` | Sin errores |
| `pnpm typecheck` | Sin errores en todos los paquetes |
| `pnpm test` | 47 ficheros, 324 pruebas: todas pasan |
| `pnpm test:integration` | 17 ficheros, 94 pruebas: 93 pasan en la ejecución completa; «avisa 2 h antes del plazo…» (torneo asíncrono) falló una vez por tiempo y pasa al repetirla aislada (2/2) |
| `pnpm test:equivalence` | 11 pruebas (motor e IA, incluida «Finalizar partido» desde cortes a mitad de juego): todas pasan |
| `pnpm e2e` | 24 recorridos: todos pasan (tras dar más pasos de reloj al ayudante del draft) |
| `pnpm balance --n 1000` | 13/13 comprobaciones (spec 001: SC-004, SC-006a–e, SC-007, SC-015; spec 002: SC-007a, SC-007b, SC-008, SC-011, SC-011b) |
| 002/SC-018 | Pasa con 400 partidos por serie (colocación GF 2,06 / GC 2,45 frente a GF 1,58 / GC 1,49); se añadió a `balance` después de la ejecución de 1.000 |
| `pnpm --filter @fbd/balance umbral-motor` | **No cumple** FR-028a: 82,9 ms por partido sin fotogramas (máximo 25) y 76,6 ms `resolverResto` desde el minuto 0 (máximo 30). En CI informa sin bloquear (T086 abierta) |
| `k6 run tools/load/beta-100.js` | **No validado**: con 10 partidas, `apertura_ms` p95 = 60 s y 2 partidas bloqueadas. El perfil del servidor durante la prueba muestra ~91 % de tiempo libre: el cuello de botella parece estar en el guion (un VU de k6 hace de 8 humanos y bloquea su bucle de WebSocket con peticiones HTTP síncronas). Hay que rehacerlo con un VU por humano antes de volver a medir 001/SC-017 (T153 abierta) |

## Escenarios del quickstart

- [x] A. Cartas — `cartas.spec.ts` (sin desbordamiento a 1280 y 360 px, 4 virtudes, popovers, acabados)
- [x] B. Apertura de sobre — `apertura.spec.ts` (3 veces, «Saltar», +6 s, silencio recordado, movimiento reducido, sin repetir al recargar) y `draft.test.ts`
- [x] C. Avanzar sin esperas en solitario — `avanzar-solo.spec.ts`, `avanzar.test.ts`
- [x] D. Draft con varios humanos — `draft-varios.spec.ts` (pasos 1 y 2), `navegacion.spec.ts` (paso 3: modal, cancelar, abandonar)
- [x] E. Navegación libre en solitario — `navegacion.spec.ts`, `navegacion.test.ts`
- [x] F. Simulación 2D — `partido-2d.spec.ts`, `partido-2d.test.ts`, `cinematica.test.ts`, `acciones.test.ts`, `relojReproduccion.test.ts`, `interpolacion.test.ts`
- [x] G. Finalizar partido — `finalizar.spec.ts`, `finalizar.test.ts`, `equivalenciaFinalizar.test.ts` (prórroga y tanda en el motor)
- [x] H. Penalizaciones por posición — `alineacion.spec.ts`, `balance` (SC-011)
- [x] I. Colocación libre — `tacticas.spec.ts`, `colocacion.test.ts` (dominio y motor), SC-018
- [x] J. Dorsales — `dorsales.spec.ts`, `dorsales.test.ts`
- [x] K. Torneo asíncrono con dos humanos — `torneo-asincrono.spec.ts` (pasos 1 a 5), `goleadores.test.ts`, `visibilidad.test.ts`

## Pendiente (necesita personas o un equipo concreto)

- [ ] SC-007a: revisión visual de 3 partidos completos a x2 (la prueba automática de cinemática sí pasa en 50 partidos).
- [ ] SC-001: prueba de las cartas con al menos 5 personas.
- [ ] SC-009: al menos 5 personas comparan 2 min de la versión anterior (etiqueta git en `95d9962`) y 2 min de la nueva.
- [ ] FR-025b: 60 fps en un portátil medio con el navegador visible (nunca por debajo de 30).

## Desviaciones registradas

- **FR-028a / T086**: el motor no alcanza el presupuesto de 25 ms por partido (≈ 80 ms tras las optimizaciones).
- **T147**: los efectos de sonido son WAV sintetizados por el proyecto (CC0, ≈ 25 kB en total) en lugar de OGG y MP3: no había codificador disponible.
- **T135**: la edición de dorsales está en el panel «Dorsales» de la pantalla de alineación, donde ya vivía, no en `Plantillas.tsx`.
