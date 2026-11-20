# Validación de la spec 007 (T052)

**Fecha**: 2026-11-20 · **Rama**: `main` (tras la spec 016) · Guía: [quickstart.md](../quickstart.md)

La batería se ejecuta sobre el código actual, que incluye todo lo que vino después de la 007 (specs 008 a 016).

## Pruebas automáticas (T052)

| Comando | Resultado |
|---|---|
| `pnpm typecheck` | ✅ sin errores |
| `pnpm lint` (incluye `lint:tokens`) | ✅ sin errores |
| `pnpm test` | ✅ 144 ficheros, 1.430 pruebas |
| `pnpm e2e` | ✅ 125 pruebas. En la pasada completa falló 1: `diseno/teclado.spec.ts` (ver abajo). Corregida, pasó 3 de 3 veces por separado |

### Corrección: contorno de foco en el draft

`diseno/teclado.spec.ts` fallaba a veces en el draft («button «Jerarquía»: esperado ≥ 2, recibido 1,885»). El fallo
dependía de las cartas del sobre, porque estas cambian la escala de la rejilla. Con una escala de 1,061, el contorno
de `max(2px, 3px / escala)` multiplicado por la escala da 2,99…, y el navegador lo redondea a 2 px de pantalla
(1,885 px de CSS). Ahora se parte de 3,1 px (`base.css`, `.draft .rejilla-cartas :focus-visible`).

## Criterios de éxito

| Criterio | Cómo se comprueba | Resultado |
|---|---|---|
| SC-001: el logo nuevo en todas las apariciones de la marca | e2e `diseno/menu.spec.ts` («la barra, el menú y el favicon usan el logo oficial») | ✅ |
| SC-002: las cuatro rarezas se distinguen y todos los datos siguen visibles | e2e `cartas.spec.ts` («la carta completa mide 2 : 3 y su fondo es el marco de su nivel»). Que se distingan «a simple vista», con personas | ✅ automático · ⏳ con personas |
| SC-003: fondos nuevos ≤ ~150 KB y la carga no se percibe más lenta | `background_6` a `background_11.webp` pesan entre 71 y 130 KB. La percepción de la carga, con personas | ✅ peso · ⏳ con personas |
| SC-004: −20 % de volumen y ningún efecto agudo o molesto | El −20 % es `FACTOR_VOLUMEN = 0.8` en el código de sonido (US2). La escucha de prueba se hace en la sesión con personas (INI-15) | ⏳ con personas |
| SC-004b: todos los sonidos ≤ 300 KB | Los ocho efectos en mp3 de la 007 (apertura, reparto, volteo, revelación, entrada, choque, aplausos y trompetas) suman 59 KB. La carpeta `public/sonidos/` pesa hoy 1,26 MB porque la 012 y la 013 añadieron el ambiente de público, los pitidos, las tarjetas y los sonidos del draft | ⚠️ se cumple en lo que es de la 007; el total de la carpeta lo superan specs posteriores |
| SC-005: los cuatro momentos nuevos suenan siempre con sonido y nunca en silencio | Unitarias de la ruleta (`secuenciaDuelos.test.ts`) y el diagnóstico de la fase 10 (T054 a T063) | ✅ |
| SC-006: sin tablas de goleadores en Duelos y con ellas en los demás modos | e2e `duelos.spec.ts` y `torneo.spec.ts` | ✅ |
| SC-007: sin directorio `temp/` | `test ! -d temp` (T050, T051) | ✅ |
| SC-008: el sobre nuevo en todas partes y la apertura con todas sus fases | e2e `apertura.spec.ts` y `diseno/ronda5.spec.ts` | ✅ |
| SC-009 (añadido el 2026-11-20): «Abandonar» en la barra | e2e `navegacion.spec.ts` («"Abandonar" en la barra: en cualquier momento de la partida, un NPC ocupa la plaza») | ✅ |

## Pendiente

- SC-002 (a simple vista), SC-003 (carga percibida) y SC-004 (escucha de prueba) se comprueban en la sesión común con
  personas de INI-01 a INI-03 e INI-15.
- SC-004b: decidir si el límite de 300 KB era solo para los efectos de la 007 (así se cumple) o si hay que fijar
  otro límite para toda la carpeta de sonidos.
