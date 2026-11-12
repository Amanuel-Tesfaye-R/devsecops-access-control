const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 10;

// Precomputed dummy hash ensures login checks for unknown emails still execute bcrypt.compare
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('DummyTimingEqualizer#2026', BCRYPT_ROUNDS);

function createStore() {
  const users = [
    {
      id: 'u-waiter-bole',
      name: 'Dawit Bekele',
      email: 'waiter.bole@dinedesk.example',
      role: 'waiter',
      branchId: 'bole',
      active: true,
      passwordHash: bcrypt.hashSync('WaiterBole#2026', BCRYPT_ROUNDS),
    },
    {
      id: 'u-waiter-piassa',
      name: 'Hanna Tadesse',
      email: 'waiter.piassa@dinedesk.example',
      role: 'waiter',
      branchId: 'piassa',
      active: true,
      passwordHash: bcrypt.hashSync('WaiterPiassa#2026', BCRYPT_ROUNDS),
    },
    {
      id: 'u-cashier-bole',
      name: 'Blen Alemu',
      email: 'cashier.bole@dinedesk.example',
      role: 'cashier',
      branchId: 'bole',
      active: true,
      passwordHash: bcrypt.hashSync('CashierBole#2026', BCRYPT_ROUNDS),
    },
    {
      id: 'u-cashier-piassa',
      name: 'Yonas Kebede',
      email: 'cashier.piassa@dinedesk.example',
      role: 'cashier',
      branchId: 'piassa',
      active: true,
      passwordHash: bcrypt.hashSync('CashierPiassa#2026', BCRYPT_ROUNDS),
    },
    {
      id: 'u-manager-bole',
      name: 'Sara Tesfaye',
      email: 'manager.bole@dinedesk.example',
      role: 'manager',
      branchId: 'bole',
      active: true,
      passwordHash: bcrypt.hashSync('ManagerBole#2026', BCRYPT_ROUNDS),
    },
    {
      id: 'u-manager-piassa',
      name: 'Mikias Girma',
      email: 'manager.piassa@dinedesk.example',
      role: 'manager',
      branchId: 'piassa',
      active: true,
      passwordHash: bcrypt.hashSync('ManagerPiassa#2026', BCRYPT_ROUNDS),
    },
    {
      id: 'u-admin',
      name: 'Abebe Desta',
      email: 'admin@dinedesk.example',
      role: 'admin',
      branchId: null,
      active: true,
      passwordHash: bcrypt.hashSync('AdminChain#2026', BCRYPT_ROUNDS),
    },
  ];

  const orders = [
    {
      id: 101,
      branchId: 'bole',
      tableNumber: 'B1',
      items: ['Doro Wat', 'Injera'],
      totalEtb: 480,
      status: 'paid',
      createdBy: 'u-waiter-bole',
    },
    {
      id: 102,
      branchId: 'bole',
      tableNumber: 'B4',
      items: ['Tibs', 'Tej'],
      totalEtb: 650,
      status: 'open',
      createdBy: 'u-waiter-bole',
    },
    {
      id: 201,
      branchId: 'piassa',
      tableNumber: 'P2',
      items: ['Shiro', 'Macchiato'],
      totalEtb: 290,
      status: 'paid',
      createdBy: 'u-waiter-piassa',
    },
    {
      id: 202,
      branchId: 'piassa',
      tableNumber: 'P5',
      items: ['Kitfo', 'Sparkling Water'],
      totalEtb: 540,
      status: 'open',
      createdBy: 'u-waiter-piassa',
    },
  ];

  const payments = [
    { id: 1, orderId: 101, branchId: 'bole', amountEtb: 480, processedBy: 'u-cashier-bole' },
    { id: 2, orderId: 201, branchId: 'piassa', amountEtb: 290, processedBy: 'u-cashier-piassa' },
  ];

  let nextOrderId = 300;
  let nextPaymentId = 3;

  return {
    DUMMY_PASSWORD_HASH,
    findUserByEmail(email) {
      if (typeof email !== 'string') return null;
      const normalized = email.trim().toLowerCase();
      return users.find((u) => u.email.toLowerCase() === normalized) || null;
    },
    findUserById(id) {
      return users.find((u) => u.id === id) || null;
    },
    listUsersSafe() {
      return users.map(({ id, name, email, role, branchId, active }) => ({
        id,
        name,
        email,
        role,
        branchId,
        active,
      }));
    },
    listOrders() {
      return orders.slice();
    },
    findOrderById(id) {
      const numericId = Number(id);
      if (!Number.isInteger(numericId)) return null;
      return orders.find((o) => o.id === numericId) || null;
    },
    createOrder({ branchId, tableNumber, items, totalEtb, createdBy }) {
      const order = {
        id: ++nextOrderId,
        branchId,
        tableNumber,
        items,
        totalEtb,
        status: 'open',
        createdBy,
      };
      orders.push(order);
      return order;
    },
    recordPayment({ orderId, branchId, amountEtb, processedBy }) {
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        order.status = 'paid';
      }
      const payment = {
        id: ++nextPaymentId,
        orderId,
        branchId,
        amountEtb,
        processedBy,
      };
      payments.push(payment);
      return payment;
    },
  };
}

module.exports = { createStore, DUMMY_PASSWORD_HASH };
