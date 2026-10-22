# Graph Report - futboosterdraft  (2026-10-22)

## Corpus Check
- 586 files · ~545,877 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: (none) 8, .woff2 5, .css 4)

## Summary
- 4261 nodes · 12655 edges · 182 communities (153 shown, 29 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 772 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `480ad918`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Server Bootstrap & DB
- partido003.ts
- catalogo/tipos.ts
- Contrato de interfaz — spec 004
- catalogo/rasgos.ts
- Migracion 0004_mejoras.sql
- src/alineacion.ts
- parametrosActuales
- ControladorPartida
- Constitution Principles
- ReproduccionPartido.tsx
- Marco.tsx
- FormacionId
- animaciones.ts
- partidoRapido.ts
- package.json
- useConexion.ts
- defectos.ts
- BarraPrincipal.tsx
- Speckit Scripts
- Server Dependencies
- receptor.ts
- engine/tests/ayudas.ts
- actores/draft.ts
- actores/torneo.ts
- niveles.test.ts
- npc.ts
- 003-mejoras-ux-simulacion/contracts/engine-api.md
- generarCore.ts
- estado.ts
- vitest
- partida/partida.ts
- RepoPartidas
- Spec 002 Validation & Balance
- Escenarios de validación manual
- cli.ts
- Spec 003 NPC Difficulty
- CI & Docker Infra
- crearServidor
- Alineacion.tsx
- ws/partido.ts
- Spec 001 Entities & API
- Tasks: Mejoras de interfaz, simulación y experiencia de juego
- sonido.ts
- Jugador
- Tasks: Mejoras visuales y de diseño (GUI + UX)
- ref_node_fs
- necesitaContorno
- checks/rasgos.ts
- Load Test (k6)
- domain/src/index.ts
- tiro.ts
- Tabla perfiles_usuario
- checks/partido.ts
- Torneo.tsx
- validar.ts
- Research Fase 0 (R1-R17)
- Balance Package
- Functional Requirements
- xoshiro.ts
- Jugador
- series.ts
- Spec 003 Realtime Protocol
- equipaciones.ts
- TS Base Config
- Speckit Skills
- e2e/ayudas.ts
- User Scenarios & Testing *(mandatory)*
- Lienzo2D.tsx
- Protocolo en tiempo real (WebSocket)
- parametros/index.ts
- Spec 003 Research
- juego.ts
- torneo/torneo.ts
- Fixtures Package
- Pasarela
- Protocol Package
- Pruebas con personas (2026-10-19)
- 005-virtudes-defectos/tasks.md
- interpolacion.ts
- AI Package
- Single Pitch & Batch Decisions
- Research — spec 004: mejoras visuales y de diseño
- Calibración del motor 3.0.0 (T033)
- Engine Package
- Home — Style Reference
- decisiones.ts
- partidoEntreHumanos.ts
- Web Package
- Spec 003 HTTP Changes
- Contrato de interfaz — spec 003
- Tasks: Virtudes, defectos y nuevo modo de juego
- CartaJugador.tsx
- @playwright/test
- validar.test.ts
- cuadro.ts
- Domain Package
- Lienzo2D.tsx
- comprobar-tokens.mjs
- react
- equiposEquivalencia005.ts
- NombreRecortado
- particulas.ts
- Web TS Config
- equivalenciaFinalizar.test.ts
- Functional Requirements
- disciplina.ts
- Defecto
- Contrato — HTTP
- tema.spec.ts
- Data Model — Mejoras de interfaz, simulación y experiencia de juego
- Spec 002 Engine Ops
- impacto.ts
- Server TS Config
- comprobaciones.ts
- http/app.ts
- AI TS Config
- Domain TS Config
- Engine TS Config
- Protocol TS Config
- apertura.spec.ts
- Balance TS Config
- Fixtures TS Config
- Constitution Governance
- Research — Fase 0: Virtudes, defectos y nuevo modo de juego
- torneo-asincrono.spec.ts
- Contrato de interfaz — spec 003
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
- sala.ts
- T086 Engine Perf
- T159 Validation
- 004-mejoras-visuales-diseno/contracts/ui.md
- Posicion
- Rng
- Propuesta de enmienda PATCH 1.0.5 de la constitución (T126)
- eliminaciones.test.ts
- servidor.ts
- devDependencies
- scripts
- scripts
- dependencies
- Recorridos manuales
- MediaEquipo.tsx
- asignarRasgos.ts
- R24 Equipaciones v2 (diseno + hasta 3 colores)
- basico.ts
- main.tsx
- protocol/src/http/alineacion.ts
- Frontend Design
- Implementation Plan: Virtudes, defectos y nuevo modo de juego
- Frontend Design
- `PUT /api/partidas/:id/nombre-equipo` (✚)
- Implementation Plan: Mejoras de interfaz, simulación y experiencia de juego
- Cambios propuestos
- Partidas
- Contrato — Tabla de rasgos (`packages/domain/src/catalogo/rasgos.ts`)
- Contrato del motor (engine-api)
- RepoTorneo
- rasgosProbados.test.ts

## God Nodes (most connected - your core abstractions)
1. `vitest` - 119 edges
2. `avanzar()` - 82 edges
3. `crearPartido()` - 75 edges
4. `parametrosActuales()` - 73 edges
5. `Rng` - 67 edges
6. `Jugador` - 66 edges
7. `EstadoMotor` - 61 edges
8. `semillaDesdeTexto()` - 56 edges
9. `derivarSemilla()` - 56 edges
10. `paso()` - 56 edges

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

## Communities (182 total, 29 thin omitted)

### Community 0 - "Server Bootstrap & DB"
Cohesion: 0.06
Nodes (82): OpcionesJornada, programarJornada(), ruta, principal(), conectar(), ConexionBD, urlBaseDatos(), aplicarMigraciones() (+74 more)

### Community 1 - "partido003.ts"
Cohesion: 0.21
Nodes (25): ambos(), cache, cacheCore, comprobarSC001(), comprobarSC002(), comprobarSC003(), comprobarSC004(), comprobarSC005() (+17 more)

### Community 2 - "catalogo/tipos.ts"
Cohesion: 0.14
Nodes (14): DEMARCACIONES, Stats, StatsDe, StatsDEF, StatsDEL, StatsMED, StatsPOR, valoresStats() (+6 more)

### Community 3 - "Contrato de interfaz — spec 004"
Cohesion: 0.18
Nodes (11): 10. Nombres recortados (Edge Cases; research R9), 11. Textos renombrados durante la implementación (FR-035, FR-036), 1. Reglas globales (todas las pantallas del inventario), 2. Barra de navegación (FR-012a; research R8), 3. Inicio (FR-014, FR-015), 4. Marcadores (FR-016, FR-034), 5. Pantallas finales (FR-017), 7. Estados vacíos (FR-025) (+3 more)

### Community 4 - "catalogo/rasgos.ts"
Cohesion: 0.10
Nodes (26): TextoRasgo, TEXTOS_RASGOS, AmbitoRasgo, ambitoVirtud(), DEFECTOS_SET, DEFINICION_DEFECTOS, Entrada, esDefecto() (+18 more)

### Community 5 - "Migracion 0004_mejoras.sql"
Cohesion: 0.05
Nodes (33): Alineacion.colocacion { jugadorId, x, y }, EstadisticasEquipo (pases, centros, precisionPase, secuencias), EstadoMotor: ancla, posicion, perfil, espacio, posesion, EstadoTorneo.aportaciones y tablaGoleadores/tablaAsistentes, Fotograma v2 y AccionVisible, MesaDraft.pausadaEn / restanteMs, ParametrosEquilibrado 2.0.0 (v2.json), Partido.resolucion ('directo'|'apertura'|'plazo'|'npc') y abiertoPorId (+25 more)

### Community 6 - "src/alineacion.ts"
Cohesion: 0.10
Nodes (37): lote(), alineacionCorrecta(), decidirAlineacionDetallada(), LIMITE_PRO_MS, TACTICA_DEFENSIVA, TACTICA_OFENSIVA, tacticaSegunRival(), errorPartido() (+29 more)

### Community 7 - "parametrosActuales"
Cohesion: 0.11
Nodes (42): cartasDelCruce(), humanoActivo(), onceDe(), resolverCrucesDuelos(), vistaCruce(), alineacionAutomatica(), alineacionVigente(), bajasActivas() (+34 more)

### Community 8 - "ControladorPartida"
Cohesion: 0.07
Nodes (23): ActorPartida, Destino, MensajeSaliente, RegistroActores, pendientesDeMesa(), vistaDraft(), detalleBajas(), ControladorPartida (+15 more)

### Community 9 - "Constitution Principles"
Cohesion: 0.09
Nodes (24): Simulación 2D en tiempo real, Simulación rápida, AccionVisible, avanzar modo 'ticks' con hastaTick, decidirNPCEnPausa, Invariante 6b: cortes por ticks inocuos, Invariante 5: finalizar es equivalente, Invariante 7: fotogramas inocuos (+16 more)

### Community 10 - "ReproduccionPartido.tsx"
Cohesion: 0.07
Nodes (55): Fotograma, AccionVista, DatosReproduccion, jugadoresDe(), Props, Superposicion, datosVacios(), TramoRecibido (+47 more)

### Community 11 - "Marco.tsx"
Cohesion: 0.08
Nodes (41): Ambiente(), Enlace, ENLACES, Marco(), partidaDeRuta(), Salida, salidaDe(), Escudo() (+33 more)

### Community 12 - "FormacionId"
Cohesion: 0.16
Nodes (18): AlineacionGuardada, AlineacionPartido, EstadoEquipo, EventoEquipo, MAX_SUSTITUCIONES, alineacion, eventos, Alineacion (+10 more)

### Community 13 - "animaciones.ts"
Cohesion: 0.10
Nodes (50): PlanPase, OpcionesReceptor, OpcionesTiro, acotar(), dividir(), escalar(), isqrt(), norma() (+42 more)

### Community 14 - "partidoRapido.ts"
Cohesion: 0.09
Nodes (48): ContextoComando, programarTurno(), aplicarLote(), DecisionLote, avanzar2D(), crearEstado2D(), Estado2D, olvidarVistos() (+40 more)

### Community 15 - "package.json"
Cohesion: 0.05
Nodes (40): sinNoDeterminismo, devDependencies, eslint, @eslint/js, fast-check, globals, prettier, tsx (+32 more)

### Community 16 - "useConexion.ts"
Cohesion: 0.08
Nodes (34): ConSesion(), router, Rutas(), PantallaCargando(), mantenerConexionInvitado(), soltarConexionInvitado(), EstadoServidor, useConexion() (+26 more)

### Community 17 - "defectos.ts"
Cohesion: 0.10
Nodes (53): GravedadLesion, comprobarLesion(), ORDEN, sortearGravedad(), atributoConBonus(), cacheAtributos, entradaAtributos(), media() (+45 more)

### Community 18 - "BarraPrincipal.tsx"
Cohesion: 0.23
Nodes (10): EstadoPreparacion, Preparacion, AccionBarra, Props, ETIQUETA_AVANCE, Props, SituacionAvance, Modalidad (+2 more)

### Community 19 - "Speckit Scripts"
Cohesion: 0.11
Nodes (30): check-prerequisites.sh script, check_dir(), check_file(), find_specify_root(), format_speckit_command(), get_current_branch(), get_feature_paths(), get_invoke_separator() (+22 more)

### Community 20 - "Server Dependencies"
Cohesion: 0.10
Nodes (20): dependencies, ajv, ajv-formats, better-auth, drizzle-orm, fastify, @fastify/compress, @fastify/cookie (+12 more)

### Community 21 - "receptor.ts"
Cohesion: 0.09
Nodes (46): holgura(), CERCA_REMATE, factorConduccion(), factorPaseLargo(), factorStat(), lineaDeTiroDespejada(), pesosConEspacio(), pesoTiroDesde() (+38 more)

### Community 22 - "engine/tests/ayudas.ts"
Cohesion: 0.17
Nodes (28): PARAMETROS_V4, MotivoPaseLargo, contextoDe(), darBalon(), DEM, partido(), ponerRasgos(), situar() (+20 more)

### Community 23 - "actores/draft.ts"
Cohesion: 0.09
Nodes (38): abandonarDraft(), abrirTurno(), dudosasHechas, eleccionNPC(), emitirProgreso(), iniciarDraft(), mensajeTurno(), procesarEleccion() (+30 more)

### Community 24 - "actores/torneo.ts"
Cohesion: 0.11
Nodes (46): entreHumanos(), crearPartidosJornada(), resolverPartidosSinHumanos(), abandonar(), abrirSiguienteJornada(), avisarHumanos(), AVISO_PLAZO_MS, despuesDePartido() (+38 more)

### Community 25 - "niveles.test.ts"
Cohesion: 0.14
Nodes (28): elegirCartaDetallada(), formacionObjetivo(), inicioDudosa(), decisionDudosa(), errorDraft(), cobertura(), CUPO_DEMARCACION, encaja() (+20 more)

### Community 26 - "npc.ts"
Cohesion: 0.11
Nodes (42): decidirAlineacion(), elegirCarta(), ErrorEleccion, jugarHastaElFinal(), FamiliaError, equipoDesdeAlineacion(), Rendimiento, simularCandidata() (+34 more)

### Community 27 - "003-mejoras-ux-simulacion/contracts/engine-api.md"
Cohesion: 0.07
Nodes (29): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Mejoras de interfaz, simulación y experiencia de juego, avanzar(estado, modo, opciones), Comportamiento (reglas comprobables), Contrato del motor de simulación — cambios de la spec 003 (+21 more)

### Community 28 - "generarCore.ts"
Cohesion: 0.12
Nodes (15): VIRTUDES_GENERICAS, VIRTUDES_MED, VIRTUDES_POR_DEMARCACION, ALTURA, MEDIA_POR_NIVEL, NACIONALIDADES, NIVELES_TEXTO, NOMBRES (+7 more)

### Community 29 - "estado.ts"
Cohesion: 0.08
Nodes (45): PartidoEnCurso, ResultadoResolverResto, EstadoRng, candidatoDefensivo(), Contexto, radioDe(), radioIntervencion(), rivalCercano() (+37 more)

### Community 30 - "vitest"
Cohesion: 0.10
Nodes (34): hasta(), semilla, crearPartido(), aplicarDecision(), avanzar(), encolarDecision(), jugar(), TIPOS (+26 more)

### Community 31 - "partida/partida.ts"
Cohesion: 0.11
Nodes (23): CONFIG_DUELOS_POR_DEFECTO, configDuelosValida(), configPorDefecto(), debeAbandonarsePorDesconexion(), Dificultad, DIFICULTADES, ErrorConfig, EventoPartida (+15 more)

### Community 32 - "RepoPartidas"
Cohesion: 0.15
Nodes (4): RepoPartidas, EstadoPartida, 3.1 Nombre de equipo (regla de dominio), 3. Participante (tabla `participantes`)

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

### Community 38 - "crearServidor"
Cohesion: 0.13
Nodes (6): reprogramarTurnos(), GestorPartidas, enPartido(), crearAuth(), ServicioAvisos, crearServidor()

### Community 39 - "Alineacion.tsx"
Cohesion: 0.06
Nodes (68): BarraPrincipal(), Arrastre, CampoEquipo(), LineasCampo(), Props, acotar(), cambiarFormacion(), casillaDe() (+60 more)

### Community 40 - "ws/partido.ts"
Cohesion: 0.04
Nodes (53): ESTADO_HTTP, RespuestaError, ConsultaReproduccion, CuerpoAbrir, LadoDuelo, Marcador, Modalidad, PartidoPendienteDeVer (+45 more)

### Community 41 - "Spec 001 Entities & API"
Cohesion: 0.17
Nodes (22): Mensaje draft.elegir, Entidad Alineacion, Entidad Aviso, Entidad Baja y ContadorAmarillas, Entidad DecisionPartido, Data Model 001, Entidad Eleccion, Entidad EventoPartido (+14 more)

### Community 42 - "Tasks: Mejoras de interfaz, simulación y experiencia de juego"
Cohesion: 0.06
Nodes (31): Dependencies & Execution Order, Entrega incremental, Equipo en paralelo, Format: `[ID] [P?] [Story] Description`, Grafo de historias, Implementation for User Story 4, Implementation for User Story 6, Implementation for User Story 7 (+23 more)

### Community 43 - "sonido.ts"
Cohesion: 0.13
Nodes (20): activado, buferes, cambiarSonido(), cargar(), CLAVE_SONIDO, Efecto, EfectoFichero, EfectoSintetizado (+12 more)

### Community 44 - "Jugador"
Cohesion: 0.08
Nodes (32): Props, OpcionesAlineacion, OpcionesDraft, CartaValorada, suma(), rasgo(), Jugador, PuntuacionBase (+24 more)

### Community 45 - "Tasks: Mejoras visuales y de diseño (GUI + UX)"
Cohesion: 0.09
Nodes (23): Dependencias concretas entre tareas, Dependencies & Execution Order, Entrega incremental, Formato: `[ID] [P?] [Story] Descripción`, Implementation for User Story 3, Implementation Strategy, MVP First (User Story 1), Notas (+15 more)

### Community 46 - "ref_node_fs"
Cohesion: 0.11
Nodes (23): core, css, fondos, CARPETAS_IGNORADAS, EXCEPCIONES, ficheros(), RAICES, RAIZ (+15 more)

### Community 47 - "necesitaContorno"
Cohesion: 0.18
Nodes (13): contraste(), luminancia(), necesitaContorno(), Complexity Tracking, Constitution Check, Documentation (this feature), Implementation Plan: Mejoras visuales y de diseño (GUI + UX), Project Structure (+5 more)

### Community 48 - "checks/rasgos.ts"
Cohesion: 0.14
Nodes (34): casilla, penalizacionPorPosicion(), minutoDeJuego(), Pruebas automáticas, autogoles(), autor(), comprobacion(), comprobacionesDefectos() (+26 more)

### Community 49 - "Load Test (k6)"
Cohesion: 0.13
Nodes (20): apertura, bloqueadas, cabeceras(), cookieDe(), crearUsuario(), descanso, entregaSobre, erroresWs (+12 more)

### Community 50 - "domain/src/index.ts"
Cohesion: 0.09
Nodes (27): aFormato004(), arrayPg(), baseDatos004, cartasCore004(), CLAVE_004, equipo(), RUTA_CORE_004, DEM (+19 more)

### Community 51 - "tiro.ts"
Cohesion: 0.09
Nodes (55): lanzadorEfectivo(), gol(), amarilla(), falta(), faltaDirecta(), penalti(), probabilidadTiroDirecto(), tarjetaRoja() (+47 more)

### Community 52 - "Tabla perfiles_usuario"
Cohesion: 0.25
Nodes (11): POST /api/partidos/:id/abrir (modalidad), `preparacion.inicio` (✎), Migraciones 0006 a 0008, ModoSimulacion ('rapida' | '2d'), Tabla participantes (ultima_modalidad, pantallas vistas), partidos.modalidades (por participante), Migraciones 0006_modo_simulacion, 0007_pantallas_torneo, 0008_identidad, SelectorModo (+3 more)

### Community 53 - "checks/partido.ts"
Cohesion: 0.37
Nodes (15): comprobarSC023(), Campo, col(), comprobacionesPartido(), comprobarSC004(), comprobarSC006(), comprobarSC007(), comprobarSC007Partido2D() (+7 more)

### Community 54 - "Torneo.tsx"
Cohesion: 0.06
Nodes (65): abrirPartido(), api(), ErrorApi, marcarVisto(), obtenerReproduccion(), OpcionesPeticion, revelarResultado(), siguienteJornada() (+57 more)

### Community 55 - "validar.ts"
Cohesion: 0.18
Nodes (12): ruta, AMBITO, celda(), decimal(), generarDocumentoRasgos(), NIVEL, pct(), tabla() (+4 more)

### Community 56 - "Research Fase 0 (R1-R17)"
Cohesion: 0.12
Nodes (22): avanzar(estado, modo), apps/server, apps/web, Constitution Check (Principios I-X), Implementation Plan 001, packages/ai, packages/domain, packages/engine (+14 more)

### Community 57 - "Balance Package"
Cohesion: 0.11
Nodes (18): bin, balance, dependencies, @fbd/ai, @fbd/domain, @fbd/engine, exports, @fbd/ai (+10 more)

### Community 58 - "Functional Requirements"
Cohesion: 0.07
Nodes (28): Assumptions, Clarifications, Constitución, Contexto, Defectos, Documento de referencia e integración de futuros atributos, Edge Cases, Feature Specification: Virtudes, defectos y nuevo modo de juego (+20 more)

### Community 59 - "xoshiro.ts"
Cohesion: 0.20
Nodes (9): hash128(), rotl(), semillaDesdeEstado(), clasificacion(), FilaClasificacion, ResultadoLiga, tabla(), clasificacionActual() (+1 more)

### Community 60 - "Jugador"
Cohesion: 0.14
Nodes (29): conErrores(), ContextoErrores, CRUCE_MAXIMO, DESPLAZAMIENTOS, DISTANCIA_DUDOSA, errorAlineacion(), errorColocacion(), errorFormacion() (+21 more)

### Community 61 - "series.ts"
Cohesion: 0.18
Nodes (18): EstadisticasEquipo, comprobacionesColocacion(), comprobarSC011(), comprobarSC018(), pct(), args, base, c (+10 more)

### Community 62 - "Spec 003 Realtime Protocol"
Cohesion: 0.18
Nodes (10): Cliente → servidor, `estado` (✎), Garantías de orden (añadidas), `partido.decision_aplicada` (sin cambios de forma), `partido.decisiones` (✚), `partido.reproduccion` (sin cambios), Protocolo en tiempo real — cambios de la spec 003, Servidor → cliente (+2 more)

### Community 63 - "equipaciones.ts"
Cohesion: 0.12
Nodes (30): equipacionesDe(), equipacionesDelPartido(), CodigoErrorEquipaciones, colorDeContraste(), DisenoCamiseta, DISENOS_CAMISETA, distanciaColor(), equipacionDesdeV1() (+22 more)

### Community 64 - "TS Base Config"
Cohesion: 0.12
Nodes (16): compilerOptions, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+8 more)

