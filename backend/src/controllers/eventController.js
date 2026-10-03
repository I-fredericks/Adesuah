const prisma = require('../config/db');
const { subscribe } = require('../services/eventService');
const { protect } = require('../middlewares/authMiddleware');

const stream = async (req, res) => {
  let token = req.query.token;
  if (!token && req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    const err = new Error('Not authorized, no token');
    err.status = 401;
    throw err;
  }
  const jwt = require('jsonwebtoken');
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = { id: decoded.id };
  subscribe(decoded.id, res);
};

module.exports = { stream, protect };
