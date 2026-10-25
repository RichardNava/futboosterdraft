/**
 * Servicio de economía (spec 006, R8, R10, R11, R13, R14; data-model §4.2): colección propia, colección activa,
 * fragmentos y compras. Todo se resuelve en el servidor y cada operación es una transacción.
 *
 * Concurrencia: cada operación bloquea primero la fila de saldo del usuario (`select … for update`), así que las
 * operaciones de un mismo usuario se ejecutan de una en una: dos desactivaciones no se saltan el mínimo, dos compras
 * no cobran dos veces y una compra repetida con el mismo `idCompra` encuentra la primera ya guardada.
 */
import {
  comprobarMinimoActivo,
  derivarSemilla,
  estadoMinimo,
  generarSobreTienda,
  NIVELES,
  PARAMETROS_ECONOMIA,
  parametrosActuales,
  recuentoPorDemarcacionYNivel,
  semillaDesdeTexto,
  valorDesfragmentar,
  type EstadoMinimo,
  type Jugador,
  type Nivel,
  type ParametrosEquilibrado,
} from '@fbd/domain';
import type {
  CartaPoseida,
  MotivoMovimiento,
  ProductoColeccion,
  ResumenCompra,
  RespuestaColeccion,
  RespuestaMovimientos,
  RespuestaTienda,
} from '@fbd/protocol';
import { and, asc, desc, eq, lt, sql } from 'drizzle-orm';
import { errores } from '../http/errores';
import type { BaseDatos } from '../persistencia/db';
import {
  cartasUsuario,
  colecciones,
  coleccionesUsuario,
  compras,
  movimientosFragmentos,
  saldosFragmentos,
  usuarios,
  type ResultadoCompraGuardado,
} from '../persistencia/esquema/index';
import { COLECCION_CORE, type Catalogo } from '../persistencia/repos/catalogo';

type Tx = Parameters<Parameters<BaseDatos['transaction']>[0]>[0];
type Ejecutor = BaseDatos | Tx;
type FilaCarta = typeof cartasUsuario.$inferSelect;
type Moneda = 'eur' | 'fragmentos';

const MENSAJE_SOBRE_NO_DISPONIBLE = 'Ya tienes casi todas las cartas de las colecciones de pago: quedan menos de 8 por conseguir';

/** Texto del historial para cada movimiento (FR-018). */
function descripcion(motivo: MotivoMovimiento, nombreCarta: string | undefined): string {
  switch (motivo) {
    case 'recompensa_torneo':
      return 'Torneo ganado';
    case 'desfragmentacion':
      return `Carta desfragmentada: ${nombreCarta ?? '—'}`;
    case 'duplicado':
      return `Carta repetida: ${nombreCarta ?? '—'}`;
    case 'compra_fragmentos':
      return 'Compra de fragmentos';
    case 'compra_sobre':
      return 'Compra de un sobre';
  }
}

export class ServicioEconomia {
  constructor(
    private readonly db: BaseDatos,
    private readonly catalogo: Catalogo,
    private readonly parametros: ParametrosEquilibrado = parametrosActuales(),
  ) {}

  // ---------- Colección ----------

  /** Inserta las cartas de Core que falten y el saldo a 0 (R8). Idempotente. */
  async asegurarColeccion(usuarioId: string, ejecutor: Ejecutor = this.db): Promise<void> {
    await ejecutor.execute(sql`
      insert into cartas_usuario (usuario_id, jugador_id, via)
      select ${usuarioId}, jugador_id, 'registro' from colecciones_cartas where coleccion_id = ${COLECCION_CORE}
      on conflict do nothing`);
    await ejecutor.insert(saldosFragmentos).values({ usuarioId }).onConflictDoNothing();
  }

  async leerColeccion(usuarioId: string): Promise<RespuestaColeccion> {
    await this.asegurarColeccion(usuarioId);
    const filas = await this.cartas(this.db, usuarioId);
    const lista = await this.db.select().from(colecciones).orderBy(asc(colecciones.orden));
    return {
      cartas: filas.map((f) => this.cartaPoseida(f)),
      colecciones: lista.map((c) => ({ id: c.id, nombre: c.nombre, tipo: c.tipo })),
      minimo: this.minimo(filas),
      saldo: await this.saldo(this.db, usuarioId),
    };
  }

