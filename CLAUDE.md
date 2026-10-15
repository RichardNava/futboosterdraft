# Fútboosterdraft

Juego de fútbol manager online basado en un draft de sobres de cartas de jugadores.

- Principios del proyecto: [.specify/memory/constitution.md](.specify/memory/constitution.md)
- Especificación y plan en curso: [specs/001-draft-manager-mvp/](specs/001-draft-manager-mvp/)

## Convenciones

- **Gestor de paquetes: pnpm, sin excepciones.** Usa `pnpm install`, `pnpm add`, `pnpm -r`, `pnpm --filter <paquete>` y `pnpm dlx` en lugar de `npx`. No uses npm, yarn ni bun, y no generes `package-lock.json` ni `yarn.lock`. Las dependencias internas del monorepo se declaran con `workspace:*`.
- Documentación y especificaciones en español.
