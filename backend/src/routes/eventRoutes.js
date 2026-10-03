const express = require('express');
const router = express.Router();
const { stream } = require('../controllers/eventController');

router.get('/', stream);

module.exports = router;
