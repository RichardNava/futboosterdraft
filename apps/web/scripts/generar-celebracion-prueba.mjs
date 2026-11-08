// Genera la celebración de prueba de clase «secuencia» (spec 012, FR-010a): un WebM VP9 con alfa de 2 s, texto
// animado y confeti sobre fondo transparente, grabado con MediaRecorder en Chromium (Playwright, ya instalado).
//   node apps/web/scripts/generar-celebracion-prueba.mjs
// No es arte final: solo comprueba que una secuencia se reproduce sin tocar la pantalla del partido (SC-003).
/* global document, MediaRecorder, requestAnimationFrame -- el código de `evaluate` corre en el navegador. */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const destino = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'cosmeticos', 'celebraciones');
const navegador = await chromium.launch();
const pagina = await navegador.newPage();
const base64 = await pagina.evaluate(async () => {
  const lienzo = document.createElement('canvas');
  lienzo.width = 640;
  lienzo.height = 400;
  const g = lienzo.getContext('2d');
  const tipo = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8'].find((t) => MediaRecorder.isTypeSupported(t));
  const grabadora = new MediaRecorder(lienzo.captureStream(30), { mimeType: tipo, videoBitsPerSecond: 1_500_000 });
  const trozos = [];
  grabadora.ondataavailable = (e) => trozos.push(e.data);
  const duracion = 2000;
  const confeti = Array.from({ length: 60 }, (_, i) => ({ x: (i * 97) % 640, v: 120 + ((i * 53) % 160), r: (i * 37) % 360, c: ['#b7ff2c', '#f3c552', '#ff4fd8', '#5ad1ff'][i % 4] }));
  const inicio = performance.now();
  grabadora.start();
  await new Promise((fin) => {
    const pintar = () => {
      const t = (performance.now() - inicio) / duracion;
      g.clearRect(0, 0, 640, 400);
      for (const p of confeti) {
        g.save();
        g.translate(p.x, -20 + p.v * t * 2.2);
        g.rotate(((p.r + 400 * t) * Math.PI) / 180);
        g.fillStyle = p.c;
        g.fillRect(-5, -3, 10, 6);
        g.restore();
      }
      const escala = t < 0.15 ? 0.3 + (t / 0.15) * 0.85 : t < 0.25 ? 1.15 - ((t - 0.15) / 0.1) * 0.15 : 1;
      g.save();
      g.translate(320, 200);
      g.rotate(Math.sin(t * Math.PI * 4) * 0.05);
      g.scale(escala, escala);
      g.font = 'italic 800 120px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 10;
      g.strokeStyle = '#0b1a12';
      g.strokeText('¡GOL!', 0, 0);
      g.fillStyle = '#b7ff2c';
      g.fillText('¡GOL!', 0, 0);
      g.restore();
      if (t < 1) requestAnimationFrame(pintar);
      else fin();
    };
    pintar();
  });
  grabadora.stop();
  await new Promise((r) => (grabadora.onstop = r));
  const bytes = new Uint8Array(await new Blob(trozos, { type: tipo }).arrayBuffer());
  let texto = '';
  for (const b of bytes) texto += String.fromCharCode(b);
  return btoa(texto);
});
await navegador.close();
mkdirSync(destino, { recursive: true });
const fichero = join(destino, 'celebracion-prueba-secuencia.webm');
const datos = Buffer.from(base64, 'base64');
writeFileSync(fichero, datos);
// AlphaMode = 1 (0x53C0 0x81 0x01) en la pista: el vídeo lleva canal alfa.
console.log(`${fichero}: ${datos.length} bytes, alfa: ${datos.includes(Buffer.from([0x53, 0xc0, 0x81, 0x01])) ? 'sí' : 'no'}`);
