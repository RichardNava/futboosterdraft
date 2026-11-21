// Spec 017 (R14, SEG-009): `vitest` y `drizzle-kit` son dependencias pares opcionales de better-auth y arrastraban las
// herramientas de pruebas y compilación (vite, tinypool, tsx, esbuild…) a la imagen de producción.
function readPackage(pkg) {
  if (pkg.name === 'better-auth') {
    for (const par of ['vitest', 'drizzle-kit']) {
      if (pkg.peerDependencies) delete pkg.peerDependencies[par];
      if (pkg.peerDependenciesMeta) delete pkg.peerDependenciesMeta[par];
    }
  }
  return pkg;
}

module.exports = { hooks: { readPackage } };
