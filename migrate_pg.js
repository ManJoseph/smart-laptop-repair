require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
});

const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log('Connecting to PostgreSQL to run migrations...');
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK(role IN ('customer', 'technician', 'admin'))
      );
    `);
    console.log('✅ users table created.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact VARCHAR(255) DEFAULT '',
        email VARCHAR(255) DEFAULT '',
        address TEXT DEFAULT ''
      );
    `);
    console.log('✅ suppliers table created.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS parts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        stock_level INTEGER DEFAULT 0,
        cost REAL NOT NULL,
        supplier_id INTEGER REFERENCES suppliers(id)
      );
    `);
    console.log('✅ parts table created.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS repairs (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES users(id),
        technician_id INTEGER REFERENCES users(id),
        device_model VARCHAR(255) NOT NULL,
        problem_description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending' CHECK(status IN ('Pending', 'Diagnosing', 'Fixing', 'Completed', 'Cancelled')),
        cost REAL DEFAULT 0.0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ repairs table created.');

    await client.query('COMMIT');
    console.log('🎉 All migrations ran successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
};

migrate();
