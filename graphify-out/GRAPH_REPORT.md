# Graph Report - futboosterdraft  (2026-10-19)

## Corpus Check
- 399 files · ~341,568 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 7, .css 2, .example 1)

## Summary
- 2879 nodes · 7426 edges · 153 communities (123 shown, 30 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 404 edges (avg confidence: 0.89)
- Token cost: 517,326 input · 0 output

## Community Hubs (Navigation)
- Replay Clock
- Match Notice & Connection
- Match Persistence
- Game Actor Core
- Actor Registry
- Draft Table Logic
- Rate Limiter & App Builder
- Game Manager
- HTTP App & Auth Wiring
- Notification Service
- Game Repository
- Draft Repository
- Team Repository
- Tournament Repository
- Human-vs-Human Replay Cache
- RNG & Domain Helpers
- Server Bootstrap & DB
- 2D Replay Interpolation
- Web Catalog Store
- Tactics E2E
- Line-up E2E
- Top Scorers Tables
- Async Tournament E2E
- Tactics Panel & Line-up Rules
- NPC Line-up & Draft AI
- 2D Match Actor
- Suspensions & Injuries
- Duels & Shooting
- Field Placement Geometry
- Card Catalog & Core Collection
- Advance Button & Notices
- Tournament Actor
- DB Schema Tables
- Draft Lifecycle & NPC Names
- Parameters & Auto Line-up
- Pack Opening Animation
- Engine Ball Animations
- Free Placement (Tactics Field)
- HTTP Protocol Schemas
- Game Config Domain
- Catalog HTTP Routes
- Navigation Frame
- Resolve-Rest & Candidates
- Fixtures & Scenarios
- Draft Actor
- Auth & Nicknames
- Tournament Screen
- AI Test Helpers
- Set Pieces & Cards
- Web API Client
- E2E Test Helpers
- Basic AI & Index
- Domain Index Exports B
- Team Actor (Line-ups)
- Kit Colors (v1)
- Resolve-Rest Engine
- Human Match Resolution
- Engine Context & Ticks
- Engine Versioning
- Penalty Takers
- Spec 001 Engine Invariants
- Match Event Tests
- Pack Opening E2E
- Spec 003 US8 Tasks
- Match Actions & Receiver
- Domain Index Exports A
- Load Test (k6)
- In-Match NPC Decisions
- Injuries & Squad
- My Games
- Web Dependencies
- Web TS Config
- Spec 003 Games Endpoints
- Web Dev Dependencies
- Web Scripts
- Server TS Config
- AI TS Config
- Domain TS Config
- Engine TS Config
- Protocol TS Config
- Spec 003 Dependencies
- Balance TS Config
- Fixtures TS Config
- Spec 003 Delivery Strategy
- ESLint & Dev Tooling
- Speckit Scripts
- Server Dependencies
- Spec 003 Tasks Structure
- Server Package Config
- Spec 003 HTTP Endpoints
- Balance Package
- Spec Requirements Checklists
- Spec 003 Realtime Protocol
- Spec 003 Manual Scenarios
- TS Base Config
- Spec 003 Data Model
- Spec 003 Research
- Fixtures Package
- Protocol Package
- Spec 001 Contracts Index
- AI Package
- Spec 003 Spec Sections
- Spec 003 User Stories
- Engine Package
- Spec 003 Requirement Groups
- Web Package
- Spec 003 HTTP Changes
- Spec 003 UI Contract
- Domain Package
- Speckit Skills
- Spec 002 Engine Ops
- Team Identity (Kit v2)
- Constitution Governance
- Pause & My Games
- Shirt Numbers (Spec 002)
- Spec 003 Card & Pack UI
- Main Button (US4)
- Match Result Screen (US6)
- Principle X Traceability
- Engine Create Match
- Shirt Number API
- Pack Progress Messages
- Spec 002 Card Design
- Spec 002 Pack Animation
- Card Hover Preview
- Own Goals & Metrics
- Spec 003 Card Design
- Spec 003 Pack Opening
- Resolved Decisions
- Engine Apply Decision
- CartaJugador Concept
- Spec 002 Tasks
- T086 Engine Perf
- T159 Validation
- Spec 002 Validation & Balance
- Spec 003 NPC Difficulty
- CI & Docker Infra
- Spec 001 Entities & API
- Spec 002 Data Model
- Spec 001 Research
- Spec 001 HTTP Contract
- Spec 001 Engine Contract
- Single Pitch & Batch Decisions
- Constitution Principles
- Spec 001 Plan & Monorepo
- Spec 001 Load Results

## God Nodes (most connected - your core abstractions)
1. `vitest` - 68 edges
2. `paso()` - 44 edges
3. `ControladorPartida` - 42 edges
4. `crearServidor()` - 41 edges
5. `Rng` - 40 edges
6. `Spec 001: Fútboosterdraft MVP` - 36 edges
7. `EstadoMotor` - 34 edges
8. `Jugador` - 32 edges
9. `api()` - 32 edges
10. `react` - 31 edges

## Surprising Connections (you probably didn't know these)
- `Notes` --references--> `ParametrosEquilibrado`  [INFERRED]
  specs/003-mejoras-ux-simulacion/tasks.md → packages/domain/src/parametros/index.ts
- `Nombre y equipación (`Sala`, `EditorEquipacion`, `Perfil`, FR-042 a FR-047; research R23, R24)` --references--> `Sala`  [INFERRED]
  specs/003-mejoras-ux-simulacion/contracts/ui.md → apps/web/src/pantallas/Sala.tsx
- ``PUT /api/partidas/:id/equipaciones` (✎)` --references--> `Equipaciones`  [INFERRED]
  specs/003-mejoras-ux-simulacion/contracts/http-api.md → packages/domain/src/equipo/equipaciones.ts
- `5. Perfil de usuario (✚ tabla `perfiles_usuario`)` --references--> `Equipaciones`  [INFERRED]
  specs/003-mejoras-ux-simulacion/data-model.md → packages/domain/src/equipo/equipaciones.ts
- `Source Code (repository root)` --references--> `PartidoRapido()`  [INFERRED]
  specs/003-mejoras-ux-simulacion/plan.md → apps/web/src/pantallas/PartidoRapido.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Invariantes del motor añadidos en la spec 002** — specs_002_mejoras_mvp_contracts_engine_api_invariante_finalizar, specs_002_mejoras_mvp_contracts_engine_api_invariante_cinematica, specs_002_mejoras_mvp_contracts_engine_api_invariante_cortes_ticks, specs_002_mejoras_mvp_contracts_engine_api_invariante_fotogramas [EXTRACTED 1.00]
- **Ciclo SDD speckit (specify, plan, tasks, implement)** — _specify_workflows_speckit_workflow, _claude_skills_speckit_specify_skill, _claude_skills_speckit_plan_skill, _claude_skills_speckit_tasks_skill, _claude_skills_speckit_implement_skill [EXTRACTED 1.00]
- **Un motor, dos modalidades (rápida y 2D equivalentes)** — specs_001_draft_manager_mvp_spec_motor_unico, specs_001_draft_manager_mvp_contracts_engine_api_avanzar, specs_001_draft_manager_mvp_contracts_engine_api_invariante_equivalencia, specs_001_draft_manager_mvp_spec_sc_008_equivalencia, specs_001_draft_manager_mvp_research_r7_motor_determinista, specs_001_draft_manager_mvp_spec_us6_simulacion_2d [EXTRACTED 1.00]
- **Colocacion libre, zonas y penalizacion por posicion efectiva** — specs_002_mejoras_mvp_data_model_zona, specs_002_mejoras_mvp_data_model_alineacion_colocacion, specs_002_mejoras_mvp_data_model_penalizacionporposicion, specs_002_mejoras_mvp_research_r13_colocacion_zonas, specs_002_mejoras_mvp_research_r12_penalizacion [EXTRACTED 1.00]
- **Flujo unico de resolucion de partidos (finalizar, plazo, entre humanos, NPC)** — specs_002_mejoras_mvp_research_r7_resolverresto, specs_002_mejoras_mvp_research_r8_partidos_entre_humanos, specs_002_mejoras_mvp_spec_fr026_finalizacion_anticipada, specs_002_mejoras_mvp_data_model_partido_resolucion, specs_002_mejoras_mvp_research_r6_bufer_anticipacion [EXTRACTED 1.00]
- **Campo unico reutilizado en Formacion y gestion del partido** — specs_003_mejoras_ux_simulacion_plan_campoequipo, specs_003_mejoras_ux_simulacion_plan_vistacarta, specs_003_mejoras_ux_simulacion_plan_gestionequipo, specs_003_mejoras_ux_simulacion_tasks_t040_reductor_campo [EXTRACTED 1.00]
- **Dificultad NPC por calidad de decision y su medicion** — specs_003_mejoras_ux_simulacion_research_r12_errores_npc, specs_003_mejoras_ux_simulacion_research_guardarrail_errores, specs_003_mejoras_ux_simulacion_research_r13_participante_referencia, specs_003_mejoras_ux_simulacion_spec_fr_037_dificultad_por_decision, specs_003_mejoras_ux_simulacion_spec_sc_010a_equivalencia_npc [EXTRACTED 1.00]
- **Modalidad de simulacion por participante** — specs_003_mejoras_ux_simulacion_data_model_modosimulacion, specs_003_mejoras_ux_simulacion_data_model_partidos_modalidades, specs_003_mejoras_ux_simulacion_contracts_http_api_post_partido_abrir, specs_003_mejoras_ux_simulacion_contracts_realtime_protocol_preparacion_inicio, specs_003_mejoras_ux_simulacion_plan_selectormodo [EXTRACTED 1.00]
- **Cambios del motor 3.0.0 para US1 calibrados en orden R8** — specs_003_mejoras_ux_simulacion_research_r3_receptor, specs_003_mejoras_ux_simulacion_research_r4_pase_largo_motivo, specs_003_mejoras_ux_simulacion_research_r5_conduccion_espacio, specs_003_mejoras_ux_simulacion_research_r9_factorstat, specs_003_mejoras_ux_simulacion_research_r6_tiro_distancia, specs_003_mejoras_ux_simulacion_research_r7_balon_parado, specs_003_mejoras_ux_simulacion_research_r8_orden_calibracion [EXTRACTED 1.00]
- **Validación de calidad del motor (CI, equivalencia, balance, carga)** — _github_workflows_ci, readme_pnpm_test_equivalence, readme_pnpm_balance, tools_load_readme_beta_100 [INFERRED 0.75]
- **Flujo «Finalizar partido» (UI -> WS -> resolverResto -> invariante)** — specs_002_mejoras_mvp_contracts_ui_finalizar_partido, specs_002_mejoras_mvp_contracts_realtime_protocol_partido_finalizar, specs_002_mejoras_mvp_contracts_engine_api_resolverresto, specs_002_mejoras_mvp_contracts_engine_api_invariante_finalizar [INFERRED 0.85]
- **Previsualización de alineación y colocación libre** — specs_002_mejoras_mvp_contracts_ui_colocacion_libre, specs_002_mejoras_mvp_contracts_http_api_post_alineacion_previsualizar, specs_002_mejoras_mvp_contracts_engine_api_previsualizar, specs_002_mejoras_mvp_contracts_engine_api_statsefectivos, specs_002_mejoras_mvp_contracts_engine_api_zonaen [INFERRED 0.85]
- **Plantillas spec-kit consumidas por los skills** — _specify_templates_checklist_template, _specify_templates_constitution_template, _specify_templates_plan_template, _specify_templates_spec_template, _specify_templates_tasks_template [INFERRED 0.85]
- **Flujo de draft: mesa, sobres y elecciones** — specs_001_draft_manager_mvp_data_model_mesa_draft, specs_001_draft_manager_mvp_data_model_sobre, specs_001_draft_manager_mvp_data_model_eleccion, specs_001_draft_manager_mvp_contracts_realtime_protocol_draft_turno, specs_001_draft_manager_mvp_contracts_realtime_protocol_draft_elegir, specs_001_draft_manager_mvp_spec_booster_draft [INFERRED 0.85]
- **Integridad multijugador: autoridad, duplicados y visibilidad** — specs_001_draft_manager_mvp_spec_integridad_servidor, specs_001_draft_manager_mvp_spec_visibilidad_informacion, specs_001_draft_manager_mvp_contracts_realtime_protocol_requestid_dedup, specs_001_draft_manager_mvp_contracts_http_api_idempotency_key, specs_001_draft_manager_mvp_research_r4_actor_por_partida, specs_001_draft_manager_mvp_contracts_realtime_protocol_estado_snapshot [INFERRED 0.85]
- **Pipeline de simulacion 2D: capa espacial, acciones, fotogramas y reloj** — specs_002_mejoras_mvp_research_r3_capa_espacial, specs_002_mejoras_mvp_research_r4_seleccion_acciones, specs_002_mejoras_mvp_research_r5_fotogramas_hermite, specs_002_mejoras_mvp_research_r2_reloj_reproduccion, specs_002_mejoras_mvp_data_model_estadomotor_espacio [INFERRED 0.85]
- **Identidad del equipo: nombre y equipacion v2** — specs_003_mejoras_ux_simulacion_data_model_nombreequipo, specs_003_mejoras_ux_simulacion_data_model_equipacion_v2, specs_003_mejoras_ux_simulacion_research_perfiles_usuario, specs_003_mejoras_ux_simulacion_contracts_http_api_put_api_partidas_id_nombre_equipo, specs_003_mejoras_ux_simulacion_contracts_http_api_perfil, specs_003_mejoras_ux_simulacion_contracts_ui_editorequipacion [INFERRED 0.85]
- **Flujo de derrota, campeon y simular el resto** — specs_003_mejoras_ux_simulacion_data_model_eliminacion, specs_003_mejoras_ux_simulacion_data_model_vista_torneo_participante, specs_003_mejoras_ux_simulacion_contracts_http_api_post_api_partidas_id_simular_resto, specs_003_mejoras_ux_simulacion_contracts_http_api_post_api_partidas_id_pantalla_vista, specs_003_mejoras_ux_simulacion_plan_pantallas_derrota_campeon, specs_003_mejoras_ux_simulacion_contracts_realtime_protocol_torneo_actualizado [INFERRED 0.95]

## Communities (153 total, 30 thin omitted)

### Community 26 - "Replay Clock"
Cohesion: 0.08
Nodes (17): RelojReproduccion, AlmacenFalso, Props, EstadoReloj, MotivoPausa, OpcionesReloj, Velocidad, guardarVelocidad() (+9 more)

### Community 38 - "Match Notice & Connection"
Cohesion: 0.13
Nodes (12): ConexionPartida, ParticipanteActivo, EstadoServidor, MensajeServidor, Oyente, EstadoPartidaActiva, Preparacion, useConexion() (+4 more)

### Community 22 - "Match Persistence"
Cohesion: 0.07
Nodes (10): Temporizadores, RepoPartidos, RepoVisionados, Pendiente, Reloj, Ejecutor, Resolucion, ResumenPartido (+2 more)

### Community 39 - "Game Actor Core"
Cohesion: 0.14
Nodes (8): ControladorPartida, ActorPartida, MesaPersistida, FilaParticipante, FilaPartida, ServiciosPartida, pendientesDeMesa(), vistaDraft()

### Community 79 - "Actor Registry"
Cohesion: 0.18
Nodes (3): RegistroActores, Destino, MensajeSaliente

### Community 23 - "Draft Table Logic"
Cohesion: 0.13
Nodes (31): ErrorDraft, CodigoErrorDraft, Eleccion, Mesa, OrigenEleccion, SobreEnJuego, VistaDraft, Ronda (+23 more)

### Community 34 - "Rate Limiter & App Builder"
Cohesion: 0.13
Nodes (8): Pasarela, Limitador, Manejador, OpcionesPasarela, Difusor, crearServidor(), claveSesion(), construirApp()

### Community 50 - "Game Manager"
Cohesion: 0.19
Nodes (3): GestorPartidas, registrarRutasPartidas(), programarBusqueda()

### Community 11 - "HTTP App & Auth Wiring"
Cohesion: 0.10
Nodes (24): AlmacenPeticionesMemoria, AlmacenPeticionesBD, Auth, ErrorApi, ResultadoComando, Metricas, BaseDatos, AlmacenPeticiones (+16 more)

### Community 87 - "Notification Service"
Cohesion: 0.20
Nodes (3): ServicioAvisos, NuevoAviso, nodemailer

### Community 32 - "Game Repository"
Cohesion: 0.09
Nodes (17): RepoPartidas, EstadoPartida, Complexity Tracking, Constitution Check, Documentation (this feature), Implementation Plan: Mejoras de interfaz, simulación y experiencia de juego, Project Structure, Riesgos y mitigaciones (+9 more)

### Community 48 - "Human-vs-Human Replay Cache"
Cohesion: 0.15
Nodes (10): CacheReproducciones, Tramos, EntradaGuardada, rehacer(), reproduccion(), equipacionesDelPartido(), resumenAlineaciones(), registrarRutasPartidos() (+2 more)

### Community 1 - "RNG & Domain Helpers"
Cohesion: 0.06
Nodes (58): Rng, EstadisticasEquipo, Campo, Comprobacion, ResultadoSerie, FilaClasificacion, ResultadoLiga, CrucePartido (+50 more)

### Community 0 - "Server Bootstrap & DB"
Cohesion: 0.06
Nodes (68): ClienteWs, ResultadoValidacion, ConexionBD, ServidorPruebas, BdPruebas, Mensaje, UsuarioPrueba, ErrorSeed (+60 more)

### Community 10 - "2D Replay Interpolation"
Cohesion: 0.09
Nodes (40): Escena, JugadorDibujo, Lanzamiento, Fotograma, Posiciones, AccionVista, DatosReproduccion, LanzamientoVista (+32 more)

### Community 101 - "Web Catalog Store"
Cohesion: 0.33
Nodes (5): EstadoCatalogo, TextoSpecial, useTextosSpecials(), zustand, useCatalogo

### Community 102 - "Tactics E2E"
Cohesion: 0.43
Nodes (6): Carta, Datos, abrir(), arrastrar(), campo(), ficha()

### Community 109 - "Line-up E2E"
Cohesion: 0.40
Nodes (4): Carta, casilla(), colocar(), DEL

### Community 110 - "Top Scorers Tables"
Cohesion: 0.47
Nodes (5): FilaTabla, OpcionesTabla, tabla(), tablaAsistentes(), tablaGoleadores()

### Community 12 - "Tactics Panel & Line-up Rules"
Cohesion: 0.07
Nodes (34): EquipoPartido, Props, Alineacion, CodigoErrorAlineacion, ErrorAlineacion, Previsualizacion, Titular, PuntoColocacion (+26 more)

### Community 13 - "NPC Line-up & Draft AI"
Cohesion: 0.12
Nodes (34): ParametrosEquilibrado, Semilla, OpcionesAlineacion, OpcionesDraft, PesosEvaluacion, PerfilNPC, NivelNPC, decidirAlineacion() (+26 more)

### Community 14 - "2D Match Actor"
Cohesion: 0.09
Nodes (31): Estado2D, Resultado, Tramo2D, PartidoEnCurso, ResultadoComandoPartido, FilaPartido, avanzar2D(), crearEstado2D() (+23 more)

### Community 16 - "Suspensions & Injuries"
Cohesion: 0.09
Nodes (31): Baja, EstadoBajas, EventoConsecuencia, MotivoBaja, PartidoConsecuencias, Cruce, Cuadro, TipoRonda (+23 more)

### Community 17 - "Duels & Shooting"
Cohesion: 0.13
Nodes (34): ResultadoTiro, Duelo, OpcionesTiro, JugadorEnPartido, Atributo, S, controlPorRitmo(), emitir() (+26 more)

### Community 18 - "Field Placement Geometry"
Cohesion: 0.13
Nodes (37): Movil, PosicionMovil, Linea, Punto, colocarSaqueInicial(), objetivosBalonParado(), puntoSaqueCentro(), rival() (+29 more)

### Community 2 - "Card Catalog & Core Collection"
Cohesion: 0.05
Nodes (61): SpecialDEF, SpecialDEL, SpecialGenerico, SpecialMED, SpecialPOR, Stats, StatsDe, StatsDEF (+53 more)

### Community 21 - "Advance Button & Notices"
Cohesion: 0.12
Nodes (30): AlineacionPartido, Props, Ack, Inicio, EstadisticasEquipo, EventoVista, Props, Tramo (+22 more)

### Community 24 - "Tournament Actor"
Cohesion: 0.14
Nodes (33): DependenciasTorneo, ResultadoAbrir, ResultadoSiguienteJornada, TipoAviso, abandonar(), abrirSiguienteJornada(), avisarHumanos(), despuesDePartido() (+25 more)

### Community 25 - "DB Schema Tables"
Cohesion: 0.10
Nodes (25): Ejecutor, Tx, Ejecutor, Tx, Ejecutor, Tx, Ejecutor, FilaJornada (+17 more)

### Community 28 - "Draft Lifecycle & NPC Names"
Cohesion: 0.15
Nodes (25): CrearPartida, iniciarDraft(), terminarDraft(), nombresNPC(), abandonarPartidaInvitado(), alCambiarConexion(), anadirNPC(), emitirSala() (+17 more)

### Community 29 - "Parameters & Auto Line-up"
Cohesion: 0.10
Nodes (21): GravedadLesion, RolPenalizacion, banquillo(), codigos(), catalogoCore(), jugador(), plantillaEquilibrada(), alineacionValida() (+13 more)

### Community 3 - "Pack Opening Animation"
Cohesion: 0.07
Nodes (47): BajaVista, DatosEquipo, Turno, PlantillaParticipante, Fase, Props, CasillaVista, Props (+39 more)

### Community 31 - "Engine Ball Animations"
Cohesion: 0.18
Nodes (28): TipoBalon, pasar(), separar(), seguirBalon(), holgura(), abrir(), balonCon(), cerrar() (+20 more)

### Community 35 - "Free Placement (Tactics Field)"
Cohesion: 0.14
Nodes (24): Props, ResultadoColocacion, TitularColocado, LineaZona, Tramo, Zona, validarColocacion(), acotar() (+16 more)

### Community 4 - "HTTP Protocol Schemas"
Cohesion: 0.04
Nodes (49): MisPartidas, PartidaResumen, ResumenPartida, JugadorResumen, MsgDraftEleccionAuto, MsgDraftElegir, MsgDraftProgreso, MsgDraftTerminado (+41 more)

### Community 40 - "Game Config Domain"
Cohesion: 0.12
Nodes (22): ConfigPartida, ErrorConfig, EventoPartida, ParticipanteRitmo, TiemposPartida, TipoSimulacion, TipoUsuario, configPorDefecto() (+14 more)

### Community 43 - "Catalog HTTP Routes"
Cohesion: 0.11
Nodes (5): Catalogo, ambitoSpecial(), filaAJugador(), registrarRutasCatalogo(), TEXTOS_SPECIALS

### Community 44 - "Navigation Frame"
Cohesion: 0.14
Nodes (20): Salida, Efecto, Marco(), partidaDeRuta(), salidaDe(), humanosActivos(), cambiarSonido(), cargar() (+12 more)

### Community 45 - "Resolve-Rest & Candidates"
Cohesion: 0.19
Nodes (17): Muestra, DecisionRegistrada, ContextoStats, hasta(), crearPartido(), jugar(), aplicarDecision(), decidir() (+9 more)

### Community 46 - "Fixtures & Scenarios"
Cohesion: 0.17
Nodes (15): Escenario, NombreEscenario, autor(), generarEscenarios(), buscar(), principal(), cumpleEscenario(), entradaEscenario() (+7 more)

### Community 51 - "Draft Actor"
Cohesion: 0.21
Nodes (16): ContextoComando, ResultadoEleccion, Resultado, todosEligieron(), abandonarDraft(), abrirTurno(), eleccionNPC(), emitirProgreso() (+8 more)

### Community 53 - "Auth & Nicknames"
Cohesion: 0.17
Nodes (18): OpcionesAuth, UsuarioSesion, FastifyRequest, OpcionesRutasAuth, ContextoConexion, apodoValido(), aUsuarioSesion(), crearAuth() (+10 more)

### Community 54 - "Tournament Screen"
Cohesion: 0.15
Nodes (19): FilaClasificacion, FilaGoleador, JornadaVista, Marcador, PartidoVista, Pestana, Ref, ResumenPartida (+11 more)

### Community 55 - "AI Test Helpers"
Cohesion: 0.17
Nodes (16): casilla, Posicion, TitularPrevisualizado, DestinoPosicion, StatsEfectivos, asignar(), claseDestino(), demarcacionDeRol() (+8 more)

### Community 58 - "Set Pieces & Cards"
Cohesion: 0.20
Nodes (16): TipoTiro, TipoAccion, OpcionesAvance, gol(), amarilla(), falta(), faltaDirecta(), penalti() (+8 more)

### Community 6 - "Web API Client"
Cohesion: 0.08
Nodes (36): Usuario, EstadoSesion, Modo, ParticipanteSala, Sala, NivelNPC, ErrorApi, OpcionesPeticion (+28 more)

### Community 66 - "E2E Test Helpers"
Cohesion: 0.21
Nodes (4): Carta, Torneo, partidaTrasDraft(), @playwright/test

### Community 67 - "Basic AI & Index"
Cohesion: 0.13
Nodes (9): Rendimiento, elegirCartaBasico(), i, local, MAX_PARTIDO_MS, MAX_RESOLVER_RESTO_MS, parametros, t0 (+1 more)

### Community 68 - "Domain Index Exports B"
Cohesion: 0.20
Nodes (10): DecisionPartido, ResultadoDecision, aplicarPendientes(), aplicarUna(), equipoDe(), error(), validarAsignacion(), validarDecision() (+2 more)

### Community 7 - "Team Actor (Line-ups)"
Cohesion: 0.10
Nodes (39): Equipaciones, AlineacionEntrada, EquipacionesEntrada, ErrorDorsales, cuerpoError(), alineacionAutomatica(), alineacionVigente(), bajasActivas() (+31 more)

### Community 72 - "Kit Colors (v1)"
Cohesion: 0.25
Nodes (14): Equipacion, ErrorEquipaciones, colorDeContraste(), distanciaColor(), equipacionEnPartido(), luminancia(), relacionContraste(), rgb() (+6 more)

### Community 73 - "Resolve-Rest Engine"
Cohesion: 0.24
Nodes (13): ResultadoResolverResto, NivelesPartido, ResultadoTramo, resolverResto(), comprobar(), conProrroga(), jugarHasta(), parada() (+5 more)

### Community 75 - "Human Match Resolution"
Cohesion: 0.23
Nodes (12): OpcionesJornada, vencerJornada(), abrirPartido(), resolverPartidoEntreHumanos(), esHumano(), forzarFinal(), iniciarPartido(), sinHumanos() (+4 more)

### Community 8 - "Engine Context & Ticks"
Cohesion: 0.10
Nodes (39): EstadoMotor, AccionVisible, Estadisticas, EventoPartido, Fase, Marcador, ModoAvance, RolEvento (+31 more)

### Community 91 - "Engine Versioning"
Cohesion: 0.31
Nodes (8): VersionNoSoportada, parametrosPorVersion(), versionMayor(), reconstruirMotor(), R2. Parámetros 3.0.0 y partidos de la versión 2 (FR-016 a FR-023), Implementation, Phase 2: Foundational (Blocking Prerequisites), Tests (escribir primero; deben fallar)

### Community 97 - "Penalty Takers"
Cohesion: 0.32
Nodes (7): Special, TipoLanzamiento, lanzadorEfectivo(), valorLanzamiento(), candidatos(), SPECIAL_DE, STAT_DE

### Community 98 - "Spec 001 Engine Invariants"
Cohesion: 0.29
Nodes (8): EntradaPartido, Comportamiento (reglas comprobables), Contrato del motor de simulación — cambios de la spec 003, Entrada, Invariantes comprobados por pruebas, Operaciones, Rendimiento, Salida: estadísticas

### Community 105 - "Match Event Tests"
Cohesion: 0.38
Nodes (5): tanda(), partido(), enDescanso(), resultados, todos

### Community 124 - "Spec 003 US8 Tasks"
Cohesion: 0.67
Nodes (3): Implementation for User Story 8, Phase 10: User Story 8 — Abrir sobres con espectáculo (Priority: P2), Tests for User Story 8 ⚠️

### Community 27 - "Match Actions & Receiver"
Cohesion: 0.16
Nodes (31): jugadorPorId(), ajusteSpecialsAccion(), alLadoDe(), esPase(), paso(), perder(), portadorActual(), puntoCelda() (+23 more)

### Community 30 - "Domain Index Exports A"
Cohesion: 0.13
Nodes (10): jugar(), entrada(), equipo(), jugador(), rngDePrueba(), conMCArriba(), ctxDe(), TIPOS (+2 more)

### Community 49 - "Load Test (k6)"
Cohesion: 0.13
Nodes (20): cabeceras(), cookieDe(), crearUsuario(), hex(), jugar(), post(), uuid(), apertura (+12 more)

### Community 60 - "In-Match NPC Decisions"
Cohesion: 0.12
Nodes (4): decidirEnPartido(), iguales(), TACTICA_DEFENSIVA, TACTICA_OFENSIVA

### Community 61 - "Injuries & Squad"
Cohesion: 0.25
Nodes (15): comprobarInferioridad(), comprobarLesion(), sortearGravedad(), cubrirPorteria(), expulsar(), mejorSuplente(), quitarDelCampo(), retirarLesionado() (+7 more)

### Community 86 - "My Games"
Cohesion: 0.20
Nodes (7): accionYRival(), misPartidas(), EN_CURSO, FilaGoleadores, MsgAviso, MsgTorneoActualizado, Ref

### Community 100 - "Web Dependencies"
Cohesion: 0.29
Nodes (7): dependencies, @fbd/domain, @fbd/protocol, react, react-dom, react-router, zustand

### Community 103 - "Web TS Config"
Cohesion: 0.29
Nodes (6): compilerOptions, jsx, lib, extends, include, ../../tsconfig.base.json

### Community 106 - "Spec 003 Games Endpoints"
Cohesion: 0.38
Nodes (7): `GET /api/partidas/:id/torneo` (✎), Partidas, `POST /api/partidas` (✎), `POST /api/partidas/:id/pantalla-vista` (✚), `POST /api/partidas/:id/simular-resto` (✚), Eliminacion (eliminaciones, humanosEnCompeticion), PantallaDerrota y PantallaCampeon

### Community 107 - "Web Dev Dependencies"
Cohesion: 0.33
Nodes (6): devDependencies, @playwright/test, @types/react, @types/react-dom, vite, @vitejs/plugin-react

### Community 108 - "Web Scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, e2e, preview, typecheck

### Community 113 - "Server TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, extends, include, ../../tsconfig.base.json

### Community 116 - "AI TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, extends, include, ../../tsconfig.base.json

### Community 117 - "Domain TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, extends, include, ../../tsconfig.base.json

### Community 118 - "Engine TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, extends, include, ../../tsconfig.base.json

### Community 119 - "Protocol TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, extends, include, ../../tsconfig.base.json

### Community 120 - "Spec 003 Dependencies"
Cohesion: 0.40
Nodes (5): Dependencies & Execution Order, Grafo de historias, Parallel Opportunities, Phase Dependencies, Within Each User Story

### Community 121 - "Balance TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, extends, include, ../../tsconfig.base.json

### Community 122 - "Fixtures TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, extends, include, ../../tsconfig.base.json

### Community 126 - "Spec 003 Delivery Strategy"
Cohesion: 0.50
Nodes (4): Entrega incremental, Equipo en paralelo, Implementation Strategy, MVP primero (historias P1)

### Community 15 - "ESLint & Dev Tooling"
Cohesion: 0.05
Nodes (40): sinNoDeterminismo, devDependencies, eslint, @eslint/js, fast-check, globals, prettier, tsx (+32 more)

### Community 19 - "Speckit Scripts"
Cohesion: 0.11
Nodes (30): check-prerequisites.sh script, check_dir(), check_file(), find_specify_root(), format_speckit_command(), get_current_branch(), get_feature_paths(), get_invoke_separator() (+22 more)

### Community 20 - "Server Dependencies"
Cohesion: 0.05
Nodes (38): dependencies, ajv, ajv-formats, better-auth, drizzle-orm, fastify, @fastify/compress, @fastify/cookie (+30 more)

### Community 42 - "Spec 003 Tasks Structure"
Cohesion: 0.08
Nodes (24): Format: `[ID] [P?] [Story] Description`, Implementation for User Story 4, Implementation for User Story 7, Notes, Parallel Example: User Story 11, Parallel Example: User Story 1 (motor), Path Conventions (monorepo de las specs 001 y 002), Phase 11: User Story 9 — NPC más accesibles en los niveles bajos (Priority: P2) (+16 more)

### Community 47 - "Server Package Config"
Cohesion: 0.09
Nodes (19): exports, name, private, type, version, drizzle-kit, @fastify/compress, @fastify/cookie (+11 more)

### Community 52 - "Spec 003 HTTP Endpoints"
Cohesion: 0.13
Nodes (21): `PUT /api/partidas/:id/nombre-equipo` (✚), `preparacion.inicio` (✎), VersionNoSoportada (parametros < 3), GET /api/partidos/:id/reproduccion?modalidad, GET/PUT /api/perfil, POST /api/partidos/:id/abrir (modalidad), PUT /api/partidas/:id/equipaciones (v2), Sala, EditorEquipacion y Perfil (nombre y equipacion) (+13 more)

### Community 57 - "Balance Package"
Cohesion: 0.11
Nodes (18): bin, balance, dependencies, @fbd/ai, @fbd/domain, @fbd/engine, exports, name (+10 more)

### Community 59 - "Spec Requirements Checklists"
Cohesion: 0.13
Nodes (13): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Mejoras de interfaz, simulación y experiencia de juego, avanzar(estado, modo, opciones), OpcionesAvance (fotogramas, metricas), Penalti por criterio espacial (FR-020) (+5 more)

### Community 62 - "Spec 003 Realtime Protocol"
Cohesion: 0.12
Nodes (15): `estado` (✎), Cliente → servidor, Garantías de orden (añadidas), `partido.decision_aplicada` (sin cambios de forma), `partido.decisiones` (✚), `partido.inicio` (✎), `partido.reproduccion` (sin cambios), Protocolo en tiempo real — cambios de la spec 003 (+7 more)

### Community 63 - "Spec 003 Manual Scenarios"
Cohesion: 0.12
Nodes (17): A. Simulación 2D que parece fútbol (US1; SC-001 a SC-008), B. «Formación» con un único campo (US2; SC-014, SC-015), C. Modo de simulación por partido (US3; SC-018), D. Botón principal (US4; SC-013), E. Gestión del equipo en el descanso y durante la 2D (US5; SC-016), Escenarios de validación manual, F. Finalizar partido (US6; SC-017), G. Cartas (US7; SC-012) (+9 more)

### Community 64 - "TS Base Config"
Cohesion: 0.12
Nodes (16): compilerOptions, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+8 more)

