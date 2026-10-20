# Quickstart — validación de las mejoras de interfaz, simulación y experiencia de juego

Guía para comprobar de principio a fin que la aplicación cumple [spec.md](./spec.md). No contiene código de implementación: los detalles están en [data-model.md](./data-model.md) y en [contracts/](./contracts/). La puesta en marcha es la de las specs 001 y 002 ([002/quickstart.md](../002-mejoras-mvp/quickstart.md)).

## Puesta en marcha

```bash
pnpm install
docker compose up -d db
pnpm db:migrate                  # incluye 0006 a 0008: perfiles_usuario, ultima_modalidad y modalidades sin tipo_simulacion; pantallas vistas; nombre y equipaciones del perfil y equipaciones v2
pnpm seed --file data/core.json
pnpm dev                         # http://localhost:5173
```

**Antes de desplegar en la beta**, termina con la versión anterior los partidos en juego. Los partidos con parámetros 2.x no se pueden volver a simular con el motor 3.0.0: la interfaz muestra solo su resumen (research R2).

**Línea base para las comparaciones** (SC-005, SC-008 y SC-010): `git worktree add ../fbd-base c8a1627`. Desde ese directorio se ejecuta la misma herramienta `balance` y se ven los partidos 2D de la versión actual.

## Pruebas automáticas

| Comando | Qué valida |
|---------|-----------|
| `pnpm test` | **Dominio**: equipaciones v2 (`parecido`, `equipacionEnPartido`, `desdeV1`, `patronDiseno`), `validarNombre`, eliminaciones en liga, playoff y mixto (FR-039), `humanosEnCompeticion`. **Motor**: receptor y dirección del pase, motivos del pase largo, tiro por distancia, penalti espacial, invariantes 10 y 11 de [engine-api.md](./contracts/engine-api.md). **IA**: guardarraíl de errores (fast-check, SC-010b), PRO con una decisión dudosa por draft, perfil `automatico` sin errores. |
| `pnpm test:equivalence` | Rápida = 2D (SC-009); finalizar = ver hasta el final (SC-017); lote de decisiones = las mismas decisiones una a una (FR-030). |
| `pnpm test:integration` | `abrir` con modo y bloqueo del modo (FR-035), dos humanos con modos distintos (SC-018), `partido.decisiones` todo o nada e idempotente, `simular-resto` (SC-020a, < 5 s), `nombre-equipo` y unicidad (SC-021), `perfil` (registrado e invitado), migraciones 0006 a 0008 sobre datos de la 002. |
| `pnpm balance --n 1000` | SC-001 a SC-007 y SC-009 con equipos sintéticos, más la serie Core (research R8). En CI, `--n 200`. Cada ejecución genera `tools/balance/salida/informe.html`, que se abre en el navegador y muestra cada SC con su objetivo, el valor medido y ✅/❌, sin leer código (Principio IX). |
| `pnpm balance --torneos 100` | SC-010, SC-010a y SC-010b con el participante de referencia; guarda 20 drafts por nivel en `tools/balance/salida/npc-revision/`. |
| `pnpm --filter @fbd/engine bench` | ≤ 25 ms sin fotogramas, ≤ 40 ms con fotogramas y ≤ 30 ms con métricas. |
| `pnpm e2e` | Recorridos A a L, botón principal en el viewport a 1366 × 768 y 360 × 640 (SC-013), vista ampliada dentro de la pantalla en las cuatro esquinas (SC-015), tamaño de letra de la carta (SC-012). |

## Escenarios de validación manual

Cada escenario se puede repetir sin conocer el código (Principio IX).

### A. Simulación 2D que parece fútbol (US1; SC-001 a SC-008)

1. Crea una partida de liga de 4 contra NPC y juega un partido en «Simulación 2D» a x2.
2. Observa:
   - predominan los pases cortos y las conducciones con espacio;
   - un delantero cerca del área no lanza balones largos hacia su campo;
   - casi no hay tiros desde el centro del campo;
   - hay goles de cabeza tras centro, de falta directa o de penalti a lo largo del torneo.
3. Al terminar, en el resultado, cada gol muestra su tipo (jugada, de cabeza, de falta o de penalti).
4. **Prueba con personas (SC-008)**: al menos 5 personas ven 2 minutos de la 2D de la línea base y 2 de la nueva (escenarios fijos de `tools/fixtures`) y las puntúan de 1 a 5.

**Resultado esperado**: `pnpm balance` pasa SC-001 a SC-007, y la media de SC-008 es ≥ 3,5 y al menos 1 punto superior a la de la línea base.

### B. «Formación» con un único campo (US2; SC-014, SC-015)

1. Tras el draft, pulsa «Preparar equipo»: hay un solo campo.
2. Arrastra un extremo a la mediapunta. Su posición efectiva y la penalización cambian al soltar.
3. Arrastra un suplente sobre un titular: se intercambian.
4. Arrastra un titular sobre otro: intercambian sitio. Suelta una ficha fuera del campo: no cambia nada.
5. Pasa el cursor por una ficha junto al borde derecho: la carta completa aparece a la izquierda, entera.
6. Cambia de formación tras recolocar: aparece el aviso. Al cancelar, nada cambia; al aceptar, los titulares van a las casillas nuevas.
7. Arrastra al portero fuera de su zona. «Confirmar alineación» queda desactivado con el motivo.

**Resultado esperado**: todo funciona con un solo campo, y la carta nunca se sale de la pantalla.

### C. Modo de simulación por partido (US3; SC-018)

1. En la preparación del primer partido, el selector muestra «Simulación 2D» preseleccionada.
2. Juega en 2D. En el siguiente partido aparece preseleccionado el último modo elegido. Elige «Simulación rápida».
3. Al crear una partida nueva, no se pregunta el tipo de simulación.
4. Con dos humanos (A en 2D y B en rápida) en el mismo partido, los dos ven el mismo resultado y los mismos goleadores.

