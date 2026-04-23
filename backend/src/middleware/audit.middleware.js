'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
    console.error('Error al registrar auditoría:', err.message);
  }
}

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

function getClientIp(req) {
  return req.ip || req.socket?.remoteAddress || '0.0.0.0';
}

module.exports = { logAuditEvent, auditMiddleware, getClientIp };
