# Enfrentamientos del motor

Cómo usa el motor de partido (versión 9.0.0, spec 018) las stats de cada jugador: qué stat se enfrenta a cuál en cada
acción, con qué probabilidad sale, qué la modifica y qué stats de la carta no se usan por separado. Sirve para decidir
qué cambiar; no es una especificación. La 9.0.0 conserva los duelos de la 8.0.0 y cambia la fatiga (§6) y las tácticas
(§7). Lo marcado «8.0.0» sigue vigente; las notas de la 7.0.0 son historia: los partidos 7.x y 8.x ya no se reproducen,
solo conservan su resumen.

Escrito a mano el 2026-11-13 a partir del código (las referencias llevan a él), puesto al día con la 8.0.0 el
2026-11-16 y con la 9.0.0 el 2026-11-26. Si cambia el motor, puede quedar desfasado: la fuente de verdad son los ficheros
enlazados y los parámetros de [`packages/domain/src/parametros/`](../../packages/domain/src/parametros/) (`v6.json` más
los cambios de cada versión en `index.ts`; la 8.0.0 añade `curvas`, `quite`, `aereo`, `desmarque`, `controlPresion`,
`liderazgo` y los de los añadidos, y la 9.0.0, `fatiga` y los valores de `tacticas`). Las cifras medidas salen de
[`linea-base-9.0.0.md`](../../specs/018-rework-motor/linea-base-9.0.0.md) y del
[informe de la 9.0.0](../../specs/018-rework-motor/informe-9.0.0.md).

## 1. Cómo se juega una acción

Cada vez que un jugador tiene el balón pasan dos cosas:

1. **Elige qué hacer** (pase corto, pase largo, pase al espacio, conducción, regate, centro o tiro). Cada opción tiene
   un peso según la zona, la táctica y la situación (rival encima, espacio libre, compañeros desmarcados), y sus stats
   lo inclinan hacia lo que hace mejor (§5.1). Se elige al azar según esos pesos.
2. **Resuelve la acción** con un **duelo**: un atributo suyo contra un atributo del **rival concreto** que le sale al
   paso (§3). Ganar o perder decide si el pase llega, si el regate sale o si el tiro va a puerta.

Todo es individual: el pase de un mal pasador se resuelve con su stat de pase, sea cual sea la de sus compañeros. Lo
único colectivo está en §8.

## 2. La fórmula del duelo

[`acciones/duelo.ts`](../../packages/engine/src/acciones/duelo.ts):

> x = base de la acción + 0,04 × multiplicador × (atributo del atacante − atributo del defensor) + desplazamientos
>
> probabilidad de éxito = 0,5 + x / (2 × (1 + |x|)) + ajustes directos, entre el 3 % y el 97 %

- **Base de la acción**: lo fácil que es por sí misma (un pase corto es mucho más fácil que un regate). Está en
  `acciones` (§4).
- **0,04 por punto** (`duelo.pendiente`): cada 10 puntos de diferencia suman 0,4 a x. Cada acción tiene su
  multiplicador: con la 8.0.0 (`curvas`), regate ×1,1, conducción ×1,15 y pase corto ×1,27; el pase largo y el pase al
  espacio, ×2,2 (`acciones.pendientePase`: 10 puntos suman 0,88), y el resto, ×1. Con la 7.0.0, todos los pases ×2,2.
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
([`catalogo/tipos.ts`](../../packages/domain/src/catalogo/tipos.ts)). El motor los traduce a quince atributos comunes
([`modificadores/atributos.ts`](../../packages/engine/src/modificadores/atributos.ts)):

