#!/usr/bin/env node

const axios = require('axios');

async function testAuthentication() {
  console.log('Testing authentication...');

  const serverHost = '10.10.10.198';
  const serverPort = '3001';
  const username = 'admin';
  const email = 'admin@example.com';
  const password = 'admin123';

  // Test email authentication
  try {
    console.log(`\n📧 Testing EMAIL authentication:`);
    console.log(`Connecting to: http://${serverHost}:${serverPort}/api/auth/login`);
    console.log(`Credentials: ${email} / ${password}`);

    const emailResponse = await axios.post(`http://${serverHost}:${serverPort}/api/auth/login`, {
      email: email,
      password: password
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Email authentication successful!');
    console.log('Response:', JSON.stringify(emailResponse.data, null, 2));

  } catch (error) {
    console.log('❌ Email authentication failed!');
    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📋 Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❓ Error:', error.message);
    }
  }

  // Test username authentication
  try {
    console.log(`\n👤 Testing USERNAME authentication:`);
    console.log(`Connecting to: http://${serverHost}:${serverPort}/api/auth/login`);
    console.log(`Credentials: ${username} / ${password}`);

    const usernameResponse = await axios.post(`http://${serverHost}:${serverPort}/api/auth/login`, {
      username: username,
      password: password
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Username authentication successful!');
    console.log('Response:', JSON.stringify(usernameResponse.data, null, 2));

  } catch (error) {
    console.log('❌ Username authentication failed!');

    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📋 Error:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('🌐 Network error - no response received');
      console.log('📡 Request details:', error.message);
    } else {
      console.log('❓ Unknown error:', error.message);
    }
  }

  // Test server health
  try {
    console.log('\n🩺 Testing server health...');
    const healthResponse = await axios.get(`http://${serverHost}:${serverPort}/health`, {
      timeout: 5000
    });
    console.log('Server is healthy:', JSON.stringify(healthResponse.data, null, 2));
  } catch (error) {
    console.log('Server health check failed:', error.message);
  }

  // Test API info
  try {
    console.log('\n📚 Testing API info...');
    const apiResponse = await axios.get(`http://${serverHost}:${serverPort}/api`, {
      timeout: 5000
    });
    console.log('API info:', JSON.stringify(apiResponse.data, null, 2));
  } catch (error) {
    console.log('API info failed:', error.message);
  }
}

testAuthentication();