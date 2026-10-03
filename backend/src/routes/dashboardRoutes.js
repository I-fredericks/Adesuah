const express = require('express');
const router = express.Router();
const dashboard = require('../controllers/dashboardController');
const { protect, requireStaff } = require('../middlewares/authMiddleware');

router.get('/', protect, requireStaff, dashboard.getDashboard);

module.exports = router;
