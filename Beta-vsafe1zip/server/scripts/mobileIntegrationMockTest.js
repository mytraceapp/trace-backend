#!/usr/bin/env node

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

async function testIdempotencyRetrySafety(baseUrl) {
  const startedAt = Date.now();
  const retryKey = `qa-retry-${Date.now()}`;

  const payload = {
    userId: "qa-local-test",
    mode: "chat",
    messages: [{ role: "user", content: "QA retry safety check." }],
    requestId: retryKey,
    clientMessageId: retryKey,
    client_message_id: retryKey,
  };

  const callChat = async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const raw = await res.text();
    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      json = { _raw: raw };
    }

    return { status: res.status, json };
  };

  const first = await callChat();
  const second = await callChat();

  const durationMs = Date.now() - startedAt;

  const extractMessage = (obj) => {
    const j = obj?.json || {};
    if (typeof j.message === "string") return j.message;
    if (Array.isArray(j.messages)) return j.messages[0];
    if (typeof j.messages?.[0]?.content === "string") return j.messages[0].content;
    return null;
  };

  const msg1 = extractMessage(first);
  const msg2 = extractMessage(second);

  const duplicateSignal =
    !!second?.json?.duplicate ||
    !!second?.json?.deduped ||
    second?.json?.status === "duplicate" ||
    /duplicate|dedup|already processed|retry/i.test(JSON.stringify(second.json));

  const sameMessage = !!msg1 && !!msg2 && msg1 === msg2;

  const pass = duplicateSignal || sameMessage;

  return {
    name: "Idempotency / Retry Safety",
    pass,
    durationMs,
    firstStatus: first.status,
    secondStatus: second.status,
    duplicateSignal,
    sameMessage,
    msg1,
    msg2,
    details: pass
      ? "Retry behavior safe (duplicate detected or deduped output)"
      : "Retry risk: same payload produced different output (no dedup signal)",
  };
}

