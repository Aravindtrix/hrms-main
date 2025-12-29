const express = require('express');
const router = express.Router();
const controller = require('../controllers/performance.controller');

router.get('/', controller.listScores);
router.post('/', controller.upsertScore);
router.get('/hr-actions', controller.listActions);
router.post('/hr-actions', controller.upsertAction);
router.delete('/:id', controller.deleteScore);

module.exports = router;
