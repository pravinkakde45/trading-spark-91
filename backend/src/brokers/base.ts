export interface BrokerConfig {
  apiKey: string;
  apiSecret: string;
  sandboxMode: boolean;
}

export interface MarketQuote {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: Date;
}

export interface Candle {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderRequest {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number;
  price?: number;
  stopPrice?: number;
}

export interface OrderResponse {
  orderId: string;
  status: 'pending' | 'open' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected';
  filledQuantity?: number;
  averagePrice?: number;
  brokerOrderId?: string;
}

export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPnl: number;
}

export interface Broker {
  name: string;
  getQuote(symbol: string): Promise<MarketQuote>;
  getCandles(symbol: string, from: Date, to: Date, interval: string): Promise<Candle[]>;
  placeOrder(order: OrderRequest): Promise<OrderResponse>;
  getOrderStatus(orderId: string): Promise<OrderResponse>;
  getPositions(): Promise<Position[]>;
  subscribeToMarketData(symbols: string[], callback: (data: MarketQuote) => void): Promise<void>;
  unsubscribeFromMarketData(symbols: string[]): Promise<void>;
}

