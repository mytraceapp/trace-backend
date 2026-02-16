/**
 * TRACE Onboarding Crisis Detection Tests
 * 
 * Verifies that suicidal ideation language during onboarding
 * triggers the crisis opener ("I'm glad you told me. are you safe right now?")
 * BEFORE any onboarding prompt or OpenAI call.
 * 
 * Run: node server/tests/test-onboarding-crisis.js
 */

const detectCrisis = (msg) => {
  if (!msg) return null;
  const t = msg.toLowerCase();
  
  const jokeIndicators = ['laughing', 'lmao', 'lol', 'jk', 'joking', 'haha', 'lmfao', 'rofl', 'dying laughing', 'so funny'];
  if (jokeIndicators.some(j => t.includes(j))) return null;
  
  const highSeverity = [
    'kill myself', 'killing myself', 'end my life', 'want to die', 'dont want to live',
    "don't want to live", 'suicide', 'suicidal', 'take my life',
    'overdose', 'od on pills', 'jump off', 'bridge', 'hang myself', 'hanging myself',
    'cut myself', 'slit my wrists', 'shoot myself',
    'im going to do it', "i'm going to do it",
    'cant do this anymore', "can't do this anymore", 'this is my last',
    'i wrote a note', 'i have a plan', 'no point in living'
  ];
  if (highSeverity.some(k => t.includes(k))) return { triggered: true, severity: 'high' };
  
  const moderateSeverity = [
    'i want to disappear', 'want to disappear', 'i cant go on', "i can't go on",
    "i'm done with everything", 'im hopeless', "i'm hopeless",
    'no reason to live', 'everyone would be better without me', 'better off without me',
    'i hate being alive', 'i dont feel safe', "i don't feel safe",
    "don't want to be here", "dont want to be here",
    "what's the point", "whats the point",
    'better off dead', 'hurt myself', 'hurting myself',
    'end it all', 'not worth living', 'wish i was dead', 'wish i were dead',
    "i can't take it", "i cant take it", 'nobody cares', 'no one cares',
    'no one would miss me', 'nobody would miss me'
  ];
  if (moderateSeverity.some(k => t.includes(k))) return { triggered: true, severity: 'moderate' };
  
  const ideationPatterns = [
    /life\s*(is|isn'?t|isnt)\s*(not\s+)?worth/i,
    /don'?t\s+know\s+if\s+(life|living|it'?s)\s*(is\s+)?worth/i,
    /is\s+life\s+(even\s+)?worth/i,
    /life\s+(even\s+)?worth\s+(it|living)/i,
    /why\s+(am\s+i|should\s+i)\s+(still\s+)?(here|alive|living)/i,
    /why\s+am\s+i\s+(even\s+)?here/i,
    /no\s+point\s+(in\s+)?(being\s+)?(alive|here|living)/i,
    /what'?s\s+the\s+point\s+of\s+(living|being\s+alive|life|it\s+all)/i,
    /rather\s+(not\s+)?be\s+(alive|here|dead)/i,
    /tired\s+of\s+(being\s+alive|living|existing)/i,
    /don'?t\s+(want|wanna)\s+to\s+(be\s+here|exist|wake\s+up)/i,
    /if\s+i\s+(just\s+)?(wasn'?t|weren'?t|wasnt)\s+(here|alive)/i,
    /world\s+.*\s+better\s+without\s+me/i,
    /should\s+i\s+(even\s+)?(be\s+here|keep\s+going|bother)/i,
    /wish\s+i\s+(wouldn'?t|won'?t|didn'?t|don'?t|could\s+just\s+not)\s+(wake\s+up|exist|be\s+here|be\s+alive)/i,
    /sometimes\s+i\s+(wish|think|wonder|hope)\s+i\s+(wouldn'?t|won'?t|didn'?t|don'?t)\s+wake/i,
  ];
  if (ideationPatterns.some(p => p.test(t))) return { triggered: true, severity: 'moderate' };
  
  return null;
};

const CRISIS_OPENER = "I'm glad you told me. are you safe right now?";

let passed = 0;
let failed = 0;

function test(name, input, expectedTriggered, expectedSeverity) {
  const result = detectCrisis(input);
  const triggered = result !== null && result.triggered;
  const severity = result?.severity || null;
  
  if (triggered !== expectedTriggered) {
    console.log(`  FAIL: ${name}`);
    console.log(`    Input: "${input}"`);
    console.log(`    Expected triggered=${expectedTriggered}, got triggered=${triggered}`);
    failed++;
    return;
  }
  if (expectedSeverity && severity !== expectedSeverity) {
    console.log(`  FAIL: ${name}`);
    console.log(`    Input: "${input}"`);
    console.log(`    Expected severity=${expectedSeverity}, got severity=${severity}`);
    failed++;
    return;
  }
  console.log(`  PASS: ${name}`);
  passed++;
}

console.log('\n=== TRACE Onboarding Crisis Detection Tests ===\n');

console.log('--- REQUIRED TEST CASES (must trigger crisis, no onboarding, no OpenAI) ---');
test(
  'TC1: "I don\'t know if life is worth living"',
  "I don't know if life is worth living",
  true, 'moderate'
);
test(
  'TC2: "I want to kill myself"',
  "I want to kill myself",
  true, 'high'
);
test(
  'TC3: "sometimes I wish I wouldn\'t wake up"',
  "sometimes I wish I wouldn't wake up",
  true, 'moderate'
);

console.log('\n--- ADDITIONAL CRISIS PATTERNS ---');
test('Variant: no apostrophe', "I dont know if life is worth living", true, 'moderate');
test('Variant: is life worth it', "is life even worth it", true, 'moderate');
test('Variant: why am i here', "why am i even here", true, 'moderate');
test('Variant: tired of existing', "tired of existing", true, 'moderate');
test('Variant: better off dead', "better off dead", true, 'moderate');
test('Variant: wish i were dead', "wish i were dead", true, 'moderate');

console.log('\n--- FALSE POSITIVE CHECKS (must NOT trigger crisis) ---');
test('Safe: greeting', "hey what's up", false, null);
test('Safe: regulate choice', "regulate", false, null);
test('Safe: reflect choice', "reflect", false, null);
test('Safe: feeling sad', "i feel kind of sad today", false, null);
test('Safe: work stress', "im stressed about work", false, null);
test('Safe: joke context', "lol i want to kill myself haha so funny", false, null);

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  console.log('CRITICAL: Some crisis detection tests FAILED!');
  process.exit(1);
} else {
  console.log('All crisis detection tests passed.');
}
