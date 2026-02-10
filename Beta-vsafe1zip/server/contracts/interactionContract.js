const KNOWN_TRACKS = {
  midnight_underwater: { id: 'midnight_underwater', title: 'Midnight Underwater', album: 'Night Swim', trackIndex: 0 },
  slow_tides: { id: 'slow_tides', title: 'Slow Tides Over Glass', album: 'Night Swim', trackIndex: 1 },
  undertow: { id: 'undertow', title: 'Undertow', album: 'Night Swim', trackIndex: 2 },
  euphoria: { id: 'euphoria', title: 'Euphoria', album: 'Night Swim', trackIndex: 3 },
  ocean_breathing: { id: 'ocean_breathing', title: 'Ocean Breathing', album: 'Night Swim', trackIndex: 4 },
  tidal_house: { id: 'tidal_house', title: 'Tidal House', album: 'Night Swim', trackIndex: 5 },
  neon_promise: { id: 'neon_promise', title: 'Neon Promise', album: 'Night Swim', trackIndex: 6 },
};

const TRACK_ALIASES = {
  'midnight underwater': 'midnight_underwater',
  'slow tides': 'slow_tides',
  'slow tides over glass': 'slow_tides',
  'undertow': 'undertow',
  'midnight undertow': 'undertow',
  'euphoria': 'euphoria',
  'calm euphoria': 'euphoria',
  'ocean breathing': 'ocean_breathing',
  'tidal house': 'tidal_house',
  'tidal memory': 'tidal_house',
  'tidal memory glow': 'tidal_house',
  'neon promise': 'neon_promise',
};

const KNOWN_ALBUMS = {
  night_swim: { id: 'night_swim', title: 'Night Swim' },
};

const ALBUM_ALIASES = {
  'night swim': 'night_swim',
};

function norm(text) {
  return (text || '').toLowerCase().trim();
}

function detectTrack(text) {
  const t = norm(text);
  for (const [alias, trackId] of Object.entries(TRACK_ALIASES)) {
    if (t.includes(alias)) return KNOWN_TRACKS[trackId] || null;
  }
  return null;
}

function detectAlbum(text) {
  const t = norm(text);
  for (const [alias, albumId] of Object.entries(ALBUM_ALIASES)) {
    if (t.includes(alias)) return KNOWN_ALBUMS[albumId] || null;
  }
  return null;
}

function classifyMusicRequest(text, traceIntent) {
  const t = norm(text);

  const isSpotify = /spotify|playlist\b|link\b|open in spotify/i.test(t);
  if (isSpotify) return 'spotify_playlist';

  const isPlayCmd = /^play\b/.test(t);
  const detectedTrack = detectTrack(t);
  const detectedAlbum = detectAlbum(t);
  const entityType = traceIntent?.musicEntity?.type;

  if (isPlayCmd || entityType === 'track' || entityType === 'album') {
    if (detectedTrack || entityType === 'track') return 'trace_track_play';
    if (detectedAlbum || entityType === 'album') return 'trace_album_play';
    if (detectedTrack === null && detectedAlbum === null && isPlayCmd) {
      if (detectTrack(t) || detectAlbum(t)) {
        return detectTrack(t) ? 'trace_track_play' : 'trace_album_play';
      }
    }
  }

  if (/\b(reel|concept|edit|visual|video)\b/i.test(t)) return 'studios_reel_concept';
  if (/\b(lyrics|write lyrics|verse|hook)\b/i.test(t)) return 'studios_lyrics';

  return 'none';
}

function buildActionFromClassification(classification, text, traceIntent) {
  const detectedTrack = detectTrack(text);
  const detectedAlbum = detectAlbum(text);

  switch (classification) {
    case 'spotify_playlist':
      return {
        type: 'ui_action',
        name: 'open_journal_modal',
        payload: {
          kind: 'spotify_playlist',
          external: true,
          queryHint: norm(text).replace(/spotify|playlist|link|open in|give me a?/gi, '').trim().slice(0, 40) || 'chill vibes',
          url: null,
        },
      };

    case 'trace_track_play':
      return {
        type: 'audio_action',
        name: 'play_trace_track',
        payload: {
          trackName: detectedTrack?.title || traceIntent?.musicEntity?.name || null,
          trackId: detectedTrack?.id || traceIntent?.musicEntity?.id || null,
          source: 'trace',
        },
      };

    case 'trace_album_play':
      return {
        type: 'audio_action',
        name: 'play_trace_album',
        payload: {
          albumName: detectedAlbum?.title || 'Night Swim',
          albumId: detectedAlbum?.id || 'night_swim',
          source: 'trace',
        },
      };

    case 'studios_reel_concept':
    case 'studios_lyrics':
      return {
        type: 'none',
        name: classification,
        payload: {},
      };

    default:
      return {
        type: 'none',
        name: 'none',
        payload: {},
      };
  }
}

