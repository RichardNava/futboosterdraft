# Contrato — Tabla de rasgos (`packages/domain/src/catalogo/rasgos.ts`)

Fuente única de las virtudes y los defectos (research R8). El documento `docs/juego/virtudes-y-defectos.md` se genera
a partir de esta tabla. Aquí se fijan la forma, los **impactos iniciales** y las **incompatibilidades**. Los textos de
`nombre` y `descripcion` de las virtudes existentes se toman de `apps/server/src/http/textosSpecials.ts` sin cambios.

## Forma

```ts
type Rasgo = Virtud | Defecto;
interface DefinicionRasgo {
  id: Rasgo;
  tipo: 'virtud' | 'defecto';
  ambito: 'generico' | Demarcacion;
  nombre: string;        // con tildes
  descripcion: string;   // para el participante
  efecto: string;        // regla exacta en el partido
  activacion: string;
  acumulacion: string;
  incompatibles: readonly Rasgo[];
  impacto: number;       // 0..1, dos decimales
}
export const RASGOS: Readonly<Record<Rasgo, DefinicionRasgo>>;
export const DEFECTOS: readonly Defecto[];
export const TODAS_LAS_VIRTUDES: readonly Virtud[];
export function rasgo(id: Rasgo): DefinicionRasgo;
```

## Impactos iniciales

Estimación de diseño. Se valida con la comprobación `impacto` de `balance` (R13) y se ajusta si el orden medido no es
coherente (FR-051).

**Escala**:

- **Virtudes**: 1 = máximo beneficio.
- **Defectos**: 0 = máximo perjuicio, 1 = apenas perjudica.

### Virtudes

| Virtud | Ámbito | Impacto | Motivo |
|---|---|---|---|
| Capitania | genérico | 0,80 | +1 a todo el once |
| FortalezaMental | genérico | 0,60 | +2 a todo el once, solo yendo por detrás |
| Aura | genérico | 0,55 | más éxito en todas sus acciones |
| Incansable | genérico | 0,45 | menos cansancio propio |
| Motivador | genérico | 0,55 | menos cansancio de todos |
| LanzadorPenalties | genérico | 0,35 | situacional |
| LanzadorFaltas | genérico | 0,40 | situacional |
| Filigranas | genérico | 0,50 | reroll de regate |
| Intimidante | genérico | 0,45 | −1 al rival de cada duelo |
| Elegante | genérico | 0,40 | |
| Presionador | genérico | 0,45 | |
| RecuperadorTrasPerdida | genérico | 0,40 | |
| Carismatico | genérico | 0,30 | |
| Potente | genérico | 0,45 | |
| Robusto | genérico | 0,30 | menos lesiones |
| DeAcero | genérico | 0,40 | nunca se lesiona |
| Versatil | genérico | 0,25 | −5 puntos de penalización fuera de posición |
| FairPlayer | genérico | 0,30 | nunca ve la roja |
| Revulsivo | genérico | 0,30 | +5 % al entrar desde el banquillo |
| Parapenalties | POR | 0,35 | |
| OneToOne | POR | 0,55 | |
| Santo | POR | 0,60 | reroll en los momentos clave |
| Ordenabarreras | POR | 0,35 | |
| JugadorDeCampo | POR | 0,30 | |
| Infranqueable | DEF | 0,45 | |
| Jerarquia | DEF | 0,55 | +1 a la defensa |
| Volador | DEF | 0,40 | |
| Libero | DEF | 0,65 | +2 al mediocampo |
| MuroDefensivo | DEF | 0,50 | |
| Llegador | MED | 0,50 | |
| BoxToBox | MED | 0,60 | +1 a defensa y ataque |
| PrimerToque | MED | 0,45 | |
| Todocampista | MED | 0,50 | sin penalización fuera de posición |
| JugadorEntreLineas | MED | 0,45 | |
| Matador | DEL | 0,65 | |
| Rematador | DEL | 0,55 | |
| Cabeceador | DEL | 0,50 | |
| Desbordante | DEL | 0,45 | |
| GuanteEnElPie | DEL | 0,50 | |

### Defectos

| Defecto | Impacto | Motivo |
|---|---|---|
| Polemico | 0,25 | −5 % a todo el once yendo por detrás |
| Rebelde | 0,40 | −5 % a todo el once desde el banquillo; evitable si no se convoca |
| Estrellita | 0,35 | −10 % propio si no es el mejor |
| Agresivo | 0,40 | rojas × 2: jugar con 10 |
| MalDefensor | 0,40 | |
| Chupon | 0,45 | |
| Fragil | 0,50 | lesiones × 3 |
| DeCristal | 0,55 | lesiones siempre largas |
| Fatigado | 0,55 | se cansa desde el minuto 46 |
| Indisciplinado | 0,60 | cansancio × 1,5 |
| Canchero | 0,60 | más faltas y penaltis en contra |
| Impulsivo | 0,65 | amarillas × 2 |
| Torpe | 0,70 | autogoles × 2 (sobre una base baja) |
| Inflexible | 0,75 | +5 puntos de penalización fuera de posición |
| Provocador | 0,85 | solo frente a rivales GOAT |

## Incompatibilidades (simétricas)

| Rasgo | Incompatible con |
|---|---|
| DeAcero | Fragil, DeCristal |
| Robusto | Fragil |
| FairPlayer | Agresivo |
| Versatil | Inflexible |
| Todocampista | Inflexible |
| Incansable | Fatigado, Indisciplinado |
| Versatil | Todocampista (redundantes) |

## Textos de las virtudes nuevas y de los defectos

| Id | `nombre` | `descripcion` |
|---|---|---|
| DeAcero | De acero | Nunca se lesiona. |
| Versatil | Versátil | Jugando fuera de su posición, su penalización es 5 puntos menor. |
| FairPlayer | Fair player | Nunca ve la tarjeta roja. |
| Revulsivo | Revulsivo | Si entra desde el banquillo, su media sube un 5 % el resto del partido. |
| Agresivo | Agresivo | Duplica su probabilidad de ver la roja directa. |
| Impulsivo | Impulsivo | Duplica su probabilidad de ver la amarilla. |
| Fragil | Frágil | Se lesiona con mucha más facilidad. |
| Fatigado | Fatigado | Empieza a cansarse al comenzar la segunda parte. |
| Polemico | Polémico | Si su equipo va perdiendo, su actitud baja un 5 % la media de todo el equipo. |
| Indisciplinado | Indisciplinado | Se cansa más rápido. |
| Canchero | Canchero | Comete faltas y penaltis con más frecuencia. |
| Rebelde | Rebelde | Desde el banquillo, su malestar baja un 5 % la media de todo el equipo. |
| Torpe | Torpe | Marca en propia puerta con más frecuencia. |
| Provocador | Provocador | Motiva a los rivales GOAT: +1 a su media mientras está en el campo. |
| DeCristal | De cristal | Cuando se lesiona, siempre es de larga duración. |
| Estrellita | Estrellita | Si no es el mejor de su equipo en el campo, se desmotiva: −10 % a su media. |
| Chupon | Chupón | Apenas pasa el balón a sus compañeros. |
| Inflexible | Inflexible | Jugando fuera de su posición, su penalización es 5 puntos mayor. |
| MalDefensor | Mal defensor | Apenas participa en las acciones defensivas. |
