const express = require('express');
const { requirePermission } = require('../middleware/authorize');
const { canAccessOrder } = require('../policies');

function createReportsRouter(store, authenticate) {
  const router = express.Router();

  router.get('/branch', authenticate, requirePermission('reports:read'), (req, res) => {
    // Always derive branch scope from verified req.user, never req.query.branchId
    const branchId = req.user.branchId;
    if (!branchId) {
      return res.status(400).json({ error: 'Branch report requires a branch-assigned user' });
    }

    const branchOrders = store
      .listOrders()
      .filter((order) => order.branchId === branchId && canAccessOrder(req.user, order));

    const totalRevenueEtb = branchOrders
      .filter((order) => order.status === 'paid')
      .reduce((sum, order) => sum + order.totalEtb, 0);

    return res.status(200).json({
      branchId,
      orderCount: branchOrders.length,
      paidOrderCount: branchOrders.filter((order) => order.status === 'paid').length,
      totalRevenueEtb,
      orders: branchOrders,
    });
  });

  return router;
}

module.exports = { createReportsRouter };
