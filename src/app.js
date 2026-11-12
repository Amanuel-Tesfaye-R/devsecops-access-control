const express = require('express');
const helmet = require('helmet');
const { createStore } = require('./data/store');
const { createAuthenticateMiddleware } = require('./middleware/authenticate');
const { createAuthRouter } = require('./routes/auth');
const { createOrdersRouter } = require('./routes/orders');
const { createPaymentsRouter } = require('./routes/payments');
const { createReportsRouter } = require('./routes/reports');
const { createAdminRouter } = require('./routes/admin');

function createApp(config, store = createStore()) {
  const app = express();
  app.use(helmet());
  app.use(express.json());

  const authenticate = createAuthenticateMiddleware(config, store);

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'dinedesk-api' });
  });

  app.use('/api/auth', createAuthRouter(config, store));
  app.use('/api/orders', createOrdersRouter(store, authenticate));
  app.use('/api/payments', createPaymentsRouter(store, authenticate));
  app.use('/api/reports', createReportsRouter(store, authenticate));
  app.use('/api/admin', createAdminRouter(store, authenticate));

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}

module.exports = { createApp };
