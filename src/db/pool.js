const { Pool } = require('pg');
const config = require('../config/env');

// Detect if running inside Railway
const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_STATIC_URL);

// Choose connection string:
// - On Railway: prefer internal DATABASE_URL, fallback to DATABASE_PUBLIC_URL
// - Locally: prefer DATABASE_PUBLIC_URL, fallback to DATABASE_URL
const connectionString = isRailway
  ? (process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || null)
  : (process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL || null);

const useConnectionString = !!connectionString;

const pool = useConnectionString
  ? new Pool({
      connectionString,
      // Enable SSL by default (works for Railway public); disable only if explicitly requested
      ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : new Pool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

module.exports = pool;