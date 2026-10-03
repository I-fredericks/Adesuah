const prisma = require('../config/db');

const promoteClass = async (schoolId, { classId, toClassId, overrides = [] }) => {
  const klass = await prisma.schoolClass.findFirst({
    where: { id: classId, schoolId },
    include: { level: true },
  });
  if (!klass) {
    const err = new Error('Class not found');
    err.status = 404;
    throw err;
  }

  const currentYear = await prisma.academicYear.findFirst({
    where: { schoolId, isCurrent: true },
  });
  if (!currentYear) {
    const err = new Error('No current academic year is set');
    err.status = 400;
    throw err;
  }

  const overrideMap = new Map(overrides.map((o) => [o.studentId, o]));
  const students = await prisma.student.findMany({
    where: { schoolId, currentClassId: classId, status: 'ACTIVE' },
    select: { id: true },
  });

  const summary = { promoted: 0, repeated: 0, graduated: 0, skipped: 0 };

  for (const student of students) {
    const ov = overrideMap.get(student.id);
    const action = ov?.action || 'PROMOTE';
    const targetClassId = ov?.toClassId || toClassId;

    if (action === 'GRADUATE') {
      await prisma.student.update({
        where: { id: student.id },
        data: { status: 'GRADUATED', currentClassId: null },
      });
      await prisma.enrollment.updateMany({
        where: { studentId: student.id, academicYearId: currentYear.id },
        data: { status: 'COMPLETED' },
      });
      summary.graduated += 1;
      continue;
    }

    if (action === 'PROMOTE' && !targetClassId) {
      summary.skipped += 1;
      continue;
    }

    const effectiveClassId = action === 'PROMOTE' ? targetClassId : classId;

    if (action === 'PROMOTE') {
      const target = await prisma.schoolClass.findFirst({
        where: { id: effectiveClassId, schoolId },
      });
      if (!target) {
        summary.skipped += 1;
        continue;
      }
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_academicYearId: {
          studentId: student.id,
          academicYearId: currentYear.id,
        },
      },
    });

    if (!existingEnrollment) {
      await prisma.enrollment.create({
        data: {
          schoolId,
          studentId: student.id,
          classId: effectiveClassId,
          academicYearId: currentYear.id,
        },
      });
    } else {
      await prisma.enrollment.update({
        where: { id: existingEnrollment.id },
        data: { classId: effectiveClassId, status: 'ACTIVE' },
      });
    }

    await prisma.student.update({
      where: { id: student.id },
      data: { currentClassId: effectiveClassId },
    });

    if (action === 'PROMOTE') summary.promoted += 1;
    else summary.repeated += 1;
  }

  return summary;
};

const transferStudent = async (schoolId, studentId, newClassId) => {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
  });
  if (!student) {
    const err = new Error('Student not found');
    err.status = 404;
    throw err;
  }

  const currentYear = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });
  if (!currentYear) {
    const err = new Error('No current academic year is set');
    err.status = 400;
    throw err;
  }

  const target = await prisma.schoolClass.findFirst({ where: { id: newClassId, schoolId } });
  if (!target) {
    const err = new Error('Target class not found');
    err.status = 404;
    throw err;
  }

  const existingEnrollment = await prisma.enrollment.findUnique({
    where: { studentId_academicYearId: { studentId, academicYearId: currentYear.id } },
  });

  if (existingEnrollment) {
    await prisma.enrollment.update({
      where: { id: existingEnrollment.id },
      data: { classId: newClassId },
    });
  } else {
    await prisma.enrollment.create({
      data: { schoolId, studentId, classId: newClassId, academicYearId: currentYear.id },
    });
  }

  return prisma.student.update({
    where: { id: studentId },
    data: { currentClassId: newClassId },
  });
};

module.exports = { promoteClass, transferStudent };
