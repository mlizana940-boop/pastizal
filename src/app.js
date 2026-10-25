const express = require("express");
const path = require("node:path");
const publicRoutes = require("./routes/public.routes");
const adminRoutes = require("./routes/admin.routes");
const { errorHandler } = require("./middleware/errorHandler");
const { uploadDirectory } = require("./config/uploadStorage");

const app = express();
const publicDirectory = path.join(__dirname, "..", "public");

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api", publicRoutes);
app.use("/api/admin", adminRoutes);
app.use("/uploads", express.static(uploadDirectory, { index: false, dotfiles: "deny" }));
app.use(express.static(publicDirectory));
app.use((req, res) => res.status(404).json({ error: "No se encontró el recurso solicitado." }));
app.use(errorHandler);

module.exports = app;