  /** Ids de las cartas activas, para la foto del pool de una partida (R12). Exige el mínimo. */
  async poolActivo(usuarioId: string): Promise<number[]> {
    await this.asegurarColeccion(usuarioId);
    const filas = await this.cartas(this.db, usuarioId);
    const minimo = this.minimo(filas);
    const incumplida = minimo.incumplidas[0];
    if (incumplida) throw errores.regla('MINIMO_ACTIVO', this.textoMinimo(incumplida), { ...incumplida });
    return filas.filter((f) => f.activa).map((f) => f.jugadorId);
  }

  async cambiarActiva(usuarioId: string, jugadorId: number, activa: boolean): Promise<{ carta: CartaPoseida; minimo: EstadoMinimo }> {
    await this.asegurarColeccion(usuarioId);
    return this.db.transaction(async (tx) => {
      await this.bloquear(tx, usuarioId);
      const filas = await this.cartas(tx, usuarioId);
      const fila = filas.find((f) => f.jugadorId === jugadorId);
      if (!fila) throw errores.noEncontrado('CARTA_NO_POSEIDA', 'No tienes esa carta');
      if (fila.activa === activa) return { carta: this.cartaPoseida(fila), minimo: this.minimo(filas) };
      if (!activa) this.exigirMinimo(filas, jugadorId);
      fila.activa = activa;
      await tx.update(cartasUsuario).set({ activa }).where(and(eq(cartasUsuario.usuarioId, usuarioId), eq(cartasUsuario.jugadorId, jugadorId)));
      return { carta: this.cartaPoseida(fila), minimo: this.minimo(filas) };
    });
  }

  async desfragmentar(usuarioId: string, jugadorId: number): Promise<{ fragmentos: number; saldo: number; minimo: EstadoMinimo }> {
    await this.asegurarColeccion(usuarioId);
    return this.db.transaction(async (tx) => {
      await this.bloquear(tx, usuarioId);
      const filas = await this.cartas(tx, usuarioId);
      const fila = filas.find((f) => f.jugadorId === jugadorId);
      if (fila && this.catalogo.esCore(jugadorId)) throw errores.regla('CARTA_CORE', 'Las cartas de Core no se pueden desfragmentar');
      if (fila?.activa) this.exigirMinimo(filas, jugadorId);
      const borradas = await tx
        .delete(cartasUsuario)
        .where(and(eq(cartasUsuario.usuarioId, usuarioId), eq(cartasUsuario.jugadorId, jugadorId)))
        .returning({ id: cartasUsuario.jugadorId });
      if (!borradas.length) throw errores.noEncontrado('CARTA_NO_POSEIDA', 'No tienes esa carta');
      const fragmentos = valorDesfragmentar(this.catalogo.jugador(jugadorId).nivel);
      const saldo = await this.sumar(tx, usuarioId, fragmentos, 'desfragmentacion', String(jugadorId));
      return { fragmentos, saldo, minimo: this.minimo(filas.filter((f) => f.jugadorId !== jugadorId)) };
    });
  }

  // ---------- Fragmentos ----------

  /** +`cantidad` al campeón registrado de un torneo; una sola vez por partida (R10, R14). Los invitados no reciben nada. */
  async recompensarTorneo(usuarioId: string, partidaId: string, cantidad: number): Promise<boolean> {
    const usuario = (await this.db.select({ invitado: usuarios.isAnonymous }).from(usuarios).where(eq(usuarios.id, usuarioId)))[0];
    if (!usuario || usuario.invitado) return false;
    return this.db.transaction(async (tx) => {
      await tx.insert(saldosFragmentos).values({ usuarioId }).onConflictDoNothing();
      const insertado = await tx
        .insert(movimientosFragmentos)
        .values({ usuarioId, importe: cantidad, motivo: 'recompensa_torneo', referencia: partidaId })
        .onConflictDoNothing()
        .returning({ id: movimientosFragmentos.id });
      if (!insertado.length) return false;
      await tx
        .update(saldosFragmentos)
        .set({ saldo: sql`${saldosFragmentos.saldo} + ${cantidad}`, actualizadoEn: new Date() })
        .where(eq(saldosFragmentos.usuarioId, usuarioId));
      return true;
    });
  }

