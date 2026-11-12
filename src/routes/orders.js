const express = require('express');
const { requirePermission } = require('../middleware/authorize');
const { canAccessOrder } = require('../policies');

function createOrdersRouter(store, authenticate) {
  const router = express.Router();

  router.get('/', authenticate, (req, res) => {
    const visibleOrders = store.listOrders().filter((order) => canAccessOrder(req.user, order));
    return res.status(200).json({ orders: visibleOrders });
  });

  router.get('/:id', authenticate, requirePermission('orders:read'), (req, res) => {
    const order = store.findOrderById(req.params.id);
    if (!order || !canAccessOrder(req.user, order)) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.status(200).json({ order });
  });

  router.post('/', authenticate, requirePermission('orders:create'), (req, res) => {
    if (!req.user.branchId) {
      return res.status(403).json({ error: 'User is not assigned to a branch' });
    }

    const { tableNumber, items, totalEtb } = req.body || {};
    if (
      typeof tableNumber !== 'string' ||
      !tableNumber.trim() ||
      !Array.isArray(items) ||
      items.length === 0 ||
      typeof totalEtb !== 'number' ||
      totalEtb <= 0
    ) {
      return res.status(400).json({ error: 'Valid tableNumber, items array, and positive totalEtb are required' });
    }

    // Branch always comes from authenticated req.user, never client request body
    const order = store.createOrder({
      branchId: req.user.branchId,
      tableNumber: tableNumber.trim(),
      items: items.map((item) => String(item)),
      totalEtb,
      createdBy: req.user.id,
    });

    return res.status(201).json({ order });
  });

  return router;
}

module.exports = { createOrdersRouter };
