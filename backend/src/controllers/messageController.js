const prisma = require('../config/db');
const { resolveSchoolId, requirePermission } = require('../middlewares/authMiddleware');
const { smsCredentials } = require('../services/smsService');

const listMessages = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const status = req.query.status || undefined;

  const [logs, { apiKey }] = await Promise.all([
    prisma.messageLog.findMany({
      where: { schoolId, ...(status ? { status } : {}) },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            currentClass: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    smsCredentials(schoolId),
  ]);

  const count = (s) => logs.filter((l) => l.status === s).length;

  res.json({
    messages: logs,
    stats: {
      total: logs.length,
      sent: count('sent'),
      logged: count('logged'),
      failed: count('failed'),
    },
    smsConnected: !!apiKey,
  });
};

module.exports = { listMessages };
