function notFound(req, res) { res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Route not found.' } }); }
function errors(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.too.large') return res.status(413).json({ data: null, error: { code: 'REQUEST_TOO_LARGE', message: 'Request body is too large.' } });
  if (err instanceof SyntaxError && 'body' in err) return res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'Request JSON is malformed.' } });
  const status = err.status || (err.name === 'CastError' ? 404 : 500);
  const code = err.code || (status === 404 ? 'CASE_NOT_FOUND' : status === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR');
  if (status >= 500) console.error(JSON.stringify({ event: 'request_error', path: req.path, type: err.name }));
  res.status(status).json({ data: null, error: { code, message: status >= 500 ? 'Something went wrong. Please try again.' : err.message } });
}
module.exports = { notFound, errors };
