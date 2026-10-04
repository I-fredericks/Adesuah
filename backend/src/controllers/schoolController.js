const prisma = require('../config/db');
const { resolveSchoolId } = require('../middlewares/authMiddleware');

const getMySchool = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const [school, sms] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        academicYears: { orderBy: { startDate: 'desc' } },
        _count: { select: { students: true, users: true, classes: true, subjects: true } },
      },
    }),
    smsCredentials(schoolId),
  ]);

  // Never return the raw SMS API key to the client — report whether it exists.
  const settings = { ...(school.settings || {}) };
  const usingSchoolKey = !!settings.sms?.apiKey;
  if (settings.sms) delete settings.sms.apiKey;
  settings.sms = { ...(settings.sms || {}), hasKey: usingSchoolKey, usingPlatformKey: !usingSchoolKey && !!sms.apiKey };

  res.json({ school: { ...school, settings } });
};

const updateMySchool = async (req, res) => {
  const schoolId = resolveSchoolId(req);

  // Messaging settings are merged server-side: the SMS API key is write-only
  // and is preserved unless the client clears or replaces it.
  let settingsPatch;
  if (req.body.settings?.sms) {
    const current = await prisma.school.findUnique({ where: { id: schoolId }, select: { settings: true } });
    const existingSms = current?.settings?.sms || {};
    const incoming = req.body.settings.sms;
    const sms = { sender: incoming.sender || existingSms.sender || undefined };
    if (incoming.clearKey) sms.apiKey = undefined;
    else if (incoming.apiKey) sms.apiKey = incoming.apiKey;
    else if (existingSms.apiKey) sms.apiKey = existingSms.apiKey;
    settingsPatch = { ...(current?.settings || {}), sms };
    delete req.body.settings;
  }
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
    },
  });
  res.json({ school });
};

module.exports = { getMySchool, updateMySchool };
