'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Registra un evento de auditoría en la base de datos (RF-06)
 */
async function logAuditEvent({ userId = null, event, entity = null, entityId = null, detail = null, ipAddress, userAgent = null }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        event,
        entity,
        entityId,
        detail: detail ? JSON.stringify(detail) : null,
        ipAddress: ipAddress || '0.0.0.0',
        userAgent,
      },
    });
  } catch (err) {
    // No fallar la request si el log falla, solo registrar en consola
    console.error('Error al registrar auditoría:', err.message);
  }
}

/**
 * Middleware que registra accesos denegados (403) automáticamente
 */
function auditMiddleware(req, res, next) {
  const originalSend = res.send.bind(res);

  res.send = function (body) {
    if (res.statusCode === 403) {
      logAuditEvent({
        userId: req.user?.id || null,
        event: 'ACCESS_DENIED',
        detail: { path: req.originalUrl, method: req.method },
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });
    }
    return originalSend(body);
  };

  next();
}

/**
 * Obtener IP real del cliente (detrás de proxy/ngrok)
 */
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.ip ||
    '0.0.0.0'
  );
}

module.exports = { logAuditEvent, auditMiddleware, getClientIp };
