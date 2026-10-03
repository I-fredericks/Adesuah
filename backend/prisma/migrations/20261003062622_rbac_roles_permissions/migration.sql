-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'HEADTEACHER';
ALTER TYPE "Role" ADD VALUE 'DEPUTY_HEAD';
ALTER TYPE "Role" ADD VALUE 'ACADEMIC_COORDINATOR';
ALTER TYPE "Role" ADD VALUE 'SECRETARY';
ALTER TYPE "Role" ADD VALUE 'SUPPORT_STAFF';

-- CreateTable
CREATE TABLE "rolepermission" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "role" "Role" NOT NULL,
    "permission" TEXT NOT NULL,

    CONSTRAINT "rolepermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rolepermission_schoolId_role_idx" ON "rolepermission"("schoolId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "rolepermission_schoolId_role_permission_key" ON "rolepermission"("schoolId", "role", "permission");

-- AddForeignKey
ALTER TABLE "rolepermission" ADD CONSTRAINT "rolepermission_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;
