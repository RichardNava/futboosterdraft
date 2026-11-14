# Enfrentamientos del motor

Cómo usa el motor de partido (versión 7.0.0) las stats de cada jugador: qué stat se enfrenta a cuál en cada acción, con
qué probabilidad sale, qué la modifica y qué stats de la carta no se usan por separado. Sirve para decidir qué cambiar;
no es una especificación.

Escrito a mano el 2026-11-13 a partir del código (las referencias llevan a él). Si cambia el motor, puede quedar
desfasado: la fuente de verdad son los ficheros enlazados y los parámetros de
[`packages/domain/src/parametros/`](../../packages/domain/src/parametros/) (`v6.json` más los cambios de la 7.0.0 en
`index.ts`).

## 1. Cómo se juega una acción

Cada vez que un jugador tiene el balón pasan dos cosas:

1. **Elige qué hacer** (pase corto, pase largo, pase al espacio, conducción, regate, centro o tiro). Cada opción tiene
   un peso según la zona, la táctica y la situación (rival encima, espacio libre, compañeros desmarcados), y sus stats
   lo inclinan hacia lo que hace mejor (§5.1). Se elige al azar según esos pesos.
2. **Resuelve la acción** con un **duelo**: un atributo suyo contra un atributo del **rival concreto** que le sale al
   paso (§3). Ganar o perder decide si el pase llega, si el regate sale o si el tiro va a puerta.

Todo es individual: el pase de un mal pasador se resuelve con su stat de pase, sea cual sea la de sus compañeros. Lo
único colectivo está en §6.

## 2. La fórmula del duelo

[`acciones/duelo.ts`](../../packages/engine/src/acciones/duelo.ts):

> x = base de la acción + 0,04 × multiplicador × (atributo del atacante − atributo del defensor) + desplazamientos
>
> probabilidad de éxito = 0,5 + x / (2 × (1 + |x|)) + ajustes directos, entre el 3 % y el 97 %

- **Base de la acción**: lo fácil que es por sí misma (un pase corto es mucho más fácil que un regate). Está en
  `acciones` (§4).
- **0,04 por punto** (`duelo.pendiente`): cada 10 puntos de diferencia suman 0,4 a x. En los pases se multiplica por
  2,2 (`acciones.pendientePase`): 10 puntos suman 0,88.
- **Desplazamientos**: zona del campo, formaciones, tácticas y distancia de tiro (§3).
- **Ajustes directos**: virtudes que suman o restan puntos de probabilidad (§3).
- La curva no es la logística clásica sino una racional, que da lo mismo en cualquier máquina. Satura más despacio:

| x | −3 | −2 | −1 | −0,5 | 0 | +0,5 | +1 | +2 | +3 | +4 |
|---|---|---|---|---|---|---|---|---|---|---|
| Probabilidad | 12,5 % | 16,7 % | 25 % | 33 % | 50 % | 67 % | 75 % | 83 % | 87,5 % | 90 % |

Después del cálculo, la tirada: un número al azar de 0 a 999 contra la probabilidad en milésimas. Algunas virtudes
dan una segunda tirada (§3).

## 3. De la carta al atributo del partido

Cada carta tiene seis stats según su demarcación
([`catalogo/tipos.ts`](../../packages/domain/src/catalogo/tipos.ts)). El motor los traduce a doce atributos comunes
([`modificadores/atributos.ts`](../../packages/engine/src/modificadores/atributos.ts)):

| Atributo | Portero | Defensa | Medio | Delantero |
|---|---|---|---|---|
| pase | distribución | técnica | pase | creatividad |
| visión | distribución | técnica | visión | creatividad |
| regate | distribución × 0,6 | (técnica + velocidad) / 2 | técnica | regate |
| remate | 20 | (anticipación + técnica) / 2 − 8 | disparo | finalización |
| velocidad | agilidad × 0,8 | velocidad | velocidad | velocidad |
| quite | defensa | tackling | posicionamiento | agresividad × 0,8 |
| anticipación | colocación | anticipación | posicionamiento | agresividad × 0,8 |
| físico | aéreo | marcaje | (posicionamiento + velocidad) / 2 | agresividad |
| aéreo | aéreo | anticipación | posicionamiento × 0,85 | (finalización + desmarque) / 2 |
| desmarque | 20 | velocidad × 0,8 | visión | desmarque |
| centro | distribución × 0,7 | técnica | pase | creatividad |
| parada | (agilidad + colocación) / 2 | media × 0,5 | media × 0,5 | media × 0,5 |

