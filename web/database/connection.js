// web/database/connection.js
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

// Export the pool for direct query access
export default pool;