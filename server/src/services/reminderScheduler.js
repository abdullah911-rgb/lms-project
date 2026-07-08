const cron = require('node-cron');
const prisma = require('../config/db');
const { sendEmail, emailTemplates } = require('../utils/sendEmail');

/**
 * Runs every minute.
 * Finds meetings starting in 30 minutes and sends reminder emails to enrolled students.
 * Finds meetings starting in 10 minutes and sends urgent reminder emails.
 */
function startReminderScheduler() {
  console.log('⏰ Reminder scheduler started.');

  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // ── 30-minute reminder window ──────────────────────────────────────
      const in30Min = new Date(now.getTime() + 30 * 60 * 1000);
      const in31Min = new Date(now.getTime() + 31 * 60 * 1000);

      const upcoming30 = await prisma.zoomMeeting.findMany({
        where: {
          status: 'SCHEDULED',
          startTime: { gte: in30Min, lt: in31Min },
        },
        include: {
          course: {
            include: {
              enrollments: { include: { student: true } },
            },
          },
          instructor: { select: { name: true } },
        },
      });

      for (const meeting of upcoming30) {
        for (const enrollment of meeting.course.enrollments) {
          const student = enrollment.student;
          if (!student?.email) continue;
          try {
            const template = emailTemplates.classReminder({
              studentName: student.name,
              topic: meeting.topic,
              courseName: meeting.course.title,
              instructorName: meeting.instructor.name,
              startTime: meeting.startTime,
              minutesUntil: 30,
              courseId: meeting.courseId,
            });
            await sendEmail({ to: student.email, ...template });
          } catch (emailErr) {
            console.error(`Reminder email error for ${student.email}:`, emailErr.message);
          }
        }
      }

      // ── 10-minute reminder window ──────────────────────────────────────
      const in10Min = new Date(now.getTime() + 10 * 60 * 1000);
      const in11Min = new Date(now.getTime() + 11 * 60 * 1000);

      const upcoming10 = await prisma.zoomMeeting.findMany({
        where: {
          status: 'SCHEDULED',
          startTime: { gte: in10Min, lt: in11Min },
        },
        include: {
          course: {
            include: {
              enrollments: { include: { student: true } },
            },
          },
          instructor: { select: { name: true } },
        },
      });

      for (const meeting of upcoming10) {
        for (const enrollment of meeting.course.enrollments) {
          const student = enrollment.student;
          if (!student?.email) continue;
          try {
            const template = emailTemplates.classReminder({
              studentName: student.name,
              topic: meeting.topic,
              courseName: meeting.course.title,
              instructorName: meeting.instructor.name,
              startTime: meeting.startTime,
              minutesUntil: 10,
              courseId: meeting.courseId,
            });
            await sendEmail({ to: student.email, ...template });
          } catch (emailErr) {
            console.error(`Reminder email error for ${student.email}:`, emailErr.message);
          }
        }
      }

      // ── Auto-start meetings whose scheduled time has passed ────────────
      const pastScheduled = await prisma.zoomMeeting.findMany({
        where: {
          status: 'SCHEDULED',
          startTime: { lte: now },
        },
      });

      for (const meeting of pastScheduled) {
        await prisma.zoomMeeting.update({
          where: { id: meeting.id },
          data: { status: 'LIVE' },
        });
      }

    } catch (err) {
      console.error('Reminder scheduler error:', err.message);
    }
  });
}

module.exports = { startReminderScheduler };
