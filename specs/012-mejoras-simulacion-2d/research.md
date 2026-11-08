# Research: Mejoras de la simulación 2D, control de bajas y retoques del torneo

Fase 0 del [plan](plan.md). Cada decisión cita el requisito que resuelve.

## R1. Punto de partida en el código

| Tema | Dónde está hoy | Qué hace |
|------|----------------|----------|
| Lesión en el partido | `packages/engine/src/acciones/lesiones.ts` → `retirarLesionado()` en `acciones/plantel.ts` | Sustituye **en el acto** (a mitad de acción) por `mejorSuplente()`, o deja la casilla vacía si no quedan cambios. |
| Expulsión | `balonParado.ts` → `tarjetaRoja()` → `expulsar()` en `plantel.ts` | Retira al jugador, `cubrirPorteria()` si era el portero, `repartirAnclas()` y regla de los 7, todo en el acto. |
| Paradas de decisión | `tramos/avanzar.ts` | Las decisiones se aplican en `reanudar()` (si `puntoDecision`) o en una interrupción con `aplicadaEnTick`. El PRNG avanza igual en los modos `parte`, `interrupcion`, `ticks` y `final`. |
| Pausa del partido en directo | `apps/server/src/actores/partidoRapido.ts` (`abrirPausa`, `programarVentana`, `emitirPausa`, `procesarSeguir`) y `partido2d.ts` (`avanzar2D`) | `partido.pausa_decision` con motivo `descanso` o `pre_prorroga`; «Seguir» o el vencimiento de la ventana reanudan. |
| Alineación entre jornadas | `apps/server/src/actores/equipo.ts` → `alineacionVigente()` | Si la guardada tiene **una sola** baja, la descarta entera y usa `alineacionAutomatica()`. |
| Avisos | `apps/server/src/avisos/servicio.ts`, `apps/web/src/componentes/BandejaAvisos.tsx` | Filas guardadas con `tipo` (check `avisos_tipo_ck`); la bandeja está en la cabecera de Torneo. |
| Sonidos | `apps/web/src/sonido/sonido.ts` | `reproducir(efecto, velocidad)` con Web Audio; devuelve una función para cortar el sonido. |
| Cosméticos | `packages/domain/src/cosmeticos/`, tabla `cosmeticos` (0014), `data/cosmeticos.json` | `TipoCosmetico = 'escudo' \| 'sobre'`; añadir un tipo = ampliar la unión, el check y su selector (011/FR-022). |
| Gestionar equipo | `apps/web/src/componentes/GestionEquipo.tsx` | Componente propio (244 líneas) que ya comparte `CampoEquipo` y `campoEquipoEstado` con Formación. |
| Formación | `apps/web/src/pantallas/Alineacion.tsx` | Distribución horizontal/vertical en `localStorage` (`CLAVE_DISTRIBUCION`), pestañas con «Personalización». |

## R2. Parada de «Control total» sin cambiar el partido (FR-022, FR-025, SC-006)

**Problema**: la lesión y la expulsión se resuelven a mitad de una acción. Si en control total el motor dejara la
resolución para después y en automático la hiciera en el acto, el resto de esa acción (quién saca la falta, quién tira
el penalti, colocación) podría diferir y SC-006 fallaría.

**Decision**: un solo camino en los dos modos. En el momento del lance, el motor solo **retira** al jugador
(`lesionado`/`expulsado`, fuera del campo, casilla vacía) y anota una **incidencia** en `estado.incidencias`. Al
**terminar el paso** en el que ocurrió, `resolverIncidencias()`:

- si el equipo está en automático (o no hay a quién preguntar: NPC, modo `final`, menos de 7): aplica la resolución
  automática de hoy (`mejorSuplente` en la casilla vacía, `cubrirPorteria`, `repartirAnclas`, regla de los 7);
- si está en control total: `avanzar()` corta ahí con `puntoDecision = true` y devuelve `incidencias` en el
  resultado. Al reanudar, `reanudar()` aplica las decisiones del participante y luego `resolverIncidencias()` aplica
  lo automático a lo que quede sin resolver.

Entre la parada y la reanudación no se ejecuta ningún paso ni se consume PRNG, así que «control total sin cambios» es
idéntico a «automático» (SC-006). Al reproducir un partido guardado, las decisiones con `aplicadaEnTick` igual al
tick de la incidencia se aplican al final de ese paso, antes de `resolverIncidencias()`: la reconstrucción no
necesita saber en qué modo se jugó.

**Efecto colateral aceptado**: en automático, la sustitución por lesión pasa de «a mitad de acción» a «al terminar la
acción». Cambian los partidos concretos con semilla fija (hay que regenerar las referencias de las pruebas que las
fijan), no el reparto estadístico. Se comprueba con `pnpm --filter @fbd/balance` antes y después (riesgo en el plan).

