import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface EnvConfig {
  baseUrl: string;
  userEmail: string;
  userPassword: string;
  headless: boolean;
  logLevel: string;
  slowMo: number;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function loadEnvConfig(): EnvConfig {
  return {
    baseUrl: process.env.BASE_URL || 'https://demowebshop.tricentis.com',
    userEmail: requireEnv('USER_EMAIL'),
    userPassword: requireEnv('USER_PASSWORD'),
    headless: process.env.HEADLESS !== 'false',
    logLevel: process.env.LOG_LEVEL || 'debug',
    slowMo: parseInt(process.env.SLOW_MO || '0'),
  };
}

export const envConfig = loadEnvConfig();
