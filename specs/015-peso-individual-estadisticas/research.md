# Research: Peso individual de las estadísticas (spec 015)

Fase 0 del plan. Cada decisión cita los requisitos que cubre. Los valores numéricos son **de partida**: se fijan con
el informe de equilibrado de la tanda correspondiente, siempre dentro de los rangos que da la spec.

Notación: x = base + 0,04 × m × (atacante − defensor) + desplazamientos; p = 0,5 + x / (2 × (1 + |x|)) (fórmula de
[`duelo.ts`](../../packages/engine/src/acciones/duelo.ts)). En esta spec, «sensibilidad» es lo que mide la spec: cuánto
cambia **p** por cada punto de diferencia. Se ajusta con la base y con m a la vez.

## R1. Versión 8.0.0 sin retirar la 7.0.0 (FR-022, FR-017)

**Decision**: `PARAMETROS_V8` hereda de `PARAMETROS_V7` y añade seis bloques **opcionales** del tipo
`ParametrosEquilibrado`: `duelos`, `quite`, `aereo`, `desmarque`, `controlPresion` y `liderazgo` (forma en
[contracts/motor.md](contracts/motor.md)). El motor solo cambia de comportamiento si el bloque está presente. Sin él,
cada punto de código hace lo de la 7.0.0. Es el patrón que ya usan `conRasgos005(estado)` y `p.manoAMano!`.
`parametrosActuales()` devuelve la 8.0.0 y `VERSION_MAYOR_SOPORTADA` sigue en 7.

**Rationale**:

- FR-022 y el caso límite «Partidos guardados con versiones anteriores del motor» exigen que los partidos 7.0.0 se
  sigan reproduciendo igual. La decisión R14 de la 014 (subir la versión mayor mínima y enseñar solo el resumen) lo
  incumpliría.
- Todos los cambios caben en parámetros: bases y pendientes, multiplicadores del quite y efectos de los duelos
  nuevos. Una sola comprobación de presencia por bloque basta.
- Gratis, `huella-014.json` (7.0.0) se convierte en la prueba de que nada cambió por accidente: debe seguir idéntica
  en cada tanda.
- Los partidos se preparan con `parametrosActuales()` en `preparacion.ts`, así que los torneos en marcha pasan solos a
  la 8.0.0 en su siguiente partido. Un partido a medias durante el despliegue sigue con la 7.0.0, que se puede
  simular.

**Alternatives considered**:

- Versión mayor 8 como mínima y la 7.0.0 solo en resumen (la R14 de la 014): incumple FR-022.
- Ramas `if (version >= 8)`: atan el código a números de versión. Comprobar la presencia del bloque es lo mismo, sin
  comparar versiones, y deja que una 8.x quite o ajuste un bloque.

## R2. Base y pendiente por acción (FR-002, FR-003, FR-006)

**Decision**: el bloque `duelos` da, para cada acción que cambia, `{ base, m }`, y las demás conservan sus valores de
la 7.0.0. Valores de partida, calculados con la fórmula (sin ajustes, distancia de tiro 11 m):

| Duelo | 7.0.0 (base, m) | 8.0.0 (base, m) | 7.0.0 | 8.0.0 | Objetivo |
|---|---|---|---|---|---|
| Regate 98 contra 90 | −0,3; 1 | −0,32; 1,1 | 51,0 % | 51,6 % | 44–54 % |
| Regate 98 contra 70 | | | 72,5 % | 73,8 % | 65–75 % |
| Regate 66 contra 90 | | | 22,1 % | 21,0 % | 15–25 % |
| Pase corto 55 contra 75 | 3; 2,2 | 1,57; 1,27 | 77,7 % | 67,8 % | 63–73 % |
| Pase corto 90 contra 75 | | | 90,6 % | 85,0 % | 80–90 % |
| Remate 90 contra 80 (gol, normal, 11 m) | 0,35; 1 | sin cambios | 71,4 % | 71,4 % | 64–74 % |
| Remate 60 contra 90 | | | 27,0 % | 27,0 % | 22–32 % |
| Conducción 90 contra 70 | 0,5; 1 | 0,25; 1,15 | 78,3 % | 77,0 % | 72–82 % |
| Conducción 70 contra 90 | | | 38,5 % | 29,9 % | 25–35 % |

