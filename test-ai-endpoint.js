const fetch = require('node-fetch');

// Test the AI review endpoint
async function testAIEndpoint() {
  try {
    console.log('Testing AI review endpoint...');
    
    // This would normally require authentication, but we're just testing if the endpoint exists
    const response = await fetch('http://localhost:3000/api/admin/analytics/staff/test-id/ai-review', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // In a real test, you'd include: 'Authorization': 'Bearer your-token-here'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    if (response.status === 401) {
      console.log('✅ Endpoint exists but requires authentication (expected)');
    } else if (response.status === 404) {
      console.log('❌ Endpoint not found');
    } else {
      const data = await response.text();
      console.log('Response:', data);
    }
    
  } catch (error) {
    console.error('Error testing endpoint:', error.message);
  }
}

testAIEndpoint();
