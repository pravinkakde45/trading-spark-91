# Trading Platform Backend

Production-ready backend for an online trading platform demo built with Node.js, TypeScript, and Fastify.

## Features

- 🔐 **Authentication**: JWT with refresh tokens, password hashing
- 👤 **User Management**: Save broker API keys (encrypted), toggle sandbox mode
- 📊 **Market Data**: REST endpoints for quotes and candles, WebSocket for live ticks
- 📝 **Orders**: Place market/limit orders, view order history, optimistic responses
- 💼 **Portfolio**: Positions, P&L tracking, periodic reconciliation
- 🎮 **Sandbox**: Built-in paper trading engine
- 🔌 **Broker Integrations**: Alpaca, Binance, Kite Connect (Zerodha)
- 🔔 **Webhooks**: Handle async broker events (execution reports)
- 📚 **API Documentation**: OpenAPI/Swagger docs
- 🛡️ **Security**: Rate limiting, request validation, role-based checks
- 🐳 **Docker**: Complete Docker setup with Postgres + Redis

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Fastify 4.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Authentication**: JWT with refresh tokens
- **Validation**: Zod
- **Documentation**: OpenAPI/Swagger

## Quick Start

### Prerequisites

- Node.js 20+ and npm
- PostgreSQL 16+
- Redis 7+ (optional, for caching)

### Installation

1. Clone the repository and navigate to backend:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Copy environment file:

```bash
cp env.example .env
```

4. Update `.env` with your configuration:

```env
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
ENCRYPTION_KEY=your-encryption-key
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/trading_platform
```

5. Start PostgreSQL and Redis (if using Docker):

```bash
docker-compose up -d postgres redis
```

6. Run migrations (auto-runs on startup):

The database migrations run automatically when the server starts.

7. Start the development server:

```bash
npm run dev
```

The server will be available at `http://localhost:3000`
API documentation at `http://localhost:3000/api-docs`

## Docker Deployment

### Using Docker Compose

1. Copy environment file:

```bash
cp env.example .env
```

2. Update `.env` with production values

3. Build and start all services:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis cache
- Backend API server

4. View logs:

```bash
docker-compose logs -f backend
```

5. Stop services:

```bash
docker-compose down
```

### Using Dockerfile Only

