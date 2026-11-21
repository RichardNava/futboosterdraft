# Contrato de interfaz

## Panel de administración (`/admin`)

- Pantalla de carga diferida, para que su código no llegue a quien no la abre.
- El enlace «Administración» solo aparece con `usuario.rol === 'administrador'`.
- Con otro rol, `/admin` redirige al inicio. Ocultarlo no es el control: lo es el servidor (FR-021).
- Sigue la guía de [DESIGN.md](../../../docs/diseno/DESIGN.md) y funciona desde 360 px.

### Pestañas

| Pestaña | Contenido | Acciones |
|---|---|---|
| Partidas | Activas, con estado, modo y participantes | Cerrar |
| Cuentas | Buscador y lista paginada | Rol, suspender, reactivar, premium, fragmentos |
| Ajustes | Identidad de las cartas y acceso a los niveles de rareza | Cambiar |
| Registro | Quién, qué, sobre qué, resultado y cuándo, con filtros | Solo lectura |

En portátil y escritorio, la lista y el detalle van en columnas, con la acción principal visible sin desplazarse
(Principio XI). En móvil se apilan.

### Diálogos de confirmación

Toda acción usa el componente `Dialogo` y pide motivo. Indica qué va a pasar:

- **Suspender**: «Se cerrarán sus sesiones y no podrá entrar. Sus partidas seguirán con las reglas de desconexión.»
- **Cerrar partida**: «La partida terminará para todos, sin premios. Los participantes recibirán un aviso.»
- **Entregar fragmentos**: muestra cuenta, cantidad y saldo resultante. Máximo: 10.000.
- **Cambiar ajuste**: «Se aplica en 30 s como máximo y solo a las partidas nuevas.»

El campo de motivo advierte: «No escribas datos personales».

La entrega genera su `idEntrega` al abrir el diálogo y lo reutiliza si se reintenta.

### Errores

| Código | Mensaje |
|---|---|
| `ULTIMO_ADMINISTRADOR` | Debe quedar al menos un administrador. |
| `ROL_PROPIO` | No puedes cambiar tu propio rol. |
| `SUSPENSION_PROPIA` | No puedes suspender tu propia cuenta. |
| `PARTICIPA_ADMIN` | Juegas en esta partida: debe cerrarla otro administrador o la consola. |
| `NO_BETATESTER` | Esta cuenta no tiene el rol betatester. |

## Tienda

Con `pagoEuros: false`, las opciones en euros siguen visibles pero desactivadas, con el texto «Pago con tarjeta
próximamente». Las compras con fragmentos no cambian.

## Acceso

- Cuenta suspendida al entrar: «Tu cuenta está suspendida. Si crees que es un error, contacta con el equipo.»
- Sesión cerrada por suspensión o por cambio de contraseña: vuelve a la portada con el aviso «Tu sesión ha terminado».
- Enlace de recuperación: la web quita el token de la dirección en cuanto lo lee y lo mantiene solo en memoria.

## Avisos

Tipo nuevo `partida_cerrada`: «Un administrador ha cerrado esta partida. No se reparten premios.» El motivo no se muestra
a los participantes.
