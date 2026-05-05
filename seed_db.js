require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
});

const seed = async () => {
  const client = await pool.connect();
  try {
    console.log('Seeding database with default accounts...');
    
    // Hash password for admin
    const adminHashed = await bcrypt.hash('admin123', 10);
    const techHashed = await bcrypt.hash('tech123', 10);
    const clientHashed = await bcrypt.hash('client123', 10);

    // Insert Admin
    await client.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
      ['System Admin', 'admin@slr.com', adminHashed, 'admin']
    );

    // Insert Technician
    await client.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
      ['Tech Support', 'tech@slr.com', techHashed, 'technician']
    );

    // Insert Customer
    await client.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
      ['John Doe', 'customer@slr.com', clientHashed, 'customer']
    );

    console.log('✅ Default users created successfully!');
    console.log('--- Credentials ---');
    console.log('Admin: admin@slr.com / admin123');
    console.log('Tech:  tech@slr.com / tech123');
    console.log('User:  customer@slr.com / client123');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    client.release();
    pool.end();
  }
};

seed();
