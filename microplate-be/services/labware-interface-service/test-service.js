/**
 * Test script for Labware Interface Service
 * This script tests the main functionality of the service
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:6405';
const TEST_TOKEN = 'your-test-jwt-token'; // Replace with actual token

const headers = {
  'Authorization': `Bearer ${TEST_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testHealthCheck() {
  console.log('Testing health check...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', response.data);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
}

async function testReadinessCheck() {
  console.log('Testing readiness check...');
  try {
    const response = await axios.get(`${BASE_URL}/ready`);
    console.log('✅ Readiness check passed:', response.data);
  } catch (error) {
    console.error('❌ Readiness check failed:', error.message);
  }
}

async function testGenerateInterface() {
  console.log('Testing interface file generation...');
  try {
    const response = await axios.post(
      `${BASE_URL}/api/v1/labware/interface/generate`,
      { sampleNo: 'TEST002' },
      { headers }
    );
    console.log('✅ Interface generation passed:', response.data);
    return response.data.data?.id;
  } catch (error) {
    console.error('❌ Interface generation failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetInterfaceFiles() {
  console.log('Testing get interface files...');
  try {
    const response = await axios.get(
      `${BASE_URL}/api/v1/labware/interface/files`,
      { headers }
    );
    console.log('✅ Get interface files passed:', response.data);
  } catch (error) {
    console.error('❌ Get interface files failed:', error.response?.data || error.message);
  }
}

async function testGetInterfaceFile(id) {
  if (!id) {
    console.log('⏭️ Skipping get interface file test (no ID)');
    return;
  }
  
  console.log('Testing get interface file...');
  try {
    const response = await axios.get(
      `${BASE_URL}/api/v1/labware/interface/files/${id}`,
      { headers }
    );
    console.log('✅ Get interface file passed:', response.data);
  } catch (error) {
    console.error('❌ Get interface file failed:', error.response?.data || error.message);
  }
}

async function testDeleteInterfaceFile(id) {
  if (!id) {
    console.log('⏭️ Skipping delete interface file test (no ID)');
    return;
  }
  
  console.log('Testing delete interface file...');
  try {
    const response = await axios.delete(
      `${BASE_URL}/api/v1/labware/interface/files/${id}`,
      { headers }
    );
    console.log('✅ Delete interface file passed:', response.data);
  } catch (error) {
    console.error('❌ Delete interface file failed:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Labware Interface Service tests...\n');
  
  // Basic health checks
  await testHealthCheck();
  await testReadinessCheck();
  
  console.log('\n--- API Tests ---');
  
  // Test interface file operations
  const fileId = await testGenerateInterface();
  await testGetInterfaceFiles();
  await testGetInterfaceFile(fileId);
  
  // Uncomment to test deletion
  // await testDeleteInterfaceFile(fileId);
  
  console.log('\n✨ Tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testHealthCheck,
  testReadinessCheck,
  testGenerateInterface,
  testGetInterfaceFiles,
  testGetInterfaceFile,
  testDeleteInterfaceFile,
  runTests
};
