# Data Model — Fase 1: Retoques visuales

La spec no cambia el modelo de datos persistente: ni la base de datos, ni el catálogo, ni el protocolo. Sus «entidades»
son recursos estáticos del cliente y estados de presentación. Rutas, formatos y límites:
[contracts/recursos-y-ui.md](./contracts/recursos-y-ui.md).

## Marco de rareza

| Campo | Valor |
|-------|-------|
| Nivel | `Superclase` · `Epico` · `Legendario` · `GOAT` (el `Nivel` del dominio, sin cambios) |
| Fichero | `public/cartas/marcos/<nivel en minúsculas>.svg` |
| Proporción | 2 : 3 (`viewBox="0 0 600 900"`) |
| Contorno | `clipPath` poligonal achaflanado, común a los cuatro |
| Color de borde (compacta) | `--carta-marco`, ver research R3 |

Relaciones: cada `CartaResumen` toma el marco de su `nivel` (clase `nivel-<nivel>`). Las cartas de colecciones compradas
usan el mismo marco (FR-006).

Reglas:
- El marco no se deforma (FR-006b).
- Si el fichero no carga, la carta conserva el color de fondo de reserva `--carta-superficie` de su nivel y el borde
  `--carta-marco` (Edge Cases: recurso que no carga).

## Sobre

| Campo | Valor |
|-------|-------|
| Fichero | `public/cartas/sobre.svg` (uno para todo el juego) |
| Estados | `cerrado` · `rasgado` (clase CSS `rasgado`) · en apertura: `brilla → tiembla → rasga` (sin cambios) |
| Proporción | la del recorte (`--proporcion-sobre`, ≈ 0,60) |

## Logo

| Campo | Valor |
|-------|-------|
| Fichero | `public/marca/logo.svg` (barra, menú, dorso de carta, campo, resumen y favicon) |
| Fondo | transparente |

## Fondo de página

| Campo | Valor |
|-------|-------|
| Fichero | `public/fondos/background_<n>.webp`, `n ∈ 1..11` |
| Elección | al azar por vista (`Marco.tsx`, sin cambios salvo `FONDOS_PANTALLA = 11`) |

## Efecto de sonido

| Efecto | Fichero | Disparo | Una vez / repetible |
|--------|---------|---------|---------------------|
| `apertura` | `apertura.mp3` | Inicio de la apertura del sobre | una por apertura |
| `reparto` | `reparto.mp3` | Sale cada carta | por carta |
| `volteo` | `volteo.mp3` | Gira cada carta | por carta |
| `revelacion` | `revelacion.mp3` | Gira una Legendaria o GOAT | por carta especial |
| `entradaDuelo` | `entradaDuelo.mp3` | Fase `entrada` de cada duelo | por duelo |
| `choqueDuelo` | `choqueDuelo.mp3` | Fase `choque` de cada duelo | por duelo |
| `ruletaForma` | `ruletaForma.mp3` | Inicio de la ruleta (fase `resultado`, con estado de forma) | por duelo; se detiene al saltar |
| `aplausos` | `aplausos.mp3` | Montaje de la pantalla de campeón | una por visita |
| `trompetas` | `trompetas.mp3` | Montaje de la pantalla de derrota | una por visita |

Atributos:
- `GANANCIA[efecto] = BASE[efecto] × FACTOR_VOLUMEN`, con `FACTOR_VOLUMEN = 0.8`.

Reglas:
- No suena nada con el sonido silenciado, sin audio o con el contexto bloqueado (FR-014).
- Con movimiento reducido no suenan `entradaDuelo`, `choqueDuelo` ni `ruletaForma` (comportamiento actual de los duelos,
  ampliado a la ruleta).

## Ruleta del estado de forma (estado de presentación)

Estados para cada duelo con `estadoForma` activo:

```text
(fases entrada/choque/recuento) ──► girando ──(DURACION_RULETA_MS / velocidad)──► detenida
                                       │
                                       └──(saltar / reducido)──► detenida (sin sonido)
```

| Estado | Valor de forma mostrado | Total y ganador | Sonido |
|--------|-------------------------|-----------------|--------|
| girando | `valorRuleta(final, progreso, semilla)` | ocultos (total sin la forma, sin realce) | `ruletaForma` sonando |
| detenida | `final` (el `forma` del resultado) | visibles | detenido |

Validación: `valorRuleta(final, 1, s) === final` para cualquier semilla. Durante el giro, el valor queda dentro del rango
del estado de forma.
