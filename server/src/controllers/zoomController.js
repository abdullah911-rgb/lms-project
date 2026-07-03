const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const crypto = require('crypto');

const zoomController = {
  // GET /api/zoom/course/:courseId — List all meetings for a course
  getByCourse: asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return sendError(res, 'Course not found.', 404);

    // If student, verify enrollment
    if (req.user.role === 'STUDENT') {
      const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: req.user.id, courseId } }
      });
      if (!enrollment) return sendError(res, 'You are not enrolled in this course.', 403);
    } else if (req.user.role === 'INSTRUCTOR' && course.instructorId !== req.user.id) {
      return sendError(res, 'Not authorized.', 403);
    }

    const meetings = await prisma.zoomMeeting.findMany({
      where: { courseId },
      orderBy: { startTime: 'desc' },
    });

    sendSuccess(res, 'Meetings fetched.', { meetings });
  }),

  // POST /api/zoom/course/:courseId — Create a live class/meeting (instructors/admins)
  create: asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { topic, agenda, startTime = new Date(), duration = 60 } = req.body;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return sendError(res, 'Course not found.', 404);

    if (req.user.role === 'INSTRUCTOR' && course.instructorId !== req.user.id) {
      return sendError(res, 'Not authorized to schedule classes for this course.', 403);
    }

    // Generate random 10-digit meeting ID
    const meetingId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const joinUrl = `https://zoom.us/j/${meetingId}`;
    const startUrl = `https://zoom.us/s/${meetingId}`;
    const password = crypto.randomBytes(4).toString('hex');

    const meeting = await prisma.zoomMeeting.create({
      data: {
        courseId,
        instructorId: req.user.id,
        meetingId,
        topic: topic || `${course.title} - Live Class`,
        agenda,
        startTime: new Date(startTime),
        duration: parseInt(duration),
        joinUrl,
        startUrl,
        password,
        status: 'LIVE', // Since the instructor creates it "at the class time" to start it immediately
      }
    });

    // Create notifications for all enrolled students
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      select: { studentId: true }
    });

    if (enrollments.length > 0) {
      const notificationData = enrollments.map((enroll) => ({
        userId: enroll.studentId,
        title: '🔴 Live Class Started!',
        message: `Your trainer started "${meeting.topic}". Join now!`,
        type: 'WARNING',
        link: `/student/course/${courseId}`
      }));

      await prisma.notification.createMany({
        data: notificationData
      });
    }

    sendSuccess(res, 'Live class started successfully.', { meeting }, 201);
  }),

  // DELETE /api/zoom/:id — End a live class
  endClass: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const meeting = await prisma.zoomMeeting.findUnique({ where: { id } });
    if (!meeting) return sendError(res, 'Meeting not found.', 404);

    if (req.user.role === 'INSTRUCTOR' && meeting.instructorId !== req.user.id) {
      return sendError(res, 'Not authorized.', 403);
    }

    const updated = await prisma.zoomMeeting.update({
      where: { id },
      data: { status: 'ENDED' }
    });

    sendSuccess(res, 'Class ended successfully.', { meeting: updated });
  })
};

module.exports = zoomController;
