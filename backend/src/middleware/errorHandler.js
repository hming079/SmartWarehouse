function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  res.status(status).json({
    ok: false,
    error: err.message || "Internal Server Error",
  });
}

module.exports = errorHandler;
