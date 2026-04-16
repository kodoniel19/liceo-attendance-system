const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/session.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', sessionController.getSessions);
router.get('/:id', sessionController.getSession);
router.post('/', authorize('admin', 'instructor'), sessionController.createSession);
router.patch('/:id', authorize('admin', 'instructor'), sessionController.updateSession);
router.get('/:id/attendance', sessionController.getSessionAttendance);
router.delete('/:id', authorize('admin', 'instructor'), sessionController.deleteSession);

module.exports = router;
