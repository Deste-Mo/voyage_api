const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const { migrate } = require('./db/migrate');
const routes = require('./routes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/', routes);

(async () => {
  await migrate();
  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
})();