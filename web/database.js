// web/database.js
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// PostgreSQL connection configuration
const dbConfig = {
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'shipping_app',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
};

// Create a PostgreSQL connection pool
const pool = new pg.Pool(dbConfig);

// Initialize the database by creating tables if they don't exist
export async function initializeDB() {
  const client = await pool.connect();
  try {
    // Create carriers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS carriers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        price INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Check if carriers table is empty and add default carriers if needed
    const { rows } = await client.query('SELECT COUNT(*) AS count FROM carriers');
    if (parseInt(rows[0].count) === 0) {
      await client.query(
        'INSERT INTO carriers (name, price) VALUES ($1, $2), ($3, $4)',
        ['DPD', 1000, 'Post', 1200]
      );
      console.log('Initialized default carriers');
    }
    
    console.log('PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('Error initializing PostgreSQL database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Carrier operations
export async function getCarriers() {
  const { rows } = await pool.query('SELECT * FROM carriers ORDER BY name');
  return rows;
}

export async function addCarrier(name, price) {
  const { rows } = await pool.query(
    'INSERT INTO carriers (name, price) VALUES ($1, $2) RETURNING *',
    [name, price]
  );
  return rows[0];
}

export async function updateCarrier(name, price) {
  const { rowCount, rows } = await pool.query(
    'UPDATE carriers SET price = $1, updated_at = CURRENT_TIMESTAMP WHERE name = $2 RETURNING *',
    [price, name]
  );
  return { changes: rowCount, carrier: rows[0] };
}

export async function deleteCarrier(name) {
  const { rowCount } = await pool.query('DELETE FROM carriers WHERE name = $1', [name]);
  return { changes: rowCount };
}

// Settings operations
export async function getSetting(key) {
  const { rows } = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
  return rows.length > 0 ? rows[0].value : null;
}

export async function setSetting(key, value) {
  const { rowCount } = await pool.query(
    'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP',
    [key, value]
  );
  return { success: rowCount > 0 };
}

// Export the pool for direct query access if needed
export default pool;