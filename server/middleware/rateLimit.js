const rateLimit = require('express-rate-limit');

const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

function isAdminUser(req) {
  const userId = req.authUserId || req.body?.userId;
  return userId && ADMIN_USER_IDS.includes(userId);
}

const chatIpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests from this IP. Please wait a few minutes.' },
  validate: { ip: false },
});

const chatUserLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.authUserId || req.body?.userId || 'anon',
  message: { ok: false, error: 'Message limit reached. Please wait before sending more.' },
  skip: (req) => {
    if (isAdminUser(req)) return true;
    return !req.authUserId && !req.body?.userId;
  },
  validate: { ip: false },
});

const generalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests. Please slow down.' },
  validate: { ip: false },
});

module.exports = { chatIpLimiter, chatUserLimiter, generalApiLimiter, isAdminUser, ADMIN_USER_IDS };
