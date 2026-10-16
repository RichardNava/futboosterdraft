/**
 * Errores de la API con su código HTTP y el formato común
 * `{ error: { codigo, mensaje, detalles } }` (contracts/http-api.md).
 */
export class ErrorApi extends Error {
  constructor(
    readonly estado: 400 | 401 | 403 | 404 | 409 | 422,
    readonly codigo: string,
    mensaje: string,
    readonly detalles: Record<string, unknown> = {},
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

export const errores = {
  validacion: (codigo: string, mensaje: string, detalles?: Record<string, unknown>) =>
    new ErrorApi(400, codigo, mensaje, detalles),
  sinSesion: () => new ErrorApi(401, 'SIN_SESION', 'Necesitas iniciar sesión o entrar como invitado'),
  prohibido: (codigo: string, mensaje: string) => new ErrorApi(403, codigo, mensaje),
  noEncontrado: (codigo: string, mensaje: string) => new ErrorApi(404, codigo, mensaje),
  conflicto: (codigo: string, mensaje: string, detalles?: Record<string, unknown>) =>
    new ErrorApi(409, codigo, mensaje, detalles),
  regla: (codigo: string, mensaje: string, detalles?: Record<string, unknown>) =>
    new ErrorApi(422, codigo, mensaje, detalles),
};

export function cuerpoError(codigo: string, mensaje: string, detalles: Record<string, unknown> = {}) {
  return { error: { codigo, mensaje, detalles } };
}