  /** Fragmentos recibidos por ganar el torneo, o `null`. */
  async recompensaDe(usuarioId: string, partidaId: string): Promise<number | null> {
    const fila = await this.db
      .select({ importe: movimientosFragmentos.importe })
      .from(movimientosFragmentos)
      .where(
        and(
          eq(movimientosFragmentos.usuarioId, usuarioId),
          eq(movimientosFragmentos.motivo, 'recompensa_torneo'),
          eq(movimientosFragmentos.referencia, partidaId),
        ),
      );
    return fila[0]?.importe ?? null;
  }

  /**
   * Historial del más reciente al más antiguo (FR-018).
   * shortcut: los movimientos de una misma transacción comparten `creado_en`, y la página siguiente (`antes`) puede
   * saltarse alguno si el límite cae en medio de un grupo; paginar por (`creado_en`, `id`) si llega a importar.
   */
  async movimientos(usuarioId: string, antes: Date | undefined, limite: number): Promise<RespuestaMovimientos> {
    await this.asegurarColeccion(usuarioId);
    const filas = await this.db
      .select()
      .from(movimientosFragmentos)
      .where(and(eq(movimientosFragmentos.usuarioId, usuarioId), antes ? lt(movimientosFragmentos.creadoEn, antes) : undefined))
      .orderBy(desc(movimientosFragmentos.creadoEn), desc(movimientosFragmentos.id))
      .limit(limite);
    const nombre = (ref: string) => {
      const id = Number(ref);
      return Number.isInteger(id) && id > 0 ? this.catalogo.resumen(id).nombreCarta : undefined;
    };
    return {
      saldo: await this.saldo(this.db, usuarioId),
      movimientos: filas.map((f) => ({
        id: f.id,
        importe: f.importe,
        motivo: f.motivo,
        referencia: f.referencia,
        descripcion: descripcion(f.motivo, f.motivo === 'desfragmentacion' || f.motivo === 'duplicado' ? nombre(f.referencia) : undefined),
        creadoEn: f.creadoEn.toISOString(),
      })),
    };
  }

  // ---------- Tienda ----------

  async tienda(usuarioId: string): Promise<RespuestaTienda> {
    await this.asegurarColeccion(usuarioId);
    const poseidas = new Set((await this.cartas(this.db, usuarioId)).map((f) => f.jugadorId));
    const saldo = await this.saldo(this.db, usuarioId);
    const compradas = new Set(
      (await this.db.select({ id: coleccionesUsuario.coleccionId }).from(coleccionesUsuario).where(eq(coleccionesUsuario.usuarioId, usuarioId))).map(
        (f) => f.id,
      ),
    );
    const restantes = (await this.cartasDePago()).filter((id) => !poseidas.has(id)).length;
    const p = PARAMETROS_ECONOMIA;
    return {
      saldo,
      colecciones: (await this.coleccionesDePago()).map((c) => this.productoColeccion(c, poseidas, compradas.has(c.id))),
      sobre: {
        precioFragmentos: p.precioSobreFragmentos,
        precioCentimos: p.precioSobreCentimos,
        disponible: restantes >= 8,
        ...(restantes < 8 ? { motivoNoDisponible: MENSAJE_SOBRE_NO_DISPONIBLE } : {}),
        ...(saldo < p.precioSobreFragmentos ? { faltan: p.precioSobreFragmentos - saldo } : {}),
      },
      paquetes: p.paquetesFragmentos.map((x) => ({ id: x.id, fragmentos: x.fragmentos, precioCentimos: x.centimos })),
    };
  }

