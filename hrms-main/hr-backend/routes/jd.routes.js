const express = require('express');
const router = express.Router();
const controller = require('../controllers/jd.controller');

// POST /api/jd { role: string, qnty: number }
router.post('/', controller.generate);

module.exports = router;
