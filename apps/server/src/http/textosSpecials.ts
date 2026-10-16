/**
 * Nombre y descripción en español de cada special, tal como se muestran en la interfaz.
 * Los textos proceden de la descripción original de la especificación.
 */
import type { Special } from '@fbd/domain';

export const TEXTOS_SPECIALS: Readonly<Record<Special, { nombre: string; descripcion: string }>> = {
  Incansable: {
    nombre: 'Incansable',
    descripcion: 'Gran capacidad aeróbica: su nivel se degrada menos por el cansancio y puede presionar y sumarse al ataque constantemente.',
  },
  Motivador: { nombre: 'Motivador', descripcion: 'La degradación por cansancio de sus compañeros es más lenta mientras está en el campo.' },
  LanzadorFaltas: { nombre: 'Lanzador de faltas', descripcion: 'Aumenta el disparo y la probabilidad de gol lanzando faltas.' },
  LanzadorPenalties: { nombre: 'Lanzador de penalties', descripcion: 'Aumenta el disparo y la probabilidad de gol lanzando penaltis.' },
  Aura: { nombre: 'Aura', descripcion: 'Aumenta la probabilidad de acciones exitosas mientras está en el campo.' },
  Capitania: { nombre: 'Capitanía', descripcion: 'Aumenta en +1 la media de todos los jugadores del campo mientras está jugando.' },
  Filigranas: { nombre: 'Filigranas', descripcion: 'Repite la tirada (y se queda con la mejor) cuando intenta regatear a un defensor.' },
  FortalezaMental: {
    nombre: 'Fortaleza mental',
    descripcion: 'Aumenta en +2 la media de todos los jugadores del campo cuando su equipo va por detrás en el marcador.',
  },
  Intimidante: { nombre: 'Intimidante', descripcion: 'Reduce en −1 los atributos enfrentados del rival más cercano.' },
  Elegante: { nombre: 'Elegante', descripcion: 'Mayor probabilidad de salir de la presión y de las acciones defensivas rivales.' },
  Presionador: { nombre: 'Presionador', descripcion: 'Ejerce más presión sin balón, aumentando sus labores defensivas.' },
  RecuperadorTrasPerdida: {
    nombre: 'Recuperador tras pérdida',
    descripcion: 'Cuando pierde el balón, presiona con mucha intensidad para recuperarlo.',
  },
  Carismatico: { nombre: 'Carismático', descripcion: 'Sus compañeros le buscan con más frecuencia para asociarse con él.' },
  Potente: { nombre: 'Potente', descripcion: 'Mayor probabilidad de salir airoso de duelos y choques con rivales.' },
  Robusto: { nombre: 'Robusto', descripcion: 'Menor probabilidad de lesionarse, y lesiones menos graves.' },
  Parapenalties: { nombre: 'Parapenalties', descripcion: 'Aumenta considerablemente su porcentaje de paradas en penaltis.' },
  OneToOne: { nombre: 'One-to-One', descripcion: 'Especialista en el uno contra uno, sobre todo ante atacantes con mucho regate.' },
  Santo: {
    nombre: 'Santo',
    descripcion:
      'Providencial en los momentos clave: desde el minuto 80, en la prórroga y en eliminatorias defendiendo un resultado, repite la tirada ante los disparos rivales.',
  },
  Ordenabarreras: { nombre: 'Ordenabarreras', descripcion: 'Aumenta la probabilidad de parada en disparos a balón parado.' },
  JugadorDeCampo: { nombre: 'Jugador de campo', descripcion: 'Sale con el balón jugado y tiene un regate casi infalible en su propia área.' },
  Infranqueable: {
    nombre: 'Infranqueable',
    descripcion: 'Aumenta en +2 el tackling y el marcaje frente a jugadores con regate de 95 o más.',
  },
  Jerarquia: { nombre: 'Jerarquía', descripcion: 'Aumenta en +1 la media defensiva del equipo.' },
  Volador: { nombre: 'Volador', descripcion: 'Aumenta mucho su probabilidad de despeje en balones parados.' },
  Libero: { nombre: 'Líbero', descripcion: 'Aumenta en +2 la media del centro del campo.' },
  MuroDefensivo: { nombre: 'Muro defensivo', descripcion: 'En las intercepciones dentro del área, repite la tirada y se queda con la mejor.' },
  Llegador: { nombre: 'Llegador', descripcion: 'Se incorpora al ataque con frecuencia: más probabilidad de gol cerca del área.' },
  BoxToBox: { nombre: 'Box-to-Box', descripcion: 'Abarca mucho campo: otorga +1 a la media de la defensa y del ataque.' },
  PrimerToque: { nombre: 'Primer toque', descripcion: 'Distribuye el balón al primer toque con menos probabilidad de pérdida.' },
  Todocampista: {
    nombre: 'Todocampista',
    descripcion: 'Cubre más zonas del campo: no tiene penalización por jugar fuera de posición (salvo en la portería).',
  },
  JugadorEntreLineas: { nombre: 'Jugador entre líneas', descripcion: 'Más probabilidad de éxito cuando juega entre líneas.' },
  Matador: { nombre: 'Matador', descripcion: 'Más probabilidad de gol cuando es el último jugador delante del portero.' },
  Rematador: { nombre: 'Rematador', descripcion: 'Más probabilidad de gol cuando le centran un balón.' },
  Cabeceador: { nombre: 'Cabeceador', descripcion: 'Más probabilidad de gol en remates de cabeza.' },
  Desbordante: { nombre: 'Desbordante', descripcion: 'Más probabilidad de éxito en los regates por las bandas.' },
  GuanteEnElPie: { nombre: 'Guante en el pie', descripcion: 'Repite la tirada (y se queda con la mejor) cuando centra balones al área.' },
};
