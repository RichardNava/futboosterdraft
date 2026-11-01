import { defineConfig } from 'tsup';

// Los paquetes del monorepo (@fbd/*) exportan TypeScript sin compilar: se incluyen en el bundle. El resto
// de dependencias se instalan en la imagen y se cargan de node_modules.
export default defineConfig({
  // `seed` también se compila para poder cargar el catálogo desde la imagen de producción; `hilo` es la entrada
  // de los hilos de simulación (spec 009), que el grupo busca junto a `main.js`.
  entry: { main: 'src/main.ts', seed: 'src/persistencia/seed.ts', hilo: 'src/simulacion/hilo.ts' },
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  noExternal: [/^@fbd\//],
});
