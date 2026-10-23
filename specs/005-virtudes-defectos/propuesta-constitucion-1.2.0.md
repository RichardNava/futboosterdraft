# Propuesta de modificación de la constitución: 1.1.0 → 1.2.0

**Spec**: [spec.md](./spec.md) · **Research**: [R14](./research.md) · **Estado**: pendiente de revisión

Esta propuesta no modifica `.specify/memory/constitution.md`. La persona que mantiene el proyecto la revisa y, si la
aprueba, la aplica con `/speckit-constitution`.

## Tipo de cambio

**MINOR**: se renombra un término en la visión y en varios principios, se aclara el alcance del Principio V y se añade
una decisión resuelta. Ningún principio se elimina ni cambia de sentido.

## Cambios propuestos

### 1. Vocabulario: «habilidades especiales» → «virtudes y defectos»

| Sección | Texto actual | Texto propuesto |
|---|---|---|
| Visión y propósito | «…las características individuales de los jugadores, sus habilidades especiales, la alineación…» | «…las características individuales de los jugadores, sus virtudes y defectos, la alineación…» |
| Principio I | «…sus posiciones, las habilidades especiales, la formación…» | «…sus posiciones, sus virtudes y defectos, la formación…» |
| Principio III | «Estadísticas, habilidades especiales y niveles o categorías de los jugadores.» | «Estadísticas, virtudes, defectos y niveles o categorías de los jugadores.» |
| Principio IX | «…estadísticas y habilidades especiales; resolución de acciones del partido…» | «…estadísticas, virtudes y defectos; resolución de acciones del partido…» |
| Decisiones resueltas (Jugadores y motor) | «atributos, estadísticas, habilidades especiales y niveles» | «atributos, estadísticas, virtudes, defectos y niveles (referencia única: `docs/juego/virtudes-y-defectos.md`)» |

El Principio IV no nombra las habilidades especiales de forma literal; se añade al final de su lista de comprobaciones:
«Cada virtud y cada defecto tiene una prueba de unidad y una comprobación estadística de su efecto.»

### 2. Principio V: alcance del motor único

Se añade este punto al final del Principio V:

> - El motor único resuelve los **partidos**. Un modo de juego que resuelve los cruces sin jugar un partido (el modo
>   Duelo de jugadores) usa una función de dominio propia, pura y determinista, y NO constituye un segundo motor de
>   partidos.

### 3. Decisiones resueltas

Se añade:

> Resuelto en `specs/005-virtudes-defectos/`:
>
> - **Virtudes y defectos**: la tabla única de rasgos del dominio y el documento generado
>   `docs/juego/virtudes-y-defectos.md` (FR-050 a FR-055).
> - **Modo Duelo de jugadores**: un modo de torneo con el cuadro del playoff en el que cada cruce se decide por duelos
>   individuales en una formación común fijada por el anfitrión (FR-060 a FR-069).

Y en «Decisiones aún pendientes», «Modos de juego adicionales a liga, playoff y mixto» pasa a «Modos de juego
adicionales a liga, playoff, mixto y Duelo de jugadores».

### 4. Informe de impacto de la cabecera

```text
Sync Impact Report
- Version change: 1.1.0 → 1.2.0 (MINOR: «habilidades especiales» pasa a «virtudes y defectos»; el Principio V aclara
  que el motor único resuelve los partidos y que el modo Duelo de jugadores usa una función de dominio; se añaden
  decisiones resueltas de la spec 005)
- Principios modificados: I, III, IV, V y IX (vocabulario y alcance; sin cambio de sentido)
- Secciones añadidas: ninguna
- Secciones eliminadas: ninguna
- Decisiones resueltas: + virtudes y defectos, + modo Duelo de jugadores (specs/005-virtudes-defectos/)
- Plantillas dependientes: no se modifican (leen la constitución en tiempo de ejecución)
- TODOs pendientes: ninguno nuevo
```

## Razón

La spec 005 sustituye el término «special» por «virtud» en todo el producto (FR-001, FR-002) e introduce los defectos.
La constitución es el único documento vigente que conserva el término antiguo («habilidades especiales»). El modo Duelo
de jugadores resuelve los cruces sin partido; sin la aclaración del Principio V podría leerse como un segundo sistema de
cálculo, que el principio prohíbe para los partidos.
