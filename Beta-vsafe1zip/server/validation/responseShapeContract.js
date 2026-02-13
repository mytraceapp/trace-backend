const REQUIRED_KEYS = ['message', 'response_source'];

const ALLOWED_KEYS = new Set([
  'message',
  'response_source',
  'audio_action',
  'ui_action',
  'sound_state',
  'activity_suggestion',
  'client_state_patch',
  'next_question',
  'pattern_metadata',
  'isCrisisMode',
  'isCrisisMultiMessage',
  'crisis_resources',
  'traceStudios',
  '_schema_meta',
  '_shape_meta',

  'ok',
  'requestId',
  'messages',
  'deduped',
  '_provenance',
  '_schema_rewrite',
  'posture',
  'detected_state',
  'posture_confidence',
  'insight',
  'action_source',
  'echo_offer',
  'onboarding',
  'greeting',
  'next_step',
  'error',
  'request_id',
  'mode',
  'doorway',
  'suggestion',
  'curiosity_hook',
]);

function deriveResponseMode(payload) {
  if (!payload) return 'system';
  const src = payload.response_source || '';
  if (payload.isCrisisMode === true || src === 'crisis') return 'crisis';
  if (src === 'onboarding_script') return 'onboarding';
  const prov = payload._provenance;
  if (prov?.primaryMode === 'studios' || src === 'trace_studios') return 'studios';
  if (prov?.primaryMode) return prov.primaryMode;
  if (src === 'model' || src === 'insight' || src === 'activity_followup' || src === 'dedup_cache') return 'conversation';
  return 'system';
}

function normalizeResponseEnvelope(payload) {
  if (!payload || typeof payload !== 'object') {
    return { message: '', response_source: 'system', _shape_meta: { ok: false, issues: ['missing_payload'], mode: 'system', has_audio_action: false, has_ui_action: false, has_client_patch: false } };
  }

  const out = { ...payload };

  if (typeof out.message !== 'string') out.message = '';
  if (typeof out.response_source !== 'string') out.response_source = 'unknown';

  const optionalNullable = [
    'audio_action', 'ui_action', 'sound_state', 'activity_suggestion',
    'client_state_patch', 'next_question', 'pattern_metadata', '_schema_meta', '_shape_meta',
  ];
  for (const k of optionalNullable) {
    if (!(k in out)) out[k] = null;
  }
  if (!('isCrisisMode' in out)) out.isCrisisMode = false;

  if (out.sound_state && typeof out.sound_state === 'string') {
    out.sound_state = { current: out.sound_state, changed: false, reason: 'normalized_legacy' };
  }

  const unknown = [];
  for (const k of Object.keys(out)) {
    if (!ALLOWED_KEYS.has(k) && !k.startsWith('_')) {
      unknown.push(k);
      delete out[k];
    }
  }
  if (unknown.length > 0) {
    out._stripped_keys = unknown;
  }

  return out;
}

function validateResponseEnvelope(payload) {
  const issues = [];
  const mode = deriveResponseMode(payload);

  for (const k of REQUIRED_KEYS) {
    if (payload[k] === undefined || payload[k] === null) {
      issues.push({ code: 'missing_required', severity: 'error', detail: k });
    }
  }

  if (mode === 'studios') {
    if (payload.activity_suggestion != null && (payload.activity_suggestion.name != null || payload.activity_suggestion.should_navigate === true)) {
      issues.push({ code: 'studios_has_activity', severity: 'warn', detail: 'activity_suggestion with active content in studios mode' });
    }
    if (payload.sound_state != null && payload.sound_state.current != null) {
      issues.push({ code: 'studios_has_soundstate', severity: 'info', detail: 'sound_state.current set in studios mode (non-fatal: globally allowed)' });
    }
  }

  if (mode === 'conversation') {
    if (payload.audio_action && payload.audio_action !== null) {
      const intent = payload._provenance?.traceIntent || payload._traceIntent;
      const intentType = intent?.intentType;
      if (intentType !== 'music') {
        issues.push({ code: 'conversation_unsolicited_audio', severity: 'info', detail: 'audio_action in conversation without music intent' });
      }
    }
    if (payload.ui_action && payload.ui_action !== null) {
      const uiType = payload.ui_action?.type || '';
      const allowed = ['OPEN_JOURNAL_MODAL', 'OPEN_SPOTIFY', 'OPEN_ACTIVITY'];
      if (!allowed.includes(uiType)) {
        issues.push({ code: 'conversation_unexpected_ui_action', severity: 'info', detail: uiType });
      }
    }
  }

  if (mode === 'crisis') {
    if (payload.audio_action != null) issues.push({ code: 'crisis_has_audio', severity: 'warn', detail: 'audio_action in crisis' });
    if (payload.ui_action != null) issues.push({ code: 'crisis_has_ui', severity: 'warn', detail: 'ui_action in crisis' });
    if (payload.activity_suggestion != null && payload.activity_suggestion.name != null) {
      issues.push({ code: 'crisis_has_activity', severity: 'warn', detail: 'activity_suggestion in crisis' });
    }
    if (payload.sound_state != null && payload.sound_state.current != null) {
      issues.push({ code: 'crisis_has_soundstate', severity: 'warn', detail: 'sound_state in crisis' });
    }
  }

  if (mode === 'onboarding') {
    const src = payload.response_source;
    if (src !== 'onboarding_script') {
      issues.push({ code: 'onboarding_wrong_source', severity: 'warn', detail: src });
    }
    if (payload.audio_action) issues.push({ code: 'onboarding_has_audio', severity: 'info', detail: 'audio_action in onboarding' });
    if (payload.ui_action) issues.push({ code: 'onboarding_has_ui', severity: 'info', detail: 'ui_action in onboarding' });
  }

  return {
    ok: issues.filter(i => i.severity === 'error' || i.severity === 'warn').length === 0,
    issues,
  };
}

module.exports = {
  normalizeResponseEnvelope,
  validateResponseEnvelope,
  deriveResponseMode,
};
