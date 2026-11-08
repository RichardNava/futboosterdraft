---

description: "Tareas de la spec 011: rework de la tienda (derechos de imagen, escudos y sobres cosméticos)"
---

# Tasks: Rework de la tienda — derechos de imagen, escudos y sobres cosméticos

**Input**: documentos de diseño de `specs/011-rework-tienda/` ([plan.md](./plan.md), [spec.md](./spec.md),
[research.md](./research.md), [data-model.md](./data-model.md), [contracts/http-api.md](./contracts/http-api.md),
[contracts/ui.md](./contracts/ui.md), [quickstart.md](./quickstart.md)).

**Tests**: el plan los pide expresamente (Principio IX; plan, «Project Structure»; quickstart, «Pruebas automáticas»):

- dominio: `carrusel`, `escudos`, `identidad` y parámetros de economía;
- web: `rasgaduraDe` y `Chapa`;
- integración del servidor: compras de cosméticos y packs, aspecto, escudo por partida, identidad, tienda y migración;
- `pnpm test:equivalence` sin cambios, más un test con la misma semilla en los dos modos de identidad (US4-3);
- e2e `cosmeticos.spec.ts`.

**Reglas para quien ejecute** (CLAUDE.md y constitución):

- **pnpm**: se usa pnpm, nunca npm, yarn ni npx.
- **Tildes**: sin tildes en el código, ids, valores enumerados ni nombres de archivo; con tildes en los textos visibles.
- **Git**: el agente no hace `git commit` ni `git push`.
- **Grafo**: antes de leer código hay que lanzar `graphify query "<pregunta>"`, y tras cambiar código,
  `graphify update .`.
- **Alcance**: `packages/engine` y `packages/ai` no se tocan. El protocolo del draft no cambia (R9).
- **Dependencia nueva**: solo `sharp`, como `devDependency` de `@fbd/fixtures` (R4).
- **Puerta de la decisión** (FR-001, SC-009): ninguna tarea de venta (Fase 3 y US3) empieza antes de T004 y T005.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (ficheros distintos y sin dependencias pendientes).
- **[Story]**: historia de usuario de la spec (US1, US2, US3, US4).

---

## Phase 1: Setup

**Purpose**: dependencias, guiones y recursos de origen.

- [X] T001 Comprobar los recursos de origen en la raíz: `escudos/` (18 `NN_nombre.png` y 20 `escudo_premiun_N.png`), `sobres/` (6 con nombre `01_cubismo` a `06_tinta_y_trama` y 24 `sobre_N.png`) y la carpeta de retratos manga (p. ej. `retratos/`, 300 ficheros). Si faltan los retratos, anotarlo: todo avanza salvo T069–T073 del cierre (plan, «Riesgos»)
- [X] T002 Añadir sharp con `pnpm --filter @fbd/fixtures add -D sharp` y el script `"imagenes": "tsx src/cosmeticos.ts"` en tools/fixtures/package.json
- [X] T003 [P] Añadir el script `"ajuste": "tsx src/ajustes/cli.ts"` en apps/server/package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: decisión registrada, esquema, catálogo de cosméticos, recursos web y lectura de disponibilidad.

**⚠️ CRITICAL**: ninguna historia empieza hasta terminar esta fase.

### Decisión de derechos (FR-001, SC-009) — puerta

- [X] T004 Subir .specify/memory/constitution.md a 1.4.0 (MINOR): entrada de la 011 en «Decisiones resueltas» (jugadores reales, dinero real solo para cosméticos propios, plan B de identidad, enlace a specs/011-rework-tienda/spec.md) y, en el Principio VII, «mientras no haya licencia de imagen, el dinero real no compra cartas, sobres, colecciones ni fragmentos»; actualizar el informe de impacto y la fecha (research R15)
- [X] T005 [P] Actualizar ROADMAP.md: INI-11 (retratos propios manga, identidad alternativa), INI-14 (monetización cosmética: escudos y sobres), riesgo de la economía de fragmentos de research R11 para una spec de economía, y la 011 «en curso»

### Esquema y migración

- [X] T006 Crear apps/server/drizzle/0014_cosmeticos.sql (y su entrada en apps/server/drizzle/meta/, como 0013) con: tablas `cosmeticos` (`tipo` check `in ('escudo','sobre')`; `precio_centimos` y `precio_fragmentos` «obligatorio y > 0 si `gratuito = false`»; `activo` por defecto true; `orden`), `packs_cosmeticos` (`cosmeticos text[]`, `precio_centimos` > 0, `activo`), `cosmeticos_usuario` (PK `usuario_id, cosmetico_id`; FK `usuarios` con cascade, FK `cosmeticos`, `compra_id` FK `compras`, `adquirido_en`) y `ajustes` (`clave` PK, `valor` jsonb, `actualizado_en`); columnas `perfiles_usuario.escudo` (FK `cosmeticos`, null), `sobre_favorito` (FK `cosmeticos`, null), `sobre_carrusel` (boolean, por defecto false), `sobres_marcados` y `sobre_baraja` (text[], por defecto `{}`), `sobre_ultimo` (text null); `participantes.escudo` (text null, **sin FK**); `partidas.identidad` (text no nulo, por defecto `'real'`, check `in ('real','alternativa')`); `jugadores.nombre_alt`, `apellidos_alt`, `nombre_carta_alt`, `imagen_alt` (nulables, check «los tres nombres o ninguno»); `colecciones.precio_fragmentos` (integer null, check > 0 si `tipo = 'pago'`, aplicado tras el seed o como `not valid`); checks ampliados `compras.producto_tipo in ('coleccion','sobre','fragmentos','cosmetico','pack_cosmeticos')` y `movimientos_fragmentos.motivo` + `'compra_cosmetico'`, `'compra_coleccion'` (data-model §1–§6)
- [X] T007 [P] Crear apps/server/src/persistencia/esquema/cosmeticos.ts con las tablas `cosmeticos`, `packs_cosmeticos`, `cosmeticos_usuario` y `ajustes` en Drizzle, y exportarlo en apps/server/src/persistencia/esquema/index.ts
- [X] T008 [P] Añadir las columnas nuevas de `perfiles_usuario`, `participantes`, `partidas` y `jugadores` en apps/server/src/persistencia/esquema/base.ts, y `colecciones.precio_fragmentos` y los checks de `compras` y `movimientos_fragmentos` en apps/server/src/persistencia/esquema/coleccion.ts (donde estén definidas hoy; comprobar con `graphify query`)
- [X] T009 Test de migración en apps/server/tests/integration/migracion-0014.test.ts (patrón de migracion-0011.test.ts): aplica sobre una BD con partidas y perfiles existentes, valores por defecto (`identidad = 'real'`, `sobre_carrusel = false`, arrays vacíos), rechazo de `tipo` inválido, de un cosmético de pago sin precio y de un jugador con solo uno de los tres `*_alt`

