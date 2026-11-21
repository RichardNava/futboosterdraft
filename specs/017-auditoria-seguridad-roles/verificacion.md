# Verificación de seguridad

Generado por `pnpm seguridad`. Cada fila es un ataque que se repite contra el sistema.

**128 de 128 ataques bloqueados.**

| Ataque | Hallazgo | Resultado |
|---|---|---|
| leer el resumen de una partida ajena en torneo | SEG-007 | Bloqueado |
| la sala de una partida abierta sigue visible para poder unirse | SEG-007 | Bloqueado |
| leer la sala de la partida de un invitado, que no admite a nadie más | SEG-007 | Bloqueado |
| usar cada ruta de partida y partido sin sesión | SEG-000 | Bloqueado |
| usar cada ruta de partida y partido con una cuenta ajena | SEG-000 | Bloqueado |
| marcar como leído el aviso de otra cuenta | SEG-000 | Bloqueado |
| abrir el canal en tiempo real de una partida ajena | SEG-000 | Bloqueado |
| usar la API interna de autenticación | SEG-004 | Bloqueado |
| leer el token de sesión en la respuesta de login y registro | SEG-025 | Bloqueado |
| guardar la dirección IP en la sesión | SEG-027 | Bloqueado |
| el registro no acepta un correo ya usado y no revela nada más | SEG-028 | Bloqueado |
| distinguir por la respuesta o el tiempo si un correo tiene cuenta al recuperar | SEG-029 | Bloqueado |
| distinguir por la respuesta si un correo tiene cuenta al entrar | SEG-029 | Bloqueado |
| eliminar una cuenta con pase premium | SEG-017 | Bloqueado |
| un invitado reclama el correo de una cuenta existente | SEG-000 | Bloqueado |
| reutilizar un enlace de recuperación o usarlo caducado | SEG-000 | Bloqueado |
| desplegar nodemailer con una versión vulnerable | SEG-008 | Bloqueado |
| desplegar @fastify/static con una versión vulnerable | SEG-008 | Bloqueado |
| desplegar zod con una versión vulnerable | SEG-008 | Bloqueado |
| incluir herramientas de pruebas en las dependencias de producción | SEG-009 | Bloqueado |
| usar undici con una versión vulnerable en desarrollo | SEG-031 | Bloqueado |
| usar @fastify/busboy con una versión vulnerable en desarrollo | SEG-031 | Bloqueado |
| usar vitest con una versión vulnerable en desarrollo | SEG-031 | Bloqueado |
| comprar en euros un cosmético, un pack y el pase sin pagar | SEG-002 | Bloqueado |
| la tienda indica que el pago en euros no está disponible | SEG-002 | Bloqueado |
| las compras con fragmentos siguen funcionando | SEG-002 | Bloqueado |
| lanzar 50 compras iguales a la vez | SEG-000 | Bloqueado |
| lanzar 50 compras distintas sin saldo para todas | SEG-000 | Bloqueado |
| reutilizar el idCompra de otra cuenta | SEG-000 | Bloqueado |
| manipular el precio o la moneda | SEG-000 | Bloqueado |
| la configuración correcta arranca | SEG-021 | Bloqueado |
| arrancar sin AUTH_SECRET | SEG-021 | Bloqueado |
| arrancar con AUTH_SECRET corto | SEG-021 | Bloqueado |
| arrancar con el AUTH_SECRET de ejemplo | SEG-021 | Bloqueado |
| arrancar sin PUBLIC_URL | SEG-021 | Bloqueado |
| arrancar con PUBLIC_URL sin HTTPS | SEG-021 | Bloqueado |
| arrancar sin DATABASE_URL | SEG-021 | Bloqueado |
| arrancar con la credencial de ejemplo | SEG-021 | Bloqueado |
| arrancar sin PROXIES_CONFIANZA | SEG-021 | Bloqueado |
| arrancar con PROXIES_CONFIANZA negativo | SEG-021 | Bloqueado |
| arrancar con PROXIES_CONFIANZA no entero | SEG-021 | Bloqueado |
| arrancar con METRICAS_TOKEN corto | SEG-021 | Bloqueado |
| arrancar con LIMITES_DESACTIVADOS | SEG-021 | Bloqueado |
| poner "<img src=x onerror=1>" como nombre de equipo en la partida y en el perfil | SEG-026 | Bloqueado |
| poner "<script>x</script>" como nombre de equipo en la partida y en el perfil | SEG-026 | Bloqueado |
| poner "ab\u0000cd" como nombre de equipo en la partida y en el perfil | SEG-026 | Bloqueado |
| poner "ab\u0007cd" como nombre de equipo en la partida y en el perfil | SEG-026 | Bloqueado |
| poner "ab‮cd" como nombre de equipo en la partida y en el perfil | SEG-026 | Bloqueado |
| poner "ab⁦cd" como nombre de equipo en la partida y en el perfil | SEG-026 | Bloqueado |
| registrarse con el apodo "<img src=x onerror=1>" | SEG-026 | Bloqueado |
| registrarse con el apodo "<script>x</script>" | SEG-026 | Bloqueado |
| registrarse con el apodo "ab\u0000cd" | SEG-026 | Bloqueado |
| registrarse con el apodo "ab\u0007cd" | SEG-026 | Bloqueado |
| registrarse con el apodo "ab‮cd" | SEG-026 | Bloqueado |
| registrarse con el apodo "ab⁦cd" | SEG-026 | Bloqueado |
| los nombres con acentos y emojis siguen siendo válidos | SEG-026 | Bloqueado |
| inyectar '%20OR%201=1-- en un identificador | SEG-000 | Bloqueado |
| inyectar 1;DROP%20TABLE%20usuarios en un identificador | SEG-000 | Bloqueado |
| inyectar %00 en un identificador | SEG-000 | Bloqueado |
| inyectar ..%2F..%2Fetc en un identificador | SEG-000 | Bloqueado |
| inyectar cabeceras de correo al registrarse o recuperar | SEG-000 | Bloqueado |
| falsificar Host para que el enlace de recuperación apunte a otra web | SEG-000 | Bloqueado |
| llenar la base de datos con claves desde rutas inexistentes y sin sesión | SEG-001 | Bloqueado |
| enviar una clave de más de 128 caracteres con sesión | SEG-001 | Bloqueado |
| las filas de más de 7 días se purgan | SEG-001 | Bloqueado |
| repetir sin sesión la clave de un login ajeno | SEG-005 | Bloqueado |
| repetir desde otra cuenta o sin sesión la clave de una acción ajena | SEG-005 | Bloqueado |
| la misma cuenta y clave sí recibe su respuesta guardada | SEG-005 | Bloqueado |
| gastar por adelantado la clave con una petición sin sesión | SEG-020 | Bloqueado |
| un error 4xx no consume la clave | SEG-020 | Bloqueado |
| un mensaje mal formado o de otro participante gasta el requestId | SEG-020 | Bloqueado |
| elegir una carta del sobre de otro participante | SEG-000 | Bloqueado |
| elegir una carta inexistente | SEG-000 | Bloqueado |
| elegir con una ronda o un turno falsos | SEG-000 | Bloqueado |
| elegir dos veces en el mismo turno | SEG-000 | Bloqueado |
| ver en los mensajes qué ha elegido otro participante | SEG-000 | Bloqueado |
| probar 100 contraseñas cambiando la cookie y X-Forwarded-For | SEG-003 | Bloqueado |
| repartir 105 fallos contra una cuenta entre muchas direcciones | SEG-003 | Bloqueado |
| el bloqueo por fallos responde igual exista o no la cuenta | SEG-003 | Bloqueado |
| bloquear una cuenta ajena no impide recuperarla | SEG-003 | Bloqueado |
| agotar los fallos de login de una cuenta desde un solo cliente | SEG-032 | Bloqueado |
| impedir entrar a otra persona con 25 fallos desde otras direcciones | SEG-032 | Bloqueado |
| gastar desde un cliente los enlaces de recuperación de otra persona | SEG-032 | Bloqueado |
| probar 5 contraseñas seguidas sin que la persona se entere | SEG-032 | Bloqueado |
| inundar de avisos el correo de otra persona | SEG-032 | Bloqueado |
| descubrir por el aviso si un correo tiene cuenta | SEG-032 | Bloqueado |
| un acierto reinicia los fallos seguidos y no se avisa | SEG-032 | Bloqueado |
| hacer crecer el limitador rotando direcciones | SEG-022 | Bloqueado |
| saturar la API con cookies inventadas o sin cookie | SEG-013 | Bloqueado |
| superar el cupo de una sesión real | SEG-013 | Bloqueado |
| agotar la recuperación de otro cliente detrás del proxy | SEG-014 | Bloqueado |
| falsificar la primera dirección de X-Forwarded-For | SEG-014 | Bloqueado |
| rotar direcciones IPv6 dentro de un mismo /64 | SEG-014 | Bloqueado |
| pedir muchos enlaces para un mismo correo desde varias direcciones | SEG-014 | Bloqueado |
| crear cuentas en bucle desde el mismo cliente | SEG-015 | Bloqueado |
| crear invitados en bucle desde el mismo cliente | SEG-015 | Bloqueado |
| un invitado crea más de 3 partidas | SEG-016 | Bloqueado |
| una cuenta lanza 15 creaciones simultáneas | SEG-016 | Bloqueado |
| colgar el servidor con más creaciones simultáneas que conexiones a la base de datos | SEG-016 | Bloqueado |
| unirse a otra partida con el tope alcanzado, y la plaza se libera al abandonar | SEG-016 | Bloqueado |
| los buscadores pueden leer la portada y sus recursos | SEG-023 | Bloqueado |
| un buscador rastrea /api/ | SEG-023 | Bloqueado |
| un buscador rastrea /api/partidas | SEG-023 | Bloqueado |
| un buscador rastrea /ws | SEG-023 | Bloqueado |
| un buscador rastrea /metrics | SEG-023 | Bloqueado |
| un buscador rastrea /healthz | SEG-023 | Bloqueado |
| un buscador rastrea /admin | SEG-023 | Bloqueado |
| un buscador rastrea /partidas/x/draft | SEG-023 | Bloqueado |
| un buscador rastrea /?restablecer=x | SEG-023 | Bloqueado |
| un buscador rastrea /ruta-futura | SEG-023 | Bloqueado |
| seguir conectado tras cerrar sesión | SEG-006 | Bloqueado |
| seguir conectado tras restablecer la contraseña | SEG-006 | Bloqueado |
| seguir conectado con la sesión caducada | SEG-006 | Bloqueado |
| seguir conectado tras eliminar la cuenta | SEG-006 | Bloqueado |
| seguir conectado con la sesión retirada desde otro proceso | SEG-006 | Bloqueado |
| la revisión no cierra una sesión vigente | SEG-006 | Bloqueado |
| pedir / sin las protecciones del navegador | SEG-011 | Bloqueado |
| pedir /api/catalogo/formaciones sin las protecciones del navegador | SEG-011 | Bloqueado |
| pedir /api/no-existe sin las protecciones del navegador | SEG-011 | Bloqueado |
| pedir /healthz sin las protecciones del navegador | SEG-011 | Bloqueado |
| cambiar datos desde otro sitio con la sesión de la víctima | SEG-019 | Bloqueado |
| leer las métricas sin token o con uno incorrecto | SEG-010 | Bloqueado |
| deducir el estado de la base de datos por /healthz | SEG-024 | Bloqueado |
| pedir rutas inexistentes y reflejar datos de la petición | SEG-023 | Bloqueado |
| usar las rutas de desarrollo en producción | SEG-023 | Bloqueado |
| dejar tokens, contraseñas, cookies o query strings en los registros | SEG-012 | Bloqueado |
| guardar la dirección IP en el registro de peticiones | SEG-027 | Bloqueado |
| dejar el correo del destinatario en el registro de un error SMTP | SEG-018 | Bloqueado |
