const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const STAFF_ROLES = ['OWNER', 'ADMIN', 'TEACHER', 'ACCOUNTANT'];

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

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  if (req.user.role === 'SUPER_ADMIN') return next();
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission for this action' });
  }
  next();
};

const requireStaff = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  if (req.user.role === 'SUPER_ADMIN' || STAFF_ROLES.includes(req.user.role)) return next();
  return res.status(403).json({ message: 'Staff access required' });
};

const requireManagement = requireRole('OWNER', 'ADMIN');

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

module.exports = {
  protect,
  requireRole,
  requireStaff,
  requireManagement,
  requirePlatform,
  resolveSchoolId,
  STAFF_ROLES,
};
