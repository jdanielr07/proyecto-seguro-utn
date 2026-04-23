'use strict';

function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV === 'development';

  console.error(`[ERROR] ${err.message}`);
  if (isDev) console.error(err.stack);

  if (err.type === 'validation') {
    return res.status(400).json({ error: 'Datos inválidos.', details: err.details });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Ya existe un registro con esos datos únicos.' });
  }

  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Error interno del servidor.',
  });
}

module.exports = { errorHandler };
