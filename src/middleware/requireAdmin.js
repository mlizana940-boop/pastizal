const { auth } = require("../config/firebaseAdmin");

const allowedUids = new Set(
  (process.env.FIREBASE_ADMIN_UIDS || "").split(",").map((uid) => uid.trim()).filter(Boolean)
);

async function requireAdmin(req, res, next) {
  const match = /^Bearer\s+(.+)$/i.exec(req.get("authorization") || "");
  if (!match) return res.status(401).json({ error: "Inicia sesión para continuar." });

  try {
    const decodedToken = await auth.verifyIdToken(match[1]);
    if (decodedToken.admin !== true && !allowedUids.has(decodedToken.uid)) {
      return res.status(403).json({ error: "Esta cuenta no tiene permisos de administrador." });
    }
    req.user = decodedToken;
    return next();
  } catch {
    return res.status(401).json({ error: "La sesión no es válida o ha expirado." });
  }
}

module.exports = { requireAdmin };