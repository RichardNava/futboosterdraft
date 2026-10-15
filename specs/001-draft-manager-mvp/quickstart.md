# Quickstart — validación del MVP de Fútboosterdraft

Guía para levantar el sistema y comprobar de principio a fin que cumple la especificación. No contiene
código de implementación: los detalles están en [data-model.md](./data-model.md) y en
[contracts/](./contracts/).

## Requisitos previos

- Node.js 22 LTS y pnpm 9.
- Docker (PostgreSQL local y Testcontainers).
- Navegador Chrome o Firefox reciente; k6 solo para la prueba de carga.

## Puesta en marcha

```bash
pnpm install
docker compose up -d db          # PostgreSQL 16
pnpm db:migrate                  # migraciones versionadas
pnpm seed --file data/core.json  # valida y carga la colección Core (FR-024)
pnpm dev                         # servidor + web en http://localhost:5173
```

**Resultado esperado del *seed***: muestra el recuento por demarcación y nivel y lo compara con la tabla
de 300 cartas de la especificación. Si algún jugador incumple las reglas, falla e indica el `id` y la
regla concreta.

## Pruebas automáticas

| Comando | Qué valida |
|---------|-----------|
| `pnpm test` | Unitarias y de propiedades de `domain`, `engine` y `ai`: circulación de sobres N = 4..8 (SC-002), 24 cartas sin duplicados (SC-001), composición de sobres (SC-013), validez de alineaciones y tácticas (FR-026 a FR-030), penalizaciones y FR-025a, bajas y amarillas (SC-014), calendario (SC-012), determinismo del motor (FR-040). |
| `pnpm test:integration` | Servidor con PostgreSQL real: turno simultáneo, elecciones duplicadas o tardías, reconexión, visibilidad (FR-054a), permisos de invitado (FR-000), plazos asíncronos con reloj simulado (FR-056a, SC-016). |
| `pnpm test:equivalence` | Mismo partido y decisiones en rápida y 2D, con eventos y marcador idénticos (SC-008). |
| `pnpm balance --n 1000` | Criterios estadísticos SC-004, SC-005, SC-006, SC-007, SC-010 y SC-015 con semillas fijas. En CI: `--n 200`. |
| `pnpm e2e` | Recorridos con Playwright (escenarios A a F de abajo). |
| `k6 run tools/load/beta-100.js` | 100 partidas simultáneas (SC-017). |

## Escenarios de validación manual

Cada escenario se puede repetir sin conocer el código (Principio IX).

### A. Draft en solitario como invitado (Historias 1 y 5)

1. Abre la web, elige **Jugar como invitado** y crea una **liga de 4** en directo con simulación rápida.
2. Comprueba que el sistema rellena las 3 plazas con NPC amateur, intermedio o avanzado (nunca PRO).
3. En el draft, comprueba:
   - El sobre tiene 8 cartas: 0 o 1 portero, 2 o 3 defensas, 3 medios y 2 delanteros; 4 Superclase, 2 Épico y 2 Legendario o GOAT.
   - El temporizador marca 45 s.
   - No se ven las cartas que eligen los NPC.
4. No elijas en un turno: al vencer, se añade a tu plantilla la carta de mayor media del sobre.
5. Al terminar: 24 jugadores en tu plantilla, y las plantillas de los rivales visibles.

**Esperado**: FR-006 a FR-014 y FR-054a; ningún jugador repetido entre plantillas.

### B. Preparación del equipo (Historia 2)

1. Elige 3-5-2 y coloca un DCI en la casilla central de la defensa: no tiene penalización. Coloca un medio allí: aparece "fuera de posición", con stats −25 %.
2. Coloca un defensa en la portería: −60 % y aviso.
3. Marca Catenaccio e intenta activar Línea adelantada: no se permite.
4. Comprueba que se proponen automáticamente el lanzador de penaltis, faltas y córners, y la tanda. Cámbialos.
5. Confirma la alineación.

**Esperado**: FR-025 a FR-031 y FR-029a.

### C. Partido rápido y descanso (Historia 3)

1. Empieza el primer partido: en menos de 3 s ves el marcador al descanso y los eventos con su minuto.
2. Haz una sustitución y cambia a Presión alta. Pulsa **Seguir**.
3. El resumen final incluye la segunda parte, la sustitución y las estadísticas básicas.

**Esperado**: FR-044 a FR-047 y SC-009.

### D. Dos humanos, modalidad 2D (Historia 6)

1. Con dos cuentas registradas en dos navegadores, crea un **playoff de 4** con simulación 2D (2 NPC).
2. Antes del partido, comprueba que ninguno ve la alineación del otro. Al empezar, ambas son visibles.
3. Un jugador elige x32 y el otro x4: la reproducción avanza a x4 para ambos.
4. Pide una sustitución con el balón en juego: se aplica en la siguiente interrupción y ambos reciben el aviso.
5. Si hay empate: prórroga y penaltis con los lanzadores designados.

**Esperado**: FR-048 a FR-050, FR-041, FR-052 y FR-054a.

### E. Torneo asíncrono con bajas (Historia 4)

1. Crea con una cuenta registrada una **liga de 6, asíncrona, con plazo de 24 h**. Usa el reloj simulado del entorno de pruebas (`pnpm dev --fake-clock`).
2. Llega a una jornada sin jugar tu partido y adelanta el reloj 24 h: el partido se simula solo y la jornada siguiente se abre.
3. Comprueba los avisos de jornada abierta, rival listo y plazo próximo (en la aplicación y en el buzón de pruebas en `http://localhost:8025`).
4. Fuerza una roja (escenario de prueba con semilla documentada en `tools/fixtures`) y comprueba la sanción de 1 partido. Haz lo mismo con 3 amarillas acumuladas y con una lesión.

**Esperado**: FR-043, FR-056 a FR-056c, SC-014 y SC-016.

### F. Mixto de 8 y NPC PRO (Historias 4 y 5)

1. Crea un **mixto** con 1 humano, 1 NPC PRO y relleno automático.
2. Juega o resuelve la liga (56 partidos); comprueba que las semifinales enfrentan 1.º contra 4.º y 2.º contra 3.º.
3. En `pnpm balance --torneos 100 --pro-vs-amateur`, el PRO termina por delante del amateur en al menos el 80 % de los torneos.

**Esperado**: FR-053, FR-057 a FR-060, SC-010 y SC-012.

## Criterio de "hecho"

Todos los comandos de la tabla de pruebas automáticas terminan sin errores, los escenarios A a F se cumplen y el informe de `pnpm balance --n 1000` cumple todos los SC estadísticos.
