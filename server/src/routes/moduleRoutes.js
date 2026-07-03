const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/moduleController');
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');

const instructorOrAdmin = requireRole('INSTRUCTOR', 'ADMIN');

router.get('/course/:courseId', requireAuth, instructorOrAdmin, moduleController.getByCourse);
router.post('/course/:courseId', requireAuth, instructorOrAdmin, moduleController.create);
router.patch('/course/:courseId/reorder', requireAuth, instructorOrAdmin, moduleController.reorder);
router.put('/:id', requireAuth, instructorOrAdmin, moduleController.update);
router.delete('/:id', requireAuth, instructorOrAdmin, moduleController.delete);

module.exports = router;
