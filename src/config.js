function loadConfig(env = process.env) {
  const required = ['JWT_SECRET'];
  const missing = required.filter((name) => !env[name] || String(env[name]).trim() === '');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
  }

  const jwtSecret = String(env.JWT_SECRET);
  if (jwtSecret.length < 32) {
    throw new Error('Invalid configuration: JWT_SECRET must be at least 32 characters long');
  }

  return Object.freeze({
    port: Number(env.PORT) || 3000,
    jwtSecret,
    jwtIssuer: env.JWT_ISSUER || 'dinedesk-api',
    jwtAudience: env.JWT_AUDIENCE || 'dinedesk-staff',
    jwtExpiresIn: '15m',
    paymentGatewayConfigured: Boolean(env.PAYMENT_GATEWAY_KEY),
  });
}

module.exports = { loadConfig };
