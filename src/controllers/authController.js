const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { findByPhone, insertUser, markVerified, getPublicUserByPhone } = require('../models/userModel');
const { findOtp, removeOtp } = require('../models/otpModel');
const { sendOtp } = require('../services/otpService');

function signJwt(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}

exports.register = async (req, res) => {
  const { firstName, lastName, phone, password } = req.body || {};
  if (!firstName || !lastName || !phone || !password) return res.status(400).json({ error: 'Missing fields' });
  const exists = await findByPhone(phone);
  if (exists) return res.status(400).json({ error: 'Phone already registered' });
  const id = `u_${Date.now()}`;
  const passwordHash = await bcrypt.hash(password, 10);
  await insertUser({ id, firstName, lastName, phone, passwordHash });
  const result = await sendOtp(phone);
  return res.json({ success: true, channel: result.channel, devOtp: result.devOtp });
};

exports.verifyOtp = async (req, res) => {
  const { phone, code } = req.body || {};
  if (!phone || !code) return res.status(400).json({ error: 'Missing phone/code' });
  const row = await findOtp(phone);
  if (!row || row.code !== code || Date.now() > Number(row.expiresAt)) return res.status(400).json({ error: 'Invalid code' });
  await removeOtp(phone);
  await markVerified(phone);
  const user = await getPublicUserByPhone(phone);
  const token = signJwt({ userId: user.id });
  return res.json({ user, token });
};

exports.login = async (req, res) => {
  const { phone, password } = req.body || {};
  if (!phone || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = await findByPhone(phone);
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
  if (!user.is_verified) return res.status(403).json({ error: 'Phone not verified' });
  const publicUser = { id: user.id, firstName: user.first_name, lastName: user.last_name, phone: user.phone };
  const token = signJwt({ userId: publicUser.id });
  return res.json({ user: publicUser, token });
};