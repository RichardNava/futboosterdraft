# Investigación — Derechos de imagen de futbolistas (spec 011, apartado 0)

**Fecha**: 2026-11-04 · **Estado**: base para la decisión de la Q1 de [spec.md](spec.md) (se cierra en `/speckit-clarify`)

> **Aviso**: esto es una investigación técnica de producto, no asesoramiento jurídico. Antes de abrir la beta con
> monetización conviene una consulta con un abogado de derecho deportivo o de propiedad intelectual (una consulta
> puntual cuesta poco en comparación con el riesgo que se evalúa aquí).

## 1. Qué protege la ley (España, donde reside el desarrollador)

- **Ley Orgánica 1/1982**, art. 7.6: es intromisión ilegítima «la utilización del nombre, de la voz o de la imagen de
  una persona para fines publicitarios, comerciales o de naturaleza análoga». Protege **el nombre**, no solo la cara:
  quitar las fotos y dejar los nombres reales no elimina el riesgo si el producto es comercial.
- **Fallecidos** (art. 4): defienden la memoria y la imagen las personas designadas en testamento o, en su defecto,
  los familiares; sin ellos, el Ministerio Fiscal, hasta 80 años después de la muerte. En la práctica, una leyenda
  fallecida (Maradona, Cruyff, Di Stéfano, Eusébio…) sigue protegida y **sus herederos son más imprevisibles** que un
  sindicato: negocian uno a uno y han demandado (Maradona contra Konami por PES 2017, que acabó en acuerdo).
- **Indemnización**: daño moral más el beneficio obtenido por el infractor. El Supremo confirmó 20.000 € a los
  herederos de un cantante por una sola foto usada contra su voluntad; con 300 jugadores la exposición se multiplica.
- **Otros países**: los jugadores reclaman donde viven. En Brasil más de 20 futbolistas ganaron indemnizaciones a
  editoras de videojuegos y había unas 80 demandas más. En EE. UU. los datos y estadísticas tienen más protección
  (casos de *fantasy sports*), pero el juego se publica en la web, para todo el mundo.

## 2. Cómo se licencia

- **FIFPRO** agrupa los derechos colectivos de imagen de jugadores en activo a través de los sindicatos de unos 60
  países y sí licencia a estudios pequeños: Sociable Soccer (Tower Studios), Soccer Manager (Invincibles Studio) y
  Soccerverse tienen licencia. No publica tarifas; la cifra de 50.000–300.000 € de la investigación previa no se ha
  podido verificar, y es razonable que haya fórmulas por porcentaje para indies, como pregunta el correo enviado.
- **Límites de la licencia FIFPRO**: cubre jugadores **en activo** de sindicatos afiliados. No cubre leyendas
  retiradas (negociación individual), ni escudos ni nombres de clubes, ligas o selecciones (licencias aparte), y ha
  sido discutida por agentes (Raiola, Ibrahimović, 2020). Hay noticias sin confirmar de que la AFE española habría
  salido de FIFPRO; si fuera así, los jugadores de LaLiga necesitarían otra vía.
- **Consecuencia para el catálogo actual**: Core mezcla activos y leyendas (GOAT y Legendarias). Aunque FIFPRO
  aceptara, **las leyendas quedarían fuera**, y son el principal reclamo de las rarezas altas.

## 3. Riesgos que no son FIFPRO (y suelen llegar antes)

1. **Derechos de autor de los retratos**. Si los 250 retratos de la 008 salen de fotografías de internet (aunque se
   hayan recortado o retocado), el riesgo es del fotógrafo o de la agencia, no del jugador. Las agencias (Getty y
   otras) rastrean la web de forma automática y envían reclamaciones con importe a sitios pequeños. Es **el riesgo más
   probable a corto plazo**. Si los retratos son ilustraciones generadas o propias, este riesgo baja (pero se
   mantiene el de imagen).
2. **Pasarelas de pago y tiendas de aplicaciones**: pueden cerrar la cuenta ante una reclamación de derechos, con
   independencia de que llegue o no la demanda. Esto afecta a cualquier monetización (0.3 incluida).
3. **Escudos y marcas**: los escudos de selecciones ya están desactivados (006/T087). Los escudos nuevos de esta spec
   son propios, pero hay que revisar que ninguno se parezca a un escudo real (p. ej. «león con corona», «águila con
   estrella»).
4. **«Cese y desista» primero** es lo habitual, pero no está garantizado, y lo recibido hasta ese momento puede
   reclamarse igualmente: el aviso no borra lo ya facturado.

## 4. Evaluación de las propuestas

