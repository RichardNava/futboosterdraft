# Fútboosterdraft

Juego de fútbol manager online basado en un draft de sobres de cartas de jugadores.

- Principios del proyecto: [.specify/memory/constitution.md](.specify/memory/constitution.md)
- Especificación y plan en curso: [specs/007-retoques-visuales/](specs/007-retoques-visuales/)
- Datos del catálogo: `data/core.json` y `data/cartas-prueba.json` (cartas) y `data/colecciones.json` (pertenencia); `pnpm seed` los carga todos
- Guía de estilos visuales (referencia de la spec 004): [docs/diseno/DESIGN.md](docs/diseno/DESIGN.md)
- Virtudes y defectos: [docs/juego/virtudes-y-defectos.md](docs/juego/virtudes-y-defectos.md) (generado; `pnpm --filter @fbd/domain rasgos:doc`)

## Convenciones

- **Gestor de paquetes: pnpm, sin excepciones.** Usa `pnpm install`, `pnpm add`, `pnpm -r`, `pnpm --filter <paquete>` y `pnpm dlx` en lugar de `npx`. No uses npm, yarn ni bun, y no generes `package-lock.json` ni `yarn.lock`. Las dependencias internas del monorepo se declaran con `workspace:*`.
- **Sin tildes en el código**: identificadores, valores enumerados y datos van en español sin tildes (p. ej. `Epico`, `Capitania`, `posicion`). Las tildes solo aparecen en los textos que se muestran en la interfaz (p. ej. la etiqueta "Épico").
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
