const pool = require('./pool');

async function migrate() {
  await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE
  );
  CREATE TABLE IF NOT EXISTS otps (
    phone TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at BIGINT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    agency_name TEXT,
    departure_city TEXT,
    destination_city TEXT,
    departure_date DATE,
    departure_time TIME,
    duration_minutes INTEGER,
    price_adult NUMERIC,
    price_child NUMERIC,
    available_seats INTEGER,
    trip_type TEXT
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    journey_id TEXT,
    user_id TEXT,
    total_price NUMERIC,
    seats_adults INTEGER,
    seats_children INTEGER,
    created_at TIMESTAMP
  );
  `);

  const { rows } = await pool.query('SELECT COUNT(*)::int as count FROM trips');
  if (rows[0].count === 0) {
    const agencies = ['ExpressGo', 'VoyagePlus', 'QuickTrip', 'CityLines', 'ZenBus'];
    const pairs = [ ['Paris','Lyon'], ['Paris','Lille'], ['Lyon','Marseille'], ['Bordeaux','Toulouse'] ];
    const today = new Date().toISOString().slice(0,10);
    const insert = `INSERT INTO trips (id, agency_name, departure_city, destination_city, departure_date, departure_time, duration_minutes, price_adult, price_child, available_seats, trip_type)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`;
    for (let i = 0; i < 30; i++) {
      const [from, to] = pairs[i % pairs.length];
      const hh = 6 + (i % 10);
      const time = `${String(hh).padStart(2,'0')}:00`;
      await pool.query(insert, [
        `j_${i}`,
        agencies[i % agencies.length],
        from,
        to,
        today,
        time,
        60 + (i % 5) * 30,
        12 + (i % 5) * 2,
        8 + (i % 5) * 1.5,
        10 + (i % 8),
        i % 2 === 0 ? 'Standard' : 'VIP',
      ]);
    }
  }
}

module.exports = { migrate };