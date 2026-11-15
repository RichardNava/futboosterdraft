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

### Calibración tras la serie completa (2026-11-14)

Decisiones: SC-002b baja al 80 %; 014/SC-008-defensa debe pasar; Matador se mide donde actúa.

- **015/SC-002b**: la escala de media sola se estanca en torno al 79 % (sondas de 300: escala 10 → 74 %, 6 → 79 %,
  4 → 80 %, 3 → 79 %; la prioridad de la estrella marcada no mueve nada). Lo que falta son partidos en los que la
  estrella apenas recibe. Valores: `estrella.escalaMedia` 10 → 4 y `decision.factores.regate` { k 0,7 → 1,1; max 3 → 4 }.
  Con 1.000 partidos: 81,0 % (media 2,25); 015/SC-002a sigue ✔ (+63,5 % intentos, +94,1 % completados).
  Coste: 002/SC-007a baja a 134,3 pases completados y 2,0 contraataques por partido (en el límite); 002/SC-007b, 25,5 %.
- **014/SC-008-defensa**: no lo causa un añadido en concreto sino la fórmula de quite de la 8.0.0. Por demarcación (300
  partidos, sin → con +15): DEF 35,9 % → 45,5 %; MED 25,1 % → 26,1 % (su quite es (posicionamiento + velocidad)/2 ×
  0,85, así que +15 de carta son +6,4); DEL 18,8 % → 18,6 % (la comprobación no les subía nada y hacen el 35–40 % de
  las entradas). Los añadidos llevan más juego por fuera y diluyen la medida. Se sincroniza la comprobación con
  `atributos.ts` de la 8.0.0: DEL suma `agresividad`. Con 1.000 partidos: acierto +11,8 % ✔ (intentos +25,5 %).
- **003/SC-007, Matador**: la virtud funciona por tiro, pero el Matador nunca la pasa y conduce hasta tirar, así que
  juega menos mano a mano (1.640 → 1.329) y sus goles totales no prueban nada. Con 1.000 partidos: conversión de sus
  tiros en mano a mano 35,2 % → 47,0 % (287 y 251 tiros; z ≈ 2,8). La comprobación pasa a medir esa conversión
  (métricas nuevas `golesManoAMano` y `tirosManoAMano`; contraste de dos proporciones, z > 2).

### Calibración de los pendientes (2026-11-15)

Decisiones: 002/SC-007a baja a ≥ 130 pases completados y 002/SC-007b al 25 % de posesiones con 3 o más pases (FR-020).

- **014/SC-008-velocidad**: por demarcación, la carrera por el balón suelto es puramente física (llega primero el más
  rápido; el choque entre los dos casi nunca decide, porque el balón se alcanza a 150 décimas y la separación mínima es
  de 110). La velocidad pesaba poco: `espacio.velocidadJugadorMin` 18 → 14 (la máxima sigue en 36). Sondas de 300:
  máximo 40 → +6 %, 15–39 → +8 %, mínimo 14 → +15 %. Con 1.000 partidos: acierto +13,4 % ✔.
- **003/SC-002**: el factor de gol del tiro lejano solo no basta (−0,5 → 0: del 20,3 % al 22,3 %). Valores:
  `acciones.puerta.lejano` −0,2 → 0,1 y `acciones.gol.lejano` −0,5 → −0,1. Sonda de 300: 23,6 % fuera del área ✔.
- **002/SC-008**: `pesoPasePorStat` no actúa en la 8.0.0 (manda la curva del pase) y la pendiente de la curva no ayuda en
  ningún sentido (m 0,95 → +7,1 %; 1,1 → +7,6 %; 1,27 → +8,7 %; 1,4 → +7,7 %; 1,55 → +6,8 % y rompe 015/SC-001). Sigue
  pendiente, con 003/SC-009, que lo incluye.

Huellas: `data/core-real.json` cambió las stats de varias cartas (decisión de producto), lo que cambia los sobres y los
picks de los NPC; se regeneran `huella-014.json` (los 100 partidos salen idénticos, solo cambian los 20 drafts) y
`regresion-e9aca5d.json` (G4).