### D. Botón principal (US4; SC-013)

1. Recorre un torneo completo en un portátil de 1366 × 768 y, con las herramientas del navegador, a 360 × 640.
2. En cada pantalla, el botón que hace avanzar está visible sin desplazarse y sigue visible al bajar hasta el final de la plantilla.
3. Con una alineación inválida, «Confirmar alineación» aparece desactivado y explica por qué.

### E. Gestión del equipo en el descanso y durante la 2D (US5; SC-016)

1. Juega en rápida hasta el descanso. Pulsa «Gestionar equipo» y arrastra un suplente sobre un titular: el contador baja a 4.
2. Cambia a 4-3-3 y confirma. La segunda parte se juega con esos cambios.
3. En 2D, en el minuto 60, pulsa «Gestionar equipo»: la reproducción se pausa. Haz un cambio, confirma y vuelve: la reproducción sigue donde estaba y el cambio se aplica en la siguiente interrupción.
4. Con 5 sustituciones hechas, intenta otra: la pantalla no la permite y explica por qué. Un expulsado no aparece en el campo.
5. En una eliminatoria empatada a los 90 minutos, la pantalla también se abre antes de la prórroga.

### F. Finalizar partido (US6; SC-017)

1. En un partido 2D, pulsa «Finalizar partido» en el minuto 20.
2. Se pasa a una pantalla sin campo, con el marcador, los eventos con su minuto, las estadísticas y «Siguiente».
3. La misma pantalla aparece al terminar un partido en rápida.

### G. Cartas (US7; SC-012)

1. En el draft, en un portátil, lee en voz alta los seis stats y los specials de una carta GOAT con 4 specials, sin ampliar la pantalla.
2. Muestra juntas cartas de los cuatro niveles: cada una tiene su acabado propio, y Legendario y GOAT son claramente más llamativas.
3. La carta no reproduce el marco, el logotipo ni la tipografía de EA SPORTS FC.

### H. Apertura de sobres (US8; SC-019)

1. Abre un sobre y cronometra: ≤ 8 s. Hay partículas, las cartas salen una a una y se giran mostrando la carta completa.
2. Repite y haz un clic durante la animación: aparecen todas las cartas reveladas.
3. Con el sonido activado, el efecto es suave. Con el sonido silenciado, no suena nada. Con el movimiento reducido del sistema, solo hay un fundido.
4. El tiempo de elección del primer turno no se reduce.

### I. NPC más accesibles (US9; SC-010, SC-010b, SC-011)

1. Ejecuta `pnpm balance --torneos 100`. Las victorias del participante de referencia bajan de amateur a PRO, son mayores que las derrotas contra amateur e intermedio, y llegan al 10 % o más contra PRO.
2. Revisa los 20 drafts y preparaciones por nivel de `tools/balance/salida/npc-revision/`: los errores bajan con el nivel, el PRO tiene alguna decisión dudosa y en ningún nivel hay decisiones absurdas.
3. **Prueba con personas (SC-011)**: al menos 5 personas juegan su primer torneo contra NPC amateur.

### J. Derrota, campeón y simular el resto (US10; SC-020, SC-020a)

1. Crea un playoff de 8 en solitario con un equipo flojo, hasta caer en cuartos. Aparece «{Equipo} ha sido derrotado en Cuartos de final» con «Simular resto del torneo».
2. Sal al menú sin pulsarlo y vuelve desde «Mis partidas»: sigue la misma pantalla.
3. Pulsa el botón: en menos de 5 s (playoff de 16 caído en octavos) aparece la pantalla del campeón. El cuadro y los goleadores muestran todos los partidos.
4. En una liga pura, pierde partidos: no aparece nunca la pantalla de derrota, y al final aparece la del campeón.
5. En un mixto, termina la liga sin clasificarte: aparece «… derrotado en Fase de liga».

### K. Nombre y equipación (US11; SC-021, SC-022)

1. Entra como invitado y escribe el nombre «Los Halcones» en la sala. Aparece en el draft, en la clasificación, en la preparación, en el partido y en los goleadores.
2. Intenta usar el nombre de un equipo NPC de la partida: aparece el mensaje «Ese nombre ya lo usa otro equipo».
3. Diseña la primera equipación con rayas verticales blancas y rojas. La vista previa, la preparación y las chapas de la 2D coinciden.
4. Como usuario registrado, guarda en «Mi perfil» un nombre y unas equipaciones. En una partida nueva se proponen. Al cambiarlos solo para esa partida, el perfil no cambia.
5. Juega contra un rival con colores parecidos: el visitante usa la segunda equipación o unos colores ajustados, y se distinguen.

### L. Migración de partidas existentes

1. Con una base de datos de la 002 que tenga una partida en torneo, ejecuta `pnpm db:migrate`.
2. Comprueba que:
   - la partida se abre;
   - las equipaciones aparecen lisas con sus colores;
   - el selector de modo preselecciona el tipo que había elegido el anfitrión;
   - los partidos 2.x terminados muestran su resumen con el aviso de versión.

## Lista de comprobación de cierre

- [ ] Todos los comandos de la tabla de pruebas automáticas pasan.
- [ ] Los escenarios A a L están revisados manualmente.
- [ ] Las pruebas con al menos 5 personas de SC-008, SC-011, SC-012, SC-013, SC-014, SC-016 y SC-019 están hechas y anotadas.
- [ ] Las specs 001 y 002 están actualizadas según "Requisitos de specs anteriores afectados".
- [ ] Hay una propuesta de enmienda PATCH de la constitución (v1.0.4) con la referencia a esta spec (plan, Constitution Check).
