# Contrato de calidad de la refactorización (spec 014, US7)

La refactorización termina cuando todas estas comprobaciones pasan a la vez, sobre el código con el motor 7.0.0 ya
cerrado (FR-032).

| Id | Comprobación | Comando | Criterio |
|----|--------------|---------|----------|
| Q1 | Pruebas sin rebajar | `pnpm test`, `pnpm test:integration`, `pnpm e2e` | Todas pasan; el diff de US7 no borra ni debilita ninguna aserción, `skip` ni umbral (FR-030). |
| Q2 | Equivalencia | `pnpm test:equivalence` | `huella-014.json` (100 partidos + 20 drafts) idéntica; el fichero no cambia en US7 (SC-011). |
| Q3 | Código sin uso | `pnpm dlx knip` | 0 exportaciones, ficheros y dependencias sin uso, salvo las excepciones comentadas en `knip.json` (SC-012). |
| Q4 | Duplicados | `pnpm dlx jscpd` | Sin bloques duplicados con la misma responsabilidad; los que quedan (p. ej. JSON de parámetros, fixtures) están excluidos en `.jscpd.json` con motivo. |
| Q5 | Comentarios | `pnpm tsx scripts/comentarios.ts` | 0 declaraciones exportadas sin comentario fuera de pruebas (FR-031, SC-012). |
| Q6 | Tipos y estilo | `pnpm typecheck`, `pnpm lint` | Sin errores. |
| Q7 | Resumen | `specs/014-mejoras-motor-navegacion-refactor/refactorizacion.md` | Lista cada duplicidad unificada (antes → después) y cada elemento eliminado. |

## Regla de los comentarios

- Obligatorio: toda función, clase, método público, componente o `const` de función **exportado**, y las funciones
  internas cuya lógica no es evidente (revisión manual).
- No se exige: ficheros de prueba, funciones internas triviales de una línea.
- Forma: JSDoc `/** … */` en español, una o pocas líneas; qué hace y, si no es evidente, por qué. Cita el requisito o la
  decisión (`FR-…`, `research R…`) cuando la regla viene de una spec, como el código actual.
- Los textos de interfaz no cambian.

## Límites

- Ningún cambio de comportamiento: una diferencia en Q2 se corrige en el código refactorizado, nunca regenerando la
  huella.
- Sin dependencias nuevas en `package.json` (knip y jscpd van con `pnpm dlx`).
- Al terminar, `graphify update .` para refrescar el grafo.
