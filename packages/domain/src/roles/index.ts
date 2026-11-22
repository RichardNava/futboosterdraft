/**
 * Roles y permisos (spec 017, FR-040, FR-041; research R16): la única matriz. Decide siempre el servidor; la web solo la
 * usa para no enseñar lo que no se puede hacer.
 */
export const ROLES = ['invitado', 'jugador', 'betatester', 'administrador'] as const;
export type Rol = (typeof ROLES)[number];

/** Roles que se guardan en la cuenta: «invitado» se deriva de `es_invitado`. */
export const ROLES_ASIGNABLES = ['jugador', 'betatester', 'administrador'] as const;
export type RolAsignable = (typeof ROLES_ASIGNABLES)[number];

const TODOS: readonly Rol[] = ROLES;
const REGISTRADOS: readonly Rol[] = ['jugador', 'betatester', 'administrador'];
const ADMINISTRADOR: readonly Rol[] = ['administrador'];

/** FR-041: quién tiene cada permiso. */
export const MATRIZ_PERMISOS = {
  jugar_partidas: TODOS,
  coleccion_tienda_perfil: REGISTRADOS,
  entrar_panel: ADMINISTRADOR,
  cerrar_partida: ADMINISTRADOR,
  suspender_cuentas: ADMINISTRADOR,
  cambiar_ajustes: ADMINISTRADOR,
  premium_cortesia: ADMINISTRADOR,
  entregar_fragmentos: ADMINISTRADOR,
  asignar_roles: ADMINISTRADOR,
  consultar_registro: ADMINISTRADOR,
} as const satisfies Record<string, readonly Rol[]>;

export type Permiso = keyof typeof MATRIZ_PERMISOS;
export const PERMISOS = Object.keys(MATRIZ_PERMISOS) as Permiso[];

/** El rol tiene el permiso. */
export function puede(rol: Rol, permiso: Permiso): boolean {
  return (MATRIZ_PERMISOS[permiso] as readonly Rol[]).includes(rol);
}

/** Rol con el que actúa una cuenta (FR-040). */
export function rolEfectivo(esInvitado: boolean, rol: RolAsignable): Rol {
  return esInvitado ? 'invitado' : rol;
}

/** Tope de fragmentos por entrega a un betatester (FR-050a). */
export const ENTREGA_MAXIMA_FRAGMENTOS = 10_000;
