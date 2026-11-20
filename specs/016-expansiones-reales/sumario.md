# Sumario — Expansiones reales (spec 016)

Generado por `pnpm --filter @fbd/fixtures expansiones` a partir de `data/expansiones-reales.json`, `data/core-real.json` y `data/colecciones.json`. No se edita a mano.

## Comprobaciones

- ✅ 1. Catálogo válido (FR-006)
- ✅ 2. Cada expansión: 24 cartas, 6 por nivel, números 1..24 y sobre de regalo (SC-001)
- ✅ 3. Core: 300 cartas, Kimmich dentro con media ≥ 88 y Verratti fuera (FR-007)
- ✅ 4. Retrato y fondo en disco para cada carta y ningún retrato sin ficha (FR-015)
- ✅ 5. Peso medio de retrato + fondo ≤ 1,10 × el del Core (SC-009)

Peso medio de retrato + fondo: expansiones 74.4 KB, Core 71.0 KB (límite 78.1 KB).

## A. Remontada Histórica (`remontada-historica`, regala `sobre-7`)

| Nº | Id | Carta | Nivel | Demarcación | Media | Virtudes | Defectos |
|---:|---:|---|---|---|---:|---|---|
| 1 | 301 | Müller | GOAT | DEL | 88.33 | Incansable, GuanteEnElPie, Carismatico, Motivador |  |
| 2 | 302 | Ter Stegen | GOAT | POR | 88.83 | JugadorDeCampo, OneToOne, Santo, Capitania | DeCristal |
| 3 | 303 | Thiago Silva | GOAT | DEF | 89.17 | Jerarquia, Libero, Capitania, Elegante |  |
| 4 | 304 | Alaba | GOAT | DEF | 88 | Versatil, LanzadorFaltas, Elegante, Jerarquia | DeCristal |
| 5 | 305 | Kanté | GOAT | MED | 88.17 | Incansable, RecuperadorTrasPerdida, BoxToBox, Presionador |  |
| 6 | 306 | Alexis Sánchez | GOAT | DEL | 88.67 | Desbordante, Incansable, Presionador, Matador | Chupon, Provocador |
| 7 | 307 | Isco | Legendario | MED | 84.5 | Filigranas, JugadorEntreLineas, PrimerToque | Fatigado |
| 8 | 308 | Cuadrado | Legendario | DEF | 83.83 | Incansable, Llegador, Filigranas | Provocador |
| 9 | 309 | Sommer | Legendario | POR | 84.67 | Parapenalties, Santo, JugadorDeCampo |  |
| 10 | 310 | Iñigo Martínez | Legendario | DEF | 83.67 | Jerarquia, Cabeceador, Libero |  |
| 11 | 311 | Santa Cruz | Legendario | DEL | 83 | Rematador, Cabeceador, Elegante |  |
| 12 | 312 | Podolski | Legendario | DEL | 84 | Matador, Potente, Carismatico |  |
| 13 | 313 | Bacca | Crack | DEL | 80.67 | Matador, Rematador |  |
| 14 | 314 | Banega | Crack | MED | 81.67 | PrimerToque, LanzadorFaltas | Indisciplinado |
| 15 | 315 | Trincão | Crack | DEL | 80.33 | Desbordante, Filigranas |  |
| 16 | 316 | Muslera | Crack | POR | 81.67 | Parapenalties, Capitania | Impulsivo |
| 17 | 317 | Balde | Crack | DEF | 78.33 | Llegador, Incansable |  |
| 18 | 318 | Azpilicueta | Crack | DEF | 82.83 | Capitania, Versatil |  |
| 19 | 319 | Gylfi Sigurðsson | Superclase | MED | 77.67 | LanzadorFaltas |  |
| 20 | 320 | Summerville | Superclase | DEL | 77.33 | Desbordante |  |
| 21 | 321 | Mendy | Superclase | POR | 77.67 | Santo | Torpe |
| 22 | 322 | Zézé | Superclase | DEF | 72.67 | Potente |  |
| 23 | 323 | Laimer | Superclase | MED | 76 | Presionador |  |
| 24 | 324 | Yerry Mina | Superclase | DEF | 74 | Cabeceador |  |

| | Superclase | Crack | Legendario | GOAT |
|---|---:|---:|---:|---:|
| POR | 1 | 1 | 1 | 1 |
| DEF | 2 | 2 | 2 | 2 |
| MED | 2 | 1 | 1 | 1 |
| DEL | 1 | 2 | 2 | 2 |

## B. Ídolos Dorados (`idolos-dorados`, regala `sobre-1`)

