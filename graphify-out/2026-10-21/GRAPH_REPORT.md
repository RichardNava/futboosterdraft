# Graph Report - futboosterdraft  (2026-10-21)

## Corpus Check
- 517 files · ~459,016 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: (none) 8, .woff2 5, .css 4)

## Summary
- 3717 nodes · 10811 edges · 175 communities (145 shown, 30 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 593 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `88220e32`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Server Bootstrap & DB
- partido003.ts
- catalogo/tipos.ts
- Contrato de interfaz — spec 004
- ws/partido.ts
- Migracion 0004_mejoras.sql
- Sala.tsx
- parametrosActuales
- ControladorPartida
- Constitution Principles
- ReproduccionPartido.tsx
- Marco.tsx
- equipo/alineacion.ts
- animaciones.ts
- partidoRapido.ts
- package.json
- useConexion.ts
- JugadorEnPartido
- Field Placement Geometry
- Speckit Scripts
- Server Dependencies
- EstadoTorneo
- repos/draft.ts
- npc.ts
- actores/torneo.ts
- esquema/index.ts
- niveles.test.ts
- BaseDatos
- gestor.ts
- series.ts
- domain/src/index.ts
- partida/partida.ts
- RepoPartidas
- Spec 002 Validation & Balance
- Escenarios de validación manual
- cli.ts
- Spec 003 NPC Difficulty
- CI & Docker Infra
- actor.ts
- Alineacion.tsx
- ref_zod
- Spec 001 Entities & API
- Tasks: Mejoras de interfaz, simulación y experiencia de juego
- Draft.tsx
- protocol/src/http/partidos.ts
- Tasks: Mejoras visuales y de diseño (GUI + UX)
- generarCore.ts
- Server Package Config
- ws/base.ts
- Load Test (k6)
- equipos.ts
- tiro.ts
- Tabla perfiles_usuario
- checks/partido.ts
- Torneo.tsx
- servicios.ts
- Research Fase 0 (R1-R17)
- Balance Package
- clasificacion.ts
- Spec Requirements Checklists
- Jugador
- estado.ts
- Spec 003 Realtime Protocol
- equipaciones.ts
- TS Base Config
- Speckit Skills
- e2e/ayudas.ts
- User Scenarios & Testing *(mandatory)*
- servidor.ts
- Protocolo en tiempo real (WebSocket)
- protocol/src/http/partidas.ts
- Spec 003 Research
- juego.ts
- torneo/torneo.ts
- Fixtures Package
- Pasarela
- Protocol Package
- Pruebas con personas (2026-10-19)
- Spec 001 Contracts Index
- interpolacion.ts
- AI Package
- Single Pitch & Batch Decisions
- Research — spec 004: mejoras visuales y de diseño
- Calibración de los errores de los NPC (T097)
- Engine Package
- Home — Style Reference
- decisiones.ts
- .participante
- Web Package
- Spec 003 HTTP Changes
- Checklist de requisitos: Simulación 2D y finalización
- ws/draft.ts
- Draft.tsx
- @playwright/test
- Jugador
- Contrato de interfaz — spec 003
- Domain Package
- Lienzo2D.tsx
- ws/torneo.ts
- colores.ts
- colores.ts
- scripts
- Calibración del motor 3.0.0 (T033)
- Web TS Config
- particulas.ts
- User Scenarios & Testing *(mandatory)*
- servicio.ts
- AvisoPartido.tsx
- Contrato HTTP/JSON
- tema.spec.ts
- devDependencies
- Spec 002 Engine Ops
- http/base.ts
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
- repos/perfiles.ts
- torneo-asincrono.spec.ts
- `PUT /api/partidas/:id/nombre-equipo` (✚)
- Validación de la spec 004 con personas (SC-003, SC-004, SC-010)
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
- Rng
- T086 Engine Perf
- T159 Validation
- Validación de la spec 004 con personas (SC-003, SC-004, SC-010)
- zonas.ts
- semillaDesdeTexto
- Propuesta de enmienda PATCH 1.0.5 de la constitución (T126)
- RepoPartidos
- http/app.ts
- devDependencies
- scripts
- scripts
- Partidas
- RepoEquipo
- Implementation for User Story 2
- Calibración de los errores de los NPC (T097)
- Dependencies & Execution Order
- R24 Equipaciones v2 (diseno + hasta 3 colores)
- .detener
- main.tsx
- Implementation Strategy
- Frontend Design
- Contrato del motor (engine-api)
- Frontend Design
- Specification Quality Checklist: Mejoras visuales y de diseño (GUI + UX)

## God Nodes (most connected - your core abstractions)
1. `vitest` - 99 edges
2. `avanzar()` - 73 edges
3. `parametrosActuales()` - 64 edges
4. `crearPartido()` - 63 edges
5. `Rng` - 61 edges
6. `paso()` - 54 edges
7. `EstadoMotor` - 54 edges
8. `react` - 52 edges
9. `derivarSemilla()` - 52 edges
10. `peticion()` - 50 edges

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

## Communities (175 total, 30 thin omitted)

### Community 0 - "Server Bootstrap & DB"
Cohesion: 0.06
Nodes (80): programarJornada(), ruta, principal(), conectar(), ConexionBD, urlBaseDatos(), aplicarMigraciones(), CARPETA_MIGRACIONES (+72 more)

### Community 1 - "partido003.ts"
Cohesion: 0.21
Nodes (25): ambos(), cache, cacheCore, comprobarSC001(), comprobarSC002(), comprobarSC003(), comprobarSC004(), comprobarSC005() (+17 more)

### Community 2 - "catalogo/tipos.ts"
Cohesion: 0.08
Nodes (35): CLAVES_STATS, DEMARCACIONES, MAX_SPECIALS, NIVELES, POSICIONES, SpecialDEF, SpecialDEL, SpecialGenerico (+27 more)

### Community 3 - "Contrato de interfaz — spec 004"
Cohesion: 0.18
Nodes (11): 10. Nombres recortados (Edge Cases; research R9), 11. Textos renombrados durante la implementación (FR-035, FR-036), 1. Reglas globales (todas las pantallas del inventario), 2. Barra de navegación (FR-012a; research R8), 3. Inicio (FR-014, FR-015), 4. Marcadores (FR-016, FR-034), 5. Pantallas finales (FR-017), 7. Estados vacíos (FR-025) (+3 more)

### Community 4 - "ws/partido.ts"
Cohesion: 0.12
Nodes (16): AccionVisibleMsg, AccionVisibleSchema, FotogramaMsg, FotogramaSchema, MsgPartidoReproduccion, VELOCIDADES_2D, Equipacion, MsgPartidoDecision (+8 more)

### Community 5 - "Migracion 0004_mejoras.sql"
Cohesion: 0.06
Nodes (28): Alineacion.colocacion { jugadorId, x, y }, EstadisticasEquipo (pases, centros, precisionPase, secuencias), EstadoMotor: ancla, posicion, perfil, espacio, posesion, EstadoTorneo.aportaciones y tablaGoleadores/tablaAsistentes, Fotograma v2 y AccionVisible, MesaDraft.pausadaEn / restanteMs, ParametrosEquilibrado 2.0.0 (v2.json), Partido.resolucion ('directo'|'apertura'|'plazo'|'npc') y abiertoPorId (+20 more)

### Community 6 - "Sala.tsx"
Cohesion: 0.08
Nodes (41): ErrorApi, ConSesion(), router, Rutas(), CampoNombreEquipo(), errorNombre(), MENSAJE_NOMBRE, Props (+33 more)

### Community 7 - "parametrosActuales"
Cohesion: 0.13
Nodes (36): terminarDraft(), alineacionAutomatica(), alineacionVigente(), bajasActivas(), cambiarDorsal(), cambiarEquipaciones(), confirmarAlineacion(), dorsalesIniciales() (+28 more)

### Community 8 - "ControladorPartida"
Cohesion: 0.10
Nodes (12): ActorPartida, GestorPartidas, accionYRival(), EN_CURSO, misPartidas(), ControladorPartida, programarBusqueda(), registrarRutasPartidas() (+4 more)

### Community 9 - "Constitution Principles"
Cohesion: 0.09
Nodes (24): Simulación 2D en tiempo real, Simulación rápida, AccionVisible, avanzar modo 'ticks' con hastaTick, decidirNPCEnPausa, Invariante 6b: cortes por ticks inocuos, Invariante 5: finalizar es equivalente, Invariante 7: fotogramas inocuos (+16 more)

### Community 10 - "ReproduccionPartido.tsx"
Cohesion: 0.08
Nodes (60): marcarVisto(), obtenerReproduccion(), jugadoresDe(), Lienzo2D(), Superposicion, datosVacios(), TramoRecibido, BarraPrincipal() (+52 more)

### Community 11 - "Marco.tsx"
Cohesion: 0.10
Nodes (37): Ambiente(), Enlace, ENLACES, Marco(), partidaDeRuta(), Salida, salidaDe(), texto() (+29 more)

### Community 12 - "equipo/alineacion.ts"
Cohesion: 0.05
Nodes (61): Posicion, POSICIONES_POR_DEMARCACION, Alineacion, CodigoErrorAlineacion, ErrorAlineacion, MAX_SUPLENTES, Previsualizacion, Titular (+53 more)

### Community 13 - "animaciones.ts"
Cohesion: 0.16
Nodes (31): abrir(), BALON_DE, balonCon(), cerrar(), conducir(), controlar(), hasta(), posicion() (+23 more)

### Community 14 - "partidoRapido.ts"
Cohesion: 0.08
Nodes (52): avanzar2D(), crearEstado2D(), Estado2D, olvidarVistos(), procesarReproduccion(), Resultado, Tramo2D, vista2D() (+44 more)

### Community 15 - "package.json"
Cohesion: 0.13
Nodes (15): sinNoDeterminismo, engines, node, name, packageManager, private, type, eslint (+7 more)

### Community 16 - "useConexion.ts"
Cohesion: 0.09
Nodes (22): TipoAviso, AvisoDorsales(), textoDorsalesNuevos(), mantenerConexionInvitado(), soltarConexionInvitado(), EstadoServidor, useConexion(), Ack (+14 more)

### Community 17 - "JugadorEnPartido"
Cohesion: 0.16
Nodes (20): PlanPase, OpcionesReceptor, OpcionesTiro, ANCHO, Punto, moverJugadores(), Movil, separar() (+12 more)

### Community 18 - "Field Placement Geometry"
Cohesion: 0.13
Nodes (35): acotar(), dividir(), AREA, TAN_MILESIMAS, ULTIMO_TERCIO, colocarSaqueInicial(), objetivosBalonParado(), PUNTOS_AREA (+27 more)

### Community 19 - "Speckit Scripts"
Cohesion: 0.11
Nodes (30): check-prerequisites.sh script, check_dir(), check_file(), find_specify_root(), format_speckit_command(), get_current_branch(), get_feature_paths(), get_invoke_separator() (+22 more)

### Community 20 - "Server Dependencies"
Cohesion: 0.10
Nodes (20): dependencies, ajv, ajv-formats, better-auth, drizzle-orm, fastify, @fastify/compress, @fastify/cookie (+12 more)

### Community 22 - "repos/draft.ts"
Cohesion: 0.13
Nodes (11): elecciones, mesas, plantillas, Ejecutor, RepoDraft, Tx, Eleccion, Mesa (+3 more)

### Community 23 - "npc.ts"
Cohesion: 0.10
Nodes (47): decidirAlineacion(), ErrorEleccion, jugarHastaElFinal(), FamiliaError, equipoDesdeAlineacion(), asientoDe(), cartaAutomatica(), CodigoErrorDraft (+39 more)

### Community 24 - "actores/torneo.ts"
Cohesion: 0.10
Nodes (49): entreHumanos(), forzarFinal(), nivelNPCDe(), resolverPartidosSinHumanos(), abandonar(), abrirSiguienteJornada(), avisarHumanos(), AVISO_PLAZO_MS (+41 more)

### Community 25 - "esquema/index.ts"
Cohesion: 0.11
Nodes (21): cuentas, participantes, partidas, peticionesProcesadas, sesiones, verificaciones, alineaciones, partidos (+13 more)

### Community 26 - "niveles.test.ts"
Cohesion: 0.09
Nodes (38): LIMITE_PRO_MS, elegirCarta(), elegirCartaDetallada(), formacionObjetivo(), inicioDudosa(), OpcionesDraft, CartaValorada, decisionDudosa() (+30 more)

### Community 27 - "BaseDatos"
Cohesion: 0.10
Nodes (16): ambitoSpecial(), filaAJugador(), registrarRutasCatalogo(), TEXTOS_SPECIALS, BaseDatos, POOL_POR_DEFECTO, jugadores, AlmacenPeticionesBD (+8 more)

### Community 28 - "gestor.ts"
Cohesion: 0.09
Nodes (47): ESTADOS_ACTIVOS, cambiarNombreEquipo(), clavesUsadas(), identidadInicial, marcarNombreAjustado(), nombresAjustados, nombresUsados(), nombresNPC() (+39 more)

### Community 29 - "series.ts"
Cohesion: 0.16
Nodes (19): EstadisticasEquipo, comprobacionesColocacion(), comprobarSC011(), comprobarSC018(), pct(), args, base, c (+11 more)

### Community 30 - "domain/src/index.ts"
Cohesion: 0.07
Nodes (58): aplicarLote(), DecisionLote, ResultadoLote, DEM, enDescanso(), lote(), comprobar(), conProrroga() (+50 more)

### Community 31 - "partida/partida.ts"
Cohesion: 0.11
Nodes (22): ConfigPartida, configPorDefecto(), debeAbandonarsePorDesconexion(), Dificultad, DIFICULTADES, ErrorConfig, EventoPartida, humanosActivos() (+14 more)

### Community 32 - "RepoPartidas"
Cohesion: 0.05
Nodes (34): RepoPartidas, EstadoPartida, 10. Resumen de relaciones (añadidos), 2. Partida (`ConfigPartida`, tabla `partidas`), 3.1 Nombre de equipo (regla de dominio), 3. Participante (tabla `participantes`), 4. Equipación (`Equipacion` v2), 5. Perfil de usuario (✚ tabla `perfiles_usuario`) (+26 more)

### Community 33 - "Spec 002 Validation & Balance"
Cohesion: 0.09
Nodes (30): Clarificaciones y ajustes de la spec (2026-10-15), Checklist de calidad de la spec, Resultados balance --n 1000, Invariante: equivalencia entre modalidades, statsEfectivos(), Quickstart de validación, Escenario A: Draft en solitario como invitado, Escenario B: Preparación del equipo (+22 more)

### Community 34 - "Escenarios de validación manual"
Cohesion: 0.12
Nodes (17): A. Simulación 2D que parece fútbol (US1; SC-001 a SC-008), B. «Formación» con un único campo (US2; SC-014, SC-015), C. Modo de simulación por partido (US3; SC-018), D. Botón principal (US4; SC-013), E. Gestión del equipo en el descanso y durante la 2D (US5; SC-016), Escenarios de validación manual, F. Finalizar partido (US6; SC-017), G. Cartas (US7; SC-012) (+9 more)

### Community 35 - "cli.ts"
Cohesion: 0.13
Nodes (20): Comprobacion, comprobacionesBase(), DEPENDENCIAS_SC009, ejecutar(), esPrincipal, evaluarPendientes(), GrupoComprobaciones, grupos() (+12 more)

### Community 36 - "Spec 003 NPC Difficulty"
Cohesion: 0.08
Nodes (26): Informe HTML de balance (informe.html), Guardarrail contra decisiones absurdas, Perfil 'automatico' (avanzado sin errores), R10 Peso medible de los specials, R12 Dificultad NPC por calidad de decision (PerfilNPC.errores), R13 Participante de referencia, R25 Verificacion de los criterios de exito, R2 Parametros 3.0.0 (v3.json) (+18 more)

### Community 37 - "CI & Docker Infra"
Cohesion: 0.08
Nodes (26): CI workflow (GitHub Actions), Paso pnpm balance --n 500, Paso umbral-motor (FR-028a, continue-on-error), Web index.html (entrada React main.tsx), docker-compose (dev services), Servicio db (postgres:16), Servicio mail (mailpit), Guía de despliegue (+18 more)

### Community 38 - "actor.ts"
Cohesion: 0.18
Nodes (3): Destino, MensajeSaliente, RegistroActores

### Community 39 - "Alineacion.tsx"
Cohesion: 0.07
Nodes (54): Props, acotar(), cambiarFormacion(), casillaDe(), colocacionDe(), DestinoSoltar, distancia(), EstadoCampo (+46 more)

### Community 40 - "ref_zod"
Cohesion: 0.22
Nodes (8): AlineacionEntrada, Color, DorsalesEntrada, EquipacionesEntrada, EquipacionV1, EquipacionV2, TacticaEntrada, CuerpoPerfil

### Community 41 - "Spec 001 Entities & API"
Cohesion: 0.16
Nodes (23): aplicarDecision(), Mensaje draft.elegir, Entidad Alineacion, Entidad Aviso, Entidad Baja y ContadorAmarillas, Entidad DecisionPartido, Data Model 001, Entidad Eleccion (+15 more)

### Community 42 - "Tasks: Mejoras de interfaz, simulación y experiencia de juego"
Cohesion: 0.08
Nodes (24): Format: `[ID] [P?] [Story] Description`, Implementation for User Story 4, Implementation for User Story 7, Notes, Parallel Example: User Story 11, Parallel Example: User Story 1 (motor), Path Conventions (monorepo de las specs 001 y 002), Phase 11: User Story 9 — NPC más accesibles en los niveles bajos (Priority: P2) (+16 more)

### Community 43 - "Draft.tsx"
Cohesion: 0.06
Nodes (46): Arrastre, CampoEquipo(), LineasCampo(), CartaJugador(), ContenidoCompacto(), ContenidoCompleto(), Posiciones(), Props (+38 more)

### Community 44 - "protocol/src/http/partidos.ts"
Cohesion: 0.18
Nodes (10): ConsultaReproduccion, CuerpoAbrir, Marcador, Modalidad, PartidoPendienteDeVer, RespuestaAbrir, RespuestaReproduccion, TramoReproduccion (+2 more)

### Community 45 - "Tasks: Mejoras visuales y de diseño (GUI + UX)"
Cohesion: 0.09
Nodes (23): Dependencias concretas entre tareas, Dependencies & Execution Order, Entrega incremental, Formato: `[ID] [P?] [Story] Descripción`, Implementation for User Story 1, Implementation Strategy, MVP First (User Story 1), Notas (+15 more)

### Community 46 - "generarCore.ts"
Cohesion: 0.13
Nodes (21): CARPETAS_EXCEPTUADAS, EXCEPCIONES, fallos, raiz, recorrer(), REGLAS, cumpleEscenario(), entradaEscenario() (+13 more)

### Community 47 - "Server Package Config"
Cohesion: 0.07
Nodes (24): exports, @fbd/ai, @fbd/domain, @fbd/engine, @fbd/protocol, zod, name, private (+16 more)

### Community 48 - "ws/base.ts"
Cohesion: 0.16
Nodes (10): ErrorProtocolo, FaseVista, MsgAck, MsgError, MsgEstado, MsgPing, MsgPong, RequestId (+2 more)

### Community 49 - "Load Test (k6)"
Cohesion: 0.13
Nodes (20): apertura, bloqueadas, cabeceras(), cookieDe(), crearUsuario(), descanso, entregaSobre, erroresWs (+12 more)

### Community 50 - "equipos.ts"
Cohesion: 0.26
Nodes (11): Props, Special, CASILLA_CENTRAL, FORMACIONES, FormacionId, Tactica, EquipoPartido, DEMARCACION_DE (+3 more)

### Community 51 - "tiro.ts"
Cohesion: 0.10
Nodes (53): lanzadorEfectivo(), gol(), amarilla(), falta(), faltaDirecta(), penalti(), probabilidadTiroDirecto(), tarjetaRoja() (+45 more)

### Community 52 - "Tabla perfiles_usuario"
Cohesion: 0.25
Nodes (11): POST /api/partidos/:id/abrir (modalidad), `preparacion.inicio` (✎), Migraciones 0006 a 0008, ModoSimulacion ('rapida' | '2d'), Tabla participantes (ultima_modalidad, pantallas vistas), partidos.modalidades (por participante), Migraciones 0006_modo_simulacion, 0007_pantallas_torneo, 0008_identidad, SelectorModo (+3 more)

### Community 53 - "checks/partido.ts"
Cohesion: 0.23
Nodes (22): equipo(), jugador(), calcularMedia(), proponerLanzadores(), comprobarSC023(), Campo, col(), comprobacionesPartido() (+14 more)

### Community 54 - "Torneo.tsx"
Cohesion: 0.06
Nodes (50): abrirPartido(), api(), marcarPantallaVista(), OpcionesPeticion, revelarResultado(), siguienteJornada(), simularResto(), Estadio() (+42 more)

### Community 55 - "servicios.ts"
Cohesion: 0.11
Nodes (7): Difusor, ServiciosPartida, RepoVisionados, Pendiente, Reloj, RelojReal, Temporizadores

### Community 56 - "Research Fase 0 (R1-R17)"
Cohesion: 0.12
Nodes (22): avanzar(estado, modo), apps/server, apps/web, Constitution Check (Principios I-X), Implementation Plan 001, packages/ai, packages/domain, packages/engine (+14 more)

### Community 57 - "Balance Package"
Cohesion: 0.11
Nodes (18): bin, balance, dependencies, @fbd/ai, @fbd/domain, @fbd/engine, exports, @fbd/ai (+10 more)

### Community 58 - "clasificacion.ts"
Cohesion: 0.36
Nodes (5): clasificacion(), FilaClasificacion, ResultadoLiga, tabla(), semilla

### Community 59 - "Spec Requirements Checklists"
Cohesion: 0.15
Nodes (11): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Mejoras de interfaz, simulación y experiencia de juego, Penalti por criterio espacial (FR-020), Seleccion de receptor por distancia y direccion (FR-016), VersionNoSoportada (parametros < 3) (+3 more)

### Community 60 - "Jugador"
Cohesion: 0.14
Nodes (33): conErrores(), decidirAlineacionDetallada(), OpcionesAlineacion, TACTICA_DEFENSIVA, TACTICA_OFENSIVA, ContextoErrores, CRUCE_MAXIMO, DESPLAZAMIENTOS (+25 more)

### Community 61 - "estado.ts"
Cohesion: 0.06
Nodes (61): NivelesPartido, ResultadoResolverResto, ParametrosEquilibrado, VersionNoSoportada, EstadoRng, Contexto, radioIntervencion(), rivalCercano() (+53 more)

### Community 62 - "Spec 003 Realtime Protocol"
Cohesion: 0.18
Nodes (10): Cliente → servidor, `estado` (✎), Garantías de orden (añadidas), `partido.decision_aplicada` (sin cambios de forma), `partido.decisiones` (✚), `partido.reproduccion` (sin cambios), Protocolo en tiempo real — cambios de la spec 003, Servidor → cliente (+2 more)

### Community 63 - "equipaciones.ts"
Cohesion: 0.15
Nodes (25): chocan(), CodigoErrorEquipaciones, colorDeContraste(), distanciaColor(), equipacionDesdeV1(), equipacionEnPartido(), equipacionesAleatorias(), EquipacionV1 (+17 more)

### Community 64 - "TS Base Config"
Cohesion: 0.12
Nodes (16): compilerOptions, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+8 more)

