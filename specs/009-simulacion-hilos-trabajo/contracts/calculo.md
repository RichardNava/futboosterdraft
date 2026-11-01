# Contrato: cálculo de partidos (interno del servidor)

**Spec**: [../spec.md](../spec.md) | **Research**: [../research.md](../research.md) R2–R7

La API HTTP, el protocolo WebSocket y el esquema de base de datos **no cambian**. Este contrato es la frontera nueva
dentro de `apps/server`: entre los actores (hilo principal) y el cálculo (hilo de trabajo o en proceso).

## 1. Servicio `Calculo`

Se añade a `ServiciosPartida` (`apps/server/src/actores/servicios.ts`) como `calculo`.

```ts
type Prioridad = 'humano' | 'npc';

interface Calculo {
  /** Número de hilos; 0 = modo en proceso. */
  readonly hilos: number;
  ejecutar<N extends NombreCalculo>(
    nombre: N,
    args: Parameters<Funciones[N]>,
    prioridad: Prioridad,
  ): Promise<ReturnType<Funciones[N]>>;
  /** Termina los hilos y rechaza lo pendiente (al cerrar el servidor). */
  cerrar(): Promise<void>;
}
```

- **Modo en proceso** (`hilos = 0`): `ejecutar` llama a la función **de forma síncrona** y devuelve su resultado (o su
  excepción) en una promesa. Sin copias: el comportamiento es el de antes de la spec (FR-013).
- **Modo grupo** (`hilos ≥ 1`): encola, asigna a un hilo libre (`humano` antes que `npc`, FIFO dentro de cada una) y
  resuelve con la copia del resultado. Errores:
  - excepción de la función → `Error` con su `message`, `name` y `stack`; sin reintento;
  - caída del hilo o más de 20 s → hasta 2 reintentos; después `ErrorCalculo { nombre, motivo: 'caida' | 'tiempo',
    intentos }`;
  - `cerrar()` → `ErrorCalculo { motivo: 'cerrado' }`.
- Quien llama **no debe mutar** los argumentos entre `ejecutar` y la respuesta (en el grupo se copian al enviar, en
  proceso no): todos los llamadores están dentro de un comando del actor, que ya lo garantiza.

## 2. Tabla de funciones (`apps/server/src/simulacion/funciones.ts`)

Funciones puras, sin E/S ni acceso a `ControladorPartida`. Argumentos y resultados son datos planos clonables.

| Nombre | Firma | Lo usa | Prioridad |
|--------|-------|--------|-----------|
| `avanzar` | `(estado: EstadoMotor, modo: ModoAvance, opciones?: OpcionesAvance) => ResultadoTramo` | `jugarTramo('parte')`, `avanzar2D` | humano |
| `jugarHastaElFinal` | `(estado, niveles: NivelesPartido, semilla) => ResultadoTramo` | `jugarTramo('final')`: NPC contra NPC, plazo, `forzarFinal` | npc |
| `resolverResto` | `(estado, niveles, semilla) => ResultadoResolverResto` | `resolverPartidoEntreHumanos` (humano si `apertura`, npc si `plazo`), `terminarPartidoEntreHumanosEnJuego` (npc) | según caso |
| `resolverRestoPorTramos` | `(estado, niveles, semilla) => ResultadoTramo[]` | `procesarFinalizar` (sustituye al callback `alTramo`) | humano |
| `decidirAlineacion` | los argumentos de `@fbd/ai` `decidirAlineacion` sin `opciones.ahora` | `alineacionParaPartido` (humano si abre un humano, npc si no) | según caso |
| `rehacer` | `(fila: Pick<FilaPartido, 'entrada' \| 'versionParametros' \| 'decisiones'>, conFotogramas: boolean) => Tramos` | `reproduccion` (se mueve aquí desde `partidoEntreHumanos.ts`) | humano |

`parametros` viaja dentro de `EstadoMotor` y de las opciones de `decidirAlineacion`, como hoy; `rehacer` los obtiene
con `parametrosPorVersion`.

## 3. Mensajes entre hilos (`apps/server/src/simulacion/hilo.ts`)

```ts
// principal → hilo
{ id: number; nombre: NombreCalculo; args: unknown[] }
// hilo → principal
{ id: number; ok: true; valor: unknown }
| { id: number; ok: false; error: { name: string; message: string; stack?: string } }
```

El hilo atiende un mensaje cada vez (el grupo no le envía otro hasta recibir la respuesta).

## 4. Configuración

| Dónde | Nombre | Valores |
|-------|--------|---------|
| Entorno (`main.ts`) | `HILOS_SIMULACION` | vacío → `max(1, availableParallelism() - 1)`; `0` → en proceso (aviso); entero ≥ 1 → ese tamaño; otro → por defecto (aviso) |
| `ConfigServidor` | `hilosSimulacion?: number` | por defecto **0** (los tests no cambian) |
| Tests de integración | `HILOS_SIMULACION_PRUEBAS` | por defecto 0; `test:integration:hilos` usa 2 |

## 5. Métricas (`GET /metrics`)

| Métrica | Tipo | Etiquetas |
|---------|------|-----------|
| `hilos_simulacion` | gauge | — |
| `calculos_en_espera` | gauge | `prioridad` |
| `calculo_duracion_ms` | histograma (10…20 000) | `funcion` |
| `calculos_fallidos_total` | contador | `motivo`: `caida` \| `tiempo` \| `error` |
| `calculo_reintentos_total` | contador | — |
