import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { useWebSocket } from '@/hooks/useWebSocket';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface WatchlistCardProps {
  symbol: string;
}

const WatchlistCard = ({ symbol }: WatchlistCardProps) => {
  const navigate = useNavigate();
  const [price, setPrice] = useState(0);
  const [change, setChange] = useState(0);
  const [changePercent, setChangePercent] = useState(0);

  const { lastTick } = useWebSocket({
    symbol,
    sandbox: true,
    onTick: (tick) => {
      setPrice(tick.price);
      setChange(tick.change);
      setChangePercent(tick.changePercent);
    },
  });

  useEffect(() => {
    if (lastTick) {
      setPrice(lastTick.price);
      setChange(lastTick.change);
      setChangePercent(lastTick.changePercent);
    }
  }, [lastTick]);

  const isPositive = change >= 0;

  return (
    <Card 
      className="glass-card border-border/50 cursor-pointer hover:border-primary/50 transition-all hover:scale-105"
      onClick={() => navigate(`/market?symbol=${symbol}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold">{symbol}</h3>
            <p className="text-sm text-muted-foreground">Stock</p>
          </div>
          {isPositive ? (
            <TrendingUp className="h-5 w-5 text-buy" />
          ) : (
            <TrendingDown className="h-5 w-5 text-sell" />
          )}
        </div>
        
        <div className="space-y-1">
          <div className="text-2xl font-bold font-mono">
            ${price.toFixed(2)}
          </div>
          <div className={`text-sm font-medium ${isPositive ? 'text-buy' : 'text-sell'}`}>
            {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WatchlistCard;
