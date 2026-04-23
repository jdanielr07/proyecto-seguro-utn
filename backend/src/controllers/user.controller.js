'use strict';

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { logAuditEvent, getClientIp } = require('../middleware/audit.middleware');

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

async function getAll(req, res) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        rol: true,
        isActive: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios.' });
  }
}

async function getById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, username: true, email: true,
        rol: true, isActive: true,
        lastLoginAt: true, lastLoginIp: true, createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el usuario.' });
  }
}

async function create(req, res) {
  try {
    const { username, email, password, rol } = req.body;

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: { username: username.trim(), email: email.toLowerCase().trim(), passwordHash, rol },
      select: { id: true, username: true, email: true, rol: true, createdAt: true },
    });

    await logAuditEvent({
      userId: req.user.id,
      event: 'USER_CREATED',
      entity: 'users',
      entityId: user.id,
      detail: { username: user.username, rol: user.rol },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese username o email.' });
    }
    res.status(500).json({ error: 'Error al crear el usuario.' });
  }
}

async function update(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

    const { email, rol, isActive, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const updateData = {
      email: email?.toLowerCase().trim(),
      rol,
      isActive,
    };

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, username: true, email: true, rol: true, isActive: true },
    });

    const eventType = rol && rol !== existing.rol ? 'ROLE_CHANGED' : 'USER_UPDATED';
    await logAuditEvent({
      userId: req.user.id,
      event: eventType,
      entity: 'users',
      entityId: id,
      detail: { previousRol: existing.rol, newRol: rol },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar el usuario.' });
  }
}

async function remove(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

    if (id === req.user.id) {
      return res.status(400).json({ error: 'No podés eliminar tu propia cuenta.' });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Usuario no encontrado.' });

    await prisma.user.update({ where: { id }, data: { isActive: false } });

    await logAuditEvent({
      userId: req.user.id,
      event: 'USER_DELETED',
      entity: 'users',
      entityId: id,
      detail: { username: existing.username },
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Usuario desactivado correctamente.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar el usuario.' });
  }
}

module.exports = { getAll, getById, create, update, remove };
