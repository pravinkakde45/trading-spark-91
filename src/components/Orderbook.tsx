import { useEffect, useState } from 'react';

interface OrderbookEntry {
  price: number;
  volume: number;
}

interface OrderbookProps {
  symbol: string;
}

const Orderbook = ({ symbol }: OrderbookProps) => {
  const [bids, setBids] = useState<OrderbookEntry[]>([]);
  const [asks, setAsks] = useState<OrderbookEntry[]>([]);

  useEffect(() => {
    // Generate mock orderbook
    const generateOrderbook = () => {
      const basePrice = 100;
      const newBids: OrderbookEntry[] = [];
      const newAsks: OrderbookEntry[] = [];

      for (let i = 0; i < 5; i++) {
        newBids.push({
          price: basePrice - (i + 1) * 0.1,
          volume: Math.floor(Math.random() * 1000) + 100,
        });
        newAsks.push({
          price: basePrice + (i + 1) * 0.1,
          volume: Math.floor(Math.random() * 1000) + 100,
        });
      }

      setBids(newBids);
      setAsks(newAsks);
    };

    generateOrderbook();
    const interval = setInterval(generateOrderbook, 2000);

    return () => clearInterval(interval);
  }, [symbol]);

  return (
    <div className="space-y-4">
      {/* Asks (sells) */}
      <div className="space-y-1">
        {asks.reverse().map((ask, idx) => (
          <div key={`ask-${idx}`} className="flex justify-between items-center text-sm">
            <span className="font-mono text-sell">${ask.price.toFixed(2)}</span>
            <span className="font-mono text-muted-foreground">{ask.volume}</span>
          </div>
        ))}
      </div>

      {/* Spread */}
      <div className="border-t border-b border-border/50 py-2 text-center">
        <div className="text-xs text-muted-foreground">Spread</div>
        <div className="font-mono text-sm font-bold">
          ${(asks[0]?.price - bids[0]?.price || 0).toFixed(2)}
        </div>
      </div>

      {/* Bids (buys) */}
      <div className="space-y-1">
        {bids.map((bid, idx) => (
          <div key={`bid-${idx}`} className="flex justify-between items-center text-sm">
            <span className="font-mono text-buy">${bid.price.toFixed(2)}</span>
            <span className="font-mono text-muted-foreground">{bid.volume}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Orderbook;