```bash
docker build -t trading-backend .
docker run -p 3000:3000 --env-file .env trading-backend
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout

### User
- `GET /api/user/profile` - Get user profile
- `POST /api/user/broker-config` - Save broker API keys
- `GET /api/user/broker-configs` - Get all broker configs
- `PATCH /api/user/broker-config/:brokerType/sandbox` - Toggle sandbox mode

### Market Data
- `GET /api/market/:symbol/quote` - Get current quote
- `GET /api/market/candles` - Get historical candles
- `WS /ws/market` - WebSocket for live market data

### Orders
- `POST /api/orders` - Place order
- `GET /api/orders` - Get orders (with filters)
- `GET /api/orders/:orderId` - Get single order

### Portfolio
- `GET /api/portfolio` - Get portfolio (positions, P&L)
- `POST /api/portfolio/reconcile` - Reconcile positions

### Webhooks
- `POST /api/webhooks/alpaca` - Alpaca webhook handler
- `POST /api/webhooks/binance` - Binance webhook handler
- `POST /api/webhooks/kite` - Kite webhook handler
- `POST /api/webhooks/generic` - Generic webhook handler

See [API_EXAMPLES.md](./API_EXAMPLES.md) for detailed curl examples.

## Broker Integrations

### Alpaca

**Documentation**: https://alpaca.markets/docs/

Supports:
- US equities trading
- Paper trading (sandbox mode)
- REST API for orders and market data
- WebSocket streaming for real-time data

**Setup**:
1. Get API keys from https://alpaca.markets/
2. Use paper trading keys for sandbox mode
3. Save keys via `/api/user/broker-config`

### Binance

**Documentation**: https://binance-docs.github.io/apidocs/spot/en/

Supports:
- Spot trading
- Testnet for sandbox mode
- REST API with HMAC signing
- WebSocket for market data

**Setup**:
1. Get API keys from https://www.binance.com/
2. Use testnet: https://testnet.binance.vision/
3. Save keys via `/api/user/broker-config`

### Kite Connect (Zerodha)

**Documentation**: https://kite.trade/docs/connect/v3/

Supports:
- India markets (NSE, BSE)
- OAuth-based authentication
- REST API for orders and market data
- WebSocket via KiteTicker library

**Setup**:
1. Register app at https://kite.trade/
2. Complete OAuth flow to get access token
3. Save API key and access token via `/api/user/broker-config`

## Sandbox Mode

The platform includes a built-in paper trading engine that:
- Matches orders at best bid/ask from incoming ticks
- Supports market, limit, and stop orders
- Tracks positions and P&L
- Simulates realistic market data

Sandbox mode is enabled by default. Toggle via:
```bash
PATCH /api/user/broker-config/:brokerType/sandbox
```

## Testing

### Run Tests

```bash
npm test
```

### Run with Coverage

```bash
npm run test:coverage
```

### Test Files

- `src/__tests__/sandbox.test.ts` - Sandbox broker unit tests
- `src/__tests__/integration/order-flow.test.ts` - Integration test for order flow

## Project Structure

```
backend/
├── src/
│   ├── brokers/          # Broker integrations
│   │   ├── alpaca.ts     # Alpaca connector
│   │   ├── binance.ts    # Binance connector
│   │   ├── kite.ts       # Kite Connect connector
│   │   ├── sandbox.ts    # Paper trading engine
│   │   ├── factory.ts    # Broker factory
│   │   └── base.ts       # Broker interfaces
│   ├── routes/           # API routes
│   │   ├── auth.ts       # Authentication
│   │   ├── user.ts       # User management
│   │   ├── market.ts     # Market data
│   │   ├── orders.ts     # Order management
│   │   ├── portfolio.ts  # Portfolio & P&L
│   │   └── webhooks.ts   # Webhook handlers
│   ├── middleware/        # Middleware
│   │   ├── auth.ts       # JWT authentication
│   │   └── errorHandler.ts # Error handling
│   ├── utils/            # Utilities
│   │   ├── encryption.ts # API key encryption
│   │   ├── logger.ts     # Logging
│   │   └── validation.ts # Zod schemas
│   ├── db/               # Database
│   │   └── index.ts      # DB connection & migrations
│   ├── websocket.ts      # WebSocket server
│   ├── config.ts         # Configuration
│   └── server.ts         # Server entry point
├── src/__tests__/        # Tests
├── Dockerfile            # Docker image
├── docker-compose.yml    # Docker Compose setup
├── env.example           # Environment variables example
└── package.json          # Dependencies
```

## Environment Variables

See `env.example` for all available environment variables.

Key variables:
- `JWT_SECRET` - Secret for JWT signing (required)
- `JWT_REFRESH_SECRET` - Secret for refresh tokens (required)
- `ENCRYPTION_KEY` - Key for encrypting API keys (required)
- `DATABASE_URL` - PostgreSQL connection string (required)
- `REDIS_URL` - Redis connection string (optional)

## Security Considerations

- API keys are encrypted at rest using AES encryption
- Passwords are hashed using bcrypt
- JWT tokens expire after 15 minutes (configurable)
- Refresh tokens expire after 7 days
- Rate limiting enabled (100 req/min default)
- Request validation using Zod schemas
- CORS configured for production

## Production Deployment

1. **Set strong secrets**: Generate secure random strings for JWT and encryption keys
2. **Use HTTPS**: Always use HTTPS in production
3. **Database**: Use managed PostgreSQL service (AWS RDS, etc.)
4. **Redis**: Use managed Redis service (AWS ElastiCache, etc.)
5. **Monitoring**: Set up logging and monitoring (e.g., Datadog, New Relic)
6. **Backups**: Configure database backups
7. **Scaling**: Use load balancer for multiple instances

## API Documentation

Interactive API documentation available at:
- Swagger UI: `http://localhost:3000/api-docs`
- OpenAPI spec: `http://localhost:3000/api-docs/json`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT

## Support

For issues and questions:
- Check API documentation at `/api-docs`
- See [API_EXAMPLES.md](./API_EXAMPLES.md) for usage examples
- Review broker-specific documentation links above