- **Regate**: ya cumple con la 7.0.0. FR-003 pide «algo mayor», así que se usa el mínimo que mantiene centrados los
  tres puntos (m = 1,1).
- **Remate**: ya cumple y FR-003 pide no tocarlo. El tirador y el portero ya usan las stats de FR-006: disparo o
  finalización contra `parada = (agilidad + colocación) / 2`. Se fija con un test, sin cambiar código.
- **Pase corto**: baja la base (hoy está en la zona saturada de la curva) y sube la sensibilidad en probabilidad (de
  0,37 a 0,48 puntos por punto de stat entre 55 y 90), aunque m baje de 2,2 a 1,27. El pase largo y el pase al espacio
  no están en FR-002 y conservan 0,9, 0,3 y 2,2.
- **Conducción**: el atacante sigue siendo (velocidad + físico) / 2 (supuesto de la spec). La 7.0.0 falla el punto 70
  contra 90. Bajar la base también resta acierto a la conducción en general (70 contra 70: de 67 % a 60 %). Se vigila
  con 003/SC-005 (conducciones por partido, que cuenta intentos y no aciertos).
- Los ajustes de zona, táctica y virtudes se siguen sumando como desplazamientos (FR-017).

**Rationale**: FR-003 pide la sensibilidad mínima. Con base y m por acción, cada curva se coloca en el centro de su
rango sin tocar las demás.

**Alternatives considered**: subir `duelo.pendiente` global. Movería también el centro, los tiros y los duelos aéreos,
que no lo piden, y en el pase corto no bastaría: con la base en 3 la curva está saturada.

**Coste para FR-020**: el acierto del pase corto 70 contra 70 baja del 87,5 % al 80,5 %. Se estima que los pases
completados pasen de unos 158 a unos 146 por partido al cerrar la tanda 1 (lo admite la clarificación). La tanda 2 lo
compensa (R7).

## R3. Quite por demarcación, Presionador y Mal defensor (FR-004, FR-005)

**Decision**: con el bloque `quite`, la traducción carta → atributo calcula el quite con la carta completa (posiciones
y rasgos), no solo con las stats:

```text
mult = { DEF: 1,00, MED con MD en su carta: 0,90, MED sin MD: 0,85, DEL: 0,80 }
     + 0,05 si Presionador − 0,05 si Mal defensor
quite = POR: defensa · DEF: tackling × mult · MED: (posicionamiento + velocidad) / 2 × mult · DEL: (agresividad + velocidad) / 2 × mult
```

- Las stats de entrada ya llevan la penalización por posición y las bonificaciones (`statsEfectivos`). El cansancio y
  los defectos de equipo se aplican después, como en el resto de atributos (caso límite «fuera de su posición o
  cansado»).
- El portero no cambia.
- Presionador y Mal defensor a la vez se anulan en el quite.
- Los efectos de hoy se conservan (clarificación): Presionador sigue con −0,08 al portador en `juego.ts` y su presión
  extra en `objetivos.ts`; Mal defensor, con el peso de candidato ×0,65 en `contexto.ts`.
- La anticipación de medios y delanteros no cambia (supuesto de la spec).
- «MD en su carta» se lee de `jugador.posiciones`, no de la casilla del partido (clarificación).
- La caché de atributos (`cacheAtributos`) se indexa por jugador, así que el coste por duelo no cambia.

**Rationale**: los valores de los escenarios 3 y 4 de US1 (63,75; 67,5; 60) salen literalmente de la fórmula. El quite
alimenta también el radio de intervención (`radioDe`), así que el cambio se nota en quién defiende, no solo en el duelo.

