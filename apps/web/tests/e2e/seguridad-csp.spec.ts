/**
 * La política de contenido no rompe la web (spec 017, T062, R9). Solo tiene sentido contra la imagen de producción: en
 * desarrollo el HTML lo sirve Vite y no recibe la cabecera. Ejecutar con `E2E_BASE_URL=https://…`.
 */
import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

test.use({ ignoreHTTPSErrors: true });
test.skip(!process.env.E2E_BASE_URL, 'Necesita la imagen de producción (E2E_BASE_URL)');

test('las pantallas principales funcionan sin ninguna violación de CSP', async ({ page }) => {
  const violaciones: string[] = [];
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => console.error(`CSP-VIOLADA ${e.violatedDirective} ${e.blockedURI}`));
  });
  page.on('console', (m) => {
    if (m.text().includes('CSP-VIOLADA') || /Content Security Policy/i.test(m.text())) violaciones.push(m.text());
  });

  const portada = await page.goto('/');
  expect(portada?.headers()['content-security-policy']).toContain("script-src 'self'");
  await expect(page.locator('#root')).not.toBeEmpty();

  // Control: una hoja de estilo en línea debe bloquearse y detectarse; si no, esta prueba no demostraría nada.
  await page.evaluate(() => {
    const estilo = document.createElement('style');
    estilo.textContent = 'body { outline: 0 }';
    document.head.append(estilo);
  });
  await expect.poll(() => violaciones.length).toBeGreaterThan(0);
  violaciones.length = 0;

  // Cuenta y partida por la API desde la propia página, para que la cookie de sesión quede en el navegador.
  const id = randomUUID().slice(0, 8);
  const partidaId = await page.evaluate(async (sufijo) => {
    const cabeceras = { 'content-type': 'application/json' };
    const registro = await fetch('/api/auth/registro', {
      method: 'POST',
      headers: cabeceras,
      body: JSON.stringify({ email: `csp-${sufijo}@pruebas.test`, password: 'contraseña-segura', apodo: `Csp${sufijo}` }),
    });
    if (!registro.ok) throw new Error(`registro ${registro.status}`);
    const partida = await fetch('/api/partidas', { method: 'POST', headers: cabeceras, body: JSON.stringify({ modo: 'liga', numParticipantes: 4 }) });
    if (!partida.ok) throw new Error(`partida ${partida.status}`);
    return ((await partida.json()) as { id: string }).id;
  }, id);

  for (const ruta of ['/', '/mis-partidas', '/perfil', '/coleccion', '/tienda', '/partidas/nueva', `/partidas/${partidaId}/sala`]) {
    await page.goto(ruta);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main, #root').first(), ruta).not.toBeEmpty();
  }

  // Draft: sobres, retratos y WebSocket.
  await page.evaluate(async (partida) => {
    for (let i = 0; i < 3; i++) {
      await fetch(`/api/partidas/${partida}/npc`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nivel: 'intermedio' }) });
    }
    const r = await fetch(`/api/partidas/${partida}/iniciar`, { method: 'POST' });
    if (!r.ok) throw new Error(`iniciar ${r.status}`);
  }, partidaId);
  await page.goto(`/partidas/${partidaId}/draft`);
  await page.waitForLoadState('load');
  await page.waitForTimeout(3_000);

  expect(violaciones).toEqual([]);
});
