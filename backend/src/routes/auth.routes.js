'use strict';

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');

const { login, logout, me } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validateRequest } = require('../validators/validate');

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos de login. Bloqueado por 5 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const loginValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('El username es obligatorio.')
    .isLength({ max: 50 }).withMessage('Username demasiado largo.')
    .escape(),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria.')
    .isLength({ max: 128 }).withMessage('Contraseña demasiado larga.'),
];

router.post('/login',  loginLimiter, loginValidation, validateRequest, login);
router.post('/logout', requireAuth, logout);
router.get('/me',      requireAuth, me);

module.exports = router;
