const jwt = require('jsonwebtoken');

function createAuthenticateMiddleware(config, store) {
  return function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (typeof authHeader !== 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1].trim()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = parts[1].trim();
    let payload;

    try {
      payload = jwt.verify(token, config.jwtSecret, {
        algorithms: ['HS256'],
        issuer: config.jwtIssuer,
        audience: config.jwtAudience,
      });
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!payload || typeof payload.sub !== 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = store.findUserById(payload.sub);
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = Object.freeze({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
    });

    return next();
  };
}

module.exports = { createAuthenticateMiddleware };
