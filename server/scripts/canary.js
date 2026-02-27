#!/usr/bin/env node
const BASE_URL = process.env.CANARY_BASE_URL || 'http://localhost:3000';
const INTERVAL_MS = parseInt(process.env.CANARY_INTERVAL_MS || '300000', 10);
const LATENCY_MS = parseInt(process.env.CANARY_LATENCY_MS || '2500', 10);
const LATENCY_AVG_MS = parseInt(process.env.CANARY_LATENCY_AVG_MS || '2000', 10);
const WEBHOOK_URL = process.env.CANARY_WEBHOOK_URL || '';
const AUTH_HEADER = process.env.CANARY_AUTH_HEADER || '';
const AUTH_VALUE = process.env.CANARY_AUTH_VALUE || '';
const WINDOW_SIZE = 12;

const latencyWindow = { health: [], chat: [] };

function pushWindow(arr, val) {
  arr.push(val);
  if (arr.length > WINDOW_SIZE) arr.shift();
}

function avg(arr, n) {
  const slice = arr.slice(-n);
  return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : 0;
}

function headers() {
  const h = { 'Content-Type': 'application/json' };
  if (AUTH_HEADER && AUTH_VALUE) h[AUTH_HEADER] = AUTH_VALUE;
  return h;
}

async function alert(check, data) {
  const payload = { tag: '[CANARY_ALERT]', time: new Date().toISOString(), baseUrl: BASE_URL, check, ...data };
  console.error(JSON.stringify(payload));
  if (WEBHOOK_URL) {
    try {
      await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } catch (e) {
      console.error(JSON.stringify({ tag: '[CANARY_WEBHOOK_FAIL]', error: e.message }));
    }
  }
}

async function checkHealth() {
  const t0 = Date.now();
  try {
    const resp = await fetch(`${BASE_URL}/api/health`, { headers: headers() });
    const latencyMs = Date.now() - t0;
    pushWindow(latencyWindow.health, latencyMs);
    if (resp.status !== 200) {
      await alert('health', { status: resp.status, latencyMs, error: 'non-200 status' });
      return false;
    }
    if (latencyMs > LATENCY_MS) {
      await alert('health', { status: resp.status, latencyMs, error: `latency ${latencyMs}ms > ${LATENCY_MS}ms` });
      return false;
    }
    const avgLat = avg(latencyWindow.health, 6);
    if (latencyWindow.health.length >= 6 && avgLat > LATENCY_AVG_MS) {
      await alert('health', { status: resp.status, latencyMs, avgLatency6: Math.round(avgLat), error: `avg latency ${Math.round(avgLat)}ms > ${LATENCY_AVG_MS}ms` });
      return false;
    }
    return true;
  } catch (e) {
    await alert('health', { status: 0, latencyMs: Date.now() - t0, error: e.message });
    return false;
  }
}

async function checkChat() {
  const t0 = Date.now();
  try {
    const resp = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        userId: 'canary-monitor',
        deviceId: 'canary-monitor',
        clientMessageId: `canary-${Date.now()}`,
        canary: true,
        messages: [{ role: 'user', content: 'canary' }]
      })
    });
    const latencyMs = Date.now() - t0;
    pushWindow(latencyWindow.chat, latencyMs);

    if (resp.status !== 200) {
      await alert('chat', { status: resp.status, latencyMs, error: 'non-200 status' });
      return false;
    }

    const data = await resp.json();
    const missing = [];
    if (data.request_id == null && data.requestId == null) missing.push('request_id');
    if (!data.response_source) missing.push('response_source');
    if (!data._shape_meta) missing.push('_shape_meta');
    if (missing.length) {
      await alert('chat', { status: 200, latencyMs, error: `missing fields: ${missing.join(', ')}`, response_source: data.response_source });
      return false;
    }

    if (latencyMs > LATENCY_MS) {
      await alert('chat', { status: 200, latencyMs, error: `latency ${latencyMs}ms > ${LATENCY_MS}ms` });
      return false;
    }
    const avgLat = avg(latencyWindow.chat, 6);
    if (latencyWindow.chat.length >= 6 && avgLat > LATENCY_AVG_MS) {
      await alert('chat', { status: 200, latencyMs, avgLatency6: Math.round(avgLat), error: `avg latency ${Math.round(avgLat)}ms > ${LATENCY_AVG_MS}ms` });
      return false;
    }

    return true;
  } catch (e) {
    await alert('chat', { status: 0, latencyMs: Date.now() - t0, error: e.message });
    return false;
  }
}

async function runOnce() {
  const healthOk = await checkHealth();
  const chatOk = await checkChat();
  const ts = new Date().toISOString();
  const hLat = latencyWindow.health[latencyWindow.health.length - 1] || 0;
  const cLat = latencyWindow.chat[latencyWindow.chat.length - 1] || 0;
  console.log(`[CANARY] ${ts} health=${healthOk ? 'ok' : 'FAIL'}(${hLat}ms) chat=${chatOk ? 'ok' : 'FAIL'}(${cLat}ms)`);
}

if (process.argv.includes('--once')) {
  runOnce().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
} else {
  console.log(`[CANARY] Starting monitor: base=${BASE_URL} interval=${INTERVAL_MS / 1000}s latency_threshold=${LATENCY_MS}ms avg_threshold=${LATENCY_AVG_MS}ms`);
  runOnce();
  setInterval(runOnce, INTERVAL_MS);
}
