const prisma = require('../config/db');
const { resolveSchoolId } = require('../middlewares/authMiddleware');

const getMySchool = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      academicYears: { orderBy: { startDate: 'desc' } },
      _count: { select: { students: true, users: true, classes: true, subjects: true } },
    },
  });
  res.json({ school });
};

const updateMySchool = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const school = await prisma.school.update({
    where: { id: schoolId },
    data: {
      ...(req.body.name ? { name: req.body.name } : {}),
      ...(req.body.shortName !== undefined ? { shortName: req.body.shortName } : {}),
      ...(req.body.motto !== undefined ? { motto: req.body.motto } : {}),
      ...(req.body.address !== undefined ? { address: req.body.address } : {}),
      ...(req.body.city !== undefined ? { city: req.body.city } : {}),
      ...(req.body.region !== undefined ? { region: req.body.region } : {}),
      ...(req.body.phone !== undefined ? { phone: req.body.phone } : {}),
      ...(req.body.email !== undefined ? { email: req.body.email || null } : {}),
      ...(req.body.gesRegNumber !== undefined ? { gesRegNumber: req.body.gesRegNumber } : {}),
      ...(req.body.logoUrl !== undefined ? { logoUrl: req.body.logoUrl } : {}),
      ...(req.body.settings ? { settings: req.body.settings } : {}),
    },
  });
  res.json({ school });
};

module.exports = { getMySchool, updateMySchool };
