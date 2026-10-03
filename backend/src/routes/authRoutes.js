const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { validate, loginSchema, changePasswordSchema, registerSchoolSchema, schoolUpdateSchema, profileSchema } = require('../middlewares/validation');

const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

router.post('/register-school', authLimiter, validate(registerSchoolSchema), auth.registerSchool);
router.post('/login', authLimiter, validate(loginSchema), auth.login);
router.post('/forgot-password', authLimiter, auth.forgotPassword);
router.get('/me', protect, auth.me);
router.put('/profile', protect, validate(profileSchema), auth.updateProfile);
router.put('/change-password', protect, validate(changePasswordSchema), auth.changePassword);

module.exports = router;