### Serie de cierre de 1.000 partidos (2026-11-15)

`pnpm balance --n 1000 --pendientes 002/SC-008,003/SC-009,015/SC-012`: 62/70 (antes 60/70), 7.487 s.

- Pasan ahora: 015/SC-002b 83,1 % (media 2,24), 003/SC-007 (Matador 32,8 % → 45,1 % en mano a mano), 003/SC-002 25,2 %,
  002/SC-007b 25,7 %, 014/SC-008-velocidad +13,0 %. 003/SC-001 sigue ✔ con 3,05 goles por partido.
- 014/SC-005 (1 incoherente de 2.687): fallo de la métrica, no de la regla. En la falta colgada al área, el penúltimo
  defensor de la foto se medía después de `volar`, que avanza el reloj. Se toma antes; la simulación no cambia (0 de 2.687).
- **Fallan en el límite** (sin cambio de parámetros entre medias):
  - 003/SC-006: conducciones largas con +15 de físico y velocidad 1,31 → 1,50 (+14,5 %; objetivo +15 %). El resto, holgado.
  - 002/SC-007a: 2,0 contraataques por partido redondeado, por debajo de 2 (133,3 pases ✔).
  - 014/SC-008-defensa: acierto +9,0 % (25,0 % → 27,3 %, ±1,0 %; la sonda de `--solo` daba +11,8 %); intentos +25,8 % ✔.
  - 015/SC-003: aéreos ganados 0,55 → 2,88 ✔, pero goles de cabeza del equipo 0,340 → 0,371, no significativo (antes
    0,295 → 0,399). Con más goles de tiro lejano, el Cabeceador pesa menos en el total del equipo.
- Siguen pendientes: 002/SC-008 +9,1 %, 015/SC-012 2,3 %, 003/SC-009.

### Ajustes tras la serie de cierre (2026-11-15)

Decisiones: 003/SC-006 baja a +14,5 % en conducciones largas; quite de los MED algo mayor; 015/SC-003 mide los goles de
cabeza de los propios centrales. Sondas de 1.000 partidos con `--solo`:

- 003/SC-006 ✔: conducciones largas +21,8 % (el resto, holgado).
- 014/SC-008-defensa ✔: `quite.MED_MD` 0,90 → 0,92 y `quite.MED` 0,85 → 0,87; acierto +10,4 % (±0,9 %), intentos +26,4 %.
- 015/SC-003 ✔: aéreos ganados 0,52 → 2,88; goles de cabeza de los centrales 0,000 → 0,208 por partido.
- 002/SC-007a ✘: 2,0 contraataques por partido redondeado, por debajo de 2 (132,6 pases ✔).
- Contraataques con la táctica Contraataque (sonda de 300, `sc007-2d` frente a su clon): equilibrado 0,96 por equipo
  (1,91 por partido); con Contraataque, 1,46 el que la elige y 1,07 el rival (2,53 por partido), posesión 46,1 %.
- **Córners**: 2,1–2,3 por partido (objetivo de producto 9,5–12,5). Solo salen de tiros: parada (30 %) o bloqueo (35 %).
  Prototipo descartado: córner tras un centro despejado; aun con el 100 % se llega a 4,6 por partido, y los goles
  (3,37 → 3,56) y la cuota de cabeza (19,4 % → 23,4 %) suben. Llegar a 10 pide más fuentes (despejes, entradas y pases
  que salen por la línea de fondo) y recalibrar goles: decisión pendiente.

### Balones fuera (2026-11-15)

Decisión: entre 6 y 9 córners por partido (media 7,5) y más saques de banda, sin perder acciones de juego (US11, FR-031,
SC-013); si no se consigue sin regresiones, se descarta.