### Community 65 - "Speckit Skills"
Cohesion: 0.24
Nodes (11): speckit-analyze skill, speckit-checklist skill, speckit-clarify skill, speckit-constitution skill, speckit-converge skill, speckit-implement skill, speckit-plan skill, speckit-specify skill (+3 more)

### Community 66 - "e2e/ayudas.ts"
Cohesion: 0.11
Nodes (10): abrirFormacion(), arrastrarSobre(), jugarHastaCaer(), partidaTrasDraft(), sabotear(), sustituirEnGestion(), vistaTorneo, Carta (+2 more)

### Community 67 - "User Scenarios & Testing *(mandatory)*"
Cohesion: 0.05
Nodes (38): Apertura de los sobres (US8), Assumptions, Botones principales (US4), Clarifications, Dificultad de los NPC (US9), Diseño de las cartas (US7), Edge Cases, Feature Specification: Mejoras de interfaz, simulación y experiencia de juego (+30 more)

### Community 68 - "servidor.ts"
Cohesion: 0.13
Nodes (31): ContextoComando, abandonarDraft(), abrirTurno(), dudosasHechas, eleccionNPC(), emitirProgreso(), iniciarDraft(), mensajeTurno() (+23 more)

### Community 69 - "Protocolo en tiempo real (WebSocket)"
Cohesion: 0.14
Nodes (12): Resultados de carga SC-017, Validación del MVP (T144), Cabecera Idempotency-Key, Protocolo en tiempo real (WebSocket), Mensaje draft.progreso, Mensaje draft.turno, Instantánea estado en reconexión, Mensaje partido.inicio (+4 more)

