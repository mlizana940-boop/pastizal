const { auth } = require("../config/firebaseAdmin");

async function requireAuth(req, res, next) {
  const match = /^Bearer\s+(.+)$/i.exec(req.get("authorization") || "");
  if (!match) return res.status(401).json({ error: "Inicia sesión para continuar." });

  try {
    req.user = await auth.verifyIdToken(match[1]);
  } catch {
    return res.status(401).json({ error: "La sesión no es válida o ha expirado." });
  }

  return next();
}

module.exports = { requireAuth };
