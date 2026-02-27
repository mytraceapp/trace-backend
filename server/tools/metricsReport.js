#!/usr/bin/env node
/**
 * Schema Rollout Metrics Aggregation Tool
 *
 * Reads backend log output (piped via stdin or from LOG_PATH file),
 * parses [SCHEMA METRICS] and [PHASE4] lines, and prints a summary.
 *
 * Usage:
 *   node server/tools/metricsReport.js                     # reads from LOG_PATH or stdin
 *   cat /tmp/logs/Backend_API_*.log | node server/tools/metricsReport.js
 *
 * Env:
 *   LOG_PATH    — path to log file (default: reads all /tmp/logs/Backend_API_*.log)
 *   METRICS_N   — max entries to consider (default: 500)
 */

const fs = require('fs');
const { execSync } = require('child_process');

const MAX_N = parseInt(process.env.METRICS_N, 10) || 500;

function findLogFiles() {
  try {
    const files = execSync('ls -t /tmp/logs/Backend_API_*.log 2>/dev/null', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    return files;
  } catch {
    return [];
  }
}

function readLines() {
  const logPath = process.env.LOG_PATH;
  if (logPath) {
    if (!fs.existsSync(logPath)) {
      console.error(`File not found: ${logPath}`);
      process.exit(1);
    }
    return fs.readFileSync(logPath, 'utf8').split('\n');
  }

  const files = findLogFiles();
  if (files.length > 0) {
    let allLines = [];
    for (const f of files) {
      try {
        const content = fs.readFileSync(f, 'utf8');
        allLines = allLines.concat(content.split('\n'));
      } catch {}
    }
    return allLines;
  }

  if (process.stdin.isTTY === true) {
    console.error('No log files found. Set LOG_PATH or pipe logs via stdin.');
    process.exit(1);
  }

  return fs.readFileSync('/dev/stdin', 'utf8').split('\n');
}

function safeParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    try {
      return JSON.parse(str.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&'));
    } catch {
      return null;
    }
  }
}

function pct(n, total) {
  if (total === 0) return '0.0%';
  return (n / total * 100).toFixed(1) + '%';
}

function run() {
  const lines = readLines();

  const schemaEntries = [];
  const phase4Entries = [];

  for (const line of lines) {
    const schemaIdx = line.indexOf('[SCHEMA METRICS]');
    if (schemaIdx !== -1) {
      const jsonStr = line.slice(schemaIdx + '[SCHEMA METRICS]'.length).trim();
      const obj = safeParse(jsonStr);
      if (obj) schemaEntries.push(obj);
    }

    const p4Idx = line.indexOf('[PHASE4]');
    if (p4Idx !== -1) {
      const jsonStr = line.slice(p4Idx + '[PHASE4]'.length).trim();
      const obj = safeParse(jsonStr);
      if (obj) phase4Entries.push(obj);
    }
  }

  const schemaSlice = schemaEntries.slice(-MAX_N);
  const phase4Slice = phase4Entries.slice(-MAX_N);

  console.log('='.repeat(60));
  console.log('  TRACE Schema Rollout Metrics Report');
  console.log('='.repeat(60));
  console.log();

  if (schemaSlice.length === 0) {
    console.log('No [SCHEMA METRICS] entries found.');
  } else {
    const total = schemaSlice.length;
    let schemaRan = 0;
    let schemaFailed = 0;
    let enforcementActive = 0;
    let rewriteAttempted = 0;
    let rewriteSucceeded = 0;
    let totalLatency = 0;
    let totalRewriteLatency = 0;
    let rewriteLatencyCount = 0;
    const violationCounts = {};
    const skipReasonCounts = {};

    for (const e of schemaSlice) {
      if (e.schema_ran) schemaRan++;
      if (e.schema_failed) schemaFailed++;
      if (e.rewrite_attempted) {
        enforcementActive++;
        rewriteAttempted++;
      } else if (e.schema_ran && !e.skip_reason) {
        enforcementActive++;
      }
      if (e.rewrite_succeeded) rewriteSucceeded++;

      if (typeof e.latency_ms_total === 'number') totalLatency += e.latency_ms_total;
      if (typeof e.latency_ms_rewrite === 'number' && e.rewrite_attempted) {
        totalRewriteLatency += e.latency_ms_rewrite;
        rewriteLatencyCount++;
      }

      if (Array.isArray(e.violations)) {
        for (const v of e.violations) {
          violationCounts[v] = (violationCounts[v] || 0) + 1;
        }
      }

      const reason = e.skip_reason || 'none';
      skipReasonCounts[reason] = (skipReasonCounts[reason] || 0) + 1;
    }

    console.log('--- [SCHEMA METRICS] Summary ---');
    console.log(`  Entries analyzed:        ${total} (last ${MAX_N} max)`);
    console.log(`  schema_ran:              ${schemaRan} (${pct(schemaRan, total)})`);
    console.log(`  enforcement_active:      ${enforcementActive} (${pct(enforcementActive, total)})`);
    console.log(`  schema_failed:           ${schemaFailed} (${pct(schemaFailed, total)})`);
    console.log(`  rewrite_attempted:       ${rewriteAttempted} (${pct(rewriteAttempted, total)})`);
    console.log(`  rewrite_succeeded:       ${rewriteSucceeded} (${pct(rewriteSucceeded, total)})`);
    if (rewriteAttempted > 0) {
      console.log(`  rewrite_success_rate:    ${pct(rewriteSucceeded, rewriteAttempted)}`);
    }
    console.log();
    console.log(`  avg latency_ms_total:    ${total > 0 ? (totalLatency / total).toFixed(1) : 'N/A'}ms`);
    console.log(`  avg latency_ms_rewrite:  ${rewriteLatencyCount > 0 ? (totalRewriteLatency / rewriteLatencyCount).toFixed(1) : 'N/A'}ms`);
    console.log();

    const sortedViolations = Object.entries(violationCounts).sort((a, b) => b[1] - a[1]);
    if (sortedViolations.length > 0) {
      console.log('  Top violations:');
      for (const [v, count] of sortedViolations.slice(0, 15)) {
        console.log(`    ${count.toString().padStart(4)}x  ${v}`);
      }
    } else {
      console.log('  No violations recorded.');
    }
    console.log();

    const sortedSkip = Object.entries(skipReasonCounts).sort((a, b) => b[1] - a[1]);
    console.log('  Skip reason breakdown:');
    for (const [reason, count] of sortedSkip) {
      console.log(`    ${count.toString().padStart(4)}x  ${reason}`);
    }
  }

  console.log();

  if (phase4Slice.length === 0) {
    console.log('No [PHASE4] entries found.');
  } else {
    const total = phase4Slice.length;
    let driftLockRan = 0;
    let tightenPairRan = 0;
    let sanitizeToneRan = 0;

    for (const e of phase4Slice) {
      if (e.driftLock_ran) driftLockRan++;
      if (e.tightenPair_ran) tightenPairRan++;
      if (e.sanitizeTone_ran) sanitizeToneRan++;
    }

    console.log('--- [PHASE4] Layer Tracking ---');
    console.log(`  Entries analyzed:        ${total}`);
    console.log(`  driftLock_ran:           ${driftLockRan} (${pct(driftLockRan, total)})`);
    console.log(`  tightenPair_ran:         ${tightenPairRan} (${pct(tightenPairRan, total)})`);
    console.log(`  sanitizeTone_ran:        ${sanitizeToneRan} (${pct(sanitizeToneRan, total)})`);
  }

  console.log();
  console.log('='.repeat(60));
}

run();
