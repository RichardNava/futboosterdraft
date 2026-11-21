# Línea base del motor 8.0.0

> Generado con `pnpm --filter @fbd/balance linea-base`. No editar a mano.

- **Parámetros**: 8.0.0
- **Commit**: `1c8a0b7` (`packages/engine` y `packages/domain` sin cambios locales)
- **Node**: v22.23.5
- **Partidos por táctica**: 1000, alternando quién juega en casa
- **Semillas**: `linea-base:1` a `linea-base:1000`, las mismas en todas las tácticas
- **Equipos**: 4-4-2 sintético de media 80 sin rasgos; el rival es un clon con la táctica neutra
- **Coste**: media de 100 partidos sin fotogramas ni métricas en este equipo. Es orientativo: la medida oficial es la del job `rendimiento-motor`

## Goles, victorias y coste

| Táctica | GF | GC | Dif. (± e. e.) | Efecto en dif. | Victorias | Efecto | Empates | Derrotas | ms/partido |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Neutra | 1,59 | 1,62 | -0,03 ± 0,05 | — | 37,7 % | — | 23,7 % | 38,6 % | 98,8 |
| Marcaje individual | 1,60 | 1,46 | +0,14 ± 0,05 | +0,17 | 42,6 % | +4,9 pp | 23,2 % | 34,2 % | 101,6 |
| Catenaccio | 0,70 | 1,38 | -0,68 ± 0,04 | -0,65 | 19,1 % | -18,6 pp | 24,2 % | 56,7 % | 95,1 |
| Presión alta | 1,52 | 1,71 | -0,19 ± 0,04 | -0,16 | 34,6 % | -3,1 pp | 24,3 % | 41,1 % | 98,1 |
| Línea adelantada | 1,61 | 1,40 | +0,21 ± 0,05 | +0,24 | 45,0 % | +7,3 pp | 22,3 % | 32,7 % | 96,2 |
| Contraataque | 1,76 | 1,54 | +0,22 ± 0,05 | +0,26 | 42,8 % | +5,1 pp | 24,4 % | 32,8 % | 96,4 |
| Combinativo | 1,46 | 1,83 | -0,37 ± 0,05 | -0,34 | 29,5 % | -8,2 pp | 20,9 % | 49,6 % | 96,9 |
| Bandas | 1,64 | 1,53 | +0,11 ± 0,05 | +0,14 | 42,5 % | +4,8 pp | 21,1 % | 36,4 % | 95,9 |
| Juego vertical | 1,66 | 1,54 | +0,12 ± 0,05 | +0,15 | 42,4 % | +4,7 pp | 21,1 % | 36,5 % | 95,8 |
| Bandas + Vertical | 1,67 | 1,57 | +0,10 ± 0,05 | +0,13 | 41,4 % | +3,7 pp | 20,9 % | 37,7 % | 96,2 |

## Energía media de los titulares en el campo

| Táctica | POR 45' | DEF 45' | MED 45' | DEL 45' | POR 75' | DEF 75' | MED 75' | DEL 75' | POR 90' | DEF 90' | MED 90' | DEL 90' |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Neutra | 100,0 | 100,0 | 100,0 | 100,0 | 82,0 | 82,0 | 82,0 | 82,0 | 54,0 | 54,0 | 54,0 | 54,0 |
| Marcaje individual | 100,0 | 100,0 | 100,0 | 100,0 | 80,0 | 80,0 | 80,0 | 80,0 | 50,0 | 50,0 | 50,0 | 50,0 |
| Catenaccio | 100,0 | 100,0 | 100,0 | 100,0 | 82,0 | 82,0 | 82,0 | 82,0 | 54,0 | 54,0 | 54,0 | 54,0 |
| Presión alta | 100,0 | 100,0 | 100,0 | 100,0 | 54,0 | 54,0 | 54,0 | 54,0 | 20,0 | 20,0 | 20,0 | 20,0 |
| Línea adelantada | 100,0 | 100,0 | 100,0 | 100,0 | 82,0 | 82,0 | 82,0 | 82,0 | 54,0 | 54,0 | 54,0 | 54,0 |
| Contraataque | 100,0 | 100,0 | 100,0 | 100,0 | 82,0 | 82,0 | 82,0 | 82,0 | 54,0 | 54,0 | 54,0 | 54,0 |
| Combinativo | 100,0 | 100,0 | 100,0 | 100,0 | 82,0 | 82,0 | 82,0 | 82,0 | 54,0 | 54,0 | 54,0 | 54,0 |
| Bandas | 100,0 | 100,0 | 100,0 | 100,0 | 82,0 | 82,0 | 82,0 | 82,0 | 54,0 | 54,0 | 54,0 | 54,0 |
| Juego vertical | 100,0 | 100,0 | 100,0 | 100,0 | 82,0 | 82,0 | 82,0 | 82,0 | 54,0 | 54,0 | 54,0 | 54,0 |
| Bandas + Vertical | 100,0 | 100,0 | 100,0 | 100,0 | 82,0 | 82,0 | 82,0 | 82,0 | 54,0 | 54,0 | 54,0 | 54,0 |
