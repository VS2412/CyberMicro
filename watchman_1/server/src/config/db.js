import mongoose from 'mongoose';
import { logger } from './logger.js';

export async function connectDB() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/incident_response_db';
  try {
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB database');
  } catch (err) {
    logger.fatal({ err }, 'Failed to connect to MongoDB');
    process.exit(1);
  }
}