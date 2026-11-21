# Recorrido manual (pre-recorrido del 2026-11-20)

**Hecho el 2026-11-21.** La persona responsable recorrió todos los puntos de «Lo que queda para ti». Su único
hallazgo fue que la ayuda «i» de «Automático / Control total» no se veía, ni en la 2D ni en Táctica, y está corregido:
el recuadro se quedaba invisible porque nunca se marcaba como colocado. Las tareas están marcadas.

El 2026-11-20 se repasaron en el navegador, con guiones de Playwright, los recorridos a mano que quedaban abiertos:

- la 006/T103 (escenarios A–O);
- la 012 (T076, recorridos 1 a 20, y las rondas T089, T100, T106 y T116);
- la 013/T073;
- los quickstart de la 014 y de la 015 (paso 5).

Este documento dice qué quedó comprobado y qué queda para la persona responsable: lo que hay que oír, mirar o probar
en un entorno que los guiones no reproducen. Cuando esté hecho, se marcan las tareas y se tacha la fila «Recorridos a
mano» de las comprobaciones pendientes del [ROADMAP](../ROADMAP.md).

## Preparación

```bash
docker compose up -d db
pnpm db:migrate && pnpm seed
pnpm dev                      # web en http://localhost:5173
```

- Navegador de escritorio con el sonido activado (🔊 en la barra) y la ventana a 1366 × 768 o mayor.
- Para el móvil: las herramientas del navegador (F12 → modo dispositivo) a 360 × 640.
- Para dar fragmentos sin jugar no hay ruta en `pnpm dev` (`/api/dev/fragmentos` solo existe con el reloj simulado).
  Basta con lo que se gana desfragmentando o con el saldo de una cuenta de pruebas.

## Errores que encontró el pre-recorrido (ya corregidos)

| # | Dónde | Error | Corrección |
|---|---|---|---|
| 1 | Partido 2D | No sonaban los pitidos de inicio de cada parte, del descanso ni del final (012, US1): el servidor no enviaba a la 2D esos eventos y el primero se daba por «ya visto» | El tramo lleva `inicio_tramo` y `fin_tramo` (la lista de eventos no los muestra) y, al entrar en el minuto 0, el pitido inicial suena. Prueba en `finalizar.test.ts` y `resumenEventos.test.ts` |
| 2 | Formación | Con un lesionado en la alineación, la barra decía «No se puede confirmar: Jugador 75 no disponible» | Ahora nombra al jugador: «Carvajal no está disponible; sustitúyelo» |
| 3 | Gestionar equipo y Formación a 1024 px | El banquillo se cortaba por la derecha (el campo horizontal ocupaba el 60 % y el lateral necesita 400 px) | El campo deja siempre sitio al lateral |
| 4 | Tienda a 360 px | El botón de compra del sobre se salía 21 px de la pantalla | En móvil, el sobre va encima del texto |

## Lo que queda para ti

Para cada punto: qué hacer y qué debe pasar. Lo que no aparece aquí ya está comprobado (ver el resumen al final).

### Sonido (los guiones registran qué efecto se dispara, pero no pueden oírlo)

1. **Partido 2D contra la IA** (012, recorrido 1; T106 y T100, ambiente). Nueva partida → draft → «Simulación 2D» → a
   ×1 los primeros minutos. Debe sonar:
   - un pitido corto al empezar, dos en el descanso y tres al final;
   - la grada cantando con el gol propio y un lamento con el del rival;
   - silbato y «oooh» con las tarjetas;
   - de fondo, el ambiente de grada (bombos, cánticos y vuvuzelas), sin que suene a ruido.

   Si un sonido no gusta, apúntalo en [sonidos.md](juego/sonidos.md).
2. **Silencio** (012, recorrido 2). Con 🔇, repite unos minutos: no debe sonar nada, tampoco el ambiente.
3. **Sonidos de interfaz** (012, recorrido 19). En el draft:
   - deja correr un turno sin elegir: desde los 5 s finales, un latido que acelera, y se corta al elegir;
   - al elegir y confirmar, dos sonidos suaves distintos;
   - el botón principal hace un clic suave;
   - comprar un sobre en la tienda suena a caja registradora.

