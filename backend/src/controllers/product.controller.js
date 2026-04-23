'use strict';

const { PrismaClient } = require('@prisma/client');
const { logAuditEvent, getClientIp } = require('../middleware/audit.middleware');

const prisma = new PrismaClient();

async function getAll(req, res) {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener productos.' });
  }
}

async function getById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

    const product = await prisma.product.findFirst({
      where: { id, isActive: true },
    });

    if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el producto.' });
  }
}

async function create(req, res) {
  try {
    const { code, name, description, quantity, price } = req.body;

    const product = await prisma.product.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim(),
        quantity: parseInt(quantity, 10),
        price: parseFloat(price),
      },
    });

    await logAuditEvent({
      userId: req.user.id,
      event: 'PRODUCT_CREATED',
      entity: 'products',
      entityId: product.id,
      detail: { code: product.code, name: product.name },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json(product);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un producto con ese código.' });
    }
    res.status(500).json({ error: 'Error al crear el producto.' });
  }
}

async function update(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

    const { name, description, quantity, price } = req.body;

    const existing = await prisma.product.findFirst({ where: { id, isActive: true } });
    if (!existing) return res.status(404).json({ error: 'Producto no encontrado.' });

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description.trim(),
        quantity: parseInt(quantity, 10),
        price: parseFloat(price),
      },
    });

    await logAuditEvent({
      userId: req.user.id,
      event: 'PRODUCT_UPDATED',
      entity: 'products',
      entityId: id,
      detail: { name: updated.name, quantity: updated.quantity, price: String(updated.price) },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar el producto.' });
  }
}

async function remove(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

    const existing = await prisma.product.findFirst({ where: { id, isActive: true } });
    if (!existing) return res.status(404).json({ error: 'Producto no encontrado.' });

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    await logAuditEvent({
      userId: req.user.id,
      event: 'PRODUCT_DELETED',
      entity: 'products',
      entityId: id,
      detail: { code: existing.code, name: existing.name },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Producto eliminado correctamente.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar el producto.' });
  }
}

module.exports = { getAll, getById, create, update, remove };