**Diagnóstico** (sonda de 300 partidos entre equipos equilibrados): 2,20 córners y 1,33 saques de banda por partido. Los
córners solo salían de tiros parados o bloqueados y el balón siempre acababa en un jugador. Cada córner costaba 90 s de
parada más la espera de colocación, que casi siempre llegaba al tope (los atacantes no estaban en su sitio): 1.548 s de
tiempo muerto por partido. Con el triple de córners se perdía tiempo de juego y, con él, acciones.

**Cambios** (bloque `fueraDeCampo` de la 8.0.0; la 7.0.0 da los mismos partidos):

- Fuentes: centro despejado → córner (90 %); pase cortado o entrada ganada a menos de 22 m de la línea de fondo →
  córner (25 %); a menos de 15 m de una banda → saque de banda (50 %), de uno u otro equipo. Tiro parado → córner,
  30 % → 45 %; tiro bloqueado, 35 % → 60 %.
- Tiempo: córner con 20 s de parada y 15 s de espera máxima, y en la colocación todos van 4 veces más deprisa (también
  aceleran y frenan); saque de banda con 6 s de parada, desde donde salió el balón y por el jugador de campo más cercano,
  que también llega 4 veces más deprisa. Tiempo muerto: 1.548 → 1.279 s por partido (45,8 s por córner, 14,6 s por saque
  de banda).
- Peligro: el córner de antes rendía mucho (13,9 % de gol de cabeza inmediato y 7,1 % en la segunda jugada: 0,46 goles
  por partido). Con el triple de córners, el remate y la falta en el duelo aéreo salen con el 30 % (`peligroCorner`), y
  el despeje se aleja hasta la frontal, hacia el compañero más cercano; si llega antes un rival, la segunda jugada es
  suya. Unos 0,4 goles por partido salen de córner.

**Sonda de 300 partidos** (antes → después): córners 2,20 → 6,82; saques de banda 1,33 → 2,90; pases 135,1 → 134,2;
conducciones 61,2 → 61,8; tiros 15,1 → 15,2; contraataques 1,96 → 1,97; goles 3,38 → 3,28; cambios de orientación
5,11 → 4,24.

**Cambios de orientación**: bajan 0,2–0,28 por cada córner de más. Salen sobre todo de saques de puerta (0,18 por
posesión), saques de banda y recuperaciones en banda, y los córners ocupan el lugar de esas posesiones. Descartado
porque no lo arregla o rompe otra cosa: esperar menos en las faltas al área (recupera acciones, pero las faltas suben un
7,5 % y con ellas las amarillas), que el portero atrape parte de los córners y quitar fuentes de córner.

**Serie de 1.000 partidos** (`pnpm balance --n 1000 --pendientes 002/SC-008,003/SC-009,015/SC-012`): 65/71 en 7.668 s.

- ✔ 015/SC-013: 6,83 córners y 3,01 saques de banda por partido.
- ✔ Acciones (002/SC-007a): 133,1 pases completados, 15,1 tiros, 61,8 conducciones, 17,5 paredes y 1,8 contraataques
  (umbral nuevo de 1,8). Goles: 2,94 por partido (003/SC-001); cabeza 15,7 %, penaltis 8,0 %, falta directa 6,3 %.
- ✔ Las tres del ajuste anterior: 003/SC-006 (+14,8 % de conducciones largas), 014/SC-008-defensa (+12,2 %) y
  015/SC-003 (aéreos de los centrales 0,56 → 5,18; sus goles de cabeza 0,000 → 0,167).
- ✘ 002/SC-007a: 4,2 cambios de orientación (< 5).
- ✘ 005/SC-004/Fragil: 22 → 84 lesiones, 3,97 (objetivo 3 ± 20 %). Es ruido: con unas 25 lesiones de base, el error del
  cociente ronda el 22 %, más que la tolerancia. Con la semilla 2 da 29 → 90 (3,24 ✔); la 3 juega casi los mismos
  partidos que la 1 (cada partido usa `semilla + i`). La lesión se sigue sorteando antes de que el balón salga.
- ✘ 014/SC-008-velocidad: +9,8 % (antes, +13,0 %).