**Alternatives considered**: multiplicador según la casilla del partido. La clarificación lo descarta.

## R4. Frecuencia del regate y de la conducción (FR-007, SC-002)

**Decision**: en `opcionesConDatos` ([`opciones.ts`](../../packages/engine/src/acciones/opciones.ts)), con el bloque
`duelos`:

- El factor de regate se aplica **siempre** al peso del regate y al de la conducción. Hoy solo cuenta con un rival
  encima o con menos de 15 m de espacio, y por eso el regateador con espacio no conduce más que nadie.
- Con espacio abierto, la conducción usa la media geométrica del factor de regate y del físico, para que un rápido
  poco regateador no pierda lo que ya tenía.
- `decision.factores.regate` pasa de { k 0,4; máx. 2,2 } a { k 0,7; máx. 3,0 } como valor de partida. Con eso, un
  regate de 95 pesa 2,75 frente a 1,35 con 75: el doble en peso. Como parte del peso total es de otras opciones,
  debería dar el +40 % de intentos de SC-002.
- Se calibra con una sonda (`tools/balance/src/sonda015.ts`, 200 partidos), que repite la serie A/B de SC-002 y el
  recuento del mejor regateador de Core. La serie de 1.000 partidos solo se usa para cerrar la tanda.

**Rationale**: el defecto observado es de frecuencia (cero conducciones superadas en dos partidos). Subir el acierto
no lo arregla.

**Alternatives considered**: subir el peso base del regate en `pesosAcciones`. Haría regatear más a todos, y la spec
pide que la diferencia la marque la stat.

## R5. Cabeceador en cualquier jugador de campo y en todos los duelos aéreos (FR-008, FR-009)

**Decision**:

- **Ámbito**: Cabeceador sale de `VIRTUDES_DEL` y pasa a una lista nueva `VIRTUDES_CAMPO`, que `virtudesPermitidas`
  añade a DEF, MED y DEL, pero no a POR. `AmbitoRasgo` gana `'campo'` («Jugador de campo» en el documento generado).
- **Efecto**, con el bloque `aereo` (`bonusCabeceador: 0.15`):
  - Córner y falta lateral (`rematarBalonParado` en `tiro.ts`): +0,15 a la probabilidad si el rematador tiene la
    virtud y −0,15 si la tiene el defensor que le marca.
  - Primer duelo del remate de cabeza (¿va a puerta?): −0,15 si el que tapa tiene la virtud.
  - Centro interceptado dentro del área del defensor: −0,15 si el interceptor la tiene. Es el balón aéreo que más
    disputa un central en jugada.
  - Segundo duelo del remate de cabeza (¿es gol?): conserva su +0,15 actual (`bonusProbabilidadAlto`).
- **Selección**: el defensor que marca en el balón parado se elige ya con `aereo + Volador`; se le suma Cabeceador
  (+10), como en el lado atacante.
- **Atributo aéreo del defensa** (FR-008): ya es su anticipación en la 7.0.0 (`atributos.ts`). Solo se fija con un
  test.

**Rationale**: así se cumple «+15 a su favor en cualquier duelo aéreo, en ataque y en defensa, en cualquiera de las
dos áreas» sin un duelo nuevo: se usa el campo `ajuste` que ya existe en `probabilidad`.

**Alternatives considered**:

- Dejar Cabeceador como genérica y prohibirla al portero en la validación: el ámbito «Genérico» del documento
  confundiría.
- Sumar puntos al atributo en vez de probabilidad: la clarificación fija +15 puntos de probabilidad.

## R6. Las seis cartas y la versión del catálogo (FR-010, caso límite de partidas en curso)

**Decision**:

- En `data/core-real.json`: 60 Marc cede Muro defensivo; 76 Gabriel, Volador; 77 Joško, Potente; 86 Sergio,
  Intimidante; 87 Virgil, Aura; 275 Ronald Federico, Potente. Cada uno recibe Cabeceador.
