import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import websocket from '@fastify/websocket';
import { config } from './config';
import { db } from './db';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/user';
import { marketRoutes } from './routes/market';
import { orderRoutes } from './routes/orders';
import { portfolioRoutes } from './routes/portfolio';
import { webhookRoutes } from './routes/webhooks';
import { setupWebSocket } from './websocket';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const server = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: config.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } : undefined,
  },
});

async function build() {
  // Register plugins
  await server.register(cors, {
    origin: config.NODE_ENV === 'production' 
      ? ['https://yourdomain.com'] 
      : true,
    credentials: true,
  });

  await server.register(jwt, {
    secret: config.JWT_SECRET,
  });

  await server.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_TIME_WINDOW,
  });

  await server.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Trading Platform API',
        description: 'Production-ready backend API for online trading platform',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${config.PORT}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await server.register(swaggerUI, {
    routePrefix: '/api-docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  await server.register(websocket);

  // Register error handler
  server.setErrorHandler(errorHandler);

  // Health check
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register routes
  await server.register(authRoutes, { prefix: '/api/auth' });
  await server.register(userRoutes, { prefix: '/api/user' });
  await server.register(marketRoutes, { prefix: '/api/market' });
  await server.register(orderRoutes, { prefix: '/api/orders' });
  await server.register(portfolioRoutes, { prefix: '/api/portfolio' });
  await server.register(webhookRoutes, { prefix: '/api/webhooks' });

  // Setup WebSocket
  setupWebSocket(server);

  return server;
}

async function start() {
  try {
    // Initialize database
    await db.initialize();

    const app = await build();

    await app.listen({
      port: config.PORT,
      host: config.HOST,
    });

    logger.info(`Server listening on http://${config.HOST}:${config.PORT}`);
    logger.info(`API documentation available at http://${config.HOST}:${config.PORT}/api-docs`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await server.close();
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await server.close();
  await db.close();
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { build, start };

