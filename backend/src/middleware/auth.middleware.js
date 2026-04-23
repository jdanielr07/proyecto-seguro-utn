'use strict';

const jwt = require('jsonwebtoken');
const { logAuditEvent, getClientIp } = require('./audit.middleware');

function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: 'No autenticado. Iniciá sesión.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
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

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }

    if (!roles.includes(req.user.rol)) {
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
