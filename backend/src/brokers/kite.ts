import axios, { AxiosInstance } from 'axios';
import { Broker, BrokerConfig, MarketQuote, Candle, OrderRequest, OrderResponse, Position } from './base';
import { logger } from '../utils/logger';
import { config } from '../config';

/**
 * Kite Connect (Zerodha) Broker Connector
 * 
 * Documentation: https://kite.trade/docs/connect/v3/
 * API Reference: https://kite.trade/docs/connect/v3/
 * WebSocket: https://kite.trade/docs/connect/v3/websocket/
 */
export class KiteBroker implements Broker {
  name = 'kite';
  private apiClient: AxiosInstance;
  private accessToken: string | null = null;

  constructor(private brokerConfig: BrokerConfig) {
    const baseURL = config.KITE_API_URL || 'https://kite.zerodha.com';

    this.apiClient = axios.create({
      baseURL,
      timeout: 10000,
    });
  }

  /**
   * Initialize Kite Connect session
   * Note: Kite requires a two-step auth flow:
   * 1. User authorizes app and gets request token
   * 2. Exchange request token for access token
   * This method assumes access token is already obtained
   */
  setAccessToken(token: string) {
    this.accessToken = token;
    this.apiClient.defaults.headers.common['Authorization'] = `token ${this.brokerConfig.apiKey}:${token}`;
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    try {
      if (!this.accessToken) {
        throw new Error('Access token not set. Please complete Kite Connect authorization flow.');
      }

      // Kite uses instrument tokens - this is simplified
      // In production, you'd need to map symbols to instrument tokens
      const response = await this.apiClient.get('/quote/ltp', {
        params: {
          i: symbol, // Instrument token or trading symbol
        },
      });

      const data = response.data.data[symbol];
      return {
        symbol,
        bid: data.ltp || 0,
        ask: data.ltp || 0,
        last: data.ltp || 0,
        volume: data.volume || 0,
        timestamp: new Date(),
      };
    } catch (error: any) {
      logger.error({ error, symbol }, 'Failed to get quote from Kite');
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
      if (!this.accessToken) {
        throw new Error('Access token not set');
      }

      // Map interval to Kite format
      const intervalMap: Record<string, string> = {
        '1m': 'minute',
        '5m': '5minute',
        '15m': '15minute',
        '30m': '30minute',
        '1h': 'hour',
        '4h': '4hour',
        '1d': 'day',
      };

      const kiteInterval = intervalMap[interval] || 'hour';
      const fromDate = from.toISOString().split('T')[0];
      const toDate = to.toISOString().split('T')[0];

      const response = await this.apiClient.get(`/oms/instruments/historical/${symbol}/${kiteInterval}`, {
        params: {
          from: fromDate,
          to: toDate,
          continuous: 0,
          oi: 0,
        },
      });

      return response.data.data.candles.map((candle: any[]) => ({
        symbol,
        timestamp: new Date(candle[0]),
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
      }));
    } catch (error: any) {
      logger.error({ error, symbol, interval }, 'Failed to get candles from Kite');
      throw new Error(`Failed to get candles: ${error.message}`);
    }
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('Access token not set');
      }

      const orderData: any = {
        exchange: 'NSE', // Default - should be determined from symbol
        tradingsymbol: order.symbol,
        transaction_type: order.side.toUpperCase(),
        quantity: order.quantity,
        order_type: order.type === 'market' ? 'MARKET' : 'LIMIT',
        product: 'MIS', // Margin Intraday Square-off
        validity: 'DAY',
      };

      if (order.type === 'limit' && order.price) {
        orderData.price = order.price;
      }

      const response = await this.apiClient.post('/oms/orders/regular', orderData);

      return {
        orderId: response.data.data.order_id,
        status: 'pending',
        brokerOrderId: response.data.data.order_id,
      };
    } catch (error: any) {
      logger.error({ error, order }, 'Failed to place order with Kite');
      throw new Error(`Failed to place order: ${error.message}`);
    }
  }

  async getOrderStatus(orderId: string): Promise<OrderResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('Access token not set');
      }

      const response = await this.apiClient.get(`/oms/orders/${orderId}`);

      const order = response.data.data;
      return {
        orderId: order.order_id,
        status: this.mapOrderStatus(order.status),
        filledQuantity: parseFloat(order.filled_quantity || '0'),
        averagePrice: parseFloat(order.average_price || '0'),
        brokerOrderId: order.order_id,
      };
    } catch (error: any) {
      logger.error({ error, orderId }, 'Failed to get order status from Kite');
      throw new Error(`Failed to get order status: ${error.message}`);
    }
  }

  async getPositions(): Promise<Position[]> {
    try {
      if (!this.accessToken) {
        throw new Error('Access token not set');
      }

      const response = await this.apiClient.get('/oms/portfolio/positions');

      return response.data.data.net.map((pos: any) => ({
        symbol: pos.tradingsymbol,
        quantity: parseFloat(pos.quantity || '0'),
        averagePrice: parseFloat(pos.average_price || '0'),
        currentPrice: parseFloat(pos.last_price || '0'),
        unrealizedPnl: parseFloat(pos.unrealised || '0'),
      }));
    } catch (error: any) {
      logger.error({ error }, 'Failed to get positions from Kite');
      throw new Error(`Failed to get positions: ${error.message}`);
    }
  }

  async subscribeToMarketData(
    symbols: string[],
    callback: (data: MarketQuote) => void
  ): Promise<void> {
    // Kite WebSocket requires special setup with KiteTicker library
    // This is a placeholder - full implementation would use KiteTicker
    logger.warn('Kite WebSocket subscription requires KiteTicker library - not implemented in this demo');
    throw new Error('Kite WebSocket subscription not fully implemented. Use REST API for market data.');
  }

  async unsubscribeFromMarketData(symbols: string[]): Promise<void> {
    // Placeholder
  }

  private mapOrderStatus(status: string): OrderResponse['status'] {
    const statusMap: Record<string, OrderResponse['status']> = {
      'PUT ORDER REQUEST RECEIVED': 'pending',
      'VALIDATION PENDING': 'pending',
      'OPEN PENDING': 'pending',
      'OPEN': 'open',
      'COMPLETE': 'filled',
      'REJECTED': 'rejected',
      'CANCELLED': 'cancelled',
    };
    return statusMap[status] || 'pending';
  }

  disconnect() {
    this.accessToken = null;
  }
}

