const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const resourceController = {
  // POST /api/resources/course/:courseId — Upload file(s) for a course
  uploadForCourse: asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return sendError(res, 'Course not found.', 404);

    if (req.user.role === 'INSTRUCTOR' && course.instructorId !== req.user.id) {
      return sendError(res, 'Not authorized.', 403);
    }

    if (!req.files || req.files.length === 0) {
      return sendError(res, 'No files uploaded.', 400);
    }

    const resources = await Promise.all(
      req.files.map((file) =>
        prisma.resource.create({
          data: {
            name: req.body[`name_${file.fieldname}`] || file.originalname,
            fileUrl: `/uploads/${file.filename}`,
            fileType: file.mimetype,
            fileSize: file.size,
            courseId,
          },
        })
      )
    );

    sendSuccess(res, 'Files uploaded successfully.', { resources }, 201);
  }),

  // GET /api/resources/course/:courseId — List all resources for a course
  getByCourse: asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return sendError(res, 'Course not found.', 404);

    // Enrolled students, instructors of the course, and admins can view
    if (req.user.role === 'STUDENT') {
      const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: req.user.id, courseId } },
      });
      if (!enrollment) return sendError(res, 'You must be enrolled to access course resources.', 403);
    } else if (req.user.role === 'INSTRUCTOR' && course.instructorId !== req.user.id) {
      return sendError(res, 'Not authorized.', 403);
    }

    const resources = await prisma.resource.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, 'Resources fetched.', { resources });
  }),

  // DELETE /api/resources/:id — Delete a resource file
  delete: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const resource = await prisma.resource.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!resource) return sendError(res, 'Resource not found.', 404);

    if (req.user.role === 'INSTRUCTOR' && resource.course?.instructorId !== req.user.id) {
      return sendError(res, 'Not authorized.', 403);
    }

    await prisma.resource.delete({ where: { id } });
    sendSuccess(res, 'Resource deleted.');
  }),
};

module.exports = resourceController;
