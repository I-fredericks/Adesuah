const express = require('express');
const router = express.Router();
const portal = require('../controllers/portalController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect, portal.requireParent);

router.get('/children', portal.getMyChildren);
router.get('/children/:id', portal.getChildDetail);
router.get('/children/:id/report', portal.getChildReport);
router.get('/children/:id/assignments', portal.getChildAssignments);
router.get('/children/:id/extra-classes', portal.getChildExtraClasses);
router.post('/children/:id/photo', portal.updateChildPhoto);
router.get('/announcements', portal.getPortalAnnouncements);

module.exports = router;