- La validación (`pnpm --filter @fbd/fixtures core-real`) tiene que pasar y regenera `specs/008-datos-reales-core/sumario.md`.
- `VERSION_CATALOGO_ACTUAL` sube a 3. `cartaEnVersion(j, v < 3)` devuelve la virtud cedida en lugar de Cabeceador en
  esas seis cartas, con un mapa fijo id → virtud anterior en `versionCatalogo.ts`. La versión 1 sigue además quitando
  las de la 005.

**Rationale**: el servidor lee las cartas en vivo del catálogo, filtradas por la versión de la partida
(`catalogo.enVersion(partida.versionCatalogo)`). Sin la versión 3, una partida en curso cambiaría de virtudes a mitad
de torneo.

**Alternatives considered**: no versionar, porque son solo seis cartas. Incumpliría el caso límite de la spec.

## R7. Desmarque contra marcaje antes del pase (FR-011, FR-012, FR-013, FR-019, FR-020)

**Decision**, con el bloque `desmarque` (en `acciones/desmarque.ts`, puro):

- **Marcador**: el rival de campo más cercano al receptor a menos de `radioMarcaM` (3 m de partida). Si no hay
  ninguno, el receptor recibe libre y no hay duelo (caso límite). Al portero no le marca nadie.
- **Duelo**: el `desmarque` del receptor contra el `marcaje` del marcador, con base `base` (0) y m `m` (1).
  - `desmarque`: DEL desmarque, MED visión, DEF velocidad (cambia el ×0,8 de hoy, con el bloque).
  - `marcaje` (atributo nuevo): DEF marcaje, MED posicionamiento, DEL agresividad, POR 50 (FR-019).
- **Efecto en el pase** (si sale; si no, la tirada de desmarque no se hace):
  - Libre: desplazamiento `+bonusLibre` (0,5) en el duelo del pase.
  - Marcado: `−penalizacionMarcado` (0,4), y si el pase llega, control con presión (R8).
- **Elección del receptor** (FR-013): en `pesosReceptor`, el peso de cada candidato se multiplica por
  `1 + pesoEleccion × (p − 0,5)`, con `pesoEleccion` = 1, donde p es su probabilidad de ganar el duelo **sin tirada**.
  Así el pasador prefiere a quien suele ganar su duelo sin conocer el resultado. Sin marcador, p = 1.
- **Orden**: se elige receptor, se tira el desmarque y se resuelve el pase con su desplazamiento.
- **Coste** (FR-018): localizar al marcador es un recorrido por los 11 rivales por candidato (unos 10 candidatos), sin
  ordenar ni reservar memoria; es O(11) por candidato.
- **FR-020**: los pases a receptores libres (más probables y más elegidos) suben el acierto. `bonusLibre` y
  `pesoEleccion` son los mandos para volver a 150 pases completados al cerrar la tanda 2.

**Rationale**: el duelo de desmarque es la única manera de dar uso a desmarque y marcaje sin una acción nueva. Además
compensa la bajada del pase corto de R2, como pide FR-020.

**Alternatives considered**:

- Tirar el desmarque de todos los candidatos antes de elegir: gasta más tiradas y aleatoriedad y FR-013 no lo pide.
- Usar la anticipación del interceptor como marcador: ya es el defensor del pase, y la spec separa los dos duelos.

## R8. Técnica contra presión en el control (FR-014, SC-005)

**Decision**, con el bloque `controlPresion`:

- Cuando un pase llega a un receptor que perdió el duelo de desmarque, se juega el control: `tecnica` del receptor
  (atributo nuevo: DEF y MED técnica, DEL (regate + creatividad) / 2, POR distribución) contra el `quite` del
  marcador. Base `base` (1,0 de partida, unos 75 % con iguales) y m `m` (1).
- Si pierde, es una pérdida en la posición del receptor con `perder()`, que ya registra recuperaciones, transiciones y
  métricas, y se anota `controlesPerdidos`.
