const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { requireAuth } = require('../middlewares/auth');
const { optionalAuth } = require('../middlewares/auth');

// POST /api/reviews — create a review (authenticated students only)
router.post('/', requireAuth, reviewController.create);

// GET /api/reviews/course/:courseId — get all reviews for a course
router.get('/course/:courseId', optionalAuth, reviewController.getByCourse);

// GET /api/reviews/instructor/:instructorId — get all reviews for an instructor
router.get('/instructor/:instructorId', optionalAuth, reviewController.getByInstructor);

// DELETE /api/reviews/:id — delete a review (owner or admin)
router.delete('/:id', requireAuth, reviewController.delete);

module.exports = router;
