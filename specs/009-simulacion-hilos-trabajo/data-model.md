# Data Model: Simulación de partidos en hilos de trabajo

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Esta spec **no cambia el esquema de base de datos** ni el protocolo. Las entidades nuevas viven solo en memoria del
proceso del servidor (`apps/server/src/simulacion/`).

## Cálculo (tarea del grupo)

Petición autocontenida: una función de la tabla y sus argumentos (ver [contracts/calculo.md](contracts/calculo.md)).

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | entero | Único en el proceso; empareja la respuesta del hilo. |
| `nombre` | `NombreCalculo` | Clave de la tabla `FUNCIONES`. |
| `args` | tupla de la función | Copiada al enviarla (*structured clone*): datos planos, sin conexiones ni repositorios. |
| `prioridad` | `'humano' \| 'npc'` | FR-012. |
| `intentos` | entero | Intentos empezados (máximo 3: 1 + 2 reintentos). |
| `encoladaEn` / `empezadaEn` | ms | Para `calculo_duracion_ms` y el tiempo en cola. |

**Estados**:

```text
en_espera ──(hilo libre; humano antes que npc)──► en_curso
en_curso ──(respuesta ok)──────────────────────► resuelta
en_curso ──(excepción en la función)───────────► rechazada (sin reintento)
en_curso ──(hilo cae o supera 20 s) & intentos<3 ► en_espera (al principio de su cola; hilo sustituido)
en_curso ──(hilo cae o supera 20 s) & intentos=3 ► rechazada (ErrorCalculo)
en_espera/en_curso ──(cerrar())────────────────► rechazada
```

## Grupo de hilos

| Atributo | Notas |
|----------|-------|
| `tamano` | Fijo al arrancar (`HILOS_SIMULACION`, FR-007). `0` = modo en proceso: no hay hilos ni colas. |
| `hilos[]` | Cada uno `{ worker, tarea \| null, temporizador }`; como mucho una tarea a la vez. |
| `colas` | `{ humano: Tarea[], npc: Tarea[] }`, FIFO. |
| fallos | Contadores en métricas (`calculos_fallidos_total{motivo}`, `calculo_reintentos_total`). |

Invariante: `hilos.length === tamano` salvo durante la sustitución de uno caído.

## Estados de partido afectados (sin cambios de esquema)

- **Partido NPC contra NPC cuyo cálculo falla** (FR-008): sigue en `programado`; no se guarda `entrada`, eventos ni
  dorsales nuevos de ese intento. La jornada no se cierra hasta que se calcule (reintentos en R6 de
  [research.md](research.md)).
- **Partido entre humanos cuya apertura falla**: sigue `programado`; quien lo abrió recibe el error y puede volver a
  abrirlo (comportamiento actual ante un error del motor).
- **Partido en directo cuyo tramo falla**: `p.motor` no cambia (solo se asigna al recibir el resultado), así que el
  partido queda donde estaba; el siguiente «Seguir», informe de reproducción 2D o vencimiento de la ventana lo
  reintenta.
