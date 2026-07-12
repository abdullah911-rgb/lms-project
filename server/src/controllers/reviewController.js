const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const reviewController = {
  // POST /api/reviews
  create: asyncHandler(async (req, res) => {
    const { rating, comment, courseId, instructorId } = req.body;
    const studentId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return sendError(res, 'Rating must be between 1 and 5.', 400);
    }
    if (!comment || !comment.trim()) {
      return sendError(res, 'Comment is required.', 400);
    }
    if (!courseId && !instructorId) {
      return sendError(res, 'Either courseId or instructorId must be specified.', 400);
    }

    // Verify course enrollment if reviewing a course
    if (courseId) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId, courseId } }
      });
      if (!enrollment) {
        return sendError(res, 'You must be enrolled in this course to review it.', 403);
      }

      // Check duplicate review
      const existing = await prisma.review.findFirst({
        where: { studentId, courseId }
      });
      if (existing) {
        return sendError(res, 'You have already reviewed this course.', 400);
      }
    }

    // Verify trainer relationship if reviewing a trainer
    if (instructorId) {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          studentId,
          course: { instructorId }
        }
      });
      if (!enrollment) {
        return sendError(res, 'You must be enrolled in a course taught by this trainer to review them.', 403);
      }

      // Check duplicate review
      const existing = await prisma.review.findFirst({
        where: { studentId, instructorId }
      });
      if (existing) {
        return sendError(res, 'You have already reviewed this trainer.', 400);
      }
    }

    const review = await prisma.review.create({
      data: {
        rating: parseInt(rating),
        comment: comment.trim(),
        studentId,
        courseId: courseId || null,
        instructorId: instructorId || null
      },
      include: {
        student: { select: { id: true, name: true, avatar: true } }
      }
    });

    sendSuccess(res, 'Review posted successfully.', { review }, 201);
  }),

  // GET /api/reviews/course/:courseId
  getByCourse: asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { courseId },
      include: {
        student: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate average and rating distribution
    const count = reviews.length;
    const average = count > 0 ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1)) : 0;

    sendSuccess(res, 'Course reviews fetched.', { reviews, average, count });
  }),

  // GET /api/reviews/instructor/:instructorId
  getByInstructor: asyncHandler(async (req, res) => {
    const { instructorId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { instructorId },
      include: {
        student: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate average
    const count = reviews.length;
    const average = count > 0 ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1)) : 0;

    sendSuccess(res, 'Instructor reviews fetched.', { reviews, average, count });
  }),

  // DELETE /api/reviews/:id
  delete: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return sendError(res, 'Review not found.', 404);
    }

    if (review.studentId !== req.user.id && req.user.role !== 'ADMIN') {
      return sendError(res, 'Not authorized to delete this review.', 403);
    }

    await prisma.review.delete({ where: { id } });
    sendSuccess(res, 'Review deleted successfully.');
  })
};

module.exports = reviewController;