### Community 70 - "Spec 003 Data Model"
Cohesion: 0.12
Nodes (16): 10. Resumen de relaciones (añadidos), 3.1 Nombre de equipo (regla de dominio), 3. Participante (tabla `participantes`), 4. Equipación (`Equipacion` v2), 5. Perfil de usuario (✚ tabla `perfiles_usuario`), 7.1 Partido (tabla `partidos`), 7.2 Estadísticas de equipo (`EstadisticasEquipo`) — añadidos, 7.4 Métricas por jugador (`MetricasJugador`) — ✚, no se guardan (+8 more)

### Community 71 - "Spec 003 Research"
Cohesion: 0.12
Nodes (16): R10. Peso medible de los specials (FR-022, SC-007), R15. Vista ampliada de la carta (FR-004, FR-005, SC-015), R1. Línea base del motor actual y diagnóstico (US1), R20. Diseño de las cartas (FR-008 a FR-010, SC-012), R23. Nombre del equipo y perfil de la cuenta (FR-042 a FR-044, SC-021), R25. Verificación de los criterios de éxito, R4. Pase largo solo con motivo táctico (FR-016, SC-004), R5. Conducción cuando hay espacio (FR-016, SC-005) (+8 more)

### Community 74 - "Fixtures Package"
Cohesion: 0.13
Nodes (14): dependencies, @fbd/domain, @fbd/engine, exports, name, private, scripts, generar-core (+6 more)

