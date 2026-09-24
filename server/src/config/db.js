const mongoose = require('mongoose');
const config = require('./env');

async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });
  // Ensure indexes are built (useful for queues / conflict searches).
  if (config.env === 'development') {
    mongoose.connection.syncIndexes().catch(() => {});
  }
  console.log(`[db] connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
}

module.exports = { connectDB };