import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { candlesQuerySchema } from '../utils/validation';
import { getBrokerInstance } from '../brokers/factory';
import { db } from '../db';
import { AppError } from '../middleware/errorHandler';
import { sandboxBroker } from '../brokers/sandbox';

export async function marketRoutes(fastify: FastifyInstance) {
  fastify.decorate('authenticate', authenticate);

  // Get quote for a symbol
  fastify.get<{ Params: { symbol: string } }>(
    '/:symbol/quote',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Get current market quote for a symbol',
        tags: ['market'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['symbol'],
          properties: {
            symbol: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              symbol: { type: 'string' },
              bid: { type: 'number' },
              ask: { type: 'number' },
              last: { type: 'number' },
              volume: { type: 'number' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async (request: AuthenticatedRequest<{ Params: { symbol: string } }>, reply: FastifyReply) => {
      const { symbol } = request.params;

      try {
        // Check if user has broker config
        const brokerConfig = await db.getPool().query(
          `SELECT broker_type, sandbox_mode FROM broker_configs WHERE user_id = $1 LIMIT 1`,
          [request.user.id]
        );

        let quote;

        if (brokerConfig.rows.length === 0 || brokerConfig.rows[0].sandbox_mode) {
          // Use sandbox
          quote = await sandboxBroker.getQuote(symbol);
        } else {
          // Use real broker
          const broker = await getBrokerInstance(
            request.user.id,
            brokerConfig.rows[0].broker_type
          );
          quote = await broker.getQuote(symbol);
        }

        return reply.send({
          ...quote,
          timestamp: quote.timestamp.toISOString(),
        });
      } catch (error: any) {
        throw new AppError(500, 'MARKET_DATA_ERROR', `Failed to get quote: ${error.message}`);
      }
    }
  );

  // Get candles
  fastify.get(
    '/candles',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Get historical candle data',
        tags: ['market'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['symbol', 'from', 'to'],
          properties: {
            symbol: { type: 'string' },
            from: { type: 'string', format: 'date-time' },
            to: { type: 'string', format: 'date-time' },
            interval: {
              type: 'string',
              enum: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
              default: '1h',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              candles: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    symbol: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                    open: { type: 'number' },
                    high: { type: 'number' },
                    low: { type: 'number' },
                    close: { type: 'number' },
                    volume: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const validated = candlesQuerySchema.parse(request.query);

      try {
        const brokerConfig = await db.getPool().query(
          `SELECT broker_type, sandbox_mode FROM broker_configs WHERE user_id = $1 LIMIT 1`,
          [request.user.id]
        );

        let candles;

        if (brokerConfig.rows.length === 0 || brokerConfig.rows[0].sandbox_mode) {
          candles = await sandboxBroker.getCandles(
            validated.symbol,
            new Date(validated.from),
            new Date(validated.to),
            validated.interval
          );
        } else {
          const broker = await getBrokerInstance(
            request.user.id,
            brokerConfig.rows[0].broker_type
          );
          candles = await broker.getCandles(
            validated.symbol,
            new Date(validated.from),
            new Date(validated.to),
            validated.interval
          );
        }

        return reply.send({
          candles: candles.map((c) => ({
            ...c,
            timestamp: c.timestamp.toISOString(),
          })),
        });
      } catch (error: any) {
        throw new AppError(500, 'MARKET_DATA_ERROR', `Failed to get candles: ${error.message}`);
      }
    }
  );
}

