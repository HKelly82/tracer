-- CreateEnum
CREATE TYPE "WaitingOn" AS ENUM ('Me', 'Client', 'Lender', 'Passive');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('Eileen', 'Direct');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('Pending', 'InProgress', 'Complete', 'Skipped');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEventType" ADD VALUE 'TaskCompleted';
ALTER TYPE "AuditEventType" ADD VALUE 'TaskSkipped';
ALTER TYPE "AuditEventType" ADD VALUE 'NoteAdded';
ALTER TYPE "AuditEventType" ADD VALUE 'WaitingOnChanged';
ALTER TYPE "AuditEventType" ADD VALUE 'DocumentCheckCompleted';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Stage" ADD VALUE 'Lead';
ALTER TYPE "Stage" ADD VALUE 'ClientResponse';
ALTER TYPE "Stage" ADD VALUE 'LenderProcessing';
ALTER TYPE "Stage" ADD VALUE 'Offered';

-- AlterTable
ALTER TABLE "ASFDraft" ADD COLUMN     "markedComplete" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "clientSummary" TEXT,
ADD COLUMN     "feeArrangement" TEXT DEFAULT '£200 advice + £150 admin',
ADD COLUMN     "leadSource" "LeadSource" NOT NULL DEFAULT 'Direct',
ADD COLUMN     "waitingOn" "WaitingOn" NOT NULL DEFAULT 'Me';

-- AlterTable
ALTER TABLE "SuitabilityDraft" ADD COLUMN     "markedComplete" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'Pending',
    "waitingOn" "WaitingOn" NOT NULL DEFAULT 'Me',
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Applicant',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentCheck" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "personId" TEXT,
    "documentName" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "monthsCovered" TEXT,
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "DocumentCheck_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentCheck" ADD CONSTRAINT "DocumentCheck_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentCheck" ADD CONSTRAINT "DocumentCheck_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
