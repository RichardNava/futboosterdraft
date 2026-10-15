# Fútboosterdraft

Manager de fútbol online basado en un **draft de sobres de cartas de jugadores**.

Cada participante construye su plantilla eligiendo jugadores de varios sobres. Después elige
formación, once inicial y táctica, y compite en un torneo contra otros participantes o contra rivales
controlados por la IA. Un motor de simulación resuelve los partidos a partir de los atributos de los
jugadores, sus habilidades especiales y las decisiones tácticas.

> **Estado del proyecto:** en fase de especificación y diseño. Todavía no hay código. Ya están
> aprobadas la especificación funcional y el plan técnico del MVP; el siguiente paso es desglosarlo en
> tareas e implementarlo.

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

## Pila tecnológica prevista

- **Lenguaje**: TypeScript en un monorepo.
- **Servidor**: Node.js 22, Fastify, WebSocket.
- **Datos**: PostgreSQL 16.
- **Cliente**: React y Vite; Canvas 2D para la vista de partido.
- **Pruebas**: Vitest, fast-check, Playwright y una herramienta de equilibrado por simulación masiva de partidos.

El motor de simulación es un paquete independiente y determinista: con la misma semilla y las mismas
decisiones, un partido siempre da el mismo resultado, se vea en modo rápido o en 2D.

## Desarrollo

Este proyecto usa **pnpm** como único gestor de paquetes. npm, yarn y bun no están permitidos.

Requisitos: Node.js 22 LTS, pnpm 9 y Docker.

Cuando exista el código, la puesta en marcha será:

```bash
pnpm install
docker compose up -d db
pnpm db:migrate
pnpm seed --file data/core.json
pnpm dev
```

El [quickstart](specs/001-draft-manager-mvp/quickstart.md) detalla las pruebas y los escenarios de validación.

### Flujo de trabajo

El proyecto sigue *Spec-Driven Development* con [Spec Kit](https://github.com/github/spec-kit):
constitución → especificación → aclaraciones → plan → tareas → implementación. Cada funcionalidad
vive en su carpeta dentro de `specs/`.
