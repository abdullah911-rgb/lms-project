const express = require('express');
const router = express.Router();
const zoomController = require('../controllers/zoomController');
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');

const instructorOrAdmin = requireRole('INSTRUCTOR', 'ADMIN');
const isAdmin = [requireAuth, requireRole('ADMIN')];

// ── Calendar (must be before /:id routes to avoid conflict) ──────────────────
router.get('/calendar', requireAuth, zoomController.getCalendar);

// ── Admin class approvals ─────────────────────────────────────────────────────
router.get('/admin/pending', ...isAdmin, zoomController.getPendingApprovals);
router.patch('/:id/approve', ...isAdmin, zoomController.approveMeeting);
router.patch('/:id/reject', ...isAdmin, zoomController.rejectMeeting);

// ── Meetings ──────────────────────────────────────────────────────────────────
router.get('/course/:courseId', requireAuth, zoomController.getByCourse);
router.post('/course/:courseId', requireAuth, instructorOrAdmin, zoomController.create);
router.delete('/:id', requireAuth, instructorOrAdmin, zoomController.endClass);

// ── Meeting SDK Signature (all authenticated users) ───────────────────────────
router.post('/:meetingId/signature', requireAuth, zoomController.getSignature);

// ── Attendance Tracking ───────────────────────────────────────────────────────
router.post('/:meetingId/attendance/join', requireAuth, zoomController.joinAttendance);
router.post('/:meetingId/attendance/leave', requireAuth, zoomController.leaveAttendance);

module.exports = router;
