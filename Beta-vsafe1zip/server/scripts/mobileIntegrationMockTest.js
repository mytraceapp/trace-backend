#!/usr/bin/env node

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

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
    
    // TRACE API returns 'message' (singular) not 'messages' array
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

  // 4) Final summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(50));
  
  for (const test of results.tests) {
    const icon = test.status === 'PASS' ? '✅' : '❌';
    console.log(`   ${icon} ${test.name}: ${test.status}`);
    if (test.error) {
      console.log(`      └─ ${test.error}`);
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