  async comprarSobre(usuarioId: string, moneda: Moneda, idCompra: string): Promise<ResumenCompra> {
    const p = PARAMETROS_ECONOMIA;
    const importe = moneda === 'eur' ? p.precioSobreCentimos : p.precioSobreFragmentos;
    return this.comprar(usuarioId, idCompra, { tipo: 'sobre', id: 'sobre', moneda, importe }, async (tx) => {
      const poseidas = new Set((await this.cartas(tx, usuarioId)).map((f) => f.jugadorId));
      const disponibles = (await this.cartasDePago()).filter((id) => !poseidas.has(id)).map((id) => this.catalogo.jugador(id));
      if (disponibles.length < 8) throw errores.conflicto('SOBRE_NO_DISPONIBLE', MENSAJE_SOBRE_NO_DISPONIBLE, { restantes: disponibles.length });
      if (moneda === 'fragmentos') await this.cobrar(tx, usuarioId, importe, idCompra);
      const cartas = generarSobreTienda(disponibles, derivarSemilla(semillaDesdeTexto(idCompra), 'sobre-tienda'), this.parametros);
      await tx.insert(cartasUsuario).values(cartas.map((jugadorId) => ({ usuarioId, jugadorId, via: 'sobre' as const })));
      return { cartas, fragmentos: 0, duplicados: [] };
    });
  }

  async comprarColeccion(usuarioId: string, coleccionId: string, idCompra: string): Promise<ResumenCompra> {
    const coleccion = (await this.coleccionesDePago()).find((c) => c.id === coleccionId);
    if (!coleccion) throw errores.noEncontrado('PRODUCTO_NO_ENCONTRADO', `No existe la colección ${coleccionId}`);
    const producto = { tipo: 'coleccion' as const, id: coleccionId, moneda: 'eur' as const, importe: coleccion.precioCentimos! };
    return this.comprar(usuarioId, idCompra, producto, async (tx) => {
      const comprada = await tx
        .select()
        .from(coleccionesUsuario)
        .where(and(eq(coleccionesUsuario.usuarioId, usuarioId), eq(coleccionesUsuario.coleccionId, coleccionId)));
      if (comprada.length) throw errores.conflicto('COLECCION_ADQUIRIDA', 'Ya tienes esta colección');
      await tx.insert(coleccionesUsuario).values({ usuarioId, coleccionId, compraId: idCompra });
      const poseidas = new Set((await this.cartas(tx, usuarioId)).map((f) => f.jugadorId));
      const ids = this.catalogo.cartasDe(coleccionId);
      const nuevas = ids.filter((id) => !poseidas.has(id));
      if (nuevas.length) await tx.insert(cartasUsuario).values(nuevas.map((jugadorId) => ({ usuarioId, jugadorId, via: 'coleccion' as const })));
      const duplicados = ids.filter((id) => poseidas.has(id)).map((id) => ({ id, fragmentos: valorDesfragmentar(this.catalogo.jugador(id).nivel) }));
      for (const d of duplicados) await this.sumar(tx, usuarioId, d.fragmentos, 'duplicado', String(d.id));
      return { cartas: nuevas, fragmentos: duplicados.reduce((a, d) => a + d.fragmentos, 0), duplicados };
    });
  }

  async comprarFragmentos(usuarioId: string, paqueteId: string, idCompra: string): Promise<ResumenCompra> {
    const paquete = PARAMETROS_ECONOMIA.paquetesFragmentos.find((x) => x.id === paqueteId);
    if (!paquete) throw errores.noEncontrado('PRODUCTO_NO_ENCONTRADO', `No existe el paquete ${paqueteId}`);
    return this.comprar(usuarioId, idCompra, { tipo: 'fragmentos', id: paqueteId, moneda: 'eur', importe: paquete.centimos }, async (tx) => {
      await this.sumar(tx, usuarioId, paquete.fragmentos, 'compra_fragmentos', idCompra);
      return { cartas: [], fragmentos: paquete.fragmentos, duplicados: [] };
    });
  }

  // ---------- Ayudantes ----------

