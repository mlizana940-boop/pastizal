const multer = require("multer");
const { HttpError } = require("../utils/httpError");

const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: 1, fields: 0 },
  fileFilter(req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new HttpError(400, "La imagen debe estar en formato JPG, PNG o WebP."));
    }
    return callback(null, true);
  }
});

function uploadCabanaImage(req, res, next) {
  upload.single("imagen")(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      const message = error.code === "LIMIT_FILE_SIZE"
        ? "La imagen no puede superar los 3 MB."
        : "No se pudo procesar el archivo de imagen.";
      return next(new HttpError(400, message));
    }
    if (error) return next(error);
    if (!req.file) return next(new HttpError(400, "Selecciona una imagen para subir."));
    return next();
  });
}

module.exports = { uploadCabanaImage };
