# Sonidos del juego

Qué suena con cada acción. Este documento se edita a mano: cambia un volumen, marca un sonido para sustituirlo o
añade filas en «Pendientes» con las acciones que deberían sonar, y pide que se apliquen los cambios.

- Código: `apps/web/src/sonido/sonido.ts` (`reproducir('<efecto>')`).
- Ficheros: `apps/web/public/sonidos/` (procedencia y licencias en `LICENCIA`).
- Sintetizados: `tools/sonidos/generar.py` (`python tools/sonidos/generar.py`).
- Volumen final = volumen del efecto × volumen general. **Volumen general: 0,65.**
- El jugador puede silenciarlo todo con el interruptor 🔊 (se recuerda en el navegador).

## Sonidos actuales

| Pantalla | Acción | Efecto | Fichero | Volumen | Notas |
| --- | --- | --- | --- | --- | --- |
| Draft | Se abre un sobre | `apertura` | apertura.mp3 | 0,75 | Rasgado del sobre |
| Draft | Sale una carta del sobre | `reparto` | reparto.mp3 | 0,81 | Una vez por carta |
| Draft | Se gira una carta | `volteo` | volteo.mp3 | 1,03 | Una vez por carta |
| Draft | Se desvela una carta Legendaria | `revelacion` | revelacion.mp3 | 0,53 | Suena junto al volteo |
| Draft | Se desvela una carta GOAT | `goat` | goat.wav | 0,50 | Sintetizado; sustituye a `revelacion` |
| Draft | El cursor pasa por una carta | `hoverCarta` | hoverCarta.wav | 0,12 | Sintetizado, muy suave; solo con ratón |
| Draft | Se elige una carta (clic) | `seleccionCarta` | seleccionCarta.wav | 0,22 | Sintetizado; no suena si ya estaba elegida |
| Duelos | Entran las cartas de un duelo | `entradaDuelo` | entradaDuelo.mp3 | 0,72 | 11 veces por cruce |
| Duelos | Chocan las cartas | `choqueDuelo` | choqueDuelo.mp3 | 0,53 | 11 veces por cruce |
| Duelos | Cálculo: recuento de puntos y ruleta del estado de forma | `calculoDuelo` | calculoDuelo.wav | 0,30 | Sintetizado; sin estado de forma se corta al acabar el recuento; a ×2 suena al doble de velocidad |
| Torneo | Pantalla de campeón | `aplausos` | aplausos.mp3 | 0,34 | |
| Torneo | Pantalla de derrota | `trompetas` | trompetas.mp3 | 0,75 | |

## Pendientes (ideas para añadir)

Añade aquí las acciones que deberían sonar. Columna «Sonido deseado»: una descripción basta («clic suave», «silbato»…).

| Pantalla | Acción | Sonido deseado | Prioridad |
| --- | --- | --- | --- |
| Partido | Gol (propio / rival) | | |
| Partido | Pitido inicial, descanso y final | | |
| Partido | Tarjeta amarilla / roja | | |
| Draft | Se confirma la elección | | |
| Draft | Quedan pocos segundos del turno | | |
| General | Botón principal pulsado | | |
| Tienda | Compra de un sobre | | |