- Quien recibe libre, o sin marcador, no juega el duelo (escenario 3 de US5).
- No se crea un tipo de acción nuevo: el control es la continuación de un pase completado.

**Rationale**: reutiliza el marcador de R7 (no hay que localizar otro rival) y la pérdida de siempre. Su coste es un
duelo más en una parte de los pases.

**Alternatives considered**: duelo de control con cualquier rival que esté encima, aunque no marque. Haría falta otra
búsqueda, y la spec liga el control con presión al resultado del desmarque (escenario 2 de US4).

## R9. Liderazgo del defensa y del portero (FR-015, FR-016, SC-006)

**Decision**, con el bloque `liderazgo` (en `modificadores/liderazgo.ts`, puro):

- **Atributo** `liderazgo` nuevo: POR y DEF, su stat; MED y DEL, 0 (no se usa).
- **Defensa líder** (FR-015):
  - En `objetivos.ts`, el x objetivo de cada defensa de la línea se acerca al x de la línea (el del penúltimo
    defensor de `fueraDeJuego.ts`) en una fracción `min(maxCorreccion, kDefensa × (L − 70) / 25)`.
  - L es el mayor liderazgo entre los defensas de su misma línea a menos de `radioDefensaM` (12 m de partida, a
    calibrar), él incluido. Con varios líderes cuenta el mayor, no se acumulan.
  - Por debajo de 70 no corrige nada. Es una sola pasada por la línea defensiva en cada tick, en la que ya se calcula
    la línea.
  - **Métrica**: `habilitaciones`, el número de veces que un pase al espacio habría sido fuera de juego con la línea
    de los demás defensas y lo deja en juego un defensa rezagado de esa línea. Es lo que SC-006 llama «romper la
    línea del fuera de juego».
- **Portero líder** (FR-016): en los duelos en que defiende un DEF que está en la zona 0 o 1 de su equipo (su área y
  su tercio), su atributo defensor suma `0,025 × liderazgo del portero` (`porcentajePortero`). Se aplica en
  `ajusteDuelo` (`aj.defensor`) y en los duelos aéreos de R5. «Zona propia» se interpreta como las dos primeras zonas
  del motor, coherente con la clarificación («dentro de su área o en la zona propia»).

**Rationale**: los dos efectos reutilizan cálculos que ya existen (la línea del fuera de juego y el ajuste del duelo).
El valor exacto del escenario 2 de US6 (90 ⇒ +2,25) sale literalmente de la fórmula.

**Alternatives considered**: el liderazgo como bonificación de equipo en puntos (`bonusEquipo`). Afectaría a toda la
línea por igual y la spec lo quiere local, por cercanía.

## R10. Comprobaciones del informe y CI (FR-024, SC-001 a SC-008)

**Decision**: el detalle está en [contracts/balance.md](contracts/balance.md).

- `checks/curvas015.ts`: SC-001, con los nueve duelos calculados con `probabilidad()` y los parámetros 8.0.0, sin
  series (milisegundos). Sustituye a `014/SC-008-pase`, `014/SC-008-remate` y `014/SC-008-fisico`, que salen de
  `pesoStats.ts`. Los otros cuatro de `pesoStats` (regate, defensa, velocidad y portero) se quedan como criterios de
  la 014.
- `checks/motor015.ts`: SC-002 a SC-006, con series A/B sobre `equipoSintetico` (la misma pieza de `pesoStats`) y la
  serie Core para el mejor regateador del catálogo. Las métricas nuevas por jugador (data-model) salen de
  `MetricasJugador`.
- `ci.yml`: sin `--pendientes` cuando cierre la tanda 3 (SC-007). Durante la tanda 1 y la 2, la lista se va vaciando
  a medida que pasan; el informe ya avisa con «Ya se cumplen; quítalos de `--pendientes`».

## R11. Rendimiento, huellas y documentación (FR-018, FR-022, FR-023, SC-009, SC-010)

