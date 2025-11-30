import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { config } from '../config';
import { registerSchema, loginSchema, refreshTokenSchema } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

interface RegisterBody {
  email: string;
  password: string;
  name: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface RefreshTokenBody {
  refreshToken: string;
}

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post<{ Body: RegisterBody }>(
    '/register',
    {
      schema: {
        description: 'Register a new user',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            name: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                },
              },
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) => {
      const validated = registerSchema.parse(request.body);

      // Check if user exists
      const existingUser = await db.getPool().query(
        'SELECT id FROM users WHERE email = $1',
        [validated.email]
      );

      if (existingUser.rows.length > 0) {
        throw new AppError(409, 'USER_EXISTS', 'User with this email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(validated.password, 10);

      // Create user
      const result = await db.getPool().query(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING id, email, name, created_at`,
        [validated.email, passwordHash, validated.name]
      );

      const user = result.rows[0];

      // Generate tokens
      const accessToken = fastify.jwt.sign(
        { id: user.id, email: user.email },
        { expiresIn: config.JWT_EXPIRES_IN }
      );

      const refreshToken = fastify.jwt.sign(
        { id: user.id, email: user.email },
        { expiresIn: config.JWT_REFRESH_EXPIRES_IN }
      );

      // Store refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      await db.getPool().query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, refreshToken, expiresAt]
      );

      return reply.status(201).send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        accessToken,
        refreshToken,
      });
    }
  );

  // Login
  fastify.post<{ Body: LoginBody }>(
    '/login',
    {
      schema: {
        description: 'Login with email and password',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                },
              },
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
      const validated = loginSchema.parse(request.body);

      // Find user
      const result = await db.getPool().query(
        'SELECT id, email, name, password_hash FROM users WHERE email = $1',
        [validated.email]
      );

      if (result.rows.length === 0) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      const user = result.rows[0];

      // Verify password
      const isValid = await bcrypt.compare(validated.password, user.password_hash);
      if (!isValid) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      // Generate tokens
      const accessToken = fastify.jwt.sign(
        { id: user.id, email: user.email },
        { expiresIn: config.JWT_EXPIRES_IN }
      );

      const refreshToken = fastify.jwt.sign(
        { id: user.id, email: user.email },
        { expiresIn: config.JWT_REFRESH_EXPIRES_IN }
      );

      // Store refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.getPool().query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, refreshToken, expiresAt]
      );

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        accessToken,
        refreshToken,
      });
    }
  );

  // Refresh token
  fastify.post<{ Body: RefreshTokenBody }>(
    '/refresh',
    {
      schema: {
        description: 'Refresh access token',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: RefreshTokenBody }>, reply: FastifyReply) => {
      const validated = refreshTokenSchema.parse(request.body);

      try {
        // Verify refresh token
        const decoded = fastify.jwt.verify<{ id: number; email: string }>(validated.refreshToken);

        // Check if token exists in database
        const tokenResult = await db.getPool().query(
          `SELECT user_id, expires_at FROM refresh_tokens 
           WHERE token = $1 AND expires_at > NOW()`,
          [validated.refreshToken]
        );

        if (tokenResult.rows.length === 0) {
          throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired refresh token');
        }

        // Generate new tokens
        const accessToken = fastify.jwt.sign(
          { id: decoded.id, email: decoded.email },
          { expiresIn: config.JWT_EXPIRES_IN }
        );

        const newRefreshToken = fastify.jwt.sign(
          { id: decoded.id, email: decoded.email },
          { expiresIn: config.JWT_REFRESH_EXPIRES_IN }
        );

        // Update refresh token in database
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await db.getPool().query(
          `UPDATE refresh_tokens 
           SET token = $1, expires_at = $2 
           WHERE token = $3`,
          [newRefreshToken, expiresAt, validated.refreshToken]
        );

        return reply.send({
          accessToken,
          refreshToken: newRefreshToken,
        });
      } catch (err) {
        throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired refresh token');
      }
    }
  );

  // Logout
  fastify.post(
    '/logout',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Logout and invalidate refresh token',
        tags: ['auth'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;

      // Delete all refresh tokens for user
      await db.getPool().query(
        'DELETE FROM refresh_tokens WHERE user_id = $1',
        [user.id]
      );

      return reply.send({ message: 'Logged out successfully' });
    }
  );
}

