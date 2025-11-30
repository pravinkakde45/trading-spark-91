import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import crypto from 'crypto';
import { Broker, BrokerConfig, MarketQuote, Candle, OrderRequest, OrderResponse, Position } from './base';
import { logger } from '../utils/logger';
import { config } from '../config';

/**
 * Binance Broker Connector
 * 
 * Documentation: https://binance-docs.github.io/apidocs/spot/en/
 * API Reference: https://binance-docs.github.io/apidocs/spot/en/#general-info
 * WebSocket: https://binance-docs.github.io/apidocs/spot/en/#websocket-market-data
 */
export class BinanceBroker implements Broker {
  name = 'binance';
  private apiClient: AxiosInstance;
  private wsClient: WebSocket | null = null;
  private subscriptions: Set<string> = new Set();
  private marketDataCallbacks: Map<string, (data: MarketQuote) => void> = new Map();

  constructor(private brokerConfig: BrokerConfig) {
    const baseURL = brokerConfig.sandboxMode
      ? config.BINANCE_API_URL || 'https://testnet.binance.vision/api'
      : 'https://api.binance.com/api';

    this.apiClient = axios.create({
      baseURL,
      timeout: 10000,
    });
  }

  private signRequest(params: Record<string, string>): string {
    const queryString = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');
    return crypto.createHmac('sha256', this.brokerConfig.apiSecret).update(queryString).digest('hex');
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    try {
      // Binance uses uppercase symbols
      const binanceSymbol = symbol.toUpperCase();
      const response = await this.apiClient.get('/v3/ticker/bookTicker', {
        params: { symbol: binanceSymbol },
      });

      const data = response.data;
      return {
        symbol,
        bid: parseFloat(data.bidPrice || '0'),
        ask: parseFloat(data.askPrice || '0'),
        last: (parseFloat(data.bidPrice || '0') + parseFloat(data.askPrice || '0')) / 2,
        volume: 0, // Not available in bookTicker
        timestamp: new Date(),
      };
    } catch (error: any) {
      logger.error({ error, symbol }, 'Failed to get quote from Binance');
      throw new Error(`Failed to get quote: ${error.message}`);
    }
  }

