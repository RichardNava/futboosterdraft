# Graph Report - futboosterdraft  (2026-10-20)

## Corpus Check
- 506 files · ~448,401 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: (none) 8, .woff2 5, .css 4)

## Summary
- 3665 nodes · 10637 edges · 181 communities (149 shown, 32 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 578 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `88220e32`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Server Bootstrap & DB
- partido003.ts
- catalogo/tipos.ts
- cli.ts
- ws/partido.ts
- Migracion 0004_mejoras.sql
- Sala.tsx
- parametrosActuales
- tiro.ts
- Constitution Principles
- ReproduccionPartido.tsx
- NombreRecortado
- Jugador
- evaluador.ts
- partidoRapido.ts
- ESLint & Dev Tooling
- series.ts
- specials.ts
- Field Placement Geometry
- Speckit Scripts
- Server Dependencies
- formaciones.ts
- ServiciosPartida
- npc.ts
- actores/torneo.ts
- BaseDatos
- equipos.ts
- RelojReproduccion
- identidad.ts
- actores/draft.ts
- avanzar
- partida/partida.ts
- RepoPartidas
- Spec 002 Validation & Balance
- Escenarios de validación manual
- checks/partido.ts
- Spec 003 NPC Difficulty
- CI & Docker Infra
- Match Notice & Connection
- Alineacion.tsx
- react
- Spec 001 Entities & API
- Tasks: Mejoras de interfaz, simulación y experiencia de juego
- CartaJugador.tsx
- AperturaSobre.tsx
- Tasks: Mejoras visuales y de diseño (GUI + UX)
- escenarios.ts
- Server Package Config
- ws/base.ts
- Load Test (k6)
- MisPartidas.tsx
- balonParado.ts
- Tabla perfiles_usuario
- servidor.ts
- Torneo.tsx
- EditorEquipacion.tsx
- Tasks 001
- Balance Package
- Rng
- Spec Requirements Checklists
- src/errores.ts
- estado.ts
- Spec 003 Realtime Protocol
- equipaciones.ts
- TS Base Config
- Speckit Skills
- e2e/ayudas.ts
- User Scenarios & Testing *(mandatory)*
- mesa.ts
- Spec 001 HTTP Contract
- Catalogo
- Spec 003 Research
- juego.ts
- http/app.ts
- Fixtures Package
- Pasarela
- Protocol Package
- Pruebas con personas (2026-10-19)
- Spec 001 Contracts Index
- interpolacion.ts
- AI Package
- Single Pitch & Batch Decisions
- Research — spec 004: mejoras visuales y de diseño
- protocol/src/http/partidos.ts
- Engine Package
- Home — Style Reference
- protocol/src/http/partidas.ts
- torneo/torneo.ts
- Web Package
- Spec 003 HTTP Changes
- Contrato de interfaz — spec 003
- ws/draft.ts
- balonParado.test.ts
- @playwright/test
- Implementation Plan 001
- ActorPartida
- Domain Package
- Lienzo2D.tsx
- repos/torneo.ts
- Spec 001 Load Results
- colores.ts
- sonido.ts
- servicio.ts
- Web TS Config
- particulas.ts
- User Scenarios & Testing *(mandatory)*
- Data Model — Mejoras de interfaz, simulación y experiencia de juego
- `PUT /api/partidas/:id/nombre-equipo` (✚)
- Web Scripts
- Calibración del motor 3.0.0 (T033)
- umbralMotor.ts
- Spec 002 Engine Ops
- devDependencies
- Server TS Config
- comprobaciones.ts
- devDependencies
- AI TS Config
- Domain TS Config
- Engine TS Config
- Protocol TS Config
- apertura.spec.ts
- Balance TS Config
- Fixtures TS Config
- Constitution Governance
- Implementation Plan: Mejoras de interfaz, simulación y experiencia de juego
- torneo-asincrono.spec.ts
- Components
- Functional Requirements
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
- Constitution Check
- T086 Engine Perf
- T159 Validation
- Implementation for User Story 2
- Contrato de interfaz — spec 004
- Propuesta de enmienda PATCH 1.0.5 de la constitución (T126)
- 7. Partido
- AlmacenPeticiones
- Dependencies & Execution Order
- RepoDraft
- scripts
- .detener
- 8. Torneo
- Implementation Strategy
- Partidas
- EstadoPartida
- R24 Equipaciones v2 (diseno + hasta 3 colores)
- base.test.ts
- main.tsx
- sondaGoleadores.ts
- Validación de la spec 004 con personas (SC-003, SC-004, SC-010)
- Frontend Design
- RepoPartidos
- Frontend Design
- Quickstart — validar la spec 004
- Tokens — Spacing & Shapes
- Specification Quality Checklist: Mejoras visuales y de diseño (GUI + UX)
- Lista de verificación visual — spec 004 (SC-001)

## God Nodes (most connected - your core abstractions)
1. `vitest` - 98 edges
2. `avanzar()` - 73 edges
3. `parametrosActuales()` - 64 edges
4. `crearPartido()` - 63 edges
5. `Rng` - 61 edges
6. `paso()` - 54 edges
7. `EstadoMotor` - 54 edges
8. `derivarSemilla()` - 52 edges
9. `peticion()` - 50 edges
10. `Jugador` - 49 edges

## Surprising Connections (you probably didn't know these)
- `3.1 Nombre de equipo (regla de dominio)` --references--> `nombresNPC()`  [INFERRED]
  specs/003-mejoras-ux-simulacion/data-model.md → apps/server/src/actores/nombres.ts
- ``POST /api/partidos/:id/abrir` (✎)` --references--> `reproduccion()`  [INFERRED]
  specs/003-mejoras-ux-simulacion/contracts/http-api.md → apps/server/src/actores/partidoEntreHumanos.ts
- ``estado` (✎)` --references--> `vistaPartido()`  [INFERRED]
  specs/003-mejoras-ux-simulacion/contracts/realtime-protocol.md → apps/server/src/actores/partidoRapido.ts
- `R23. Nombre del equipo y perfil de la cuenta (FR-042 a FR-044, SC-021)` --references--> `unirse()`  [INFERRED]
  specs/003-mejoras-ux-simulacion/research.md → apps/server/src/actores/sala.ts
- `8.3 Jornadas sin humanos en competición` --references--> `abrirSiguienteJornada()`  [INFERRED]
  specs/003-mejoras-ux-simulacion/data-model.md → apps/server/src/actores/torneo.ts

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

## Communities (181 total, 32 thin omitted)

### Community 0 - "Server Bootstrap & DB"
Cohesion: 0.06
Nodes (82): programarJornada(), ruta, principal(), conectar(), ConexionBD, urlBaseDatos(), jugadores, aplicarMigraciones() (+74 more)

### Community 1 - "partido003.ts"
Cohesion: 0.20
Nodes (26): ambos(), cache, cacheCore, comprobarSC001(), comprobarSC002(), comprobarSC003(), comprobarSC004(), comprobarSC005() (+18 more)

### Community 2 - "catalogo/tipos.ts"
Cohesion: 0.04
Nodes (57): ambitoSpecial(), filaAJugador(), registrarRutasCatalogo(), TEXTOS_SPECIALS, DISTRIBUCION_CORE, MINIMO_EQUILIBRADO_CORE, RecuentoCatalogo, DEMARCACIONES (+49 more)

### Community 3 - "cli.ts"
Cohesion: 0.13
Nodes (19): Comprobacion, comprobacionesBase(), DEPENDENCIAS_SC009, ejecutar(), esPrincipal, evaluarPendientes(), GrupoComprobaciones, grupoSeleccionado() (+11 more)

### Community 4 - "ws/partido.ts"
Cohesion: 0.12
Nodes (16): AccionVisibleMsg, AccionVisibleSchema, FotogramaMsg, FotogramaSchema, MsgPartidoReproduccion, VELOCIDADES_2D, Equipacion, MsgPartidoDecision (+8 more)

### Community 5 - "Migracion 0004_mejoras.sql"
Cohesion: 0.05
Nodes (33): Alineacion.colocacion { jugadorId, x, y }, EstadisticasEquipo (pases, centros, precisionPase, secuencias), EstadoMotor: ancla, posicion, perfil, espacio, posesion, EstadoTorneo.aportaciones y tablaGoleadores/tablaAsistentes, Fotograma v2 y AccionVisible, MesaDraft.pausadaEn / restanteMs, ParametrosEquilibrado 2.0.0 (v2.json), Partido.resolucion ('directo'|'apertura'|'plazo'|'npc') y abiertoPorId (+25 more)

### Community 6 - "Sala.tsx"
Cohesion: 0.12
Nodes (31): ErrorApi, ConSesion(), router, Rutas(), Aviso(), AvisoDorsales(), textoDorsalesNuevos(), CampoNombreEquipo() (+23 more)

### Community 7 - "parametrosActuales"
Cohesion: 0.13
Nodes (32): terminarDraft(), alineacionAutomatica(), alineacionVigente(), bajasActivas(), cambiarDorsal(), cambiarEquipaciones(), confirmarAlineacion(), dorsalesIniciales() (+24 more)

### Community 8 - "tiro.ts"
Cohesion: 0.07
Nodes (69): elegirPonderado(), holgura(), radioDe(), radioIntervencion(), planearPase(), PlanPase, puntoCelda(), CERCA_REMATE (+61 more)

### Community 9 - "Constitution Principles"
Cohesion: 0.09
Nodes (24): Simulación 2D en tiempo real, Simulación rápida, AccionVisible, avanzar modo 'ticks' con hastaTick, decidirNPCEnPausa, Invariante 6b: cortes por ticks inocuos, Invariante 5: finalizar es equivalente, Invariante 7: fotogramas inocuos (+16 more)

### Community 10 - "ReproduccionPartido.tsx"
Cohesion: 0.08
Nodes (55): jugadoresDe(), Superposicion, EstadoReloj, Velocidad, VELOCIDADES, datosVacios(), incorporarTramo(), TramoRecibido (+47 more)

### Community 11 - "NombreRecortado"
Cohesion: 0.08
Nodes (47): texto(), AperturaSobre(), BarraPrincipal(), BotonAvanzar(), CampoEquipo(), CartaJugador(), DistintivoBaja(), ETIQUETA_MOTIVO (+39 more)

### Community 12 - "Jugador"
Cohesion: 0.06
Nodes (50): OpcionesAlineacion, DEM, jugador(), plantilla(), CLAVES_STATS, Demarcacion, Jugador, POSICIONES (+42 more)

### Community 13 - "evaluador.ts"
Cohesion: 0.32
Nodes (10): cobertura(), CUPO_DEMARCACION, encaja(), escasezPorteros(), LANZADORES, mediaEnMejorCasilla(), saturacion(), sinergia() (+2 more)

### Community 14 - "partidoRapido.ts"
Cohesion: 0.08
Nodes (47): ContextoComando, Destino, avanzar2D(), crearEstado2D(), Estado2D, olvidarVistos(), procesarReproduccion(), Resultado (+39 more)

### Community 15 - "ESLint & Dev Tooling"
Cohesion: 0.05
Nodes (40): sinNoDeterminismo, devDependencies, eslint, @eslint/js, fast-check, globals, prettier, tsx (+32 more)

### Community 16 - "series.ts"
Cohesion: 0.17
Nodes (15): EstadisticasEquipo, ResultadoCore, args, base, c, GRUPO, i, p (+7 more)

### Community 17 - "specials.ts"
Cohesion: 0.14
Nodes (21): portero(), Duelo, probabilidad(), resolver(), sigmoide(), controlPorRitmo(), distanciaConduccion(), atributo (+13 more)

### Community 18 - "Field Placement Geometry"
Cohesion: 0.09
Nodes (53): alLadoDe(), balonAlCentro(), acotar(), dividir(), escalar(), isqrt(), limitar(), norma() (+45 more)

### Community 19 - "Speckit Scripts"
Cohesion: 0.11
Nodes (30): check-prerequisites.sh script, check_dir(), check_file(), find_specify_root(), format_speckit_command(), get_current_branch(), get_feature_paths(), get_invoke_separator() (+22 more)

### Community 20 - "Server Dependencies"
Cohesion: 0.10
Nodes (20): dependencies, ajv, ajv-formats, better-auth, drizzle-orm, fastify, @fastify/compress, @fastify/cookie (+12 more)

### Community 21 - "formaciones.ts"
Cohesion: 0.06
Nodes (45): Posicion, calcularColocacion(), dispersion(), media(), PESO, posicionEn(), PuntoColocacion, separar() (+37 more)

### Community 22 - "ServiciosPartida"
Cohesion: 0.09
Nodes (8): Difusor, ServiciosPartida, RepoPerfiles, RepoVisionados, Pendiente, Reloj, RelojReal, Temporizadores

### Community 23 - "npc.ts"
Cohesion: 0.11
Nodes (44): decidirAlineacion(), decidirAlineacionDetallada(), elegirCarta(), elegirCartaDetallada(), ErrorEleccion, inicioDudosa(), OpcionesDraft, CartaValorada (+36 more)

### Community 24 - "actores/torneo.ts"
Cohesion: 0.10
Nodes (50): entreHumanos(), crearPartidosJornada(), resolverPartidosSinHumanos(), abandonar(), abrirSiguienteJornada(), avisarHumanos(), AVISO_PLAZO_MS, despuesDePartido() (+42 more)

### Community 25 - "BaseDatos"
Cohesion: 0.10
Nodes (25): BaseDatos, POOL_POR_DEFECTO, cuentas, participantes, partidas, perfilesUsuario, peticionesProcesadas, sesiones (+17 more)

### Community 26 - "equipos.ts"
Cohesion: 0.18
Nodes (21): calcularMedia(), Special, proponerLanzadores(), comprobacionesColocacion(), comprobarSC011(), comprobarSC018(), pct(), diagnostico() (+13 more)

### Community 27 - "RelojReproduccion"
Cohesion: 0.09
Nodes (11): CLAVE_VELOCIDAD, guardarVelocidad(), INTERVALO_INFORME_MS, MotivoPausa, OpcionesReloj, RelojReproduccion, TICKS_LANZAMIENTO, velocidadGuardada() (+3 more)

### Community 28 - "identidad.ts"
Cohesion: 0.21
Nodes (18): cambiarNombreEquipo(), clavesUsadas(), identidadInicial, marcarNombreAjustado(), nombresAjustados, nombresUsados(), equipacionesDe(), emitirSala() (+10 more)

### Community 29 - "actores/draft.ts"
Cohesion: 0.10
Nodes (36): abandonarDraft(), abrirTurno(), dudosasHechas, eleccionNPC(), emitirProgreso(), iniciarDraft(), mensajeTurno(), pendientesDeMesa() (+28 more)

### Community 30 - "avanzar"
Cohesion: 0.06
Nodes (56): cacheReproducciones, rehacer(), reproduccion(), resolverPartidoEntreHumanos(), terminarPartidoEntreHumanosEnJuego(), Tramos, EntradaGuardada, equipacionesDelPartido() (+48 more)

### Community 31 - "partida/partida.ts"
Cohesion: 0.11
Nodes (22): ConfigPartida, configPorDefecto(), debeAbandonarsePorDesconexion(), Dificultad, DIFICULTADES, ErrorConfig, EventoPartida, humanosActivos() (+14 more)

### Community 33 - "Spec 002 Validation & Balance"
Cohesion: 0.07
Nodes (34): Clarificaciones y ajustes de la spec (2026-10-15), Checklist de calidad de la spec, Resultados balance --n 1000, Invariante: equivalencia entre modalidades, statsEfectivos(), tools/balance (Monte Carlo), Criterio de hecho, Quickstart de validación (+26 more)

### Community 34 - "Escenarios de validación manual"
Cohesion: 0.12
Nodes (17): A. Simulación 2D que parece fútbol (US1; SC-001 a SC-008), B. «Formación» con un único campo (US2; SC-014, SC-015), C. Modo de simulación por partido (US3; SC-018), D. Botón principal (US4; SC-013), E. Gestión del equipo en el descanso y durante la 2D (US5; SC-016), Escenarios de validación manual, F. Finalizar partido (US6; SC-017), G. Cartas (US7; SC-012) (+9 more)

### Community 35 - "checks/partido.ts"
Cohesion: 0.35
Nodes (14): Campo, col(), comprobacionesPartido(), comprobarSC004(), comprobarSC006(), comprobarSC007(), comprobarSC007Partido2D(), comprobarSC008Pase() (+6 more)

### Community 36 - "Spec 003 NPC Difficulty"
Cohesion: 0.08
Nodes (26): Informe HTML de balance (informe.html), Guardarrail contra decisiones absurdas, Perfil 'automatico' (avanzado sin errores), R10 Peso medible de los specials, R12 Dificultad NPC por calidad de decision (PerfilNPC.errores), R13 Participante de referencia, R25 Verificacion de los criterios de exito, R2 Parametros 3.0.0 (v3.json) (+18 more)

### Community 37 - "CI & Docker Infra"
Cohesion: 0.08
Nodes (26): CI workflow (GitHub Actions), Paso pnpm balance --n 500, Paso umbral-motor (FR-028a, continue-on-error), Web index.html (entrada React main.tsx), docker-compose (dev services), Servicio db (postgres:16), Servicio mail (mailpit), Guía de despliegue (+18 more)

### Community 38 - "Match Notice & Connection"
Cohesion: 0.14
Nodes (11): mantenerConexionInvitado(), soltarConexionInvitado(), EstadoServidor, useConexion(), Ack, ConexionPartida, MensajeServidor, Oyente (+3 more)

### Community 39 - "Alineacion.tsx"
Cohesion: 0.07
Nodes (61): Arrastre, Props, acotar(), cambiarFormacion(), casillaDe(), colocacionDe(), DestinoSoltar, distancia() (+53 more)

### Community 40 - "react"
Cohesion: 0.11
Nodes (26): Enlace, ENLACES, Marco(), partidaDeRuta(), Salida, salidaDe(), ETIQUETA_TIPO, Props (+18 more)

### Community 41 - "Spec 001 Entities & API"
Cohesion: 0.17
Nodes (22): Mensaje draft.elegir, Entidad Alineacion, Entidad Aviso, Entidad Baja y ContadorAmarillas, Entidad DecisionPartido, Data Model 001, Entidad Eleccion, Entidad EventoPartido (+14 more)

### Community 42 - "Tasks: Mejoras de interfaz, simulación y experiencia de juego"
Cohesion: 0.09
Nodes (23): Format: `[ID] [P?] [Story] Description`, Implementation for User Story 4, Implementation for User Story 6, Implementation for User Story 7, Notes, Parallel Example: User Story 11, Parallel Example: User Story 1 (motor), Path Conventions (monorepo de las specs 001 y 002) (+15 more)

### Community 43 - "CartaJugador.tsx"
Cohesion: 0.09
Nodes (21): ContenidoCompacto(), ContenidoCompleto(), Posiciones(), Props, Specials(), SiluetaJugador(), posicionarVista(), Props (+13 more)

### Community 44 - "AperturaSobre.tsx"
Cohesion: 0.15
Nodes (16): calendarioApertura(), COLOR_PARTICULAS, DURACION_MAXIMA_MS, DURACION_SOBRE_MS, ESCALONADO_MS, especial(), EstadoCarta, Fase (+8 more)

### Community 45 - "Tasks: Mejoras visuales y de diseño (GUI + UX)"
Cohesion: 0.08
Nodes (24): Dependencias concretas entre tareas, Dependencies & Execution Order, Entrega incremental, Formato: `[ID] [P?] [Story] Descripción`, Implementation for User Story 1, Implementation for User Story 3, Implementation Strategy, MVP First (User Story 1) (+16 more)

### Community 46 - "escenarios.ts"
Cohesion: 0.14
Nodes (20): EXCEPCIONES, fallos, raiz, recorrer(), REGLAS, cumpleEscenario(), entradaEscenario(), equipo() (+12 more)

### Community 47 - "Server Package Config"
Cohesion: 0.07
Nodes (24): exports, @fbd/ai, @fbd/domain, @fbd/engine, @fbd/protocol, zod, name, private (+16 more)

### Community 48 - "ws/base.ts"
Cohesion: 0.20
Nodes (8): ErrorProtocolo, FaseVista, MsgError, MsgPing, MsgPong, RequestId, MsgPartidaPausada, MsgPartidaPausar

### Community 49 - "Load Test (k6)"
Cohesion: 0.13
Nodes (20): apertura, bloqueadas, cabeceras(), cookieDe(), crearUsuario(), descanso, entregaSobre, erroresWs (+12 more)

### Community 50 - "MisPartidas.tsx"
Cohesion: 0.14
Nodes (13): EstadoSesion, FormularioCuenta(), Inicio(), Modo, usePartidaEnCurso(), ACCION, destinoPartida(), FASE (+5 more)

### Community 51 - "balonParado.ts"
Cohesion: 0.14
Nodes (33): gol(), amarilla(), falta(), faltaDirecta(), penalti(), probabilidadTiroDirecto(), tarjetaRoja(), emitir() (+25 more)

### Community 52 - "Tabla perfiles_usuario"
Cohesion: 0.25
Nodes (11): POST /api/partidos/:id/abrir (modalidad), `preparacion.inicio` (✎), Migraciones 0006 a 0008, ModoSimulacion ('rapida' | '2d'), Tabla participantes (ultima_modalidad, pantallas vistas), partidos.modalidades (por participante), Migraciones 0006_modo_simulacion, 0007_pantallas_torneo, 0008_identidad, SelectorModo (+3 more)

### Community 53 - "servidor.ts"
Cohesion: 0.08
Nodes (42): ESTADOS_ACTIVOS, GestorPartidas, accionYRival(), EN_CURSO, misPartidas(), nombresNPC(), NUCLEOS, PREFIJOS (+34 more)

### Community 54 - "Torneo.tsx"
Cohesion: 0.07
Nodes (50): abrirPartido(), api(), marcarPantallaVista(), marcarVisto(), obtenerReproduccion(), OpcionesPeticion, revelarResultado(), siguienteJornada() (+42 more)

### Community 55 - "EditorEquipacion.tsx"
Cohesion: 0.24
Nodes (13): dibujar(), Camiseta(), Props, COLOR_NUEVO, ETIQUETA_DISENO, Props, colorDorsal(), DisenoCamiseta (+5 more)

### Community 56 - "Tasks 001"
Cohesion: 0.19
Nodes (12): aplicarDecision(), avanzar(estado, modo), crearPartido(), Contrato del motor (engine-api), EntradaPartido, ResultadoTramo, Mensaje partido.tramo, Tasks 001 (+4 more)

### Community 57 - "Balance Package"
Cohesion: 0.11
Nodes (18): bin, balance, dependencies, @fbd/ai, @fbd/domain, @fbd/engine, exports, @fbd/ai (+10 more)

### Community 58 - "Rng"
Cohesion: 0.14
Nodes (18): formacionObjetivo(), errorDraft(), plantillaCore(), rellenarConNPC(), Rng, Celda, ErrorPoolInsuficiente, generarMesa() (+10 more)

### Community 59 - "Spec Requirements Checklists"
Cohesion: 0.12
Nodes (15): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Mejoras de interfaz, simulación y experiencia de juego, avanzar(estado, modo, opciones), OpcionesAvance (fotogramas, metricas), Penalti por criterio espacial (FR-020) (+7 more)

### Community 60 - "src/errores.ts"
Cohesion: 0.07
Nodes (60): alineacionCorrecta(), conErrores(), LIMITE_PRO_MS, TACTICA_DEFENSIVA, TACTICA_OFENSIVA, tacticaSegunRival(), ContextoErrores, CRUCE_MAXIMO (+52 more)

### Community 61 - "estado.ts"
Cohesion: 0.06
Nodes (67): aplicarLote(), ResultadoLote, ResultadoResolverResto, validarColocacion(), esFormacionId(), EstadoRng, Contexto, fotograma() (+59 more)

### Community 62 - "Spec 003 Realtime Protocol"
Cohesion: 0.18
Nodes (10): Cliente → servidor, `estado` (✎), Garantías de orden (añadidas), `partido.decision_aplicada` (sin cambios de forma), `partido.decisiones` (✚), `partido.reproduccion` (sin cambios), Protocolo en tiempo real — cambios de la spec 003, Servidor → cliente (+2 more)

### Community 63 - "equipaciones.ts"
Cohesion: 0.14
Nodes (26): chocan(), CodigoErrorEquipaciones, colorDeContraste(), distanciaColor(), equipacionDesdeV1(), equipacionEnPartido(), equipacionesAleatorias(), EquipacionV1 (+18 more)

### Community 64 - "TS Base Config"
Cohesion: 0.12
Nodes (16): compilerOptions, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+8 more)

