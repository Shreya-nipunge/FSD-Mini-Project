export function errorHandler(error, req, res, _next) {
  let status = Number.isInteger(error.status) ? error.status : 500;
  if (error.name === "MulterError") status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
  if (error.name === "SequelizeValidationError") status = 400;
  if (error.name === "SequelizeUniqueConstraintError") status = 409;
  if (error.name === "SequelizeForeignKeyConstraintError") status = 409;
  const message = status >= 500 ? "Internal server error" : error.message;

  if (status >= 500) {
    req.log?.error?.(error);
    console.error(error);
  }

  res.status(status).json({
    success: false,
    error: { message },
    detail: message,
  });
}
