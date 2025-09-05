const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testOrderStatusConfig() {
  try {
    console.log('🧪 Testing Order Status Configuration...\n');

    // Test client role
    console.log('📱 Testing CLIENT role:');
    console.log('=====================================');
    
    const clientTests = [
      { status: 'New', expectedOptions: ['New', 'Cancel'] },
      { status: 'Acknowledged', expectedOptions: ['Acknowledged', 'Cancel'] },
      { status: 'InProgress', expectedOptions: ['In Progress'] },
      { status: 'Complete', expectedOptions: ['Completed'] },
      { status: 'Delivered', expectedOptions: ['Delivered', 'Reject'] },
      { status: 'Paid', expectedOptions: ['Paid'] },
      { status: 'Cancelled', expectedOptions: ['Cancelled'] },
      { status: 'Rejected', expectedOptions: ['Rejected'] }
    ];

    for (const test of clientTests) {
      try {
        const response = await axios.get(`${BASE_URL}/api/v1/order-status-config/transitions?currentStatus=${test.status}&userRole=client`);
        const options = response.data.transitions.map(config => config.label);
        console.log(`  Status: ${test.status} → Available: [${options.join(', ')}]`);
        
        const hasExpected = test.expectedOptions.every(expected => options.includes(expected));
        console.log(`    ✅ Expected options present: ${hasExpected}`);
      } catch (error) {
        console.log(`    ❌ Error testing ${test.status}: ${error.response?.status || error.message} - ${error.response?.data?.message || 'No additional details'}`);
      }
    }

    // Test waiter role
    console.log('\n👨‍🍳 Testing WAITER role:');
    console.log('=====================================');
    
    const waiterTests = [
      { status: 'New', expectedOptions: ['New', 'Acknowledge', 'Start Preparing', 'Cancel'] },
      { status: 'Acknowledged', expectedOptions: ['Acknowledged', 'Start Preparing', 'Cancel'] },
      { status: 'InProgress', expectedOptions: ['In Progress', 'Mark Complete', 'Cancel'] },
      { status: 'Complete', expectedOptions: ['Completed', 'Deliver'] },
      { status: 'Delivered', expectedOptions: ['Delivered', 'Mark Paid'] },
      { status: 'Paid', expectedOptions: ['Paid'] },
      { status: 'Cancelled', expectedOptions: ['Cancelled'] },
      { status: 'Rejected', expectedOptions: ['Rejected'] }
    ];

    for (const test of waiterTests) {
      try {
        const response = await axios.get(`${BASE_URL}/api/v1/order-status-config/transitions?currentStatus=${test.status}&userRole=waiter`);
        const options = response.data.transitions.map(config => config.label);
        console.log(`  Status: ${test.status} → Available: [${options.join(', ')}]`);
        
        const hasExpected = test.expectedOptions.every(expected => options.includes(expected));
        console.log(`    ✅ Expected options present: ${hasExpected}`);
      } catch (error) {
        console.log(`    ❌ Error testing ${test.status}: ${error.response?.status || error.message} - ${error.response?.data?.message || 'No additional details'}`);
      }
    }

    // Test admin role (should have all options)
    console.log('\n👑 Testing ADMIN role:');
    console.log('=====================================');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/v1/order-status-config/transitions?currentStatus=New&userRole=admin`);
      const options = response.data.transitions.map(config => config.label);
      console.log(`  Status: New → Available: [${options.join(', ')}]`);
      console.log(`    ✅ Admin has full control: ${options.length >= 8}`); // Now includes Rejected
    } catch (error) {
      console.log(`    ❌ Error testing admin: ${error.response?.status || error.message} - ${error.response?.data?.message || 'No additional details'}`);
    }

    console.log('\n🎉 Order Status Configuration Test Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testOrderStatusConfig();
