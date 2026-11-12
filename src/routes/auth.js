const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function createAuthRouter(config, store) {
  const router = express.Router();

  router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = store.findUserByEmail(email);
    const hashToCompare = user ? user.passwordHash : store.DUMMY_PASSWORD_HASH;
    const passwordMatches = await bcrypt.compare(password, hashToCompare);

    if (!user || !user.active || !passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Minimal claims: identity only; role and branch are read from server records per request
    const token = jwt.sign(
      { sub: user.id },
      config.jwtSecret,
      {
        algorithm: 'HS256',
        expiresIn: config.jwtExpiresIn,
        issuer: config.jwtIssuer,
        audience: config.jwtAudience,
      }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        branchId: user.branchId,
      },
    });
  });

  return router;
}

module.exports = { createAuthRouter };