### Tipos compartidos

- [X] T010 [P] Crear packages/domain/src/cosmeticos/tipos.ts (`TipoCosmetico = 'escudo' | 'sobre'`, `Cosmetico`, `PackCosmeticos`, `PreferenciasSobre` con `sobreFavorito`, `sobreCarrusel`, `sobresMarcados`, `sobreBaraja`, `sobreUltimo`) y packages/domain/src/cosmeticos/index.ts; exportar desde packages/domain/src/index.ts
- [X] T011 [P] Crear packages/protocol/src/http/cosmeticos.ts con `Cosmetico`, `PackCosmeticos`, `RespuestaCosmeticos`, `Aspecto`, los cuerpos de `PUT /api/perfil/aspecto`, de las compras (`{ idCompra: uuid, moneda: 'eur' | 'fragmentos' }` y `{ idCompra: uuid }`) y de `PUT /api/partidas/:id/escudo`, con el mismo estilo de validación que packages/protocol/src/http/tienda.ts (contracts/http-api.md); exportarlo en el índice del paquete

### Recursos y catálogo de cosméticos

- [X] T012 Escribir el guion tools/fixtures/src/cosmeticos.ts (`pnpm --filter @fbd/fixtures imagenes -- --escudos <dir> --sobres <dir> [--retratos <dir>]`): con sharp, WebP calidad 80; escudos a `apps/web/public/cosmeticos/escudos/<id>-64.webp` y `<id>-256.webp`; sobres a `apps/web/public/cosmeticos/sobres/<id>.webp` (512 × 768) y `<id>-mini.webp` (192 × 288); retratos a `apps/web/public/cartas/retratos-propios/<slug>.webp` (278 × 362). Ids *slug* sin tildes con prefijo de tipo (`escudo-flor-de-lis-azul-oro`, `escudo-premium-N` corrigiendo «premiun», `sobre-cubismo`, `sobre-N`). Genera o completa data/cosmeticos.json conservando los nombres, precios y packs ya editados (solo añade ids nuevos). Imprime el peso total de `apps/web/public/cosmeticos/` frente al de los originales y termina con error si supera el 10 % (SC-005; research R3, R4)
- [X] T013 Ejecutar el guion de T012 con `escudos/` y `sobres/`, y completar a mano data/cosmeticos.json: `sobre-original` gratuito (`orden: 0`); 18 escudos gratuitos; escudos de pago 25 céntimos / 250 fragmentos; sobres de pago 50 céntimos / 250 fragmentos; 4 packs de escudos (premium 1–5, 6–10, 11–15, 16–20) a 99 céntimos y 6 de sobres (los 6 con nombre y luego `sobre-1` a `sobre-24`, de 5 en 5) a 199 céntimos; nombres visibles con tildes (research R10, data-model §1)
- [X] T014 [P] Añadir `precio_fragmentos` a data/colecciones.json (All Stars 5000, Top Argentinos 4000), conservando `precio_centimos` (research R11)
- [X] T015 Ampliar apps/server/src/persistencia/seed.ts: cargar data/cosmeticos.json en `cosmeticos` y `packs_cosmeticos` (upsert; lo que ya no está en el JSON queda `activo = false`, nunca se borra); validar que no hay ids repetidos y que cada pack tiene exactamente 5 cosméticos activos, de pago y del tipo del pack (si no, el seed falla con un mensaje claro); rellenar `colecciones.precio_fragmentos` desde data/colecciones.json
- [X] T016 Crear apps/server/src/persistencia/repos/cosmeticos.ts: catálogo en memoria (cargado al arrancar, como `Catalogo`), `gratuitos(tipo)` ordenados por `orden`, `poseidos(usuarioId)`, `disponibles(usuario | invitado, tipo)` y `estaDisponible(...)` con la regla de data-model §2 («registrado = gratuitos activos ∪ poseídos (activos o retirados); invitado = escudos gratuitos activos y solo `sobre-original`»); registrarlo en los servicios del servidor (apps/server/src/http/app.ts o donde se construyan los repos)

**Checkpoint**: `pnpm db:migrate && pnpm seed` deja 69 cosméticos y 10 packs; T009 pasa; las historias pueden empezar.

---

## Phase 3: Economía sin dinero real en cartas (FR-002)

**Goal**: la tienda deja de vender fragmentos y las cartas (sobres y colecciones) solo se pagan con fragmentos.

**Independent Test**: con una cuenta registrada, la tienda no muestra el bloque «Fragmentos», y las colecciones y el sobre de cartas solo ofrecen precio en fragmentos; `POST /api/tienda/sobre/comprar` con `moneda: 'eur'` da 422 (quickstart, recorrido 9).

**Depende de**: T004, T005 (puerta). No bloquea US1, US2 ni US4; sí US3 (T051).

