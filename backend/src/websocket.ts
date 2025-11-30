import { FastifyInstance } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import { logger } from './utils/logger';
import { getBrokerInstance, sandboxBroker } from './brokers/factory';
import { db } from './db';
import { MarketQuote } from './brokers/base';
import { AppError } from './middleware/errorHandler';

interface WebSocketConnection {
  userId: number;
  symbols: Set<string>;
  brokerType: string | null;
  isSandbox: boolean;
}

const connections = new Map<SocketStream, WebSocketConnection>();

export function setupWebSocket(server: FastifyInstance) {
  server.register(async function (fastify) {
    fastify.get('/ws/market', { websocket: true }, async (connection: SocketStream, req) => {
      // Extract and verify JWT token
      let userId: number;
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          connection.socket.close(1008, 'Unauthorized');
          return;
        }

        const token = authHeader.substring(7);
        const decoded = await fastify.jwt.verify<{ id: number; email: string }>(token);
        userId = decoded.id;
      } catch (err) {
        logger.warn({ err }, 'WebSocket authentication failed');
        connection.socket.close(1008, 'Invalid token');
        return;
      }

      const wsConnection: WebSocketConnection = {
        userId,
        symbols: new Set(),
        brokerType: null,
        isSandbox: true,
      };

      connections.set(connection, wsConnection);

      logger.info({ userId }, 'WebSocket connection established');

      // Handle incoming messages
      connection.socket.on('message', async (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());

          if (data.type === 'subscribe') {
            await handleSubscribe(connection, data.symbols || []);
          } else if (data.type === 'unsubscribe') {
            await handleUnsubscribe(connection, data.symbols || []);
          } else if (data.type === 'ping') {
            connection.socket.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (error: any) {
          logger.error({ error, userId }, 'Error handling WebSocket message');
          connection.socket.send(
            JSON.stringify({
              type: 'error',
              message: error.message,
            })
          );
        }
      });

      // Handle disconnect
      connection.socket.on('close', () => {
        handleDisconnect(connection);
      });

      // Send welcome message
      connection.socket.send(
        JSON.stringify({
          type: 'connected',
          message: 'WebSocket connected successfully',
        })
      );
    });
  });
}

async function handleSubscribe(connection: SocketStream, symbols: string[]) {
  const wsConnection = connections.get(connection);
  if (!wsConnection) {
    return;
  }

  try {
    // Get broker config
    const brokerConfig = await db.getPool().query(
      `SELECT broker_type, sandbox_mode FROM broker_configs WHERE user_id = $1 LIMIT 1`,
      [wsConnection.userId]
    );

    wsConnection.isSandbox = brokerConfig.rows.length === 0 || brokerConfig.rows[0].sandbox_mode;
    wsConnection.brokerType = brokerConfig.rows[0]?.broker_type || null;

    // Subscribe to market data
    const callback = (quote: MarketQuote) => {
      connection.socket.send(
        JSON.stringify({
          type: 'tick',
          data: {
            symbol: quote.symbol,
            bid: quote.bid,
            ask: quote.ask,
            last: quote.last,
            volume: quote.volume,
            timestamp: quote.timestamp.toISOString(),
          },
        })
      );
    };

    if (wsConnection.isSandbox) {
      await sandboxBroker.subscribeToMarketData(symbols, callback);
    } else if (wsConnection.brokerType) {
      const broker = await getBrokerInstance(wsConnection.userId, wsConnection.brokerType);
      await broker.subscribeToMarketData(symbols, callback);
    }

    // Add symbols to connection
    symbols.forEach((symbol) => wsConnection.symbols.add(symbol));

    connection.socket.send(
      JSON.stringify({
        type: 'subscribed',
        symbols: Array.from(wsConnection.symbols),
      })
    );

    logger.info({ userId: wsConnection.userId, symbols }, 'Subscribed to market data');
  } catch (error: any) {
    logger.error({ error, userId: wsConnection.userId }, 'Failed to subscribe to market data');
    connection.socket.send(
      JSON.stringify({
        type: 'error',
        message: `Failed to subscribe: ${error.message}`,
      })
    );
  }
}

async function handleUnsubscribe(connection: SocketStream, symbols: string[]) {
  const wsConnection = connections.get(connection);
  if (!wsConnection) {
    return;
  }

  try {
    if (wsConnection.isSandbox) {
      await sandboxBroker.unsubscribeFromMarketData(symbols);
    } else if (wsConnection.brokerType) {
      const broker = await getBrokerInstance(wsConnection.userId, wsConnection.brokerType);
      await broker.unsubscribeFromMarketData(symbols);
    }

    symbols.forEach((symbol) => wsConnection.symbols.delete(symbol));

    connection.socket.send(
      JSON.stringify({
        type: 'unsubscribed',
        symbols: Array.from(wsConnection.symbols),
      })
    );

    logger.info({ userId: wsConnection.userId, symbols }, 'Unsubscribed from market data');
  } catch (error: any) {
    logger.error({ error, userId: wsConnection.userId }, 'Failed to unsubscribe from market data');
  }
}

function handleDisconnect(connection: SocketStream) {
  const wsConnection = connections.get(connection);
  if (wsConnection) {
    logger.info({ userId: wsConnection.userId }, 'WebSocket connection closed');
    connections.delete(connection);
  }
}

// Broadcast order updates to connected clients
export function broadcastOrderUpdate(userId: number, orderUpdate: any) {
  for (const [connection, wsConnection] of connections.entries()) {
    if (wsConnection.userId === userId) {
      connection.socket.send(
        JSON.stringify({
          type: 'order_update',
          data: orderUpdate,
        })
      );
    }
  }
}

// Broadcast orderbook updates
export function broadcastOrderbookUpdate(symbol: string, orderbook: any) {
  for (const [connection, wsConnection] of connections.entries()) {
    if (wsConnection.symbols.has(symbol)) {
      connection.socket.send(
        JSON.stringify({
          type: 'orderbook',
          symbol,
          data: orderbook,
        })
      );
    }
  }
}

