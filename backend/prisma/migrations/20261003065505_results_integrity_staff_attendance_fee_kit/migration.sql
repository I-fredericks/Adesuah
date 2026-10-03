-- CreateEnum
CREATE TYPE "CorrectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "invoice" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "lastRemindedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "reportcard" ADD COLUMN     "locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedById" INTEGER;

-- CreateTable
CREATE TABLE "auditlog" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditlog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resultcorrection" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "termId" INTEGER NOT NULL,
    "assessmentTypeId" INTEGER NOT NULL,
    "oldScore" DOUBLE PRECISION NOT NULL,
    "newScore" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "CorrectionStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" INTEGER,
    "decidedById" INTEGER,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resultcorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staffattendance" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "note" TEXT,
    "markedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staffattendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoiceinstallment" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "label" TEXT DEFAULT 'Instalment',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoiceinstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auditlog_schoolId_createdAt_idx" ON "auditlog"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "auditlog_schoolId_entity_entityId_idx" ON "auditlog"("schoolId", "entity", "entityId");

-- CreateIndex
CREATE INDEX "resultcorrection_schoolId_status_idx" ON "resultcorrection"("schoolId", "status");

-- CreateIndex
CREATE INDEX "resultcorrection_studentId_termId_idx" ON "resultcorrection"("studentId", "termId");

-- CreateIndex
CREATE INDEX "staffattendance_schoolId_date_idx" ON "staffattendance"("schoolId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "staffattendance_userId_date_key" ON "staffattendance"("userId", "date");

-- CreateIndex
CREATE INDEX "invoiceinstallment_invoiceId_dueDate_idx" ON "invoiceinstallment"("invoiceId", "dueDate");

-- AddForeignKey
ALTER TABLE "auditlog" ADD CONSTRAINT "auditlog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditlog" ADD CONSTRAINT "auditlog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultcorrection" ADD CONSTRAINT "resultcorrection_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultcorrection" ADD CONSTRAINT "resultcorrection_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultcorrection" ADD CONSTRAINT "resultcorrection_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultcorrection" ADD CONSTRAINT "resultcorrection_termId_fkey" FOREIGN KEY ("termId") REFERENCES "term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultcorrection" ADD CONSTRAINT "resultcorrection_assessmentTypeId_fkey" FOREIGN KEY ("assessmentTypeId") REFERENCES "assessmenttype"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultcorrection" ADD CONSTRAINT "resultcorrection_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultcorrection" ADD CONSTRAINT "resultcorrection_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staffattendance" ADD CONSTRAINT "staffattendance_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staffattendance" ADD CONSTRAINT "staffattendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staffattendance" ADD CONSTRAINT "staffattendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportcard" ADD CONSTRAINT "reportcard_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoiceinstallment" ADD CONSTRAINT "invoiceinstallment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
