-- CreateTable
CREATE TABLE "messagelog" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'sms',
    "recipient" TEXT NOT NULL,
    "studentId" INTEGER,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'logged',
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messagelog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messagelog_schoolId_createdAt_idx" ON "messagelog"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "messagelog_schoolId_status_idx" ON "messagelog"("schoolId", "status");

-- AddForeignKey
ALTER TABLE "messagelog" ADD CONSTRAINT "messagelog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messagelog" ADD CONSTRAINT "messagelog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
