import { useEffect, useState } from 'react';

interface Trade {
  price: number;
  volume: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

interface TradeFeedProps {
  symbol: string;
}

const TradeFeed = ({ symbol }: TradeFeedProps) => {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    // Generate mock trades
    const generateTrade = () => {
      const newTrade: Trade = {
        price: 100 + (Math.random() - 0.5) * 10,
        volume: Math.floor(Math.random() * 100) + 10,
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        timestamp: Date.now(),
      };

      setTrades((prev) => [newTrade, ...prev].slice(0, 10));
    };

    const interval = setInterval(generateTrade, 1500);
    return () => clearInterval(interval);
  }, [symbol]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground font-medium pb-2 border-b border-border/50">
        <div>Price</div>
        <div className="text-right">Volume</div>
        <div className="text-right">Time</div>
      </div>
      
      {trades.map((trade, idx) => (
        <div 
          key={`${trade.timestamp}-${idx}`} 
          className="grid grid-cols-3 gap-4 text-sm animate-slide-up"
        >
          <div className={`font-mono font-bold ${trade.side === 'buy' ? 'text-buy' : 'text-sell'}`}>
            ${trade.price.toFixed(2)}
          </div>
          <div className="font-mono text-right text-muted-foreground">
            {trade.volume}
          </div>
          <div className="text-right text-muted-foreground text-xs">
            {new Date(trade.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TradeFeed;
