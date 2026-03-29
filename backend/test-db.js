const { Pool } = require('pg');

console.log('Testing PostgreSQL connection...\n');

// Test 1: Connection string
const pool1 = new Pool({
    connectionString: 'postgresql://smartcart:password123@localhost:5432/smartcart'
});

console.log('Test 1: Connecting with connection string...');
pool1.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Test 1 FAILED:', err.message);
    } else {
        console.log('✅ Test 1 SUCCESS:', res.rows[0]);
    }
    pool1.end();

    // Test 2: Individual parameters
    const pool2 = new Pool({
        host: 'localhost',
        port: 5432,
        user: 'smartcart',
        password: 'password123',
        database: 'smartcart',
    });

    console.log('\nTest 2: Connecting with individual params...');
    pool2.query('SELECT NOW()', (err, res) => {
        if (err) {
            console.error('❌ Test 2 FAILED:', err.message);
        } else {
            console.log('✅ Test 2 SUCCESS:', res.rows[0]);
        }
        pool2.end();

        // Test 3: Check what pg sees
        console.log('\nTest 3: Checking connection details...');
        console.log('Password length:', 'password123'.length);
        console.log('Password bytes:', Buffer.from('password123').toString('hex'));
        console.log('Expected:', Buffer.from('password123').toString('hex'));
    });
});