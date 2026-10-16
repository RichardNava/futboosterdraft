import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { useSesion } from '../estado/sesion';
import { Alineacion } from '../pantallas/Alineacion';
import { CrearPartida } from '../pantallas/CrearPartida';
import { Draft } from '../pantallas/Draft';
import { Inicio } from '../pantallas/Inicio';
import { Partido } from '../pantallas/Partido';
import { Plantillas } from '../pantallas/Plantillas';
import { Sala } from '../pantallas/Sala';
import { Torneo } from '../pantallas/Torneo';

function ConSesion({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useSesion();
  if (cargando) return <p className="cargando">Cargando…</p>;
  if (!usuario) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function Rutas() {
  const cargar = useSesion((s) => s.cargar);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/partidas/nueva" element={<ConSesion><CrearPartida /></ConSesion>} />
        <Route path="/partidas/:partidaId/sala" element={<ConSesion><Sala /></ConSesion>} />
        <Route path="/partidas/:partidaId/draft" element={<ConSesion><Draft /></ConSesion>} />
        <Route path="/partidas/:partidaId/plantillas" element={<ConSesion><Plantillas /></ConSesion>} />
        <Route path="/partidas/:partidaId/alineacion" element={<ConSesion><Alineacion /></ConSesion>} />
        <Route path="/partidas/:partidaId/partido/:partidoId" element={<ConSesion><Partido /></ConSesion>} />
        <Route path="/partidas/:partidaId/torneo" element={<ConSesion><Torneo /></ConSesion>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
