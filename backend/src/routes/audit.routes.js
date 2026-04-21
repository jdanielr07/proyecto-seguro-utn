'use strict';

const express = require('express');
const router = express.Router();
const { getAll } = require('../controllers/audit.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

router.use(requireAuth);

// Solo SUPERADMIN puede ver logs (RF-06)
router.get('/', requireRole('SUPERADMIN'), getAll);

module.exports = router;
