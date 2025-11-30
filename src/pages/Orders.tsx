import { useState } from 'react';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: number;
  price?: number;
  status: 'open' | 'filled' | 'cancelled';
  timestamp: number;
}

const Orders = () => {
  const balance = 10000;
  
  const [orders] = useState<Order[]>([
    {
      id: '1',
      symbol: 'AAPL',
      side: 'buy',
      type: 'limit',
      quantity: 10,
      price: 150.50,
      status: 'open',
      timestamp: Date.now() - 3600000,
    },
    {
      id: '2',
      symbol: 'GOOGL',
      side: 'sell',
      type: 'market',
      quantity: 5,
      status: 'filled',
      timestamp: Date.now() - 7200000,
    },
    {
      id: '3',
      symbol: 'TSLA',
      side: 'buy',
      type: 'limit',
      quantity: 20,
      price: 180.00,
      status: 'cancelled',
      timestamp: Date.now() - 10800000,
    },
  ]);

  const handleCancelOrder = (orderId: string) => {
    toast.success('Order cancelled successfully');
  };

  const openOrders = orders.filter(o => o.status === 'open');
  const historicalOrders = orders.filter(o => o.status !== 'open');

  const OrderRow = ({ order }: { order: Order }) => (
    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <div className="text-xs text-muted-foreground">Symbol</div>
          <div className="font-bold">{order.symbol}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Side</div>
          <Badge className={order.side === 'buy' ? 'bg-buy hover:bg-buy' : 'bg-sell hover:bg-sell'}>
            {order.side.toUpperCase()}
          </Badge>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Type</div>
          <div className="font-medium capitalize">{order.type}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Quantity</div>
          <div className="font-mono">{order.quantity}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">
            {order.type === 'limit' ? 'Price' : 'Status'}
          </div>
          <div className="font-mono">
            {order.type === 'limit' ? `$${order.price?.toFixed(2)}` : order.status}
          </div>
        </div>
      </div>
      
      {order.status === 'open' && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleCancelOrder(order.id)}
          className="ml-4 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <TopNav balance={balance} />
      
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Orders</h1>
          <p className="text-muted-foreground">Manage your open and historical orders</p>
        </div>

        <Card className="glass-card border-border/50 p-6">
          <Tabs defaultValue="open" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="open">
                Open Orders ({openOrders.length})
              </TabsTrigger>
              <TabsTrigger value="history">
                Order History ({historicalOrders.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="open" className="space-y-3">
              {openOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No open orders
                </div>
              ) : (
                openOrders.map(order => <OrderRow key={order.id} order={order} />)
              )}
            </TabsContent>
            
            <TabsContent value="history" className="space-y-3">
              {historicalOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No order history
                </div>
              ) : (
                historicalOrders.map(order => <OrderRow key={order.id} order={order} />)
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Orders;
