const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const auth = require('../controllers/authController');
const trip = require('../controllers/tripController');

const router = express.Router();

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

router.get('/health', (req, res) => res.json({ ok: true }));

router.post('/register', auth.register);
router.post('/verify-otp', auth.verifyOtp);
router.post('/login', auth.login);

router.get('/trips/search', trip.search);
router.post('/trips/reserve', authMiddleware, trip.reserve);

module.exports = router;