- [X] T017 [P] En packages/domain/src/economia/parametros.ts: `paquetesFragmentos = []` y nueva constante exportada `VENTA_CARTAS_CON_DINERO = false` con un comentario que remite a FR-002; actualizar packages/domain/tests/economia/parametros.test.ts
- [X] T018 [P] En packages/protocol/src/http/tienda.ts: `ProductoColeccion.precioFragmentos: number`; `CuerpoCompraSobre.moneda` solo `'fragmentos'`
- [X] T019 En apps/server/src/economia/servicio.ts: `cobrar()` recibe el motivo (`'compra_sobre' | 'compra_coleccion' | 'compra_cosmetico'`) en lugar de fijar `'compra_sobre'`; la compra de colección cobra `precio_fragmentos` con 422 `SALDO_INSUFICIENTE` (detalles `{ saldo, precio, faltan }`); el sobre con `'eur'` da 422 `MONEDA_NO_ADMITIDA`; la compra de paquete de fragmentos da 410 `PRODUCTO_RETIRADO`. Añadir los códigos en apps/server/src/http/errores.ts y adaptar las rutas en apps/server/src/http/tienda.ts (`GET /api/tienda` devuelve `paquetes: []` y `precioFragmentos` en colecciones)
- [X] T020 Adaptar apps/server/tests/integration/tienda.test.ts: colección pagada con fragmentos (y saldo insuficiente), sobre en euros → 422, paquete de fragmentos → 410, las compras antiguas siguen en el historial, y un caso que recorre todas las rutas de cartas comprobando que ninguna acepta euros (`VENTA_CARTAS_CON_DINERO`)
- [X] T021 En apps/web/src/pantallas/Tienda.tsx: quitar el bloque «Fragmentos» y mostrar solo el precio en fragmentos en colecciones y sobre de cartas (con `ConfirmacionCompra` en fragmentos); adaptar apps/web/tests/e2e/tienda.spec.ts

**Checkpoint**: recorrido 9 del quickstart correcto; `tienda.test.ts` en verde.

---

## Phase 4: User Story 1 - Elegir escudo y verlo en el partido (Priority: P1) 🎯 MVP

**Goal**: cada equipo se muestra con su escudo (elegido, asignado o de NPC) en lugar del círculo de color, y se elige en Perfil y en Alineación.

**Independent Test**: con una cuenta sin compras, elegir un escudo gratuito en el perfil, crear una partida, jugar un partido y comprobar que el escudo aparece en el marcador y en el resumen de acciones en lugar del círculo (quickstart, recorridos 1–5 y 13).

### Tests de US1

- [X] T022 [P] [US1] Test de dominio packages/domain/tests/cosmeticos/escudos.test.ts: `escudoAsignado(usuarioId, gratuitos)` es estable (mismo id → mismo escudo) y usa FNV-1a de 32 bits `mod gratuitos.length`; `escudoNpc(semilla, pid, gratuitos)` usa `derivarSemilla(semilla, 'escudo:' + pid)`; `escudosEnPartido(a, b)` devuelve `{ local: null, visitante: null }` si coinciden y los dos ids si no
- [X] T023 [P] [US1] Test unitario apps/web/tests/unit/chapa.test.ts: colores de las chapas con R7 (escudos null por coincidencia → local principal, visitante secundario o su principal si `equipacionesParecidas` con el principal del local); sin `escudos` en el mensaje → colores de siempre
- [X] T024 [P] [US1] Test de integración apps/server/tests/integration/escudo-partida.test.ts: escudo del perfil copiado al unirse; cuenta sin escudo → mismo asignado en dos partidas; NPC con escudo gratuito; invitado sin elección → `null`; `PUT /api/partidas/:id/escudo` con un escudo no disponible → 422 `COSMETICO_NO_DISPONIBLE`, invitado con uno de pago → 422, tras empezar el torneo → 409 `TORNEO_INICIADO`; cambiarlo en la partida no cambia el del perfil; `partido.inicio` lleva `escudos` y, con el mismo escudo en los dos lados, `{ null, null }`; participante antiguo con `escudo` null recibe el asignado sin tocar la fila; `GET /api/partidas/:id/alineacion` incluye `escudo`
- [X] T025 [P] [US1] Test de integración apps/server/tests/integration/aspecto.test.ts (parte de escudo): `GET /api/perfil/aspecto` de cuenta nueva → asignado con `escudoAsignado: true`; `PUT` con escudo gratuito → elegido; con uno de pago no comprado → 422 `COSMETICO_NO_DISPONIBLE`; `escudo: null` → vuelve al asignado; invitado → la respuesta fija del contrato y `PUT` → 403

### Implementación de US1