| Atributo | Portero | Defensa | Medio | Delantero |
|---|---|---|---|---|
| pase | distribución | técnica | pase | creatividad |
| visión | distribución | técnica | visión | creatividad |
| regate | distribución × 0,6 | (técnica + velocidad) / 2 | técnica | regate |
| remate | 20 | (anticipación + técnica) / 2 − 8 | disparo | finalización |
| velocidad | agilidad × 0,8 | velocidad | velocidad | velocidad |
| quite (8.0.0) | defensa | tackling × m | (posicionamiento + velocidad) / 2 × m | (agresividad + velocidad) / 2 × m |
| quite (7.0.0) | defensa | tackling | posicionamiento | agresividad × 0,8 |
| anticipación | colocación | anticipación | posicionamiento | agresividad × 0,8 |
| físico | aéreo | marcaje | (posicionamiento + velocidad) / 2 | agresividad |
| aéreo | aéreo | anticipación | posicionamiento × 0,85 | (finalización + desmarque) / 2 |
| desmarque | 20 | velocidad × 0,8 (8.0.0: velocidad) | visión | desmarque |
| centro | distribución × 0,7 | técnica | pase | creatividad |
| parada | (agilidad + colocación) / 2 | media × 0,5 | media × 0,5 | media × 0,5 |
| marcaje (8.0.0) | 50 | marcaje | posicionamiento | agresividad |
| técnica (8.0.0) | distribución | técnica | técnica | (regate + creatividad) / 2 |
| liderazgo (8.0.0) | liderazgo | liderazgo | — | — |

**Multiplicador del quite (m, 8.0.0)**: defensa 1; medio con MD entre sus posiciones 0,92 y sin ella 0,87; delantero
0,8. Presionador suma 0,05 y Mal defensor resta 0,05 (los dos a la vez se anulan). Ejemplo: un medio sin MD con 80 de
posicionamiento y 70 de velocidad quita con 65,25 (69 con Presionador).

**Modificadores**, en este orden, antes de cada duelo:

1. **Posición**: fuera de su sitio, todas sus stats bajan un porcentaje (p. ej. un delantero de defensa, −40 %; un
   medio en otra posición del centro del campo, 0–10 %). Tabla en `posicion` de `v6.json`.
2. **Bonificaciones en puntos**: virtudes de equipo y Provocador del rival.
3. **Fatiga (9.0.0)**: el atributo pierde un porcentaje según la energía del jugador y el tipo de stat: entero en las
   físicas, la mitad en las técnicas y una cuarta parte en las mentales (§6). Un medio sin rasgos llega al 90' con
   unos 46 de energía: −22,5 % en velocidad, −11 % en pase y −6 % en visión.
4. **Defectos de equipo**: Polémico, Rebelde y Estrellita multiplican.

## 4. Enfrentamientos por acción

Las probabilidades de los ejemplos son **sin ajustes**: zona propia o media, formaciones y tácticas neutras, sin
rasgos y sin cansancio. Cerca del área rival bajan (cada zona a partir de la 3 resta 0,13 a x).

### Regate

- **Atacante**: regate. **Defensor**: quite del rival más cercano. **Base**: −0,32 y ×1,1 (8.0.0; −0,3 y ×1 con la
  7.0.0).
- **Quién defiende**: el rival más cercano al balón, contando su radio de intervención (crece un 4 % por cada punto de
  quite y anticipación sobre 70, hasta ±40 %; [`contexto.ts`](../../packages/engine/src/acciones/contexto.ts)). Un buen
  defensor llega a más balones.

| Regate contra quite | Éxito (8.0.0) | Rango de FR-002 |
|---|---|---|
| 98 contra 90 (Lamine Yamal contra Nuno Mendes) | 52 % | 44–54 % |
| 98 contra 70 (Lamine Yamal contra Quenda) | 74 % | 65–75 % |
| 66 contra 90 (Carlos Espí contra Nuno Mendes) | 21 % | 15–25 % |
| 80 contra 80 | 38 % | — |
| 90 contra 60 | 75 % | — |

### Conducción

- **Atacante**: (velocidad + físico) / 2. **Defensor**: quite del rival más cercano. **Base**: 0,25 y ×1,15 (8.0.0;
  0,5 y ×1 con la 7.0.0).

| Atacante contra quite | Éxito (8.0.0) | Rango de FR-002 |
|---|---|---|
| 90 contra 70 | 77 % | 72–82 % |
| 70 contra 90 | 30 % | 25–35 % |
| 85 contra 80 | 66 % | — |
| 70 contra 70 | 60 % | — |
| 90 contra 60 | 81 % | — |

### Pase corto, pase largo y pase al espacio

- **Atacante**: pase (corto) o visión (largo y al espacio). **Defensor**: anticipación del rival mejor situado en la
  línea del pase (el más cercano a ella, contando su radio de anticipación). **Bases**: corto 1,57 y ×1,27 (8.0.0; 3
  y ×2,2 con la 7.0.0); largo 0,9 y al espacio 0,3, los dos ×2,2.
