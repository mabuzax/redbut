const fetch = require('node-fetch');

// Test the rating field functionality
async function testRatingField() {
  const baseUrl = 'http://localhost:3001/api/v1/service-analysis';
  
  // Test data with different happiness levels
  const testCases = [
    {
      happiness: 'Extremely Happy',
      expectedRating: 5,
      sessionId: 'test-session-1',
      userId: 'user-1',
      waiterId: 'waiter-1'
    },
    {
      happiness: 'Very Happy',
      expectedRating: 4,
      sessionId: 'test-session-2',
      userId: 'user-2',
      waiterId: 'waiter-2'
    },
    {
      happiness: 'Just Ok',
      expectedRating: 3,
      sessionId: 'test-session-3',
      userId: 'user-3',
      waiterId: 'waiter-3'
    },
    {
      happiness: 'Unhappy',
      expectedRating: 2,
      sessionId: 'test-session-4',
      userId: 'user-4',
      waiterId: 'waiter-4'
    },
    {
      happiness: 'Horrible',
      expectedRating: 1,
      sessionId: 'test-session-5',
      userId: 'user-5',
      waiterId: 'waiter-5'
    }
  ];

  console.log('Testing rating field calculation...\n');

  for (const testCase of testCases) {
    try {
      const payload = {
        sessionId: testCase.sessionId,
        userId: testCase.userId,
        waiterId: testCase.waiterId,
        analysis: {
          happiness: testCase.happiness,
          reason: `Test feedback for ${testCase.happiness}`,
          suggested_improvement: `Test improvement for ${testCase.happiness}`,
          overall_sentiment: testCase.expectedRating >= 4 ? 'positive' : testCase.expectedRating <= 2 ? 'negative' : 'neutral'
        }
      };

      console.log(`Testing: ${testCase.happiness} (expected rating: ${testCase.expectedRating})`);
      
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Success: Rating ${result.rating} (${result.rating === testCase.expectedRating ? 'CORRECT' : 'INCORRECT'})`);
        console.log(`   Stored analysis:`, JSON.stringify(result.analysis));
      } else {
        const error = await response.text();
        console.log(`❌ Failed: ${response.status} - ${error}`);
      }
      
      console.log('');
    } catch (error) {
      console.error(`❌ Error testing ${testCase.happiness}:`, error.message);
      console.log('');
    }
  }

  // Test retrieving all records to verify they were stored correctly
  try {
    console.log('Retrieving all service analysis records...');
    const response = await fetch(baseUrl);
    if (response.ok) {
      const records = await response.json();
      console.log(`\n📊 Total records: ${records.length}`);
      records.forEach((record, index) => {
        console.log(`${index + 1}. Rating: ${record.rating}, Happiness: ${record.analysis.happiness}, Session: ${record.sessionId}`);
      });
    }
  } catch (error) {
    console.error('Error retrieving records:', error.message);
  }
}

// Run the test
testRatingField().catch(console.error);
