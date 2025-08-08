const pool = require('../db/pool');

async function upsertOtp(phone, code, expiresAt) {
  await pool.query('INSERT INTO otps (phone, code, expires_at) VALUES ($1,$2,$3) ON CONFLICT (phone) DO UPDATE SET code = $2, expires_at = $3', [phone, code, expiresAt]);
}

async function findOtp(phone) {
  const { rows } = await pool.query('SELECT code, expires_at as "expiresAt" FROM otps WHERE phone = $1', [phone]);
  return rows[0] || null;
}

async function removeOtp(phone) {
  await pool.query('DELETE FROM otps WHERE phone = $1', [phone]);
}

module.exports = { upsertOtp, findOtp, removeOtp };