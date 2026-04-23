'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VALID_AUDIT_EVENTS = new Set([
  'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_BLOCKED', 'LOGOUT',
  'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED',
  'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'ROLE_CHANGED',
  'ACCESS_DENIED',
]);

const MAX_AUDIT_LIMIT = 100;

/**
 * GET /api/audit
 * Solo SUPERADMIN puede ver el log (RF-06)
 */
async function getAll(req, res) {
  try {
    // Sanitizar y acotar los parámetros de paginación. Sin esto, un atacante
    // puede volcar toda la tabla con limit=999999 o crashear con page=-1.
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(MAX_AUDIT_LIMIT, Math.max(1, parseInt(req.query.limit) || 30));
    const skip  = (page - 1) * limit;

    // Whitelist de eventos para evitar filtros arbitrarios.
    const event = VALID_AUDIT_EVENTS.has(req.query.event) ? req.query.event : undefined;
    const where = event ? { event } : {};

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { username: true, rol: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener logs.' });
  }
}

module.exports = { getAll };
