# Graph Report - futboosterdraft  (2026-10-20)

## Corpus Check
- 467 files · ~405,273 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 8, .woff2 2, .css 2)

## Summary
- 3358 nodes · 9901 edges · 153 communities (123 shown, 30 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 490 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `29bf61e1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Server Bootstrap & DB
- partido003.ts
- catalogo/tipos.ts
- AperturaSobre
- servidor.ts
- Migracion 0004_mejoras.sql
- Web API Client
- parametrosActuales
- receptor.ts
- Constitution Principles
- Partido2D.tsx
- partidoEntreHumanos.ts
- equipo/alineacion.ts
- NPC Line-up & Draft AI
- partidoRapido.ts
- ESLint & Dev Tooling
- EstadoTorneo
- specials.ts
- Field Placement Geometry
- Speckit Scripts
- Server Dependencies
- decisiones.ts
- servicios.ts
- npc.ts
- actores/torneo.ts
- BaseDatos
- Replay Clock
- juego.ts
- identidad.ts
- actores/draft.ts
- avanzar
- partida/partida.ts
- RepoPartidas
- Spec 002 Validation & Balance
- crearServidor
- equipo/colocacion.ts
- Spec 003 NPC Difficulty
- CI & Docker Infra
- Match Notice & Connection
- GestionEquipo.tsx
- tiro.ts
- Spec 001 Entities & API
- Tasks: Mejoras de interfaz, simulación y experiencia de juego
- CartaJugador.tsx
- Navigation Frame
- VersionNoSoportada
- escenarios.ts
- Server Package Config
- autoAlineacion
- Load Test (k6)
- actor.ts
- balonParado.ts
- Tabla perfiles_usuario
- http/app.ts
- Torneo.tsx
- FormacionId
- Spec 001 Research
- Balance Package
- Rng
- Spec Requirements Checklists
- Jugador
- estado.ts
- Spec 003 Realtime Protocol
- equipaciones.ts
- TS Base Config
- Speckit Skills
- e2e/ayudas.ts
- calendario.ts
- mesa.ts
- Spec 001 HTTP Contract
- Catalogo
- Spec 003 Research
- animaciones.ts
- Pasarela
- Fixtures Package
- equipo/dorsales.test.ts
- Protocol Package
- formaciones.ts
- Spec 001 Contracts Index
- RepoDraft
- AI Package
- Single Pitch & Batch Decisions
- User Scenarios & Testing *(mandatory)*
- ServicioAvisos
- Engine Package
- AperturaSobre.tsx
- torneo/torneo.ts
- Web Package
- Spec 003 HTTP Changes
- Spec 003 UI Contract
- balonParado.test.ts
- @playwright/test
- particulas.ts
- Domain Package
- Lienzo2D.tsx
- equivalenciaFinalizar.test.ts
- Spec 001 Load Results
- Web Dependencies
- Checklist de requisitos: Simulación 2D y finalización
- Web TS Config
- ref_zod
- Alineacion.tsx
- `PUT /api/partidas/:id/nombre-equipo` (✚)
- Web Scripts
- Calibración del motor 3.0.0 (T033)
- umbralMotor.ts
- Spec 002 Engine Ops
- devDependencies
- Server TS Config
- devDependencies
- AI TS Config
- Domain TS Config
- Engine TS Config
- Protocol TS Config
- apertura.spec.ts
- Balance TS Config
- Fixtures TS Config
- Constitution Governance
- torneo-asincrono.spec.ts
- torneo-final.spec.ts
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
- T086 Engine Perf
- T159 Validation
- Implementation for User Story 2
- Propuesta de enmienda PATCH 1.0.5 de la constitución (T126)
- scripts
- Partidas
- R24 Equipaciones v2 (diseno + hasta 3 colores)
- drizzle-kit
- tsup

## God Nodes (most connected - your core abstractions)
1. `vitest` - 95 edges
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

## Communities (153 total, 30 thin omitted)

### Community 0 - "Server Bootstrap & DB"
Cohesion: 0.06
Nodes (77): OpcionesJornada, programarJornada(), ruta, conectar(), ConexionBD, aplicarMigraciones(), CARPETA_MIGRACIONES, cargarCatalogo() (+69 more)

### Community 1 - "partido003.ts"
Cohesion: 0.06
Nodes (92): calcularMedia(), CASILLA_CENTRAL, proponerLanzadores(), EstadisticasEquipo, comprobacionesColocacion(), comprobarSC011(), comprobarSC018(), pct() (+84 more)

### Community 2 - "catalogo/tipos.ts"
Cohesion: 0.05
Nodes (60): DEM, jugador(), plantilla(), DISTRIBUCION_CORE, RecuentoCatalogo, CLAVES_STATS, Demarcacion, DEMARCACIONES (+52 more)

### Community 3 - "AperturaSobre"
Cohesion: 0.50
Nodes (5): AperturaSobre(), calendarioApertura(), especial(), Apertura de sobre (`AperturaSobre`, FR-011 a FR-015; research R21), R21. Apertura de sobres y sonido (FR-011 a FR-015, SC-019)

### Community 4 - "servidor.ts"
Cohesion: 0.04
Nodes (54): crearAuth(), crearLogger(), crearMetricas(), ESTADO_HTTP, RespuestaError, ConsultaReproduccion, CuerpoAbrir, Marcador (+46 more)

### Community 5 - "Migracion 0004_mejoras.sql"
Cohesion: 0.05
Nodes (33): Alineacion.colocacion { jugadorId, x, y }, EstadisticasEquipo (pases, centros, precisionPase, secuencias), EstadoMotor: ancla, posicion, perfil, espacio, posesion, EstadoTorneo.aportaciones y tablaGoleadores/tablaAsistentes, Fotograma v2 y AccionVisible, MesaDraft.pausadaEn / restanteMs, ParametrosEquilibrado 2.0.0 (v2.json), Partido.resolucion ('directo'|'apertura'|'plazo'|'npc') y abiertoPorId (+25 more)

### Community 6 - "Web API Client"
Cohesion: 0.08
Nodes (32): ErrorApi, ConSesion(), router, Rutas(), EstadoSesion, useSesion, Usuario, raiz (+24 more)

### Community 7 - "parametrosActuales"
Cohesion: 0.25
Nodes (23): alineacionAutomatica(), alineacionVigente(), bajasActivas(), cambiarDorsal(), cambiarEquipaciones(), confirmarAlineacion(), dorsalesIniciales(), errorDeAlineacion() (+15 more)

### Community 8 - "receptor.ts"
Cohesion: 0.13
Nodes (36): esPortero(), holgura(), radioDe(), PlanPase, CERCA_REMATE, entorno, factorConduccion(), factorPaseLargo() (+28 more)

### Community 9 - "Constitution Principles"
Cohesion: 0.09
Nodes (24): Simulación 2D en tiempo real, Simulación rápida, AccionVisible, avanzar modo 'ticks' con hastaTick, decidirNPCEnPausa, Invariante 6b: cortes por ticks inocuos, Invariante 5: finalizar es equivalente, Invariante 7: fotogramas inocuos (+16 more)

### Community 10 - "Partido2D.tsx"
Cohesion: 0.09
Nodes (51): Fotograma, accionEn(), AccionVista, DatosReproduccion, ETIQUETA_ACCION, jugadoresDe(), LanzamientoVista, Lienzo2D() (+43 more)

### Community 11 - "partidoEntreHumanos.ts"
Cohesion: 0.12
Nodes (20): cacheReproducciones, rehacer(), reproduccion(), resolverPartidoEntreHumanos(), terminarPartidoEntreHumanosEnJuego(), Tramos, EntradaGuardada, reconstruirMotor() (+12 more)

### Community 12 - "equipo/alineacion.ts"
Cohesion: 0.08
Nodes (33): POSICIONES, CodigoErrorAlineacion, ErrorAlineacion, MAX_SUPLENTES, Previsualizacion, Titular, TITULARES, TitularPrevisualizado (+25 more)

### Community 13 - "NPC Line-up & Draft AI"
Cohesion: 0.10
Nodes (35): TACTICA_DEFENSIVA, TACTICA_OFENSIVA, elegirCarta(), elegirCartaDetallada(), formacionObjetivo(), inicioDudosa(), OpcionesDraft, decisionDudosa() (+27 more)

### Community 14 - "partidoRapido.ts"
Cohesion: 0.14
Nodes (34): avanzar2D(), crearEstado2D(), Estado2D, olvidarVistos(), procesarReproduccion(), Resultado, Tramo2D, vista2D() (+26 more)

### Community 15 - "ESLint & Dev Tooling"
Cohesion: 0.05
Nodes (40): sinNoDeterminismo, devDependencies, eslint, @eslint/js, fast-check, globals, prettier, tsx (+32 more)

### Community 16 - "EstadoTorneo"
Cohesion: 0.24
Nodes (8): EstadoBajas, Eliminacion, eliminacionDe(), eliminaciones(), ETIQUETA_FASE, FaseEliminacion, humanosEnCompeticion(), EstadoTorneo

### Community 17 - "specials.ts"
Cohesion: 0.17
Nodes (18): portero(), resolver(), minutoDeJuego(), cacheAtributos, S, TRADUCCION, acumularCansancio(), minutoInicioCansancio() (+10 more)

### Community 18 - "Field Placement Geometry"
Cohesion: 0.12
Nodes (40): acotar(), dividir(), escalar(), isqrt(), norma(), colocarSaqueInicial(), objetivosBalonParado(), PUNTOS_AREA (+32 more)

### Community 19 - "Speckit Scripts"
Cohesion: 0.11
Nodes (30): check-prerequisites.sh script, check_dir(), check_file(), find_specify_root(), format_speckit_command(), get_current_branch(), get_feature_paths(), get_invoke_separator() (+22 more)

### Community 20 - "Server Dependencies"
Cohesion: 0.10
Nodes (20): dependencies, ajv, ajv-formats, better-auth, drizzle-orm, fastify, @fastify/compress, @fastify/cookie (+12 more)

### Community 21 - "decisiones.ts"
Cohesion: 0.18
Nodes (21): aplicarLote(), DecisionLote, ResultadoLote, DEM, enDescanso(), equipo(), jugador(), lote() (+13 more)

### Community 22 - "servicios.ts"
Cohesion: 0.05
Nodes (16): Difusor, ServiciosPartida, DependenciasApp, Metricas, RepoEquipo, RepoPartidos, RepoPerfiles, RepoTorneo (+8 more)

### Community 23 - "npc.ts"
Cohesion: 0.15
Nodes (29): decidirAlineacion(), decidirAlineacionDetallada(), ErrorEleccion, jugarHastaElFinal(), FamiliaError, equipoDesdeAlineacion(), Rendimiento, FamiliaErrorNPC (+21 more)

### Community 24 - "actores/torneo.ts"
Cohesion: 0.10
Nodes (47): entreHumanos(), crearPartidosJornada(), resolverPartidosSinHumanos(), abandonar(), abrirSiguienteJornada(), avisarHumanos(), AVISO_PLAZO_MS, despuesDePartido() (+39 more)

### Community 25 - "BaseDatos"
Cohesion: 0.07
Nodes (41): NuevoAviso, ambitoSpecial(), filaAJugador(), registrarRutasCatalogo(), TEXTOS_SPECIALS, BaseDatos, POOL_POR_DEFECTO, jugadores (+33 more)

### Community 26 - "Replay Clock"
Cohesion: 0.08
Nodes (15): CLAVE_VELOCIDAD, EstadoReloj, guardarVelocidad(), INTERVALO_INFORME_MS, MotivoPausa, OpcionesReloj, RelojReproduccion, TICKS_LANZAMIENTO (+7 more)

### Community 27 - "juego.ts"
Cohesion: 0.12
Nodes (43): balonCon(), fueraDeJuego(), cercanoACelda(), elegirPonderado(), interrumpir(), jugadorPorId(), actualizarPosesion(), ajusteSpecialsAccion() (+35 more)

### Community 28 - "identidad.ts"
Cohesion: 0.17
Nodes (19): cambiarNombreEquipo(), clavesUsadas(), identidadInicial, nombresAjustados, nombresUsados(), registrarRutasPerfil(), CampoNombreEquipo(), Props (+11 more)

### Community 29 - "actores/draft.ts"
Cohesion: 0.07
Nodes (56): ContextoComando, abrirTurno(), dudosasHechas, emitirProgreso(), iniciarDraft(), mensajeTurno(), pendientesDeMesa(), procesarEleccion() (+48 more)

### Community 30 - "avanzar"
Cohesion: 0.09
Nodes (31): hasta(), semilla, crearPartido(), estadisticasVacias(), aplicarDecision(), DecisionRegistrada, avanzar(), cambioQueNoEspera() (+23 more)

### Community 31 - "partida/partida.ts"
Cohesion: 0.10
Nodes (26): ConfigPartida, configPorDefecto(), debeAbandonarsePorDesconexion(), Dificultad, DIFICULTADES, ErrorConfig, EventoPartida, humanosActivos() (+18 more)

### Community 32 - "RepoPartidas"
Cohesion: 0.05
Nodes (33): RepoPartidas, EstadoPartida, 10. Resumen de relaciones (añadidos), 3.1 Nombre de equipo (regla de dominio), 3. Participante (tabla `participantes`), 4. Equipación (`Equipacion` v2), 5. Perfil de usuario (✚ tabla `perfiles_usuario`), 7.1 Partido (tabla `partidos`) (+25 more)

### Community 33 - "Spec 002 Validation & Balance"
Cohesion: 0.09
Nodes (30): Clarificaciones y ajustes de la spec (2026-10-15), Checklist de calidad de la spec, Resultados balance --n 1000, Invariante: equivalencia entre modalidades, statsEfectivos(), Quickstart de validación, Escenario A: Draft en solitario como invitado, Escenario B: Preparación del equipo (+22 more)

### Community 34 - "crearServidor"
Cohesion: 0.15
Nodes (8): GestorPartidas, misPartidas(), programarBusqueda(), registrarRutasPartidas(), principal(), urlBaseDatos(), RelojReal, crearServidor()

### Community 35 - "equipo/colocacion.ts"
Cohesion: 0.14
Nodes (23): Posicion, calcularColocacion(), dispersion(), media(), PESO, posicionEn(), separar(), TitularColocado (+15 more)

### Community 36 - "Spec 003 NPC Difficulty"
Cohesion: 0.08
Nodes (26): Informe HTML de balance (informe.html), Guardarrail contra decisiones absurdas, Perfil 'automatico' (avanzado sin errores), R10 Peso medible de los specials, R12 Dificultad NPC por calidad de decision (PerfilNPC.errores), R13 Participante de referencia, R25 Verificacion de los criterios de exito, R2 Parametros 3.0.0 (v3.json) (+18 more)

### Community 37 - "CI & Docker Infra"
Cohesion: 0.08
Nodes (26): CI workflow (GitHub Actions), Paso pnpm balance --n 500, Paso umbral-motor (FR-028a, continue-on-error), Web index.html (entrada React main.tsx), docker-compose (dev services), Servicio db (postgres:16), Servicio mail (mailpit), Guía de despliegue (+18 more)

### Community 38 - "Match Notice & Connection"
Cohesion: 0.09
Nodes (22): ENLACES, Marco(), partidaDeRuta(), Salida, salidaDe(), mantenerConexionInvitado(), soltarConexionInvitado(), EstadoServidor (+14 more)

### Community 39 - "GestionEquipo.tsx"
Cohesion: 0.13
Nodes (31): Arrastre, Props, acotar(), cambiarFormacion(), casillaDe(), colocacionDe(), DestinoSoltar, distancia() (+23 more)

### Community 40 - "tiro.ts"
Cohesion: 0.13
Nodes (29): Duelo, probabilidad(), sigmoide(), desplazamientoTiro(), pesoTiro(), defensaDe(), despejeEnPropia(), golEnPropia() (+21 more)

### Community 41 - "Spec 001 Entities & API"
Cohesion: 0.16
Nodes (23): aplicarDecision(), Mensaje draft.elegir, Entidad Alineacion, Entidad Aviso, Entidad Baja y ContadorAmarillas, Entidad DecisionPartido, Data Model 001, Entidad Eleccion (+15 more)

### Community 42 - "Tasks: Mejoras de interfaz, simulación y experiencia de juego"
Cohesion: 0.06
Nodes (34): Dependencies & Execution Order, Entrega incremental, Equipo en paralelo, Format: `[ID] [P?] [Story] Description`, Grafo de historias, Implementation for User Story 4, Implementation for User Story 7, Implementation for User Story 8 (+26 more)

### Community 43 - "CartaJugador.tsx"
Cohesion: 0.12
Nodes (24): BotonAvanzar(), CartaJugador(), ContenidoCompacto(), ContenidoCompleto(), Posiciones(), Props, Specials(), edad() (+16 more)

### Community 44 - "Navigation Frame"
Cohesion: 0.17
Nodes (14): activado, buferes, cambiarSonido(), cargar(), CLAVE_SONIDO, Efecto, EfectoFichero, GANANCIA (+6 more)

### Community 45 - "VersionNoSoportada"
Cohesion: 0.29
Nodes (8): EntradaPartido, Comportamiento (reglas comprobables), Contrato del motor de simulación — cambios de la spec 003, Entrada, Invariantes comprobados por pruebas, Operaciones, Rendimiento, Salida: estadísticas

### Community 46 - "escenarios.ts"
Cohesion: 0.23
Nodes (15): cumpleEscenario(), entradaEscenario(), equipo(), Escenario, jugar(), NombreEscenario, plantillasEscenario(), VERSION_ESCENARIOS (+7 more)

### Community 47 - "Server Package Config"
Cohesion: 0.08
Nodes (25): exports, @fbd/ai, @fbd/domain, @fbd/engine, @fbd/protocol, zod, name, private (+17 more)

### Community 48 - "autoAlineacion"
Cohesion: 0.13
Nodes (20): alineacionCorrecta(), tacticaSegunRival(), fuerzaAlineacion(), fuerzaPlantilla(), autoAlineacion(), ALTURAS_BLOQUE, ErrorTactica, ESTILOS_CON_BALON (+12 more)

### Community 49 - "Load Test (k6)"
Cohesion: 0.13
Nodes (20): apertura, bloqueadas, cabeceras(), cookieDe(), crearUsuario(), descanso, entregaSobre, erroresWs (+12 more)

### Community 50 - "actor.ts"
Cohesion: 0.11
Nodes (4): ActorPartida, Destino, MensajeSaliente, RegistroActores

### Community 51 - "balonParado.ts"
Cohesion: 0.12
Nodes (38): lanzadorEfectivo(), gol(), reponer(), amarilla(), falta(), faltaDirecta(), penalti(), probabilidadTiroDirecto() (+30 more)

### Community 52 - "Tabla perfiles_usuario"
Cohesion: 0.25
Nodes (11): POST /api/partidos/:id/abrir (modalidad), `preparacion.inicio` (✎), Migraciones 0006 a 0008, ModoSimulacion ('rapida' | '2d'), Tabla participantes (ultima_modalidad, pantallas vistas), partidos.modalidades (por participante), Migraciones 0006_modo_simulacion, 0007_pantallas_torneo, 0008_identidad, SelectorModo (+3 more)

### Community 53 - "http/app.ts"
Cohesion: 0.08
Nodes (41): apodoValido(), aUsuarioSesion(), Auth, OpcionesAuth, UsuarioSesion, cabecerasWeb(), crearHooksSesion(), fastify (+33 more)

### Community 54 - "Torneo.tsx"
Cohesion: 0.08
Nodes (49): abrirPartido(), api(), marcarPantallaVista(), marcarVisto(), obtenerReproduccion(), OpcionesPeticion, revelarResultado(), siguienteJornada() (+41 more)

### Community 55 - "FormacionId"
Cohesion: 0.14
Nodes (18): AlineacionPartido, EstadoEquipo, EventoEquipo, MAX_SUSTITUCIONES, Borrador, alineacion, eventos, Special (+10 more)

### Community 56 - "Spec 001 Research"
Cohesion: 0.12
Nodes (22): avanzar(estado, modo), apps/server, apps/web, Constitution Check (Principios I-X), Implementation Plan 001, packages/ai, packages/domain, packages/engine (+14 more)

### Community 57 - "Balance Package"
Cohesion: 0.11
Nodes (18): bin, balance, dependencies, @fbd/ai, @fbd/domain, @fbd/engine, exports, @fbd/ai (+10 more)

### Community 58 - "Rng"
Cohesion: 0.10
Nodes (29): plantillaCore(), draft(), rellenarConNPC(), estadoDesdeSemilla(), hash128(), Rng, rotl(), Semilla (+21 more)

### Community 59 - "Spec Requirements Checklists"
Cohesion: 0.15
Nodes (11): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Mejoras de interfaz, simulación y experiencia de juego, Penalti por criterio espacial (FR-020), Seleccion de receptor por distancia y direccion (FR-016), VersionNoSoportada (parametros < 3) (+3 more)

### Community 60 - "Jugador"
Cohesion: 0.17
Nodes (28): AlineacionGuardada, conErrores(), LIMITE_PRO_MS, CartaValorada, ContextoErrores, CRUCE_MAXIMO, DESPLAZAMIENTOS, DISTANCIA_DUDOSA (+20 more)

### Community 61 - "estado.ts"
Cohesion: 0.11
Nodes (36): EstadoRng, Contexto, radioIntervencion(), rivalCercano(), fotograma(), AccionEnCurso, Balon, crearEquipo() (+28 more)

### Community 62 - "Spec 003 Realtime Protocol"
Cohesion: 0.18
Nodes (10): Cliente → servidor, `estado` (✎), Garantías de orden (añadidas), `partido.decision_aplicada` (sin cambios de forma), `partido.decisiones` (✚), `partido.reproduccion` (sin cambios), Protocolo en tiempo real — cambios de la spec 003, Servidor → cliente (+2 more)

### Community 63 - "equipaciones.ts"
Cohesion: 0.06
Nodes (54): equipacionesDe(), equipacionesDelPartido(), Camiseta(), Props, COLOR_NUEVO, ETIQUETA_DISENO, Props, chocan() (+46 more)

### Community 64 - "TS Base Config"
Cohesion: 0.12
Nodes (16): compilerOptions, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+8 more)

### Community 65 - "Speckit Skills"
Cohesion: 0.24
Nodes (11): speckit-analyze skill, speckit-checklist skill, speckit-clarify skill, speckit-constitution skill, speckit-converge skill, speckit-implement skill, speckit-plan skill, speckit-specify skill (+3 more)

### Community 66 - "e2e/ayudas.ts"
Cohesion: 0.20
Nodes (7): abrirFormacion(), arrastrarSobre(), partidaTrasDraft(), sustituirEnGestion(), Carta, hastaElDescansoRapida(), Torneo

### Community 67 - "calendario.ts"
Cohesion: 0.33
Nodes (4): Modo, CrucePartido, JornadaCalendario, partidosTotales()

### Community 68 - "mesa.ts"
Cohesion: 0.17
Nodes (28): abandonarDraft(), eleccionNPC(), asientoDe(), cartaAutomatica(), CodigoErrorDraft, crearMesa(), Eleccion, eleccionDelTurno() (+20 more)

### Community 69 - "Spec 001 HTTP Contract"
Cohesion: 0.13
Nodes (14): Rutas /api/partidas/:id/alineacion, POST /api/auth/invitado, Contrato HTTP/JSON, GET /api/partidas/:id/plantillas, POST /api/partidas, GET /api/partidas/:id/torneo, Protocolo en tiempo real (WebSocket), Mensaje draft.progreso (+6 more)

### Community 70 - "Catalogo"
Cohesion: 0.12
Nodes (7): procesarDecisionPartido(), OpcionesLimitador, AlmacenPeticiones, AlmacenPeticionesBD, Catalogo, ConfigServidor, Implementation for User Story 5

### Community 71 - "Spec 003 Research"
Cohesion: 0.11
Nodes (18): R10. Peso medible de los specials (FR-022, SC-007), R12. Dificultad de los NPC por calidad de decisión (FR-036 a FR-038, SC-010, SC-010a, SC-010b), R13. Participante de referencia y comprobación de SC-010, R15. Vista ampliada de la carta (FR-004, FR-005, SC-015), R17. Gestión del equipo durante el partido (FR-027 a FR-031, SC-016), R18. Pantalla de resultado al finalizar (FR-024 a FR-026, SC-017), R1. Línea base del motor actual y diagnóstico (US1), R20. Diseño de las cartas (FR-008 a FR-010, SC-012) (+10 more)

### Community 72 - "animaciones.ts"
Cohesion: 0.21
Nodes (22): abrir(), BALON_DE, cerrar(), conducir(), controlar(), hasta(), posicion(), recuperarSuelto() (+14 more)

### Community 73 - "Pasarela"
Cohesion: 0.20
Nodes (3): Manejador, OpcionesPasarela, Pasarela

### Community 74 - "Fixtures Package"
Cohesion: 0.13
Nodes (14): dependencies, @fbd/domain, @fbd/engine, exports, @fbd/domain, @fbd/engine, name, private (+6 more)

### Community 75 - "equipo/dorsales.test.ts"
Cohesion: 0.17
Nodes (12): asignarDorsal(), completarDorsales(), DORSAL_FIJO, DORSAL_MAXIMO, DORSAL_MINIMO, Dorsales, DORSALES_INICIALES, ErrorDorsales (+4 more)

### Community 76 - "Protocol Package"
Cohesion: 0.14
Nodes (13): dependencies, @fbd/domain, zod, exports, ./schemas/*, @fbd/domain, zod, name (+5 more)

### Community 77 - "formaciones.ts"
Cohesion: 0.13
Nodes (14): defensaCinco, defensaCuatro, defensaTres, formacion, FORMACIONES, FORMACIONES_IDS, FORMACIONES_LISTA, POR (+6 more)

### Community 78 - "Spec 001 Contracts Index"
Cohesion: 0.20
Nodes (9): avanzar(estado, modo, opciones), OpcionesAvance (fotogramas, metricas), ResultadoPartido, EstadisticasEquipo (pases y tiros por zona, golesPorTipo), MetricasJugador (no persistidas), TipoTiro (propia) y zonaRemate en eventos de tiro/gol, Herramienta balance (informe.html), Escenarios de validacion manual A a L (+1 more)

### Community 80 - "AI Package"
Cohesion: 0.15
Nodes (12): dependencies, @fbd/domain, @fbd/engine, exports, @fbd/domain, @fbd/engine, name, private (+4 more)

### Community 81 - "Single Pitch & Batch Decisions"
Cohesion: 0.12
Nodes (16): Formacion: Alineacion sobre CampoEquipo, BarraPrincipal (un boton principal por pantalla), CampoEquipo (campo unico compartido), GestionEquipo (gestion durante el partido), humanosEnCompeticion, Lote atomico partido.decisiones, R14 Formacion con un unico campo, R17 Gestion del equipo durante el partido (+8 more)

### Community 82 - "User Scenarios & Testing *(mandatory)*"
Cohesion: 0.05
Nodes (38): Apertura de los sobres (US8), Assumptions, Botones principales (US4), Clarifications, Dificultad de los NPC (US9), Diseño de las cartas (US7), Edge Cases, Feature Specification: Mejoras de interfaz, simulación y experiencia de juego (+30 more)

### Community 84 - "Engine Package"
Cohesion: 0.17
Nodes (11): dependencies, @fbd/domain, exports, @fbd/domain, name, private, scripts, bench (+3 more)

### Community 86 - "AperturaSobre.tsx"
Cohesion: 0.16
Nodes (14): COLOR_PARTICULAS, DURACION_MAXIMA_MS, DURACION_SOBRE_MS, ESCALONADO_MS, EstadoCarta, Fase, FUNDIDO_MS, GIRO_MS (+6 more)

### Community 87 - "torneo/torneo.ts"
Cohesion: 0.09
Nodes (32): aplicarConsecuencias(), autor(), Baja, bajasActivas(), estadoBajasVacio(), EventoConsecuencia, MotivoBaja, PartidoConsecuencias (+24 more)

### Community 88 - "Web Package"
Cohesion: 0.18
Nodes (10): @fbd/domain, @fbd/protocol, name, private, type, version, @types/react, @types/react-dom (+2 more)

### Community 89 - "Spec 003 HTTP Changes"
Cohesion: 0.18
Nodes (11): Contrato HTTP/JSON — cambios de la spec 003, `GET /api/partidas/:id/alineacion` (✎), `GET /api/partidos/:id` (✎), `GET /api/partidos/:id/reproduccion?modalidad=rapida|2d` (✎), `GET /api/perfil`, Partidos, Perfil de usuario (✚), Plantilla, alineación y equipaciones (+3 more)

### Community 90 - "Spec 003 UI Contract"
Cohesion: 0.12
Nodes (13): Fútboosterdraft Constitution, CLAUDE.md (instrucciones del proyecto), Contrato de interfaz (spec 002), Barra principal (`BarraPrincipal`, FR-006, FR-007; research R16), Carta de jugador (`CartaJugador`, FR-008 a FR-010; research R20), Contrato de interfaz — spec 003, Derrota y campeón (`PantallaDerrota`, `PantallaCampeon`, FR-039 a FR-041b; research R22), «Formación» (`Alineacion` sobre `CampoEquipo`, FR-001 a FR-003; research R14) (+5 more)

### Community 92 - "balonParado.test.ts"
Cohesion: 0.21
Nodes (18): MotivoPaseLargo, contextoDe(), darBalon(), DEM, partido(), situar(), soloEnCampo(), titularEn() (+10 more)

### Community 95 - "particulas.ts"
Cohesion: 0.17
Nodes (7): FPS_MINIMO, iniciarParticulas(), OpcionesParticulas, Particula, PRESUPUESTO_MS, SistemaParticulas, VENTANA_FPS_MS

### Community 96 - "Domain Package"
Cohesion: 0.25
Nodes (7): exports, name, private, scripts, typecheck, type, version

### Community 97 - "Lienzo2D.tsx"
Cohesion: 0.13
Nodes (22): agregarFotogramas(), fuera(), hermite(), indiceFotograma(), parabola(), pendiente(), Posiciones, posicionesEn() (+14 more)

### Community 98 - "equivalenciaFinalizar.test.ts"
Cohesion: 0.24
Nodes (13): decidirNPCEnPausa(), NivelesPartido, resolverResto(), ResultadoResolverResto, comprobar(), conProrroga(), jugarHasta(), NIVELES (+5 more)

### Community 99 - "Spec 001 Load Results"
Cohesion: 0.24
Nodes (7): Resultados de carga SC-017, Validación del MVP (T144), Cabecera Idempotency-Key, Instantánea estado en reconexión, Descarte de duplicados por requestId, SC-017: 100 partidas simultáneas, T144 Validación quickstart

### Community 100 - "Web Dependencies"
Cohesion: 0.29
Nodes (7): dependencies, @fbd/domain, @fbd/protocol, react, react-dom, react-router, zustand

### Community 101 - "Checklist de requisitos: Simulación 2D y finalización"
Cohesion: 0.13
Nodes (17): crearPartido(), Contrato del motor (engine-api), EntradaPartido, ResultadoTramo, Mensaje partido.tramo, Checklist de requisitos: Simulación 2D y finalización, Presión coordinada (excepción a máx. 2 jugadores al balón), Prueba de carga k6 beta-100 (no validada) (+9 more)

### Community 103 - "Web TS Config"
Cohesion: 0.29
Nodes (6): compilerOptions, jsx, lib, extends, include, ../../tsconfig.base.json

### Community 105 - "ref_zod"
Cohesion: 0.22
Nodes (8): AlineacionEntrada, Color, DorsalesEntrada, EquipacionesEntrada, EquipacionV1, EquipacionV2, TacticaEntrada, CuerpoPerfil

### Community 106 - "Alineacion.tsx"
Cohesion: 0.08
Nodes (32): CampoEquipo(), CartaResumen, BajaVista, DistintivoBaja(), ETIQUETA_MOTIVO, apellido(), EditorDorsales(), Props (+24 more)

### Community 107 - "`PUT /api/partidas/:id/nombre-equipo` (✚)"
Cohesion: 0.22
Nodes (10): GET/PUT /api/perfil, `PUT /api/partidas/:id/nombre-equipo` (✚), PUT /api/partidas/:id/equipaciones (v2), `partido.inicio` (✎), Sala, EditorEquipacion y Perfil (nombre y equipacion), desdeV1 (conversion equipaciones v1 a v2), Equipacion v2 (diseno, colores), equipacionEnPartido (resolucion de choque de colores) (+2 more)

### Community 108 - "Web Scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, e2e, preview, typecheck

### Community 109 - "Calibración del motor 3.0.0 (T033)"
Cohesion: 0.06
Nodes (34): Calibración del motor 3.0.0 (T033), Configuración final: la de la ronda 7, Línea base (motor 2.0.0, `c8a1627`), Pendiente, Ronda 10 (`--serie todas`, n = 500): ronda 7 más el peso del centro 3,9 / 2,8, Ronda 11 (tras H8, H11 y H13; `--serie todas`, n = 500), Ronda 12 y 13: llegada orgánica y regate hacia dentro (H11, decisión del 2026-10-20), Ronda 5 (`pnpm balance --n 500 --serie todas`, 1.648,7 s) (+26 more)

### Community 110 - "umbralMotor.ts"
Cohesion: 0.13
Nodes (12): simularCandidata(), PARAMETROS_V1, PARAMETROS_V3, entrada(), i, local, MAX_METRICAS_MS, MAX_PARTIDO_MS (+4 more)

### Community 111 - "Spec 002 Engine Ops"
Cohesion: 0.40
Nodes (6): penalizacionPorPosicion(j, destino, p), previsualizar(alineacion) -> Previsualizacion, statsEfectivos(j, destino, p, ctx), zonaEn(x, y), POST /api/partidas/:id/alineacion/previsualizar, Colocación libre (FR-034)

### Community 112 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, drizzle-kit, pino-pretty, testcontainers, @testcontainers/postgresql, tsup, @types/nodemailer, @types/pg (+1 more)

### Community 113 - "Server TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, extends, include, ../../tsconfig.base.json

### Community 115 - "devDependencies"
Cohesion: 0.33
Nodes (6): devDependencies, @playwright/test, @types/react, @types/react-dom, vite, @vitejs/plugin-react

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

### Community 127 - "torneo-final.spec.ts"
Cohesion: 0.50
Nodes (3): jugarHastaCaer(), sabotear(), Vista

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

### Community 154 - "Implementation for User Story 2"
Cohesion: 0.33
Nodes (6): banquillo(), Correcciones de los hallazgos críticos, R14. «Formación» con un único campo (FR-001 a FR-003, FR-002a), Implementation for User Story 2, Phase 4: User Story 2 — Preparar el equipo sobre un único campo con cartas a la vista (Priority: P1), Tests for User Story 2 ⚠️

### Community 156 - "Propuesta de enmienda PATCH 1.0.5 de la constitución (T126)"
Cohesion: 0.50
Nodes (3): Cambios propuestos, Propuesta de enmienda PATCH 1.0.5 de la constitución (T126), Sync Impact Report propuesto

### Community 161 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, db:generate, db:migrate, dev, seed, start, test:integration (+1 more)

### Community 165 - "Partidas"
Cohesion: 0.38
Nodes (7): `GET /api/partidas/:id/torneo` (✎), Partidas, `POST /api/partidas` (✎), `POST /api/partidas/:id/pantalla-vista` (✚), `POST /api/partidas/:id/simular-resto` (✚), Eliminacion (eliminaciones, humanosEnCompeticion), PantallaDerrota y PantallaCampeon

### Community 167 - "R24 Equipaciones v2 (diseno + hasta 3 colores)"
Cohesion: 0.33
Nodes (6): EditorEquipacion y Camiseta SVG, Regla de parecido de equipaciones (umbral 0,45), patronDiseno(diseno, colores), R23 Nombre del equipo y perfil de la cuenta, R24 Equipaciones v2 (diseno + hasta 3 colores), US11 Nombre y equipacion a mi gusto (P3)

## Ambiguous Edges - Review These
- `equipacionEnPartido (resolucion de choque de colores)` → `Guardarrail esErrorAdmisible`  [AMBIGUOUS]
  specs/003-mejoras-ux-simulacion/data-model.md · relation: semantically_similar_to

## Knowledge Gaps
- **129 isolated node(s):** `@fbd/ai`, `@fbd/domain`, `@fbd/engine`, `@fbd/protocol`, `zod` (+124 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1049 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Research — Fase 0: Mejoras de interfaz, simulación y experiencia de juego` connect `Spec 003 Research` to `AperturaSobre`, `Match Notice & Connection`, `partidoEntreHumanos.ts`, `Spec 001 Contracts Index`, `balonParado.ts`, `actores/torneo.ts`, `Implementation for User Story 2`, `juego.ts`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `crearPartido()` (e.g. with `Entrada` and `Tests (escribir primero; deben fallar)`) actually correct?**
  _`crearPartido()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@fbd/ai`, `@fbd/domain`, `@fbd/engine` to the rest of the system?**
  _129 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Server Bootstrap & DB` be split into smaller, more focused modules?**
  _Cohesion score 0.06410663281497937 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `Server Bootstrap & DB` to `partido003.ts`, `catalogo/tipos.ts`, `servidor.ts`, `Partido2D.tsx`, `partidoEntreHumanos.ts`, `equipo/alineacion.ts`, `NPC Line-up & Draft AI`, `ESLint & Dev Tooling`, `EstadoTorneo`, `Field Placement Geometry`, `decisiones.ts`, `servicios.ts`, `BaseDatos`, `Replay Clock`, `identidad.ts`, `avanzar`, `partida/partida.ts`, `equipo/colocacion.ts`, `GestionEquipo.tsx`, `tiro.ts`, `escenarios.ts`, `autoAlineacion`, `actor.ts`, `http/app.ts`, `FormacionId`, `Rng`, `Jugador`, `equipaciones.ts`, `calendario.ts`, `mesa.ts`, `equipo/dorsales.test.ts`, `formaciones.ts`, `AperturaSobre.tsx`, `torneo/torneo.ts`, `balonParado.test.ts`, `particulas.ts`, `Lienzo2D.tsx`, `equivalenciaFinalizar.test.ts`, `Alineacion.tsx`, `umbralMotor.ts`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `partido003.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05713218820014936 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `equipacionEnPartido (resolucion de choque de colores)` and `Guardarrail esErrorAdmisible`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._