**Decision**:

- **Rendimiento**: `umbralMotor.ts` ya mide el tiempo por partido. Se apunta el tiempo de la 7.0.0 antes de la tanda 1
  y se compara al cerrar cada tanda (≤ +10 %). Si R7 lo supera, el remedio previsto es calcular el marcador de cada
  candidato una sola vez por decisión de pase y reutilizarlo en R8.
- **Huellas**:
  - `huella-014.json` no se regenera: sigue idéntica con la 7.0.0 (R1).
  - `huella-015.json` (100 partidos y 20 drafts con la 8.0.0) se genera al cerrar la tanda 3. La comprueba
    `equivalencia.test.ts`, junto con la igualdad entre la rápida y la 2D (SC-010).
  - Las referencias de equivalencia que usan `parametrosActuales()` se regeneran. Las que fijan `PARAMETROS_V7` se
    quedan.
- **Documentos**:
  - `enfrentamientos.md` a mano: tabla carta → atributo con quite, marcaje, técnica y liderazgo; curvas; dos duelos
    nuevos; §5.1; §7 casi vacía; §8 resuelta.
  - `virtudes-y-defectos.md` con `pnpm --filter @fbd/domain rasgos:doc` tras cambiar los textos de los tres rasgos.

## R12. Buscar a la estrella y desmarque en el pase (FR-025, FR-026; añadidos)

**Decision**: en `pesosReceptor`, cada candidato del rango elegido lleva su media efectiva (`mediaEfectiva`, con la
penalización por posición) y si su línea es clara (sin rival de campo a ≤ 3 m del segmento y sin rival encima). La
función pura `pesosEstrella` aplica las reglas de US7 sobre los pesos de siempre: × 2^((media − 70)/10) a los claros;
con (visión + pase)/2 > 80, el marcado pesa 1,5 × la mejor opción clara si la supera en más de 5 puntos de media, o
0,4/0,6 de ella si no. En el duelo del pase, `ajusteDesmarque` suma 0,003 por punto de desmarque sobre el marcaje del
rival más cercano al receptor (≤ 3 m).

**Rationale**: SC-002b no se alcanza subiendo el factor de regate (k = 1,3 y máximo 5 solo llegan al 81 %): el
extremo toca poco el balón. Las reglas son las de la persona, con las probabilidades de sus ejemplos (60/40, más de 5
puntos). El desmarque se anticipa como ajuste porque la persona lo pidió en el éxito del pase; la tanda 2 (R7) lo
sustituye por el duelo completo.

**Alternatives considered**: comparar la media con la del portador (el de más media del equipo nunca pasaría); un
factor lineal de media (87 frente a 83 apenas se distingue).

## R13. Juego por las bandas (FR-027; añadidos)

**Decision**: un estilo con balón más (`bandas`), no una casilla aparte: es la lista que la persona nombró
(Contraataque, Juego combinativo). Engancha en tres sitios que ya existían: `probabilidadBanda` (+ 0,2), el peso del
centro en `pesosAcciones` (× 1,3) y el receptor por posición en `pesosReceptor` (LI, LD, CI, CD, EI y ED × 1,5).

**Rationale**: la forma de `Tactica` no cambia (sin migración de las tácticas guardadas) y cuelga del bloque `bandas`.

## R14. Subida al área a balón parado (FR-028; añadidos)

**Decision**: con `subidaArea`, `objetivosBalonParado` coloca en córners y faltas al área a todos menos el defensa y el
medio más retrasados sin Cabeceador, ordenados por `aereo` (+10 con Cabeceador) en once puntos: los cinco de remate de
siempre, la frontal y las inmediaciones. `porteroSube` (perdiendo de uno en los últimos 60 s del descuento de la
segunda parte o de la prórroga: la última jugada) añade al portero (−15 de prioridad) y le deja ser rematador en
`rematarBalonParado`. Si aun así hay un tiro rival con el portero a más de 30 m de su portería, `porteroBajoPalos` lo
resuelve sin portero (puerta vacía). El rival defiende con ocho.

