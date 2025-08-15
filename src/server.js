const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const { migrate } = require('./db/migrate');
const routes = require('./routes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/', routes);

// Centralized error handler to avoid unhandled errors crashing the process
app.use((err, req, res, next) => {
	console.error('Request error:', err);
	if (res.headersSent) return next(err);
	res.status(500).json({ error: 'Internal server error' });
});

// Global error handlers to avoid process crashes
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

(async () => {
  try {
    await migrate();
  } catch (err) {
    console.error('Database migration failed. Continuing to start server.', err);
  }

  const port = Number(config.port) || 3000;
  const host = '0.0.0.0';
  app.listen(port, host, () => {
    console.log(`API listening on http://${host}:${port}`);
  });
})();