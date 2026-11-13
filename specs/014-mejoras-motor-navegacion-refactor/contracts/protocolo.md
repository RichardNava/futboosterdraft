# Contrato del protocolo (spec 014)

Un único cambio, compatible hacia atrás.

## `partido.pausa_decision` (servidor → cliente)

`packages/protocol/src/ws/partido.ts`, `MsgPartidoPausa`:

```ts
energia: z
  .array(
    z.object({
      jugadorId: z.number().int(),
      energia: z.number().int().min(0).max(100),
      penalizacion: z.number().int().min(0).max(100),
    }),
  )
  .optional(),
```

| Regla | Detalle |
|-------|---------|
| Quién lo envía | `datosPausa()` en `apps/server/src/actores/partidoRapido.ts`, en todas las pausas de gestión (`descanso`, `pre_prorroga`, `gol`, `incidencia`), tanto en la 2D como en la rápida. |
| Contenido | Todos los jugadores con `enCampo` de los dos equipos en el tick de la pausa, calculados con `energiaDe` del motor. |
| Ausentes | Suplentes que no han jugado, expulsados, lesionados retirados y sustituidos: no aparecen ⇒ sin indicador. |
| Compatibilidad | Opcional: un cliente sin el campo no pinta indicador; un cliente nuevo frente a un servidor viejo, tampoco. |
| Integridad | El cliente solo lo muestra; no lo reenvía ni decide nada con él (Principio VI). |

Ningún otro mensaje ni endpoint HTTP cambia. Las rutas HTTP que leen los loaders de la web (R8–R10) son las actuales.
