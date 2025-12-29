const express = require('express');
const router = express.Router();
const controller = require('../controllers/tickets.controller');

router.post('/', controller.createTicket);
router.get('/', controller.listTickets);
router.patch('/:id', controller.updateTicket);
router.delete('/:id', controller.deleteTicket);
router.get('/notifications/count', controller.notifications);
router.post('/:id/sync-role', controller.syncRoleToCandidates);

module.exports = router;
