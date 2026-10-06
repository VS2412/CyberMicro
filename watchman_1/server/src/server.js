import './config/env.js';
import express from 'express';
import cors from 'cors';
import { logger, httpLogger } from './config/logger.js';
import { connectDB } from './config/db.js';
import apiRouter from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(httpLogger);

// Mount All API Routes
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// Fallback error handler: never leak stack traces to the client
app.use((err, req, res, _next) => {
  req.log.error({ err }, 'Unhandled error');
  res.status(err.status || 500).json({ error: err.expose ? err.message : 'Internal Server Error' });
});

// Start Server
async function startServer() {
  if (!process.env.CHAIN_SECRET || process.env.CHAIN_SECRET === 'change-me') {
    logger.fatal('CHAIN_SECRET is not set in watchman_1/.env. Run "npm run setup" in watchman_1/server first.');
    process.exit(1);
  }
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`Incident Response Server running on port ${PORT}`);
  });
}

startServer();
