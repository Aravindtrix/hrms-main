const router = require('express').Router();
const controller = require('../controllers/exits.controller');

router.get('/', controller.listExits);
router.post('/', controller.upsertExit);

module.exports = router;
