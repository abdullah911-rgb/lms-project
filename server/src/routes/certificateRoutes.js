const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');

// Authenticated student routes
router.get('/my', requireAuth, requireRole('STUDENT'), certificateController.getMyCertificates);
router.get('/:courseId', requireAuth, requireRole('STUDENT'), certificateController.getCertificate);

module.exports = router;
