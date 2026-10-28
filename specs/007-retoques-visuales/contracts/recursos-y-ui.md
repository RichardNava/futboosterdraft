# Contrato: recursos estáticos, API de sonido y presentación

La spec 007 no expone interfaces de red nuevas. Este contrato fija lo que comparten los recursos de `apps/web/public/` y
el código que los usa. Las tareas y las pruebas se apoyan en él.

## 1. Recursos estáticos

| Ruta pública | Formato | Contenido | Límite |
|--------------|---------|-----------|--------|
| `/marca/logo.svg` | SVG con WebP incrustado (256 px), fondo transparente | Logo oficial y favicon | ≤ 40 KB |
| `/cartas/marcos/superclase.svg` | SVG `viewBox="0 0 600 900"`, WebP incrustado + `clipPath` | Marco Superclase | ≤ 150 KB |
| `/cartas/marcos/epico.svg` | ídem | Marco Épica | ≤ 150 KB |
| `/cartas/marcos/legendario.svg` | ídem | Marco Legendaria | ≤ 150 KB |
| `/cartas/marcos/goat.svg` | ídem | Marco GOAT | ≤ 150 KB |
| `/cartas/sobre.svg` | SVG con WebP incrustado (600 px de ancho), fondo transparente | Sobre oficial | ≤ 150 KB |
| `/fondos/background_6.webp` … `background_11.webp` | WebP 1599 × 900 | Fondos de página | ≤ 150 KB cada uno |
| `/sonidos/<efecto>.mp3` | MP3 mono 22,05 kHz, 48–64 kbps | Ver §2 | ≤ 300 KB en total |
| `/sonidos/LICENCIA` | Texto | Fichero, momento, autor, URL de origen, licencia CC0 1.0 y cambios de cada sonido | — |

Se eliminan: `/favicon.svg`, `/sonidos/reparto.wav`, `/sonidos/volteo.wav` y `/sonidos/revelacion.wav`.

Invariantes:
- Ningún fichero de la aplicación ni de las pruebas referencia `temp/` (FR-021).
- Los SVG no cargan recursos externos: toda imagen va como `data:` URI.
- El nombre del marco es el `Nivel` en minúsculas (`GOAT` → `goat`), igual que la clase `nivel-<nivel>` de la carta.

## 2. API del módulo de sonido (`apps/web/src/sonido/sonido.ts`)

```ts
export type Efecto =
  | 'apertura' | 'reparto' | 'volteo' | 'revelacion'
  | 'entradaDuelo' | 'choqueDuelo' | 'ruletaForma'
  | 'aplausos' | 'trompetas';

export const FACTOR_VOLUMEN = 0.8;
export const GANANCIA: Record<Efecto, number>; // = BASE[efecto] * FACTOR_VOLUMEN

/** Reproduce el efecto si el sonido está activado; devuelve una función que lo detiene (no hace nada si no sonaba). */
export function reproducir(efecto: Efecto): () => void;

// Sin cambios: CLAVE_SONIDO, sonidoActivado, cambiarSonido, useSonido, prepararDesbloqueo.
```

Comportamiento:
- El fichero es `/sonidos/${efecto}.mp3`. Se carga la primera vez que se usa y se guarda en memoria.
- No suena nada si está silenciado, si no hay `AudioContext` o si el contexto no está en `running`. Nunca lanza errores.
- Ya no hay efectos sintetizados.

## 3. Presentación

### Carta (`.carta`, `apps/web/src/estilos/cartas.css`)

Carta completa:

| Propiedad | Valor |
|-----------|-------|
| `aspect-ratio` | `2 / 3`, fija: la carta ya no crece |
| Fondo | `var(--carta-marco-img)` a tamaño completo; la variable la define la clase `nivel-<nivel>` |
| Foto de demarcación | dentro del área interior, `opacity` ≈ 0,35 |
| Texto | claro en los cuatro niveles, contraste ≥ 4,5 : 1 |

Debe seguir mostrando todo lo que muestra hoy:
- retrato o silueta, media, bandera y escudo;
- nombre destacado con `NombreRecortado`;
- posiciones y los seis stats;
- virtudes y defectos;
- dorsal y botón «i».

Otras reglas:
- **Carta compacta**: el mismo marco como fondo (`cover`) con velo oscuro y borde `--carta-marco` del color del nivel.
- **Carta seleccionada**: contorno lima exterior (`outline`), que no tapa el marco.
- **Marco que no carga**: se ve el fondo de reserva `--carta-superficie` y la carta se lee igual.

### Sobre (`SobreArte`)

```tsx
<SobreArte className?: string rasgado?: boolean />
// → <img src="/cartas/sobre.svg" alt="" class="sobre-arte [rasgado] {className}">
```

Reglas:
- `aria-hidden` en efecto, porque es decorativo (`alt=""`).
- `.rasgado` aplica `clip-path` con el borde superior irregular.
- `--proporcion-sobre` es igual a la proporción del SVG.
- La animación de `.sobre-cerrado` no cambia.

### Logo (`Escudo`)

```tsx
<Escudo className?: string tamano?: number />  // → <img src="/marca/logo.svg" alt="" width={tamano} height={tamano}>
```

`index.html` incluye `<link rel="icon" type="image/svg+xml" href="/marca/logo.svg">`.

### Duelos: ruleta del estado de forma (`componentes/secuenciaDuelos.ts`)

```ts
export const DURACION_RULETA_MS = 800; // a ×1
export function ruletaEn(i: Instante, velocidad: Velocidad): { girando: boolean; progreso: number };
export function valorRuleta(final: number, progreso: number, semilla: number): number; // progreso 1 → final
```

Reglas:
- Mientras gira, el desglose muestra `valorRuleta` en «Estado de forma», y la puntuación total y el realce del ganador
  esperan.
- Al empezar el giro suena `ruletaForma`. Se detiene al acabar el giro, al saltar, al cambiar de duelo o al desmontar.
- Con movimiento reducido o tras «Saltar al resultado», se muestra el valor final y no suena nada.

### Torneo (`pantallas/Torneo.tsx`)

| `vista.modo` | Pestañas |
|--------------|----------|
| `'liga'` · `'mixto'` | Clasificación, [Cuadro], Máximos goleadores, Máximos asistentes, Calendario |
| `'playoff'` | Cuadro, Máximos goleadores, Máximos asistentes, Calendario |
| `'duelos'` | Clasificación, [Cuadro], Calendario |

### Pantallas finales

| Pantalla | Efecto | Cuándo suena |
|----------|--------|--------------|
| `PantallaCampeon` | `aplausos` | Una vez por montaje |
| `PantallaDerrota` | `trompetas` | Una vez por montaje |
