import type { Jugador, Nivel } from '@fbd/domain';
import { useEffect, useState } from 'react';
import { api } from '../api/cliente';
import { CartaJugador } from '../componentes/CartaJugador';

const NIVELES: Nivel[] = ['Superclase', 'Crack', 'Legendario', 'GOAT'];

/**
 * Solo en desarrollo (`/_pruebas/cartas`): todas las cartas de la colección Core, para la prueba de
 * desbordamiento de 002/SC-002 y la revisión visual de los acabados por nivel. Arriba, una muestra de los cuatro
 * niveles, un GOAT con 4 virtudes y 2 defectos y un Superclase sin rasgos, en tamaño completo y compacto (spec 003,
 * T079; SC-012; spec 005, FR-022 y SC-006): las cartas miden lo mismo tengan los rasgos que tengan.
 */
export function PruebasCartas() {
  const [jugadores, setJugadores] = useState<Jugador[] | null>(null);
  useEffect(() => {
    void api<Jugador[]>('/api/catalogo/jugadores').then(setJugadores);
  }, []);
  if (!jugadores) return <p className="cargando">Cargando…</p>;
  const resumen = (j: Jugador) => ({ ...j, nombreCarta: j.nombre_carta, imagenBg: j.imagen_bg, stats: j.stats as unknown as Record<string, number> });
  // Spec 006 (SC-009): una carta de cada demarcación y una GOAT con fondo propio en imagen (no SVG).
  const presentacion = (['POR', 'DEF', 'MED', 'DEL'] as const)
    .map((d) => jugadores.find((j) => j.demarcacion === d))
    .filter((j): j is Jugador => j !== undefined)
    .map(resumen);
  const goat = jugadores.find((j) => j.nivel === 'GOAT');
  if (goat) presentacion.push({ ...resumen(goat), imagenBg: '/cartas/propias/goat-prueba.png' });
  const muestra = [
    ...NIVELES.map((n) => jugadores.find((j) => j.nivel === n)),
    jugadores.find((j) => j.nivel === 'GOAT' && j.virtudes.length === 4 && j.defectos.length === 2),
    jugadores.find((j) => j.nivel === 'Superclase' && j.virtudes.length === 0 && j.defectos.length === 0),
  ].filter((j): j is Jugador => j !== undefined);
  return (
    <main className="pantalla">
      <h1>Cartas de la colección Core ({jugadores.length})</h1>
      <section aria-label="Muestra por nivel" className="muestra-cartas">
        <h2>Los cuatro niveles, un GOAT con 4 virtudes y 2 defectos y un Superclase sin rasgos</h2>
        <div className="rejilla-cartas muestra">
          {muestra.map((j, i) => (
            <CartaJugador key={`m${i}`} jugador={resumen(j)} />
          ))}
        </div>
        <div className="lista-compacta">
          {muestra.map((j, i) => (
            <CartaJugador key={`c${i}`} jugador={resumen(j)} compacta />
          ))}
        </div>
      </section>
      <section aria-label="Presentación" className="muestra-cartas">
        <h2>Una carta de cada demarcación y una GOAT con imagen de fondo propia</h2>
        <div className="rejilla-cartas muestra" data-prueba="presentacion">
          {presentacion.map((j, i) => (
            <CartaJugador key={`p${i}`} jugador={j} />
          ))}
        </div>
      </section>
      <h2>Todas</h2>
      <div className="rejilla-cartas">
        {jugadores.map((j) => (
          <CartaJugador key={j.id} jugador={resumen(j)} />
        ))}
      </div>
    </main>
  );
}
