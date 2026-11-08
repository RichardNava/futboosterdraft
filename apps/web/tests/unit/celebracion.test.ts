/**
 * Celebraciones de gol y sonidos del partido 2D (spec 012, T030; FR-001 a FR-003, FR-009 a FR-014). Sin DOM: la lógica
 * de la capa son funciones puras y el marcado se comprueba con `renderToStaticMarkup`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CapaCelebracion } from '../../src/componentes/celebraciones/CapaCelebracion';
import { CELEBRACIONES_JUEGO, IDS_CELEBRACIONES_JUEGO } from '../../src/componentes/celebraciones/registro';
import { duracionCelebracion, planCelebracion } from '../../src/componentes/celebraciones/tipos';
import { efectoDeEvento, goleadorDe } from '../../src/componentes/sonidosPartido';

const leer = (ruta: string) => readFileSync(fileURLToPath(new URL(ruta, import.meta.url)), 'utf8');
const catalogo = JSON.parse(leer('../../../../data/cosmeticos.json')) as {
  cosmeticos: { id: string; tipo: string; datos?: { clase: string; duracionMs: number } }[];
};
const celebraciones = catalogo.cosmeticos.filter((c) => c.tipo === 'celebracion');

describe('celebraciones del catálogo', () => {
  it('cada celebración de juego está en el registro y dura como mucho 3 s', () => {
    const deJuego = celebraciones.filter((c) => c.datos?.clase === 'juego');
    expect(deJuego.length).toBeGreaterThanOrEqual(4);
    for (const c of deJuego) {
      expect(CELEBRACIONES_JUEGO[c.id], c.id).toBeDefined();
      expect(c.datos!.duracionMs).toBeLessThanOrEqual(3000);
    }
  });
});

describe('CapaCelebracion', () => {
  const juego = { clase: 'juego' as const, duracionMs: 2800 };
  const secuencia = { clase: 'secuencia' as const, duracionMs: 4000 };

  it('id desconocido o vídeo que falla → la del juego', () => {
    expect(planCelebracion({ id: 'celebracion-neon', datos: juego }, IDS_CELEBRACIONES_JUEGO)).toEqual({ clase: 'juego', id: 'celebracion-neon' });
    expect(planCelebracion({ id: 'no-existe', datos: juego }, IDS_CELEBRACIONES_JUEGO)).toEqual({ clase: 'juego', id: 'celebracion-clasica' });
    expect(planCelebracion({ id: 'x', datos: secuencia }, IDS_CELEBRACIONES_JUEGO)).toEqual({ clase: 'secuencia', id: 'x' });
    expect(planCelebracion({ id: 'x', datos: secuencia }, IDS_CELEBRACIONES_JUEGO, true)).toEqual({ clase: 'juego', id: 'celebracion-clasica' });
  });

  // Spec 012, ronda 2: a x8 no daba tiempo a verla; ahora dura lo mismo a cualquier velocidad (el reloj espera).
  it('la duración no depende de la velocidad; la de juego, con tope de 3 s', () => {
    expect(duracionCelebracion(juego)).toBe(2800);
    expect(duracionCelebracion({ clase: 'juego', duracionMs: 9000 })).toBe(3000);
    expect(duracionCelebracion(secuencia)).toBe(4000);
    // Una secuencia que cae a la del juego también respeta el tope.
    expect(duracionCelebracion({ clase: 'secuencia', duracionMs: 5000 }, 'juego')).toBe(3000);
  });

  const pintar = (id: string, datos: typeof juego | typeof secuencia) =>
    renderToStaticMarkup(
      createElement(CapaCelebracion, {
        celebracion: { id, datos },
        equipo: { nombre: 'Los Ana', escudo: null, color: '#ff0000' },
        goleador: 'Pérez',
        onFin: () => undefined,
      }),
    );

  it('anuncia el gol a los lectores de pantalla y lleva su duración', () => {
    const html = pintar('celebracion-estadio', juego);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Gol de Pérez (Los Ana)');
    expect(html).toContain('data-celebracion="celebracion-estadio"');
    expect(html).toContain('--duracion-celebracion:2800ms');
    expect(html).toContain('celebracion-estadio');
  });

  it('«¡GOL!» va letra a letra y cada celebración del juego trae sus efectos', () => {
    const clasica = pintar('celebracion-clasica', juego);
    expect(clasica.match(/class="celebracion-letra"/g)).toHaveLength(5);
    expect(clasica).toContain('particulas-confeti');
    expect(clasica).toContain('celebracion-onda');
    expect(pintar('celebracion-estadio', juego)).toContain('particulas-flash');
    expect(pintar('celebracion-neon', juego)).toContain('particulas-chispa');
    expect(pintar('celebracion-pizarra', juego)).toContain('celebracion-flecha');
  });

  it('una secuencia es un vídeo silenciado con WebM y MOV', () => {
    const html = pintar('celebracion-prueba-secuencia', secuencia);
    expect(html).toMatch(/<video[^>]*muted/);
    expect(html).toContain('/cosmeticos/celebraciones/celebracion-prueba-secuencia.webm');
    expect(html).toContain('/cosmeticos/celebraciones/celebracion-prueba-secuencia.mov');
  });

  it('con movimiento reducido no queda ningún transform (solo el fundido de la capa)', () => {
    const css = leer('../../src/estilos/celebraciones.css');
    expect(css).toMatch(/\.capa-celebracion\.reducido \*[^{]*\{[^}]*transform: none !important/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.capa-celebracion \*[^{]*\{[^}]*transform: none !important/);
    // El fundido de la propia capa solo anima la opacidad.
    const fundido = css.match(/@keyframes celebracion-fundido \{([\s\S]*?)\n\}/)![1]!;
    expect(fundido).not.toContain('transform');
  });
});

describe('sonidos del partido 2D', () => {
  const ev = (tipo: string, datos: Record<string, unknown> = {}, equipo: 'local' | 'visitante' = 'local') => ({
    tick: 1,
    minuto: "1'",
    tipo,
    equipo,
    jugadores: [{ rol: 'autor', jugadorId: 7 }],
    datos,
  });

  it('pitidos: inicio de parte, descanso (también antes de la prórroga) y final', () => {
    expect(efectoDeEvento(ev('inicio_tramo', { parte: 2 }), 'local')).toBe('pitidoInicio');
    expect(efectoDeEvento(ev('fin_tramo', { parte: 1 }), 'local')).toBe('pitidoDescanso');
    expect(efectoDeEvento(ev('fin_tramo', { parte: 3 }), 'local')).toBe('pitidoDescanso');
    expect(efectoDeEvento(ev('fin_tramo', { parte: 2 }), 'local', 'pre_prorroga')).toBe('pitidoDescanso');
    expect(efectoDeEvento(ev('fin_tramo', { parte: 2 }), 'local', 'finalizado')).toBe('pitidoFinal');
    expect(efectoDeEvento(ev('fin_tramo', { motivo: 'tanda' }), 'local')).toBe('pitidoFinal');
  });

  it('gol propio o rival según el lado del espectador; tarjetas; el resto, nada', () => {
    expect(efectoDeEvento(ev('gol', {}, 'local'), 'local')).toBe('golPropio');
    expect(efectoDeEvento(ev('gol', {}, 'visitante'), 'local')).toBe('golRival');
    // En propia: el evento es del equipo que suma.
    expect(efectoDeEvento(ev('gol', { tipo: 'propia' }, 'visitante'), 'visitante')).toBe('golPropio');
    expect(efectoDeEvento(ev('amarilla'), 'local')).toBe('tarjetaAmarilla');
    expect(efectoDeEvento(ev('roja'), 'local')).toBe('tarjetaRoja');
    expect(efectoDeEvento(ev('ocasion'), 'local')).toBeNull();
  });

  it('el goleador de un gol en propia lleva «(p. p.)»', () => {
    expect(goleadorDe(ev('gol', { tipo: 'propia' }), () => 'Ramos')).toBe('Ramos (p. p.)');
    expect(goleadorDe(ev('gol', { tipo: 'normal' }), () => 'Pérez')).toBe('Pérez');
  });
});
