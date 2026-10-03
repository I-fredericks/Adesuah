const prisma = require('../config/db');
const { DEFAULT_ROLE_PERMISSIONS, normalizeRole } = require('../utils/permissions');

const getRolePermissions = async (schoolId, role) => {
  const effectiveRole = normalizeRole(role);
  if (effectiveRole === 'SUPER_ADMIN') return null;

  const rows = await prisma.rolePermission.findMany({
    where: { schoolId, role: effectiveRole },
    select: { permission: true },
  });

  if (rows.length === 0) {
    return DEFAULT_ROLE_PERMISSIONS[effectiveRole] || [];
  }
  return rows.map((r) => r.permission);
};

const getUserPermissions = async (user) => {
  if (!user) return [];
  if (user.role === 'SUPER_ADMIN') return null; // null = unrestricted (platform)
  if (!user.schoolId) return [];
  return getRolePermissions(user.schoolId, user.role);
};

const setRolePermissions = async (schoolId, role, permissions) => {
  const effectiveRole = normalizeRole(role);
  if (!(effectiveRole in DEFAULT_ROLE_PERMISSIONS)) {
    const err = new Error('Unknown role');
    err.status = 400;
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { schoolId, role: effectiveRole } });
    if (permissions.length > 0) {
      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({ schoolId, role: effectiveRole, permission })),
      });
    }
  });

  return getRolePermissions(schoolId, effectiveRole);
};

const resetRolePermissions = async (schoolId, role) => {
  const effectiveRole = normalizeRole(role);
  await prisma.rolePermission.deleteMany({ where: { schoolId, role: effectiveRole } });
  return DEFAULT_ROLE_PERMISSIONS[effectiveRole] || [];
};

const getSchoolPermissionMatrix = async (schoolId) => {
  const roles = Object.keys(DEFAULT_ROLE_PERMISSIONS).filter((r) => r !== 'PARENT');
  const matrix = {};
  await Promise.all(
    roles.map(async (role) => {
      matrix[role] = await getRolePermissions(schoolId, role);
    })
  );
  return matrix;
};

const seedRolePermissions = async (schoolId) => {
  const data = [];
  for (const [role, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    for (const permission of permissions) {
      data.push({ schoolId, role, permission });
    }
  }
  await prisma.rolePermission.createMany({ data, skipDuplicates: true });
};

// Classes a teacher is responsible for: as class teacher or as a subject teacher.
const teacherAssignedClassIds = async (schoolId, userId) => {
  const [led, taught] = await Promise.all([
    prisma.schoolClass.findMany({
      where: { schoolId, classTeacherId: userId },
      select: { id: true },
    }),
    prisma.classSubject.findMany({
      where: { schoolId, teacherId: userId },
      select: { classId: true },
    }),
  ]);
  return [...new Set([...led.map((c) => c.id), ...taught.map((c) => c.classId)])];
};

module.exports = {
  getRolePermissions,
  getUserPermissions,
  setRolePermissions,
  resetRolePermissions,
  getSchoolPermissionMatrix,
  seedRolePermissions,
  teacherAssignedClassIds,
};