### Cosas que hay que ver en movimiento

4. **Balón y fuera de juego** (014, paso 3).
   - En una 2D a ×1, sigue el balón un rato: solo cambia de dirección cuando lo toca alguien o en un saque, y un pase
     que nadie alcanza rueda y frena.
   - Al ver un fuera de juego (suele haber 1–6 por partido), pausa: el receptor estaba por delante del penúltimo
     defensor cuando salió el pase.
5. **Celebraciones** (012, recorridos 4 y 5; T106).
   - En «Mi perfil» elige una celebración que no sea la clásica y marca un gol en la 2D: sale la elegida. Los goles
     del rival IA salen con la clásica. En el guion, el primer gol fue del rival y salió la clásica, así que la
     elegida queda por ver.
   - Abre `/_pruebas/cartas` y pulsa la celebración de secuencia: se reproduce igual que en el partido.
   - Si tienes «Discoteca» o «Fuegos artificiales», míralas en un gol de verdad (en la tienda ya se ven bien).
6. **Táctica de la 015** (paso 2, «En la aplicación»):
   - en un córner a favor suben casi todos (dos se quedan atrás);
   - en el descuento, perdiendo de uno, sube el portero;
   - un extremo muy regateador encara y sale en conducción varias veces por partido;
   - con un central de mucho liderazgo, la línea defensiva sube y baja junta.
7. **Energía tarde en el partido** (014, paso 4).
   - Con «Control total», espera una parada (gol o incidencia) pasado el minuto 75, o la pausa antes de la
     prórroga. Las caras y porcentajes de los titulares bajan de 100 y la penalización sale en rojo («−12 %»).
   - Haz un cambio y vuelve a abrir la gestión: el que entra marca 100 %.
   - Abre la ayuda «?» de la energía: sale la tabla de tramos.

   En el descanso ya está comprobado (todos al 100 %).
8. **Legibilidad de las cartas** (013, US2 y US6).
   - En `/_pruebas/cartas`, mira las cartas de 5 y 6 rasgos sobre las ilustraciones más claras: se lee todo y la
     ilustración se sigue viendo.
   - En Formación, prueba el zoom del navegador del 50 % al 200 %: la media del equipo se ve entera sobre la estrella.
9. **Recolocar en el descanso y reabrir** (T116): en el descanso de una 2D, mueve un jugador en «Gestionar equipo»,
   confirma y vuelve a abrir. La posición se conserva.

### Cosas que necesitan otro entorno

10. **Servidor caído** (013, US4). Con la app abierta:
    - para el servidor (Ctrl+C en `pnpm dev`) y recarga la pestaña: a los 3 s, «Conectando con el servidor…»;
    - arranca el servidor de nuevo: la pantalla carga sola en menos de 5 s.
11. **Inicio de sesión con muchos intentos** (013, US5). En desarrollo no se limita nada: Better Auth solo limita en
    producción. En el despliegue de prueba, prueba unos 5 inicios de sesión malos seguidos. Debe salir «Demasiados
    intentos. Espera un minuto y vuelve a probar.».
12. **Red lenta** (014, paso 5.2 y 5.3). F12 → Red → «Slow 3G».
    - Cambia de pantalla: se queda la anterior y a los 2 s aparece la barra de carga, que se va al terminar.
    - Pulsa dos enlaces seguidos: solo se carga el último.

    Con la red normal ya está comprobado que nada parpadea.
13. **Partidas de antes del motor 8.0.0** (015, paso 5.2 y 5.4). Si tu base de datos tiene una partida creada antes
    del 2026-11-17:
    - Van Dijk sale ahí con Aura (en una nueva sale con Cabeceador, comprobado);
    - un partido de entonces se reproduce en 2D igual que antes.
