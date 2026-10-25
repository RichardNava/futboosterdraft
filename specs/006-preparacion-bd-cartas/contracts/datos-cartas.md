# Contrato — Ficheros de datos del catálogo

Formato de los ficheros que carga `pnpm seed`. Los esquemas JSON viven en `@fbd/protocol/schemas/`:

- `player-data.schema.json`, modificado;
- `colecciones.schema.json`, nuevo.

El modelo y las reglas de validación están en [data-model.md §1](../data-model.md#1-ficheros-de-datos).

## Carta

```json
{
  "id": 2,
  "nombre": "Filipe",
  "apellidos": "Galodez Dorelzal",
  "nombre_carta": "Filipe Galodez",
  "nacionalidad": "ENG",
  "fecha_nacimiento": "1996-01-02",
  "altura": 190,
  "demarcacion": "POR",
  "posicion": ["POR"],
  "historia": "Filipe Galodez (ENG) es un fijo en cualquier once. Destaca como POR.",
  "stats": { "agilidad": 82, "colocacion": 79, "distribucion": 73, "aereo": 67, "defensa": 72, "liderazgo": 71 },
  "media": 74,
  "virtudes": [],
  "defectos": [],
  "nivel": "Superclase",
  "imagen": "/cartas/siluetas/por.svg",
  "imagen_bg": "/cartas/fondos/por.svg"
}
```

- `additionalProperties: false`: un fichero con el campo `coleccion` se rechaza.
- `nacionalidad`: enumeración generada de `SELECCIONES`. Una prueba compara el esquema con la tabla del dominio, como ya
  se hace con los rasgos.
- `imagen` e `imagen_bg`: `pattern: "^/cartas/[a-z0-9/_-]+\\.(svg|png|webp|jpg)$"`.

## Colecciones

Ejemplo en [data-model.md §1.2](../data-model.md#12-colecciones-datacoleccionesjson).

- `tipo: 'basica'` no lleva `precio_centimos`.
- `tipo: 'pago'` lo exige.

## Comando de carga

```text
pnpm seed                                   # data/core.json + data/cartas-prueba.json + data/colecciones.json
pnpm seed --file a.json --file b.json --colecciones c.json
```

El comando rechaza **todo** el lote si hay un solo error (como hoy) e informa:

- del recuento por demarcación × nivel de cada colección;
- de las cartas entregadas a los compradores de colecciones ampliadas (data-model §4.3).
