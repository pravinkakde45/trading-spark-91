# API Examples

This document provides curl examples and Postman collection for testing the Trading Platform API.

## Base URL

```
http://localhost:3000
```

## Authentication

Most endpoints require a JWT token. Get your token by registering or logging in.

### Register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "name": "John Doe"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

Response:
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## User Endpoints

### Get User Profile

```bash
curl -X GET http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Save Broker API Keys

```bash
curl -X POST http://localhost:3000/api/user/broker-config \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "brokerType": "alpaca",
    "apiKey": "your-api-key",
    "apiSecret": "your-api-secret",
    "sandboxMode": true
  }'
```

### Toggle Sandbox Mode

```bash
curl -X PATCH http://localhost:3000/api/user/broker-config/alpaca/sandbox \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sandboxMode": false
  }'
```

## Market Data Endpoints

### Get Quote

```bash
curl -X GET http://localhost:3000/api/market/AAPL/quote \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Response:
```json
{
  "symbol": "AAPL",
  "bid": 150.25,
  "ask": 150.30,
  "last": 150.27,
  "volume": 1000000,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Get Candles

```bash
curl -X GET "http://localhost:3000/api/market/candles?symbol=AAPL&from=2024-01-01T00:00:00Z&to=2024-01-15T23:59:59Z&interval=1h" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Orders Endpoints

### Place Market Order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "side": "buy",
    "type": "market",
    "quantity": 10
  }'
```

### Place Limit Order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "side": "buy",
    "type": "limit",
    "quantity": 10,
    "price": 150.00
  }'
```

### Get Orders

```bash
curl -X GET "http://localhost:3000/api/orders?status=open&limit=50&offset=0" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Single Order

```bash
curl -X GET http://localhost:3000/api/orders/ORDER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Portfolio Endpoints

### Get Portfolio

```bash
curl -X GET http://localhost:3000/api/portfolio \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Response:
```json
{
  "positions": [
    {
      "symbol": "AAPL",
      "quantity": 10,
      "averagePrice": 150.25,
      "currentPrice": 152.30,
      "unrealizedPnl": 20.50,
      "realizedPnl": 0
    }
  ],
  "totalUnrealizedPnl": 20.50,
  "totalRealizedPnl": 0,
  "totalPnl": 20.50
}
```

### Reconcile Portfolio

```bash
curl -X POST http://localhost:3000/api/portfolio/reconcile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## WebSocket Connection

### Connect to Market Data WebSocket

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/ws/market', {
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN'
  }
});

ws.on('open', () => {
  console.log('Connected to WebSocket');
  
  // Subscribe to symbols
  ws.send(JSON.stringify({
    type: 'subscribe',
    symbols: ['AAPL', 'GOOGL', 'MSFT']
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('Received:', message);
  
  if (message.type === 'tick') {
    console.log(`Price update for ${message.data.symbol}:`, message.data);
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

## Webhooks

### Alpaca Webhook

```bash
curl -X POST http://localhost:3000/api/webhooks/alpaca \
  -H "Content-Type: application/json" \
  -H "X-Alpaca-Signature: SIGNATURE" \
  -d '{
    "event": "fill",
    "orderId": "order-123",
    "brokerOrderId": "alpaca-order-456",
    "symbol": "AAPL",
    "status": "filled",
    "filledQuantity": 10,
    "averagePrice": 150.25
  }'
```

### Binance Webhook

```bash
curl -X POST http://localhost:3000/api/webhooks/binance \
  -H "Content-Type: application/json" \
  -d '{
    "e": "executionReport",
    "i": "123456",
    "s": "BTCUSDT",
    "X": "FILLED",
    "z": "0.1",
    "p": "50000"
  }'
```

### Generic Webhook

```bash
curl -X POST http://localhost:3000/api/webhooks/generic \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-123",
    "status": "filled",
    "filledQuantity": 10,
    "averagePrice": 150.25
  }'
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

Common error codes:
- `VALIDATION_ERROR` - Request validation failed
- `UNAUTHORIZED` - Missing or invalid authentication
- `USER_EXISTS` - User already exists
- `INVALID_CREDENTIALS` - Wrong email/password
- `ORDER_ERROR` - Order placement failed
- `MARKET_DATA_ERROR` - Market data fetch failed
- `PORTFOLIO_ERROR` - Portfolio operation failed

## Rate Limiting

The API has rate limiting enabled. Default limits:
- 100 requests per minute per IP

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640000000
```

