const prisma = require('../config/db');

// Fire-and-forget audit trail for sensitive actions. Never throws — auditing
// must not break the main operation.
const audit = ({ schoolId, userId, action, entity, entityId, before, after, reason }) => {
  prisma.auditLog
    .create({
      data: {
        schoolId,
        userId: userId || null,
        action,
        entity,
        entityId: entityId !== undefined && entityId !== null ? String(entityId) : null,
        before: before === undefined ? undefined : before,
        after: after === undefined ? undefined : after,
        reason: reason || null,
      },
    })
    .catch((err) => console.error('audit write failed:', err.message));
};

module.exports = { audit };
