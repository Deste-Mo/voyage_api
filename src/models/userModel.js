const pool = require('../db/pool');

async function findByPhone(phone) {
  const { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  return rows[0] || null;
}

async function insertUser({ id, firstName, lastName, phone, passwordHash }) {
  await pool.query(
    'INSERT INTO users (id, first_name, last_name, phone, password_hash, is_verified) VALUES ($1,$2,$3,$4,$5,false)',
    [id, firstName, lastName, phone, passwordHash]
  );
}

async function markVerified(phone) {
  await pool.query('UPDATE users SET is_verified = true WHERE phone = $1', [phone]);
}

async function getPublicUserByPhone(phone) {
  const { rows } = await pool.query('SELECT id, first_name as "firstName", last_name as "lastName", phone FROM users WHERE phone = $1', [phone]);
  return rows[0] || null;
}

async function getPublicUserById(id) {
  const { rows } = await pool.query('SELECT id, first_name as "firstName", last_name as "lastName", phone FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

module.exports = { findByPhone, insertUser, markVerified, getPublicUserByPhone, getPublicUserById };