'use strict';

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const { getAll, getById, create, update, remove } = require('../controllers/user.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { validateRequest } = require('../validators/validate');

const userCreateValidation = [
  body('username')
    .trim().notEmpty().withMessage('Username obligatorio.')
    .isLength({ min: 3, max: 50 }).withMessage('Username: entre 3 y 50 caracteres.')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username: solo letras, números y guion bajo.')
    .escape(),
  body('email')
    .isEmail().withMessage('Email inválido.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Contraseña: mínimo 8 caracteres.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Contraseña debe tener mayúsculas, minúsculas y números.'),
  body('rol')
    .isIn(['SUPERADMIN', 'AUDITOR', 'REGISTRADOR']).withMessage('Rol inválido.'),
];

const userUpdateValidation = [
  body('email').optional().isEmail().normalizeEmail(),
  body('rol').optional().isIn(['SUPERADMIN', 'AUDITOR', 'REGISTRADOR']),
  body('isActive').optional().isBoolean(),
  body('password').optional().isLength({ min: 8 }),
];

router.use(requireAuth);

// Lectura: cualquier rol autenticado (RF-05)
router.get('/', getAll);

// Acciones solo para SUPERADMIN (RF-05)
router.get('/:id',    requireRole('SUPERADMIN'), getById);
router.post('/',      requireRole('SUPERADMIN'), userCreateValidation, validateRequest, create);
router.put('/:id',    requireRole('SUPERADMIN'), userUpdateValidation, validateRequest, update);
router.delete('/:id', requireRole('SUPERADMIN'), remove);

module.exports = router;
