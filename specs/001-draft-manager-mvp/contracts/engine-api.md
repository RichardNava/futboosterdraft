# Contrato del motor de simulación (`packages/engine`)

Interfaz interna que comparten la modalidad rápida, la 2D, la herramienta `balance` y los NPC
(Principio V: un único motor). El motor es **puro**: no hace E/S, no usa reloj ni `Math.random`, y
con la misma entrada siempre devuelve la misma salida (FR-032, FR-040).

## Entrada

```ts
interface EntradaPartido {
  version: string;                 // versión de ParametrosEquilibrado
  parametros: ParametrosEquilibrado;
  semilla: string;                 // 128 bits en hex
  eliminatoria: boolean;           // prórroga y penaltis (FR-041)
  local: EquipoPartido;
  visitante: EquipoPartido;
}

interface EquipoPartido {
  participanteId: string;
  formacion: FormacionId;
  titulares: { casillaId: string; jugador: Jugador }[];   // 11
  suplentes: Jugador[];                                     // 0..7
  tactica: Tactica;
  lanzadores: { penaltis: number; faltas: number; corners: number; tanda: number[] };
}
```

## Operación

```ts
function crearPartido(entrada: EntradaPartido): EstadoMotor;

// Avanza hasta el siguiente punto de decisión permitido según el modo:
//  - 'parte'        → hasta el descanso, el final, el inicio de la prórroga o la tanda (rápida)
//  - 'interrupcion' → hasta la siguiente interrupción del juego (2D)
//  - 'final'        → hasta el final sin pausas (NPC contra NPC, resolución automática, balance)
function avanzar(estado: EstadoMotor, modo: 'parte' | 'interrupcion' | 'final', opciones?: { fotogramas: boolean }): ResultadoTramo;

// Valida y encola una decisión; se aplica al empezar el siguiente tramo.
function aplicarDecision(estado: EstadoMotor, d: DecisionPartido): { ok: true } | { ok: false; codigo: string };

interface ResultadoTramo {
  estado: EstadoMotor;            // nuevo estado (inmutable o copiado)
  desdeTick: number; hastaTick: number;
  eventos: EventoPartido[];
  fotogramas?: Fotograma[];       // solo si se piden (2D); no afectan al resultado
  marcador: Marcador;
  estadisticas: Estadisticas;
  fase: 'primera_parte' | 'descanso' | 'segunda_parte' | 'pre_prorroga' | 'prorroga' | 'penaltis' | 'finalizado';
}

// Utilidad de dominio que también usa la pantalla de alineación (FR-028)
function statsEfectivos(jugador: Jugador, casilla: Casilla, contexto: ContextoEquipo, p: ParametrosEquilibrado): StatsEfectivos;
```

## Invariantes comprobados por pruebas

1. **Determinismo**: `avanzar(crearPartido(e), 'final')` es idéntico, bit a bit, en eventos y marcador para la misma `e`.
2. **Equivalencia entre modalidades (SC-008)**: con la misma entrada y la misma secuencia de decisiones (mismo `aplicadaEnTick`), estos dos caminos producen la misma lista de eventos y el mismo marcador, y pedir fotogramas no cambia el resultado:
   - encadenar `avanzar(..., 'interrupcion')`;
   - encadenar `avanzar(..., 'parte')`, aplicando cada decisión en el tick equivalente.
3. **Reglas**:
   - Nunca hay más de 5 (o 6) sustituciones.
   - Un expulsado no vuelve al campo.
   - Un equipo con menos de 7 jugadores pierde 3-0 (Edge Cases).
   - Los specials de equipo no se acumulan (FR-038).
   - El cansancio empieza en el minuto 65, o en el 55 con Presión alta (FR-036).
4. **Eventos**: cada `EventoPartido` con `relevante: true` aparece en el resumen de la modalidad rápida (FR-044).
