const { requireAuth } = require("./requireAuth");

const allowedUids = new Set(
  (process.env.FIREBASE_ADMIN_UIDS || "").split(",").map((uid) => uid.trim()).filter(Boolean)
);

async function requireAdmin(req, res, next) {
  return requireAuth(req, res, () => {
    if (req.user.admin !== true && !allowedUids.has(req.user.uid)) {
      return res.status(403).json({ error: "Esta cuenta no tiene permisos de administrador." });
    }
    return next();
  });
}

module.exports = { requireAdmin };
