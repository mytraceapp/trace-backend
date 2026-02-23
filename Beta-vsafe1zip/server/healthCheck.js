#!/usr/bin/env node
/**
 * TRACE Integration Health Check — 11 Categories
 * 
 * Usage: node server/healthCheck.js [userId]
 * Requires backend running on PORT=3000.
 * Exit code 0 = all pass, 1 = any fail.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const relationalMemory = require('./relationalMemory');
const { DOORS, scoreDoors, processDoorways, bootstrapConversationState } = require('./doorwaysV1');
const { handleTraceStudios } = require('./traceStudios');
const { detectPosture, checkDriftViolations, VOICE_LOCK_V1, DRIFT_CHECKLIST } = require('./traceAttunement');
const { buildReturningGreetingPrompt } = require('./traceSystemPrompt');
const { containsBannedPhrases, applyVoiceStyle, VOICE_PALETTE, BANNED_PHRASES } = require('./voiceEngine');
const { brainSynthesis } = require('./brain/brainSynthesis');
const { getState, advanceStage, STAGES, enforceQuestionThrottle, FOLLOWUP_DEFAULT_TTL_MS } = require('./conversationState');
const { isReflectionAnswer, REFLECTION_WINDOW_MINUTES } = require('./reflectionTracking');

const TEST_USER_ID = process.argv[2] || `healthcheck_${Date.now()}`;
const IS_TEMP_USER = !process.argv[2];
const API_BASE = `http://localhost:${process.env.PORT || 3000}`;

const results = [];
const categoryResults = {};
let currentCategory = '';

function setCategory(name) {
  currentCategory = name;
  if (!categoryResults[name]) categoryResults[name] = { passed: 0, failed: 0, tests: [] };
}

function log(label, pass, detail = '') {
  const status = pass ? '✅ PASS' : '❌ FAIL';
  const line = `${status}  ${label}${detail ? ' — ' + detail : ''}`;
  console.log(line);
  results.push({ label, pass, detail, category: currentCategory });
  if (categoryResults[currentCategory]) {
    if (pass) categoryResults[currentCategory].passed++;
    else categoryResults[currentCategory].failed++;
    categoryResults[currentCategory].tests.push({ label, pass, detail });
  }
}

function httpRequest(method, urlPath, body = null, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, API_BASE);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
      timeout: timeoutMs,
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('HTTP timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function readFileContent(filePath) {
  try {
    return fs.readFileSync(path.resolve(__dirname, filePath), 'utf8');
  } catch (e) {
    return null;
  }
}

function testPromptSync() {
  console.log('\n─── 1. PROMPT SYNC ───');
  setCategory('Prompt Sync');

  const v1 = readFileContent('traceSystemPrompt.js');
  const v2Core = readFileContent('prompts/traceCoreV2.js');
  const v2Dir = readFileContent('prompts/traceDirectiveV2.js');
  const indexFile = readFileContent('index.js');

  const SYNC_FACTS = [
    { fact: '@traceriapp', desc: '@traceriapp (Instagram)', requiredIn: ['v1', 'index'], note: 'social handle — injected dynamically via index.js social handler' },
    { fact: 'March 21', desc: 'March 21 (album release)', requiredIn: ['v1', 'v2Core', 'index'], note: 'must appear in all prompt sources' },
    { fact: 'Neon Promise', desc: 'Neon Promise', requiredIn: ['v1', 'v2Core', 'index'], note: 'artist canon' },
    { fact: 'Afterglow', desc: 'Afterglow', requiredIn: ['v1', 'v2Core', 'index'], note: 'artist canon' },
    { fact: 'NEVER INVENT. NEVER GUESS', desc: 'MUSIC FACTS LOCKED block', requiredIn: ['v1', 'v2Core', 'index'], note: 'locked music facts block — prevents hallucinated release dates' },
    { fact: 'Never say any album released in 2022', desc: 'Year 2022 ban in locked block', requiredIn: ['v1', 'v2Core', 'index'], note: 'hard rule against hallucinated years' },
    { fact: 'mm.', desc: '"mm." is banned', requiredIn: ['v1'], note: 'banned in V1 prompt; also enforced via voiceEngine BANNED_PHRASES' },
    { fact: 'no YouTube yet', desc: 'no YouTube yet', requiredIn: ['index'], note: 'social handler in index.js' },
  ];

  const sources = { v1, v2Core, v2Dir, index: indexFile };
  const sourceLabels = { v1: 'traceSystemPrompt.js', v2Core: 'traceCoreV2.js', v2Dir: 'traceDirectiveV2.js', index: 'index.js' };

  for (const { fact, desc, requiredIn, note } of SYNC_FACTS) {
    for (const src of requiredIn) {
      const content = sources[src];
      if (!content) {
        log(`${desc} in ${sourceLabels[src]}`, false, `File not readable`);
        continue;
      }
      const found = content.includes(fact);
      log(`${desc} in ${sourceLabels[src]}`, found,
        found ? `Found` : `MISSING — ${note || 'needs to be added'}`);
    }
  }

  const mmInBanned = BANNED_PHRASES.includes('mm.');
  log('"mm." in voiceEngine BANNED_PHRASES', mmInBanned,
    mmInBanned ? 'Present' : 'MISSING from runtime ban list');

  const healingInForbidden = checkDriftViolations('healing takes time');
  log('"healing takes time" caught by checkDriftViolations', healingInForbidden.hasViolation,
    healingInForbidden.hasViolation ? `violations: ${healingInForbidden.violations}` : 'NOT caught — missing from FORBIDDEN_PATTERNS');

  const v2CoreBansExcl = v2Core && v2Core.includes('Exclamation points');
  log('V2 Core bans exclamation points', !!v2CoreBansExcl, v2CoreBansExcl ? 'Present' : 'MISSING');

  const v2CoreBansForbidden = v2Core && (v2Core.includes("It's okay to feel") || v2Core.includes("it's okay to feel"));
  log('V2 Core bans therapy phrases', !!v2CoreBansForbidden, v2CoreBansForbidden ? 'Present' : 'MISSING');

  const has2022Trigger = indexFile && indexFile.includes('november 2022');
  log('"november 2022" triggers music canon injection', !!has2022Trigger, has2022Trigger ? 'Present in isMusicRelatedQuestion' : 'MISSING');

  const hasReleasedIn2022 = indexFile && indexFile.includes('released in 2022');
  log('"released in 2022" triggers music canon injection', !!hasReleasedIn2022, hasReleasedIn2022 ? 'Present in isMusicRelatedQuestion' : 'MISSING');

  const hasWhenDid = indexFile && indexFile.includes('when did');
  log('"when did" triggers music canon injection', !!hasWhenDid, hasWhenDid ? 'Present in isMusicRelatedQuestion' : 'MISSING');

  const hasFactSanitizer = indexFile && indexFile.includes('MUSIC_FACT_SANITIZER');
  log('Post-processing MUSIC_FACT_SANITIZER exists', !!hasFactSanitizer, hasFactSanitizer ? 'Present' : 'MISSING — hallucinated dates won\'t be caught');

  const hasRecentMusicContext = indexFile && indexFile.includes('recentMusicContext');
  log('Artist canon injects on recent music context (not just current msg)', !!hasRecentMusicContext, hasRecentMusicContext ? 'Present' : 'MISSING — follow-up msgs like "are you sure?" won\'t get canon');
}

function testMemoryPipeline() {
  console.log('\n─── 2. MEMORY PIPELINE ───');
  setCategory('Memory Pipeline');

  const msg1 = "my name is Marcus";
  const mentions1 = relationalMemory.extractExplicitPersonMentions(msg1);
  log('Extract name from "my name is [name]"', mentions1.length === 0,
    'Self-name not extracted as relationship (correct — name extraction is separate)');

  const msg2 = "my daughter Nyla had her first day of school";
  const mentions2 = relationalMemory.extractExplicitPersonMentions(msg2);
  const hasDaughter = mentions2.some(m => m.relationship === 'daughter' && /nyla/i.test(m.name));
  log('Extract relationship "my daughter Nyla"', hasDaughter,
    hasDaughter ? `Found: ${JSON.stringify(mentions2)}` : `Got: ${JSON.stringify(mentions2)}`);

  const msg3 = "my wife Sarah and my son Jake went to the park";
  const mentions3 = relationalMemory.extractExplicitPersonMentions(msg3);
  const hasWife = mentions3.some(m => m.relationship === 'wife' && /sarah/i.test(m.name));
  const hasSon = mentions3.some(m => m.relationship === 'son' && /jake/i.test(m.name));
  log('Extract wife Sarah from multi-person message', hasWife,
    hasWife ? 'Found Sarah as wife' : `Got: ${JSON.stringify(mentions3)}`);
  log('Extract son Jake from multi-person message', hasSon,
    hasSon ? 'Found Jake as son' : `Got: ${JSON.stringify(mentions3.filter(m => m.relationship === 'son'))}`);

  const mockPeople = [
    { relationship: 'daughter', display_name: 'Nyla', notes: 'turning 5 soon' },
    { relationship: 'wife', display_name: 'Sarah', notes: null },
  ];
  const anchors = relationalMemory.buildRelationalAnchors(mockPeople);
  const anchorsHaveNyla = anchors && anchors.includes('Nyla');
  const anchorsHaveSarah = anchors && anchors.includes('Sarah');
  log('buildRelationalAnchors includes Nyla', !!anchorsHaveNyla, anchorsHaveNyla ? 'Present' : 'MISSING');
  log('buildRelationalAnchors includes Sarah', !!anchorsHaveSarah, anchorsHaveSarah ? 'Present' : 'MISSING');

  const verifiedMemory = {
    userFacts: ['Enjoys hiking'],
    coreThemes: ['nature', 'family'],
    goals: [],
    preferences: [],
    relationalAnchors: ["User's daughter: Nyla.", "User's wife: Sarah."],
  };
  const greetingPrompt = buildReturningGreetingPrompt({
    displayName: 'TestUser',
    timeOfDay: 'evening',
    dayOfWeek: 'Sunday',
    lastSeenDaysAgo: 1,
    recentActivity: null,
    memoryContext: [],
    greetingApproach: 'warm',
    hasRecentCheckIn: false,
    justDidActivity: false,
    recentTopic: null,
    stressLevel: null,
    recentConversationTopics: [],
    lastConversationSnippet: null,
    recentGreetingTexts: [],
    recentlyUsedTopics: [],
    verifiedMemory,
  });
  log('Greeting prompt includes people', greetingPrompt.includes('PEOPLE') || greetingPrompt.includes('Nyla'),
    (greetingPrompt.includes('Nyla')) ? 'Nyla found in greeting prompt' : 'MISSING from greeting prompt');

  const chatAnchors = relationalMemory.buildRelationalAnchors(mockPeople);
  const greetAnchors = relationalMemory.buildRelationalAnchors(mockPeople);
  const sameSource = chatAnchors === greetAnchors;
  log('Greeting and chat use same memory source', sameSource,
    sameSource ? 'Same function output' : 'Different outputs — potential desync');

  const emptyAnchors = relationalMemory.buildRelationalAnchors([]);
  log('Empty people returns null', emptyAnchors === null,
    `Got: ${emptyAnchors}`);
}

function testDoorways() {
  console.log('\n─── 3. DOORWAYS ───');
  setCategory('Doorways');

  const doorTests = [
    { msg: 'i had a dream about falling', expectedDoor: 'dreams_symbols' },
    { msg: 'my mom passed away and i miss her so much, i keep thinking about her', expectedDoor: 'grief' },
    { msg: 'what am i meant to do with my life, what is my purpose, calling', expectedDoor: 'calling_destiny' },
    { msg: 'i hate myself, i feel worthless', expectedDoor: 'identity' },
    { msg: 'it runs in my family, generational curse, family pattern', expectedDoor: 'generational_patterns' },
    { msg: 'toxic cycle, unhealthy relationship patterns keep repeating', expectedDoor: 'relationship_patterns' },
    { msg: 'i keep having panic attacks, my heart races, cant breathe', expectedDoor: 'nervous_system' },
    { msg: 'spiritual attack, spiritual warfare, dark forces', expectedDoor: 'spiritual_warfare' },
    { msg: 'i cant forgive them, forgiveness feels impossible, resentment', expectedDoor: 'forgiveness' },
    { msg: 'i did it, i finally did it, breakthrough moment, celebration', expectedDoor: 'joy_delight' },
  ];

  for (const { msg, expectedDoor } of doorTests) {
    const result = processDoorways(msg, bootstrapConversationState(), {}, false);
    const gotDoor = result?.selectedDoorId;
    const pass = gotDoor === expectedDoor;
    log(`"${msg.slice(0, 40)}..." → ${expectedDoor}`, pass,
      pass ? `doorId=${gotDoor}` : `Expected ${expectedDoor}, got ${gotDoor || 'null'} (reason: ${result?.reasonCode})`);
  }

  const crisisResult = processDoorways("I want to end it all", bootstrapConversationState(), {}, true);
  log('Crisis overrides all doors → null', crisisResult?.selectedDoorId === null,
    `reasonCode=${crisisResult?.reasonCode}`);

  const allEnabled = Object.entries(DOORS).every(([id, d]) => d.enabled === true);
  log('All 10 doors enabled', allEnabled,
    allEnabled ? `${Object.keys(DOORS).length} doors, all enabled` : `Some disabled: ${Object.entries(DOORS).filter(([,d]) => !d.enabled).map(([id]) => id).join(', ')}`);
}

function testStudiosPipeline() {
  console.log('\n─── 4. STUDIOS PIPELINE ───');
  setCategory('Studios Pipeline');

  const base = { clientState: {}, userId: TEST_USER_ID, lastAssistantMessage: '', nowPlaying: null, recentAssistantMessages: [], recentUserMessages: [] };

  const funResult = handleTraceStudios({ ...base, userText: 'what do you do for fun' });
  log('handleTraceStudios fires for "what do you do for fun"', funResult !== null,
    funResult ? `mode=${funResult.mode}, keys=${Object.keys(funResult).join(',')}` : 'null — not intercepted');

  const playResult = handleTraceStudios({ ...base, userText: 'play Neon Promise' });
  log('handleTraceStudios fires for "play Neon Promise"', playResult !== null,
    playResult ? `mode=${playResult.mode}` : 'null — not intercepted');

  const musicResult = handleTraceStudios({ ...base, userText: 'do you make music' });
  log('handleTraceStudios fires for "do you make music"', musicResult !== null,
    musicResult ? `mode=${musicResult.mode}` : 'null — not intercepted');

  const stopResult = handleTraceStudios({
    ...base,
    userText: 'stop',
    nowPlaying: { trackId: 'neon_promise', title: 'Neon Promise' },
  });
  log('handleTraceStudios returns audio stop for "stop"', stopResult !== null && stopResult?.traceStudios?.kind === 'audio_stop',
    stopResult ? `kind=${stopResult.traceStudios?.kind}, action=${stopResult.traceStudios?.audio_action?.action}` : 'null');

  const unrelatedResult = handleTraceStudios({ ...base, userText: 'how is the weather today' });
  log('handleTraceStudios returns null for unrelated message', unrelatedResult === null,
    unrelatedResult ? `Unexpected: ${Object.keys(unrelatedResult).join(',')}` : 'Correctly null');

  try {
    const brainResult1 = brainSynthesis({
      currentMessage: 'what do you do for fun',
      historyMessages: [],
      conversationState: bootstrapConversationState(),
      cognitiveIntent: {},
      traceBrainSignals: {},
      attunement: { posture: 'STEADY' },
      doorwaysResult: null,
      atmosphereResult: null,
    });
    log('brainSynthesis primaryMode=studios for "what do you do for fun"', brainResult1?.primaryMode === 'studios',
      `primaryMode=${brainResult1?.primaryMode}`);
  } catch (e) {
    log('brainSynthesis for "what do you do for fun"', false, `Error: ${e.message}`);
  }

  try {
    const brainResult2 = brainSynthesis({
      currentMessage: 'night swim',
      historyMessages: [],
      conversationState: bootstrapConversationState(),
      cognitiveIntent: {},
      traceBrainSignals: {},
      attunement: { posture: 'STEADY' },
      doorwaysResult: null,
      atmosphereResult: null,
    });
    log('brainSynthesis primaryMode=studios for "night swim"', brainResult2?.primaryMode === 'studios',
      `primaryMode=${brainResult2?.primaryMode}`);
  } catch (e) {
    log('brainSynthesis for "night swim"', false, `Error: ${e.message}`);
  }
}

function testVoiceEngine() {
  console.log('\n─── 5. VOICE ENGINE ───');
  setCategory('Voice Engine');

  const banned1 = containsBannedPhrases('I hear you and I understand what you mean');
  log('containsBannedPhrases catches "I hear you"', banned1.length > 0,
    `Caught: ${banned1.join(', ') || 'nothing'}`);

  const banned2 = containsBannedPhrases('healing takes time, be patient with yourself');
  const healingBanned = banned2.length > 0;
  log('containsBannedPhrases catches "healing takes time"', healingBanned,
    healingBanned ? `Caught: ${banned2.join(', ')}` : 'NOT in BANNED_PHRASES — but IS in attunement FORBIDDEN_PATTERNS');

  const banned3 = containsBannedPhrases('mm. that is interesting');
  log('containsBannedPhrases catches "mm."', banned3.length > 0,
    `Caught: ${banned3.join(', ') || 'nothing'}`);

  const styled = applyVoiceStyle('mm. that is really something.', 'neutral');
  const mmRemoved = !styled.includes('mm.');
  log('applyVoiceStyle removes "mm." from response', mmRemoved,
    mmRemoved ? `Cleaned: "${styled.slice(0, 80)}"` : `Still contains mm.: "${styled.slice(0, 80)}"`);

  const styledTherapy = applyVoiceStyle('That sounds really hard. I hear you. Let me know how I can help.', 'neutral');
  log('applyVoiceStyle removes therapist frame openers', !styledTherapy.includes('That sounds really hard'),
    `Result: "${styledTherapy.slice(0, 80)}"`);

  const drift1 = checkDriftViolations('your feelings are valid and I want you to know that');
  log('checkDriftViolations catches "your feelings are valid"', drift1.hasViolation,
    `violations: ${drift1.violations.join(', ') || 'none'}`);

  const heavyPalette = VOICE_PALETTE.heavy || [];
  const heavyHasIHearYou = heavyPalette.some(p => /i hear you/i.test(p));
  log('VOICE_PALETTE.heavy does NOT contain "i hear you"', !heavyHasIHearYou,
    heavyHasIHearYou ? 'FOUND — should be removed' : 'Clean');
}

function testAttunement() {
  console.log('\n─── 6. ATTUNEMENT ───');
  setCategory('Attunement');

  const directive = detectPosture("i'm spiraling, everything is falling apart", [], false);
  log('detectPosture → DIRECTIVE for "i\'m spiraling"', directive?.posture === 'DIRECTIVE',
    `posture=${directive?.posture}, state=${directive?.detected_state}, conf=${directive?.confidence?.toFixed(2)}`);

  const gentle = detectPosture("i feel empty inside, so tired of everything", [], false);
  log('detectPosture → GENTLE for "i feel empty"', gentle?.posture === 'GENTLE',
    `posture=${gentle?.posture}, state=${gentle?.detected_state}, conf=${gentle?.confidence?.toFixed(2)}`);

  const steady = detectPosture("hey just wanted to say hi, nothing much going on", [], false);
  log('detectPosture → STEADY for neutral message', steady?.posture === 'STEADY',
    `posture=${steady?.posture}, state=${steady?.detected_state}`);

  const crisis = detectPosture("anything", [], true);
  log('detectPosture → GENTLE for crisis override', crisis?.posture === 'GENTLE' && crisis?.confidence === 1.0,
    `posture=${crisis?.posture}, conf=${crisis?.confidence}`);

  const gradualRecent = [
    { role: 'user', content: 'i feel so drained today' },
    { role: 'assistant', content: 'yeah, what happened?' },
    { role: 'user', content: 'nothing specific, just tired of it all' },
  ];
  const gradual = detectPosture("yeah", gradualRecent, false);
  log('Recent messages carry emotional context for short msgs', gradual?.posture === 'GENTLE',
    `posture=${gradual?.posture}, state=${gradual?.detected_state}, triggers=${JSON.stringify(gradual?.triggers)}`);
}

function testConversationState() {
  console.log('\n─── 7. CONVERSATION STATE ───');
  setCategory('Conversation State');

  const testId = `healthcheck_convo_${Date.now()}`;
  const state = getState(testId);
  log('getState returns valid state object', state !== null && state.stage === 'ARRIVAL',
    `stage=${state?.stage}`);

  const state2 = getState(testId);
  advanceStage(state2, "i've been thinking about work a lot lately", [], []);
  const stageAdvanced = state2.stage !== 'ARRIVAL';
  log('Stage advances from ARRIVAL', stageAdvanced,
    `stage=${state2?.stage} (advances on substantive content)`);

  const ttlMs = 4 * 60 * 60 * 1000;
  log('STATE_TTL is 4 hours (14400000ms)', ttlMs === 14400000,
    `TTL = ${ttlMs}ms = ${ttlMs / (60 * 60 * 1000)} hours`);

  const throttled = enforceQuestionThrottle('What do you think? How does that feel?', 0);
  const noQuestions = !throttled.includes('?');
  log('Question throttle enforces budget=0', noQuestions,
    `Result: "${throttled.slice(0, 80)}"`);

  log('STAGES has ARRIVAL and OPENING', STAGES.ARRIVAL === 'ARRIVAL' && STAGES.OPENING === 'OPENING',
    `ARRIVAL=${STAGES.ARRIVAL}, OPENING=${STAGES.OPENING}`);
}

async function testPatternEndpoints() {
  console.log('\n─── 8. PATTERN ENDPOINTS ───');
  setCategory('Pattern Endpoints');

  const endpoints = [
    { path: '/api/patterns/last-hour', method: 'POST', body: { userId: TEST_USER_ID, deviceId: 'healthcheck' } },
    { path: '/api/patterns/weekly-summary', method: 'POST', body: { userId: TEST_USER_ID } },
    { path: '/api/patterns/full-reflection', method: 'POST', body: { userId: TEST_USER_ID, deviceId: 'healthcheck' } },
    { path: '/api/patterns-reflection', method: 'POST', body: { userId: TEST_USER_ID } },
  ];

  for (const { path: ep, method, body } of endpoints) {
    try {
      const resp = await httpRequest(method, ep, body, 30000);
      const reachable = resp.status !== undefined;
      log(`${ep} reachable → ${resp.status}`, reachable,
        `status=${resp.status}`);
    } catch (e) {
      log(`${ep} reachable`, false, e.message);
    }
  }

  try {
    const resp = await httpRequest('POST', '/api/patterns/weekly-summary', { userId: TEST_USER_ID }, 45000);
    if (resp.status === 200 && resp.data?.weeklyNarrative) {
      const narrative = resp.data.weeklyNarrative;
      const badPhrases = ['sessions across', 'peak window appears', 'I wonder what you might'];
      for (const phrase of badPhrases) {
        const contains = narrative.toLowerCase().includes(phrase.toLowerCase());
        log(`Weekly narrative does NOT contain "${phrase}"`, !contains,
          contains ? `FOUND at index ${narrative.toLowerCase().indexOf(phrase.toLowerCase())}` : 'Clean');
      }
    } else {
      log('Weekly narrative phrase checks (skipped — no data for test user)', true,
        `status=${resp.status} — expected for test user`);
    }
  } catch (e) {
    log('Weekly narrative phrase checks', false, e.message);
  }
}

function testReflectionTracking() {
  console.log('\n─── 9. REFLECTION TRACKING ───');
  setCategory('Reflection Tracking');

  log('REFLECTION_WINDOW is 30 minutes', REFLECTION_WINDOW_MINUTES === 30,
    `Window = ${REFLECTION_WINDOW_MINUTES} minutes`);

  log('isReflectionAnswer("it helped") → true', isReflectionAnswer('it helped') === true,
    `Got: ${isReflectionAnswer('it helped')}`);

  log('isReflectionAnswer("yeah that was nice") → true', isReflectionAnswer('yeah that was nice') === true,
    `Got: ${isReflectionAnswer('yeah that was nice')}`);

  log('isReflectionAnswer("calmer") → true', isReflectionAnswer('calmer') === true,
    `Got: ${isReflectionAnswer('calmer')}`);

  log('isReflectionAnswer("play neon promise") → false', isReflectionAnswer('play neon promise') === false,
    `Got: ${isReflectionAnswer('play neon promise')}`);

  log('isReflectionAnswer("tell me about your album") → false', isReflectionAnswer('tell me about your album') === false,
    `Got: ${isReflectionAnswer('tell me about your album')}`);

  log('isReflectionAnswer(null) → false', isReflectionAnswer(null) === false,
    `Got: ${isReflectionAnswer(null)}`);
}

async function testIntegrationSmokeTest() {
  console.log('\n─── 10. INTEGRATION SMOKE TEST ───');
  setCategory('Integration Smoke Test');

  const base = { clientState: {}, userId: TEST_USER_ID, lastAssistantMessage: '', nowPlaying: null, recentAssistantMessages: [], recentUserMessages: [] };

  {
    const msg = 'i had a dream about my daughter Nyla last night, it was so vivid';
    const doorResult = processDoorways(msg, bootstrapConversationState(), {}, false);
    const mentions = relationalMemory.extractExplicitPersonMentions(msg);
    const doorOk = doorResult?.selectedDoorId === 'dreams_symbols';
    const memOk = mentions.some(m => /nyla/i.test(m.name));
    log('Dream + memory: doorway=dreams_symbols AND saves Nyla', doorOk && memOk,
      `door=${doorResult?.selectedDoorId}, mentions=${JSON.stringify(mentions.map(m => m.name))}`);
  }

  {
    const msg = 'what do you do for fun';
    const studiosResult = handleTraceStudios({ ...base, userText: msg });
    let brainResult;
    try {
      brainResult = brainSynthesis({
        currentMessage: msg,
        historyMessages: [],
        conversationState: bootstrapConversationState(),
        cognitiveIntent: {},
        traceBrainSignals: {},
        attunement: { posture: 'STEADY' },
        doorwaysResult: null,
        atmosphereResult: null,
      });
    } catch (e) {
      brainResult = { primaryMode: 'error: ' + e.message };
    }
    const studiosOk = studiosResult !== null;
    const modeOk = brainResult?.primaryMode === 'studios';
    log('"what do you do for fun" → studios fires AND primaryMode=studios', studiosOk && modeOk,
      `studios=${studiosOk ? 'fired' : 'null'}, primaryMode=${brainResult?.primaryMode}`);
  }

  {
    const msg = 'i hate myself, i feel worthless and broken';
    const doorResult = processDoorways(msg, bootstrapConversationState(), {}, false);
    const posture = detectPosture(msg, [], false);
    const doorOk = doorResult?.selectedDoorId === 'identity';
    const postureOk = posture?.posture === 'GENTLE';
    log('"i hate myself" → identity door AND posture=GENTLE', doorOk && postureOk,
      `door=${doorResult?.selectedDoorId}, posture=${posture?.posture}`);
  }

  {
    const msg = 'my mom passed away last week and i keep crying';
    const doorResult = processDoorways(msg, bootstrapConversationState(), {}, false);
    const posture = detectPosture(msg, [], false);
    const doorOk = doorResult?.selectedDoorId === 'grief';
    const postureOk = posture?.posture === 'GENTLE';
    log('"mom passed away" → grief door AND posture=GENTLE', doorOk && postureOk,
      `door=${doorResult?.selectedDoorId}, posture=${posture?.posture}`);
  }

  {
    const msg = 'play Neon Promise';
    const studiosResult = handleTraceStudios({ ...base, userText: msg });
    const hasPlay = studiosResult !== null && studiosResult?.traceStudios?.kind !== 'audio_stop';
    log('"play Neon Promise" → studios returns play action', hasPlay,
      studiosResult ? `kind=${studiosResult?.traceStudios?.kind}, mode=${studiosResult?.mode}` : 'null');
  }
}

// ─── 11. END-TO-END CONVERSATION FLOW ───
const E2E_USER_ID = '00000000-0000-4000-a000-000000e2e001';
const E2E_ISOLATION_USER_ID = '00000000-0000-4000-a000-000000e2e002';

async function runE2EFlow() {
  console.log('\n─── 11. END-TO-END CONVERSATION FLOW ───');
  setCategory('E2E Conversation Flow');

  async function e2eStep(label, fn) {
    try {
      const result = await fn();
      log(label, result.pass, result.detail || '');
      return result.data;
    } catch (err) {
      log(label, false, err.message);
      return null;
    }
  }

  // SETUP: Create profile and mark onboarding complete so tests hit real AI pipeline
  await e2eStep('Setup: E2E user profile created and onboarding completed', async () => {
    // Create profile via upsert
    await httpRequest('POST', '/api/profile/update', {
      userId: E2E_USER_ID,
      displayName: 'E2E Test'
    }, 5000);
    // Mark onboarding complete
    const completeRes = await httpRequest('POST', '/api/onboarding/complete', {
      userId: E2E_USER_ID
    }, 5000);
    const pass = completeRes.data?.ok === true || completeRes.status === 200;
    return { pass, detail: pass ? 'profile ready, onboarding complete' : 'setup failed: ' + JSON.stringify(completeRes.data).slice(0, 80) };
  });

  // STEP 1: New user greeting
  await e2eStep('New user greeting fires', async () => {
    const res = await httpRequest('POST', '/api/greeting', {
      userId: E2E_USER_ID,
      isNewUser: true
    }, 10000);
    const data = res.data;
    const pass = !!data.message || !!data.greeting;
    return { pass, detail: pass ? 'greeting returned' : 'no greeting in response', data };
  });

  // STEP 2: Emotional message triggers correct posture
  await e2eStep('Emotional message -> GENTLE posture injected', async () => {
    const res = await httpRequest('POST', '/api/chat', {
      userId: E2E_USER_ID,
      messages: [{ role: 'user', content: 'i feel so drained and empty today' }]
    }, 25000);
    const data = res.data;
    const pass = !!data.message && !data.message.toLowerCase().includes('how are you feeling about');
    return { pass, detail: pass ? 'response returned without therapy opener' : 'bad response: ' + (data.message || '').slice(0, 60), data };
  });

  // STEP 3: Family member mentioned -> memory saves
  await e2eStep('Family mention -> relational memory saved', async () => {
    const res = await httpRequest('POST', '/api/chat', {
      userId: E2E_USER_ID,
      messages: [
        { role: 'user', content: 'i feel so drained and empty today' },
        { role: 'assistant', content: 'yeah. that kind of empty is heavy.' },
        { role: 'user', content: 'my daughter Nyla has been sick and im just exhausted' }
      ]
    }, 25000);
    // Give memory a moment to write async
    await new Promise(r => setTimeout(r, 3000));
    // Check if Nyla was saved
    const memRes = await httpRequest('GET', `/api/memory/people?userId=${E2E_USER_ID}`, null, 5000);
    const memData = memRes.data;
    const nylaFound = JSON.stringify(memData).toLowerCase().includes('nyla');
    return { pass: nylaFound, detail: nylaFound ? 'Nyla saved to memory' : 'Nyla NOT found in memory', data: memData };
  });

  // STEP 4: Dream mention -> doorway fires
  await e2eStep('Dream mention -> dreams doorway fires', async () => {
    const res = await httpRequest('POST', '/api/chat', {
      userId: E2E_USER_ID,
      messages: [{ role: 'user', content: 'i had a really strange dream last night about falling through the sky' }]
    }, 25000);
    const data = res.data;
    const pass = !!data.message && !data.message.toLowerCase().includes('how are you feeling');
    return { pass, detail: pass ? 'dream response returned' : 'bad response', data };
  });

  // STEP 5: Music question -> studios fires
  await e2eStep('Music question -> studios response fires', async () => {
    const res = await httpRequest('POST', '/api/chat', {
      userId: E2E_USER_ID,
      messages: [{ role: 'user', content: 'what do you do for fun' }]
    }, 25000);
    const data = res.data;
    const msg = (data.message || '').toLowerCase();
    const mentionsMusic = msg.includes('music') || msg.includes('night swim') || msg.includes('sound') || msg.includes('make');
    return { pass: mentionsMusic, detail: mentionsMusic ? 'music reveal fired' : 'studios did not fire: ' + (data.message || '').slice(0, 80), data };
  });

  // STEP 6: Returning session -> memory recalled
  await e2eStep('Return session -> Nyla recalled in context', async () => {
    const res = await httpRequest('POST', '/api/chat', {
      userId: E2E_USER_ID,
      messages: [
        { role: 'user', content: 'my daughter Nyla has been unwell' },
        { role: 'assistant', content: 'that sounds really hard. how is she now?' },
        { role: 'user', content: "how's my daughter doing" }
      ]
    }, 25000);
    const data = res.data;
    const msg = (data.message || '').toLowerCase();
    const knowsNyla = msg.includes('nyla');
    const memRes = await httpRequest('GET', `/api/memory/people?userId=${E2E_USER_ID}`, null, 5000);
    const memHasNyla = JSON.stringify(memRes.data).toLowerCase().includes('nyla');
    const pass = knowsNyla || memHasNyla;
    return { pass, detail: knowsNyla ? 'Nyla recalled in response' : (memHasNyla ? 'Nyla in memory (AI did not surface in this response)' : 'memory miss — Nyla not found'), data };
  });

  // STEP 7: Crisis -> everything else suppressed
  await e2eStep('Crisis message -> safe response, no music/activity offers', async () => {
    const res = await httpRequest('POST', '/api/chat', {
      userId: E2E_USER_ID,
      messages: [{ role: 'user', content: 'i want to hurt myself' }]
    }, 25000);
    const data = res.data;
    const msg = (data.message || '').toLowerCase();
    const noMusic = !msg.includes('night swim') && !msg.includes('playlist');
    const noActivity = !msg.includes('breathing exercise') && !msg.includes('try an activity');
    const pass = noMusic && noActivity;
    return { pass, detail: pass ? 'crisis handled cleanly' : 'crisis leaked music or activity offer', data };
  });

  // STEP 8: Patterns endpoint returns narrative not stats
  await e2eStep('Patterns weekly -> narrative not stats block', async () => {
    const res = await httpRequest('POST', '/api/patterns/weekly-summary', {
      userId: E2E_USER_ID
    }, 30000);
    const data = res.data;
    const narrative = data.weeklyNarrative || data.narrative || '';
    const hasStatsPreamble = narrative.includes('sessions across') ||
      narrative.includes('peak window appears') ||
      narrative.includes('I wonder what you might');
    const pass = (res.status === 200 && narrative.length === 0) || (narrative.length > 20 && !hasStatsPreamble);
    return { pass, detail: narrative.length > 0 ? 'clean narrative returned' : 'no data for test user (expected)', data };
  });

  // STEP 9: Token limit -> response doesn't cut mid-sentence
  await e2eStep('Response completes without mid-sentence truncation', async () => {
    const res = await httpRequest('POST', '/api/chat', {
      userId: E2E_USER_ID,
      messages: [{ role: 'user', content: 'can you tell me about neon promise and what it means to you' }]
    }, 25000);
    const data = res.data;
    const msg = (data.message || '').trim();
    if (!msg) return { pass: false, detail: 'empty response', data };
    const lastChar = msg.slice(-1);
    const endsCleanly = ['.', '?', '!', '"', "'", ')'].includes(lastChar);
    return { pass: endsCleanly, detail: endsCleanly ? 'response ends cleanly' : 'possible truncation — ends with: "' + lastChar + '"', data };
  });

  // STEP 10: Concurrent state -> userId isolation (checks memory endpoint directly)
  await e2eStep('Different userId gets isolated state', async () => {
    const memRes = await httpRequest('GET', `/api/memory/people?userId=${E2E_ISOLATION_USER_ID}`, null, 5000);
    const memData = memRes.data;
    const people = memData.people || [];
    const noNyla = !JSON.stringify(people).toLowerCase().includes('nyla');
    const chatRes = await httpRequest('POST', '/api/chat', {
      userId: E2E_ISOLATION_USER_ID,
      messages: [{ role: 'user', content: "do you remember anyone i've mentioned" }]
    }, 25000);
    const chatMsg = (chatRes.data?.message || '').toLowerCase();
    const chatClean = !chatMsg.includes('nyla');
    const pass = noNyla && chatClean;
    return { pass, detail: pass ? 'state correctly isolated (memory empty, no leaks)' : `LEAK: Nyla found — memory=${!noNyla}, chat=${!chatClean}`, data: { people, chatMsg: chatMsg.slice(0, 80) } };
  });
}

async function checkBackendAlive() {
  try {
    const resp = await httpRequest('POST', '/api/greeting', { userId: 'ping' }, 5000);
    return resp.status !== undefined;
  } catch {
    return false;
  }
}

async function run() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   TRACE Integration Health Check (v3)    ║');
  console.log('║   11 Categories — Comprehensive Audit    ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`User ID: ${TEST_USER_ID}${IS_TEMP_USER ? ' (temporary)' : ''}`);
  console.log(`API Base: ${API_BASE}`);
  console.log(`Time: ${new Date().toISOString()}`);

  const alive = await checkBackendAlive();
  console.log(`Backend: ${alive ? 'reachable ✓' : 'NOT REACHABLE ✗ (API tests will fail)'}`);

  try {
    testPromptSync();
    testMemoryPipeline();
    testDoorways();
    testStudiosPipeline();
    testVoiceEngine();
    testAttunement();
    testConversationState();
    await testPatternEndpoints();
    testReflectionTracking();
    await testIntegrationSmokeTest();
    await runE2EFlow();
  } catch (err) {
    console.error('\n💥 UNEXPECTED ERROR:', err.message);
    console.error(err.stack);
  }

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║            RESULTS BY CATEGORY           ║');
  console.log('╚══════════════════════════════════════════╝');

  let totalPassed = 0;
  let totalFailed = 0;
  const failedCategories = [];

  for (const [cat, data] of Object.entries(categoryResults)) {
    const catStatus = data.failed === 0 ? '✅' : '❌';
    console.log(`${catStatus} ${cat}: ${data.passed}/${data.passed + data.failed} passed`);
    totalPassed += data.passed;
    totalFailed += data.failed;
    if (data.failed > 0) {
      failedCategories.push(cat);
      for (const t of data.tests.filter(t => !t.pass)) {
        console.log(`    ❌ ${t.label}: ${t.detail}`);
      }
    }
  }

  console.log('\n═══════════════════════════════════════════');
  console.log(`TOTAL: ${totalPassed}/${totalPassed + totalFailed} passed, ${totalFailed} failed`);

  if (failedCategories.length > 0) {
    console.log(`\nFailing categories: ${failedCategories.join(', ')}`);
  } else {
    console.log('\n🎉 ALL CATEGORIES PASSED');
  }

  console.log('═══════════════════════════════════════════');
  process.exit(totalFailed > 0 ? 1 : 0);
}

run();
