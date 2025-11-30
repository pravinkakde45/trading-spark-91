import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { config } from '../config';
import crypto from 'crypto';

interface WebhookPayload {
  event: string;
  orderId?: string;
  brokerOrderId?: string;
  symbol?: string;
  status?: string;
  filledQuantity?: number;
  averagePrice?: number;
  timestamp?: string;
  [key: string]: any;
}

export async function webhookRoutes(fastify: FastifyInstance) {
  // Alpaca webhook handler
  fastify.post<{ Body: WebhookPayload }>(
    '/alpaca',
    {
      schema: {
        description: 'Handle Alpaca webhook events (execution reports, order updates)',
        tags: ['webhooks'],
        body: {
          type: 'object',
        },
      },
    },
    async (request: FastifyRequest<{ Body: WebhookPayload }>, reply: FastifyReply) => {
      try {
        // Verify webhook signature if configured
        if (config.WEBHOOK_SECRET) {
          const signature = request.headers['x-alpaca-signature'] as string;
          if (!signature) {
            throw new AppError(401, 'INVALID_SIGNATURE', 'Missing webhook signature');
          }
          // Verify signature (simplified - implement proper verification)
        }

        const payload = request.body;

        // Handle order execution events
        if (payload.event === 'fill' || payload.event === 'order_update') {
          await handleOrderUpdate(payload);
        }

        logger.info({ payload }, 'Alpaca webhook received');
        return reply.status(200).send({ received: true });
      } catch (error: any) {
        logger.error({ error, payload: request.body }, 'Failed to process Alpaca webhook');
        throw new AppError(500, 'WEBHOOK_ERROR', `Failed to process webhook: ${error.message}`);
      }
    }
  );

  // Binance webhook handler
  fastify.post<{ Body: WebhookPayload }>(
    '/binance',
    {
      schema: {
        description: 'Handle Binance webhook events',
        tags: ['webhooks'],
        body: {
          type: 'object',
        },
      },
    },
    async (request: FastifyRequest<{ Body: WebhookPayload }>, reply: FastifyReply) => {
      try {
        const payload = request.body;

        // Binance order update format
        if (payload.e === 'executionReport') {
          await handleBinanceOrderUpdate(payload);
        }

        logger.info({ payload }, 'Binance webhook received');
        return reply.status(200).send({ received: true });
      } catch (error: any) {
        logger.error({ error, payload: request.body }, 'Failed to process Binance webhook');
        throw new AppError(500, 'WEBHOOK_ERROR', `Failed to process webhook: ${error.message}`);
      }
    }
  );

  // Kite webhook handler
  fastify.post<{ Body: WebhookPayload }>(
    '/kite',
    {
      schema: {
        description: 'Handle Kite Connect webhook events',
        tags: ['webhooks'],
        body: {
          type: 'object',
        },
      },
    },
    async (request: FastifyRequest<{ Body: WebhookPayload }>, reply: FastifyReply) => {
      try {
        const payload = request.body;

        // Kite order update format
        if (payload.type === 'order' || payload.type === 'order_update') {
          await handleKiteOrderUpdate(payload);
        }

        logger.info({ payload }, 'Kite webhook received');
        return reply.status(200).send({ received: true });
      } catch (error: any) {
        logger.error({ error, payload: request.body }, 'Failed to process Kite webhook');
        throw new AppError(500, 'WEBHOOK_ERROR', `Failed to process webhook: ${error.message}`);
      }
    }
  );

  // Generic webhook handler
  fastify.post<{ Body: WebhookPayload }>(
    '/generic',
    {
      schema: {
        description: 'Handle generic webhook events',
        tags: ['webhooks'],
        body: {
          type: 'object',
          required: ['orderId', 'status'],
          properties: {
            orderId: { type: 'string' },
            status: { type: 'string' },
            filledQuantity: { type: 'number' },
            averagePrice: { type: 'number' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: WebhookPayload }>, reply: FastifyReply) => {
      try {
        const payload = request.body;
        await handleOrderUpdate(payload);

        logger.info({ payload }, 'Generic webhook received');
        return reply.status(200).send({ received: true });
      } catch (error: any) {
        logger.error({ error, payload: request.body }, 'Failed to process generic webhook');
        throw new AppError(500, 'WEBHOOK_ERROR', `Failed to process webhook: ${error.message}`);
      }
    }
  );
}

/**
 * Handle order update from webhook
 */
async function handleOrderUpdate(payload: WebhookPayload) {
  const orderId = payload.orderId || payload.brokerOrderId;
  if (!orderId) {
    throw new Error('Order ID not found in webhook payload');
  }

  // Map status
  const statusMap: Record<string, string> = {
    filled: 'filled',
    partial: 'partially_filled',
    cancelled: 'cancelled',
    rejected: 'rejected',
    open: 'open',
    pending: 'pending',
  };

  const status = statusMap[payload.status?.toLowerCase() || ''] || payload.status || 'pending';

  // Update order in database
  const result = await db.getPool().query(
    `UPDATE orders
     SET status = $1,
         filled_quantity = COALESCE($2, filled_quantity),
         average_price = COALESCE($3, average_price),
         updated_at = CURRENT_TIMESTAMP
     WHERE broker_order_id = $4 OR order_id = $5
     RETURNING id, user_id, symbol, side, quantity`,
    [
      status,
      payload.filledQuantity || null,
      payload.averagePrice || null,
      orderId,
      orderId,
    ]
  );

  if (result.rows.length === 0) {
    logger.warn({ orderId }, 'Order not found for webhook update');
    return;
  }

  const order = result.rows[0];

  // If order is filled, create trade record
  if (status === 'filled' && payload.filledQuantity && payload.averagePrice) {
    await db.getPool().query(
      `INSERT INTO trades (user_id, order_id, symbol, side, quantity, price, broker_trade_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [
        order.user_id,
        order.id,
        order.symbol,
        order.side,
        payload.filledQuantity,
        payload.averagePrice,
        payload.brokerTradeId || null,
      ]
    );
  }

  logger.info({ orderId, status }, 'Order updated from webhook');
}

/**
 * Handle Binance-specific order update
 */
async function handleBinanceOrderUpdate(payload: any) {
  const orderUpdate: WebhookPayload = {
    event: 'executionReport',
    brokerOrderId: payload.i?.toString(), // Binance order ID
    symbol: payload.s,
    status: payload.X, // Order status
    filledQuantity: payload.z ? parseFloat(payload.z) : undefined, // Cumulative filled quantity
    averagePrice: payload.p ? parseFloat(payload.p) : undefined, // Last price
  };

  await handleOrderUpdate(orderUpdate);
}

/**
 * Handle Kite-specific order update
 */
async function handleKiteOrderUpdate(payload: any) {
  const orderUpdate: WebhookPayload = {
    event: 'order_update',
    brokerOrderId: payload.order_id,
    symbol: payload.tradingsymbol,
    status: payload.status,
    filledQuantity: payload.filled_quantity ? parseFloat(payload.filled_quantity) : undefined,
    averagePrice: payload.average_price ? parseFloat(payload.average_price) : undefined,
  };

  await handleOrderUpdate(orderUpdate);
}