**Velocidad: carreras que no deciden nada**. Sonda de 1.000 partidos con la misma semilla, sin y con `fueraDeCampo`:
carreras por balón suelto del equipo A por partido, según la acción anterior, y cuánto sube con +15 de velocidad el
porcentaje que gana.

| Origen | Sin | Con | Efecto de +15 |
|---|---|---|---|
| Pase (corto, al espacio, largo) | 11,3 | 11,5 | +10 a +12 puntos |
| Centro | 4,0 | 6,7 | +1 punto |
| Despeje (segunda jugada del córner) | 0 | 1,9 | ≈ 0 |
| Conducción, regate y control | 6,5 | 5,6 | negativo |

En el córner, el vuelo del centro hacia el que remata o despeja acaba en una carrera con el rival más cercano cuyo
resultado el motor ignora: el duelo aéreo ya decidió. Con el triple de córners, esas carreras diluían la medida. Primero
se quitaron de la simulación (`disputa: false`): velocidad +12,2 %, pero cambian las posiciones tras el córner y bajan
los goles (2,94 → 2,74) y los tiros (15,1 → 14,8, por debajo de 15). Descartado. Queda la simulación como estaba y esa
carrera no cuenta como balón suelto (`cuentaSuelto: false`): 002/SC-007a y el resto de 014/SC-008 dan exactamente lo
mismo que en la serie, y velocidad pasa con +11,1 % (50,0 % → 55,5 %, ±0,5 %).

Decisiones:

- El mínimo de cambios de orientación de 002/SC-007a baja de 5 a 4 (apenas se aprecian en la simulación y no pesan en
  el resultado): 4,2 ✔.
- Frágil: la serie de lesiones del informe (`P_LESIONES` en `tools/balance/src/checks/rasgos.ts`; el juego no cambia)
  pasa de 0,02 a 0,08 lesiones por entrada. Con 0,02 los delanteros sin Frágil se lesionaban 20–35 veces en 1.000
  partidos y el azar movía el cociente ±22 %, más que la tolerancia (±20 %): fallaba por azar 1 de cada 3 veces. Con
  0,08, unas 110 lesiones de base, ±11 % y 1 de cada 14: semilla 1, 103 → 292 (3,32 ✔); semilla 2, 121 → 278 (2,65 ✔).
  El grupo de defectos y virtudes pasa entero (18/18): De cristal 102 de 102 lesiones largas, De acero 0 (272 sin la
  virtud), Revulsivo 0,050 con 13.307 muestras.

## Tanda 2: desmarque y control con presión (2026-11-15)

Decisiones previas de la persona: 015/SC-012 pasa a 15–30 % de los goles para defensas y medios (antes 15–40 %); el
mínimo de 002/SC-007a sigue en 130 pases completados (T061 decía 150).

### Implementación (US4 y US5)

- `acciones/desmarque.ts`: `marcadorDe` (un recorrido por los rivales, sin ordenar ni reservar memoria; al portero no le
  marca nadie y el portero rival no marca), `probabilidadDesmarque` y `probabilidadControl` (la fórmula de `duelo.ts` con
  la base y la m de su bloque).
- `juego.ts`: `desmarqueDelPase` se tira con el receptor ya elegido y desplaza el duelo del pase: +`bonusLibre` si recibe
  libre (gana, o nadie le marca, sin tirada) y −`penalizacionMarcado` si pierde. Sustituye a `ajusteDesmarque` y a
  `estrella.pendienteDesmarque` (el anticipo de los añadidos), que desaparecen. `controlConPresion`, tras un pase
  completado a un receptor marcado: si pierde, el marcador le quita el balón de los pies (`recuperarSuelto` sin disputa y
  sin contar como balón suelto, para no diluir 014/SC-008-velocidad) y `perder()`.
- `receptor.ts`: el peso de cada candidato × (1 + `pesoEleccion` × (p − 0,5)), con p su probabilidad de ganar el
  desmarque sin tirada (1 sin marcador).