- **Con la 8.0.0**, antes del duelo del pase se juega el de desmarque del receptor (más abajo), que suma o resta a x.

| Pase contra anticipación | Corto (8.0.0) | Largo | Al espacio |
|---|---|---|---|
| 95 contra 60 | 89 % | — | — |
| 90 contra 75 | 85 % (FR-002: 80–90 %) | 85 % | 81 % |
| 70 contra 70 | 81 % | 74 % | 62 % |
| 55 contra 75 | 68 % (FR-002: 63–73 %) | — | — |
| 60 contra 80 | — | 27 % | 20 % |
| 50 contra 90 | 34 % | — | — |

### Centro

- **Atacante**: centro. **Defensor**: anticipación del rival mejor situado entre el balón y el punto de remate.
  **Base**: 0.
- **A balón parado** (córner o falta lateral): el atacante es (centro del lanzador + aéreo del mejor rematador) / 2
  contra el aéreo del mejor defensor por arriba de los que están cerca
  ([`tiro.ts`](../../packages/engine/src/acciones/tiro.ts), `rematarBalonParado`).
- **Con la 8.0.0 (spec 015)**: Cabeceador vale para cualquier jugador de campo y da ±0,15 en todos los duelos aéreos de
  las dos áreas (a favor del que la tiene, ataque o defensa: el balón parado, el centro que disputa un defensor en su
  área y el primer duelo del remate de cabeza); al elegir quién marca a balón parado, Cabeceador suma 10. El aéreo de
  un defensa sigue siendo su anticipación, y el portero líder le suma (más abajo).
- **Con la 8.0.0 (spec 015, balones fuera)**: hay el triple de córners, así que en el córner el remate y la falta en el
  duelo aéreo salen con el 30 % de su probabilidad (`fueraDeCampo.peligroCorner`). El despeje va hacia la frontal y esa
  segunda jugada se disputa como balón suelto (§5.3); la carrera tras el centro no decide nada (el duelo aéreo ya
  decidió) y no cuenta como balón suelto. Cuando la defensa gana un duelo, el balón puede irse fuera: un centro
  despejado sale a córner el 90 % de las veces; un pase cortado o una entrada a menos de 22 m de la línea de fondo, el
  25 % (córner); a menos de 15 m de una banda, el 50 % (saque de banda de uno u otro equipo)
  ([`juego.ts`](../../packages/engine/src/acciones/juego.ts), `fueraTrasDuelo`).

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

En los dos, la distancia resta: 0,35 por cada 10 m a partir de 11 m, y 0,05 por grado de ángulo por debajo de 15°. El
remate es el disparo del medio o la finalización del delantero, y la parada, (agilidad + colocación) / 2 (FR-006, sin
cambios en la 8.0.0: 90 contra 80, normal a 11 m, da el 71 %, dentro del 64–74 % de FR-002; 60 contra 90, el 27 %,
dentro del 22–32 %).

| Remate contra parada (segundo duelo) | Normal a 11 m | Normal a 20 m | Mano a mano | Cabeza | Penalti |
|---|---|---|---|---|---|
| 95 contra 60 | 82 % | — | — | — | — |
| 90 contra 80 | 71 % | 65 % | 66 % | 64 % | 81 % |
| 70 contra 70 | 63 % | 52 % | 52 % | 50 % | 77 % |
| 60 contra 90 | 27 % | 23 % | 23 % | 23 % | 50 % |

Lo que convierte un tiro en gol es el producto de los dos duelos. En la serie del informe de equilibrado acaban en
gol un 17,5 % de los tiros, porque la mayoría salen de lejos o con poco ángulo.

### Desmarque y control con presión (8.0.0, spec 015, tanda 2)

[`acciones/desmarque.ts`](../../packages/engine/src/acciones/desmarque.ts) y `desmarqueDelPase` y `controlConPresion`
en [`acciones/juego.ts`](../../packages/engine/src/acciones/juego.ts):

1. **Desmarque** (antes de cada pase, con el receptor ya elegido): el desmarque del receptor contra el marcaje de quien
   le marca, el rival de campo más cercano a 3 m o menos. Base 0. Si gana el receptor, o si nadie le marca (sin
   tirada), recibe libre y el duelo del pase suma 0,25 a x; si pierde, resta 0,4. Al portero no le marca nadie.
