# Sonidos del juego

Qué suena con cada acción. Este documento se edita a mano: cambia un volumen, marca un sonido para sustituirlo o
añade filas en «Pendientes» con las acciones que deberían sonar, y pide que se apliquen los cambios.

- Código: `apps/web/src/sonido/sonido.ts` (`reproducir('<efecto>')`); los eventos de la 2D se traducen a efectos en
  `apps/web/src/componentes/sonidosPartido.ts`.
- Ficheros: `apps/web/public/sonidos/` (procedencia y licencias en `LICENCIA`). Las grabaciones van en MP3 y los
  sintetizados en WAV.
- Sintetizados: `tools/sonidos/generar.py` (`python tools/sonidos/generar.py`).
- Volumen final = volumen del efecto × volumen general. **Volumen general: 0,65.**
- El jugador puede silenciarlo todo con el interruptor 🔊 (se recuerda en el navegador).

## Sonidos actuales

| Pantalla | Acción | Efecto | Fichero | Volumen | Notas |
| --- | --- | --- | --- | --- | --- |
| General | Botón principal pulsado | `clicPrincipal` | clicPrincipal.wav | 0,10 | Sintetizado; solo el botón principal de la barra, los secundarios no suenan |
| Draft | Se abre un sobre | `apertura` | apertura.mp3 | 0,75 | Rasgado del sobre |
| Draft | Sale una carta del sobre | `reparto` | reparto.mp3 | 0,81 | Una vez por carta |
| Draft | Se gira una carta | `volteo` | volteo.mp3 | 1,03 | Una vez por carta |
| Draft | Se desvela una carta Legendaria | `revelacion` | revelacion.mp3 | 0,53 | Suena junto al volteo |
| Draft | Se desvela una carta GOAT | `goat` | goat.wav | 0,50 | Sintetizado; sustituye a `revelacion` |
| Draft | El cursor pasa por una carta | `hoverCarta` | hoverCarta.wav | 0,12 | Sintetizado, muy suave; solo con ratón |
| Draft | Se elige una carta (clic) | `seleccionCarta` | seleccionCarta.wav | 0,22 | Sintetizado; no suena si ya estaba elegida |
| Draft | Se confirma la elección | `confirmarEleccion` | confirmarEleccion.wav | 0,25 | Sintetizado, distinto de `seleccionCarta` (spec 012) |
| Draft | Últimos 5 s del turno sin elegir | `latido` | latido.wav | 0,35 | Sintetizado; acelera y crece; se corta al elegir o al cambiar de turno (spec 012) |
| Duelos | Entran las cartas de un duelo | `entradaDuelo` | entradaDuelo.mp3 | 0,72 | 11 veces por cruce |
| Duelos | Chocan las cartas | `choqueDuelo` | choqueDuelo.mp3 | 0,53 | 11 veces por cruce |
| Duelos | Cálculo: recuento de puntos y ruleta del estado de forma | `calculoDuelo` | calculoDuelo.wav | 0,30 | Sintetizado; sin estado de forma se corta al acabar el recuento; a ×2 suena al doble de velocidad |
| Partido 2D | Empieza cada parte (también las de la prórroga) | `pitidoInicio` | pitidoInicio.wav | 0,30 | Sintetizado (silbato corto) (spec 012) |
| Partido 2D | Descanso, final de los 90 con prórroga y descanso de la prórroga | `pitidoDescanso` | pitidoDescanso.wav | 0,30 | Sintetizado (dos pitidos) (spec 012) |
| Partido 2D | Final del partido | `pitidoFinal` | pitidoFinal.wav | 0,32 | Sintetizado (tres pitidos, el último largo) (spec 012) |
| Partido 2D | Gol del equipo propio | `golPropio` | golPropio.wav | 0,45 | Sintetizado provisional: **sustituir** por un público CC0 cantando el gol. Un gol en propia puerta cuenta para el equipo que lo suma; quien mira sin jugar oye siempre este |
| Partido 2D | Gol del rival | `golRival` | golRival.wav | 0,30 | Sintetizado provisional: **sustituir** por un murmullo CC0 |
| Partido 2D | Tarjeta amarilla | `tarjetaAmarilla` | tarjetaAmarilla.wav | 0,32 | Silbato y «oooh» sintetizados (el «oooh», **sustituir** por CC0) (spec 012) |
| Partido 2D | Tarjeta roja (también por doble amarilla) | `tarjetaRoja` | tarjetaRoja.wav | 0,38 | Más intensa que la amarilla; «oooh» a **sustituir** (spec 012) |
| Tienda | Compra de un sobre de cartas (con fragmentos) | `cajaRegistradora` | cajaRegistradora.wav | 0,30 | Sintetizado provisional: **sustituir** por CC0 (spec 012) |
| Tienda | Compra de un diseño de sobre (suelto o dentro de un pack) | `cajaRegistradora` | cajaRegistradora.wav | 0,30 | El mismo efecto; los escudos y celebraciones comprados no suenan |
| Torneo | Pantalla de campeón | `aplausos` | aplausos.mp3 | 0,34 | |
| Torneo | Pantalla de derrota | `trompetas` | trompetas.mp3 | 0,75 | |

### Reglas de la 2D

- Los sonidos van a la velocidad de la reproducción, con un máximo de ×2 (a ×4 y ×8 suenan a ×2).
- Solo suena lo que se acaba de ver: cambiar de velocidad o recibir tramos nuevos no repite sonidos, y lo ya jugado
  al entrar o al reconectar no suena. Tras «Finalizar partido» (se ve todo de golpe) tampoco suena nada.
- La simulación rápida no tiene sonidos de partido.

### Celebraciones de gol

Las celebraciones (spec 012) se eligen en «Mi perfil». En la 2D, cada gol muestra la celebración del equipo que
marca, también los del rival.

| Celebración | Clase | Sonido propio |
| --- | --- | --- |
| Clásica (por defecto), Estadio, Neón, Pizarra | `juego` (animación CSS) | No: solo suena el efecto del gol (`golPropio` o `golRival`) |
| Prueba de secuencia (inactiva, solo para pruebas) | `secuencia` (vídeo WebM con transparencia) | No tiene |

Una celebración de clase `secuencia` puede traer su propio efecto en `datos.sonido` (en `data/cosmeticos.json`).
Ese valor es el nombre de un efecto de la tabla de arriba, así que para un sonido nuevo hay que añadir antes el
fichero a `public/sonidos/` y el efecto a `sonido.ts`. Suena junto al efecto del gol, con el mismo tope de ×2.

## Pendientes (ideas para añadir)

Añade aquí las acciones que deberían sonar. Columna «Sonido deseado»: una descripción basta («clic suave», «silbato»…).

| Pantalla | Acción | Sonido deseado | Prioridad |
| --- | --- | --- | --- |
| Varias | Sustituir los sintetizados provisionales (`golPropio`, `golRival`, el «oooh» de las tarjetas y `cajaRegistradora`) por grabaciones CC0 | Público real, murmullo, «oooh» de grada, caja registradora | Alta |