async function runTests() {
  console.log('\n🧪 TRACE Mobile Integration Mock Test');
  console.log('═'.repeat(50));
  
  const results = { passed: 0, failed: 0, tests: [] };
  
  // 1) Health validation
  console.log('\n📍 Test 1: Health Check');
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    if (healthRes.ok) {
      const data = await healthRes.json();
      if (data.status === 'ok' || data.ok) {
        console.log('   ✅ Health endpoint returned ok status');
        results.passed++;
        results.tests.push({ name: 'Health Check', status: 'PASS' });
      } else {
        throw new Error('Health response missing ok status');
      }
    } else {
      throw new Error(`Health endpoint returned ${healthRes.status}`);
    }
  } catch (err) {
    console.log(`   ❌ Health check failed: ${err.message}`);
    results.failed++;
    results.tests.push({ name: 'Health Check', status: 'FAIL', error: err.message });
  }

  // 2) Correct payload test (main mobile flow)
  console.log('\n📍 Test 2: Mobile Chat Payload');
  try {
    const chatRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'mock integration test ping' }],
        userId: 'mock-mobile-test-' + Date.now()
      })
    });
    
    if (!chatRes.ok) {
      const errorData = await chatRes.json().catch(() => ({}));
      throw new Error(`Chat endpoint returned ${chatRes.status}: ${errorData.error || 'unknown'}`);
    }
    
    const data = await chatRes.json();
    
    if (data.message && typeof data.message === 'string' && data.message.length > 0) {
      console.log('   ✅ Chat endpoint accepts mobile payload');
      console.log(`   ✅ Response contains message (${data.message.substring(0, 50)}...)`);
      results.passed++;
      results.tests.push({ name: 'Mobile Chat Payload', status: 'PASS' });
    } else if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
      console.log('   ✅ Chat endpoint accepts mobile payload');
      console.log(`   ✅ Response contains messages array (${data.messages.length} messages)`);
      results.passed++;
      results.tests.push({ name: 'Mobile Chat Payload', status: 'PASS' });
    } else {
      throw new Error('Response missing message or messages field');
    }
    
    if (data.error) {
      console.log(`   ⚠️  Response includes error field (fallback): ${data.error}`);
    }
  } catch (err) {
    console.log(`   ❌ Mobile chat test failed: ${err.message}`);
    results.failed++;
    results.tests.push({ name: 'Mobile Chat Payload', status: 'FAIL', error: err.message });
  }

  // 3) Resume storm test (3 parallel requests)
  console.log('\n📍 Test 3: Resume Storm (3 parallel requests)');
  try {
    const stormMessages = [
      'resume storm one',
      'resume storm two', 
      'resume storm three'
    ];
    
    const startTime = Date.now();
    
    const stormPromises = stormMessages.map((msg, i) => 
      fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: msg }],
          userId: `mock-storm-test-${Date.now()}-${i}`
        })
      }).then(async res => {
        const data = await res.json();
        return { status: res.status, data, requestIndex: i };
      })
    );
    
    const stormResults = await Promise.all(stormPromises);
    const duration = Date.now() - startTime;
    
    let stormPassed = true;
    const requestIds = [];
    
    for (const result of stormResults) {
      if (result.status !== 200) {
        console.log(`   ❌ Request ${result.requestIndex} returned ${result.status}`);
        stormPassed = false;
      } else if (!result.data.message && (!result.data.messages || result.data.messages.length === 0)) {
        console.log(`   ❌ Request ${result.requestIndex} missing message`);
        stormPassed = false;
      } else {
        console.log(`   ✅ Request ${result.requestIndex} succeeded`);
        if (result.data.requestId) {
          requestIds.push(result.data.requestId);
        }
      }
    }
    
    if (requestIds.length > 0) {
      const uniqueIds = new Set(requestIds);
      if (uniqueIds.size === requestIds.length) {
        console.log(`   ✅ All ${requestIds.length} requestIds are unique`);
      } else {
        console.log(`   ⚠️  Some requestIds are duplicated`);
      }
    }
    
    if (duration > 8000) {
      console.log(`   ❌ Storm took too long: ${duration}ms (limit: 8000ms)`);
      stormPassed = false;
    } else {
      console.log(`   ✅ Storm completed in ${duration}ms (under 8s limit)`);
    }
    
    if (stormPassed) {
      results.passed++;
      results.tests.push({ name: 'Resume Storm', status: 'PASS', duration });
    } else {
      results.failed++;
      results.tests.push({ name: 'Resume Storm', status: 'FAIL' });
    }
  } catch (err) {
    console.log(`   ❌ Resume storm test failed: ${err.message}`);
    results.failed++;
    results.tests.push({ name: 'Resume Storm', status: 'FAIL', error: err.message });
  }

  // 4) Idempotency / Retry Safety test
  console.log('\n📍 Test 4: Idempotency / Retry Safety');
  try {
    const idempotencyResult = await testIdempotencyRetrySafety(BASE_URL);
    
    if (idempotencyResult.pass) {
      console.log(`   ✅ ${idempotencyResult.details}`);
      console.log(`   ✅ Duration: ${idempotencyResult.durationMs}ms`);
      console.log(`   ✅ First call: ${idempotencyResult.firstStatus}, Second call: ${idempotencyResult.secondStatus}`);
      if (idempotencyResult.duplicateSignal) {
        console.log(`   ✅ Duplicate signal detected`);
      }
      if (idempotencyResult.sameMessage) {
        console.log(`   ✅ Same message returned (deduped response)`);
      }
      results.passed++;
      results.tests.push({ 
        name: 'Idempotency / Retry Safety', 
        status: 'PASS',
        duration: idempotencyResult.durationMs,
        duplicateSignal: idempotencyResult.duplicateSignal,
        sameMessage: idempotencyResult.sameMessage
      });
    } else {
      console.log(`   ❌ ${idempotencyResult.details}`);
      console.log(`   ❌ First message: ${idempotencyResult.msg1?.substring(0, 40)}...`);
      console.log(`   ❌ Second message: ${idempotencyResult.msg2?.substring(0, 40)}...`);
      results.failed++;
      results.tests.push({ 
        name: 'Idempotency / Retry Safety', 
        status: 'FAIL', 
        error: idempotencyResult.details 
      });
    }
  } catch (err) {
    console.log(`   ❌ Idempotency test failed: ${err.message}`);
    results.failed++;
    results.tests.push({ name: 'Idempotency / Retry Safety', status: 'FAIL', error: err.message });
  }

  // 5) Final summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(50));
  
  for (const test of results.tests) {
    const icon = test.status === 'PASS' ? '✅' : '❌';
    console.log(`   ${icon} ${test.name}: ${test.status}`);
    if (test.error) {
      console.log(`      └─ ${test.error}`);
    }
    if (test.duration) {
      console.log(`      └─ Duration: ${test.duration}ms`);
    }
    if (test.duplicateSignal !== undefined) {
      console.log(`      └─ Duplicate signal: ${test.duplicateSignal}, Same message: ${test.sameMessage}`);
    }
  }
  
  console.log('\n' + '─'.repeat(50));
  
  if (results.failed === 0) {
    console.log('✅ PASS: Mobile Integration Mock Test');
    console.log(`   ${results.passed}/${results.passed + results.failed} tests passed\n`);
    process.exit(0);
  } else {
    console.log('❌ FAIL: Mobile Integration Mock Test');
    console.log(`   ${results.passed}/${results.passed + results.failed} tests passed\n`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('❌ Test runner crashed:', err.message);
  process.exit(1);
});
