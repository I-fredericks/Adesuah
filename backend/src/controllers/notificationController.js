const prisma = require('../config/db');

const listNotifications = async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unread = notifications.filter((n) => !n.readAt).length;
  res.json({ notifications, unread });
};

const markRead = async (req, res) => {
  await prisma.notification.update({
    where: { id: Number(req.params.id) },
    data: { readAt: new Date() },
  });
  res.json({ message: 'Marked as read' });
};

const markAllRead = async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ message: 'All notifications marked as read' });
};

module.exports = { listNotifications, markRead, markAllRead };