### Community 70 - "protocol/src/http/partidas.ts"
Cohesion: 0.20
Nodes (9): AnadirNPC, CuerpoNombreEquipo, CuerpoPantallaVista, Dificultad, MisPartidas, NivelNPC, PartidaResumen, RespuestaSimularResto (+1 more)

### Community 71 - "Spec 003 Research"
Cohesion: 0.11
Nodes (18): R10. Peso medible de los specials (FR-022, SC-007), R12. Dificultad de los NPC por calidad de decisión (FR-036 a FR-038, SC-010, SC-010a, SC-010b), R13. Participante de referencia y comprobación de SC-010, R15. Vista ampliada de la carta (FR-004, FR-005, SC-015), R17. Gestión del equipo durante el partido (FR-027 a FR-031, SC-016), R1. Línea base del motor actual y diagnóstico (US1), R20. Diseño de las cartas (FR-008 a FR-010, SC-012), R21. Apertura de sobres y sonido (FR-011 a FR-015, SC-019) (+10 more)

### Community 72 - "juego.ts"
Cohesion: 0.08
Nodes (75): fueraDeJuego(), cercanoACelda(), elegirPonderado(), esPortero(), holgura(), jugadorPorId(), radioDe(), actualizarPosesion() (+67 more)

### Community 73 - "torneo/torneo.ts"
Cohesion: 0.06
Nodes (46): Modo, estadoDesdeSemilla(), hash128(), rotl(), semillaDesdeEstado(), aplicarConsecuencias(), autor(), EstadoBajas (+38 more)

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
Cohesion: 0.20
Nodes (10): Aclaraciones sobre la dificultad (H13, H14), Batería e2e tras los cambios (2026-10-20), Cambios de requisito H5, H6, H7 y H9, Correcciones de los defectos H1, H2 y H10, Criterios de éxito con personas, Decisiones sobre H11 y H14 (2026-10-20), H11 cerrado: llegada orgánica y regate hacia dentro, H11: llegada al área de extremos y mediapunta (+2 more)