2. **Control con presión** (solo si perdió el desmarque y el pase le llega): su técnica contra el quite del marcador.
   Base 0,5. Si pierde, el marcador le quita el balón (sin carrera por un balón suelto) y es una pérdida.

| Duelo | 90 contra 70 | 80 contra 80 | 70 contra 90 |
|---|---|---|---|
| Desmarque contra marcaje | 72 % | 50 % | 28 % |
| Técnica contra quite (control) | 78 % | 67 % | 38 % |

Con un pase corto 70 contra 70 (80 % sin desmarque), el receptor libre lo recibe el 82 % de las veces y el marcado, el
77 %; si le llega marcado, lo controla el 67 % de las veces con stats iguales. Con 3 m de radio hay unos 9 duelos de
desmarque por equipo y partido y unos 3 controles con presión (casi todos de los delanteros); con 2 m, casi ninguno.

### Liderazgo (8.0.0, spec 015, tanda 3)

[`modificadores/liderazgo.ts`](../../packages/engine/src/modificadores/liderazgo.ts), con su uso en
[`espacio/objetivos.ts`](../../packages/engine/src/espacio/objetivos.ts) y en `ajusteDuelo`:

- **Defensa líder** (no es un duelo): mientras su equipo defiende, cada defensa de la línea acerca su sitio a la línea
  del fuera de juego (el penúltimo defensor) en la fracción min(0,8; 0,34 × (L − 36,5) / 25), con L el mayor liderazgo
  de los defensas de su línea a 20 m o menos, él incluido: 60 ⇒ 0,32 del hueco; 72 (la mediana de Core) ⇒ 0,48; 80 ⇒
  0,59; 95 ⇒ 0,8. Los líderes no se suman: cuenta el mayor. Así la línea se descoloca menos y deja menos en juego a los
  atacantes que un defensa rezagado habilitaría: un central de L lo reduce al menos 1,5 % + 0,12 % × (L − 49)
  (015/SC-006a; en la serie, unas dos veces eso).
- **Portero líder**: en los duelos en que defiende un DEF de su equipo en su área o en su tercio (zonas 0 y 1), el
  atributo del defensa suma el 2,5 % de lo que el liderazgo del portero pasa de 70 (90 ⇒ +0,5; 95 ⇒ +0,625; 70 o
  menos ⇒ nada). Cuenta solo el portero propio. Es relativo a 70 desde el 2026-11-17: con el 2,5 % de todo su liderazgo,
  todos los porteros reforzaban a todas las defensas y bajaban los goles de todos los partidos.

### Ajustes del duelo

[`modificadores/formacionTactica.ts`](../../packages/engine/src/modificadores/formacionTactica.ts),
[`modificadores/virtudes.ts`](../../packages/engine/src/modificadores/virtudes.ts) y `ajusteVirtudesAccion` en
[`acciones/juego.ts`](../../packages/engine/src/acciones/juego.ts):

- **Zona** (de 0, la propia área, a 5, el área rival): la zona 3 resta 0,13; la 4, 0,26; la 5, 0,39. El pase corto
  solo resta 0,13, y solo en las zonas 4 y 5.
- **Formación y táctica**: ofensividad de los dos equipos, Catenaccio, marcaje individual, Presión alta, Línea
  adelantada, Juego combinativo, Contraataque, Bandas y Juego vertical suman o restan a x según la acción y la zona
  (§7).
- **Virtudes que suman probabilidad**: leve +4 puntos (Potente, Aura), media +8 (Primer toque, Elegante, Jugador
  entre líneas, Presionador en contra), alta +15 (Desbordante, Matador, Cabeceador, Lanzador de faltas y de penaltis…).
- **Virtudes que tocan el atributo**: Intimidante, −1 al rival; Infranqueable, +2 al quite frente a regates ≥ 95;
  con la 8.0.0, Presionador (+0,05) y Mal defensor (−0,05) en el multiplicador del quite (§3), y el portero líder.
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
| regate (8.0.0: siempre; 7.0.0: con un rival encima o poco espacio) | regatear y conducir | 1,1 (7.0.0: 0,4) | ×0,6 | ×4 (7.0.0: ×2,2) |
| (velocidad + físico) / 2 (con espacio) | conducir | 0,4 | ×0,7 | ×1,6 |
| pase | pasar | 1,2 | ×0,5 | ×4,5 |
| visión | pase al espacio | 0,25 | ×0,6 | ×1,75 |
| remate | tirar | 0,45 | ×0,5 | ×1,65 |

