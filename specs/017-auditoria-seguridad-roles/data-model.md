# Data Model: Auditoría de seguridad y roles

Todo va en la migración `0018_spec017.sql`. No hay datos de producción que migrar: las cuentas existentes quedan como
`jugador`, y las de invitado se identifican por `es_invitado`.

## Cambios en tablas existentes

### `usuarios`

| Columna | Tipo | Reglas |
|---|---|---|
| `rol` | `text not null default 'jugador'` | `jugador`, `betatester` o `administrador` |
| `suspendida_en` | `timestamptz null` | Con valor, la cuenta no puede entrar |

*Checks*:

- `usuarios_rol_ck`: valores admitidos.
- `usuarios_invitado_rol_ck`: `not es_invitado or rol = 'jugador'`.
- `usuarios_admin_suspension_ck`: `rol <> 'administrador' or suspendida_en is null`.
- `usuarios_invitado_suspension_ck`: `not es_invitado or suspendida_en is null`.

**Rol efectivo** (FR-040): `es_invitado ? 'invitado' : rol`.

### `pases_premium`

La clave ajena a `usuarios` pasa a `ON DELETE CASCADE` (research R24).

### `movimientos_fragmentos`

- `motivo` admite `entrega_betatester`.
- Índice único parcial `movimientos_entrega_betatester_uq` sobre `(referencia)` con ese motivo; la referencia es el
  `idEntrega`.

### `avisos`

`tipo` admite `partida_cerrada`.

### `peticiones_procesadas`

- Índice `peticiones_procesadas_creada_idx` sobre `creada_en`, para la purga de 7 días.
- La columna `partida_id` conserva su nombre y guarda el ámbito (research R3).

## Tablas nuevas

### `registro_admin`

Entrada inalterable de una acción o de un intento denegado (FR-047).

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | `uuid` PK | Generado |
| `actor_id` | `text null` | Sin clave ajena: sobrevive a la cuenta. `null` si actúa la consola |
| `actor_tipo` | `text not null` | `cuenta` o `consola` |
| `actor_rol` | `text not null` | Rol efectivo en ese momento, o `consola` |
| `accion` | `text not null` | Ver lista |
| `objeto_tipo` | `text null` | `cuenta`, `partida` o `ajuste` |
| `objeto_id` | `text null` | Id, nunca correo ni apodo |
| `valor_anterior` | `jsonb null` | Sin datos personales |
| `valor_nuevo` | `jsonb null` | Sin datos personales |
| `motivo` | `text null` | Hasta 500 caracteres |
| `resultado` | `text not null` | `ok`, `denegado` o `error` |
| `intentos` | `integer not null default 1` | Mayor que 0; agrupa denegados |
| `creado_en` | `timestamptz not null` | |

Índices: `(creado_en desc)`, `(objeto_tipo, objeto_id, creado_en desc)` y `(actor_id, creado_en desc)`.

Acciones: `rol.cambiar`, `cuenta.suspender`, `cuenta.reactivar`, `premium.conceder`, `premium.retirar`,
`fragmentos.entregar`, `ajuste.cambiar`, `partida.cerrar`, `panel.acceso_denegado`.

**Inalterable**: un *trigger* `BEFORE UPDATE OR DELETE` lanza un error. Solo admite un `UPDATE` que ponga `motivo` a `null`
sin tocar ninguna otra columna, para retirar texto libre al eliminar la cuenta afectada.

### `ordenes_consola`

Órdenes de la consola que necesitan el estado en memoria del servidor (research R21).

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | `uuid` PK | |
| `tipo` | `text not null` | `partida.cerrar` |
| `datos` | `jsonb not null` | `{ partidaId, motivo }` |
| `estado` | `text not null default 'pendiente'` | `pendiente`, `hecha`, `rechazada` o `caducada` |
| `resultado` | `jsonb null` | Mensaje para la consola |
| `creada_en` | `timestamptz not null` | |
| `procesada_en` | `timestamptz null` | |

Índice parcial sobre `creada_en` con `estado = 'pendiente'`.

## Entidades de la auditoría

Viven en ficheros, no en la base de datos.

- **Hallazgo** (`auditoria.md`): `SEG-NNN`, área de FR-003, severidad de FR-002, evidencia, riesgo, estado, y prueba o
  decisión de cierre.
- **Decisión de riesgo** (`auditoria.md`): quién, cuándo, motivo, riesgo residual y condición de revisión. Solo la
  persona responsable.
- **Punto de entrada** (`inventario.json`): ver [contracts/seguridad.md](contracts/seguridad.md).

## Transiciones

### Partida

```text
buscando | en_draft | en_torneo --cerrar_admin--> abandonada
```

Solo devuelve el cobro de rareza desde `buscando`. Una partida `terminada`, `cancelada` o `abandonada` no se puede cerrar.

### Cuenta

```text
activa --suspender--> suspendida --reactivar--> activa
```

Solo para `jugador` y `betatester`. Nadie puede suspenderse a sí mismo.

### Rol

- Solo una cuenta registrada puede cambiar de rol, y nunca la propia.
- Una cuenta suspendida no puede pasar a `administrador`.
- Siempre debe quedar al menos un administrador activo, salvo en la designación inicial por consola.
- Al dejar de ser `betatester`, conserva sus compras y su saldo, y no recibe más entregas.

### Orden de consola

```text
pendiente --> hecha | rechazada | caducada (más de 60 s sin recoger)
```
