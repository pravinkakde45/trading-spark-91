import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db';
import { brokerConfigSchema } from '../utils/validation';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../utils/encryption';
import { AppError } from '../middleware/errorHandler';

interface BrokerConfigBody {
  brokerType: 'alpaca' | 'binance' | 'kite';
  apiKey: string;
  apiSecret: string;
  sandboxMode?: boolean;
}

export async function userRoutes(fastify: FastifyInstance) {
  // Add authenticate hook
  fastify.decorate('authenticate', authenticate);
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/api/user')) {
      await authenticate(request, reply);
    }
  });

  // Get user profile
  fastify.get(
    '/profile',
    {
      schema: {
        description: 'Get current user profile',
        tags: ['user'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              email: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const result = await db.getPool().query(
        'SELECT id, email, name, created_at FROM users WHERE id = $1',
        [request.user.id]
      );

      if (result.rows.length === 0) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
      }

      return reply.send(result.rows[0]);
    }
  );

  // Save broker API keys
  fastify.post<{ Body: BrokerConfigBody }>(
    '/broker-config',
    {
      schema: {
        description: 'Save or update broker API configuration',
        tags: ['user'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['brokerType', 'apiKey', 'apiSecret'],
          properties: {
            brokerType: { type: 'string', enum: ['alpaca', 'binance', 'kite'] },
            apiKey: { type: 'string' },
            apiSecret: { type: 'string' },
            sandboxMode: { type: 'boolean', default: true },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              brokerType: { type: 'string' },
              sandboxMode: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: AuthenticatedRequest<{ Body: BrokerConfigBody }>, reply: FastifyReply) => {
      const validated = brokerConfigSchema.parse(request.body);

      // Encrypt API keys
      const encryptedApiKey = encrypt(validated.apiKey);
      const encryptedApiSecret = encrypt(validated.apiSecret);

      // Upsert broker config
      await db.getPool().query(
        `INSERT INTO broker_configs (user_id, broker_type, api_key_encrypted, api_secret_encrypted, sandbox_mode)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, broker_type)
         DO UPDATE SET
           api_key_encrypted = EXCLUDED.api_key_encrypted,
           api_secret_encrypted = EXCLUDED.api_secret_encrypted,
           sandbox_mode = EXCLUDED.sandbox_mode,
           updated_at = CURRENT_TIMESTAMP`,
        [
          request.user.id,
          validated.brokerType,
          encryptedApiKey,
          encryptedApiSecret,
          validated.sandboxMode ?? true,
        ]
      );

      return reply.send({
        message: 'Broker configuration saved successfully',
        brokerType: validated.brokerType,
        sandboxMode: validated.sandboxMode ?? true,
      });
    }
  );

  // Get broker configs
  fastify.get(
    '/broker-configs',
    {
      schema: {
        description: 'Get all broker configurations for current user',
        tags: ['user'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              configs: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    brokerType: { type: 'string' },
                    sandboxMode: { type: 'boolean' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      const result = await db.getPool().query(
        `SELECT broker_type, sandbox_mode, created_at, updated_at
         FROM broker_configs
         WHERE user_id = $1`,
        [request.user.id]
      );

      return reply.send({
        configs: result.rows.map((row) => ({
          brokerType: row.broker_type,
          sandboxMode: row.sandbox_mode,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      });
    }
  );

  // Toggle sandbox mode
  fastify.patch<{ Params: { brokerType: string }; Body: { sandboxMode: boolean } }>(
    '/broker-config/:brokerType/sandbox',
    {
      schema: {
        description: 'Toggle sandbox mode for a broker',
        tags: ['user'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['brokerType'],
          properties: {
            brokerType: { type: 'string', enum: ['alpaca', 'binance', 'kite'] },
          },
        },
        body: {
          type: 'object',
          required: ['sandboxMode'],
          properties: {
            sandboxMode: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              sandboxMode: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (
      request: AuthenticatedRequest<{ Params: { brokerType: string }; Body: { sandboxMode: boolean } }>,
      reply: FastifyReply
    ) => {
      const { brokerType } = request.params;
      const { sandboxMode } = request.body;

      const result = await db.getPool().query(
        `UPDATE broker_configs
         SET sandbox_mode = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2 AND broker_type = $3
         RETURNING broker_type, sandbox_mode`,
        [sandboxMode, request.user.id, brokerType]
      );

      if (result.rows.length === 0) {
        throw new AppError(404, 'CONFIG_NOT_FOUND', 'Broker configuration not found');
      }

      return reply.send({
        message: 'Sandbox mode updated successfully',
        sandboxMode: result.rows[0].sandbox_mode,
      });
    }
  );
}

