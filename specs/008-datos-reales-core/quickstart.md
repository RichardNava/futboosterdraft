# Quickstart — Validar la spec 008

## Requisitos

- `pnpm install` hecho y la base de datos de desarrollo levantada (como en specs anteriores).
- Conviene terminar o borrar las partidas de desarrollo en curso antes de resembrar (research R12).

## 1. Retratos (US2; SC-004, SC-005)

1. Comprueba que `apps/web/public/cartas/retratos/` tiene 250 ficheros `.webp` con nombres en minúsculas y guiones.
2. Compara el peso total con el de `retratos/` (13 MB). Debe ser como mucho 6,5 MB.
3. Comprueba que `retratos/` sigue intacto (`git status retratos/` no muestra cambios en ficheros que ya estaban).

## 2. Datos y fusión (US1; SC-001, SC-003, SC-004)

```sh
pnpm --filter @fbd/fixtures core-real
```

- Esperado:
  - termina sin errores;
  - `data/core.json` queda con `version` `2.0.0` y 300 cartas, y las 1–250 coinciden con `data/core-real.json`;
  - `specs/008-datos-reales-core/sumario.md` queda actualizado.
- Prueba de errores: cambia una media de `core-real.json` para que no coincida con el promedio. El comando debe fallar
  con la regla `media` y no tocar `core.json`. Después deshaz el cambio.

## 3. Pruebas automáticas (SC-007)

```sh
pnpm -r test
pnpm -r typecheck
```

Esperado: todo en verde, incluida la prueba de 10 000 mesas de 8 de `generador.test`. Si falla, el sumario debe
señalarlo como primera necesidad (R8).

## 4. Seed y juego (SC-007, SC-008)

```sh
pnpm seed
```

- Esperado:
  - «Cargadas … cartas»;
  - el informe puede avisar de que Core se aleja de la tabla de 300, pero no rechaza nada.
- En `pnpm dev`:
  - **Ruta de pruebas de cartas** (solo en desarrollo): las cartas reales muestran su retrato, nítido y sin deformarse,
    en tamaño normal y ampliado. Mira también los tres retratos JPG (Haaland, Lamine Yamal, Neuer).
  - **Colección**: se ven los nombres reales y sus banderas, también las de las selecciones nuevas.
  - **Draft**: al crear una partida y abrir sobres salen jugadores reales.
- Escudos: siguen sin mostrarse en ninguna carta mientras `ESCUDOS_ACTIVOS = false` (R10).

## 5. Revisión de datos (SC-002)

Toma 20 jugadores conocidos de `core-real.json` y compáralos con fuentes públicas. Comprueba la fecha de nacimiento, la
nacionalidad y la demarcación, y que la altura no se desvíe más de ±2 cm. Al menos 19 de 20 deben estar bien. Lo
dudoso debe estar ya en `dudas.md`.

Comprueba también que Messi, Cristiano Ronaldo y Neymar son GOAT y están entre las medias más altas.

## 6. Sumario (US3; SC-006)

- Cuenta a mano una celda, por ejemplo los DEF Épico de `core-real.json`, y compárala con la tabla del sumario.
- Comprueba que los huecos menos los excesos suman 50.
- Lee solo la lista de necesidades: debe bastar para elegir los 50 jugadores que faltan.
