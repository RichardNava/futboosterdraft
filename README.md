# Fútboosterdraft

Manager de fútbol online basado en un **draft de sobres de cartas de jugadores**.

Cada participante construye su plantilla eligiendo jugadores de varios sobres. Después elige
formación, once inicial y táctica, y compite en un torneo contra otros participantes o contra rivales
controlados por la IA. Un motor de simulación resuelve los partidos a partir de los atributos de los
jugadores, sus habilidades especiales y las decisiones tácticas.

> **Estado del proyecto:** MVP implementado (las 6 historias de usuario del
> [plan](specs/001-draft-manager-mvp/plan.md)): draft, preparación del equipo, partidos en simulación
> rápida y 2D, torneos en directo y asíncronos, y NPC de cuatro niveles. Está en validación antes de la
> beta.

## Cómo se juega

1. **Draft**: entre 4 y 8 participantes abren 3 sobres de 8 cartas.
   - En cada turno, todos eligen una carta a la vez y pasan el resto del sobre: a la izquierda en el primer sobre, a la derecha en el segundo y a la izquierda otra vez en el tercero.
   - Al terminar, cada uno tiene una plantilla de **24 jugadores**.
2. **Preparación**: el participante elige una de las 10 formaciones disponibles, coloca a los titulares en sus casillas y configura la táctica (sistema defensivo, altura del bloque, estilo con balón…).
   - Un jugador fuera de sus posiciones naturales rinde mucho peor.
3. **Partido**: dos formas de verlo, con el mismo motor:
   - **Simulación rápida**: resumen al descanso, cambios y resultado final.
   - **Simulación 2D**: vista "de chapas" en tiempo real, con velocidades de x2 a x32 y cambios en vivo.
4. **Torneo**: liga (4–8 participantes, ida y vuelta), playoff (4, 8 o 16) o mixto (liga de 8 más semifinales y final).
   - Puede jugarse **en directo** o de forma **asíncrona**, con un plazo por jornada.
   - Las tarjetas y las lesiones tienen consecuencias en los partidos siguientes.

Las plazas libres se rellenan con **NPC** de cuatro niveles: amateur, intermedio, avanzado y PRO.
También se puede jugar como **invitado**, sin cuenta, contra la IA.

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [Constitución](.specify/memory/constitution.md) | Principios que rigen el diseño del juego y del código |
| [Especificación del MVP](specs/001-draft-manager-mvp/spec.md) | Historias de usuario, requisitos funcionales y criterios de éxito |
| [Plan técnico](specs/001-draft-manager-mvp/plan.md) | Arquitectura, pila tecnológica y estructura del repositorio |
| [Decisiones técnicas](specs/001-draft-manager-mvp/research.md) | Cada decisión con su razón y las alternativas descartadas |
| [Modelo de datos](specs/001-draft-manager-mvp/data-model.md) | Entidades, validaciones y estados |
| [Contratos](specs/001-draft-manager-mvp/contracts/) | API HTTP, protocolo WebSocket, motor de simulación, formato del catálogo de jugadores |
| [Quickstart](specs/001-draft-manager-mvp/quickstart.md) | Cómo levantar y validar el sistema de principio a fin |

## Pila tecnológica

- **Lenguaje**: TypeScript en un monorepo.
- **Servidor**: Node.js 22, Fastify, WebSocket.
- **Datos**: PostgreSQL 16.
- **Cliente**: React y Vite; Canvas 2D para la vista de partido.
- **Pruebas**: Vitest, fast-check, Playwright y una herramienta de equilibrado por simulación masiva de partidos.

El motor de simulación es un paquete independiente y determinista: con la misma semilla y las mismas
decisiones, un partido siempre da el mismo resultado, se vea en modo rápido o en 2D.

## Desarrollo

Este proyecto usa **pnpm** como único gestor de paquetes. npm, yarn y bun no están permitidos.

Requisitos: Node.js 22 LTS, pnpm 9 (con `corepack enable`) y Docker.

### Puesta en marcha

