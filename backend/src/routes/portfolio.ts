import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getBrokerInstance, sandboxBroker } from '../brokers/factory';
import { db } from '../db';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export async function portfolioRoutes(fastify: FastifyInstance) {
  fastify.decorate('authenticate', authenticate);

  // Get portfolio (positions and P&L)
  fastify.get(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Get user portfolio with positions and P&L',
        tags: ['portfolio'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              positions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    symbol: { type: 'string' },
                    quantity: { type: 'number' },
                    averagePrice: { type: 'number' },
                    currentPrice: { type: 'number' },
                    unrealizedPnl: { type: 'number' },
                    realizedPnl: { type: 'number' },
                  },
                },
              },
              totalUnrealizedPnl: { type: 'number' },
              totalRealizedPnl: { type: 'number' },
              totalPnl: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        // Get broker config
        const brokerConfig = await db.getPool().query(
          `SELECT broker_type, sandbox_mode FROM broker_configs WHERE user_id = $1 LIMIT 1`,
          [request.user.id]
        );

        const isSandbox = brokerConfig.rows.length === 0 || brokerConfig.rows[0].sandbox_mode;
        const brokerType = brokerConfig.rows[0]?.broker_type || 'sandbox';

        // Get positions from broker
        let positions;
        if (isSandbox) {
          positions = await sandboxBroker.getPositions();
        } else {
          const broker = await getBrokerInstance(request.user.id, brokerType);
          positions = await broker.getPositions();
        }

        // Get realized P&L from database
        const realizedPnlResult = await db.getPool().query(
          `SELECT symbol, SUM(
            CASE 
              WHEN side = 'buy' THEN -quantity * price
              WHEN side = 'sell' THEN quantity * price
            END
          ) as realized_pnl
          FROM trades
          WHERE user_id = $1
          GROUP BY symbol`,
          [request.user.id]
        );

        const realizedPnlMap = new Map<string, number>();
        realizedPnlResult.rows.forEach((row) => {
          realizedPnlMap.set(row.symbol, parseFloat(row.realized_pnl || '0'));
        });

        // Merge positions with realized P&L
        const positionsWithPnl = positions.map((pos) => {
          const realizedPnl = realizedPnlMap.get(pos.symbol) || 0;
          return {
            ...pos,
            realizedPnl,
          };
        });

        // Calculate totals
        const totalUnrealizedPnl = positionsWithPnl.reduce((sum, pos) => sum + pos.unrealizedPnl, 0);
        const totalRealizedPnl = positionsWithPnl.reduce((sum, pos) => sum + pos.realizedPnl, 0);
        const totalPnl = totalUnrealizedPnl + totalRealizedPnl;

        // Sync positions to database
        await syncPositionsToDatabase(request.user.id, positionsWithPnl);

        return reply.send({
          positions: positionsWithPnl,
          totalUnrealizedPnl,
          totalRealizedPnl,
          totalPnl,
        });
      } catch (error: any) {
        logger.error({ error, userId: request.user.id }, 'Failed to get portfolio');
        throw new AppError(500, 'PORTFOLIO_ERROR', `Failed to get portfolio: ${error.message}`);
      }
    }
  );

  // Reconciliation job endpoint (for periodic reconciliation)
  fastify.post(
    '/reconcile',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Reconcile portfolio positions with broker',
        tags: ['portfolio'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              reconciled: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const brokerConfig = await db.getPool().query(
          `SELECT broker_type, sandbox_mode FROM broker_configs WHERE user_id = $1 LIMIT 1`,
          [request.user.id]
        );

        const isSandbox = brokerConfig.rows.length === 0 || brokerConfig.rows[0].sandbox_mode;
        const brokerType = brokerConfig.rows[0]?.broker_type || 'sandbox';

        let positions;
        if (isSandbox) {
          positions = await sandboxBroker.getPositions();
        } else {
          const broker = await getBrokerInstance(request.user.id, brokerType);
          positions = await broker.getPositions();
        }

        const reconciled = await syncPositionsToDatabase(request.user.id, positions);

        return reply.send({
          message: 'Portfolio reconciled successfully',
          reconciled,
        });
      } catch (error: any) {
        logger.error({ error, userId: request.user.id }, 'Failed to reconcile portfolio');
        throw new AppError(500, 'RECONCILE_ERROR', `Failed to reconcile: ${error.message}`);
      }
    }
  );
}

/**
 * Sync positions from broker to database
 */
async function syncPositionsToDatabase(
  userId: number,
  positions: Array<{
    symbol: string;
    quantity: number;
    averagePrice: number;
    currentPrice: number;
    unrealizedPnl: number;
    realizedPnl?: number;
  }>
): Promise<number> {
  const client = await db.getPool().connect();
  try {
    await client.query('BEGIN');

    let reconciled = 0;

    for (const pos of positions) {
      // Get broker type from first position (simplified - in production, track per position)
      const brokerConfig = await client.query(
        `SELECT broker_type FROM broker_configs WHERE user_id = $1 LIMIT 1`,
        [userId]
      );
      const brokerType = brokerConfig.rows[0]?.broker_type || 'sandbox';

      await client.query(
        `INSERT INTO positions (user_id, broker_type, symbol, quantity, average_price, current_price, unrealized_pnl, realized_pnl)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (user_id, broker_type, symbol)
         DO UPDATE SET
           quantity = EXCLUDED.quantity,
           average_price = EXCLUDED.average_price,
           current_price = EXCLUDED.current_price,
           unrealized_pnl = EXCLUDED.unrealized_pnl,
           realized_pnl = EXCLUDED.realized_pnl,
           updated_at = CURRENT_TIMESTAMP`,
        [
          userId,
          brokerType,
          pos.symbol,
          pos.quantity,
          pos.averagePrice,
          pos.currentPrice,
          pos.unrealizedPnl,
          pos.realizedPnl || 0,
        ]
      );
      reconciled++;
    }

    await client.query('COMMIT');
    return reconciled;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

