# Quickstart: validar la spec 012

## Preparación

```bash
pnpm install
pnpm db:migrate                       # aplica 0015_spec012.sql
pnpm seed                             # carga las celebraciones de data/cosmeticos.json
pnpm dev
```

## Pruebas automáticas

```bash
pnpm typecheck && pnpm lint
pnpm test                             # dominio, motor (incidencias, bajas) y web
pnpm test:integration                 # servidor (y test:integration:hilos en @fbd/server)
pnpm test:equivalence                 # rápida ≡ 2D tras mover la resolución de lances al final del paso
pnpm e2e                              # tamaño del campo, tarjetas, control total
pnpm balance                          # informe: comparar con el anterior (research R2, riesgo)
```

## Recorridos

| # | Qué | Cómo | Resultado esperado | Criterio |
|---|-----|------|--------------------|----------|
| 1 | Sonidos del partido | Partido 2D contra NPC con 🔊 | Pitido corto al empezar cada parte, doble al descanso, triple al final; gol propio canta, rival murmulla; tarjetas con silbato y «oooh» | US1-1..4, SC-001 |
| 2 | Silencio y movimiento reducido | Repetir con 🔊 apagado y con «reducir movimiento» del sistema | Nada suena; la celebración solo hace fundido | US1-5, US1-6 |
| 3 | Celebración | 10 partidos 2D a ×1 y ×4 | Todos los goles (fuera de la tanda) la muestran; un gol nuevo la reemplaza; clic la cierra | SC-002 |
| 4 | Celebración favorita | Mi perfil → elegir otra de las 4 → nueva partida → gol | Se ve la elegida; los goles del NPC, la clásica | FR-011, FR-012 |
| 5 | Celebración de secuencia | Pantalla de pruebas → `celebracion-prueba-secuencia` | Se reproduce sin cambios en la pantalla del partido; en un navegador sin soporte, la clásica | SC-003 |
| 6 | Campo estable | Partido 2D completo a 1024 y 1440 px | El lienzo mide lo mismo al inicio, descanso y final | SC-004 |
| 7 | Tarjetas | «Lo que ha pasado» con amarilla y roja, temas claro y oscuro | Iconos amarillo y rojo | US2-2 |
| 8 | Gestionar equipo | Abrir en juego y en el descanso, 1024 px y móvil | Campo horizontal (o vertical si así se eligió), pestañas fijas, sin no convocados ni Personalización | US3 |
| 9 | Control total 2D | Control total → esperar lesión propia | Parada en el lance, aviso, «Gestionar equipo»; el cambio se aplica en esa interrupción | US4-2, SC-005 |
| 10 | Control total rápida | Igual en simulación rápida | El resumen se corta en el minuto del lance; al seguir se calcula el resto | US4-3 |
| 11 | Sin decidir | Parada → «Seguir» sin cambios, y otra dejando vencer la ventana | Se aplica lo automático | US4-4 |
| 12 | Rival y humanos | Lesión del NPC; partido entre dos humanos | Sin parada; sin selector entre humanos | US4-5, US4-6 |
| 13 | Misma semilla | Test del motor I1/I2 | Verde | SC-006 |
| 14 | Alineación respetada | Confirmar alineación y jugar 3 jornadas sin bajas | No cambia nada | US5-3, SC-007 |
| 15 | Baja pendiente | Titular lesionado → Torneo | Botón desactivado con «Sustituye a … para continuar»; aviso de intervención en Avisos; tras sustituir, el resto igual | US5-2, US5-4, US5-5, SC-008 |
| 16 | Forzar el bloqueo | `POST /api/partidos/:id/abrir` con la baja pendiente | 409 `BAJA_PENDIENTE` | SC-008 |
| 17 | Plazo vencido | Partida con 2 humanos, dejar vencer el plazo con la baja | Sustitución mínima y aviso `baja_sustituida` | US5-6 |
| 18 | Plantillas | Abrir Plantillas | Escudo (o color) y nombre de cada equipo | US5-1 |
| 19 | Sonidos de interfaz | Draft dejando agotar un turno; botones principales; comprar un sobre | Confirmación suave, latido desde 5 s cortado al elegir, clic suave, caja registradora | US6 |
| 20 | Sesión | Inicio con y sin sesión, escritorio y móvil | Botones visibles sin desplazarse y con icono | US7, SC-009 (con 5 personas) |
