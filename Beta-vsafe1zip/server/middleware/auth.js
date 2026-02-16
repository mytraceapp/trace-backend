const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAuth = null;
if (supabaseUrl && supabaseServiceKey) {
  supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);
  if (!token || token.length < 10) {
    return res.status(401).json({ ok: false, error: 'Invalid token' });
  }

  if (!supabaseAuth) {
    console.warn('[AUTH] Supabase not configured — bypassing auth in dev');
    req.authUserId = req.body?.userId || 'unknown';
    return next();
  }

  try {
    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
    }

    req.authUserId = data.user.id;
    next();
  } catch (err) {
    console.error('[AUTH] Token verification failed:', err.message);
    return res.status(401).json({ ok: false, error: 'Authentication failed' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.authUserId = req.body?.userId || req.query?.userId || null;
    return next();
  }

  const token = authHeader.slice(7);
  if (!token || token.length < 10 || !supabaseAuth) {
    req.authUserId = req.body?.userId || req.query?.userId || null;
    return next();
  }

  supabaseAuth.auth.getUser(token)
    .then(({ data, error }) => {
      if (!error && data?.user) {
        req.authUserId = data.user.id;
      } else {
        req.authUserId = req.body?.userId || req.query?.userId || null;
      }
      next();
    })
    .catch(() => {
      req.authUserId = req.body?.userId || req.query?.userId || null;
      next();
    });
}

module.exports = { requireAuth, optionalAuth };
