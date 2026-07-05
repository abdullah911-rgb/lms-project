const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');
const { uploadAny } = require('../middlewares/upload');

// Upload files for a course (instructor or admin)
router.post(
  '/course/:courseId',
  requireAuth,
  requireRole('INSTRUCTOR', 'ADMIN'),
  uploadAny.array('files', 10),
  resourceController.uploadForCourse
);

// Get all resources for a course (enrolled students, instructor, admin)
router.get('/course/:courseId', requireAuth, resourceController.getByCourse);

// Delete a resource
router.delete('/:id', requireAuth, requireRole('INSTRUCTOR', 'ADMIN'), resourceController.delete);

module.exports = router;
