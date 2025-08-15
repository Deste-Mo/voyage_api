const { Pool } = require('pg');
const config = require('../config/env');

// Prefer DATABASE_URL (Railway), fallback to DATABASE_PUBLIC_URL, else PG* parts
const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || null;
const useConnectionString = !!connectionString;

const pool = useConnectionString
  ? new Pool({
      connectionString,
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
      ssl: process.env.PGSSLMODE === 'disable' ? false : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

module.exports = pool;