### Community 78 - "Spec 001 Contracts Index"
Cohesion: 0.20
Nodes (9): avanzar(estado, modo, opciones), OpcionesAvance (fotogramas, metricas), ResultadoPartido, EstadisticasEquipo (pases y tiros por zona, golesPorTipo), MetricasJugador (no persistidas), TipoTiro (propia) y zonaRemate en eventos de tiro/gol, Herramienta balance (informe.html), Escenarios de validacion manual A a L (+1 more)

### Community 79 - "interpolacion.ts"
Cohesion: 0.30
Nodes (9): fuera(), hermite(), indiceFotograma(), parabola(), pendiente(), posicionesEn(), RADIO_CHAPA, ORDEN (+1 more)

### Community 80 - "AI Package"
Cohesion: 0.15
Nodes (12): dependencies, @fbd/domain, @fbd/engine, exports, @fbd/domain, @fbd/engine, name, private (+4 more)

### Community 81 - "Single Pitch & Batch Decisions"
Cohesion: 0.12
Nodes (16): Formacion: Alineacion sobre CampoEquipo, BarraPrincipal (un boton principal por pantalla), CampoEquipo (campo unico compartido), GestionEquipo (gestion durante el partido), humanosEnCompeticion, Lote atomico partido.decisiones, R14 Formacion con un unico campo, R17 Gestion del equipo durante el partido (+8 more)

