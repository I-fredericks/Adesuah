const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { seedSchoolDefaults } = require('../src/services/onboardingService');

const DEMO_EMAIL = 'proprietor@demo-school.edu.gh';

const seed = async () => {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    console.log('Demo data already seeded. Delete the database rows first if you want to reseed.');
    return;
  }

  const school = await prisma.school.create({
    data: {
      name: 'Rising Stars Academy',
      slug: 'rising-stars-academy',
      shortName: 'RSA',
      motto: 'Knowledge, Discipline, Success',
      address: '12 Palm Street',
      city: 'Kumasi',
      region: 'Ashanti',
      phone: '+233201234567',
      email: 'info@demo-school.edu.gh',
      gesRegNumber: 'GES-ASH-0123',
    },
  });

  await seedSchoolDefaults(school.id);

  const [ownerPw, teacherPw, bursarPw] = await Promise.all([
    bcrypt.hash('Password123', 10),
    bcrypt.hash('Password123', 10),
    bcrypt.hash('Password123', 10),
  ]);

  const [owner, teacher, bursar] = await Promise.all([
    prisma.user.create({
      data: {
        schoolId: school.id,
        name: 'Kwame Mensah',
        email: DEMO_EMAIL,
        phone: '+233201234567',
        password: ownerPw,
        role: 'OWNER',
      },
    }),
    prisma.user.create({
      data: {
        schoolId: school.id,
        name: 'Akosua Boateng',
        email: 'teacher@demo-school.edu.gh',
        password: teacherPw,
        role: 'TEACHER',
      },
    }),
    prisma.user.create({
      data: {
        schoolId: school.id,
        name: 'Yaw Owusu',
        email: 'bursar@demo-school.edu.gh',
        password: bursarPw,
        role: 'ACCOUNTANT',
      },
    }),
  ]);

  const levels = await prisma.level.findMany({ where: { schoolId: school.id }, orderBy: { order: 'asc' } });
  const primary4 = levels.find((l) => l.name === 'Primary 4');
  const jhs3 = levels.find((l) => l.name === 'JHS 3');
  const classes = await prisma.schoolClass.findMany({ where: { schoolId: school.id } });
  const p4Class = classes.find((c) => c.levelId === primary4.id);
  const jhs3Class = classes.find((c) => c.levelId === jhs3.id);

  await prisma.schoolClass.update({ where: { id: p4Class.id }, data: { classTeacherId: teacher.id } });

  const year = await prisma.academicYear.findFirst({ where: { schoolId: school.id, isCurrent: true } });

  const firstNames = ['Ama', 'Kofi', 'Abena', 'Kwesi', 'Efua', 'Yaw', 'Adjoa', 'Kwabena', 'Akua', 'Nana'];
  const lastNames = ['Mensah', 'Owusu', 'Boateng', 'Asante', 'Darko', 'Appiah', 'Agyeman', 'Osei'];
  const guardianNames = ['Mr. Mensah', 'Mrs. Owusu', 'Mr. Boateng', 'Madam Asante'];

  let counter = 1;
  const makeStudents = async (classId, count) => {
    for (let i = 0; i < count; i++) {
      const gender = i % 2 === 0 ? 'FEMALE' : 'MALE';
      const firstName = firstNames[(i + counter) % firstNames.length];
      const lastName = lastNames[(i * 3 + counter) % lastNames.length];
      await prisma.student.create({
        data: {
          schoolId: school.id,
          admissionNo: `ADM-${new Date().getFullYear()}-${String(counter).padStart(4, '0')}`,
          firstName,
          lastName,
          gender,
          dateOfBirth: new Date(2013 + (counter % 5), (counter * 3) % 12, ((counter * 7) % 27) + 1),
          status: 'ACTIVE',
          currentClassId: classId,
          guardians: {
            create: {
              name: guardianNames[counter % guardianNames.length],
              relationship: i % 2 === 0 ? 'FATHER' : 'MOTHER',
              phone: `+23320123${String(4000 + counter)}`,
              isPrimary: true,
            },
          },
          enrollments: {
            create: { schoolId: school.id, classId, academicYearId: year.id },
          },
        },
      });
      counter += 1;
    }
  };

  await makeStudents(p4Class.id, 12);
  await makeStudents(jhs3Class.id, 10);

  console.log('Seed complete:');
  console.log(`  School: Rising Stars Academy (id ${school.id})`);
  console.log(`  Owner:  ${DEMO_EMAIL} / Password123`);
  console.log('  Teacher: teacher@demo-school.edu.gh / Password123');
  console.log('  Bursar:  bursar@demo-school.edu.gh / Password123');
  console.log(`  Classes: ${classes.length}, Students: ${counter - 1}`);
};

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
