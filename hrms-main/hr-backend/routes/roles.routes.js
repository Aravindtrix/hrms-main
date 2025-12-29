const express = require('express');
const router = express.Router();
const controller = require('../controllers/roles.controller');
const scopesController = require('../controllers/roleScopes.controller');

router.post('/', controller.createRole);
router.get('/', controller.listRoles);
router.get('/:id', controller.getRole);
router.get('/:id/scopes', scopesController.listForRole);
router.post('/:id/scopes', scopesController.create);
router.patch('/:id', controller.updateRole);
router.delete('/:id', controller.deleteRole);
router.delete('/scopes/:id', scopesController.delete);

module.exports = router;
