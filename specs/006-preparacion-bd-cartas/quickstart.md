# Quickstart — Validación de la spec 006

Guía para comprobar la spec de principio a fin. Los contratos están en [contracts/](./contracts/) y el modelo en
[data-model.md](./data-model.md).

## Preparación

```bash
pnpm install
docker compose up -d db
pnpm db:migrate               # aplica 0011_colecciones
pnpm seed                     # core.json + cartas-prueba.json + colecciones.json
pnpm dev
```

**Resultado esperado del seed**:

- carga 375 cartas y 3 colecciones: `core` con 300 cartas, `all-stars` con 45 y `top-argentinos` con 42;
- muestra el recuento de Core igual a `DISTRIBUCION_CORE`;
- no informa de ningún error.

## Pruebas automáticas

```bash
pnpm typecheck && pnpm lint
pnpm test                         # unidad: validación del catálogo, mínimo (fast-check), sobre de la tienda, economía
pnpm test:integration             # tienda.test.ts, coleccion.test.ts, recompensa.test.ts, migracion-0011.test.ts
pnpm balance -- --solo colecciones  # informe SC-003 y SC-005
pnpm e2e -- coleccion tienda
```

**Resultado esperado**:

- todo en verde;
- en el informe de `balance`, SC-003 y SC-005 con «Cumple».

## Escenarios manuales

| # | Escenario | Pasos | Resultado esperado |
|---|---|---|---|
| A | Acceso (US1, escenarios 1 y 2) | Sin sesión, abrir `/coleccion`; después, como invitado; después, registrarse | Los dos primeros casos piden iniciar sesión o registrarse; los enlaces «Colección» y «Tienda» solo aparecen para el registrado |
| B | Colección inicial (SC-001) | Usuario nuevo → «Colección» | 300 cartas, 300 activas, «Cumple el mínimo», saldo 0; buscar «valotal» (sin tilde ni mayúsculas) encuentra la carta en menos de 15 s |
| C | Cuadrícula (US1, escenarios 3 a 7) | Cambiar el tamaño, ordenar por nacionalidad en sentido descendente, ir a la última página, recargar | El paginador se recalcula; tamaño y orden se conservan tras recargar |
| D | Ficha | Pulsar una carta; cerrar con Escape | Se ven la carta ampliada, la historia, la colección «Core» y el aviso de que no se puede desfragmentar |
| E | Mínimo (US2, escenario 3) | Con solo Core, intentar desactivar cualquier carta | Se impide con «Mínimo de POR Superclase: 14; tienes 14 activas» |
| F | Recompensa (US3, escenario 1; SC-008) | Crear un torneo de 4 contra la IA, ganarlo con «Simular el resto» si hace falta | La pantalla de campeón muestra «+10 fragmentos»; el saldo es 10 y el historial tiene la recompensa |
| G | Fragmentos de prueba | Comprar el paquete de 1.000 fragmentos con el pago simulado (US7) | La cinta «PAGO DE PRUEBA» es visible; el saldo sube 1.000 |
| H | Sobre (US4; SC-010) | Comprar un sobre con fragmentos desde «Colección» → «Tienda» | Se descuentan 1.000; hay animación de apertura; llegan 8 cartas nuevas, activas, sin repetidas y con los cupos del draft; todo en menos de 1 minuto |
| I | Doble pulsación (US4, escenario 6) | En la herramienta de red, limitar la conexión y pulsar «Confirmar» dos veces; o cortar la red y pulsar «Reintentar» | Un solo cargo y un solo sobre |
| J | Colección (US5) | Comprar *Top Argentinos* tras tener alguna de sus cartas | Animación de confirmación; resumen con las cartas nuevas y los fragmentos por duplicado (25/50/75/100 según el nivel); la tarjeta queda «Adquirida» |
| K | Pertenencia múltiple (Edge Cases) | Comprar después *All Stars* | Las 6 cartas compartidas dan fragmentos, no copias |
| L | Desfragmentar (US3, escenarios 2 a 5) | Desfragmentar una carta Épica de *All Stars*; cancelar una vez y confirmar otra | Al cancelar no cambia nada; al confirmar, +50 y la carta desaparece |
| M | Colección activa en el torneo (US2, escenarios 1 y 6; SC-003) | Desactivar las cartas de *All Stars* que superan el mínimo, crear un torneo y luego reactivarlas | Ninguna carta inactiva en los sobres; el torneo ya creado no cambia |
| N | Presentación de la carta (US6; SC-009) | Abrir `/_pruebas/cartas` y la cuadrícula en tamaño pequeño | Bandera y escudo bajo la media; fondo de la acción de cada demarcación al 25 %; en tamaño pequeño, solo la bandera; un escudo renombrado a mano muestra el código del país, sin icono roto |
| O | Saldo e historial (SC-006) | Tras los pasos anteriores, abrir el historial | La suma de los movimientos coincide con el saldo |