**Rationale**: sin centrales en el área, Cabeceador solo pesaba en defensa (0,322 → 0,324 goles de cabeza). La espera
de colocación ya existente (`reponer`) da tiempo a que lleguen.

La persona puso al portero como ejemplo; la regla de la última jugada y la puerta vacía son su corrección (2026-11-14).
30 m deja fuera las salidas normales del portero (su objetivo no pasa de unos 17 m).

## R15. Segunda línea: salir de su zona (FR-029; añadidos)

**Decision**: dos cambios mínimos con `segundaLinea`: el mano a mano (014, R2) empieza 10 m dentro del campo propio, y
la llegada al área (H11) incluye a MC, MII y MID, que suben a la frontal (x = 7.900, unos 22 m) con la intensidad de su
posicionamiento. `papelLlegada` no cambia (lo usan el receptor y el pase; la 7.0.0 seguiría igual).

**Rationale**: una sonda de 200 partidos con el 4-4-2 sintético daba 0,00 goles y 0,06 tiros por partido a los medios
centro, y 0 mano a mano a los defensas. Con la llegada a 7.430 (27 m) los medios seguían sin tirar; a 7.900 marcan 0,07
goles y tiran 0,32 veces por partido.

## Referencia 7.0.0 (T001)

Medida el 2026-11-14 con `pnpm --filter @fbd/balance umbral-motor` (20 partidos, `equipoSintetico`), antes de tocar
el motor. Dos ejecuciones seguidas, sin otros procesos pesados:

| Medida | 1.ª | 2.ª |
|---|---|---|
| Partido completo sin fotogramas | 228,8 ms | 204,8 ms |
| `resolverResto` desde el minuto 0 | 218,5 ms | 219,8 ms |
| Partido completo con métricas | 223,3 ms | 198,6 ms |

- Máquina: Intel Core i7-10710U (1,10 GHz, 12 hilos), 16 GB, Windows 10, Node 24.19.0.
- En esta máquina la 7.0.0 ya supera el umbral absoluto de 120 ms de `umbralMotor.ts`, así que SC-009 se juzga aquí
  solo por la comparación relativa (≤ +10 %). El ruido entre ejecuciones es de un ±10 %: la comparación se hace con
  las dos versiones medidas en la misma sesión.

## Serie de cierre de la tanda 1 (T043–T045, 2026-11-14)

`pnpm balance --n 1000` con la 8.0.0: 56/68. Tras recalibrar `disciplina.factorFaltaArea` 0,45 → 0,34 y
`defectos.malDefensor` 0,65 → 0,5 (solo en la 8.0.0), 005/SC-011 (penaltis 0,42) y 005/SC-004/MalDefensor (0,422) vuelven a
cumplirse. Siguen en rojo:

| Comprobación | 8.0.0 | Nota |
|---|---|---|
| 015/SC-002b | Messi (ED) 69,4 % de partidos con ≥ 1 regate o conducción ganados (objetivo 90 %) | En ED toca poco balón; k=1,3/max 5 solo llega al 81 % (sonda de 200) |
| 015/SC-003 | aéreos ganados de los centrales 0,76 → 2,17; goles de cabeza del equipo 0,322 → 0,324 | Los centrales casi nunca son rematadores a balón parado: la virtud solo pesa en defensa |
| 003/SC-002 | 21,1 % de goles desde fuera del área (22–28 %) | 7.0.0: 24,0 % |
| SC-004 | peor 9,7 % (≥ 10 %) | 7.0.0: 10,9 % |
| 002/SC-007a | 144,8 pases completados (≥ 150) | Permitido por FR-020 |
| 002/SC-007b | 27,2 % de posesiones con 3+ pases (≥ 30 %) | |
| 003/SC-006 | conducciones largas +14 % con +15 de físico y velocidad (≥ +15 %) | |
| 014/SC-008-velocidad | acierto +7,5 % (≥ +10 %) | 7.0.0 ✔ |

