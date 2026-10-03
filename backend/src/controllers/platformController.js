const bcrypt = require('bcrypt');
const prisma = require('../config/db');
const { uniqueSlug, seedSchoolDefaults } = require('../services/onboardingService');

const listSchools = async (req, res) => {
  const schools = await prisma.school.findMany({
    include: {
      _count: { select: { students: true, users: true, classes: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ schools });
};

const createSchool = async (req, res) => {
  const { name, city, phone, plan, owner } = req.body;

  const emailTaken = await prisma.user.findUnique({ where: { email: owner.email } });
  if (emailTaken) {
    return res.status(409).json({ message: 'A user with this email already exists' });
  }

  const slug = await uniqueSlug(name);

  const school = await prisma.school.create({
    data: {
      name,
      slug,
      city,
      phone,
      plan: plan || 'FREE',
      subscriptionStatus: plan && plan !== 'FREE' ? 'ACTIVE' : 'TRIAL',
      trialEndsAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
  });

  const ownerUser = await prisma.user.create({
    data: {
      schoolId: school.id,
      email: owner.email,
      phone: owner.phone || null,
      password: await bcrypt.hash(owner.password, 10),
      name: owner.name,
      role: 'OWNER',
    },
  });

  await seedSchoolDefaults(school.id);

  res.status(201).json({
    school,
    owner: { id: ownerUser.id, name: ownerUser.name, email: ownerUser.email },
  });
};

const getSchool = async (req, res) => {
  const school = await prisma.school.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      users: { select: { id: true, name: true, email: true, role: true, isActive: true } },
      _count: { select: { students: true, classes: true, subjects: true } },
    },
  });
  if (!school) return res.status(404).json({ message: 'School not found' });
  res.json({ school });
};

const updateSchoolStatus = async (req, res) => {
  const school = await prisma.school.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(req.body.isActive !== undefined ? { isActive: req.body.isActive } : {}),
      ...(req.body.subscriptionStatus ? { subscriptionStatus: req.body.subscriptionStatus } : {}),
      ...(req.body.plan ? { plan: req.body.plan } : {}),
    },
  });
  res.json({ school });
};

const platformStats = async (req, res) => {
  const [schoolCount, activeSchools, studentCount, userCount] = await Promise.all([
    prisma.school.count(),
    prisma.school.count({ where: { isActive: true } }),
    prisma.student.count(),
    prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' } } }),
  ]);
  res.json({ schoolCount, activeSchools, studentCount, userCount });
};

module.exports = { listSchools, createSchool, getSchool, updateSchoolStatus, platformStats };