### Community 65 - "Speckit Skills"
Cohesion: 0.24
Nodes (11): speckit-analyze skill, speckit-checklist skill, speckit-clarify skill, speckit-constitution skill, speckit-converge skill, speckit-implement skill, speckit-plan skill, speckit-specify skill (+3 more)

### Community 66 - "e2e/ayudas.ts"
Cohesion: 0.12
Nodes (10): abrirFormacion(), arrastrarSobre(), jugarHastaCaer(), partidaTrasDraft(), sabotear(), sustituirEnGestion(), vistaTorneo, Carta (+2 more)

### Community 67 - "User Scenarios & Testing *(mandatory)*"
Cohesion: 0.05
Nodes (38): Apertura de los sobres (US8), Assumptions, Botones principales (US4), Clarifications, Dificultad de los NPC (US9), Diseño de las cartas (US7), Edge Cases, Feature Specification: Mejoras de interfaz, simulación y experiencia de juego (+30 more)

### Community 68 - "Lienzo2D.tsx"
Cohesion: 0.12
Nodes (29): Posiciones, accionEn(), ETIQUETA_ACCION, LanzamientoVista, Lienzo2D(), ordenDe(), TICKS_LANZAMIENTO, ANCHO (+21 more)

### Community 69 - "Protocolo en tiempo real (WebSocket)"
Cohesion: 0.09
Nodes (21): Resultados de carga SC-017, Validación del MVP (T144), Rutas /api/partidas/:id/alineacion, POST /api/auth/invitado, Contrato HTTP/JSON, Cabecera Idempotency-Key, GET /api/partidas/:id/plantillas, POST /api/partidas (+13 more)

