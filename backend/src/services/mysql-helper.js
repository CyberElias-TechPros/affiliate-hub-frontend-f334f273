/**
 * MySQL Helper - Utilities for querying MySQL directly when needed
 */

const { sequelize } = require('../models-mysql');

/**
 * Execute a raw query
 */
async function query(text, params = []) {
  return sequelize.query(text, { type: sequelize.QueryTypes.SELECT, replacements: params });
}

/**
 * Execute an insert/update and return affected rows
 */
async function execute(text, params = []) {
  const [results] = await sequelize.query(text, { replacements: params });
  return results;
}

/**
 * Get a single record by ID
 */
async function findById(table, id) {
  return sequelize.query(
    `SELECT * FROM ${table} WHERE id = ? LIMIT 1`,
    { type: sequelize.QueryTypes.SELECT, replacements: [id] }
  );
}

/**
 * Get all records with optional filters
 */
async function findAll(table, filters = {}) {
  let sql = `SELECT * FROM ${table}`;
  const params = [];
  
  if (filters.where) {
    const conditions = Object.keys(filters.where).map((key, i) => {
      params.push(filters.where[key]);
      return `${key} = ?`;
    });
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  if (filters.order) {
    sql += ` ORDER BY ${filters.order}`;
  }
  
  if (filters.limit) {
    sql += ` LIMIT ?`;
    params.push(filters.limit);
  }
  
  return sequelize.query(sql, { type: sequelize.QueryTypes.SELECT, replacements: params });
}

/**
 * Insert a record
 */
async function insert(table, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');
  const assignments = keys.map(k => `${k} = VALUES(${k})`).join(', ');
  
  const sql = `
    INSERT INTO ${table} (${keys.join(', ')})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE ${assignments}
  `;
  
  const [result] = await sequelize.query(sql, { replacements: values });
  return result;
}

/**
 * Update a record
 */
async function update(table, id, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const assignments = keys.map(k => `${k} = ?`).join(', ');
  
  const sql = `
    UPDATE ${table} 
    SET ${assignments}, updated_at = NOW() 
    WHERE id = ?
  `;
  
  const [result] = await sequelize.query(sql, { replacements: [...values, id] });
  return result;
}

/**
 * Delete a record
 */
async function remove(table, id) {
  const sql = `DELETE FROM ${table} WHERE id = ?`;
  const [result] = await sequelize.query(sql, { replacements: [id] });
  return result;
}

module.exports = {
  query,
  execute,
  findById,
  findAll,
  insert,
  update,
  remove,
};