- [X] T026 [US1] Implementar packages/domain/src/cosmeticos/escudos.ts (`escudoAsignado`, `escudoNpc`, `escudosEnPartido`); la lista de gratuitos llega por parámetro, ordenada por `orden` (data-model §5)
- [X] T027 [US1] En apps/server/src/persistencia/repos/perfiles.ts: leer y guardar `escudo` del aspecto; al leer, un escudo que ya no está disponible se trata como null (FR-009)
- [X] T028 [US1] En apps/server/src/http/perfil.ts: `GET /api/perfil/aspecto` (sesión; los campos de sobre con sus valores por defecto hasta US2) y `PUT /api/perfil/aspecto` (registrados) con el campo `escudo`, validado con `estaDisponible` (contracts/http-api.md, «Aspecto»)
- [X] T029 [US1] En apps/server/src/actores/identidad.ts: al unirse (desde gestor.ts y sala.ts) copiar a `participantes.escudo` el escudo del perfil si está disponible; añadir `escudoDe(c, pid)` con la resolución de data-model §5 (columna → asignado del registrado → NPC por semilla → null del invitado)
- [X] T030 [US1] En apps/server/src/http/partidas.ts: `PUT /api/partidas/:id/escudo` (sesión, participante) con la misma validación y el mismo bloqueo por torneo iniciado que `nombre-equipo`; en apps/server/src/http/alineacion.ts y packages/protocol/src/http/alineacion.ts añadir `escudo: string | null`
- [X] T031 [US1] En packages/protocol/src/ws/partido.ts: campo opcional `escudos?: { local: string | null; visitante: string | null }` en `MsgPartidoInicio`
- [X] T032 [US1] En apps/server/src/actores/partidoRapido.ts (junto a `equipacionesDelPartido`) y apps/server/src/actores/partidoEntreHumanos.ts: rellenar `escudos` con `escudosEnPartido(escudoDe(local), escudoDe(visitante))` sin consultas nuevas a la BD (el escudo sale de la fila del participante en memoria); comprobar con `graphify query` que el 2D y la reproducción (apps/server/src/http/partidos.ts) usan el mismo `partido.inicio` y, si lo reconstruyen, añadir `escudos` allí
- [X] T033 [P] [US1] Crear apps/web/src/estado/aspecto.ts: carga `GET /api/perfil/aspecto` una vez por sesión y expone recargar y actualizar, con el patrón de apps/web/src/estado/saldo.ts
- [X] T034 [US1] En apps/web/src/componentes/Marcador.tsx (`Chapa`): props `{ color?: string; escudo?: string | null; nombre?: string }`; con escudo, `<img src="/cosmeticos/escudos/<id>-64.webp" alt={nombre} className="chapa chapa-escudo">` del mismo tamaño de caja y `object-fit: contain`; `onError` vuelve al círculo; `data-testid="escudo-local"` / `"escudo-visitante"`; añadir una función pura que resuelve `{ color, escudo }` de cada lado a partir de `equipaciones` y `escudos` con la regla R7 (la que prueba T023) y estilos `.chapa-escudo` en la hoja de estilos de la chapa
- [X] T035 [US1] Pasar `escudos` de `partido.inicio` a todos los usos de `Chapa`: `Marcador`, apps/web/src/componentes/GoleadoresFranja.tsx, apps/web/src/componentes/ResumenEventos.tsx, franja y poseedor de apps/web/src/pantallas/Partido2D.tsx, apps/web/src/pantallas/PartidoRapido.tsx y apps/web/src/pantallas/ReproduccionPartido.tsx (la chapa de jugador de `CampoEquipo.tsx` no cambia)
- [X] T036 [P] [US1] Crear apps/web/src/componentes/SelectorEscudo.tsx (contracts/ui.md §3): rejilla de miniaturas `-256.webp` mostradas a 64–72 px; disponibles primero y bloqueados después con candado y enlace «Ver en la tienda» (`/tienda#escudos`); invitados sin bloqueados; elegido con borde y `aria-pressed`; teclado (flechas y Enter) y `aria-label` con el nombre; 4 columnas a 360 px sin desplazamiento horizontal; desplazamiento interno con la elección arriba (Principio XI)
- [X] T037 [US1] Usar `SelectorEscudo` en apps/web/src/pantallas/Perfil.tsx (guarda con `PUT /api/perfil/aspecto` y actualiza el estado `aspecto`) y en apps/web/src/pantallas/Alineacion.tsx junto al nombre del equipo (guarda con `PUT /api/partidas/:id/escudo`, bloqueado con el torneo iniciado como el nombre)
- [X] T038 [US1] E2E en apps/web/tests/e2e/cosmeticos.spec.ts (bloque «escudos»): cuenta nueva elige un escudo gratuito en Perfil, crea partida contra NPC, juega un partido rápido y ve `escudo-local` y `escudo-visitante` en el marcador y el resumen; invitado sin elegir ve el círculo y en Alineación solo gratuitos

**Checkpoint**: T022–T025 y T038 en verde; recorridos 1 (parte de escudo), 2, 3, 4, 5 y 13 del quickstart correctos.

---

## Phase 5: User Story 2 - Elegir el diseño del sobre (favorito o carrusel) (Priority: P1)

**Goal**: cada apertura de sobre usa el favorito o el siguiente de la baraja del carrusel, con una rasgadura propia por diseño.

**Independent Test**: con una cuenta con dos diseños (comprados o insertados en `cosmeticos_usuario` en el test), activar el carrusel con ambos, abrir sobres en el draft y comprobar que salen los dos y que cada uno se rasga distinto (quickstart, recorrido 6).

### Tests de US2

- [X] T039 [P] [US2] Test de dominio packages/domain/tests/cosmeticos/carrusel.test.ts: sin carrusel → favorito o `sobre-original`; carrusel con N ≥ 2 → en N llamadas salen los N sin repetir y nunca el mismo dos veces seguidas al cambiar de vuelta; 1 marcado → equivale a favorito; 0 marcados → `sobre-original`; `sobreActual` no modifica el estado; ids no disponibles se descartan
- [X] T040 [P] [US2] Test unitario apps/web/tests/unit/rasgadura.test.ts: `rasgaduraDe(id)` es determinista, devuelve un `polygon(...)` válido de 17 a 23 vértices con la banda entre el 8 % y el 22 %, y los 31 ids de data/cosmeticos.json dan 31 polígonos distintos
- [X] T041 [P] [US2] Ampliar apps/server/tests/integration/aspecto.test.ts (parte de sobres): `PUT` con favorito no disponible → 422; cambiar `sobresMarcados` o `sobreCarrusel` vacía la baraja; `POST /api/perfil/aspecto/sobre-siguiente` con 3 marcados recorre los 3 sin repetir; dos llamadas concurrentes no sacan el mismo diseño de la misma vuelta (bloqueo de la fila); invitado → `{ diseno: 'sobre-original' }` sin escribir nada

### Implementación de US2

