const path = require("node:path");

const uploadDirectory = path.resolve(
  process.env.UPLOADS_DIR || path.join(__dirname, "..", "..", "storage", "uploads")
);

function getCabanaImageDirectory(cabanaId) {
  if (typeof cabanaId !== "string" || !/^[A-Za-z0-9_-]{1,150}$/.test(cabanaId)) return null;
  return path.join(uploadDirectory, cabanaId);
}

function getManagedImagePath(imagenUrl) {
  if (typeof imagenUrl !== "string") return null;
  const match = /^\/uploads\/([A-Za-z0-9_-]{1,150})\/([0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})\.(jpg|png|webp)$/i.exec(imagenUrl);
  if (!match) return null;
  const directory = getCabanaImageDirectory(match[1]);
  return directory ? path.join(directory, `${match[2]}.${match[3].toLowerCase()}`) : null;
}

module.exports = { getCabanaImageDirectory, getManagedImagePath, uploadDirectory };