Un jugador con 90 de pase pasa unas 3,4 veces más (en peso) que uno con 70; uno con 55, la mitad.

Con la 8.0.0 el regate inclina siempre (FR-007): con espacio por delante, el peso de la conducción usa la media
geométrica del factor del regate y el del físico, así que el buen regateador encara y conduce más.

### 5.2 A quién pasa y quién defiende

- **A quién pasa** ([`receptor.ts`](../../packages/engine/src/acciones/receptor.ts)):
  - Cuanto mejor pasador es el que tiene el balón, más peso tienen los compañeros por delante (1 + 1,2 × (pase − 70)
    / 10, entre ×0,5 y ×4,5).
  - Los compañeros que mejor pasan reciben más: su peso se multiplica por 2^(1,2 × (su pase − 70) / 10), acotado.
  - Con visión alta casi nunca busca a un compañero en fuera de juego.
- **Quién defiende**: el radio de intervención (quite y anticipación) decide qué rival disputa cada duelo (§4,
  Regate).
- **Con la 8.0.0 (spec 015, añadidos)**:
  - **Buscar a la estrella**: con línea de pase clara (ningún rival a 3 m de la línea y el receptor libre), el peso
    del compañero se multiplica por 2^((media − 70) / 10). Si el mejor está marcado, solo se la juega un pasador con
    (visión + pase) / 2 > 80: le da prioridad (×1,5 sobre la mejor opción clara) si tiene más de 5 puntos de media
    sobre ella; si no, se la da el 40 % de las veces.
  - **Desmarque** (tanda 2, sustituye al anticipo de 0,003 por punto): el peso de cada compañero se multiplica por
    1 + (p − 0,5), con p su probabilidad de ganar el duelo de desmarque (§4); sin nadie que le marque, p = 1 (× 1,5).
  - **Juego por las bandas**: laterales, carrileros y extremos pesan ×1,5 como receptores, el balón va más por fuera
    (+0,2) y se centra más (×1,3).

### 5.3 Movimiento y mano a mano

- **Velocidad de carrera**: de 1,8 a 3,6 m por tick (un tick es un segundo del reloj del partido) según la stat de
  velocidad (de 50 a 95), menos con el balón y con la penalización física de la fatiga
  ([`espacio/movimiento.ts`](../../packages/engine/src/espacio/movimiento.ts)). Llegar antes a un balón suelto depende
  de esto. Con la 9.0.0 la velocidad se decide cada 4 ticks y se avanza en dos medios pasos; los objetivos de
  colocación se recalculan cada 8 ticks.
- **Mano a mano**: la distancia de disparo es 14 m + 3 m por cada 10 puntos de remate sobre 70; con visión alta se
  equivoca menos de decisión ([`acciones/manoAMano.ts`](../../packages/engine/src/acciones/manoAMano.ts)).
- **Con la 8.0.0 (spec 015, añadidos)**:
  - El mano a mano empieza ya 10 m dentro del campo propio: cualquier jugador con solo el portero por delante lo
    encara.
  - Los medios centro e interiores llegan a la frontal (unos 22 m) con el balón en el último tercio.
  - A balón parado al área suben todos menos el defensa y el medio más retrasados sin Cabeceador; los mejores por
    arriba ocupan los mejores sitios, y en el último minuto del descuento, perdiendo de uno, sube el portero (si el
    rival contraataca y tira con él a más de 30 m de su portería, es a puerta vacía)
    ([`espacio/colocacion.ts`](../../packages/engine/src/espacio/colocacion.ts)).

## 6. Fatiga (9.0.0, spec 018)

[`modificadores/cansancio.ts`](../../packages/engine/src/modificadores/cansancio.ts), con los parámetros de `fatiga`.
Sustituye al cansancio de la 8.0.0, que empezaba a la vez para todos en el minuto 65 (55 con Presión alta).

### 6.1 Cómo se gasta la energía

