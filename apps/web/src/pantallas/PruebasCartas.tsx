import type { Jugador } from '@fbd/domain';
import { useEffect, useState } from 'react';
import { api } from '../api/cliente';
import { CartaJugador } from '../componentes/CartaJugador';

/**
 * Solo en desarrollo (`/_pruebas/cartas`): todas las cartas de la colección Core, para la prueba de
 * desbordamiento de SC-002 y la revisión visual de los acabados por nivel.
 */
export function PruebasCartas() {
  const [jugadores, setJugadores] = useState<Jugador[] | null>(null);
  useEffect(() => {
    void api<Jugador[]>('/api/catalogo/jugadores').then(setJugadores);
  }, []);
  if (!jugadores) return <p className="cargando">Cargando…</p>;
  return (
    <main className="pantalla">
      <h1>Cartas de la colección Core ({jugadores.length})</h1>
      <div className="rejilla-cartas">
        {jugadores.map((j) => (
          <CartaJugador key={j.id} jugador={{ ...j, stats: j.stats as unknown as Record<string, number> }} />
        ))}
      </div>
    </main>
  );
}
