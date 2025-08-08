const { searchTrips } = require('../models/tripModel');
const { createBooking } = require('../models/bookingModel');

exports.search = async (req, res) => {
  const { departureCity, destinationCity, date, tripType } = req.query;
  if (!departureCity || !destinationCity || !date) return res.status(400).json({ error: 'Missing query params' });
  const rows = await searchTrips({ departureCity, destinationCity, date, tripType });
  return res.json(rows);
};

exports.reserve = async (req, res) => {
  const { journeyId, adults, children } = req.body || {};
  if (!journeyId || typeof adults !== 'number') return res.status(400).json({ error: 'Missing journeyId/adults' });
  const journeyPrice = await (async () => {
    const pool = require('../db/pool');
    const { rows } = await pool.query('SELECT price_adult as "priceAdult", price_child as "priceChild" FROM trips WHERE id = $1', [journeyId]);
    return rows[0];
  })();
  if (!journeyPrice) return res.status(404).json({ error: 'Journey not found' });
  const total = Number(journeyPrice.priceAdult) * adults + Number(journeyPrice.priceChild) * (children || 0);
  const id = `b_${Date.now()}`;
  const createdAt = new Date().toISOString();
  await createBooking({ id, journeyId, userId: req.user.userId, totalPrice: total, adults, children: children || 0, createdAt });
  return res.json({ id, journeyId, userId: req.user.userId, totalPrice: total, seatsAdults: adults, seatsChildren: children || 0, createdAt });
};