### Community 70 - "parametros/index.ts"
Cohesion: 0.04
Nodes (49): CLAVES_STATS, POSICIONES, POSICIONES_POR_DEMARCACION, CASILLA_CENTRAL, defensaCinco, defensaCuatro, defensaTres, FORMACIONES (+41 more)

### Community 71 - "Spec 003 Research"
Cohesion: 0.08
Nodes (24): ConfigPartida, 2. Partida (`ConfigPartida`, tabla `partidas`), R10. Peso medible de los specials (FR-022, SC-007), R12. Dificultad de los NPC por calidad de decisión (FR-036 a FR-038, SC-010, SC-010a, SC-010b), R13. Participante de referencia y comprobación de SC-010, R15. Vista ampliada de la carta (FR-004, FR-005, SC-015), R18. Pantalla de resultado al finalizar (FR-024 a FR-026, SC-017), R19. Modo de simulación por partido (FR-032 a FR-035, SC-018) (+16 more)

### Community 72 - "juego.ts"
Cohesion: 0.12
Nodes (54): abrir(), BALON_DE, balonCon(), cerrar(), conducir(), controlar(), hasta(), posicion() (+46 more)

### Community 73 - "torneo/torneo.ts"
Cohesion: 0.08
Nodes (31): Modo, aplicarConsecuencias(), autor(), Baja, EstadoBajas, estadoBajasVacio(), EventoConsecuencia, MotivoBaja (+23 more)

