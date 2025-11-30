import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import { Broker, BrokerConfig, MarketQuote, Candle, OrderRequest, OrderResponse, Position } from './base';
import { logger } from '../utils/logger';
import { config } from '../config';

/**
 * Alpaca Broker Connector
 * 
 * Documentation: https://alpaca.markets/docs/
 * API Reference: https://alpaca.markets/docs/api-documentation/
 * Streaming: https://alpaca.markets/docs/api-documentation/api-v2/market-data/streaming/
 */
export class AlpacaBroker implements Broker {
  name = 'alpaca';
  private apiClient: AxiosInstance;
  private wsClient: WebSocket | null = null;
  private subscriptions: Set<string> = new Set();
  private marketDataCallbacks: Map<string, (data: MarketQuote) => void> = new Map();

  constructor(private brokerConfig: BrokerConfig) {
    const baseURL = brokerConfig.sandboxMode
      ? config.ALPACA_API_URL || 'https://paper-api.alpaca.markets'
      : 'https://api.alpaca.markets';

    this.apiClient = axios.create({
      baseURL,
      headers: {
        'APCA-API-KEY-ID': brokerConfig.apiKey,
        'APCA-API-SECRET-KEY': brokerConfig.apiSecret,
      },
    });
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    try {
      // Alpaca uses IEX endpoint for market data
      const response = await this.apiClient.get(`/v2/stocks/${symbol}/quote`, {
        baseURL: 'https://data.alpaca.markets',
      });

      const data = response.data;
      return {
        symbol: data.symbol,
        bid: parseFloat(data.bp || '0'),
        ask: parseFloat(data.ap || '0'),
        last: parseFloat(data.t || '0'),
        volume: parseInt(data.v || '0', 10),
        timestamp: new Date(data.timestamp || Date.now()),
      };
    } catch (error: any) {
      logger.error({ error, symbol }, 'Failed to get quote from Alpaca');
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
      // Map interval to Alpaca format
      const intervalMap: Record<string, string> = {
        '1m': '1Min',
        '5m': '5Min',
        '15m': '15Min',
        '30m': '30Min',
        '1h': '1Hour',
        '4h': '4Hour',
        '1d': '1Day',
      };

      const alpacaInterval = intervalMap[interval] || '1Hour';
      const start = from.toISOString();
      const end = to.toISOString();

      const response = await this.apiClient.get(`/v2/stocks/${symbol}/bars`, {
        baseURL: 'https://data.alpaca.markets',
        params: {
          start,
          end,
          timeframe: alpacaInterval,
          adjustment: 'raw',
        },
      });

      return response.data.bars.map((bar: any) => ({
        symbol: bar.S || symbol,
        timestamp: new Date(bar.t),
        open: parseFloat(bar.o),
        high: parseFloat(bar.h),
        low: parseFloat(bar.l),
        close: parseFloat(bar.c),
        volume: parseInt(bar.v, 10),
      }));
    } catch (error: any) {
      logger.error({ error, symbol, interval }, 'Failed to get candles from Alpaca');
      throw new Error(`Failed to get candles: ${error.message}`);
    }
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    try {
      // Map order type to Alpaca format
      const orderTypeMap: Record<string, string> = {
        market: 'market',
        limit: 'limit',
        stop: 'stop',
        stop_limit: 'stop_limit',
      };

      const side = order.side === 'buy' ? 'buy' : 'sell';
      const orderType = orderTypeMap[order.type] || 'market';

      const orderData: any = {
        symbol: order.symbol,
        qty: order.quantity.toString(),
        side,
        type: orderType,
        time_in_force: 'day',
      };

      if (order.type === 'limit' && order.price) {
        orderData.limit_price = order.price.toString();
      }

      if (order.type === 'stop' && order.stopPrice) {
        orderData.stop_price = order.stopPrice.toString();
      }

      if (order.type === 'stop_limit' && order.price && order.stopPrice) {
        orderData.limit_price = order.price.toString();
        orderData.stop_price = order.stopPrice.toString();
      }

      const response = await this.apiClient.post('/v2/orders', orderData);

      return {
        orderId: response.data.id,
        status: this.mapOrderStatus(response.data.status),
        brokerOrderId: response.data.id,
      };
    } catch (error: any) {
      logger.error({ error, order }, 'Failed to place order with Alpaca');
      throw new Error(`Failed to place order: ${error.message}`);
    }
  }