- **Energía de 0 a 100**: todos empiezan con 100, también los suplentes que entran.
- **Tramos**: solo se gasta en el tramo final de cada parte: en la primera, desde el minuto 30; en la segunda, desde el
  55 (10 minutos después de reanudar); en la prórroga, toda. El descuento cuenta dentro del tramo en curso.
  Indisciplinado empieza cada tramo 5 minutos antes.
- **Gasto**: 1 punto por minuto de tramo multiplicado por el ritmo del jugador. El 80 % se gasta por estar en el campo
  y el 20 %, por sus acciones intensas (entrar en sprint, entrar a presionar, regatear y disputar un duelo), medidas
  frente a la media de su rol (`referenciaAcciones`, calibrada en T060): quien hace más acciones que la media se cansa
  más, y quien hace menos, menos.
- **Ritmo**: el de su rol en la posición que ocupa (portería 0,2; defensa 0,85; medio 1,2; ataque 0,95), multiplicado
  por sus rasgos y su táctica:

| Rasgo o táctica | Efecto |
|---|---|
| Incansable | Ritmo ×0,7 |
| Fatigado | Ritmo ×1,3 |
| Indisciplinado | Tramos 5 minutos antes y cada acción intensa ×1,5 |
| Motivador | Sus compañeros, ritmo ×0,95 (no a sí mismo; dos Motivadores no se acumulan) y +15 en el descanso en vez de +10 si estaba en el campo al pitarse |
| Marcaje individual | Todo el equipo, ritmo ×1,05; el marcador de la estrella, ×1,15 mientras dure el marcaje (§7) |
| Presión alta | Cada presión cuesta ×15 (`costePresion`): se cansa por presionar, no por la táctica en sí |

- **Recuperación**: +10 en el descanso (+15 con Motivador), +5 antes de la prórroga y +5 en su descanso, sin pasar de
  100.

Con acciones en la media de su rol, la energía al 90' es: portero 93, defensa 67,5, medio 50 y delantero 62,5. Para un
jugador de ritmo 1: sin rasgos 60, Incansable 75, Fatigado 45, Indisciplinado 44 y con un compañero Motivador 66,75.

### 6.2 Qué cuesta la energía perdida

La penalización física crece por tramos: 0,35 puntos por punto de energía perdido de 100 a 70, 0,5 de 70 a 45 y 0,7 de
45 a 0 (10,5 % a 70, 23 % a 45 y 54,5 % a 0). Cada atributo la sufre según su tipo
([`modificadores/atributos.ts`](../../packages/engine/src/modificadores/atributos.ts)):

| Tipo | Peso | Atributos |
|---|---|---|
| Física | 100 % | velocidad, físico, quite, aéreo |
| Técnica | 50 % | pase, regate, remate, centro, técnica, parada, desmarque, marcaje |
| Mental | 25 % | visión, anticipación, liderazgo |

El liderazgo de la línea defensiva y del portero también pierde su parte mental
([`modificadores/liderazgo.ts`](../../packages/engine/src/modificadores/liderazgo.ts)).

### 6.3 Efecto medido

Energía media de los titulares en el campo, 1000 partidos de un 4-4-2 de media 80 sin rasgos contra un clon con la
táctica neutra:

| Táctica | POR 45' / 75' / 90' | DEF | MED | DEL |
|---|---|---|---|---|
| Neutra | 97 / 96 / 93 | 87 / 78 / 65 | 82 / 64 / 46 | 86 / 74 / 59 |
| Marcaje individual | 97 / 96 / 93 | 86 / 74 / 59 | 81 / 62 / 43 | 85 / 71 / 55 |
| Presión alta | 97 / 96 / 93 | 81 / 62 / 42 | 70 / 34 / 6 | 79 / 57 / 37 |

El resto de tácticas queda a 1,3 puntos o menos de la neutra. Con la 8.0.0 todos llegaban al 90' con 54 (20 con Presión
alta).

Penalización al 90' con la táctica neutra, por tipo de stat:

| Rol | Energía | Física | Técnica | Mental |
|---|---:|---:|---:|---:|
| Portero | 93 | 2,5 % | 1,2 % | 0,6 % |
| Defensa | 65 | 13,2 % | 6,6 % | 3,3 % |
| Medio | 46 | 22,5 % | 11,3 % | 5,6 % |
| Delantero | 59 | 16,0 % | 8,0 % | 4,0 % |
| Medio con Presión alta | 6 | 50,1 % | 25,0 % | 12,5 % |

