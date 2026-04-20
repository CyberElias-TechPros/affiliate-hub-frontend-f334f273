const mongoose = require('mongoose');

const DB_TYPE = process.env.DB_TYPE || 'mongodb'; // 'mongodb' or 'mysql'

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

// Import MySQL connection
const { connectMySQL } = require('./db-mysql');

// Main connect function - selects DB based on DB_TYPE
async function connectDB() {
  if (DB_TYPE === 'mysql') {
    await connectMySQL();
    // Load MySQL models
    require('../models-mysql');
  } else {
    await connectMongoDB();
    // Load MongoDB models
    require('../models');
  }
  console.log(`✅ Database connected using: ${DB_TYPE}`);
}

module.exports = connectDB;
