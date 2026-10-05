import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger, httpLogger } from './config/logger.js';
import { connectDB } from './config/db.js';
import apiRouter from './routes/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(httpLogger);

// Mount All API Routes
app.use('/api', apiRouter);   

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// Start Server
async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`Incident Response Server running on port ${PORT}`);
  });
}

startServer();