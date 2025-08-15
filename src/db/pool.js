const { Pool } = require('pg');
const config = require('../config/env');

// Prefer DATABASE_URL when provided (e.g., Railway), with safe SSL defaults in production
const useConnectionString = !!process.env.DATABASE_URL;

const pool = useConnectionString
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === 'disable' || process.env.NODE_ENV === 'development' ? false : { rejectUnauthorized: false },
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
      // Respect PGSSLMODE if provided; otherwise let driver default
      ssl: process.env.PGSSLMODE === 'disable' ? false : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

module.exports = pool;