# Refactorización de la spec 014 (US7)

Registro de lo eliminado y lo unificado en la US7 (Q7 de [contracts/calidad.md](contracts/calidad.md)). Nada de esto cambia el comportamiento: la huella de 100 partidos (`packages/engine/tests/equivalencia014.test.ts`) es la misma antes y después de tocar el motor.

## Herramientas

| Herramienta | Configuración | Orden | Resultado final |
|---|---|---|---|
| knip | `knip.jsonc` (excepciones comentadas: `pino-pretty`, transporte de pino que se carga por nombre; `only-allow`, del `preinstall`; `tools/load` y `tools/sonidos`, scripts sueltos) | `pnpm dlx knip@5` | 0 hallazgos |
| jscpd | `.jscpd.json` (TS/TSX, 8 líneas o 70 tokens; sin tests, fixtures ni JSON) | `pnpm dlx jscpd@4 --config .jscpd.json <rutas>` | 0 clones (había 6) |
| Comentarios | `scripts/comentarios.ts` (API de TypeScript) | `pnpm tsx scripts/comentarios.ts` | 0 exportaciones sin comentario |

## Duplicidades unificadas

| Paquete | Antes | Después | Ficheros |
|---|---|---|---|
| `apps/web` | La franja de los dos equipos (chapa, nombre y goles) repetida en el partido 2D y en la reproducción | `EquiposFranja` en `Marcador.tsx` | `componentes/Marcador.tsx`, `pantallas/Partido2D.tsx`, `pantallas/ReproduccionPartido.tsx` |
| `apps/web` | El envío del lote de decisiones del partido (conexión, ack y «en espera») repetido en el partido 2D y el rápido | `enviarLoteDecisiones` en `GestionEquipo.tsx` | `componentes/GestionEquipo.tsx`, `pantallas/Partido2D.tsx`, `pantallas/PartidoRapido.tsx` |
| `tools/balance` | `draftNPC` repetía el draft de la mesa de NPC | usa `electorNPC` y `draftMesa` | `checks/npc.ts` |
| `tools/balance` | `crearPartido({ eliminatoria: false, … })` de liga repetido | `crearPartidoLiga` | `checks/npc.ts`, `checks/core.ts` |
| `tools/balance` | Preparación de la mesa de referencia (NPC, equipos e índice por id) en el torneo de referencia y la sonda de goles | `mesaReferencia` | `checks/npc.ts`, `sondaGolesNPC.ts` |
| `packages/engine` | La elección del mejor y del segundo defensor por distancia efectiva (con el desempate por id y «Mal defensor») repetida en `rivalCercano` y `interceptorDePase` | `mejorDefensor(ctx, defensor, efectivaDe)` | `acciones/contexto.ts`, `acciones/receptor.ts` |
| `packages/engine` | `RIVAL_ENCIMA` y `LIBRE` definidas dos veces | Solo en `receptor.ts`; `opciones.ts` y `manoAMano.ts` las importan | `acciones/receptor.ts`, `acciones/opciones.ts`, `acciones/manoAMano.ts` |
| `packages/engine` | `rivalDe` local de `receptor.ts`, igual que `rival` de `estado.ts` | `rival` | `acciones/receptor.ts` |
| `packages/engine` | Dos bucles «media del pase de los jugadores en el campo» (centrocampistas y, si no hay, todos los de campo) en `controlPorRitmo` | `mediaPase(cuenta)` con `??` | `acciones/juego.ts` |

Tras unificar, `candidatoDefensivo` solo se usa dentro de `contexto.ts` y deja de exportarse.

La huella de 100 partidos y 20 drafts (`huella-014.json`, generada con los parámetros 7.0.0 finales antes de estas unificaciones) es la misma después. `jscpd` termina con 0 clones.

## Eliminado

### Código muerto

- `apps/server/src/actores/identidad.ts`: `clavesUsadas` y el import `claveNombre`.
- `apps/server/src/observabilidad/logger.ts`: `loggerDePartida`.
- `apps/server/src/persistencia/repos/partidos.ts`: el tipo `Resolucion`.
- `apps/web/src/componentes/AvisoPartido.tsx`: el componente `AvisoPartido` (solo se usan sus tipos).
- `packages/engine/src/acciones/contexto.ts`: `posicionReal`.
- `packages/engine/src/estado/estado.ts`: `enCampo`, `banquillo` y `jugadorEn`.
- `tools/balance/src/checks/rasgos.ts`: la lista final de reexportaciones.
- Imports sin uso en `packages/engine/tests/defectosDisciplina.test.ts` (`PARAMETROS_V3`) y `virtudesNuevas.test.ts` (`crearPartido`, `entrada`), y once variables locales que quedaron sin uso al retirar exportaciones.

### Ficheros

- `packages/domain/tests/sobres/fixtures/capturarRegresion.ts`: script de un solo uso («No volver a ejecutar»).

### Configuración

- `apps/server/package.json` y `tools/balance/package.json`: el campo `exports` apuntaba a un `src/index.ts` que no existe; nadie importa esos paquetes.

### Exportaciones sin uso fuera de su fichero

