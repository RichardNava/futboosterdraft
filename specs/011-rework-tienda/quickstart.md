# Quickstart: validar el rework de la tienda

**Fecha**: 2026-11-05 · Detalles en [contracts/http-api.md](contracts/http-api.md), [contracts/ui.md](contracts/ui.md)
y [data-model.md](data-model.md).

## Requisitos previos

- PostgreSQL en marcha, como en el resto de specs (`docs/despliegue.md`).
- Las carpetas de origen `escudos/`, `sobres/` y la de los retratos manga entregados (p. ej. `retratos/`) en la raíz.

```sh
pnpm install
pnpm --filter @fbd/fixtures imagenes -- --escudos ../../escudos --sobres ../../sobres --retratos ../../retratos
pnpm --filter @fbd/fixtures core-real     # valida Core y regenera specs/008-datos-reales-core/sumario.md
pnpm db:migrate && pnpm seed
pnpm dev
```

**Resultado esperado**:

- El guion de imágenes imprime el peso total de `apps/web/public/cosmeticos/`, que es ≤ 10 % del de los originales
  (SC-005).
- `sumario.md` dice «retratos de terceros: 0» en todas las rarezas (FR-020, FR-021).

## Pruebas automáticas

```sh
pnpm test                    # dominio: carrusel, escudos, identidad; web: rasgaduraDe, Chapa, SobreArte
pnpm test:integration        # servidor: compras de cosméticos y packs, aspecto, escudo por partida, identidad
pnpm test:equivalence        # sin cambios: el motor no se entera de la identidad
pnpm e2e                     # recorrido de escudos, carrusel y tienda
pnpm typecheck && pnpm lint
```

## Recorridos manuales (criterios de éxito)

| # | Pasos | Esperado | Criterio |
|---|---|---|---|
| 1 | Cuenta nueva → «Mi perfil» → elegir escudo y un sobre con el cronómetro | Hecho en menos de 1 min | SC-001 |
| 2 | Crear partida contra NPC, jugar un partido rápido y otro en 2D, y después ver la reproducción | Escudos en el marcador, el resumen de acciones, la franja y el poseedor del 2D y la reproducción; ningún círculo | SC-002, US1-3 |
| 3 | Cuenta sin escudo elegido: entrar en dos partidas | El mismo escudo gratuito en las dos | US1-4, FR-005 |
| 4 | Invitado: crear partida sin elegir escudo | Círculo de color; el selector de Alineación solo ofrece gratuitos | US1-6, FR-005 |
| 5 | Dos humanos con el mismo escudo en un partido | Círculos: local con el principal y visitante con el secundario (o el principal si se parecen) | FR-008, SC-003 |
| 6 | Comprar 3 diseños, activar el carrusel con los 3, hacer un draft completo y 3 aperturas en la tienda | Salen los 3 diseños, sin repetirse dentro de cada vuelta y cada uno con su rasgadura | US2-3, US2-4, SC-004 |
| 7 | Comprar un escudo con fragmentos pulsando dos veces y cortando la red en mitad | Un único cargo de 250 y una sola fila en el historial | US3-1, SC-006 |
| 8 | Ver la tienda tras la compra | «Comprado»; el pack que lo contiene dice «Ya tienes alguno» | US3-2, R10 |
| 9 | Tienda con cuenta registrada | No hay bloque de fragmentos; colecciones y sobre de cartas solo en fragmentos | FR-002 |
| 10 | Invitado en la tienda → comprar un escudo | Ve el catálogo y se le pide crear cuenta | US3-3 |
| 11 | `pnpm --filter @fbd/server ajuste identidad_cartas alternativa`, esperar 30 s y crear una partida nueva | Colección, draft, partido y avisos sin nombres ni retratos reales; la partida anterior sigue con la identidad real | SC-007, SC-008, FR-018 |
| 12 | Volver a `real` y repetir el mismo partido con la misma semilla en los dos modos (test de integración `identidad-cartas`) | Mismo desarrollo y resultado | US4-3, FR-019 |
| 13 | A 360 px: marcador del 2D y selectores | Escudo reconocible; sin desplazamiento horizontal | Caso límite de pantallas estrechas |
| 14 | Tienda: recorrer Todo, Cosméticos (Escudos, Sobres), Colecciones, Funcionalidades y Modos de juego; abrir `/tienda#escudos`; con poco saldo, pulsar un precio en fragmentos | Cada sección y subsección muestra lo suyo y queda en la URL; lo que no se vende dice «Próximamente»; «Tienes X de Y»; sin saldo, «Te faltan…» sin abrir el pago | FR-023 |
| 15 | Formación a 1366 × 657 y a 1920 × 1080: campo horizontal, desplazar «Personalización», cambiar el interruptor y recargar | Campo tumbado sin fichas amontonadas; las pestañas siguen arriba; la distribución elegida se recuerda | FR-024, FR-025 |
| 16 | «Personalización» → abrir «Dorsales», cambiar uno con Intro, otro con ✓ y descartar un tercero con Escape | Lista compacta al final; las filas no saltan; el conflicto de número pide confirmación | FR-026 |
| 17 | Carrusel con 3 diseños: hacer un draft completo y 3 aperturas en la tienda | Ningún cambio de sobre durante la animación; marcador y resultado con el escudo grande | FR-027, FR-028 |
| 18 | Tienda: pulsar la miniatura de un escudo, pasar con → y ←, comprar desde la previsualización; abrir un sobre y un pack, y dentro del pack uno de sus cosméticos | Escudo grande (512 px) y a los tamaños del juego; sobre cerrado y abierto; los 5 del pack, cada uno en grande con «Volver al pack»; al comprar se cierra y la ficha dice «Comprado» | FR-029 |

## Cierre

- `escudos/`, `sobres/`, la carpeta de retratos de origen y `apps/web/public/cartas/retratos/` ya no están en el
  repositorio (FR-004, FR-021).
- La constitución está en 1.4.0, con la decisión de derechos, y el ROADMAP tiene INI-11 e INI-14 actualizados
  (SC-009).
