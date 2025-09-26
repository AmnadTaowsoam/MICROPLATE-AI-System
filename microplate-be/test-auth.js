// Test script for auth service
const fetch = require('node-fetch');

const AUTH_SERVICE_URL = 'http://localhost:6401';

async function testAuth() {
  console.log('🧪 Testing Auth Service...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const healthResponse = await fetch(`${AUTH_SERVICE_URL}/healthz`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);

    // Test 2: Register new user
    console.log('\n2. Testing user registration...');
    const registerData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123'
    };

    const registerResponse = await fetch(`${AUTH_SERVICE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registerData)
    });

    const registerResult = await registerResponse.json();
    console.log('📝 Register response:', registerResult);

    // Test 3: Login
    console.log('\n3. Testing user login...');
    const loginData = {
      usernameOrEmail: 'test@example.com',
      password: 'password123'
    };

    const loginResponse = await fetch(`${AUTH_SERVICE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });

    const loginResult = await loginResponse.json();
    console.log('🔑 Login response:', loginResult);

    if (loginResult.success) {
      console.log('✅ Login successful!');
      console.log('🎫 Access token received');
    } else {
      console.log('❌ Login failed:', loginResult.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAuth();