Se quita `export` (el símbolo sigue en su fichero porque se usa dentro): 193 exportaciones en 103 ficheros.

#### `apps/server` (46)

- `src/actores/draft.ts`: `vencerTurno`, `ResultadoEleccion`
- `src/actores/equipo.ts`: `esDuelos`, `bloqueoPorBajas`, `avisosEquipo`, `errorDeAlineacion`, `AlineacionVigente`
- `src/actores/identidad.ts`: `clavesUsadas`, `IdentidadInicial`
- `src/actores/loteDecisiones.ts`: `ResultadoLote`
- `src/actores/partidoRapido.ts`: `emitirAParticipantes`, `nivelesDe`, `celebracionesDelPartido`, `modalidadDe`, `ResultadoComandoPartido`, `ResultadoLotePartido`
- `src/actores/pausa.ts`: `esUnicoHumano`
- `src/actores/preparacion.ts`: `OpcionesJornada`
- `src/actores/torneo.ts`: `AVISO_PLAZO_MS`, `iniciarTorneo`, `hayHumanosEnCompeticion`, `datosComunesTorneo`, `construirVistaTorneo`, `filasTabla`, `ResultadoSiguienteJornada`, `ResultadoSimularResto`
- `src/ajustes/servicio.ts`: `CLAVE_IDENTIDAD`, `CLAVE_ACCESO_RAREZA`
- `src/auth/auth.ts`: `OpcionesAuth`
- `src/auth/rutas.ts`: `cabecerasWeb`
- `src/avisos/servicio.ts`: `NuevoAviso`
- `src/http/app.ts`: `DependenciasApp`
- `src/http/textosRasgos.ts`: `TextoRasgo`
- `src/observabilidad/desglose.ts`: `Fase`
- `src/observabilidad/logger.ts`: `loggerDePartida`
- `src/persistencia/db.ts`: `POOL_POR_DEFECTO`
- `src/persistencia/repos/cosmeticos.ts`: `Solicitante`
- `src/persistencia/repos/partidos.ts`: `ResumenPartido`, `Resolucion`
- `src/persistencia/repos/perfiles.ts`: `AspectoGuardado`
- `src/persistencia/repos/torneo.ts`: `FilaJornada`
- `src/persistencia/repos/visionados.ts`: `EstadoVisionado`
- `src/servidor.ts`: `ConfigServidor`
- `src/ws/pasarela.ts`: `ResultadoComando`, `Manejador`
- `tests/helpers/baseDatos004.ts`: `cartasCore004`

#### `apps/web` (74)

- `src/api/cache.ts`: `useDato`
- `src/api/cliente.ts`: `OpcionesPeticion`
- `src/campo2d/Lienzo2D.tsx`: `accionEn`, `ordenDe`
- `src/campo2d/relojReproduccion.ts`: `INTERVALO_INFORME_MS`, `MotivoPausa`, `OpcionesReloj`
- `src/campo2d/renderizador.ts`: `chapaConRetrato`, `Escena`, `ColoresInterfaz`
- `src/componentes/AperturaSobre.tsx`: `SALIDA_MS`, `GIRO_MS`, `PAUSA_ESPECIAL_MS`, `FUNDIDO_MS`, `PasoCarta`
- `src/componentes/AvisoAcceso.tsx`: `textoAvisoAcceso`
- `src/componentes/AvisoDorsales.tsx`: `textoDorsalesNuevos`
- `src/componentes/AvisoPartido.tsx`: `AvisoPartido`, `EstadoPreparacion`
- `src/componentes/BandejaAvisos.tsx`: `AvisosDelEquipo`
- `src/componentes/BarraPrincipal.tsx`: `AYUDA_ACCION`
- `src/componentes/BotonAvanzar.tsx`: `ETIQUETA_AVANCE`, `SituacionAvance`
- `src/componentes/ConfigDuelos.tsx`: `MiniaturaFormacion`
- `src/componentes/Esqueleto.tsx`: `FormaEsqueleto`
- `src/componentes/GestionEquipo.tsx`: `decisionesDeCambios`
- `src/componentes/IndicadorEnergia.tsx`: `TramoEnergia`
- `src/componentes/IndicadorNavegacion.tsx`: `RETARDO_INDICADOR_MS`
- `src/componentes/Marcador.tsx`: `ListaGoleadores`, `MarcadorGoles`
- `src/componentes/MediaEquipo.tsx`: `rellenoEstrellas`
- `src/componentes/NombreRecortado.tsx`: `PunteroBasico`, `DetectorPulsacion`
- `src/componentes/ResultadoPartido.tsx`: `MarcadorFinal`
- `src/componentes/SelectorTramos.tsx`: `Tramo`
- `src/componentes/VistaCarta.tsx`: `RETARDO_RATON_MS`, `PULSACION_LARGA_MS`, `Rect`
- `src/componentes/campoEquipoEstado.ts`: `acotar`, `puntoLibre`
- `src/componentes/celebraciones/CapaCelebracion.tsx`: `PropsCapaCelebracion`
- `src/componentes/celebraciones/efectos.tsx`: `ClaseParticula`
- `src/componentes/chapa.ts`: `LadoChapa`
- `src/componentes/colores.ts`: `ColoresChapa`
- `src/componentes/estadoEquipoEnPartido.ts`: `MAX_SUSTITUCIONES`, `DecisionEnviada`
- `src/componentes/particulas.ts`: `PRESUPUESTO_MS`, `FPS_MINIMO`, `VENTANA_FPS_MS`, `OpcionesParticulas`
- `src/componentes/useDistribucion.ts`: `CLAVE_DISTRIBUCION`
- `src/conexion/useConexion.ts`: `EstadoServidor`
- `src/conexion/ws.ts`: `Ack`
- `src/estado/aspecto.ts`: `sobreSiguiente`
- `src/estado/avisos.ts`: `DURACION_EXITO_MS`, `AccionAviso`, `AvisoEmergente`, `OpcionesAviso`
- `src/estado/catalogo.ts`: `TextoRasgo`
- `src/estado/partidaActiva.ts`: `ParticipanteActivo`
- `src/estado/sesion.ts`: `Usuario`
- `src/pantallas/Alineacion.tsx`: `CasillaVista`
- `src/pantallas/Coleccion.tsx`: `textoMinimo`
- `src/pantallas/PartidoRapido.tsx`: `nombresDePartido`
- `src/pantallas/ReproduccionPartido.tsx`: `AVISO_VERSION_ANTERIOR`
- `src/pantallas/Tienda.tsx`: `SeccionTienda`
- `src/sonido/ambiente.ts`: `Ambiente`
- `src/sonido/sonido.ts`: `GANANCIA`, `CLAVE_SONIDO`, `cambiarSonido`
- `src/textos/selecciones.ts`: `ESCUDOS_ACTIVOS`
- `tests/e2e/diseno/comprobaciones.ts`: `ANCHOS`, `rellenosLima`, `OpcionesDiseno`

