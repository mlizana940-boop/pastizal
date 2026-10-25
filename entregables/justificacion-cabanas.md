# Justificación de la solución de reservas de cabañas

## Problema

La gestión de una reserva reúne información relacionada: la cabaña, su capacidad, las fechas solicitadas, la disponibilidad, los datos del cliente y el estado de la solicitud. Si esos datos se mantienen en registros o conversaciones separados, cuesta saber cuál está vigente y dar seguimiento de manera consistente. Esto puede retrasar respuestas, dejar solicitudes sin gestionar o generar confusión respecto de las noches disponibles.

El problema central que aborda el proyecto es la falta de un proceso único que conecte el catálogo de cabañas con la disponibilidad, los clientes y el estado de cada reserva. La aplicación busca ordenar ese recorrido para clientes y administradores.

## Objetivo y alcance

El MVP permite consultar cabañas, filtrar por fechas y cantidad de huéspedes, crear una cuenta e iniciar sesión, enviar una solicitud y consultar su estado. El panel de administración permite mantener las cabañas y gestionar solicitudes. No se incorpora pago en línea.

## Requerimientos

### Funcionales

1. Publicar cabañas activas con descripción, capacidad, precio, comodidades e imagen.
2. Permitir buscar disponibilidad por fechas y número de huéspedes.
3. Solicitar una reserva con cuenta autenticada, datos de contacto, fechas y cantidad de huéspedes.
4. Mostrar al cliente sus solicitudes y estados.
5. Permitir al administrador crear, consultar, editar y eliminar cabañas, y cambiar el estado de las reservas.
6. Cargar una imagen de cabaña desde el panel de administración.
7. Persistir cabañas, reservas y noches ocupadas.

### No funcionales

- Validar datos tanto en la interfaz como en el servidor.
- Restringir operaciones administrativas a cuentas autorizadas.
- Evitar que dos reservas activas ocupen las mismas noches de una cabaña.
- Mantener una interfaz adaptable y mensajes claros ante errores.
- No exponer credenciales de servidor en archivos públicos o en el repositorio.

## Alternativas consideradas

**Cliente-servidor.** El navegador presenta las vistas y envía solicitudes a una API central. El servidor aplica validaciones y reglas, autoriza operaciones y accede a la persistencia. Es la alternativa escogida para explicar la arquitectura principal.

**MVC.** Puede ordenar una aplicación al separar vista, controlador y modelo, pero no es necesario presentar MVC como arquitectura principal. El repositorio ya separa el código del servidor en rutas, controladores, servicios, modelos y repositorios. Esas capas internas son compatibles con cliente-servidor y pueden evolucionar sin cambiar la decisión principal.

**Arquitectura por capas.** También es complementaria: en el backend ayuda a separar la recepción de solicitudes, las reglas y el acceso a datos. El código actual usa esa organización interna en buena parte del flujo.

**Serverless.** Podría reducir la administración de servidores y ejecutar funciones bajo demanda, pero implicaría adaptar el backend y el despliegue. El equipo mantiene una API Express desplegada en una máquina virtual y no necesita cambiar a ese modelo para cumplir el flujo del MVP.

**Acceso directo del navegador a Firestore.** Simplificaría algunas llamadas, pero dejaría reglas de negocio y autorización distribuidas entre el cliente y las reglas de base de datos. El equipo centraliza las operaciones en Express para validar reservas, comprobar roles y gestionar transacciones desde un punto común.

## Elección y representación

Se escogió **cliente-servidor** porque el proyecto tiene dos tipos de usuarios, varias operaciones con reglas de negocio y datos que deben mantenerse coherentes. El cliente es el navegador, que carga páginas públicas o de administración y llama a la API Node.js/Express. Firebase Authentication administra las cuentas; el navegador envía un ID token en las solicitudes protegidas y Express lo verifica. El servidor usa Firebase Admin SDK para leer y escribir en Cloud Firestore.

Las carpetas del servidor separan responsabilidades: las rutas describen los endpoints, los controladores coordinan entrada y respuesta, los servicios aplican reglas, los modelos validan y normalizan datos, y los repositorios consultan Firestore. Esta organización por capas es una forma de implementar el backend; la arquitectura general que se presenta es cliente-servidor.

## Recorrido de una reserva

1. El visitante consulta el catálogo y, si quiere reservar, selecciona fechas y huéspedes.
2. Si no inició sesión, crea una cuenta e inicia sesión. El navegador conserva la selección durante ese paso.
3. El navegador envía la solicitud a Express con el token de Firebase Authentication.
4. El servidor valida los datos, las fechas, la capacidad y el estado de la cabaña.
5. Una transacción de Firestore vuelve a comprobar las noches y crea la reserva pendiente junto con sus bloqueos diarios.
6. El cliente consulta la reserva en “Mis reservas”. El administrador revisa y confirma, rechaza o cancela; al rechazar o cancelar se liberan las noches.

## Ventajas

- La interfaz puede cambiar sin trasladar las reglas de reserva al navegador.
- Las validaciones del servidor y la autorización se aplican antes de modificar los datos.
- Una transacción agrupa la creación de la solicitud y el bloqueo de las noches, reduciendo el riesgo de sobreventa concurrente.
- Firebase Authentication evita guardar contraseñas de usuarios en una colección propia.
- Firestore ofrece persistencia centralizada y las consultas de reservas están paginadas.
- La estructura interna del código permite ubicar y mantener las reglas del negocio y el acceso a datos.

## Limitaciones

- Express se ejecuta como una aplicación central en una VM; el equipo administra su proceso, configuración, actualización y monitoreo.
- Los datos están en Firestore, pero las imágenes se guardan en el disco del servidor. En Azure, el directorio configurado mediante UPLOADS_DIR debe residir en almacenamiento persistente y contar con respaldo; de lo contrario, una recreación de la VM podría perder imágenes.
- Las consultas de Firestore dependen de índices y de los límites y costos vigentes del servicio.
- Las solicitudes pendientes bloquean las noches hasta que el administrador las gestione. El panel avisa cuando hay pendientes con más de 24 horas, pero no las cancela automáticamente.
- El MVP no incluye pagos, notificaciones automáticas al cliente ni administración de roles desde una interfaz.

## Mejoras propuestas

1. Migrar las imágenes a almacenamiento de objetos con respaldo y acceso controlado cuando el presupuesto y la arquitectura de despliegue lo permitan.
2. Definir una política de expiración para solicitudes pendientes y avisar al cliente y al administrador sobre cambios de estado.
3. Añadir pruebas automatizadas para validaciones, transiciones de estado y concurrencia de reservas.
4. Incorporar métricas, registros y alertas de disponibilidad de la aplicación.
5. Revisar el escalamiento y el balanceo si aumenta el número de usuarios; mantener Firestore y desplegar varias instancias sin sesiones locales.
6. Evaluar pagos en línea solo cuando el alcance del producto lo requiera.

## Conclusión

Cliente-servidor se ajusta al MVP porque separa la interfaz de un backend que concentra reglas, autenticación, permisos y persistencia. La arquitectura resuelve el flujo principal y deja puntos de evolución claros. Antes de cerrar la entrega se debe añadir el inventario exacto de recursos Azure y confirmar la persistencia y respaldo del disco usado para imágenes.
