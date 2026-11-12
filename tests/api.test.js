const crypto = require('crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { loadConfig } = require('../src/config');
const { createApp } = require('../src/app');
const { createStore } = require('../src/data/store');
const { getPermissionsForRole, hasPermission } = require('../src/permissions');

function createTestRuntime() {
  // Ephemeral 64-hex-char test-only signing key generated at runtime (never a real credential)
  const testSecret = crypto.randomBytes(32).toString('hex');
  const config = loadConfig({
    JWT_SECRET: testSecret,
    JWT_ISSUER: 'dinedesk-api',
    JWT_AUDIENCE: 'dinedesk-staff',
  });
  const store = createStore();
  const app = createApp(config, store);
  return { app, config, store, testSecret };
}

async function loginAs(app, email, password, extraBody = {}) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password, ...extraBody });
  return res.body.token;
}

describe('DineDesk API — Authentication, RBAC, Branch Isolation & Secrets Config', () => {
  test('1. Missing Authorization token returns 401 Unauthorized', async () => {
    const { app } = createTestRuntime();
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });

  test('2. Token signed with the wrong signing key returns 401 Unauthorized', async () => {
    const { app, config } = createTestRuntime();
    const wrongKeyToken = jwt.sign(
      { sub: 'u-admin' },
      'wrong-key-that-does-not-match-server-config-123456',
      { algorithm: 'HS256', expiresIn: '10m', issuer: config.jwtIssuer, audience: config.jwtAudience }
    );
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${wrongKeyToken}`);
    expect(res.status).toBe(401);
  });

  test('3. Expired token returns 401 Unauthorized', async () => {
    const { app, config, testSecret } = createTestRuntime();
    const expiredToken = jwt.sign(
      { sub: 'u-waiter-bole' },
      testSecret,
      { algorithm: 'HS256', expiresIn: '-10s', issuer: config.jwtIssuer, audience: config.jwtAudience }
    );
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });

  test('4. Unsigned alg:none JWT token is rejected with 401 Unauthorized', async () => {
    const { app } = createTestRuntime();
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'u-admin', iss: 'dinedesk-api', aud: 'dinedesk-staff' })).toString('base64url');
    const unsignedToken = `${header}.${payload}.`;

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${unsignedToken}`);
    expect(res.status).toBe(401);
  });

  test('5. Login returns identical generic error for unknown email and wrong password and ignores client role/branch', async () => {
    const { app } = createTestRuntime();

    const unknownRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@dinedesk.example', password: 'WrongPassword!' });

    const badPassRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'waiter.bole@dinedesk.example', password: 'WrongPassword!' });

    expect(unknownRes.status).toBe(401);
    expect(badPassRes.status).toBe(401);
    expect(unknownRes.body).toEqual(badPassRes.body);
    expect(badPassRes.body.error).toBe('Invalid email or password');

    const waiterToken = await loginAs(app, 'waiter.bole@dinedesk.example', 'WaiterBole#2026', {
      role: 'admin',
      branchId: 'piassa',
    });
    const adminAttempt = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${waiterToken}`)
      .set('x-user-role', 'admin');
    expect(adminAttempt.status).toBe(403);
  });

  test('6. Waiter calling GET /api/admin/users returns 403 Forbidden (even with forged x-user-role header)', async () => {
    const { app } = createTestRuntime();
    const waiterToken = await loginAs(app, 'waiter.bole@dinedesk.example', 'WaiterBole#2026');

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${waiterToken}`)
      .set('x-user-role', 'admin');
    expect(res.status).toBe(403);
  });

  test('7. Administrator calling GET /api/admin/users returns 200 and strips passwordHash from every user', async () => {
    const { app } = createTestRuntime();
    const adminToken = await loginAs(app, 'admin@dinedesk.example', 'AdminChain#2026');

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThanOrEqual(7);
    for (const user of res.body.users) {
      expect(user.passwordHash).toBeUndefined();
      expect(Object.keys(user)).not.toContain('password');
    }
  });

  test('8. Waiter creating an order returns 201 and enforces server branchId', async () => {
    const { app } = createTestRuntime();
    const waiterToken = await loginAs(app, 'waiter.bole@dinedesk.example', 'WaiterBole#2026');

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${waiterToken}`)
      .send({ tableNumber: 'B9', items: ['Firfir'], totalEtb: 350, branchId: 'piassa' });

    expect(res.status).toBe(201);
    expect(res.body.order.branchId).toBe('bole');
    expect(res.body.order.tableNumber).toBe('B9');
  });

  test('9. Cashier attempting to create an order returns 403 Forbidden', async () => {
    const { app } = createTestRuntime();
    const cashierToken = await loginAs(app, 'cashier.bole@dinedesk.example', 'CashierBole#2026');

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ tableNumber: 'B3', items: ['Coffee'], totalEtb: 90 });

    expect(res.status).toBe(403);
  });

  test('10. Bole manager reading a Bole order (101) returns 200', async () => {
    const { app } = createTestRuntime();
    const boleManagerToken = await loginAs(app, 'manager.bole@dinedesk.example', 'ManagerBole#2026');

    const res = await request(app)
      .get('/api/orders/101')
      .set('Authorization', `Bearer ${boleManagerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.order.id).toBe(101);
    expect(res.body.order.branchId).toBe('bole');
  });

  test('11. Bole manager reading a Piassa order (201) is denied with 404 (prevents branch ID enumeration)', async () => {
    const { app } = createTestRuntime();
    const boleManagerToken = await loginAs(app, 'manager.bole@dinedesk.example', 'ManagerBole#2026');

    const res = await request(app)
      .get('/api/orders/201')
      .set('Authorization', `Bearer ${boleManagerToken}`);

    expect(res.status).toBe(404);
  });

  test('12. Waiter calling GET /api/reports/branch returns 403 Forbidden', async () => {
    const { app } = createTestRuntime();
    const waiterToken = await loginAs(app, 'waiter.piassa@dinedesk.example', 'WaiterPiassa#2026');

    const res = await request(app)
      .get('/api/reports/branch')
      .set('Authorization', `Bearer ${waiterToken}`);

    expect(res.status).toBe(403);
  });

  test('13. Piassa manager calling /api/reports/branch?branchId=bole ignores query param and returns only Piassa data', async () => {
    const { app } = createTestRuntime();
    const piassaManagerToken = await loginAs(app, 'manager.piassa@dinedesk.example', 'ManagerPiassa#2026');

    const res = await request(app)
      .get('/api/reports/branch?branchId=bole')
      .set('Authorization', `Bearer ${piassaManagerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.branchId).toBe('piassa');
    expect(res.body.orders.every((o) => o.branchId === 'piassa')).toBe(true);
    expect(res.body.orders.some((o) => o.branchId === 'bole')).toBe(false);
  });

  test('14. Branch isolation also holds on GET /api/orders list and POST /api/payments', async () => {
    const { app } = createTestRuntime();
    const boleCashierToken = await loginAs(app, 'cashier.bole@dinedesk.example', 'CashierBole#2026');

    const listRes = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${boleCashierToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.orders.every((o) => o.branchId === 'bole')).toBe(true);

    // Cross-branch payment against Piassa open order 202 must fail with 404
    const crossPayRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${boleCashierToken}`)
      .send({ orderId: 202, amountEtb: 540 });
    expect(crossPayRes.status).toBe(404);

    // Same-branch payment against Bole open order 102 succeeds
    const samePayRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${boleCashierToken}`)
      .send({ orderId: 102, amountEtb: 650 });
    expect(samePayRes.status).toBe(201);
  });

  test('15. Unknown role receives zero permissions (deny by default)', () => {
    expect(getPermissionsForRole('auditor-unregistered')).toEqual([]);
    expect(hasPermission({ role: 'auditor-unregistered' }, 'orders:read')).toBe(false);
  });

  test('16. loadConfig fails fast when JWT_SECRET is missing or < 32 chars without leaking values', () => {
    expect(() => loadConfig({})).toThrow(/JWT_SECRET/);
    const shortVal = 'too-short-secret-value';
    let caughtMessage = '';
    try {
      loadConfig({ JWT_SECRET: shortVal });
    } catch (err) {
      caughtMessage = err.message;
    }
    expect(caughtMessage).toMatch(/JWT_SECRET/);
    expect(caughtMessage).not.toContain(shortVal);
  });
});
