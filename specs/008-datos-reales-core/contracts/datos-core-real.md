# Contrato — Datos reales de Core y comando `core-real`

## 1. `data/core-real.json`

Mismo formato que `data/core.json`. Lo valida `packages/protocol/schemas/player-data.schema.json` y después
`validarColeccion`.

```json
{
  "version": "1.0.0",
  "jugadores": [
    {
      "id": 1,
      "nombre": "Manuel",
      "apellidos": "Neuer",
      "nombre_carta": "Neuer",
      "nacionalidad": "DEU",
      "fecha_nacimiento": "1986-03-27",
      "altura": 193,
      "demarcacion": "POR",
      "posicion": ["POR"],
      "historia": "…",
      "stats": { "agilidad": 0, "colocacion": 0, "distribucion": 0, "aereo": 0, "defensa": 0, "liderazgo": 0 },
      "media": 0,
      "virtudes": [],
      "defectos": [],
      "nivel": "GOAT",
      "imagen": "/cartas/retratos/manuel-neuer.webp",
      "imagen_bg": "/cartas/fondos/por.svg"
    }
  ]
}
```

(Los valores numéricos del ejemplo solo muestran la forma.)

Invariantes adicionales que comprueba el comando:

- Ids: exactamente `{1, …, 250}`.
- `imagen` coincide con `^/cartas/retratos/[a-z0-9-]+\.webp$` y el fichero existe en `apps/web/public`.
- Las 250 rutas `imagen` son distintas y cubren todos los ficheros de `apps/web/public/cartas/retratos/`.
- `imagen_bg` es el fondo genérico de la demarcación.

## 2. Comando `pnpm --filter @fbd/fixtures core-real`

| Aspecto | Comportamiento |
|---------|----------------|
| Entradas | `data/core-real.json`, `data/core.json`, `apps/web/public/cartas/retratos/` |
| Salidas | `data/core.json` (ids 1–250 sustituidos, `version: "2.0.0"`) y `specs/008-datos-reales-core/sumario.md` |
| Errores | Lista `[id] regla: mensaje` (formato del seed), código de salida 1 y ningún fichero escrito |
| Idempotencia | Lanzarlo dos veces seguidas da el mismo resultado |
| Lo que no hace | No toca 251–300 ni `colecciones.json`, y no carga la base de datos (eso es `pnpm seed`) |

## 3. Cambio en la validación del dominio

`validarCatalogo` deja de dar error cuando Core no cumple `DISTRIBUCION_CORE`. El aviso de `informeColecciones` (seed)
se mantiene igual. Las demás reglas no cambian.

## 4. Selecciones

`SELECCIONES` (dominio) = enumerado `nacionalidad` (esquema) = ficheros `apps/web/public/banderas/<COD>.svg`. Las tres
listas tienen los mismos códigos.

## 5. Retrato en la carta (UI)

La carta no cambia de API. Una `imagen` que no sea `.svg` se pinta en `<img class="carta-silueta">` con proporción
139 : 181, sin deformarse. Si no carga, se usa la silueta genérica de la demarcación (FR-048 de la spec 004, sin
cambios).
