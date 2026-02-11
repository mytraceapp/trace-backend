#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const LOG_PATH = process.argv[2] || path.join(__dirname, '..', 'server.log');

if (!fs.existsSync(LOG_PATH)) {
  console.error(`Log file not found: ${LOG_PATH}`);
  process.exit(1);
}

const lines = fs.readFileSync(LOG_PATH, 'utf8').split('\n');
const entries = [];

for (const line of lines) {
  const idx = line.indexOf('[RESPONSE_SHAPE]');
  if (idx === -1) continue;
  const jsonStart = line.indexOf('{', idx);
  if (jsonStart === -1) continue;
  try {
    entries.push(JSON.parse(line.slice(jsonStart)));
  } catch { /* skip */ }
}

if (entries.length === 0) {
  console.log('No [RESPONSE_SHAPE] entries found in', LOG_PATH);
  process.exit(0);
}

const modeCounts = {};
const issueCounts = {};
let audioByMode = {};
let uiByMode = {};
let totalOk = 0;
let totalFail = 0;

for (const e of entries) {
  const mode = e.mode || 'unknown';
  modeCounts[mode] = (modeCounts[mode] || 0) + 1;
  if (e.ok) totalOk++; else totalFail++;

  if (e.has_audio_action) audioByMode[mode] = (audioByMode[mode] || 0) + 1;
  if (e.has_ui_action) uiByMode[mode] = (uiByMode[mode] || 0) + 1;

  if (e.top_issues) {
    for (const code of e.top_issues) {
      issueCounts[code] = (issueCounts[code] || 0) + 1;
    }
  }
}

console.log('\n=== TRACE Response Shape Report ===\n');
console.log(`Total responses: ${entries.length}  (ok: ${totalOk}, issues: ${totalFail})\n`);

console.log('Counts by mode:');
for (const [mode, count] of Object.entries(modeCounts).sort((a, b) => b[1] - a[1])) {
  const audioPct = audioByMode[mode] ? ((audioByMode[mode] / count) * 100).toFixed(0) : '0';
  const uiPct = uiByMode[mode] ? ((uiByMode[mode] / count) * 100).toFixed(0) : '0';
  console.log(`  ${mode.padEnd(14)} ${String(count).padStart(4)}  audio_action: ${audioPct}%  ui_action: ${uiPct}%`);
}

if (Object.keys(issueCounts).length > 0) {
  console.log('\nTop issue codes:');
  const sorted = Object.entries(issueCounts).sort((a, b) => b[1] - a[1]);
  for (const [code, count] of sorted.slice(0, 10)) {
    console.log(`  ${code.padEnd(35)} ${count}`);
  }
} else {
  console.log('\nNo issues detected.');
}

console.log('');
