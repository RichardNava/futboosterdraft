# Contrato de seguridad

## Variables de entorno

| Variable | Producción | Regla |
|---|---|---|
| `AUTH_SECRET` | Obligatoria | 32 caracteres o más; no puede ser el valor de ejemplo |
| `PUBLIC_URL` | Obligatoria | `https://` |
| `DATABASE_URL` | Obligatoria | No puede usar la credencial de ejemplo |
| `PROXIES_CONFIANZA` | Obligatoria | Entero ≥ 0: proxies delante del servidor |
| `METRICAS_TOKEN` | Opcional | 32 caracteres o más; sin ella, `/metrics` responde 404 |
| `LIMITES_DESACTIVADOS` | Prohibida | Solo para la prueba de carga fuera de producción |

Si una regla falla, el proceso termina con un mensaje que nombra la variable y nunca muestra su valor.

## Límites

| Operación | Clave | Límite | Al superarlo |
|---|---|---|---|
| Login | IP | 10 por minuto | `429 DEMASIADAS_PETICIONES` |
| Login fallido | Correo normalizado | 20 por hora | `429`, misma respuesta exista o no la cuenta |
| Registro | IP | 5 por hora | `429` |
| Invitado | IP | 20 por hora | `429` |
| Recuperación | IP | 5 seguidas y 1 por minuto | `429` |
| Recuperación | Correo normalizado | 3 por hora | Misma respuesta que un envío correcto, sin correo |
| API con sesión | Usuario | 60 de ráfaga, 20/s | `429` |
| Toda `/api/` | IP | 300 de ráfaga, 100/s | `429` |
| WebSocket | Partida y participante | 40 de ráfaga, 10/s | `error DEMASIADOS_MENSAJES` |

## Cabeceras

En todas las respuestas:

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' <wss público>; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Solo en producción: `Strict-Transport-Security: max-age=31536000; includeSubDomains`.

Ninguna respuesta incluye `Access-Control-Allow-Origin`.

## Origen

`POST`, `PUT` y `DELETE` con `Origin` distinto de `PUBLIC_URL`: `403 ORIGEN_NO_PERMITIDO`, sin efecto. Una petición sin
`Origin` no procede de un navegador en un ataque entre sitios y sigue las reglas normales de sesión.

## Idempotencia

- Ámbito HTTP: `http:<usuario>:<método>:<ruta sin query>`.
- Ámbito WebSocket: `ws:<partida>:<participante>`.
- Se comprueba después de la sesión y del permiso.
- Solo se guardan respuestas 2xx de personas autenticadas.
- Clave de 128 caracteres como máximo; si no, `400 CLAVE_INVALIDA`.
- Caducidad: 7 días.

## Rutas técnicas

| Ruta | Producción |
|---|---|
| `GET /healthz` | `200 {"estado":"ok"}` o `503 {"estado":"degradado"}` |
| `GET /metrics` | Con token válido, métricas; en cualquier otro caso, `404` |
| `/api/dev/*` | No existen |
| `/api/auth/ba/*` | No existe en ningún entorno |
| `GET /api/<inexistente>` | `404 RUTA_NO_ENCONTRADA` |

## Registros

No aparecen contraseñas, tokens, cookies, cabeceras de autorización, correos ni query strings.

## Inventario (`inventario.json`)

```json
{
  "tipo": "http",
  "metodo": "POST",
  "ruta": "/api/tienda/pase-premium",
  "acceso": ["jugador", "betatester", "administrador"],
  "comprobacion": "soloRegistrados; idCompra por cuenta",
  "hallazgos": ["SEG-001"]
}
```

Para mensajes: `"tipo": "ws"` y `"mensaje": "draft.elegir"` en lugar de `metodo` y `ruta`.

## Informe (`auditoria.md`)

Cada hallazgo:

```markdown
### SEG-001. Título en lenguaje claro

- **Área**: una de FR-003
- **Severidad**: crítica, alta, media o baja (FR-002), con su motivo
- **Evidencia**: pasos reproducibles en un entorno propio, sin secretos ni datos reales
- **Riesgo**: qué podría hacer un atacante
- **Estado**: abierto, corregido o aceptado
- **Cierre**: prueba `SEG-001: …` o decisión de riesgo
```

Incluye también el resultado de cada área de FR-003, tenga o no hallazgos, y qué detectaron `pnpm audit` y ZAP.

## Verificación (`pnpm seguridad`)

Termina con error si algún ataque no queda bloqueado. Escribe `verificacion.md`:

```markdown
| Ataque | Hallazgo | Resultado |
|---|---|---|
| Probar 100 contraseñas seguidas cambiando la cookie | SEG-004 | Bloqueado |
```
