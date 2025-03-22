const { setupTestFamily, addTestMember } = require('./testFamily');

// Test account credentials
const TEST_ACCOUNTS = {
  parent: {
    email: 'test@example.com',
    password: 'password123'
  },
  member: {
    email: 'member@example.com',
    password: 'password123'
  }
};

async function runTests() {
  try {
    console.log('Starting family management tests...');

    // Step 1: Create a test family with parent account
    console.log('\n1. Creating test family...');
    const { familyId } = await setupTestFamily(
      TEST_ACCOUNTS.parent.email,
      TEST_ACCOUNTS.parent.password
    );

    // Step 2: Add a test member
    console.log('\n2. Adding test member...');
    await addTestMember(
      familyId,
      TEST_ACCOUNTS.member.email,
      TEST_ACCOUNTS.member.password,
      'member'
    );

    console.log('\nAll tests completed successfully!');
    console.log('You can now test the family management features:');
    console.log('1. Log in as parent:', TEST_ACCOUNTS.parent.email);
    console.log('2. Log in as member:', TEST_ACCOUNTS.member.email);
    console.log('3. Family ID:', familyId);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runTests(); 