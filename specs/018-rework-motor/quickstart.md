# Quickstart: validar la spec 018

Guía para comprobar cada historia. Los comandos se ejecutan en la raíz del repositorio.

## Requisitos

- Node 22 para las medidas oficiales y pnpm.
- PostgreSQL (`docker compose up -d`), con `pnpm db:migrate` y `pnpm seed`.
- La spec 017 integrada antes de validar US5.
- Para la medida en CI, la rama publicada con un PR en borrador. Publicarla es tarea de la persona.

## 1. Línea base (antes de cambiar el motor)

```bash
pnpm --filter @fbd/balance linea-base -- --n 1000 --salida specs/018-rework-motor/linea-base-8.0.0.md
```

**Esperado**: el informe recoge goles, victorias, fatiga y coste de cada táctica con la 8.0.0 (SC-001).

## 2. Fatiga y tácticas (US1 y US2)

```bash
pnpm vitest run --project domain parametros
pnpm vitest run --project engine cansancio tacticas marcajeEstrella
pnpm test:equivalence
```

**Esperado**:

- Referencia: 85 al 45', 95 tras el descanso, 60 al 90' y 40 al 120'.
- Por rol al 90': 93, 67,5, 50 y 62,5.
- Con 60 de energía: −15,5 % en físicas, −7,75 % en técnicas y −3,875 % en mentales.
- La simulación rápida y la 2D siguen idénticas (FR-004).

**En la aplicación**: juega un partido, abre «Gestionar equipo» en una pausa y comprueba que el indicador muestra la
penalización física y que la ayuda explica la técnica y la mental.

## 3. Decisión de cadencia (FR-003)

Publica la rama y consulta el job `rendimiento-motor`.

| Resultado sin fotogramas | Qué hacer |
|---|---|
| ≤ 60 ms con objetivos cada 4 ticks | Se mantiene |
| > 60 ms | Pasar a 8 ticks y volver a medir |
| > 60 ms también con 8 ticks | Parar: decide la persona responsable |

## 4. Calibración (US4)

```bash
pnpm --filter @fbd/balance calibrar-fatiga -- --n 1000
pnpm balance --n 1000
```

**Esperado**: la persona responsable lee `informe-9.0.0.md`, aprueba cada umbral y `pnpm balance` pasa (SC-003 a SC-007).

## 5. Huellas y optimización (US3)

```bash
pnpm test:equivalence
pnpm --filter @fbd/balance umbral-motor
```

**Esperado**: tras regenerar la huella una sola vez, cada optimización la deja idéntica (SC-009). En CI con Node 22: ≤ 60 ms,
≤ 80 ms con fotogramas y ≤ 60 ms en `resolverResto` y con métricas (SC-008).

**Vista 2D**: reproduce un partido completo a velocidad normal. Ningún jugador debe pararse a tirones ni saltar, y el balón
debe llegar a quien lo recibe (SC-010).

## 6. Cierre de partidas (US5)

```bash
pnpm --filter @fbd/server test:integration cierre-motor9
```

La prueba prepara partidas en cada estado, con y sin cobro, y ejecuta el cierre **dos veces**.

**Esperado** (SC-011):

- Ninguna partida en draft o torneo y ningún partido en juego.
- Un aviso por participante humano y cada cobro devuelto una sola vez.
- `buscando` intacta; una partida creada después del cierre sigue activa al repetirlo.
- Los partidos terminados conservan su resumen, sin premios.

**En la aplicación**: abre un partido 8.x terminado. Debe verse su resumen y el mensaje de que solo está disponible el resumen.

## 7. Carga y documentación

```bash
k6 run tools/load/beta-100.js
```

En el equipo B de 8 núcleos, ni la CPU (referencia 94 %) ni la apertura p95 (unos 15 s) deben empeorar (SC-012).
`docs/juego/enfrentamientos.md` debe describir la 9.0.0 con los efectos medidos (SC-013).

## Comprobación final

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration && pnpm test:equivalence
pnpm --filter @fbd/balance umbral-motor
pnpm balance --n 1000
```
