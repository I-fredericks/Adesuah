const express = require('express');
const router = express.Router();
const messages = require('../controllers/messageController');
const { protect, requireStaff, requirePermission } = require('../middlewares/authMiddleware');

router.use(protect, requireStaff);

router.get('/', requirePermission('announcements.view'), messages.listMessages);

module.exports = router;
