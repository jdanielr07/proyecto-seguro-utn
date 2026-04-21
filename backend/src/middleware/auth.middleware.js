'use strict';

const jwt = require('jsonwebtoken');
const { logAuditEvent, getClientIp } = require('./audit.middleware');

/**
 * Verifica el JWT en la cookie HttpOnly (RS-05)
 * NO acepta tokens con algoritmo 'none'
 */
function requireAuth(req, res, next) {
  try {
    // Buscar token en cookie HttpOnly (no localStorage - RS-05)
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: 'No autenticado. Iniciá sesión.' });
    }

    // Verificar firma - SOLO algoritmos seguros (RS-05: rechazar 'none')
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],   // Lista blanca explícita, 'none' no está
      issuer: 'proyecto-seguro',
    });

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sesión expirada. Iniciá sesión nuevamente.' });
    }
    return res.status(401).json({ error: 'Token inválido.' });
  }
}

/**
 * Factory de middleware para control de acceso por rol (RF-05 / RS-05)
 * Uso: requireRole('SUPERADMIN') o requireRole('SUPERADMIN', 'REGISTRADOR')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }

    if (!roles.includes(req.user.rol)) {
      // Registrar intento de acceso no autorizado (RF-06)
      logAuditEvent({
        userId: req.user.id,
        event: 'ACCESS_DENIED',
        detail: {
          path: req.originalUrl,
          method: req.method,
          userRol: req.user.rol,
          requiredRoles: roles,
        },
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });

      return res.status(403).json({
        error: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}.`,
      });
    }

    next();
  };
}

module.exports = { requireAuth, requireRole };