### Community 65 - "Speckit Skills"
Cohesion: 0.24
Nodes (11): speckit-analyze skill, speckit-checklist skill, speckit-clarify skill, speckit-constitution skill, speckit-converge skill, speckit-implement skill, speckit-plan skill, speckit-specify skill (+3 more)

### Community 66 - "e2e/ayudas.ts"
Cohesion: 0.14
Nodes (10): abrirFormacion(), arrastrarSobre(), jugarHastaCaer(), partidaTrasDraft(), sabotear(), sustituirEnGestion(), vistaTorneo, Carta (+2 more)

### Community 67 - "User Scenarios & Testing *(mandatory)*"
Cohesion: 0.05
Nodes (38): Apertura de los sobres (US8), Assumptions, Botones principales (US4), Clarifications, Dificultad de los NPC (US9), Diseño de las cartas (US7), Edge Cases, Feature Specification: Mejoras de interfaz, simulación y experiencia de juego (+30 more)

### Community 68 - "mesa.ts"
Cohesion: 0.19
Nodes (21): asientoDe(), cartaAutomatica(), CodigoErrorDraft, crearMesa(), Eleccion, eleccionDelTurno(), elegir(), ErrorDraft (+13 more)

### Community 69 - "Spec 001 HTTP Contract"
Cohesion: 0.10
Nodes (18): Rutas /api/partidas/:id/alineacion, POST /api/auth/invitado, Contrato HTTP/JSON, Cabecera Idempotency-Key, GET /api/partidas/:id/plantillas, POST /api/partidas, GET /api/partidas/:id/torneo, Protocolo en tiempo real (WebSocket) (+10 more)

