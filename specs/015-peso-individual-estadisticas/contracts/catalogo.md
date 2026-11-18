# Contrato: catálogo y rasgos

## C1. Cabeceador, virtud de jugador de campo

- `VIRTUDES_CAMPO = ['Cabeceador'] as const` en `catalogo/tipos.ts`. Cabeceador deja de estar en `VIRTUDES_DEL`.
- `virtudesPermitidas({ demarcacion: 'DEF' | 'MED' | 'DEL' })` incluye Cabeceador; con `'POR'`, no.
- `RASGOS.Cabeceador.ambito === 'campo'`. El documento generado lo muestra como «Jugador de campo».
- Cualquier código que liste virtudes por demarcación (validación, IA del draft en `@fbd/ai`, fichas de la web) lee
  `virtudesPermitidas` o `VIRTUDES_POR_DEMARCACION`. Ninguno debe dar por hecho que Cabeceador es de delantero.

## C2. Seis cartas de Core (`data/core-real.json`)

| id | Carta | Cede | Recibe |
|---|---|---|---|
| 60 | Marc Guéhi | Muro defensivo (conserva Capitanía) | Cabeceador |
| 76 | Gabriel | Volador | Cabeceador |
| 77 | Joško | Potente | Cabeceador |
| 86 | Sergio | Intimidante | Cabeceador |
| 87 | Virgil van Dijk | Aura | Cabeceador |
| 275 | Ronald Federico | Potente | Cabeceador |

`pnpm --filter @fbd/fixtures core-real` valida el fichero y regenera `specs/008-datos-reales-core/sumario.md`. Las
cartas se cargan en la base de datos con `pnpm seed`.

## C3. Versión del catálogo

- `VERSION_CATALOGO_ACTUAL = 3`.
- `cartaEnVersion(carta, 2)` devuelve las seis cartas con la virtud cedida en lugar de Cabeceador. Las demás no
  cambian.
- `cartaEnVersion(carta, 1)` hace lo mismo y además lo que ya hacía con la versión 1.
- Una partida creada antes del despliegue (versión 2) sigue viendo las seis cartas como eran durante todo su torneo.
