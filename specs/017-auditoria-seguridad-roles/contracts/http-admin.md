# Contrato HTTP: administración y cambios en la API

Todas las rutas de `/api/admin/*` exigen sesión y rol `administrador`, comprobados en el servidor en cada petición.

| Caso | Respuesta |
|---|---|
| Sin sesión | `401 SIN_SESION` |
| Con sesión y otro rol | `403 SOLO_ADMINISTRADORES`, con el intento en el registro |
| Cuerpo no válido | `400 VALIDACION`, sin efecto |

`motivo`: texto de 3 a 500 caracteres, sin caracteres de control.

## Cuentas

### `GET /api/admin/cuentas?q=&cursor=&limite=`

Busca por correo o apodo. `limite` máximo: 50.

```json
{
  "cuentas": [{ "id": "…", "apodo": "…", "email": "…", "rol": "betatester", "suspendida": false, "premiumCortesia": false, "saldo": 1200 }],
  "cursor": null
}
```

### `PUT /api/admin/cuentas/:id/rol`

Cuerpo: `{ "rol": "jugador" | "betatester" | "administrador", "motivo": "…" }`.

Errores: `409 ROL_PROPIO`, `409 ULTIMO_ADMINISTRADOR`, `422 INVITADO_SIN_ROL`, `422 CUENTA_SUSPENDIDA`.

### `POST /api/admin/cuentas/:id/suspender`

Cuerpo: `{ "motivo": "…" }`. Termina todas sus sesiones y conexiones en 5 s como máximo.

Errores: `409 SUSPENSION_PROPIA`, `422 NO_SUSPENDIBLE` (administrador o invitado).

### `POST /api/admin/cuentas/:id/reactivar`

Cuerpo: `{ "motivo": "…" }`.

### `PUT /api/admin/cuentas/:id/premium`

Cuerpo: `{ "cortesia": true | false, "motivo": "…" }`. Error: `422 INVITADO_SIN_PREMIUM`.

### `POST /api/admin/cuentas/:id/fragmentos`

Cuerpo: `{ "idEntrega": "<uuid>", "cantidad": 1000, "motivo": "…" }`.

- `cantidad`: entero entre 1 y 10.000.
- Repetir el mismo `idEntrega` devuelve el resultado original sin volver a sumar.
- Errores: `422 CANTIDAD_INVALIDA`, `422 NO_BETATESTER`, `409 ID_ENTREGA_REUTILIZADO`.

Respuesta: `{ "idEntrega": "…", "cantidad": 1000, "saldo": 2200 }`.

## Partidas

### `GET /api/admin/partidas?cursor=&limite=`

Partidas en `buscando`, `en_draft` o `en_torneo`.

```json
{
  "partidas": [{ "id": "…", "estado": "en_draft", "modo": "liga", "humanos": 4, "participantes": 8, "creadaEn": "…", "participaAdmin": false }],
  "cursor": null
}
```

**No incluye** cartas, elecciones, alineaciones ni tácticas (FR-024).

### `POST /api/admin/partidas/:id/cerrar`

Cuerpo: `{ "motivo": "…" }`.

Errores: `404 PARTIDA_NO_ENCONTRADA`, `409 PARTICIPA_ADMIN`, `409 PARTIDA_NO_ACTIVA`.

## Ajustes

### `GET /api/admin/ajustes`

```json
{ "ajustes": [{ "clave": "identidad_cartas", "valor": "real", "admitidos": ["real", "alternativa"] }] }
```

### `PUT /api/admin/ajustes/:clave`

Cuerpo: `{ "valor": "…", "motivo": "…" }`. Solo claves y valores de `AJUSTES_CONOCIDOS`. Se aplica en 30 s como máximo y
solo a las partidas nuevas.

## Registro

### `GET /api/admin/registro?accion=&actor=&objeto=&cursor=&limite=`

Solo lectura; no hay ruta para editar ni borrar. Una cuenta eliminada se muestra como «Cuenta eliminada».

## Cambios en la API actual

| Ruta | Cambio |
|---|---|
| `GET /api/me` | `usuario.rol`: `invitado`, `jugador`, `betatester` o `administrador` |
| `POST /api/auth/login` | Cuenta suspendida con contraseña correcta: `403 CUENTA_SUSPENDIDA` |
| `GET /api/tienda`, `GET /api/cosmeticos` | Añaden `pagoEuros: boolean` |
| Compras con `moneda: 'eur'` | Con el pago cerrado: `409 PAGO_NO_DISPONIBLE`, sin cobro ni entrega |
| `GET /healthz` | Solo `estado` |
| `/api/auth/ba/*` | Se retira |

## Consola

```text
pnpm --filter @fbd/server admin designar <email>
pnpm --filter @fbd/server admin cerrar-partida <id> "<motivo>"
```

- `designar` solo funciona si no hay ningún administrador activo. Con alguno, el rol se asigna desde el panel.
- `cerrar-partida` espera hasta 15 s la respuesta del servidor. Si no está en marcha, avisa y la orden caduca.
- `ajuste` y `premium` siguen igual y registran su acción con el actor `consola`.
