export function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  console.error(err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Erro interno do servidor.";

  return res.status(statusCode).json({ erro: message });
}