# Contrato: motor 8.0.0

Interfaz entre los parámetros versionados (`@fbd/domain`) y el motor (`@fbd/engine`), con las invariantes que deben
cumplir las pruebas. Los valores son de partida (research R2–R9) y se fijan con el informe de cada tanda.

## M1. Bloques nuevos de `ParametrosEquilibrado` (todos opcionales)

```ts
type AccionDuelo = 'regate' | 'conduccion' | 'pase_corto';   // ampliable; las ausentes usan los valores de la 7.0.0

curvas?: Partial<Record<AccionDuelo, { base: number; m: number }>>;
//  En el código se llama `curvas` (tipo `AccionCurva`): `duelos` ya era el modo Duelo de la spec 005, que
//  `parametrosEfectivos` rellena siempre, así que su presencia no serviría de interruptor (R1).
//  8.0.0: regate { -0.32, 1.1 } · conduccion { 0.25, 1.15 } · pase_corto { 1.57, 1.27 }

quite?: { DEF: number; MED_MD: number; MED: number; DEL: number; presionador: number; malDefensor: number };
//  8.0.0: { 1.0, 0.92, 0.87, 0.8, 0.05, 0.05 } (0.9 y 0.85 hasta el 2026-11-15)

aereo?: { bonusCabeceador: number; seleccionCabeceador: number };
//  8.0.0: { 0.15, 10 }

desmarque?: { radioMarcaM: number; base: number; m: number; bonusLibre: number; penalizacionMarcado: number; pesoEleccion: number };
//  8.0.0 (tanda 2): { 3, 0, 1, 0.5, 0.4, 1 }

controlPresion?: { base: number; m: number };
//  8.0.0 (tanda 2): { 1.0, 1 }

liderazgo?: { radioDefensaM: number; kDefensa: number; maxCorreccion: number; porcentajePortero: number; zonaMaxPortero: number };
//  8.0.0 (tanda 3): { 12, 0.5, 0.5, 0.025, 1 }

// Añadidos (tanda 1b; research R12 a R15)
estrella?: { umbralVisionPase: number; escalaMedia: number; diferenciaArriesgar: number; repartoArriesgado: number;
             prioridadEstrella: number; lineaClaraM: number; pendienteDesmarque: number };
//  8.0.0: { 80, 10, 5, 0.4, 1.5, 3, 0.003 }

bandas?: { probabilidadBanda: number; receptorBanda: number; centro: number };
//  8.0.0: { 0.2, 1.5, 1.3 }

subidaArea?: { retaguardiaDEF: number; retaguardiaMED: number; defensoresArea: number; ultimaJugadaS: number; porteriaVaciaM: number };
//  8.0.0: { 1, 1, 8, 60, 30 }

segundaLinea?: { xInterior: number; desdeCampoPropioM: number };
//  8.0.0: { 7900, 10 }   (xInterior en décimas del equipo que ataca: unos 22 m de la portería)
```

Además, `decision.factores.regate` pasa a { k: 0,7; min: 0,6; max: 3,0 } en la 8.0.0 (research R4; con los añadidos, { k: 1,1; min: 0,6; max: 4,0 }), y la
recalibración de la tanda 1 deja `disciplina.factorFaltaArea` en 0,34 y `defectos.malDefensor` en 0,5.

El dominio añade el estilo con balón `bandas` a `ESTILOS_CON_BALON` (y al esquema de `@fbd/protocol`).

## M2. Invariantes

1. **La 7.0.0 no cambia**: con `PARAMETROS_V7`, `huella-014.json` sale idéntica, evento a evento.
2. **Curvas** (SC-001): con `PARAMETROS_V8` y sin ajustes, `probabilidad()` da los nueve valores de FR-002 dentro de
   su rango (tabla en research R2).
3. **Quite** (FR-004/005), sin cansancio ni penalización por posición:
   - MED sin MD con posicionamiento 80 y velocidad 70: 63,75.
   - El mismo con Presionador: 67,5. Con Mal defensor: 60. Con los dos: 63,75.
   - MED con MD: ×0,90.
   - DEL con agresividad 80 y velocidad 70: 60 (con Presionador, 63,75).
   - DEF con tackling 80: 80 (Presionador 84, Mal defensor 76).
   - POR: su defensa.
