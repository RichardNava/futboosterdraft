import { describe, expect, it } from 'vitest';
import { PERMISOS, puede, rolEfectivo, ROLES, type Permiso, type Rol } from '../../src/roles/index';

// Copia literal de la matriz de FR-041: invitado, jugador, betatester y administrador.
const ESPERADA: Record<Permiso, readonly [boolean, boolean, boolean, boolean]> = {
  jugar_partidas: [true, true, true, true],
  coleccion_tienda_perfil: [false, true, true, true],
  entrar_panel: [false, false, false, true],
  cerrar_partida: [false, false, false, true],
  suspender_cuentas: [false, false, false, true],
  cambiar_ajustes: [false, false, false, true],
  premium_cortesia: [false, false, false, true],
  entregar_fragmentos: [false, false, false, true],
  asignar_roles: [false, false, false, true],
  consultar_registro: [false, false, false, true],
};
const COLUMNAS: readonly Rol[] = ['invitado', 'jugador', 'betatester', 'administrador'];

describe('roles (FR-040, FR-041)', () => {
  it('la matriz tiene los cuatro roles y los diez permisos', () => {
    expect([...ROLES].sort()).toEqual([...COLUMNAS].sort());
    expect([...PERMISOS].sort()).toEqual(Object.keys(ESPERADA).sort());
  });

  for (const permiso of Object.keys(ESPERADA) as Permiso[]) {
    COLUMNAS.forEach((rol, i) => {
      it(`${rol} ${ESPERADA[permiso][i] ? 'puede' : 'no puede'}: ${permiso}`, () => {
        expect(puede(rol, permiso)).toBe(ESPERADA[permiso][i]);
      });
    });
  }

  it('un invitado actúa como invitado sea cual sea la columna rol', () => {
    expect(rolEfectivo(true, 'jugador')).toBe('invitado');
    expect(rolEfectivo(true, 'administrador')).toBe('invitado');
  });

  it('una cuenta registrada actúa con su rol', () => {
    expect(rolEfectivo(false, 'jugador')).toBe('jugador');
    expect(rolEfectivo(false, 'betatester')).toBe('betatester');
    expect(rolEfectivo(false, 'administrador')).toBe('administrador');
  });
});
