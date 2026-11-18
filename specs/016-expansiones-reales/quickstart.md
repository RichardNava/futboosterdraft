# Quickstart: Expansiones reales

Guía para comprobar la spec 016 de principio a fin. Cada recorrido cita el requisito o criterio que verifica. Los
detalles están en [data-model.md](data-model.md) y [contracts/](contracts/).

## 0. Preparación

```bash
pnpm install
# Con el servidor PARADO y sin partidas en curso (la retirada borra las partidas que citan cartas de prueba):
pnpm db:migrate                                                          # 0017_spec016
pnpm --filter @fbd/fixtures expansiones -- --origen ../../expansiones   # imágenes + validación + sumario
pnpm --filter @fbd/fixtures imagenes -- --sobres ../../expansiones/sobres
pnpm --filter @fbd/fixtures core-real                                   # Core con Kimmich y sin Verratti
pnpm seed                                                               # retirada + expansiones + cosméticos
pnpm dev
```

Resultado esperado:

- `expansiones` termina con todas las comprobaciones en ✅ y escribe `sumario.md` y `revision-retratos.webp`;
- `pnpm seed` imprime el recuento de la retirada (la primera vez) y «Cargadas 395 cartas, 5 colecciones…».

## 1. Pruebas automáticas

```bash
pnpm typecheck
pnpm test                       # dominio, web e integración
pnpm test:equivalence
pnpm balance                    # los criterios de la 015 siguen en verde tras el cambio Kimmich ↔ Verratti
pnpm e2e                        # tienda.spec.ts: comprar una expansión desde el detalle
```

Si `pnpm balance` cambia el estado de algún criterio, se informa a la persona antes de tocar nada (research R4).

## 2. Recorridos a mano

| # | Recorrido | Esperado | Verifica |
|---|-----------|----------|----------|
| 1 | Leer `sumario.md` | 4 expansiones × 24 cartas, 6 por nivel; todas las comprobaciones en ✅ | SC-001, FR-006 |
| 2 | Abrir `revision-retratos.webp` y revisar las 96 | Sin halo verde, sin cortes, mismo encuadre; los porteros de verde conservan la camiseta | SC-002, FR-013 |
| 3 | Elegir 10 fichas al azar del sumario y contrastarlas con sus enlaces | Nacimiento, nacionalidad, altura y demarcación coinciden | SC-003 |
| 4 | Colección → filtrar por «Core» | 300 cartas; Kimmich está, como GOAT y con media ≥ 88, y Verratti no | US1-4, FR-007 |
| 5 | Con una cuenta antigua que tenía a Verratti: Colección | Verratti sigue (ahora en Estrellas Fulgurantes) y Kimmich aparece | FR-008 |
| 6 | Con la BD de antes del seed: buscar «All Stars» en la tienda y en la colección | No existe; ninguna cuenta tiene cartas, compras ni partidas de prueba | US1-5, SC-007 |
| 7 | `pnpm seed` otra vez | La retirada informa 0 en todo y nada cambia | FR-012, SC-007 |
| 8 | Tienda → sección «Expansiones» | 4 tarjetas como en [ui.md §2](contracts/ui.md): nombre arriba a la izquierda, descripción debajo (24 · reparto · sobre), abajo «Comprar · [◆] 2.400» a la izquierda y «Ver detalle» con lupa a la derecha, y el icono de tienda por delante de la esquina superior derecha, asomando por arriba y un poco por la derecha, sin tapar el nombre ni los botones | US2-1, FR-017 |
| 9 | «Ver detalle» de cualquiera | Modal con nombre, cartel grande, 24 jugadores agrupados por nivel, los tuyos marcados con su compensación, botón de compra; el sobre del cartel es el de regalo | US2-2, FR-019, US3-5 |
| 10 | Usuario con ≥ 2400 y ninguna carta: comprar A | Saldo − 2400, 24 cartas nuevas, sobre 7 en el perfil, resumen con las 24 y el sobre | US2-3, FR-025 |
| 11 | Usuario con 1 GOAT, 2 Crack y 3 Superclase de B (de sobres): comprar B | Saldo − 2400 + 400; 18 cartas nuevas; desglose con las 6 repetidas y su importe | US2-4, FR-021, FR-023, SC-004 |
| 12 | Usuario con 2399: comprar | No se compra; «Te faltan [◆] 1» | US2-5 |
| 13 | Volver a la tienda tras comprar | «Adquirida», sin botón de compra | US2-6, FR-022 |
| 14 | Doble clic rápido en «Comprar» (o reenviar con la red lenta en DevTools) | Un solo cobro y una sola entrega | US2-7 |
| 15 | Usuario que ya compró el sobre 4 (antes de la spec): comprar C | Lo conserva; la compra no falla; «Ya tenías este sobre» | US3-4 |
| 16 | Tienda de cosméticos → sobres y packs | Sin 1, 4, 7 ni 28; con 25–27 y 29–33 a 250 / 0,50 €; packs 2, 3 y 7 con su composición, todos de 5 | US3-2, US3-3, SC-006 |
| 17 | Comprar un sobre de cartas de la tienda | 8 cartas de las expansiones que no tenías | FR-024 |
| 18 | Desfragmentar una Superclase, un Crack, un Legendario y un GOAT de expansión | +25, +75, +125, +175; Verratti también se puede (+175); Kimmich no | FR-018, FR-007 |
| 19 | Recorrer barra, tienda, confirmaciones, colección (desfragmentar e historial), perfil, crear partida y campeón, en tema claro y oscuro | Siempre el icono nuevo junto a la cantidad, legible | US4-1, SC-008 |
| 20 | Con NVDA o VoiceOver, leer el saldo y un precio | «2.400 fragmentos»; el icono no se anuncia | US4-2, FR-031 |
| 21 | Crear una partida con una expansión activa y jugar el draft | Las cartas de expansión salen con retrato y fondo, sin errores | US1 (prueba independiente) |
| 22 | `pnpm --filter @fbd/server ajuste identidad_cartas alternativa` y crear una partida nueva | Las cartas de expansión salen con nombre y retrato genéricos | Supuesto «Derechos de imagen» |
| 23 | Tienda a 360 px y a 1366 × 768 | Sin desplazamiento horizontal; en escritorio, las tarjetas y el pie del modal visibles sin desplazarse | Principio XI |
| 24 | Cronometrar a una persona que no conoce la pantalla: encontrar una expansión, abrir el detalle y comprarla | < 1 minuto sin ayuda | SC-005 |
| 25 | Leer los pesos del sumario | Retrato + fondo medios de las expansiones ≤ 1,10 × los del Core | SC-009 |

## 3. Cierre

- Borrar `./expansiones/` de la raíz cuando la persona dé por buenas las imágenes (supuesto «Material»). Antes, se
  copian a `specs/016-expansiones-reales/fuentes/` las cuatro listas `jugadores_expansionX.json` y los `rareza_X.txt`.
- `graphify update .`
