const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const ARCHIVO = path.join(__dirname, "data", "productos.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function leerProductos() {
  return JSON.parse(fs.readFileSync(ARCHIVO, "utf8"));
}
function guardarProductos(productos) {
  fs.writeFileSync(ARCHIVO, JSON.stringify(productos, null, 2), "utf8");
}

// READ
app.get("/api/productos", (req, res) => {
  res.json(leerProductos());
});

// CREATE
app.post("/api/productos", (req, res) => {
  const productos = leerProductos();
  const nuevo = {
    id: Date.now(),
    nombre: req.body.nombre,
    precio: Number(req.body.precio),
    stock: Number(req.body.stock)
  };
  productos.push(nuevo);
  guardarProductos(productos);
  res.status(201).json(nuevo);
});

// UPDATE
app.put("/api/productos/:id", (req, res) => {
  const id = Number(req.params.id);
  const productos = leerProductos();
  const i = productos.findIndex(p => p.id === id);

  if (i === -1) return res.status(404).send("Producto no encontrado");

  productos[i] = {
    ...productos[i],
    nombre: req.body.nombre,
    precio: Number(req.body.precio),
    stock: Number(req.body.stock)
  };
  guardarProductos(productos);
  res.json(productos[i]);
});

// DELETE
app.delete("/api/productos/:id", (req, res) => {
  const id = Number(req.params.id);
  const productos = leerProductos();
  const nuevos = productos.filter(p => p.id !== id);

  if (nuevos.length === productos.length)
    return res.status(404).send("Producto no encontrado");

  guardarProductos(nuevos);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Cloud Stock CRUD: http://localhost:${PORT}`);
});
