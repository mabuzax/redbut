/**
 * Test script to demonstrate session prevention logic
 * This simulates how the frontend should handle session URLs with ?session=...
 */

const API_BASE = 'http://localhost:3001/api/v1';

// Simulate a client ID (in real implementation, this would be a browser fingerprint or device ID)
const clientId = 'browser_' + Math.random().toString(36).substring(2, 15);

console.log('Testing session prevention logic...');
console.log('Client ID:', clientId);

async function testSessionPrevention() {
  try {
    // Test 1: First session should succeed
    console.log('\n=== Test 1: First session validation (should succeed) ===');
    const response1 = await fetch(`${API_BASE}/auth/validate-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: '2dc1ba8c-8328-4310-9783-3d9c3db0f90e_1_b7d4f195-cdc3-426d-9f4f-b31d41d61234',
        name: 'Test User',
        clientId: clientId
      })
    });

    if (response1.ok) {
      const result1 = await response1.json();
      console.log('✅ First session validation successful:');
      console.log('- Session ID:', result1.sessionId);
      console.log('- Table Number:', result1.tableNumber);
      console.log('- User ID:', result1.userId);
    } else {
      const error1 = await response1.json();
      console.log('❌ First session validation failed:', error1);
    }

    // Test 2: Second session with same client ID should fail
    console.log('\n=== Test 2: Second session validation (should fail) ===');
    const response2 = await fetch(`${API_BASE}/auth/validate-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: 'c7fe5283-27ba-4711-a214-71cf3cfd413a_20_b7d4f195-cdc3-426d-9f4f-b31d41d61234',
        name: 'Test User 2',
        clientId: clientId
      })
    });

    if (response2.ok) {
      const result2 = await response2.json();
      console.log('❌ Second session validation should have failed but succeeded:', result2);
    } else {
      const error2 = await response2.json();
      console.log('✅ Second session validation correctly blocked:');
      console.log('- Message:', error2.message);
      if (error2.existingSession) {
        console.log('- Existing Session ID:', error2.existingSession.sessionId);
        console.log('- Existing Table Number:', error2.existingSession.tableNumber);
      }
    }

    // Test 3: Same session ID with same client should succeed (re-accessing same session)
    console.log('\n=== Test 3: Re-accessing same session (should succeed) ===');
    const response3 = await fetch(`${API_BASE}/auth/validate-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: '2dc1ba8c-8328-4310-9783-3d9c3db0f90e_1_b7d4f195-cdc3-426d-9f4f-b31d41d61234',
        name: 'Test User',
        clientId: clientId
      })
    });

    if (response3.ok) {
      const result3 = await response3.json();
      console.log('✅ Re-accessing same session successful:');
      console.log('- Session ID:', result3.sessionId);
      console.log('- Table Number:', result3.tableNumber);
    } else {
      const error3 = await response3.json();
      console.log('❌ Re-accessing same session failed:', error3);
    }

    // Test 4: Different client ID should succeed
    console.log('\n=== Test 4: Different client accessing new session (should succeed) ===');
    const newClientId = 'browser_' + Math.random().toString(36).substring(2, 15);
    const response4 = await fetch(`${API_BASE}/auth/validate-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: '842b8a73-3cc2-41eb-b27c-b1be9afde5e5_15_3c4d8be2-85bd-4c72-9b6e-748d6e1abf42',
        name: 'Different User',
        clientId: newClientId
      })
    });

    if (response4.ok) {
      const result4 = await response4.json();
      console.log('✅ Different client accessing new session successful:');
      console.log('- Session ID:', result4.sessionId);
      console.log('- Table Number:', result4.tableNumber);
      console.log('- New Client ID:', newClientId);
    } else {
      const error4 = await response4.json();
      console.log('❌ Different client accessing new session failed:', error4);
    }

  } catch (error) {
    console.error('Test failed with error:', error.message);
  }
}

// Run the test
testSessionPrevention();
