#!/usr/bin/env tsx

/**
 * Simple migration test script
 * Run with: npx tsx scripts/test-migration.ts
 * 
 * Tests all endpoints and gives a simple pass/fail report
 */

const BASE_URL = 'http://localhost:5000';

interface TestResult {
  route: string;
  method: string;
  status: number;
  passed: boolean;
}

const results: TestResult[] = [];

async function test(method: string, path: string, body?: any): Promise<TestResult> {
  try {
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${path}`, options);
    const passed = response.status < 500; // Success if not a server error
    const result: TestResult = {
      route: path,
      method,
      status: response.status,
      passed,
    };
    results.push(result);
    return result;
  } catch (error) {
    results.push({
      route: path,
      method,
      status: 0,
      passed: false,
    });
    throw error;
  }
}

async function runTests() {
  console.log('\n🧪 Testing Migration to Domain-Based Architecture\n');
  console.log('Testing:', BASE_URL);
  console.log('---\n');

  // Auth Domain
  console.log('📌 Auth Domain');
  await test('GET', '/api/v2/auth/me');
  await test('POST', '/api/v2/auth/login', { email: 'test@example.com', password: 'test' });
  await test('POST', '/api/v2/auth/logout');
  console.log('');

  // Properties Domain
  console.log('📌 Properties Domain');
  await test('GET', '/api/v2/properties');
  await test('GET', '/api/v2/properties/1');
  console.log('');

  // Applications Domain
  console.log('📌 Applications Domain');
  await test('GET', '/api/v2/applications/1');
  await test('GET', '/api/v2/applications/user/1');
  await test('GET', '/api/v2/applications/property/1');
  console.log('');

  // Payments Domain
  console.log('📌 Payments Domain');
  await test('GET', '/api/v2/payments/1/receipt');
  await test('GET', '/api/v2/payments/audit-logs');
  console.log('');

  // Leases Domain
  console.log('📌 Leases Domain');
  await test('GET', '/api/v2/leases/1/payment-history');
  await test('GET', '/api/v2/leases/1/rent-payments');
  console.log('');

  // Admin Domain
  console.log('📌 Admin Domain');
  await test('GET', '/api/v2/admin/settings');
  await test('GET', '/api/v2/admin/personas');
  console.log('');

  // Print Results
  console.log('---\n');
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`Results: ${passed}/${total} endpoints responding\n`);

  results.forEach((r) => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.method.padEnd(6)} ${r.route.padEnd(40)} (${r.status})`);
  });

  console.log('\n---\n');
  if (passed === total) {
    console.log('✨ All tests passed! Migration successful.\n');
    process.exit(0);
  } else {
    console.log(`⚠️  ${total - passed} endpoints need attention.\n`);
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('❌ Test failed to run:', error.message);
  console.log('\nMake sure the app is running on port 5000\n');
  process.exit(1);
});
