const crypto = require('crypto');
const prisma = require('../config/db');
const config = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const zoomApiService = require('../services/zoomApiService');

const zoomController = {
  // ── GET /api/zoom/course/:courseId ─────────────────────────────────────────
  // List all meetings for a course
  getByCourse: asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return sendError(res, 'Course not found.', 404);

    // Students must be enrolled
    if (req.user.role === 'STUDENT') {
      const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: req.user.id, courseId } },
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

  // ── POST /api/zoom/course/:courseId ────────────────────────────────────────
  // Create a live class (instructors / admins) using real Zoom API
  create: asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { topic, agenda, duration = 60, startTime } = req.body;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return sendError(res, 'Course not found.', 404);

    if (req.user.role === 'INSTRUCTOR' && course.instructorId !== req.user.id) {
      return sendError(res, 'Not authorized to schedule classes for this course.', 403);
    }

    // ── Create the meeting on Zoom ──
    let zoomData;
    try {
      zoomData = await zoomApiService.createMeeting({
        topic: topic || `${course.title} - Live Class`,
        agenda,
        duration: parseInt(duration),
        startTime,
      });
    } catch (zoomErr) {
      console.error('Zoom API error:', zoomErr);
      return sendError(res, `Failed to create Zoom meeting: ${zoomErr.message}`, 502);
    }

    // ── Save meeting details in the database ──
    const meeting = await prisma.zoomMeeting.create({
      data: {
        courseId,
        instructorId: req.user.id,
        meetingId: String(zoomData.id),
        topic: zoomData.topic,
        agenda: zoomData.agenda || agenda || null,
        startTime: zoomData.start_time ? new Date(zoomData.start_time) : new Date(),
        duration: zoomData.duration || parseInt(duration),
        joinUrl: zoomData.join_url,
        startUrl: zoomData.start_url,
        password: zoomData.password || null,
        status: startTime && new Date(startTime) > new Date() ? 'SCHEDULED' : 'LIVE',
      },
    });

    // ── Notify all enrolled students ──
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      select: { studentId: true },
    });

    if (enrollments.length > 0) {
      await prisma.notification.createMany({
        data: enrollments.map((e) => ({
          userId: e.studentId,
          title: '🔴 Live Class Started!',
          message: `Your trainer started "${meeting.topic}". Join now!`,
          type: 'WARNING',
          link: `/student/course/${courseId}`,
        })),
      });
    }

    sendSuccess(res, 'Live class started successfully.', { meeting }, 201);
  }),

  // ── DELETE /api/zoom/:id ───────────────────────────────────────────────────
  // End a live class
  endClass: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const meeting = await prisma.zoomMeeting.findUnique({ where: { id } });
    if (!meeting) return sendError(res, 'Meeting not found.', 404);

    if (req.user.role === 'INSTRUCTOR' && meeting.instructorId !== req.user.id) {
      return sendError(res, 'Not authorized.', 403);
    }

    // ── End the meeting on Zoom ──
    try {
      await zoomApiService.endMeeting(meeting.meetingId);
    } catch (zoomErr) {
      // If Zoom returns 404 the meeting may already be ended — still update our DB
      if (zoomErr.statusCode !== 404) {
        console.error('Zoom end-meeting error:', zoomErr.message);
      }
    }

    const updated = await prisma.zoomMeeting.update({
      where: { id },
      data: { status: 'ENDED' },
    });

    sendSuccess(res, 'Class ended successfully.', { meeting: updated });
  }),

  // ── POST /api/zoom/:meetingId/signature ────────────────────────────────────
  // Generate an HMAC-SHA256 signature required by the Zoom Meeting SDK
  // role: 0 = attendee, 1 = host
  getSignature: asyncHandler(async (req, res) => {
    const { meetingId } = req.params;
    const { role = 0 } = req.body;

    // Verify the meeting exists in our DB
    const meeting = await prisma.zoomMeeting.findFirst({
      where: { meetingId: String(meetingId) },
    });
    if (!meeting) return sendError(res, 'Meeting not found.', 404);

    // Only instructors / admins can be the host (role 1)
    const sdkRole =
      (req.user.role === 'INSTRUCTOR' || req.user.role === 'ADMIN') ? parseInt(role) : 0;

    const sdkKey = config.zoom.sdkKey;
    const sdkSecret = config.zoom.sdkSecret;

    const timestamp = new Date().getTime() - 30000;
    const msg = Buffer.from(`${sdkKey}${meetingId}${timestamp}${sdkRole}`).toString('base64');
    const hash = crypto.createHmac('sha256', sdkSecret).update(msg).digest('base64');
    const signature = Buffer.from(
      `${sdkKey}.${meetingId}.${timestamp}.${sdkRole}.${hash}`
    ).toString('base64');

    sendSuccess(res, 'Signature generated.', {
      signature,
      sdkKey,
      meetingNumber: meetingId,
      role: sdkRole,
      password: meeting.password || '',
    });
  }),

  // ── POST /api/zoom/:meetingId/attendance/join ──────────────────────────────
  // Record that a student joined a meeting
  joinAttendance: asyncHandler(async (req, res) => {
    const { meetingId } = req.params;
    const userId = req.user.id;

    const meeting = await prisma.zoomMeeting.findFirst({
      where: { meetingId: String(meetingId) },
    });
    if (!meeting) return sendError(res, 'Meeting not found.', 404);

    // Upsert: create or update attendance record
    const attendance = await prisma.attendance.upsert({
      where: { meetingId_studentId: { meetingId: meeting.id, studentId: userId } },
      update: { joinedAt: new Date(), leftAt: null, duration: null },
      create: { meetingId: meeting.id, studentId: userId, joinedAt: new Date() },
    });

    sendSuccess(res, 'Attendance recorded.', { attendance });
  }),

  // ── POST /api/zoom/:meetingId/attendance/leave ─────────────────────────────
  // Record that a student left a meeting
  leaveAttendance: asyncHandler(async (req, res) => {
    const { meetingId } = req.params;
    const userId = req.user.id;

    const meeting = await prisma.zoomMeeting.findFirst({
      where: { meetingId: String(meetingId) },
    });
    if (!meeting) return sendError(res, 'Meeting not found.', 404);

    const existing = await prisma.attendance.findUnique({
      where: { meetingId_studentId: { meetingId: meeting.id, studentId: userId } },
    });

    if (!existing) return sendError(res, 'No join record found.', 404);

    const leftAt = new Date();
    const durationMins = Math.round((leftAt - new Date(existing.joinedAt)) / 60000);

    const attendance = await prisma.attendance.update({
      where: { meetingId_studentId: { meetingId: meeting.id, studentId: userId } },
      data: { leftAt, duration: durationMins },
    });

    sendSuccess(res, 'Leave time recorded.', { attendance });
  }),
  // ── GET /api/zoom/calendar ─────────────────────────────────────────────────
  // Get all upcoming/recent meetings for the authenticated user's courses
  getCalendar: asyncHandler(async (req, res) => {
    let meetings = [];

    if (req.user.role === 'STUDENT') {
      // Get all courses this student is enrolled in
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: req.user.id },
        select: { courseId: true },
      });
      const courseIds = enrollments.map((e) => e.courseId);

      meetings = await prisma.zoomMeeting.findMany({
        where: { courseId: { in: courseIds } },
        include: {
          course: { select: { id: true, title: true, slug: true } },
          instructor: { select: { name: true, avatar: true } },
        },
        orderBy: { startTime: 'asc' },
      });
    } else if (req.user.role === 'INSTRUCTOR') {
      meetings = await prisma.zoomMeeting.findMany({
        where: { instructorId: req.user.id },
        include: {
          course: { select: { id: true, title: true, slug: true } },
          instructor: { select: { name: true, avatar: true } },
        },
        orderBy: { startTime: 'asc' },
      });
    } else if (req.user.role === 'ADMIN') {
      meetings = await prisma.zoomMeeting.findMany({
        include: {
          course: { select: { id: true, title: true, slug: true } },
          instructor: { select: { name: true, avatar: true } },
        },
        orderBy: { startTime: 'asc' },
        take: 200,
      });
    }

    sendSuccess(res, 'Calendar meetings fetched.', { meetings });
  }),
};

module.exports = zoomController;
