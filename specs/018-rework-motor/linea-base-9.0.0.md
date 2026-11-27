# Línea base del motor 9.0.0

> Generado con `pnpm --filter @fbd/balance linea-base`. No editar a mano.

- **Parámetros**: 9.0.0
- **Commit**: `d97c9b0` (`packages/engine` y `packages/domain` **con cambios locales**)
- **Node**: v24.19.0
- **Partidos por táctica**: 1000, alternando quién juega en casa
- **Semillas**: `linea-base:1` a `linea-base:1000`, las mismas en todas las tácticas
- **Equipos**: 4-4-2 sintético de media 80 sin rasgos; el rival es un clon con la táctica neutra
- **Coste**: media de 100 partidos sin fotogramas ni métricas en este equipo. Es orientativo: la medida oficial es la del job `rendimiento-motor`

## Goles, victorias y coste

| Táctica | GF | GC | Dif. (± e. e.) | Efecto en dif. | Victorias | Efecto | Empates | Derrotas | ms/partido |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Neutra | 1,39 | 1,41 | -0,02 ± 0,04 | — | 37,1 % | — | 23,2 % | 39,7 % | 70,7 |
| Marcaje individual | 1,37 | 1,27 | +0,11 ± 0,04 | +0,13 | 39,8 % | +2,7 pp | 26,0 % | 34,2 % | 77,2 |
| Catenaccio | 0,59 | 1,03 | -0,45 ± 0,04 | -0,42 | 21,2 % | -15,9 pp | 28,2 % | 50,6 % | 72,0 |
| Presión alta | 1,57 | 1,14 | +0,43 ± 0,04 | +0,46 | 49,7 % | +12,6 pp | 23,7 % | 26,6 % | 72,4 |
| Línea adelantada | 1,45 | 1,33 | +0,11 ± 0,04 | +0,14 | 41,0 % | +3,9 pp | 23,8 % | 35,2 % | 72,9 |
| Contraataque | 1,64 | 1,31 | +0,33 ± 0,05 | +0,35 | 47,7 % | +10,6 pp | 21,2 % | 31,1 % | 71,5 |
| Combinativo | 1,17 | 1,67 | -0,50 ± 0,05 | -0,47 | 26,1 % | -11,0 pp | 21,0 % | 52,9 % | 72,5 |
| Bandas | 1,45 | 1,44 | +0,01 ± 0,05 | +0,03 | 39,4 % | +2,3 pp | 21,9 % | 38,7 % | 72,1 |
| Juego vertical | 1,51 | 1,41 | +0,11 ± 0,04 | +0,13 | 40,1 % | +3,0 pp | 25,8 % | 34,1 % | 72,3 |
| Bandas + Vertical | 1,49 | 1,46 | +0,03 ± 0,05 | +0,05 | 40,4 % | +3,3 pp | 21,4 % | 38,2 % | 73,4 |

## Energía media de los titulares en el campo

| Táctica | POR 45' | DEF 45' | MED 45' | DEL 45' | POR 75' | DEF 75' | MED 75' | DEL 75' | POR 90' | DEF 90' | MED 90' | DEL 90' |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Neutra | 97,1 | 87,4 | 82,1 | 85,7 | 96,1 | 77,7 | 64,3 | 73,7 | 93,0 | 64,7 | 46,0 | 59,1 |
| Marcaje individual | 96,8 | 85,7 | 81,2 | 84,7 | 96,0 | 73,6 | 62,1 | 71,0 | 92,9 | 59,0 | 42,7 | 55,3 |
| Catenaccio | 97,0 | 87,7 | 82,4 | 85,7 | 96,0 | 78,7 | 65,4 | 74,0 | 92,7 | 66,0 | 47,2 | 59,6 |
| Presión alta | 97,2 | 81,4 | 70,1 | 79,3 | 96,3 | 61,7 | 34,0 | 57,3 | 93,2 | 42,0 | 6,3 | 36,6 |
| Línea adelantada | 97,2 | 87,3 | 82,1 | 85,7 | 96,2 | 77,5 | 64,4 | 73,7 | 93,1 | 64,5 | 46,0 | 59,1 |
| Contraataque | 97,1 | 87,4 | 82,2 | 85,6 | 96,1 | 77,6 | 64,3 | 73,2 | 93,1 | 64,6 | 46,1 | 58,5 |
| Combinativo | 97,0 | 87,3 | 82,1 | 85,8 | 96,0 | 77,8 | 64,5 | 73,9 | 92,8 | 64,8 | 46,1 | 59,4 |
| Bandas | 97,1 | 87,3 | 82,1 | 85,7 | 96,1 | 77,6 | 64,4 | 73,6 | 93,0 | 64,5 | 46,1 | 59,0 |
| Juego vertical | 97,1 | 87,3 | 82,1 | 85,7 | 96,2 | 77,6 | 64,3 | 73,5 | 93,0 | 64,5 | 46,0 | 59,0 |
| Bandas + Vertical | 97,1 | 87,3 | 82,1 | 85,6 | 96,1 | 77,5 | 64,4 | 73,5 | 93,0 | 64,5 | 46,2 | 58,9 |
