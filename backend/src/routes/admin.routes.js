const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);
router.use(authorize('admin'));

// #1: At-Risk Monitoring
router.get('/stats/at-risk', adminController.getAtRiskStudents);

// #5: Global Broadcasts
router.post('/broadcast', adminController.createGlobalAnnouncement);

// View Student Record History
router.get('/student/:id/attendance', adminController.getStudentAttendanceHistory);

// Emergency SMTP Override Test
router.get('/test-smtp', adminController.testSmtpConnection);

module.exports = router;