**Qué cuenta como resuelta por el participante** (FR-023): si en esa parada confirma al menos una decisión para su
equipo, la incidencia queda «resuelta por el participante». Aun así, `resolverIncidencias()` siempre cubre la
portería vacía y reparte las anclas si no hubo recolocación ni cambio de formación (seguridad, no decisión).

**Sustituir al lesionado**: `validarDecision` admite una `sustitucion` cuyo `sale` es el jugador de una incidencia
de lesión pendiente; el que entra ocupa su casilla y su ancla guardadas en la incidencia. El expulsado no se puede
sustituir (reglamento): se recoloca o se cambia a otro.

**Sin parada** (Edge Cases): el equipo queda con menos de 7, la fase es `penaltis` o `finalizado`, o el lance es del
rival (FR-024).

**NPC en la parada**: el NPC no decide en una parada de incidencia (en automático no existe), para no romper SC-006.

**Alternatives considered**:

- *Resolver en el acto en automático y diferir solo en control total*: rompe SC-006 en las acciones con lance.
- *Emitir una interrupción real («el árbitro para el juego») en los dos modos*: también es coherente, pero añade una
  parada y un saque al partido en automático; es un cambio del motor mayor que el que pide la spec.
- *Deshacer la sustitución automática si el participante elige otra*: gasta y devuelve cambios; frágil.

## R3. Dónde vive el modo y cómo cambia durante el partido (FR-020, FR-024)

**Decision**: `modo_incidencias` (`automatico` | `control_total`) en `perfiles_usuario` y en `participantes`, igual
que `ultima_modalidad` (003/FR-032): se fija al unirse a la partida desde el perfil y se actualiza en los dos sitios
al cambiarlo. En el motor es un campo de ejecución `EquipoEstado.controlTotal` que pone el servidor al iniciar o
reconstruir el partido y que se cambia en caliente con el comando nuevo `partido.modo_incidencias`. No entra en
`EntradaPartido` ni en las decisiones registradas: por R2 no cambia el resultado.

Solo se activa si el partido tiene un único humano y el otro equipo es NPC (`gestionDisponible`, 003/FR-027).

**Alternatives considered**: guardarlo solo en el navegador (no cumple «en su cuenta»); como decisión del partido
(innecesario: no altera el cálculo).

## R4. Parada en la simulación rápida (FR-022, Clarifications)

**Decision**: el modo `parte` también corta en una incidencia de control total (R2). `jugarTramo()` trata
`resultado.incidencias` como una tercera razón de `abrirPausa()` (`motivo: 'incidencia'`) con la misma ventana
(`descansoS`) y el mismo «Seguir». El cliente de la rápida ya muestra el resumen por tramos: corta en el minuto del
lance y pone «Gestionar equipo» como botón principal (`SituacionAvance = 'gestionar_equipo'` ya existe).

`reconstruirMotor()` hoy repite `avanzar('parte')` como mucho 6 veces; con paradas de incidencia puede haber más. Se
cambia a «hasta llegar a la fase y el tick guardados», con el mismo `MAX` de seguridad del motor.

## R5. Parada en la 2D (FR-022, US4-2)

**Decision**: `avanzar2D()` trata `r.incidencias` como el descanso: deja de simular por delante y abre la pausa con
`motivo: 'incidencia'`. El cliente, al llegar en la reproducción al tick de la parada, detiene el reloj
(`RelojReproduccion`), muestra el aviso (jugador, motivo, minuto, cambios restantes) y abre «Gestionar equipo». Como el
búfer de anticipación nunca pasa de una parada dura, no hay fotogramas posteriores que deshacer.

## R6. Celebraciones de gol (FR-009 a FR-014, SC-002, SC-003)

**Decision**:

- `TipoCosmetico` gana `'celebracion'`. Columna nueva `cosmeticos.datos jsonb` con `{ clase, duracionMs, sonido? }`
  (solo celebraciones). El fichero de una de clase `secuencia` se deriva del id:
  `/cosmeticos/celebraciones/<id>.webm` (+ `<id>.mov` HEVC con alfa para Safari, opcional).
- Componente único `CapaCelebracion` (posición absoluta sobre `.partido-2d-zona`) que recibe
  `{ id, equipo, goleador, escudo|color, velocidad }`:
  - clase `juego`: busca el id en un registro `CELEBRACIONES_JUEGO` (4 entradas en `componentes/celebraciones/`,
    CSS + texto «¡GOL!», escudo y goleador); id desconocido → la del juego;
  - clase `secuencia`: `<video muted playsinline autoplay>` con sus `<source>` y `playbackRate = velocidad`; si el
    navegador no puede reproducirlo (`error` o sin fuente), cae a la del juego. Su sonido opcional va por
    `reproducir()`, que ya respeta 🔊.
  Una celebración nueva = fichero(s) + entrada en `data/cosmeticos.json` (secuencia) o + componente en el registro
  (juego). La pantalla del partido no cambia (SC-003).
