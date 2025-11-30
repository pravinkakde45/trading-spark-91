import { Broker, MarketQuote, Candle, OrderRequest, OrderResponse, Position } from './base';
import { logger } from '../utils/logger';

/**
 * Sandbox Paper Trading Engine
 * Simulates order matching at best bid/ask from incoming market ticks
 */
export class SandboxBroker implements Broker {
  name = 'sandbox';
  private marketData: Map<string, MarketQuote> = new Map();
  private orders: Map<string, OrderResponse & { request: OrderRequest }> = new Map();
  private positions: Map<string, Position> = new Map();
  private orderIdCounter = 1;

  constructor() {
    // Initialize with some default market data
    this.initializeDefaultMarketData();
  }

  private initializeDefaultMarketData() {
    const defaultSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'BTCUSDT', 'ETHUSDT'];
    defaultSymbols.forEach((symbol) => {
      const basePrice = 100 + Math.random() * 100;
      this.marketData.set(symbol, {
        symbol,
        bid: basePrice - 0.1,
        ask: basePrice + 0.1,
        last: basePrice,
        volume: Math.floor(Math.random() * 1000000),
        timestamp: new Date(),
      });
    });
  }

  updateMarketData(quote: MarketQuote) {
    this.marketData.set(quote.symbol, quote);
    this.processPendingOrders(quote);
  }

  private processPendingOrders(quote: MarketQuote) {
    // Process pending orders that can be filled
    for (const [orderId, order] of this.orders.entries()) {
      if (order.status !== 'pending' && order.status !== 'open') {
        continue;
      }

      if (order.request.symbol !== quote.symbol) {
        continue;
      }

      // Market orders - fill immediately
      if (order.request.type === 'market') {
        this.fillOrder(orderId, quote);
        continue;
      }

      // Limit orders
      if (order.request.type === 'limit' && order.request.price) {
        if (order.request.side === 'buy' && quote.ask <= order.request.price) {
          this.fillOrder(orderId, quote);
        } else if (order.request.side === 'sell' && quote.bid >= order.request.price) {
          this.fillOrder(orderId, quote);
        }
      }

      // Stop orders
      if (order.request.type === 'stop' && order.request.stopPrice) {
        if (order.request.side === 'buy' && quote.last >= order.request.stopPrice) {
          // Convert stop to market order
          order.request.type = 'market';
          this.fillOrder(orderId, quote);
        } else if (order.request.side === 'sell' && quote.last <= order.request.stopPrice) {
          order.request.type = 'market';
          this.fillOrder(orderId, quote);
        }
      }
    }
  }

  private fillOrder(orderId: string, quote: MarketQuote) {
    const order = this.orders.get(orderId);
    if (!order) return;

    const fillPrice = order.request.side === 'buy' ? quote.ask : quote.bid;
    const filledQuantity = order.request.quantity;

    order.status = 'filled';
    order.filledQuantity = filledQuantity;
    order.averagePrice = fillPrice;

    // Update position
    this.updatePosition(order.request.symbol, order.request.side, filledQuantity, fillPrice);

    logger.info(
      { orderId, symbol: order.request.symbol, side: order.request.side, fillPrice, filledQuantity },
      'Sandbox order filled'
    );
  }

  private updatePosition(symbol: string, side: 'buy' | 'sell', quantity: number, price: number) {
    const existing = this.positions.get(symbol) || {
      symbol,
      quantity: 0,
      averagePrice: 0,
      currentPrice: price,
      unrealizedPnl: 0,
    };

    if (side === 'buy') {
      const totalCost = existing.quantity * existing.averagePrice + quantity * price;
      const totalQuantity = existing.quantity + quantity;
      existing.quantity = totalQuantity;
      existing.averagePrice = totalQuantity > 0 ? totalCost / totalQuantity : price;
    } else {
      // Sell - reduce position
      existing.quantity -= quantity;
      if (existing.quantity <= 0) {
        this.positions.delete(symbol);
        return;
      }
    }

    existing.currentPrice = price;
    existing.unrealizedPnl = (price - existing.averagePrice) * existing.quantity;
    this.positions.set(symbol, existing);
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    const quote = this.marketData.get(symbol);
    if (!quote) {
      // Generate random quote if not found
      const basePrice = 100 + Math.random() * 100;
      return {
        symbol,
        bid: basePrice - 0.1,
        ask: basePrice + 0.1,
        last: basePrice,
        volume: Math.floor(Math.random() * 1000000),
        timestamp: new Date(),
      };
    }
    return quote;
  }

  async getCandles(
    symbol: string,
    from: Date,
    to: Date,
    interval: string
  ): Promise<Candle[]> {
    // Generate mock candles
    const candles: Candle[] = [];
    const intervalMs = this.getIntervalMs(interval);
    let current = new Date(from);

    while (current <= to) {
      const basePrice = 100 + Math.random() * 100;
      const open = basePrice;
      const close = basePrice + (Math.random() - 0.5) * 10;
      const high = Math.max(open, close) + Math.random() * 5;
      const low = Math.min(open, close) - Math.random() * 5;

      candles.push({
        symbol,
        timestamp: new Date(current),
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 1000000),
      });

      current = new Date(current.getTime() + intervalMs);
    }

    return candles;
  }

  private getIntervalMs(interval: string): number {
    const map: Record<string, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    };
    return map[interval] || 60 * 60 * 1000;
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    const orderId = `SANDBOX-${this.orderIdCounter++}`;
    const quote = await this.getQuote(order.symbol);

    const orderResponse: OrderResponse & { request: OrderRequest } = {
      orderId,
      status: 'pending',
      request: order,
    };

    this.orders.set(orderId, orderResponse);

    // Try to fill immediately if possible
    if (order.type === 'market') {
      this.fillOrder(orderId, quote);
    } else if (order.type === 'limit' && order.price) {
      if (order.side === 'buy' && quote.ask <= order.price) {
        this.fillOrder(orderId, quote);
      } else if (order.side === 'sell' && quote.bid >= order.price) {
        this.fillOrder(orderId, quote);
      } else {
        orderResponse.status = 'open';
      }
    } else {
      orderResponse.status = 'open';
    }

    return {
      orderId: orderResponse.orderId,
      status: orderResponse.status,
      filledQuantity: orderResponse.filledQuantity,
      averagePrice: orderResponse.averagePrice,
    };
  }

  async getOrderStatus(orderId: string): Promise<OrderResponse> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    return {
      orderId: order.orderId,
      status: order.status,
      filledQuantity: order.filledQuantity,
      averagePrice: order.averagePrice,
    };
  }

  async getPositions(): Promise<Position[]> {
    return Array.from(this.positions.values());
  }

  async subscribeToMarketData(
    symbols: string[],
    callback: (data: MarketQuote) => void
  ): Promise<void> {
    // In sandbox, we simulate market data updates
    symbols.forEach((symbol) => {
      const interval = setInterval(() => {
        const quote = this.marketData.get(symbol);
        if (quote) {
          // Simulate price movement
          const change = (Math.random() - 0.5) * 0.5;
          quote.bid += change;
          quote.ask += change;
          quote.last += change;
          quote.timestamp = new Date();
          this.updateMarketData(quote);
          callback(quote);
        }
      }, 1000); // Update every second

      // Store interval for cleanup (would need proper cleanup in production)
    });
  }

  async unsubscribeFromMarketData(symbols: string[]): Promise<void> {
    // Cleanup subscriptions
  }

  getAllOrders(): Array<OrderResponse & { request: OrderRequest }> {
    return Array.from(this.orders.values());
  }
}

