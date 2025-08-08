require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3002,
  jwtSecret: process.env.JWT_SECRET || 'dev_secret',
  db: {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'travel_booking',
  },
  twilio: {
    sid: process.env.TWILIO_ACCOUNT_SID,
    token: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_FROM_NUMBER,
  },
};