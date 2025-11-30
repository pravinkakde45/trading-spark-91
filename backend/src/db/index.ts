import pg from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

const { Pool } = pg;

class Database {
  private pool: pg.Pool | null = null;

  async initialize() {
    try {
      this.pool = new Pool({
        connectionString: config.DATABASE_URL,
        host: config.DB_HOST,
        port: config.DB_PORT,
        database: config.DB_NAME,
        user: config.DB_USER,
        password: config.DB_PASSWORD,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      logger.info('Database connected successfully');
      
      // Run migrations
      await this.runMigrations();
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async runMigrations() {
    const client = await this.pool!.connect();
    try {
      await client.query('BEGIN');

      // Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create refresh_tokens table
      await client.query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(500) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create broker_configs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS broker_configs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          broker_type VARCHAR(50) NOT NULL,
          api_key_encrypted TEXT NOT NULL,
          api_secret_encrypted TEXT NOT NULL,
          sandbox_mode BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, broker_type)
        )
      `);

      // Create orders table
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          order_id VARCHAR(255) UNIQUE NOT NULL,
          broker_type VARCHAR(50) NOT NULL,
          symbol VARCHAR(50) NOT NULL,
          side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
          type VARCHAR(20) NOT NULL CHECK (type IN ('market', 'limit', 'stop', 'stop_limit')),
          quantity DECIMAL(20, 8) NOT NULL,
          price DECIMAL(20, 8),
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'filled', 'partially_filled', 'cancelled', 'rejected')),
          filled_quantity DECIMAL(20, 8) DEFAULT 0,
          average_price DECIMAL(20, 8),
          broker_order_id VARCHAR(255),
          sandbox BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create positions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS positions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          broker_type VARCHAR(50) NOT NULL,
          symbol VARCHAR(50) NOT NULL,
          quantity DECIMAL(20, 8) NOT NULL,
          average_price DECIMAL(20, 8) NOT NULL,
          current_price DECIMAL(20, 8),
          unrealized_pnl DECIMAL(20, 8) DEFAULT 0,
          realized_pnl DECIMAL(20, 8) DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, broker_type, symbol)
        )
      `);

      // Create trades table (execution history)
      await client.query(`
        CREATE TABLE IF NOT EXISTS trades (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          symbol VARCHAR(50) NOT NULL,
          side VARCHAR(10) NOT NULL,
          quantity DECIMAL(20, 8) NOT NULL,
          price DECIMAL(20, 8) NOT NULL,
          broker_trade_id VARCHAR(255),
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
        CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
        CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
        CREATE INDEX IF NOT EXISTS idx_trades_order_id ON trades(order_id);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
      `);

      await client.query('COMMIT');
      logger.info('Database migrations completed');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Migration failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  getPool() {
    if (!this.pool) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.pool;
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      logger.info('Database connection closed');
    }
  }
}

export const db = new Database();

