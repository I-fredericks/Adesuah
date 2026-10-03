const express = require('express');
const router = express.Router();
const announcements = require('../controllers/announcementController');
const notifications = require('../controllers/notificationController');
const { protect, requireStaff, requirePermission, resolveSchoolId } = require('../middlewares/authMiddleware');
const { validate, announcementSchema } = require('../middlewares/validation');

router.use(protect);

router.get('/announcements', requireStaff, announcements.listAnnouncements);
router.post('/announcements', requirePermission('announcements.send'), validate(announcementSchema), announcements.createAnnouncement);
router.delete('/announcements/:id', requirePermission('announcements.send'), announcements.deleteAnnouncement);

router.get('/notifications', notifications.listNotifications);
router.put('/notifications/read-all', notifications.markAllRead);
router.put('/notifications/:id/read', notifications.markRead);

module.exports = router;
