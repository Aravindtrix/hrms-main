const express = require('express');
const router = express.Router();
const controller = require('../controllers/departments.controller');

router.post('/', controller.createDepartment);
router.get('/', controller.listDepartments);
router.get('/:id', controller.getDepartment);
router.patch('/:id', controller.updateDepartment);
router.delete('/:id', controller.deleteDepartment);

module.exports = router;