- [X] T042 [US2] Implementar packages/domain/src/cosmeticos/carrusel.ts (`sobreActual(p)` y `siguienteSobre(p, rng)` con Fisher–Yates y la regla de no repetir `sobre_ultimo`) según data-model §4, usando el rng de packages/domain/src/rng/
- [X] T043 [US2] En apps/server/src/persistencia/repos/perfiles.ts: leer y guardar `sobre_favorito`, `sobre_carrusel`, `sobres_marcados`, `sobre_baraja` y `sobre_ultimo`, descartando al leer los ids ya no disponibles; vaciar `sobre_baraja` al cambiar marcados o carrusel
- [X] T044 [US2] En apps/server/src/http/perfil.ts: campos `sobreFavorito`, `sobreCarrusel` y `sobresMarcados` en `PUT /api/perfil/aspecto` (cada id del tipo `sobre` y disponible, si no 422 `COSMETICO_NO_DISPONIBLE`), `sobreActual` en `GET`, y `POST /api/perfil/aspecto/sobre-siguiente` en una transacción con `select … for update` de la fila del perfil
- [X] T045 [P] [US2] Crear apps/web/src/componentes/arte/rasgadura.ts con `rasgaduraDe(id)`: generador con semilla a partir del id, 17–23 vértices, picos de altura y ancho variables, banda del 8 % al 22 %; `sobre-original` devuelve el polígono actual de `.rasgado` en apps/web/src/estilos/cartas.css (research R8)
- [X] T046 [US2] En apps/web/src/componentes/arte/SobreArte.tsx: props `{ diseno?: string; rasgado?: boolean; className?: string; mini?: boolean }`; sin diseño o `sobre-original` → `/cartas/sobre.svg` y el polígono actual; otro → `/cosmeticos/sobres/<id>.webp` (o `-mini.webp`) y, rasgado, `style={{ clipPath: rasgaduraDe(id) }}`; `onError` vuelve al sobre original
- [X] T047 [US2] En apps/web/src/componentes/AperturaSobre.tsx: prop `diseno` pasada a `SobreArte`; en apps/web/src/pantallas/Draft.tsx pedir `sobre-siguiente` una vez al empezar cada ronda; en apps/web/src/pantallas/Tienda.tsx pedirlo en cada compra de sobre de cartas antes de la apertura; si la petición falla, usar `sobre-original` sin bloquear la apertura; adaptar apps/web/tests/unit/aperturaSobre.test.ts si cambia
- [X] T048 [US2] Usos decorativos de `SobreArte` con `aspecto.sobreActual` (sin avanzar la baraja): apps/web/src/pantallas/Inicio.tsx, Sala.tsx, CrearPartida.tsx, Draft.tsx y Tienda.tsx
- [X] T049 [P] [US2] Crear apps/web/src/componentes/SelectorSobre.tsx (contracts/ui.md §4): interruptor «Carrusel»; apagado, elección única; encendido, casillas y el texto «Se alternan sin repetirse»; miniaturas `-mini.webp` que muestran la versión rasgada al pasar el ratón o enfocar; bloqueados con candado y «Ver en la tienda» (`/tienda#sobres`); accesible con teclado; sin desplazamiento horizontal a 360 px
- [X] T050 [US2] Usar `SelectorSobre` en apps/web/src/pantallas/Perfil.tsx (guarda con `PUT /api/perfil/aspecto`) y ampliar apps/web/tests/e2e/cosmeticos.spec.ts (bloque «sobres»: cuenta con 2 diseños, carrusel activo, draft completo y comprobación de que salen los dos)

**Checkpoint**: T039–T041 y el e2e de sobres en verde; recorridos 1 (parte de sobre) y 6 del quickstart correctos.

---

## Phase 6: User Story 3 - Comprar escudos y sobres en la tienda (Priority: P2)

**Goal**: la tienda vende escudos, sobres y packs con fragmentos o euros (simulado), cobrando una sola vez.

**Independent Test**: comprar un escudo de pago y un diseño de sobre desde la tienda, verlos desbloqueados en «Mi perfil» y comprobar que una doble pulsación cobra una sola vez (quickstart, recorridos 7, 8 y 10).

**Depende de**: Fase 3 (FR-002), US1 (T036) y US2 (T049) para mostrar el desbloqueo en los selectores.

### Tests de US3

- [X] T051 [P] [US3] Test de integración apps/server/tests/integration/cosmeticos.test.ts: `GET /api/cosmeticos` sin sesión (sin `poseido` ni `saldo`) y con sesión (`poseido`, `disponible` de los packs y `saldo`); retirados solo para quien los posee; compra con fragmentos (cargo de 250 y un movimiento `compra_cosmetico`) y con euros; mismo `idCompra` repetido y en paralelo → misma respuesta y un solo cargo (SC-006); errores 404 `PRODUCTO_NO_ENCONTRADO` (inexistente o retirado), 422 `COSMETICO_GRATUITO`, 409 `COSMETICO_POSEIDO`, 422 `SALDO_INSUFICIENTE` con `{ saldo, precio, faltan }`, 409 `ID_COMPRA_REUTILIZADO`, 403 `SOLO_REGISTRADOS`; pack → 5 filas en `cosmeticos_usuario`, 409 `PACK_CON_POSEIDOS` con `{ poseidos }` si ya tiene alguno; tras comprar, el cosmético es elegible en `PUT /api/perfil/aspecto`; ninguna compra cambia saldo de cartas, colección ni partidas (FR-016)

### Implementación de US3

