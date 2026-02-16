const rateLimit = require('express-rate-limit');

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
  skip: (req) => !req.authUserId && !req.body?.userId,
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

module.exports = { chatIpLimiter, chatUserLimiter, generalApiLimiter };
