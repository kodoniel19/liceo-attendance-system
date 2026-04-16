const express = require('express');
const router = express.Router();
const sectionController = require('../controllers/section.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

// Move global student routes above parameterized routes to prevent collision
router.get('/my/enrolled', authorize('student'), sectionController.getMyEnrolledSections);
router.get('/my/announcements', authorize('student'), sectionController.getMyAnnouncements);
router.get('/instructor/announcements', authorize('instructor'), sectionController.getInstructorAnnouncements);

router.get('/', sectionController.getSections);
router.get('/:id', sectionController.getSection);
router.post('/', authorize('admin', 'instructor'), sectionController.createSection);
router.patch('/:id', authorize('admin', 'instructor'), sectionController.updateSection);
router.get('/:sectionId/students', sectionController.getSectionStudents);
router.get('/:sectionId/available-students', authorize('admin', 'instructor'), sectionController.getAvailableStudents);
router.post('/:sectionId/enroll', authorize('admin', 'instructor'), sectionController.enrollStudent);
router.get('/:sectionId/announcements', sectionController.getAnnouncements);
router.post('/:sectionId/announcements', authorize('admin', 'instructor'), sectionController.createAnnouncement);
router.delete('/:id', authorize('admin', 'instructor'), sectionController.deleteSection);
router.patch('/:id/restore', authorize('admin'), sectionController.restoreSection);
router.delete('/:id/permanent', authorize('admin'), sectionController.hardDeleteSection);
router.delete('/:sectionId/enroll/:studentId', authorize('admin', 'instructor'), sectionController.unenrollStudent);
router.patch('/:sectionId/respond', authorize('student'), sectionController.respondToEnrollment);

module.exports = router;
