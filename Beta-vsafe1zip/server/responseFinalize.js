const { normalizeResponseEnvelope, validateResponseEnvelope, deriveResponseMode } = require('./validation/responseShapeContract');

function sanitizeDisplayText(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function finalizeTraceResponse(res, rawPayload, requestId, options = {}) {
  const statusCode = options.statusCode || 200;
  const responseSource = rawPayload?.response_source || options.responseSource || 'unknown';
  const provPath = rawPayload?._provenance?.path || options.provenancePath || 'unknown';

  const base = {
    ok: rawPayload?.ok !== false,
    ...rawPayload,
    response_source: responseSource,
  };

  if (typeof base.message === 'string') {
    base.message = sanitizeDisplayText(base.message);
  }

  if (!base.request_id) base.request_id = requestId || null;
  if (!base.requestId) base.requestId = requestId || null;

  const normalized = normalizeResponseEnvelope(base);

  if (normalized.message && typeof normalized.message === 'string') {
    normalized.message = sanitizeDisplayText(normalized.message);
  }
  if (Array.isArray(normalized.messages)) {
    normalized.messages = normalized.messages.map(m => typeof m === 'string' ? sanitizeDisplayText(m) : m);
  }

  const msg = typeof normalized.message === 'string' ? normalized.message : '';
  if (msg && !Array.isArray(normalized.messages)) {
    normalized.messages = [msg];
  } else if (msg && Array.isArray(normalized.messages) && normalized.messages.length === 0) {
    normalized.messages = [msg];
  }

  const validation = validateResponseEnvelope(normalized);
  const mode = deriveResponseMode(normalized);

  const shapeMeta = {
    ok: validation.ok,
    mode,
    has_audio_action: !!(normalized.audio_action),
    has_ui_action: !!(normalized.ui_action),
    has_client_patch: !!(normalized.client_state_patch && Object.keys(normalized.client_state_patch).length > 0),
  };
  if (!validation.ok) {
    shapeMeta.issues = validation.issues.map(i => i.code);
  }
  normalized._shape_meta = shapeMeta;
  normalized.request_id = requestId || normalized.requestId || null;

  const topIssues = validation.issues.map(i => i.code);
  console.log('[RESPONSE_SHAPE]', JSON.stringify({
    requestId: requestId || null,
    ok: validation.ok,
    mode,
    issues_count: validation.issues.length,
    top_issues: topIssues,
    response_source: normalized.response_source || null,
    has_audio_action: shapeMeta.has_audio_action,
    has_ui_action: shapeMeta.has_ui_action,
    has_client_patch: shapeMeta.has_client_patch,
  }));

  console.log('[APP_TRACE]', JSON.stringify({
    requestId: requestId || null,
    response_source: responseSource,
    mode,
    provenance_path: provPath,
    status: statusCode,
    crisis_active: normalized.isCrisisMode || false,
  }));

  return res.status(statusCode).json(normalized);
}

module.exports = { finalizeTraceResponse };