- [X] T052 [US3] En apps/server/src/economia/servicio.ts: `comprarCosmetico(usuario, id, moneda, idCompra)` y `comprarPack(usuario, packId, idCompra)` sobre `comprar()` (idempotencia, bloqueo y compra repetida), con `producto_tipo` `'cosmetico'` / `'pack_cosmeticos'`, `resultado.cosmeticos: string[]`, inserción en `cosmeticos_usuario` con `compra_id` y `cobrar(..., 'compra_cosmetico')`; los packs solo con euros (research R10)
- [X] T053 [US3] Crear apps/server/src/http/cosmeticos.ts con `GET /api/cosmeticos` (público; sesión opcional), `POST /api/tienda/cosmeticos/:id/comprar` y `POST /api/tienda/packs/:id/comprar` (registrados), con los errores de contracts/http-api.md añadidos en apps/server/src/http/errores.ts; registrar las rutas en apps/server/src/http/app.ts
- [X] T054 [US3] En apps/web/src/pantallas/Tienda.tsx: bloques «Escudos» (`id="escudos"`) y «Sobres» (`id="sobres"`) desde `GET /api/cosmeticos`: rejilla con miniatura, nombre y dos botones («250 fragmentos» y «0,25 €» / «0,50 €») o el distintivo «Comprado»; packs arriba con sus 5 miniaturas, precio y ahorro («5 por 0,99 €»), o «Ya tienes alguno: cómpralos sueltos» si no están disponibles; los sobres se ven cerrados y rasgados (`SobreArte` + `rasgaduraDe`); compra con `ConfirmacionCompra` e `idCompra` generado una vez por intento; invitado ve el catálogo y recibe el aviso de crear cuenta que ya existe; tras comprar, recargar saldo, catálogo y `aspecto`; en escritorio, columnas cartas | cosméticos con desplazamiento interno por bloque (Principio XI)
- [X] T055 [US3] Ampliar apps/web/tests/e2e/cosmeticos.spec.ts (bloque «tienda»): comprar un escudo con fragmentos con doble pulsación → un único cargo y «Comprado»; el pack que lo contiene dice «Ya tienes alguno»; el escudo aparece desbloqueado en el selector de Perfil; invitado → aviso de crear cuenta

**Checkpoint**: T051 y T055 en verde; recorridos 7, 8 y 10 del quickstart correctos.

---

## Phase 7: User Story 4 - Plan B de identidad de las cartas (Priority: P2)

**Goal**: un ajuste sin reinicio elige la identidad real o la alternativa; cada partida fija la suya al crearse y nada del juego cambia.

**Independent Test**: con el ajuste en «alternativa», recorrer Colección, draft y partido sin ver nombres ni retratos reales; el mismo partido con la misma semilla da el mismo resultado en los dos modos (quickstart, recorridos 11 y 12).

### Tests de US4

- [X] T056 [P] [US4] Test de dominio packages/domain/tests/catalogo/identidad.test.ts: `conIdentidad(j, 'real')` devuelve el jugador tal cual; `'alternativa'` con identidad alternativa usa sus valores (y la silueta de su demarcación si no tiene `imagen`); sin ella, `nombre_carta = "<Demarcación> <id>"` (`Portero`, `Defensa`, `Centrocampista`, `Delantero`), `nombre` igual, `apellidos = ""`, `imagen = /cartas/siluetas/<dem>.svg` e `historia` vacía; nunca cambian `id`, `stats`, `media`, `virtudes`, `defectos`, `nivel`, `demarcacion`, `posicion`, `nacionalidad`, `altura` ni `fecha_nacimiento`
- [X] T057 [P] [US4] Test de integración apps/server/tests/integration/identidad-cartas.test.ts: con el ajuste en «alternativa» (y la caché expirada con un reloj inyectado), una partida nueva tiene `identidad = 'alternativa'` y su draft, alineación, partido, torneo y avisos no contienen el nombre real de ninguna carta; una partida creada antes conserva «real»; `/api/catalogo/jugadores`, `/api/catalogo/jugadores/:id`, `GET /api/coleccion`, `GET /api/tienda` y `GET /api/fragmentos/movimientos` siguen el ajuste; ninguna respuesta lleva las dos identidades; el mismo partido con la misma semilla da el mismo desarrollo y resultado en los dos modos (US4-3, FR-019)
- [X] T058 [P] [US4] Test de la caché de ajustes en apps/server/tests/integration/identidad-cartas.test.ts (o unitario junto al servicio): sin fila → «real»; tras escribir la fila, el valor nuevo se lee en ≤ 30 s sin reiniciar

### Implementación de US4

- [X] T059 [US4] En packages/domain/src/catalogo/tipos.ts: campo opcional `identidad_alternativa?: { nombre, apellidos, nombre_carta, imagen? }` en el jugador; en packages/domain/src/catalogo/validar.ts validar que, si existe, los tres nombres no están vacíos
- [X] T060 [US4] Implementar packages/domain/src/catalogo/identidad.ts (`conIdentidad(jugador, identidad)` y el nombre genérico) según data-model §6; exportar `Identidad = 'real' | 'alternativa'`
- [X] T061 [US4] En apps/server/src/persistencia/seed.ts: cargar `identidad_alternativa` de data/core-real.json y data/cartas-prueba.json en `nombre_alt`, `apellidos_alt`, `nombre_carta_alt` e `imagen_alt`
- [X] T062 [P] [US4] Crear apps/server/src/ajustes/servicio.ts (`ServicioAjustes.identidadCartas()`, lectura de la tabla `ajustes` con caché de 30 s y reloj inyectable; sin fila, `'real'`) y registrarlo en los servicios del servidor
- [X] T063 [P] [US4] Crear apps/server/src/ajustes/cli.ts (`pnpm --filter @fbd/server ajuste identidad_cartas <real|alternativa>`): valida clave y valor, hace upsert de la fila con `actualizado_en` y muestra el valor anterior y el nuevo
- [X] T064 [US4] En apps/server/src/persistencia/repos/catalogo.ts: `Catalogo.conIdentidad(identidad)` que devuelve una vista cacheada con el patrón de `enVersion()`, aplicando `conIdentidad` a cada jugador (incluido `resumen()`)
- [X] T065 [US4] Al crear la partida (apps/server/src/persistencia/repos/partidas.ts y el gestor que la crea en apps/server/src/actores/) copiar `await ajustes.identidadCartas()` a `partidas.identidad`; en `ControladorPartida.catalogo` encadenar `enVersion(v).conIdentidad(identidad)`
- [X] T066 [US4] Fuera de las partidas, usar `catalogo.conIdentidad(await ajustes.identidadCartas())` en apps/server/src/http/catalogo.ts, apps/server/src/http/coleccion.ts, apps/server/src/http/tienda.ts y en el historial de fragmentos de apps/server/src/economia/servicio.ts (localizar con `graphify query` cualquier otro sitio que lea `Catalogo` directamente)
- [X] T067 [US4] En tools/fixtures/src/coreReal.ts: aceptar `imagen` bajo `/cartas/retratos-propios/` y `/cartas/retratos/`; añadir a specs/008-datos-reales-core/sumario.md una tabla por rareza (total, con identidad alternativa, con retrato propio, con retrato de terceros) y la lista de cartas que aún usan un retrato de terceros (FR-020; research R13)
- [X] T068 [US4] Recorrido manual en «alternativa» (quickstart, recorrido 11): Colección, draft, alineación, partido rápido, 2D, torneo y avisos sin nombres ni retratos reales; la partida anterior sigue en «real»

