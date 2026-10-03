-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'OWNER', 'ADMIN', 'TEACHER', 'ACCOUNTANT', 'PARENT');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'STANDARD', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TermName" AS ENUM ('TERM_1', 'TERM_2', 'TERM_3');

-- CreateEnum
CREATE TYPE "LevelStage" AS ENUM ('KG', 'PRIMARY', 'JHS');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "GuardianRelationship" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN', 'OTHER');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'WAIVED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MOMO', 'BANK', 'CHEQUE', 'OTHER');

-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('ALL', 'STAFF', 'CLASS');

-- CreateTable
CREATE TABLE "school" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortName" TEXT,
    "logoUrl" TEXT,
    "motto" TEXT,
    "address" TEXT,
    "city" TEXT,
    "region" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "gesRegNumber" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "trialEndsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER,
    "email" TEXT,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'TEACHER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staffprofile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "staffNo" TEXT NOT NULL,
    "position" TEXT,
    "qualification" TEXT,
    "hiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staffprofile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academicyear" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academicyear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "name" "TermName" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "vacationDate" TIMESTAMP(3),
    "nextTermBegins" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "term_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "stage" "LevelStage" NOT NULL DEFAULT 'PRIMARY',
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schoolclass" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "levelId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "classTeacherId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schoolclass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isCore" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classsubject" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "teacherId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "assessmenttype" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "shortCode" TEXT,
    "weight" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessmenttype_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gradingscale" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "levelId" INTEGER,
    "grade" TEXT NOT NULL,
    "minScore" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "descriptor" TEXT,
    "remark" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gradingscale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "admissionNo" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "otherNames" TEXT,
    "gender" "Gender" NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "photoUrl" TEXT,
    "address" TEXT,
    "healthNotes" TEXT,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentClassId" INTEGER,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardian" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" "GuardianRelationship" NOT NULL DEFAULT 'GUARDIAN',
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT,
    "occupation" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendancerecord" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "reason" TEXT,
    "markedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendancerecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "termId" INTEGER NOT NULL,
    "assessmentTypeId" INTEGER NOT NULL,
    "rawScore" DOUBLE PRECISION NOT NULL,
    "enteredById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportcard" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "termId" INTEGER NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "average" DOUBLE PRECISION NOT NULL,
    "classPosition" INTEGER NOT NULL,
    "subjectsCount" INTEGER NOT NULL,
    "daysPresent" INTEGER NOT NULL,
    "daysOpened" INTEGER NOT NULL,
    "subjects" JSONB NOT NULL,
    "teacherRemark" TEXT,
    "headRemark" TEXT,
    "conduct" TEXT,
    "interest" TEXT,
    "talent" TEXT,
    "promoted" BOOLEAN,
    "promotedTo" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reportcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feestructure" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "termId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Term fees',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feestructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feeitem" (
    "id" SERIAL NOT NULL,
    "structureId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feeitem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "termId" INTEGER NOT NULL,
    "structureId" INTEGER,
    "amountTotal" DECIMAL(12,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoiceitem" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoiceitem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "receiptNo" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "authorId" INTEGER,
    "classId" INTEGER,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" "Audience" NOT NULL DEFAULT 'ALL',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "smsSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "school_slug_key" ON "school"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_phone_key" ON "user"("phone");

-- CreateIndex
CREATE INDEX "user_schoolId_role_idx" ON "user"("schoolId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "staffprofile_userId_key" ON "staffprofile"("userId");

-- CreateIndex
CREATE INDEX "staffprofile_schoolId_idx" ON "staffprofile"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "staffprofile_schoolId_staffNo_key" ON "staffprofile"("schoolId", "staffNo");

-- CreateIndex
CREATE INDEX "academicyear_schoolId_idx" ON "academicyear"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "academicyear_schoolId_name_key" ON "academicyear"("schoolId", "name");

-- CreateIndex
CREATE INDEX "term_schoolId_isCurrent_idx" ON "term"("schoolId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "term_academicYearId_name_key" ON "term"("academicYearId", "name");

-- CreateIndex
CREATE INDEX "level_schoolId_order_idx" ON "level"("schoolId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "level_schoolId_name_key" ON "level"("schoolId", "name");

-- CreateIndex
CREATE INDEX "schoolclass_schoolId_levelId_idx" ON "schoolclass"("schoolId", "levelId");

-- CreateIndex
CREATE UNIQUE INDEX "schoolclass_schoolId_name_key" ON "schoolclass"("schoolId", "name");

-- CreateIndex
CREATE INDEX "subject_schoolId_idx" ON "subject"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "subject_schoolId_name_key" ON "subject"("schoolId", "name");

-- CreateIndex
CREATE INDEX "classsubject_schoolId_idx" ON "classsubject"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "classsubject_classId_subjectId_key" ON "classsubject"("classId", "subjectId");

-- CreateIndex
CREATE INDEX "assessmenttype_schoolId_idx" ON "assessmenttype"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "assessmenttype_schoolId_name_key" ON "assessmenttype"("schoolId", "name");

-- CreateIndex
CREATE INDEX "gradingscale_schoolId_idx" ON "gradingscale"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "gradingscale_schoolId_levelId_grade_key" ON "gradingscale"("schoolId", "levelId", "grade");

-- CreateIndex
CREATE INDEX "student_schoolId_status_idx" ON "student"("schoolId", "status");

-- CreateIndex
CREATE INDEX "student_schoolId_lastName_idx" ON "student"("schoolId", "lastName");

-- CreateIndex
CREATE INDEX "student_currentClassId_idx" ON "student"("currentClassId");

-- CreateIndex
CREATE UNIQUE INDEX "student_schoolId_admissionNo_key" ON "student"("schoolId", "admissionNo");

-- CreateIndex
CREATE INDEX "guardian_studentId_idx" ON "guardian"("studentId");

-- CreateIndex
CREATE INDEX "guardian_phone_idx" ON "guardian"("phone");

-- CreateIndex
CREATE INDEX "enrollment_schoolId_academicYearId_classId_idx" ON "enrollment"("schoolId", "academicYearId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "enrollment_studentId_academicYearId_key" ON "enrollment"("studentId", "academicYearId");

-- CreateIndex
CREATE INDEX "attendancerecord_schoolId_classId_date_idx" ON "attendancerecord"("schoolId", "classId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendancerecord_studentId_date_key" ON "attendancerecord"("studentId", "date");

-- CreateIndex
CREATE INDEX "score_schoolId_termId_classId_subjectId_idx" ON "score"("schoolId", "termId", "classId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "score_studentId_subjectId_termId_assessmentTypeId_key" ON "score"("studentId", "subjectId", "termId", "assessmentTypeId");

-- CreateIndex
CREATE INDEX "reportcard_schoolId_termId_classId_idx" ON "reportcard"("schoolId", "termId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "reportcard_studentId_termId_key" ON "reportcard"("studentId", "termId");

-- CreateIndex
CREATE INDEX "feestructure_schoolId_termId_idx" ON "feestructure"("schoolId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "feestructure_termId_classId_key" ON "feestructure"("termId", "classId");

-- CreateIndex
CREATE INDEX "feeitem_structureId_idx" ON "feeitem"("structureId");

-- CreateIndex
CREATE INDEX "invoice_schoolId_termId_status_idx" ON "invoice"("schoolId", "termId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_studentId_termId_key" ON "invoice"("studentId", "termId");

-- CreateIndex
CREATE INDEX "invoiceitem_invoiceId_idx" ON "invoiceitem"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_receiptNo_key" ON "payment"("receiptNo");

-- CreateIndex
CREATE INDEX "payment_schoolId_paidAt_idx" ON "payment"("schoolId", "paidAt");

-- CreateIndex
CREATE INDEX "payment_invoiceId_idx" ON "payment"("invoiceId");

-- CreateIndex
CREATE INDEX "announcement_schoolId_createdAt_idx" ON "announcement"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_userId_createdAt_idx" ON "notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_userId_readAt_idx" ON "notification"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staffprofile" ADD CONSTRAINT "staffprofile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academicyear" ADD CONSTRAINT "academicyear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term" ADD CONSTRAINT "term_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term" ADD CONSTRAINT "term_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academicyear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level" ADD CONSTRAINT "level_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schoolclass" ADD CONSTRAINT "schoolclass_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schoolclass" ADD CONSTRAINT "schoolclass_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schoolclass" ADD CONSTRAINT "schoolclass_classTeacherId_fkey" FOREIGN KEY ("classTeacherId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject" ADD CONSTRAINT "subject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classsubject" ADD CONSTRAINT "classsubject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classsubject" ADD CONSTRAINT "classsubject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "schoolclass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classsubject" ADD CONSTRAINT "classsubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classsubject" ADD CONSTRAINT "classsubject_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessmenttype" ADD CONSTRAINT "assessmenttype_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gradingscale" ADD CONSTRAINT "gradingscale_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gradingscale" ADD CONSTRAINT "gradingscale_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_currentClassId_fkey" FOREIGN KEY ("currentClassId") REFERENCES "schoolclass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian" ADD CONSTRAINT "guardian_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian" ADD CONSTRAINT "guardian_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "schoolclass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academicyear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendancerecord" ADD CONSTRAINT "attendancerecord_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendancerecord" ADD CONSTRAINT "attendancerecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendancerecord" ADD CONSTRAINT "attendancerecord_classId_fkey" FOREIGN KEY ("classId") REFERENCES "schoolclass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendancerecord" ADD CONSTRAINT "attendancerecord_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score" ADD CONSTRAINT "score_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score" ADD CONSTRAINT "score_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score" ADD CONSTRAINT "score_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score" ADD CONSTRAINT "score_classId_fkey" FOREIGN KEY ("classId") REFERENCES "schoolclass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score" ADD CONSTRAINT "score_termId_fkey" FOREIGN KEY ("termId") REFERENCES "term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score" ADD CONSTRAINT "score_assessmentTypeId_fkey" FOREIGN KEY ("assessmentTypeId") REFERENCES "assessmenttype"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score" ADD CONSTRAINT "score_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportcard" ADD CONSTRAINT "reportcard_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportcard" ADD CONSTRAINT "reportcard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportcard" ADD CONSTRAINT "reportcard_termId_fkey" FOREIGN KEY ("termId") REFERENCES "term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feestructure" ADD CONSTRAINT "feestructure_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feestructure" ADD CONSTRAINT "feestructure_termId_fkey" FOREIGN KEY ("termId") REFERENCES "term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feeitem" ADD CONSTRAINT "feeitem_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "feestructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_termId_fkey" FOREIGN KEY ("termId") REFERENCES "term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "feestructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoiceitem" ADD CONSTRAINT "invoiceitem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_classId_fkey" FOREIGN KEY ("classId") REFERENCES "schoolclass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
