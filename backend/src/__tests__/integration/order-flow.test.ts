import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from '../../server';
import { db } from '../../db';
import { SandboxBroker } from '../../brokers/sandbox';
import { MarketQuote } from '../../brokers/base';

describe('Order Flow Integration Test', () => {
  let app: Awaited<ReturnType<typeof build>>;
  let accessToken: string;
  let userId: number;

  beforeAll(async () => {
    // Initialize database
    await db.initialize();

    // Build app
    app = await build();

    // Create test user and get token
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: `test-${Date.now()}@example.com`,
        password: 'Test123456',
        name: 'Test User',
      },
    });

    const registerData = JSON.parse(registerResponse.body);
    accessToken = registerData.accessToken;
    userId = registerData.user.id;
  });

  afterAll(async () => {
    await db.close();
    await app.close();
  });

  it('should place an order in sandbox and receive execution via websocket', async () => {
    // Place a market order
    const orderResponse = await app.inject({
      method: 'POST',
      url: '/api/orders',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        symbol: 'AAPL',
        side: 'buy',
        type: 'market',
        quantity: 10,
      },
    });

    expect(orderResponse.statusCode).toBe(201);
    const orderData = JSON.parse(orderResponse.body);
    expect(orderData).toHaveProperty('orderId');
    expect(orderData.status).toBe('filled');

    // Verify order in database
    const orderResult = await db.getPool().query(
      'SELECT * FROM orders WHERE order_id = $1',
      [orderData.orderId]
    );

    expect(orderResult.rows.length).toBe(1);
    expect(orderResult.rows[0].status).toBe('filled');
    expect(parseFloat(orderResult.rows[0].filled_quantity)).toBe(10);

    // Verify position was created
    const positionResult = await db.getPool().query(
      'SELECT * FROM positions WHERE user_id = $1 AND symbol = $2',
      [userId, 'AAPL']
    );

    expect(positionResult.rows.length).toBeGreaterThan(0);
  });

  it('should get portfolio after placing orders', async () => {
    // Place another order
    await app.inject({
      method: 'POST',
      url: '/api/orders',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        symbol: 'GOOGL',
        side: 'buy',
        type: 'market',
        quantity: 5,
      },
    });

    // Get portfolio
    const portfolioResponse = await app.inject({
      method: 'GET',
      url: '/api/portfolio',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(portfolioResponse.statusCode).toBe(200);
    const portfolio = JSON.parse(portfolioResponse.body);
    expect(portfolio).toHaveProperty('positions');
    expect(portfolio.positions.length).toBeGreaterThan(0);
    expect(portfolio).toHaveProperty('totalUnrealizedPnl');
    expect(portfolio).toHaveProperty('totalRealizedPnl');
  });

  it('should simulate websocket order execution', async () => {
    const sandboxBroker = new SandboxBroker();

    // Place a limit order that won't fill immediately
    const quote = await sandboxBroker.getQuote('TSLA');
    const limitPrice = quote.ask - 5;

    const order = await sandboxBroker.placeOrder({
      symbol: 'TSLA',
      side: 'buy',
      type: 'limit',
      quantity: 3,
      price: limitPrice,
    });

    expect(order.status).toBe('open');

    // Simulate market data update that triggers fill
    const updatedQuote: MarketQuote = {
      ...quote,
      ask: limitPrice - 1, // Price dropped below limit
    };

    sandboxBroker.updateMarketData(updatedQuote);

    // Wait a bit for processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check order status
    const updatedOrder = await sandboxBroker.getOrderStatus(order.orderId);
    expect(updatedOrder.status).toBe('filled');
    expect(updatedOrder.filledQuantity).toBe(3);
  });
});

