# Contrato: motor 9.0.0

## API pública de `@fbd/engine`

| Función | Cambio |
|---|---|
| `crearPartido(entrada)` | Lanza `VersionNoSoportada` con parámetros anteriores a la 9.x |
| `avanzar(estado, modo, opciones)` | Misma firma y modos |
| `energiaDe(estado, jugador)` | Misma salida: `{ energia, penalizacion }`, enteros. `penalizacion` es la **física** |
| `curvaEnergia(perfil, { descuentoPrimeraParte? })` | **Nueva**, pura: energía de referencia a los 45', 90' y 120' |

`ResultadoTramo`, `Fotograma`, `ordenJugadores` y los eventos no cambian. **Los fotogramas siguen cada 2 ticks.**

## Invariantes

1. La misma entrada y las mismas decisiones dan el mismo partido en `parte`, `interrupcion`, `ticks` y `final`, con y sin fotogramas o métricas.
2. Contar acciones intensas y gastar energía **no consume PRNG**.
3. La energía siempre está en `[0, 100]`.
4. NPC y humanos usan la misma cadencia.
5. Ninguna rama del motor depende de la versión de los parámetros.
6. Tras una recolocación directa, la velocidad del jugador es 0, así que el medio paso no lo desplaza.

## Paso espacial

```text
tick múltiplo de 4:
  recalcular objetivos si toca (cada PASO_OBJETIVOS o si cambia la clave del saque)
  decidir velocidad y separación con dt = 4; contar sprints; avanzar velocidad × 2
tick múltiplo de 2, no de 4:
  avanzar velocidad × 2, sin salir del campo
todos los ticks:
  mover el balón
```

## Tácticas por acción

Desplazamiento `x` (positivo, a favor del atacante):

| Táctica | Condición | Efecto |
|---|---|---|
| Catenaccio (defensor) | Zona 4 o 5, ni centro ni tiro lejano | −0,50 (la mitad en el tiro) |
| Individual (defensor) | Atacante compañero de la estrella | +0,05 |
| Individual (defensor) | Regate | +0,12, acumulable (+0,17 para un compañero) |
| Individual (defensor) | La estrella ha salido | +0,05 a todos los rivales de campo |
| Bandas (quien perdió) | Primera acción del rival, siguiendo por ese carril | +0,15 |
| Vertical (atacante) | Pase largo o al espacio | −0,15 |

| Duelo con Individual | Efecto |
|---|---|
| Desmarque | +6 al marcaje del defensor |
| Estrella contra su marcador, en cualquier sentido | −5 a la estrella |

## Elección de estrella y marcador

1. **Estrella**: el rival de campo con mayor `mediaEfectiva`; en empate, `id` menor. Nunca el portero.
2. **Marcador**: el propio de la línea de defensa con más `marcaje`; si no hay, de medio y, si tampoco, de ataque. En empate, `id` menor.
3. Sin un jugador de campo en cualquiera de los dos equipos, no hay pareja.
4. Si sale uno de los dos, el marcaje termina (`activo = false`) y no se vuelve a elegir.

## Textos de la interfaz

| Lugar | Texto |
|---|---|
| Ayuda de energía | «Los jugadores se cansan desde el minuto 30 y desde el 55, cada uno a su ritmo según su puesto, sus rasgos y lo que corre. En el descanso recuperan energía.» |
| Detalle de la penalización | «Físicas −X %, técnicas −Y % y mentales −Z % (aproximado).» |
| Rasgos | Se actualizan en `rasgos.ts` y se regenera el documento con `pnpm --filter @fbd/domain rasgos:doc` |

Los cinco tramos de color y la regla de mostrar la penalización por debajo de 80 no cambian.