- Duración: `min(duracionMs, 3000 si es de juego) / velocidad`; un gol nuevo reemplaza la capa (`key` por gol); un
  clic la cierra. Con `prefers-reduced-motion`, solo fundido (la clase `.reducido` anula transform/scale).
- Sin celebración en la tanda (eventos `tanda_lanzamiento`); gol en propia → equipo del evento `gol` (ya es el que
  suma).
- Celebración de prueba de clase secuencia: `celebracion-prueba-secuencia`, `activo: false` en el catálogo (no se
  ofrece ni se vende), visible en la pantalla de pruebas existente (`PruebasCartas`, ruta de desarrollo) con un
  selector de celebración. Su vídeo es un WebM corto generado (texto animado sobre transparente) en
  `tools/sonidos/` o a mano; no hace falta arte final.
- La celebración que se ve es la de `participantes.celebracion` del dueño del equipo que marca; los NPC, la del juego
  (FR-012). Llega en `partido.inicio` como `celebraciones: { local, visitante }` con sus `datos`, igual que los
  escudos (011): sin consultas nuevas al abrir el partido. Se fija al unirse a la partida desde el perfil; cambiarla
  en el perfil afecta a las partidas nuevas (como el escudo).
- Tienda: bloque «Celebraciones — Próximamente» (011/FR-023), sin venta.

**Alternatives considered**: WebP/APNG animado (alfa universal, pero no se puede acelerar ni tiene sonido; queda
como formato posible si se añade a `<picture>` más adelante); Lottie (dependencia nueva para algo que CSS cubre);
leer la favorita del perfil al abrir el partido (consulta extra en cada apertura).

## R7. Sonidos (FR-001 a FR-008, SC-001)

**Decision**: efectos nuevos en `Efecto` y `BASE` de `sonido.ts`, con fila en `docs/juego/sonidos.md`:

| Efecto | Origen | Cuándo |
|--------|--------|--------|
| `pitidoInicio`, `pitidoDescanso`, `pitidoFinal` | sintetizados (`tools/sonidos/generar.py`) | eventos `inicio_tramo` y `fin_tramo` vistos en la 2D |
| `golPropio`, `golRival` | banco libre (CC0) | evento `gol`, según el equipo del espectador |
| `tarjetaAmarilla`, `tarjetaRoja` | silbato sintetizado + «oooh» CC0 mezclados | eventos `amarilla` / `roja` |
| `confirmarEleccion` | sintetizado | confirmación en `Draft.tsx` |
| `latido` | sintetizado, 5 s con aceleración y crescendo incluidos | cuenta atrás del turno ≤ 5 s sin elegir; se corta con la función que devuelve `reproducir()` |
| `clicPrincipal` | sintetizado, volumen bajo | `BarraPrincipal` (un solo sitio para todos los botones principales) |
| `cajaRegistradora` | banco libre (CC0) | compra correcta de un sobre o diseño de sobre en `Tienda.tsx` |

Los sonidos de la 2D salen del mismo punto que ya recorre los eventos vistos (`eventosVistos`), con
`reproducir(efecto, min(velocidad, 2))` para que no se alarguen a velocidad alta. Procedencia en
`apps/web/public/sonidos/LICENCIA`.

**Alternatives considered**: volumen variable por llamada para el latido (cambiar la API para un solo efecto; el
crescendo grabado basta).

## R8. Barra superior estable (FR-018, SC-004)

**Causa**: la `.franja-2d` mezcla contenido de alto variable (`GoleadoresFranja`, avisos de malestar y los botones)
y la zona del campo se calcula con el espacio que queda; cuando algo salta de línea, el campo encoge.

**Decision**: `.franja-2d` con altura fija (`block-size` del token de 48 px de la spec 004) y una sola fila desde
1024 px (`grid-template-columns` con `minmax(0, 1fr)` y texto recortado); los avisos de malestar pasan al carril
lateral; en estrecho, dos filas de altura fija. Prueba: e2e que mide `getBoundingClientRect()` del lienzo al inicio,
en el descanso y al final a 1024 y 1440 px (SC-004).

## R9. Tarjetas blancas en «Lo que ha pasado» (FR-019)

**Causa**: el icono `amarilla`/`roja` se pinta con `currentColor` y no hay reglas `.icono-amarilla` ni `.icono-roja`
(solo `.evento-gol .icono-gol`): hereda el color del texto.

**Decision**: tokens `--color-tarjeta-amarilla` y `--color-tarjeta-roja` en los dos temas y las dos reglas en
`base.css`; la roja por doble amarilla usa el mismo icono `roja` (el texto ya dice «(doble amarilla)»).

