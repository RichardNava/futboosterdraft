# Quickstart: validar la spec 013

Guía de comprobación de extremo a extremo. Detalles en [data-model](data-model.md) y [contratos](contracts/).

## Requisitos

```bash
pnpm install
pnpm db:migrate                       # aplica 0016_spec013.sql
pnpm seed                             # recarga core-real.json con los fondos nuevos
pnpm dev
```

## US1 — Fondos ilustrados (SC-001, SC-002)

```bash
pnpm --filter @fbd/fixtures fondos-core -- --origen ../../jugadores_bg
pnpm --filter @fbd/fixtures core-real          # verde: cada carta con /cartas/fondos/jugadores/<su id>.webp
```

- El script informa del peso medio (≤ 120 KB). Prueba de error: copia `jugadores_bg` a una carpeta temporal, borra un
  fichero y lánzalo contra ella ⇒ falla, nombra el id que falta y no cambia `data/core-real.json`.
- En la colección, revisa 20 cartas al azar: cada una con su jugador.
- `pnpm --filter @fbd/server ajuste identidad_cartas alternativa` y una partida nueva ⇒ fondos genéricos. Vuelve a
  `real`.
- Solo cuando todo lo anterior esté bien, y con el visto bueno de la persona: borrar `jugadores_bg/` (no está en git).

## US2 — Legibilidad (SC-003)

```bash
pnpm --filter @fbd/web test -- contrasteCarta
```

Abre `/pruebas/cartas` y revisa cartas con 4, 5 y 6 rasgos sobre las ilustraciones más claras: se lee todo y la
ilustración sigue viéndose.

## US3 — Rareza del draft (SC-004, SC-005)

```bash
pnpm --filter @fbd/domain test -- generador     # regresión de 50 semillas (G4) y G1–G7
pnpm balance                                     # sección «Rareza del draft»: 5 niveles dentro del 5 %
```

En la app:

1. Crear partida (cualquier modo) ⇒ Moderado preseleccionado; elegir Rico ⇒ la sala muestra «Rareza: Rico».
2. `pnpm --filter @fbd/server ajuste acceso_niveles_rareza restringido`, esperar 30 s:
   - cuenta registrada sin pase con ≥ 100 fragmentos ⇒ Rico cuesta 100, se cobran una vez (historial de fragmentos);
   - doble clic en «Crear» ⇒ una sola partida y un solo cobro;
   - saldo < 100 ⇒ aviso con saldo y lo que falta, sin partida;
   - invitado ⇒ solo Moderado disponible;
   - `pnpm --filter @fbd/server premium <email> si` ⇒ todos gratis.
3. Tienda ⇒ comprar el pase con fragmentos ⇒ «Activo hasta …» (+30 días); comprarlo otra vez ⇒ +30 días más.
4. Volver a `libre`.

## US4 — Arranque y Mis partidas (SC-006, SC-007)

- Con la app abierta, para el servidor, recarga la pestaña y arranca el servidor ⇒ a los 3 s aparece «Conectando con
  el servidor…» y la pantalla carga sola < 5 s después de que el servidor responda.
- Con una cuenta de 50 terminadas (`pnpm test:integration -- mis-partidas` las genera en la prueba de
  integración): en curso + 5, «Cargar más» añade 5, y desaparece al final. Carga < 1 s con 5 y con 200.

## US5 — Inicio de sesión (SC-008)

```bash
pnpm --filter @fbd/web e2e -- acceso
```

A mano: contraseña mala ⇒ aviso arriba sin desplazar y con «¿Has olvidado la contraseña?»; servidor parado ⇒ aviso
de conexión; muchos intentos ⇒ aviso de espera. La animación de la portada no se mueve.

## US6 — Tooltip y media (SC-009)

```bash
pnpm --filter @fbd/web e2e -- retoques-013
```

Graba la pantalla pasando rápido por los rasgos: la descripción nunca aparece arriba a la izquierda. Zoom del 50 % al
200 % en Formación: la media se ve entera sobre la estrella.

## US7 — Mi perfil (SC-010)

Ventana de 1366 × 768: equipaciones, escudo y sobre a la vista sin desplazarse; en 375 px se apilan. Guardar una
equipación y elegir escudo o sobre funciona igual que antes.

## Cierre

```bash
pnpm typecheck && pnpm test && pnpm test:integration && pnpm --filter @fbd/web e2e && graphify update .
```