**Modificadores**, en este orden, antes de cada duelo:

1. **Posición**: fuera de su sitio, todas sus stats bajan un porcentaje (p. ej. un delantero de defensa, −40 %; un
   medio en otra posición del centro del campo, 0–10 %). Tabla en `posicion` de `v6.json`.
2. **Bonificaciones en puntos**: virtudes de equipo y Provocador del rival.
3. **Cansancio**: el atributo se multiplica por (1 − cansancio). Desde el minuto 65 (55 con Presión alta) un jugador
   sin rasgos llega al 90' con un 27–33 % menos.
4. **Defectos de equipo**: Polémico, Rebelde y Estrellita multiplican.

## 4. Enfrentamientos por acción

Las probabilidades de los ejemplos son **sin ajustes**: zona propia o media, formaciones y tácticas neutras, sin
rasgos y sin cansancio. Cerca del área rival bajan (cada zona a partir de la 3 resta 0,13 a x).

### Regate

- **Atacante**: regate. **Defensor**: quite del rival más cercano. **Base**: −0,3.
- **Quién defiende**: el rival más cercano al balón, contando su radio de intervención (crece un 4 % por cada punto de
  quite y anticipación sobre 70, hasta ±40 %; [`contexto.ts`](../../packages/engine/src/acciones/contexto.ts)). Un buen
  defensor llega a más balones.

| Regate contra quite | Éxito |
|---|---|
| 98 contra 90 (Lamine Yamal contra Nuno Mendes) | 51 % |
| 98 contra 70 (Lamine Yamal contra Quenda) | 73 % |
| 66 contra 90 (Carlos Espí contra Nuno Mendes) | 22 % |
| 80 contra 80 | 38 % |
| 90 contra 60 | 74 % |

### Conducción

- **Atacante**: (velocidad + físico) / 2. **Defensor**: quite del rival más cercano. **Base**: 0,5.

| Atacante contra quite | Éxito |
|---|---|
| 85 contra 80 | 71 % |
| 70 contra 70 | 67 % |
| 60 contra 85 | 33 % |
| 90 contra 60 | 81 % |

### Pase corto, pase largo y pase al espacio

- **Atacante**: pase (corto) o visión (largo y al espacio). **Defensor**: anticipación del rival mejor situado en la
  línea del pase (el más cercano a ella, contando su radio de anticipación). **Bases**: corto 3; largo 0,9; al espacio
  0,3. La diferencia de stats pesa 2,2 veces más que en el resto.

| Pase contra anticipación | Corto | Largo | Al espacio |
|---|---|---|---|
| 95 contra 60 | 93 % | — | — |
| 90 contra 75 | 91 % | 84 % | 81 % |
| 70 contra 70 | 88 % | 74 % | 62 % |
| 55 contra 75 | 78 % | — | — |
| 60 contra 80 | — | 27 % | 20 % |
| 50 contra 90 | 33 % | — | — |

### Centro

- **Atacante**: centro. **Defensor**: anticipación del rival mejor situado entre el balón y el punto de remate.
  **Base**: 0.
- **A balón parado** (córner o falta lateral): el atacante es (centro del lanzador + aéreo del mejor rematador) / 2
  contra el aéreo del mejor defensor por arriba de los que están cerca
  ([`tiro.ts`](../../packages/engine/src/acciones/tiro.ts), `rematarBalonParado`).

| Centro contra anticipación | Éxito |
|---|---|
| 90 contra 70 | 72 % |
| 70 contra 70 | 50 % |
| 60 contra 85 | 25 % |

### Tiro (dos duelos seguidos)

