const ROLE_PERMISSIONS = Object.freeze({
  waiter: Object.freeze(['orders:create', 'orders:read']),
  cashier: Object.freeze(['orders:read', 'payments:create']),
  manager: Object.freeze(['orders:read', 'reports:read']),
  admin: Object.freeze(['users:manage', 'orders:read', 'reports:read']),
});

function getPermissionsForRole(role) {
  if (!role || !Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role)) {
    return [];
  }
  return ROLE_PERMISSIONS[role];
}

function hasPermission(user, permission) {
  if (!user || !user.role) {
    return false;
  }
  return getPermissionsForRole(user.role).includes(permission);
}

module.exports = {
  ROLE_PERMISSIONS,
  getPermissionsForRole,
  hasPermission,
};