4. **Remate** (FR-006): atacante `remate` (MED disparo, DEL finalización) contra `parada` = (agilidad + colocación) /
   2. No cambia respecto a la 7.0.0.
5. **Aéreo** (FR-008/009): el `aereo` de un DEF es su anticipación. En cada duelo aéreo, la probabilidad del lado que
   tiene Cabeceador es 0,15 mayor (antes del recorte entre 0,03 y 0,97) que sin la virtud, sea atacante o defensor y
   en cualquiera de las dos áreas.
6. **Frecuencia** (FR-007): el peso de regate y de conducción crece con el `regate` del portador tenga o no espacio
   por delante. A igualdad de todo lo demás, el peso con regate 95 es mayor que con 75.
7. **Desmarque** (FR-011/012/019):
   - Sin rival a ≤ `radioMarcaM` del receptor no hay tirada y el receptor recibe libre.
   - Con portero receptor no hay duelo.
   - Defensor sin stat: 50.
   - Si gana el receptor, el pase lleva +`bonusLibre` y no hay control. Si pierde, lleva −`penalizacionMarcado` y, si
     llega, hay control.
8. **Elección** (FR-013): de dos candidatos iguales salvo el `desmarque`, el de más desmarque tiene más peso en
   `pesosReceptor`.
9. **Control** (FR-014):
   - Solo tras un pase completado a un receptor marcado.
   - Enfrenta `tecnica` contra el `quite` del marcador. Si pierde, `perder()` con el marcador como recuperador.
10. **Liderazgo** (FR-015/016):
    - Portero de 90 de liderazgo ⇒ +2,25 al atributo defensor de un DEF en la zona ≤ `zonaMaxPortero`.
    - Fuera de esa zona, +0.
    - Con varios defensas líderes a ≤ `radioDefensaM`, cuenta el mayor.
    - Liderazgo ≤ 70 ⇒ sin corrección.
11. **Determinismo**: misma semilla y versión ⇒ mismo partido en la rápida y en la 2D (SC-010, `huella-015.json`).
12. **Coste** (FR-018): ningún duelo nuevo ordena listas ni reserva memoria por llamada. Localizar al marcador es un
    recorrido por los rivales.

13. **Estrella** (FR-025, `pesosEstrella`): con los cuatro ejemplos de US7 (EI 83 claro; ED 87 o 90 claro o marcado):
    ED claro > EI; pasador ≤ 80 → EI > ED y el ED conserva su peso; pasador > 80 y diferencia ≤ 5 → ED / (EI + ED) =
    0,4; pasador > 80 y diferencia > 5 → ED = 1,5 × EI. Sin el bloque, los pesos de la 7.0.0.
14. **Desmarque en el pase** (FR-026, `ajusteDesmarque`): con un rival de campo a ≤ `lineaClaraM` del receptor,
    `pendienteDesmarque × (desmarque − marcaje)`; sin él o sin el bloque, 0.
15. **Bandas** (FR-027): con `bandas`, `probabilidadBanda` + 0,2, centro × 1,3 y LI, LD, CI, CD, EI y ED × 1,5 en
    `pesosReceptor`; el resto, igual. Sin el bloque, como Equilibrado.
16. **Subida** (FR-028, `objetivosBalonParado`): en un córner con `subidaArea`, 4-4-2 y el ED de lanzador, 7 arriba y
    2 atrás; los Cabeceador, arriba. Con 4 minutos de descuento, el portero sube con 0-1 en el 90+3:20 y no en el
    90+1:40, ni con 0-0 ni con 0-2; en la prórroga, igual. `porteroBajoPalos` no devuelve portero si está a más de
    `porteriaVaciaM` de su portería (con la 7.0.0, siempre lo devuelve). Sin el bloque, 5 arriba como en la 7.0.0.
17. **Segunda línea** (FR-029): con `segundaLinea`, `esManoAMano` es cierto 5 m dentro del campo propio con solo el
    portero por delante (falso sin el bloque); el objetivo del MC con el balón en el último tercio está al menos 5 m
    más adelantado que sin el bloque.

## M3. Métricas

`MetricasJugador` añade los contadores de [data-model §7](../data-model.md#7-métricas-por-jugador-tipos-ts-metricasjugador).
El protocolo WebSocket y los eventos del partido no cambian.
