-- AlterEnum: add PENDING_APPROVAL and REJECTED to MeetingStatus
ALTER TYPE "MeetingStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';
ALTER TYPE "MeetingStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- AlterTable: make Zoom fields optional and add rejectedNote
ALTER TABLE "zoom_meetings" ALTER COLUMN "meetingId" DROP NOT NULL;
ALTER TABLE "zoom_meetings" ALTER COLUMN "joinUrl" DROP NOT NULL;
ALTER TABLE "zoom_meetings" ADD COLUMN IF NOT EXISTS "rejectedNote" TEXT;

-- Existing meetings without approval were already live — keep them as-is
-- UPDATE "zoom_meetings" SET "status" = 'SCHEDULED' WHERE "status" = 'PENDING_APPROVAL' AND "meetingId" IS NOT NULL;
