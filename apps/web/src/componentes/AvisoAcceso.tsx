/**
 * Aviso de error al iniciar sesión o crear la cuenta (spec 013, US5; FR-026 a FR-028; research R10): distinto según la
 * causa y sin decir si falla el email o la contraseña.
 */
import { ErrorApi } from '../api/cliente';

export function textoAvisoAcceso(error: unknown): { texto: string; credenciales: boolean } {
  if (error instanceof ErrorApi && (error.estado === 401 || error.codigo === 'INVALID_EMAIL_OR_PASSWORD')) {
    return { texto: 'El email o la contraseña no son correctos.', credenciales: true };
  }
  if (error instanceof ErrorApi && error.estado === 429) {
    return { texto: 'Demasiados intentos. Espera un minuto y vuelve a probar.', credenciales: false };
  }
  if (!(error instanceof ErrorApi) || error.estado >= 500) {
    return { texto: 'No hay conexión con el servidor. Inténtalo en unos segundos.', credenciales: false };
  }
  return { texto: error.message, credenciales: false };
}

export function AvisoAcceso({ error, onRecuperar }: { error: unknown; onRecuperar?: () => void }) {
  const { texto, credenciales } = textoAvisoAcceso(error);
  return (
    <div className="aviso-acceso" role="alert">
      <p>{texto}</p>
      {credenciales && onRecuperar && (
        <button type="button" className="texto" onClick={onRecuperar}>
          ¿Has olvidado la contraseña?
        </button>
      )}
    </div>
  );
}