### Community 74 - "Fixtures Package"
Cohesion: 0.12
Nodes (15): dependencies, @fbd/domain, @fbd/engine, exports, @fbd/domain, @fbd/engine, name, private (+7 more)

### Community 75 - "Pasarela"
Cohesion: 0.19
Nodes (3): Manejador, OpcionesPasarela, Pasarela

### Community 76 - "Protocol Package"
Cohesion: 0.14
Nodes (13): dependencies, @fbd/domain, zod, exports, ./schemas/*, @fbd/domain, zod, name (+5 more)

### Community 77 - "Pruebas con personas (2026-10-19)"
Cohesion: 0.14
Nodes (14): Aclaraciones sobre la dificultad (H13, H14), Batería e2e tras los cambios (2026-10-20), Cambios de requisito H5, H6, H7 y H9, Correcciones de los defectos H1, H2 y H10, Criterios de éxito con personas, Decisiones sobre H11 y H14 (2026-10-20), H11 cerrado: llegada orgánica y regate hacia dentro, H11: llegada al área de extremos y mediapunta (+6 more)

### Community 78 - "005-virtudes-defectos/tasks.md"
Cohesion: 0.12
Nodes (14): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Virtudes, defectos y nuevo modo de juego, Correcciones de las e2e, Pendiente o con observaciones, Pruebas automáticas (+6 more)

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
Cohesion: 0.10
Nodes (19): comprobarDiseno(), rellenosLima(), R10. Animación y movimiento reducido (FR-017, FR-028, FR-033), R11. Equipaciones oscuras sobre el lienzo (FR-034, Edge Cases), R12. Estados de carga, vacío y error (FR-024 a FR-027), R13. Verificación automática (FR-040; Clarifications), R14. Validación con personas (SC-003, SC-004, SC-010), R15. Textos de la interfaz (FR-035, FR-036) (+11 more)

### Community 83 - "Calibración del motor 3.0.0 (T033)"
Cohesion: 0.08
Nodes (22): Calibración del motor 3.0.0 (T033), Configuración final: la de la ronda 7, Línea base (motor 2.0.0, `c8a1627`), Pendiente, Ronda 10 (`--serie todas`, n = 500): ronda 7 más el peso del centro 3,9 / 2,8, Ronda 11 (tras H8, H11 y H13; `--serie todas`, n = 500), Ronda 12 y 13: llegada orgánica y regate hacia dentro (H11, decisión del 2026-10-20), Ronda 5 (`pnpm balance --n 500 --serie todas`, 1.648,7 s) (+14 more)

### Community 84 - "Engine Package"
Cohesion: 0.17
Nodes (11): dependencies, @fbd/domain, exports, @fbd/domain, name, private, scripts, bench (+3 more)

### Community 85 - "Home — Style Reference"
Cohesion: 0.05
Nodes (37): Agent Prompt Guide, Border Radius, Components, Cookie Settings Modal, CSS Custom Properties, Dark Card, Do, Do's and Don'ts (+29 more)

### Community 86 - "decisiones.ts"
Cohesion: 0.15
Nodes (26): ResultadoLote, esFormacionId(), cubrirPorteria(), expulsar(), mejorSuplente(), MINIMO_JUGADORES, quitarDelCampo(), retirarLesionado() (+18 more)

### Community 87 - "partidoEntreHumanos.ts"
Cohesion: 0.12
Nodes (20): cacheReproducciones, rehacer(), reproduccion(), resolverPartidoEntreHumanos(), terminarPartidoEntreHumanosEnJuego(), Tramos, reconstruirMotor(), resumenAlineaciones() (+12 more)

### Community 88 - "Web Package"
Cohesion: 0.11
Nodes (17): devDependencies, @axe-core/playwright, @playwright/test, @types/react, @types/react-dom, vite, @vitejs/plugin-react, @fbd/domain (+9 more)

### Community 89 - "Spec 003 HTTP Changes"
Cohesion: 0.18
Nodes (11): Contrato HTTP/JSON — cambios de la spec 003, `GET /api/partidas/:id/alineacion` (✎), `GET /api/partidos/:id` (✎), `GET /api/partidos/:id/reproduccion?modalidad=rapida|2d` (✎), `GET /api/perfil`, Partidos, Perfil de usuario (✚), Plantilla, alineación y equipaciones (+3 more)

### Community 90 - "Contrato de interfaz — spec 003"
Cohesion: 0.08
Nodes (22): Fútboosterdraft Constitution, CLAUDE.md (instrucciones del proyecto), Cómo se lee el impacto, Defectos (15), Incompatibilidades, Qué son, Reglas de acumulación, Todo rasgo tiene un efecto probado (+14 more)

### Community 91 - "Tasks: Virtudes, defectos y nuevo modo de juego"
Cohesion: 0.07
Nodes (29): impacto(), R13. Pruebas y comprobaciones de equilibrado (SC-004, SC-005, SC-007, SC-010, SC-011), Dependencies & Execution Order, Format: `[ID] [P?] [Story] Description`, Implementation for User Story 6, Implementation Strategy, Incremental Delivery, MVP First (User Story 1) (+21 more)

### Community 92 - "CartaJugador.tsx"
Cohesion: 0.05
Nodes (60): AperturaSobre(), calendarioApertura(), COLOR_PARTICULAS, DURACION_MAXIMA_MS, DURACION_SOBRE_MS, ESCALONADO_MS, especial(), EstadoCarta (+52 more)

### Community 94 - "validar.test.ts"
Cohesion: 0.16
Nodes (16): virtudesPermitidas(), avisosColeccion(), CAMPOS, COLECCIONES_VALIDAS, ErrorCatalogo, esFechaIsoValida(), incluye(), proporcionDefectosPorNivel() (+8 more)

### Community 95 - "cuadro.ts"
Cohesion: 0.22
Nodes (11): avanzarCuadro(), Cruce, cuadroMixto(), cuadroPlayoff(), rondaActual(), rondasVacias(), TipoRonda, TIPOS (+3 more)

### Community 96 - "Domain Package"
Cohesion: 0.22
Nodes (8): exports, name, private, scripts, rasgos:doc, typecheck, type, version

### Community 97 - "Lienzo2D.tsx"
Cohesion: 0.08
Nodes (15): agregarFotogramas(), CLAVE_VELOCIDAD, EstadoReloj, guardarVelocidad(), INTERVALO_INFORME_MS, MotivoPausa, OpcionesReloj, RelojReproduccion (+7 more)

### Community 98 - "comprobar-tokens.mjs"
Cohesion: 0.25
Nodes (6): CARPETAS_EXCEPTUADAS, EXCEPCIONES, fallos, raiz, recorrer(), REGLAS

### Community 99 - "react"
Cohesion: 0.09
Nodes (24): marcarPantallaVista(), Estadio(), Trofeo(), EstadoSesion, EscenaPortada(), FormularioCuenta(), Inicio(), Modo (+16 more)

### Community 100 - "equiposEquivalencia005.ts"
Cohesion: 0.18
Nodes (16): referencia, cartasCore(), DEM, entradaEquivalencia005(), equipoCore(), equipoSintetico(), EventoResumido, FORMACIONES_SINTETICAS (+8 more)

### Community 101 - "NombreRecortado"
Cohesion: 0.10
Nodes (30): Balon(), CUERDAS, POSTES, RingDuelo(), DURACION_FASE, duracionDuelo(), FaseDuelo, FASES (+22 more)

### Community 102 - "particulas.ts"
Cohesion: 0.17
Nodes (7): FPS_MINIMO, iniciarParticulas(), OpcionesParticulas, Particula, PRESUPUESTO_MS, SistemaParticulas, VENTANA_FPS_MS

### Community 103 - "Web TS Config"
Cohesion: 0.29
Nodes (6): compilerOptions, jsx, lib, extends, include, ../../tsconfig.base.json

### Community 104 - "equivalenciaFinalizar.test.ts"
Cohesion: 0.28
Nodes (11): decidirNPCEnPausa(), NivelesPartido, resolverResto(), comprobar(), conProrroga(), jugarHasta(), NIVELES, parada() (+3 more)

### Community 105 - "Functional Requirements"
Cohesion: 0.06
Nodes (31): Accesibilidad y adaptación (US4), Assumptions, Clarifications, Componentes comunes (US1, US2), Edge Cases, Estados y retroalimentación (US2), Feature Specification: Mejoras visuales y de diseño (GUI + UX), Functional Requirements (+23 more)

### Community 106 - "disciplina.ts"
Cohesion: 0.46
Nodes (7): comprobacion(), comprobarSC011Core(), comprobarSC011Sintetica(), frecuencias(), gruposDisciplina(), Magnitud, OBJETIVOS_DISCIPLINA

### Community 107 - "Defecto"
Cohesion: 0.20
Nodes (10): 2.1 Versión de catálogo, 2. Jugador (carta), 3. Persistencia (migración `0010_virtudes_defectos`), 5. Parámetros de equilibrado 4.0.0, 6.1 `ConfigDuelos`, 6.2 Ciclo de vida de la partida (modo `duelos`), 6.3 Cruce de duelos (`partidos` con `tipo = 'duelos'`), 6.4 Alineación bloqueada (+2 more)

### Community 108 - "Contrato — HTTP"
Cohesion: 0.14
Nodes (14): Alineación (modo `duelos`), Catálogo, Contrato — HTTP, `GET /api/partidas/:id`, `GET /api/partidas/:id/alineacion`, `GET /api/partidos/:id`, `GET /api/partidos/:id/reproduccion`, Partidas (+6 more)

### Community 110 - "Data Model — Mejoras de interfaz, simulación y experiencia de juego"
Cohesion: 0.13
Nodes (15): 10. Resumen de relaciones (añadidos), 1. Parámetros de equilibrado 3.0.0 (`ParametrosEquilibrado`), 4. Equipación (`Equipacion` v2), 5. Perfil de usuario (✚ tabla `perfiles_usuario`), 7.1 Partido (tabla `partidos`), 7.2 Estadísticas de equipo (`EstadisticasEquipo`) — añadidos, 7.4 Métricas por jugador (`MetricasJugador`) — ✚, no se guardan, 7.5 Lote de decisiones (`partido.decisiones`) — mensaje, no entidad (+7 more)

### Community 111 - "Spec 002 Engine Ops"
Cohesion: 0.40
Nodes (6): penalizacionPorPosicion(j, destino, p), previsualizar(alineacion) -> Previsualizacion, statsEfectivos(j, destino, p, ctx), zonaEn(x, y), POST /api/partidas/:id/alineacion/previsualizar, Colocación libre (FR-034)

### Community 112 - "impacto.ts"
Cohesion: 0.19
Nodes (17): Virtud, proponerLanzadores(), CASILLA, comprobacionesImpacto(), comprobacionTipo(), conRasgo(), EN_BANQUILLO, gruposImpacto() (+9 more)

### Community 113 - "Server TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, extends, include, ../../tsconfig.base.json

### Community 114 - "comprobaciones.ts"
Cohesion: 0.16
Nodes (7): ANCHOS, LIMA, OpcionesDiseno, ANCHOS, focoVisible(), tabHasta(), @axe-core/playwright

### Community 115 - "http/app.ts"
Cohesion: 0.06
Nodes (50): exports, @fbd/ai, @fbd/domain, @fbd/engine, @fbd/protocol, zod, name, private (+42 more)

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

### Community 124 - "Research — Fase 0: Virtudes, defectos y nuevo modo de juego"
Cohesion: 0.18
Nodes (12): validarColeccion(), R12. IA con el impacto de los rasgos (FR-043, FR-052), R14. Documentación y constitución (FR-053, FR-080), R1. Línea base de disciplina, lesiones y penaltis (US4), R3. Estrategia de renombrado `specials` → `virtudes` (US1, FR-001 a FR-004), R4. Torneos empezados antes del cambio: versión de catálogo (FR-036), R5. Reparto de defectos y virtudes nuevas en Core (FR-012, FR-035, FR-037), R7. Parámetros 4.0.0 y reproducibilidad (FR-017, FR-072, SC-003) (+4 more)

### Community 126 - "Contrato de interfaz — spec 003"
Cohesion: 0.18
Nodes (11): Apertura de sobre (`AperturaSobre`, FR-011 a FR-015; research R21), Barra principal (`BarraPrincipal`, FR-006, FR-007; research R16), Carta de jugador (`CartaJugador`, FR-008 a FR-010; research R20), Contrato de interfaz — spec 003, Derrota y campeón (`PantallaDerrota`, `PantallaCampeon`, FR-039 a FR-041b; research R22), «Formación» (`Alineacion` sobre `CampoEquipo`, FR-001 a FR-003; research R14), Gestión del equipo durante el partido (`GestionEquipo`, FR-027 a FR-031; research R17), Nombre y equipación (`Sala`, `EditorEquipacion`, `Perfil`, FR-042 a FR-047; research R23, R24) (+3 more)

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

### Community 149 - "sala.ts"
Cohesion: 0.08
Nodes (50): ESTADOS_ACTIVOS, cambiarNombreEquipo(), clavesUsadas(), identidadInicial, marcarNombreAjustado(), nombresAjustados, nombresUsados(), accionYRival() (+42 more)

### Community 153 - "004-mejoras-visuales-diseno/contracts/ui.md"
Cohesion: 0.09
Nodes (17): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Mejoras visuales y de diseño (GUI + UX), Criterios, Escenarios concretos ([quickstart.md](../quickstart.md) §4), Hallazgos (+9 more)

### Community 154 - "Posicion"
Cohesion: 0.10
Nodes (31): carta(), sobre(), Posicion, TitularPrevisualizado, calcularColocacion(), dispersion(), media(), PESO (+23 more)

### Community 155 - "Rng"
Cohesion: 0.16
Nodes (13): estadoDesdeSemilla(), Rng, Celda, ErrorPoolInsuficiente, generarMesa(), generarSobre(), porId, apellido() (+5 more)

### Community 156 - "Propuesta de enmienda PATCH 1.0.5 de la constitución (T126)"
Cohesion: 0.50
Nodes (3): Cambios propuestos, Propuesta de enmienda PATCH 1.0.5 de la constitución (T126), Sync Impact Report propuesto

### Community 157 - "eliminaciones.test.ts"
Cohesion: 0.39
Nodes (6): Eliminacion, eliminacionDe(), eliminaciones(), ETIQUETA_FASE, FaseEliminacion, humanosEnCompeticion()

### Community 158 - "servidor.ts"
Cohesion: 0.03
Nodes (73): Difusor, ServiciosPartida, NuevoAviso, DependenciasApp, filaAJugador(), registrarRutasCatalogo(), versionPedida(), OpcionesLimitador (+65 more)

### Community 159 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, drizzle-kit, pino-pretty, testcontainers, @testcontainers/postgresql, tsup, @types/nodemailer, @types/pg (+1 more)

### Community 160 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, e2e, lint:tokens, preview, typecheck

### Community 161 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, db:generate, db:migrate, dev, seed, start, test:integration (+1 more)

### Community 162 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, @fbd/domain, @fbd/protocol, react, react-dom, react-router, zustand

### Community 163 - "Recorridos manuales"
Cohesion: 0.20
Nodes (10): A. Virtudes en lugar de specials (US1), B. Defectos en las cartas (US2, FR-020 a FR-024), C. Torneo antiguo (FR-036), D. Duelo de jugadores (US3), E. Frecuencias en partidos reales (US4), F. Efectos colectivos visibles (FR-044), G. Documento de referencia (US6), Preparación (+2 more)

### Community 164 - "MediaEquipo.tsx"
Cohesion: 0.53
Nodes (5): Estrella(), MediaEquipo, rellenoEstrellas(), ResultadoColocacion, Phase 13: Ronda 6 — último ajuste y media del once (FR-052, FR-060)

### Community 165 - "asignarRasgos.ts"
Cohesion: 0.19
Nodes (15): DefinicionRasgo, Defecto, 1.1 `Virtud` (antes `Special`), 1.2 `Defecto` (nuevo), 1.3 `DefinicionRasgo` (nuevo, `catalogo/rasgos.ts`), 1.4 `REPARTO_DEFECTOS` (nuevo), 1. Rasgos (dominio), asignarRasgos() (+7 more)

### Community 167 - "R24 Equipaciones v2 (diseno + hasta 3 colores)"
Cohesion: 0.33
Nodes (6): EditorEquipacion y Camiseta SVG, Regla de parecido de equipaciones (umbral 0,45), patronDiseno(diseno, colores), R23 Nombre del equipo y perfil de la cuenta, R24 Equipaciones v2 (diseno + hasta 3 colores), US11 Nombre y equipacion a mi gusto (P3)

### Community 171 - "protocol/src/http/alineacion.ts"
Cohesion: 0.20
Nodes (9): AlineacionDuelos, AlineacionEntrada, Color, DorsalesEntrada, EquipacionesEntrada, EquipacionV1, EquipacionV2, TacticaEntrada (+1 more)

### Community 172 - "Frontend Design"
Cohesion: 0.29
Nodes (6): Design principles, Frontend Design, Ground your designs in the subject matter, More on writing in design, Process: plan, review against the brief, build, critique, Restraint and self-critique

### Community 173 - "Implementation Plan: Virtudes, defectos y nuevo modo de juego"
Cohesion: 0.22
Nodes (9): Complexity Tracking, Constitution Check, Documentation (this feature), Implementation Plan: Virtudes, defectos y nuevo modo de juego, Orden de entrega, Project Structure, Source Code (repository root), Summary (+1 more)

### Community 174 - "Frontend Design"
Cohesion: 0.29
Nodes (6): Design principles, Frontend Design, Ground your designs in the subject matter, More on writing in design, Process: plan, review against the brief, build, critique, Restraint and self-critique

### Community 176 - "`PUT /api/partidas/:id/nombre-equipo` (✚)"
Cohesion: 0.22
Nodes (10): GET/PUT /api/perfil, `PUT /api/partidas/:id/nombre-equipo` (✚), PUT /api/partidas/:id/equipaciones (v2), `partido.inicio` (✎), Sala, EditorEquipacion y Perfil (nombre y equipacion), desdeV1 (conversion equipaciones v1 a v2), Equipacion v2 (diseno, colores), equipacionEnPartido (resolucion de choque de colores) (+2 more)

### Community 177 - "Implementation Plan: Mejoras de interfaz, simulación y experiencia de juego"
Cohesion: 0.16
Nodes (15): Complexity Tracking, Constitution Check, Documentation (this feature), Implementation Plan: Mejoras de interfaz, simulación y experiencia de juego, Implementation Plan 003: Mejoras UX y simulacion, Project Structure, Riesgos y mitigaciones, Source Code (repository root) (+7 more)

### Community 179 - "Cambios propuestos"
Cohesion: 0.25
Nodes (8): 1. Vocabulario: «habilidades especiales» → «virtudes y defectos», 2. Principio V: alcance del motor único, 3. Decisiones resueltas, 4. Informe de impacto de la cabecera, Cambios propuestos, Propuesta de modificación de la constitución: 1.1.0 → 1.2.0, Razón, Tipo de cambio

### Community 182 - "Partidas"
Cohesion: 0.38
Nodes (7): `GET /api/partidas/:id/torneo` (✎), Partidas, `POST /api/partidas` (✎), `POST /api/partidas/:id/pantalla-vista` (✚), `POST /api/partidas/:id/simular-resto` (✚), Eliminacion (eliminaciones, humanosEnCompeticion), PantallaDerrota y PantallaCampeon

### Community 184 - "Contrato — Tabla de rasgos (`packages/domain/src/catalogo/rasgos.ts`)"
Cohesion: 0.25
Nodes (8): Ajuste tras la medición (T099, 2026-10-22), Contrato — Tabla de rasgos (`packages/domain/src/catalogo/rasgos.ts`), Defectos, Forma, Impactos iniciales, Incompatibilidades (simétricas), Textos de las virtudes nuevas y de los defectos, Virtudes

### Community 188 - "Contrato del motor (engine-api)"
Cohesion: 0.29
Nodes (7): aplicarDecision(), crearPartido(), Contrato del motor (engine-api), EntradaPartido, ResultadoTramo, Mensaje partido.tramo, Contrato del motor de simulación (spec 002)

### Community 194 - "rasgosProbados.test.ts"
Cohesion: 0.33
Nodes (5): VIRTUDES_NUEVAS_005, RasgoProbado, RASGOS_PROBADOS, NUEVOS, RAIZ

## Ambiguous Edges - Review These
- `equipacionEnPartido (resolucion de choque de colores)` → `Guardarrail esErrorAdmisible`  [AMBIGUOUS]
  specs/003-mejoras-ux-simulacion/data-model.md · relation: semantically_similar_to

## Knowledge Gaps
- **129 isolated node(s):** `@fbd/ai`, `@fbd/domain`, `@fbd/engine`, `@fbd/protocol`, `zod` (+124 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1405 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `Server Bootstrap & DB`, `partido003.ts`, `catalogo/rasgos.ts`, `src/alineacion.ts`, `parametrosActuales`, `ControladorPartida`, `ReproduccionPartido.tsx`, `FormacionId`, `animaciones.ts`, `package.json`, `sala.ts`, `engine/tests/ayudas.ts`, `actores/draft.ts`, `receptor.ts`, `niveles.test.ts`, `Posicion`, `Rng`, `npc.ts`, `eliminaciones.test.ts`, `servidor.ts`, `partida/partida.ts`, `Alineacion.tsx`, `basico.ts`, `ws/partido.ts`, `Jugador`, `ref_node_fs`, `necesitaContorno`, `domain/src/index.ts`, `Torneo.tsx`, `xoshiro.ts`, `Jugador`, `equipaciones.ts`, `rasgosProbados.test.ts`, `parametros/index.ts`, `torneo/torneo.ts`, `interpolacion.ts`, `partidoEntreHumanos.ts`, `CartaJugador.tsx`, `validar.test.ts`, `cuadro.ts`, `Lienzo2D.tsx`, `equiposEquivalencia005.ts`, `NombreRecortado`, `particulas.ts`, `equivalenciaFinalizar.test.ts`, `http/app.ts`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `crearPartido()` (e.g. with `Entrada` and `Tests (escribir primero; deben fallar)`) actually correct?**
  _`crearPartido()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@fbd/ai`, `@fbd/domain`, `@fbd/engine` to the rest of the system?**
  _129 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Server Bootstrap & DB` be split into smaller, more focused modules?**
  _Cohesion score 0.06170212765957447 - nodes in this community are weakly interconnected._
- **Why does `Research — Fase 0: Mejoras de interfaz, simulación y experiencia de juego` connect `Spec 003 Research` to `torneo/torneo.ts`, `Marco.tsx`, `tiro.ts`, `receptor.ts`, `decisiones.ts`, `partidoEntreHumanos.ts`, `Posicion`, `003-mejoras-ux-simulacion/contracts/engine-api.md`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `parametrosActuales()` (e.g. with `Implementation` and `R7. Parámetros 4.0.0 y reproducibilidad (FR-017, FR-072, SC-003)`) actually correct?**
  _`parametrosActuales()` has 3 INFERRED edges - model-reasoned connections that need verification._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `equipacionEnPartido (resolucion de choque de colores)` and `Guardarrail esErrorAdmisible`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._