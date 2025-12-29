const express = require('express');
const router = express.Router();
const controller = require('../controllers/candidates.controller');

router.post('/', controller.createCandidate);
router.get('/', controller.listCandidates);
router.get('/:id/resume', controller.downloadResume);
router.get('/:id', controller.getCandidate);
router.patch('/:id', controller.updateCandidate);
router.delete('/:id', controller.deleteCandidate);
router.get('/:id/offer', controller.generateOffer);
router.get('/:id/appointment', controller.generateAppointment);

module.exports = router;
