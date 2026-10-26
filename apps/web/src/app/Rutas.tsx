import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { createBrowserRouter, Link, Navigate, RouterProvider } from 'react-router';
import { useSesion } from '../estado/sesion';
import { Alineacion } from '../pantallas/Alineacion';
import { Coleccion } from '../pantallas/Coleccion';
import { Tienda } from '../pantallas/Tienda';
import { EstadoVacio } from '../componentes/EstadoVacio';
import { CrearPartida } from '../pantallas/CrearPartida';
import { Draft } from '../pantallas/Draft';
import { Inicio } from '../pantallas/Inicio';
import { MisPartidas } from '../pantallas/MisPartidas';
import { Partido } from '../pantallas/Partido';
import { Plantillas } from '../pantallas/Plantillas';
import { ReproduccionPartido } from '../pantallas/ReproduccionPartido';
import { Sala } from '../pantallas/Sala';
import { Perfil } from '../pantallas/Perfil';
import { Torneo } from '../pantallas/Torneo';
import { Duelos } from '../pantallas/Duelos';
import { Marco } from './Marco';
import { PantallaCargando } from '../componentes/Esqueleto';

/** Pantallas de prueba: solo se incluyen en desarrollo. */
const PruebasCartas = import.meta.env.DEV ? lazy(() => import('../pantallas/PruebasCartas').then((m) => ({ default: m.PruebasCartas }))) : null;

function ConSesion({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useSesion();
  if (cargando) return <PantallaCargando forma="filas" />;
  if (!usuario) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const conSesion = (pantalla: ReactNode) => <ConSesion>{pantalla}</ConSesion>;

/**
 * Colección y tienda (spec 006, FR-034): sin sesión, al inicio con el acceso abierto; un invitado ve la invitación a
 * registrarse.
 */
function ConSesionRegistrada({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useSesion();
  if (cargando) return <PantallaCargando forma="filas" />;
  if (!usuario) return <Navigate to="/?acceso=entrar" replace />;
  if (usuario.tipo !== 'registrado') {
    return (
      <main className="pantalla">
        <EstadoVacio
          mensaje="La colección y la tienda son para usuarios registrados. Crea tu cuenta para conservar tus cartas y ganar fragmentos con tus victorias."
          accion={
            <Link className="boton boton-principal" to="/?acceso=registro">
              Crear cuenta
            </Link>
          }
        />
      </main>
    );
  }
  return <>{children}</>;
}

/**
 * Rutas de la aplicación: todas bajo el `Marco` con la barra de navegación (FR-017). Con `createBrowserRouter`
 * (router de datos), necesario para el `useBlocker` del modal de abandono (research R11).
 */
const router = createBrowserRouter([
  {
    element: <Marco />,
    children: [
      { path: '/', element: <Inicio /> },
      { path: '/cuenta', element: conSesion(<Inicio />) },
      { path: '/mis-partidas', element: conSesion(<MisPartidas />) },
      { path: '/perfil', element: conSesion(<Perfil />) },
      { path: '/coleccion', element: <ConSesionRegistrada><Coleccion /></ConSesionRegistrada> },
      { path: '/tienda', element: <ConSesionRegistrada><Tienda /></ConSesionRegistrada> },
      { path: '/partidas/nueva', element: conSesion(<CrearPartida />) },
      { path: '/partidas/:partidaId/sala', element: conSesion(<Sala />) },
      { path: '/partidas/:partidaId/draft', element: conSesion(<Draft />) },
      { path: '/partidas/:partidaId/plantillas', element: conSesion(<Plantillas />) },
      { path: '/partidas/:partidaId/alineacion', element: conSesion(<Alineacion />) },
      { path: '/partidas/:partidaId/partido/:partidoId', element: conSesion(<Partido />) },
      { path: '/partidas/:partidaId/torneo', element: conSesion(<Torneo />) },
      { path: '/partidas/:partidaId/reproduccion/:partidoId', element: conSesion(<ReproduccionPartido />) },
      { path: '/partidas/:partidaId/duelos/:partidoId', element: conSesion(<Duelos />) },
      ...(PruebasCartas
        ? [
            {
              path: '/_pruebas/cartas',
              element: (
                <Suspense fallback={<PantallaCargando forma="cartas" />}>
                  <PruebasCartas />
                </Suspense>
              ),
            },
          ]
        : []),
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export function Rutas() {
  const cargar = useSesion((s) => s.cargar);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  return <RouterProvider router={router} />;
}
