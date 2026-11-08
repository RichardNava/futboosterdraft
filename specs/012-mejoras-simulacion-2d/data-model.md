# Data Model: Mejoras de la simulación 2D, control de bajas y retoques del torneo

Fase 1 del [plan](plan.md). Decisiones en [research.md](research.md).

## 1. Migración `0015_spec012.sql`

| Tabla | Cambio | Para |
|-------|--------|------|
| `cosmeticos` | `cosmeticos_tipo_ck` admite `'celebracion'`; columna `datos jsonb` (null salvo celebraciones) | FR-010, FR-010a |
| `perfiles_usuario` | `celebracion text` (FK `cosmeticos.id`, null = la del juego); `modo_incidencias text not null default 'automatico'` con check | FR-011, FR-020 |
| `participantes` | `celebracion text` (FK); `modo_incidencias text not null default 'automatico'` con check | FR-012, FR-020 |
| `avisos` | `avisos_tipo_ck` admite `'baja_sustituida'` | FR-030 |

Check de `modo_incidencias`: `in ('automatico','control_total')`. Los packs no cambian (no hay packs de celebraciones).

## 2. Celebración de gol (cosmético)

`packages/domain/src/cosmeticos/tipos.ts`:

```ts
export type TipoCosmetico = 'escudo' | 'sobre' | 'celebracion';

export interface DatosCelebracion {
  clase: 'juego' | 'secuencia';
  /** Duración a ×1. Las de juego, ≤ 3000 (FR-009). */
  duracionMs: number;
  /** Efecto de sonido propio (solo secuencias); si falta, suena el del gol. */
  sonido?: string;
}

export const CELEBRACION_DEL_JUEGO = 'celebracion-clasica';
```

Validación (seed y dominio): `datos` obligatorio si `tipo = 'celebracion'` y prohibido en los demás;
`clase = 'juego'` ⇒ `duracionMs ≤ 3000` y el id existe en el registro del cliente (lo comprueba un test web).

Entradas de `data/cosmeticos.json` (todas `gratuito: true`):

| id | clase | activo |
|----|-------|--------|
| `celebracion-clasica` (la del juego, por defecto) | juego | sí |
| `celebracion-estadio` | juego | sí |
| `celebracion-neon` | juego | sí |
| `celebracion-pizarra` | juego | sí |
| `celebracion-prueba-secuencia` | secuencia | **no** (solo pantalla de pruebas, FR-010a) |

Los nombres y estilos concretos de las 3 adicionales se deciden al implementar; deben ser visualmente distintos.

## 3. Modo de gestión de incidencias

- Valores: `automatico` (por defecto) | `control_total`.
- Cuenta: `perfiles_usuario.modo_incidencias`. Partida: `participantes.modo_incidencias` (copia al unirse; se cambian
  los dos a la vez, como `ultima_modalidad`).
- Motor: `EquipoEstado.controlTotal: boolean` (estado de ejecución, no forma parte de `EntradaPartido`).
- Solo tiene efecto si el partido es contra un NPC con un único humano (FR-024).

## 4. Incidencia de partido (motor)

`packages/engine/src/estado/estado.ts`:

```ts
export interface Incidencia {
  lado: Lado;
  jugadorId: number;
  motivo: 'lesion' | 'expulsion';
  tick: number;
  minuto: string;
  /** Casilla y ancla que dejó vacías (para sustituir al lesionado en su sitio). */
  casillaId: string | null;
  ancla?: { x: number; y: number };
  estado: 'pendiente' | 'resuelta_participante' | 'resuelta_automatica';
}

// EstadoMotor
incidencias: Incidencia[];   // todas las del partido (historial)
```

Transiciones: `pendiente` → `resuelta_participante` (hubo al menos una decisión de su equipo en esa parada) o
`resuelta_automatica` (automático, NPC, sin decisiones o ventana vencida). Una incidencia solo provoca parada si
`controlTotal` y quedan ≥ 7 jugadores y la fase no es `penaltis` ni `finalizado`.

`ResultadoTramo` añade `incidencias?: Incidencia[]` (las pendientes que han cortado el tramo).

## 5. Alineación confirmada y bajas pendientes

Sin cambios de tabla: la alineación confirmada ya es la última guardada (`repoEquipo.ultimaAlineacion`).

Vista de equipo (`vistaEquipo`) añade:

```ts
bajasPendientes: { jugadorId: number; motivo: 'lesion' | 'sancion'; partidosRestantes: number }[];
sinSuplentes: boolean;        // true ⇒ no bloquea (FR-029)
avisosEquipo: AvisoEquipo[];
```

```ts
interface AvisoEquipo {
  nivel: 'intervencion' | 'informativo';
  tipo: 'baja_pendiente' | 'lesionado' | 'sancionado' | 'disponible' | 'baja_sustituida';
  jugadorId: number;
  motivo?: string;              // gravedad de la lesión o motivo de la sanción
  partidosRestantes?: number;
  enlace?: 'formacion';         // solo baja_pendiente
}
```

Regla del bloqueo: `bloqueado = bajasPendientes.length > 0 && !sinSuplentes`. Un jugador que vuelve de su baja no
entra solo en la alineación.

## 6. Aviso guardado nuevo

`TipoAviso` (servidor y `BandejaAvisos`) añade `'baja_sustituida'`: «Pérez (lesionado) no jugaba: entró García al
vencer el plazo». Nivel informativo.

## 7. Plantillas

Cada `PlantillaParticipante` añade `nombreEquipo: string`, `escudo: string | null` y `color: string` (para la chapa).
