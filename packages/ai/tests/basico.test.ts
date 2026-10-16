import { describe, expect, it } from 'vitest';
import { elegirCartaBasico } from '../src/basico';

describe('NPC básico', () => {
  it('elige la carta de mayor media', () => {
    expect(elegirCartaBasico([1, 2, 3], { 1: 70, 2: 85, 3: 80 })).toBe(2);
  });
  it('con empate elige la primera del sobre', () => {
    expect(elegirCartaBasico([5, 6, 7], { 5: 80, 6: 80, 7: 75 })).toBe(5);
  });
});
