const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

dotenv.config();

const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  skip: (req) => req.path === '/api/health' || req.path === '/api',
}));

app.use('/api/events', require('./routes/eventRoutes'));

app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));

const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];
const allowedOrigins = new Set([
  ...DEV_ORIGINS,
  ...(process.env.FRONTEND_URL || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 400,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'schoolhub-api' }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/platform', require('./routes/platformRoutes'));
app.use('/api/school', require('./routes/schoolRoutes'));
app.use('/api/academic', require('./routes/academicRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/assessments', require('./routes/assessmentRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/fees', require('./routes/feeRoutes'));
app.use('/api', require('./routes/communicationRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

const { errorHandler, notFound } = require('./middlewares/errorHandler');
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`SchoolHub API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

module.exports = app;
