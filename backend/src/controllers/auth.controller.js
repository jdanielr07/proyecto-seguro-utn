'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { logAuditEvent, getClientIp } = require('../middleware/audit.middleware');

const prisma = new PrismaClient();

const MAX_ATTEMPTS = 5;
const BLOCK_MINUTES = 5;
const JWT_EXPIRES = '1h';   // RS-05: máximo 1 hora

// Hash válido pre-computado en startup para la comparación timing-safe
// cuando el usuario no existe. Un hash inválido haría que bcrypt lanzara
// una excepción, retornando 500 en vez de 401 → enumeración de usuarios.
const DUMMY_HASH = bcrypt.hashSync('__timing_safe_placeholder__', 12);

/**
 * POST /api/auth/login
 * RS-07: Rate limiting por IP + username
 * RS-04: Regenerar ID de sesión post-login
 */
async function login(req, res) {
  const { username, password } = req.body;
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'];

  try {
    // ── 1. Verificar bloqueo por IP (RS-07) ──────────────────────────────────
    const ipAttempt = await prisma.loginAttempt.findUnique({ where: { identifier: ip } });
    if (ipAttempt?.blockedUntil && ipAttempt.blockedUntil > new Date()) {
      const remaining = Math.ceil((ipAttempt.blockedUntil - new Date()) / 1000 / 60);
      return res.status(429).json({
        error: `IP bloqueada temporalmente. Intentá en ${remaining} minutos.`,
      });
    }

    // ── 2. Buscar usuario (RS-01: Prisma usa prepared statements automáticamente) ─
    const user = await prisma.user.findUnique({ where: { username } });

    // ── 3. Verificar contraseña (timing-safe con bcrypt) ────────────────────
    // IMPORTANTE: siempre hacemos el compare aunque no exista el usuario
    // para evitar timing attacks que revelen si el usuario existe.
    const passwordValid = user
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, DUMMY_HASH);

    if (!user || !passwordValid || !user.isActive) {
      // Registrar intento fallido (RF-06)
      await logAuditEvent({
        event: 'LOGIN_FAILED',
        detail: { username, reason: !user ? 'user_not_found' : !passwordValid ? 'wrong_password' : 'account_inactive' },
        ipAddress: ip,
        userAgent,
      });

      // Incrementar contador de intentos (RS-07)
      await incrementFailedAttempts(ip);
      await incrementFailedAttempts(username);

      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // ── 4. Login exitoso: limpiar contadores ────────────────────────────────
    await prisma.loginAttempt.deleteMany({
      where: { identifier: { in: [ip, username] } },
    });

    // ── 5. Regenerar ID de sesión (RS-04: prevenir Session Fixation) ─────────
    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // ── 6. Generar JWT (RS-05) ───────────────────────────────────────────────
    const payload = {
      id: user.id,
      username: user.username,
      rol: user.rol,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: JWT_EXPIRES,
      issuer: 'proyecto-seguro',
      algorithm: 'HS256',
    });

    // ── 7. Enviar token en cookie HttpOnly (RS-05: NO localStorage) ──────────
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000,  // 1 hora
    });

    // ── 8. Registrar login exitoso + actualizar last login (RF-04) ───────────
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    await logAuditEvent({
      userId: user.id,
      event: 'LOGIN_SUCCESS',
      ipAddress: ip,
      userAgent,
    });

    return res.json({
      message: 'Login exitoso.',
      user: { id: user.id, username: user.username, rol: user.rol },
    });

  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ error: 'Error interno.' });
  }
}

/**
 * POST /api/auth/logout
 */
async function logout(req, res) {
  const ip = getClientIp(req);

  if (req.user) {
    await logAuditEvent({
      userId: req.user.id,
      event: 'LOGOUT',
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // Limpiar cookie
  res.clearCookie('token', { httpOnly: true, sameSite: 'strict' });

  // Destruir sesión
  req.session.destroy(() => {
    res.json({ message: 'Sesión cerrada.' });
  });
}

/**
 * GET /api/auth/me
 * Devuelve datos del usuario autenticado actual
 */
async function me(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, email: true, rol: true, lastLoginAt: true, lastLoginIp: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Error interno.' });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function incrementFailedAttempts(identifier) {
  const blockedUntil = new Date(Date.now() + BLOCK_MINUTES * 60 * 1000);

  const attempt = await prisma.loginAttempt.upsert({
    where: { identifier },
    update: { attempts: { increment: 1 } },
    create: { identifier, attempts: 1 },
  });

  if (attempt.attempts >= MAX_ATTEMPTS) {
    await prisma.loginAttempt.update({
      where: { identifier },
      data: { blockedUntil },
    });

    await logAuditEvent({
      event: 'LOGIN_BLOCKED',
      detail: { identifier, attempts: attempt.attempts },
      ipAddress: identifier,
    });
  }
}

module.exports = { login, logout, me };
