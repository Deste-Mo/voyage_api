require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const USE_TWILIO = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
let twilioClient = null;
if (USE_TWILIO) {
  twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// Initialize DB
const db = new Database('data.db');
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  isVerified INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS otps (
  phone TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expiresAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  agencyName TEXT,
  departureCity TEXT,
  destinationCity TEXT,
  departureDate TEXT,
  departureTime TEXT,
  durationMinutes INTEGER,
  priceAdult REAL,
  priceChild REAL,
  availableSeats INTEGER,
  tripType TEXT
);
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  journeyId TEXT,
  userId TEXT,
  totalPrice REAL,
  seatsAdults INTEGER,
  seatsChildren INTEGER,
  createdAt TEXT
);
`);

// Seed trips if empty
const tripCount = db.prepare('SELECT COUNT(*) as c FROM trips').get().c;
if (tripCount === 0) {
  const insert = db.prepare(`INSERT INTO trips (id, agencyName, departureCity, destinationCity, departureDate, departureTime, durationMinutes, priceAdult, priceChild, availableSeats, tripType) VALUES (@id, @agencyName, @departureCity, @destinationCity, @departureDate, @departureTime, @durationMinutes, @priceAdult, @priceChild, @availableSeats, @tripType)`);
  const agencies = ['ExpressGo', 'VoyagePlus', 'QuickTrip', 'CityLines', 'ZenBus'];
  const cities = [ ['Paris','Lyon'], ['Paris','Lille'], ['Lyon','Marseille'], ['Bordeaux','Toulouse'] ];
  const today = new Date();
  const dateISO = today.toISOString().slice(0,10);
  for (let i = 0; i < 30; i++) {
    const [from, to] = cities[i % cities.length];
    const departHour = 6 + (i % 10);
    const departTime = `${String(departHour).padStart(2,'0')}:00`;
    insert.run({
      id: `j_${i}`,
      agencyName: agencies[i % agencies.length],
      departureCity: from,
      destinationCity: to,
      departureDate: dateISO,
      departureTime: departTime,
      durationMinutes: 60 + (i % 5) * 30,
      priceAdult: 12 + (i % 5) * 2,
      priceChild: 8 + (i % 5) * 1.5,
      availableSeats: 10 + (i % 8),
      tripType: i % 2 === 0 ? 'Standard' : 'VIP',
    });
  }
}

function signJwt(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Auth endpoints
app.post('/api/auth/signup', async (req, res) => {
  const { firstName, lastName, phone, password } = req.body || {};
  if (!firstName || !lastName || !phone || !password) return res.status(400).json({ error: 'Missing fields' });
  const exists = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
  if (exists) return res.status(400).json({ error: 'Phone already registered' });
  const passwordHash = await bcrypt.hash(password, 10);
  const id = `u_${Date.now()}`;
  db.prepare('INSERT INTO users (id, firstName, lastName, phone, passwordHash, isVerified) VALUES (?,?,?,?,?,0)')
    .run(id, firstName, lastName, phone, passwordHash);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 5 * 60 * 1000;
  db.prepare('INSERT OR REPLACE INTO otps (phone, code, expiresAt) VALUES (?,?,?)').run(phone, code, expiresAt);

  if (USE_TWILIO) {
    try {
      await twilioClient.messages.create({ from: process.env.TWILIO_FROM_NUMBER, to: phone, body: `Votre code de vérification: ${code}` });
    } catch (e) {
      console.error('Twilio send error', e.message);
    }
  }

  return res.json({ success: true, sent: USE_TWILIO ? 'sms' : 'dev', // dev indicates no SMS
    // For development visibility only; remove in production
    devOtp: USE_TWILIO ? undefined : code
  });
});

app.post('/api/auth/verify', (req, res) => {
  const { phone, code } = req.body || {};
  if (!phone || !code) return res.status(400).json({ error: 'Missing phone/code' });
  const row = db.prepare('SELECT code, expiresAt FROM otps WHERE phone = ?').get(phone);
  if (!row || row.code !== code || Date.now() > row.expiresAt) return res.status(400).json({ error: 'Invalid code' });
  db.prepare('DELETE FROM otps WHERE phone = ?').run(phone);
  db.prepare('UPDATE users SET isVerified = 1 WHERE phone = ?').run(phone);
  const user = db.prepare('SELECT id, firstName, lastName, phone FROM users WHERE phone = ?').get(phone);
  const token = signJwt({ userId: user.id });
  return res.json({ user, token });
});

app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body || {};
  if (!phone || !password) return res.status(400).json({ error: 'Missing fields' });
  const row = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!row) return res.status(400).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, row.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
  if (!row.isVerified) return res.status(403).json({ error: 'Phone not verified' });
  const user = { id: row.id, firstName: row.firstName, lastName: row.lastName, phone: row.phone };
  const token = signJwt({ userId: user.id });
  return res.json({ user, token });
});

// Trips search
app.get('/api/trips', (req, res) => {
  const { departureCity, destinationCity, date, tripType } = req.query;
  if (!departureCity || !destinationCity || !date) return res.status(400).json({ error: 'Missing query params' });
  const stmt = db.prepare('SELECT * FROM trips WHERE departureCity = ? AND destinationCity = ? AND departureDate = ? AND (tripType = ? OR ? IS NULL)');
  const rows = stmt.all(String(departureCity), String(destinationCity), String(date), tripType ? String(tripType) : null, tripType ? String(tripType) : null);
  return res.json(rows);
});

// Booking create
app.post('/api/bookings', authMiddleware, (req, res) => {
  const { journeyId, adults, children } = req.body || {};
  if (!journeyId || typeof adults !== 'number') return res.status(400).json({ error: 'Missing journeyId/adults' });
  const journey = db.prepare('SELECT * FROM trips WHERE id = ?').get(journeyId);
  if (!journey) return res.status(404).json({ error: 'Journey not found' });
  const childCount = typeof children === 'number' ? children : 0;
  const total = journey.priceAdult * adults + journey.priceChild * childCount;
  const id = `b_${Date.now()}`;
  const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO bookings (id, journeyId, userId, totalPrice, seatsAdults, seatsChildren, createdAt) VALUES (?,?,?,?,?,?,?)')
    .run(id, journeyId, req.user.userId, total, adults, childCount, createdAt);
  return res.json({ id, journeyId, userId: req.user.userId, totalPrice: total, seatsAdults: adults, seatsChildren: childCount, createdAt });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});