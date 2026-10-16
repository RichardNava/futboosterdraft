# syntax=docker/dockerfile:1
# Imagen de producción de Fútboosterdraft (T142): una sola imagen con Node 22 que sirve la API, el
# WebSocket y la web compilada. Ver docs/despliegue.md.

# ---- Compilación ----
FROM node:22-slim AS compilacion
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# Primero solo los manifiestos, para aprovechar la caché de dependencias entre compilaciones.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/domain/package.json packages/domain/
COPY packages/engine/package.json packages/engine/
COPY packages/ai/package.json packages/ai/
COPY packages/protocol/package.json packages/protocol/
COPY tools/balance/package.json tools/balance/
COPY tools/fixtures/package.json tools/fixtures/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .
RUN pnpm -r build
# Servidor con solo sus dependencias de producción (los paquetes @fbd/* ya van dentro del bundle).
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --filter @fbd/server deploy --prod /salida

# ---- Imagen final ----
FROM node:22-slim
ENV NODE_ENV=production \
    PORT=3000 \
    CARPETA_MIGRACIONES=/app/drizzle \
    CARPETA_WEB=/app/web
WORKDIR /app
COPY --from=compilacion /salida/package.json ./
COPY --from=compilacion /salida/node_modules ./node_modules
COPY --from=compilacion /app/apps/server/dist ./dist
COPY --from=compilacion /app/apps/server/drizzle ./drizzle
COPY --from=compilacion /app/apps/web/dist ./web
COPY --from=compilacion /app/data/core.json ./data/core.json
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s \
  CMD node -e "fetch('http://localhost:3000/healthz').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
# Aplica las migraciones pendientes y arranca (MIGRAR_AL_ARRANCAR=false lo desactiva).
CMD ["node", "dist/main.js"]
