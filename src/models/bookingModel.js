const pool = require('../db/pool');

async function createBooking({ id, journeyId, userId, totalPrice, adults, children, createdAt }) {
  await pool.query(
    'INSERT INTO bookings (id, journey_id, user_id, total_price, seats_adults, seats_children, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [id, journeyId, userId, totalPrice, adults, children, createdAt]
  );
}

module.exports = { createBooking };