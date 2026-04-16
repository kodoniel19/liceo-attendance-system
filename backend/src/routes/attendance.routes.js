const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/my',                        attendanceController.getMyAttendance);
router.get('/my/summary',                attendanceController.getMyAttendanceSummary);
router.get('/section/:sectionId/stats',  authorize('admin', 'instructor'), attendanceController.getSectionAttendanceStats);
router.post('/manual',                   authorize('admin', 'instructor'), attendanceController.manualAttendance);
router.patch('/:id',                     authorize('admin', 'instructor'), attendanceController.updateAttendance);

module.exports = router;
