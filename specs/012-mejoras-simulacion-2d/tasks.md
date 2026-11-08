---

description: "Tareas de la spec 012: mejoras de la simulación 2D, control de bajas y retoques del torneo"
---

# Tasks: Mejoras de la simulación 2D, control de bajas y retoques del torneo

**Input**: documentos de diseño en `specs/012-mejoras-simulacion-2d/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md),
[contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: sí. La constitución (Principio IX) y el plan ([R13](research.md#r13-pruebas)) piden pruebas de motor,
dominio, integración, web y e2e; cada historia lleva las suyas.

**Organización**: por historia de usuario. Los IDs siguen el orden de ejecución recomendado en el plan (US2 antes que
US1 porque su e2e de SC-004 hace de red para el resto de cambios de la 2D; US3 antes que US4).

**Normas del repositorio**: pnpm siempre; identificadores sin tildes; textos de interfaz en español con tildes; los
agentes no hacen `git commit` ni `git push`; tras tocar código, `graphify update .`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (ficheros distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1…US7)

---

## Phase 1: Setup (línea base)

**Purpose**: fijar el punto de partida antes de tocar el motor (riesgo R2 del plan).

- [ ] T001 Ejecutar `pnpm balance` y copiar el informe generado (directorio `DIR_SALIDA` de `tools/balance/src/`) a `specs/012-mejoras-simulacion-2d/balance-antes/` para compararlo tras T038
- [ ] T002 Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm test:equivalence` y anotar en `specs/012-mejoras-simulacion-2d/balance-antes/LEEME.md` cualquier fallo previo (para no atribuirlo a esta spec)

---

## Phase 2: Foundational (bloquea las historias)

**Purpose**: la migración única de la spec y los tipos compartidos.

**⚠️ CRITICAL**: ninguna historia que toque base de datos (US1, US4, US5) empieza antes de terminar esta fase. US2,
US3, US6 y US7 no dependen de ella.

