import { describe, it, expect, beforeEach } from 'vitest';
import { SandboxBroker } from '../brokers/sandbox';
import { MarketQuote } from '../brokers/base';

describe('SandboxBroker', () => {
  let broker: SandboxBroker;

  beforeEach(() => {
    broker = new SandboxBroker();
  });

  describe('getQuote', () => {
    it('should return a quote for a symbol', async () => {
      const quote = await broker.getQuote('AAPL');
      expect(quote).toHaveProperty('symbol', 'AAPL');
      expect(quote).toHaveProperty('bid');
      expect(quote).toHaveProperty('ask');
      expect(quote).toHaveProperty('last');
      expect(quote.bid).toBeLessThan(quote.ask);
    });
  });

  describe('placeOrder', () => {
    it('should place a market order and fill immediately', async () => {
      const order = await broker.placeOrder({
        symbol: 'AAPL',
        side: 'buy',
        type: 'market',
        quantity: 10,
      });

      expect(order).toHaveProperty('orderId');
      expect(order.status).toBe('filled');
      expect(order.filledQuantity).toBe(10);
      expect(order.averagePrice).toBeGreaterThan(0);
    });

    it('should place a limit order and keep it open if price not met', async () => {
      const quote = await broker.getQuote('AAPL');
      const limitPrice = quote.ask - 10; // Below current ask

      const order = await broker.placeOrder({
        symbol: 'AAPL',
        side: 'buy',
        type: 'limit',
        quantity: 10,
        price: limitPrice,
      });

      expect(order.status).toBe('open');
      expect(order.filledQuantity).toBeUndefined();
    });

    it('should fill limit order if price is met', async () => {
      const quote = await broker.getQuote('AAPL');
      const limitPrice = quote.ask + 1; // Above current ask

      const order = await broker.placeOrder({
        symbol: 'AAPL',
        side: 'buy',
        type: 'limit',
        quantity: 10,
        price: limitPrice,
      });

      expect(order.status).toBe('filled');
      expect(order.filledQuantity).toBe(10);
    });
  });

  describe('getPositions', () => {
    it('should return positions after filled orders', async () => {
      await broker.placeOrder({
        symbol: 'AAPL',
        side: 'buy',
        type: 'market',
        quantity: 10,
      });

      const positions = await broker.getPositions();
      const aaplPosition = positions.find((p) => p.symbol === 'AAPL');

      expect(aaplPosition).toBeDefined();
      expect(aaplPosition?.quantity).toBe(10);
      expect(aaplPosition?.averagePrice).toBeGreaterThan(0);
    });
  });

  describe('market data updates', () => {
    it('should process pending orders when market data updates', async () => {
      const quote: MarketQuote = {
        symbol: 'AAPL',
        bid: 150,
        ask: 151,
        last: 150.5,
        volume: 1000,
        timestamp: new Date(),
      };

      // Place a limit order
      const order = await broker.placeOrder({
        symbol: 'AAPL',
        side: 'buy',
        type: 'limit',
        quantity: 5,
        price: 152, // Above current ask
      });

      expect(order.status).toBe('open');

      // Update market data with price that meets limit
      quote.ask = 151.5;
      broker.updateMarketData(quote);

      // Check order status
      const updatedOrder = await broker.getOrderStatus(order.orderId);
      expect(updatedOrder.status).toBe('filled');
    });
  });
});

