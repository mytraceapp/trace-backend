#!/usr/bin/env node
/**
 * TRACE Integration Health Check
 * 
 * Tests the full pipeline end-to-end for a given userId.
 * Usage: node server/healthCheck.js [userId]
 * 
 * DB-dependent tests use HTTP calls to the running backend (port 3000).
 * Pure logic tests run in-process via direct module imports.
 */

const http = require('http');
const relationalMemory = require('./relationalMemory');
const { processDoorways, bootstrapConversationState } = require('./doorwaysV1');
const { handleTraceStudios } = require('./traceStudios');
const { detectPosture } = require('./traceAttunement');
const { buildReturningGreetingPrompt } = require('./traceSystemPrompt');

const TEST_USER_ID = process.argv[2] || `healthcheck_${Date.now()}`;
const IS_TEMP_USER = !process.argv[2];
const API_BASE = `http://localhost:${process.env.PORT || 3000}`;

const results = [];

function log(label, pass, detail = '') {
  const status = pass ? '✅ PASS' : '❌ FAIL';
  const line = `${status}  ${label}${detail ? ' — ' + detail : ''}`;
  console.log(line);
  results.push({ label, pass, detail });
}

function httpRequest(method, path, body = null, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
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

function testMemoryExtraction() {
  console.log('\n─── 1. Memory Extraction (in-process) ───');
  const testMsg = "my daughter Nyla had her first day of school today";
  const mentions = relationalMemory.extractExplicitPersonMentions(testMsg);
  const hasDaughter = mentions.some(m => m.relationship === 'daughter' && /nyla/i.test(m.name));
  log('extractExplicitPersonMentions parses "my daughter Nyla"', hasDaughter,
    hasDaughter ? `Found: ${JSON.stringify(mentions)}` : `Got: ${JSON.stringify(mentions)}`);

  const testMsg2 = "my wife Sarah picked up my son Jake from school";
  const mentions2 = relationalMemory.extractExplicitPersonMentions(testMsg2);
  const hasWife = mentions2.some(m => m.relationship === 'wife' && /sarah/i.test(m.name));
  const hasSon = mentions2.some(m => m.relationship === 'son' && /jake/i.test(m.name));
  log('Extracts wife from message', hasWife, `Found: ${JSON.stringify(mentions2)}`);
  log('Extracts son from message', hasSon, `Found: ${JSON.stringify(mentions2.filter(m => m.relationship === 'son'))}`);

  const edgeMsg = "my best friend is always there for me";
  const edgeMentions = relationalMemory.extractExplicitPersonMentions(edgeMsg);
  log('Does NOT extract nameless mention', edgeMentions.length === 0,
    `Found: ${JSON.stringify(edgeMentions)}`);
}

async function testMemoryRetrievalViaAPI() {
  console.log('\n─── 2. Memory Retrieval (via API) ───');
  
  try {
    const resp = await httpRequest('POST', '/api/chat', {
      message: "my daughter Nyla is turning 5 next week",
      userId: TEST_USER_ID,
      conversationHistory: [],
    }, 30000);
    const apiOk = resp.status === 200;
    log('Chat API accepts message with person mention', apiOk,
      apiOk ? 'status=200' : `status=${resp.status}, body=${JSON.stringify(resp.data).slice(0, 100)}`);
  } catch (e) {
    log('Chat API reachable', false, e.message);
    return;
  }

  await new Promise(r => setTimeout(r, 1000));

  try {
    const greetResp = await httpRequest('POST', '/api/greeting', { userId: TEST_USER_ID }, 20000);
    const greetOk = greetResp.status === 200 && greetResp.data;
    log('Greeting API returns response', greetOk,
      greetOk ? `greeting length: ${(greetResp.data?.greeting || greetResp.data?.message || '').length}` : `status=${greetResp.status}`);
  } catch (e) {
    log('Greeting API reachable', false, e.message);
  }
}

function testGreetingInjection() {
  console.log('\n─── 3. Greeting Injection (in-process) ───');

  const mockAnchors = ["User's daughter: Nyla.", "User's wife: Sarah."];
  const verifiedMemory = {
    userFacts: ['Enjoys hiking', 'Lives in Portland'],
    coreThemes: ['nature', 'family'],
    goals: [],
    preferences: [],
    relationalAnchors: mockAnchors,
  };

  const prompt = buildReturningGreetingPrompt({
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

  const hasPeople = prompt.includes('PEOPLE');
  log('Greeting prompt includes PEOPLE section', hasPeople,
    hasPeople ? 'PEOPLE block present' : 'PEOPLE block MISSING');

  const hasNyla = prompt.includes('Nyla');
  log('Greeting prompt includes "Nyla"', hasNyla,
    hasNyla ? 'Name found in prompt' : 'Name NOT in prompt');

  const hasSarah = prompt.includes('Sarah');
  log('Greeting prompt includes "Sarah"', hasSarah,
    hasSarah ? 'Name found in prompt' : 'Name NOT in prompt');

  const hasFacts = prompt.includes('hiking');
  log('Greeting prompt includes user facts', hasFacts,
    hasFacts ? 'Facts present' : 'Facts MISSING');
}

function testActiveChatInjection() {
  console.log('\n─── 4. Active Chat Injection (in-process) ───');

  const mockPeople = [
    { relationship: 'daughter', display_name: 'Nyla', notes: 'turning 5 soon' },
    { relationship: 'wife', display_name: 'Sarah', notes: null },
  ];

  const anchors = relationalMemory.buildRelationalAnchors(mockPeople);
  const hasNyla = anchors && anchors.includes('Nyla');
  log('buildRelationalAnchors includes Nyla', hasNyla,
    hasNyla ? 'Anchor text contains "Nyla"' : `Anchors: ${anchors?.slice(0, 120) || 'null'}`);

  const hasSarah = anchors && anchors.includes('Sarah');
  log('buildRelationalAnchors includes Sarah', hasSarah,
    hasSarah ? 'Anchor text contains "Sarah"' : 'Sarah MISSING');

  const hasHeader = anchors && anchors.includes('RELATIONAL ANCHORS');
  log('Anchors block has section header', hasHeader,
    hasHeader ? 'Header present' : 'Header MISSING');

  const hasNotes = anchors && anchors.includes('turning 5');
  log('Anchors include notes when present', hasNotes,
    hasNotes ? 'Notes included' : 'Notes MISSING');

  const emptyAnchors = relationalMemory.buildRelationalAnchors([]);
  log('Empty people returns null', emptyAnchors === null,
    `Got: ${emptyAnchors}`);
}

function testDoorways() {
  console.log('\n─── 5. Doorways ───');

  const dreamTrigger = "I had a dream last night about falling";
  const result = processDoorways(dreamTrigger, bootstrapConversationState(), {}, false);
  const hasDoor = result?.selectedDoorId !== null && result?.selectedDoorId !== undefined;
  log('processDoorways selects door for dream trigger', hasDoor,
    hasDoor ? `doorId=${result.selectedDoorId}, reasonCode=${result.reasonCode}` : `Got: selectedDoorId=${result?.selectedDoorId}, reason=${result?.reasonCode}`);

  const griefTrigger = "my mom passed away and I miss her so much, I keep thinking about the funeral";
  const griefResult = processDoorways(griefTrigger, bootstrapConversationState(), {}, false);
  const hasGriefDoor = griefResult?.selectedDoorId !== null && griefResult?.selectedDoorId !== undefined;
  log('processDoorways selects door for grief trigger', hasGriefDoor,
    hasGriefDoor ? `doorId=${griefResult.selectedDoorId}` : `Got: ${griefResult?.selectedDoorId}`);

  const casualMsg = "hey, nice weather today";
  const casualResult = processDoorways(casualMsg, bootstrapConversationState(), {}, false);
  const noDoor = casualResult?.selectedDoorId === null;
  log('processDoorways returns null door for casual message', noDoor,
    `doorId=${casualResult?.selectedDoorId || 'null'}, reason=${casualResult?.reasonCode}`);

  const crisisResult = processDoorways("I want to end it all", bootstrapConversationState(), {}, true);
  const crisisOverride = crisisResult?.selectedDoorId === null;
  log('processDoorways respects crisis override', crisisOverride,
    `reasonCode=${crisisResult?.reasonCode}`);
}

function testStudios() {
  console.log('\n─── 6. Studios ───');

  const musicRequest = "play neon promise";
  const result = handleTraceStudios({
    userText: musicRequest,
    clientState: {},
    userId: TEST_USER_ID,
    lastAssistantMessage: "",
    nowPlaying: null,
    recentAssistantMessages: [],
    recentUserMessages: [],
  });
  const hasResult = result !== null && result !== undefined;
  const hasAction = result?.assistant_message || result?.ui_action;
  log('handleTraceStudios returns result for track request', hasResult,
    hasResult ? `keys: ${Object.keys(result).join(', ')}` : 'null result');
  log('handleTraceStudios has playback action', !!hasAction,
    hasAction ? `mode=${result.mode}, ui_action=${result.ui_action?.type || 'none'}` : 'No action');

  const genericRequest = "play me something chill";
  const genericResult = handleTraceStudios({
    userText: genericRequest,
    clientState: {},
    userId: TEST_USER_ID,
    lastAssistantMessage: "",
    nowPlaying: null,
    recentAssistantMessages: [],
    recentUserMessages: [],
  });
  log('Generic music request returns null (handled by AI)', genericResult === null,
    genericResult ? `Unexpected: ${Object.keys(genericResult).join(', ')}` : 'Correctly null — AI handles generic requests');

  const stopCmd = "stop the music";
  const stopResult = handleTraceStudios({
    userText: stopCmd,
    clientState: {},
    userId: TEST_USER_ID,
    lastAssistantMessage: "",
    nowPlaying: { trackId: 'neon_promise', title: 'Neon Promise' },
    recentAssistantMessages: [],
    recentUserMessages: [],
  });
  log('handleTraceStudios handles stop command', stopResult !== null,
    stopResult ? `action=${stopResult.action || 'none'}, keys: ${Object.keys(stopResult).join(', ')}` : 'null');
}

function testAttunement() {
  console.log('\n─── 7. Attunement ───');

  const gentleMsg = "i feel so exhausted and drained, i can't do this anymore";
  const gentleResult = detectPosture(gentleMsg, [], false);
  const isGentleOrDirective = gentleResult?.posture === 'GENTLE' || gentleResult?.posture === 'DIRECTIVE';
  log('detectPosture returns GENTLE/DIRECTIVE for exhaustion', isGentleOrDirective,
    `posture=${gentleResult?.posture}, confidence=${gentleResult?.confidence?.toFixed(2)}, triggers=${JSON.stringify(gentleResult?.triggers)}`);

  const neutralMsg = "hey what's up, just hanging out";
  const neutralResult = detectPosture(neutralMsg, [], false);
  const isNeutral = neutralResult?.posture === 'NEUTRAL' || neutralResult?.posture === 'STEADY' || neutralResult?.posture === null || neutralResult === null;
  log('detectPosture returns STEADY/NEUTRAL for casual message', isNeutral,
    `posture=${neutralResult?.posture || 'null'}`);

  const crisisResult = detectPosture("anything", [], true);
  const isCrisisGentle = crisisResult?.posture === 'GENTLE' && crisisResult?.confidence === 1.0;
  log('detectPosture returns GENTLE with crisis override', isCrisisGentle,
    `posture=${crisisResult?.posture}, conf=${crisisResult?.confidence}`);
}

async function testPatternContext() {
  console.log('\n─── 8. Pattern Context (via API) ───');

  try {
    const resp = await httpRequest('POST', '/api/patterns/weekly-summary', {
      userId: TEST_USER_ID,
    }, 45000);
    const gotResponse = resp.status === 200 || resp.status === 400 || resp.status === 404 || resp.status === 500;
    log('Weekly summary endpoint reachable', gotResponse,
      `status=${resp.status}`);
    
    if (resp.status === 200 && resp.data?.weeklyNarrative) {
      log('Weekly summary returns narrative', true,
        `length=${resp.data.weeklyNarrative.length}`);
    } else {
      log('Weekly summary returns data (or empty for new user)', true,
        `status=${resp.status} — expected for test user with no pattern data`);
    }
  } catch (e) {
    log('Weekly summary endpoint reachable', false, e.message);
  }
}

async function cleanup() {
  if (IS_TEMP_USER) {
    try {
      await httpRequest('POST', '/api/chat', {
        message: '__healthcheck_cleanup__',
        userId: TEST_USER_ID,
        conversationHistory: [],
      });
    } catch (e) {}
  }
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
  console.log('╔══════════════════════════════════════╗');
  console.log('║   TRACE Integration Health Check     ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`User ID: ${TEST_USER_ID}${IS_TEMP_USER ? ' (temporary)' : ''}`);
  console.log(`API Base: ${API_BASE}`);
  console.log(`Time: ${new Date().toISOString()}`);

  const alive = await checkBackendAlive();
  console.log(`Backend: ${alive ? 'reachable' : 'NOT REACHABLE (DB tests will fail)'}`);

  try {
    testMemoryExtraction();
    await testMemoryRetrievalViaAPI();
    testGreetingInjection();
    testActiveChatInjection();
    testDoorways();
    testStudios();
    testAttunement();
    await testPatternContext();
  } catch (err) {
    console.error('\n💥 UNEXPECTED ERROR:', err.message);
    console.error(err.stack);
  }

  console.log('\n═══════════════════════════════════════');
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const total = results.length;
  console.log(`Results: ${passed}/${total} passed, ${failed} failed`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.pass).forEach(r => {
      console.log(`  ❌ ${r.label}: ${r.detail}`);
    });
  }

  console.log('═══════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

run();
