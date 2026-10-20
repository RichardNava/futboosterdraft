# Propuesta de enmienda PATCH 1.0.5 de la constitución (T126)

**Estado**: propuesta, pendiente de aprobación. Se aplica con `/speckit-constitution`; esta tarea solo la redacta.

**Tipo**: PATCH (1.0.4 → 1.0.5). Solo añade referencias a "Decisiones resueltas"; ningún principio se añade,
elimina ni redefine. Cierra el TODO del Sync Impact Report de la 1.0.4.

## Cambios propuestos

En "Decisiones resueltas", después de la lista de la spec 001, añadir:

> Actualizadas en `specs/003-mejoras-ux-simulacion/`:
>
> - **Niveles de los NPC**: la dificultad sale solo de la calidad de las decisiones; los niveles bajos
>   cometen errores creíbles y el PRO toma alguna decisión dudosa, sin ventajas en el motor → `spec.md`
>   (FR-036 a FR-038). Las probabilidades y costes de los errores están en los parámetros de equilibrado
>   versionados (`npc.errores`).
> - **Equipaciones**: diseño (lisa, rayas, franjas, banda o mitades) y de 1 a 3 colores, con una regla de
>   parecido que mira todos los colores → `spec.md` (FR-045 a FR-047). Sustituye a la parte de equipaciones
>   de 001/FR-031b.
> - **Tipo de simulación**: se elige en cada partido, no al crear la partida, y se recuerda por participante
>   y en la cuenta → `spec.md` (FR-032). Sustituye a esa parte de 001/FR-001.

En la línea de **Posiciones, formaciones y tácticas**, añadir al final: «Las equipaciones las actualiza
`specs/003-mejoras-ux-simulacion/spec.md` (FR-045 a FR-047).»

## Sync Impact Report propuesto

- Version change: 1.0.4 → 1.0.5 (PATCH: referencias a la spec 003 en "Decisiones resueltas")
- Principios modificados: ninguno
- Secciones modificadas: Decisiones resueltas
- Plantillas dependientes: no se modifican
- TODOs pendientes: ninguno
