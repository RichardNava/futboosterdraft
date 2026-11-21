# Contrato: cierre de partidas al desplegar la 9.0.0

## Función

```ts
cerrarPartidasMotor9(db: BaseDatos, reloj: Reloj): Promise<{
  ejecutado: boolean;   // false si ya estaba hecho
  partidas: number;
  partidosReiniciados: number;
  avisos: number;
  devoluciones: number;
}>
```

## Orden de arranque (`main.ts`)

```text
1. aplicarMigraciones        (si MIGRAR_AL_ARRANCAR no es false)
2. cerrarPartidasMotor9      ← siempre; si falla, el proceso termina y no acepta tráfico
3. crearServidor
4. gestor.rehidratar
5. app.listen
```

Va antes de `crearServidor` porque solo necesita la base de datos y el reloj: así ningún servicio del servidor llega a ver
una partida que se va a cerrar.

## Algoritmo

Todo en **una transacción**:

1. Tomar un bloqueo consultivo (`pg_advisory_xact_lock`).
2. Si existe la fila `cierre_motor_9` en `ajustes`, terminar con `ejecutado: false`.
3. Seleccionar con `FOR UPDATE` las partidas en `en_draft` o `en_torneo`.
4. Para cada una:
   - pasar a `abandonada`;
   - devolver a su anfitrión `cobro_rareza`, si lo hay;
   - reiniciar sus partidos en juego ([data-model §5](../data-model.md#partidos-de-una-partida-cerrada));
   - insertar un aviso `partida_cerrada` por cada usuario humano distinto.
5. Insertar `cierre_motor_9` con el recuento.

Si algo falla, no queda ningún cambio y el siguiente arranque lo reintenta.

## Garantías

| Garantía | Mecanismo |
|---|---|
| Repetir no cambia nada (FR-047) | Marca en `ajustes`, dentro de la misma transacción |
| Una sola devolución | Marca e índice único `movimientos_devolucion_rareza_uq` |
| Las partidas 9.0.0 no se cierran | La marca impide una segunda ejecución |
| `buscando` no se toca | Solo se seleccionan `en_draft` y `en_torneo` |
| Sin premios ni fragmentos | No se llama a `terminarTorneo`; la partida no se rehidrata |
| Partido no abrible | `errorAlAbrir` rechaza un partido no finalizado si la partida no está `en_torneo` |
| Resumen conservado | Las filas `finalizado` no se modifican |

## Aviso

- **Tipo**: `partida_cerrada`.
- **Texto con devolución al anfitrión**: «Hemos actualizado el motor de partidos y esta partida se ha cerrado. Te hemos devuelto los {n} fragmentos del nivel de rareza. Los partidos ya jugados conservan su resumen.»
- **Texto general**: «Hemos actualizado el motor de partidos y esta partida se ha cerrado. Los partidos ya jugados conservan su resumen.»
- Solo en la bandeja, sin correo.

## Requisito previo

Exige integrada la migración `0018_spec017.sql`, que admite el tipo de aviso. Sin ella, la inserción falla por
`avisos_tipo_ck`, la transacción se revierte y el servidor no arranca.