  /**
   * Compra idempotente por `idCompra` (R10). La fila de `compras` se inserta antes de entregar, en la misma
   * transacción, porque `colecciones_usuario` la referencia; su `resultado` se completa al final.
   */
  private async comprar(
    usuarioId: string,
    idCompra: string,
    producto: { tipo: 'coleccion' | 'sobre' | 'fragmentos'; id: string; moneda: Moneda; importe: number },
    entregar: (tx: Tx) => Promise<ResultadoCompraGuardado>,
  ): Promise<ResumenCompra> {
    await this.asegurarColeccion(usuarioId);
    return this.db.transaction(async (tx) => {
      await this.bloquear(tx, usuarioId);
      const previa = (await tx.select().from(compras).where(eq(compras.id, idCompra)))[0];
      if (previa) {
        if (previa.usuarioId !== usuarioId || previa.productoTipo !== producto.tipo || previa.productoId !== producto.id || previa.moneda !== producto.moneda) {
          throw errores.conflicto('ID_COMPRA_REUTILIZADO', 'Ese idCompra ya se usó para otra compra');
        }
        return this.resumen(tx, usuarioId, idCompra, previa.resultado);
      }
      await tx.insert(compras).values({
        id: idCompra,
        usuarioId,
        productoTipo: producto.tipo,
        productoId: producto.id,
        moneda: producto.moneda,
        importe: producto.importe,
        // FR-031: todos los pagos en euros son simulados en el MVP.
        simulada: true,
        estado: 'completada',
        resultado: { cartas: [], fragmentos: 0, duplicados: [] },
      });
      const resultado = await entregar(tx);
      await tx.update(compras).set({ resultado }).where(eq(compras.id, idCompra));
      return this.resumen(tx, usuarioId, idCompra, resultado);
    });
  }

  private async resumen(tx: Tx, usuarioId: string, idCompra: string, r: ResultadoCompraGuardado): Promise<ResumenCompra> {
    return {
      idCompra,
      cartas: r.cartas.map((id) => this.catalogo.resumen(id)),
      fragmentos: r.fragmentos,
      duplicados: r.duplicados.map((d) => ({ ...d, nivel: this.catalogo.jugador(d.id).nivel, nombreCarta: this.catalogo.jugador(d.id).nombre_carta })),
      saldo: await this.saldo(tx, usuarioId),
    };
  }

  /** Serializa las operaciones del usuario (la fila de saldo existe tras `asegurarColeccion`). */
  private async bloquear(tx: Tx, usuarioId: string): Promise<void> {
    await tx.select({ u: saldosFragmentos.usuarioId }).from(saldosFragmentos).where(eq(saldosFragmentos.usuarioId, usuarioId)).for('update');
  }

  private async saldo(ejecutor: Ejecutor, usuarioId: string): Promise<number> {
    const fila = await ejecutor.select({ saldo: saldosFragmentos.saldo }).from(saldosFragmentos).where(eq(saldosFragmentos.usuarioId, usuarioId));
    return fila[0]?.saldo ?? 0;
  }

  /** Suma al saldo y anota el movimiento en la misma transacción (SC-006). */
  private async sumar(tx: Tx, usuarioId: string, importe: number, motivo: MotivoMovimiento, referencia: string): Promise<number> {
    const [fila] = await tx
      .update(saldosFragmentos)
      .set({ saldo: sql`${saldosFragmentos.saldo} + ${importe}`, actualizadoEn: new Date() })
      .where(eq(saldosFragmentos.usuarioId, usuarioId))
      .returning({ saldo: saldosFragmentos.saldo });
    await tx.insert(movimientosFragmentos).values({ usuarioId, importe, motivo, referencia });
    return fila!.saldo;
  }

  /** Cargo condicional: nunca deja el saldo en negativo (R10). */
  private async cobrar(tx: Tx, usuarioId: string, precio: number, idCompra: string): Promise<void> {
    const fila = await tx
      .update(saldosFragmentos)
      .set({ saldo: sql`${saldosFragmentos.saldo} - ${precio}`, actualizadoEn: new Date() })
      .where(and(eq(saldosFragmentos.usuarioId, usuarioId), sql`${saldosFragmentos.saldo} >= ${precio}`))
      .returning({ saldo: saldosFragmentos.saldo });
    if (!fila.length) {
      const saldo = await this.saldo(tx, usuarioId);
      throw errores.regla('SALDO_INSUFICIENTE', `Te faltan ${precio - saldo} fragmentos`, { saldo, precio, faltan: precio - saldo });
    }
    await tx.insert(movimientosFragmentos).values({ usuarioId, importe: -precio, motivo: 'compra_sobre', referencia: idCompra });
  }

