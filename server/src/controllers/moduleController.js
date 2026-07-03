const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const moduleController = {
  // GET /api/modules/course/:courseId — Get all modules for a course
  getByCourse: asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    // Verify course ownership for instructors
    if (req.user.role === 'INSTRUCTOR') {
      const course = await prisma.course.findFirst({
        where: { id: courseId, instructorId: req.user.id },
      });
      if (!course) return sendError(res, 'Not authorized.', 403);
    }

    const modules = await prisma.module.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
          select: {
            id: true, title: true, type: true, duration: true,
            isFree: true, isPublished: true, order: true,
          },
        },
        _count: { select: { lessons: true } },
      },
    });

    sendSuccess(res, 'Modules fetched.', { modules });
  }),

  // POST /api/modules/course/:courseId — Create a module
  create: asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { title, description } = req.body;

    if (req.user.role === 'INSTRUCTOR') {
      const course = await prisma.course.findFirst({
        where: { id: courseId, instructorId: req.user.id },
      });
      if (!course) return sendError(res, 'Not authorized.', 403);
    }

    // Get next order number
    const lastModule = await prisma.module.findFirst({
      where: { courseId },
      orderBy: { order: 'desc' },
    });
    const order = (lastModule?.order ?? 0) + 1;

    const module = await prisma.module.create({
      data: { title, description, courseId, order },
    });

    sendSuccess(res, 'Module created.', { module }, 201);
  }),

  // PUT /api/modules/:id — Update a module
  update: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, isPublished } = req.body;

    const module = await prisma.module.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!module) return sendError(res, 'Module not found.', 404);

    if (req.user.role === 'INSTRUCTOR' && module.course.instructorId !== req.user.id) {
      return sendError(res, 'Not authorized.', 403);
    }

    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (isPublished !== undefined) data.isPublished = isPublished;

    const updated = await prisma.module.update({ where: { id }, data });
    sendSuccess(res, 'Module updated.', { module: updated });
  }),

  // DELETE /api/modules/:id — Delete a module
  delete: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const module = await prisma.module.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!module) return sendError(res, 'Module not found.', 404);

    if (req.user.role === 'INSTRUCTOR' && module.course.instructorId !== req.user.id) {
      return sendError(res, 'Not authorized.', 403);
    }

    await prisma.module.delete({ where: { id } });
    sendSuccess(res, 'Module deleted.');
  }),

  // PATCH /api/modules/course/:courseId/reorder — Reorder modules
  reorder: asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { orderedIds } = req.body; // array of module IDs in new order

    if (!Array.isArray(orderedIds)) {
      return sendError(res, 'orderedIds must be an array.', 400);
    }

    await Promise.all(
      orderedIds.map((id, index) =>
        prisma.module.updateMany({
          where: { id, courseId },
          data: { order: index + 1 },
        })
      )
    );

    sendSuccess(res, 'Modules reordered.');
  }),
};

module.exports = moduleController;
