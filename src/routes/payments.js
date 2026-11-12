const express = require('express');
const { requirePermission } = require('../middleware/authorize');
const { canAccessOrder } = require('../policies');

function createPaymentsRouter(store, authenticate) {
  const router = express.Router();

  router.post('/', authenticate, requirePermission('payments:create'), (req, res) => {
    const { orderId, amountEtb } = req.body || {};
    const order = store.findOrderById(orderId);

    if (!order || !canAccessOrder(req.user, order)) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'paid') {
      return res.status(400).json({ error: 'Order is already paid' });
    }

    if (typeof amountEtb !== 'number' || amountEtb !== order.totalEtb) {
      return res.status(400).json({ error: 'Payment amount must match order total' });
    }

    const payment = store.recordPayment({
      orderId: order.id,
      branchId: order.branchId,
      amountEtb,
      processedBy: req.user.id,
    });

    return res.status(201).json({ payment });
  });

  return router;
}

module.exports = { createPaymentsRouter };
