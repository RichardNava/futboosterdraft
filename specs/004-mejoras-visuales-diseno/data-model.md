# Modelo de datos — spec 004

Esta spec **no cambia el modelo del dominio, la base de datos ni el protocolo**. No hay migraciones, ni tipos nuevos en `@fbd/domain` o `@fbd/protocol`, ni cambios en el servidor. Las "entidades" de la spec (Key Entities) son artefactos de presentación del cliente `apps/web`, y se describen aquí como estructuras de datos de la interfaz.

## 1. Guía de estilos adaptada (`apps/web/src/estilos/tokens.css`)

Es la fuente única de FR-037: un bloque `:root` de propiedades personalizadas, sin `@media (prefers-color-scheme)`.

| Grupo | Tokens | Reglas |
|---|---|---|
| Color, superficies | `--color-lienzo`, `--color-panel`, `--color-elevado`, `--color-borde`, `--color-divisor`, `--color-borde-marco`, `--color-borde-control` | Valores de research R4. `color-scheme: dark` fijo |
| Color, texto | `--color-texto`, `--color-texto-suave` | ≥ 4,5:1 sobre lienzo, panel y elevado |
| Color, acción | `--color-accion`, `--color-accion-texto`, `--color-apagado` | Lima solo en los usos de FR-002 |
| Color, estado | `--color-advertencia`, `--color-error` | Siempre con icono y texto (FR-003) |
| Color, niveles | `--nivel-superclase`, `--nivel-epico`, `--nivel-legendario`, `--nivel-goat` | ≥ 4,5:1 como texto; distintos del lima, del ámbar y del error (FR-004) |
| Tipografía | `--letra-texto` (Barlow + `Barlow Fallback`), `--letra-cartel` (Barlow Condensed + `Barlow Condensed Fallback`) | Research R2 y R3 |
| Escala | `--texto-pequeno`, `--texto-cuerpo`, `--texto-subtitulo`, `--titulo-pequeno`, `--titulo-grande`, `--cartel`, `--cartel-marcador`, más sus interlineados `--interlineado-*` | Research R5. Cartel 0,85–0,9; cuerpo 1,5 (FR-005) |
| Espaciado | `--espacio-1` … `--espacio-16` (4 px × n) | Panel 20–24 px; elementos 16–20 px; secciones 48–64 px, la mitad por debajo de 720 px (FR-009) |
| Forma | `--radio: 6px` | Todos los contenedores (FR-007), salvo las cartas |
| Sombra | `--sombra-barra: 0 2px 6px rgb(17 17 17 / 12.5%)` | Única sombra permitida (FR-008) |
| Medidas | `--boton-principal-alto: 48px`, `--barra-principal-alto`, `--objetivo-tactil: 44px`, `--ancho-lectura: 72ch`, `--ancho-pantalla: 1200px` | FR-010, FR-012, FR-032 |
| Movimiento | `--duracion-corta`, `--duracion-media`, `--curva-salida` | Anulados con movimiento reducido (FR-033) |

**Validación**: `tests/unit/tokens.test.ts` comprueba los pares de contraste de R4, y `lint:tokens` comprueba que no haya literales fuera de este fichero (research R5).

## 2. Componente visual (FR-011)

Cada componente tiene un aspecto definido para cada estado. Los estados aplicables a cada uno se marcan con ✓.

| Componente | Implementación | Normal | Señalado | Pulsado | Enfocado | Desactivado | Cargando | Error |
|---|---|---|---|---|---|---|---|---|
| Botón principal | `.boton-principal` (dentro de `BarraPrincipal`) | ✓ | ✓ | ✓ | ✓ | ✓ (apagado + motivo) | ✓ | — |
| Botón secundario | `button.secundario` | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| Secundario alternativa | `button.secundario.alternativa` (lima, como máximo uno por pantalla) | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| Botón de texto | `button.texto` | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| Campo de texto | `input` | ✓ | ✓ | — | ✓ | ✓ | — | ✓ (`aria-invalid`) |
| Selector | `select` | ✓ | ✓ | — | ✓ | ✓ | — | ✓ |
| Casilla y opción | `input[type=checkbox\|radio]` con `accent-color` lima | ✓ | ✓ | — | ✓ | ✓ | — | — |
| Pestañas o segmentado | `.pestanas` (con `role="tablist"`) | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| Panel | `.panel` | ✓ | — | — | — | — | ✓ (`Esqueleto`) | — |
| Diálogo | `<dialog class="modal">` | ✓ | — | — | ✓ (foco dentro) | — | — | — |
| Aviso | `Aviso` (`informacion`, `exito`, `advertencia`, `error`) | ✓ | — | — | ✓ (botón cerrar) | — | — | ✓ |
| Tabla | `.tabla` (clasificación, estadísticas, goleadores) | ✓ | ✓ (fila) | — | ✓ (fila enfocable) | — | ✓ | — |
| Insignia | `Insignia` | ✓ | — | — | — | — | — | — |
| Barra de navegación | `BarraNavegacion` + `MenuNavegacion` | ✓ | ✓ | ✓ | ✓ | — | — | — |
| Nombre recortado | `NombreRecortado` | ✓ | ✓ (etiqueta) | ✓ (pulsación larga) | ✓ (etiqueta) | — | — | — |
| Estado vacío | `EstadoVacio` | ✓ | — | — | — | — | — | — |
| Esqueleto | `Esqueleto` | ✓ | — | — | — | — | ✓ | — |

