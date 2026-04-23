'use strict';

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const { getAll, getById, create, update, remove } = require('../controllers/product.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { validateRequest } = require('../validators/validate');

const productValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio.')
    .isLength({ min: 2, max: 100 }).withMessage('Nombre: entre 2 y 100 caracteres.')
    .escape(),
  body('description')
    .trim()
    .notEmpty().withMessage('La descripción es obligatoria.')
    .isLength({ max: 1000 }).withMessage('Descripción: máximo 1000 caracteres.')
    .escape(),
  body('quantity')
    .isInt({ min: 0, max: 999999 }).withMessage('Cantidad debe ser un entero ≥ 0.'),
  body('price')
    .isFloat({ min: 0.01, max: 9999999 }).withMessage('Precio debe ser mayor a 0.'),
];

const createValidation = [
  body('code')
    .trim()
    .notEmpty().withMessage('El código es obligatorio.')
    .matches(/^[A-Za-z0-9\-_]{1,20}$/).withMessage('Código: solo letras, números, guiones. Máx 20 caracteres.')
    .escape(),
  ...productValidation,
];

router.use(requireAuth);

router.get('/',    getAll);
router.get('/:id', getById);

router.post('/',    requireRole('SUPERADMIN', 'REGISTRADOR'), createValidation, validateRequest, create);
router.put('/:id',  requireRole('SUPERADMIN', 'REGISTRADOR'), productValidation, validateRequest, update);
router.delete('/:id', requireRole('SUPERADMIN', 'REGISTRADOR'), remove);

module.exports = router;