- [ ] T003 Crear `apps/server/drizzle/0015_spec012.sql` (y su entrada en `apps/server/drizzle/meta/`) según [data-model §1](data-model.md#1-migración-0015_spec012sql): `cosmeticos_tipo_ck` admite `'celebracion'`; columna `cosmeticos.datos jsonb` («null salvo celebraciones»); `perfiles_usuario.celebracion text` y `participantes.celebracion text` (FK `cosmeticos.id`, «null = la del juego»); `perfiles_usuario.modo_incidencias` y `participantes.modo_incidencias` `text not null default 'automatico'` con check `in ('automatico','control_total')`; `avisos_tipo_ck` admite `'baja_sustituida'`
- [ ] T004 Reflejar la migración en el esquema Drizzle: `apps/server/src/persistencia/esquema/cosmeticos.ts` (`datos`, tipo `celebracion`), `apps/server/src/persistencia/esquema/base.ts` (`perfiles_usuario.celebracion`, `modo_incidencias`) y `apps/server/src/persistencia/esquema/torneo.ts` (o el fichero donde estén `participantes` y `avisos`: `celebracion`, `modo_incidencias`, tipo de aviso `baja_sustituida`)
- [ ] T005 [P] Test de migración `apps/server/tests/integration/migracion-0015.test.ts`, siguiendo `migracion-0014.test.ts`: columnas, valores por defecto, checks (rechaza `modo_incidencias = 'otro'`) y FK de `celebracion`
- [ ] T006 [P] En `packages/domain/src/cosmeticos/tipos.ts`: `TipoCosmetico = 'escudo' | 'sobre' | 'celebracion'`, `interface DatosCelebracion { clase: 'juego' | 'secuencia'; duracionMs: number; sonido?: string }` y `CELEBRACION_DEL_JUEGO = 'celebracion-clasica'`; añadir `type ModoIncidencias = 'automatico' | 'control_total'` (y `MODO_INCIDENCIAS_POR_DEFECTO = 'automatico'`) en el mismo paquete y exportarlo desde el índice de `@fbd/domain`
- [ ] T007 Validación de cosméticos en `packages/domain/src/cosmeticos/` (la función que ya valida el catálogo de la 011): «`datos` obligatorio si `tipo = 'celebracion'` y prohibido en los demás»; «`clase = 'juego'` ⇒ `duracionMs ≤ 3000`»; `duracionMs > 0`. Test en `packages/domain/tests/cosmeticos/celebraciones.test.ts`

**Checkpoint**: `pnpm db:migrate` aplica 0015 y `pnpm typecheck` pasa.

---

## Phase 3: User Story 2 - Barra superior estable y tarjetas con su color (Priority: P1) 🎯 MVP

**Goal**: el campo de la 2D no cambia de tamaño en todo el partido y las tarjetas de «Lo que ha pasado» se ven
amarillas o rojas (FR-018, FR-019, SC-004).

**Independent Test**: partido 2D completo a 1024 y 1440 px midiendo el lienzo al inicio, descanso y final; «Lo que ha
pasado» con amarilla y roja en tema claro y oscuro (quickstart 6 y 7).

- [ ] T008 [P] [US2] Añadir los tokens `--color-tarjeta-amarilla` y `--color-tarjeta-roja` en los dos temas de `apps/web/src/estilos/tokens.css` y las reglas `.icono-amarilla` y `.icono-roja` (color del token; la roja por doble amarilla usa la misma) en `apps/web/src/estilos/base.css` (R9); si `apps/web/tests/unit/tokens.test.ts` enumera tokens, incluirlos
- [ ] T009 [US2] Barra `.franja-2d` de altura fija (token de 48 px de la spec 004) en `apps/web/src/estilos/base.css`: una sola fila desde 1024 px con `grid-template-columns` en `minmax(0, 1fr)` y texto recortado con elipsis; en estrecho, dos filas de altura fija (R8)
- [ ] T010 [US2] En `apps/web/src/pantallas/Partido2D.tsx`, sacar los avisos de malestar de `.franja-2d` al carril lateral y dejar en la franja solo contenido de alto constante (`GoleadoresFranja` recortado, botones)
- [ ] T011 [P] [US2] e2e en `apps/web/tests/e2e/partido-2d.spec.ts`: a 1024 y 1440 px, `getBoundingClientRect()` del lienzo al inicio, en el descanso y al final es idéntico (SC-004); y en «Lo que ha pasado», el color calculado de `.icono-amarilla` y `.icono-roja` coincide con su token en tema claro y oscuro (FR-019)

**Checkpoint**: US2 completa y verificable sola.

---

## Phase 4: User Story 1 - Partido con sonido y celebración de gol (Priority: P1)

**Goal**: pitidos, gol propio/rival y tarjetas suenan en la 2D; cada gol (fuera de la tanda) muestra una celebración
sobre el campo, cosmética y elegible en «Mi perfil» (FR-001 a FR-003, FR-008 a FR-014, SC-002, SC-003).

**Independent Test**: quickstart 1 a 5.

### Sonidos del partido

- [ ] T012 [P] [US1] Añadir a `tools/sonidos/generar.py` los pitidos sintetizados `pitidoInicio` (corto), `pitidoDescanso` (doble) y `pitidoFinal` (triple y más largo), y generar sus ficheros en `apps/web/public/sonidos/`
- [ ] T013 [P] [US1] Conseguir de bancos CC0 (o sintetizar si no hay calidad, marcándolo para sustituir) `golPropio` (público cantando el gol), `golRival` (murmullo) y el «oooh» del público; mezclar con un silbato sintetizado para `tarjetaAmarilla` y `tarjetaRoja` (la roja más intensa); guardar en `apps/web/public/sonidos/` y anotar procedencia y licencia en `apps/web/public/sonidos/LICENCIA`
- [ ] T014 [US1] Registrar los 7 efectos en `Efecto` y `BASE` de `apps/web/src/sonido/sonido.ts`, cada uno con su volumen propio, respetando 🔊 y el volumen general (FR-008)
- [ ] T015 [US1] En `apps/web/src/pantallas/Partido2D.tsx`, en el punto que recorre los eventos vistos (`eventosVistos`), llamar a `reproducir(efecto, Math.min(velocidad, 2))`: `inicio_tramo` → `pitidoInicio`; `fin_tramo` de las partes 1 y 3 → `pitidoDescanso`; final del partido → `pitidoFinal`; `gol` → `golPropio` o `golRival` según el lado del espectador (en propia, el equipo del evento `gol`); `amarilla`/`roja` → `tarjetaAmarilla`/`tarjetaRoja` (FR-001 a FR-003)

### Celebraciones: datos y servidor

- [ ] T016 [P] [US1] Añadir a `data/cosmeticos.json` las 5 celebraciones (todas `gratuito: true`, con `datos`): `celebracion-clasica`, `celebracion-estadio`, `celebracion-neon`, `celebracion-pizarra` (clase `juego`, `duracionMs ≤ 3000`, `activo: true`) y `celebracion-prueba-secuencia` (clase `secuencia`, `activo: false`, duración la del vídeo)
- [ ] T017 [US1] `apps/server/src/persistencia/seed.ts`: cargar `datos` de las celebraciones y validarlas con la validación de T007 (fallo del seed si no cumplen)
- [ ] T018 [P] [US1] Protocolo: en `packages/protocol/src/ws/partido.ts`, `partido.inicio` añade `celebraciones: Record<'local' | 'visitante', { id: string; datos: DatosCelebracion }>`; en `packages/protocol/src/http/cosmeticos.ts`, las celebraciones con `datos`; en `packages/protocol/src/http/perfil.ts` (aspecto), `celebracion: string | null`. Esquemas zod
- [ ] T019 [US1] `apps/server/src/actores/identidad.ts`: al unirse a una partida, copiar `perfiles_usuario.celebracion` a `participantes.celebracion` (como el escudo de la 011)
- [ ] T020 [US1] `apps/server/src/actores/partidoRapido.ts` (donde se emite `partido.inicio`): incluir `celebraciones` con la de `participantes.celebracion` de cada lado leída de la fila en memoria; null o NPC → `CELEBRACION_DEL_JUEGO` (FR-012), sin consultas nuevas
- [ ] T021 [US1] `apps/server/src/http/aspecto.ts`: `GET/PUT /api/perfil/aspecto` con `celebracion` (debe ser cosmético `celebracion` activo o gratuito; si no, `COSMETICO_NO_DISPONIBLE`); `apps/server/src/http/cosmeticos.ts`: `GET /api/cosmeticos` devuelve las celebraciones activas con `datos`
- [ ] T022 [P] [US1] Test de integración `apps/server/tests/integration/celebraciones.test.ts`: seed con las 5, `PUT` aspecto válido e inválido (`celebracion-prueba-secuencia` inactiva → `COSMETICO_NO_DISPONIBLE`), copia al unirse y `celebraciones` en `partido.inicio` (NPC → clásica)

### Celebraciones: cliente

- [ ] T023 [P] [US1] Crear `apps/web/src/componentes/celebraciones/` con las 4 celebraciones de juego (`Clasica.tsx`, `Estadio.tsx`, `Neon.tsx`, `Pizarra.tsx`, visualmente distintas: texto «¡GOL!» grande con animación de entrada, nombre del goleador, escudo o color del equipo) y `registro.ts` con `CELEBRACIONES_JUEGO: Record<string, ComponentType<PropsJuego>>`
- [ ] T024 [US1] `apps/web/src/componentes/celebraciones/CapaCelebracion.tsx` según [contracts/ui.md](contracts/ui.md): props `{ celebracion, equipo, goleador, velocidad, onFin }`; capa absoluta sobre `.partido-2d-zona` con `aria-live="polite"` («Gol de …»); clase `juego` → registro (id desconocido → clásica); clase `secuencia` → `<video muted playsinline autoplay>` con `<source>` `/cosmeticos/celebraciones/<id>.webm` y `<id>.mov`, `playbackRate = velocidad`, `error` → clásica, sonido propio por `reproducir()` si `datos.sonido`; duración `min(duracionMs, 3000 si es de juego) / velocidad`; clic cierra
- [ ] T025 [P] [US1] Estilos de las celebraciones en `apps/web/src/estilos/base.css` (o `componentes.css`): animaciones de entrada de cada estilo y regla `.reducido` / `@media (prefers-reduced-motion: reduce)` que anula `transform`/`scale` y deja solo fundido (FR-014)
- [ ] T026 [US1] Integrar `CapaCelebracion` en `apps/web/src/pantallas/Partido2D.tsx`: con cada evento `gol` visto que no sea de la tanda (`tanda_lanzamiento`), montar la capa con `key` del gol (un gol nuevo reemplaza la anterior), la celebración del lado que marca de `partido.inicio.celebraciones` y la velocidad actual; la 2D no espera a que termine
- [ ] T027 [P] [US1] `apps/web/src/componentes/SelectorCelebracion.tsx` (como `SelectorEscudo.tsx`, con vista previa de la propia `CapaCelebracion` a escala) y montarlo en `apps/web/src/pantallas/Perfil.tsx` junto al de escudo, guardando con `PUT /api/perfil/aspecto` (FR-011)
- [ ] T028 [P] [US1] `apps/web/src/pantallas/Tienda.tsx`: bloque «Celebraciones» con insignia «Próximamente» y sin botones de compra (FR-013)
- [ ] T029 [P] [US1] Celebración de prueba de secuencia: generar un WebM VP9 con alfa corto (texto animado sobre transparente; `.mov` HEVC opcional) en `apps/web/public/cosmeticos/celebraciones/celebracion-prueba-secuencia.webm` y añadir a `apps/web/src/pantallas/PruebasCartas.tsx` un selector de celebración que reproduce cualquiera con `CapaCelebracion` (FR-010a, SC-003)
- [ ] T030 [P] [US1] Test web `apps/web/tests/unit/celebracion.test.tsx`: cada celebración `juego` de `data/cosmeticos.json` existe en `CELEBRACIONES_JUEGO` y tiene `duracionMs ≤ 3000`; id desconocido → clásica; `error` del vídeo → clásica; reemplazo por `key`; clic llama a `onFin`; duración dividida por la velocidad; con movimiento reducido no hay `transform`

**Checkpoint**: US1 completa; quickstart 1 a 5 en verde.

---

## Phase 5: User Story 3 - Gestionar el equipo durante el partido como en Formación (Priority: P2)

**Goal**: «Gestionar equipo» con la distribución de Formación de la 011, solo con titulares y banquillo, sin
personalización (FR-015 a FR-017).

**Independent Test**: quickstart 8.

- [ ] T031 [US3] Extraer de `apps/web/src/pantallas/Alineacion.tsx` el hook `useDistribucion()` (lectura y escritura de `CLAVE_DISTRIBUCION` en `localStorage` con try/catch, regla de 1024 px) a `apps/web/src/componentes/useDistribucion.ts`, y las clases de la mesa con pestañas fijas a CSS compartido; `Alineacion.tsx` pasa a usarlos sin cambio visible
- [ ] T032 [US3] `apps/web/src/componentes/GestionEquipo.tsx`: usar `useDistribucion()` y la mesa con pestañas fijas (campo horizontal desde 1024 px salvo preferencia vertical); mostrar solo `enCampo` y banquillo convocado del `EstadoEquipo` del partido; pestañas Alineación (con sustituciones restantes, tarjetas y lesiones), Táctica y Lanzadores; sin Personalización (FR-015 a FR-017)
- [ ] T033 [P] [US3] e2e en `apps/web/tests/e2e/gestion-equipo.spec.ts`: a 1024 px campo horizontal y pestañas visibles al desplazar el panel; en móvil, vertical; no aparecen no convocados ni «Personalización»; una sustitución se aplica

**Checkpoint**: US3 completa; desbloquea US4.

---

## Phase 6: User Story 4 - Elegir entre gestión automática y control total (Priority: P2)

**Goal**: con «Control total», una lesión o expulsión propia contra un NPC detiene la 2D y la rápida y abre
«Gestionar equipo»; sin decisiones, el partido es idéntico al automático (FR-020 a FR-025, SC-005, SC-006).

**Independent Test**: quickstart 9 a 13.

**Depends on**: Phase 2 y US3.

### Motor (contrato [motor.md](contracts/motor.md))

- [ ] T034 [US4] `packages/engine/src/estado/estado.ts`: `interface Incidencia { lado; jugadorId; motivo: 'lesion' | 'expulsion'; tick; minuto; casillaId: string | null; ancla?; estado: 'pendiente' | 'resuelta_participante' | 'resuelta_automatica' }`, `EstadoMotor.incidencias: Incidencia[]` (inicializado a `[]`) y `EquipoEstado.controlTotal: boolean` (por defecto `false`, fuera de `EntradaPartido`); `ResultadoTramo.incidencias?: Incidencia[]`
- [ ] T035 [US4] `packages/engine/src/acciones/plantel.ts` (y llamadas en `acciones/lesiones.ts` y `acciones/balonParado.ts`): `retirarLesionado()` y `expulsar()` solo retiran al jugador (marcado, fuera del campo, casilla vacía) y anotan una `Incidencia` `pendiente` con su casilla y ancla; nueva `resolverIncidencias(estado)` con la resolución automática de hoy (`mejorSuplente` en la casilla vacía, `cubrirPorteria`, `repartirAnclas`, regla de los 7), que marca `resuelta_automatica`, o `resuelta_participante` si hubo decisión de ese equipo en la parada; siempre cubre portería vacía y reparte anclas si no hubo recolocación ni cambio de formación
- [ ] T036 [US4] `packages/engine/src/tramos/avanzar.ts`: al terminar cada paso, aplicar decisiones con `aplicadaEnTick <= tick`; si hay incidencias pendientes de un equipo con `controlTotal`, ≥ 7 jugadores, fase distinta de `penaltis`/`finalizado` y modo distinto de `final` → cortar con `puntoDecision = true` y `resultado.incidencias` (todas las del paso, una sola parada); si no, `resolverIncidencias()`. En `reanudar()`: `aplicarPendientes()` y luego `resolverIncidencias()`. Sin consumir PRNG entre corte y reanudación
- [ ] T037 [US4] `packages/engine/src/tramos/decisiones.ts`: `validarDecision` admite `sustitucion` cuyo `sale` es el jugador de una incidencia `lesion` pendiente (el que entra ocupa `incidencia.casillaId` y `incidencia.ancla`, gasta un cambio); `sale` expulsado → `JUGADOR_NO_EN_CAMPO`
- [ ] T038 [US4] Test `packages/engine/tests/incidencias.test.ts` con las invariantes I1–I5 (control total sin decisiones ≡ automático en resultado, eventos y estadísticas; con decisiones ≡ reproducción con su `aplicadaEnTick`; lance del rival sin corte; sin corte con < 7, en la tanda o tras el final; PRNG sin avanzar) y el caso «roja y lesión en el mismo paso → una parada»
- [ ] T039 [US4] Regenerar las referencias con semilla fija afectadas por mover la sustitución al final del paso (`packages/engine/tests/fixtures/`, `equivalencia*.test.ts`, `determinismo.test.ts`), pasar `pnpm test:equivalence` y `pnpm balance`; comparar con `specs/012-mejoras-simulacion-2d/balance-antes/` y anotar el resultado en `LEEME.md`. **Si alguna métrica sale de su umbral, parar y revisar antes de seguir con el servidor**

### Servidor y protocolo

- [ ] T040 [P] [US4] Protocolo en `packages/protocol/src/ws/partido.ts`: `partido.pausa_decision.motivo` admite `'incidencia'` con `incidencias?: { jugadorId; motivo: 'lesion' | 'expulsion'; minuto; tick }[]` y `sustitucionesRestantes?`; comando nuevo `partido.modo_incidencias { requestId, partidoId, modo }` y respuesta `partido.modo_incidencias_ok { modo }`; `partido.inicio.modoIncidencias?`. En `packages/protocol/src/http/perfil.ts` (aspecto), `modoIncidencias`
- [ ] T041 [US4] `apps/server/src/actores/identidad.ts` copia `modo_incidencias` del perfil al participante al unirse; `apps/server/src/http/aspecto.ts` lee y guarda `modoIncidencias` en `GET/PUT /api/perfil/aspecto`
- [ ] T042 [US4] `apps/server/src/actores/partidoRapido.ts`: poner `controlTotal` en el `EquipoEstado` del humano al iniciar y en `reconstruirMotor()` solo si `gestionDisponible` (un humano contra NPC); en `jugarTramo()`, `resultado.incidencias` → `abrirPausa()` con `motivo: 'incidencia'`, misma ventana (`descansoS`) y `emitirPausa` con incidencias y cambios restantes; `procesarSeguir` y el vencimiento reanudan (lo no resuelto, automático); el NPC no decide en esta parada; `reconstruirMotor()` avanza «hasta la fase y el tick guardados» con el `MAX` del motor en lugar de 6 `avanzar('parte')`; manejar `partido.modo_incidencias` (`SIN_GESTION` si no procede, actualiza motor en memoria, `participantes` y `perfiles_usuario`, idempotente por `requestId`); `modoIncidencias` en `partido.inicio`
- [ ] T043 [US4] `apps/server/src/actores/partido2d.ts`: en `avanzar2D()`, `r.incidencias` detiene la simulación por delante y abre la pausa con `motivo: 'incidencia'`, como el descanso (R5)
- [ ] T044 [P] [US4] Test `apps/server/tests/integration/incidencias.test.ts` (en los dos modos de hilos): parada en la 2D y en la rápida con lesión propia; «Seguir» sin cambios y ventana vencida → automático y mismo marcador que el automático con la misma semilla; sustitución del lesionado aplicada en esa interrupción; lance del NPC sin parada; entre humanos `partido.modo_incidencias` → `SIN_GESTION`; reconexión durante la parada reconstruye el mismo estado

### Cliente

- [ ] T045 [P] [US4] `apps/web/src/componentes/SelectorModoIncidencias.tsx`: control segmentado «Incidencias: Automático / Control total» con `onCambio`; accesible por teclado
- [ ] T046 [US4] `apps/web/src/pantallas/Partido2D.tsx`: selector en el carril lateral solo con `gestionDisponible` (envía `partido.modo_incidencias`); con `partido.pausa_decision` `motivo: 'incidencia'`, detener `RelojReproduccion` en el tick de la parada, mostrar el aviso («Lesión de Pérez (34'). Te quedan 2 cambios»; «No te quedan cambios» si 0; varias incidencias listadas) y abrir `GestionEquipo`; al confirmar o cerrar → `partido.seguir`
- [ ] T047 [US4] `apps/web/src/pantallas/PartidoRapido.tsx`: con `motivo: 'incidencia'`, el resumen se corta en el minuto del lance con el mismo aviso; principal «Gestionar equipo» (`SituacionAvance = 'gestionar_equipo'`), secundario «Seguir»; selector de modo con `gestionDisponible`
- [ ] T048 [US4] `apps/web/src/componentes/GestionEquipo.tsx`: con incidencia, el lesionado aparece en su casilla marcado como lesionado y se puede soltar un suplente encima (sustitución sobre la incidencia); el expulsado no se puede sustituir
- [ ] T049 [P] [US4] `apps/web/src/pantallas/Alineacion.tsx`: `SelectorModoIncidencias` en la pestaña Táctica de «Preparar equipo», guardando con `PUT /api/perfil/aspecto`
- [ ] T050 [P] [US4] e2e `apps/web/tests/e2e/control-total.spec.ts`: contra NPC en control total, parada por lance propio con aviso y «Gestionar equipo», sustitución aplicada y continuación; en automático no se detiene; entre humanos no aparece el selector

**Checkpoint**: US4 completa; SC-005 y SC-006 cubiertos por T038, T044 y T050.

---

## Phase 7: User Story 5 - Alineación respetada y bajas a la vista (Priority: P2)

**Goal**: la alineación confirmada se mantiene entre jornadas; una baja pendiente bloquea el avance (en el servidor)
hasta resolverla; «Avisos» y «Plantillas» muestran bajas, nombre y escudo (FR-026 a FR-030, SC-007, SC-008).

**Independent Test**: quickstart 14 a 18.

**Depends on**: Phase 2 (aviso `baja_sustituida`).

- [ ] T051 [P] [US5] Crear `packages/domain/src/equipo/bajas.ts` (exportado desde el índice): `bajasPendientes(alineacion, bajas)` → ids de titulares y suplentes convocados de baja; `haySuplenteDisponible(alineacion, plantilla, bajas)` → si queda alguien no titular y sin baja; `cubrirBajas(alineacion, plantilla, bajas, parametros)` → misma alineación con cada baja sustituida por el mejor disponible (misma demarcación primero, luego cualquiera), sin tocar nada más
- [ ] T052 [P] [US5] Test `packages/domain/tests/equipo/bajas.test.ts`: pendientes de titulares y banquillo, sin suplentes, `cubrirBajas` no cambia titulares, banquillo, colocación, formación, táctica ni lanzadores salvo la baja; baja sin suplente de su demarcación → otro fuera de posición
- [ ] T053 [US5] `packages/domain/src/equipo/alineacion.ts`: `validarAlineacion` admite menos de 11 titulares solo si no queda ningún suplente disponible (FR-029); test en `packages/domain/tests/equipo/`
- [ ] T054 [P] [US5] Protocolo: en `packages/protocol/src/http/alineacion.ts`, la vista de equipo añade `bajasPendientes: { jugadorId; motivo: 'lesion' | 'sancion'; partidosRestantes }[]`, `sinSuplentes: boolean` y `avisosEquipo: AvisoEquipo[]` (`nivel: 'intervencion' | 'informativo'`; `tipo: 'baja_pendiente' | 'lesionado' | 'sancionado' | 'disponible' | 'baja_sustituida'`; `jugadorId`; `motivo?`; `partidosRestantes?`; `enlace?: 'formacion'` solo en `baja_pendiente`); en `packages/protocol/src/http/partidos.ts`, error `BAJA_PENDIENTE { jugadores: [{ jugadorId, motivo }] }`; en `packages/protocol/src/http/partidas.ts`, cada plantilla con `nombreEquipo: string`, `escudo: string | null`, `color: string`; tipo de aviso `baja_sustituida`
- [ ] T055 [US5] `apps/server/src/actores/equipo.ts`: `alineacionVigente()` deja de descartar la guardada y la devuelve con `bajasPendientes` y `sinSuplentes` (la automática solo si nunca se confirmó); la vista de equipo deriva `avisosEquipo` de `c.torneo.bajas` y la alineación confirmada («disponible» = baja que llegó a 0 en la última jornada jugada); un jugador que vuelve no entra solo en la alineación
- [ ] T056 [US5] Bloqueo en el servidor: `POST /api/partidos/:id/abrir` (`apps/server/src/http/partidos.ts`) y `POST /api/partidas/:id/siguiente-jornada` (`apps/server/src/http/torneo.ts` / `siguienteJornada` en `apps/server/src/actores/torneo.ts`) devuelven `409 BAJA_PENDIENTE` si `bajasPendientes.length > 0 && !sinSuplentes`
- [ ] T057 [US5] Plazo vencido o NPC al mando: en `alineacionParaPartido()` (`apps/server/src/actores/torneo.ts` / `preparacion.ts`), aplicar `cubrirBajas()` y crear el aviso `baja_sustituida` («Pérez (lesionado) no jugaba: entró García al vencer el plazo») vía `apps/server/src/avisos/servicio.ts` (añadir el tipo a `TipoAviso`); con un solo humano no hay plazo y el bloqueo se mantiene (FR-030)
- [ ] T058 [P] [US5] `apps/server/src/http/partidas.ts` / `gestor.plantillasVisibles`: añadir `nombreEquipo`, `escudo` y `color` de `participantes` a cada plantilla
- [ ] T059 [P] [US5] Test `apps/server/tests/integration/bajas-pendientes.test.ts`: alineación confirmada se mantiene 3 jornadas sin bajas; titular lesionado → `409 BAJA_PENDIENTE` en `abrir` y en `siguiente-jornada`; tras sustituir, el resto igual; sin suplentes → sin 409; dos humanos con plazo vencido → `cubrirBajas` y aviso `baja_sustituida`; plantillas con nombre, escudo y color
- [ ] T060 [P] [US5] Función pura `textoBloqueoBajas(bajas, nombres)` en `apps/web/src/componentes/` («Sustituye a Pérez (lesionado) para continuar», «Sustituye a Pérez (lesionado) y 1 más para continuar»; con `sinSuplentes`, nota «Jugarás con N») y test en `apps/web/tests/unit/textoBloqueoBajas.test.ts`
- [ ] T061 [US5] `apps/web/src/pantallas/Torneo.tsx`: el botón de avanzar (`BarraPrincipal`, «Siguiente jornada»/«Empezar partido») desactivado con `motivoDesactivado = textoBloqueoBajas(...)` cuando hay bloqueo; activo con la nota si `sinSuplentes`; manejar `409 BAJA_PENDIENTE` refrescando la vista
- [ ] T062 [P] [US5] `apps/web/src/componentes/BandejaAvisos.tsx`: arriba los `avisosEquipo` (intervención con icono `advertencia` y enlace a Formación; informativos con `informacion`), separados de los guardados; texto del tipo guardado `baja_sustituida`
- [ ] T063 [P] [US5] `apps/web/src/pantallas/Alineacion.tsx`: marcar las bajas pendientes en el campo y en el banco
- [ ] T064 [P] [US5] `apps/web/src/pantallas/Plantillas.tsx`: cada pestaña con `Chapa` (escudo o color, `apps/web/src/componentes/chapa.ts`) y el nombre del equipo (FR-026)
- [ ] T065 [P] [US5] e2e en `apps/web/tests/e2e/torneo.spec.ts`: con una baja en la alineación, botón desactivado con su mensaje y aviso de intervención; tras sustituir, botón activo; Plantillas con escudo y nombre

**Checkpoint**: US5 completa; SC-007 y SC-008 cubiertos por T059.

---

## Phase 8: User Story 6 - Sonidos del draft, de la interfaz y de la tienda (Priority: P3)

**Goal**: confirmación del draft, latido de los últimos 5 s, clic de botón principal y caja registradora (FR-004 a
FR-008).

**Independent Test**: quickstart 19.

- [ ] T066 [P] [US6] `tools/sonidos/generar.py`: sintetizar `confirmarEleccion` (suave, distinto de `seleccionCarta`), `latido` (5 s con aceleración y crescendo incluidos) y `clicPrincipal` (volumen bajo); conseguir `cajaRegistradora` CC0; ficheros en `apps/web/public/sonidos/` y procedencia en `apps/web/public/sonidos/LICENCIA`
- [ ] T067 [US6] Registrar los 4 efectos en `Efecto` y `BASE` de `apps/web/src/sonido/sonido.ts` con volumen propio
- [ ] T068 [US6] `apps/web/src/pantallas/Draft.tsx`: `confirmarEleccion` una vez al confirmar; `latido` cuando quedan ≤ 5 s sin elegir, cortado con la función que devuelve `reproducir()` al elegir, al acabar el turno o al desmontar
- [ ] T069 [P] [US6] `apps/web/src/componentes/BarraPrincipal.tsx`: `clicPrincipal` al pulsar el botón principal (no los secundarios)
- [ ] T070 [P] [US6] `apps/web/src/pantallas/Tienda.tsx`: `cajaRegistradora` al completar con éxito la compra de un sobre de cartas o de un diseño de sobre

**Checkpoint**: US6 completa.

---

## Phase 9: User Story 7 - Botones de sesión con presencia (Priority: P3)

**Goal**: «Iniciar sesión», «Ya tengo cuenta» y «Cerrar sesión» como botones visibles sin desplazarse (FR-031).

**Independent Test**: quickstart 20.

- [ ] T071 [US7] `apps/web/src/pantallas/Inicio.tsx` y `apps/web/src/estilos/base.css`: sin sesión, «Iniciar sesión» como `boton secundario` con icono `perfil` en la misma fila y altura que «Jugar»; en el alta, «Ya tengo cuenta» (y «Crear una cuenta») como botón secundario; con sesión, «Cerrar sesión» secundario con icono (también en el menú de la cuenta, si existe)
- [ ] T072 [P] [US7] e2e en `apps/web/tests/e2e/navegacion.spec.ts`: a 1440 px y 390 px, los tres botones son `button`/enlace con clase de botón y están dentro del viewport sin desplazarse

**Checkpoint**: US7 completa.

---

## Phase 10: Polish & cierre

- [ ] T073 [P] `docs/juego/sonidos.md`: las siete filas de «Pendientes» pasan a «Sonidos actuales» con fichero, volumen y procedencia, y se añaden las de `pitidoDescanso`, `pitidoFinal`, `tarjetaRoja` y `clicPrincipal` si no estaban (SC-001)
- [ ] T074 [P] `ROADMAP.md`: estado de la spec 012
- [ ] T075 Suite completa: `pnpm typecheck && pnpm lint`, `pnpm test`, `pnpm test:integration` y `test:integration:hilos` en `@fbd/server`, `pnpm test:equivalence`, `pnpm e2e`, `pnpm balance` (comparado con `balance-antes/`)
- [ ] T076 Recorridos 1 a 20 de [quickstart.md](quickstart.md) a mano; anotar los pendientes (p. ej., SC-009 con 5 personas)
- [ ] T077 `graphify update .`
- [ ] T078 Sugerir a la persona el commit con el comando exacto (los agentes no hacen `git commit` ni `git push`)

---

## Dependencies & Execution Order

### Phases

- **Setup (1)**: sin dependencias; T001 antes de tocar el motor (T035).
- **Foundational (2)**: tras Setup; bloquea US1, US4 y US5.
- **US2 (3)**: solo Setup; independiente.
- **US1 (4)**: Foundational.
- **US3 (5)**: independiente (solo cliente).
- **US4 (6)**: Foundational + US3. Dentro: motor (T034–T039) → servidor (T040–T044) → cliente (T045–T050). T039 es una puerta: si `balance` sale de umbral, no se sigue.
- **US5 (7)**: Foundational; independiente de US1–US4.
- **US6 (8)** y **US7 (9)**: independientes. T070 y T028 tocan `Tienda.tsx`: no a la vez.
- **Polish (10)**: tras las historias que se entreguen.

### Ficheros compartidos (no paralelizar entre sí)

- `Partido2D.tsx`: T010, T015, T026, T046.
- `GestionEquipo.tsx`: T032, T048.
- `Alineacion.tsx`: T031, T049, T063.
- `partidoRapido.ts`: T020, T042.
- `identidad.ts` / `aspecto.ts`: T019, T021, T041.
- `sonido.ts`: T014, T067.
- `base.css`: T008, T009, T025, T071.

## Parallel Example

```text
# Foundational, tras T003–T004:
T005 migracion-0015.test.ts   |  T006 tipos de dominio

# US1, en paralelo:
T012 pitidos  |  T013 sonidos CC0  |  T016 cosmeticos.json  |  T018 protocolo  |  T023 celebraciones de juego

# US5, en paralelo:
T051 bajas.ts  |  T054 protocolo  |  T060 textoBloqueoBajas
# y después: T062 BandejaAvisos | T063 Alineacion | T064 Plantillas

# Historias enteras en paralelo (equipos distintos): US2, US3, US5, US6, US7
```

## Implementation Strategy

### MVP

1. Setup (T001–T002).
2. **US2** (T008–T011): arreglo pequeño y la red de SC-004. Se puede entregar ya.
3. Foundational (T003–T007) y **US1** (T012–T030): sonidos y celebraciones. Con US2 y US1 se cubren las dos P1.

### Entrega incremental

4. US3 → US4 (motor con su puerta de balance en T039, luego servidor y cliente).
5. US5 (puede ir en paralelo con US3/US4).
6. US6 y US7.
7. Cierre (T073–T078).

Cada historia se valida con su recorrido del quickstart antes de pasar a la siguiente.