14. **SC-009 con cinco personas** (012, recorrido 20): que cinco personas encuentren los botones de Inicio con y sin
    sesión, en escritorio y móvil, sin desplazarse. Que se ven sin desplazarse ya está medido.

### Opcional

15. **Recompensa del campeón** (006, escenario F). En el guion ganó la IA. Si ganas un torneo con una cuenta
    registrada, la pantalla de campeón muestra los fragmentos ganados y el historial los recoge. Ya lo cubre
    `recompensa.test.ts`.

## Qué marcar al terminar

- 006/T103 (escenarios A–O): con el punto 15, o sin él.
- 012/T076, T089, T100, T106 y T116: con los puntos 1–3, 5, 7, 9 y 14.
- 013/T073: con los puntos 8, 10 y 11. El ajuste `acceso_niveles_rareza` ya quedó en `libre`.
- 014 y 015, quickstart: con los puntos 4, 6, 7, 12 y 13.

## Resumen de lo ya comprobado por el pre-recorrido

- **006**:
  - A, B y C: acceso, 300 cartas, búsqueda sin tildes, orden y preferencias que se conservan.
  - D y E: ficha con la historia; el mínimo explicado.
  - H: sobre de 8 cartas nuevas en 8 s.
  - I: doble pulsación con la red lenta: un solo cargo.
  - J: expansión con los repetidos convertidos en fragmentos.
  - L: desfragmentar (cancelar no cambia nada).
  - M: cartas inactivas fuera del draft.
  - N: bandera en la cuadrícula pequeña.
  - O: el historial suma el saldo.
  - Colección y tienda a 360 px sin desplazamiento horizontal.
  - Obsoletos con los datos actuales: G (no hay fragmentos a la venta), K (las expansiones no comparten cartas) y el
    escudo de N (no hay escudos).
- **012**:
  - Recorrido 3: cuatro celebraciones en un partido; un clic las cierra.
  - Recorrido 2: con movimiento reducido, solo fundido.
  - Recorrido 6: el lienzo mide lo mismo al inicio y en el descanso (1024 y 1440 px).
  - Recorrido 7: iconos de tarjetas.
  - Recorrido 8: gestión en juego a 1024 y 360 px, sin «Personalización».
  - Recorrido 9 y T116: parada por lesión en control total (sigue abierta tras 2 min); botiquín.
  - Recorrido 15: bloqueo con «Sustituye a … para continuar» y aviso en Avisos.
  - Recorridos 13, 14, 16 y 17: pruebas del motor e integración (`bajas-pendientes.test.ts`).
  - Recorrido 18: Plantillas con escudo y media.
  - Recorrido 20: botones de Inicio visibles sin desplazarse.
  - Los efectos se disparan en su momento: pitidos (tras la corrección), goles, tarjetas, ambiente, caja registradora
    y apertura del sobre.
- **013**:
  - US1: identidad alternativa con fondos genéricos y vuelta a real; ninguna imagen rota.
  - US3, rareza restringida:
    - bloqueo con candado y ayuda en la barra;
    - sin saldo, aviso;
    - Rico por 100 cobrado una vez con doble clic;
    - el invitado no puede pagar;
    - el premium de cortesía lo desbloquea;
    - el pase, primero y destacado en la tienda, da +30 días en cada compra;
    - vuelta a `libre`.
  - US5: contraseña mala, con el enlace de recuperación.
  - US7: Mi perfil sin desplazarse a 1366 × 768 y apilado a 375 px.
- **014**:
  - Pruebas del motor (M1–M5) en verde.
  - Informe de equilibrado de la 8.0.0: 76 de 76.
  - «Fueras de juego» en las estadísticas.
  - Sin indicador de energía durante la 2D; todos al 100 % en el descanso.
  - Navegación sin parpadeos con la red normal; el saldo de Inicio, al día tras comprar.
- **015**:
  - Van Dijk con Cabeceador en una colección nueva.
  - «Juego por las bandas» en el panel de táctica.
  - Pruebas de curvas, quite, Cabeceador, desmarque, liderazgo y equivalencia en verde.
