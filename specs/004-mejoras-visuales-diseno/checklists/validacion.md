# Validación de la spec 004 con personas (SC-003, SC-004, SC-010)

Registro de las pruebas con personas de [quickstart.md](../quickstart.md) §5 (research R14). Se comparan la versión
anterior (`4168404`, la última de la spec 003) y la nueva.

## Preparación

```bash
git worktree add ../fbd-4168404 4168404
cd ../fbd-4168404 && pnpm install
# Arrancar cada versión en su propio puerto (por ejemplo, la anterior en 5174) con su propio servidor y la misma base de datos.
```

- Personas: al menos 5 para SC-004 y SC-010, y 10 para SC-003, que no conozcan el juego (SC-003) o que lo hayan jugado poco.
- Mismo equipo para todas: portátil de 1366 × 768 y un móvil de 360 px de ancho.
- Orden alterno: la mitad empieza por la versión anterior y la otra mitad por la nueva.

## Pruebas automáticas previas

| Prueba | Resultado |
|---|---|
| `pnpm lint` (con `lint:tokens`) | ✔ (2026-10-20) |
| `pnpm typecheck` | ✔ |
| `pnpm test` (con `tokens.test.ts`, `colores.test.ts` y `nombreRecortado.test.ts`) | ✔ 480 de 480 |
| `pnpm --filter @fbd/web e2e tests/e2e/diseno` | ✔ 22 de 22 |
| `pnpm e2e` (no regresión, SC-008) | 69 de 70. Falla `torneo.spec.ts` también con la interfaz de `4168404`: la partida del invitado pasa a `abandonada` por la regla de 10 minutos sin conexión (001/FR-000) al adelantar el reloj simulado; no es una regresión de esta spec |
| `pnpm test:integration` | ✔ 126 de 126 |
| Tipografías (T072, SC-009) | 64 KB añadidos (≤ 120 KB). Con `/fuentes/*` bloqueado, la portada no se mueve en vertical (Δy = 0, Δh = 0 en titular, entradilla, botón principal, nota y barra) y el ancho del texto varía ≤ 4 % |

## SC-003 — Prueba de cinco segundos

Capturas a pantalla completa de la versión nueva, sin la anterior: Inicio sin sesión, Nueva partida, Sala, Draft,
Formación, Torneo (preparación), Partido rápido (descanso), Resultado. A cada persona se le enseña cada captura 5
segundos y se le pregunta: «¿Qué pulsarías para seguir?».

**Objetivo**: al menos 9 de cada 10 personas señalan el botón principal en menos de 5 s en cada pantalla.

| Pantalla | Aciertos | Personas | Tiempo medio (s) | ¿Cumple? |
|---|---|---|---|---|
| Inicio sin sesión | | | | |
| Nueva partida | | | | |
| Sala | | | | |
| Draft | | | | |
| Formación | | | | |
| Torneo (preparación) | | | | |
| Partido rápido (descanso) | | | | |
| Resultado | | | | |

## SC-004 — Valoración «se ve profesional y moderna»

Cada persona juega un draft y un partido en cada versión y valora de 1 a 5: «La aplicación se ve profesional y
moderna».

**Objetivo**: media de la nueva ≥ 4 y al menos 1 punto por encima de la de `4168404`, con ≥ 5 personas.

| Persona | `4168404` (1–5) | Nueva (1–5) | Comentario |
|---|---|---|---|
| P1 | | | |
| P2 | | | |
| P3 | | | |
| P4 | | | |
| P5 | | | |
| **Media** | | | |

## SC-010 — Tiempos de decisión

Se cronometra, en cada versión, cuánto tarda cada persona en completar una elección del draft (desde que ve el sobre
hasta que confirma) y en confirmar una alineación (desde que entra en «Formación» hasta «Confirmar alineación»).

**Objetivo**: el tiempo de la versión nueva es igual o menor que el de `4168404`.

| Persona | Elección del draft, `4168404` (s) | Elección del draft, nueva (s) | Alineación, `4168404` (s) | Alineación, nueva (s) |
|---|---|---|---|---|
| P1 | | | | |
| P2 | | | | |
| P3 | | | | |
| P4 | | | | |
| P5 | | | | |
| **Mediana** | | | | |

## Hallazgos

| # | Tipo | Hallazgo | Área |
|---|---|---|---|
| | | | |

## Resultado

| SC | Estado |
|---|---|
| SC-003 | Pendiente |
| SC-004 | Pendiente |
| SC-010 | Pendiente |
