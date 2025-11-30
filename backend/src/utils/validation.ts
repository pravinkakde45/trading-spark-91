import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// User schemas
export const brokerConfigSchema = z.object({
  brokerType: z.enum(['alpaca', 'binance', 'kite']),
  apiKey: z.string().min(1, 'API key is required'),
  apiSecret: z.string().min(1, 'API secret is required'),
  sandboxMode: z.boolean().optional().default(true),
});

// Market data schemas
export const candlesQuerySchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  from: z.string().datetime('Invalid from date'),
  to: z.string().datetime('Invalid to date'),
  interval: z.enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d']).optional().default('1h'),
});

// Order schemas
export const createOrderSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['market', 'limit', 'stop', 'stop_limit']),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive').optional(),
  stopPrice: z.number().positive('Stop price must be positive').optional(),
});

export const orderQuerySchema = z.object({
  status: z.enum(['open', 'filled', 'cancelled', 'all']).optional().default('all'),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