  async getOrderStatus(orderId: string): Promise<OrderResponse> {
    try {
      const response = await this.apiClient.get(`/v2/orders/${orderId}`);

      return {
        orderId: response.data.id,
        status: this.mapOrderStatus(response.data.status),
        filledQuantity: parseFloat(response.data.filled_qty || '0'),
        averagePrice: parseFloat(response.data.filled_avg_price || '0'),
        brokerOrderId: response.data.id,
      };
    } catch (error: any) {
      logger.error({ error, orderId }, 'Failed to get order status from Alpaca');
      throw new Error(`Failed to get order status: ${error.message}`);
    }
  }

  async getPositions(): Promise<Position[]> {
    try {
      const response = await this.apiClient.get('/v2/positions');

      return response.data.map((pos: any) => ({
        symbol: pos.symbol,
        quantity: parseFloat(pos.qty),
        averagePrice: parseFloat(pos.avg_entry_price),
        currentPrice: parseFloat(pos.current_price || '0'),
        unrealizedPnl: parseFloat(pos.unrealized_pl || '0'),
      }));
    } catch (error: any) {
      logger.error({ error }, 'Failed to get positions from Alpaca');
      throw new Error(`Failed to get positions: ${error.message}`);
    }
  }

  async subscribeToMarketData(
    symbols: string[],
    callback: (data: MarketQuote) => void
  ): Promise<void> {
    try {
      const wsUrl = this.brokerConfig.sandboxMode
        ? config.ALPACA_STREAM_URL || 'wss://stream.data.alpaca.markets/v2/iex'
        : 'wss://stream.data.alpaca.markets/v2/iex';

      if (!this.wsClient || this.wsClient.readyState !== WebSocket.OPEN) {
        this.wsClient = new WebSocket(wsUrl);

        // Authenticate
        this.wsClient.on('open', () => {
          this.wsClient?.send(
            JSON.stringify({
              action: 'auth',
              key: this.brokerConfig.apiKey,
              secret: this.brokerConfig.apiSecret,
            })
          );
        });

        // Handle messages
        this.wsClient.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message[0]?.T === 'q') {
              // Quote update
              const quote: MarketQuote = {
                symbol: message[0].S,
                bid: message[0].bp || 0,
                ask: message[0].ap || 0,
                last: message[0].t || 0,
                volume: message[0].v || 0,
                timestamp: new Date(),
              };
              callback(quote);
            }
          } catch (err) {
            logger.error({ err }, 'Error parsing Alpaca WebSocket message');
          }
        });
      }

      // Subscribe to symbols
      for (const symbol of symbols) {
        if (!this.subscriptions.has(symbol)) {
          this.subscriptions.add(symbol);
          this.marketDataCallbacks.set(symbol, callback);

          this.wsClient.send(
            JSON.stringify({
              action: 'subscribe',
              quotes: [symbol],
            })
          );
        }
      }
    } catch (error: any) {
      logger.error({ error, symbols }, 'Failed to subscribe to Alpaca market data');
      throw new Error(`Failed to subscribe: ${error.message}`);
    }
  }

  async unsubscribeFromMarketData(symbols: string[]): Promise<void> {
    if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
      for (const symbol of symbols) {
        this.subscriptions.delete(symbol);
        this.marketDataCallbacks.delete(symbol);

        this.wsClient.send(
          JSON.stringify({
            action: 'unsubscribe',
            quotes: [symbol],
          })
        );
      }
    }
  }

  private mapOrderStatus(status: string): OrderResponse['status'] {
    const statusMap: Record<string, OrderResponse['status']> = {
      new: 'pending',
      accepted: 'open',
      filled: 'filled',
      partially_filled: 'partially_filled',
      canceled: 'cancelled',
      expired: 'cancelled',
      rejected: 'rejected',
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