El mismo equipo llega al 90' con una media de 60,5 en Bloque medio y 35,5 en Presión alta (018/SC-005): presionar
cuesta unos 25 puntos (34 con la 8.0.0). Los NPC cambian a un jugador cuando su energía baja de su umbral: Amateur
nunca, Intermedio 42, Avanzado 53 y PRO 63; con Fatigado o Indisciplinado, antes (`umbralEnergia` en
[`ai/src/perfiles.ts`](../../packages/ai/src/perfiles.ts)).

## 7. Tácticas (9.0.0, spec 018)

[`modificadores/formacionTactica.ts`](../../packages/engine/src/modificadores/formacionTactica.ts) y
[`modificadores/marcajeEstrella.ts`](../../packages/engine/src/modificadores/marcajeEstrella.ts). Todos los valores
están en `tacticas` de la 9.0.0, también los multiplicadores de peso y de avance que hasta la 8.0.0 estaban fijos en el
motor (con el mismo valor). Los desplazamientos de táctica cuentan la mitad en el tiro.

### 7.1 Reglas

- **Catenaccio**: el rival resta 2,5 a x en las zonas 4 y 5 (no en la 3), salvo en los centros y los tiros lejanos;
  en el tiro dentro del área resta la mitad. Cierra el área y deja centrar y tirar de lejos. Mantiene sus costes
  ofensivos. En la 8.0.0 restaba 0,9 en las zonas 3 a 5 en todas las acciones; la spec proponía 0,5, pero con 0,5
  encajaba más que la neutra y se calibró a 2,5 (T062).
- **Marcaje individual**: al empezar se fijan la estrella (el rival de campo con mayor media efectiva) y su marcador
  (el defensa con más marcaje; si no hay, el medio y, en último caso, el delantero; nunca el portero). El marcador la
  sigue, gana +6 de marcaje en el desmarque y la estrella pierde 5 puntos en los duelos contra él. Sus compañeros ganan
  +0,05 en x y el regate rival, +0,12 (+0,17 si regatea un compañero de la estrella). Si sale uno de los dos, el
  marcaje de la estrella termina sin nueva elección (si sale la estrella, el +0,05 pasa a todos los rivales). Sustituye
  al −0,04 general y al +0,08 en el pase al espacio de la 8.0.0.
- **Bandas**: al perder el balón en una banda, la primera acción del rival tras recuperarlo gana +0,15 en x si sigue por
  esa banda (pase a ese carril, o regate, conducción o centro por él); si va a otro carril o tira, se pierde. Una
  pérdida en el carril central no da ventaja. Su pase al espacio pesa un 10 % menos.
- **Juego vertical**: sus pases largos y al espacio restan 0,15 en x.
- **Bandas + Vertical**: centros ×1,8 (no ×2,08) y +25 puntos de balón por banda (no +35), con los costes de las dos.
- **Línea adelantada**: sube 4,7 m con y sin balón (en la 8.0.0, solo con él) y mantiene el riesgo del pase al
  espacio a su espalda.
- **Sin cambios**: Contraataque, Combinativo y los efectos de duelo de Presión alta. Presión alta solo cambia en su
  coste (§6.1).

### 7.2 Efecto medido

1000 partidos por táctica contra el mismo equipo con la táctica neutra, con las mismas semillas en la 8.0.0 y en la
9.0.0. El efecto es la diferencia de goles frente a la neutra (error estándar de unos 0,05 por serie):

| Táctica | GF / GC | Efecto (8.0.0) | Victorias (8.0.0) |
|---|---|---:|---:|
| Neutra | 1,39 / 1,41 | — | 37,1 % (37,7 %) |
| Presión alta | 1,57 / 1,14 | +0,46 (−0,16) | 49,7 % (34,6 %) |
| Contraataque | 1,64 / 1,31 | +0,35 (+0,26) | 47,7 % (42,8 %) |
| Línea adelantada | 1,45 / 1,33 | +0,14 (+0,24) | 41,0 % (45,0 %) |
| Marcaje individual | 1,37 / 1,27 | +0,13 (+0,17) | 39,8 % (42,6 %) |
| Juego vertical | 1,51 / 1,41 | +0,13 (+0,15) | 40,1 % (42,4 %) |
| Bandas + Vertical | 1,49 / 1,46 | +0,05 (+0,13) | 40,4 % (41,4 %) |
| Bandas | 1,45 / 1,44 | +0,03 (+0,14) | 39,4 % (42,5 %) |
| Catenaccio | 0,59 / 1,03 | −0,42 (−0,65) | 21,2 % (19,1 %) |
| Combinativo | 1,17 / 1,67 | −0,47 (−0,34) | 26,1 % (29,5 %) |