**Checkpoint**: T056–T058 en verde; `pnpm test:equivalence` sin cambios; recorridos 11 y 12 correctos.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: retratos propios, retirada de los originales, documentación y validación completa.

- [X] T069 Ejecutar `pnpm --filter @fbd/fixtures imagenes -- --retratos <carpeta>` con los retratos manga entregados (salida 278 × 362 en apps/web/public/cartas/retratos-propios/) — *hecho de otra forma (2026-11-05): los 300 retratos manga se recortaron del croma con un guion de un solo uso a 139 × 181 y se movieron a `retratos-propios/`; la carpeta de origen ya se retiró, así que no hay versión a 278 × 362 ni opción `--retratos` en el guion*
- [X] T070 Actualizar `imagen` en data/core-real.json para que cada carta apunte a `/cartas/retratos-propios/<slug>.webp` (añadir al guion de T012 una opción que lo haga o un paso en tools/fixtures/src/coreReal.ts; nunca editar a mano 300 entradas)
- [X] T071 En tools/fixtures/src/coreReal.ts: la validación de Core falla si alguna carta usa un retrato de terceros (`/cartas/retratos/`); regenerar specs/008-datos-reales-core/sumario.md con «retratos de terceros: 0» en todas las rarezas (FR-021)
- [X] T072 Borrar apps/web/public/cartas/retratos/ y comprobar que ninguna referencia queda en código, datos ni tests (`graphify query` y búsqueda de `/cartas/retratos/`)
- [X] T073 Sacar del repositorio los orígenes `escudos/`, `sobres/` y la carpeta de retratos manga (FR-004), tras confirmar con la persona dónde se archivan
  - 2026-11-06: la persona sacó `escudos/` y `sobres/` del proyecto y los guarda aparte
- [X] T074 [P] Actualizar CLAUDE.md: `data/cosmeticos.json` en la línea de datos del catálogo y el guion `pnpm --filter @fbd/fixtures imagenes`; la especificación en curso
- [X] T075 [P] Actualizar ROADMAP.md con el estado final de la 011, INI-11 e INI-14
- [X] T076 Ejecutar `pnpm typecheck && pnpm lint`, `pnpm test`, `pnpm --filter @fbd/server test:integration` y `test:integration:hilos`, `pnpm test:equivalence` y `pnpm e2e`, y corregir lo que falle
  - 2026-11-06: verdes typecheck, lint, `pnpm test` (933), integración y `test:integration:hilos` (215 cada una) y equivalencia (32). `pnpm e2e`: 93/100. Corregidos los dos de la spec 011 (axe `listitem` en el selector de sobres; el test de contorno de chapas ya no mira los escudos). Quedan cinco ajenos a la spec 011: `dificultad.spec.ts` (4 dificultades desde e420c61), `diseno/tema.spec.ts` (radio 50 % de `.boton-ayuda`) y `diseno/ronda5.spec.ts` (sin texto «Dorsales»), ambos desde ad80b41, `navegacion.spec.ts:80` (desde bc01ba1 quien abandona ya no participa y no puede volver al draft) y `torneo-asincrono.spec.ts`, intermitente (pasa al repetirlo). Actualizados los cinco (el último sumaba los goles en propia, que la tabla no cuenta): `pnpm e2e` 100/100
- [X] T077 Recorridos manuales 1–17 de specs/011-rework-tienda/quickstart.md (14–17: retoques de la fase 9), incluidos el cronómetro de SC-001, 20 partidos con el mismo escudo (SC-003) y el marcador del 2D y los selectores a 360 px
- [X] T078 Ejecutar `graphify update .`

---

## Phase 9: Retoques tras la prueba manual (2026-11-07)

**Purpose**: correcciones pedidas antes de aprobar T068 y T077 (FR-023 a FR-028).

- [X] T079 Apertura sin pestañeo (FR-027): `prepararSobre()` en apps/web/src/estado/aspecto.ts pide el siguiente diseño y espera a su imagen; Draft.tsx no monta la apertura hasta tenerlo y borra el diseño al terminar cada apertura; Tienda.tsx usa `prepararSobre()`
- [X] T080 [P] Escudos mayores (FR-028): `Chapa` con `grande` (imagen de 256 px) en Marcador.tsx y tamaños en base.css (marcador, franja 2D, poseedor, goleadores y resumen); token `--sombra-escudo`
- [X] T081 Campo horizontal (FR-024): `orientacion` en CampoEquipo.tsx (posiciones, arrastre, flechas y líneas giradas), `useDistribucion()` e interruptor en Alineacion.tsx, `--cesped-textura-horizontal` y `--ancho-pantalla-amplia` en tokens.css
- [X] T082 Pestañas del lateral fijas al desplazarse (FR-025) en base.css
- [X] T083 Dorsales compactos y plegados al final de «Personalización» (FR-026): EditorDorsales.tsx, Alineacion.tsx y base.css; adaptar dorsales.spec.ts y diseno/ronda5.spec.ts
- [X] T084 Tienda con secciones y subsecciones (FR-023): Tienda.tsx (`useSeccion`, `NavegacionTienda`, «Próximamente»), TiendaCosmeticos.tsx (`tipos`, `compacta`, «Tienes X de Y», saldo insuficiente) y coleccion.css
- [X] T085 Ejecutar typecheck, lint, tests unitarios y `pnpm e2e`; `graphify update .`