### Community 82 - "Research — spec 004: mejoras visuales y de diseño"
Cohesion: 0.11
Nodes (17): comprobarDiseno(), R10. Animación y movimiento reducido (FR-017, FR-028, FR-033), R11. Equipaciones oscuras sobre el lienzo (FR-034, Edge Cases), R13. Verificación automática (FR-040; Clarifications), R14. Validación con personas (SC-003, SC-004, SC-010), R15. Textos de la interfaz (FR-035, FR-036), R1. Dirección de diseño (skill `frontend-design`), R2. Tipografías (+9 more)

### Community 83 - "Calibración de los errores de los NPC (T097)"
Cohesion: 0.28
Nodes (5): Línea base del motor 2.0.0 (commit `c8a1627`), NPC (SC-010, T091), Partidos (equipos sintéticos equilibrados, táctica por defecto), Pruebas automáticas, Validación de la spec 003 (T133)

### Community 84 - "Engine Package"
Cohesion: 0.17
Nodes (11): dependencies, @fbd/domain, exports, @fbd/domain, name, private, scripts, bench (+3 more)

### Community 85 - "Home — Style Reference"
Cohesion: 0.06
Nodes (36): Agent Prompt Guide, Border Radius, Components, Cookie Settings Modal, CSS Custom Properties, Dark Card, Do, Do's and Don'ts (+28 more)

