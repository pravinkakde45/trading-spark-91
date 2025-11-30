import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { createOrderSchema, orderQuerySchema } from '../utils/validation';
import { getBrokerInstance, sandboxBroker } from '../brokers/factory';
import { db } from '../db';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

interface CreateOrderBody {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number;
  price?: number;
  stopPrice?: number;
}

export async function orderRoutes(fastify: FastifyInstance) {
  fastify.decorate('authenticate', authenticate);

  // Place order
  fastify.post<{ Body: CreateOrderBody }>(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Place a new order',
        tags: ['orders'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['symbol', 'side', 'type', 'quantity'],
          properties: {
            symbol: { type: 'string' },
            side: { type: 'string', enum: ['buy', 'sell'] },
            type: { type: 'string', enum: ['market', 'limit', 'stop', 'stop_limit'] },
            quantity: { type: 'number' },
            price: { type: 'number' },
            stopPrice: { type: 'number' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              orderId: { type: 'string' },
              status: { type: 'string' },
              filledQuantity: { type: 'number' },
              averagePrice: { type: 'number' },
              brokerOrderId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: AuthenticatedRequest<{ Body: CreateOrderBody }>, reply: FastifyReply) => {
      const validated = createOrderSchema.parse(request.body);

      try {
        // Get broker config
        const brokerConfig = await db.getPool().query(
          `SELECT broker_type, sandbox_mode FROM broker_configs WHERE user_id = $1 LIMIT 1`,
          [request.user.id]
        );

        const isSandbox = brokerConfig.rows.length === 0 || brokerConfig.rows[0].sandbox_mode;
        const brokerType = brokerConfig.rows[0]?.broker_type || 'sandbox';

        // Generate order ID
        const orderId = randomUUID();

        // Place order with broker
        let brokerResponse;
        if (isSandbox) {
          brokerResponse = await sandboxBroker.placeOrder(validated);
        } else {
          const broker = await getBrokerInstance(request.user.id, brokerType);
          brokerResponse = await broker.placeOrder(validated);
        }

        // Save order to database
        await db.getPool().query(
          `INSERT INTO orders (
            user_id, order_id, broker_type, symbol, side, type, quantity, price,
            status, filled_quantity, average_price, broker_order_id, sandbox
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            request.user.id,
            orderId,
            brokerType,
            validated.symbol,
            validated.side,
            validated.type,
            validated.quantity,
            validated.price || null,
            brokerResponse.status,
            brokerResponse.filledQuantity || 0,
            brokerResponse.averagePrice || null,
            brokerResponse.brokerOrderId || null,
            isSandbox,
          ]
        );

        // Optimistic response - return immediately
        return reply.status(201).send({
          orderId,
          status: brokerResponse.status,
          filledQuantity: brokerResponse.filledQuantity,
          averagePrice: brokerResponse.averagePrice,
          brokerOrderId: brokerResponse.brokerOrderId,
        });
      } catch (error: any) {
        logger.error({ error, userId: request.user.id, order: validated }, 'Failed to place order');
        throw new AppError(500, 'ORDER_ERROR', `Failed to place order: ${error.message}`);
      }
    }
  );

  // Get orders
  fastify.get(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Get user orders',
        tags: ['orders'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['open', 'filled', 'cancelled', 'all'] },
            limit: { type: 'number', default: 50 },
            offset: { type: 'number', default: 0 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              orders: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    orderId: { type: 'string' },
                    symbol: { type: 'string' },
                    side: { type: 'string' },
                    type: { type: 'string' },
                    quantity: { type: 'number' },
                    price: { type: 'number' },
                    status: { type: 'string' },
                    filledQuantity: { type: 'number' },
                    averagePrice: { type: 'number' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
              total: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const validated = orderQuerySchema.parse(request.query);

      try {
        let query = 'SELECT * FROM orders WHERE user_id = $1';
        const params: any[] = [request.user.id];

        if (validated.status !== 'all') {
          query += ' AND status = $2';
          params.push(validated.status);
        }

        query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(validated.limit, validated.offset);

        const result = await db.getPool().query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM orders WHERE user_id = $1';
        const countParams: any[] = [request.user.id];
        if (validated.status !== 'all') {
          countQuery += ' AND status = $2';
          countParams.push(validated.status);
        }
        const countResult = await db.getPool().query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count, 10);

        return reply.send({
          orders: result.rows.map((row) => ({
            id: row.id,
            orderId: row.order_id,
            symbol: row.symbol,
            side: row.side,
            type: row.type,
            quantity: parseFloat(row.quantity),
            price: row.price ? parseFloat(row.price) : null,
            status: row.status,
            filledQuantity: parseFloat(row.filled_quantity || '0'),
            averagePrice: row.average_price ? parseFloat(row.average_price) : null,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          })),
          total,
        });
      } catch (error: any) {
        throw new AppError(500, 'ORDER_ERROR', `Failed to get orders: ${error.message}`);
      }
    }
  );

  // Get single order
  fastify.get<{ Params: { orderId: string } }>(
    '/:orderId',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Get order by ID',
        tags: ['orders'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['orderId'],
          properties: {
            orderId: { type: 'string' },
          },
        },
      },
    },
    async (request: AuthenticatedRequest<{ Params: { orderId: string } }>, reply: FastifyReply) => {
      const { orderId } = request.params;

      const result = await db.getPool().query(
        'SELECT * FROM orders WHERE order_id = $1 AND user_id = $2',
        [orderId, request.user.id]
      );

      if (result.rows.length === 0) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }

      const row = result.rows[0];
      return reply.send({
        id: row.id,
        orderId: row.order_id,
        symbol: row.symbol,
        side: row.side,
        type: row.type,
        quantity: parseFloat(row.quantity),
        price: row.price ? parseFloat(row.price) : null,
        status: row.status,
        filledQuantity: parseFloat(row.filled_quantity || '0'),
        averagePrice: row.average_price ? parseFloat(row.average_price) : null,
        brokerOrderId: row.broker_order_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    }
  );
}