### Community 70 - "Catalogo"
Cohesion: 0.22
Nodes (3): OpcionesLimitador, Catalogo, ConfigServidor

### Community 71 - "Spec 003 Research"
Cohesion: 0.12
Nodes (17): R10. Peso medible de los specials (FR-022, SC-007), R12. Dificultad de los NPC por calidad de decisión (FR-036 a FR-038, SC-010, SC-010a, SC-010b), R13. Participante de referencia y comprobación de SC-010, R15. Vista ampliada de la carta (FR-004, FR-005, SC-015), R17. Gestión del equipo durante el partido (FR-027 a FR-031, SC-016), R20. Diseño de las cartas (FR-008 a FR-010, SC-012), R21. Apertura de sobres y sonido (FR-011 a FR-015, SC-019), R23. Nombre del equipo y perfil de la cuenta (FR-042 a FR-044, SC-021) (+9 more)

### Community 72 - "juego.ts"
Cohesion: 0.14
Nodes (50): abrir(), BALON_DE, balonCon(), cerrar(), conducir(), controlar(), hasta(), posicion() (+42 more)

### Community 73 - "http/app.ts"
Cohesion: 0.11
Nodes (20): OpcionesRutasAuth, claveSesion(), construirApp(), DependenciasApp, cuerpoError(), ErrorApi, Limitador, LIMITE_HTTP (+12 more)

