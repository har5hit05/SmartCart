const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'smartcart',
  password: 'password123',
  database: 'smartcart',
});

async function createAdmin() {
  const passwordHash = await bcrypt.hash('Admin@123', 12);
  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = 'admin@smartcart.com'");
    if (existing.rows.length > 0) {
      await pool.query(
        "UPDATE users SET role = 'admin', password_hash = $1 WHERE email = 'admin@smartcart.com' RETURNING id, email, full_name, role",
        [passwordHash]
      );
      console.log('Existing user updated to admin');
    } else {
      const result = await pool.query(
        "INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role",
        ['admin@smartcart.com', passwordHash, 'Admin', 'admin']
      );
      console.log('Admin created:', JSON.stringify(result.rows[0]));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  await pool.end();
}

createAdmin();
