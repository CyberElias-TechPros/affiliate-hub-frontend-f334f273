const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { autoIndex: true });
  console.log(`✅ MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);

  mongoose.connection.on('error', (err) => console.error('Mongo error:', err));
  mongoose.connection.on('disconnected', () => console.warn('Mongo disconnected'));
}

module.exports = connectDB;