#### `packages/engine` (34)

- `src/acciones/animaciones.ts`: `velocidadDeVuelo`
- `src/acciones/balonParado.ts`: `tarjetaRoja`, `faltaDirecta`
- `src/acciones/contexto.ts`: `posicionReal`
- `src/acciones/duelo.ts`: `sigmoide`, `Duelo`
- `src/acciones/opciones.ts`: `pesoTiroDesde`, `lineaDeTiroDespejada`
- `src/acciones/plantel.ts`: `sustitucionesDisponibles`
- `src/acciones/receptor.ts`: `OpcionesReceptor`
- `src/acciones/tiro.ts`: `golEnPropia`, `saqueDeCentro`, `TipoTiro`, `ResultadoTiro`, `OpcionesTiro`
- `src/espacio/geometria.ts`: `celda`, `puntoDeCasilla`, `Linea`
- `src/espacio/objetivos.ts`: `TICKS_VUELTA`, `PapelLlegada`
- `src/estado/estado.ts`: `MAX_SUSTITUCIONES`, `enCampo`, `banquillo`, `jugadorEn`
- `src/metricas.ts`: `metricasVacias`
- `src/modificadores/cansancio.ts`: `minutoInicioCansancio`
- `src/modificadores/defectos.ts`: `polemicoActivo`, `rebeldeActivo`
- `src/modificadores/formacionTactica.ts`: `amplitud`
- `src/modificadores/virtudes.ts`: `vaPerdiendo`
- `src/penaltis/tanda.ts`: `ordenTanda`
- `src/tramos/avanzar.ts`: `OpcionesAvance`
- `tests/ayudas.ts`: `jugador`
- `tests/rasgosProbados.ts`: `RasgoProbado`

#### `tools/balance` (39)

- `src/checks/colecciones.ts`: `comprobarSC003`, `comprobarSC005`
- `src/checks/colocacion.ts`: `comprobarSC011`, `comprobarSC018`
- `src/checks/disciplina.ts`: `OBJETIVOS_DISCIPLINA`, `frecuencias`, `comprobarSC011Sintetica`, `comprobarSC011Core`
- `src/checks/duelos.ts`: `comprobarSC010Duelos`
- `src/checks/impacto.ts`: `spearman`, `medirEfectos`, `comprobacionesImpacto`, `EfectoRasgo`
- `src/checks/motor014.ts`: `comprobacionesJugada014`, `comprobacionesCansancio014`
- `src/checks/partido.ts`: `comprobarSC004`, `comprobarSC006`, `comprobarSC007`, `comprobarSC015`, `comprobarSC007Partido2D`, `comprobarSC008Pase`
- `src/checks/partido003.ts`: `LINEA_BASE_CONDUCCIONES`, `GOLES_POR_RASGO_NETO`, `conTitular`, `comprobarSC023`
- `src/checks/pesoStats.ts`: `conEstadistica`, `comprobacionesPesoStats`
- `src/checks/rareza.ts`: `comprobarRareza`
- `src/checks/rasgos.ts`: `IDS_RASGOS_DEFECTOS`, `IDS_RASGOS_VIRTUDES`, `comprobacionesDefectos`, `conRasgos`, `equiposRasgos`, `serieContada`, `P_DISCIPLINA`, `P_LESIONES`, `comprobacion`, `total`, `idsDe`

