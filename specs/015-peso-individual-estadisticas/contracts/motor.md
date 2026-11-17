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
//  8.0.0 (tanda 2): { 3, 0, 1, 0.25, 0.4, 1 }   (bonusLibre 0,5 de partida)

controlPresion?: { base: number; m: number };
//  8.0.0 (tanda 2): { 0.5, 1 }   (base 1,0 de partida)

liderazgo?: { radioDefensaM: number; kDefensa: number; maxCorreccion: number; baseDefensa: number; porcentajePortero: number;
              basePortero: number; zonaMaxPortero: number };
//  8.0.0: { 20, 0.34, 0.8, 36.5, 0.025, 70, 1 }   (decisiones del 2026-11-17: base de la línea 70 → 36,5, la escala de
//  SC-006a; portero relativo a 70; radio 12 de partida; research, «Tanda 3» y «Decisiones del 2026-11-17»)

// Añadidos (tanda 1b; research R12 a R15)
estrella?: { umbralVisionPase: number; escalaMedia: number; diferenciaArriesgar: number; repartoArriesgado: number;
             prioridadEstrella: number; lineaClaraM: number };
//  8.0.0: { 80, 4, 5, 0.4, 1.5, 3 }   (`pendienteDesmarque`, 0,003, salió en la tanda 2: lo sustituye `desmarque`)

bandas?: { probabilidadBanda: number; receptorBanda: number; centro: number };
//  8.0.0: { 0.2, 1.5, 1.3 }

subidaArea?: { retaguardiaDEF: number; retaguardiaMED: number; defensoresArea: number; ultimaJugadaS: number; porteriaVaciaM: number };
//  8.0.0: { 1, 1, 8, 60, 30 }

segundaLinea?: { xInterior: number; desdeCampoPropioM: number };
//  8.0.0: { 7900, 10 }   (xInterior en décimas del equipo que ataca: unos 22 m de la portería)

// Balones fuera (US11, FR-031)
fueraDeCampo?: { centroDespejado: number; desvio: number; desvioBanda: number; margenFondoM: number; margenBandaM: number;
                 paradaCorner: number; esperaCorner: number; paradaBanda: number; velocidadColocacion: number;
                 peligroCorner: number };
//  8.0.0: { 0.9, 0.25, 0.5, 22, 15, 20, 15, 6, 4, 0.3 }
```

Con `fueraDeCampo`, además, `acciones.probabilidadCornerTrasParada` pasa de 0,3 a 0,45 y
`acciones.probabilidadCornerTrasDespeje` (tiro bloqueado) de 0,35 a 0,6, y la carrera tras el centro de un córner no
cuenta como balón suelto (`cuentaSuelto: false`, 014/SC-008): el duelo aéreo ya decidió quién remata o despeja, y la
simulación no cambia. Con el triple de córners hay más despejes en el área, y el que despeja busca el campo contrario:
`tiro.autogol.despejeCentro` pasa de 0,008 a 0,004 en la 8.0.0 (003/SC-003; decisión del 2026-11-15).

Además, `decision.factores.regate` pasa a { k: 0,7; min: 0,6; max: 3,0 } en la 8.0.0 (research R4; con los añadidos, { k: 1,1; min: 0,6; max: 4,0 }), y la
recalibración de la tanda 1 deja `disciplina.factorFaltaArea` en 0,34 y `defectos.malDefensor` en 0,5.

El dominio añade el estilo con balón `bandas` a `ESTILOS_CON_BALON` (y al esquema de `@fbd/protocol`).

## M2. Invariantes

1. **La 7.0.0 no cambia**: con `PARAMETROS_V7`, `huella-014.json` sale idéntica, evento a evento.
2. **Curvas** (SC-001): con `PARAMETROS_V8` y sin ajustes, `probabilidad()` da los nueve valores de FR-002 dentro de
   su rango (tabla en research R2).
3. **Quite** (FR-004/005), sin cansancio ni penalización por posición:
   - MED sin MD con posicionamiento 80 y velocidad 70: 65,25 (× 0,87).
   - El mismo con Presionador: 69. Con Mal defensor: 61,5. Con los dos: 65,25.
   - MED con MD: ×0,92.
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
7. **Desmarque** (FR-011/012/019; `acciones/desmarque.ts` y `desmarqueDelPase` en `juego.ts`):
   - Sin rival a ≤ `radioMarcaM` del receptor no hay tirada y el receptor recibe libre (+`bonusLibre` también).
   - Con portero receptor no hay duelo.
   - Defensor sin stat: 50.
   - Si gana el receptor, el pase lleva +`bonusLibre` y no hay control. Si pierde, lleva −`penalizacionMarcado` y, si
     llega, hay control.
8. **Elección** (FR-013): de dos candidatos iguales salvo el `desmarque`, el de más desmarque tiene más peso en
   `pesosReceptor`.
9. **Control** (FR-014; `controlConPresion` en `juego.ts`):
   - Solo tras un pase completado a un receptor marcado.
   - Enfrenta `tecnica` contra el `quite` del marcador. Si pierde, `perder()` con el marcador como recuperador, que le
     quita el balón de los pies sin carrera por un balón suelto (no cuenta en 014/SC-008).
10. **Liderazgo** (FR-015/016; `modificadores/liderazgo.ts`):
    - Portero: `porcentajePortero` × (L − `basePortero`) al atributo defensor de un DEF de su equipo en la zona ≤
      `zonaMaxPortero` (`ajusteDuelo` y el duelo aéreo del balón parado): 90 ⇒ +0,5; 70 o menos ⇒ 0. Fuera de esa zona,
      +0; el portero rival no cuenta.
    - Defensa: su x objetivo se acerca a la línea del fuera de juego (el penúltimo defensor) en
      min(`maxCorreccion`, `kDefensa` × (L − `baseDefensa`) / 25), con L el mayor liderazgo de los defensas de su línea
      a ≤ `radioDefensaM` (no se acumulan). Liderazgo ≤ `baseDefensa` ⇒ sin corrección.
    - `exposicionLinea`: los atacantes de campo que ese penúltimo defensor deja en juego en ese momento (la medida de
      SC-006a, en cada tick en que el equipo defiende).
    - `habilitador`: el penúltimo defensor, si es de la línea defensiva y el receptor estaría en fuera de juego con la
      línea del siguiente; si no, nadie.
11. **Determinismo**: misma semilla y versión ⇒ mismo partido en la rápida y en la 2D (SC-010, `huella-015.json`).
12. **Coste** (FR-018): ningún duelo nuevo ordena listas ni reserva memoria por llamada. Localizar al marcador es un
    recorrido por los rivales.

13. **Estrella** (FR-025, `pesosEstrella`): con los cuatro ejemplos de US7 (EI 83 claro; ED 87 o 90 claro o marcado):
    ED claro > EI; pasador ≤ 80 → EI > ED y el ED conserva su peso; pasador > 80 y diferencia ≤ 5 → ED / (EI + ED) =
    0,4; pasador > 80 y diferencia > 5 → ED = 1,5 × EI. Sin el bloque, los pesos de la 7.0.0.
14. **Desmarque en el pase** (FR-026): sustituido en la tanda 2 por el duelo de desmarque (M2.7); `ajusteDesmarque` y
    `estrella.pendienteDesmarque` ya no existen.
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
