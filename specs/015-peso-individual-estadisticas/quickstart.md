# Quickstart: validar la spec 015

Guía para comprobar cada tanda. Los criterios están en [contracts/balance.md](contracts/balance.md) y las invariantes
del motor en [contracts/motor.md](contracts/motor.md).

## Requisitos

- `pnpm install` en la raíz.
- Base de datos local solo para el paso 5 (`pnpm seed` carga las cartas cambiadas).

## 1. Antes de empezar: referencia de la 7.0.0

```sh
pnpm --filter @fbd/balance umbral-motor                  # apunta el tiempo por partido de la 7.0.0
pnpm --filter @fbd/engine test equivalencia              # huella-014.json en verde
```

## 2. Tanda 1: curvas, quite, frecuencia y Cabeceador

```sh
pnpm --filter @fbd/engine test curvas015 quite015 cabeceador015
pnpm --filter @fbd/fixtures core-real                    # valida las seis cartas y regenera el sumario
pnpm --filter @fbd/domain test                           # virtudesPermitidas, cartaEnVersion(v2)
pnpm balance --solo 015/SC-001                           # segundos: los nueve duelos en rango
pnpm --filter @fbd/balance exec tsx src/sonda015.ts      # 200 partidos para calibrar la frecuencia (R4)
pnpm balance --n 1000                                    # cierre (~105 min)
```

Resultado esperado al cerrar:

- `015/SC-001`, `015/SC-002a`, `015/SC-002b` y `015/SC-003` ✔.
- `huella-014.json` sigue idéntica.
- 002/SC-007a puede quedar por debajo de 150 (FR-020).
- Ninguna otra comprobación nueva en rojo.

## 3. Tanda 2: desmarque y control con presión

```sh
pnpm --filter @fbd/engine test desmarque
pnpm balance --n 1000
```

Resultado esperado: `015/SC-004` y `015/SC-005` ✔, y **002/SC-007a ≥ 150** pases completados.

## 4. Tanda 3: liderazgo y cierre

```sh
pnpm --filter @fbd/engine test liderazgo
pnpm --filter @fbd/engine exec tsx tests/fixtures/generarHuella015.ts
pnpm balance --n 1000                                    # sin --pendientes
pnpm --filter @fbd/domain rasgos:doc                     # regenera virtudes-y-defectos.md
pnpm -r test && pnpm -r typecheck
```

Resultado esperado:

- `015/SC-006` ✔ y el informe completo sin pendientes (SC-007, SC-008).
- `umbralMotor` ≤ +10 % respecto al paso 1 (SC-009).
- `huella-014.json` y `huella-015.json` en verde (SC-010).

## 5. Comprobación en la aplicación (persona no técnica)

1. `pnpm seed` y crear una partida nueva. En la colección, Van Dijk (87) muestra Cabeceador en lugar de Aura.
2. Una partida creada antes del despliegue sigue mostrando a Van Dijk con Aura.
3. Jugar un partido con un extremo muy regateador y verlo en 2D: encara y sale en conducción varias veces por partido.
4. Abrir un partido jugado con la 7.0.0: se reproduce igual que antes, no solo como resumen.
