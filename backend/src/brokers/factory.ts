import { Broker, BrokerConfig } from './base';
import { AlpacaBroker } from './alpaca';
import { BinanceBroker } from './binance';
import { KiteBroker } from './kite';
import { SandboxBroker } from './sandbox';
import { db } from '../db';
import { decrypt } from '../utils/encryption';
import { logger } from '../utils/logger';

const brokerInstances: Map<string, Broker> = new Map();

export async function getBrokerInstance(
  userId: number,
  brokerType: 'alpaca' | 'binance' | 'kite'
): Promise<Broker> {
  const cacheKey = `${userId}-${brokerType}`;

  // Check cache
  if (brokerInstances.has(cacheKey)) {
    return brokerInstances.get(cacheKey)!;
  }

  // Get broker config from database
  const result = await db.getPool().query(
    `SELECT api_key_encrypted, api_secret_encrypted, sandbox_mode
     FROM broker_configs
     WHERE user_id = $1 AND broker_type = $2`,
    [userId, brokerType]
  );

  if (result.rows.length === 0) {
    throw new Error(`Broker configuration not found for ${brokerType}`);
  }

  const config = result.rows[0];
  const brokerConfig: BrokerConfig = {
    apiKey: decrypt(config.api_key_encrypted),
    apiSecret: decrypt(config.api_secret_encrypted),
    sandboxMode: config.sandbox_mode,
  };

  // Create broker instance
  let broker: Broker;

  switch (brokerType) {
    case 'alpaca':
      broker = new AlpacaBroker(brokerConfig);
      break;
    case 'binance':
      broker = new BinanceBroker(brokerConfig);
      break;
    case 'kite':
      broker = new KiteBroker(brokerConfig);
      break;
    default:
      throw new Error(`Unsupported broker type: ${brokerType}`);
  }

  // Cache instance
  brokerInstances.set(cacheKey, broker);

  return broker;
}

// Export singleton sandbox broker
export const sandboxBroker = new SandboxBroker();

