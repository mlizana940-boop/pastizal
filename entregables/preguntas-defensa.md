# Preguntas para la defensa

Las respuestas se basan en el repositorio revisado. Ajusten las referencias a Azure con el inventario exacto del integrante que realizó el despliegue.

## 1. ¿Qué arquitectura eligieron y cómo se representa en la solución?

Elegimos cliente-servidor. El navegador carga las páginas de cliente y administración y envía solicitudes HTTP a una API Node.js/Express. La API valida y autoriza las operaciones, aplica las reglas del negocio y accede a Cloud Firestore con Firebase Admin SDK. Firebase Authentication administra las cuentas y entrega el token que el servidor verifica en las rutas protegidas.

## 2. ¿Qué necesidad del problema justifica esa elección?

Las reservas relacionan disponibilidad, fechas, capacidad, clientes y estados. Necesitamos un punto central que aplique las mismas reglas en cada solicitud y que actualice la reserva y las noches ocupadas de manera coherente. El servidor permite centralizar esas reglas y servir a los dos tipos de usuario.

## 3. ¿Por qué es más adecuada que otra alternativa en este contexto?

El equipo ya trabaja con Node.js y Express, y las funciones necesitan reglas comunes y acceso seguro a datos. Cliente-servidor mantiene una API compartida para las vistas de cliente y administrador. MVC podría describir una forma de organizar componentes, y el backend sí usa rutas, controladores, servicios, modelos y repositorios; sin embargo, para explicar la comunicación entre navegador, API y base de datos resulta más claro cliente-servidor. Serverless también sería viable, pero requeriría adaptar el despliegue existente.

## 4. ¿Cómo se distribuyen las responsabilidades?

El navegador presenta formularios y resultados. Las rutas enlazan endpoints con controladores. Los controladores reciben datos y preparan respuestas. Los servicios aplican validaciones y reglas como disponibilidad y cambios de estado. Los modelos normalizan y validan datos de dominio. Los repositorios consultan Firestore. El middleware verifica autenticación y permisos antes de permitir acciones protegidas.

## 5. ¿Cómo viaja una solicitud desde el usuario hasta los datos y de vuelta?

El cliente elige una cabaña, fechas y huéspedes. Tras iniciar sesión, el navegador envía un POST a la API con el ID token. El middleware valida el token; el servicio valida datos, fechas y capacidad; el repositorio ejecuta una transacción que vuelve a comprobar las noches y guarda la solicitud junto con los bloqueos diarios. Express responde al navegador, que muestra el resultado. Después, el cliente consulta sus solicitudes mediante una ruta autenticada.

## 6. ¿Qué ventajas y limitaciones presenta en mantenimiento, seguridad y rendimiento?

La API centraliza reglas y permisos; la organización por capas permite ubicar el código; la transacción protege el proceso de reserva frente a conflictos entre solicitudes simultáneas. Como límites, Express se opera en una VM, las imágenes se mantienen en disco del servidor y requieren persistencia y respaldo, y Firestore requiere índices y monitoreo de uso. En seguridad, Firebase Admin SDK usa credenciales privilegiadas, por eso las rutas y credenciales deben protegerse en el servidor.

## 7. ¿Qué cambiaría si la aplicación pasara de 100 a 10.000 usuarios?

Primero mediríamos el cuello de botella. Mantendríamos la API sin estado de sesión local, ejecutaríamos varias instancias detrás de un balanceador o moveríamos la aplicación a un servicio administrado apropiado, usaríamos monitoreo y límites de consumo, revisaríamos índices y consultas de Firestore y moveríamos imágenes a almacenamiento de objetos. También automatizaríamos pruebas de concurrencia. No afirmamos haber probado ese volumen; son medidas de evolución.

## 8. ¿Qué servicios de Azure utilizaron y por qué?

La aplicación se desplegó en la máquina virtual Azure acordada por el equipo, que aloja Node.js y Express. Firestore y Firebase Authentication son servicios de Firebase/Google, no servicios Azure. El nombre exacto de la VM, el sistema operativo, el disco y otros recursos Azure debe informarlo el responsable del despliegue antes de responder. No se debe atribuir a Azure un servicio que el equipo no haya utilizado.

## 9. ¿Qué parte de la arquitectura cambiarían ante un nuevo requerimiento?

Depende del requerimiento. Para pagos, incorporaríamos una integración de pago detrás de la API y definiríamos estados de pago sin exponer credenciales al navegador. Para avisos automáticos, agregaríamos un servicio de notificaciones y eventos de cambios de estado. Para más imágenes, migraríamos el almacenamiento del disco a un servicio de objetos. Procuraríamos conservar las reglas de reserva en el backend.

## Preguntas de apoyo del equipo

**¿Por qué usan Firestore y no una tabla SQL?**  
Firestore satisface el modelo documental actual de cabañas, reservas y noches ocupadas, y el equipo ya utiliza su integración con Firebase. Una base relacional también serviría; la elección se puede revisar si aparecen consultas y relaciones que se beneficien de SQL.

**¿Cómo evitan que dos personas reserven las mismas noches?**  
El repositorio de reservas ejecuta una transacción: comprueba cada documento diario en la subcolección nochesOcupadas y crea los bloqueos junto con la reserva pendiente. Si una noche ya está ocupada, la operación responde con conflicto.

**¿Qué ocurre cuando se rechaza o cancela una solicitud?**  
La transacción que cambia el estado elimina los bloqueos asociados a esa reserva. Las noches dejan de estar ocupadas para futuras solicitudes.

**¿Dónde se guardan las imágenes?**  
Express valida imágenes JPG, PNG o WebP de hasta 3 MB y las guarda en el directorio configurado. Firestore guarda la ruta. En la VM, UPLOADS_DIR debe apuntar a almacenamiento persistente y respaldado.

**¿Qué información de usuarios guardan en Firestore?**  
Firebase Authentication mantiene las cuentas. Cada reserva conserva el UID autenticado y los datos necesarios para gestionarla. No se crea una colección aparte de sesiones activas.

**¿Están incluidas las credenciales en el repositorio?**  
Las credenciales administrativas se configuran en variables de entorno del servidor o en un archivo fuera del repositorio. El archivo .env y las cuentas de servicio están excluidos por .gitignore. La configuración web pública de Firebase no contiene la clave privada del servicio.

## Cierre sugerido

La solución cubre el flujo principal de consulta, solicitud y gestión de reservas. La arquitectura cliente-servidor mantiene las reglas en el backend y conecta las interfaces con Firestore. Reconocemos límites en la operación de la VM y el almacenamiento de imágenes, y proponemos resolverlos según presupuesto y crecimiento.