**Tipo de aviso** (`TipoAviso = 'informacion' | 'exito' | 'advertencia' | 'error'`):

| Tipo | Superficie | Borde izquierdo | Icono | Región viva |
|---|---|---|---|---|
| `informacion` | panel | divisor | información (blanco) | `polite` |
| `exito` | panel | divisor | éxito (blanco) | `polite` |
| `advertencia` | panel | 3 px ámbar | advertencia (ámbar) | `polite` |
| `error` | panel | 3 px error | error (rojo) | `assertive` |

Ningún aviso usa el lima (Clarifications).

## 3. Inventario de pantallas (FR-013)

La lista usada para la cobertura (SC-001), el recorrido automático (FR-040) y la lista visual manual. En la columna "Recorrido e2e", **inv** es `tests/e2e/diseno/inventario.spec.ts` y **tec** es `teclado.spec.ts`.

| # | Pantalla o elemento | Ficheros | Recorrido e2e |
|---|---|---|---|
| 1 | Inicio sin sesión | `pantallas/Inicio.tsx` | inv |
| 2 | Inicio con sesión | `pantallas/Inicio.tsx` | inv, tec |
| 3 | Mis partidas (con y sin partidas) | `pantallas/MisPartidas.tsx` | inv |
| 4 | Mi perfil | `pantallas/Perfil.tsx`, `CampoNombreEquipo`, `EditorEquipacion` | inv |
| 5 | Nueva partida | `pantallas/CrearPartida.tsx`, `SelectorModo` | inv, tec |
| 6 | Sala | `pantallas/Sala.tsx` | inv (multijugador: `draft-varios`) |
| 7 | Draft, apertura de sobres y "Draft terminado" | `pantallas/Draft.tsx`, `AperturaSobre`, `CartaJugador`, `VistaCarta` | inv, tec |
| 8 | Plantillas | `pantallas/Plantillas.tsx` | inv |
| 9 | Formación (táctica, dorsales, equipación, lanzadores) | `pantallas/Alineacion.tsx`, `CampoEquipo`, `PanelTactica`, `EditorDorsales`, `EditorEquipacion`, `EditorLanzadores` | inv, tec |
| 10 | Partido: preparación | `pantallas/Partido.tsx` | inv, tec |
| 11 | Partido: simulación rápida | `pantallas/PartidoRapido.tsx`, `ResumenEventos` | inv, tec |
| 12 | Partido: simulación 2D | `pantallas/Partido2D.tsx`, `campo2d/*` | inv |
| 13 | Descanso y gestión del equipo | `GestionEquipo`, `estadoEquipoEnPartido` | inv |
| 14 | Resultado del partido | `ResultadoPartido`, `Estadisticas` | inv, tec |
| 15 | Reproducción de un partido | `pantallas/ReproduccionPartido.tsx` | inv |
| 16 | Torneo (jornadas, clasificación, cuadro, pendientes de ver) | `pantallas/Torneo.tsx` | inv, tec |
| 17 | Pantalla de campeón | `pantallas/PantallaCampeon.tsx` | inv |
| 18 | Pantalla de derrota | `pantallas/PantallaDerrota.tsx` | inv |
| 19 | Barra de navegación (escritorio, móvil, compacta 2D) | `app/Marco.tsx` (+ `MenuNavegacion`) | inv, tec |
| 20 | Bandeja de avisos | `BandejaAvisos` | inv |
| 21 | Avisos de partido y de dorsales | `AvisoPartido`, `AvisoDorsales` | inv |
| 22 | Ficha de jugador | `FichaJugador` | inv |
| 23 | Barra principal | `BarraPrincipal`, `BotonAvanzar` | en todas |

Queda fuera la pantalla `/_pruebas/cartas` (Edge Cases): solo existe en desarrollo y puede conservar un estilo básico.

## 4. Estados de cada pantalla

No hay transiciones nuevas. Cada pantalla que carga datos sigue la secuencia `cargando → (vacio | contenido | error)`:

- **cargando** muestra un `Esqueleto` con la forma del contenido;
- **vacio** muestra un `EstadoVacio`;
- **error** muestra un `Aviso` de tipo `error` con la acción de reintento.

Esa secuencia la recorre la lógica que ya existe en cada pantalla. Solo cambia lo que se pinta en cada estado.
