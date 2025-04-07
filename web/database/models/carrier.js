// web/database/models/carrier.js
import pool from '../connection.js';

// Get all carriers
export async function getCarriers() {
  const { rows } = await pool.query('SELECT * FROM carriers ORDER BY name');
  return rows;
}

// Add a new carrier
export async function addCarrier(name, price) {
  const { rows } = await pool.query(
    'INSERT INTO carriers (name, price) VALUES ($1, $2) RETURNING *',
    [name, price]
  );
  return rows[0];
}

// Update an existing carrier
export async function updateCarrier(name, price) {
  const { rowCount, rows } = await pool.query(
    'UPDATE carriers SET price = $1, updated_at = CURRENT_TIMESTAMP WHERE name = $2 RETURNING *',
    [price, name]
  );
  return { changes: rowCount, carrier: rows[0] };
}

// Delete a carrier
export async function deleteCarrier(name) {
  const { rowCount } = await pool.query('DELETE FROM carriers WHERE name = $1', [name]);
  return { changes: rowCount };
}