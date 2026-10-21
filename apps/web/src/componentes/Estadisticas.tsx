import { NombreRecortado } from './NombreRecortado';
type EstadisticasEquipo = Record<string, number>;

const FILAS: [string, string, string?][] = [
  ['posesion', 'Posesión', '%'],
  ['pases', 'Pases intentados'],
  ['pasesCompletados', 'Pases completados'],
  ['precisionPase', 'Precisión de pase', '%'],
  ['centros', 'Centros'],
  ['tiros', 'Tiros'],
  ['tirosPuerta', 'Tiros a puerta'],
  ['corners', 'Córners'],
  ['faltas', 'Faltas'],
  ['amarillas', 'Amarillas'],
  ['rojas', 'Rojas'],
  ['fuerasDeJuego', 'Fueras de juego'],
];

/** Estadísticas del partido (001/FR-047; con pases, precisión de pase y centros, FR-024). */
export function Estadisticas({ datos, nombres }: { datos: { local: EstadisticasEquipo; visitante: EstadisticasEquipo }; nombres: { local: string; visitante: string } }) {
  return (
    <div className="tabla-desplazable" tabIndex={0} aria-label="Estadísticas del partido (se desplaza en horizontal)">
    <table className="estadisticas">
      <thead>
        <tr>
          <th scope="col">
            <NombreRecortado texto={nombres.local} />
          </th>
          <th scope="col">
            <span className="solo-lectores">Estadística</span>
          </th>
          <th scope="col">
            <NombreRecortado texto={nombres.visitante} />
          </th>
        </tr>
      </thead>
      <tbody>
        {FILAS.map(([clave, texto, sufijo]) => (
          <tr key={clave}>
            <td>
              {datos.local[clave] ?? 0}
              {sufijo}
            </td>
            <th scope="row">{texto}</th>
            <td>
              {datos.visitante[clave] ?? 0}
              {sufijo}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