  private cartas(ejecutor: Ejecutor, usuarioId: string): Promise<FilaCarta[]> {
    return ejecutor.select().from(cartasUsuario).where(eq(cartasUsuario.usuarioId, usuarioId)).orderBy(asc(cartasUsuario.jugadorId));
  }

  private cartaPoseida(f: FilaCarta): CartaPoseida {
    const id = f.jugadorId;
    const esCore = this.catalogo.esCore(id);
    return {
      ...this.catalogo.resumen(id),
      activa: f.activa,
      via: f.via,
      obtenidaEn: f.obtenidaEn.toISOString(),
      colecciones: [...this.catalogo.coleccionesDe(id)],
      esCore,
      valorFragmentos: esCore ? null : valorDesfragmentar(this.catalogo.jugador(id).nivel),
      historia: this.catalogo.jugador(id).historia,
    };
  }

  private recuentoActivas(filas: readonly FilaCarta[]) {
    return recuentoPorDemarcacionYNivel(filas.filter((f) => f.activa).map((f) => this.catalogo.jugador(f.jugadorId)));
  }

  private minimo(filas: readonly FilaCarta[]): EstadoMinimo {
    return estadoMinimo(this.recuentoActivas(filas));
  }

  private exigirMinimo(filas: readonly FilaCarta[], jugadorId: number): void {
    const r = comprobarMinimoActivo(this.recuentoActivas(filas), this.catalogo.jugador(jugadorId));
    if (!r.ok) {
      const { ok: _ok, ...detalles } = r;
      throw errores.regla('MINIMO_ACTIVO', this.textoMinimo(detalles), { ...detalles });
    }
  }

  private textoMinimo(d: { demarcacion: string; nivel: Nivel; minimo: number; activas: number }): string {
    const nivel = d.nivel === 'Epico' ? 'Épico' : d.nivel;
    return `Mínimo de ${d.demarcacion} ${nivel}: ${d.minimo}; tienes ${d.activas} activas`;
  }

  private coleccionesDePago() {
    return this.db.select().from(colecciones).where(eq(colecciones.tipo, 'pago')).orderBy(asc(colecciones.orden));
  }

  /** Cartas de las colecciones de pago: el pool del sobre de la tienda (R13). */
  private async cartasDePago(): Promise<number[]> {
    return [...new Set((await this.coleccionesDePago()).flatMap((c) => this.catalogo.cartasDe(c.id)))];
  }

  private productoColeccion(c: typeof colecciones.$inferSelect, poseidas: ReadonlySet<number>, adquirida: boolean): ProductoColeccion {
    const ids = this.catalogo.cartasDe(c.id);
    const cartas = ids.map((id) => this.catalogo.jugador(id));
    const porNivel = Object.fromEntries(NIVELES.map((n) => [n, cartas.filter((j) => j.nivel === n).length])) as Record<Nivel, number>;
    const mejores = [...cartas].sort((a: Jugador, b: Jugador) => NIVELES.indexOf(b.nivel) - NIVELES.indexOf(a.nivel) || b.media - a.media).slice(0, 3);
    const muestra = c.destacadas.length ? c.destacadas : mejores.map((j) => j.id);
    const tengo = ids.filter((id) => poseidas.has(id));
    return {
      id: c.id,
      nombre: c.nombre,
      descripcion: c.descripcion,
      precioCentimos: c.precioCentimos!,
      numCartas: ids.length,
      porNivel,
      muestra: muestra.map((id) => this.catalogo.resumen(id)),
      poseidas: tengo.length,
      adquirida,
      soloFragmentos: tengo.length === ids.length ? tengo.reduce((a, id) => a + valorDesfragmentar(this.catalogo.jugador(id).nivel), 0) : null,
    };
  }
}