### Community 86 - "decisiones.ts"
Cohesion: 0.14
Nodes (28): validarColocacion(), esFormacionId(), comprobarInferioridad(), cubrirPorteria(), expulsar(), mejorSuplente(), MINIMO_JUGADORES, quitarDelCampo() (+20 more)

### Community 87 - ".participante"
Cohesion: 0.22
Nodes (16): pendientesDeMesa(), vistaDraft(), detalleBajas(), sinHumanos(), vistaPartido(), emitirPreparacion(), modalidadPreferida(), OpcionesJornada (+8 more)

### Community 88 - "Web Package"
Cohesion: 0.11
Nodes (17): dependencies, @fbd/domain, @fbd/protocol, react, react-dom, react-router, zustand, @fbd/domain (+9 more)

### Community 89 - "Spec 003 HTTP Changes"
Cohesion: 0.18
Nodes (11): Contrato HTTP/JSON — cambios de la spec 003, `GET /api/partidas/:id/alineacion` (✎), `GET /api/partidos/:id` (✎), `GET /api/partidos/:id/reproduccion?modalidad=rapida|2d` (✎), `GET /api/perfil`, Partidos, Perfil de usuario (✚), Plantilla, alineación y equipaciones (+3 more)

### Community 90 - "Checklist de requisitos: Simulación 2D y finalización"
Cohesion: 0.11
Nodes (19): Fútboosterdraft Constitution, CLAUDE.md (instrucciones del proyecto), Checklist de requisitos: Simulación 2D y finalización, Presión coordinada (excepción a máx. 2 jugadores al balón), Prueba de carga k6 beta-100 (no validada), Desviación: motor ~80 ms por partido, no cumple FR-028a, Herramienta de equilibrado pnpm balance, Validación de la spec 002 (T159) (+11 more)

### Community 91 - "ws/draft.ts"
Cohesion: 0.22
Nodes (8): JugadorResumen, MsgDraftEleccionAuto, MsgDraftElegir, MsgDraftProgreso, MsgDraftTerminado, MsgDraftTurno, MsgSalaActualizada, ParticipanteSala

### Community 92 - "Draft.tsx"
Cohesion: 0.07
Nodes (42): AperturaSobre(), calendarioApertura(), COLOR_PARTICULAS, DURACION_MAXIMA_MS, DURACION_SOBRE_MS, ESCALONADO_MS, especial(), EstadoCarta (+34 more)

### Community 94 - "Jugador"
Cohesion: 0.13
Nodes (17): ResultadoValidacion, alineacionCorrecta(), tacticaSegunRival(), fuerzaAlineacion(), fuerzaPlantilla(), Jugador, autoAlineacion(), ALTURAS_BLOQUE (+9 more)

### Community 95 - "Contrato de interfaz — spec 003"
Cohesion: 0.14
Nodes (12): Contrato de interfaz (spec 002), Apertura de sobre (`AperturaSobre`, FR-011 a FR-015; research R21), Barra principal (`BarraPrincipal`, FR-006, FR-007; research R16), Carta de jugador (`CartaJugador`, FR-008 a FR-010; research R20), Contrato de interfaz — spec 003, Derrota y campeón (`PantallaDerrota`, `PantallaCampeon`, FR-039 a FR-041b; research R22), «Formación» (`Alineacion` sobre `CampoEquipo`, FR-001 a FR-003; research R14), Gestión del equipo durante el partido (`GestionEquipo`, FR-027 a FR-031; research R17) (+4 more)

### Community 96 - "Domain Package"
Cohesion: 0.25
Nodes (7): exports, name, private, scripts, typecheck, type, version

### Community 97 - "Lienzo2D.tsx"
Cohesion: 0.05
Nodes (37): agregarFotogramas(), Fotograma, Posiciones, accionEn(), AccionVista, DatosReproduccion, ETIQUETA_ACCION, LanzamientoVista (+29 more)

### Community 98 - "ws/torneo.ts"
Cohesion: 0.40
Nodes (4): FilaGoleadores, MsgAviso, MsgTorneoActualizado, Ref

### Community 99 - "colores.ts"
Cohesion: 0.18
Nodes (17): dibujar(), Camiseta(), Props, ColoresChapa, contornoSobreLienzo(), TOKENS_SIN_DOCUMENTO, COLOR_NUEVO, ETIQUETA_DISENO (+9 more)

### Community 100 - "colores.ts"
Cohesion: 0.12
Nodes (16): contraste(), luminancia(), necesitaContorno(), css, fondos, Complexity Tracking, Constitution Check, Documentation (this feature) (+8 more)

### Community 101 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, balance, build, db:migrate, dev, e2e, generar-core, lint (+6 more)

