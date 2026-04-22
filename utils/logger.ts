import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import { getLogFileName } from './date.utils';

const logsDir = path.resolve(process.cwd(), 'reports', 'logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logLevel = process.env.LOG_LEVEL || 'debug';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, testName, ...meta }) => {
    const testLabel = testName ? `[${testName}]` : '';
    const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase().padEnd(5)}] ${testLabel} ${message}${metaStr}`;
  })
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, testName }) => {
    const testLabel = testName ? `[${testName}] ` : '';
    return `[${timestamp}] ${level} ${testLabel}${message}`;
  })
);

const winstonLogger = winston.createLogger({
  level: logLevel,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({
      filename: path.join(logsDir, getLogFileName()),
      format: logFormat,
    }),
  ],
});

const SENSITIVE_KEYS = new Set([
  'password', 'Password', 'PASSWORD',
  'token', 'Token', 'TOKEN',
  'secret', 'Secret', 'SECRET',
  'authorization', 'Authorization',
]);

function maskSensitiveFields(meta: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.has(key)) {
      masked[key] = '[REDACTED]';
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      masked[key] = maskSensitiveFields(value as Record<string, unknown>);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  child(testName: string): Logger;
}

class FrameworkLogger implements Logger {
  private readonly testName?: string;

  constructor(testName?: string) {
    this.testName = testName;
  }

  private log(level: string, message: string, meta?: Record<string, unknown>): void {
    const safeMeta = meta ? maskSensitiveFields(meta) : {};
    winstonLogger.log(level, message, { testName: this.testName, ...safeMeta });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log('error', message, meta);
  }

  child(testName: string): Logger {
    return new FrameworkLogger(testName);
  }
}

export const logger: Logger = new FrameworkLogger();

export function createLogger(testName: string): Logger {
  return new FrameworkLogger(testName);
}
