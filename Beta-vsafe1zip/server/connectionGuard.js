const DISCONNECT_CODES = new Set([
  'EPIPE',
  'ECONNRESET',
  'ERR_STREAM_WRITE_AFTER_END',
  'ERR_STREAM_DESTROYED',
  'ECONNABORTED',
]);

function isDisconnectError(err) {
  if (!err) return false;
  if (DISCONNECT_CODES.has(err.code)) return true;
  if (err.message && /write after end|socket hang up|aborted|EPIPE|ECONNRESET/i.test(err.message)) return true;
  return false;
}

function createConnectionGuard(req, res) {
  let closed = false;
  const route = `${req.method} ${req.path}`;

  const markClosed = () => {
    if (!closed) {
      closed = true;
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[HTTP] client disconnected: ${route}`);
      }
    }
  };

  req.on('aborted', markClosed);
  req.on('close', markClosed);
  res.on('close', markClosed);
  res.on('error', (err) => {
    if (isDisconnectError(err)) markClosed();
  });

  return {
    isClosed() {
      return closed || res.writableEnded || res.destroyed;
    },

    safeJson(statusCode, data) {
      if (closed || res.writableEnded || res.destroyed) return false;
      try {
        res.status(statusCode).json(data);
        return true;
      } catch (err) {
        if (isDisconnectError(err)) {
          markClosed();
          return false;
        }
        throw err;
      }
    },
  };
}

module.exports = { createConnectionGuard, isDisconnectError };
