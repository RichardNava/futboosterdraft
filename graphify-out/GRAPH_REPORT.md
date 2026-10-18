# Graph Report - futboosterdraft  (2026-10-18)

## Corpus Check
- 387 files · ~298,697 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 7, .css 2, .example 1)

## Summary
- 2445 nodes · 7223 edges · 110 communities (100 shown, 10 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 252 edges (avg confidence: 0.85)
- Token cost: 377,920 input · 0 output

## Community Hubs (Navigation)
- Server Integration Tests
- Pack Opening UI
- Web API Client & Routes
- Team Actor & Lineups
- Speckit & Constitution
- Draft Actor
- Match Viewing UI
- Game Manager & Lobby
- Card Collection Generator
- Auth & Sessions
- Tournament Actor
- DB Schema & Persistence
- Balance Checks
- Engine State & Ticks
- Card Catalog
- Root Tooling & Lint
- Engine Tests & Equivalence
- Scheduler & Notifications
- Speckit Bash Scripts
- Positions & Effective Stats
- Engine Field Placement
- 2D Match Playback Actor
- AI Lineup Decisions
- Duels & Action Resolution
- 2D Frame Interpolation
- Playback Clock
- Match Controller
- Tactics Field Placement
- Injuries & Shot Context
- AI Draft Evaluator
- Lineup Validation
- Set Pieces & Fouls
- Spec 001 Scenarios
- Server Package Config
- App Frame & Navigation
- HTTP Server & WS Gateway
- Logging & Idempotency Store
- Match Actor Queue
- Client WebSocket Connection
- Ball Animations
- k6 Load Test
- Spec 001 Data Model
- Integer Math & Ball Physics
- Spec 001 Research
- Server Runtime Deps
- Game Config & Abandonment
- Async Human Match Replay
- Tournament DB Schema
- Suspensions & Consequences
- Spec 001 HTTP/WS Contracts
- Balance Package Config
- Server Dev Deps
- Match Decisions
- Spec 002 HTTP Contracts
- TS Base Config
- Game Repository
- E2E Draft Tests
- Formations
- Fixture Scenarios
- Protocol Game & Draft Msgs
- Fixtures Package Config
- Seeded RNG & Calendar
- Protocol Package Config
- MVP Validation Results
- Spec 002 Async Playback
- AI Package Config
- Knockout Bracket
- Scorers & Matchdays
- Web Package & Vite
- AI Finish Equivalence
- Engine Package Config
- Squad Subs & Expulsions
- Spec 002 Navigation & Pause
- Spec 002 2D Simulation
- Spec 002 UI Contract
- Protocol WS Base
- Spec 002 Kinematics & Stats
- Spec 002 Position Penalty
- Protocol Match Msgs
- Draft Repository
- Spec 001 Monorepo Plan
- Domain Package Config
- League Standings
- Protocol Match HTTP
- Spec 001 Engine Contract
- Spec 002 Engine Contract
- Team Repository
- Web Runtime Deps
- E2E Tactics Test
- Web TS Config
- Protocol 2D Msgs
- Match Repository
- Web Dev Deps
- Web Scripts
- E2E Lineup Test
- Protocol HTTP Base
- Spec 002 Realtime Contract
- Server TS Config
- E2E Opening Test
- E2E Async Tournament Test
- AI TS Config
- Domain TS Config
- Engine TS Config
- Protocol TS Config
- Balance TS Config
- Fixtures TS Config

## God Nodes (most connected - your core abstractions)
1. `vitest` - 68 edges
2. `avanzar()` - 56 edges
3. `Rng` - 50 edges
4. `crearPartido()` - 47 edges
5. `paso()` - 45 edges
6. `EstadoMotor` - 45 edges
7. `ControladorPartida` - 42 edges
8. `crearServidor()` - 41 edges
9. `peticion()` - 39 edges
10. `Jugador` - 38 edges

## Surprising Connections (you probably didn't know these)
- `AlineacionGuardada` --inherits--> `Alineacion`  [EXTRACTED]
  apps/server/src/persistencia/repos/equipo.ts → packages/domain/src/equipo/alineacion.ts
- `ResultadoValidacion` --references--> `Jugador`  [EXTRACTED]
  apps/server/src/persistencia/seed.ts → packages/domain/src/catalogo/tipos.ts
- `Props` --references--> `Tactica`  [EXTRACTED]
  apps/web/src/componentes/PanelTactica.tsx → packages/domain/src/equipo/tactica.ts
- `entrada()` --calls--> `semillaDesdeTexto()`  [EXTRACTED]
  tools/balance/src/umbralMotor.ts → packages/domain/src/rng/xoshiro.ts
- `iniciarDraft()` --calls--> `crearMesa()`  [EXTRACTED]
  apps/server/src/actores/draft.ts → packages/domain/src/draft/mesa.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Ciclo SDD speckit (specify, plan, tasks, implement)** — _specify_workflows_speckit_workflow, _claude_skills_speckit_specify_skill, _claude_skills_speckit_plan_skill, _claude_skills_speckit_tasks_skill, _claude_skills_speckit_implement_skill [EXTRACTED 1.00]
- **Plantillas spec-kit consumidas por los skills** — _specify_templates_checklist_template, _specify_templates_constitution_template, _specify_templates_plan_template, _specify_templates_spec_template, _specify_templates_tasks_template [INFERRED 0.85]
- **Validación de calidad del motor (CI, equivalencia, balance, carga)** — _github_workflows_ci, readme_pnpm_test_equivalence, readme_pnpm_balance, tools_load_readme_beta_100, _specify_memory_constitution_ix_calidad_pruebas [INFERRED 0.75]
- **Un motor, dos modalidades (rápida y 2D equivalentes)** — specs_001_draft_manager_mvp_spec_motor_unico, specs_001_draft_manager_mvp_contracts_engine_api_avanzar, specs_001_draft_manager_mvp_contracts_engine_api_invariante_equivalencia, specs_001_draft_manager_mvp_spec_sc_008_equivalencia, specs_001_draft_manager_mvp_research_r7_motor_determinista, specs_001_draft_manager_mvp_spec_us6_simulacion_2d [EXTRACTED 1.00]
- **Integridad multijugador: autoridad, duplicados y visibilidad** — specs_001_draft_manager_mvp_spec_integridad_servidor, specs_001_draft_manager_mvp_spec_visibilidad_informacion, specs_001_draft_manager_mvp_contracts_realtime_protocol_requestid_dedup, specs_001_draft_manager_mvp_contracts_http_api_idempotency_key, specs_001_draft_manager_mvp_research_r4_actor_por_partida, specs_001_draft_manager_mvp_contracts_realtime_protocol_estado_snapshot [INFERRED 0.85]
- **Flujo de draft: mesa, sobres y elecciones** — specs_001_draft_manager_mvp_data_model_mesa_draft, specs_001_draft_manager_mvp_data_model_sobre, specs_001_draft_manager_mvp_data_model_eleccion, specs_001_draft_manager_mvp_contracts_realtime_protocol_draft_turno, specs_001_draft_manager_mvp_contracts_realtime_protocol_draft_elegir, specs_001_draft_manager_mvp_spec_booster_draft [INFERRED 0.85]
- **Flujo de resolucion asincrona de partidos entre humanos** — specs_002_mejoras_mvp_contracts_http_api_post_abrir, specs_002_mejoras_mvp_research_r8_resolucion_entre_humanos, specs_002_mejoras_mvp_contracts_engine_api_resolverresto, specs_002_mejoras_mvp_data_model_partido_resolucion, specs_002_mejoras_mvp_data_model_visionado_partido, specs_002_mejoras_mvp_contracts_realtime_protocol_torneo_actualizado [EXTRACTED 0.95]
- **Pipeline de simulacion y reproduccion 2D** — specs_002_mejoras_mvp_research_r3_capa_espacial, specs_002_mejoras_mvp_research_r4_seleccion_acciones, specs_002_mejoras_mvp_research_r5_fotogramas_hermite, specs_002_mejoras_mvp_research_r2_reloj_condensado, specs_002_mejoras_mvp_research_r6_bufer_anticipacion, specs_002_mejoras_mvp_data_model_fotograma_v2, specs_002_mejoras_mvp_data_model_accion_visible [EXTRACTED 0.95]
- **Colocacion libre, zonas y penalizacion por posicion** — specs_002_mejoras_mvp_data_model_zona, specs_002_mejoras_mvp_data_model_colocacion, specs_002_mejoras_mvp_contracts_engine_api_penalizacionporposicion, specs_002_mejoras_mvp_contracts_engine_api_previsualizar, specs_002_mejoras_mvp_spec_ofensividad_colocacion, specs_002_mejoras_mvp_research_r13_zonas_ofensividad [EXTRACTED 0.95]

## Communities (110 total, 10 thin omitted)

### Community 0 - "Server Integration Tests"
Cohesion: 0.06
Nodes (74): programarJornada(), ruta, principal(), conectar(), ConexionBD, urlBaseDatos(), jugadores, aplicarMigraciones() (+66 more)

### Community 1 - "Pack Opening UI"
Cohesion: 0.06
Nodes (56): abrirPartido(), AperturaSobre(), DURACION_SOBRE_MS, ESCALONADO_MS, especial(), Fase, FUNDIDO_MS, PAUSA_ESPECIAL_MS (+48 more)

### Community 2 - "Web API Client & Routes"
Cohesion: 0.06
Nodes (52): api(), ErrorApi, OpcionesPeticion, revelarResultado(), siguienteJornada(), ConSesion(), router, Rutas() (+44 more)

### Community 3 - "Team Actor & Lineups"
Cohesion: 0.08
Nodes (53): terminarDraft(), alineacionAutomatica(), alineacionVigente(), bajasActivas(), cambiarDorsal(), cambiarEquipaciones(), confirmarAlineacion(), errorDeAlineacion() (+45 more)

### Community 4 - "Speckit & Constitution"
Cohesion: 0.05
Nodes (43): speckit-analyze skill, speckit-checklist skill, speckit-clarify skill, speckit-constitution skill, speckit-converge skill, speckit-implement skill, speckit-plan skill, speckit-specify skill (+35 more)

### Community 5 - "Draft Actor"
Cohesion: 0.10
Nodes (45): ContextoComando, abandonarDraft(), abrirTurno(), eleccionNPC(), emitirProgreso(), mensajeTurno(), pendientesDeMesa(), procesarEleccion() (+37 more)

### Community 6 - "Match Viewing UI"
Cohesion: 0.10
Nodes (41): marcarVisto(), obtenerReproduccion(), Superposicion, datosVacios(), AvisoDorsales(), BotonAvanzar(), ETIQUETA, Props (+33 more)

### Community 7 - "Game Manager & Lobby"
Cohesion: 0.09
Nodes (25): iniciarDraft(), GestorPartidas, accionYRival(), EN_CURSO, misPartidas(), nombresNPC(), NUCLEOS, PREFIJOS (+17 more)

### Community 8 - "Card Collection Generator"
Cohesion: 0.07
Nodes (36): elegirCarta(), formacionObjetivo(), DISTRIBUCION_CORE, MINIMO_EQUILIBRADO_CORE, RecuentoCatalogo, Nivel, SPECIALS_POR_DEMARCACION, validarColeccion() (+28 more)

### Community 9 - "Auth & Sessions"
Cohesion: 0.09
Nodes (35): apodoValido(), aUsuarioSesion(), Auth, crearAuth(), OpcionesAuth, UsuarioSesion, cabecerasWeb(), crearHooksSesion() (+27 more)

### Community 10 - "Tournament Actor"
Cohesion: 0.10
Nodes (40): entreHumanos(), resolverPartidoEntreHumanos(), terminarPartidoEntreHumanosEnJuego(), resumenAlineaciones(), crearPartidosJornada(), abrirPartido(), abrirSiguienteJornada(), avisarHumanos() (+32 more)

### Community 11 - "DB Schema & Persistence"
Cohesion: 0.08
Nodes (28): filaAJugador(), BaseDatos, POOL_POR_DEFECTO, cuentas, participantes, partidas, peticionesProcesadas, sesiones (+20 more)

### Community 12 - "Balance Checks"
Cohesion: 0.11
Nodes (37): EstadisticasEquipo, comprobacionesColocacion(), comprobarSC011(), comprobarSC018(), pct(), Campo, col(), Comprobacion (+29 more)

### Community 13 - "Engine State & Ticks"
Cohesion: 0.10
Nodes (34): PartidoEnCurso, ResultadoResolverResto, Contexto, PASO_MOVIMIENTO, fotograma(), AccionEnCurso, Balon, crearEquipo() (+26 more)

### Community 14 - "Card Catalog"
Cohesion: 0.07
Nodes (37): TEXTOS_SPECIALS, CLAVES_STATS, DEMARCACIONES, MAX_SPECIALS, NIVELES, Special, SpecialDEF, SpecialDEL (+29 more)

### Community 15 - "Root Tooling & Lint"
Cohesion: 0.05
Nodes (40): sinNoDeterminismo, devDependencies, eslint, @eslint/js, fast-check, globals, prettier, tsx (+32 more)

### Community 16 - "Engine Tests & Equivalence"
Cohesion: 0.13
Nodes (26): reconstruirMotor(), hasta(), semilla, crearPartido(), aplicarDecision(), avanzar(), jugar(), TIPOS (+18 more)

### Community 17 - "Scheduler & Notifications"
Cohesion: 0.07
Nodes (10): DependenciasTorneo, NuevoAviso, ServicioAvisos, RepoVisionados, Pendiente, Reloj, RelojFalso, Temporizadores (+2 more)

### Community 18 - "Speckit Bash Scripts"
Cohesion: 0.11
Nodes (30): check-prerequisites.sh script, check_dir(), check_file(), find_specify_root(), format_speckit_command(), get_current_branch(), get_feature_paths(), get_invoke_separator() (+22 more)

### Community 19 - "Positions & Effective Stats"
Cohesion: 0.09
Nodes (23): POSICIONES, POSICIONES_POR_DEMARCACION, asignar(), casilla, claseDestino(), ContextoStats, DEMARCACION_DE, demarcacionDeRol() (+15 more)

### Community 20 - "Engine Field Placement"
Cohesion: 0.13
Nodes (33): acotar(), colocarSaqueInicial(), objetivosBalonParado(), PUNTOS_AREA, PUNTOS_AREA_PROPIA, puntoSaqueCentro(), rival(), sacadorDeCentro() (+25 more)

### Community 21 - "2D Match Playback Actor"
Cohesion: 0.14
Nodes (32): avanzar2D(), crearEstado2D(), Estado2D, olvidarVistos(), procesarReproduccion(), Resultado, Tramo2D, vista2D() (+24 more)

### Community 22 - "AI Lineup Decisions"
Cohesion: 0.11
Nodes (29): decidirAlineacion(), LIMITE_PRO_MS, OpcionesAlineacion, TACTICA_DEFENSIVA, TACTICA_OFENSIVA, tacticaSegunRival(), OpcionesDraft, fuerzaAlineacion() (+21 more)

### Community 23 - "Duels & Action Resolution"
Cohesion: 0.15
Nodes (32): elegirPonderado(), esPortero(), jugadorPorId(), receptor(), rivalCercano(), Duelo, probabilidad(), resolver() (+24 more)

### Community 24 - "2D Frame Interpolation"
Cohesion: 0.12
Nodes (28): agregarFotogramas(), Fotograma, fuera(), hermite(), indiceFotograma(), parabola(), pendiente(), Posiciones (+20 more)

### Community 25 - "Playback Clock"
Cohesion: 0.09
Nodes (16): Props, CLAVE_VELOCIDAD, EstadoReloj, guardarVelocidad(), INTERVALO_INFORME_MS, MotivoPausa, OpcionesReloj, RelojReproduccion (+8 more)

### Community 26 - "Match Controller"
Cohesion: 0.14
Nodes (19): detalleBajas(), ESTADOS_ACTIVOS, ControladorPartida, vistaPartido(), resumenSala(), ServiciosPartida, emitirEstadoATodos(), plantillasVisibles() (+11 more)

### Community 27 - "Tactics Field Placement"
Cohesion: 0.13
Nodes (26): acotar(), CampoTacticas(), Props, Posicion, TitularPrevisualizado, calcularColocacion(), dispersion(), media() (+18 more)

### Community 28 - "Injuries & Shot Context"
Cohesion: 0.15
Nodes (23): candidatos(), valorLanzamiento(), GravedadLesion, portero(), ORDEN, EquipoEstado, JugadorEnPartido, minutoDeJuego() (+15 more)

### Community 29 - "AI Draft Evaluator"
Cohesion: 0.18
Nodes (22): cobertura(), CUPO_DEMARCACION, encaja(), escasezPorteros(), LANZADORES, mediaEnMejorCasilla(), PesosEvaluacion, saturacion() (+14 more)

### Community 30 - "Lineup Validation"
Cohesion: 0.14
Nodes (25): calcularMedia(), valoresStats(), Alineacion, CodigoErrorAlineacion, ErrorAlineacion, MAX_SUPLENTES, Previsualizacion, Titular (+17 more)

### Community 31 - "Set Pieces & Fouls"
Cohesion: 0.21
Nodes (27): lanzadorEfectivo(), reponer(), amarilla(), falta(), faltaDirecta(), fueraDeJuego(), penalti(), tarjetaRoja() (+19 more)

### Community 32 - "Spec 001 Scenarios"
Cohesion: 0.12
Nodes (24): Clarificaciones y ajustes de la spec (2026-10-15), Checklist de calidad de la spec, Invariante: equivalencia entre modalidades, Quickstart de validación, Escenario A: Draft en solitario como invitado, Escenario B: Preparación del equipo, Escenario C: Partido rápido y descanso, Escenario D: Dos humanos en 2D (+16 more)

### Community 33 - "Server Package Config"
Cohesion: 0.07
Nodes (24): exports, @fbd/ai, @fbd/domain, @fbd/engine, @fbd/protocol, zod, name, private (+16 more)

### Community 34 - "App Frame & Navigation"
Cohesion: 0.14
Nodes (20): ENLACES, Marco(), partidaDeRuta(), Salida, salidaDe(), humanosActivos(), ParticipanteActivo, usePartidaActiva (+12 more)

### Community 35 - "HTTP Server & WS Gateway"
Cohesion: 0.17
Nodes (6): ambitoSpecial(), registrarRutasCatalogo(), crearServidor(), Manejador, OpcionesPasarela, Pasarela

### Community 36 - "Logging & Idempotency Store"
Cohesion: 0.11
Nodes (8): OpcionesLimitador, crearLogger(), crearMetricas(), AlmacenPeticiones, AlmacenPeticionesBD, Catalogo, ConfigServidor, pino

### Community 37 - "Match Actor Queue"
Cohesion: 0.11
Nodes (5): ActorPartida, Destino, Difusor, MensajeSaliente, RegistroActores

### Community 38 - "Client WebSocket Connection"
Cohesion: 0.17
Nodes (8): mantenerConexionInvitado(), soltarConexionInvitado(), EstadoServidor, useConexion(), ConexionPartida, MensajeServidor, Oyente, EstadoPartidaActiva

### Community 39 - "Ball Animations"
Cohesion: 0.25
Nodes (21): abrir(), BALON_DE, balonCon(), cerrar(), conducir(), controlar(), hasta(), posicion() (+13 more)

### Community 40 - "k6 Load Test"
Cohesion: 0.13
Nodes (20): apertura, bloqueadas, cabeceras(), cookieDe(), crearUsuario(), descanso, entregaSobre, erroresWs (+12 more)

### Community 41 - "Spec 001 Data Model"
Cohesion: 0.17
Nodes (22): Mensaje draft.elegir, Entidad Alineacion, Entidad Aviso, Entidad Baja y ContadorAmarillas, Entidad DecisionPartido, Data Model 001, Entidad Eleccion, Entidad EventoPartido (+14 more)

### Community 42 - "Integer Math & Ball Physics"
Cohesion: 0.24
Nodes (17): dividir(), escalar(), isqrt(), limitar(), norma(), moverBalon(), VUELO, Punto (+9 more)

### Community 43 - "Spec 001 Research"
Cohesion: 0.13
Nodes (14): avanzar(estado, modo), Escenario F: Mixto de 8 y NPC PRO, Research Fase 0 (R1-R17), R13: Avisos en aplicación y correo SMTP, PRNG xoshiro128**, Cuatro niveles de NPC (amateur, intermedio, avanzado, PRO), Ritmo en directo / asíncrono (FR-056), US5: Rellenar partida con NPC (+6 more)

### Community 44 - "Server Runtime Deps"
Cohesion: 0.10
Nodes (20): dependencies, ajv, ajv-formats, better-auth, drizzle-orm, fastify, @fastify/compress, @fastify/cookie (+12 more)

### Community 45 - "Game Config & Abandonment"
Cohesion: 0.14
Nodes (18): configPorDefecto(), debeAbandonarsePorDesconexion(), ErrorConfig, EventoPartida, humanosActivos(), MINUTOS_ABANDONO_INVITADO, NIVELES_NPC, NIVELES_RELLENO (+10 more)

### Community 46 - "Async Human Match Replay"
Cohesion: 0.16
Nodes (11): cacheReproducciones, rehacer(), reproduccion(), Tramos, EntradaGuardada, PARAMETROS_V1, parametrosPorVersion(), versionMayor() (+3 more)

### Community 47 - "Tournament DB Schema"
Cohesion: 0.15
Nodes (11): usuarios, avisos, bajas, contadoresAmarillas, jornadas, torneos, Ejecutor, FilaJornada (+3 more)

### Community 48 - "Suspensions & Consequences"
Cohesion: 0.17
Nodes (17): Modo, aplicarConsecuencias(), autor(), EstadoBajas, estadoBajasVacio(), EventoConsecuencia, MotivoBaja, PartidoConsecuencias (+9 more)

### Community 49 - "Spec 001 HTTP/WS Contracts"
Cohesion: 0.13
Nodes (14): Rutas /api/partidas/:id/alineacion, POST /api/auth/invitado, Contrato HTTP/JSON, Cabecera Idempotency-Key, GET /api/partidas/:id/plantillas, POST /api/partidas, GET /api/partidas/:id/torneo, Protocolo en tiempo real (WebSocket) (+6 more)

### Community 50 - "Balance Package Config"
Cohesion: 0.11
Nodes (18): bin, balance, dependencies, @fbd/ai, @fbd/domain, @fbd/engine, exports, @fbd/ai (+10 more)

### Community 51 - "Server Dev Deps"
Cohesion: 0.10
Nodes (18): devDependencies, drizzle-kit, pino-pretty, testcontainers, @testcontainers/postgresql, tsup, @types/nodemailer, @types/pg (+10 more)

### Community 52 - "Match Decisions"
Cohesion: 0.27
Nodes (15): validarColocacion(), esFormacionId(), colocar(), maxSustituciones(), DecisionPartido, DecisionRegistrada, aplicarPendientes(), aplicarUna() (+7 more)

### Community 53 - "Spec 002 HTTP Contracts"
Cohesion: 0.18
Nodes (15): Contrato HTTP/JSON (cambios spec 002), GET /api/partidos/:id/reproduccion, GET /torneo/goleadores y /torneo/asistentes, POST /api/partidos/:id/abrir (sustituye a listo), POST /api/partidas/:id/siguiente-jornada, POST /api/partidos/:id/visto y /revelar, Componente BotonAvanzar (etiquetas por situacion), Data Model spec 002 (cambios sobre 001) (+7 more)

### Community 54 - "TS Base Config"
Cohesion: 0.12
Nodes (16): compilerOptions, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+8 more)