| Opción | Riesgo legal | Atractivo | Coste | Comentario |
|---|---|---|---|---|
| **0.1** Seguir igual (reales + venta de cartas) | Alto y creciente | Máximo | Nulo | Vender sobres de jugadores reales es explotación comercial directa del nombre y la imagen. Solo viable con un plan B listo para activarse en horas. |
| **0.2** Nombres y caras «parecidos» (estilo PES) | Medio | Alto | Medio-alto (arte de 300 cartas) | Si el parecido es evidente sigue siendo uso de la imagen; Konami lo combinaba con licencias parciales. Mejor como **plan B** que como plan A. |
| **0.3** Reales, monetización no ligada a cartas | Medio | Máximo | Bajo | Reduce el riesgo pero no lo elimina: el art. 7.6 habla de fines comerciales y el atractivo del producto que se monetiza sigue siendo el jugador real. Los cosméticos propios (escudos, sobres) son lo más defendible. |
| **0.4** Jugadores totalmente inventados | Muy bajo | Bajo sin un universo propio | Alto (arte + narrativa) | La webserie es otro proyecto. Viable a largo plazo si el universo crece solo (historias de las cartas, 006). |
| **0.5** (nueva) Juego ficticio + **editor local** de nombres | Bajo para el juego | Alto para quien lo use | Medio | Modelo de los *option files* de PES: el juego se publica con identidades ficticias y cada persona puede renombrar las cartas solo en su navegador, sin que el servidor guarde ni reparta esos datos. No se puede ofrecer un fichero «real» descargable desde el juego. |
| **0.6** (nueva) Licencia FIFPRO solo de activos | Bajo para activos | Alto | Depende de su respuesta | Requiere sustituir o quitar las leyendas; pendiente del correo. |

## 5. Recomendación

Un camino por fases que no cierra ninguna puerta:

1. **Ya (esta spec)**: la monetización con dinero real pasa a ser **solo cosmética y propia** (escudos y sobres
   diseñados para el juego). Las cartas y colecciones dejan de venderse con dinero real; se siguen obteniendo jugando
   y con fragmentos ganados jugando. Esto respeta además el Principio VII sin matices.
2. **Ya (esta spec)**: **capa de identidad** en las cartas. Cada carta tiene su identidad real y una identidad
   alternativa (nombre y retrato), y un único ajuste del servicio decide cuál se muestra, sin tocar stats ni
   resultados. Es el plan B para un «cese y desista»: cambiar en horas, no reescribir el catálogo. Las identidades
   alternativas pueden rellenarse poco a poco (empezando por las leyendas fallecidas, que son las de más riesgo).
3. **Antes de la beta abierta**: aclarar el origen de los retratos (punto 3.1) y hacer la consulta legal.
4. **Si FIFPRO responde con una fórmula indie**: licenciar activos (0.6) y mantener las leyendas con identidad
   alternativa hasta negociarlas una a una.

## Fuentes

- [BOE — Ley Orgánica 1/1982 (texto consolidado)](https://www.boe.es/buscar/pdf/1982/BOE-A-1982-11196-consolidado.pdf)
- [Poder Judicial — El Supremo confirma la intromisión en la imagen de un cantante fallecido](https://www.poderjudicial.es/cgpj/es/Poder-Judicial/Tribunal-Supremo/Oficina-de-Comunicacion/Archivo-de-notas-de-prensa/El-Tribunal-Supremo-confirma-la-intromision-en-la-imagen-de-un-cantante-fallecido-por-el-uso-de-una-foto-suya-en-un-festival-de-musica-contra-la-voluntad-expresa-de-sus-herederos)
- [Cuatrecasas — Intromisión en el derecho a la propia imagen de un artista fallecido](https://www.cuatrecasas.com/es/spain/propiedad-intelectual/art/espana-intromision-en-el-derecho-a-la-propia-imagen-de-un-artista-fallecido)
- [Maldita — Cómo se gestionan los derechos de imagen de una persona fallecida](https://maldita.es/malditateexplica/20210122/gestion-derechos-de-imagen-fallecido/)
- [GamesIndustry — Sociable Soccer consigue la licencia de FIFPRO](https://dcmpx.remotevs.com/biz/gamesindustry/www/SL/sociable-soccers-jon-hare-says-real-player-names-are-vital-as-studio-secures-fifpro-licence)
- [Invincibles Studio — Licencias FIFPRO](https://www.invinciblesstudio.com/?p=662)
- [Decrypt — Soccerverse obtiene la licencia de FIFPRO](https://decrypt.co/351814)
- [Push Square — Disputa de derechos en FIFA 21 (Ibrahimović, Raiola)](https://pushsquare.com/news/2020/11/fifa_21_rights_row_rumbles_on_as_fifpro_agents_weigh_in)
- [PC Gamer — Maradona contra Konami por PES 2017](https://pcgamer.com/footballer-diego-maradona-plans-legal-action-over-pes-2017-likeness)
- [SBS — Futbolistas en Brasil demandan por derechos de imagen en videojuegos](https://www.sbs.com.au/news/article/brazilian-club-players-sue-over-video-game-image-rights/eai9g9ywe)
- [SoccerGaming — ¿Podrían desaparecer los jugadores españoles de los juegos? (AFE y FIFPRO, sin confirmar)](https://soccergaming.com/could-spanish-players-be-removed-from-ea-sports-fc-efootball-and-other-football-games/)
