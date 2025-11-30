import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface OrderFormProps {
  symbol: string;
  side: 'buy' | 'sell';
  balance: number;
}

const OrderForm = ({ symbol, side, balance }: OrderFormProps) => {
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quantity || (orderType === 'limit' && !price)) {
      toast.error('Please fill in all required fields');
      return;
    }

    const order = {
      symbol,
      side,
      type: orderType,
      quantity: parseFloat(quantity),
      price: orderType === 'limit' ? parseFloat(price) : undefined,
      timestamp: Date.now(),
    };

    // Mock order placement
    toast.success(
      `${side.toUpperCase()} order placed`,
      {
        description: `${quantity} shares of ${symbol} at ${orderType === 'market' ? 'market price' : `$${price}`}`,
      }
    );

    // Reset form
    setQuantity('');
    setPrice('');
  };

  const isBuy = side === 'buy';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="orderType">Order Type</Label>
        <Select value={orderType} onValueChange={(value: 'market' | 'limit') => setOrderType(value)}>
          <SelectTrigger id="orderType">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="market">Market</SelectItem>
            <SelectItem value="limit">Limit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {orderType === 'limit' && (
        <div className="space-y-2">
          <Label htmlFor="price">Price ($)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="font-mono"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity</Label>
        <Input
          id="quantity"
          type="number"
          step="1"
          placeholder="0"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="font-mono"
        />
      </div>

      <div className="p-3 rounded-lg bg-muted/50 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Available</span>
          <span className="font-mono">${balance.toLocaleString()}</span>
        </div>
        {quantity && (orderType === 'market' || price) && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Est. Total</span>
            <span className="font-mono">
              ${(parseFloat(quantity) * (orderType === 'limit' ? parseFloat(price) : 100)).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <Button 
        type="submit" 
        className={`w-full ${isBuy ? 'bg-buy hover:bg-buy-hover' : 'bg-sell hover:bg-sell-hover'} text-white font-bold`}
      >
        {isBuy ? 'Buy' : 'Sell'} {symbol}
      </Button>
    </form>
  );
};

export default OrderForm;