### Community 102 - "Calibración del motor 3.0.0 (T033)"
Cohesion: 0.15
Nodes (13): Calibración del motor 3.0.0 (T033), Configuración final: la de la ronda 7, Línea base (motor 2.0.0, `c8a1627`), Pendiente, Ronda 10 (`--serie todas`, n = 500): ronda 7 más el peso del centro 3,9 / 2,8, Ronda 11 (tras H8, H11 y H13; `--serie todas`, n = 500), Ronda 12 y 13: llegada orgánica y regate hacia dentro (H11, decisión del 2026-10-20), Ronda 5 (`pnpm balance --n 500 --serie todas`, 1.648,7 s) (+5 more)

### Community 103 - "Web TS Config"
Cohesion: 0.29
Nodes (6): compilerOptions, jsx, lib, extends, include, ../../tsconfig.base.json

### Community 104 - "particulas.ts"
Cohesion: 0.17
Nodes (7): FPS_MINIMO, iniciarParticulas(), OpcionesParticulas, Particula, PRESUPUESTO_MS, SistemaParticulas, VENTANA_FPS_MS

### Community 105 - "User Scenarios & Testing *(mandatory)*"
Cohesion: 0.07
Nodes (30): Accesibilidad y adaptación (US4), Assumptions, Clarifications, Componentes comunes (US1, US2), Edge Cases, Estados y retroalimentación (US2), Feature Specification: Mejoras visuales y de diseño (GUI + UX), Functional Requirements (+22 more)

### Community 106 - "servicio.ts"
Cohesion: 0.15
Nodes (5): NuevoAviso, ServicioAvisos, TipoAviso, nodemailer, pino

### Community 107 - "AvisoPartido.tsx"
Cohesion: 0.23
Nodes (11): AvisoPartido(), EstadoPreparacion, Preparacion, TarjetaPreparacion(), AccionBarra, ETIQUETA_AVANCE, Props, SituacionAvance (+3 more)

### Community 108 - "Contrato HTTP/JSON"
Cohesion: 0.20
Nodes (9): Rutas /api/partidas/:id/alineacion, POST /api/auth/invitado, Contrato HTTP/JSON, GET /api/partidas/:id/plantillas, POST /api/partidas, GET /api/partidas/:id/torneo, Modo invitado (FR-000), Contrato HTTP/JSON (spec 002) (+1 more)

### Community 110 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, eslint, @eslint/js, fast-check, globals, prettier, tsx, @types/node (+3 more)

### Community 111 - "Spec 002 Engine Ops"
Cohesion: 0.40
Nodes (6): penalizacionPorPosicion(j, destino, p), previsualizar(alineacion) -> Previsualizacion, statsEfectivos(j, destino, p, ctx), zonaEn(x, y), POST /api/partidas/:id/alineacion/previsualizar, Colocación libre (FR-034)

### Community 113 - "Server TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, extends, include, ../../tsconfig.base.json

### Community 114 - "comprobaciones.ts"
Cohesion: 0.19
Nodes (7): ANCHOS, LIMA, OpcionesDiseno, rellenosLima(), focoVisible(), tabHasta(), @axe-core/playwright

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

### Community 124 - "repos/perfiles.ts"
Cohesion: 0.20
Nodes (4): perfilesUsuario, Ejecutor, RepoPerfiles, Tx

### Community 126 - "`PUT /api/partidas/:id/nombre-equipo` (✚)"
Cohesion: 0.22
Nodes (10): GET/PUT /api/perfil, `PUT /api/partidas/:id/nombre-equipo` (✚), PUT /api/partidas/:id/equipaciones (v2), `partido.inicio` (✎), Sala, EditorEquipacion y Perfil (nombre y equipacion), desdeV1 (conversion equipaciones v1 a v2), Equipacion v2 (diseno, colores), equipacionEnPartido (resolucion de choque de colores) (+2 more)

### Community 127 - "Validación de la spec 004 con personas (SC-003, SC-004, SC-010)"
Cohesion: 0.22
Nodes (8): Hallazgos, Preparación, Pruebas automáticas previas, Resultado, SC-003 — Prueba de cinco segundos, SC-004 — Valoración «se ve profesional y moderna», SC-010 — Tiempos de decisión, Validación de la spec 004 con personas (SC-003, SC-004, SC-010)

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

### Community 149 - "Rng"
Cohesion: 0.07
Nodes (39): errorPartido(), decidirEnPartido(), iguales(), plantillaCore(), draft(), DISTRIBUCION_CORE, MINIMO_EQUILIBRADO_CORE, RecuentoCatalogo (+31 more)

### Community 153 - "Validación de la spec 004 con personas (SC-003, SC-004, SC-010)"
Cohesion: 0.13
Nodes (12): Criterios, Escenarios concretos ([quickstart.md](../quickstart.md) §4), Hallazgos, Lista de verificación visual — spec 004 (SC-001), Pantallas, 1. Comprobaciones rápidas (sin base de datos), 2. Comprobaciones automáticas de diseño (FR-040), 3. No regresión (FR-038, SC-008) (+4 more)

### Community 154 - "zonas.ts"
Cohesion: 0.24
Nodes (9): ABREVIATURA, CARRILES, dentro(), enPorteria(), LineaZona, Tramo, ZONA_PORTERIA, zonaEn() (+1 more)

### Community 155 - "semillaDesdeTexto"
Cohesion: 0.14
Nodes (17): semillaDesdeTexto(), diagnostico(), esPrincipal, clonar(), esPrincipal, GRUPO, Medicion, medir() (+9 more)

### Community 156 - "Propuesta de enmienda PATCH 1.0.5 de la constitución (T126)"
Cohesion: 0.50
Nodes (3): Cambios propuestos, Propuesta de enmienda PATCH 1.0.5 de la constitución (T126), Sync Impact Report propuesto

### Community 158 - "http/app.ts"
Cohesion: 0.12
Nodes (19): OpcionesRutasAuth, claveSesion(), construirApp(), DependenciasApp, cuerpoError(), ErrorApi, Limitador, LIMITE_HTTP (+11 more)

### Community 159 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, drizzle-kit, pino-pretty, testcontainers, @testcontainers/postgresql, tsup, @types/nodemailer, @types/pg (+1 more)

