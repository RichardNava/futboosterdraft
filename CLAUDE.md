# Fútboosterdraft

Juego de fútbol manager online basado en un draft de sobres de cartas de jugadores.

- Principios del proyecto: [.specify/memory/constitution.md](.specify/memory/constitution.md)
- Iniciativas, prioridades y estado de cada spec: [ROADMAP.md](ROADMAP.md)
- Especificación en curso: ninguna (la última, [specs/011-rework-tienda/](specs/011-rework-tienda/), se cerró el 2026-11-08)
- Datos del catálogo: `data/core-real.json` y `data/cartas-prueba.json` (cartas), `data/colecciones.json` (pertenencia) y `data/cosmeticos.json` (escudos, sobres y packs); `pnpm seed` los carga todos
- Las 300 cartas de Core son jugadores reales y su única fuente es `data/core-real.json`; `pnpm --filter @fbd/fixtures core-real` lo valida (solo retratos propios, en `/cartas/retratos-propios/`) y regenera `specs/008-datos-reales-core/sumario.md`
- Imágenes de cosméticos: `pnpm --filter @fbd/fixtures imagenes -- --escudos <dir> --sobres <dir>` (WebP en `apps/web/public/cosmeticos/`; completa `data/cosmeticos.json` sin pisar lo editado)
- Identidad de las cartas (plan B de derechos de imagen): `pnpm --filter @fbd/server ajuste identidad_cartas <real|alternativa>`, sin reiniciar y solo para las partidas nuevas
- Guía de estilos visuales (referencia de la spec 004): [docs/diseno/DESIGN.md](docs/diseno/DESIGN.md)
- Sonidos (acción → efecto, editable): [docs/juego/sonidos.md](docs/juego/sonidos.md)
- Virtudes y defectos: [docs/juego/virtudes-y-defectos.md](docs/juego/virtudes-y-defectos.md) (generado; `pnpm --filter @fbd/domain rasgos:doc`)

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