[`tiro.ts`](../../packages/engine/src/acciones/tiro.ts), `tirar`:

1. **¿Va a puerta?** Remate (aéreo si es de cabeza) contra la anticipación (aéreo si es de cabeza) del rival que tapa
   el tiro. Bases: normal 0,5; cabeza 0; lejano −0,2; mano a mano 0,8; falta 0,6; penalti 1,6. Los penaltis, las
   faltas y los mano a mano no tienen a nadie que tape.
2. **¿Es gol?** Remate contra la parada del portero. Bases: normal 0,35; cabeza 0; lejano −0,5; mano a mano 0,05;
   falta 0,6; penalti 1,2.

En los dos, la distancia resta: 0,35 por cada 10 m a partir de 11 m, y 0,05 por grado de ángulo por debajo de 15°.

| Remate contra parada (segundo duelo) | Normal a 11 m | Normal a 20 m | Mano a mano | Cabeza | Penalti |
|---|---|---|---|---|---|
| 95 contra 60 | 82 % | — | — | — | — |
| 90 contra 80 | 71 % | 65 % | 66 % | 64 % | 81 % |
| 70 contra 70 | 63 % | 52 % | 52 % | 50 % | 77 % |
| 60 contra 90 | 27 % | 23 % | 23 % | 23 % | 50 % |

Lo que convierte un tiro en gol es el producto de los dos duelos. En la serie del informe de equilibrado acaban en
gol un 17,5 % de los tiros, porque la mayoría salen de lejos o con poco ángulo.

### Ajustes del duelo

[`modificadores/formacionTactica.ts`](../../packages/engine/src/modificadores/formacionTactica.ts),
[`modificadores/virtudes.ts`](../../packages/engine/src/modificadores/virtudes.ts) y `ajusteVirtudesAccion` en
[`acciones/juego.ts`](../../packages/engine/src/acciones/juego.ts):

- **Zona** (de 0, la propia área, a 5, el área rival): la zona 3 resta 0,13; la 4, 0,26; la 5, 0,39. El pase corto
  solo resta 0,13, y solo en las zonas 4 y 5.
- **Formación y táctica**: ofensividad de los dos equipos, Catenaccio, marcaje individual, Presión alta, Línea
  adelantada, Juego combinativo y Contraataque suman o restan a x según la acción y la zona.
- **Virtudes que suman probabilidad**: leve +4 puntos (Potente, Aura), media +8 (Primer toque, Elegante, Jugador
  entre líneas, Presionador en contra), alta +15 (Desbordante, Matador, Cabeceador, Lanzador de faltas y de penaltis…).
- **Virtudes que tocan el atributo**: Intimidante, −1 al rival; Infranqueable, +2 al quite frente a regates ≥ 95.
- **Segunda tirada**: Filigranas (regate) y Guante en el pie (centro) repiten si fallan; Muro defensivo y Santo
  obligan al atacante a ganar dos tiradas.
- **Relajación**: el que gana de mucho tira y progresa peor.

## 5. Otros usos individuales de las stats

Fuera de los duelos, las stats del jugador también cuentan aquí:

### 5.1 Qué acción elige

[`acciones/opciones.ts`](../../packages/engine/src/acciones/opciones.ts): el peso de cada opción se multiplica por
1 + k × (stat − 70) / 10, acotado:

| Stat | Inclina hacia | k | Mínimo | Máximo |
|---|---|---|---|---|
| regate (con un rival encima o poco espacio) | regatear y conducir | 0,4 | ×0,6 | ×2,2 |
| (velocidad + físico) / 2 (con espacio) | conducir | 0,4 | ×0,7 | ×1,6 |
| pase | pasar | 1,2 | ×0,5 | ×4,5 |
| visión | pase al espacio | 0,25 | ×0,6 | ×1,75 |
| remate | tirar | 0,45 | ×0,5 | ×1,65 |

Un jugador con 90 de pase pasa unas 3,4 veces más (en peso) que uno con 70; uno con 55, la mitad.

### 5.2 A quién pasa y quién defiende