### Community 56 - "E2E Draft Tests"
Cohesion: 0.21
Nodes (4): partidaTrasDraft(), Carta, Torneo, @playwright/test

### Community 57 - "Formations"
Cohesion: 0.13
Nodes (11): CASILLA_CENTRAL, defensaCinco, defensaCuatro, defensaTres, formacion, FORMACIONES_LISTA, POR, X (+3 more)

### Community 58 - "Fixture Scenarios"
Cohesion: 0.28
Nodes (14): core(), cumpleEscenario(), entradaEscenario(), equipo(), Escenario, jugar(), NombreEscenario, plantillasEscenario() (+6 more)

### Community 59 - "Protocol Game & Draft Msgs"
Cohesion: 0.14
Nodes (13): AnadirNPC, MisPartidas, NivelNPC, PartidaResumen, ResumenPartida, JugadorResumen, MsgDraftEleccionAuto, MsgDraftElegir (+5 more)

### Community 60 - "Fixtures Package Config"
Cohesion: 0.13
Nodes (14): dependencies, @fbd/domain, @fbd/engine, exports, @fbd/domain, @fbd/engine, name, private (+6 more)

### Community 61 - "Seeded RNG & Calendar"
Cohesion: 0.23
Nodes (8): estadoDesdeSemilla(), EstadoRng, hash128(), Semilla, semillaDesdeEstado(), semillaDesdeTexto(), JornadaCalendario, partidosTotales()

