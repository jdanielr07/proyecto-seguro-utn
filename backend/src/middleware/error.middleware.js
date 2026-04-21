'use strict';

/**
 * Manejador global de errores
 * Nunca expone stack traces en producción
 */
function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV === 'development';

  console.error(`[ERROR] ${err.message}`);
  if (isDev) console.error(err.stack);

  // Errores de validación de express-validator
  if (err.type === 'validation') {
    return res.status(400).json({ error: 'Datos inválidos.', details: err.details });
  }

  // Errores de Prisma (DB)
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Ya existe un registro con esos datos únicos.' });
  }

  // Error genérico - no revelar detalles en producción
  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Error interno del servidor.',
  });
}

module.exports = { errorHandler };
