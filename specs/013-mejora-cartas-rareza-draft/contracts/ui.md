# Contrato: interfaz

## Crear partida (US3)

- Selector «Rareza del draft» en todos los modos, con los 5 niveles en orden y **Moderado** preseleccionado.
- Cada opción: nombre, una línea de descripción y su estado según `GET /api/partidas/niveles-rareza`
  («Gratis», «100 fragmentos», «Solo con cuenta registrada»).

| Nivel | Descripción |
|---|---|
| Pobre | Casi sin estrellas: mandan Superclase y Crack. |
| Escaso | Pocas Legendario; algún GOAT suelto. |
| Moderado | El estándar. |
| Abundante | Muchas Legendario y GOAT. |
| Rico | Todas las Legendario y GOAT de la colección en la mesa. |

- Botón «Crear» deshabilitado mientras se envía; la `Idempotency-Key` se genera al pulsar y se reutiliza en los
  reintentos de ese envío.
- Saldo insuficiente: aviso con el saldo y lo que falta, sin salir del formulario.

## Sala y resumen

Etiqueta «Rareza: Abundante» junto al modo y la dificultad.

## Tienda y Mi perfil (FR-034)

- Tienda: tarjeta «Pase premium · 30 días» con precio en fragmentos y en euros; si está activo, «Activo hasta el
  dd/mm/aaaa» (con cortesía: «Activo»). Solo cuentas registradas.
- Mi perfil: dos columnas en escritorio, [equipación local + visitante] | [escudo + sobre], celebración debajo; una
  columna en pantallas estrechas (FR-031). La fecha de fin del pase, en la cabecera.

## Mis partidas (US4)

En curso arriba, 5 terminadas y el botón «Cargar más» (oculto sin más páginas). Las nuevas se añaden al final sin
recargar las anteriores.

## Conexión (FR-022, FR-023)

Tras 3 s sin respuesta del servidor: «Conectando con el servidor…» en `PantallaCargando` y en el `Marco`, con
`role="status"`. Desaparece sola al recuperar la conexión.

## Inicio de sesión (US5)

`AvisoAcceso` (`role="alert"`) arriba del formulario, sin cambiar la altura del bloque; textos en
[research R10](../research.md#r10-error-de-inicio-de-sesión-fr-026-a-fr-028-sc-008).

## Cartas (US1, US2, US6)

- Fondo: `/cartas/fondos/jugadores/<id>.webp` en Core; misma transparencia y máscara que hoy.
- Rasgos y stats: contraste ≥ 4,5:1 en el peor caso (recuadro sobre blanco).
- Descripción de rasgo: invisible hasta estar colocada (`data-colocada`).
- Media del equipo: completa y sobre la estrella del 50 % al 200 % de zoom.
