const MAX_MESSAGE_LENGTH = 4000;
const MAX_MESSAGES_PER_REQUEST = 100;

function validateChatRequest(req, res, next) {
  const { messages, message } = req.body;

  if (message && typeof message === 'string' && message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      ok: false,
      error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters.`,
    });
  }

  if (messages && Array.isArray(messages)) {
    if (messages.length > MAX_MESSAGES_PER_REQUEST) {
      return res.status(400).json({
        ok: false,
        error: `Too many messages. Maximum ${MAX_MESSAGES_PER_REQUEST} per request.`,
      });
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.content && typeof lastMessage.content === 'string' && lastMessage.content.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        ok: false,
        error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters.`,
      });
    }
  }

  next();
}

function validateBodySize(req, res, next) {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 51200) {
    return res.status(413).json({
      ok: false,
      error: 'Request body too large. Maximum 50KB.',
    });
  }
  next();
}

module.exports = { validateChatRequest, validateBodySize, MAX_MESSAGE_LENGTH };
