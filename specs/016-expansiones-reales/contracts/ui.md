# Contrato de interfaz: Expansiones reales

**Fecha**: 2026-11-18 · Referencias: [DESIGN.md](../../../docs/diseno/DESIGN.md) y el esquema de la tarjeta que
entregó la persona (`esquema_shop.jpg`). La imagen era solo una guía y no se guarda en el proyecto: §2 la describe con
palabras y medidas.

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

Esquema de la persona, redibujado a escala:

```text
                                         ┌────────────────────┐
                                         │                    │
                                         │                    │
┌────────────────────────────────────────┤                    │
│ ┌──────────────────────────────┐       │    icono_shop      │
│ │ NOMBRE                       │       │                    │
│ └──────────────────────────────┘       │                    │
│                                        │                    │
│   Descripción                          │                    │
│                                        └────────────────────┘
│ ┌───────────────────────────┐ ┌──────────────────────────┐ │
│ │ Comprar + precio          │ │ Ver detalle + icono lupa │ │
│ └───────────────────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Medidas del esquema**, en proporción de la tarjeta (ancho W, alto H). Son una guía de composición, no píxeles fijos:

| Elemento | Posición | Tamaño | Notas |
|----------|----------|--------|-------|
| Tarjeta | — | W × H, con W ≈ 2,5 H | Rectángulo de esquinas redondeadas y borde fino. |
| Nombre | Arriba a la izquierda, a ≈ 2 % de W del borde izquierdo y a ≈ 5 % de H del superior | ≈ 54 % W × 28 % H | Columna izquierda. Es el texto más grande de la tarjeta (título). El recuadro del esquema marca la zona; no obliga a dibujar un borde. |
| Descripción | Debajo del nombre, con un hueco de ≈ 10 % H y alineada a su izquierda | Ancho de la columna izquierda | Texto normal, sin recuadro. |
| Icono de tienda | Esquina superior derecha, **por delante** de la tarjeta (tapa su borde) | Cuadrado de ≈ 0,94 H de lado (≈ 45 % W) | Su borde izquierdo está a ≈ 60 % de W; sobresale ≈ 1/3 de su alto por encima de la tarjeta y ≈ 5 % de W por la derecha; su borde inferior acaba hacia el 62 % de H, encima de la fila de botones. |
| Fila de botones | Abajo, de borde a borde con el margen interior (≈ 2 % W) y a ≈ 6 % H del borde inferior | Alto ≈ 26 % H | Dos botones con un hueco pequeño entre ellos. **Los dos miden exactamente lo mismo en ancho y en alto** (rejilla de dos columnas `1fr 1fr` y altura común, aunque un texto sea más largo o pase a dos líneas). |
| «Comprar + precio» | Mitad izquierda de la fila | ½ de la fila | Texto «Comprar» y detrás el precio con `Fragmentos`. Acción principal (estilo `boton` primario). |
| «Ver detalle + lupa» | Mitad derecha de la fila | ½ de la fila | Texto «Ver detalle» y **detrás** el icono de lupa (`Icono`). Estilo `boton secundario`. Queda debajo del icono de tienda, sin tocarlo. |

Lo que el esquema no dibuja y añade este contrato, dentro de sus zonas:

- **Descripción**: una línea con `numCartas`, `porNivel` y `sobreRegalo.nombre` («24 jugadores · 6 GOAT · 6
  Legendario · 6 Crack · 6 Superclase · Regala el sobre 7»; FR-017). Si `poseidas > 0`, una segunda línea más pequeña:
  «Tienes 3 de 24 · te devolvemos [◆] 225». Si `soloFragmentos !== null`: «Ya tienes todas: recibirás [◆] 2.400 y el
  sobre» (caso límite de la spec).
- **Estados del botón «Comprar»**:
  - abre la confirmación que ya existe (`DialogoPagoPrueba` en fragmentos);
  - si `adquirida`, en su sitio va el sello «Adquirida» (mismo tamaño que el botón), sin acción, y «Ver detalle»
    sigue igual (US2-6);
  - si el saldo no alcanza, dice «Te faltan [◆] N» y lleva a la sección de cómo conseguir fragmentos (US2-5).
- **Accesibilidad**: el icono de tienda es decorativo (`alt=""`), porque el nombre ya está en texto. «Ver detalle»
  lleva `aria-label="Ver detalle de <nombre>"`.

**Adaptación**:

- El icono por delante y sobresaliendo exige que la tarjeta reserve arriba el hueco del tercio que asoma
  (`margin-top` ≈ 0,3 H) y que la rejilla deje sitio a la derecha para lo que sobresale, de modo que el icono no pise
  la tarjeta vecina ni el título de la sección.
- La columna del nombre y la descripción nunca entra bajo el icono: si el nombre no cabe en el 54 % de W, pasa a dos
  líneas, no por debajo del icono.
- Escritorio: las cuatro tarjetas en 2 columnas desde 1024 px, sin desplazamiento (Principio XI).
- Móvil (360 px): se mantiene la composición con el icono a ≈ 40 % W. Si la fila de botones no cabe, los botones se
  apilan («Comprar» encima), con el mismo ancho y el mismo alto, y el icono sigue arriba a la derecha.

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
