const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', courseController.getCourses);
router.post('/', authorize('admin', 'instructor'), courseController.createCourse);
router.put('/:id', authorize('admin', 'instructor'), courseController.updateCourse);
router.delete('/:id', authorize('admin', 'instructor'), courseController.deleteCourse);
router.patch('/:id/restore', authorize('admin', 'instructor'), courseController.restoreCourse);
router.delete('/:id/permanent', authorize('admin'), courseController.hardDeleteCourse);

module.exports = router;
