'use strict';

const { validationResult } = require('express-validator');

/**
 * Middleware que verifica los resultados de express-validator
 * Si hay errores, devuelve 400 con la lista de errores
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Datos de entrada inválidos.',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

module.exports = { validateRequest };
