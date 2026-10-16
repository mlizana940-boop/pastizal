# CLOUD STOCK CRUD — Guía docente

## Qué significa CRUD
- C = Create = Crear
- R = Read = Leer / listar
- U = Update = Actualizar
- D = Delete = Eliminar

El objetivo es usar la MISMA interfaz de productos y cambiar únicamente dónde viven los datos.

---

# 1. Preparación en Visual Studio Code

## Requisito
Instalar Node.js.

Abrir esta carpeta con Visual Studio Code.

Abrir Terminal > New Terminal y ejecutar:

    npm install

Después:

    npm start

Abrir:

    http://localhost:3000

IMPORTANTE:
Para esta versión conviene usar Node/Express para todo el proyecto.
No necesitas Live Server.

---

# 2. CRUD LocalStorage

Archivo:
public/html/crud_localstorage.html

No necesita configuración.

Métodos importantes:
- CREATE: array.push() + localStorage.setItem()
- READ: localStorage.getItem()
- UPDATE: findIndex() + reemplazo
- DELETE: filter()

Experimento:
1. Agregar producto.
2. Recargar.
3. Sigue existiendo.
4. Abrir otro navegador.
5. Los datos no aparecen.

Conclusión:
Los datos están en el navegador, no en una nube compartida.

---

# 3. CRUD JSON + Node.js

Archivos:
- public/html/crud_json.html
- server.js
- data/productos.json

El navegador NO puede sobrescribir directamente productos.json.
Por eso Node.js crea una API.

Rutas:
GET    /api/productos        READ
POST   /api/productos        CREATE
PUT    /api/productos/:id    UPDATE
DELETE /api/productos/:id    DELETE

Experimento:
Agregar un producto desde el navegador y después abrir:
data/productos.json

Verás que el archivo realmente cambió.

Arquitectura:
HTML -> fetch() -> Express -> productos.json

---

# 4. CRUD Google Sheets

## Crear la hoja
Crear un Google Sheet.

Renombrar la pestaña:
Productos

Fila 1:
id | nombre | precio | stock

Ejemplo:
1 | Notebook | 599990 | 8

## Apps Script
En Google Sheets:
Extensiones > Apps Script

Copiar el contenido de:
apps_script/Code.gs

Guardar.

Luego:
Implementar > Nueva implementación > Aplicación web

Ejecutar como:
Yo

Acceso:
Para una clase de laboratorio, configura un acceso que permita que los estudiantes puedan usar la URL según las políticas de tu cuenta/institución.

Copiar la URL terminada en:
/exec

Pegar esa URL en:
crud_sheets.html

La página la guarda en LocalStorage para no tener que pegarla en cada recarga.

Arquitectura:
HTML -> fetch() -> Apps Script -> Google Sheets

---

# 5. CRUD Firebase Firestore

Archivo:
public/html/crud_firebase.html

## Firebase
1. Entrar a Firebase Console.
2. Crear proyecto.
3. Crear una aplicación Web.
4. Crear Firestore Database.
5. Copiar firebaseConfig.
6. Reemplazar los valores REEMPLAZAR en crud_firebase.html.

Colección:
productos

Campos:
nombre  string
precio  number
stock   number

La página puede crear la colección automáticamente al agregar el primer documento.

Funciones usadas:
CREATE -> addDoc()
READ   -> getDocs()
UPDATE -> updateDoc()
DELETE -> deleteDoc()

IMPORTANTE:
No dejes Firestore abierto públicamente en una aplicación real.
Para enseñanza puedes usar reglas temporales controladas y luego enseñar Authentication + Security Rules.

---

# Comparación final

LocalStorage
HTML/JS -> navegador

JSON
HTML/JS -> API Node -> archivo JSON

Google Sheets
HTML/JS -> Internet -> Apps Script -> Sheet

Firebase
HTML/JS -> Internet -> Cloud Firestore

---

# Actividad sugerida

Cada estudiante debe:
1. Crear "Teclado mecánico", precio 39990, stock 10.
2. Listarlo.
3. Cambiar stock de 10 a 7.
4. Eliminarlo.
5. Repetir el proceso en las cuatro tecnologías.

Luego responder:

1. ¿Dónde vive el dato?
2. ¿Necesita Internet?
3. ¿Puede otro computador ver el mismo dato?
4. ¿Qué componente hace de backend?
5. ¿Cuál opción sería más apropiada para una aplicación multiusuario?
