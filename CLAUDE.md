# Fútboosterdraft

Juego de fútbol manager online basado en un draft de sobres de cartas de jugadores.

- Principios del proyecto: [.specify/memory/constitution.md](.specify/memory/constitution.md)
- Iniciativas, prioridades y estado de cada spec: [ROADMAP.md](ROADMAP.md)
- Especificaciones en curso: [specs/018-rework-motor/](specs/018-rework-motor/) (motor 9.0.0: fatiga, tácticas y rendimiento) y [specs/017-auditoria-seguridad-roles/](specs/017-auditoria-seguridad-roles/) (auditoría de seguridad y roles), esta pendiente de la aprobación de la persona responsable (T110). La última cerrada, [specs/016-expansiones-reales/](specs/016-expansiones-reales/) (cuatro expansiones de 24 jugadores reales), el 2026-11-20
- Datos del catálogo: `data/core-real.json` (Core) y `data/expansiones-reales.json` (cartas de las expansiones), `data/colecciones.json` (pertenencia, número y sobre de regalo de cada expansión) y `data/cosmeticos.json` (escudos, sobres y packs); `pnpm seed` los carga todos y retira las colecciones de prueba si quedan
- Las 300 cartas de Core son jugadores reales y su única fuente es `data/core-real.json`; `pnpm --filter @fbd/fixtures core-real` lo valida (solo retratos propios, en `/cartas/retratos-propios/`) y regenera `specs/008-datos-reales-core/sumario.md`
- Expansiones (spec 016): `pnpm --filter @fbd/fixtures expansiones -- [--origen <dir>] [--solo A|B|C|D]` genera retratos, fondos, iconos, carteles y el icono del fragmento desde el material de origen (ya retirado del repo: las listas y rarezas están en `specs/016-expansiones-reales/fuentes/`), valida las expansiones y escribe `specs/016-expansiones-reales/sumario.md`; en el código, una expansión es una colección de pago (`coleccion`)
- Imágenes de cosméticos: `pnpm --filter @fbd/fixtures imagenes -- --escudos <dir> --sobres <dir>` (WebP en `apps/web/public/cosmeticos/`; completa `data/cosmeticos.json` sin pisar lo editado)
- Identidad de las cartas (plan B de derechos de imagen): `pnpm --filter @fbd/server ajuste identidad_cartas <real|alternativa>`, sin reiniciar y solo para las partidas nuevas
- Ilustraciones de fondo de Core: `pnpm --filter @fbd/fixtures fondos-core -- --origen <dir>` (WebP en `apps/web/public/cartas/fondos/jugadores/<id>.webp`; escribe `imagen_bg` en `data/core-real.json`)
- Acceso a los niveles de rareza del draft: `pnpm --filter @fbd/server ajuste acceso_niveles_rareza <libre|restringido>`; premium de cortesía: `pnpm --filter @fbd/server premium <email> <si|no>`
- Administración (spec 017): panel en `/admin`; por consola, `pnpm --filter @fbd/server admin designar <email>` (solo sin administradores activos) y `pnpm --filter @fbd/server admin cerrar-partida <id> "<motivo>"` (con el servidor en marcha)
- Seguridad: `pnpm seguridad` repite todos los ataques y regenera `specs/017-auditoria-seguridad-roles/verificacion.md`
- Guía de estilos visuales (referencia de la spec 004): [docs/diseno/DESIGN.md](docs/diseno/DESIGN.md)
- Sonidos (acción → efecto, editable): [docs/juego/sonidos.md](docs/juego/sonidos.md)
- Virtudes y defectos: [docs/juego/virtudes-y-defectos.md](docs/juego/virtudes-y-defectos.md) (generado; `pnpm --filter @fbd/domain rasgos:doc`)
- Enfrentamientos del motor (qué stat contra cuál en cada acción y con qué probabilidad): [docs/juego/enfrentamientos.md](docs/juego/enfrentamientos.md) (a mano; revisar si cambia el motor)
- Medidas del motor (spec 018): `pnpm --filter @fbd/balance linea-base -- --n 1000 --salida <fichero.md>` compara cada táctica con un rival neutro (goles, victorias, energía por rol al 45', 75' y 90' y coste por partido); `pnpm --filter @fbd/balance calibrar-fatiga -- --n 1000` mide las referencias de acciones intensas por rol. La huella `packages/engine/tests/fixtures/huella-018.json` no se regenera: si una optimización la cambia, se descarta

## Convenciones

- **Gestor de paquetes: pnpm, sin excepciones.** Usa `pnpm install`, `pnpm add`, `pnpm -r`, `pnpm --filter <paquete>` y `pnpm dlx` en lugar de `npx`. No uses npm, yarn ni bun, y no generes `package-lock.json` ni `yarn.lock`. Las dependencias internas del monorepo se declaran con `workspace:*`.
- **Sin tildes en el código**: identificadores, valores enumerados y datos van en español sin tildes (p. ej. `Capitania`, `posicion`, `Superclase`). Las tildes solo aparecen en los textos que se muestran en la interfaz (p. ej. la etiqueta "Capitanía").
- Documentación y especificaciones en español.
- **Los agentes no ejecutan `git commit` ni `git push`** (constitución, "Flujo de trabajo de desarrollo"). Cuando convenga confirmar o publicar cambios, sugiérelo al final de la respuesta con el comando exacto listo para copiar; la persona decide si lo ejecuta. Sí puedes usar `git status`, `git diff`, `git log` y demás operaciones de solo lectura.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
