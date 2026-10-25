const { randomUUID } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const cabanaRepository = require("../repositories/cabana.repository");
const { getCabanaImageDirectory, getManagedImagePath, uploadDirectory } = require("../config/uploadStorage");
const { HttpError } = require("../utils/httpError");

function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mimeType: "image/png", extension: "png" };
  }
  if (
    buffer.length >= 12
    && buffer.toString("ascii", 0, 4) === "RIFF"
    && buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }
  return null;
}

async function deleteManagedImage(imagenUrl) {
  const imagePath = getManagedImagePath(imagenUrl);
  if (!imagePath) return;

  try {
    await fs.rm(imagePath, { force: true });
    await fs.rmdir(path.dirname(imagePath)).catch((error) => {
      if (!["ENOENT", "ENOTEMPTY"].includes(error.code)) throw error;
    });
  } catch (error) {
    console.error("No se pudo eliminar una imagen anterior de cabaña:", error);
  }
}

async function replace(cabanaId, file) {
  const imageType = detectImageType(file?.buffer);
  if (!imageType || imageType.mimeType !== file.mimetype) {
    throw new HttpError(400, "El archivo no contiene una imagen JPG, PNG o WebP válida.");
  }

  const directory = getCabanaImageDirectory(cabanaId);
  if (!directory) throw new HttpError(400, "El identificador de la cabaña no es válido.");

  const cabin = await cabanaRepository.findById(cabanaId);
  if (!cabin) throw new HttpError(404, "No se encontró la cabaña.");

  const filename = `${randomUUID()}.${imageType.extension}`;
  const imagePath = path.join(directory, filename);
  const imagenUrl = `/uploads/${cabanaId}/${filename}`;
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(imagePath, file.buffer, { flag: "wx", mode: 0o644 });

  try {
    await cabanaRepository.updateImage(cabanaId, imagenUrl);
  } catch (error) {
    await fs.rm(imagePath, { force: true });
    throw error;
  }

  await deleteManagedImage(cabin.imagenUrl);
  return { id: cabanaId, imagenUrl };
}

async function removeAllForCabana(cabanaId) {
  const directory = getCabanaImageDirectory(cabanaId);
  if (!directory) return;

  const relativeDirectory = path.relative(uploadDirectory, directory);
  if (relativeDirectory.startsWith("..") || path.isAbsolute(relativeDirectory)) return;
  try {
    await fs.rm(directory, { recursive: true, force: true });
  } catch (error) {
    console.error("No se pudieron eliminar las imágenes de una cabaña:", error);
  }
}

module.exports = { removeAllForCabana, replace };