## R10. «Gestionar equipo» con la distribución de Formación (FR-015 a FR-017)

**Decision**: extraer de `Alineacion.tsx` el hook `useDistribucion()` (lectura y escritura de `CLAVE_DISTRIBUCION`,
regla de 1024 px) y las clases de la mesa con pestañas fijas, y usarlos en `GestionEquipo.tsx`. `GestionEquipo` ya
trabaja con el `EstadoEquipo` del partido: se filtra a `enCampo` + banquillo convocado (los no convocados no están en
el motor, así que el filtro es solo de lo que se muestra) y no tiene pestaña de personalización (se comprueba que
siga sin ella). Pestañas: Alineación, Táctica, Lanzadores (las sustituciones están en Alineación).

**Alternatives considered**: reutilizar `Alineacion.tsx` entera con un modo «partido» (mezcla dos fuentes de datos y
la API HTTP con el WebSocket).

## R11. Alineación confirmada y bajas pendientes (FR-026 a FR-030, SC-007, SC-008)

**Decision**:

- Dominio puro en `packages/domain/src/equipo/bajas.ts`:
  - `bajasPendientes(alineacion, bajas)` → ids de titulares y suplentes convocados que están de baja;
  - `haySuplenteDisponible(alineacion, plantilla, bajas)` → si queda alguien de la plantilla no titular y sin baja;
  - `cubrirBajas(alineacion, plantilla, bajas, parametros)` → la misma alineación con cada baja sustituida por el mejor
    disponible (misma demarcación primero, luego cualquiera), sin tocar el resto (FR-030).
- `alineacionVigente()` deja de descartar la guardada: la devuelve tal cual con `bajasPendientes` y
  `sinSuplentes`. La automática solo se usa si nunca se confirmó una (Edge Cases).
- **Bloqueo en el servidor** (Principio VI): `POST /api/partidos/:id/abrir` y el avance de jornada devuelven 409
  `BAJA_PENDIENTE` si hay bajas pendientes y queda algún suplente. Con `sinSuplentes`, juega con los disponibles
  (`validarAlineacion` admite menos de 11 titulares solo en ese caso; el motor aplica la regla de los 7).
- **Plazo vencido / NPC al mando**: `alineacionParaPartido()` usa `cubrirBajas()` y avisa con el tipo nuevo
  `baja_sustituida` (FR-030). Con un solo humano no hay plazo, así que el bloqueo dura (FR-030).
- **Avisos del equipo** (FR-027): no se guardan; se derivan de `c.torneo.bajas` y de la alineación confirmada en la
  vista de equipo (`avisosEquipo`), con `nivel: 'intervencion' | 'informativo'`. «Vuelve a estar disponible» = baja que
  llegó a 0 en la última jornada jugada. `BandejaAvisos` los muestra arriba, separados de los guardados.
- **Botón**: `motivoDesactivado` de `BarraPrincipal` con el texto de FR-029 («Sustituye a Pérez (lesionado) y 1 más
  para continuar»), calculado en el cliente con los mismos datos de la vista (el servidor es quien manda).

**Alternatives considered**: guardar los avisos de bajas como filas (se quedarían viejos al resolver la baja).

## R12. Plantillas, Inicio y sesión (FR-026, FR-031)

**Decision**: la respuesta de plantillas añade `nombreEquipo`, `escudo` y `color` (ya están en `participantes`);
la pestaña de cada plantilla lleva `Chapa` + nombre del equipo. En Inicio, «Iniciar sesión» pasa a
`boton secundario` con icono `perfil` en la misma fila que «Jugar»; «Ya tengo cuenta» y «Crear una cuenta», botón
secundario; «Cerrar sesión», botón secundario con icono. Solo marcado y CSS.

## R13. Pruebas

- Motor: `incidencias.test.ts` — misma semilla, control total sin decisiones = automático (deep equal del resultado y
  los eventos); control total con una sustitución = automático reproduciendo esa decisión con su `aplicadaEnTick`;
  lance del rival sin parada; < 7 sin parada; varias incidencias en un paso → una parada.
- Dominio: `bajas.test.ts` (pendientes, sin suplentes, `cubrirBajas` no toca el resto).
- Servidor (integración): parada en la 2D y en la rápida; vencimiento de la ventana → automático; 409
  `BAJA_PENDIENTE` en `abrir`; plazo vencido → `cubrirBajas` + aviso; celebraciones en `partido.inicio`.
- Web (unit): `CapaCelebracion` (registro, reemplazo, reducido, caída a la del juego), etiqueta del botón bloqueado.
- e2e: tamaño del campo (SC-004), colores de tarjeta, flujo de control total contra NPC.
- `test:equivalence` y el informe de balance, antes y después de R2.