- **A quién pasa** ([`receptor.ts`](../../packages/engine/src/acciones/receptor.ts)):
  - Cuanto mejor pasador es el que tiene el balón, más peso tienen los compañeros por delante (1 + 1,2 × (pase − 70)
    / 10, entre ×0,5 y ×4,5).
  - Los compañeros que mejor pasan reciben más: su peso se multiplica por 2^(1,2 × (su pase − 70) / 10), acotado.
  - Con visión alta casi nunca busca a un compañero en fuera de juego.
- **Quién defiende**: el radio de intervención (quite y anticipación) decide qué rival disputa cada duelo (§4,
  Regate).

### 5.3 Movimiento y mano a mano

- **Velocidad de carrera**: de 1,8 a 3,6 m por tick (un tick es un segundo del reloj del partido) según la stat de
  velocidad (de 50 a 95), menos con el balón y con cansancio ([`espacio/movimiento.ts`](../../packages/engine/src/espacio/movimiento.ts)). Llegar antes a un balón
  suelto depende de esto.
- **Mano a mano**: la distancia de disparo es 14 m + 3 m por cada 10 puntos de remate sobre 70; con visión alta se
  equivoca menos de decisión ([`acciones/manoAMano.ts`](../../packages/engine/src/acciones/manoAMano.ts)).

## 6. Lo que es colectivo

- **Ritmo de pase**: el tiempo de control antes de un pase depende de la media del pase de los medios del equipo, no
  del que pasa (`controlPorRitmo` en [`acciones/juego.ts`](../../packages/engine/src/acciones/juego.ts)).
- **Bonificaciones de equipo** de algunas virtudes (puntos por demarcación) y los multiplicadores de los defectos de
  equipo (§3).
- **Formación y táctica** (§4, Ajustes).

## 7. Stats de la carta que no se usan por separado

| Stat | Demarcación | Uso actual |
|---|---|---|
| liderazgo | Portero, Defensa | Solo en la media de la carta. |
| desmarque | Delantero | Solo dentro del aéreo. El atributo «desmarque» existe pero ninguna acción lo usa. |
| marcaje | Defensa | Solo como «físico», que en un defensa casi solo cuenta cuando conduce él. No se enfrenta al desmarque. |
| agresividad | Delantero | Su quite, su anticipación y su físico (cuando defiende o conduce). |
| técnica | Defensa | Pase, visión, centro y la mitad del regate; no reduce las pérdidas. |
| técnica | Medio | Su regate. |
| posicionamiento | Medio | Quite, anticipación, parte del físico y del aéreo: es casi toda su defensa. |
| aéreo | Defensa | No existe: el juego aéreo de un defensa es su anticipación. |

## 8. Para decidir

Frente a lo propuesto el 2026-11-13 («que cada stat se enfrente individualmente a la del defensor»):

- **Ya funciona así**: regate contra quite, pase contra anticipación, remate contra parada, centro contra
  anticipación y aéreo contra aéreo, con el jugador concreto que defiende.
- **Falta**:
  - Desmarque contra marcaje: ganar o perder la posición antes de recibir.
  - Técnica contra presión: perder menos balones en el control.
  - Liderazgo: que los defensas de alrededor se descoloquen menos.
  - El remate usa una sola stat (finalización o disparo), no la combinación de las dos.
  - El aéreo del defensa sale de su anticipación.
- **La sensibilidad**: con 0,04 por punto, 24 puntos de diferencia en un regate pasan del 38 % (iguales) al 22 %. Si
  se quiere más distancia entre un 66 y un 90, hay que subir la pendiente acción por acción.
- **La comprobación de equilibrado (014/SC-008)** mide equipos enteros con +15, no duelos. Una versión fiel a esta
  idea mediría curvas por duelo, p. ej. «regate 98 contra quite 90: 45–55 %; 66 contra 90: ≤ 25 %».
- **Coste de cálculo**: un duelo es una resta, una multiplicación y una división, unos cientos por partido. Añadir
  enfrentamientos no se nota en el tiempo de simulación; lo que cuesta es volver a calibrar goles, pases y tácticas.
