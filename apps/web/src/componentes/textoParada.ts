/** Aviso de la parada de «control total» (spec 012, FR-022; contracts/ui.md): qué ha pasado y cuántos cambios quedan. */
export interface IncidenciaVista {
  jugadorId: number;
  motivo: 'lesion' | 'expulsion';
  minuto: string;
  tick: number;
}

/** Texto de una parada de «control total»: lances y cambios que quedan. */
export function textoParada(incidencias: readonly IncidenciaVista[], nombre: (id: number) => string, restantes: number): string {
  const lances = incidencias.map((i) => `${i.motivo === 'lesion' ? 'Lesión' : 'Expulsión'} de ${nombre(i.jugadorId)} (${i.minuto})`);
  const lista = lances.length > 1 ? `${lances.slice(0, -1).join(', ')} y ${lances.at(-1)!.replace(/^./, (c) => c.toLowerCase())}` : (lances[0] ?? '');
  const cambios = restantes === 0 ? 'No te quedan cambios.' : `Te ${restantes === 1 ? 'queda 1 cambio' : `quedan ${restantes} cambios`}.`;
  return `${lista}. ${cambios}`;
}