Quedan como pendientes en CI hasta la calibración. `umbral-motor` (T045): 97,1 / 101,1 / 92,9 ms, por debajo de T001 y
del máximo de 120 ms (la referencia de T001 se midió con la máquina más cargada; la comparación relativa no muestra
subida).

### Añadidos (tanda 1b): sonda de 200 partidos

Con los cuatro añadidos y la recalibración anterior: 015/SC-003 ✔ (goles de cabeza del equipo 0,310 → 0,425; aéreos
ganados 0,55 → 2,97), 015/SC-002b 84,0 % (antes 72 %), defensas 0,34 goles por partido (antes 0,20), medios 0,07
(antes 0,00), 3,0 goles por partido y 136 pases completados (antes 145). Falta la serie de 1.000 de cierre.

`defectos.malDefensor` es la parte de las acciones defensivas que el Mal defensor no cede a un compañero
(`candidatoDefensivo`): bajarlo de 0,65 a 0,5 hace el defecto **más** grave. Con 0,65 en la 8.0.0 el defecto se notaba
menos que en la 7.0.0 (0,627 frente a ≈ 0,5); la hipótesis, sin verificar, es que con el regate siempre ofrecido hay
más mano a mano defensivos en los que no hay a quién ceder la acción.

### Añadidos (tanda 1b): comprobaciones con 1.000 partidos

| Comprobación | Resultado |
|---|---|
| 015/SC-002b | ✘ Messi (ED) 75,0 % de partidos con ≥ 1 regate o conducción ganados (antes 69,4 %); media 1,70 |
| 015/SC-003 | ✔ aéreos ganados de los centrales 0,59 → 3,06; goles de cabeza del equipo 0,295 → 0,400 |
| 015/SC-011 | ✔ toques de laterales y extremos 24,9 → 27,0; centros 4,78 → 5,80 |
| 015/SC-012 | ✘ defensas y medios, 1,4 % de los goles del equipo (25 de 1.733) |

SC-012 depende mucho de las stats del equipo sintético: con la semilla de la sonda (`sondaLineas`) los defensas
marcaban 0,34 goles por partido (casi la mitad de cabeza) y los medios 0,07; con la de la comprobación (`motor015`),
casi nada. Queda pendiente de calibrar (`segundaLinea`, `subidaArea`) junto con SC-002b, en la serie de cierre (T091).

### Añadidos (tanda 1b): serie completa de 1.000 partidos (portero solo en la última jugada)

`pnpm balance --n 1000` con la 8.0.0 y los cuatro añadidos: 60/70 (antes 56/68), 7.656 s.

- Vuelven a cumplirse: 003/SC-006 y SC-004 (salen de `--pendientes` en CI).
- Sin cambios frente a la serie de `--solo`: 015/SC-002b 74,9 % (media 1,70), 015/SC-003 ✔ (0,58 → 3,06 aéreos;
  0,295 → 0,399 goles de cabeza), 015/SC-011 ✔, 015/SC-012 1,4 %.
- Siguen pendientes: 003/SC-002 21,4 %, 002/SC-007a 140,5 pases (antes 144,8), 002/SC-007b 26,3 % (antes 27,2 %),
  002/SC-008 +9,6 %, 014/SC-008-velocidad +7,7 %.
- **Fallan y bloquean**:
  - 014/SC-008-defensa: acierto +6,8 % (25,0 % → 26,7 %; objetivo +10 %); intentos +22,3 % ✔. Nueva regresión.
  - 003/SC-007, Matador: goles del jugador 0,575 → 0,635 (+10 %), sin diferencia significativa. El CI ya lo
    describe como una comprobación de un solo jugador que falla por ruido; con más goles repartidos entre
    defensas y Cabeceador, al delantero le quedan menos.