### Community 76 - "Protocol Package"
Cohesion: 0.14
Nodes (13): dependencies, @fbd/domain, zod, exports, ./schemas/*, name, private, scripts (+5 more)

### Community 78 - "Spec 001 Contracts Index"
Cohesion: 0.31
Nodes (5): ResultadoPartido, EstadisticasEquipo (pases y tiros por zona, golesPorTipo), TipoTiro (propia) y zonaRemate en eventos de tiro/gol, Escenarios de validacion manual A a L, Linea base de comparacion (worktree c8a1627)

### Community 80 - "AI Package"
Cohesion: 0.15
Nodes (12): dependencies, @fbd/domain, @fbd/engine, exports, name, private, scripts, typecheck (+4 more)

### Community 82 - "Spec 003 Spec Sections"
Cohesion: 0.15
Nodes (13): Assumptions, Clarifications, Feature Specification: Mejoras de interfaz, simulación y experiencia de juego, Key Entities *(include if feature involves data)*, Measurable Outcomes, Requirements *(mandatory)*, Requisitos de specs anteriores afectados, Session 2026-10-18 (+5 more)

### Community 83 - "Spec 003 User Stories"
Cohesion: 0.15
Nodes (13): Edge Cases, User Scenarios & Testing *(mandatory)*, User Story 10 - Celebrar al campeón, despedir al eliminado y no esperar tras caer (Priority: P3), User Story 11 - Nombre y equipación a mi gusto (Priority: P3), User Story 1 - Simulación 2D que parece fútbol de verdad (Priority: P1), User Story 2 - Preparar el equipo sobre un único campo con cartas a la vista (Priority: P1), User Story 3 - Elegir el modo de simulación antes de cada partido (Priority: P1), User Story 4 - Botones principales visibles y siempre a mano (Priority: P1) (+5 more)

### Community 84 - "Engine Package"
Cohesion: 0.17
Nodes (11): @fbd/domain, dependencies, @fbd/domain, exports, name, private, scripts, bench (+3 more)

### Community 85 - "Spec 003 Requirement Groups"
Cohesion: 0.17
Nodes (12): Apertura de los sobres (US8), Botones principales (US4), Dificultad de los NPC (US9), Diseño de las cartas (US7), Feedback de derrota y de campeón (US10), Finalización anticipada (US6), Functional Requirements, Gestión del equipo en el descanso (US5) (+4 more)

### Community 88 - "Web Package"
Cohesion: 0.20
Nodes (9): name, private, type, version, @fbd/protocol, @types/react, @types/react-dom, vite (+1 more)

### Community 89 - "Spec 003 HTTP Changes"
Cohesion: 0.18
Nodes (11): Contrato HTTP/JSON — cambios de la spec 003, `GET /api/partidas/:id/alineacion` (✎), `GET /api/partidos/:id` (✎), `GET /api/partidos/:id/reproduccion?modalidad=rapida|2d` (✎), `GET /api/perfil`, Partidos, Perfil de usuario (✚), Plantilla, alineación y equipaciones (+3 more)

### Community 90 - "Spec 003 UI Contract"
Cohesion: 0.18
Nodes (10): Barra principal (`BarraPrincipal`, FR-006, FR-007; research R16), Carta de jugador (`CartaJugador`, FR-008 a FR-010; research R20), Contrato de interfaz — spec 003, Derrota y campeón (`PantallaDerrota`, `PantallaCampeon`, FR-039 a FR-041b; research R22), «Formación» (`Alineacion` sobre `CampoEquipo`, FR-001 a FR-003; research R14), Gestión del equipo durante el partido (`GestionEquipo`, FR-027 a FR-031; research R17), Nombre y equipación (`Sala`, `EditorEquipacion`, `Perfil`, FR-042 a FR-047; research R23, R24), Resultado del partido (`ResultadoPartido`, FR-024 a FR-026; research R18) (+2 more)

### Community 96 - "Domain Package"
Cohesion: 0.25
Nodes (7): exports, name, private, scripts, typecheck, type, version

### Community 65 - "Speckit Skills"
Cohesion: 0.24
Nodes (11): Speckit Full SDD Cycle workflow, speckit-analyze skill, speckit-checklist skill, speckit-clarify skill, speckit-constitution skill, speckit-converge skill, speckit-implement skill, speckit-plan skill (+3 more)

### Community 111 - "Spec 002 Engine Ops"
Cohesion: 0.40
Nodes (6): penalizacionPorPosicion(j, destino, p), previsualizar(alineacion) -> Previsualizacion, statsEfectivos(j, destino, p, ctx), zonaEn(x, y), POST /api/partidas/:id/alineacion/previsualizar, Colocación libre (FR-034)

### Community 112 - "Team Identity (Kit v2)"
Cohesion: 0.33
Nodes (6): EditorEquipacion y Camiseta SVG, Regla de parecido de equipaciones (umbral 0,45), patronDiseno(diseno, colores), R23 Nombre del equipo y perfil de la cuenta, R24 Equipaciones v2 (diseno + hasta 3 colores), US11 Nombre y equipacion a mi gusto (P3)

### Community 128 - "Pause & My Games"
Cohesion: 0.67
Nodes (3): GET /api/mis-partidas, Mensajes partida.pausar / partida.pausada, Barra de navegación Marco

### Community 130 - "Spec 003 Card & Pack UI"
Cohesion: 0.67
Nodes (3): AperturaSobre (animacion <= 8 s), CartaJugador (marco propio, brillo), VistaCarta (vista ampliada)

### Community 131 - "Main Button (US4)"
Cohesion: 0.67
Nodes (3): BarraPrincipal (boton principal sticky), R16 Boton principal fijo y comun, US4 Botones principales visibles (P1)

### Community 132 - "Match Result Screen (US6)"
Cohesion: 0.67
Nodes (3): ResultadoPartido (resultado comun rapida/2D), R18 Pantalla de resultado al finalizar, US6 Finalizar el partido y ver resultado (P2)

### Community 33 - "Spec 002 Validation & Balance"
Cohesion: 0.10
Nodes (25): tools/balance (Monte Carlo), Criterio de hecho, statsEfectivos(), Clarificaciones y ajustes de la spec (2026-10-15), Resultados balance --n 1000, Escenario A: Draft en solitario como invitado, Escenario B: Preparación del equipo, Escenario E: Torneo asíncrono con bajas (+17 more)

### Community 36 - "Spec 003 NPC Difficulty"
Cohesion: 0.08
Nodes (26): Informe HTML de balance (informe.html), Guardarrail contra decisiones absurdas, Perfil 'automatico' (avanzado sin errores), R10 Peso medible de los specials, R12 Dificultad NPC por calidad de decision (PerfilNPC.errores), R13 Participante de referencia, R25 Verificacion de los criterios de exito, R2 Parametros 3.0.0 (v3.json) (+18 more)

### Community 37 - "CI & Docker Infra"
Cohesion: 0.08
Nodes (26): CI workflow (GitHub Actions), Paso pnpm balance --n 500, Paso umbral-motor (FR-028a, continue-on-error), Web index.html (entrada React main.tsx), docker-compose (dev services), Servicio db (postgres:16), Servicio mail (mailpit), pnpm workspace (packages/*, apps/*, tools/*) (+18 more)

### Community 41 - "Spec 001 Entities & API"
Cohesion: 0.14
Nodes (25): Mensaje draft.elegir, Entidad Alineacion, Entidad Aviso, Entidad Baja y ContadorAmarillas, Entidad DecisionPartido, Entidad Eleccion, Entidad EventoPartido, Entidad Formacion y Casilla (+17 more)

### Community 5 - "Spec 002 Data Model"
Cohesion: 0.05
Nodes (35): Alineacion.colocacion { jugadorId, x, y }, EstadisticasEquipo (pases, centros, precisionPase, secuencias), EstadoMotor: ancla, posicion, perfil, espacio, posesion, EstadoTorneo.aportaciones y tablaGoleadores/tablaAsistentes, Fotograma v2 y AccionVisible, MesaDraft.pausadaEn / restanteMs, ParametrosEquilibrado 2.0.0 (v2.json), Partido.resolucion ('directo'|'apertura'|'plazo'|'npc') y abiertoPorId (+27 more)

### Community 56 - "Spec 001 Research"
Cohesion: 0.15
Nodes (12): avanzar(estado, modo), R13: Avisos en aplicación y correo SMTP, PRNG xoshiro128**, Cuatro niveles de NPC (amateur, intermedio, avanzado, PRO), Ritmo en directo / asíncrono (FR-056), Phase 2: Foundational, T042 Generador de mesa, T087 Tramos y decisiones del motor (+4 more)

### Community 69 - "Spec 001 HTTP Contract"
Cohesion: 0.17
Nodes (12): Rutas /api/partidas/:id/alineacion, POST /api/auth/invitado, GET /api/partidas/:id/plantillas, POST /api/partidas, Mensaje draft.progreso, Mensaje draft.turno, Mensaje partido.inicio, Cabecera Idempotency-Key (+4 more)

### Community 77 - "Spec 001 Engine Contract"
Cohesion: 0.15
Nodes (12): crearPartido(), EntradaPartido, ResultadoTramo, Mensaje partido.tramo, Contrato del motor (engine-api), Mensaje partido.reproduccion, Invariante: equivalencia entre modalidades, Escenario C: Partido rápido y descanso (+4 more)

### Community 81 - "Single Pitch & Batch Decisions"
Cohesion: 0.15
Nodes (13): CampoEquipo (campo unico compartido), humanosEnCompeticion, Lote atomico partido.decisiones, R14 Formacion con un unico campo, R17 Gestion del equipo durante el partido, R22 Eliminaciones derivadas y simular resto del torneo, FR-041a Simular resto del torneo, US10 Campeon, eliminado y simular resto (P3) (+5 more)

### Community 9 - "Constitution Principles"
Cohesion: 0.05
Nodes (38): AccionVisible, avanzar modo 'ticks' con hastaTick, decidirNPCEnPausa, resolverResto(estado, niveles, semilla) en @fbd/ai, ResultadoTramo (acciones, fotogramas v2), Simulación 2D en tiempo real, Simulación rápida, Presión coordinada (excepción a máx. 2 jugadores al balón) (+30 more)

### Community 93 - "Spec 001 Plan & Monorepo"
Cohesion: 0.61
Nodes (8): apps/server, apps/web, packages/ai, packages/domain, packages/engine, packages/protocol, Constitution Check (Principios I-X), Implementation Plan 001

### Community 99 - "Spec 001 Load Results"
Cohesion: 0.32
Nodes (5): Resultados de carga SC-017, Instantánea estado en reconexión, SC-017: 100 partidas simultáneas, T144 Validación quickstart, Validación del MVP (T144)

## Ambiguous Edges - Review These
- `Guardarrail esErrorAdmisible` → `equipacionEnPartido (resolucion de choque de colores)`  [AMBIGUOUS]
  specs/003-mejoras-ux-simulacion/data-model.md · relation: semantically_similar_to

## Knowledge Gaps
- **120 isolated node(s):** `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json` (+115 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 948 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Research — Fase 0: Mejoras de interfaz, simulación y experiencia de juego` connect `Spec 003 Research` to `Pack Opening Animation`, `Match Actions & Receiver`, `Navigation Frame`, `Spec 001 Contracts Index`, `2D Match Actor`, `Suspensions & Injuries`, `Advance Button & Notices`, `Set Pieces & Cards`, `Engine Versioning`, `Parameters & Auto Line-up`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `crearServidor()` (e.g. with `.obtener()` and `.enviar()`) actually correct?**
  _`crearServidor()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _120 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Replay Clock` be split into smaller, more focused modules?**
  _Cohesion score 0.08403361344537816 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `Server Bootstrap & DB` to `RNG & Domain Helpers`, `Card Catalog & Core Collection`, `HTTP Protocol Schemas`, `Team Actor (Line-ups)`, `2D Replay Interpolation`, `HTTP App & Auth Wiring`, `Tactics Panel & Line-up Rules`, `NPC Line-up & Draft AI`, `ESLint & Dev Tooling`, `Suspensions & Injuries`, `Match Persistence`, `Draft Table Logic`, `Replay Clock`, `Parameters & Auto Line-up`, `Domain Index Exports A`, `Engine Ball Animations`, `Rate Limiter & App Builder`, `Free Placement (Tactics Field)`, `Game Config Domain`, `Resolve-Rest & Candidates`, `Fixtures & Scenarios`, `AI Test Helpers`, `Basic AI & Index`, `Resolve-Rest Engine`, `Actor Registry`, `Domain Index Exports C`, `Match Event Tests`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Should `Match Notice & Connection` be split into smaller, more focused modules?**
  _Cohesion score 0.12698412698412698 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Guardarrail esErrorAdmisible` and `equipacionEnPartido (resolucion de choque de colores)`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._