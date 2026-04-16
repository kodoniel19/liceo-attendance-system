const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qr.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.post('/generate/:sessionId',      authorize('admin', 'instructor'), qrController.generateQR);
router.post('/reopen/:sessionId',        authorize('admin', 'instructor'), qrController.reopenQR);
router.post('/scan',                     authorize('student'),             qrController.scanQR);
router.get('/status/:sessionId',         qrController.getQRStatus);
router.patch('/deactivate/:qrSessionId', authorize('admin', 'instructor'), qrController.deactivateQR);

module.exports = router;
