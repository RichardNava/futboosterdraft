# Contrato — Motor y parámetros 4.0.0

Cambios sobre [003/contracts/engine-api.md](../../003-mejoras-ux-simulacion/contracts/engine-api.md). La API pública
del motor (`crearPartido`, `avanzar`, `aplicarDecision`) no cambia de firma.

## Tipos

```ts
// @fbd/domain
interface Jugador { /* … */ virtudes: Virtud[]; defectos: Defecto[]; }

// @fbd/engine
interface JugadorEnPartido { /* … */ entroDesdeBanquillo: boolean; }
type TipoEvento = /* … */ | 'malestar';
// datos del evento 'malestar': { defecto: 'Polemico' | 'Rebelde'; activo: boolean; jugadorId: number }
// datos del evento 'penalti' al resolverse: { resultado: 'gol' | 'parada' | 'fuera' }
```

## Módulos

| Módulo | Exporta | Notas |
|---|---|---|
| `modificadores/virtudes.ts` (antes `specials.ts`) | `tiene`, `bonusEquipo`, `bonusPorDemarcacion`, `ajusteDuelo`, `santoActivo`, `bonusInfranqueable`, `vaPerdiendo` | solo renombrado. `tiene(j, r)` acepta `Virtud \| Defecto` |
| `modificadores/defectos.ts` (nuevo) | `multiplicadorEquipo(estado, equipo)`, `multiplicadorIndividual(estado, equipo, j)`, `bonusProvocador(estado, equipo, j)`, `factorFalta(estado, j)`, `factorAmarilla(estado, j)`, `factorRoja(estado, j)`, `factorLesion(estado, j)`, `gravedadForzada(j)`, `factorAutogol(estado, j)`, `factorPase(estado, j)`, `factorDefensivo(estado, j)`, `actualizarMalestar(ctx)` | funciones puras; con parámetros 1.x a 3.x devuelven valores neutros |

## Parámetros 4.0.0 (`packages/domain/src/parametros/v4.json`)

Solo las diferencias con 3.0.0:

```jsonc
{
  "version": "4.0.0",
  "disciplina": {
    "probabilidadFaltaPorEntrada": 0.22,
    "probabilidadAmarillaPorFalta": 0.33,
    "probabilidadRojaDirectaPorFalta": 0.011,
    "probabilidadFaltaDueloAereoArea": 0.03,
    "factorFaltaArea": 0.55,          // nuevo; neutro = 1
    "factorFaltaUltimoTercio": 1.6
  },
  "lesiones": {
    "probabilidadPorEntrada": 0.0095,
    "reparto": { "leve": 0.60, "media": 0.27, "grave": 0.11, "larga": 0.02 }
  },
  "virtudes": {                        // antes "specials" (también en v1–v3)
    "revulsivo": 0.05,                 // nuevo
    "versatil": 0.05                   // nuevo
  },
  "defectos": {                        // nuevo; neutros: factores 1, sumandos 0
    "canchero": 1.5, "impulsivo": 2, "agresivo": 2, "fragil": 3, "indisciplinado": 1.5,
    "torpe": 2, "chupon": 0.5, "malDefensor": 0.5, "inflexible": 0.05,
    "polemico": 0.05, "rebelde": 0.05, "estrellita": 0.10, "provocador": 1
  },
  "duelos": { "pesoVirtud": 1, "pesoDefecto": 1, "estadoForma": 2 }
}
```

Los valores de `disciplina` y `lesiones` son iniciales; los finales (con `factorSegundaAmarilla` y
`factorFaltaUltimoTercio`) están en research R2. `gravedadForzada` recibe también el estado (`gravedadForzada(estado, j)`)
para ser neutra con parámetros 3.x.

## Garantías

- Con parámetros 3.0.0 y cartas sin defectos ni virtudes nuevas, `avanzar` produce exactamente los mismos eventos que en el
  commit `5007f5a` (prueba de equivalencia; SC-003).
- Todo rasgo de `RASGOS` aparece en `RASGOS_PROBADOS` con su prueba de unidad y su comprobación de `balance` (FR-055).
