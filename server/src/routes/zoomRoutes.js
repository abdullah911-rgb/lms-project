const express = require('express');
const router = express.Router();
const zoomController = require('../controllers/zoomController');
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');

const instructorOrAdmin = requireRole('INSTRUCTOR', 'ADMIN');

router.get('/course/:courseId', requireAuth, zoomController.getByCourse);
router.post('/course/:courseId', requireAuth, instructorOrAdmin, zoomController.create);
router.delete('/:id', requireAuth, instructorOrAdmin, zoomController.endClass);

module.exports = router;
