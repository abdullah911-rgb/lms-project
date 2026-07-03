const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');

const instructorOrAdmin = requireRole('INSTRUCTOR', 'ADMIN');

router.get('/module/:moduleId', requireAuth, instructorOrAdmin, lessonController.getByModule);
router.post('/module/:moduleId', requireAuth, instructorOrAdmin, lessonController.create);
router.put('/:id', requireAuth, instructorOrAdmin, lessonController.update);
router.delete('/:id', requireAuth, instructorOrAdmin, lessonController.delete);

module.exports = router;
