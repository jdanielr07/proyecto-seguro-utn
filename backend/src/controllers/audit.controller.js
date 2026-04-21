'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /api/audit
 * Solo SUPERADMIN puede ver el log (RF-06)
 */
async function getAll(req, res) {
  try {
    const { page = 1, limit = 50, event } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = event ? { event } : {};

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { username: true, rol: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ logs, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener logs.' });
  }
}

module.exports = { getAll };
