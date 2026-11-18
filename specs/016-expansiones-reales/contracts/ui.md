# Contrato de interfaz: Expansiones reales

**Fecha**: 2026-11-18 · Referencias: [DESIGN.md](../../../docs/diseno/DESIGN.md) y
[esquema de la persona](../esquema-tienda.png) (pendiente de guardar; ver plan, «Riesgos»).

## 1. Componente `Fragmentos` (FR-030, FR-031)

```tsx
<Fragmentos cantidad={2400} />            // [icono] 2.400
<Fragmentos cantidad={175} signo />       // [icono] +175
<Fragmentos cantidad={n} tamano={24} />   // 16 (por defecto en línea) | 18 (barra) | 24 (botones grandes)
```

- Pinta `<img src="/iconos/fragmento-32.webp" srcset="… 1x, /iconos/fragmento-64.webp 2x" alt="" aria-hidden="true">`
  y la cantidad con `formatoFragmentos`. Detrás, un `<span class="solo-lector">fragmentos</span>`.
- El icono no se encoge por debajo de 16 px y va alineado a la línea base del número.
- Sustituye a `<Icono nombre="cristal">` y a los textos «N fragmentos» de la barra de navegación, la tienda (todos los
  botones de compra con precio en fragmentos), `ConfirmacionCompra`, `DialogoPagoPrueba`, `TiendaCosmeticos`,
  `FichaCartaColeccion` (desfragmentar), el historial de la colección, el perfil, `CrearPartida` (nivel de rareza) y
  `PantallaCampeon` (recompensa).
- Los `aria-label` que ya dicen «Fragmentos: N» (barra de navegación) se mantienen.

## 2. Tienda, sección «Expansiones» (FR-016, FR-017)

La sección y su filtro pasan de «Colecciones» a **«Expansiones»** (descripción: «Jugadores reales para tu colección,
siempre con fragmentos»). El sobre de cartas se queda en la sección.

### Tarjeta de expansión

```text
                                   ┌──────────┐
┌──────────────────────────────────│  icono   │   ← icono de tienda (icono-256), sobresale por la esquina
│ Remontada Histórica              │  tienda  │     superior derecha (≈ 25 % fuera de la tarjeta)
│                                  └──────────┘
│ 24 jugadores · 6 GOAT · 6 Legendario · 6 Crack · 6 Superclase
│ Regala el sobre «Sobre 7»
│ Tienes 3 de 24 · te devolvemos [◆] 225
│
│ [ 🔍 Ver detalle ]     [ Comprar · [◆] 2.400 ]
└───────────────────────────────────────────────
```

- Descripción: `numCartas`, `porNivel` y `sobreRegalo.nombre` (FR-017). Si `poseidas > 0`, la línea de compensación.
- «Comprar» abre la confirmación que ya existe (`DialogoPagoPrueba` en fragmentos). Si `adquirida`, el sello
  «Adquirida» y sin botón de compra (US2-6). Si el saldo no alcanza, el botón dice «Te faltan [◆] N» y lleva a la
  sección de cómo conseguir fragmentos (US2-5).
- Si `soloFragmentos !== null`: «Ya tienes todas: recibirás [◆] 2.400 y el sobre» (caso límite de la spec).
- El icono sobresaliente no tapa el título: el título reserva el ancho del icono a la derecha. En móvil (360 px), el
  icono baja a 72 px y sigue sobresaliendo.
- Escritorio: las cuatro tarjetas en 2 columnas (≥ 1024 px) o en 4 (≥ 1440 px), sin desplazamiento (Principio XI).

### Modal «Ver detalle» (FR-019)

Con `Dialogo`. Título: el nombre de la expansión.

```text
┌──────────────────────────────────────────────────────────────┐
│ Estrellas Fulgurantes                                    [×] │
├───────────────────────┬──────────────────────────────────────┤
│                       │ GOAT                                 │
│      cartel.webp      │  1 [carta] Nombre   MED  ✓ tienes +175│
│      (2:3)            │  2 [carta] Nombre   POR               │
│                       │ …                                    │
│                       │ Superclase                           │
│                       │ 24 …                                 │
├───────────────────────┴──────────────────────────────────────┤
│ Te devolvemos [◆] 400 por 6 cartas · Regala «Sobre 28»       │
│                              [ Comprar · [◆] 2.400 ]          │
└──────────────────────────────────────────────────────────────┘
```

- La lista agrupa por nivel en el orden de `numero`. Cada fila lleva el número, la miniatura (`CartaResumen`), el
  nombre de carta y la demarcación. Las poseídas llevan «Tienes» y su compensación con `Fragmentos signo`.
- Escritorio: cartel a la izquierda y la lista a la derecha, con desplazamiento interno solo en la lista. El pie con el
  botón de compra está siempre visible (Principio XI). Móvil: cartel arriba (máx. 40 vh), lista y pie fijo abajo.
- El botón de compra del modal hace lo mismo que el de la tarjeta, y al terminar cierra el modal y abre la confirmación.
- Foco: al abrir, en el título; `Esc` cierra; el foco vuelve a «Ver detalle».

## 3. Confirmación de compra (FR-023)

`ConfirmacionCompra` añade, a lo que ya muestra (cartas recibidas y tabla de repetidas con su importe), el total
devuelto con `Fragmentos` y el bloque «Sobre de regalo» con la miniatura del sobre (`SobreArte` con el diseño) y su
nombre. Si el sobre ya se tenía: «Ya tenías este sobre».

## 4. Tienda de cosméticos (FR-026, FR-027)

- Los sobres con `vendible: false` no aparecen en la venta suelta. En el selector de sobres del perfil, el que no se
  posee se muestra bloqueado con «Se consigue con la expansión X».
- Los packs muestran su nueva composición. El pack 7 aparece con los demás.

## 5. Textos que cambian (FR-016)

| Dónde | Antes | Después |
|-------|-------|---------|
| Tienda, sección y filtro | Colecciones / Colecciones de jugadores | Expansiones |
| Sobre de cartas | …de las colecciones de pago | …de las expansiones |
| Invitado en la tienda | …comprar sobres, colecciones y cosméticos | …comprar sobres, expansiones y cosméticos |
| Confirmación | Colección adquirida | Expansión adquirida |
| Colección (filtro por colección) | nombre de la colección | sin cambio: «Core» y el nombre de cada expansión |

El resto se localiza con `grep -rn "colecci" apps/web/src`. Solo se cambian los textos visibles que hablan de las
colecciones **de pago**. «Mi colección» (las cartas del usuario) no cambia.
