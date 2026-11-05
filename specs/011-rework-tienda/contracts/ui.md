# Contrato de interfaz: Rework de la tienda

**Fecha**: 2026-11-05 · Sigue [docs/diseno/DESIGN.md](../../../docs/diseno/DESIGN.md) y el Principio XI (sin desplazarse
en portátil y escritorio). Los textos visibles llevan tildes; los identificadores, no.

## 1. `Chapa` con escudo (`componentes/Marcador.tsx`)

- Props: `{ color?: string; escudo?: string | null; nombre?: string }`.
- Con `escudo`: `<img src="/cosmeticos/escudos/<id>-64.webp" alt={nombre} class="chapa chapa-escudo">`, con el mismo
  tamaño de caja que la chapa actual y `object-fit: contain`. Si la imagen falla (`onError`), pasa al círculo de color.
- Sin `escudo`: el círculo actual, sin cambios.
- Todos los usos (`Marcador`, `GoleadoresFranja`, `ResumenEventos`, franja y poseedor de `Partido2D`,
  `ReproduccionPartido`) reciben `escudos` de `partido.inicio`. Cuando los dos escudos son null por coincidir, usan el
  color principal del local y el secundario del visitante, o el principal si el secundario se parece al del local
  (research R7).
- `data-testid="escudo-local"` y `"escudo-visitante"` para el e2e.

## 2. `SobreArte` con diseño (`componentes/arte/SobreArte.tsx`)

- Props: `{ diseno?: string; rasgado?: boolean; className?: string; mini?: boolean }`.
- `diseno` ausente o `'sobre-original'`: `/cartas/sobre.svg` y el polígono actual.
- Cualquier otro: `/cosmeticos/sobres/<id>.webp` (o `-mini.webp` si `mini`). Al rasgarse usa
  `style={{ clipPath: rasgaduraDe(id) }}`. Si la imagen falla, pasa al sobre original.
- `AperturaSobre` recibe `diseno`. Draft pide `sobre-siguiente` al empezar cada ronda, y la tienda lo pide al comprar
  un sobre. Los usos decorativos leen `sobreActual` del estado `aspecto`.

## 3. Selector de escudos (`componentes/SelectorEscudo.tsx`)

- Rejilla de miniaturas de 256 px (mostradas a 64–72 px): primero los disponibles y después los bloqueados, con un
  candado y un enlace «Ver en la tienda» (`/tienda#escudos`). Los invitados no ven los bloqueados.
- La opción elegida se marca con un borde y `aria-pressed`. Se maneja con el teclado (flechas y Enter), y cada botón
  tiene `aria-label` con el nombre del escudo.
- A 360 px: 4 columnas sin desplazamiento horizontal. Con muchas filas, la rejilla tiene desplazamiento propio y la
  elección actual se muestra arriba.
- Se usa en **Perfil** (cambia el del perfil) y en **Alineación**, junto al nombre del equipo, donde cambia el de esa
  partida y se bloquea con el torneo iniciado, como el nombre.

## 4. Selector de sobres (`componentes/SelectorSobre.tsx`, solo Perfil)

- Un interruptor «Carrusel». Apagado: elección única (favorito). Encendido: casillas para marcar varios y el texto
  «Se alternan sin repetirse».
- Miniaturas `-mini.webp`. Al pasar el ratón o enfocar una, se ve la versión rasgada.
- Bloqueados con candado y «Ver en la tienda» (`/tienda#sobres`).

## 5. Tienda (`pantallas/Tienda.tsx`)

- Desaparece el bloque «Fragmentos».
- Las colecciones y el sobre de cartas muestran solo el precio en fragmentos.
- Bloque **Escudos** (`id="escudos"`): rejilla con miniatura, nombre y dos botones («250 fragmentos» y «0,25 €»), o el
  distintivo «Comprado». Encima, los packs con sus 5 miniaturas, el precio y el ahorro («5 por 0,99 €»). Un pack no
  disponible muestra «Ya tienes alguno: cómpralos sueltos».
- Bloque **Sobres** (`id="sobres"`): igual, y cada diseño se puede ver cerrado y rasgado.
- La compra usa `ConfirmacionCompra`, que ya existe, con `idCompra` generado una vez por intento (como en la 006).
- Invitado: ve los bloques, y al comprar recibe el aviso de crear cuenta que ya existe.
- Principio XI: en escritorio, los bloques van en columnas (cartas | cosméticos). Si el catálogo no cabe, se desplaza
  dentro de cada bloque y los packs quedan arriba.

## 6. Identidad alternativa

No hay cambios de interfaz. Las cartas pintan lo que llega. La silueta de `/cartas/siluetas/` ya la usa
`CartaJugador` cuando no hay retrato.