### Community 74 - "Fixtures Package"
Cohesion: 0.13
Nodes (14): dependencies, @fbd/domain, @fbd/engine, exports, @fbd/domain, @fbd/engine, name, private (+6 more)

### Community 75 - "Pasarela"
Cohesion: 0.19
Nodes (3): Manejador, OpcionesPasarela, Pasarela

### Community 76 - "Protocol Package"
Cohesion: 0.14
Nodes (13): dependencies, @fbd/domain, zod, exports, ./schemas/*, @fbd/domain, zod, name (+5 more)

### Community 77 - "Pruebas con personas (2026-10-19)"
Cohesion: 0.12
Nodes (14): RepoEquipo, Dorsales, Aclaraciones sobre la dificultad (H13, H14), Batería e2e tras los cambios (2026-10-20), Cambios de requisito H5, H6, H7 y H9, Correcciones de los defectos H1, H2 y H10, Criterios de éxito con personas, Decisiones sobre H11 y H14 (2026-10-20) (+6 more)

### Community 78 - "Spec 001 Contracts Index"
Cohesion: 0.22
Nodes (8): Contrato del motor de simulación (spec 002), Contrato HTTP/JSON (spec 002), Protocolo en tiempo real (spec 002), ResultadoPartido, EstadisticasEquipo (pases y tiros por zona, golesPorTipo), TipoTiro (propia) y zonaRemate en eventos de tiro/gol, Escenarios de validacion manual A a L, Linea base de comparacion (worktree c8a1627)

### Community 79 - "interpolacion.ts"
Cohesion: 0.27
Nodes (11): agregarFotogramas(), Fotograma, fuera(), hermite(), indiceFotograma(), parabola(), pendiente(), posicionesEn() (+3 more)

### Community 80 - "AI Package"
Cohesion: 0.15
Nodes (12): dependencies, @fbd/domain, @fbd/engine, exports, @fbd/domain, @fbd/engine, name, private (+4 more)

### Community 81 - "Single Pitch & Batch Decisions"
Cohesion: 0.12
Nodes (16): Formacion: Alineacion sobre CampoEquipo, BarraPrincipal (un boton principal por pantalla), CampoEquipo (campo unico compartido), GestionEquipo (gestion durante el partido), humanosEnCompeticion, Lote atomico partido.decisiones, R14 Formacion con un unico campo, R17 Gestion del equipo durante el partido (+8 more)

### Community 82 - "Research — spec 004: mejoras visuales y de diseño"
Cohesion: 0.11
Nodes (18): comprobarDiseno(), rellenosLima(), R10. Animación y movimiento reducido (FR-017, FR-028, FR-033), R11. Equipaciones oscuras sobre el lienzo (FR-034, Edge Cases), R13. Verificación automática (FR-040; Clarifications), R14. Validación con personas (SC-003, SC-004, SC-010), R15. Textos de la interfaz (FR-035, FR-036), R1. Dirección de diseño (skill `frontend-design`) (+10 more)

### Community 83 - "protocol/src/http/partidos.ts"
Cohesion: 0.18
Nodes (10): ConsultaReproduccion, CuerpoAbrir, Marcador, Modalidad, PartidoPendienteDeVer, RespuestaAbrir, RespuestaReproduccion, TramoReproduccion (+2 more)

### Community 84 - "Engine Package"
Cohesion: 0.17
Nodes (11): dependencies, @fbd/domain, exports, @fbd/domain, name, private, scripts, bench (+3 more)

### Community 85 - "Home — Style Reference"
Cohesion: 0.11
Nodes (19): Agent Prompt Guide, CSS Custom Properties, Do, Do's and Don'ts, Don't, Elevation, Font Roobert — Primary brand typeface across all contexts — nav, body, headings, display. The custom font's compressed, geometric construction at 110px / 0.85 line-height creates the poster-scale headlines; its 400/500/700 range covers body through display without needing a second family. The extreme compression in display weights is signature — line-height under 1.0 makes headlines overlap slightly, producing a stacked, aggressive tournament-poster feel that system sans-serifs cannot replicate. · `--font-font-roobert`, Gradient System (+11 more)

### Community 86 - "protocol/src/http/partidas.ts"
Cohesion: 0.20
Nodes (9): AnadirNPC, CuerpoNombreEquipo, CuerpoPantallaVista, Dificultad, MisPartidas, NivelNPC, PartidaResumen, RespuestaSimularResto (+1 more)

### Community 87 - "torneo/torneo.ts"
Cohesion: 0.05
Nodes (58): DecisionLote, DEM, enDescanso(), equipo(), jugador(), lote(), Modo, estadoDesdeSemilla() (+50 more)

### Community 88 - "Web Package"
Cohesion: 0.11
Nodes (17): dependencies, @fbd/domain, @fbd/protocol, react, react-dom, react-router, zustand, @fbd/domain (+9 more)

### Community 89 - "Spec 003 HTTP Changes"
Cohesion: 0.18
Nodes (11): Contrato HTTP/JSON — cambios de la spec 003, `GET /api/partidas/:id/alineacion` (✎), `GET /api/partidos/:id` (✎), `GET /api/partidos/:id/reproduccion?modalidad=rapida|2d` (✎), `GET /api/perfil`, Partidos, Perfil de usuario (✚), Plantilla, alineación y equipaciones (+3 more)

### Community 90 - "Contrato de interfaz — spec 003"
Cohesion: 0.07
Nodes (25): Fútboosterdraft Constitution, CLAUDE.md (instrucciones del proyecto), Checklist de requisitos: Simulación 2D y finalización, Presión coordinada (excepción a máx. 2 jugadores al balón), Prueba de carga k6 beta-100 (no validada), Desviación: motor ~80 ms por partido, no cumple FR-028a, Herramienta de equilibrado pnpm balance, Validación de la spec 002 (T159) (+17 more)

### Community 91 - "ws/draft.ts"
Cohesion: 0.22
Nodes (8): JugadorResumen, MsgDraftEleccionAuto, MsgDraftElegir, MsgDraftProgreso, MsgDraftTerminado, MsgDraftTurno, MsgSalaActualizada, ParticipanteSala

### Community 92 - "balonParado.test.ts"
Cohesion: 0.16
Nodes (21): FORMACIONES, contextoDe(), darBalon(), DEM, equipo(), jugador(), partido(), situar() (+13 more)

### Community 94 - "Implementation Plan 001"
Cohesion: 0.61
Nodes (8): apps/server, apps/web, Constitution Check (Principios I-X), Implementation Plan 001, packages/ai, packages/domain, packages/engine, packages/protocol

### Community 95 - "ActorPartida"
Cohesion: 0.12
Nodes (3): ActorPartida, MensajeSaliente, RegistroActores

### Community 96 - "Domain Package"
Cohesion: 0.25
Nodes (7): exports, name, private, scripts, typecheck, type, version

### Community 97 - "Lienzo2D.tsx"
Cohesion: 0.15
Nodes (18): Posiciones, accionEn(), AccionVista, ETIQUETA_ACCION, LanzamientoVista, Lienzo2D(), ordenDe(), Props (+10 more)

### Community 98 - "repos/torneo.ts"
Cohesion: 0.16
Nodes (10): avisos, bajas, contadoresAmarillas, jornadas, torneos, Ejecutor, FilaJornada, RepoTorneo (+2 more)

### Community 99 - "Spec 001 Load Results"
Cohesion: 0.32
Nodes (5): Resultados de carga SC-017, Validación del MVP (T144), Instantánea estado en reconexión, SC-017: 100 partidas simultáneas, T144 Validación quickstart

### Community 100 - "colores.ts"
Cohesion: 0.16
Nodes (14): ColoresChapa, contraste(), luminancia(), necesitaContorno(), TOKENS_SIN_DOCUMENTO, css, fondos, Complexity Tracking (+6 more)

### Community 101 - "sonido.ts"
Cohesion: 0.17
Nodes (14): activado, buferes, cambiarSonido(), cargar(), CLAVE_SONIDO, Efecto, EfectoFichero, GANANCIA (+6 more)

### Community 102 - "servicio.ts"
Cohesion: 0.15
Nodes (5): NuevoAviso, ServicioAvisos, TipoAviso, nodemailer, pino

### Community 103 - "Web TS Config"
Cohesion: 0.29
Nodes (6): compilerOptions, jsx, lib, extends, include, ../../tsconfig.base.json

### Community 104 - "particulas.ts"
Cohesion: 0.17
Nodes (7): FPS_MINIMO, iniciarParticulas(), OpcionesParticulas, Particula, PRESUPUESTO_MS, SistemaParticulas, VENTANA_FPS_MS

### Community 105 - "User Scenarios & Testing *(mandatory)*"
Cohesion: 0.15
Nodes (13): Assumptions, Clarifications, Edge Cases, Feature Specification: Mejoras visuales y de diseño (GUI + UX), Measurable Outcomes, Session 2026-10-20, Success Criteria *(mandatory)*, User Scenarios & Testing *(mandatory)* (+5 more)

### Community 106 - "Data Model — Mejoras de interfaz, simulación y experiencia de juego"
Cohesion: 0.22
Nodes (9): 10. Resumen de relaciones (añadidos), 2. Partida (`ConfigPartida`, tabla `partidas`), 3.1 Nombre de equipo (regla de dominio), 3. Participante (tabla `participantes`), 4. Equipación (`Equipacion` v2), 5. Perfil de usuario (✚ tabla `perfiles_usuario`), 6. Perfil de NPC (`PerfilNPC`, `@fbd/ai`), 9. Migraciones `0006` a `0008` (+1 more)

### Community 107 - "`PUT /api/partidas/:id/nombre-equipo` (✚)"
Cohesion: 0.22
Nodes (10): GET/PUT /api/perfil, `PUT /api/partidas/:id/nombre-equipo` (✚), PUT /api/partidas/:id/equipaciones (v2), `partido.inicio` (✎), Sala, EditorEquipacion y Perfil (nombre y equipacion), desdeV1 (conversion equipaciones v1 a v2), Equipacion v2 (diseno, colores), equipacionEnPartido (resolucion de choque de colores) (+2 more)

### Community 108 - "Web Scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, e2e, lint:tokens, preview, typecheck

### Community 109 - "Calibración del motor 3.0.0 (T033)"
Cohesion: 0.08
Nodes (22): Calibración del motor 3.0.0 (T033), Configuración final: la de la ronda 7, Línea base (motor 2.0.0, `c8a1627`), Pendiente, Ronda 10 (`--serie todas`, n = 500): ronda 7 más el peso del centro 3,9 / 2,8, Ronda 11 (tras H8, H11 y H13; `--serie todas`, n = 500), Ronda 12 y 13: llegada orgánica y regate hacia dentro (H11, decisión del 2026-10-20), Ronda 5 (`pnpm balance --n 500 --serie todas`, 1.648,7 s) (+14 more)

### Community 110 - "umbralMotor.ts"
Cohesion: 0.20
Nodes (9): entrada(), i, local, MAX_METRICAS_MS, MAX_PARTIDO_MS, MAX_RESOLVER_RESTO_MS, parametros, t0 (+1 more)

### Community 111 - "Spec 002 Engine Ops"
Cohesion: 0.40
Nodes (6): penalizacionPorPosicion(j, destino, p), previsualizar(alineacion) -> Previsualizacion, statsEfectivos(j, destino, p, ctx), zonaEn(x, y), POST /api/partidas/:id/alineacion/previsualizar, Colocación libre (FR-034)

### Community 112 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, drizzle-kit, pino-pretty, testcontainers, @testcontainers/postgresql, tsup, @types/nodemailer, @types/pg (+1 more)

### Community 113 - "Server TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, extends, include, ../../tsconfig.base.json

### Community 114 - "comprobaciones.ts"
Cohesion: 0.23
Nodes (6): ANCHOS, LIMA, OpcionesDiseno, focoVisible(), tabHasta(), @axe-core/playwright

### Community 115 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, @axe-core/playwright, @playwright/test, @types/react, @types/react-dom, vite, @vitejs/plugin-react

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

### Community 121 - "Balance TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, extends, include, ../../tsconfig.base.json

### Community 122 - "Fixtures TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, extends, include, ../../tsconfig.base.json

### Community 124 - "Implementation Plan: Mejoras de interfaz, simulación y experiencia de juego"
Cohesion: 0.25
Nodes (8): Complexity Tracking, Documentation (this feature), Implementation Plan: Mejoras de interfaz, simulación y experiencia de juego, Project Structure, Riesgos y mitigaciones, Source Code (repository root), Summary, Technical Context

### Community 126 - "Components"
Cohesion: 0.17
Nodes (12): Components, Cookie Settings Modal, Dark Card, Footer, Ghost Navigation Button, Hero Headline, Image Card, Marquee Display Section (+4 more)

### Community 127 - "Functional Requirements"
Cohesion: 0.17
Nodes (12): Accesibilidad y adaptación (US4), Componentes comunes (US1, US2), Estados y retroalimentación (US2), Functional Requirements, Fundamentos visuales (US1), Inventario de pantallas (US1, US3, US5), Jerarquía de las pantallas de juego (US5), Key Entities *(include if feature involves data)* (+4 more)

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

### Community 149 - "Constitution Check"
Cohesion: 0.43
Nodes (7): Constitution Check, Implementation Plan 003: Mejoras UX y simulacion, Research Fase 0 spec 003 (R1-R25), Feature Spec 003: Mejoras de interfaz, simulacion y experiencia, Requisitos de specs anteriores afectados (001, 002), T126 Enmienda PATCH v1.0.5 de la constitucion, Tasks spec 003 (T001-T133)

### Community 154 - "Implementation for User Story 2"
Cohesion: 0.40
Nodes (5): banquillo(), Correcciones de los hallazgos críticos, Implementation for User Story 2, Phase 4: User Story 2 — Preparar el equipo sobre un único campo con cartas a la vista (Priority: P1), Tests for User Story 2 ⚠️

### Community 155 - "Contrato de interfaz — spec 004"
Cohesion: 0.18
Nodes (11): 10. Nombres recortados (Edge Cases; research R9), 11. Textos renombrados durante la implementación (FR-035, FR-036), 1. Reglas globales (todas las pantallas del inventario), 2. Barra de navegación (FR-012a; research R8), 3. Inicio (FR-014, FR-015), 4. Marcadores (FR-016, FR-034), 5. Pantallas finales (FR-017), 7. Estados vacíos (FR-025) (+3 more)

### Community 156 - "Propuesta de enmienda PATCH 1.0.5 de la constitución (T126)"
Cohesion: 0.50
Nodes (3): Cambios propuestos, Propuesta de enmienda PATCH 1.0.5 de la constitución (T126), Sync Impact Report propuesto

### Community 157 - "7. Partido"
Cohesion: 0.40
Nodes (5): 7.1 Partido (tabla `partidos`), 7.2 Estadísticas de equipo (`EstadisticasEquipo`) — añadidos, 7.4 Métricas por jugador (`MetricasJugador`) — ✚, no se guardan, 7.5 Lote de decisiones (`partido.decisiones`) — mensaje, no entidad, 7. Partido

### Community 158 - "AlmacenPeticiones"
Cohesion: 0.20
Nodes (3): AlmacenPeticiones, AlmacenPeticionesBD, AlmacenPeticionesMemoria

### Community 159 - "Dependencies & Execution Order"
Cohesion: 0.40
Nodes (5): Dependencies & Execution Order, Grafo de historias, Parallel Opportunities, Phase Dependencies, Within Each User Story

### Community 161 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, db:generate, db:migrate, dev, seed, start, test:integration (+1 more)

### Community 162 - ".detener"
Cohesion: 0.67
Nodes (3): Implementation for User Story 8, Phase 10: User Story 8 — Abrir sobres con espectáculo (Priority: P2), Tests for User Story 8 ⚠️

### Community 163 - "8. Torneo"
Cohesion: 0.50
Nodes (4): 8.1 Eliminación (✚, derivada, no se guarda), 8.2 Vista del torneo por participante — añadidos, 8.3 Jornadas sin humanos en competición, 8. Torneo

### Community 164 - "Implementation Strategy"
Cohesion: 0.50
Nodes (4): Entrega incremental, Equipo en paralelo, Implementation Strategy, MVP primero (historias P1)

### Community 165 - "Partidas"
Cohesion: 0.38
Nodes (7): `GET /api/partidas/:id/torneo` (✎), Partidas, `POST /api/partidas` (✎), `POST /api/partidas/:id/pantalla-vista` (✚), `POST /api/partidas/:id/simular-resto` (✚), Eliminacion (eliminaciones, humanosEnCompeticion), PantallaDerrota y PantallaCampeon

### Community 167 - "R24 Equipaciones v2 (diseno + hasta 3 colores)"
Cohesion: 0.33
Nodes (6): EditorEquipacion y Camiseta SVG, Regla de parecido de equipaciones (umbral 0,45), patronDiseno(diseno, colores), R23 Nombre del equipo y perfil de la cuenta, R24 Equipaciones v2 (diseno + hasta 3 colores), US11 Nombre y equipacion a mi gusto (P3)

### Community 168 - "base.test.ts"
Cohesion: 0.33
Nodes (4): ESTADO_HTTP, RespuestaError, MsgAck, MsgEstado

### Community 170 - "sondaGoleadores.ts"
Cohesion: 0.25
Nodes (5): CASILLA_CENTRAL, OFENSIVIDAD, TABLA_SPEC, n, semillas

### Community 171 - "Validación de la spec 004 con personas (SC-003, SC-004, SC-010)"
Cohesion: 0.25
Nodes (8): Hallazgos, Preparación, Pruebas automáticas previas, Resultado, SC-003 — Prueba de cinco segundos, SC-004 — Valoración «se ve profesional y moderna», SC-010 — Tiempos de decisión, Validación de la spec 004 con personas (SC-003, SC-004, SC-010)

### Community 172 - "Frontend Design"
Cohesion: 0.29
Nodes (6): Design principles, Frontend Design, Ground your designs in the subject matter, More on writing in design, Process: plan, review against the brief, build, critique, Restraint and self-critique

### Community 174 - "Frontend Design"
Cohesion: 0.29
Nodes (6): Design principles, Frontend Design, Ground your designs in the subject matter, More on writing in design, Process: plan, review against the brief, build, critique, Restraint and self-critique

### Community 175 - "Quickstart — validar la spec 004"
Cohesion: 0.29
Nodes (7): 1. Comprobaciones rápidas (sin base de datos), 2. Comprobaciones automáticas de diseño (FR-040), 3. No regresión (FR-038, SC-008), 4. Revisión visual manual (SC-001), 5. Validación con personas (SC-003, SC-004, SC-010), Quickstart — validar la spec 004, Requisitos previos

### Community 176 - "Tokens — Spacing & Shapes"
Cohesion: 0.40
Nodes (5): Border Radius, Layout, Shadows, Spacing Scale, Tokens — Spacing & Shapes

### Community 177 - "Specification Quality Checklist: Mejoras visuales y de diseño (GUI + UX)"
Cohesion: 0.40
Nodes (5): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Mejoras visuales y de diseño (GUI + UX)

### Community 178 - "Lista de verificación visual — spec 004 (SC-001)"
Cohesion: 0.40
Nodes (5): Criterios, Escenarios concretos ([quickstart.md](../quickstart.md) §4), Hallazgos, Lista de verificación visual — spec 004 (SC-001), Pantallas

## Ambiguous Edges - Review These
- `equipacionEnPartido (resolucion de choque de colores)` → `Guardarrail esErrorAdmisible`  [AMBIGUOUS]
  specs/003-mejoras-ux-simulacion/data-model.md · relation: semantically_similar_to

## Knowledge Gaps
- **129 isolated node(s):** `@fbd/ai`, `@fbd/domain`, `@fbd/engine`, `@fbd/protocol`, `zod` (+124 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1216 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Research — Fase 0: Mejoras de interfaz, simulación y experiencia de juego` connect `Spec 003 Research` to `react`, `tiro.ts`, `Spec 001 Contracts Index`, `balonParado.ts`, `formaciones.ts`, `actores/torneo.ts`, `avanzar`, `partida/partida.ts`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `crearPartido()` (e.g. with `Entrada` and `Tests (escribir primero; deben fallar)`) actually correct?**
  _`crearPartido()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@fbd/ai`, `@fbd/domain`, `@fbd/engine` to the rest of the system?**
  _129 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Server Bootstrap & DB` be split into smaller, more focused modules?**
  _Cohesion score 0.05828277256848685 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `Server Bootstrap & DB` to `partido003.ts`, `catalogo/tipos.ts`, `tiro.ts`, `ReproduccionPartido.tsx`, `NombreRecortado`, `Jugador`, `evaluador.ts`, `partidoRapido.ts`, `ESLint & Dev Tooling`, `Field Placement Geometry`, `formaciones.ts`, `ServiciosPartida`, `npc.ts`, `BaseDatos`, `RelojReproduccion`, `identidad.ts`, `avanzar`, `partida/partida.ts`, `Alineacion.tsx`, `base.test.ts`, `sondaGoleadores.ts`, `CartaJugador.tsx`, `AperturaSobre.tsx`, `escenarios.ts`, `Rng`, `src/errores.ts`, `estado.ts`, `equipaciones.ts`, `mesa.ts`, `http/app.ts`, `interpolacion.ts`, `torneo/torneo.ts`, `balonParado.test.ts`, `ActorPartida`, `colores.ts`, `particulas.ts`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Should `catalogo/tipos.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.04471153846153846 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `equipacionEnPartido (resolucion de choque de colores)` and `Guardarrail esErrorAdmisible`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._