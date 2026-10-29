# Data Model — Datos reales de la colección Core

No hay entidades nuevas en la base de datos ni en el protocolo. La ficha usa la entidad `Jugador` que ya existe
(`packages/domain/src/catalogo/tipos.ts`) y el esquema `player-data.schema.json`.

## 1. Ficha de jugador real (`Jugador`, sin cambios de forma)

| Campo | Regla en esta fase | FR |
|-------|--------------------|----|
| `id` | Entero 1–250, único. Se ordena por demarcación → nivel → nombre (R7). | FR-014 |
| `nombre`, `apellidos` | Grafía real, con tildes y caracteres propios (ø, ć…). | FR-007 |
| `nombre_carta` | Nombre por el que se le conoce (≤ 24 caracteres): «Lamine Yamal», «Neymar». | FR-007 |
| `nacionalidad` | Código de `SELECCIONES`: la selección absoluta con la que ha jugado; si no ha debutado, la de nacimiento (se anota como duda). | FR-007, FR-021 |
| `fecha_nacimiento` | ISO `YYYY-MM-DD` real. | FR-007 |
| `altura` | Entero en cm, 150–215. | FR-007 |
| `demarcacion` | La de su prime. | FR-008 |
| `posicion` | 1–3 posiciones, la principal primero. Un POR solo tiene `POR`. | FR-008 |
| `historia` | 2–3 frases en español con sus clubes, títulos y rasgos. | FR-012 |
| `stats` | Las 6 claves de `CLAVES_STATS[demarcacion]`, enteros 1–99, de su prime. | FR-009 |
| `media` | El promedio exacto de los stats, dentro de la banda del `nivel`. | FR-010 |
| `nivel` | `Superclase` (70–79,9), `Epico` (78–84,9), `Legendario` (83–89,9) o `GOAT` (≥ 88). | FR-010 |
| `virtudes` | Hasta `MAX_VIRTUDES[nivel]`, solo las permitidas por `virtudesPermitidas`. | FR-011 |
| `defectos` | 0–2, compatibles (`PAREJAS_INCOMPATIBLES`). | FR-011 |
| `imagen` | `/cartas/retratos/<slug>.webp`. | FR-013 |
| `imagen_bg` | `/cartas/fondos/{por,def,med,del}.svg`, según la demarcación. | FR-013 |

## 2. Retrato

- **Origen**: `retratos/<Nombre Real>.(png|jpg)`. No se modifica.
- **Destino**: `apps/web/public/cartas/retratos/<slug>.webp`, de 139 × 181, con alfa si el original lo tiene (R2).
- **Relación**: 1 retrato ↔ 1 ficha, a través de `imagen`. Ningún retrato queda sin usar y ninguna ruta queda rota
  (SC-004).

## 3. Selección

`SELECCIONES[<ALFA3>] = { nombre }` y `public/banderas/<ALFA3>.svg`. El escudo es `public/escudos/<ALFA3>.svg` solo
cuando `ESCUDOS_ACTIVOS` (R10). Invariante: el enumerado del esquema es igual a las claves de `SELECCIONES`, y hay una
bandera por cada clave.

## 4. Duda (`dudas.md`)

`id | jugador | campo | valor propuesto | motivo`. El motivo es uno de estos: `sin confirmar`, `homonimo`,
`doble nacionalidad`, `demarcacion cambiante`, `nivel en el limite`, `retrato` (sin transparencia, dudoso o del
jugador equivocado), `escudo`.

## 5. Sumario de la fase 0.1 (`sumario.md`, generado)

Lo produce `sumarioCore(jugadores, DISTRIBUCION_CORE)` (R11):

- `tabla[demarcacion][nivel] = { actual, objetivo, diferencia }`, con `Σ huecos − Σ excesos = 300 − 250`;
- `posiciones[pos] = { principal, secundaria, cobertura, pocaCobertura }`, para las 16 posiciones;
- `nacionalidades: [codigo, n][]`, en orden descendente;
- `defectos[nivel] = { proporcion, esperada }`;
- `excesos: { celda, sobran, candidatos: { id, nombre_carta, media, nivelPropuesto }[] }[]`;
- `necesidades: { demarcacion, nivel, cuantos, posicionPreferida, texto }[]`, priorizadas.

## 6. Transición del catálogo

Antes: `core.json` v1.0.0, con 300 ficticias. Después: `core.json` v2.0.0, con 1–250 reales (copiadas de
`core-real.json`) y 251–300 ficticias (DEL). La pertenencia a colecciones (`colecciones.json`) no cambia, porque los
ids son los mismos.
