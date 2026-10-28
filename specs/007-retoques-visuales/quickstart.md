# Quickstart — Validación de la spec 007

Guía para comprobar la spec de punta a punta. Rutas y límites: [contracts/recursos-y-ui.md](./contracts/recursos-y-ui.md).

## Requisitos previos

```bash
pnpm install
pnpm seed           # catálogo
pnpm dev            # servidor + web
```

Abre la web en el navegador con el sonido del equipo activado. Haz clic una vez en cualquier sitio para desbloquear el
audio.

## Pruebas automáticas

```bash
pnpm test        # unidad (incluye la ruleta en secuenciaDuelos.test.ts)
pnpm e2e         # e2e (apertura, cartas, duelos, torneo, identidad, diseno/*)
pnpm typecheck
pnpm lint        # incluye lint:tokens (colores literales fuera de cartas.css)
```

Resultado esperado: todo en verde.

## Comprobaciones de recursos (SC-003, SC-004b, SC-007)

```bash
ls -l apps/web/public/fondos/background_{6..11}.webp     # cada uno ≤ 150 KB
ls -l apps/web/public/cartas/marcos apps/web/public/cartas/sobre.svg apps/web/public/marca
du -cb apps/web/public/sonidos/*.mp3 | tail -1           # ≤ 307200
test ! -d temp && echo "temp/ eliminado"
grep -rn "temp/" apps/web/src apps/web/index.html apps/web/tests || echo "sin referencias a temp/"
grep -rln "favicon.svg\|\.wav" apps/web/src apps/web/index.html || echo "sin restos del logo ni de los WAV"
```

## Escenarios manuales

| # | Historia | Pasos | Resultado esperado |
|---|----------|-------|--------------------|
| 1 | US1 | Abre la pantalla de pruebas de cartas (`PruebasCartas`). | Cada nivel tiene su marco (plata, violeta, oro y rubí) en proporción 2 : 3, sin halo exterior. Se ven el retrato o la silueta, la foto de demarcación tenue sobre el estadio, la media, el nombre, la bandera, las posiciones, los stats, y las virtudes y defectos. Nada queda tapado ni cortado, tampoco con nombres largos ni con 4–6 rasgos. |
| 2 | US1 | Reduce la ventana a 360 px y mira la plantilla, la colección, la tienda y el draft. | Las cartas no se solapan ni se cortan. En las compactas se leen el nombre y la media, y el nivel se distingue por el color. |
| 3 | US1 | Mira una carta de una colección comprada. | Tiene el mismo marco que una *Core* de su nivel. |
| 4 | US3 | Mira la barra, abre el menú y mira la pestaña del navegador, en tema claro y oscuro. | Aparece el nuevo logo sin recuadro negro y se reconoce en el favicon. |
| 5 | US6 | Recorre Inicio, Crear partida, Sala, Draft (fin) y Tienda. | Siempre aparece el nuevo sobre, sin recuadro negro ni pixelado. En Inicio y en el fin del draft se ve rasgado por arriba. |
| 6 | US6 + US2 | Abre un sobre en la tienda o en el draft. | El sobre brilla, tiembla y se rasga por arriba, y las cartas salen de él sin descuadre. Suenan la apertura, el reparto y el volteo (y la revelación en Legendaria o GOAT), graves y suaves. |
| 7 | US6 | Activa «reducir movimiento» en el sistema y abre un sobre. | Se aplica la versión reducida, con el nuevo sobre. |
| 8 | US2 | Juega un cruce de duelos con estado de forma, a ×1 y a ×2. | Cada duelo suena al entrar y al chocar. En el resultado, el estado de forma gira unos 0,8 s (0,4 s a ×2) con su tic-tac y se para en su valor; solo entonces se ven el total y el ganador. |
| 9 | US2 | En mitad del cruce, pulsa «Saltar al resultado». | Los sonidos se cortan al instante y no se acumulan ni se solapan. |
| 10 | US2 | Gana un torneo; en otra partida, queda eliminado. | En la pantalla de campeón suenan aplausos una vez. En la de derrota suenan trompetas decaídas una vez. Al recargar, vuelven a sonar una sola vez. |
| 11 | US2 | Silencia con el interruptor y repite los escenarios 6, 8 y 10. | No suena nada. La preferencia se mantiene al recargar. |
| 12 | US4 | Recarga varias pantallas con fondo aleatorio unas 20 veces. | Aparecen fondos nuevos (6–11) y la carga no se nota más lenta. |
| 13 | US5 | Abre un torneo en modo Duelos y otro de liga. | En Duelos no están «Máximos goleadores» ni «Máximos asistentes». En liga sí están. |
| 14 | Edge | Bloquea en las herramientas del navegador un marco y un MP3, y recarga. | La carta se ve con su color de reserva y se lee bien. No hay errores visibles y falta solo ese sonido. |
| 15 | SC-004 | Escucha todos los efectos seguidos con el volumen habitual. | Ninguno resulta agudo ni molesto, y todos suenan más bajos que antes. |
