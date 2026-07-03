const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const lessonController = {
  // GET /api/lessons/module/:moduleId — Get all lessons in a module
  getByModule: asyncHandler(async (req, res) => {
    const { moduleId } = req.params;

    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) return sendError(res, 'Module not found.', 404);

    if (req.user.role === 'INSTRUCTOR' && module.course.instructorId !== req.user.id) {
      return sendError(res, 'Not authorized.', 403);
    }

    const lessons = await prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { order: 'asc' },
      include: {
        resources: { select: { id: true, name: true, fileUrl: true, fileType: true, fileSize: true } },
      },
    });

    sendSuccess(res, 'Lessons fetched.', { lessons });
  }),

  // POST /api/lessons/module/:moduleId — Create a lesson
  create: asyncHandler(async (req, res) => {
    const { moduleId } = req.params;
    const { title, description, type, content, videoUrl, duration, isFree } = req.body;

    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) return sendError(res, 'Module not found.', 404);

    if (req.user.role === 'INSTRUCTOR' && module.course.instructorId !== req.user.id) {
      return sendError(res, 'Not authorized.', 403);
    }

    const lastLesson = await prisma.lesson.findFirst({
      where: { moduleId },
      orderBy: { order: 'desc' },
    });
    const order = (lastLesson?.order ?? 0) + 1;

    const lesson = await prisma.lesson.create({
      data: {
        title,
        description,
        moduleId,
        type: type || 'VIDEO',
        content,
        videoUrl,
        duration: duration ? parseInt(duration) : null,
        isFree: isFree === true || isFree === 'true',
        order,
      },
    });

    // Update totalLessons on course
    await prisma.course.update({
      where: { id: module.courseId },
      data: { totalLessons: { increment: 1 } },
    });

    sendSuccess(res, 'Lesson created.', { lesson }, 201);
  }),

  // PUT /api/lessons/:id — Update a lesson
  update: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, type, content, videoUrl, duration, isFree, isPublished } = req.body;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) return sendError(res, 'Lesson not found.', 404);

    if (req.user.role === 'INSTRUCTOR' && lesson.module.course.instructorId !== req.user.id) {
      return sendError(res, 'Not authorized.', 403);
    }

    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (type !== undefined) data.type = type;
    if (content !== undefined) data.content = content;
    if (videoUrl !== undefined) data.videoUrl = videoUrl;
    if (duration !== undefined) data.duration = parseInt(duration);
    if (isFree !== undefined) data.isFree = isFree === true || isFree === 'true';
    if (isPublished !== undefined) data.isPublished = isPublished === true || isPublished === 'true';

    const updated = await prisma.lesson.update({ where: { id }, data });
    sendSuccess(res, 'Lesson updated.', { lesson: updated });
  }),

  // DELETE /api/lessons/:id — Delete a lesson
  delete: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) return sendError(res, 'Lesson not found.', 404);

    if (req.user.role === 'INSTRUCTOR' && lesson.module.course.instructorId !== req.user.id) {
      return sendError(res, 'Not authorized.', 403);
    }

    await prisma.lesson.delete({ where: { id } });

    // Update totalLessons on course
    await prisma.course.update({
      where: { id: lesson.module.courseId },
      data: { totalLessons: { decrement: 1 } },
    });

    sendSuccess(res, 'Lesson deleted.');
  }),
};

module.exports = lessonController;