  async getCandles(
    symbol: string,
    from: Date,
    to: Date,
    interval: string
  ): Promise<Candle[]> {
    try {
      const binanceSymbol = symbol.toUpperCase();
      
      // Map interval to Binance format
      const intervalMap: Record<string, string> = {
        '1m': '1m',
        '5m': '5m',
        '15m': '15m',
        '30m': '30m',
        '1h': '1h',
        '4h': '4h',
        '1d': '1d',
      };

      const binanceInterval = intervalMap[interval] || '1h';
      const startTime = from.getTime();
      const endTime = to.getTime();

      const response = await this.apiClient.get('/v3/klines', {
        params: {
          symbol: binanceSymbol,
          interval: binanceInterval,
          startTime,
          endTime,
          limit: 1000,
        },
      });

      return response.data.map((kline: any[]) => ({
        symbol,
        timestamp: new Date(kline[0]),
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));
    } catch (error: any) {
      logger.error({ error, symbol, interval }, 'Failed to get candles from Binance');
      throw new Error(`Failed to get candles: ${error.message}`);
    }
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    try {
      const binanceSymbol = order.symbol.toUpperCase();
      const side = order.side.toUpperCase();
      const type = order.type === 'market' ? 'MARKET' : 'LIMIT';

      const params: Record<string, string> = {
        symbol: binanceSymbol,
        side,
        type,
        quantity: order.quantity.toString(),
        timestamp: Date.now().toString(),
      };

      if (order.type === 'limit' && order.price) {
        params.price = order.price.toString();
        params.timeInForce = 'GTC';
      }

      // Sign request
      const signature = this.signRequest(params);
      params.signature = signature;

      const response = await this.apiClient.post('/v3/order', null, {
        params,
        headers: {
          'X-MBX-APIKEY': this.brokerConfig.apiKey,
        },
      });

      return {
        orderId: response.data.orderId.toString(),
        status: this.mapOrderStatus(response.data.status),
        brokerOrderId: response.data.orderId.toString(),
      };
    } catch (error: any) {
      logger.error({ error, order }, 'Failed to place order with Binance');
      throw new Error(`Failed to place order: ${error.message}`);
    }
  }

  async getOrderStatus(orderId: string): Promise<OrderResponse> {
    try {
      // Note: Binance requires symbol to check order status
      // This is a simplified version - in production, you'd need to store symbol with order
      throw new Error('Binance order status check requires symbol - use getOrderBySymbol instead');
    } catch (error: any) {
      logger.error({ error, orderId }, 'Failed to get order status from Binance');
      throw new Error(`Failed to get order status: ${error.message}`);
    }
  }

  async getPositions(): Promise<Position[]> {
    try {
      const params: Record<string, string> = {
        timestamp: Date.now().toString(),
      };

      const signature = this.signRequest(params);
      params.signature = signature;

      const response = await this.apiClient.get('/v3/account', {
        params,
        headers: {
          'X-MBX-APIKEY': this.brokerConfig.apiKey,
        },
      });

      return response.data.balances
        .filter((bal: any) => parseFloat(bal.free) > 0 || parseFloat(bal.locked) > 0)
        .map((bal: any) => ({
          symbol: bal.asset,
          quantity: parseFloat(bal.free) + parseFloat(bal.locked),
          averagePrice: 0, // Not available in account endpoint
          currentPrice: 0,
          unrealizedPnl: 0,
        }));
    } catch (error: any) {
      logger.error({ error }, 'Failed to get positions from Binance');
      throw new Error(`Failed to get positions: ${error.message}`);
    }
  }

  async subscribeToMarketData(
    symbols: string[],
    callback: (data: MarketQuote) => void
  ): Promise<void> {
    try {
      const wsUrl = this.brokerConfig.sandboxMode
        ? config.BINANCE_WS_URL || 'wss://testnet.binance.vision/ws'
        : 'wss://stream.binance.com:9443/ws';

      // Create stream names (lowercase for Binance)
      const streams = symbols.map((s) => `${s.toLowerCase()}@bookTicker`).join('/');

      if (!this.wsClient || this.wsClient.readyState !== WebSocket.OPEN) {
        this.wsClient = new WebSocket(`${wsUrl}/${streams}`);

        this.wsClient.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.data) {
              const quote: MarketQuote = {
                symbol: message.data.s,
                bid: parseFloat(message.data.b || '0'),
                ask: parseFloat(message.data.a || '0'),
                last: (parseFloat(message.data.b || '0') + parseFloat(message.data.a || '0')) / 2,
                volume: 0,
                timestamp: new Date(),
              };
              callback(quote);
            }
          } catch (err) {
            logger.error({ err }, 'Error parsing Binance WebSocket message');
          }
        });
      }

      for (const symbol of symbols) {
        this.subscriptions.add(symbol);
        this.marketDataCallbacks.set(symbol, callback);
      }
    } catch (error: any) {
      logger.error({ error, symbols }, 'Failed to subscribe to Binance market data');
      throw new Error(`Failed to subscribe: ${error.message}`);
    }
  }

  async unsubscribeFromMarketData(symbols: string[]): Promise<void> {
    for (const symbol of symbols) {
      this.subscriptions.delete(symbol);
      this.marketDataCallbacks.delete(symbol);
    }
    // Binance doesn't support unsubscribe - would need to close and reconnect
  }

  private mapOrderStatus(status: string): OrderResponse['status'] {
    const statusMap: Record<string, OrderResponse['status']> = {
      NEW: 'pending',
      PARTIALLY_FILLED: 'partially_filled',
      FILLED: 'filled',
      CANCELED: 'cancelled',
      REJECTED: 'rejected',
      EXPIRED: 'cancelled',
    };
    return statusMap[status] || 'pending';
  }

  disconnect() {
    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = null;
    }
    this.subscriptions.clear();
    this.marketDataCallbacks.clear();
  }
}

