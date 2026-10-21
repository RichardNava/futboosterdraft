# Quickstart — Validación de la spec 005

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

Guía para comprobar de principio a fin que la spec funciona. Los criterios estadísticos se leen en el informe de
`tools/balance/salida/informe.html`, sin leer código (constitución IX).

## Preparación

```bash
pnpm install
pnpm db:migrate                    # incluye 0010_virtudes_defectos
pnpm --filter @fbd/fixtures asignar-rasgos   # pasada de rasgos sobre data/core.json (research R5); idempotente
pnpm seed --file data/core.json    # recarga las cartas con virtudes y defectos
pnpm --filter @fbd/domain rasgos:doc         # regenera docs/juego/virtudes-y-defectos.md
pnpm dev                           # http://localhost:5173
```

## Pruebas automáticas

| Comando | Qué cubre |
|---|---|
| `pnpm test` | **Dominio**: validación de rasgos (máximo 2 defectos, incompatibilidades simétricas, reparto por nivel), `cartaEnVersion` frente a la fixture de la 004 (R4), `resolverCruce` (invariantes de [data-model.md §6.3](./data-model.md), determinismo y desempates), Versátil e Inflexible en `penalizacionPorPosicion`. **Motor**: una prueba por defecto y por virtud nueva; registro `RASGOS_PROBADOS` completo (FR-055). **Documento**: `rasgos-doc.test.ts` (documento sincronizado con la tabla). **Renombrado**: búsqueda de `special` (SC-001). |
| `pnpm test:equivalence` | Parámetros 3.0.0: mismos eventos que en el commit `5007f5a` (SC-003); rápida = 2D con defectos en juego (FR-041). |
| `pnpm test:integration` | Migración 0010 sobre una base de la 004 (`specials` → `virtudes` en `jugadores` y en `partidos.entrada`; SC-002); partida antigua con `version_catalogo = 1` sin defectos (FR-036); `PUT /duelos` (solo anfitrión, `CONFIG_FIJADA`); alineación bloqueada; cruce de duelos con visionado pendiente; torneo de duelos de 4 completo. |
| `pnpm balance --n 1000 --serie todas` | `disciplina` (SC-011), `rasgos` (SC-004, SC-005), `impacto` (FR-051) y las comprobaciones vigentes de las specs 001 a 003 sin regresiones. |
| `pnpm balance --solo 005/SC-010 --torneos 100` | `duelos`: duelos nulos < 2 %, victorias del de mayor suma de medias entre el 60 % y el 85 %, ninguna remontada > 4 puntos, y ninguna victoria del peor con el Estado de forma desactivado. |
| `pnpm e2e` | Recorridos A a F de abajo. |

## Recorridos manuales

### A. Virtudes en lugar de specials (US1)

1. Abre «Pruebas de cartas», una partida en draft y la ficha de un jugador.
2. **Esperado**: el bloque se llama «Virtudes» y en ninguna pantalla aparece «special».

### B. Defectos en las cartas (US2, FR-020 a FR-024)

1. En «Pruebas de cartas», mira el caso «GOAT con 4 virtudes y 2 defectos».
2. **Esperado**: las dos filas se ven completas; los defectos aparecen en rojo y con su icono; la carta mide lo mismo que
   el caso sin rasgos.
3. En el draft, pulsa un defecto.
4. **Esperado**: se abre «Defecto · …» y la carta no se elige.

### C. Torneo antiguo (FR-036)

1. Con una base de la 004 que tenga un torneo en curso, migra y abre ese torneo.
2. **Esperado**: sus cartas no muestran defectos ni virtudes nuevas. Una partida nueva sí los muestra.

### D. Duelo de jugadores (US3)

1. Crea una partida «Duelo de jugadores» de 4 participantes (1 humano y 3 NPC).
2. **Esperado**: en la sala aparecen el 4-3-3 y el «Estado de forma» activado; los cambias y empiezas.
3. Completa el draft.
4. **Esperado**: en «Formación» solo hay campo y plantilla, sin táctica, dorsales, equipación ni banquillo.
5. Confirma el once.
6. **Esperado**: aparece el diálogo y, después, el once queda en modo de solo lectura.
7. En el torneo, pulsa «Ver duelos».
8. **Esperado**:
   - 11 duelos animados con el desglose y el Estado de forma (±);
   - «Saltar» lleva al resumen;
   - el cuadro avanza;
   - al perder, ves la pantalla de derrota, y al ganar la final, la de campeón.
9. Repite con el sistema en «reducir movimiento».
10. **Esperado**: fundidos sin choque.

### E. Frecuencias en partidos reales (US4)

1. Juega o simula una liga de 8.
2. **Esperado**:
   - amarillas, rojas, lesiones y penaltis aparecen con regularidad;
   - el resumen muestra «Penalti: marca X» o «… falla», con su icono propio.

### F. Efectos colectivos visibles (FR-044)

1. Convoca a un Rebelde en el banquillo y juega en simulación rápida.
2. **Esperado**:
   - aparece «Malestar en el equipo: … (Rebelde)»;
   - al hacerlo entrar, desaparece con «Se acaba el malestar».

### G. Documento de referencia (US6)

1. Abre `docs/juego/virtudes-y-defectos.md`.
2. **Esperado**:
   - aparecen todas las virtudes y todos los defectos con nombre, ámbito, efecto, activación, acumulación,
     incompatibilidades e impacto;
   - en las specs 001 a 004 ya no hay listas duplicadas, sino enlaces.