```bash
pnpm install
cp .env.example .env            # ajusta AUTH_SECRET
docker compose up -d            # PostgreSQL 16 y buzón de correo de pruebas (http://localhost:8025)
pnpm db:migrate
pnpm seed --file data/core.json # catálogo Core (300 jugadores ficticios)
pnpm dev                        # API en :3000 y web en http://localhost:5173
```

Con `pnpm --filter @fbd/server dev -- --fake-clock` el servidor usa un
reloj simulado que se adelanta con `POST /api/dev/reloj/avanzar { "ms": … }`: sirve para probar plazos
de turno, preparación y jornada sin esperar.

### Estructura

| Carpeta | Contenido |
|---------|-----------|
| `packages/domain` | Reglas del juego, puras y deterministas: catálogo, sobres, draft, equipo, torneo, PRNG |
| `packages/engine` | Motor de simulación de partidos (rápida y 2D, mismo motor) |
| `packages/ai` | NPC: evaluador común y niveles amateur, intermedio, avanzado y PRO |
| `packages/protocol` | Contratos HTTP y WebSocket (Zod) y esquema del catálogo |
| `apps/server` | Fastify + WebSocket, actor por partida, PostgreSQL (Drizzle), autenticación |
| `apps/web` | React + Vite; Canvas 2D para el partido |
| `tools/balance` | Equilibrado por simulación masiva (spec 001: SC-004, SC-006, SC-007, SC-010, SC-015; spec 002: SC-007, SC-008, SC-011, SC-018; spec 003: SC-001 a SC-010) |
| `tools/fixtures` | Generador del catálogo Core y semillas de escenarios de prueba |
| `tools/load` | Prueba de carga con k6 (SC-017) |

### Pruebas

| Comando | Qué ejecuta |
|---------|-------------|
| `pnpm lint` / `pnpm typecheck` | ESLint (prohíbe `Math.random` y `Date` en `domain` y `engine`) y TypeScript estricto |
| `pnpm test` | Pruebas unitarias y de propiedades (dominio, motor, IA, protocolo, servidor sin base de datos) |
| `pnpm test:integration` | Servidor con PostgreSQL real (Testcontainers; necesita Docker) |
| `pnpm test:equivalence` | Equivalencia entre simulación rápida y 2D, por trozos de ticks y «Finalizar partido» (001/SC-008, 002/SC-010) |
| `pnpm e2e` | Recorridos de principio a fin con Playwright (necesita la base de datos con el catálogo) |
| `pnpm balance --n 1000` | Comprobaciones estadísticas de partido (serie sintética) y el informe `tools/balance/salida/informe.html` |
| `pnpm balance --solo 003/SC-001,SC-004` | Solo esas comprobaciones (por id o prefijo de id) |
| `pnpm balance --serie core` / `--serie todas` | La serie con plantillas de la colección Core (003/SC-001c) o las dos series |
| `pnpm balance --torneos 100 --solo 003/SC-010` | Dificultad de los NPC frente al participante de referencia (003/SC-010, SC-010a y SC-010b) |
| `pnpm --filter @fbd/engine bench` | Coste del motor por partido, con y sin fotogramas (FR-028a) |
| `pnpm balance --torneos 100 --pro-vs-amateur` | Niveles de NPC (SC-010; tarda unos 10 minutos) |
| `k6 run tools/load/beta-100.js` | Carga de beta: 100 partidas simultáneas (ver [tools/load](tools/load/README.md)) |

Los quickstarts de la [spec 001](specs/001-draft-manager-mvp/quickstart.md), de la
[spec 002](specs/002-mejoras-mvp/quickstart.md) y de la [spec 003](specs/003-mejoras-ux-simulacion/quickstart.md) detallan los escenarios de validación manual, y [docs/despliegue.md](docs/despliegue.md) cómo construir la imagen Docker y desplegarla.

### Flujo de trabajo

El proyecto sigue *Spec-Driven Development* con [Spec Kit](https://github.com/github/spec-kit):
constitución → especificación → aclaraciones → plan → tareas → implementación. Cada funcionalidad
vive en su carpeta dentro de `specs/`.
