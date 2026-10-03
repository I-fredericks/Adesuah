const prisma = require('../config/db');
const eventService = require('./eventService');

const notifyUser = async ({ schoolId, userId, type, title, body, data }) => {
  const notification = await prisma.notification.create({
    data: { schoolId, userId, type, title, body, data: data || undefined },
  });
  eventService.sendToUser(userId, 'notification', {
    id: notification.id,
    type,
    title,
    body,
    data,
    createdAt: notification.createdAt,
  });
  return notification;
};

const notifyUsers = async ({ schoolId, userIds, type, title, body, data }) => {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return [];
  const rows = unique.map((userId) => ({
    schoolId,
    userId,
    type,
    title,
    body,
    data: data || undefined,
  }));
  await prisma.notification.createMany({ data: rows });
  for (const userId of unique) {
    eventService.sendToUser(userId, 'notification', { type, title, body, data });
  }
  return rows;
};

module.exports = { notifyUser, notifyUsers };
