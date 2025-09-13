const jwt = require('jsonwebtoken');

// Create a test tenant token with the same payload structure used in auth service
const testTenantPayload = {
  sub: '0b578a2d-5a47-43f1-a036-e876745f14f2',
  type: 'tenant',
  email: 'info@redbut.co.za',
  name: 'RedBut Holdings',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
};

// Use the same secret as configured in the app
const secret = 'super-secret-jwt-key-change-in-production';

// Generate token
const testToken = jwt.sign(testTenantPayload, secret);

console.log('Test Tenant Token:', testToken);
console.log('\nTo test this token, use:');
console.log(`curl -H "Authorization: Bearer ${testToken}" http://localhost:3001/api/v1/admin/staff`);