| Nº | Id | Carta | Nivel | Demarcación | Media | Virtudes | Defectos |
|---:|---:|---|---|---|---:|---|---|
| 1 | 325 | Cuti Romero | GOAT | DEF | 88.17 | Intimidante, MuroDefensivo, Jerarquia, Capitania | Agresivo, Impulsivo |
| 2 | 326 | Falcao | GOAT | DEL | 88.67 | Matador, Rematador, Cabeceador, Carismatico | DeCristal |
| 3 | 327 | Maguire | GOAT | DEF | 88 | Cabeceador, Jerarquia, Capitania, Robusto | Torpe |
| 4 | 328 | Keylor Navas | GOAT | POR | 88.17 | Santo, OneToOne, FortalezaMental, Parapenalties |  |
| 5 | 329 | Gündoğan | GOAT | MED | 88 | Llegador, PrimerToque, Capitania, Elegante |  |
| 6 | 330 | Griezmann | GOAT | DEL | 89.33 | GuanteEnElPie, Incansable, LanzadorFaltas, Matador |  |
| 7 | 331 | David Luiz | Legendario | DEF | 83 | Carismatico, LanzadorFaltas, Libero | Impulsivo |
| 8 | 332 | João Félix | Legendario | DEL | 83.33 | Filigranas, Elegante, GuanteEnElPie |  |
| 9 | 333 | Merino | Legendario | MED | 83.67 | BoxToBox, Cabeceador, Llegador |  |
| 10 | 334 | Memo Ochoa | Legendario | POR | 83.33 | Santo, OneToOne, Carismatico |  |
| 11 | 335 | Theo Hernández | Legendario | DEF | 83.67 | Llegador, Potente, Incansable |  |
| 12 | 336 | Coman | Legendario | DEL | 83.17 | Desbordante, Filigranas, Revulsivo | DeCristal |
| 13 | 337 | McTominay | Crack | MED | 80.33 | Llegador, BoxToBox |  |
| 14 | 338 | Nani | Crack | DEL | 81 | Desbordante, Filigranas | Chupon |
| 15 | 339 | Bremer | Crack | DEF | 81.67 | MuroDefensivo, Cabeceador | DeCristal |
| 16 | 340 | Szczęsny | Crack | POR | 81.33 | Parapenalties, Santo |  |
| 17 | 341 | Dalot | Crack | DEF | 78.67 | Llegador, Versatil |  |
| 18 | 342 | Tielemans | Crack | MED | 81 | PrimerToque, LanzadorFaltas |  |
| 19 | 343 | Lavia | Superclase | MED | 74.67 | RecuperadorTrasPerdida | Fragil |
| 20 | 344 | Pavlović | Superclase | DEF | 74 | Intimidante |  |
| 21 | 345 | Musah | Superclase | MED | 75 | Incansable |  |
| 22 | 346 | Muriqi | Superclase | DEL | 74 | Cabeceador |  |
| 23 | 347 | Carlos Soler | Superclase | MED | 76 | Llegador |  |
| 24 | 348 | Gadou | Superclase | DEF | 72 | Potente |  |

| | Superclase | Crack | Legendario | GOAT |
|---|---:|---:|---:|---:|
| POR | 0 | 1 | 1 | 1 |
| DEF | 2 | 2 | 2 | 2 |
| MED | 3 | 2 | 1 | 1 |
| DEL | 1 | 1 | 2 | 2 |

## C. Saque Ardiente (`saque-ardiente`, regala `sobre-4`)

| Nº | Id | Carta | Nivel | Demarcación | Media | Virtudes | Defectos |
|---:|---:|---|---|---|---:|---|---|
| 1 | 349 | Cazorla | GOAT | MED | 88.17 | Filigranas, PrimerToque, LanzadorFaltas, Elegante | DeCristal |
| 2 | 350 | Otamendi | GOAT | DEF | 88.67 | MuroDefensivo, Jerarquia, Intimidante, Capitania | Agresivo, Provocador |
| 3 | 351 | Lloris | GOAT | POR | 88 | OneToOne, Santo, Capitania, FortalezaMental |  |
| 4 | 352 | Paolo Guerrero | GOAT | DEL | 88 | Matador, Rematador, Cabeceador, Potente |  |
| 5 | 353 | Son | GOAT | DEL | 88.5 | Matador, Desbordante, Capitania, FairPlayer |  |
| 6 | 354 | Arturo Vidal | GOAT | MED | 88 | BoxToBox, Incansable, Presionador, Intimidante | Agresivo, Polemico |
| 7 | 355 | Pedro | Legendario | DEL | 84.67 | Desbordante, Incansable, Revulsivo |  |
| 8 | 356 | Giroud | Legendario | DEL | 84 | Rematador, Cabeceador, GuanteEnElPie | Fatigado |
| 9 | 357 | Walker | Legendario | DEF | 85.33 | Potente, Incansable, Capitania |  |
| 10 | 358 | Laporte | Legendario | DEF | 83.67 | Libero, Elegante, Cabeceador | Impulsivo |
| 11 | 359 | Rúben Neves | Legendario | MED | 84 | LanzadorFaltas, PrimerToque, Elegante |  |
| 12 | 360 | Kelleher | Legendario | POR | 83.33 | Parapenalties, Santo, OneToOne |  |
| 13 | 361 | Ashley Young | Crack | DEF | 79.67 | Versatil, Capitania |  |
| 14 | 362 | Wesley Fofana | Crack | DEF | 80.67 | Potente, MuroDefensivo | DeCristal |
| 15 | 363 | Mount | Crack | MED | 80.67 | Presionador, Llegador | Fragil |
| 16 | 364 | Darwin Núñez | Crack | DEL | 82 | Potente, Presionador |  |
| 17 | 365 | Rabiot | Crack | MED | 80 | BoxToBox, Llegador |  |
| 18 | 366 | Pulisic | Crack | DEL | 81.67 | Desbordante, Revulsivo |  |
| 19 | 367 | En-Nesyri | Superclase | DEL | 75.33 | Cabeceador | Torpe |
| 20 | 368 | Beukema | Superclase | DEF | 75.33 | Libero |  |
| 21 | 369 | Budimir | Superclase | DEL | 74 | Rematador |  |
| 22 | 370 | Kubo | Superclase | DEL | 76 | Desbordante |  |
| 23 | 371 | Đ. Petrović | Superclase | POR | 76.67 | Parapenalties |  |
| 24 | 372 | Emre Can | Superclase | MED | 76.33 | Versatil |  |

