import pino from 'pino';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'body.password', 'body.apiKey'],
    censor: '[REDACTED]',
  },
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-correlation-id'] || randomUUID(),
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});