- `atributos.ts`: con el bloque `desmarque`, el desmarque del DEF es su velocidad entera (sin el × 0,8). El marcaje y la
  técnica ya estaban en la tabla desde la fase 2 (T007).
- Métrica nueva `pasesRecibidos` (pases completados que recibe el jugador) para SC-004.
- 015/SC-005 se mide en todos los jugadores de campo, con +15 de técnica (en el DEL, +15 de regate y de creatividad, que
  la forman): en defensas y medios solo hay 1,3 controles con presión por partido (1.320 en 1.000 partidos) y el error
  del cociente se comía la diferencia (−10,5 %); con todos, unos 3.000 por serie.

### Valores de partida: 1.000 partidos, semilla 1

| Comprobación | Tanda 1 | Tanda 2 (valores de partida) |
|---|---|---|
| 002/SC-007a | 133,1 pases · 15,1 tiros · 1,8 contraataques | 138,6 pases · **14,6 tiros** ✘ · 1,8 contraataques |
| 002/SC-008 | +7,9 % | +8,2 % (75,1 frente a 69,4) |
| 015/SC-004 | — | ✔ el DC recibe libre 8,50 → 9,35 por partido; recibe 7,25 → 7,62 pases; con +15 de marcaje rival, 7,92 |
| 015/SC-005 (defensas y medios) | — | ✘ −10,5 % (20,3 % → 18,2 % de 1.320 controles) |
| 015/SC-012 | 5,9 % | 4,1 % (71 de 1.726) |

### Los tiros: sondas de la serie de 002/SC-007a (los dos equipos, por partido)

| Variante | n | Completados | Tiros | Goles | Duelos de desmarque (A) |
|---|---|---|---|---|---|
| Sin bloques de la tanda 2 | 2.000 | 133,6 | 15,02 | 3,31 | 0 |
| Sin el peso en la elección | 1.000 | 137,8 | 14,91 | 3,28 | 10,0 |
| Sin control con presión | 1.000 | 139,1 | 14,68 | 3,21 | 9,1 |
| `pesoEleccion` 0,5 / 0,3 | 1.000 | 137,7 / 138,0 | 14,55 / 14,55 | | |
| `bonusLibre` 0,25 / 0 (control base 0,5) | 1.000 | 135,9 / 133,0 | 14,62 / 14,58 | | |
| Candidata: `bonusLibre` 0,25, control base 0,5 | 2.000 | 135,7 | 14,69 | 3,25 | 8,95 |
| Candidata sin penalización al marcado | 2.000 | 135,8 | 14,73 | 3,25 | 8,95 |
| Candidata con `radioMarcaM` 2 | 2.000 | 136,0 | 15,15 | 3,33 | 0,17 |

- El error de cada media de tiros es de ±0,14 con 1.000 partidos y ±0,10 con 2.000: el reparto entre las piezas es
  aproximado, pero la tanda 2 resta unos 0,3 tiros por partido (2,3 errores estándar con 2.000).
- No lo mueve ningún mando de la tanda: ni `pesoEleccion`, ni `bonusLibre` (la hipótesis de posesiones más largas por
  menos pérdidas queda descartada: con `bonusLibre` 0 hay 56 recuperaciones y siguen 14,6 tiros), ni la penalización.
- Con 2 m de radio casi no hay duelos (0,17 por partido; la separación mínima entre jugadores lo impide) y los tiros
  vuelven a 15,15: entre 2 y 3 m el número de duelos salta de casi nada a 9 por equipo.
- Causa: lo que pide US5. El que recibe marcado, casi siempre un delantero cerca del área, recibe menos (elección y
  penalización) y, si le llega, pierde el control una de cada tres veces con stats iguales; esas jugadas eran tiros.

### Calibración

- `controlPresion.base` 1,0 → 0,5: 015/SC-005, con todos los jugadores de campo, da −19,0 % con 1,0 (21,5 % → 17,4 %,
  a menos de un error estándar del 15 %) y −26,1 % con 0,5 (28,1 % → 20,8 %). Con iguales, el marcado controla el 67 %.
