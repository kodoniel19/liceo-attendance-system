const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const c = require('../controllers/user.controller');

// ── Profile (any authenticated user) ──────────────────────────
router.get('/me',                 authenticate, c.getProfile);
router.put('/me',                 authenticate, c.updateProfile);
router.post('/me/password',       authenticate, c.changePassword);
router.get('/me/enrollments',     authenticate, c.getMyEnrollments);

// ── Admin only ─────────────────────────────────────────────────
router.get('/',                   authenticate, authorize('admin'), c.getAllUsers);
router.post('/',                  authenticate, authorize('admin'), c.createUser);
router.get('/system/stats',       authenticate, authorize('admin'), c.getSystemStats);
router.put('/:id',                authenticate, authorize('admin'), c.updateUserAdmin);
router.patch('/:id/toggle',       authenticate, authorize('admin'), c.toggleUserActive);
router.delete('/:id',             authenticate, authorize('admin'), c.deleteUser);

// ── Backward compat ────────────────────────────────────────────
router.get('/:id/enrollments',    authenticate, c.getMyEnrollments);

module.exports = router;
