const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { uniqueSlug, seedSchoolDefaults } = require('../services/onboardingService');
const { getUserPermissions } = require('../services/permissionService');
const { audit } = require('../services/auditService');
const { normalizeRole } = require('../utils/permissions');

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role, schoolId: user.schoolId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  schoolId: user.schoolId,
});

const authPayload = async (user) => {
  const permissions = await getUserPermissions({ ...user, role: normalizeRole(user.role) });
  return { token: signToken(user), user: publicUser(user), permissions };
};

const registerSchool = async (req, res) => {
  const { school, owner, academicYear } = req.body;

  const emailTaken = await prisma.user.findUnique({ where: { email: owner.email } });
  if (emailTaken) {
    return res.status(409).json({ message: 'An account with this email already exists' });
  }

  const slug = await uniqueSlug(school.name);

  const result = await prisma.$transaction(async (tx) => {
    const createdSchool = await tx.school.create({
      data: {
        name: school.name,
        slug,
        shortName: school.shortName,
        motto: school.motto,
        address: school.address,
        city: school.city,
        region: school.region,
        phone: school.phone,
        email: school.email || null,
        gesRegNumber: school.gesRegNumber,
        plan: 'FREE',
        subscriptionStatus: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    });

    const ownerUser = await tx.user.create({
      data: {
        schoolId: createdSchool.id,
        email: owner.email,
        phone: owner.phone || null,
        password: await bcrypt.hash(owner.password, 10),
        name: owner.name,
        role: 'OWNER',
      },
    });

    return { createdSchool, ownerUser };
  });

  await seedSchoolDefaults(result.createdSchool.id, academicYear || {});

  res.status(201).json({
    ...(await authPayload(result.ownerUser)),
    school: { id: result.createdSchool.id, name: result.createdSchool.name, slug: result.createdSchool.slug },
  });
};

const login = async (req, res) => {
  const { identifier, password } = req.body;
  const id = String(identifier).trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: id }, { phone: String(identifier).trim() }],
    },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }
  if (!user.isActive) {
    return res.status(403).json({ message: 'This account has been deactivated. Contact your school administrator.' });
  }

  const school = user.schoolId
    ? await prisma.school.findUnique({
        where: { id: user.schoolId },
        select: { id: true, name: true, slug: true, logoUrl: true, isActive: true },
      })
    : null;

  if (school && !school.isActive) {
    return res.status(403).json({ message: 'This school account is suspended. Contact the platform administrator.' });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  res.json({ ...(await authPayload(user)), school });
};

const me = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      schoolId: true,
      school: {
        select: {
          id: true,
          name: true,
          slug: true,
          shortName: true,
          logoUrl: true,
          motto: true,
          address: true,
          city: true,
          region: true,
          phone: true,
          email: true,
          gesRegNumber: true,
          plan: true,
          subscriptionStatus: true,
          settings: true,
        },
      },
    },
  });
  const permissions = await getUserPermissions({ ...req.user, schoolId: user.schoolId });
  res.json({ user: { ...user, role: normalizeRole(user.role) }, permissions });
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(newPassword, 10),
      passwordChangedAt: new Date(),
    },
  });
  res.json({ message: 'Password changed. Please sign in again.' });
};

const updateProfile = async (req, res) => {
  const { name, avatarUrl } = req.body;
  if (avatarUrl && avatarUrl.length > 1_500_000) {
    return res.status(400).json({ message: 'Image is too large — please choose a smaller photo' });
  }
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(name ? { name } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
    },
  });

  audit({
    schoolId: user.schoolId || 0,
    userId: user.id,
    action: 'PROFILE_UPDATE',
    entity: 'user',
    entityId: user.id,
    after: { name: user.name, avatarChanged: avatarUrl !== undefined },
  });

  res.json({
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatarUrl: user.avatarUrl },
  });
};

const forgotPassword = async (req, res) => {
  res.status(503).json({
    message:
      'Self-service reset is not available yet. Please ask your school administrator to reset your password.',
  });
};

module.exports = { registerSchool, login, me, updateProfile, changePassword, forgotPassword };
