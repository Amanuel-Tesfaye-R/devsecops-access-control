const express = require('express');
const { requireRole } = require('../middleware/authorize');

function createAdminRouter(store, authenticate) {
  const router = express.Router();

  router.get('/users', authenticate, requireRole('admin'), (req, res) => {
    return res.status(200).json({ users: store.listUsersSafe() });
  });

  return router;
}

module.exports = { createAdminRouter };
