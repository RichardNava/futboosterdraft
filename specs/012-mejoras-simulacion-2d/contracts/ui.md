# Contrato de interfaz (spec 012)

## `CapaCelebracion` (nuevo, `apps/web/src/componentes/celebraciones/`)

```ts
interface Props {
  celebracion: { id: string; datos: DatosCelebracion };
  equipo: { nombre: string; escudo?: string | null; color: string };
  goleador: string;
  velocidad: number;        // acorta la duración y, en secuencias, playbackRate
  onFin: () => void;        // al acabar o al hacer clic
}
```

- Ocupa `.partido-2d-zona` (posición absoluta, encima del lienzo, `aria-live="polite"` con «Gol de …»).
- Registro `CELEBRACIONES_JUEGO: Record<string, ComponentType<PropsJuego>>`; id desconocido → la clásica.
- Secuencia: `<video muted playsinline autoplay>` con `<source>` WebM y MOV; si falla, la clásica.
- Un gol nuevo la reemplaza (`key` del gol). Sin celebración en la tanda.
- `prefers-reduced-motion`: solo opacidad.

## Partido 2D

- `.franja-2d`: altura fija; una sola fila desde 1024 px; avisos de malestar en el carril lateral.
- Selector «Incidencias: Automático / Control total» (segmentado) en el carril lateral, solo con `gestionDisponible`.
- Parada por incidencia: el reloj se detiene en el tick, aviso («Lesión de Pérez (34'). Te quedan 2 cambios») y se
  abre «Gestionar equipo». Al confirmar o cerrar → `partido.seguir`.

## Simulación rápida

- Con `motivo: 'incidencia'`, el resumen se corta en el minuto del lance con el mismo aviso; botón principal
  «Gestionar equipo»; secundario «Seguir».

## Gestionar equipo

- Distribución de Formación (`useDistribucion()`, misma clave de `localStorage`).
- Solo titulares en el campo y banquillo convocado; pestañas Alineación, Táctica, Lanzadores; sin Personalización.
- Con incidencia: el lesionado aparece en su casilla marcado como lesionado y se puede arrastrar un suplente encima.

## Preparar equipo → Formación

- Selector de modo de incidencias (mismo componente) en la pestaña Táctica.
- Bajas pendientes marcadas en el campo y en el banco.

## Torneo y Plantillas

- `BotonAvanzar` / `BarraPrincipal`: `motivoDesactivado` = «Sustituye a Pérez (lesionado) para continuar» o «… y N
  más …»; con `sinSuplentes`, activo y nota «Jugarás con 10».
- `BandejaAvisos`: arriba los `avisosEquipo` (intervención con icono `advertencia` y enlace a Formación; informativos
  con `informacion`), luego los guardados.
- Plantillas: cada pestaña con `Chapa` (escudo o color) + nombre del equipo.

## Mi perfil

- `SelectorCelebracion` junto a `SelectorEscudo`, con vista previa (la propia `CapaCelebracion` a escala).

## Tienda

- Bloque «Celebraciones» con insignia «Próximamente» y sin botones de compra.

## Inicio

- Sin sesión: «Jugar» (principal) e «Iniciar sesión» (secundario, icono `perfil`) en la misma fila y altura.
- Formulario de alta: «Ya tengo cuenta» como botón secundario.
- Con sesión: «Cerrar sesión» secundario con icono.

## Sonidos

| Dónde | Efecto |
|-------|--------|
| 2D: `inicio_tramo` / `fin_tramo` (partes 1 y 3) / final | `pitidoInicio` / `pitidoDescanso` / `pitidoFinal` |
| 2D: `gol` | `golPropio` o `golRival` según el lado del espectador |
| 2D: `amarilla` / `roja` | `tarjetaAmarilla` / `tarjetaRoja` |
| Draft: confirmar | `confirmarEleccion` |
| Draft: ≤ 5 s sin elegir | `latido` (se corta al elegir o al acabar) |
| `BarraPrincipal` principal | `clicPrincipal` |
| Tienda: compra de sobre | `cajaRegistradora` |