| | Superclase | Crack | Legendario | GOAT |
|---|---:|---:|---:|---:|
| POR | 1 | 0 | 1 | 1 |
| DEF | 1 | 2 | 2 | 1 |
| MED | 1 | 2 | 1 | 2 |
| DEL | 3 | 2 | 2 | 2 |

## D. Estrellas Fulgurantes (`estrellas-fulgurantes`, regala `sobre-28`)

| Nº | Id | Carta | Nivel | Demarcación | Media | Virtudes | Defectos |
|---:|---:|---|---|---|---:|---|---|
| 1 | 373 | Lukaku | GOAT | DEL | 88.5 | Matador, Potente, Robusto, Rematador | Torpe |
| 2 | 374 | Pogba | GOAT | MED | 88 | Potente, Filigranas, Elegante, BoxToBox | Estrellita, Fragil |
| 3 | 375 | Kim Min-jae | GOAT | DEF | 88 | MuroDefensivo, Robusto, Infranqueable, Volador |  |
| 4 | 299 | Verratti | GOAT | MED | 88 | Elegante, PrimerToque, Filigranas | Impulsivo |
| 5 | 377 | Coutinho | GOAT | MED | 88.33 | Filigranas, JugadorEntreLineas, LanzadorFaltas, Elegante |  |
| 6 | 378 | Sterling | GOAT | DEL | 88 | Desbordante, Incansable, Revulsivo, Matador |  |
| 7 | 379 | Sancho | Legendario | DEL | 83.67 | Desbordante, Filigranas, GuanteEnElPie | Estrellita |
| 8 | 380 | Milinković-Savić | Legendario | MED | 84 | Cabeceador, Elegante, Llegador |  |
| 9 | 381 | Dele Alli | Legendario | MED | 83.67 | Llegador, JugadorEntreLineas, Filigranas | Estrellita |
| 10 | 382 | Joe Hart | Legendario | POR | 83.67 | Santo, Capitania, Carismatico |  |
| 11 | 383 | Sané | Legendario | DEL | 84.33 | Desbordante, LanzadorFaltas, Revulsivo |  |
| 12 | 384 | Koulibaly | Legendario | DEF | 84.67 | MuroDefensivo, Robusto, Jerarquia |  |
| 13 | 385 | Icardi | Crack | DEL | 80.67 | Matador, Rematador | Polemico |
| 14 | 386 | Kalvin Phillips | Crack | MED | 79 | RecuperadorTrasPerdida, Incansable |  |
| 15 | 387 | Ndombele | Crack | MED | 80 | Filigranas, PrimerToque |  |
| 16 | 388 | Grealish | Crack | DEL | 79.33 | Filigranas, GuanteEnElPie |  |
| 17 | 389 | Gnabry | Crack | DEL | 82 | Desbordante, Matador | Fragil |
| 18 | 390 | Chilwell | Crack | DEF | 78.67 | Llegador, Incansable |  |
| 19 | 391 | Kessié | Superclase | MED | 76 | Potente |  |
| 20 | 392 | Arthur | Superclase | MED | 75 | PrimerToque | DeCristal |
| 21 | 393 | Chiesa | Superclase | DEL | 78.67 | Desbordante |  |
| 22 | 394 | Škriniar | Superclase | DEF | 77 | MuroDefensivo |  |
| 23 | 395 | Karius | Superclase | POR | 74.33 | JugadorDeCampo |  |
| 24 | 396 | Werner | Superclase | DEL | 77 | Desbordante |  |

| | Superclase | Crack | Legendario | GOAT |
|---|---:|---:|---:|---:|
| POR | 1 | 0 | 1 | 0 |
| DEF | 1 | 1 | 1 | 1 |
| MED | 2 | 2 | 2 | 3 |
| DEL | 2 | 3 | 2 | 2 |

## Nombres de la lista corregidos

- A-19: «Gylfi Sigurdsson» → Gylfi Þór Sigurðsson («Gylfi Sigurðsson»)
- A-24: «Yerri Kina» → Yerry Fernando Mina González («Yerry Mina»)
- D-9: «Delle Alli» → Bamidele Jermaine Alli («Dele Alli»)
