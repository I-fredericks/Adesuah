const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { hasPermission, normalizeRole, STAFF_ROLES: CATALOG_STAFF_ROLES } = require('../utils/permissions');
const permissionService = require('../services/permissionService');

const STAFF_ROLES = CATALOG_STAFF_ROLES;

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        schoolId: true,
        isActive: true,
        passwordChangedAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    if (!user.isActive) {
      return res.status(401).json({ message: 'This account has been deactivated.', deactivated: true });
    }
    if (user.passwordChangedAt && decoded.iat) {
      const changedAtSec = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (decoded.iat < changedAtSec) {
        return res.status(401).json({
          message: 'Your password was changed. Please sign in again.',
          passwordChanged: true,
        });
      }
    }

    req.user = { ...user, role: normalizeRole(user.role) };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

const requirePermission = (permission) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });

  if (req.user.role === 'SUPER_ADMIN') return next();

  if (!req._permissions) {
    req._permissions = await permissionService.getUserPermissions(req.user);
  }
  const granted = req._permissions || [];

  if (!hasPermission(granted, permission)) {
    return res.status(403).json({
      message: `You do not have permission for this action (requires ${permission})`,
      permission,
    });
  }
  next();
};

const requirePermissions = (...permissions) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  if (req.user.role === 'SUPER_ADMIN') return next();

  if (!req._permissions) {
    req._permissions = await permissionService.getUserPermissions(req.user);
  }
  const granted = req._permissions || [];
  const missing = permissions.find((p) => !hasPermission(granted, p));
  if (missing) {
    return res.status(403).json({
      message: `You do not have permission for this action (requires ${missing})`,
      permission: missing,
    });
  }
  next();
};

const requireStaff = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  if (req.user.role === 'SUPER_ADMIN' || STAFF_ROLES.includes(req.user.role)) return next();
  return res.status(403).json({ message: 'Staff access required' });
};

const requirePlatform = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ message: 'Platform access required' });
  }
  next();
};

const resolveSchoolId = (req) => {
  if (req.user.role === 'SUPER_ADMIN') {
    const id = Number(req.query.schoolId || req.body?.schoolId || req.params.schoolId);
    if (!id) {
      const err = new Error('schoolId is required for platform users');
      err.status = 400;
      throw err;
    }
    return id;
  }
  if (!req.user.schoolId) {
    const err = new Error('Account is not linked to a school');
    err.status = 403;
    throw err;
  }
  return req.user.schoolId;
};

// Assignment scoping: users with only `students.view` (e.g. TEACHER) may only
// see data for classes they are assigned to. Returns null for school-wide access.
const resolveClassScope = async (req, schoolId, viewAllPermission = 'students.view_all') => {
  if (req.user.role === 'SUPER_ADMIN') return null;
  if (!req._permissions) {
    req._permissions = await permissionService.getUserPermissions(req.user);
  }
  if ((req._permissions || []).includes(viewAllPermission)) return null;
  return permissionService.teacherAssignedClassIds(schoolId, req.user.id);
};

const assertClassAccess = async (req, schoolId, classId) => {
  const scope = await resolveClassScope(req, schoolId);
  if (scope === null) return;
  if (!scope.includes(Number(classId))) {
    const err = new Error('You are not assigned to this class');
    err.status = 403;
    throw err;
  }
};

module.exports = {
  protect,
  requirePermission,
  requirePermissions,
  requireStaff,
  requirePlatform,
  resolveSchoolId,
  resolveClassScope,
  assertClassAccess,
  STAFF_ROLES,
};