- `desmarque.bonusLibre` 0,5 → 0,25: 135,9 pases completados (≥ 130 con margen) y 002/SC-008 +9,4 % (con 0,5, +8,0 %;
  con 0, +8,6 % y 1,79 contraataques). El error de SC-008 es de ±0,65 puntos: las tres son parecidas.
- `radioMarcaM` 3, `penalizacionMarcado` 0,4 y `pesoEleccion` 1 se quedan.

### 015/SC-012: de quién son los goles

Desglose del equipo de la comprobación (`motor015`, 1.000 partidos, tanda 2 con los valores de partida): los cuatro
delanteros del 4-4-2 sintético (SD, DC, EI y ED: los extremos son delanteros) marcan el 91 %. El SD remata casi todos
los balones aéreos (256 goles de cabeza) y el EI tira los penaltis (102) y las faltas directas (106). Los centrales no
marcan de cabeza (DCI 0; el DCD es el que se queda atrás y no tira), y los medios centro tiran 0,22 y 0,10 veces por
partido, casi todo de lejos.

Cuota con seis equipos sintéticos (300 partidos cada uno):

| Equipo | Cuota | Goles de cabeza de defensas | Penaltis y faltas |
|---|---|---|---|
| `motor015` (el de la comprobación) | 2,4 % | 0 | DEL |
| `referencia` | 3,0 % | 0 | DEL |
| `sc007-2d` | 4,6 % | 1 | DEL |
| `peso-stats` | 20,3 % | 21 | DEF |
| `sc008-2d` | 25,3 % | 28 | DEF |
| `sondaLineas` | 27,5 % | 35 | DEF |

- Lo decide el azar de las stats del equipo (todas entre 77 y 83): los penaltis y las faltas directas son un 14 % de los
  goles y los tira siempre el mejor en su stat, y el rematador del córner es siempre el mejor por arriba de los cinco
  más cercanos al punto de remate. Si los dos son delanteros, defensas y medios marcan un 3–5 %; si son defensas, un
  20–27 %. Ningún mando de la tanda 2 lo cambia.
- Prototipo (descartado y revertido): el rematador del balón parado por sorteo ponderado por su juego aéreo
  (× 2 cada 5 puntos) en vez de siempre el mejor. Comprime la cuota (2,4 → 5,4 %; 3,0 → 5,7 %; 4,6 → 8,1 %; 20,3 →
  18,2 %; 25,3 → 21,6 %; 27,5 → 23,8 %) sin cambiar la media (13,8 %): no basta para el equipo de la comprobación.

### Serie de cierre de la tanda 2 (T061–T063, 2026-11-15)

`pnpm balance --n 1000` (semilla 1) con `bonusLibre` 0,25 y `controlPresion.base` 0,5, en grupos paralelos con
`--solo`: 67/73 (las dos nuevas, 015/SC-004 y 015/SC-005, incluidas).

- ✔ Nuevas: 015/SC-004 (el DC recibe libre 8,47 → 9,31 por partido; recibe 6,99 → 7,37 pases; con +15 de marcaje
  rival, libre 8,01) y 015/SC-005 (controles perdidos 27,9 % → 21,1 %, −24,3 %, con 3.091 y 3.910 controles).
- ✔ Mejoran las que estaban al límite: 002/SC-007b 27,1 % (25,6 %), 014/SC-008-velocidad +12,9 % (+11,1 %),
  003/SC-006 conducciones largas +36,2 % (+14,8 %), 015/SC-002b 85,3 % (83,1 %). Siguen: 003/SC-005 60,5 % de pases
  cortos (60,8 %), contraataques 1,8. 002/SC-007a: 135,9 pases completados, 13,9 centros, 61,4 conducciones, 17,3
  paredes, 4,3 cambios de orientación y 1,8 contraataques. 003/SC-001 2,78 goles por partido; 003/SC-002 26,0 %.
