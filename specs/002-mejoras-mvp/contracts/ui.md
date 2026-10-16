# Contrato de interfaz — spec 002

Reglas de presentación que comparten varias pantallas. Las pruebas de Playwright del
[quickstart](../quickstart.md) las comprueban. Los textos con tilde son los que se muestran en pantalla;
los identificadores del código van sin tilde.

## Carta de jugador (`CartaJugador`, FR-001 a FR-005)

| Zona | Contenido | Regla |
|------|-----------|-------|
| Cabecera | Silueta genérica (variante por demarcación), **media** y **nombre** | La media y el nombre son los textos más grandes de la carta. |
| Franja | Distintivos de las posiciones y demarcación | Justo debajo del nombre, con un color de relleno que destaque. |
| Pie | 6 stats (abreviatura y valor, rejilla de 2 × 3) y los specials | Los specials son botones. Al pasar el puntero o tocarlos, se abre su descripción (`popover`). |
| Acabado | Superclase (plata), Épico (violeta), Legendario (oro con brillo), GOAT (holográfico) | Se distingue sin leer el texto. El brillo se detiene con `prefers-reduced-motion`. |

- **Variante compacta**: media, nombre, posiciones y nivel por el color del marco. Al tocarla se abre la carta completa.
- **Tamaños de comprobación**: 1280 px y 360 px de ancho, sin desbordamiento interno (SC-002).

## Botón de avanzar (`BotonAvanzar`, FR-011)

| Situación | Etiqueta | Efecto |
|-----------|----------|--------|
| Fin del draft | «Preparar equipo» | Ir a la alineación |
| Preparación del partido | «Comenzar partido» (o «Ver partido» si el rival es humano) | `POST /api/partidos/:id/abrir` |
| Descanso, antes de la prórroga | «Seguir» | `partido.seguir` |
| Final del partido | «Siguiente» | Ir al torneo |
| Fin de jornada (un solo humano) | «Siguiente jornada» | `POST /api/partidas/:id/siguiente-jornada` |
| Fin de jornada (varios humanos, faltan partidos) | Texto «Esperando a que se jueguen los demás partidos (vence …)», sin botón | — |
| Fin del torneo | «Volver al menú» | Ir al inicio |

El botón se desactiva al pulsarlo hasta recibir respuesta, y cada pulsación lleva su `requestId` (FR-016).

## Draft

- Tras elegir, aparece «Esperando a: Ana, Luis» con los `pendientes` de `draft.progreso`.
- Animación de apertura (`animacion: true`): sobre que tiembla y se rasga, reparto boca abajo, volteo y efecto especial para Legendario y GOAT.
  - Botón «Saltar»; un toque en cualquier punto también la salta.
  - Dura como máximo 6 s.
  - Con `prefers-reduced-motion`, un fundido.

## Barra de navegación (`Marco`, FR-017 a FR-020)

- **Enlaces**: Inicio · Mis partidas · Nueva partida · Cuenta (o «Iniciar sesión») · interruptor de sonido (🔊/🔇).
- **Partido 2D**: solo iconos, en una franja superior de 40 px como máximo.
- **Modal de abandono**: solo en el draft con otros humanos activos.
  - Título «¿Abandonar la partida?».
  - Texto «Si sales ahora, abandonarás la partida y un NPC ocupará tu plaza».
  - Botones «Seguir en el draft» y «Abandonar».
- **Navegación sin modal** en una partida de un humano: envía `partida.pausar` antes de salir.

## Partido 2D

- **Velocidades**: x2, x4, x8. Por defecto x2.
- **«Finalizar partido»**: siempre visible. Muestra un indicador de progreso si la respuesta tarda más de 300 ms (FR-027).
- **Pausas anunciadas**:
  - «¡GOL!» durante 2 s;
  - descanso y antes de la prórroga, con «Seguir» (en directo) o «Continuar» (en una reproducción).
- **Reproducción de un partido entre humanos**: sin el panel de cambios; con «Finalizar partido» y velocidades.
- **Estadísticas al final**: pases intentados y completados, precisión de pase, centros y tiros (FR-024).

## Tácticas: colocación libre (FR-034)

- **Arrastrar y soltar**: cualquier titular de campo, a cualquier punto fuera de la zona de portería. El portero solo se mueve dentro de ella.
- **Mientras se arrastra**: se resalta la zona bajo el puntero con su código (p. ej. «SD»).
- **Al soltar**: se actualizan la posición efectiva, la penalización (badge «−10 %») y los stats.
- **Formación personalizada**: se indica «Formación personalizada (4-3-3 → 4-2-4)», con el reparto por líneas y la ofensividad (p. ej. «Ofensividad +2»).
- **Avisos de desequilibrio**: aparecen antes de confirmar, sin bloquear la confirmación.

## Dorsales (FR-036, FR-037)

- **Edición**: campo numérico de 1 a 99 en la plantilla.
- **Dorsal ocupado**: si el número lo lleva un compañero, aparece el aviso «El 2 lo lleva Pérez: se quedará sin dorsal», que se confirma con un clic.
- **Sin dorsal**: el jugador muestra el distintivo «Sin dorsal».

## Torneo: goleadores y asistentes (FR-039, FR-040)

- **Pestañas**: «Clasificación» o «Cuadro» · «Máximos goleadores» · «Máximos asistentes».
- **Columnas**: Pos · Jugador (dorsal y nombre) · Equipo · Goles o Asistencias · PJ.
- **Filas**: se muestran 10, con «Ver todos».
- **Partido propio pendiente de ver**: aparece como «Pendiente de ver», con los botones «Ver partido» y «Mostrar resultado». Debajo de la clasificación, la nota «No incluye 1 partido pendiente de ver».