- Con la 9.0.0 se marcan unos 0,2 goles menos por equipo (2,50 por partido frente a 2,66).
- **Presión alta** es la táctica más fuerte: su coste en energía la frena (sin él, +0,90 y 63 % de victorias), pero
  sus efectos de duelo, que la spec no cambia, la dejan en +0,46. Bajarla más exige tocar esos efectos.
- **Catenaccio** encaja 0,38 goles menos que la neutra y renuncia al ataque: pierde menos que en la 8.0.0.
- **Combinativo** pierde más que en la 8.0.0 (−0,47 frente a −0,34): candidata a revisar en otra spec.
- **Bandas** y **Bandas + Vertical** quedan casi neutras; Juego vertical, Línea adelantada e Individual dan una ventaja
  pequeña pero medible.

## 8. Lo que es colectivo

- **Ritmo de pase**: el tiempo de control antes de un pase depende de la media del pase de los medios del equipo, no
  del que pasa (`controlPorRitmo` en [`acciones/juego.ts`](../../packages/engine/src/acciones/juego.ts)).
- **Bonificaciones de equipo** de algunas virtudes (puntos por demarcación) y los multiplicadores de los defectos de
  equipo (§3).
- **Formación y táctica** (§4, Ajustes, y §7).

## 9. Stats de la carta que no se usan por separado

Con la 8.0.0 todas las stats de la carta tienen un uso propio. Las que no lo tenían o lo tenían a medias:

| Stat | Demarcación | Uso con la 8.0.0 (con la 7.0.0) |
|---|---|---|
| liderazgo | Portero, Defensa | Ordena la línea defensiva y, la del portero, suma a sus defensas cerca de su área (§4). (Solo en la media.) |
| desmarque | Delantero | Duelo de desmarque antes de recibir y parte del aéreo (§4). (Solo en el aéreo.) |
| marcaje | Defensa | Contra el desmarque del receptor (§4) y como «físico». (Solo como físico.) |
| agresividad | Delantero | Su marcaje y, con la velocidad, su quite; su anticipación y su físico. |
| técnica | Defensa, Medio | Control con presión (§4); en el defensa, además, pase, visión y centro; en el medio, su regate. |
| posicionamiento | Medio | Su marcaje, su anticipación y, con la velocidad, su quite; parte del físico y del aéreo. |
| aéreo | Defensa | No existe: el juego aéreo de un defensa es su anticipación (con Cabeceador, ±0,15 por arriba). |

## 10. Lo que resolvió la 8.0.0

Frente a lo propuesto el 2026-11-13 («que cada stat se enfrente individualmente a la del defensor»), la spec 015:

- **Ya funcionaba así**: regate contra quite, pase contra anticipación, remate contra parada, centro contra
  anticipación y aéreo contra aéreo, con el jugador concreto que defiende.
- **Hecho**:
  - Una curva por acción (§2) con los rangos de FR-002, que el informe de equilibrado comprueba sin jugar partidos
    (015/SC-001, en lugar de 014/SC-008 pase, remate y físico).
  - Quite por demarcación, con Presionador y Mal defensor (§3).
  - El buen regateador lo intenta más, también con espacio (§5.1).
  - Desmarque contra marcaje antes de recibir y técnica contra presión al controlar (§4, tanda 2).
  - Liderazgo del defensa y del portero (§4, tanda 3).
  - Cabeceador en cualquier jugador de campo y en todos los duelos aéreos (§4, Centro).
- **Se queda como estaba, a propósito**: el remate usa una sola stat (finalización o disparo; FR-006) y el aéreo del
  defensa sale de su anticipación.
- **Coste de cálculo**: los duelos nuevos son una resta, una multiplicación y una división, y el marcador y el líder se
  buscan en recorridos que ya existían (SC-009: la 8.0.0 no puede tardar más de un 10 % que la 7.0.0).
