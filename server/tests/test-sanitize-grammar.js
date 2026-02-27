const path = require('path');
const { sanitizeTone } = require(path.join(__dirname, '..', 'traceBrain'));

let passed = 0;
let failed = 0;

function test(name, input, expected, options = {}) {
  const result = sanitizeTone(input, { userId: 'test', isCrisisMode: false, ...options });
  const ok = result === expected;
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    Input:    "${input}"`);
    console.log(`    Expected: "${expected}"`);
    console.log(`    Got:      "${result}"`);
  }
}

console.log('\n=== sanitizeTone Grammar Quality Tests ===\n');

console.log('--- Fragment removal after phrase stripping ---');

test('Strips "Thank you for sharing" + trailing words',
  'Thank you for sharing your story. It sounds like a lot.',
  "Sounds like a lot.");

test('Strips "I\'m here to support" + trailing words',
  "I'm here to support you through this. Let's figure it out.",
  "Let's figure it out.");

test('Strips "That takes courage" + trailing words',
  "That takes courage to admit. How are you feeling now?",
  "How are you feeling now?");

test('Strips "I want you to know" + trailing words',
  "I want you to know that you're not alone. Things can get better.",
  "Things can get better.");

console.log('\n--- Capitalization after removal ---');

test('Capitalizes after leading phrase removal',
  "Your feelings are valid. it really does get easier.",
  "Yeah, it does get easier.");

test('Capitalizes after full sentence removal',
  "It's okay to feel that way. sometimes rest helps.",
  "Sometimes rest helps.");

console.log('\n--- Orphaned fragment removal ---');

test('Removes leading orphaned 1-word fragment',
  "Thank you for sharing that. You seem thoughtful.",
  "You seem thoughtful.");

test('Preserves meaningful short starts like "yeah"',
  "Yeah. That makes sense.",
  "Yeah. That makes sense.");

test('Preserves "nice" as standalone',
  "Nice. Getting the word out helps.",
  "Nice. Getting the word out helps.");

console.log('\n--- Multi-pattern interactions ---');

test('Multiple patterns removed cleanly',
  "I appreciate you sharing. Your feelings are valid. How's work going?",
  "Thanks for sharing. How's work going?");

test('Replacement + removal combo',
  "That must be really hard. Thank you for sharing that with me.",
  "That's hard.");

console.log('\n--- No false positives ---');

test('Normal response passes through unchanged',
  "that sounds rough. what happened?",
  "That sounds rough. what happened?");

test('Casual buddy response preserved',
  "yeah that's wild. did they actually say that?",
  "Yeah that's wild. did they actually say that?");

test('Short response preserved',
  "makes sense.",
  "Makes sense.");

console.log('\n--- Mid-sentence safety (no over-pruning) ---');

test('Mid-sentence "thank you for sharing" preserved',
  "I know, thank you for sharing your story, it helped me understand.",
  "I know, thank you for sharing your story, it helped me understand.");

test('Trailing "for real" not stripped',
  "That's rough. For real.",
  "That's rough. For real.");

test('Trailing "right now" not stripped',
  "Sounds like a lot. Right now.",
  "Sounds like a lot. Right now.");

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
