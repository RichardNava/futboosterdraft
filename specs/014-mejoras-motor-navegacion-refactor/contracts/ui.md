# Contrato de interfaz (spec 014)

## U1. Indicador de energía en «Gestionar equipo» (US4)

Componente `IndicadorEnergia` (`apps/web/src/componentes/IndicadorEnergia.tsx`) con `{ energia, penalizacion }`.

```text
      67%          ← porcentaje de energía, entero, encima
   ┌──────┐
   │ (•‿•)│  ⊙    ← chapa con retrato y dorsal (sin cambios) + cara de color a su lado
   └──────┘
     −20%          ← penalización en rojo, debajo; solo si energía < 80
```

| Regla | Detalle |
|-------|---------|
| Dónde | Solo en `GestionEquipo` abierto desde una pausa con `energia` (2D y rápida). Nunca en la reproducción de la 2D, ni en `Alineacion` entre jornadas (FR-017). |
| Qué jugadores | Los que vienen en `energia`. Banquillo sin indicador (FR-018). |
| Tramos | `tramoEnergia()` de [data-model §4](../data-model.md#4-tramos-del-indicador-web): cinco caras SVG propias y cinco tokens de color en `:root` (con su variante oscura). |
| Texto | `aria-label` de la chapa: «Energía 67 %, rinde un 20 % menos». La penalización se escribe «−20 %» (signo menos tipográfico). |
| Sin depender del color | Cara con expresión distinta en cada tramo + porcentaje siempre visible (FR-020). |
| Ayuda | Botón «?» en la cabecera de la pestaña Alineación de la gestión con la tabla de tramos y una frase: «Desde el minuto 65 (55 con Presión alta) los jugadores se cansan y rinden menos». |
| Espacio | El porcentaje y la penalización ocupan el hueco ya reservado encima y debajo de la chapa (nombre/dorsal); la rejilla del campo no crece (Principio XI). Si en móvil no cabe la cara al lado, va superpuesta en la esquina del retrato. |
| Movimiento | Sin animación; respeta `prefers-reduced-motion` por no tener ninguna. |

Pruebas: `IndicadorEnergia.test.tsx` (tramos y límites 80/60/40/20, penalización solo < 80, etiquetas); e2e: abrir la
gestión en el descanso (todos 100 %) y tras el 75' (porcentajes < 100 y penalización en rojo).

## U2. Navegación sin pestañeo (US6)

| Regla | Detalle |
|-------|---------|
| Cambio de pantalla | La pantalla anterior se mantiene hasta que el loader de la nueva resuelve (`createBrowserRouter`); la nueva aparece completa (FR-024). |
| Volver a una pantalla | Con datos en caché no frescos: el loader resuelve al instante con ellos y la pantalla se actualiza sola si la revalidación trae cambios (FR-025). |
| Datos de decisión | Saldo, plazos, turnos y estado de partida: el loader espera la respuesta fresca; nunca se pinta un valor anterior (FR-025). |
| Precarga | `onPointerEnter` y `onFocus` en los enlaces de la barra principal y de las listas (partidas, colección) llaman a `precargar` de las claves no frescas (FR-026). |
| Indicador | `IndicadorNavegacion` en `Marco`: barra fina bajo la barra de navegación + texto para lectores «Cargando…», solo si la navegación sigue en curso a los **2000 ms**; desaparece al terminar o fallar (FR-027). |
| Abandono | Navegar a otra pantalla cancela la carga anterior; su indicador no aparece ni pisa la pantalla actual (FR-028). |
| Error | La pantalla destino muestra su aviso de error habitual (el loader devuelve `{ error }`), sin indicador perpetuo. |
| Esqueletos | Ninguna navegación entre pantallas muestra `Esqueleto` antes de 2 s. Se mantienen solo en la primera carga de la sesión y en los estados en directo de draft y partido. |

Pruebas: `cache.test.ts` (valor al instante + revalidación, una petición en vuelo por clave, `fresco` nunca desde la
caché, `invalidar`); `IndicadorNavegacion.test.tsx` (no aparece a 1,9 s, aparece a 2 s, desaparece al terminar, no
aparece tras abandonar); e2e con la red ralentizada de Playwright (`page.route` con retardo de 3 s: indicador a los
2 s ± 0,3 s; sin retardo: ningún `[role=status]` de carga visible en el recorrido de pantallas principales, SC-010).
