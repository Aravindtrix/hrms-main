const router = require('express').Router();
const controller = require('../controllers/employees.controller');

router.get('/by-candidate/:candidateId', controller.getByCandidate);
router.get('/', controller.listEmployees);
router.post('/', controller.upsertEmployee);

module.exports = router;
