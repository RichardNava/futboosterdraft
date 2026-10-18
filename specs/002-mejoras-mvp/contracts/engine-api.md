# Contrato del motor de simulación — cambios de la spec 002

Sobre [001/contracts/engine-api.md](../../001-draft-manager-mvp/contracts/engine-api.md). El motor sigue siendo **puro**: sin E/S, sin reloj y sin `Math.random`. Además, la capa espacial no usa coma flotante en las decisiones (research R3).

## Entrada

```ts
interface EquipoPartido {
  participanteId: string;
  formacion: FormacionId;                                   // formación de partida (FR-034)
  titulares: { casillaId: string; jugador: Jugador; ancla?: { x: number; y: number } }[];  // 11
  //                                                         ^ NUEVO: punto de la colocación (coordenadas del equipo).
  //                                                           Si falta, es la zona de la casilla.
  suplentes: Jugador[];
  tactica: Tactica;
  lanzadores: Lanzadores;
}
```

`EntradaPartido` no cambia. Debe llevar `parametros.version` ≥ 2.0.0. Con una versión 1.x, `crearPartido` lanza `VERSION_NO_SOPORTADA`.

## Operaciones

```ts
function crearPartido(entrada: EntradaPartido): EstadoMotor;
function avanzar(estado: EstadoMotor, modo: 'parte' | 'interrupcion' | 'final' | 'ticks', opciones?: { fotogramas?: boolean; hastaTick?: number }): ResultadoTramo;
// NUEVO modo 'ticks': para en `hastaTick` o en la siguiente interrupción, lo que llegue antes. Parar en un tick no
// es una interrupción: las decisiones solo se aplican en interrupciones y la secuencia del PRNG no cambia (research R6).
function aplicarDecision(estado: EstadoMotor, d: DecisionPartido | DecisionRegistrada): ResultadoDecision;

interface ResultadoTramo {
  estado: EstadoMotor;
  desdeTick: number; hastaTick: number;
  eventos: EventoPartido[];
  acciones: AccionVisible[];        // NUEVO: acciones con balón del tramo (data-model §7.5); siempre presentes
  fotogramas?: number[][];          // CAMBIA: formato v2 compacto, cada 2 ticks (data-model §7.5)
  ordenJugadores?: number[];        // NUEVO: con fotogramas; orden de los pares (x, y)
  marcador: Marcador;
  estadisticas: Estadisticas;       // CAMBIA: + centros, precisionPase; `pases` sin centros
  fase: Fase;
}
```

**Decisiones**:
- `recolocacion` admite `datos.colocacion?: { jugadorId, x, y }[]`.
- `formacion` restablece las anclas a las casillas de la nueva formación, salvo que traiga `colocacion`.

**Dominio** (`@fbd/domain`, reexportado por el motor):

```ts
function penalizacionPorPosicion(j: Jugador, destino: { posicionesAdmitidas: readonly Posicion[] }, p: ParametrosEquilibrado): number;
function statsEfectivos(j: Jugador, destino: { posicionesAdmitidas: readonly Posicion[] }, p: ParametrosEquilibrado, ctx?: ContextoStats): StatsEfectivos;
function zonaEn(x: number, y: number): Zona;
function previsualizar(a: Alineacion, buscar: (id: number) => Jugador, p: ParametrosEquilibrado): Previsualizacion;
//   Previsualizacion = { titulares: (StatsEfectivos & { jugadorId, casillaId, posicionEfectiva, zonaId, x, y })[],
//                        personalizada, reparto: { defensa, medio, ataque }, ofensividad, amplitud, avisos: string[] }
```

## `@fbd/ai`: resolución del resto del partido

```ts
// Encadena avanzar('parte'), con decidirNPCEnPausa en cada parada para los lados de `niveles`, hasta 'finalizado'
// (prórroga y tanda incluidas). Cierra las ventanas de decisión del humano sin cambios. Lo usan:
// «Finalizar partido», el vencimiento del plazo, los partidos entre humanos y los NPC contra NPC (research R7).
function resolverResto(estado: EstadoMotor, niveles: NivelesPartido, semilla: string): { estado: EstadoMotor; eventos: EventoPartido[]; tramos: Omit<ResultadoTramo, 'estado'>[] };
```

Partido entre humanos: `niveles = { local: p.asincrono.nivelDecisiones, visitante: p.asincrono.nivelDecisiones }` (research R8).

## Invariantes comprobados por pruebas

Se mantienen los cuatro de la spec 001 (determinismo, equivalencia entre modalidades, reglas, eventos relevantes). Se añaden:

5. **Finalizar es equivalente** (SC-010): para cualquier tick de corte `t` (0, 30', descanso, 89', prórroga) y la misma lista de decisiones, se comparan estos dos caminos, que deben dar los mismos eventos, el mismo marcador y las mismas estadísticas:
   - encadenar `avanzar('interrupcion')` hasta `t` y después `resolverResto`;
   - encadenar `avanzar('interrupcion')` hasta el final, con `decidirNPCEnPausa` en las paradas.
6. **Cinemática** (sustituto automático de SC-007a), en 50 partidos con semilla:
   - ninguna chapa supera su velocidad ni su aceleración máximas de `parametros.espacio`;
   - ninguna pareja de chapas queda más cerca que el radio de separación durante más de 2 ticks seguidos;
   - el balón solo cambia de posición dentro de una `AccionVisible` o pegado a su portador;
   - en fase defensiva, como mucho 2 jugadores del equipo sin balón tienen como objetivo el balón, salvo en una presión coordinada marcada en el estado.
6b. **Cortes por ticks inocuos**: encadenar `avanzar('ticks', { hastaTick })` con cortes arbitrarios da los mismos eventos, acciones, marcador y estado final que encadenar `avanzar('interrupcion')`.
7. **Fotogramas inocuos**: `avanzar(e, m, { fotogramas: true })` y `avanzar(e, m)` dan el mismo `estado` (salvo la salida) y los mismos eventos y acciones.
8. **Colocación**:
   - con la colocación de la propia formación, `ofensividad` y `amplitud` son las de la tabla de la spec 001;
   - con un delantero más y un defensa menos, la ofensividad aumenta en 2.
9. **Penalización** (SC-012): una prueba con tabla recorre todas las combinaciones de posición de origen y de destino y compara el resultado con FR-031 y FR-032.

## Rendimiento (research R3)

| Medida | Objetivo |
|--------|----------|
| Partido completo sin fotogramas | ≤ 25 ms de CPU (Node 22) |
| Partido completo con fotogramas | ≤ 40 ms |
| `resolverResto` desde el minuto 0 | ≤ 30 ms |