---

## Phase 10: Previsualización en la tienda y cierre (2026-11-08)

**Purpose**: ver los cosméticos en grande antes de comprarlos (FR-029) y cerrar la spec tras aprobar T068 y T077.

- [X] T086 Previsualización (FR-029): `Previsualizacion`, `ArteGrande` y la miniatura como botón en apps/web/src/componentes/TiendaCosmeticos.tsx (precios compartidos entre la ficha y la previsualización); estilos en apps/web/src/estilos/coleccion.css; e2e en cosmeticos.spec.ts
- [X] T087 [P] Cerrar la spec: estado «Implementada» en spec.md, recorrido 18 en quickstart.md, INI-11 e INI-14 en ROADMAP.md y CLAUDE.md sin spec en curso
- [X] T088 Ejecutar typecheck, lint, tests unitarios y los e2e de la tienda; `graphify update .`
- [X] T089 Escudos a 512 px (`<id>-512.webp`) en tools/fixtures/src/cosmeticos.ts, regenerados desde `escudos/`; la comprobación de SC-005 compara solo los tipos procesados; la previsualización usa esa imagen
- [X] T090 Previsualización individual dentro de la del pack (FR-029): navegación por sus 5, «Volver al pack» y Escape; e2e en cosmeticos.spec.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sin dependencias.
- **Foundational (Fase 2)**: depende de la Fase 1. Bloquea todas las historias. T004–T005 son la puerta de la venta.
- **Economía FR-002 (Fase 3)**: depende de la Fase 2. Solo bloquea US3.
- **US1 (Fase 4)** y **US2 (Fase 5)**: dependen de la Fase 2 y son independientes entre sí.
- **US3 (Fase 6)**: depende de la Fase 3 y, para mostrar el desbloqueo, de los selectores de US1 (T036) y US2 (T049).
- **US4 (Fase 7)**: depende solo de la Fase 2 (T006, T008); es independiente de US1–US3.
- **Polish (Fase 8)**: depende de todas las historias; T069–T073 necesitan los retratos manga (T001).

### Dentro de cada historia

- Los tests se escriben primero y deben fallar antes de implementar.
- Dominio → repos → rutas → protocolo y actores → estado web → componentes → pantallas → e2e.
- T028 y T044 tocan apps/server/src/http/perfil.ts; T027 y T043, perfiles.ts: si US1 y US2 van en paralelo, coordinar
  esos dos ficheros.
- T021, T047, T048 y T054 tocan apps/web/src/pantallas/Tienda.tsx: no son paralelas entre sí.

### Parallel Opportunities

- Fase 1: T003 en paralelo con T002.
- Fase 2: T005 con T004; T007, T008, T010, T011 y T014 entre sí.
- Fase 3: T017 y T018 en paralelo.
- US1, US2 y US4 pueden avanzar a la vez tras la Fase 2.
- Dentro de cada historia, los tests marcados [P] y los componentes nuevos (`SelectorEscudo`, `SelectorSobre`,
  `rasgadura.ts`, `estado/aspecto.ts`, `ajustes/servicio.ts`, `ajustes/cli.ts`).

---

## Parallel Example: User Story 1

```text
# Tests a la vez:
T022 packages/domain/tests/cosmeticos/escudos.test.ts
T023 apps/web/tests/unit/chapa.test.ts
T024 apps/server/tests/integration/escudo-partida.test.ts
T025 apps/server/tests/integration/aspecto.test.ts

# Cliente mientras se hace el servidor (T026–T032):
T033 apps/web/src/estado/aspecto.ts
T036 apps/web/src/componentes/SelectorEscudo.tsx
```

## Parallel Example: User Story 2

```text
T039 packages/domain/tests/cosmeticos/carrusel.test.ts
T040 apps/web/tests/unit/rasgadura.test.ts
T041 apps/server/tests/integration/aspecto.test.ts (sobres)
T045 apps/web/src/componentes/arte/rasgadura.ts
T049 apps/web/src/componentes/SelectorSobre.tsx
```

## Parallel Example: User Story 4

```text
T056 packages/domain/tests/catalogo/identidad.test.ts
T057 apps/server/tests/integration/identidad-cartas.test.ts
T062 apps/server/src/ajustes/servicio.ts
T063 apps/server/src/ajustes/cli.ts
```

---

## Implementation Strategy

### MVP (solo US1)

1. Fase 1 y Fase 2 (incluida la puerta T004–T005).
2. Fase 4 (US1): escudos elegidos, asignados y de NPC en todos los sitios del círculo.
3. **Parar y validar**: recorridos 1–5 y 13 del quickstart.

### Entrega incremental

1. Fase 1 + Fase 2 → base lista.
2. US1 → escudos (MVP).
3. US2 → sobres con carrusel.
4. Fase 3 + US3 → la tienda cumple FR-002 y vende cosméticos.
5. US4 → plan B de identidad listo.
6. Fase 8 → retratos propios, originales fuera y validación completa.

### Equipo en paralelo

Tras la Fase 2: una persona con US1, otra con US2 y otra con Fase 3 + US4; US3 al terminar US1 y US2.
