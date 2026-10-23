# Reservas de cabañas en Chiloé

Aplicación web de reservas de cabañas en Chiloé. Cualquier visitante puede explorar cabañas y disponibilidad; para solicitar una reserva debe crear una cuenta o iniciar sesión. El personal administrador usa el mismo acceso y gestiona cabañas y solicitudes desde un panel privado.

## Arquitectura

La arquitectura principal es **cliente-servidor**:

```text
Visitante ⇄ catálogo público (HTML/CSS/JS) ⇄ API Node.js + Express ⇄ Cloud Firestore
Cliente o administrador ⇄ Firebase Authentication → token verificado por la API
```

El navegador no escribe en Firestore. La API recibe las solicitudes, valida los datos y aplica las reglas de negocio antes de usar Firebase Admin SDK. Las carpetas `controllers`, `services`, `models` y `repositories` ordenan el código del servidor; no representan una arquitectura MVC que el equipo deba presentar.

## Estructura

```text
src/
  app.js
  server.js
  config/firebaseAdmin.js
  routes/
  controllers/
  services/
  models/
  repositories/
  middleware/
  utils/
public/
  admin/
  cliente/
  css/
```

La vista `/` y `/cliente/` permite explorar cabañas sin iniciar sesión. El acceso compartido está en `/cuenta.html`; solicitar una reserva requiere una cuenta. El enlace de administración conduce al mismo acceso y el servidor autoriza el panel solo a administradores.

## Requisitos locales

- Node.js 22 o superior.
- Un proyecto de Firebase con Cloud Firestore y Authentication.
- Una cuenta de servicio de Firebase para la API. No guardes ese archivo en el repositorio.

Instala dependencias y copia `.env.example` a `.env`:

```powershell
npm install
Copy-Item .env.example .env
```

Completa `FIREBASE_PROJECT_ID` y configura credenciales de servidor. En desarrollo puedes usar `GOOGLE_APPLICATION_CREDENTIALS` apuntando a un archivo de cuenta de servicio guardado fuera del repositorio, o definir `FIREBASE_SERVICE_ACCOUNT_JSON` en `.env`. En el servicio Azure, configura la credencial como variable de entorno protegida del servicio.

En Firebase Authentication habilita el proveedor de correo y contraseña y crea la cuenta de administración. Copia su UID en `FIREBASE_ADMIN_UIDS`; para varios administradores, separa los UID con comas. Configura también la aplicación web en `public/admin/firebase-config.js`. Ese archivo solo contiene la configuración cliente de Firebase; nunca pongas allí la clave privada de la cuenta de servicio.

Inicia la aplicación:

```powershell
npm run dev
```

Abre `http://localhost:3000`. La API responde en el mismo origen; `GET /api/health` sirve como comprobación básica del servidor.

## Datos en Firestore

- `cabanas`: nombre, descripción, precio por noche, capacidad, comodidades y estado.
- `reservas`: cabaña, datos de contacto del cliente, fechas, huéspedes, total estimado y estado.
- `cabanas/{cabanaId}/nochesOcupadas/{AAAA-MM-DD}`: bloqueo de cada noche de una reserva pendiente o confirmada.

La solicitud valida fechas, contacto, capacidad y disponibilidad. Las noches se bloquean junto con la reserva en una transacción. Las reservas pendientes bloquean fechas hasta que administración las confirme, rechace o cancele. Una cabaña se desactiva de forma lógica para conservar el historial.

El archivo `firestore.rules` deniega acceso directo desde clientes web. La API usa Firebase Admin SDK, que opera con credenciales de servidor; por eso la autorización de administrador se verifica en Express. Puedes desplegar las reglas con Firebase CLI después de seleccionar el proyecto correspondiente:

```powershell
firebase deploy --only firestore:rules
```

## API

### Rutas públicas

- `GET /api/cabanas`: lista cabañas activas; acepta `fechaEntrada`, `fechaSalida` y `huespedes` para filtrar por disponibilidad y capacidad.

### Rutas que requieren iniciar sesión

- `POST /api/reservas`: registra una solicitud pendiente y valida disponibilidad. Requiere Firebase ID token en `Authorization: Bearer <token>`; el correo y UID del cliente se obtienen de la sesión validada.

### Rutas de administrador

Todas requieren un Firebase ID token en `Authorization: Bearer <token>` y una cuenta autorizada por UID en `FIREBASE_ADMIN_UIDS` o por la custom claim `admin: true`.

- `GET /api/admin/session`
- `GET /api/admin/cabanas`
- `POST /api/admin/cabanas`
- `PUT /api/admin/cabanas/:id`
- `DELETE /api/admin/cabanas/:id`: desactiva la cabaña.
- `GET /api/admin/reservas?estado=pendiente`
- `PATCH /api/admin/reservas/:id/estado` con `estado`: `confirmada`, `rechazada` o `cancelada`.

Los estados permitidos son `pendiente`, `confirmada`, `rechazada` y `cancelada`. Rechazar o cancelar libera las noches; una reserva confirmada también puede cancelarse.

## Seguridad

- No subas `.env`, cuentas de servicio, contraseñas ni tokens.
- La API devuelve un error genérico ante fallos internos y mantiene los datos privados de clientes detrás de autenticación administrativa.
- Las reglas de Firestore no sustituyen la autorización de Express cuando se usa Firebase Admin SDK.