- ✘ Pendientes del CI, sin cumplirse: 002/SC-008 +9,4 % (74,5 frente a 68,1), 015/SC-012 4,3 % (73 de 1.687) y
  003/SC-009 (por 002/SC-007a y 002/SC-008).
- ✘ Nuevas en rojo, que esperan decisión:
  - 002/SC-007a: **14,6 tiros** (< 15). Es el efecto de US5 descrito arriba; ningún mando de la tanda lo recupera.
  - 003/SC-003: **propia puerta 4,5 %** (≤ 3 %; tanda 1, 3,0 %). En el equipo de la serie (`sc003`), sin la tanda 2,
    0,09 autogoles por partido con las semillas 1 y 5001 (3,1 % y 3,2 %: ya por encima del 3 % con estas semillas);
    con ella, 0,13 y 0,10 (4,7 % y 3,5 %). Unos +0,025 por partido (2,5 errores estándar) por un mecanismo que no se ha
    localizado (los autogoles salen de despejes de centros en el área y de tiros desviados, y los centros no cambian:
    13,3–13,4), y la semilla 1 cae en el extremo alto. En el equipo de 002/SC-007a no cambian (0,12 con y sin, 2.000
    partidos).
  - 003/SC-007, Matador: conversión en el mano a mano 36,8 % → 38,3 % (201 y 167 tiros). Es ruido de la semilla 1: con
    la tanda 2, semilla 5001, 24,8 % → 41,7 %, y semilla 10001, 27,1 % → 39,7 % (sin la tanda 2, semilla 1, 31,3 % →
    47,7 %). Con ~150–200 tiros por serie, el error de la diferencia es de ±5 puntos.
- T063, `umbral-motor`: 117,1 / 123,4 / 117,1 ms y 116,2 / 122,2 / 114,6 ms (sin fotogramas / `resolverResto` / con
  métricas). En la misma sesión, alternando cinco rondas de 20 partidos: 7.0.0 98,4 ms; 8.0.0 sin los bloques de la
  tanda 2, 109,1 ms; 8.0.0, 108,2 ms. La tanda 2 no añade coste medible (el marcador se busca en el mismo recorrido de
  siempre) y no hace falta la optimización prevista en R11; la 8.0.0 entera queda a +10,0 % de la 7.0.0, en el límite
  de SC-009, por lo que ya traía la tanda 1. `resolverResto` pasa del umbral absoluto de 120 ms, que esta máquina ya
  superaba con la 7.0.0 (T001).

### Pendiente de decisión tras la tanda 2

- **Tiros (002/SC-007a)**: (a) bajar el mínimo de 15 a 14,5; (b) compensar con el peso del tiro cerca del área
  (`tiro.pesoPorTramo`, un 3–4 % en los tramos del área) vigilando 003/SC-001, 003/SC-002 y SC-007; (c) suavizar US5
  (radio de marca entre 2 y 3 m: menos duelos y controles, y menos muestra para SC-004 y SC-005).
- **Propia puerta (003/SC-003)**: (a) ampliar a 1–4 % (en las ligas reales ronda el 3–4 %); (b) bajar
  `tiro.autogol` en la 8.0.0; (c) localizar antes el mecanismo con una sonda que separe despejes y desvíos.
- **Matador (003/SC-007)**: medir su conversión con más muestra (p. ej. 2.000 partidos solo para Matador) para que una
  semilla no lo tumbe; el efecto existe (+13 a +17 puntos con otras semillas).
- **015/SC-012**: (a) medirlo con varios equipos sintéticos (con seis equipos, la media es del 13,8 %); (b) contar sin
  penaltis ni faltas directas, con un umbral propio; (c) dejarlo pendiente hasta la tanda 3. El prototipo del remate
  repartido no basta por sí solo.
- **002/SC-008**: la tanda 2 la deja en +9,4 % (+8,0 % a +9,4 % según `bonusLibre`, ±0,65); sigue pendiente con
  003/SC-009.
