/**
 * Celebraciones animadas por el juego (spec 012, FR-010): una nueva es un componente más aquí y su entrada en
 * `data/cosmeticos.json`. La pantalla del partido no cambia (SC-003).
 */
import type { ComponentType } from 'react';
import { Clasica } from './Clasica';
import { Estadio } from './Estadio';
import { Neon } from './Neon';
import { Pizarra } from './Pizarra';
import type { PropsJuego } from './tipos';

export const CELEBRACIONES_JUEGO: Record<string, ComponentType<PropsJuego>> = {
  'celebracion-clasica': Clasica,
  'celebracion-estadio': Estadio,
  'celebracion-neon': Neon,
  'celebracion-pizarra': Pizarra,
};

export const IDS_CELEBRACIONES_JUEGO: ReadonlySet<string> = new Set(Object.keys(CELEBRACIONES_JUEGO));
