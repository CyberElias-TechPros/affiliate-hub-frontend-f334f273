const mongoose = require('mongoose');

const DB_TYPE = process.env.DB_TYPE || 'mongodb'; // 'mongodb', 'mysql', or 'postgres'
const ENABLE_SYNC = process.env.ENABLE_SYNC === 'true';

// MongoDB connection
async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { autoIndex: true });
  console.log(`✅ MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);

  mongoose.connection.on('error', (err) => console.error('Mongo error:', err));
  mongoose.connection.on('disconnected', () => console.warn('Mongo disconnected'));
}

// MySQL connection
const { connectMySQL } = require('./db-mysql');
const { connectPostgres } = require('./db-postgres');

// Sync service
let syncService = null;
async function initSync() {
  if (!ENABLE_SYNC) return;
  try {
    syncService = require('../services/sync.service');
    await syncService.initSyncService();
    console.log('✅ Sync service initialized');
  } catch (err) {
    console.error('Sync service init failed:', err.message);
  }
}

// Main connect function - connects to primary DB and optionally syncs to others
async function connectDB() {
  if (DB_TYPE === 'mysql') {
    await connectMySQL();
    require('../models-mysql');
  } else if (DB_TYPE === 'postgres') {
    await connectPostgres();
  } else {
    await connectMongoDB();
    require('../models');
  }
  
  console.log(`✅ Primary database connected: ${DB_TYPE}`);
  
  // Initialize sync service for backup redundancy
  if (ENABLE_SYNC) {
    await initSync();
  }
}

module.exports = connectDB;
