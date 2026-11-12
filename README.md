# DineDesk API — Access Control & Secrets Management

Express.js REST API for DineDesk (Bole and Piassa branches) demonstrating:
- **Authentication:** `bcryptjs` password verification (timing-safe dummy comparison for unknown users), generic login failure response, HS256 JWT (`<= 15m` expiry) verified with explicit `algorithms`, `issuer`, and `audience`.
- **Authorization:** Permission-based access control (`src/permissions.js`) + `requireRole` / `requirePermission` middleware (`src/middleware/authorize.js`), deny-by-default for unknown roles.
- **Branch-Level (Object-Level) Isolation:** `canAccessOrder(user, order)` in `src/policies.js` and identity-derived branch scoping on `/api/reports/branch`.
- **Secrets Management:** Fails fast at startup if `JWT_SECRET` is missing or `< 32` characters (`src/config.js`), `.env` git-ignored with `.env.example` template only.

## Local Setup

```bash
npm ci
cp .env.example .env   # Fill local development values only (never real keys)
npm test
npm run lint
node --env-file=.env src/server.js
```
