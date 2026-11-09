# Contrato: generador de sobres por nivel de rareza

Funciones puras de `packages/domain/src/sobres/generador.ts` ([research R4, R5](../research.md#r4-reparto-por-nivel-y-regresión-exacta-fr-012-a-fr-015-sc-004-sc-005)).

```ts
generarSobre(rng: Rng, p: ParametrosEquilibrado, reparto: RepartoSobre): PlanSobre
generarMesa(pool, numParticipantes, semilla, p, reparto: RepartoSobre): SobreGenerado[]
```

## Invariantes

| Id | Invariante | Requisito |
|---|---|---|
| G1 | Cada sobre tiene 8 cartas con los cupos 1 «POR o DEF», 2 DEF, 3 MED, 2 DEL (o DEF en el primer hueco si no quedan porteros). | FR-014 |
| G2 | Ninguna carta aparece dos veces en una mesa. | FR-020, FR-021 |
| G3 | Misma semilla, pool, número de participantes, parámetros y reparto ⇒ mismos sobres. | FR-015 |
| G4 | Con el reparto `{4, 2, 1, 1, 0.2}` la salida es idéntica a la de `e9aca5d` (fixture de 50 semillas × {4, 8}). | FR-013, SC-005 |
| G5 | Un hueco Legendario o alto sin existencias pasa al otro nivel alto y, si no quedan, a Crack; nunca a Superclase. | FR-020 |
| G6 | Rico, 8 participantes, pool de solo Core ⇒ las 90 L + G de Core aparecen exactamente una vez y hay exactamente 6 sustituciones por Crack. Con ≥ 96 L + G en el pool, 0 sustituciones. | FR-020, US3-5 |
| G7 | Si ni degradando todos los huecos altos se completa un sobre ⇒ `ErrorPoolInsuficiente`. | FR-020 |
| G8 | En 1.000 mesas por nivel, media S/C/L/G por participante a < 5 % de la tabla (informe de `pnpm balance`). | SC-004 |

## Uso desde el servidor

- `iniciarDraft` pasa `parametros.sobres.niveles[partida.nivelRareza]`.
- `crearPartida` ensaya `generarMesa` con la semilla `derivarSemilla(semilla, 'mesa:<i>')`, el pool fijado y el
  nivel, antes de guardar y cobrar; `ErrorPoolInsuficiente` ⇒ `422 POOL_INSUFICIENTE`.
- `generarSobreTienda` pasa el reparto de hoy, construido a partir de `p.sobres.probGoatEnAlta`.
