# Sumario — Colección Core real (spec 008, fase 0.1)

Generado por `pnpm --filter @fbd/fixtures core-real` a partir de `data/core-real.json` (300 jugadores). No se edita a mano.

## 1. Demarcación × nivel

Cada celda: actual / objetivo (diferencia; + es hueco, − es exceso).

| Demarcación | Superclase | Crack | Legendario | GOAT | Total |
|---|---:|---:|---:|---:|---:|
| POR | 13 / 14 (+1) | 8 / 8 (0) | 4 / 7 (+3) | 5 / 3 (-2) | 30 / 32 |
| DEF | 44 / 44 (0) | 18 / 22 (+4) | 17 / 22 (+5) | 8 / 12 (+4) | 87 / 100 |
| MED | 44 / 44 (0) | 23 / 22 (-1) | 21 / 22 (+1) | 8 / 12 (+4) | 96 / 100 |
| DEL | 39 / 30 (-9) | 21 / 15 (-6) | 12 / 15 (+3) | 15 / 8 (-7) | 87 / 68 |

Huecos: **25**. Excesos: **25**. Huecos − excesos = **0** (lo que falta para la distribución objetivo; negativo si sobran cartas).

## 2. Posiciones

«Necesarias»: el máximo de casillas de la posición en una formación del juego × 8 participantes.

| Posición | Principal | Secundaria | Cobertura | Necesarias | |
|---|---:|---:|---:|---:|---|
| POR | 30 | 0 | 30 | 8 |  |
| LI | 18 | 15 | 33 | 8 |  |
| LD | 15 | 9 | 24 | 8 |  |
| DCI | 19 | 10 | 29 | 16 |  |
| DCD | 29 | 7 | 36 | 16 |  |
| CI | 2 | 14 | 16 | 8 |  |
| CD | 4 | 8 | 12 | 8 |  |
| MD | 21 | 21 | 42 | 8 |  |
| MC | 38 | 29 | 67 | 16 |  |
| MII | 4 | 12 | 16 | 8 |  |
| MID | 5 | 16 | 21 | 8 |  |
| MCO | 28 | 21 | 49 | 8 |  |
| DC | 39 | 15 | 54 | 8 |  |
| SD | 1 | 18 | 19 | 8 |  |
| EI | 25 | 16 | 41 | 8 |  |
| ED | 22 | 13 | 35 | 8 |  |

## 3. Nacionalidades

| Selección | Jugadores | |
|---|---:|---|
| ENG | 36 | más del 10 % |
| ESP | 35 | más del 10 % |
| FRA | 32 | más del 10 % |
| BRA | 23 |  |
| DEU | 19 |  |
| PRT | 16 |  |
| ARG | 15 |  |
| NLD | 15 |  |
| ITA | 11 |  |
| BEL | 8 |  |
| HRV | 8 |  |
| SEN | 7 |  |
| CIV | 5 |  |
| CMR | 5 |  |
| TUR | 5 |  |
| URY | 5 |  |
| NOR | 4 |  |
| CHE | 3 |  |
| COL | 3 |  |
| DNK | 3 |  |
| ECU | 3 |  |
| SWE | 3 |  |
| DZA | 2 |  |
| EGY | 2 |  |
| GEO | 2 |  |
| GHA | 2 |  |
| GRC | 2 |  |
| HUN | 2 |  |
| MAR | 2 |  |
| MEX | 2 |  |
| NGA | 2 |  |
| POL | 2 |  |
| SRB | 2 |  |
| SVK | 2 |  |
| SVN | 2 |  |
| CAN | 1 | solo 1 |
| COD | 1 | solo 1 |
| GMB | 1 | solo 1 |
| IRL | 1 | solo 1 |
| JPN | 1 | solo 1 |
| MLI | 1 | solo 1 |
| RUS | 1 | solo 1 |
| UKR | 1 | solo 1 |
| USA | 1 | solo 1 |
| UZB | 1 | solo 1 |

## 4. Reparto de defectos por nivel

| Nivel | Con defecto | Esperado | Desviación |
|---|---:|---:|---:|
| Superclase | 2 % | 15 % | -13 pts |
| Crack | 26 % | 25 % | +1 pts |
| Legendario | 30 % | 35 % | -5 pts |
| GOAT | 53 % | 50 % | +3 pts |

Los defectos reflejan la valoración honesta de cada jugador (FR-011); una desviación grande se corrige revisando fichas.

## 5. Excesos y propuestas de recolocación

- **POR GOAT**: sobran 2.
  - [16] Donnarumma (media 88) → Legendario
  - [18] Oblak (media 88) → Legendario
- **MED Crack**: sobran 1.
  - [124] Cherki (media 83) → Legendario
- **DEL Superclase**: sobran 9.
  - Ningún nivel vecino tiene hueco: el exceso se compensa eligiendo menos cartas de otro nivel.
- **DEL Crack**: sobran 6.
  - [198] Gabriel Jesus (media 83) → Legendario
  - [222] Thuram (media 82.67) → Legendario
  - [201] Gordon (media 82.33) → Legendario
  - [211] Matheus Cunha (media 82.33) → Legendario
  - [199] Gakpo (media 82) → Legendario
  - [217] Rodrygo (media 82) → Legendario
- **DEL GOAT**: sobran 7.
  - [240] Di María (media 88) → Legendario
  - [243] Lamine Yamal (media 88) → Legendario
  - [245] Mané (media 88) → Legendario
  - [242] Kane (media 88.5) → Legendario
  - [239] Dembélé (media 89) → Legendario
  - [300] Lewandowski (media 89.33) → Legendario
  - [249] Salah (media 89.67) → Legendario

## 6. Necesidades para la distribución objetivo

Por orden de prioridad (tamaño del hueco). La posición preferida es la de menor cobertura de la demarcación.

1. Faltan 5 DEF Legendario, preferiblemente CD.
1. Faltan 4 DEF Crack, preferiblemente CD.
1. Faltan 4 DEF GOAT, preferiblemente CD.
1. Faltan 4 MED GOAT, preferiblemente MII.
1. Faltan 3 POR Legendario.
1. Faltan 3 DEL Legendario, preferiblemente SD.
1. Falta 1 POR Superclase.
1. Falta 1 MED Legendario, preferiblemente MII.

Como hay 25 cartas de más en otras celdas, los huecos suman 25: cuadrar la distribución obliga a recolocar o sustituir 25 (sección 5).
