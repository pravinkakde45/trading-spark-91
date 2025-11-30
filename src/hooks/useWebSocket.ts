import { useEffect, useRef, useState, useCallback } from 'react';

export interface MarketTick {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  change: number;
  changePercent: number;
}

interface UseWebSocketOptions {
  symbol: string;
  onTick?: (tick: MarketTick) => void;
  sandbox?: boolean;
}

export const useWebSocket = ({ symbol, onTick, sandbox = true }: UseWebSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastTick, setLastTick] = useState<MarketTick | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPriceRef = useRef<number>(100);

  // Mock WebSocket for sandbox mode
  const generateMockTick = useCallback((): MarketTick => {
    const change = (Math.random() - 0.5) * 2; // -1 to +1
    const newPrice = lastPriceRef.current * (1 + change / 100);
    lastPriceRef.current = newPrice;

    const tick: MarketTick = {
      symbol,
      price: newPrice,
      volume: Math.floor(Math.random() * 1000) + 100,
      timestamp: Date.now(),
      change: newPrice - 100,
      changePercent: ((newPrice - 100) / 100) * 100,
    };

    return tick;
  }, [symbol]);

  useEffect(() => {
    if (!sandbox) {
      // Real WebSocket implementation would go here
      // const ws = new WebSocket(`wss://yourapi.com/ws/market/${symbol}`);
      return;
    }

    // Sandbox mode - simulate WebSocket with intervals
    setIsConnected(true);

    intervalRef.current = setInterval(() => {
      const tick = generateMockTick();
      setLastTick(tick);
      onTick?.(tick);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setIsConnected(false);
    };
  }, [symbol, sandbox, generateMockTick, onTick]);

  return { isConnected, lastTick };
};
