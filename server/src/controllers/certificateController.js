const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const certificateController = {

  // ── GET /api/certificates/:courseId — issue or fetch a student certificate ─
  getCertificate: asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const studentId = req.user.id;

    // Must be enrolled and completed
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
      include: { course: { include: { instructor: { select: { name: true } } } } },
    });

    if (!enrollment) return sendError(res, 'You are not enrolled in this course.', 403);
    if (!enrollment.course.certificate) {
      return sendError(res, 'This course does not offer a certificate.', 400);
    }

    // Auto-issue certificate if progress >= 80%
    if (enrollment.progress < 80) {
      return sendError(
        res,
        `You need to complete at least 80% of the course to get a certificate. Current progress: ${Math.round(enrollment.progress)}%`,
        400,
      );
    }

    // Find or create certificate
    let certificate = await prisma.certificate.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
      include: {
        student: { select: { name: true, email: true } },
        course: { include: { instructor: { select: { name: true } } } },
      },
    });

    if (!certificate) {
      certificate = await prisma.certificate.create({
        data: { studentId, courseId },
        include: {
          student: { select: { name: true, email: true } },
          course: { include: { instructor: { select: { name: true } } } },
        },
      });
    }

    sendSuccess(res, 'Certificate ready.', {
      certificate: {
        id: certificate.id,
        verificationCode: certificate.verificationCode,
        issuedAt: certificate.issuedAt,
        studentName: certificate.student.name,
        studentEmail: certificate.student.email,
        courseTitle: certificate.course.title,
        instructorName: certificate.course.instructor?.name || 'N/A',
        courseLevel: certificate.course.level,
      },
    });
  }),



  // ── GET /api/certificates/my — get all my certificates ────────────────────
  getMyCertificates: asyncHandler(async (req, res) => {
    const certificates = await prisma.certificate.findMany({
      where: { studentId: req.user.id },
      include: {
        course: { select: { title: true, thumbnail: true, level: true, instructor: { select: { name: true } } } },
      },
      orderBy: { issuedAt: 'desc' },
    });
    sendSuccess(res, 'Certificates retrieved.', { certificates });
  }),
};

module.exports = certificateController;
