import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Rutas } from './app/Rutas';
import './estilos/tokens.css';
import './estilos/fuentes.css';
import './estilos/componentes.css';
import './estilos/cartas.css';
import './estilos/base.css';

const raiz = document.getElementById('root');
if (!raiz) throw new Error('Falta el elemento #root');

createRoot(raiz).render(
  <StrictMode>
    <Rutas />
  </StrictMode>,
);
