// Central error handler — keep it last in the middleware chain.
module.exports = function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || 500;
  const payload = {
    error: err.message || 'Internal server error',
  };
  if (err.details) payload.details = err.details;

  // Mongoose validation
  if (err.name === 'ValidationError') {
    payload.error = 'Validation failed';
    payload.details = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json(payload);
  }

  // Duplicate key
  if (err.code === 11000) {
    payload.error = 'Duplicate value';
    payload.details = err.keyValue;
    return res.status(409).json(payload);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    payload.error = 'Unauthorized';
    return res.status(401).json(payload);
  }

  if (status >= 500) console.error('💥', err);

  res.status(status).json(payload);
};
