# Formas de monetización a tener en cuenta (spec 011)

**Fecha**: 2026-11-04 · **Estado**: referencia de diseño, no son requisitos. Cada una necesita su spec antes de
implementarse (ROADMAP, decisión 6).

Dos filtros para todas:

- **Principio VII**: nada de lo que se pague puede dar ventaja en el draft ni en el partido.
- **Derechos de imagen (Q1 = A)**: lo que se vende con dinero real no puede ser la imagen del jugador. Cuanto más lejos
  esté el producto de las cartas, menor el riesgo (ver [derechos-imagen.md](derechos-imagen.md)).

| # | Forma | Qué se vende | Riesgo de imagen | Esfuerzo | Notas para diseñar ya |
|---|---|---|---|---|---|
| 1 | **Más cosméticos** | Marcos y reversos de carta, fondos de perfil, diseños de equipación, celebraciones y animaciones de gol en la 2D, sonidos de estadio, estadio del partido 2D, insignias y títulos | Bajo (arte propio) | Bajo por pieza | El catálogo de cosméticos admite tipos nuevos (FR-022). Venta directa, nunca en sobres al azar (ver 8). |
| 2 | **Pase de temporada cosmético** | Recorrido de recompensas por jugar (cosméticos y fragmentos), con un carril gratuito y otro de pago | Bajo si las recompensas de pago son cosméticas | Medio | Necesita un registro de progreso por cuenta (partidos, victorias, retos) y temporadas con fecha. Buen motor de retención. |
| 3 | **Suscripción «Club»** | Comodidades: más plantillas y formaciones guardadas, estadísticas e historial avanzados, repeticiones guardadas, torneos privados persistentes, personalización del torneo, sin anuncios | Bajo-medio | Medio | Separar desde ya qué es «comodidad» de qué es «competitivo». La ventaja nunca puede estar en el draft. |
| 4 | **Ligas privadas para comunidades** | Ligas y torneos de temporada para peñas, streamers, empresas o bares, con su escudo y nombre | Bajo-medio | Medio | B2B o por organizador. Modelo de pago por liga o por temporada. |
| 5 | **Publicidad** | Anuncios con recompensa (ver un anuncio → fragmentos) y banners discretos fuera del partido | Medio: las redes publicitarias revisan el contenido y pueden rechazar un sitio con derechos dudosos | Bajo | Sin anuncios durante el draft y el partido. La suscripción quita los banners. |
| 6 | **Donaciones** | Ko-fi, Patreon o similares, con una insignia de «Socio fundador» | Bajo | Muy bajo | Lo más rápido de activar. Ingresos pequeños pero fieles. |
| 7 | **Merchandising de la marca propia** | Camisetas, pegatinas, posters con los escudos, sobres y el logo propios | Muy bajo (nunca con jugadores) | Medio (proveedor bajo demanda) | Los escudos y sobres de esta spec ya son esa marca. |
| 8 | ~~Sobres de cosméticos al azar~~ | — | — | — | **Evitar**: son *loot boxes*. Bélgica las prohíbe y España tramita su regulación. Venta directa siempre. |
| 9 | ~~Torneos con inscripción y premios en dinero~~ | — | — | — | **Evitar**: en España entra en la ley del juego (Ley 13/2011), que exige licencia. |

## Orden sugerido

1. Cosméticos de esta spec (escudos y sobres) y donaciones: ya, con poco esfuerzo.
2. Pase de temporada cosmético: el que más ingresos suele traer con el menor riesgo.
3. Suscripción «Club» y ligas privadas: cuando haya comunidad estable.
4. Publicidad: solo si el resto no basta, y con anuncios con recompensa antes que banners.

Si FIFPRO concede licencia, se puede volver a vender colecciones de cartas con dinero real, siempre en venta directa
de colecciones (no al azar) para no caer en el punto 8.
