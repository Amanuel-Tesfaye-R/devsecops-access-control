const { hasPermission } = require('./permissions');

function canAccessOrder(user, order) {
  if (!user || !order) {
    return false;
  }
  if (!hasPermission(user, 'orders:read')) {
    return false;
  }
  if (user.role === 'admin') {
    return true;
  }
  return Boolean(user.branchId && order.branchId === user.branchId);
}

module.exports = { canAccessOrder };
