# Quickstart — validar la spec 004

Guía para comprobar que el nuevo estilo está aplicado y que nada ha dejado de funcionar. Las reglas observables están en [contracts/ui.md](./contracts/ui.md), y el inventario de pantallas, en [data-model.md](./data-model.md) §3.

## Requisitos previos

```bash
pnpm install
docker compose up -d db
pnpm db:migrate
pnpm seed --file data/core.json
pnpm --filter @fbd/web exec playwright install chromium
```

## 1. Comprobaciones rápidas (sin base de datos)

```bash
pnpm lint            # incluye lint:tokens: ningún color, radio ni sombra literal fuera de tokens.css (FR-037)
pnpm typecheck
pnpm test            # incluye tests/unit/tokens.test.ts (contrastes de R4) y colores.test.ts (necesitaContorno)
```

**Esperado**: todo en verde.

## 2. Comprobaciones automáticas de diseño (FR-040)

```bash
pnpm --filter @fbd/web e2e tests/e2e/diseno
```

| Prueba | Qué comprueba | Criterio |
|---|---|---|
| `inventario.spec.ts` | En cada pantalla del inventario y en cada ancho (360, 683, 768, 1366 y 1920 px): sin desplazamiento horizontal, sin infracciones de axe WCAG AA, lima reservado y foco visible | FR-029 a FR-031, SC-002, SC-005, SC-006 |
| `teclado.spec.ts` | Crear partida → draft → formación → partido → torneo solo con teclado | SC-007 |
| `nombres.spec.ts` | Nombres largos recortados; etiqueta al señalar, al enfocar y al mantener pulsado; la pulsación larga no elige carta | Edge Cases |
| `menu.spec.ts` | Menú móvil a 360 px: abrir, Escape, el foco vuelve a "Menú" | FR-012a |
| `tema.spec.ts` | Con `colorScheme: 'light'` y con `reducedMotion: 'reduce'` emulados: tema oscuro y transiciones ≤ 100 ms | FR-001, FR-033 |

**Esperado**: todas pasan. El trabajo `e2e-diseno` de CI lanza las mismas pruebas en cada pull request.

## 3. No regresión (FR-038, SC-008)

```bash
pnpm e2e             # la batería completa de 001 a 003, más la de diseño
pnpm test:integration
```

**Esperado**: los mismos resultados que en `4168404`. Si una prueba existente falla por un selector de texto (por ejemplo, un botón renombrado según FR-035), se actualiza el selector y se anota el cambio de etiqueta en el contrato. Nunca se cambia el comportamiento.

## 4. Revisión visual manual (SC-001)

```bash
pnpm dev             # web en http://localhost:5173
```

1. Recorrer cada fila de `checklists/visual.md` (inventario de data-model.md §3) a 1366 × 768 y a 360 × 640, con las herramientas de desarrollo en modo dispositivo.
2. Para cada pantalla, marcar: paleta, tipografía, paneles, botones, esquinas, superficies planas y estados (carga, vacío, error).
3. Escenarios concretos:
   - **Portada sin sesión** (ventana privada): titular de cartel, entradilla y "Empezar a jugar" sin desplazarse en los dos tamaños (FR-014).
   - **Modo claro**: activar el modo claro en el sistema. La aplicación sigue oscura (US1-3).
   - **Fuentes que no cargan**: en las herramientas de desarrollo, bloquear `/fuentes/*` y recargar. El texto se ve con la tipografía alternativa, sin huecos ni saltos (SC-009).
   - **Zoom al 200 %** a 1366 px: sin desplazamiento horizontal (Edge Cases).
   - **Equipación negra**: en «Mi perfil», poner una equipación negra lisa. La chapa y el marcador muestran contorno (FR-034).
   - **Draft**: a 1366 × 768, cartas, temporizador, sobre y plantilla visibles sin desplazarse (FR-018).
   - **Final de torneo**: llegar a la pantalla de campeón o de derrota. El titular de cartel es lo protagonista y solo se anima una vez (FR-017).
   - **Pila de avisos**: provocar un aviso de dorsales durante un aviso de partido. Se apilan sin tapar el botón principal.

## 5. Validación con personas (SC-003, SC-004, SC-010)

Seguir `checklists/validacion.md` (research R14). Para comparar con la versión anterior:

```bash
git worktree add ../fbd-4168404 4168404
cd ../fbd-4168404 && pnpm install && pnpm dev   # en otros puertos si la nueva está arrancada
```

| Criterio | Objetivo |
|---|---|
| SC-003 | ≥ 9/10 señalan el botón para avanzar en < 5 s |
| SC-004 | Media ≥ 4/5 y ≥ 1 punto sobre `4168404` (≥ 5 personas) |
| SC-010 | Tiempo de elección del draft y de confirmación de la alineación ≤ al de `4168404` |
