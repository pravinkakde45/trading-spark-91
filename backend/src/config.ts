import dotenv from 'dotenv';

dotenv.config();

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

export const config = {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: parseInt(getEnv('PORT', '3000'), 10),
  HOST: getEnv('HOST', '0.0.0.0'),
  
  // JWT
  JWT_SECRET: getEnv('JWT_SECRET'),
  JWT_REFRESH_SECRET: getEnv('JWT_REFRESH_SECRET'),
  JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
  
  // Database
  DATABASE_URL: getEnv('DATABASE_URL'),
  DB_HOST: getEnv('DB_HOST', 'localhost'),
  DB_PORT: parseInt(getEnv('DB_PORT', '5432'), 10),
  DB_NAME: getEnv('DB_NAME', 'trading_platform'),
  DB_USER: getEnv('DB_USER', 'postgres'),
  DB_PASSWORD: getEnv('DB_PASSWORD', 'postgres'),
  
  // Redis
  REDIS_URL: getEnv('REDIS_URL', 'redis://localhost:6379'),
  REDIS_HOST: getEnv('REDIS_HOST', 'localhost'),
  REDIS_PORT: parseInt(getEnv('REDIS_PORT', '6379'), 10),
  
  // Encryption
  ENCRYPTION_KEY: getEnv('ENCRYPTION_KEY'),
  
  // Rate Limiting
  RATE_LIMIT_MAX: parseInt(getEnv('RATE_LIMIT_MAX', '100'), 10),
  RATE_LIMIT_TIME_WINDOW: parseInt(getEnv('RATE_LIMIT_TIME_WINDOW', '60000'), 10),
  
  // Broker URLs
  ALPACA_API_URL: getEnv('ALPACA_API_URL', 'https://paper-api.alpaca.markets'),
  ALPACA_STREAM_URL: getEnv('ALPACA_STREAM_URL', 'wss://stream.data.alpaca.markets/v2/iex'),
  BINANCE_API_URL: getEnv('BINANCE_API_URL', 'https://testnet.binance.vision/api'),
  BINANCE_WS_URL: getEnv('BINANCE_WS_URL', 'wss://testnet.binance.vision/ws'),
  KITE_API_URL: getEnv('KITE_API_URL', 'https://kite.zerodha.com'),
  
  // Webhooks
  WEBHOOK_SECRET: getEnv('WEBHOOK_SECRET'),
};

