'use strict';

const express = require('express');
const router = express.Router();
const { getAll } = require('../controllers/audit.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

router.use(requireAuth);

router.get('/', requireRole('SUPERADMIN'), getAll);

module.exports = router;