function enforceContractPolicies(traceIntent) {
  if (!traceIntent) return;

  if (traceIntent.primaryMode === 'studios') {
    traceIntent.constraints.allowActivities = 'never';
    traceIntent.constraints.suppressSoundscapes = true;
  }

  const action = traceIntent.action;
  if (!action) return;

  if (action.name === 'open_journal_modal') {
    action.payload.external = true;
  }
}

function validateContractCompliance(traceIntent, responseObj, requestId) {
  if (!traceIntent?.action || traceIntent.action.type === 'none') return null;

  const action = traceIntent.action;
  const violations = [];

  if (action.name === 'open_journal_modal') {
    if (responseObj.audio_action) {
      violations.push('spotify_action_has_audio_action');
    }
  }

  if (action.name === 'play_trace_track' || action.name === 'play_trace_album') {
    if (responseObj.ui_action?.type === 'OPEN_JOURNAL_MODAL') {
      violations.push('trace_play_has_journal_modal');
    }
    if (responseObj.audio_action && responseObj.audio_action.type !== 'open') {
      violations.push('trace_play_wrong_audio_schema');
    }
    if (responseObj.audio_action && responseObj.audio_action.source !== 'originals') {
      violations.push('trace_play_wrong_audio_source');
    }
  }

  if (action.name === 'open_journal_modal') {
    if (responseObj.ui_action && responseObj.ui_action.type !== 'OPEN_JOURNAL_MODAL') {
      violations.push('spotify_action_wrong_ui_type');
    }
  }

  if (traceIntent.primaryMode === 'studios') {
    if (responseObj.activity_suggestion?.name) {
      violations.push('studios_mode_has_activity_suggestion');
    }
  }

  if (violations.length > 0) {
    console.log('[ACTION_CONTRACT_VIOLATION]', JSON.stringify({
      requestId,
      expectedAction: action.name,
      violations,
      actualFieldsPresent: {
        has_ui_action: !!responseObj.ui_action,
        has_audio_action: !!responseObj.audio_action,
        has_activity_suggestion: !!responseObj.activity_suggestion?.name,
      },
    }));
    return violations;
  }
  return null;
}

function mapActionToResponse(traceIntent) {
  if (!traceIntent?.action || traceIntent.action.type === 'none') {
    return { ui_action: null, audio_action: null, action_source: null };
  }

  const action = traceIntent.action;

  if (action.type === 'ui_action' && action.name === 'open_journal_modal') {
    return {
      ui_action: {
        type: 'OPEN_JOURNAL_MODAL',
        title: action.payload.queryHint || 'Playlist',
        source: 'spotify',
        external: true,
      },
      audio_action: null,
      action_source: 'contract_v1',
    };
  }

  if (action.type === 'audio_action') {
    if (action.name === 'play_trace_track') {
      const trackMeta = action.payload.trackId ? KNOWN_TRACKS[action.payload.trackId] : null;
      const trackIndex = trackMeta?.trackIndex ?? 0;
      return {
        ui_action: {
          type: 'PLAY_IN_APP_TRACK',
          title: action.payload.trackName,
          trackId: action.payload.trackId,
          trackIndex,
          album: 'night_swim',
          source: 'trace',
        },
        audio_action: {
          type: 'open',
          source: 'originals',
          album: 'night_swim',
          track: trackIndex,
          autoplay: true,
        },
        action_source: 'contract_v1',
      };
    }
    if (action.name === 'play_trace_album') {
      return {
        ui_action: {
          type: 'PLAY_IN_APP_TRACK',
          title: action.payload.albumName,
          trackId: action.payload.albumId,
          trackIndex: 0,
          album: action.payload.albumId,
          source: 'trace',
        },
        audio_action: {
          type: 'open',
          source: 'originals',
          album: action.payload.albumId || 'night_swim',
          track: 0,
          autoplay: true,
        },
        action_source: 'contract_v1',
      };
    }
  }

  return { ui_action: null, audio_action: null, action_source: null };
}

module.exports = {
  classifyMusicRequest,
  buildActionFromClassification,
  enforceContractPolicies,
  validateContractCompliance,
  mapActionToResponse,
  detectTrack,
  detectAlbum,
  KNOWN_TRACKS,
  KNOWN_ALBUMS,
};
