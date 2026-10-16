import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Rutas } from './app/Rutas';
import './estilos/base.css';

const raiz = document.getElementById('root');
if (!raiz) throw new Error('Falta el elemento #root');

createRoot(raiz).render(
  <StrictMode>
    <Rutas />
  </StrictMode>,
);