### Community 160 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, e2e, lint:tokens, preview, typecheck

### Community 161 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, db:generate, db:migrate, dev, seed, start, test:integration (+1 more)

### Community 162 - "Partidas"
Cohesion: 0.38
Nodes (7): `GET /api/partidas/:id/torneo` (✎), Partidas, `POST /api/partidas` (✎), `POST /api/partidas/:id/pantalla-vista` (✚), `POST /api/partidas/:id/simular-resto` (✚), Eliminacion (eliminaciones, humanosEnCompeticion), PantallaDerrota y PantallaCampeon

### Community 164 - "Implementation for User Story 2"
Cohesion: 0.33
Nodes (6): banquillo(), Correcciones de los hallazgos críticos, R14. «Formación» con un único campo (FR-001 a FR-003, FR-002a), Implementation for User Story 2, Phase 4: User Story 2 — Preparar el equipo sobre un único campo con cartas a la vista (Priority: P1), Tests for User Story 2 ⚠️

### Community 165 - "Calibración de los errores de los NPC (T097)"
Cohesion: 0.33
Nodes (6): Calibración de los errores de los NPC (T097), Ronda 1: valores iniciales de data-model §6 (30 torneos por nivel), Ronda 2: amateur 700 / 12, intermedio 450 / 9, avanzado 250 / 5, PRO 25 / 1,5 (100 torneos por nivel), Ronda 3: intermedio 500 / 10, Ronda 4 (valores finales): +100 milésimas por familia (H13), Sonda (`tools/balance/src/sondaNPC.ts`, 20 torneos)

### Community 166 - "Dependencies & Execution Order"
Cohesion: 0.40
Nodes (5): Dependencies & Execution Order, Grafo de historias, Parallel Opportunities, Phase Dependencies, Within Each User Story

### Community 167 - "R24 Equipaciones v2 (diseno + hasta 3 colores)"
Cohesion: 0.33
Nodes (6): EditorEquipacion y Camiseta SVG, Regla de parecido de equipaciones (umbral 0,45), patronDiseno(diseno, colores), R23 Nombre del equipo y perfil de la cuenta, R24 Equipaciones v2 (diseno + hasta 3 colores), US11 Nombre y equipacion a mi gusto (P3)

### Community 168 - ".detener"
Cohesion: 0.67
Nodes (3): Implementation for User Story 8, Phase 10: User Story 8 — Abrir sobres con espectáculo (Priority: P2), Tests for User Story 8 ⚠️

### Community 170 - "Implementation Strategy"
Cohesion: 0.50
Nodes (4): Entrega incremental, Equipo en paralelo, Implementation Strategy, MVP primero (historias P1)

### Community 172 - "Frontend Design"
Cohesion: 0.29
Nodes (6): Design principles, Frontend Design, Ground your designs in the subject matter, More on writing in design, Process: plan, review against the brief, build, critique, Restraint and self-critique

### Community 173 - "Contrato del motor (engine-api)"
Cohesion: 0.50
Nodes (5): crearPartido(), Contrato del motor (engine-api), EntradaPartido, ResultadoTramo, Mensaje partido.tramo

### Community 174 - "Frontend Design"
Cohesion: 0.29
Nodes (6): Design principles, Frontend Design, Ground your designs in the subject matter, More on writing in design, Process: plan, review against the brief, build, critique, Restraint and self-critique

### Community 177 - "Specification Quality Checklist: Mejoras visuales y de diseño (GUI + UX)"
Cohesion: 0.40
Nodes (5): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Mejoras visuales y de diseño (GUI + UX)

## Ambiguous Edges - Review These
- `equipacionEnPartido (resolucion de choque de colores)` → `Guardarrail esErrorAdmisible`  [AMBIGUOUS]
  specs/003-mejoras-ux-simulacion/data-model.md · relation: semantically_similar_to

## Knowledge Gaps
- **129 isolated node(s):** `@fbd/ai`, `@fbd/domain`, `@fbd/engine`, `@fbd/protocol`, `zod` (+124 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1232 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `Server Bootstrap & DB` to `partido003.ts`, `catalogo/tipos.ts`, `parametrosActuales`, `ReproduccionPartido.tsx`, `equipo/alineacion.ts`, `animaciones.ts`, `partidoRapido.ts`, `package.json`, `Field Placement Geometry`, `Rng`, `npc.ts`, `niveles.test.ts`, `BaseDatos`, `gestor.ts`, `zonas.ts`, `domain/src/index.ts`, `http/app.ts`, `partida/partida.ts`, `actor.ts`, `Alineacion.tsx`, `Draft.tsx`, `generarCore.ts`, `ws/base.ts`, `tiro.ts`, `servicios.ts`, `clasificacion.ts`, `Jugador`, `equipaciones.ts`, `torneo/torneo.ts`, `interpolacion.ts`, `Draft.tsx`, `Jugador`, `Lienzo2D.tsx`, `colores.ts`, `particulas.ts`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `crearPartido()` (e.g. with `Entrada` and `Tests (escribir primero; deben fallar)`) actually correct?**
  _`crearPartido()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@fbd/ai`, `@fbd/domain`, `@fbd/engine` to the rest of the system?**
  _129 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Server Bootstrap & DB` be split into smaller, more focused modules?**
  _Cohesion score 0.05970713273500236 - nodes in this community are weakly interconnected._
- **Why does `Research — Fase 0: Mejoras de interfaz, simulación y experiencia de juego` connect `Spec 003 Research` to `Implementation for User Story 2`, `juego.ts`, `Marco.tsx`, `Spec 001 Contracts Index`, `partidoRapido.ts`, `tiro.ts`, `actores/torneo.ts`, `estado.ts`, `partida/partida.ts`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Should `catalogo/tipos.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07539118065433854 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `equipacionEnPartido (resolucion de choque de colores)` and `Guardarrail esErrorAdmisible`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._