### Community 62 - "Protocol Package Config"
Cohesion: 0.14
Nodes (13): dependencies, @fbd/domain, zod, exports, ./schemas/*, @fbd/domain, zod, name (+5 more)

### Community 63 - "MVP Validation Results"
Cohesion: 0.16
Nodes (9): Resultados balance --n 1000, Resultados de carga SC-017, Validación del MVP (T144), Instantánea estado en reconexión, tools/balance (Monte Carlo), Criterio de hecho, Criterios de éxito estadísticos SC-004..SC-007, SC-017: 100 partidas simultáneas (+1 more)

### Community 64 - "Spec 002 Async Playback"
Cohesion: 0.19
Nodes (11): Revision de requisitos FR-022 a FR-028 / SC-005 a SC-010, Desviacion: motor ~80 ms por partido, no cumple FR-028a, avanzar modo 'ticks' con hastaTick, partido.reproduccion { tick, velocidad } cada ~250 ms, Decisiones en 2D en directo en <=1 minuto de juego (FR-025a), Finalizar partido en cualquier momento (FR-026 a FR-028), Pausas anunciadas y homogeneidad del reloj (FR-022), Rendimiento del motor (FR-028a: 25/40/30 ms) (+3 more)

### Community 65 - "AI Package Config"
Cohesion: 0.15
Nodes (12): dependencies, @fbd/domain, @fbd/engine, exports, @fbd/domain, @fbd/engine, name, private (+4 more)

### Community 66 - "Knockout Bracket"
Cohesion: 0.23
Nodes (10): avanzarCuadro(), Cruce, cuadroMixto(), cuadroPlayoff(), rondaActual(), rondasVacias(), TipoRonda, TIPOS (+2 more)

### Community 67 - "Scorers & Matchdays"
Cohesion: 0.26
Nodes (7): abrirJornada(), aportacionesDePartido(), esEliminatoria(), registrarResultado(), jugadoresDe(), registrar(), jugar()

### Community 68 - "Web Package & Vite"
Cohesion: 0.18
Nodes (10): @fbd/domain, @fbd/protocol, name, private, type, version, @types/react, @types/react-dom (+2 more)

### Community 69 - "AI Finish Equivalence"
Cohesion: 0.29
Nodes (11): decidirNPCEnPausa(), NivelesPartido, resolverResto(), comprobar(), conProrroga(), jugarHasta(), NIVELES, parada() (+3 more)

### Community 70 - "Engine Package Config"
Cohesion: 0.17
Nodes (11): dependencies, @fbd/domain, exports, @fbd/domain, name, private, scripts, bench (+3 more)

### Community 71 - "Squad Subs & Expulsions"
Cohesion: 0.38
Nodes (11): comprobarInferioridad(), cubrirPorteria(), expulsar(), mejorSuplente(), MINIMO_JUGADORES, quitarDelCampo(), retirarLesionado(), sustitucionesDisponibles() (+3 more)

### Community 72 - "Spec 002 Navigation & Pause"
Cohesion: 0.24
Nodes (11): Specification Quality Checklist spec 002, GET /api/mis-partidas, Mensaje partida.pausar / partida.pausada, Marco: barra de navegacion y modal de abandono, R10 Pausa de partidas en solitario con partida.pausar, R11 Abandono confirmado desde la barra (useBlocker), R18 Marco de navegacion y componente unico BotonAvanzar con requestId, Spec 002: Mejoras del MVP (+3 more)

### Community 73 - "Spec 002 2D Simulation"
Cohesion: 0.18
Nodes (9): Checklist de requisitos: Simulacion 2D y finalizacion, Invariante 7: fotogramas inocuos, EstadoMotor.espacio, ancla, perfil y posesion, Fotograma v2 (array compacto de enteros), Constitution Check spec 002 (Principios I-X), Escenarios de validacion manual A a K, Research Fase 0 spec 002 (R1-R19), R19 Verificacion de los criterios de exito (balance, cinematica, Playwright) (+1 more)

### Community 74 - "Spec 002 UI Contract"
Cohesion: 0.20
Nodes (12): Validacion de la spec 002 (T159), Contrato de interfaz spec 002, Componente CartaJugador (completa y compacta), UI Partido 2D (velocidades, Finalizar, pausas), UI Tacticas: colocacion libre por arrastre, Plan de implementacion spec 002, Quickstart: validacion de las mejoras (escenarios A-K), R16 Diseno de cartas (CSS, container queries, popover) (+4 more)

### Community 75 - "Protocol WS Base"
Cohesion: 0.20
Nodes (8): ErrorProtocolo, FaseVista, MsgError, MsgPing, MsgPong, RequestId, MsgPartidaPausada, MsgPartidaPausar

### Community 76 - "Spec 002 Kinematics & Stats"
Cohesion: 0.20
Nodes (9): Invariante 6: cinematica (velocidad, separacion, presionadores), AccionVisible, EstadisticasEquipo (pases, pasesCompletados, centros, precisionPase, secuencias), Riesgos y mitigaciones (recalibrado, SC-009 subjetivo, coste del motor), Estadisticas de pase, centros y posesion (FR-024), Presion coordinada (hasta 3 jugadores, Presion alta, <=5 s), Realismo del comportamiento 2D (FR-023), SC-007: densidad de juego (pases, centros, tiros, secuencias) (+1 more)

### Community 77 - "Spec 002 Position Penalty"
Cohesion: 0.24
Nodes (9): penalizacionPorPosicion / statsEfectivos, PUT /api/partidas/:id/dorsales (sin DORSAL_REPETIDO), Operaciones de dorsales (asignarDorsalesIniciales, asignarDorsal, completarDorsales), ParametrosEquilibrado 2.0.0 (penalizacionPosicion, reproduccion, espacio, colocacion, asincrono, draft), R14 Dorsales: asignarDorsal y completarDorsales, Colocacion libre por zonas en tacticas (FR-034, FR-034a), Dorsales 1-24 sin duplicados con reasignacion (FR-035 a FR-038), Ofensividad calculada desde la colocacion (FR-034b) (+1 more)

### Community 78 - "Protocol Match Msgs"
Cohesion: 0.20
Nodes (9): Equipacion, MsgPartidoDecision, MsgPartidoDecisionAplicada, MsgPartidoFin, MsgPartidoFinalizar, MsgPartidoPausa, MsgPartidoSeguir, MsgPartidoTramo (+1 more)

### Community 80 - "Spec 001 Monorepo Plan"
Cohesion: 0.61
Nodes (8): apps/server, apps/web, Constitution Check (Principios I-X), Implementation Plan 001, packages/ai, packages/domain, packages/engine, packages/protocol

### Community 81 - "Domain Package Config"
Cohesion: 0.25
Nodes (7): exports, name, private, scripts, typecheck, type, version

### Community 82 - "League Standings"
Cohesion: 0.36
Nodes (5): clasificacion(), FilaClasificacion, ResultadoLiga, tabla(), semilla

### Community 83 - "Protocol Match HTTP"
Cohesion: 0.25
Nodes (7): Marcador, PartidoPendienteDeVer, RespuestaAbrir, RespuestaReproduccion, TramoReproduccion, EventoPartidoSchema, MsgPartidoInicio

### Community 84 - "Spec 001 Engine Contract"
Cohesion: 0.29
Nodes (7): aplicarDecision(), crearPartido(), Contrato del motor (engine-api), EntradaPartido, ResultadoTramo, statsEfectivos(), Mensaje partido.tramo

### Community 85 - "Spec 002 Engine Contract"
Cohesion: 0.36
Nodes (8): Contrato del motor (cambios spec 002), Invariante 5: finalizar es equivalente, previsualizar(alineacion) -> Previsualizacion, resolverResto(estado, niveles, semilla) en @fbd/ai, zonaEn(x, y), Alineacion.colocacion { jugadorId, x, y }, Derivados de previsualizar: posicionEfectiva, personalizada, reparto, ofensividad, amplitud, avisos, Zona del campo (rect, posicionesAdmitidas, linea)

### Community 87 - "Web Runtime Deps"
Cohesion: 0.29
Nodes (7): dependencies, @fbd/domain, @fbd/protocol, react, react-dom, react-router, zustand

### Community 88 - "E2E Tactics Test"
Cohesion: 0.43
Nodes (6): abrir(), arrastrar(), campo(), Carta, Datos, ficha()

### Community 89 - "Web TS Config"
Cohesion: 0.29
Nodes (6): compilerOptions, jsx, lib, extends, include, ../../tsconfig.base.json

### Community 90 - "Protocol 2D Msgs"
Cohesion: 0.29
Nodes (6): AccionVisibleMsg, AccionVisibleSchema, FotogramaMsg, FotogramaSchema, MsgPartidoReproduccion, VELOCIDADES_2D

### Community 92 - "Web Dev Deps"
Cohesion: 0.33
Nodes (6): devDependencies, @playwright/test, @types/react, @types/react-dom, vite, @vitejs/plugin-react

### Community 93 - "Web Scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, e2e, preview, typecheck

### Community 94 - "E2E Lineup Test"
Cohesion: 0.40
Nodes (4): Carta, casilla(), colocar(), DEL

### Community 95 - "Protocol HTTP Base"
Cohesion: 0.33
Nodes (4): ESTADO_HTTP, RespuestaError, MsgAck, MsgEstado

### Community 96 - "Spec 002 Realtime Contract"
Cohesion: 0.33
Nodes (5): Protocolo en tiempo real (cambios spec 002), draft.turno.animacion y draft.progreso.pendientes, Mensaje partido.finalizar, torneo.actualizado filtrado por participante, Animacion de apertura de sobre (FR-006 a FR-010)

### Community 97 - "Server TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, extends, include, ../../tsconfig.base.json

### Community 100 - "AI TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, extends, include, ../../tsconfig.base.json

### Community 101 - "Domain TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, extends, include, ../../tsconfig.base.json

### Community 102 - "Engine TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, extends, include, ../../tsconfig.base.json

### Community 103 - "Protocol TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, extends, include, ../../tsconfig.base.json

### Community 104 - "Balance TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, extends, include, ../../tsconfig.base.json

### Community 105 - "Fixtures TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, extends, include, ../../tsconfig.base.json

## Knowledge Gaps
- **56 isolated node(s):** `@fbd/ai`, `@fbd/domain`, `@fbd/engine`, `@fbd/protocol`, `zod` (+51 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 699 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `Server Integration Tests` to `Team Actor & Lineups`, `Draft Actor`, `Card Collection Generator`, `Auth & Sessions`, `DB Schema & Persistence`, `Card Catalog`, `Root Tooling & Lint`, `Engine Tests & Equivalence`, `Scheduler & Notifications`, `Positions & Effective Stats`, `Engine Field Placement`, `AI Lineup Decisions`, `2D Frame Interpolation`, `Playback Clock`, `Tactics Field Placement`, `AI Draft Evaluator`, `Match Actor Queue`, `Integer Math & Ball Physics`, `Game Config & Abandonment`, `Async Human Match Replay`, `Formations`, `Seeded RNG & Calendar`, `Knockout Bracket`, `Scorers & Matchdays`, `AI Finish Equivalence`, `League Standings`, `Protocol HTTP Base`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **What connects `@fbd/ai`, `@fbd/domain`, `@fbd/engine` to the rest of the system?**
  _56 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Server Integration Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.05918966529653553 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Pack Opening UI` to `App Frame & Navigation`, `Web API Client & Routes`, `Web Package & Vite`, `Match Viewing UI`, `Client WebSocket Connection`, `2D Frame Interpolation`, `Tactics Field Placement`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `Pack Opening UI` be split into smaller, more focused modules?**
  _Cohesion score 0.06338028169014084 - nodes in this community are weakly interconnected._
- **Should `Web API Client & Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.06335403726708075 - nodes in this community are weakly interconnected._
- **Should `Team Actor & Lineups` be split into smaller, more focused modules?**
  _Cohesion score 0.07885304659498207 - nodes in this community are weakly interconnected._