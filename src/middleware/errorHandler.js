function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = Number.isInteger(error.status) ? error.status : 500;
  const message = status >= 500 ? "Ocurrió un error interno. Intenta nuevamente." : error.message;
  if (status >= 500) console.error(error);
  return res.status(status).json({ error: message });
}

module.exports = { errorHandler };