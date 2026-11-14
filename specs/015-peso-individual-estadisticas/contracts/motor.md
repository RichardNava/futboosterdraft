# Contrato: motor 8.0.0

Interfaz entre los parámetros versionados (`@fbd/domain`) y el motor (`@fbd/engine`), con las invariantes que deben
cumplir las pruebas. Los valores son de partida (research R2–R9) y se fijan con el informe de cada tanda.

## M1. Bloques nuevos de `ParametrosEquilibrado` (todos opcionales)

```ts
type AccionDuelo = 'regate' | 'conduccion' | 'pase_corto';   // ampliable; las ausentes usan los valores de la 7.0.0

duelos?: Partial<Record<AccionDuelo, { base: number; m: number }>>;
//  8.0.0: regate { -0.32, 1.1 } · conduccion { 0.25, 1.15 } · pase_corto { 1.57, 1.27 }

quite?: { DEF: number; MED_MD: number; MED: number; DEL: number; presionador: number; malDefensor: number };
//  8.0.0: { 1.0, 0.9, 0.85, 0.8, 0.05, 0.05 }

aereo?: { bonusCabeceador: number; seleccionCabeceador: number };
//  8.0.0: { 0.15, 10 }

desmarque?: { radioMarcaM: number; base: number; m: number; bonusLibre: number; penalizacionMarcado: number; pesoEleccion: number };
//  8.0.0 (tanda 2): { 3, 0, 1, 0.5, 0.4, 1 }

controlPresion?: { base: number; m: number };
//  8.0.0 (tanda 2): { 1.0, 1 }

liderazgo?: { radioDefensaM: number; kDefensa: number; maxCorreccion: number; porcentajePortero: number; zonaMaxPortero: number };
//  8.0.0 (tanda 3): { 12, 0.5, 0.5, 0.025, 1 }
```

Además, `decision.factores.regate` pasa a { k: 0,7; min: 0,6; max: 3,0 } en la 8.0.0 (research R4).

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

## M3. Métricas

`MetricasJugador` añade los contadores de [data-model §7](../data-model.md#7-métricas-por-jugador-tipos-ts-metricasjugador).
El protocolo WebSocket y los eventos del partido no cambian.
