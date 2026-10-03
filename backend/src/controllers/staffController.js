const bcrypt = require('bcrypt');
const prisma = require('../config/db');
const { resolveSchoolId } = require('../middlewares/authMiddleware');
const { STAFF_ROLES } = require('../utils/permissions');

const listStaff = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const staff = await prisma.user.findMany({
    where: { schoolId, role: { in: STAFF_ROLES } },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      staffProfile: { select: { staffNo: true, position: true, qualification: true } },
      _count: { select: { taughtSubjects: true } },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });
  res.json({ staff });
};

const createStaff = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const { name, role, email, phone, password, staffNo, position } = req.body;

  if (email) {
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken) return res.status(409).json({ message: 'A user with this email already exists' });
  }
  if (phone) {
    const taken = await prisma.user.findUnique({ where: { phone } });
    if (taken) return res.status(409).json({ message: 'A user with this phone number already exists' });
  }

  let effectiveStaffNo = staffNo;
  if (!effectiveStaffNo) {
    const count = await prisma.staffProfile.count({ where: { schoolId } });
    effectiveStaffNo = `STF-${String(count + 1).padStart(3, '0')}`;
  }

  const user = await prisma.user.create({
    data: {
      schoolId,
      name,
      role,
      email: email || null,
      phone: phone || null,
      password: await bcrypt.hash(password, 10),
      staffProfile: {
        create: { schoolId, staffNo: effectiveStaffNo, position },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      staffProfile: { select: { staffNo: true, position: true } },
    },
  });

  res.status(201).json({ staff: user });
};

const updateStaff = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const user = await prisma.user.findFirst({
    where: { id: Number(req.params.id), schoolId, role: { in: STAFF_ROLES } },
  });
  if (!user) return res.status(404).json({ message: 'Staff member not found' });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(req.body.name ? { name: req.body.name } : {}),
      ...(req.body.role ? { role: req.body.role } : {}),
      ...(req.body.isActive !== undefined ? { isActive: req.body.isActive } : {}),
      ...(req.body.phone !== undefined ? { phone: req.body.phone || null } : {}),
      ...(req.body.position !== undefined && user.staffProfile
        ? {}
        : {}),
      staffProfile:
        req.body.position !== undefined && user.staffProfile
          ? { update: { position: req.body.position } }
          : undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      staffProfile: { select: { staffNo: true, position: true } },
    },
  });
  res.json({ staff: updated });
};

const resetStaffPassword = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const user = await prisma.user.findFirst({
    where: { id: Number(req.params.id), schoolId, role: { in: STAFF_ROLES } },
  });
  if (!user) return res.status(404).json({ message: 'Staff member not found' });

  const tempPassword = `sch-${Math.random().toString(36).slice(2, 10)}`;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(tempPassword, 10),
      passwordChangedAt: new Date(),
    },
  });
  res.json({
    message: 'Password reset. Share the temporary password with the staff member.',
    tempPassword,
  });
};

module.exports = { listStaff, createStaff, updateStaff, resetStaffPassword };
